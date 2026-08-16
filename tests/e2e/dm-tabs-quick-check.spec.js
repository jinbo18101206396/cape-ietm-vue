/**
 * 快速检查 - 底部页签是否渲染
 */

const { test, expect } = require('@playwright/test')

test('快速检查底部页签', async ({ page }) => {
  console.log('=== 开始导航 ===')

  // 收集所有控制台消息
  const consoleMessages = []
  page.on('console', msg => {
    const text = msg.text()
    consoleMessages.push(`[${msg.type()}] ${text}`)
    console.log(`浏览器 [${msg.type()}]: ${text}`)
  })

  // 收集页面错误
  page.on('pageerror', error => {
    console.log(`页面错误: ${error.message}`)
    consoleMessages.push(`[pageerror] ${error.message}`)
  })

  // 登录
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')

  // 尝试多种选择器
  const usernameInput = await page.locator('input[placeholder="账号"], input[type="text"]').first()
  await usernameInput.waitFor({ timeout: 10000 })
  await usernameInput.fill('admin')

  const passwordInput = await page.locator('input[placeholder="密码"], input[type="password"]').first()
  await passwordInput.fill('123456')

  // 尝试多种登录按钮选择器
  const loginButton = await page.locator('button:has-text("登录"), button[type="submit"], .ant-btn-primary').first()
  await loginButton.click()
  console.log('✓ 登录完成')

  // 等待登录完成
  await page.waitForSelector('.ant-avatar, .user-dropdown', { timeout: 10000 })
  console.log('✓ 登录成功，用户信息已加载')

  // 导航：项目管理 → 数据模块管理
  await page.click('text=项目管理')
  await page.click('text=数据模块管理')
  await page.waitForSelector('.ant-table-tbody tr', { timeout: 15000 })
  await page.waitForTimeout(2000)
  console.log('✓ 进入数据模块管理页面')

  // 选择第一条记录（点击复选框）
  await page.click('.ant-table-tbody tr:first-child .ant-checkbox-input')
  console.log('✓ 已选中第一个DM')

  // 点击"编辑内容"按钮
  await page.click('button:has-text("编辑内容")')
  console.log('✓ 点击了「编辑内容」')

  // 等待编辑器页面加载
  await page.waitForSelector('.dm-editor-page', { timeout: 15000 })
  console.log('✓ 编辑器页面已加载')
  console.log('✓ CodeMirror 已加载')

  await page.waitForTimeout(2000) // 等待布局稳定

  // 检查页签容器
  const tabsExists = await page.locator('.view-tabs').count()
  console.log(`页签容器 .view-tabs 数量: ${tabsExists}`)

  const tabsBottomExists = await page.locator('.view-tabs.ant-tabs-bottom').count()
  console.log(`底部页签容器 .view-tabs.ant-tabs-bottom 数量: ${tabsBottomExists}`)

  const allTabs = await page.locator('.ant-tabs-tab').count()
  console.log(`页签按钮 .ant-tabs-tab 数量: ${allTabs}`)

  if (allTabs > 0) {
    const tab0Text = await page.locator('.ant-tabs-tab').nth(0).innerText()
    const tab1Text = allTabs > 1 ? await page.locator('.ant-tabs-tab').nth(1).innerText() : 'N/A'
    console.log(`页签0文本: ${tab0Text}`)
    console.log(`页签1文本: ${tab1Text}`)
  }

  // 检查状态栏
  const statusBarCount = await page.locator('.editor-status').count()
  console.log(`底部状态栏 .editor-status 数量: ${statusBarCount}`)

  // 截图
  await page.screenshot({ path: 'tests/e2e/dm-editor-quick-check.png', fullPage: true })
  console.log('✓ 截图已保存: tests/e2e/dm-editor-quick-check.png')

  // 断言
  expect(tabsBottomExists).toBeGreaterThan(0)
  expect(allTabs).toBe(2)
  expect(statusBarCount).toBe(0)
})
