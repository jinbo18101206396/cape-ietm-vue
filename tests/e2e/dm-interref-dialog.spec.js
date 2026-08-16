const { test, expect } = require('@playwright/test')
const http = require('http')

// §14.7 内部引用弹窗 IetmInterrefDialog — 全 UI 层 Playwright 验证（真实点击/输入，不绕过 Vue）
// 覆盖：allow/deny 位置校验、类型→标识联动、默认选中首项、XML 生成与转义、可选文本、
//       空文档拦截、重开状态重置、中文视图下英文类型匹配、insert 后编辑器内容变化。
// 用 CodeMirror.setValue 注入确定的格式化 XML，使可引用 id 集合可预期。
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

// 注入 XML：dmodule 第1行。含 2 个 figure(有id)、1 个 table(有id)、1 个 para(无id)。
//  - figure: fig-001 / fig-002   - table: tbl-001   - para 内可插 internalRef
const INJECT_XML = [
  '<dmodule>', // 1
  '  <content>', // 2
  '    <description>', // 3
  '      <para>这是一段可插入内部引用的文本。</para>', // 4
  '      <figure id="fig-001">', // 5
  '        <title>图一</title>', // 6
  '      </figure>', // 7
  '      <figure id="fig-002">', // 8
  '        <title>图二</title>', // 9
  '      </figure>', // 10
  '      <table id="tbl-001">', // 11
  '        <title>表一</title>', // 12
  '      </table>', // 13
  '      <note>', // 14
  '        <notePara>注意事项</notePara>', // 15
  '      </note>', // 16
  '    </description>', // 17
  '  </content>', // 18
  '</dmodule>' // 19
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
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    if (!cm || !cm.CodeMirror || !cm.CodeMirror.getValue().includes('<dmodule')) return false
    const el = document.querySelector('.dm-editor-page')
    const ed = el && el.__vue__
    return !!(ed && ed.$refs && ed.$refs.editor && typeof ed.$refs.editor.getLinenoOffset === 'function')
  }, { timeout: 30000 })
}

// 注入确定内容（不经 formatDM，保持行号）。前置 (offset-1) 行占位令 dmodule 落回缓存 offset 行。
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

// 光标放到源码中第一个匹配 openTag 的行
async function placeCursorAtTag(page, openTag) {
  const ok = await page.evaluate(tag => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getLine(i).includes(tag)) {
        cm.setCursor({ line: i, ch: cm.getLine(i).indexOf(tag) + 2 })
        cm.focus()
        return i + 1
      }
    }
    return -1
  }, openTag)
  await page.waitForTimeout(300)
  return ok
}

const modal = page => page.locator('.interref-dialog .ant-modal-content')

async function closeIfOpen(page) {
  const m = modal(page)
  if (await m.count() > 0 && await m.isVisible().catch(() => false)) {
    await m.locator('.ant-modal-footer button', { hasText: /关\s*闭/ }).click()
    await expect(m).toHaveCount(0, { timeout: 5000 })
  }
}

async function clickInterref(page) {
  await page.locator('button[title="插入internalRef内部引用"]').click()
}

// 通过真实鼠标点击编辑器中包含指定文本的行来放置光标（完全走 UI，不调用 cm.setCursor）
async function placeCursorByClick(page, lineText) {
  const line = page.locator('.CodeMirror-line', { hasText: lineText }).first()
  await line.click()
  await page.waitForTimeout(300)
}

// 通过真实点击展开树上所有折叠节点（antdv 折叠开关 .ant-tree-switcher_close），逐层展开
async function expandWholeTree(page) {
  for (let i = 0; i < 8; i++) {
    const closed = page.locator('.dm-tree .ant-tree-switcher_close')
    const n = await closed.count()
    if (n === 0) break
    for (let j = 0; j < n; j++) {
      // 每次点第一个折叠开关（点开后集合会变，重新取第一个）
      const sw = page.locator('.dm-tree .ant-tree-switcher_close').first()
      if (await sw.count() === 0) break
      await sw.click()
      await page.waitForTimeout(80)
    }
  }
}

// 选 antdv1.7.8 下拉项：点开 select，选包含指定文本的 option
async function selectOption(page, selectIndex, optionText) {
  const selects = modal(page).locator('.ant-select')
  await selects.nth(selectIndex).click()
  await page.waitForTimeout(200)
  await page.locator('.ant-select-dropdown li.ant-select-dropdown-menu-item', { hasText: optionText }).first().click()
  await page.waitForTimeout(200)
}

test.describe('内部引用弹窗（共享编辑器实例）', () => {
  test.describe.configure({ mode: 'serial' })
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await openEditor(page, 'edit')
  })
  test.afterAll(async () => { await page.close() })
  test.beforeEach(async () => {
    await closeIfOpen(page)
    await injectXml(page, INJECT_XML)
  })

  // ===== 用例1：光标在 para 内 → 弹窗打开 =====
  test('1) 光标在 para 内点内部引用 → 弹窗打开', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    await expect(modal(page).locator('.ant-modal-title')).toHaveText('内部引用')
  })

  // ===== 用例2：光标在 note 内 → 拦截（internalRef 非 note 合法子元素）=====
  test('2) 光标在 note 内点内部引用 → 提示不能插入，弹窗不开', async () => {
    await placeCursorAtTag(page, '<note>')
    await clickInterref(page)
    // 弹窗不应出现
    await page.waitForTimeout(500)
    await expect(modal(page)).toHaveCount(0)
    // 出现 warning 提示
    await expect(page.locator('.ant-message', { hasText: '此处不能插入内部引用' })).toBeVisible({ timeout: 3000 })
  })

  // ===== 用例3：类型→标识联动 + 默认选中首项 =====
  test('3) 选 figure 类型 → 标识下拉列出 fig-001/fig-002 且默认选中首项', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await selectOption(page, 0, 'figure')
    // 标识 select 应显示默认选中的首项 fig-001
    const idSelText = await modal(page).locator('.ant-select').nth(1).locator('.ant-select-selection-selected-value').textContent()
    expect(idSelText).toContain('fig-001')

    // 打开标识下拉，应有 fig-001 与 fig-002 两项
    await modal(page).locator('.ant-select').nth(1).click()
    await page.waitForTimeout(200)
    const opts = page.locator('.ant-select-dropdown:visible li.ant-select-dropdown-menu-item')
    await expect(opts.filter({ hasText: 'fig-001' })).toHaveCount(1)
    await expect(opts.filter({ hasText: 'fig-002' })).toHaveCount(1)
    await page.keyboard.press('Escape')
  })

  // ===== 用例4：切换类型 → 标识列表刷新（figure→table）=====
  test('4) 类型切到 table → 标识列表变为 tbl-001', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await selectOption(page, 0, 'figure')
    await selectOption(page, 0, 'table')
    const idSelText = await modal(page).locator('.ant-select').nth(1).locator('.ant-select-selection-selected-value').textContent()
    expect(idSelText).toContain('tbl-001')
  })

  // ===== 用例5：确认插入 → 编辑器出现 internalRef，属性正确 =====
  test('5) 选 figure/fig-002 + 文本 → 确定 → 编辑器插入 internalRef', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await selectOption(page, 0, 'figure')
    // 改选 fig-002
    await modal(page).locator('.ant-select').nth(1).click()
    await page.waitForTimeout(200)
    await page.locator('.ant-select-dropdown:visible li.ant-select-dropdown-menu-item', { hasText: 'fig-002' }).click()
    await page.waitForTimeout(200)
    // 填引用文本
    await modal(page).locator('textarea').fill('见图二')

    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    expect(xml).toContain('<internalRef')
    expect(xml).toContain('internalRefId="fig-002"')
    expect(xml).toContain('internalRefTargetType="figure"')
    expect(xml).toContain('xlink:type="simple"')
    expect(xml).toContain('xlink:show="replace"')
    expect(xml).toContain('xlink:actuate="onRequest"')
    expect(xml).toContain('>见图二</internalRef>')
  })

  // ===== 用例6：引用文本可空 → 生成空文本 internalRef =====
  test('6) 不填引用文本 → 生成 <internalRef ...></internalRef>', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await selectOption(page, 0, 'figure') // 默认选中 fig-001
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    expect(xml).toContain('internalRefId="fig-001"')
    expect(xml).toMatch(/><\/internalRef>/)
  })

  // ===== 用例7：未选类型直接确定 → 拦截 =====
  test('7) 未选引用类型点确定 → 提示请选择引用类型', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(page.locator('.ant-message', { hasText: '请选择引用类型' })).toBeVisible({ timeout: 3000 })
    await expect(modal(page)).toBeVisible() // 弹窗不关
  })

  // ===== 用例8：引用文本 XML 转义（防注入）=====
  test('8) 引用文本含 <>&"\' → XML 转义', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await selectOption(page, 0, 'figure')
    await modal(page).locator('textarea').fill('a<b>&"c\'')
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    expect(xml).toContain('a&lt;b&gt;&amp;&quot;c&apos;')
    expect(xml).not.toContain('a<b>&"c\'') // 原始未转义串不应出现
  })

  // ===== 用例9：重开弹窗 → 状态重置（无陈旧类型/标识/文本）=====
  test('9) 关闭后重开 → 三字段全部清空', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    await selectOption(page, 0, 'figure')
    await modal(page).locator('textarea').fill('残留文本')
    // 关闭
    await modal(page).locator('.ant-modal-footer button', { hasText: /关\s*闭/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    // 重开
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    // 类型 select 应为 placeholder（无选中值）
    await expect(modal(page).locator('.ant-select').nth(0).locator('.ant-select-selection-selected-value')).toHaveCount(0)
    // textarea 应为空
    await expect(modal(page).locator('textarea')).toHaveValue('')
  })

  // ===== 用例11：选了类型但无可引用元素 → 标识框不禁用，展开显示空态 =====
  test('11) 选 multimedia（文档无此类元素）→ 标识框可点，显示"该类型无可引用元素"', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    // 注入的 XML 只有 figure/table，无 multimedia
    await selectOption(page, 0, 'multimedia')

    const idSelect = modal(page).locator('.ant-select').nth(1)
    // 不再禁用
    await expect(idSelect).not.toHaveClass(/ant-select-disabled/)
    // 展开后显示空态文案
    await idSelect.click()
    await page.waitForTimeout(200)
    await expect(page.locator('.ant-select-dropdown:visible', { hasText: '该类型无可引用元素' })).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
  })

  // ===== 用例12：引用文本纯空格 → trim 为空 → 生成空标签（BUG1 回归）=====
  test('12) 引用文本只输入空格 → 生成 <internalRef ...></internalRef>（trim）', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await selectOption(page, 0, 'figure') // 默认选中 fig-001
    await modal(page).locator('textarea').type('    ') // 真实键入 4 个空格
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    expect(xml).toContain('internalRefId="fig-001"')
    expect(xml).toMatch(/><\/internalRef>/) // 空标签，无空白文本节点
    expect(xml).not.toMatch(/>\s+<\/internalRef>/)
  })

  // ===== 用例13：引用文本前后空格 → trim（BUG1 回归）=====
  test('13) 引用文本"  见图1  " → trim 为"见图1"', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })

    await selectOption(page, 0, 'figure')
    await modal(page).locator('textarea').type('  见图1  ')
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    expect(xml).toContain('>见图1</internalRef>')
    expect(xml).not.toContain('>  见图1  </internalRef>')
  })

  // ===== 用例14：真实点击编辑器行放光标（不用 cm.setCursor）→ 弹窗打开 =====
  test('14) 鼠标点击 para 文本行放光标 → 内部引用弹窗打开', async () => {
    await placeCursorByClick(page, '可插入内部引用的文本')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    await expect(modal(page).locator('.ant-modal-title')).toHaveText('内部引用')
  })

  // ===== 用例15：插入后结构树出现 internalRef 节点（UI 验证树同步）=====
  test('15) 确定插入后 → 左侧结构树出现 internalRef 节点', async () => {
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    await selectOption(page, 0, 'figure')
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    // 真实点击逐层展开树，插入并 refreshTree 后应出现 internalRef 节点
    await expandWholeTree(page)
    await expect(page.locator('.dm-tree .ant-tree-title', { hasText: /^internalRef/ }).first())
      .toBeVisible({ timeout: 5000 })
  })

  // ===== 用例16：连续两次插入 → 状态每次重置且都成功 =====
  test('16) 连续插入两个 internalRef → 均成功，无状态串味', async () => {
    // 第一次：figure/fig-001
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    await selectOption(page, 0, 'figure')
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    // 第二次：table/tbl-001（重开须为干净态，能正常选到 table）
    await placeCursorAtTag(page, '<para>')
    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    // 重开后类型应为 placeholder（无 figure 残留）
    await expect(modal(page).locator('.ant-select').nth(0).locator('.ant-select-selection-selected-value')).toHaveCount(0)
    await selectOption(page, 0, 'table')
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    expect(xml).toContain('internalRefTargetType="figure"')
    expect(xml).toContain('internalRefTargetType="table"')
    expect((xml.match(/<internalRef /g) || []).length).toBe(2)
  })

  // ===== 用例18：编辑器内先选中文本再插入 → 选中文本不被删除（BUG2 统一修复回归）=====
  test('18) 选中 para 整行后插入 internalRef → 原文本保留不被删', async () => {
    // 真实交互：点击 para 行放光标 → Home 到行首 → Shift+End 选中整行内容
    await placeCursorByClick(page, '可插入内部引用的文本')
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+End')
    // 确认已产生选区（测试前置条件）
    const hasSel = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.somethingSelected())
    expect(hasSel, '应已选中文本').toBe(true)

    await clickInterref(page)
    await expect(modal(page)).toBeVisible({ timeout: 8000 })
    await selectOption(page, 0, 'figure')
    await modal(page).locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
    await expect(modal(page)).toHaveCount(0, { timeout: 5000 })

    const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
    // 原选中文本仍在（旧 replaceSelection 会整段删除），且 internalRef 已插入
    expect(xml, '选中的原文本不应被删除').toContain('可插入内部引用的文本')
    expect(xml).toContain('<internalRef')
    expect(xml).toContain('internalRefId="fig-001"')
  })
})

// ===== 用例17：重复 id 去重（BUG3 回归，独立注入含重复 id 的 XML）=====
test('17) 文档含两个 id 相同的 figure → 标识下拉去重只列一项', async ({ browser }) => {
  const page = await browser.newPage()
  await openEditor(page, 'edit')
  const DUP_XML = [
    '<dmodule>', '  <content>', '    <description>',
    '      <para>文本。</para>',
    '      <figure id="dup-1"><title>甲</title></figure>',
    '      <figure id="dup-1"><title>乙</title></figure>', // 重复 id
    '    </description>', '  </content>', '</dmodule>'
  ].join('\n')
  await page.evaluate(x => {
    const ed = document.querySelector('.dm-editor-page').__vue__
    const off = ed.$refs.editor.getLinenoOffset()
    let full = x
    if (x.includes('<dmodule') && off > 1) full = Array(off - 1).fill('').join('\n') + '\n' + x
    document.querySelector('.CodeMirror').CodeMirror.setValue(full)
  }, DUP_XML)
  await page.waitForTimeout(300)

  await placeCursorAtTag(page, '<para>')
  await clickInterref(page)
  await expect(modal(page)).toBeVisible({ timeout: 8000 })
  await selectOption(page, 0, 'figure')

  // 打开标识下拉，dup-1 应只出现一次
  await modal(page).locator('.ant-select').nth(1).click()
  await page.waitForTimeout(200)
  const dupOpts = page.locator('.ant-select-dropdown:visible li.ant-select-dropdown-menu-item', { hasText: 'dup-1' })
  await expect(dupOpts).toHaveCount(1)
  await page.close()
})

// ===== 用例10：空文档 → 静默不弹窗 =====
test('10) 空文档点内部引用 → 不弹窗不报错', async ({ browser }) => {
  const page = await browser.newPage()
  await openEditor(page, 'edit')
  await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.setValue(''))
  await page.waitForTimeout(300)
  await clickInterref(page)
  await page.waitForTimeout(500)
  await expect(page.locator('.interref-dialog .ant-modal-content')).toHaveCount(0)
  await page.close()
})
