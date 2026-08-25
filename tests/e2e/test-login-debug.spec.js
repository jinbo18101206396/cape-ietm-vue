/**
 * 登录页面调试测试
 */

const { test, expect } = require('@playwright/test')

test('调试登录页面', async ({ page }) => {
  // 访问登录页面
  await page.goto('http://localhost:3000/user/login')

  // 等待页面完全加载
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // 截图
  await page.screenshot({ path: 'test-results/login-page-debug.png', fullPage: true })

  // 打印页面所有输入框
  const inputs = await page.locator('input').all()
  console.log(`找到 ${inputs.length} 个输入框`)

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const placeholder = await input.getAttribute('placeholder')
    const type = await input.getAttribute('type')
    const name = await input.getAttribute('name')
    console.log(`输入框 ${i}: placeholder="${placeholder}", type="${type}", name="${name}"`)
  }

  // 打印所有按钮
  const buttons = await page.locator('button').all()
  console.log(`\n找到 ${buttons.length} 个按钮`)

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const text = await button.textContent()
    console.log(`按钮 ${i}: "${text}"`)
  }

  // 打印页面HTML
  const html = await page.content()
  console.log('\n页面HTML长度:', html.length)
})
