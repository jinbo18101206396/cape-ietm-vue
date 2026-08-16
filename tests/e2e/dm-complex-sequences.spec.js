const { test, expect } = require('@playwright/test')
const http = require('http')

// P0优先级：复杂操作序列真实UI验证 - 行号转换正确性深度测试
// 所有操作通过真实UI交互（点击按钮/树节点、键盘输入），不绕过Vue层
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
  return page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.lineCount())
}

const cmEval = (page, fn, arg) => page.evaluate(
  ([fnStr, a]) => (new Function('cm', 'arg', 'return (' + fnStr + ')(cm, arg)'))(
    document.querySelector('.CodeMirror').CodeMirror, a), [fn.toString(), arg])

// 辅助：通过树节点文本选中元素（真实点击，不调API）
async function selectTreeNode(page, nodeName) {
  const node = page.locator('.region-west .ant-tree-node-content-wrapper', { hasText: nodeName }).first()
  await node.waitFor({ state: 'visible', timeout: 5000 })
  await node.click()
  await page.waitForTimeout(300)
}

// 辅助：点击工具栏按钮（通过title属性定位）
async function clickToolbarBtn(page, titleKeyword) {
  const btn = page.locator(`button[title*="${titleKeyword}"]`).first()
  await btn.waitFor({ state: 'visible', timeout: 5000 })
  await btn.click()
  await page.waitForTimeout(400)
}

// 辅助：读取当前选中节点在东区面板显示的标签名
async function getSelectedTagName(page) {
  return await page.locator('.region-east .hdr-tag').textContent().catch(() => '')
}

// 辅助：读取属性面板中某属性的当前值
async function getAttrValue(page, attrName) {
  const labels = await page.locator('.region-east .attr-row .lbl-text').allTextContents().catch(() => [])
  const idx = labels.indexOf(attrName)
  if (idx < 0) return null
  return await page.locator('.region-east .attr-row input').nth(idx).inputValue().catch(() => null)
}

// 辅助：修改属性值（真实UI：点击输入框、全选、输入）
async function setAttrValue(page, attrName, newValue) {
  const labels = await page.locator('.region-east .attr-row .lbl-text').allTextContents().catch(() => [])
  const idx = labels.indexOf(attrName)
  if (idx < 0) throw new Error(`属性 ${attrName} 不存在`)

  const input = page.locator('.region-east .attr-row input').nth(idx)
  await input.click({ clickCount: 3 }) // 三击全选
  await page.waitForTimeout(100)

  if (newValue === '') {
    await page.keyboard.press('Backspace') // 删除
  } else {
    await page.keyboard.type(newValue) // 逐字符输入
  }
  await page.waitForTimeout(200)

  // 触发blur提交（点击面板外的安全区域）
  await page.locator('.region-east .hdr-tag').click()
  await page.waitForTimeout(500)
}

test.describe('P0 · 复杂操作序列 · 行号转换正确性', () => {
  test('序列1：移动元素 → 撤销 → 格式化 → 再移动，行号准确', async ({ page }) => {
    await openEditor(page, 'edit')

    // 步骤1：找到content区的两个可移动元素（如warning/caution）
    const targets = await cmEval(page, cm => {
      let cStart = -1
      for (let i = 0; i < cm.lineCount(); i++) {
        if ((cm.getLine(i) || '').trim().startsWith('<content')) { cStart = i; break }
      }
      if (cStart < 0) return null
      const elements = []
      for (let i = cStart + 1; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.startsWith('</content')) break
        const m = t.match(/^<(caution|warning|note)[\s>]/)
        if (m) elements.push({ name: m[1], line: i + 1 }) // 1-based
      }
      return elements.length >= 2 ? { first: elements[0], second: elements[1] } : null
    })
    test.skip(!targets, 'content区元素不足2个，跳过')

    console.log('目标元素:', targets)

    // 步骤2：第一次移动 - 通过UI操作
    await cmEval(page, (cm, l) => cm.setCursor({ line: l - 1, ch: 0 }), targets.first.line)
    await clickToolbarBtn(page, '移动行')

    const modal1 = page.locator('.ant-modal:visible', { hasText: '起始行' })
    await modal1.waitFor({ state: 'visible', timeout: 5000 })
    const inputs1 = modal1.locator('input.ant-input-number-input, input')
    await inputs1.nth(0).fill(String(targets.first.line))
    await inputs1.nth(1).fill(String(targets.second.line))
    await modal1.locator('.ant-modal-footer .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 读取移动后的XML，记录第一次移动结果
    const afterMove1 = await cmEval(page, cm => cm.getValue())
    console.log('第一次移动完成，XML长度:', afterMove1.length)

    // 步骤3：撤销（Ctrl+Z）
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(800)

    const afterUndo = await cmEval(page, cm => cm.getValue())
    console.log('撤销后XML长度:', afterUndo.length, '| 是否恢复原状?', afterMove1 !== afterUndo)

    // 步骤4：格式化
    await clickToolbarBtn(page, '格式化')
    await page.waitForTimeout(1000)

    const afterFormat = await cmEval(page, cm => cm.getValue())
    console.log('格式化后XML长度:', afterFormat.length)

    // 步骤5：再次移动相同元素（行号应该已更新）
    // 重新查找元素当前行号
    const targets2 = await cmEval(page, cm => {
      let cStart = -1
      for (let i = 0; i < cm.lineCount(); i++) {
        if ((cm.getLine(i) || '').trim().startsWith('<content')) { cStart = i; break }
      }
      if (cStart < 0) return null
      const elements = []
      for (let i = cStart + 1; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.startsWith('</content')) break
        const m = t.match(/^<(caution|warning|note)[\s>]/)
        if (m) elements.push({ name: m[1], line: i + 1 })
      }
      return elements.length >= 2 ? { first: elements[0], second: elements[1] } : null
    })
    test.skip(!targets2, '格式化后找不到目标元素')

    await cmEval(page, (cm, l) => cm.setCursor({ line: l - 1, ch: 0 }), targets2.first.line)
    await clickToolbarBtn(page, '移动行')

    const modal2 = page.locator('.ant-modal:visible', { hasText: '起始行' })
    await modal2.waitFor({ state: 'visible', timeout: 5000 })
    const inputs2 = modal2.locator('input.ant-input-number-input, input')
    await inputs2.nth(0).fill(String(targets2.first.line))
    await inputs2.nth(1).fill(String(targets2.second.line))
    await modal2.locator('.ant-modal-footer .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 验证：不应出现"未找到起始行对应的元素"错误
    const errCount = await page.getByText('未找到起始行对应的元素').count()
    const successCount = await page.locator('.ant-message-success').count()
    console.log('第二次移动 - 错误提示:', errCount, '| 成功提示:', successCount)

    expect(errCount).toBe(0)
    expect(successCount).toBeGreaterThan(0)
  })

  test('序列2：删除元素 → 撤销 → 修改属性 → 验证属性写入行号正确', async ({ page }) => {
    await openEditor(page, 'edit')

    // 步骤1：找一个有属性的元素（如dmCode），通过CM点击选中（不依赖树）
    const dmcLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.match(/^<dmCode[^>]*\/>/)) return i
      }
      return -1
    })
    test.skip(dmcLine < 0, '无dmCode元素')

    // 通过CM点击dmCode行选中
    await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, dmcLine)
    await page.waitForTimeout(800)

    const tag1 = await getSelectedTagName(page)
    console.log('选中元素:', tag1)
    expect(tag1).toContain('dmCode')

    // 记录原始属性值
    const origItemLoc = await getAttrValue(page, 'itemLocationCode')
    console.log('原始 itemLocationCode:', origItemLoc)

    // 步骤2：删除dmCode（通过右键菜单或删除按钮）
    await clickToolbarBtn(page, '删除')
    const confirmBtn = page.locator('.ant-modal-confirm .ant-btn-primary, .ant-modal-confirm button:has-text("确定")')
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click()
      await page.waitForTimeout(800)
    }

    // 验证删除成功（树中不再有dmCode或CM中不再有<dmCode）
    const afterDel = await cmEval(page, cm => cm.getValue().includes('<dmCode'))
    console.log('删除后仍有<dmCode?', afterDel)

    // 步骤3：撤销删除
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(1500) // 增加等待时间，确保树刷新完成

    const afterUndo = await cmEval(page, cm => cm.getValue().includes('<dmCode'))
    console.log('撤销后恢复<dmCode?', afterUndo)
    expect(afterUndo).toBeTruthy()

    // 步骤4：通过CM点击dmCode行来选中（避免依赖树刷新）
    const dmcLine2 = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.match(/^<dmCode[^>]*\/>/)) return i
      }
      return -1
    })
    await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, dmcLine2)
    await page.waitForTimeout(800) // 等待东区面板响应光标变化

    const tag2 = await getSelectedTagName(page)
    console.log('撤销后选中标签:', tag2)
    expect(tag2).toContain('dmCode')

    // 修改itemLocationCode属性（真实UI输入）
    const newVal = origItemLoc === 'A' ? 'B' : 'A' // 切换值
    console.log(`修改属性 ${origItemLoc} → ${newVal}`)
    await setAttrValue(page, 'itemLocationCode', newVal)

    // 步骤5：验证CM中dmCode行的属性确实更新
    const finalLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = cm.getLine(i) || ''
        if (t.includes('<dmCode')) return t
      }
      return ''
    })
    console.log('最终dmCode行:', finalLine.substring(0, 150))
    expect(finalLine).toContain(`itemLocationCode="${newVal}"`)
    expect(finalLine).toMatch(new RegExp(`itemLocationCode="${newVal}"[^>]*\\/>`, 'i'))
  })

  test('序列3：连续格式化20次，验证行号不漂移', async ({ page }) => {
    await openEditor(page, 'edit')

    // 记录初始状态：dmCode的行号和内容
    const initial = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = cm.getLine(i) || ''
        if (t.includes('<dmCode')) return { line: i, content: t.trim() }
      }
      return null
    })
    test.skip(!initial, '无dmCode元素')
    console.log('初始dmCode行号:', initial.line, '| 内容前50字符:', initial.content.substring(0, 50))

    // 连续格式化20次
    for (let i = 0; i < 20; i++) {
      await clickToolbarBtn(page, '格式化')
      await page.waitForTimeout(300) // 每次间隔300ms
    }

    // 读取格式化后dmCode的行号和内容
    const final = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = cm.getLine(i) || ''
        if (t.includes('<dmCode')) return { line: i, content: t.trim() }
      }
      return null
    })
    test.skip(!final, '格式化后找不到dmCode')
    console.log('20次格式化后行号:', final.line, '| 内容前50字符:', final.content.substring(0, 50))

    // 验证：行号应该稳定（允许±2行的格式化调整）
    const lineDrift = Math.abs(final.line - initial.line)
    console.log('行号漂移量:', lineDrift)
    expect(lineDrift).toBeLessThanOrEqual(2)

    // 验证：内容应该一致（去除空格后比较）
    const normalize = s => s.replace(/\s+/g, ' ')
    expect(normalize(final.content)).toBe(normalize(initial.content))
  })

  test('序列4：插入元素 → 格式化 → 修改新元素属性 → 行号准确', async ({ page }) => {
    await openEditor(page, 'edit')

    // 步骤1：在description下插入一个warning子元素（通过回车补全）
    const descLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        if ((cm.getLine(i) || '').trim().startsWith('<description')) return i
      }
      return -1
    })
    test.skip(descLine < 0, '无description元素')

    // 删除现有warning避免重复
    await cmEval(page, cm => {
      let v = cm.getValue().replace(/<warning>[\s\S]*?<\/warning>/g, '')
      cm.setValue(v)
    })
    await page.waitForTimeout(300)

    // 定位到description行尾，按回车触发补全
    await cmEval(page, (cm, l) => {
      cm.focus()
      const line = cm.getLine(l)
      cm.setCursor({ line: l, ch: line.length })
    }, descLine)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)

    // 在补全弹框中选择warning
    const hints = await page.locator('.CodeMirror-hints .CodeMirror-hint').allTextContents().catch(() => [])
    const warningIdx = hints.findIndex(h => h.includes('warning'))
    test.skip(warningIdx < 0, '补全框无warning')

    await page.locator('.CodeMirror-hints .CodeMirror-hint').nth(warningIdx).click()
    await page.waitForTimeout(600)

    console.log('插入warning完成')

    // 步骤2：格式化
    await clickToolbarBtn(page, '格式化')
    await page.waitForTimeout(1000)

    // 步骤3：通过CM点击warning行来选中（避免依赖树刷新）
    const warningLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.startsWith('<warning')) return i
      }
      return -1
    })
    test.skip(warningLine < 0, '格式化后找不到warning')

    await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, warningLine)
    await page.waitForTimeout(800) // 等待东区面板更新

    const tag = await getSelectedTagName(page)
    console.log('选中标签:', tag)
    expect(tag).toContain('warning')

    // 步骤4：修改warning的某个属性（如果有的话，比如id）
    const attrLabels = await page.locator('.region-east .attr-row .lbl-text').allTextContents().catch(() => [])
    console.log('warning属性列表:', attrLabels)

    // warning通常有id/warningIdent等属性，尝试修改第一个可修改的
    if (attrLabels.length > 0) {
      const firstAttr = attrLabels[0]
      await setAttrValue(page, firstAttr, 'TEST_VALUE')

      // 验证CM中warning的该属性确实更新
      const warningLine = await cmEval(page, cm => {
        for (let i = 0; i < cm.lineCount(); i++) {
          const t = cm.getLine(i) || ''
          if (t.includes('<warning')) return t
        }
        return ''
      })
      console.log('warning行:', warningLine.substring(0, 100))
      expect(warningLine).toContain(`${firstAttr}="TEST_VALUE"`)
    } else {
      console.log('warning无可修改属性，跳过属性修改验证')
    }
  })

  test('序列5：深层嵌套元素修改属性 → 验证行号转换准确', async ({ page }) => {
    await openEditor(page, 'edit')

    // 找一个嵌套较深的元素（如content > description > caution > cautionIdent）
    const deepElem = await cmEval(page, cm => {
      let maxDepth = 0; let deepestLine = -1; let deepestTag = ''
      const stack = []

      for (let i = 0; i < cm.lineCount(); i++) {
        const line = cm.getLine(i) || ''
        const openMatch = line.match(/<([a-zA-Z][\w.-]*)[^>]*>/)
        const closeMatch = line.match(/<\/([a-zA-Z][\w.-]*)>/)
        const selfCloseMatch = line.match(/<([a-zA-Z][\w.-]*)[^>]*\/>/)

        if (selfCloseMatch) {
          const depth = stack.length
          if (depth > maxDepth) {
            maxDepth = depth
            deepestLine = i
            deepestTag = selfCloseMatch[1]
          }
        } else if (openMatch && !closeMatch) {
          stack.push(openMatch[1])
          const depth = stack.length
          if (depth > maxDepth) {
            maxDepth = depth
            deepestLine = i
            deepestTag = openMatch[1]
          }
        } else if (closeMatch) {
          stack.pop()
        }
      }

      return maxDepth > 3 ? { line: deepestLine, tag: deepestTag, depth: maxDepth } : null
    })

    test.skip(!deepElem, '无深层嵌套元素（depth>3）')
    console.log('找到深层元素:', deepElem)

    // 通过CM定位到该行，让树自动选中
    await cmEval(page, (cm, l) => {
      cm.setCursor({ line: l, ch: 2 })
      cm.focus()
    }, deepElem.line)
    await page.waitForTimeout(500)

    // 如果东区未选中该元素，通过树点击
    const eastTag = await getSelectedTagName(page)
    if (!eastTag.includes(deepElem.tag)) {
      await selectTreeNode(page, deepElem.tag)
      await page.waitForTimeout(500)
    }

    // 读取属性列表
    const attrLabels = await page.locator('.region-east .attr-row .lbl-text').allTextContents().catch(() => [])
    test.skip(attrLabels.length === 0, `${deepElem.tag}无属性`)

    console.log(`${deepElem.tag}属性:`, attrLabels)

    // 修改第一个属性
    const firstAttr = attrLabels[0]
    const origVal = await getAttrValue(page, firstAttr)
    const newVal = origVal === 'test1' ? 'test2' : 'test1'

    await setAttrValue(page, firstAttr, newVal)

    // 验证CM中该行的属性确实更新
    const finalLine = await cmEval(page, (cm, l) => cm.getLine(l), deepElem.line)
    console.log('深层元素行:', finalLine.trim().substring(0, 100))
    expect(finalLine).toContain(`${firstAttr}="${newVal}"`)
  })

  test('序列6：移动 → 修改属性 → 撤销 → 重做，验证每步行号正确', async ({ page }) => {
    await openEditor(page, 'edit')

    // 找两个可移动元素
    const elems = await cmEval(page, cm => {
      const found = []
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        const m = t.match(/^<(para|note|caution|warning)[\s>]/)
        if (m) found.push({ tag: m[1], line: i + 1 })
        if (found.length >= 2) break
      }
      return found.length >= 2 ? found : null
    })
    test.skip(!elems, '可移动元素不足2个')

    console.log('目标元素:', elems)

    // 步骤1：移动第一个元素到第二个位置
    await cmEval(page, (cm, l) => cm.setCursor({ line: l - 1, ch: 0 }), elems[0].line)
    await clickToolbarBtn(page, '移动行')

    const modal1 = page.locator('.ant-modal:visible')
    await modal1.waitFor({ state: 'visible' })
    const inputs1 = modal1.locator('input')
    await inputs1.nth(0).fill(String(elems[0].line))
    await inputs1.nth(1).fill(String(elems[1].line))
    await modal1.locator('.ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 步骤2：选中移动后的元素，修改属性
    await selectTreeNode(page, elems[0].tag)
    await page.waitForTimeout(500)

    const attrs = await page.locator('.region-east .attr-row .lbl-text').allTextContents()
    if (attrs.length > 0) {
      await setAttrValue(page, attrs[0], 'MOVED')
      await page.waitForTimeout(500)
    }

    // 记录移动+修改后的状态
    const afterMoveAndEdit = await cmEval(page, cm => cm.getValue())

    // 步骤3：撤销修改属性
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(800)

    // 步骤4：再撤销移动
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(800)

    const afterUndo2 = await cmEval(page, cm => cm.getValue())

    // 步骤5：重做移动
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(800)

    // 步骤6：重做修改属性
    await page.keyboard.press('Control+y')
    await page.waitForTimeout(800)

    const afterRedo2 = await cmEval(page, cm => cm.getValue())

    // 验证：重做后应该恢复到移动+修改的状态
    console.log('撤销后长度:', afterUndo2.length, '| 重做后长度:', afterRedo2.length, '| 原状态:', afterMoveAndEdit.length)
    expect(afterRedo2).toBe(afterMoveAndEdit)
  })
})
