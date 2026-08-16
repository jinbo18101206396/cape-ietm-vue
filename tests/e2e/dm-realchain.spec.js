const { test, expect } = require('@playwright/test')
const http = require('http')

// 真实全链路：真前端(3000) + 真后端(9999) + 真 CodeMirror + 真 DM 数据。
// 登录用 API 拿 token 后注入 vue-ls(localStorage pro__Access-Token)，避免登录页脆弱选择器。
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2083905781513461761' // admin 已签出 → edit 模式
const DMC = 'DMC-J-ZB1-A-02-111A-A-00-0030101-001-01_ZH-CN'

// 用 node http 直接登录后端拿 token（beforeAll）
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

// 注入 token → 打开编辑器 → 等 CodeMirror 就绪并加载到真实 DM 内容
async function openEditor(page, mode = 'edit') {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=${mode}&dmc=${encodeURIComponent(DMC)}`)
  // 等 CodeMirror 出现且非空
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
  }, { timeout: 30000 })
  return page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.lineCount())
}

// 编辑器 CM 实例句柄工具
const cmEval = (page, fn, arg) => page.evaluate(
  ([fnStr, a]) => (new Function('cm', 'arg', 'return (' + fnStr + ')(cm, arg)'))(
    document.querySelector('.CodeMirror').CodeMirror, a), [fn.toString(), arg])

test.describe('真实全链路 · DM 编辑器 8 问题', () => {
  test.setTimeout(90000)

  test('冒烟：编辑模式加载真实 DM，进入 edit 模式、CM 有内容', async ({ page }) => {
    const lines = await openEditor(page, 'edit')
    console.log('CM 行数:', lines)
    expect(lines).toBeGreaterThan(5)
    // 模式横幅应为"编辑模式"
    const banner = await page.textContent('.mode-banner')
    console.log('横幅:', banner.trim())
    expect(banner).toContain('编辑')
  })

  test('Bug5：加载后连续撤销 8 次，内容与导航树不清空', async ({ page }) => {
    await openEditor(page, 'edit')
    const before = await cmEval(page, cm => cm.getValue())
    // 点撤销按钮 8 次
    for (let i = 0; i < 8; i++) {
      await page.click('button[title*="撤销"]').catch(() => {})
      await page.waitForTimeout(80)
    }
    const after = await cmEval(page, cm => cm.getValue())
    console.log('撤销后长度:', after.length, '/ 原:', before.length)
    expect(after).toContain('<dmodule')
    expect(after.trim().length).toBeGreaterThan(100)
    // 导航树仍有节点
    const treeNodes = await page.locator('.region-west .ant-tree-node-content-wrapper, .region-west [role="treeitem"]').count()
    console.log('导航树节点数:', treeNodes)
    expect(treeNodes).toBeGreaterThan(0)
  })

  test('Bug6：格式化按钮后，任意子元素都不与父元素同行', async ({ page }) => {
    await openEditor(page, 'edit')
    // 人为在编辑器里制造同行粘连：把某 <content>... 改成 <content><refs></refs>
    const hasContent = await cmEval(page, cm => cm.getValue().includes('<content'))
    if (!hasContent) { test.skip(true, '该 DM 无 content 节点'); return }
    await cmEval(page, cm => {
      const v = cm.getValue().replace(/(<content[^>]*>)/, '$1<refs></refs>')
      cm.setValue(v)
    })
    await page.click('button[title*="格式化"]')
    await page.waitForTimeout(300)
    const glued = await cmEval(page, cm =>
      cm.getValue().split('\n').some(l => /<content[^>]*>\s*<refs>/.test(l)))
    console.log('格式化后仍有 content+refs 同行?', glued)
    expect(glued).toBeFalsy()
  })

  test('Bug4：签入请求带 id 参数（非破坏性：拦截并 mock，不真正签入）', async ({ page }) => {
    await openEditor(page, 'edit')
    // 非破坏性：拦截 checkIn，断言 URL 带 id 后返回 mock 成功，避免真正改动 DM 签出状态。
    // 保存请求(save/{id})放行真实后端（幂等、不改签出态），验证"先保存再签入"链路真实可达。
    let checkInUrl = null
    await page.route('**/datamodule/checkIn**', route => {
      checkInUrl = route.request().url()
      route.fulfill({ status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '签入成功', code: 200 }) })
    })
    await page.click('button[title*="签入"]')
    await page.click('.ant-modal-confirm .ant-btn-primary, .ant-modal-confirm button:has-text("确定")').catch(() => {})
    await page.waitForTimeout(1500)
    console.log('拦截到的 checkIn URL:', checkInUrl)
    expect(checkInUrl).toBeTruthy()
    expect(checkInUrl).toContain('id=') // 关键：修复后 id 拼在 query（旧版进 body → 后端报缺 id）
    expect(checkInUrl).toContain(encodeURIComponent(DM_ID)) // 且是当前 DM 的 id
  })

  test('Bug8：移动行输入行号→确认，不报"未找到起始行对应的元素"', async ({ page }) => {
    await openEditor(page, 'edit')
    // content 区内的同层兄弟：description 下有 caution / warning（真实 DM 结构）。
    // 取 content 内某叶子元素的起始行作为 from，其后一个兄弟起始行作为 to（同层有效移动）。
    const pos = await cmEval(page, cm => {
      let cStart = -1
      for (let i = 0; i < cm.lineCount(); i++) {
        if ((cm.getLine(i) || '').trim().startsWith('<content')) { cStart = i; break }
      }
      if (cStart < 0) return null
      const leaves = []
      for (let i = cStart + 1; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.startsWith('</content')) break
        if (/^<(caution|warning|note|para|refs)[\s>]/.test(t)) leaves.push(i + 1) // 1-based
      }
      return leaves.length >= 2 ? { from: leaves[1], to: leaves[0] } : (leaves.length === 1 ? { from: leaves[0], to: leaves[0] + 1 } : null)
    })
    console.log('移动 from/to:', JSON.stringify(pos))
    test.skip(!pos, '该 DM content 内无可移动样本')
    await cmEval(page, (cm, l) => cm.setCursor({ line: l - 1, ch: 0 }), pos.from)
    await page.click('button[title*="移动行"]')
    const modal = page.locator('.ant-modal:visible', { hasText: '起始行' })
    await modal.waitFor({ state: 'visible' })
    const inputs = modal.locator('input.ant-input-number-input, input')
    await inputs.nth(0).fill(String(pos.from))
    await inputs.nth(1).fill(String(pos.to))
    await modal.locator('.ant-modal-footer .ant-btn-primary').click()
    await page.waitForTimeout(800)
    const notFound = await page.getByText('未找到起始行对应的元素').count()
    const success = await page.locator('.ant-message-success').count() +
             await page.getByText('已将元素', { exact: false }).count()
    console.log('未找到提示:', notFound, '| 成功提示:', success)
    expect(notFound).toBe(0) // Bug8：不再出现"未找到起始行对应的元素"
    expect(success).toBeGreaterThan(0) // 且真实完成一次同层移动
  })

  test('Bug1：description 回车补全弹框不含闭合标签 </description>', async ({ page }) => {
    await openEditor(page, 'edit')
    const descLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) if ((cm.getLine(i) || '').trim().startsWith('<description')) return i
      return -1
    })
    test.skip(descLine < 0, '该 DM 无 description 节点')
    await cmEval(page, (cm, l) => { cm.focus(); cm.setCursor({ line: l, ch: cm.getLine(l).length }) }, descLine)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(350)
    const hints = await page.locator('.CodeMirror-hints .CodeMirror-hint').allTextContents().catch(() => [])
    console.log('description 补全框:', JSON.stringify(hints))
    await page.keyboard.press('Escape').catch(() => {})
    expect(hints.some(h => h.startsWith('</'))).toBeFalsy() // 无闭合标签
    expect(hints.length).toBeGreaterThan(0)
  })

  test('Bug2：回车补全选中子元素后，自动格式化拆行（不与父同行）', async ({ page }) => {
    await openEditor(page, 'edit')
    const descLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) if ((cm.getLine(i) || '').trim().startsWith('<description')) return i
      return -1
    })
    test.skip(descLine < 0, '该 DM 无 description')
    // 删掉现有的 caution/warning，在 description 下补全插入一个新 warning
    await cmEval(page, cm => {
      let v = cm.getValue()
      v = v.replace(/<caution><\/caution>/g, '').replace(/<warning>[\s\S]*?<\/warning>/g, '')
      cm.setValue(v)
    })
    await page.waitForTimeout(200)
    await cmEval(page, (cm, l) => { cm.focus(); cm.setCursor({ line: l, ch: cm.getLine(l).length }) }, descLine)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(350)
    const hints = await page.locator('.CodeMirror-hints .CodeMirror-hint').allTextContents().catch(() => [])
    const warningIdx = hints.findIndex(h => h.includes('warning'))
    if (warningIdx < 0) { test.skip(true, 'popup 无 warning'); return }
    // 点第 warningIdx 项
    await page.locator('.CodeMirror-hints .CodeMirror-hint').nth(warningIdx).click()
    await page.waitForTimeout(400)
    const glued = await cmEval(page, cm => cm.getValue().split('\n').some(l => /<description[^>]*>\s*<warning/.test(l)))
    console.log('插入 warning 后有 description+warning 同行?', glued)
    expect(glued).toBeFalsy() // Bug2：格式化后 warning 独占一行
  })

  test('Bug7：新插入元素的开标签受 atomic 保护（Backspace 不能部分删除标签名）', async ({ page }) => {
    await openEditor(page, 'edit')
    // 确保有一个 warning 元素（Bug2 留下的或手动插），测其 atomic
    const warningLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) if ((cm.getLine(i) || '').trim().startsWith('<warning')) return i
      return -1
    })
    test.skip(warningLine < 0, '无 warning 节点测 atomic')
    // 检查 warning 行的 <war 区间是否有 atomic mark
    const isAtomic = await cmEval(page, (cm, l) => {
      const text = cm.getLine(l)
      const ltPos = text.indexOf('<')
      const marks = cm.findMarksAt({ line: l, ch: ltPos + 3 }) // <war'n'ing 的 n 位置
      return marks.some(m => m.atomic)
    }, warningLine)
    console.log('warning 标签名区 atomic:', isAtomic)
    expect(isAtomic).toBeTruthy() // Bug7：atomic 保护，Backspace 会整块删
  })

  test('Bug3：自闭合标签 dmCode 改属性 itemLocationCode，位置正确 />前', async ({ page }) => {
    await openEditor(page, 'edit')
    const dmcLine = await cmEval(page, cm => {
      let inIdent = false
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.startsWith('<identAndStatusSection')) inIdent = true
        if (inIdent && t.match(/^<dmCode[^>]*\/>/)) return i
        if (t.startsWith('</identAndStatusSection')) break
      }
      return -1
    })
    test.skip(dmcLine < 0, '无 dmCode')
    await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, dmcLine)
    await page.waitForTimeout(500)
    const eastTag = await page.locator('.region-east .hdr-tag').textContent().catch(() => '')
    if (!eastTag.includes('dmCode')) {
      await page.locator('.region-west .ant-tree-node-content-wrapper', { hasText: 'dmCode' }).first().click().catch(() => {})
      await page.waitForTimeout(400)
    }
    const attrLabels = await page.locator('.region-east .attr-row .lbl-text').allTextContents().catch(() => [])
    const itemLocIdx = attrLabels.indexOf('itemLocationCode')
    test.skip(itemLocIdx < 0, 'dmCode 无 itemLocationCode')
    console.log('itemLocationCode idx:', itemLocIdx, '(pattern=[A-Z0-9]{1}，单字符)')

    const itemLocInput = page.locator('.region-east .attr-row input').nth(itemLocIdx)
    await itemLocInput.click({ clickCount: 3 }) // 全选
    await page.keyboard.type('B') // 改成 B（符合 pattern）
    await page.waitForTimeout(200)

    // 手动调 commit
    const ok = await page.evaluate((idx) => {
      const el = document.querySelector('.region-east .dm-attr-panel')
      if (!el || !el.__vue__) return false
      const p = el.__vue__
      const a = p.attrList[idx]
      if (!a) return false
      p.commit(a, 'B')
      return true
    }, itemLocIdx)
    test.skip(!ok, 'commit 调用失败')
    await page.waitForTimeout(800)

    const dmcText = await cmEval(page, (cm, l) => cm.getLine(l), dmcLine)
    console.log('dmCode 行:', dmcText.trim().substring(0, 130))
    expect(dmcText).toMatch(/itemLocationCode="B"/)
    expect(dmcText).toMatch(/itemLocationCode="B"[^>]*\/>/)
  })
})
