/**
 * P0-19: 工作流外部钩子接口 E2E 验证
 *
 * 验证目标：
 * 1. beforeInsertnode - 新增节点前钩子能阻止操作
 * 2. beforeDelnode - 删除节点前钩子能阻止操作
 * 3. beforeSavenode - 保存节点前钩子能阻止操作
 * 4. beforeSubmit - 提交处理前钩子能阻止操作
 * 5. afterSubmitSuccess - 提交成功后钩子能被触发
 * 6. afterGetBack - 拿回成功后钩子能被触发
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const BACKEND_URL = 'http://localhost:9999'

// 登录凭证
const LOGIN = {
  username: 'admin',
  password: '123456'
}

/**
 * 登录系统
 */
async function login(page) {
  await page.goto(`${BASE_URL}/user/login`)

  // 填写登录信息（使用实际的placeholder文本）
  await page.fill('input[placeholder*="请输入账户名"]', LOGIN.username)
  await page.fill('input[placeholder*="请输入密码"]', LOGIN.password)

  // 登录按钮：使用类名选择器（按钮文本是"登 录"中间有空格）
  await page.click('button.login-button')

  // 等待响应（可能跳转到租户选择或dashboard）
  await page.waitForTimeout(2000)

  // 如果有租户选择modal，点击确定
  const tenantModal = page.locator('.ant-modal:has-text("租户")')
  if (await tenantModal.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)
  }

  // 等待跳转到dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

/**
 * 导航到DM编辑页面（含工作流）
 */
async function navigateToDmWithWorkflow(page) {
  // 等待登录后首页加载
  await page.waitForTimeout(1000)

  // 导航到DM管理
  await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
  await page.waitForTimeout(2000)

  // 找一个有工作流的DM（过滤条件：工作流实例ID不为空）
  // 直接通过后端API查询
  const dmWithWorkflow = await page.evaluate(async (backendUrl) => {
    const resp = await fetch(`${backendUrl}/ietm/dm-basic/list?column=workflow_instance_id&order=desc&pageNo=1&pageSize=10`, {
      headers: { 'X-Access-Token': localStorage.getItem('pro__Access-Token') }
    })
    const data = await resp.json()
    return data.result?.records?.find(dm => dm.workflowInstanceId) || null
  }, BACKEND_URL)

  if (!dmWithWorkflow) {
    throw new Error('未找到有工作流的DM，跳过测试')
  }

  // 打开编辑页
  await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/modules/IetmDataModuleEditor?id=${dmWithWorkflow.id}`)
  await page.waitForTimeout(3000)

  return dmWithWorkflow
}

/**
 * 注入拦截钩子的辅助脚本
 *
 * @param {Page} page - Playwright页面对象
 * @param {Object} hooks - 钩子配置
 * @param {boolean} hooks.beforeInsertNode - 是否拦截新增节点
 * @param {boolean} hooks.beforeDeleteNode - 是否拦截删除节点
 * @param {boolean} hooks.beforeSaveNode - 是否拦截保存节点
 * @param {boolean} hooks.beforeSubmit - 是否拦截提交处理
 * @param {Function} hooks.afterSubmitSuccess - 提交成功回调
 * @param {Function} hooks.afterGetBack - 拿回成功回调
 */
async function injectHookInterceptors(page, hooks) {
  await page.evaluate((config) => {
    // 存储原始Vue实例
    window.__testHookResults = {
      beforeInsertNodeCalled: false,
      beforeDeleteNodeCalled: false,
      beforeSaveNodeCalled: false,
      beforeSubmitCalled: false,
      afterSubmitSuccessCalled: false,
      afterGetBackCalled: false
    }

    // 监听Vue事件（通过拦截$emit）
    const hookVueEmit = () => {
      const vueRoot = document.querySelector('#app').__vue__
      if (!vueRoot) return false

      // 找到WorkflowInfoPanel组件实例
      const findWorkflowPanel = (vm) => {
        if (vm.$options.name === 'WorkflowInfoPanel') return vm
        if (vm.$children) {
          for (let child of vm.$children) {
            const found = findWorkflowPanel(child)
            if (found) return found
          }
        }
        return null
      }

      const panel = findWorkflowPanel(vueRoot)
      if (!panel) return false

      // 拦截$emit
      const originalEmit = panel.$emit.bind(panel)
      panel.$emit = function(event, ...args) {
        console.log('[Hook Interceptor] Event:', event, args)

        // before钩子：返回false阻止操作
        if (event === 'before-insert-node' && config.beforeInsertNode) {
          window.__testHookResults.beforeInsertNodeCalled = true
          return false
        }
        if (event === 'before-delete-node' && config.beforeDeleteNode) {
          window.__testHookResults.beforeDeleteNodeCalled = true
          return false
        }
        if (event === 'before-save-node' && config.beforeSaveNode) {
          window.__testHookResults.beforeSaveNodeCalled = true
          return false
        }
        if (event === 'before-submit' && config.beforeSubmit) {
          window.__testHookResults.beforeSubmitCalled = true
          return false
        }

        // after钩子：记录被调用
        if (event === 'after-submit-success') {
          window.__testHookResults.afterSubmitSuccessCalled = true
        }
        if (event === 'after-get-back') {
          window.__testHookResults.afterGetBackCalled = true
        }

        return originalEmit(event, ...args)
      }

      return true
    }

    // 轮询直到找到组件（Vue可能延迟挂载）
    let attempts = 0
    const interval = setInterval(() => {
      if (hookVueEmit() || attempts++ > 50) {
        clearInterval(interval)
        if (attempts > 50) {
          console.error('[Hook Interceptor] 未找到WorkflowInfoPanel组件')
        } else {
          console.log('[Hook Interceptor] 已成功注入钩子拦截器')
        }
      }
    }, 100)
  }, hooks)

  // 等待注入生效
  await page.waitForTimeout(2000)
}

test.describe('P0-19: 工作流外部钩子接口', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('TC-01: beforeInsertnode钩子能阻止新增节点', async ({ page }) => {
    const dm = await navigateToDmWithWorkflow(page)

    // 注入拦截钩子（阻止新增节点）
    await injectHookInterceptors(page, { beforeInsertNode: true })

    // 点击"新增节点"按钮
    await page.click('button:has-text("新增节点")')
    await page.waitForTimeout(1000)

    // 验证：钩子被调用
    const hookCalled = await page.evaluate(() => window.__testHookResults.beforeInsertNodeCalled)
    expect(hookCalled).toBe(true)

    // 验证：表格行数未增加（新增被阻止）
    const rowCountBefore = await page.locator('.ant-table-tbody tr').count()
    await page.waitForTimeout(500)
    const rowCountAfter = await page.locator('.ant-table-tbody tr').count()
    expect(rowCountAfter).toBe(rowCountBefore)

    // 验证：显示警告消息
    const warningShown = await page.locator('.ant-message-warning:has-text("不允许新增节点")').isVisible()
    expect(warningShown).toBe(true)
  })

  test('TC-02: beforeDelnode钩子能阻止删除节点', async ({ page }) => {
    const dm = await navigateToDmWithWorkflow(page)

    // 注入拦截钩子（阻止删除节点）
    await injectHookInterceptors(page, { beforeDeleteNode: true })

    // 获取初始行数
    const rowCountBefore = await page.locator('.ant-table-tbody tr').count()

    // 点击第一行的"删除"按钮
    await page.click('.ant-table-tbody tr:first-child button:has-text("删除")')
    await page.waitForTimeout(500)

    // 验证：钩子被调用
    const hookCalled = await page.evaluate(() => window.__testHookResults.beforeDeleteNodeCalled)
    expect(hookCalled).toBe(true)

    // 验证：行数未减少（删除被阻止）
    const rowCountAfter = await page.locator('.ant-table-tbody tr').count()
    expect(rowCountAfter).toBe(rowCountBefore)

    // 验证：显示警告消息
    const warningShown = await page.locator('.ant-message-warning:has-text("不允许删除此节点")').isVisible()
    expect(warningShown).toBe(true)
  })

  test('TC-03: beforeSavenode钩子能阻止保存节点', async ({ page }) => {
    const dm = await navigateToDmWithWorkflow(page)

    // 进入编辑模式
    await page.click('.ant-table-tbody tr:first-child button:has-text("编辑")')
    await page.waitForTimeout(500)

    // 注入拦截钩子（阻止保存节点）
    await injectHookInterceptors(page, { beforeSaveNode: true })

    // 修改意见字段
    const opinionInput = page.locator('.ant-table-tbody tr:first-child textarea[placeholder*="意见"]')
    await opinionInput.fill('测试修改意见')

    // 点击"保存"按钮
    await page.click('.ant-table-tbody tr:first-child button:has-text("保存")')
    await page.waitForTimeout(500)

    // 验证：钩子被调用
    const hookCalled = await page.evaluate(() => window.__testHookResults.beforeSaveNodeCalled)
    expect(hookCalled).toBe(true)

    // 验证：仍处于编辑状态（保存被阻止）
    const isEditing = await opinionInput.isEditable()
    expect(isEditing).toBe(true)

    // 验证：显示警告消息
    const warningShown = await page.locator('.ant-message-warning:has-text("不允许保存此节点")').isVisible()
    expect(warningShown).toBe(true)
  })

  test('TC-04: beforeSubmit钩子能阻止提交处理', async ({ page }) => {
    const dm = await navigateToDmWithWorkflow(page)

    // 注入拦截钩子（阻止提交）
    await injectHookInterceptors(page, { beforeSubmit: true })

    // 选择待办节点
    await page.click('.ant-table-tbody tr:has-text("待办")')
    await page.waitForTimeout(500)

    // 填写处理意见
    await page.fill('textarea[placeholder*="处理意见"]', '测试提交')

    // 选择"同意"
    await page.click('input[type="radio"][value="1"]')

    // 点击"提交"按钮
    await page.click('button:has-text("提交处理")')
    await page.waitForTimeout(500)

    // 验证：钩子被调用
    const hookCalled = await page.evaluate(() => window.__testHookResults.beforeSubmitCalled)
    expect(hookCalled).toBe(true)

    // 验证：节点仍为待办状态（提交被阻止）
    const todoNodeExists = await page.locator('.ant-table-tbody tr:has-text("待办")').isVisible()
    expect(todoNodeExists).toBe(true)

    // 验证：显示警告消息
    const warningShown = await page.locator('.ant-message-warning:has-text("提交前校验未通过")').isVisible()
    expect(warningShown).toBe(true)
  })

  test('TC-05: afterSubmitSuccess钩子能被触发', async ({ page }) => {
    const dm = await navigateToDmWithWorkflow(page)

    // 注入钩子监听器（不阻止，只记录）
    await injectHookInterceptors(page, {})

    // 选择待办节点
    await page.click('.ant-table-tbody tr:has-text("待办")')
    await page.waitForTimeout(500)

    // 填写处理意见并提交
    await page.fill('textarea[placeholder*="处理意见"]', '测试提交成功')
    await page.click('input[type="radio"][value="1"]')
    await page.click('button:has-text("提交处理")')

    // 等待提交完成
    await page.waitForTimeout(2000)

    // 验证：钩子被调用
    const hookCalled = await page.evaluate(() => window.__testHookResults.afterSubmitSuccessCalled)
    expect(hookCalled).toBe(true)

    // 验证：显示成功消息
    const successShown = await page.locator('.ant-message-success:has-text("成功处理")').isVisible()
    expect(successShown).toBe(true)
  })

  test('TC-06: afterGetBack钩子能被触发', async ({ page }) => {
    const dm = await navigateToDmWithWorkflow(page)

    // 注入钩子监听器（不阻止，只记录）
    await injectHookInterceptors(page, {})

    // 找一个可以拿回的节点（已处理且处理人是当前用户）
    const getBackBtn = page.locator('button:has-text("拿回")').first()
    const hasGetBackBtn = await getBackBtn.isVisible()

    if (!hasGetBackBtn) {
      test.skip() // 如果没有可拿回节点，跳过测试
      return
    }

    // 点击"拿回"
    await getBackBtn.click()
    await page.waitForTimeout(2000)

    // 验证：钩子被调用
    const hookCalled = await page.evaluate(() => window.__testHookResults.afterGetBackCalled)
    expect(hookCalled).toBe(true)

    // 验证：显示成功消息
    const successShown = await page.locator('.ant-message-success:has-text("拿回成功")').isVisible()
    expect(successShown).toBe(true)
  })
})
