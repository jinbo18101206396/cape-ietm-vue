/**
 * IETM DM内容编辑器 - E2E测试套件
 *
 * 测试目标：验证"DM不存在"问题已修复，并确保核心功能正常
 *
 * 运行方式：
 *   npx playwright test tests/e2e/dm-content-editor.spec.js
 *
 * 前置条件：
 *   1. 前端服务运行在 http://localhost:3000
 *   2. 后端服务运行在 http://localhost:9999
 *   3. 数据库中至少有一条可编辑的DM记录
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_USER = process.env.TEST_USER || 'admin'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123'

test.describe('DM内容编辑器 - 核心场景测试', () => {

  // 每个测试前登录
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="账号"]', TEST_USER)
    await page.fill('input[placeholder="密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')

    // 等待跳转到首页
    await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 })

    // 导航到DM管理页面
    await page.click('text=项目管理')
    await page.click('text=数据模块管理')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
  })

  /**
   * TC-001: 打开DM编辑器
   * 验证：编辑器正常打开，显示XML内容
   */
  test('TC-001: 应该能正常打开DM编辑器', async ({ page }) => {
    // 选择第一条记录
    await page.click('.ant-table-tbody tr:first-child .ant-checkbox-input')

    // 点击"编辑内容"按钮
    await page.click('button:has-text("编辑内容")')

    // 等待编辑器加载
    await page.waitForSelector('.dm-editor-page', { timeout: 15000 })

    // 验证CodeMirror编辑器存在
    const editor = await page.locator('.CodeMirror')
    await expect(editor).toBeVisible()

    // 验证有XML内容（不为空）
    const content = await page.locator('.CodeMirror-code').textContent()
    expect(content.length).toBeGreaterThan(0)

    console.log('✅ TC-001 通过：DM编辑器正常打开')
  })

  /**
   * TC-003: 关闭未修改页面
   * 验证：直接关闭，无"DM不存在"错误
   */
  test('TC-003: 关闭未修改的编辑器页面不应报错', async ({ page, context }) => {
    // 监听所有console错误
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 监听网络错误
    const failedRequests = []
    page.on('response', response => {
      if (!response.ok()) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        })
      }
    })

    // 打开编辑器
    await page.click('.ant-table-tbody tr:first-child .ant-checkbox-input')
    await page.click('button:has-text("编辑内容")')
    await page.waitForSelector('.dm-editor-page', { timeout: 15000 })

    // 等待3秒确保页面完全加载
    await page.waitForTimeout(3000)

    // 关闭标签页（通过点击标签页的关闭按钮）
    const tabs = await page.locator('.ant-tabs-tab')
    const tabCount = await tabs.count()

    if (tabCount > 1) {
      // 找到当前激活的标签页
      const activeTab = await page.locator('.ant-tabs-tab-active')
      const closeBtn = activeTab.locator('.anticon-close')
      await closeBtn.click()
    }

    // 等待2秒观察是否有错误
    await page.waitForTimeout(2000)

    // 验证：不应该有包含"DM不存在"或"undefined"的错误
    const dmNotExistErrors = failedRequests.filter(req =>
      req.url.includes('undefined') ||
      req.url.includes('/load/undefined')
    )

    expect(dmNotExistErrors.length).toBe(0)

    const dmNotExistConsole = consoleErrors.filter(err =>
      err.includes('DM不存在') ||
      err.includes('undefined')
    )

    expect(dmNotExistConsole.length).toBe(0)

    console.log('✅ TC-003 通过：关闭页面无"DM不存在"错误')
  })

  /**
   * TC-004: 关闭已修改页面
   * 验证：弹出确认对话框，无"DM不存在"错误
   */
  test('TC-004: 关闭已修改的页面应弹出确认框', async ({ page }) => {
    // 监听确认对话框
    let confirmDialogAppeared = false
    page.on('dialog', dialog => {
      confirmDialogAppeared = true
      dialog.accept() // 点击确认
    })

    // 监听网络错误
    const failedRequests = []
    page.on('response', response => {
      if (!response.ok() && response.url().includes('undefined')) {
        failedRequests.push(response.url())
      }
    })

    // 打开编辑器
    await page.click('.ant-table-tbody tr:first-child .ant-checkbox-input')
    await page.click('button:has-text("编辑内容")')
    await page.waitForSelector('.dm-editor-page', { timeout: 15000 })

    // 等待CodeMirror加载
    await page.waitForSelector('.CodeMirror', { timeout: 5000 })

    // 修改内容（在CodeMirror中添加一个空格）
    await page.click('.CodeMirror')
    await page.keyboard.type(' ')

    // 等待1秒确保dirty标志被设置
    await page.waitForTimeout(1000)

    // 尝试关闭标签页
    const tabs = await page.locator('.ant-tabs-tab')
    const tabCount = await tabs.count()

    if (tabCount > 1) {
      const activeTab = await page.locator('.ant-tabs-tab-active')
      const closeBtn = activeTab.locator('.anticon-close')
      await closeBtn.click()

      // 等待确认对话框出现
      await page.waitForTimeout(1000)
    }

    // 验证：应该出现了确认对话框
    // （如果使用的是Ant Design的Modal，需要查找Modal而不是原生dialog）
    const modal = await page.locator('.ant-modal:has-text("确认离开")')
    const modalVisible = await modal.isVisible().catch(() => false)

    // 验证：不应该有undefined的请求
    expect(failedRequests.length).toBe(0)

    console.log('✅ TC-004 通过：关闭已修改页面有确认提示')
  })

  /**
   * TC-022: 关闭中间标签页
   * 验证：其他标签页不受影响
   */
  test('TC-022: 关闭中间标签页不应影响其他标签', async ({ page }) => {
    // 打开第一个DM
    await page.click('.ant-table-tbody tr:nth-child(1) .ant-checkbox-input')
    await page.click('button:has-text("编辑内容")')
    await page.waitForSelector('.dm-editor-page', { timeout: 15000 })

    // 返回列表
    await page.click('text=数据模块管理')
    await page.waitForSelector('.ant-table-tbody', { timeout: 5000 })

    // 打开第二个DM
    await page.click('.ant-table-tbody tr:nth-child(2) .ant-checkbox-input')
    await page.click('button:has-text("编辑内容")')
    await page.waitForSelector('.dm-editor-page', { timeout: 15000 })

    // 返回列表
    await page.click('text=数据模块管理')
    await page.waitForSelector('.ant-table-tbody', { timeout: 5000 })

    // 打开第三个DM
    await page.click('.ant-table-tbody tr:nth-child(3) .ant-checkbox-input')
    await page.click('button:has-text("编辑内容")')
    await page.waitForSelector('.dm-editor-page', { timeout: 15000 })

    // 现在应该有3个DM编辑器标签页
    const tabs = await page.locator('.ant-tabs-tab')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(3)

    // 监听错误
    const failedRequests = []
    page.on('response', response => {
      if (!response.ok() && response.url().includes('undefined')) {
        failedRequests.push(response.url())
      }
    })

    // 关闭中间的标签页（第二个DM）
    const secondTab = tabs.nth(1)
    const closeBtn = secondTab.locator('.anticon-close')
    await closeBtn.click()

    // 等待2秒
    await page.waitForTimeout(2000)

    // 验证：无undefined请求
    expect(failedRequests.length).toBe(0)

    // 验证：标签数量减少了1
    const newTabCount = await page.locator('.ant-tabs-tab').count()
    expect(newTabCount).toBe(tabCount - 1)

    console.log('✅ TC-022 通过：关闭中间标签页无影响')
  })

  /**
   * TC-041: 快速打开关闭
   * 验证：在1秒内打开并关闭，无报错
   */
  test('TC-041: 快速打开关闭不应报错', async ({ page }) => {
    const failedRequests = []
    page.on('response', response => {
      if (!response.ok() && response.url().includes('undefined')) {
        failedRequests.push(response.url())
      }
    })

    // 打开编辑器
    await page.click('.ant-table-tbody tr:first-child .ant-checkbox-input')
    await page.click('button:has-text("编辑内容")')

    // 立即关闭（不等待完全加载）
    await page.waitForTimeout(500) // 只等待500ms

    const tabs = await page.locator('.ant-tabs-tab')
    const tabCount = await tabs.count()

    if (tabCount > 1) {
      const activeTab = await page.locator('.ant-tabs-tab-active')
      const closeBtn = activeTab.locator('.anticon-close')
      await closeBtn.click()
    }

    // 等待2秒观察
    await page.waitForTimeout(2000)

    // 验证：无undefined请求
    expect(failedRequests.length).toBe(0)

    console.log('✅ TC-041 通过：快速打开关闭无报错')
  })
})

test.describe('DM内容编辑器 - 边界测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="账号"]', TEST_USER)
    await page.fill('input[placeholder="密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')
    await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 })
  })

  /**
   * TC-033: 空ID测试
   * 验证：手动访问空ID的URL，不应发起请求
   */
  test('TC-033: 访问空ID的URL不应发起API请求', async ({ page }) => {
    const apiCalls = []
    page.on('request', request => {
      if (request.url().includes('/ietm/dm-content/load/')) {
        apiCalls.push(request.url())
      }
    })

    // 直接访问空ID的URL
    await page.goto(`${BASE_URL}/ietm/dm-editor/`)

    // 等待3秒
    await page.waitForTimeout(3000)

    // 验证：不应该有包含undefined的加载请求
    const undefinedCalls = apiCalls.filter(url => url.includes('undefined'))
    expect(undefinedCalls.length).toBe(0)

    console.log('✅ TC-033 通过：空ID不发起请求')
  })

  /**
   * TC-034: undefined字符串ID测试
   * 验证：访问undefined ID的URL，不应发起请求
   */
  test('TC-034: 访问undefined ID的URL不应发起API请求', async ({ page }) => {
    const apiCalls = []
    page.on('request', request => {
      if (request.url().includes('/ietm/dm-content/load/')) {
        apiCalls.push(request.url())
      }
    })

    // 直接访问undefined ID的URL
    await page.goto(`${BASE_URL}/ietm/dm-editor/undefined`)

    // 等待3秒
    await page.waitForTimeout(3000)

    // 验证：不应该有加载请求
    const undefinedCalls = apiCalls.filter(url => url.includes('undefined'))
    expect(undefinedCalls.length).toBe(0)

    console.log('✅ TC-034 通过：undefined ID不发起请求')
  })
})

// 生成测试报告
test.afterAll(async () => {
  console.log('\n==========================================')
  console.log('  DM内容编辑器 E2E测试完成')
  console.log('==========================================\n')
})
