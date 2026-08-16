const { test, expect } = require('@playwright/test')
const http = require('http')
// §5 移动行：验证移动后光标准确落在"移动后的元素"，尤其向下移动不漂移到闭合标签。真实UI交互。
const BASE = 'http://localhost:3000'; const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2083905781513461761'; const DMC = 'DMC-J-ZB1-A-02-111A-A-00-0030101-001-01_ZH-CN'
function apiLogin() { return new Promise((res, rej) => { const b = JSON.stringify({ username: 'admin', password: '123456' }); const r = http.request(API + '/sys/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => { try { const j = JSON.parse(d); j.success ? res(j.result.token) : rej(new Error(j.message)) } catch (e) { rej(e) } }) }); r.on('error', rej); r.write(b); r.end() }) }
let TOKEN; test.beforeAll(async() => { TOKEN = await apiLogin() })
async function open(page) {
  await page.addInitScript(([t]) => localStorage.setItem('pro__Access-Token', JSON.stringify({ value: t, expire: Date.now() + 7 * 864e5 })), [TOKEN])
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => { const cm = document.querySelector('.CodeMirror'); return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule') }, { timeout: 30000 })
}
async function moveViaUI(page, from, to) {
  await page.locator('button[title*="移动行"]').click()
  const modal = page.locator('.ant-modal:has(.ant-modal-title:has-text("移动行"))')
  await modal.waitFor({ state: 'visible', timeout: 5000 })
  const nums = modal.locator('input.ant-input-number-input')
  for (const [i, v] of [[0, from], [1, to]]) { await nums.nth(i).click(); await nums.nth(i).press('Control+a'); await nums.nth(i).pressSequentially(String(v)); await nums.nth(i).press('Tab') }
  await modal.locator('.ant-modal-footer button.ant-btn-primary').click()
  await page.waitForTimeout(600)
}
test('向下移动 refs 到 </content> 前 → 光标落在 refs，不漂移到闭合标签', async ({ page }) => {
  await open(page)
  const L = await page.evaluate(() => { const l = document.querySelector('.CodeMirror').CodeMirror.getValue().split('\n'); return { refs: l.findIndex(x => /^\s*<refs[\s>]/.test(x)) + 1, cEnd: l.findIndex(x => /^\s*<\/content>/.test(x)) + 1 } })
  await moveViaUI(page, L.refs, L.cEnd)
  const r = await page.evaluate(() => { const cm = document.querySelector('.CodeMirror').CodeMirror; const c = cm.getCursor(); return { text: (cm.getLine(c.line) || '').trim(), line1: c.line + 1 } })
  console.log('DOWN=' + JSON.stringify(r))
  expect(r.text).toMatch(/<refs[\s>]/) // 修复前会是 </content>
  console.log('✅ 向下移动：光标落在 refs（行' + r.line1 + '）')
})
test('向上移动 description 到 refs 前 → 光标落在 description（无回归）', async ({ page }) => {
  await open(page)
  const L = await page.evaluate(() => { const l = document.querySelector('.CodeMirror').CodeMirror.getValue().split('\n'); return { desc: l.findIndex(x => /^\s*<description[\s>]/.test(x)) + 1, refs: l.findIndex(x => /^\s*<refs[\s>]/.test(x)) + 1 } })
  await moveViaUI(page, L.desc, L.refs)
  const r = await page.evaluate(() => { const cm = document.querySelector('.CodeMirror').CodeMirror; const c = cm.getCursor(); return { text: (cm.getLine(c.line) || '').trim(), line1: c.line + 1 } })
  console.log('UP=' + JSON.stringify(r))
  expect(r.text).toMatch(/<description[\s>]/)
  console.log('✅ 向上移动：光标落在 description（行' + r.line1 + '）')
})
