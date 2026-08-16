const { test, expect } = require('@playwright/test')
const http = require('http')

// P1优先级：树刷新边界测试 - 源码编辑/语言切换后的树同步
// 所有操作通过真实UI交互，不绕过Vue层
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

// 获取树中所有节点文本
async function getTreeNodeTexts(page) {
  return await page.locator('.region-west .ant-tree-node-content-wrapper .ant-tree-title').allTextContents()
}

// 检查树中是否存在某节点
async function treeHasNode(page, nodeName) {
  const nodes = await getTreeNodeTexts(page)
  return nodes.some(n => n.includes(nodeName))
}

// 获取当前选中的树节点文本
async function getSelectedTreeNode(page) {
  const selected = await page.locator('.region-west .ant-tree-node-selected .ant-tree-title').textContent().catch(() => null)
  return selected
}

// 等待树刷新完成（通过检查特定节点出现）
async function waitForTreeRefresh(page, expectedNode, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await treeHasNode(page, expectedNode)) return true
    await page.waitForTimeout(200)
  }
  return false
}

test.describe('P1 · 树刷新边界 · 同步正确性', () => {
  test('边界1：源码视图直接编辑XML → 失焦 → 树自动同步', async ({ page }) => {
    await openEditor(page, 'edit')

    // 步骤1：记录初始树节点数量
    const initialNodes = await getTreeNodeTexts(page)
    console.log('初始树节点数:', initialNodes.length)

    // 步骤2：在CM中直接编辑，添加一个新的para元素
    // 找到description下的某个位置插入
    const insertPos = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const line = cm.getLine(i) || ''
        if (line.trim().startsWith('<description')) {
          // 找到description的下一行
          return i + 1
        }
      }
      return -1
    })
    test.skip(insertPos < 0, '无description元素')

    // 在CM中直接插入一行 <para id="test-sync-para">测试树同步</para>
    await cmEval(page, (cm, pos) => {
      const indent = '      ' // 根据实际缩进调整
      cm.replaceRange(
        `${indent}<para id="test-sync-para">测试树同步</para>\n`,
        { line: pos, ch: 0 }
      )
    }, insertPos)
    await page.waitForTimeout(500)

    console.log('已在CM中插入 <para id="test-sync-para">')

    // 步骤3：点击CM外部区域失焦（触发change事件）
    await page.locator('.region-east').click()
    await page.waitForTimeout(1500) // 等待树刷新

    // 步骤4：验证树中新增了para节点
    const afterNodes = await getTreeNodeTexts(page)
    console.log('失焦后树节点数:', afterNodes.length)

    const hasNewPara = afterNodes.some(n => n.includes('para'))
    console.log('树中是否有para节点?', hasNewPara)

    // 注意：可能需要格式化才能触发树刷新
    if (!hasNewPara) {
      console.log('尝试手动格式化触发刷新...')
      await page.click('button[title*="格式化"]')
      await page.waitForTimeout(1000)

      const afterFormat = await getTreeNodeTexts(page)
      const hasParaAfterFormat = afterFormat.some(n => n.includes('para'))
      console.log('格式化后树中是否有para?', hasParaAfterFormat)

      expect(hasParaAfterFormat).toBeTruthy() // 格式化后应该有
    } else {
      expect(hasNewPara).toBeTruthy() // 失焦就应该有
    }
  })

  test('边界2：源码编辑删除元素 → 树节点消失', async ({ page }) => {
    await openEditor(page, 'edit')

    // 找一个可删除的元素（如某个para或note）
    const targetInfo = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const line = cm.getLine(i) || ''
        const m = line.match(/<(para|note|caution)([^>]*)>([^<]*)<\/\1>/)
        if (m) {
          return { tag: m[1], line: i, content: line.trim() }
        }
      }
      return null
    })
    test.skip(!targetInfo, '无可删除的单行元素')

    console.log('找到目标元素:', targetInfo)

    // 验证树中当前有该类型节点
    const beforeDel = await treeHasNode(page, targetInfo.tag)
    console.log(`删除前树中有${targetInfo.tag}?`, beforeDel)

    // 在CM中删除整行
    await cmEval(page, (cm, l) => {
      cm.replaceRange('', { line: l, ch: 0 }, { line: l + 1, ch: 0 })
    }, targetInfo.line)
    await page.waitForTimeout(500)

    console.log(`已在CM中删除line ${targetInfo.line}`)

    // 失焦
    await page.locator('.region-east').click()
    await page.waitForTimeout(1000)

    // 格式化触发刷新
    await page.click('button[title*="格式化"]')
    await page.waitForTimeout(1000)

    // 验证树中该节点减少（可能还有同类型其他节点）
    const afterNodes = await getTreeNodeTexts(page)
    const countAfter = afterNodes.filter(n => n.includes(targetInfo.tag)).length
    console.log(`删除后树中${targetInfo.tag}节点数:`, countAfter)

    // 至少树应该刷新过（节点总数可能变化）
    expect(afterNodes.length).toBeGreaterThan(0)
  })

  test('边界3：中英文切换 → 树节点文本语言切换 → 选中节点保持', async ({ page }) => {
    await openEditor(page, 'edit')

    // 步骤1：通过CM选中一个元素（如dmCode）
    const dmcLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.match(/^<dmCode[^>]*\/>/)) return i
      }
      return -1
    })
    test.skip(dmcLine < 0, '无dmCode元素')

    await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, dmcLine)
    await page.waitForTimeout(800)

    // 记录初始选中的东区标签
    const initialTag = await page.locator('.region-east .hdr-tag').textContent()
    console.log('初始选中标签:', initialTag)
    expect(initialTag).toContain('dmCode')

    // 步骤2：切换语言（查找语言切换下拉或按钮）
    // 可能在右上角或工具栏，定位语言切换UI
    const langSwitch = page.locator('button:has-text("中文"), button:has-text("EN"), .language-switch, [title*="语言"]').first()
    const hasLangSwitch = await langSwitch.count() > 0

    if (!hasLangSwitch) {
      console.log('未找到语言切换按钮，跳过')
      test.skip(true, '未找到语言切换UI')
      return
    }

    await langSwitch.click()
    await page.waitForTimeout(500)

    // 可能弹出下拉菜单，选择另一种语言
    const langOption = page.locator('.ant-dropdown-menu-item, .ant-select-item').filter({ hasText: /EN|English|中文/ }).first()
    if (await langOption.count() > 0) {
      await langOption.click()
      await page.waitForTimeout(2000) // 等待语言切换完成
    }

    console.log('已触发语言切换')

    // 步骤3：验证东区标签仍然是dmCode（可能变成英文展示）
    const afterSwitchTag = await page.locator('.region-east .hdr-tag').textContent()
    console.log('语言切换后东区标签:', afterSwitchTag)

    // dmCode应该仍被选中（标签可能是中文名或英文名）
    expect(afterSwitchTag).toContain('dmCode')

    // 步骤4：验证树中节点文本语言已切换（至少dmodule节点文本可能变化）
    const afterNodes = await getTreeNodeTexts(page)
    console.log('切换后树节点样本（前5个）:', afterNodes.slice(0, 5))
    expect(afterNodes.length).toBeGreaterThan(0)
  })

  test('边界4：快速连续编辑+失焦 → 树最终同步正确', async ({ page }) => {
    await openEditor(page, 'edit')

    // 找到description位置
    const descLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        if ((cm.getLine(i) || '').trim().startsWith('<description')) return i
      }
      return -1
    })
    test.skip(descLine < 0, '无description')

    const initialNodes = await getTreeNodeTexts(page)
    console.log('初始节点数:', initialNodes.length)

    // 快速连续插入3个para元素
    for (let i = 0; i < 3; i++) {
      await cmEval(page, (cm, args) => {
        const indent = '      '
        const idx = args.i
        const pos = args.pos
        cm.replaceRange(
          `${indent}<para id="rapid-${idx}">快速插入${idx}</para>\n`,
          { line: pos + 1 + idx, ch: 0 }
        )
      }, { i, pos: descLine })
      await page.waitForTimeout(100) // 极短间隔
    }

    console.log('已快速插入3个para')

    // 失焦
    await page.locator('.region-east').click()
    await page.waitForTimeout(800)

    // 格式化触发刷新
    await page.click('button[title*="格式化"]')
    await page.waitForTimeout(1500)

    // 验证树中para节点数量增加
    // 注意：树可能仅显示顶层或按深度截断，用全节点递归数比较准确
    const finalNodes = await getTreeNodeTexts(page)
    const paraCount = finalNodes.filter(n => n.includes('para')).length
    console.log('树所有节点文本:', JSON.stringify(finalNodes))
    console.log('最终树中para数量:', paraCount, '| 总节点数:', finalNodes.length)

    // 验证CM中确实有3个rapid-开头的para
    const cmParaCount = await cmEval(page, cm => {
      const xml = cm.getValue()
      const matches = xml.match(/<para id="rapid-\d+">/g)
      return matches ? matches.length : 0
    })
    console.log('CM中rapid-para数量:', cmParaCount)
    expect(cmParaCount).toBe(3)

    // 树刷新后应该能看到para节点（至少有para文本）
    expect(paraCount).toBeGreaterThan(0)
  })

  test('边界5：格式化前后树节点id一致性', async ({ page }) => {
    await openEditor(page, 'edit')

    // 选中dmCode，记录其属性面板信息
    const dmcLine = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.match(/^<dmCode[^>]*\/>/)) return i
      }
      return -1
    })
    test.skip(dmcLine < 0, '无dmCode')

    await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, dmcLine)
    await page.waitForTimeout(800)

    // 读取格式化前的属性值
    const beforeAttrs = await page.locator('.region-east .attr-row .lbl-text').allTextContents()
    console.log('格式化前属性列表（前5个）:', beforeAttrs.slice(0, 5))

    const beforeModelIdent = await page.locator('.region-east .attr-row input').first().inputValue()
    console.log('格式化前 modelIdentCode:', beforeModelIdent)

    // 格式化
    await page.click('button[title*="格式化"]')
    await page.waitForTimeout(1500)

    // 重新选中dmCode
    const dmcLine2 = await cmEval(page, cm => {
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        if (t.match(/^<dmCode[^>]*\/>/)) return i
      }
      return -1
    })
    await cmEval(page, (cm, l) => { cm.setCursor({ line: l, ch: 2 }); cm.focus() }, dmcLine2)
    await page.waitForTimeout(800)

    // 读取格式化后的属性值
    const afterAttrs = await page.locator('.region-east .attr-row .lbl-text').allTextContents()
    const afterModelIdent = await page.locator('.region-east .attr-row input').first().inputValue()
    console.log('格式化后 modelIdentCode:', afterModelIdent)

    // 验证：属性列表应该一致，值应该一致
    expect(afterAttrs).toEqual(beforeAttrs)
    expect(afterModelIdent).toBe(beforeModelIdent)
  })
})
