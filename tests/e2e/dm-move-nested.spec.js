const { test, expect } = require('@playwright/test')
const http = require('http')

// moveElementBlock 同名嵌套修复：外层元素移动时不得被内层同名闭合标签截断
// 全流程真实UI：东区子元素 pill 双击构建嵌套 + 移动行弹框驱动移动，不绕过Vue层
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

// 选中匹配行并删除（清空 description 的 choice 占用，使 levelledPara 可插入）
async function deleteByRe(page, re) {
  const ln = await findLine(page, re)
  if (ln < 0) return
  await selectByLine(page, ln)
  await page.locator('button[title*="删除行"]').first().click()
  await page.waitForTimeout(400)
  await page.locator('.ant-modal:visible .ant-btn-primary').first().click().catch(() => {})
  await page.waitForTimeout(900)
}

// 找元素首行（0-based），未找到返回-1
async function findLine(page, tagRe) {
  return await cmEval(page, (cm, reStr) => {
    const re = new RegExp(reStr)
    for (let i = 0; i < cm.lineCount(); i++) {
      if (re.test((cm.getLine(i) || '').trim())) return i
    }
    return -1
  }, tagRe)
}

// 双击东区子元素 pill 插入
async function insertChildPill(page, en) {
  const pill = page.locator(`.region-east .elem-pill.pill-child[title="${en}"]`).first()
  await pill.waitFor({ state: 'visible', timeout: 5000 })
  await pill.dblclick()
  await page.waitForTimeout(900) // 等格式化+refreshTree
}

// 统计某标签开始/结束数
async function countTags(page, tag) {
  return await cmEval(page, (cm, t) => {
    const v = cm.getValue()
    const open = (v.match(new RegExp('<' + t + '[\\s>]', 'g')) || []).length
    const close = (v.match(new RegExp('</' + t + '>', 'g')) || []).length
    return { open, close }
  }, tag)
}

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

test.describe('moveElementBlock · 同名嵌套外层移动', () => {
  test('构建 levelledPara 自嵌套 → 移动外层 → 开闭标签数守恒且XML合法', async ({ page }) => {
    await openEditor(page, 'edit')

    // 0. description 的子元素受 choice 约束：先删除现存 warning/caution 腾出 choice，
    //    levelledPara 才会出现在可插入子元素中（真实UI删除行）
    await deleteByRe(page, '^<warning[\\s>]')
    await deleteByRe(page, '^<caution[\\s>]')

    // 1. 选中 description（levelledPara 的合法父级）
    const descLine = await findLine(page, '^<description[\\s>]')
    test.skip(descLine < 0, '未找到 description 元素')
    await selectByLine(page, descLine)

    // 2. 东区双击 levelledPara → 插入外层 A
    await insertChildPill(page, 'levelledPara')
    let lp = await countTags(page, 'levelledPara')
    test.skip(lp.open < 1, 'levelledPara 未插入（schema 可能不允许）')
    console.log('插入外层后 levelledPara:', lp)

    // 3. 选中外层 levelledPara，再插入一个 levelledPara 作为子 → 同名嵌套
    const outerLine = await findLine(page, '^<levelledPara[\\s>]')
    await selectByLine(page, outerLine)
    await insertChildPill(page, 'levelledPara')
    lp = await countTags(page, 'levelledPara')
    console.log('构建嵌套后 levelledPara:', lp)
    // 需要至少2个开始（外+内）才构成同名嵌套
    test.skip(lp.open < 2, '未能构建同名嵌套（内层插入失败）')
    expect(lp.open).toBe(lp.close) // 构建后本身应守恒

    // 4. 通过移动行弹框移动【外层】levelledPara 到 content 内另一位置
    const outerNow = await findLine(page, '^<levelledPara[\\s>]') // 外层当前行(0-based)
    // 目标：移到 warning 行附近（content 内），取一个与外层不同的行
    const warnLine = await findLine(page, '^<warning[\\s>]')
    const fromLine1 = outerNow + 1 // 1-based
    const toLine1 = (warnLine >= 0 ? warnLine : outerNow + 5) + 1
    console.log(`移动外层 levelledPara: from=${fromLine1} to=${toLine1}`)

    await cmEval(page, (cm, l) => cm.setCursor({ line: l - 1, ch: 0 }), fromLine1)
    const moveBtn = page.locator('button[title*="移动行"]').first()
    await moveBtn.click()
    await page.waitForTimeout(400)
    const modal = page.locator('.ant-modal:visible', { hasText: '起始行' })
    await modal.waitFor({ state: 'visible', timeout: 5000 })
    const inputs = modal.locator('input.ant-input-number-input, input')
    await inputs.nth(0).fill(String(fromLine1))
    await inputs.nth(1).fill(String(toLine1))
    await modal.locator('.ant-modal-footer .ant-btn-primary').click()
    await page.waitForTimeout(1200)

    // 5. 验证：移动后 levelledPara 开始/结束数仍守恒（外层闭合未被留在原地孤立）
    const after = await countTags(page, 'levelledPara')
    const valid = await cmXmlValid(page)
    console.log('移动后 levelledPara:', after, '| XML合法?', valid)

    expect(after.open).toBe(after.close) // 核心：开闭守恒（旧bug会让外层</levelledPara>孤立→不守恒）
    expect(after.open).toBe(lp.open) // 数量不丢失
    expect(valid).toBe(true) // DOMParser 无 parsererror（refreshTree 同款）
  })
})
