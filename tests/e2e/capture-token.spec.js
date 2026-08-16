/**
 * Capture real token from browser network requests
 */
const { test } = require('@playwright/test')

const BASE = 'http://localhost:3000'

test('Capture token from network requests', async ({ page }) => {
  let capturedToken = null

  // Listen to all requests
  page.on('request', request => {
    const headers = request.headers()
    if (headers['x-access-token']) {
      capturedToken = headers['x-access-token']
      console.log(`✅ Captured X-Access-Token: ${capturedToken}`)
    }
    if (headers['authorization']) {
      console.log(`✅ Captured Authorization: ${headers['authorization']}`)
    }
  })

  // Navigate to DM management to trigger API calls
  await page.goto(`${BASE}/ietm/data-module-management`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  // Check localStorage and sessionStorage
  const storageData = await page.evaluate(() => {
    const result = {
      localStorage: {},
      sessionStorage: {},
      cookies: document.cookie
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      result.localStorage[key] = localStorage.getItem(key)
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      result.sessionStorage[key] = sessionStorage.getItem(key)
    }

    return result
  })

  console.log('\n📦 Storage data:')
  console.log('localStorage:', JSON.stringify(storageData.localStorage, null, 2))
  console.log('sessionStorage:', JSON.stringify(storageData.sessionStorage, null, 2))
  console.log('cookies:', storageData.cookies)

  if (capturedToken) {
    console.log(`\n✅ Use this token:`)
    console.log(`const TOKEN = '${capturedToken}'`)
  } else {
    console.log('\n❌ No token captured from network requests')
  }
})
