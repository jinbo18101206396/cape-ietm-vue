const { test, expect } = require('@playwright/test')
const http = require('http')

// §14.8 对象列表弹窗 DmIdListModal — 全 UI 层 Playwright 验证（真实点击/双击，不绕过 Vue）
// 覆盖：开/关弹窗、三类计数、筛选 Tab、双击定位光标、连续定位不关窗、空内容拦截、重开状态重置。
// 用 CodeMirror.setValue 注入确定的格式化 XML，使 id/dmRef/graphic 计数可预期。
//
// 【性能·方案A：共享编辑器实例】编辑模式用例1-10 共用同一 page：beforeAll 只 goto+启动编辑器一次，
// 每例仅 injectXml+开弹窗+断言，beforeEach 关残留弹窗复位。免去每例重启 SPA/重载打包/真实加载 DM。
// 用例11 因 mode=browse 需单独导航，保留独立 context。
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(null) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}
const apiPost = (p, b, t) => apiReq('POST', p, b, t)

let TOKEN
const DM_ID = '2084945965503942657'
const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
const PROJECT_ID = '2078348945532030978'

// 注入用 XML：dmodule 在第1行。已格式化（每标签独占一行），行号可数：
//  行3  <para id="p-001">    行4 <table id="t-1">    行8 <graphic ICN-A-1>
//  行11 <symbol ICN-S-2>     行14 <dmRef>...dmCode(ZB2-B-05)
// 合计 5 个对象：2 id + 2 icn + 1 dmRef
const INJECT_XML = [
  '<dmodule>', // 1
  '  <content>', // 2
  '    <para id="p-001">文本一</para>', // 3
  '    <table id="t-1">', // 4
  '      <row></row>', // 5
  '    </table>', // 6
  '    <figure>', // 7
  '      <graphic infoEntityIdent="ICN-A-1"/>', // 8
  '    </figure>', // 9
  '    <para>', // 10
  '      <symbol infoEntityIdent="ICN-S-2"/>', // 11
  '    </para>', // 12
  '    <refs>', // 13
  '      <dmRef>', // 14
  '        <dmRefIdent>', // 15
  '          <dmCode modelIdentCode="ZB2" systemDiffCode="B" systemCode="05"/>', // 16
  '        </dmRefIdent>', // 17
  '      </dmRef>', // 18
  '    </refs>', // 19
  '  </content>', // 20
  '</dmodule>' // 21
].join('\n')

test.beforeAll(async () => {
  const login = await apiPost('/sys/login', { username: 'admin', password: '123456' })
  TOKEN = login.result.token
  const op = await apiPost('/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
  if (!op.success) throw new Error('openProject failed: ' + op.message)
})

async function openEditor(page, mode = 'edit') {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=${mode}&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  // 条件等待（替代固定 800ms sleep）：等 Vue 实例挂载 + $refs.editor 就绪，
  // 这才是 injectXml（读 __vue__.$refs.editor.getLinenoOffset）的真正前置条件
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    if (!cm || !cm.CodeMirror || !cm.CodeMirror.getValue().includes('<dmodule')) return false
    const el = document.querySelector('.dm-editor-page')
    const ed = el && el.__vue__
    return !!(ed && ed.$refs && ed.$refs.editor && typeof ed.$refs.editor.getLinenoOffset === 'function')
  }, { timeout: 30000 })
}

// 注入确定内容（不经 formatDM，保持行号）。linenoOffset 在 DM 加载时缓存为 <dmodule> 编辑器行；
// getTreeNodesfromXml 的 lineno 恒相对 dmodule=1。测试直接 setValue 会丢 prologue，需前置
// (offset-1) 行占位令 dmodule 落回缓存 offset 行，对齐生产环境（详见实现记忆）。
async function injectXml(page, xml) {
  await page.evaluate(x => {
    const ed = document.querySelector('.dm-editor-page').__vue__
    const off = ed.$refs.editor.getLinenoOffset()
    let full = x
    if (x.includes('<dmodule') && off > 1) full = Array(off - 1).fill('').join('\n') + '\n' + x
    document.querySelector('.CodeMirror').CodeMirror.setValue(full)
  }, xml)
  await page.waitForTimeout(300)
}

const modal = page => page.locator('.dm-idlist-dialog .ant-modal-content')
const rows = page => page.locator('.dm-idlist-dialog .idlist-table .ant-table-tbody .ant-table-row')

async function openIdList(page) {
  await page.locator('button[title="对象列表（全文id/DM/ICN）"]').click()
  await expect(modal(page)).toBeVisible({ timeout: 8000 })
}

// 关掉可能残留的弹窗，使下一例从干净态开始（destroyOnClose → 关后 DOM 移除）
async function closeIdListIfOpen(page) {
  const m = modal(page)
  if (await m.count() > 0) {
    await m.locator('.ant-modal-footer button', { hasText: /关\s*闭/ }).click()
    await expect(m).toHaveCount(0, { timeout: 5000 })
  }
}

// ============ 编辑模式用例：共享单个编辑器实例（方案A）============
test.describe('编辑模式（共享编辑器实例）', () => {
  let page // 组内所有用例共用

  test.beforeAll(async ({ browser }) => {
    // viewport 与全局配置一致（browser.newPage 不自动继承 config.use）
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await openEditor(page, 'edit') // 只启动一次
  })
  test.afterAll(async () => { await page.close() })
  // 每例开始前关掉上一例残留的弹窗，保证干净态
  test.beforeEach(async () => { await closeIdListIfOpen(page) })

  // 用例1：注入内容后打开 → 弹窗出现且合计 5 行
  test('1) 打开对象列表 → 弹窗出现，收集到全部 5 个对象', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    await expect(rows(page)).toHaveCount(5)
  })

  // 用例2：三个筛选 Tab 计数正确
  test('2) 筛选 Tab 计数：ID元素2 / 引用DM1 / 图形ICN2', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    const btn = label => modal(page).locator('.ant-radio-button-wrapper', { hasText: label })
    await expect(btn('全部')).toContainText('5')
    await expect(btn('ID元素')).toContainText('2')
    await expect(btn('引用DM')).toContainText('1')
    await expect(btn('图形ICN')).toContainText('2')
  })

  // 用例3：切到「引用DM」→ 只剩 1 行且为重组 DMC 串
  test('3) 点「引用DM」筛选 → 仅 1 行 dmRef，DMC 重组正确', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    await modal(page).locator('.ant-radio-button-wrapper', { hasText: '引用DM' }).click()
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('DMC-ZB2-B-05')
  })

  // 用例4：切到「图形ICN」→ 2 行，含 graphic 与 symbol 的 ICN
  test('4) 点「图形ICN」筛选 → 2 行，ICN 编码正确', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    await modal(page).locator('.ant-radio-button-wrapper', { hasText: '图形ICN' }).click()
    await expect(rows(page)).toHaveCount(2)
    await expect(modal(page)).toContainText('ICN-A-1')
    await expect(modal(page)).toContainText('ICN-S-2')
  })

  // 用例5：双击 graphic 行 → 光标定位对应行，弹窗保持
  test('5) 双击图形行 → 编辑器光标定位对应行，弹窗不关闭', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    await modal(page).locator('.ant-radio-button-wrapper', { hasText: '图形ICN' }).click()
    const gRow = rows(page).first() // graphic 行号8，升序在 symbol 行11 之前
    await expect(gRow).toContainText('ICN-A-1')
    await gRow.dblclick()
    await page.waitForTimeout(300)
    // 断言光标所在行文本即 graphic 行（比硬编码行号稳健）
    const lineText = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm.getLine(cm.getCursor().line)
    })
    expect(lineText, '光标应落在 graphic 所在行').toContain('infoEntityIdent="ICN-A-1"')
    await expect(modal(page)).toBeVisible() // 只读导航，不关窗
  })

  // 用例6：连续双击不同行 → 光标随之移动、弹窗始终保持
  test('6) 连续双击 id 行 → 光标随之更新，弹窗保持', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    await modal(page).locator('.ant-radio-button-wrapper', { hasText: 'ID元素' }).click()
    const cursorLineText = () => page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm.getLine(cm.getCursor().line)
    })
    await rows(page).nth(0).dblclick() // para(id=p-001)
    await page.waitForTimeout(200)
    expect(await cursorLineText(), '光标落在 para id 行').toContain('id="p-001"')
    await rows(page).nth(1).dblclick() // table(id=t-1)
    await page.waitForTimeout(200)
    expect(await cursorLineText(), '光标落在 table id 行').toContain('id="t-1"')
    await expect(modal(page)).toBeVisible()
  })

  // 用例7：关闭按钮 → 弹窗消失
  test('7) 点关闭 → 弹窗消失', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    await modal(page).locator('.ant-modal-footer button', { hasText: /关\s*闭/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })
  })

  // 用例8：边界 — 空内容点按钮 → 提示且弹窗不出现
  test('8) 空内容点对象列表 → 提示"DM内容为空"，弹窗不出现', async () => {
    await injectXml(page, '   ') // 仅空白
    await page.locator('button[title="对象列表（全文id/DM/ICN）"]').click()
    await expect(page.locator('.ant-message').getByText(/DM内容为空/)).toBeVisible({ timeout: 5000 })
    await expect(modal(page)).toHaveCount(0)
  })

  // 用例9：边界 — 无对象的 DM → 弹窗开但空表提示
  test('9) DM 无 id/dmRef/graphic → 弹窗打开显示空表提示', async () => {
    await injectXml(page, '<dmodule>\n  <content>\n    <para>纯文本无id</para>\n  </content>\n</dmodule>')
    await openIdList(page)
    await expect(rows(page)).toHaveCount(0)
    await expect(modal(page)).toContainText('当前DM无可列出的对象')
  })

  // 用例10：边界 — 筛选后关闭重开 → filter 重置回「全部」
  test('10) 筛选到图形ICN后关闭，重开 → 默认回到「全部」5 行', async () => {
    await injectXml(page, INJECT_XML)
    await openIdList(page)
    await modal(page).locator('.ant-radio-button-wrapper', { hasText: '图形ICN' }).click()
    await expect(rows(page)).toHaveCount(2)
    await modal(page).locator('.ant-modal-footer button', { hasText: /关\s*闭/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })
    await openIdList(page) // 重开
    await expect(rows(page)).toHaveCount(5) // filter 已重置为 all
    await expect(modal(page).locator('.ant-radio-button-wrapper-checked', { hasText: '全部' })).toBeVisible()
  })
})

// ============ 用例11：浏览模式（独立 context，因需 mode=browse 单独导航）============
test('11) 浏览模式 对象列表按钮可用、可打开', async ({ page }) => {
  await openEditor(page, 'browse')
  await injectXml(page, INJECT_XML)
  await expect(page.locator('button[title="对象列表（全文id/DM/ICN）"]')).toBeEnabled()
  await openIdList(page)
  await expect(rows(page)).toHaveCount(5)
})
