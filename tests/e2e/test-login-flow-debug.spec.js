/**
 * 登录流程详细调试
 */

const { test, expect } = require('@playwright/test')

test('调试登录流程', async ({ page }) => {
  // 监听网络请求
  page.on('response', async (response) => {
    if (response.url().includes('login')) {
      console.log(`登录请求响应: ${response.status()}`)
      try {
        const body = await response.text()
        console.log(`响应内容: ${body.substring(0, 200)}`)
      } catch (e) {
        console.log('无法读取响应内容')
      }
    }
  })

  // 访问登录页面
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')

  console.log('填写账号')
  await page.fill('input[type="text"]', 'admin')

  console.log('填写密码')
  await page.fill('input[type="password"]', 'admin123')

  console.log('点击登录按钮')
  await page.click('button:has-text("登 录")')

  // 等待响应
  await page.waitForTimeout(3000)

  console.log('登录后URL:', page.url())

  // 截图
  await page.screenshot({ path: 'test-results/login-flow-debug.png', fullPage: true })

  // 检查是否有错误提示
  const errorMsg = await page.locator('.ant-message-error, .ant-notification-notice-error').count()
  console.log('错误提示数量:', errorMsg)

  if (errorMsg > 0) {
    const errorText = await page.locator('.ant-message-error, .ant-notification-notice-error').first().textContent()
    console.log('错误内容:', errorText)
  }
})
