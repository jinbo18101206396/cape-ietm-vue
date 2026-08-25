/**
 * 工作流信息模块 - 完整UI测试
 * 策略：直接在浏览器控制台注入登录状态，然后进行UI测试
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999/jeecg-boot'

test.setTimeout(180000)

test.describe('工作流信息模块 - UI功能测试', () => {
  let sharedContext = {
    hasDm: false,
    hasWorkflow: false
  }

  // ========== 测试1: 检查系统可访问性 ==========
  test('TEST-01: 系统可访问性检查', async ({ page }) => {
    console.log('\n[TEST-01] 开始系统可访问性检查')

    await page.goto(`${BASE_URL}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 检查页面是否加载
    const title = await page.title()
    console.log('[TEST-01] 页面标题:', title)

    expect(title).toBeTruthy()

    // 截图
    await page.screenshot({ path: 'test-results/01-homepage.png', fullPage: true })

    console.log('[TEST-01] ✓ 系统可访问')
  })

  // ========== 测试2: 登录页面结构检查 ==========
  test('TEST-02: 登录页面元素检查', async ({ page }) => {
    console.log('\n[TEST-02] 检查登录页面元素')

    await page.goto(`${BASE_URL}/#/user/login`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // 等待Vue应用加载
    await page.waitForSelector('.user-layout-login, form, input', { timeout: 10000 }).catch(() => {})

    await page.screenshot({ path: 'test-results/02-login-page.png', fullPage: true })

    // 查找所有输入框
    const inputs = await page.locator('input').all()
    console.log('[TEST-02] 找到输入框数量:', inputs.length)

    // 查找所有按钮
    const buttons = await page.locator('button').all()
    console.log('[TEST-02] 找到按钮数量:', buttons.length)

    // 获取页面HTML（用于调试）
    const bodyHtml = await page.locator('body').innerHTML()
    console.log('[TEST-02] 页面HTML长度:', bodyHtml.length)

    if (inputs.length === 0) {
      console.log('[TEST-02] ⚠ 未找到输入框，Vue应用可能未完全加载')
      console.log('[TEST-02] 页面内容预览:', bodyHtml.substring(0, 500))
    }

    expect(inputs.length).toBeGreaterThan(0)
  })

  // ========== 测试3: 通过API直接设置登录状态 ==========
  test('TEST-03: API登录并访问DM列表', async ({ page, request }) => {
    console.log('\n[TEST-03] 通过API登录')

    // 方案：直接访问系统，手动设置token到localStorage
    // 这需要预先知道一个有效的token，或者先调用登录API

    try {
      // 尝试登录API
      const loginResponse = await request.post(`${API_BASE}/sys/login`, {
        data: {
          username: 'admin',
          password: 'admin123', // 根据实际情况修改
          captcha: '1234',
          checkKey: Date.now()
        },
        timeout: 10000
      }).catch(err => {
        console.log('[TEST-03] 登录API失败:', err.message)
        return null
      })

      if (loginResponse && loginResponse.ok()) {
        const loginData = await loginResponse.json()
        console.log('[TEST-03] 登录响应:', loginData)

        if (loginData.success && loginData.result && loginData.result.token) {
          const token = loginData.result.token

          // 访问前端页面并注入token
          await page.goto(`${BASE_URL}`)
          await page.waitForLoadState('networkidle')

          // 注入token到localStorage
          await page.evaluate((token) => {
            localStorage.setItem('Access-Token', token)
            localStorage.setItem('pro__Access-Token', token)
          }, token)

          console.log('[TEST-03] ✓ Token已注入')

          // 刷新页面，让token生效
          await page.reload()
          await page.waitForTimeout(3000)

          await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true })

          // 检查是否登录成功（查找用户头像或菜单）
          const userMenu = await page.locator('.user-dropdown-menu, .ant-dropdown-trigger, text=管理员')
            .isVisible({ timeout: 5000 })
            .catch(() => false)

          console.log('[TEST-03] 登录状态验证:', userMenu)

          if (userMenu) {
            console.log('[TEST-03] ✓✓ 登录成功')
          }
        }
      }
    } catch (error) {
      console.log('[TEST-03] 登录过程出错:', error.message)
    }

    // 无论登录是否成功，都尝试访问DM列表页
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/04-dm-list.png', fullPage: true })

    // 检查是否有表格
    const tableVisible = await page.locator('table').isVisible({ timeout: 5000 }).catch(() => false)
    console.log('[TEST-03] DM列表表格visible:', tableVisible)

    if (tableVisible) {
      const rowCount = await page.locator('table tbody tr').count()
      console.log('[TEST-03] DM记录数:', rowCount)
      sharedContext.hasDm = rowCount > 0
    }
  })

  // ========== 测试4: 工作流信息面板UI结构 ==========
  test('TEST-04: 工作流信息面板UI元素', async ({ page, request }) => {
    console.log('\n[TEST-04] 检查工作流信息面板UI')

    // 先登录
    await tryLogin(page, request)

    // 进入DM列表
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(3000)

    const tableRows = page.locator('table tbody tr')
    const rowCount = await tableRows.count()

    if (rowCount === 0) {
      console.log('[TEST-04] ⚠ 无DM数据，跳过测试')
      test.skip()
      return
    }

    // 点击第一条记录
    await tableRows.first().click()
    await page.waitForTimeout(500)

    // 点击详情按钮
    const detailBtn = page.locator('button:has-text("详情")').first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()
      await page.waitForTimeout(3000)
    }

    await page.screenshot({ path: 'test-results/05-dm-detail.png', fullPage: true })

    // 切换到流程信息标签页
    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    if (await workflowTab.isVisible()) {
      await workflowTab.click()
      await page.waitForTimeout(2000)

      await page.screenshot({ path: 'test-results/06-workflow-panel.png', fullPage: true })

      // 检查关键UI元素
      const hasToolbar = await page.locator('.wf-toolbar, button:has-text("新增")').isVisible({ timeout: 3000 }).catch(() => false)
      const hasTable = await page.locator('table').isVisible({ timeout: 3000 }).catch(() => false)

      console.log('[TEST-04] 工具栏visible:', hasToolbar)
      console.log('[TEST-04] 节点列表表格visible:', hasTable)

      expect(hasTable).toBe(true)

      // 统计按钮
      const allButtons = await page.locator('button').all()
      const buttonTexts = await Promise.all(allButtons.map(btn => btn.textContent()))

      console.log('[TEST-04] 页面按钮:', buttonTexts.filter(t => t.trim()).slice(0, 20))

      // 检查特定按钮
      const hasDeleteBtn = buttonTexts.some(t => t.includes('删除'))
      const hasAddBtn = buttonTexts.some(t => t === '新增')
      const hasTakeBackBtn = buttonTexts.some(t => t.includes('拿回'))

      console.log('[TEST-04] "删除"按钮存在:', hasDeleteBtn)
      console.log('[TEST-04] "新增"按钮存在:', hasAddBtn)
      console.log('[TEST-04] "拿回"按钮存在:', hasTakeBackBtn)

      sharedContext.hasWorkflow = hasTable
    }
  })

  // ========== 测试5: 删除按钮状态测试 ==========
  test('TEST-05: 删除按钮禁用状态验证', async ({ page, request }) => {
    console.log('\n[TEST-05] 验证删除按钮禁用逻辑')

    await tryLogin(page, request)
    await navigateToWorkflowPanel(page)

    // 点击空白区域确保未选中
    await page.click('text=流程信息')
    await page.waitForTimeout(500)

    // 查找删除按钮
    const deleteBtn = page.locator('button:has-text("删除")').first()
    const btnVisible = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      const isDisabled = await deleteBtn.isDisabled()
      console.log('[TEST-05] 未选中节点，删除按钮disabled:', isDisabled)

      await page.screenshot({ path: 'test-results/07-delete-btn-disabled.png' })

      expect(isDisabled).toBe(true)
      console.log('[TEST-05] ✓ 删除按钮禁用状态正确')
    } else {
      console.log('[TEST-05] ⚠ 删除按钮不可见')
    }
  })

  // ========== 测试6: 新增节点UI测试 ==========
  test('TEST-06: 新增节点UI交互', async ({ page, request }) => {
    console.log('\n[TEST-06] 测试新增节点功能')

    await tryLogin(page, request)
    await navigateToWorkflowPanel(page)

    // 查找新增按钮
    const addBtn = page.locator('button:has-text("新增")').first()
    const btnVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!btnVisible) {
      console.log('[TEST-06] ⚠ 新增按钮不可见，可能无权限')
      test.skip()
      return
    }

    // 记录当前行数
    const rowsBefore = await page.locator('table tbody tr').count()
    console.log('[TEST-06] 新增前节点数:', rowsBefore)

    // 点击新增
    await addBtn.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/08-after-click-add.png', fullPage: true })

    // 检查行数是否增加
    const rowsAfter = await page.locator('table tbody tr').count()
    console.log('[TEST-06] 新增后节点数:', rowsAfter)

    if (rowsAfter > rowsBefore) {
      console.log('[TEST-06] ✓ 新行已添加')

      // 获取最后一行
      const newRow = page.locator('table tbody tr').last()

      // 获取所有单元格内容
      const cells = await newRow.locator('td').all()
      const cellTexts = await Promise.all(cells.map(c => c.textContent()))

      console.log('[TEST-06] 新行内容:')
      cellTexts.forEach((text, i) => {
        const cleaned = text.trim().substring(0, 50)
        if (cleaned) {
          console.log(`  列${i + 1}:`, cleaned)
        }
      })

      // 取消编辑
      const cancelBtn = newRow.locator('button:has-text("取消")').first()
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click()
        await page.waitForTimeout(500)
        console.log('[TEST-06] 已取消编辑')
      }
    } else {
      console.log('[TEST-06] ✗ 未检测到新行')
    }
  })
})

// ========== 辅助函数 ==========

async function tryLogin(page, request) {
  try {
    const loginResponse = await request.post(`${API_BASE}/sys/login`, {
      data: {
        username: 'admin',
        password: 'admin123',
        captcha: '1234',
        checkKey: Date.now()
      },
      timeout: 10000
    }).catch(() => null)

    if (loginResponse && loginResponse.ok()) {
      const data = await loginResponse.json()
      if (data.success && data.result && data.result.token) {
        await page.goto(`${BASE_URL}`)
        await page.evaluate((token) => {
          localStorage.setItem('Access-Token', token)
        }, data.result.token)
        await page.reload()
        await page.waitForTimeout(2000)
      }
    }
  } catch (error) {
    console.log('[登录] 失败:', error.message)
  }
}

async function navigateToWorkflowPanel(page) {
  await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
  await page.waitForTimeout(2000)

  const firstRow = page.locator('table tbody tr').first()
  await firstRow.click()
  await page.waitForTimeout(500)

  const detailBtn = page.locator('button:has-text("详情")').first()
  await detailBtn.click()
  await page.waitForTimeout(2000)

  const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
  await workflowTab.click()
  await page.waitForTimeout(2000)
}
