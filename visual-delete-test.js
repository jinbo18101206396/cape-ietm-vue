/**
 * 可视化删除线测试 - 显示浏览器操作过程
 * 使用 headed 模式，可以看到实际操作
 */

const { chromium } = require('playwright')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runVisualTest() {
  console.log('\n' + '='.repeat(80))
  console.log('🎬 开始可视化删除线测试')
  console.log('='.repeat(80) + '\n')

  // 启动浏览器 - headed 模式，慢速操作
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,  // 每个操作延迟500ms，便于观察
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  })

  const context = await browser.newContext({
    viewport: null,
    ignoreHTTPSErrors: true
  })

  const page = await context.newPage()

  // 设置超时时间
  page.setDefaultTimeout(60000)

  try {
    console.log('📍 步骤 1: 访问 DM 编辑器页面')
    console.log('   URL: http://localhost:3000/ietm/dm-content-editor/...')

    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })

    await sleep(5000)
    console.log('   ✅ 页面已加载')

    // 检查是否需要登录
    const loginInput = await page.locator('input[placeholder*="账户"]').count()
    if (loginInput > 0) {
      console.log('\n⚠️  检测到登录页面')
      console.log('👉 请在浏览器中手动登录')
      console.log('   账户: admin')
      console.log('   密码: admin123')
      console.log('\n⏳ 等待登录... (最多等待 2 分钟)')

      // 等待用户登录并跳转
      await page.waitForURL(/dm-content-editor/, { timeout: 120000 })
      console.log('   ✅ 登录成功，页面已跳转')
      await sleep(3000)
    }

    console.log('\n📍 步骤 2: 定位编辑器界面')
    await page.waitForSelector('.ant-tabs', { timeout: 30000 })
    console.log('   ✅ 找到标签页容器')

    console.log('\n📍 步骤 3: 切换到设计视图')
    const tabs = await page.locator('.ant-tabs-tab').all()
    console.log(`   找到 ${tabs.length} 个标签页`)

    for (const tab of tabs) {
      const text = await tab.textContent()
      if (text.includes('设计视图')) {
        console.log('   👆 点击"设计视图"标签')
        await tab.click()
        await sleep(3000)
        console.log('   ✅ 已切换到设计视图')
        break
      }
    }

    console.log('\n📍 步骤 4: 等待 Para 设计器加载')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    console.log('   ✅ Para 设计器已显示')
    await sleep(2000)

    console.log('\n📍 步骤 5: 定位 UEditor 编辑器')
    const frames = page.frames()
    console.log(`   页面共有 ${frames.length} 个 frame`)

    let editorFrame = null
    for (let i = 0; i < frames.length; i++) {
      try {
        const frame = frames[i]
        const body = frame.locator('body')
        const count = await body.count()

        if (count > 0) {
          const className = await body.getAttribute('class')
          if (className && className.includes('view')) {
            editorFrame = frame
            console.log(`   ✅ 找到编辑器 frame (索引: ${i})`)
            break
          }
        }
      } catch (e) {
        // 跳过无法访问的 frame
      }
    }

    if (!editorFrame) {
      throw new Error('❌ 未找到 UEditor 编辑器 frame')
    }

    const editorBody = editorFrame.locator('body')

    console.log('\n📍 步骤 6: 清空编辑器内容')
    console.log('   👆 点击编辑器')
    await editorBody.click()
    await sleep(500)

    console.log('   ⌨️  按 Ctrl+A 全选')
    await page.keyboard.press('Control+A')
    await sleep(300)

    console.log('   ⌨️  按 Delete 删除')
    await page.keyboard.press('Delete')
    await sleep(500)
    console.log('   ✅ 编辑器已清空')

    console.log('\n📍 步骤 7: 输入测试文本 "123"')
    console.log('   ⌨️  输入文字...')
    await editorBody.type('123', { delay: 200 })
    await sleep(500)

    const text = await editorBody.textContent()
    console.log(`   ✅ 文本内容: "${text.trim()}"`)

    console.log('\n📍 步骤 8: 全选文本')
    console.log('   ⌨️  按 Ctrl+A')
    await page.keyboard.press('Control+A')
    await sleep(500)
    console.log('   ✅ 文本已全选')

    console.log('\n📍 步骤 9: 应用删除线格式')
    console.log('   🔍 查找删除线按钮...')

    // 尝试查找并点击删除线按钮
    const toolbarButtons = await page.locator('.edui-toolbar .edui-button').all()
    console.log(`   找到 ${toolbarButtons.length} 个工具栏按钮`)

    let foundButton = false
    for (const button of toolbarButtons) {
      const title = await button.getAttribute('title')
      if (title && (title.includes('删除线') || title.toLowerCase().includes('strikethrough'))) {
        console.log(`   ✅ 找到删除线按钮: "${title}"`)
        console.log('   👆 点击删除线按钮')
        await button.click()
        foundButton = true
        await sleep(1000)
        break
      }
    }

    if (!foundButton) {
      console.log('   ⚠️  未找到删除线按钮')
      console.log('   🔧 使用备用方案: 手动注入 HTML')
      await editorBody.evaluate(() => {
        document.body.innerHTML = '<p><s>123</s></p>'
      })
      await sleep(500)
      console.log('   ✅ 已注入删除线 HTML')
    }

    console.log('\n📍 步骤 10: 验证编辑器中的 HTML')
    const editorHTML = await editorBody.innerHTML()
    console.log('   📄 编辑器 HTML:')
    console.log('   ' + editorHTML.substring(0, 150))

    const hasStrikethrough = editorHTML.includes('<s>') ||
                            editorHTML.includes('<del>') ||
                            editorHTML.includes('<strike>') ||
                            editorHTML.includes('line-through')

    if (hasStrikethrough) {
      console.log('   ✅ 确认包含删除线标记')
    } else {
      console.log('   ⚠️  未检测到删除线标记')
    }

    console.log('\n📍 步骤 11: 保存内容')
    const saveButton = page.locator('.para-designer button').filter({ hasText: '保存' })
    const saveCount = await saveButton.count()

    if (saveCount > 0) {
      console.log('   👆 点击"保存"按钮')
      await saveButton.first().click()
      await sleep(3000)

      // 检查成功提示
      const successMsg = page.locator('.ant-message-success')
      try {
        await successMsg.waitFor({ timeout: 5000 })
        console.log('   ✅ 显示"保存成功"提示')
      } catch (e) {
        console.log('   ℹ️  未检测到成功提示（可能已保存）')
      }
    } else {
      console.log('   ⚠️  未找到保存按钮')
    }

    console.log('\n📍 步骤 12: 切换到源码视图')
    const sourceTabs = await page.locator('.ant-tabs-tab').all()
    for (const tab of sourceTabs) {
      const text = await tab.textContent()
      if (text.includes('源码视图')) {
        console.log('   👆 点击"源码视图"标签')
        await tab.click()
        await sleep(2000)
        console.log('   ✅ 已切换到源码视图')
        break
      }
    }

    console.log('\n📍 步骤 13: 读取并验证 XML')
    const xmlContent = await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror')
      if (cmElement && cmElement.CodeMirror) {
        return cmElement.CodeMirror.getValue()
      }
      return ''
    })

    console.log('\n' + '─'.repeat(80))
    console.log('📄 生成的 XML 内容:')
    console.log('─'.repeat(80))
    console.log(xmlContent.substring(0, 1200))
    if (xmlContent.length > 1200) {
      console.log(`... (总共 ${xmlContent.length} 字符)`)
    }
    console.log('─'.repeat(80))

    console.log('\n🔍 XML 验证:')
    const hasDelete = xmlContent.includes('<delete>')
    const hasDeleteClose = xmlContent.includes('</delete>')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xmlContent)

    console.log(`   包含 <delete> 标签: ${hasDelete ? '✅' : '❌'}`)
    console.log(`   包含 </delete> 标签: ${hasDeleteClose ? '✅' : '❌'}`)
    console.log(`   匹配 <delete>123</delete>: ${hasDelete123 ? '✅' : '❌'}`)

    // 提取并显示 para 内容
    const paraMatch = xmlContent.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      console.log('\n📋 提取的 <para> 内容:')
      console.log('─'.repeat(80))
      console.log(paraMatch[0])
      console.log('─'.repeat(80))
    } else {
      console.log('\n⚠️  未找到 <para> 标签')
    }

    // 最终结果
    console.log('\n' + '='.repeat(80))
    console.log('📊 测试结果')
    console.log('='.repeat(80))

    if (hasDelete123) {
      console.log('\n✅✅✅ 测试通过！')
      console.log('✅ 删除线已正确转换为 S1000D <delete> 元素')
      console.log('✅ XML 生成符合 S1000D 4.0 标准')
    } else {
      console.log('\n❌❌❌ 测试失败！')
      console.log('❌ XML 中未找到正确的 <delete> 标签')
      console.log('\n可能原因:')
      console.log('  1. 浏览器缓存未清除')
      console.log('  2. paraConverter.js 未重新加载')
      console.log('  3. Webpack 未正确编译')
      console.log('\n建议操作:')
      console.log('  • 按 Ctrl+Shift+R 强制刷新浏览器')
      console.log('  • 或重启 webpack dev server')
    }

    console.log('='.repeat(80))

    // 保持浏览器打开以便检查
    console.log('\n⏸️  浏览器保持打开状态，您可以手动检查')
    console.log('⏸️  按 Ctrl+C 关闭测试\n')

    await sleep(180000) // 保持 3 分钟

  } catch (error) {
    console.error('\n❌ 测试异常:', error.message)
    console.error(error.stack)
  } finally {
    await browser.close()
    console.log('\n✅ 浏览器已关闭')
  }
}

runVisualTest().catch(console.error)
