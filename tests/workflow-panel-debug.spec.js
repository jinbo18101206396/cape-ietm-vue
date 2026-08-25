/**
 * 流程信息面板显示问题排查测试
 *
 * 问题描述：
 * 用户反馈"浏览模式有流程信息模块，编辑模式没有流程信息模块"
 *
 * 排查目标：
 * 1. 验证浏览模式和编辑模式是否都渲染了流程信息面板
 * 2. 检查默认折叠状态
 * 3. 对比两种模式的实际差异
 */

const { test, expect } = require('@playwright/test')

// 测试环境配置
const BASE_URL = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999/jeecg-boot'

test.describe('流程信息面板显示问题排查', () => {
  let page
  let context
  let token

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()

    // 登录获取token
    const loginRes = await page.request.post(`${API_BASE}/sys/login`, {
      data: {
        username: 'admin',
        password: '123456'
      }
    })
    const loginData = await loginRes.json()
    token = loginData.result.token

    // 设置token到localStorage
    await page.goto(BASE_URL)
    await page.evaluate((t) => {
      localStorage.setItem('pro__Access-Token', t)
      localStorage.setItem('vue_admin_template_token', t)
    }, token)
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('TC-01: 查找一个有流程实例的DM记录', async () => {
    // 直接查询数据库，找一个有流程实例的DM
    const response = await page.request.get(
      `${API_BASE}/ietm/datamodule/list?pageNo=1&pageSize=20`,
      {
        headers: {
          'X-Access-Token': token
        }
      }
    )

    const data = await response.json()
    console.log('DM列表返回:', JSON.stringify(data, null, 2))

    expect(data.success).toBeTruthy()

    // 遍历找一个有流程的DM
    let dmWithWorkflow = null
    for (const dm of data.result.records || []) {
      // 检查是否有流程实例
      const wfRes = await page.request.get(
        `${API_BASE}/ietm/workflow/instance/getByFormid?formid=${dm.id}`,
        {
          headers: {
            'X-Access-Token': token
          }
        }
      )
      const wfData = await wfRes.json()

      if (wfData.success && wfData.result) {
        dmWithWorkflow = dm
        console.log('✅ 找到有流程的DM:', {
          id: dm.id,
          dmcCode: dm.dmcCode,
          workflowInstanceId: dm.workflowInstanceId,
          checkoutUser: dm.checkoutUser
        })
        break
      }
    }

    expect(dmWithWorkflow).not.toBeNull()

    // 保存到context供后续测试使用
    await page.evaluate((dm) => {
      window.__testDM = dm
    }, dmWithWorkflow)
  })

  test('TC-02: 浏览模式 - 检查流程信息面板', async () => {
    const dm = await page.evaluate(() => window.__testDM)

    // 打开浏览模式（强制mode=browse）
    await page.goto(`${BASE_URL}/#/ietm/dm-content-editor/${dm.id}?mode=browse&dmc=${encodeURIComponent(dm.dmcCode || '')}`)

    // 等待页面加载完成
    await page.waitForSelector('.dm-editor-page', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // 检查流程信息面板是否存在
    const workflowPanel = await page.locator('.region-south')
    const exists = await workflowPanel.count() > 0

    console.log('浏览模式 - 流程信息面板存在:', exists)

    if (exists) {
      // 检查折叠状态
      const hasCollapsedClass = await workflowPanel.evaluate(el =>
        el.classList.contains('region-south--collapsed')
      )

      // 检查标题栏是否可见
      const titleBar = await page.locator('.south-title-bar')
      const titleBarVisible = await titleBar.isVisible()

      // 检查面板主体是否可见
      const southBody = await page.locator('.south-body')
      const bodyVisible = await southBody.isVisible()

      console.log('浏览模式 - 流程信息面板状态:', {
        折叠class: hasCollapsedClass,
        标题栏可见: titleBarVisible,
        面板主体可见: bodyVisible
      })

      // 获取Vue实例的状态
      const vueState = await page.evaluate(() => {
        const vm = document.querySelector('.dm-editor-page').__vue__
        return {
          showWorkflowPanel: vm.showWorkflowPanel,
          workflowCollapsed: vm.workflowCollapsed,
          mode: vm.mode,
          readonly: vm.readonly
        }
      })

      console.log('浏览模式 - Vue状态:', vueState)

      // 截图
      await page.screenshot({
        path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/browse-mode-workflow-panel.png',
        fullPage: true
      })
    } else {
      console.log('❌ 浏览模式：流程信息面板不存在')
    }
  })

  test('TC-03: 编辑模式 - 检查流程信息面板', async () => {
    const dm = await page.evaluate(() => window.__testDM)

    // 打开编辑模式（强制mode=edit）
    await page.goto(`${BASE_URL}/#/ietm/dm-content-editor/${dm.id}?mode=edit&dmc=${encodeURIComponent(dm.dmcCode || '')}`)

    // 等待页面加载完成
    await page.waitForSelector('.dm-editor-page', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // 检查流程信息面板是否存在
    const workflowPanel = await page.locator('.region-south')
    const exists = await workflowPanel.count() > 0

    console.log('编辑模式 - 流程信息面板存在:', exists)

    if (exists) {
      // 检查折叠状态
      const hasCollapsedClass = await workflowPanel.evaluate(el =>
        el.classList.contains('region-south--collapsed')
      )

      // 检查标题栏是否可见
      const titleBar = await page.locator('.south-title-bar')
      const titleBarVisible = await titleBar.isVisible()

      // 检查面板主体是否可见
      const southBody = await page.locator('.south-body')
      const bodyVisible = await southBody.isVisible()

      console.log('编辑模式 - 流程信息面板状态:', {
        折叠class: hasCollapsedClass,
        标题栏可见: titleBarVisible,
        面板主体可见: bodyVisible
      })

      // 获取Vue实例的状态
      const vueState = await page.evaluate(() => {
        const vm = document.querySelector('.dm-editor-page').__vue__
        return {
          showWorkflowPanel: vm.showWorkflowPanel,
          workflowCollapsed: vm.workflowCollapsed,
          mode: vm.mode,
          readonly: vm.readonly
        }
      })

      console.log('编辑模式 - Vue状态:', vueState)

      // 截图
      await page.screenshot({
        path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/edit-mode-workflow-panel.png',
        fullPage: true
      })
    } else {
      console.log('❌ 编辑模式：流程信息面板不存在')
    }
  })

  test('TC-04: 对比分析', async () => {
    console.log('\n========== 对比分析 ==========')
    console.log('根据代码分析：')
    console.log('1. showWorkflowPanel 由 checkWorkflowExists() 控制，与 mode 无关')
    console.log('2. workflowCollapsed 默认为 true（折叠状态），与 mode 无关')
    console.log('3. 折叠时：标题栏可见，但面板主体（v-show="!workflowCollapsed"）隐藏')
    console.log('4. 用户可能看到标题栏但误以为"没有流程信息模块"')
    console.log('================================\n')
  })

  test('TC-05: 测试展开/折叠功能', async () => {
    const dm = await page.evaluate(() => window.__testDM)

    // 打开编辑模式
    await page.goto(`${BASE_URL}/#/ietm/dm-content-editor/${dm.id}?mode=edit&dmc=${encodeURIComponent(dm.dmcCode || '')}`)
    await page.waitForSelector('.dm-editor-page', { timeout: 10000 })
    await page.waitForTimeout(2000)

    const workflowPanel = await page.locator('.region-south')
    const exists = await workflowPanel.count() > 0

    if (exists) {
      console.log('\n测试展开/折叠功能：')

      // 初始状态
      let bodyVisible = await page.locator('.south-body').isVisible()
      console.log('初始状态 - 面板主体可见:', bodyVisible)

      // 点击标题栏展开
      await page.locator('.south-title-bar').click()
      await page.waitForTimeout(500)

      bodyVisible = await page.locator('.south-body').isVisible()
      console.log('点击后 - 面板主体可见:', bodyVisible)

      // 截图展开状态
      await page.screenshot({
        path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/workflow-panel-expanded.png',
        fullPage: true
      })

      // 再次点击折叠
      await page.locator('.south-title-bar').click()
      await page.waitForTimeout(500)

      bodyVisible = await page.locator('.south-body').isVisible()
      console.log('再次点击后 - 面板主体可见:', bodyVisible)
    }
  })
})
