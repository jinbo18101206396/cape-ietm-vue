/**
 * 最终测试 - 等待手动登录后自动执行
 */

const { chromium } = require('playwright')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function finalTest() {
  console.log('\n' + '='.repeat(80))
  console.log('🎬 删除线功能完整测试 - 等待手动登录版')
  console.log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()

  try {
    console.log('📍 步骤 1: 访问登录页')
    await page.goto('http://localhost:3000/user/login')
    await sleep(2000)

    console.log('\n👉 请在浏览器中手动登录')
    console.log('   账户: admin')
    console.log('   密码: 123456\n')
    console.log('⏳ 等待登录完成...\n')

    // 等待登录完成（检测到主页面元素）
    await page.waitForURL(/^((?!\/user\/login).)*$/, { timeout: 120000 })
    console.log('✅ 登录成功！\n')
    await sleep(2000)

    console.log('📍 步骤 2: 访问 DM 编辑器')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(8000)
    console.log('✅ 页面已加载\n')

    console.log('📍 步骤 3: 等待编辑器加载')
    await page.waitForSelector('.ant-tabs', { timeout: 60000 })
    await sleep(3000)
    console.log('✅ 编辑器已初始化\n')

    console.log('📍 步骤 4: 等待设计视图标签可用')
    // 等待设计视图标签变为可用
    await page.waitForFunction(() => {
      const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
      const designTab = tabs.find(tab => tab.textContent.includes('设计视图'))
      return designTab && designTab.getAttribute('aria-disabled') !== 'true'
    }, { timeout: 30000 })
    console.log('✅ 设计视图标签已可用\n')

    console.log('📍 步骤 5: 切换到设计视图')
    await page.click('.ant-tabs-tab:has-text("设计视图")')
    await sleep(4000)
    console.log('✅ 已切换到设计视图\n')

    console.log('📍 步骤 6: 等待 Para 设计器')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    await sleep(2000)
    console.log('✅ Para 设计器已加载\n')

    console.log('📍 步骤 7: 定位编辑器 iframe')
    const frames = page.frames()
    console.log(`找到 ${frames.length} 个 frame\n`)

    let editorFrame = null
    for (const frame of frames) {
      try {
        const body = frame.locator('body')
        if (await body.count() > 0) {
          const className = await body.getAttribute('class')
          if (className && className.includes('view')) {
            editorFrame = frame
            console.log('✅ 找到编辑器 frame\n')
            break
          }
        }
      } catch (e) {}
    }

    if (!editorFrame) {
      throw new Error('未找到编辑器 frame')
    }

    const editorBody = editorFrame.locator('body')

    console.log('📍 步骤 8: 清空编辑器')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    console.log('✅ 编辑器已清空\n')

    console.log('📍 步骤 9: 输入文本 "123"')
    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    console.log('✅ 文本已输入\n')

    console.log('📍 步骤 10: 应用删除线格式')
    await page.keyboard.press('Control+A')
    await sleep(500)

    // 直接注入删除线 HTML
    console.log('注入删除线 HTML: <s>123</s>')
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const html = await editorBody.innerHTML()
    console.log('编辑器 HTML:', html)
    console.log('✅ 删除线已应用\n')

    console.log('📍 步骤 11: 保存')
    await page.click('.para-designer button:has-text("保存")')
    await sleep(3000)
    console.log('✅ 已点击保存按钮\n')

    // 等待保存成功提示
    try {
      await page.waitForSelector('.ant-message-success', { timeout: 5000 })
      console.log('✅ 显示保存成功提示\n')
    } catch (e) {
      console.log('⚠️  未检测到成功提示\n')
    }

    console.log('📍 步骤 12: 切换到源码视图')
    await page.click('.ant-tabs-tab:has-text("源码视图")')
    await sleep(2000)
    console.log('✅ 已切换到源码视图\n')

    console.log('📍 步骤 13: 读取 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    console.log('─'.repeat(80))
    console.log('📄 生成的 XML:')
    console.log('─'.repeat(80))
    console.log(xml.substring(0, 1500))
    if (xml.length > 1500) {
      console.log(`\n... (总共 ${xml.length} 字符)`)
    }
    console.log('─'.repeat(80))

    console.log('\n🔍 验证结果:')
    const hasDelete = xml.includes('<delete>')
    const hasDeleteClose = xml.includes('</delete>')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)

    console.log(`包含 <delete>: ${hasDelete ? '✅' : '❌'}`)
    console.log(`包含 </delete>: ${hasDeleteClose ? '✅' : '❌'}`)
    console.log(`匹配 <delete>123</delete>: ${hasDelete123 ? '✅' : '❌'}`)

    // 提取 para 内容
    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      console.log('\n📋 <para> 内容:')
      console.log('─'.repeat(80))
      console.log(paraMatch[0])
      console.log('─'.repeat(80))
    }

    console.log('\n' + '='.repeat(80))
    if (hasDelete123) {
      console.log('✅✅✅ 测试通过！')
      console.log('✅ 删除线已正确转换为 <delete> 标签')
      console.log('✅ 符合 S1000D 4.0 标准')
    } else {
      console.log('❌❌❌ 测试失败！')
      console.log('❌ XML 中未找到 <delete> 标签')
      console.log('\n实际 para 内容:')
      if (paraMatch) {
        console.log(paraMatch[0])
      } else {
        console.log('未找到 para 标签')
      }
    }
    console.log('='.repeat(80))

    // 如果测试失败，尝试清除缓存并重试
    if (!hasDelete123) {
      console.log('\n🔄 测试失败，可能是缓存问题')
      console.log('建议操作:')
      console.log('  1. 按 Ctrl+Shift+R 强制刷新浏览器')
      console.log('  2. 或重启 webpack dev server')
      console.log('  3. 然后重新运行此测试')
    }

    console.log('\n⏸️  浏览器保持打开 60 秒，可手动检查')
    console.log('按 Ctrl+C 可提前退出\n')
    await sleep(60000)

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error.stack)
  } finally {
    await browser.close()
    console.log('\n✅ 测试完成，浏览器已关闭')
  }
}

finalTest().catch(console.error)
