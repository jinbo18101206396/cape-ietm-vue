const { test, expect } = require('@playwright/test')
const http = require('http')

// §17 校验对话框真实 UI 验证：触发/单选/定位/关闭全部走真实点击，不绕过 Vue 层。
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2084954557183365121'
const DMC = 'DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN'

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

// stub 校验接口，返回两条错误（后端行号 1、2，相对纯 XML），触发对话框
async function stubValidate(page) {
  await page.route('**/dm-content/validate**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: { flag: 'error',
errors: [
          { lineno: 1, info: 'cvc-complex-type.2.4.a: 元素 A 处内容非法' },
          { lineno: 2, info: 'cvc-datatype: 元素 B 值类型错误' }
        ] }
      })
    })
  })
}

// D1 回归 stub：后端对"无真实行号"的配置/异常类错误发 lineno=0 哨兵
// （对应 DmXmlHelper 非法路径/找不到Schema/校验异常、toItem 无 locator 分支）
async function stubValidateSentinel(page) {
  await page.route('**/dm-content/validate**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: { flag: 'error',
errors: [
          { lineno: 0, info: '找不到Schema文件: descript.xsd' }
        ] }
      })
    })
  })
}

test.describe('§17 校验对话框 UI 验证', () => {
  test('触发校验 → 弹出「校验情况」非模态对话框，列/序号正确', async ({ page }) => {
    await openEditor(page, 'edit')
    await stubValidate(page)

    await page.locator('button[title*="XSD Schema校验"]').click()

    // 标题「校验情况」
    const header = page.locator('.dvp-title')
    await header.waitFor({ state: 'visible', timeout: 10000 })
    expect((await header.innerText()).trim()).toContain('校验情况')

    // 列头：序号 / 行号 / 信息
    const heads = await page.locator('.dm-validate-panel th').allInnerTexts()
    const headTxt = heads.join('|')
    expect(headTxt).toContain('序号')
    expect(headTxt).toContain('行号')
    expect(headTxt).toContain('信息')

    // 两行数据，序号列 1、2
    const rows = page.locator('.dm-validate-panel tbody tr')
    await expect(rows).toHaveCount(2)

    // 非模态：无遮罩层可见（mask=false）
    const maskVisible = await page.locator('.dm-validate-wrap .ant-modal-mask').isVisible().catch(() => false)
    expect(maskVisible).toBeFalsy()

    // 非模态验证：对话框开着时仍能聚焦编辑器（点编辑器正文，wrap 不拦截事件）
    await page.locator('.CodeMirror-line').first().click()
    await page.waitForFunction(() => !!document.querySelector('.CodeMirror-focused'), { timeout: 5000 })
    console.log('✅ 对话框：标题/列/序号正确，非模态可操作编辑器')
  })

  test('未选行点定位 → 提示「请选择一行数据。」', async ({ page }) => {
    await openEditor(page, 'edit')
    await stubValidate(page)
    await page.locator('button[title*="XSD Schema校验"]').click()
    await page.locator('.dvp-title').waitFor({ state: 'visible', timeout: 10000 })

    await page.locator('.dvp-footer button.ant-btn-primary').click()
    await expect(page.locator('.ant-message').filter({ hasText: '请选择一行数据' })).toBeVisible({ timeout: 5000 })
    console.log('✅ 未选行定位：正确提示')
  })

  test('选中行点定位 → 光标落到对应行标签名首字符', async ({ page }) => {
    await openEditor(page, 'edit')
    const offset = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror
      .getValue().split('\n').findIndex(l => /^\s*<dmodule[\s>]/.test(l)) + 1)
    await stubValidate(page)
    await page.locator('button[title*="XSD Schema校验"]').click()
    await page.locator('.dvp-title').waitFor({ state: 'visible', timeout: 10000 })

    // 第 1 行错误：后端 lineno=1 → 显示行号 = 1-1+offset = offset；0-based 行索引 = offset-1
    const dispLineno = await page.locator('.dm-validate-panel tbody tr').first()
      .locator('td').nth(1).innerText()
    expect(parseInt(dispLineno, 10)).toBe(offset)

    // 点第一行选中，再点定位
    await page.locator('.dm-validate-panel tbody tr').first().click()
    await page.locator('.dvp-footer button.ant-btn-primary').click()
    await page.waitForTimeout(300)

    // 校验光标：line = dispLineno-1，ch = 该行 indexOf('<')+1
    const cur = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const c = cm.getCursor()
      const text = cm.getLine(c.line) || ''
      return { line: c.line, ch: c.ch, tagStart: text.indexOf('<') }
    })
    // 落在标签左边缘 '<'（§50.2 原子标签保护下光标无法进入标签内部）
    expect(cur.line).toBe(offset - 1)
    expect(cur.ch).toBe(cur.tagStart)
    console.log('✅ 定位：光标行=' + cur.line + ' 列=' + cur.ch + '（标签 < 处，原子保护边缘）')
  })

  test('点关闭 → 对话框消失', async ({ page }) => {
    await openEditor(page, 'edit')
    await stubValidate(page)
    await page.locator('button[title*="XSD Schema校验"]').click()
    await page.locator('.dvp-title').waitFor({ state: 'visible', timeout: 10000 })

    await page.locator('.dvp-footer button:not(.ant-btn-primary)').click()
    await expect(page.locator('.dvp-title')).toBeHidden({ timeout: 5000 })
    console.log('✅ 关闭：对话框消失')
  })

  // ── D1 回归：无真实行号的哨兵错误(lineno=0)显示"-"、不参与定位 ──────────────
  test('D1 哨兵错误 lineno=0 → 行号列显示「-」，不显示「第 0 行」或字面 0', async ({ page }) => {
    await openEditor(page, 'edit')
    await stubValidateSentinel(page)
    await page.locator('button[title*="XSD Schema校验"]').click()
    await page.locator('.dvp-title').waitFor({ state: 'visible', timeout: 10000 })

    const rows = page.locator('.dm-validate-panel tbody tr')
    await expect(rows).toHaveCount(1)

    // 行号列（第 2 列，index 1）应显示 "-"，绝不是 "0" / "第 0 行" / "-1"
    const linenoCell = (await rows.first().locator('td').nth(1).innerText()).trim()
    expect(linenoCell).toBe('-')
    expect(linenoCell).not.toContain('0')

    // 信息列保留原文
    const infoCell = await rows.first().locator('td').nth(2).innerText()
    expect(infoCell).toContain('找不到Schema文件')
    console.log('✅ D1：哨兵行号显示「-」，信息原文保留')
  })

  test('D1 哨兵错误选中点定位 → 提示无对应行号且光标不跳转', async ({ page }) => {
    await openEditor(page, 'edit')
    await stubValidateSentinel(page)

    // 记录定位前光标位置
    const before = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setCursor({ line: 0, ch: 0 })
      const c = cm.getCursor(); return { line: c.line, ch: c.ch }
    })

    await page.locator('button[title*="XSD Schema校验"]').click()
    await page.locator('.dvp-title').waitFor({ state: 'visible', timeout: 10000 })

    // 选中哨兵行后点定位
    await page.locator('.dm-validate-panel tbody tr').first().click()
    await page.locator('.dvp-footer button.ant-btn-primary').click()

    // 提示"无对应行号"，且光标未移动
    await expect(page.locator('.ant-message').filter({ hasText: '无对应行号' }))
      .toBeVisible({ timeout: 5000 })
    const after = await page.evaluate(() => {
      const c = document.querySelector('.CodeMirror').CodeMirror.getCursor()
      return { line: c.line, ch: c.ch }
    })
    expect(after).toEqual(before)
    console.log('✅ D1：哨兵行定位被拒绝，光标未跳转')
  })

  // ── §17.2 空文档前置拦截：不发校验请求，提示"内容为空。" ────────────────────
  test('空文档点校验 → 不发请求、提示「内容为空。」、不弹对话框', async ({ page }) => {
    await openEditor(page, 'edit')
    // 监控是否有 validate 请求发出（有则说明未做前置拦截）
    let validateCalled = false
    await page.route('**/dm-content/validate**', async route => {
      validateCalled = true
      await route.fulfill({ status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: true, result: { flag: '1' } }) })
    })
    // 清空编辑器内容
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setOption('readOnly', false)
      cm.setValue('')
    })
    await page.locator('button[title*="XSD Schema校验"]').click()

    await expect(page.locator('.ant-message').filter({ hasText: '内容为空。' }))
      .toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(500)
    expect(validateCalled).toBe(false)
    await expect(page.locator('.dvp-title')).toBeHidden()
    console.log('✅ §17.2：空文档静默拦截，未发请求')
  })
})
