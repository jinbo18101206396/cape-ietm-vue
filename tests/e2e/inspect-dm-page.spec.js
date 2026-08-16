/**
 * Inspect DM management page structure to understand UI elements
 */
const { test } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NTUwOTg0MjUsInVzZXJuYW1lIjoiYWRtaW4ifQ.G_ryx3_rLyhZG7c0OPkHdBYBykIC-pxpwEMaVLt_EJo'

test('Inspect page structure', async ({ page }) => {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)

  await page.goto(`${BASE}/ietm/data-module-management`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  // Get page HTML
  const html = await page.content()
  console.log('=== Page loaded ===')

  // Check for various UI elements
  const buttons = await page.locator('button').all()
  console.log(`Found ${buttons.length} buttons`)
  for (let i = 0; i < Math.min(buttons.length, 20); i++) {
    const text = await buttons[i].textContent()
    console.log(`  Button ${i}: "${text}"`)
  }

  // Check for tree nodes
  const treeNodes = await page.locator('[class*="tree"]').all()
  console.log(`\nFound ${treeNodes.length} tree-related elements`)

  // Check for ant-design components
  const antComponents = await page.locator('[class*="ant-"]').all()
  console.log(`Found ${antComponents.length} ant-design components`)

  // Take screenshot
  await page.screenshot({ path: 'test-results/dm-page-inspection.png', fullPage: true })
  console.log('\n📸 Screenshot saved to test-results/dm-page-inspection.png')

  // Wait to keep browser open
  await page.waitForTimeout(5000)
})
