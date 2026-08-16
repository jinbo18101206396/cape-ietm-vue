const { test } = require('@playwright/test')
const http = require('http')
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2084954557183365121'
const DMC = 'DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN'
function apiLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'admin', password: '123456' })
    const req = http.request(API + '/sys/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { const j = JSON.parse(d); j.success ? resolve(j.result.token) : reject(new Error(j.message)) } catch (e) { reject(e) } })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}
test('probe header', async ({ page }) => {
  const tok = await apiLogin()
  await page.addInitScript(t => localStorage.setItem('pro__Access-Token', JSON.stringify({ value: t, expire: Date.now() + 7 * 864e5 })), tok)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => { const cm = document.querySelector('.CodeMirror'); return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule') }, { timeout: 30000 })
  await page.route('**/dm-content/validate**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, result: { flag: 'error', errors: [{ lineno: 1, info: 'test error' }] } }) }))
  await page.locator('button[title*="XSD Schema校验"]').click()
  await page.locator('.dvp-title').waitFor({ state: 'visible', timeout: 10000 })
  const info = await page.evaluate(() => {
    const ths = Array.from(document.querySelectorAll('.dm-validate-panel .ant-table-thead th'))
    return ths.map(th => ({
      html: th.outerHTML.slice(0, 220),
      thTextAlign: getComputedStyle(th).textAlign,
      inlineStyle: th.getAttribute('style')
    }))
  })
  console.log('=== TH INFO ===')
  console.log(JSON.stringify(info, null, 2))
})
