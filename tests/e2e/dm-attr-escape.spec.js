const { test, expect } = require('@playwright/test')
const http = require('http')

// 同族A/B/C：_writeAttr 属性值转义 / $序列 / 属性名子串隔离
// 所有操作通过真实UI交互（东区属性面板 input 输入 + blur），不绕过Vue层
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2083905781513461761'
const DMC = 'DMC-J-ZB1-A-02-111A-A-00-0030101-001-01_ZH-CN'

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
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=${mode}&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
  }, { timeout: 30000 })
}

const cmEval = (page, fn, arg) => page.evaluate(
  ([fnStr, a]) => (new Function('cm', 'arg', 'return (' + fnStr + ')(cm, arg)'))(
    document.querySelector('.CodeMirror').CodeMirror, a), [fn.toString(), arg])

async function selectByLine(page, line) {
  await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, line)
  await page.waitForTimeout(600)
}

// 找到第一个渲染为文本input（非select）的属性行索引；返回 -1 表示无
async function findTextInputAttr(page) {
  const rows = page.locator('.region-east .attr-row')
  const n = await rows.count()
  let inputIdx = 0
  for (let r = 0; r < n; r++) {
    const hasSelect = await rows.nth(r).locator('.ant-select').count()
    const hasInput = await rows.nth(r).locator('input').count()
    if (!hasSelect && hasInput) return inputIdx
    if (hasInput) inputIdx++
  }
  return -1
}

// 通过input输入并blur提交
async function typeAttr(page, idx, val) {
  const input = page.locator('.region-east .attr-row input').nth(idx)
  await input.click({ clickCount: 3 })
  await page.waitForTimeout(80)
  await page.keyboard.type(val)
  await page.waitForTimeout(150)
  await page.locator('.region-east .hdr-tag').click() // blur → commit
  await page.waitForTimeout(500)
}

// 读取CM是否仍是合法XML（用DOMParser验证refreshTree同款解析不报错）
async function cmXmlValid(page) {
  return await cmEval(page, cm => {
    const xml = cm.getValue()
    const root = xml.indexOf('<dmodule')
    let body = root >= 0 ? xml.substring(root) : xml
    body = body.replace(/<dmodule[^>]*>/, '<dmodule>')
    body = body.replace(/(\s)([\w]+):/g, '$1$2_').replace(/<([\w]+):/g, '<$1_').replace(/<\/([\w]+):/g, '</$1_')
    const doc = new DOMParser().parseFromString(body, 'text/xml')
    return doc.getElementsByTagName('parsererror').length === 0
  })
}

test.describe('同族A/B/C · 属性值转义（真实UI）', () => {
  test('A：属性值含 " & < 输入后CM仍是合法XML（refreshTree不崩）', async ({ page }) => {
    await openEditor(page, 'edit')
    // 找一个带文本input属性的元素：从content区域向下找第一个有可写文本属性的元素
    let targetLine = -1; let inputIdx = -1
    const lines = await cmEval(page, cm => {
      const arr = []
      for (let i = 0; i < cm.lineCount(); i++) arr.push(cm.getLine(i) || '')
      return arr
    })
    // 逐行选中，直到东区出现文本input属性
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim()
      if (!/^<[a-zA-Z一-鿿]/.test(t) || t.startsWith('</')) continue
      await selectByLine(page, i)
      const idx = await findTextInputAttr(page)
      if (idx >= 0) { targetLine = i; inputIdx = idx; break }
      if (i > 60) break // 只在前若干元素里找，避免过久
    }
    test.skip(targetLine < 0, '未找到含文本input属性的元素')
    console.log(`选中行 ${targetLine}，文本input属性索引 ${inputIdx}`)

    // 输入含 " & < 的值
    await typeAttr(page, inputIdx, 'a"b&c<d')
    // 验证CM仍是合法XML（转义生效，DOMParser不报parsererror）
    const valid = await cmXmlValid(page)
    expect(valid).toBe(true)
    // 验证CM里出现转义实体而非裸字符
    const hasEntity = await cmEval(page, cm => {
      const v = cm.getValue()
      return v.includes('&quot;') && v.includes('&amp;') && v.includes('&lt;')
    })
    expect(hasEntity).toBe(true)
  })

  test('B：属性值含 $1/$& 输入后原样保留（$不被替换模式展开）', async ({ page }) => {
    await openEditor(page, 'edit')
    let targetLine = -1; let inputIdx = -1
    const lineCount = await cmEval(page, cm => cm.lineCount())
    for (let i = 0; i < lineCount; i++) {
      const t = await cmEval(page, (cm, l) => (cm.getLine(l) || '').trim(), i)
      if (!/^<[a-zA-Z一-鿿]/.test(t) || t.startsWith('</')) continue
      await selectByLine(page, i)
      const idx = await findTextInputAttr(page)
      if (idx >= 0) { targetLine = i; inputIdx = idx; break }
      if (i > 60) break
    }
    test.skip(targetLine < 0, '未找到含文本input属性的元素')

    await typeAttr(page, inputIdx, '$1x$&y')
    const kept = await cmEval(page, cm => {
      const v = cm.getValue()
      // $1 与 $ 原样出现（& 会被转义为 &amp;，$ 不受影响）
      return v.includes('$1x$&amp;y') || v.includes('$1x$')
    })
    expect(kept).toBe(true)
    expect(await cmXmlValid(page)).toBe(true)
  })

  test('C：属性名子串场景不误伤（真实DM中若无则跳过）', async ({ page }) => {
    await openEditor(page, 'edit')
    // 该断言主要由单测覆盖；此处做真实UI冒烟：任选一元素改属性后，
    // 其它属性数量/值不减少（不被误删）
    let targetLine = -1
    const lineCount = await cmEval(page, cm => cm.lineCount())
    for (let i = 0; i < lineCount; i++) {
      const t = await cmEval(page, (cm, l) => (cm.getLine(l) || '').trim(), i)
      // 找一个带 >=2 个属性的元素行
      const attrCount = (t.match(/[\w.-]+\s*=\s*"/g) || []).length
      if (attrCount >= 2 && !t.startsWith('</')) {
        await selectByLine(page, i)
        if (await findTextInputAttr(page) >= 0) { targetLine = i; break }
      }
      if (i > 80) break
    }
    test.skip(targetLine < 0, '未找到含≥2属性且有文本input的元素')

    const beforeAttrCount = await cmEval(page, (cm, l) =>
      ((cm.getLine(l) || '').match(/[\w.-]+\s*=\s*"/g) || []).length, targetLine)
    const idx = await findTextInputAttr(page)
    await typeAttr(page, idx, 'newval123')
    const afterAttrCount = await cmEval(page, (cm, l) =>
      ((cm.getLine(l) || '').match(/[\w.-]+\s*=\s*"/g) || []).length, targetLine)
    // 改一个属性不应减少属性总数（未误删其它属性）
    expect(afterAttrCount).toBeGreaterThanOrEqual(beforeAttrCount)
    expect(await cmXmlValid(page)).toBe(true)
  })
})
