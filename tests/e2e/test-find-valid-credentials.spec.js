/**
 * 尝试多个账号密码组合找到有效凭据
 */

const { test, expect } = require('@playwright/test')

const credentials = [
  { username: 'admin', password: 'admin' },
  { username: 'admin', password: '123456' },
  { username: 'admin', password: 'admin123' },
  { username: 'test', password: 'test' },
  { username: 'test', password: '123456' }
]

test('尝试找到有效的登录凭据', async ({ page }) => {
  for (const cred of credentials) {
    console.log(`\n尝试: ${cred.username} / ${cred.password}`)

    await page.goto('http://localhost:3000/user/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="text"]', cred.username)
    await page.fill('input[type="password"]', cred.password)

    // 监听登录响应
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/sys/login'),
      { timeout: 5000 }
    ).catch(() => null)

    await page.click('button:has-text("登 录")')

    const response = await responsePromise
    if (response) {
      const body = await response.json()
      console.log(`响应: ${JSON.stringify(body)}`)

      if (body.success) {
        console.log(`✅ 成功! 使用账号: ${cred.username} / ${cred.password}`)
        await page.waitForTimeout(2000)
        console.log(`登录后URL: ${page.url()}`)
        return
      }
    }

    await page.waitForTimeout(1000)
  }

  console.log('\n❌ 所有凭据都失败了')
})
