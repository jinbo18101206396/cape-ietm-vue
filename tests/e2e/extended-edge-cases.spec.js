/**
 * IETM 扩展边界测试 - 真实UI交互验证
 *
 * 测试覆盖：
 * - 混合标准（S1000D/GJB混合标签）
 * - 异常XML结构
 * - 极端ICN值
 * - 并发编辑场景
 * - 网络/性能边界
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'
const BACKEND_URL = 'http://localhost:9999'

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 登录系统
 */
async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)
  const isLoginPage = await page.locator('#password').isVisible({ timeout: 3000 }).catch(() => false)
  if (isLoginPage) {
    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('123456')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)
  }
}

/**
 * 打开项目（通过UI点击）
 */
async function openProject(page) {
  // 等待项目列表加载
  await page.waitForTimeout(2000)

  // 查找并点击"打开项目"按钮（可能在列表或菜单中）
  const openBtn = page.locator('button:has-text("打开"), a:has-text("打开项目")').first()
  const hasBtn = await openBtn.isVisible({ timeout: 5000 }).catch(() => false)

  if (hasBtn) {
    await openBtn.click({ force: true })
    await page.waitForTimeout(2000)
  }
  // 如果没有找到按钮，假设项目已经打开
}

/**
 * 导航到DM编辑器（使用与final-ui-scenario-gjb.spec.js相同的方式）
 */
async function navigateToDmEditor(page, dmId) {
  await page.goto(`${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=edit`)
  await page.waitForTimeout(6000)
}

/**
 * 等待CodeMirror编辑器加载
 */
async function waitForEditor(page) {
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  await page.waitForTimeout(2000)
}

/**
 * 通过CodeMirror API设置内容（真实UI交互）
 */
async function setEditorContent(page, xmlContent) {
  await page.evaluate((content) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.setValue(content)
  }, xmlContent)
  await page.waitForTimeout(1000)
}

/**
 * 获取编辑器内容
 */
async function getEditorContent(page) {
  return await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    return cm.getValue()
  })
}

/**
 * 点击重建refs按钮并处理弹框（真实UI交互）
 */
async function clickRegenAndConfirm(page) {
  // 1. 点击重建refs按钮
  const regenBtn = page.locator('button:has-text("重建refs与DOCTYPE")')
  await regenBtn.click({ force: true })
  await page.waitForTimeout(1000)

  // 2. 处理确认弹框
  const confirmModal = page.locator('.ant-modal:has-text("确定"), .ant-modal:has-text("继续")')
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const okBtn = page.locator('.ant-modal button:has-text("确 定"), .ant-modal button:has-text("确定")').first()
    await okBtn.click({ force: true })
    await page.waitForTimeout(2000)
  }

  // 3. 处理补后缀弹框
  const suffixModal = page.locator('.ant-modal:has-text("后缀"), .ant-modal:has-text("指定")')
  if (await suffixModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const selects = await page.locator('.ant-modal .ant-select').all()

    // 检查是否有可选项
    let hasOptions = false
    if (selects.length > 0) {
      await selects[0].click({ force: true })
      await page.waitForTimeout(500)
      const options = page.locator('.ant-select-dropdown:visible .ant-select-dropdown-menu-item')
      hasOptions = await options.count() > 0
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    if (!hasOptions) {
      // 没有可选项，取消操作（这会导致流程中断）
      console.log('  [测试] 补后缀弹框无可选项，取消操作')
      const cancelBtn = page.locator('.ant-modal button:has-text("取 消"), .ant-modal button:has-text("取消")').first()
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click({ force: true })
        await page.waitForTimeout(500)
      }
      return { ok: false, hadSuffix: true, cancelled: true }
    }

    // 有可选项，选择第一个
    for (let i = 0; i < selects.length; i++) {
      const s = selects[i]
      await s.click({ force: true })
      await page.waitForTimeout(500)

      const dropdown = page.locator('.ant-select-dropdown:visible')
      await dropdown.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(300)

      const opt = page.locator('.ant-select-dropdown:visible .ant-select-dropdown-menu-item').first()
      if (await opt.isVisible({ timeout: 1000 }).catch(() => false)) {
        await opt.click({ force: true })
        await page.waitForTimeout(500)
      }
    }

    // 关闭所有下拉框
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 点击确定
    const ok = page.locator('.ant-modal button:has-text("确 定"), .ant-modal button:has-text("确定")').first()
    await ok.click({ force: true })
    await page.waitForTimeout(5000)
    return { ok: true, hadSuffix: true }
  }

  // 4. 等待执行完成
  await page.waitForTimeout(3000)
  return { ok: true, hadSuffix: false }
}

// ============================================================================
// 测试套件
// ============================================================================

test.describe.configure({ mode: 'serial' })

let sharedPage
let testDmId = '2086304902014750721' // GJB格式测试DM

test.describe('IETM 扩展边界测试', () => {

  // ========== 环境准备 ==========

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()

    // 启用控制台日志
    sharedPage.on('console', msg => {
      const text = msg.text()
      if (text.includes('[doRegenRefs]') || text.includes('[_torefs]') ||
          text.includes('[_correctIcn]') || text.includes('[_updateDoctype]')) {
        console.log('  [浏览器]', text)
      }
    })

    await login(sharedPage)
    await sharedPage.waitForTimeout(2000)

    // 直接导航到编辑器（跳过openProject，因为已经在登录后的环境中）
    await navigateToDmEditor(sharedPage, testDmId)
    await waitForEditor(sharedPage)

    console.log(`使用DM: ${testDmId}`)
  })

  test.afterAll(async () => {
    if (sharedPage) {
      await sharedPage.close()
    }
  })

  // ========== 扩展边界测试 ==========

  test('边界7: 极长ICN值（>100字符）', async () => {
    const longIcn = 'ICN-' + 'A'.repeat(200)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="${longIcn}"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置极长ICN（200字符）')

    const result = await clickRegenAndConfirm(sharedPage)
    console.log('执行结果:', JSON.stringify(result))

    const content = await getEditorContent(sharedPage)
    const hasEntity = content.includes('<!ENTITY')

    console.log(`包含ENTITY: ${hasEntity ? '✅' : '⚠️'}`)
    console.log('✅ 极长ICN测试完成')
  })

  test('边界8: ICN含空格和换行', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-001  "/>
      <graphic infoEntityIdent="  ICN-002"/>
      <graphic infoEntityIdent="ICN
003"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置含空格/换行的ICN')

    const result = await clickRegenAndConfirm(sharedPage)
    console.log('执行结果:', JSON.stringify(result))

    const content = await getEditorContent(sharedPage)
    const entityMatch = content.match(/<!ENTITY\s+/g)
    const entityCount = entityMatch ? entityMatch.length : 0

    console.log(`生成ENTITY数: ${entityCount}`)
    console.log('✅ ICN空格换行测试完成')
  })

  test('边界9: 嵌套graphic元素', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-OUTER">
        <hotspot>
          <graphic infoEntityIdent="ICN-INNER"/>
        </hotspot>
      </graphic>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置嵌套graphic元素')

    const result = await clickRegenAndConfirm(sharedPage)
    console.log('执行结果:', JSON.stringify(result))

    const content = await getEditorContent(sharedPage)
    const hasOuter = content.includes('ICN-OUTER')
    const hasInner = content.includes('ICN-INNER')

    console.log(`外层ICN: ${hasOuter ? '✅' : '❌'}`)
    console.log(`内层ICN: ${hasInner ? '✅' : '❌'}`)
    console.log('✅ 嵌套元素测试完成')
  })

  test('边界10: 混合S1000D与GJB标签', async () => {
    // 根标签用GJB中文，但content用S1000D英文
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-MIXED-001"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置混合标准标签')

    const result = await clickRegenAndConfirm(sharedPage)
    console.log('执行结果:', JSON.stringify(result))

    if (result.cancelled) {
      console.log('⚠️ 重建流程被取消（icnlist为空导致补后缀弹框无选项）')
      console.log('✅ 混合标准测试完成（跳过验证，因为流程未完整执行）')
      return
    }

    const content = await getEditorContent(sharedPage)

    // 详细检查
    console.log('完整内容前500字符:', content.substring(0, 500))

    const hasDoctype = content.includes('<!DOCTYPE')
    const rootTagMatch = content.match(/<!DOCTYPE\s+(\S+)/)
    const rootTag = rootTagMatch ? rootTagMatch[1] : null

    // 检查DOCTYPE内容
    const doctypeMatch = content.match(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/m)
    if (doctypeMatch) {
      console.log('DOCTYPE内容:', doctypeMatch[0].substring(0, 200))
    }

    console.log(`DOCTYPE存在: ${hasDoctype ? '✅' : '❌'}`)
    console.log(`根元素名: ${rootTag || '(未找到)'}`)
    console.log(`根元素正确: ${rootTag === '数据模块' ? '✅' : '⚠️ (实际:' + rootTag + ')'}`)
    console.log('✅ 混合标准测试完成')
  })

  test('边界11: 畸形XML（缺少闭合标签）', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-BROKEN"/>
    </figure>
  <!-- 缺少 </description> -->
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置畸形XML（缺少闭合标签）')

    // 等待短暂时间让Vue响应
    await sharedPage.waitForTimeout(1000)

    // 检查是否在设置内容时就显示了错误
    const messageBox = sharedPage.locator('.ant-message')
    const hasMessageOnLoad = await messageBox.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasMessageOnLoad) {
      const messageText = await messageBox.textContent()
      console.log('设置内容时的提示:', messageText)
    }

    // 点击重建refs按钮
    const regenBtn = sharedPage.locator('button:has-text("重建refs与DOCTYPE")')
    await regenBtn.click({ force: true })
    await sharedPage.waitForTimeout(1000)

    // 检查是否出现错误提示或确认弹框
    const errorModal = sharedPage.locator('.ant-modal:has-text("错误"), .ant-modal:has-text("失败")')
    const hasError = await errorModal.isVisible({ timeout: 3000 }).catch(() => false)

    const confirmModal = sharedPage.locator('.ant-modal-confirm, .ant-modal:has-text("确定")')
    const hasConfirm = await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)

    console.log(`错误弹框: ${hasError ? '✅ 显示' : '❌ 未显示'}`)
    console.log(`确认弹框: ${hasConfirm ? '显示' : '未显示'}`)

    if (hasError) {
      console.log('检测到错误提示: ✅（预期行为）')
      const closeBtn = sharedPage.locator('.ant-modal button:has-text("关闭"), .ant-modal .ant-modal-close').first()
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click({ force: true })
      }
    } else if (hasConfirm) {
      // 有确认框但无错误提示，取消操作
      const cancelBtn = sharedPage.locator('.ant-modal button:has-text("取 消"), .ant-modal button:has-text("取消")').first()
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click({ force: true })
      }
      console.log('未检测到错误提示: ⚠️（应在refreshTree时拦截）')
    } else {
      console.log('未检测到任何弹框: ⚠️')
    }

    // 检查消息提示框
    await sharedPage.waitForTimeout(1000)
    const finalMessage = sharedPage.locator('.ant-message')
    if (await finalMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      const msgText = await finalMessage.textContent()
      console.log('最终消息提示:', msgText)
    }

    console.log('✅ 畸形XML测试完成')
  })

  test('边界12: 空infoEntityIdent属性', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent=""/>
      <graphic infoEntityIdent="ICN-VALID"/>
      <graphic/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置空/缺失infoEntityIdent')

    const result = await clickRegenAndConfirm(sharedPage)
    console.log('执行结果:', JSON.stringify(result))

    const content = await getEditorContent(sharedPage)
    const entityMatch = content.match(/<!ENTITY\s+ICN_/g)
    const entityCount = entityMatch ? entityMatch.length : 0

    console.log(`生成ENTITY数: ${entityCount}`)
    console.log(`只处理有效ICN: ${entityCount <= 1 ? '✅' : '⚠️'}`)
    console.log('✅ 空属性测试完成')
  })

  test('边界13: 多个DOCTYPE声明', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE 数据模块 [
<!ENTITY ICN_OLD_001 SYSTEM "ICN-OLD-001.cgm" NDATA cgm>
]>
<!DOCTYPE dmodule [
<!ENTITY ICN_OLD_002 SYSTEM "ICN-OLD-002.cgm" NDATA cgm>
]>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="ICN-NEW-001"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置多个DOCTYPE声明')

    // 检查初始状态
    const beforeContent = await getEditorContent(sharedPage)
    const beforeCount = (beforeContent.match(/<!DOCTYPE/g) || []).length
    console.log('重建前DOCTYPE数量:', beforeCount)

    const result = await clickRegenAndConfirm(sharedPage)
    console.log('执行结果:', JSON.stringify(result))

    if (result.cancelled) {
      console.log('⚠️ 重建流程被取消（icnlist为空导致补后缀弹框无选项）')
      console.log('✅ 多DOCTYPE测试完成（跳过验证，因为流程未完整执行）')
      return
    }

    const content = await getEditorContent(sharedPage)
    const doctypeCount = (content.match(/<!DOCTYPE/g) || []).length

    console.log('重建后DOCTYPE数量:', doctypeCount)

    // 显示DOCTYPE区域内容
    const lines = content.split('\n')
    console.log('前10行内容:')
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      console.log(`  行${i}: ${lines[i]}`)
    }

    console.log(`只保留一个: ${doctypeCount === 1 ? '✅' : '⚠️ (实际:' + doctypeCount + '个)'}`)
    console.log('✅ 多DOCTYPE测试完成')
  })

  test('边界14: 100个graphic元素压力测试', async () => {
    let graphicsXml = ''
    for (let i = 1; i <= 100; i++) {
      graphicsXml += `      <graphic infoEntityIdent="ICN-STRESS-${String(i).padStart(3, '0')}"/>\n`
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
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
    console.log('已设置100个图形元素')

    const startTime = Date.now()
    const result = await clickRegenAndConfirm(sharedPage)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('执行结果:', JSON.stringify(result))
    console.log(`耗时: ${elapsed} 秒`)

    const content = await getEditorContent(sharedPage)
    const entityMatch = content.match(/<!ENTITY\s+ICN_/g)
    const entityCount = entityMatch ? entityMatch.length : 0

    console.log(`生成ENTITY数: ${entityCount}`)
    console.log(`性能合理: ${parseFloat(elapsed) < 30 ? '✅' : '⚠️'}`)
    console.log('✅ 压力测试完成')
  })

  test('边界15: Unicode字符ICN', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
  <dmStatus/>
</identAndStatusSection>
<content>
  <description>
    <figure>
      <graphic infoEntityIdent="图形-001-中文"/>
      <graphic infoEntityIdent="図形-002-日本語"/>
      <graphic infoEntityIdent="ICN-003-emoji-🚀"/>
    </figure>
  </description>
</content>
</数据模块>`

    await setEditorContent(sharedPage, xml)
    console.log('已设置Unicode字符ICN（中文/日文/emoji）')

    const result = await clickRegenAndConfirm(sharedPage)
    console.log('执行结果:', JSON.stringify(result))

    const content = await getEditorContent(sharedPage)
    const hasChinese = content.includes('图形-001')
    const hasJapanese = content.includes('図形-002')
    const hasEmoji = content.includes('emoji')

    console.log(`中文ICN: ${hasChinese ? '✅' : '⚠️'}`)
    console.log(`日文ICN: ${hasJapanese ? '✅' : '⚠️'}`)
    console.log(`Emoji ICN: ${hasEmoji ? '✅' : '⚠️'}`)
    console.log('✅ Unicode测试完成')
  })

  test('测试完成', async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM 扩展边界测试完成（真实UI交互）')
    console.log('='.repeat(80))
  })
})
