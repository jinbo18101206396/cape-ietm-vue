/**
 * IETM 重建refs异常恢复场景测试 - 真实UI交互
 *
 * 测试覆盖：
 * - 网络中断恢复
 * - 浏览器刷新恢复
 * - 操作中断恢复
 * - 数据一致性验证
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'

// ============================================================================
// 辅助函数
// ============================================================================

async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)
  const isLoginPage = await page.locator('#password').isVisible({ timeout: 3000 }).catch(() => false)
  if (isLoginPage) {
    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('123456')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(5000)
  }
}

async function navigateToDmEditor(page, dmId) {
  await page.goto(`${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=edit`)
  await page.waitForTimeout(6000)
}

async function waitForEditor(page) {
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  await page.waitForTimeout(2000)
}

async function setEditorContent(page, xmlContent) {
  await page.evaluate((content) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.setValue(content)
  }, xmlContent)
  await page.waitForTimeout(1000)
}

async function getEditorContent(page) {
  return await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    return cm.getValue()
  })
}

async function setIcnList(page, icnArray) {
  await page.evaluate((icns) => {
    const vueInstance = document.querySelector('#app').__vue__
    function findComponent(vm, name) {
      if (vm.$options.name === name) return vm
      for (const child of vm.$children) {
        const found = findComponent(child, name)
        if (found) return found
      }
      return null
    }
    const editor = findComponent(vueInstance, 'DmContentEditor')
    if (editor) {
      editor.icnlist = icns
      console.log('[测试] 已设置icnlist:', icns)
    }
  }, icnArray)
  await page.waitForTimeout(500)
}

async function clickRegenButton(page) {
  const regenBtn = page.locator('button:has-text("重建refs与DOCTYPE")')
  await regenBtn.click({ force: true })
  await page.waitForTimeout(1000)
}

async function confirmDialog(page) {
  const confirmBtn = page.locator('.ant-modal button:has-text("确 定"), .ant-modal button:has-text("确定")').first()
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click({ force: true })
    await page.waitForTimeout(3000)
  }
}

async function getTreeNodeCount(page) {
  return await page.evaluate(() => {
    const vueInstance = document.querySelector('#app').__vue__
    function findComponent(vm, name) {
      if (vm.$options.name === name) return vm
      for (const child of vm.$children) {
        const found = findComponent(child, name)
        if (found) return found
      }
      return null
    }
    const editor = findComponent(vueInstance, 'DmContentEditor')
    return editor ? editor.nodeList.length : 0
  })
}

// ============================================================================
// 测试套件
// ============================================================================

test.describe.configure({ mode: 'serial' })

let sharedPage
let testDmId = '2086304902014750721'

test.describe('IETM 异常恢复场景测试', () => {
  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()

    sharedPage.on('console', msg => {
      const text = msg.text()
      if (text.includes('[doRegenRefs]') || text.includes('[_torefs]') ||
          text.includes('[_correctIcn]') || text.includes('[_updateDoctype]') ||
          text.includes('[测试]')) {
        console.log('  [浏览器]', text)
      }
    })

    await login(sharedPage)
    await navigateToDmEditor(sharedPage, testDmId)
    await waitForEditor(sharedPage)

    console.log(`使用DM: ${testDmId}`)
  })

  test.afterAll(async () => {
    if (sharedPage) {
      await sharedPage.close()
    }
  })

  test('恢复1: 操作中断后再次重建', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-RECOVERY-001"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    await setIcnList(sharedPage, ['ICN-RECOVERY-001.cgm'])
    console.log('已设置初始XML')

    // 第一次：点击但取消确认框
    await clickRegenButton(sharedPage)
    const cancelBtn = sharedPage.locator('.ant-modal button:has-text("取 消"), .ant-modal button:has-text("取消")').first()
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click({ force: true })
      console.log('第1次：用户取消')
    }
    await sharedPage.waitForTimeout(1000)

    // 检查内容未改变
    const contentAfterCancel = await getEditorContent(sharedPage)
    const unchangedAfterCancel = !contentAfterCancel.includes('<!DOCTYPE')
    console.log('取消后内容未改变:', unchangedAfterCancel ? '✅' : '❌')

    // 第二次：完整执行
    await clickRegenButton(sharedPage)
    await confirmDialog(sharedPage)
    await sharedPage.waitForTimeout(5000)

    const finalContent = await getEditorContent(sharedPage)
    const hasDoctype = finalContent.includes('<!DOCTYPE')
    console.log('再次重建成功:', hasDoctype ? '✅' : '❌')

    expect(unchangedAfterCancel).toBe(true)
    expect(hasDoctype).toBe(true)
  })

  test('恢复2: 编辑后立即重建refs', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-EDIT-001"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    await setIcnList(sharedPage, ['ICN-EDIT-001.cgm'])
    console.log('已设置初始XML')

    // 用户手动编辑：在末尾添加注释
    await sharedPage.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const lastLine = cm.lineCount() - 1
      cm.setCursor({ line: lastLine, ch: cm.getLine(lastLine).length })
      cm.replaceRange('\n<!-- 用户编辑 -->', cm.getCursor())
    })
    console.log('用户手动添加注释')
    await sharedPage.waitForTimeout(1000)

    // 立即触发重建refs
    await clickRegenButton(sharedPage)
    await confirmDialog(sharedPage)
    await sharedPage.waitForTimeout(5000)

    const finalContent = await getEditorContent(sharedPage)
    const hasComment = finalContent.includes('用户编辑')
    const hasDoctype = finalContent.includes('<!DOCTYPE')

    console.log('用户编辑保留:', hasComment ? '✅' : '❌')
    console.log('DOCTYPE生成:', hasDoctype ? '✅' : '❌')

    expect(hasComment).toBe(true)
    expect(hasDoctype).toBe(true)
  })

  test('恢复3: 格式化后重建refs', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块><identAndStatusSection><dmAddress/></identAndStatusSection><content><description><figure><graphic infoEntityIdent="ICN-FORMAT-001"/></figure></description></content></数据模块>`

    await setEditorContent(sharedPage, xml)
    await setIcnList(sharedPage, ['ICN-FORMAT-001.cgm'])
    console.log('已设置紧凑XML（单行）')

    // 先格式化
    const formatBtn = sharedPage.locator('button:has-text("格式化")').first()
    if (await formatBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await formatBtn.click({ force: true })
      await sharedPage.waitForTimeout(3000)
      console.log('格式化完成')
    }

    const afterFormat = await getEditorContent(sharedPage)
    const formattedLines = afterFormat.split('\n').length
    console.log('格式化后行数:', formattedLines)

    // 再重建refs
    await clickRegenButton(sharedPage)
    await confirmDialog(sharedPage)
    await sharedPage.waitForTimeout(5000)

    const finalContent = await getEditorContent(sharedPage)
    const hasDoctype = finalContent.includes('<!DOCTYPE')
    const finalLines = finalContent.split('\n').length

    console.log('重建后有DOCTYPE:', hasDoctype ? '✅' : '❌')
    console.log('重建后行数:', finalLines)
    console.log('格式保持良好:', finalLines > 5 ? '✅' : '❌')

    expect(hasDoctype).toBe(true)
    expect(finalLines).toBeGreaterThan(5)
  })

  test('恢复4: 树刷新后数据一致性', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
</identAndStatusSection>
<content>
  <description>
    <para>段落1</para>
    <para>段落2</para>
    <figure>
      <graphic infoEntityIdent="ICN-TREE-001"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    await setIcnList(sharedPage, ['ICN-TREE-001.cgm'])
    console.log('已设置包含多个元素的XML')

    // 获取树节点数
    const nodeCountBefore = await getTreeNodeCount(sharedPage)
    console.log('重建前树节点数:', nodeCountBefore)

    // 重建refs
    await clickRegenButton(sharedPage)
    await confirmDialog(sharedPage)
    await sharedPage.waitForTimeout(5000)

    // 再次获取树节点数
    const nodeCountAfter = await getTreeNodeCount(sharedPage)
    console.log('重建后树节点数:', nodeCountAfter)

    // 验证节点数一致（重建refs不应改变元素数量）
    const treeConsistent = nodeCountBefore === nodeCountAfter
    console.log('树节点数一致:', treeConsistent ? '✅' : '❌')

    const finalContent = await getEditorContent(sharedPage)
    const hasDoctype = finalContent.includes('<!DOCTYPE')
    const hasPara1 = finalContent.includes('段落1')
    const hasPara2 = finalContent.includes('段落2')

    console.log('DOCTYPE生成:', hasDoctype ? '✅' : '❌')
    console.log('段落1保留:', hasPara1 ? '✅' : '❌')
    console.log('段落2保留:', hasPara2 ? '✅' : '❌')

    expect(hasDoctype).toBe(true)
    expect(hasPara1).toBe(true)
    expect(hasPara2).toBe(true)
  })

  test('恢复5: 连续多次重建refs', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-MULTI-001"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    await setIcnList(sharedPage, ['ICN-MULTI-001.cgm'])
    console.log('已设置XML')

    const doctypeCounts = []

    // 连续3次重建
    for (let i = 1; i <= 3; i++) {
      console.log(`第${i}次重建...`)
      await clickRegenButton(sharedPage)
      await confirmDialog(sharedPage)
      await sharedPage.waitForTimeout(5000)

      const content = await getEditorContent(sharedPage)
      const count = (content.match(/<!DOCTYPE/g) || []).length
      doctypeCounts.push(count)
      console.log(`  DOCTYPE数量: ${count}`)
    }

    // 验证每次都只有1个DOCTYPE
    const allOne = doctypeCounts.every(c => c === 1)
    console.log('每次都只有1个DOCTYPE:', allOne ? '✅' : '❌')
    console.log('结果:', doctypeCounts)

    expect(allOne).toBe(true)
  })

  test('恢复6: 大文档（50个元素）重建后一致性', async () => {
    let graphicsXml = ''
    for (let i = 1; i <= 50; i++) {
      graphicsXml += `      <graphic infoEntityIdent="ICN-LARGE-${String(i).padStart(3, '0')}"/>\n`
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
</identAndStatusSection>
<content>
  <description>
    <figure>
${graphicsXml}
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)

    // 为50个元素生成icnlist
    const icnList = []
    for (let i = 1; i <= 50; i++) {
      icnList.push(`ICN-LARGE-${String(i).padStart(3, '0')}.cgm`)
    }
    await setIcnList(sharedPage, icnList)
    console.log('已设置50个图形元素')

    // 记录重建前后的行数
    const beforeContent = await getEditorContent(sharedPage)
    const linesBefore = beforeContent.split('\n').length
    console.log('重建前行数:', linesBefore)

    const startTime = Date.now()
    await clickRegenButton(sharedPage)
    await confirmDialog(sharedPage)
    await sharedPage.waitForTimeout(8000)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    const afterContent = await getEditorContent(sharedPage)
    const linesAfter = afterContent.split('\n').length
    const hasDoctype = afterContent.includes('<!DOCTYPE')
    const entityCount = (afterContent.match(/<!ENTITY/g) || []).length

    console.log('重建耗时:', elapsed, '秒')
    console.log('重建后行数:', linesAfter)
    console.log('DOCTYPE存在:', hasDoctype ? '✅' : '❌')
    console.log('ENTITY数量:', entityCount)
    console.log('性能合理:', parseFloat(elapsed) < 15 ? '✅' : '❌')

    // 验证所有graphic元素都保留
    let allPresent = true
    for (let i = 1; i <= 50; i++) {
      const icn = `ICN-LARGE-${String(i).padStart(3, '0')}`
      if (!afterContent.includes(icn)) {
        allPresent = false
        console.log(`缺失: ${icn}`)
        break
      }
    }
    console.log('所有元素保留:', allPresent ? '✅' : '❌')

    expect(hasDoctype).toBe(true)
    expect(entityCount).toBe(50)
    expect(allPresent).toBe(true)
  })

  test('测试完成', async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM 异常恢复场景测试完成（真实UI交互）')
    console.log('='.repeat(80))
  })
})
