const { test, expect } = require('@playwright/test')
const http = require('http')

// 二期·元素操作(§14.1-14.3) 端到端真实UI验证
// 重点覆盖 ietm-phase2-lineno-bugs 中标注「仅过JS模拟、未经浏览器真实DM验证」的几项：
//   Bug9  sibling 插入位置（同级元素不能插进当前元素内部）
//   Bug10 自闭合父元素插入子元素时自动展开
//   Bug8  删除只依据树选中node，不受编辑器光标停在无关</xxx>行影响
//   删除/移动 happy path + 撤销后树刷新时机
// 所有操作走真实UI（双击面板pill / 点工具栏按钮 / 填弹框），不绕过 Vue 层；全程只在内存中，不 doSave，不改库数据。
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2084648696397422594'
const PROJECT = '2078348945532030978'

function apiLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'admin', password: '123456' })
    const req = http.request(API + '/sys/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { const j = JSON.parse(d); j.success ? resolve(j.result.token) : reject(new Error(j.message)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

let TOKEN
test.beforeAll(async () => { TOKEN = await apiLogin() })

async function openEditor(page, mode = 'edit') {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=${mode}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
  }, { timeout: 30000 })
  await page.waitForTimeout(500) // 等 loadData 的 $nextTick(格式化+解析nodeList)完成
}

// 读取整份 XML
const getXml = (page) => page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())

// 在 CM 中定位到首个匹配 tag 的行并落光标（触发 cursorActivity → onCursorNode → 选中该元素）
async function selectByCmLine(page, tagRegexSrc) {
  const ok = await page.evaluate((src) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    const re = new RegExp(src)
    for (let i = 0; i < cm.lineCount(); i++) {
      const t = (cm.getLine(i) || '').trim()
      if (re.test(t)) {
        const ch = Math.min(2, (cm.getLine(i) || '').length)
        cm.setCursor({ line: i, ch }); cm.focus()
        return true
      }
    }
    return false
  }, tagRegexSrc)
  await page.waitForTimeout(600) // 等东区面板响应光标变化
  return ok
}

// 东区面板当前选中的标签名
const selectedTag = (page) => page.locator('.region-east .hdr-tag').textContent().catch(() => '')

// 双击子元素 pill 插入子元素
async function insertChild(page, en) {
  const pill = page.locator(`.region-east .pill-child[title="${en}"]`).first()
  await pill.waitFor({ state: 'visible', timeout: 5000 })
  await pill.dblclick()
  await page.waitForTimeout(800)
}

// 双击同级元素 pill 插入兄弟元素
async function insertSibling(page, en) {
  const pill = page.locator(`.region-east .pill-sibling[title="${en}"]`).first()
  await pill.waitFor({ state: 'visible', timeout: 5000 })
  await pill.dblclick()
  await page.waitForTimeout(800)
}

// 点工具栏按钮（title 关键字）
async function clickToolbar(page, titleKw) {
  const btn = page.locator(`button[title*="${titleKw}"]`).first()
  await btn.waitFor({ state: 'visible', timeout: 5000 })
  await btn.click()
  await page.waitForTimeout(300)
}

// 缩进层级（前导空格数），用于判断兄弟/父子关系
function indentOf(line) { return (line.match(/^\s*/) || [''])[0].length }
// 从 XML 文本里取某标签首次出现的行索引（0-based）与该行文本
function lineOf(xml, tagRegexSrc) {
  const re = new RegExp(tagRegexSrc)
  const lines = xml.split('\n')
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i].trim())) return { idx: i, text: lines[i], lines }
  return { idx: -1, lines }
}

test.describe('二期·元素操作 真实UI验证', () => {
  // Bug10：自闭合 <description/> 插入子元素 para → 应展开为 <description>…</description> 并把 para 嵌在内部
  test('插入子元素：自闭合父元素自动展开(Bug10)', async ({ page }) => {
    await openEditor(page)

    // description 初始是自闭合
    let xml = await getXml(page)
    expect(xml).toMatch(/<description\s*\/>/)

    const ok = await selectByCmLine(page, '^<description')
    expect(ok).toBeTruthy()
    expect(await selectedTag(page)).toContain('description')

    await insertChild(page, 'para')

    xml = await getXml(page)
    // 断言1：description 不再是自闭合
    expect(xml).not.toMatch(/<description\s*\/>/)
    // 断言2：出现成对 <description> … </description>
    expect(xml).toMatch(/<description>/)
    expect(xml).toMatch(/<\/description>/)
    // 断言3：para 出现，且缩进比 description 深一级（=在其内部，而非之后）
    const d = lineOf(xml, '^<description>')
    const p = lineOf(xml, '^<para')
    expect(d.idx).toBeGreaterThanOrEqual(0)
    expect(p.idx).toBeGreaterThan(d.idx)
    expect(indentOf(p.text)).toBeGreaterThan(indentOf(d.text))
    // 断言4：para 位于 description 的开闭标签之间
    const dc = lineOf(xml, '^</description>')
    expect(p.idx).toBeLessThan(dc.idx)
  })

  // Bug9：先在 description 下插 para（子），再对 para 插 note（同级）→ note 必须是 para 的兄弟，不能进 para 内部
  test('插入同级元素：不落进当前元素内部(Bug9)', async ({ page }) => {
    await openEditor(page)

    // 1) description 下插 para
    expect(await selectByCmLine(page, '^<description')).toBeTruthy()
    await insertChild(page, 'para')

    // 2) 选中 para，插同级 note
    expect(await selectByCmLine(page, '^<para')).toBeTruthy()
    expect(await selectedTag(page)).toContain('para')
    await insertSibling(page, 'note')

    const xml = await getXml(page)
    const p = lineOf(xml, '^<para')
    const pc = lineOf(xml, '^</para>')
    const n = lineOf(xml, '^<note')
    expect(p.idx).toBeGreaterThanOrEqual(0)
    expect(n.idx).toBeGreaterThanOrEqual(0)
    // 断言：note 在 </para> 之后（是兄弟，不是子）
    expect(n.idx).toBeGreaterThan(pc.idx)
    // 断言：note 与 para 同缩进层级（兄弟）
    expect(indentOf(n.text)).toBe(indentOf(p.text))
  })

  // 删除 happy path：删掉 para，DM 中不再有 <para
  test('删除元素：整块删除干净', async ({ page }) => {
    await openEditor(page)
    expect(await selectByCmLine(page, '^<description')).toBeTruthy()
    await insertChild(page, 'para')
    expect(await getXml(page)).toMatch(/<para/)

    expect(await selectByCmLine(page, '^<para')).toBeTruthy()
    await clickToolbar(page, '删除行')
    // 确认弹框
    const okBtn = page.locator('.ant-modal-confirm .ant-btn-primary').first()
    await okBtn.waitFor({ state: 'visible', timeout: 5000 })
    await okBtn.click()
    await page.waitForTimeout(800)

    const xml = await getXml(page)
    expect(xml).not.toMatch(/<para/)
    // description 仍在（未误删父元素）
    expect(xml).toMatch(/description/)
  })

  // Bug8：光标停在无关 </xxx> 闭合行时，删除树选中的另一元素不应被误判"不能删除"
  test('删除元素：光标在无关闭合行不影响删除(Bug8)', async ({ page }) => {
    await openEditor(page)
    // 构造两个兄弟：description 下 para + note
    expect(await selectByCmLine(page, '^<description')).toBeTruthy()
    await insertChild(page, 'para')
    expect(await selectByCmLine(page, '^<para')).toBeTruthy()
    await insertSibling(page, 'note')

    let xml = await getXml(page)
    expect(xml).toMatch(/<para/)
    expect(xml).toMatch(/<note/)

    // 选中 note（树/东区选中 note），但把编辑器光标移到 </para> 闭合行
    expect(await selectByCmLine(page, '^<note')).toBeTruthy()
    expect(await selectedTag(page)).toContain('note')
    // 用树点击确保 currentNode=note，再单独把 CM 光标挪到 </para>（模拟 Bug8 场景）
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      for (let i = 0; i < cm.lineCount(); i++) {
        if ((cm.getLine(i) || '').trim() === '</para>') { cm.setCursor({ line: i, ch: 0 }); break }
      }
    })
    await page.waitForTimeout(200)

    // 通过树右键删除 note（不依赖当前光标）
    const noteTreeNode = page.locator('.region-west .dm-tree .ant-tree-title', { hasText: /^note$/ }).first()
    await noteTreeNode.click({ button: 'right' })
    await page.waitForTimeout(300)
    const delItem = page.locator('.ant-dropdown-menu-item', { hasText: '删除此元素' }).first()
    await delItem.click()
    await page.waitForTimeout(300)
    const okBtn = page.locator('.ant-modal-confirm .ant-btn-primary').first()
    await okBtn.waitFor({ state: 'visible', timeout: 5000 })
    await okBtn.click()
    await page.waitForTimeout(800)

    // 不应出现"不能删除"错误；note 被删除，para 保留
    xml = await getXml(page)
    expect(xml).not.toMatch(/<note/)
    expect(xml).toMatch(/<para/)
  })

  // 移动 happy path：para、note 两兄弟，把 para 移到 note 之后，顺序应交换
  test('移动元素：同级顺序交换', async ({ page }) => {
    await openEditor(page)
    expect(await selectByCmLine(page, '^<description')).toBeTruthy()
    await insertChild(page, 'para')
    expect(await selectByCmLine(page, '^<para')).toBeTruthy()
    await insertSibling(page, 'note')

    // 记录移动前 para/note 的行号（1-based）
    const before = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      let para = -1; let note = -1
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (para < 0 && /^<para/.test(t)) para = i + 1
        if (note < 0 && /^<note/.test(t)) note = i + 1
      }
      return { para, note }
    })
    expect(before.para).toBeGreaterThan(0)
    expect(before.note).toBeGreaterThan(before.para)

    // 打开移动行弹框：把 para(起始行) 移到 note 之后一行(目标行)
    await clickToolbar(page, '移动行')
    const modal = page.locator('.ant-modal:visible', { hasText: '起始行' })
    await modal.waitFor({ state: 'visible', timeout: 5000 })
    const inputs = modal.locator('input.ant-input-number-input')
    await inputs.nth(0).fill(String(before.para))
    await inputs.nth(1).fill(String(before.note + 1)) // note 之后
    await modal.locator('.ant-modal-footer .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 断言：无错误提示；顺序变为 note 在 para 之前
    const errCount = await page.locator('.ant-message-error').count()
    expect(errCount).toBe(0)
    const xml = await getXml(page)
    const nIdx = lineOf(xml, '^<note').idx
    const pIdx = lineOf(xml, '^<para').idx
    expect(nIdx).toBeGreaterThanOrEqual(0)
    expect(pIdx).toBeGreaterThan(nIdx) // para 现在在 note 之后
  })

  // 撤销粒度：一次"插入元素"= 一个撤销单元（editor.operation 合并 展开+插入+formateDM）。
  // 断言：单次 Ctrl+Z 即完全回退（para 消失、缩进规范无中间态、树同步无残留），再重做一次 para 恢复。
  test('撤销/重做：一次插入=一个撤销单元（单次回退且树同步）', async ({ page }) => {
    await openEditor(page)
    expect(await selectByCmLine(page, '^<description')).toBeTruthy()
    await insertChild(page, 'para')
    expect(await getXml(page)).toMatch(/<para/)

    // 单次撤销即应完全回退
    await clickToolbar(page, '撤销')
    await page.waitForTimeout(800)

    const xml = await getXml(page)
    expect(xml).not.toMatch(/<para/) // para 消失
    expect(xml).toMatch(/<description\s*\/>/) // 回到自闭合原态，非缩进畸形中间态
    // 树与内容一致：无残留 para 节点（验证 doUndo→refreshTree）
    const paraNodes = await page.locator('.region-west .dm-tree .ant-tree-title', { hasText: /^para$/ }).count()
    expect(paraNodes).toBe(0)

    // 单次重做即应恢复
    await clickToolbar(page, '重做')
    await page.waitForTimeout(800)
    expect(await getXml(page)).toMatch(/<para/)
  })

  // 补充：验证同一父元素下可【混插】不同 choice 成员（回归 getAddableChildren 可重复choice修复）
  test('可重复choice：description 下 para 与 note 可共存混插', async ({ page }) => {
    await openEditor(page)
    expect(await selectByCmLine(page, '^<description')).toBeTruthy()
    await insertChild(page, 'para')
    // 选中 description（非 para），子元素面板应仍列出 note（未被 para 屏蔽）
    expect(await selectByCmLine(page, '^<description')).toBeTruthy()
    const notePill = page.locator('.region-east .pill-child[title="note"]')
    await expect(notePill).toBeVisible()
    // 实际插入 note 作为 description 的第二个子元素
    await insertChild(page, 'note')
    const xml = await getXml(page)
    expect(xml).toMatch(/<para/)
    expect(xml).toMatch(/<note/)
  })
})
