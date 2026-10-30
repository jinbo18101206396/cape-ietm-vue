const { chromium } = require('playwright')
const fs = require('fs')

async function test() {
  console.log('\n========== 真实浏览器测试 ==========\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  // 收集所有日志
  const allLogs = []
  page.on('console', msg => {
    const text = msg.text()
    allLogs.push(text)

    // 实时输出所有日志
    console.log(`[浏览器] ${text}`)
  })

  try {
    console.log('等待编译完成...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 120000 })

    console.log('\n登录...')
    await page.waitForSelector('input[type="text"]', { timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'admin')

    const buttons = await page.locator('button').all()
    for (const btn of buttons) {
      const text = await btn.textContent()
      if (text && text.includes('登录')) {
        await btn.click()
        break
      }
    }

    await page.waitForTimeout(5000)
    console.log('登录完成\n')

    console.log('导航到数据模块编辑页面...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2115071394537517057?mode=edit&dmc=DMC-ZB1-A-05-00-00-00A-007A-A_001-01_zh-CN')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    // 截图查看页面状态
    await page.screenshot({ path: '/tmp/before-design-view.png', fullPage: true })
    console.log('页面截图已保存: /tmp/before-design-view.png')

    console.log('\n切换到设计视图...')
    // 等待页面完全加载
    await page.waitForSelector('.ant-tabs-tab', { timeout: 30000 })

    // 查找所有 tab 并点击设计视图
    const tabs = await page.locator('.ant-tabs-tab').all()
    let found = false
    for (const tab of tabs) {
      const text = await tab.textContent()
      console.log(`发现 tab: ${text}`)
      if (text && text.includes('设计视图')) {
        await tab.click()
        found = true
        console.log('已点击设计视图 tab')
        break
      }
    }

    if (!found) {
      throw new Error('未找到设计视图 tab')
    }

    await page.waitForTimeout(3000)

    console.log('添加警告...')
    await page.click('button:has-text("添加警告")')
    await page.waitForTimeout(1000)

    console.log('\n插入 DM 引用...')
    const editorFrame = page.frameLocator('iframe.edui-default')
    await editorFrame.locator('body').click()
    await page.waitForTimeout(500)

    await page.click('[title="DM引用"]')
    await page.waitForTimeout(1500)

    const dmDialog = page.locator('.ant-modal').filter({ hasText: 'DM引用' })
    await dmDialog.locator('.ant-table-row').first().click()
    await page.waitForTimeout(500)
    await dmDialog.locator('button').filter({ hasText: '确定' }).click()
    await page.waitForTimeout(1000)

    console.log('\n保存...')
    await page.click('button:has-text("保存")').first()
    await page.waitForTimeout(5000)

    console.log('\n========== 分析日志 ==========\n')

    // 查找关键日志
    const syncLogs = allLogs.filter(l => l.includes('[syncNodeToContent]'))
    const nodeToXmlLogs = allLogs.filter(l => l.includes('[nodeToXml]'))
    const contentLogs = allLogs.filter(l => l.includes('最终content字段'))
    const xmlLogs = allLogs.filter(l => l.includes('treeToXml 生成的 XML'))

    console.log(`syncNodeToContent 日志数量: ${syncLogs.length}`)
    if (syncLogs.length > 0) {
      console.log('\nsyncNodeToContent 日志:')
      syncLogs.forEach(l => console.log(`  ${l}`))
    }

    console.log(`\nnodeToXml 日志数量: ${nodeToXmlLogs.length}`)
    if (nodeToXmlLogs.length > 0) {
      console.log('\nnodeToXml 日志:')
      nodeToXmlLogs.forEach(l => console.log(`  ${l}`))
    }

    console.log(`\ncontent 字段日志数量: ${contentLogs.length}`)
    if (contentLogs.length > 0) {
      console.log('\n最终 content:')
      contentLogs.slice(-1).forEach(l => console.log(`  ${l}`))
    }

    console.log(`\nXML 生成日志数量: ${xmlLogs.length}`)

    // 切换到源码视图查看结果
    console.log('\n切换到源码视图检查结果...')
    await page.click('text=源码视图')
    await page.waitForTimeout(2000)

    const sourceContent = await page.locator('.CodeMirror-code').textContent()

    console.log('\n========== 验证结果 ==========\n')

    const hasParseError = sourceContent.includes('parsererror')
    const hasDmRef = sourceContent.includes('<dmRef')
    const hasXlinkType = sourceContent.includes('xlink:type')
    const emptyWarning = sourceContent.match(/<warning[^>]*\/>/)

    console.log(`❌ 包含 parsererror: ${hasParseError}`)
    console.log(`✅ 包含 dmRef 标签: ${hasDmRef}`)
    console.log(`✅ 包含 xlink:type: ${hasXlinkType}`)
    console.log(`❌ warning 为空标签: ${!!emptyWarning}`)

    // 保存完整日志
    fs.writeFileSync('/tmp/browser-logs.txt', allLogs.join('\n'))
    console.log('\n完整日志已保存到: /tmp/browser-logs.txt')

    // 保持浏览器打开5秒
    await page.waitForTimeout(5000)

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error.stack)
  } finally {
    await browser.close()
    console.log('\n========== 测试结束 ==========\n')
  }
}

test().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
