/**
 * Get valid token by logging in through UI
 */
const { test } = require('@playwright/test')

const BASE = 'http://localhost:3000'

test('Get token from UI login', async ({ page }) => {
  await page.goto(`${BASE}/user/login`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // Fill login form if visible
  const usernameInput = page.locator('input[placeholder*="账户"], input[type="text"]').first()
  const passwordInput = page.locator('input[placeholder*="密码"], input[type="password"]').first()
  const loginButton = page.locator('button:has-text("登"), button[type="submit"]').first()

  if (await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await usernameInput.fill('admin')
    await passwordInput.fill('admin')
    await loginButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  }

  // Extract token from localStorage
  const token = await page.evaluate(() => {
    const stored = localStorage.getItem('pro__Access-Token')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.value
    }
    // Try other possible keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.includes('Token') || key.includes('token')) {
        console.log(`Found token key: ${key} = ${localStorage.getItem(key)}`)
        return localStorage.getItem(key)
      }
    }
    return null
  })

  console.log(`\n✅ Token extracted from UI:`)
  console.log(token)
  console.log(`\nUpdate scripts with:`)
  console.log(`const TOKEN = '${token}'`)
})
