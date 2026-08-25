/**
 * 登录后页面调试测试
 */

const { test, expect } = require('@playwright/test')

test('调试登录后的页面', async ({ page }) => {
  // 登录
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button:has-text("登 录")')
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 })
  await page.waitForTimeout(3000)

  // 截图
  await page.screenshot({ path: 'test-results/after-login-debug.png', fullPage: true })

  // 打印当前URL
  console.log('当前URL:', page.url())

  // 打印所有菜单项
  const menuItems = await page.locator('.ant-menu-item, .ant-menu-submenu').all()
  console.log(`\n找到 ${menuItems.length} 个菜单项`)

  for (let i = 0; i < Math.min(menuItems.length, 20); i++) {
    const item = menuItems[i]
    const text = await item.textContent()
    console.log(`菜单 ${i}: "${text}"`)
  }

  // 查找包含"项目"的文本
  const projectTexts = await page.locator('text=/.*项目.*/').all()
  console.log(`\n找到 ${projectTexts.length} 个包含"项目"的元素`)

  for (let i = 0; i < Math.min(projectTexts.length, 10); i++) {
    const text = await projectTexts[i].textContent()
    console.log(`项目相关 ${i}: "${text}"`)
  }

  // 查找包含"数据"的文本
  const dataTexts = await page.locator('text=/.*数据.*/').all()
  console.log(`\n找到 ${dataTexts.length} 个包含"数据"的元素`)

  for (let i = 0; i < Math.min(dataTexts.length, 10); i++) {
    const text = await dataTexts[i].textContent()
    console.log(`数据相关 ${i}: "${text}"`)
  }
})
