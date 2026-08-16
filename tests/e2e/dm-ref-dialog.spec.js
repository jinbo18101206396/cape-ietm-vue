const { test, expect } = require('@playwright/test')
const http = require('http')

// §14.5 引用DM弹窗 — 全 UI 层 Playwright 验证（真实点击/输入，不绕过 Vue）
// 稳态：运行时查询实时 DM（checkout 会生成新工作副本导致 id 漂移，故不硬编码）
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

// ---------- HTTP 工具 ----------
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
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}
const apiPost = (p, b, t) => apiReq('POST', p, b, t)
const apiGet = (p, t) => apiReq('GET', p, null, t)

let TOKEN, DM_ID, DMC, PROJECT_ID, NO_FRAGMENT_DMC

test.beforeAll(async () => {
  const login = await apiPost('/sys/login', { username: 'admin', password: '123456' })
  TOKEN = login.result.token
  // 遍历项目，找到第一个含 DM 的项目（listData 首项可能无 DM）
  const projs = await apiGet('/ietmproject/ietmProject/listData', TOKEN)
  const projList = (projs.result || []).filter(p => p.id)
  if (projList.length === 0) throw new Error('无可用项目')
  let recs = []
  for (const proj of projList) {
    const list = await apiGet(`/ietm/datamodule/list?projectId=${proj.id}&pageNo=1&pageSize=50`, TOKEN)
    const r = (list.result && list.result.records) || []
    if (r.length > 0) { PROJECT_ID = proj.id; recs = r; break }
  }
  if (recs.length === 0) throw new Error('所有项目下均无 DM')
  const op = await apiPost('/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
  if (!op.success) throw new Error('openProject failed: ' + op.message)
  // 选一个正文含 <dmRef 的 DM（保证光标能落在允许 dmRef 的上下文，能开弹窗）
  let chosen = null
  for (const rec of recs) {
    const load = await apiGet(`/ietm/dm-content/load/${rec.id}`, TOKEN)
    const xml = load && load.result && load.result.xml
    if (xml && xml.includes('<dmRef')) { chosen = rec; break }
  }
  if (!chosen) chosen = recs[0] // 退路：至少有个 DM
  DM_ID = chosen.id
  DMC = chosen.dmcCode

  // 预先找一个无可引用片段的 DM（getRef 返回空 refs），供空片段态测试用
  for (const rec of recs.slice(0, 50)) {
    try {
      const refs = await apiGet(`/ietm/dm-content/getRef/${rec.id}`, TOKEN)
      const refList = (refs && refs.result && refs.result.refs) || []
      if (refList.length === 0) { NO_FRAGMENT_DMC = rec.dmcCode; break }
    } catch (e) { /* 忽略单个 DM 的 getRef 失败，继续下一个 */ }
  }
  console.log('测试 DM:', DM_ID, DMC, 'project:', PROJECT_ID, '无片段DMC:', NO_FRAGMENT_DMC)
})

async function openEditor(page, mode = 'edit') {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=${mode}&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
  }, { timeout: 30000 })
}

/** 把光标放到允许插入 dmRef 的上下文。openDmRef 校验 getnodeBylineno(光标行) 解析出的
 *  父元素 schema.children 须含 dmRef。brexDmRef 允许 dmRef 子元素且此 DM 恒有该节点，
 *  故点结构树的 brexDmRef 节点（光标落其起始行→父解析为 brexDmRef→通过校验）。
 *  退路：把光标设到含 <brexDmRef 的行。 */
async function placeCursorInDmRefContext(page) {
  await page.waitForSelector('.region-west .dm-tree .ant-tree-title', { timeout: 10000 })
  const brexTitle = page.locator('.region-west .dm-tree .ant-tree-title', { hasText: /^brexDmRef$/ }).first()
  if (await brexTitle.count() > 0) {
    await brexTitle.click()
    await page.waitForTimeout(300)
    return
  }
  // 退路：找源码里 <brexDmRef 起始行，把光标设到该行（解析父=brexDmRef，允许 dmRef）。
  // 注意：须落在 <brexDmRef 起始行本身，落到下一行会解析成 dmRef（拒绝插入）。
  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    const total = cm.lineCount()
    for (let i = 0; i < total; i++) {
      if (cm.getLine(i).includes('<brexDmRef')) { cm.setCursor({ line: i, ch: 6 }); cm.focus(); return }
    }
  })
  await page.waitForTimeout(200)
}

/** 打开「引用DM」弹窗 */
async function openDmRefDialog(page) {
  await placeCursorInDmRefContext(page)
  await page.locator('button[title="插入dmRef引用"]').click()
  const modal = page.locator('.dm-ref-dialog .ant-modal-content')
  await modal.waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForTimeout(2500) // 等 ConfigTree 自动查询
  return modal
}

/** 确保页签1有行数据：若自动选中节点无数据，遍历树节点直到有行 */
async function ensureRows(page, modal) {
  let rowCount = await modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').count()
  if (rowCount === 0) {
    const treeNodes = modal.locator('.dm-ref-west .ant-tree-node-content-wrapper')
    const nc = await treeNodes.count()
    for (let i = 0; i < nc && rowCount === 0; i++) {
      await treeNodes.nth(i).click()
      await page.waitForTimeout(800)
      rowCount = await modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').count()
    }
  }
  return rowCount
}

// ========== 测试组 ==========
test.describe('§14.5 引用DM弹窗 UI 验证', () => {
  // ── 前置校验：浏览模式按钮 disabled ──────────────────────────
  test('前置校验: 浏览模式下引用DM按钮 disabled，无法插入', async ({ page }) => {
    await openEditor(page, 'browse')
    const btn = page.locator('button[title="插入dmRef引用"]')
    await expect(btn).toBeDisabled()
    await btn.click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
    expect(await page.locator('.dm-ref-dialog .ant-modal-content').count()).toBe(0)
  })

  // ── 弹窗结构 ────────────────────────────────────────────────
  test('弹窗结构: 标题/双页签/搜索栏4输入2按钮/西区树/引用选项区/footer', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)

    await expect(modal.locator('.ant-modal-title')).toContainText('引用DM')

    const tabs = modal.locator('.ant-tabs-tab')
    await expect(tabs).toHaveCount(2)
    const tabTexts = await tabs.allInnerTexts()
    expect(tabTexts.some(t => t.includes('最新版'))).toBe(true)
    expect(tabTexts.some(t => t.includes('指定版本'))).toBe(true)

    await expect(modal.locator('.dm-ref-search input')).toHaveCount(4)
    const srchBtns = modal.locator('.dm-ref-search button')
    await expect(srchBtns).toHaveCount(2)
    await expect(srchBtns.nth(0)).toContainText('查询')
    await expect(srchBtns.nth(1)).toContainText('清空')

    expect(await modal.locator('.dm-ref-west .ant-tree-node-content-wrapper').count()).toBeGreaterThan(0)

    const radios = modal.locator('.dm-ref-option .ant-radio-wrapper')
    await expect(radios).toHaveCount(2)
    await expect(radios.nth(0)).toContainText('整体')
    await expect(radios.nth(1)).toContainText('内部')

    const radioInputs = modal.locator('.dm-ref-option .ant-radio-input')
    expect(await radioInputs.nth(0).isChecked()).toBe(true)
    expect(await radioInputs.nth(1).isChecked()).toBe(false)

    const footerBtns = modal.locator('.ant-modal-footer button')
    await expect(footerBtns).toHaveCount(2)
    await expect(footerBtns.nth(0)).toContainText(/关\s*闭/)
    await expect(footerBtns.nth(1)).toContainText(/确\s*定/)
  })

  // ── 列头符合 §14.5.1 ────────────────────────────────────────
  test('列头: 页签1含 DMC/技术名称/信息名称/DM类型/版本类型/版本号/版本日期', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)
    const headers = await modal.locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()
    const joined = headers.join('|')
    for (const col of ['DMC', '技术名称', '信息名称', 'DM类型', '版本类型', '版本号', '版本日期']) {
      expect(joined).toContain(col)
    }
  })

  // ── 问题1：DM类型列显示值 == 搜索语义（dmTypeName，非字典 dictText）──
  test('字段一致性: DM类型列显示值可被同值搜索命中（dmTypeName语义）', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)
    const rowCount = await ensureRows(page, modal)
    test.skip(rowCount === 0, '当前项目无DM数据')

    // 找到「DM类型」列的列序号
    const headers = await modal.locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()
    const typeColIdx = headers.findIndex(h => h.includes('DM类型'))
    expect(typeColIdx).toBeGreaterThan(-1)

    // 取首行 DM类型显示文本
    const firstRowCells = modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').first().locator('td')
    const typeText = (await firstRowCells.nth(typeColIdx).innerText()).trim()
    console.log('DM类型显示值:', typeText)
    expect(typeText.length).toBeGreaterThan(0)
    expect(typeText).not.toBe('-')

    // 用该显示值搜 DM类型框 → 应命中（证明显示值就是搜索语义 dmTypeName，而非字典 dictText）
    const typeInput = modal.locator('.dm-ref-search input').nth(3)
    await typeInput.fill(typeText)
    await typeInput.press('Enter')
    await page.waitForTimeout(1500)
    const afterCount = await modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').count()
    expect(afterCount).toBeGreaterThan(0)
  })

  // ── 问题2：内部引用管线（route-mock getRef 返回片段，验证 Vue 分组下拉真实填充）──
  test('内部引用管线: getRef有片段时下拉按类型分组填充并可选中写回', async ({ page }) => {
    await openEditor(page)
    // mock getRef：返回 para/figure/table 片段（不改库，仅验证前端管线）
    await page.route('**/ietm/dm-content/getRef/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
code: 200,
message: '',
          result: { flag: 'success', refs: ['para%%%p001', 'para%%%p002', 'figure%%%fig01', 'table%%%tbl01'] }
        })
      })
    })
    const modal = await openDmRefDialog(page)
    const rowCount = await ensureRows(page, modal)
    test.skip(rowCount === 0, '当前项目无DM数据')

    const firstRow = modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').first()
    await firstRow.click()
    await page.waitForTimeout(500)
    // 选内部引用 → 下拉启用
    await modal.locator('.dm-ref-option .ant-radio-input').nth(1).click()
    await page.waitForTimeout(300)
    // 打开下拉
    await modal.locator('.dm-ref-combo').click()
    await page.waitForTimeout(400)
    // 下拉浮层在 body（非 modal 内）；断言分组标题与选项存在
    const dropdown = page.locator('.ant-select-dropdown:visible')
    const dropText = await dropdown.innerText()
    console.log('片段下拉内容:', dropText)
    expect(dropText).toContain('段落') // para → 段落分组
    expect(dropText).toContain('插图') // figure → 插图
    expect(dropText).toContain('表格') // table → 表格
    expect(dropText).toContain('p001')
    // 选中一个片段
    await dropdown.locator('.ant-select-dropdown-menu-item', { hasText: 'p001' }).first().click()
    await page.waitForTimeout(300)
    // 写回后下拉显示选中值
    const comboVal = await modal.locator('.dm-ref-combo .ant-select-selection-selected-value').innerText().catch(() => '')
    console.log('选中片段:', comboVal)
    expect(comboVal).toContain('p001')
  })

  // ── 问题2：空片段态（真实无id的DM → 空态提示）──
  test('空片段态: 选中无id元素的DM，下拉显示"无可引用片段"提示', async ({ page }) => {
    test.skip(!NO_FRAGMENT_DMC, '当前项目前20个DM都含可引用片段，跳过空态测试')
    await openEditor(page)
    const modal = await openDmRefDialog(page)

    // 搜索栏输入无片段 DM 的 DMC → 查询 → 表格仅剩一行
    await modal.locator('.dm-ref-search input').first().fill(NO_FRAGMENT_DMC)
    await modal.locator('.dm-ref-search button', { hasText: '查询' }).click()
    await page.waitForTimeout(1500)

    const rowCount = await modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').count()
    expect(rowCount, '搜索后应只有一行匹配').toBe(1)

    // 点该行 → 等片段加载完
    const row = modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').first()
    await row.click()
    await page.waitForTimeout(1200)

    // 切到"内部"引用选项 → 展开片段下拉
    await modal.locator('.dm-ref-option .ant-radio-input').nth(1).click()
    await page.waitForTimeout(300)
    await modal.locator('.dm-ref-combo').click()
    await page.waitForTimeout(500)
    const dropdown = page.locator('.ant-select-dropdown:visible')
    const dropText = await dropdown.innerText()
    console.log('空态下拉内容:', dropText)
    // 无片段时应出现明确空态（"无可引用片段"），而非静默空白
    expect(dropText).toContain('无可引用片段')
  })

  // ── 搜索栏：清空 ────────────────────────────────────────────
  test('搜索栏: 输入内容 → 清空按钮清除全部4个输入框', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)
    const inputs = modal.locator('.dm-ref-search input')
    const vals = ['ABC', '技术测试', '信息测试', '描述类']
    for (let i = 0; i < 4; i++) await inputs.nth(i).fill(vals[i])
    for (let i = 0; i < 4; i++) expect(await inputs.nth(i).inputValue()).toBe(vals[i])
    await modal.locator('.dm-ref-search button').nth(1).click()
    await page.waitForTimeout(500)
    for (let i = 0; i < 4; i++) expect(await inputs.nth(i).inputValue()).toBe('')
  })

  // ── 边界：搜索无结果 → 表格空态 ──────────────────────────────
  test('边界: 搜索绝不匹配关键词 → 表格空、无JS异常', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)
    await ensureRows(page, modal)
    const dmcInput = modal.locator('.dm-ref-search input').first()
    await dmcInput.fill('ZZZ_NO_SUCH_DMC_9999')
    await dmcInput.press('Enter')
    await page.waitForTimeout(1500)
    const rows = await modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').count()
    expect(rows).toBe(0)
    // 查询按钮仍可用（无异常）
    await expect(modal.locator('.dm-ref-search button').first()).toBeEnabled()
  })

  // ── 页签切换 ────────────────────────────────────────────────
  test('页签切换: 点「引用指定版本」→ 搜索栏/引用选项区消失', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)
    await modal.locator('.ant-tabs-tab').nth(1).click()
    await page.waitForTimeout(500)
    expect(await modal.locator('.ant-tabs-tabpane-active .dm-ref-search').count()).toBe(0)
    expect(await modal.locator('.ant-tabs-tabpane-active .dm-ref-option').count()).toBe(0)
    expect(await modal.locator('.ant-tabs-tabpane-active .ant-table').count()).toBeGreaterThan(0)
    await modal.locator('.ant-tabs-tab').nth(0).click()
    await page.waitForTimeout(300)
    expect(await modal.locator('.ant-tabs-tabpane-active .dm-ref-search').count()).toBeGreaterThan(0)
  })

  // ── 行交互：单击启用/双击红/确定插入 ────────────────────────
  test('行交互: 单击→选项启用+片段加载 / 双击→红色 / 确定→dmRef插入编辑器', async ({ page }) => {
    await openEditor(page)
    // mock buildDmRef：UI流程测试不依赖后端数据质量（dirty-dmCode已另行立项）
    await page.route('**/ietm/dm-content/buildDmRef', route => {
      route.fulfill({
        status: 200,
contentType: 'application/json',
        body: JSON.stringify({
          success: true,
code: 200,
          result: {
            flag: 'success',
            xml: '<dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">\n  <dmRefIdent>\n    <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02"/>\n  </dmRefIdent>\n</dmRef>'
          }
        })
      })
    })
    const modal = await openDmRefDialog(page)
    const rowCount = await ensureRows(page, modal)
    test.skip(rowCount === 0, '当前项目无DM数据')

    const firstRow = modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').first()

    // 单击 → 引用选项启用
    await firstRow.click()
    await page.waitForTimeout(600)
    const radioInputs = modal.locator('.dm-ref-option .ant-radio-input')
    expect(await radioInputs.nth(0).isDisabled()).toBe(false)
    expect(await radioInputs.nth(1).isDisabled()).toBe(false)

    // 内部引用 → 下拉启用；切回整体 → 下拉禁用
    await radioInputs.nth(1).click()
    await page.waitForTimeout(300)
    const combo = modal.locator('.dm-ref-option .ant-select').first()
    expect(await combo.evaluate(el => el.classList.contains('ant-select-disabled'))).toBe(false)
    await radioInputs.nth(0).click()
    await page.waitForTimeout(300)
    expect(await combo.evaluate(el => el.classList.contains('ant-select-disabled'))).toBe(true)

    // 双击 → 红色粗体；再双击 → 还原
    await firstRow.dblclick()
    await page.waitForTimeout(400)
    expect(await firstRow.evaluate(el => el.classList.contains('dm-ref-row--hasver'))).toBe(true)
    const color = await firstRow.locator('td').first().evaluate(el => getComputedStyle(el).color)
    expect(color).toContain('255')
    await firstRow.dblclick()
    await page.waitForTimeout(400)
    expect(await firstRow.evaluate(el => el.classList.contains('dm-ref-row--hasver'))).toBe(false)

    // 勾选 → 确定 → dmRef 插入
    await firstRow.locator('.ant-checkbox-input').click()
    await page.waitForTimeout(200)
    const before = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    await modal.locator('.ant-modal-footer button').nth(1).click()
    await page.waitForTimeout(2000)
    expect(await page.locator('.dm-ref-dialog .ant-modal-content').count()).toBe(0)
    const after = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    console.log('插入前长度:', before.length, '插入后长度:', after.length)
    expect(after).toContain('<dmRef')
    expect(after).toContain('<dmRefIdent')
    expect(after).toContain('<dmCode')
  })

  // ── 边界：跨页签勾选去重 ────────────────────────────────────
  test('边界: 同一DM在页签1和页签2都勾选，确定时按id去重（只生成一个dmRef）', async ({ page }) => {
    await openEditor(page)
    // mock buildDmRef 捕获提交的 items 数量
    let submittedItems = null
    await page.route('**/ietm/dm-content/buildDmRef', route => {
      submittedItems = JSON.parse(route.request().postData() || '[]')
      route.fulfill({
        status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: true, code: 200, result: { flag: 'success', xml: '<dmRef/>' } })
      })
    })
    const modal = await openDmRefDialog(page)
    const rowCount = await ensureRows(page, modal)
    test.skip(rowCount === 0, '当前项目无DM数据')

    // 页签1 勾第一行
    const row1 = modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row').first()
    await row1.locator('.ant-checkbox-input').click()
    await page.waitForTimeout(200)
    // 切页签2，若同 DM 也在（最新版即已发布时），勾它
    await modal.locator('.ant-tabs-tab').nth(1).click()
    await page.waitForTimeout(800)
    const v2rows = modal.locator('.ant-tabs-tabpane-active .ant-table-tbody .ant-table-row')
    if (await v2rows.count() > 0) {
      await v2rows.first().locator('.ant-checkbox-input').click()
      await page.waitForTimeout(200)
    }
    await modal.locator('.ant-modal-footer button').nth(1).click()
    await page.waitForTimeout(1000)
    // 提交项按 id 去重：不应出现重复 dmId
    expect(submittedItems).not.toBeNull()
    const ids = submittedItems.map(it => it.dmId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // ── 关闭 / 无勾选 ───────────────────────────────────────────
  test('关闭按钮: 点击后弹窗消失', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)
    await modal.locator('.ant-modal-footer button').nth(0).click()
    await page.waitForTimeout(600)
    expect(await page.locator('.dm-ref-dialog .ant-modal-content').count()).toBe(0)
  })

  test('确定无勾选 → toast "请勾选DM。"', async ({ page }) => {
    await openEditor(page)
    const modal = await openDmRefDialog(page)
    await modal.locator('.ant-modal-footer button').nth(1).click()
    const toast = page.locator('.ant-message-notice')
    await toast.first().waitFor({ state: 'visible', timeout: 5000 })
    await expect(toast.first()).toContainText('请勾选DM')
  })
})
