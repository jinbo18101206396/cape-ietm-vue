const { test } = require('@playwright/test')
const http = require('http')
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2083905781513461761'

function apiLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'admin', password: '123456' })
    const req = http.request(API + '/sys/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { const j = JSON.parse(d); j.success ? resolve(j.result.token) : reject(new Error(j.message)) }) })
    req.on('error', reject); req.write(body); req.end()
  })
}

test('探路：dump 真实页面结构', async ({ page }) => {
  test.setTimeout(90000)
  const TOKEN = await apiLogin()
  await page.addInitScript(([t]) => localStorage.setItem('pro__Access-Token', JSON.stringify({ value: t, expire: Date.now() + 7 * 864e5 })), [TOKEN])
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=x`)
  await page.waitForSelector('.CodeMirror')
  await page.waitForFunction(() => { const cm = document.querySelector('.CodeMirror'); return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule') })

  // 1) 编辑器全文带行号
  const lines = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue().split('\n').map((l, i) => (i + 1) + ':' + l))
  console.log('=== DM 全文 ===\n' + lines.join('\n'))

  // 2) 找 description 行，设光标到其行末，按 Enter 弹补全
  const descLine = await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    for (let i = 0; i < cm.lineCount(); i++) if ((cm.getLine(i) || '').trim().startsWith('<description')) return i
    return -1
  })
  console.log('description 行(0-based):', descLine)
  await page.evaluate((l) => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.focus(); cm.setCursor({ line: l, ch: cm.getLine(l).length }) }, descLine)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  const hints = await page.locator('.CodeMirror-hints .CodeMirror-hint').allTextContents().catch(() => [])
  console.log('=== description 回车补全框 ===', JSON.stringify(hints))
  await page.keyboard.press('Escape').catch(() => {})

  // 3) 在树里点 description 节点，看东区子元素 pills
  const treeItems = await page.locator('.region-west .ant-tree-title, .region-west .ant-tree-node-content-wrapper').allTextContents().catch(() => [])
  console.log('=== 树节点文本 ===', JSON.stringify(treeItems.slice(0, 30)))

  // 4) 逐个自闭合元素：把光标放到其行，触发 cursor-node → 看东区属性面板有哪些属性输入
  const selfCloseTags = await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    const out = []
    for (let i = 0; i < cm.lineCount(); i++) {
      const t = (cm.getLine(i) || '').trim()
      const m = t.match(/^<([A-Za-z]+)[^>]*\/>$/)
      if (m) out.push({ line: i, name: m[1] })
    }
    return out
  })
  console.log('=== 自闭合元素 ===', JSON.stringify(selfCloseTags))
  for (const sc of selfCloseTags.slice(0, 12)) {
    await page.evaluate((l) => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.setOption('noevent', null); cm.setCursor({ line: l, ch: 2 }) }, sc.line)
    await page.waitForTimeout(150)
    const attrs = await page.locator('.region-east .attr-row .lbl-text').allTextContents().catch(() => [])
    const vals = await page.locator('.region-east .attr-row input').evaluateAll(els => els.map(e => e.value)).catch(() => [])
    if (attrs.length) console.log(`  ${sc.name}(line${sc.line}) 属性:`, JSON.stringify(attrs), '值:', JSON.stringify(vals))
  }
})
