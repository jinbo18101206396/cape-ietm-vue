const { test, expect } = require('@playwright/test')
const http = require('http')

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2084257576786046977'
const PROJECT_ID = '2078348945532030978'
const DMC = 'DMC-J-ZB1-A-02-111A-A-00-0030101-001-03_ZH-CN'

function apiPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    if (token) headers['X-Access-Token'] = token
    const r = http.request(API + path, { method: 'POST', headers }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => resolve(JSON.parse(d)))
    }); r.on('error', reject); r.write(data); r.end()
  })
}

let TOKEN
test.beforeAll(async () => {
  TOKEN = (await apiPost('/sys/login', { username: 'admin', password: '123456' })).result.token
  // 设置当前项目（ConfigTree 依赖 getCurrentProject）
  const op = await apiPost('/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
  console.log('openProject:', op.success, op.message || '')
})

test('探索：打开引用DM弹窗并观察真实状态', async ({ page }) => {
  page.on('console', m => console.log('  [browser]', m.text()))
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)

  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
  }, { timeout: 30000 })
  console.log('编辑器已加载')

  // 把光标定位到第一个 <para> 内（第3行附近），走真实 CodeMirror API
  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    // 定位到 <para> 之后的行
    const val = cm.getValue()
    const lines = val.split('\n')
    let target = 2
    for (let i = 0; i < lines.length; i++) { if (lines[i].includes('<para>')) { target = i + 1; break } }
    cm.setCursor({ line: target, ch: 0 })
    cm.focus()
  })
  console.log('光标已置于 para 内')

  // 点击工具栏「引用DM」按钮（真实点击）
  const btn = page.locator('button[title*="引用"]')
  console.log('引用DM按钮数量:', await btn.count())
  await btn.first().click()

  // 观察弹窗是否出现
  const modal = page.locator('.dm-ref-dialog')
  const appeared = await modal.count()
  console.log('弹窗 .dm-ref-dialog 数量:', appeared)
  if (appeared > 0) {
    await page.waitForTimeout(1500) // 等 ConfigTree + listForDialog
    console.log('标题:', await page.locator('.dm-ref-dialog .ant-modal-title').innerText().catch(() => 'N/A'))
    console.log('页签:', await page.locator('.dm-ref-dialog .ant-tabs-tab').allInnerTexts().catch(() => []))
    console.log('搜索输入框数量:', await page.locator('.dm-ref-search input').count())
    console.log('config-tree 节点数:', await page.locator('.dm-ref-west .ant-tree-treenode').count())
    console.log('页签1 表格行数:', await page.locator('.dm-ref-dialog .ant-table-tbody tr.ant-table-row').count())
    console.log('确定/关闭按钮:', await page.locator('.dm-ref-dialog .ant-modal-footer button').allInnerTexts())
  }
  await page.screenshot({ path: 'test-results/dmref-explore.png', fullPage: false }).catch(() => {})
})
