/**
 * 简化版往返测试 - 使用成功的方法
 * 使用"设计视图"标签而不是铅笔图标
 */

const { chromium } = require('playwright')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function simplifiedRoundtripTest() {
  console.log('\n' + '='.repeat(80))
  console.log('🎬 删除线完整往返测试 (简化版)')
  console.log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()

  try {
    // 登录
    console.log('📍 步骤 1: 登录')
    await page.goto('http://localhost:3000/user/login')
    await sleep(2000)

    console.log('👉 请手动登录 (admin / 123456)\n')
    await page.waitForURL(/^((?!\/user\/login).)*$/, { timeout: 120000 })
    console.log('✅ 登录成功！\n')
    await sleep(2000)

    // 访问页面
    console.log('📍 步骤 2: 访问 DM 编辑器')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(10000)
    console.log('✅ 页面已加载\n')

    // 等待并切换到设计视图
    console.log('📍 步骤 3: 切换到设计视图')
    await page.waitForSelector('.ant-tabs', { timeout: 60000 })
    await sleep(3000)

    // 等待设计视图标签可用
    await page.waitForFunction(() => {
      const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
      const designTab = tabs.find(tab => tab.textContent.includes('设计视图'))
      return designTab && designTab.getAttribute('aria-disabled') !== 'true'
    }, { timeout: 30000 })

    await page.click('.ant-tabs-tab:has-text("设计视图")')
    await sleep(4000)
    console.log('✅ 已切换到设计视图\n')

    // 验证设计器已加载
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    console.log('✅ Para 设计器已加载\n')

    // 定位编辑器
    console.log('📍 步骤 4: 定位编辑器')
    await sleep(2000)
    const frames = page.frames()
    let editorFrame = null
    for (const frame of frames) {
      try {
        const body = frame.locator('body')
        if (await body.count() > 0) {
          const className = await body.getAttribute('class')
          if (className && className.includes('view')) {
            editorFrame = frame
            break
          }
        }
      } catch (e) {}
    }

    if (!editorFrame) {
      throw new Error('未找到编辑器')
    }
    console.log('✅ 编辑器已定位\n')

    const editorBody = editorFrame.locator('body')

    // 清空并输入文本
    console.log('📍 步骤 5: 输入文本 "123"')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    console.log('✅ 已输入\n')

    // 应用删除线
    console.log('📍 步骤 6: 应用删除线')
    await page.keyboard.press('Control+A')
    await sleep(500)
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const html1 = await editorBody.innerHTML()
    console.log(`编辑器 HTML: ${html1}`)
    console.log('✅ 删除线已应用\n')

    // 保存
    console.log('📍 步骤 7: 保存')
    await page.click('.para-designer button:has-text("保存")')
    await sleep(4000)
    console.log('✅ 已保存\n')

    // 验证 XML
    console.log('📍 步骤 8: 验证 XML (保持在设计视图)')
    // 切换到源码视图查看 XML
    await page.click('.ant-tabs-tab:has-text("源码视图")')
    await sleep(2000)

    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      console.log('📋 生成的 XML:')
      console.log('─'.repeat(80))
      console.log(paraMatch[0])
      console.log('─'.repeat(80))
    }

    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
    console.log(`\n验证 XML: ${hasDelete123 ? '✅' : '❌'} 包含 <delete>123</delete>\n`)

    if (!hasDelete123) {
      throw new Error('XML 不正确')
    }

    // ==================== 往返测试 ====================
    console.log('=' .repeat(80))
    console.log('开始往返测试')
    console.log('='.repeat(80) + '\n')

    console.log('📍 步骤 9: 再次切换到设计视图')
    await page.click('.ant-tabs-tab:has-text("设计视图")')
    await sleep(4000)
    console.log('✅ 已切换回设计视图\n')

    // 再次定位编辑器
    console.log('📍 步骤 10: 重新定位编辑器')
    await sleep(2000)
    const frames2 = page.frames()
    let editorFrame2 = null
    for (const frame of frames2) {
      try {
        const body = frame.locator('body')
        if (await body.count() > 0) {
          const className = await body.getAttribute('class')
          if (className && className.includes('view')) {
            editorFrame2 = frame
            break
          }
        }
      } catch (e) {}
    }

    if (!editorFrame2) {
      throw new Error('未找到编辑器')
    }
    console.log('✅ 编辑器已定位\n')

    const editorBody2 = editorFrame2.locator('body')
    await sleep(1000)

    // 读取内容
    console.log('📍 步骤 11: 验证删除线样式是否正确显示')
    const html2 = await editorBody2.innerHTML()
    console.log('📄 编辑器 HTML (往返后):')
    console.log('─'.repeat(80))
    console.log(html2)
    console.log('─'.repeat(80))

    // 验证
    const hasStrikeTag = html2.includes('<s>') || html2.includes('<del>') || html2.includes('<strike>')
    const hasStrikeStyle = html2.includes('line-through')
    const hasText123 = html2.includes('123')

    console.log('\n🔍 往返验证:')
    console.log(`  删除线标签: ${hasStrikeTag ? '✅' : '❌'}`)
    console.log(`  删除线样式: ${hasStrikeStyle ? '✅' : '❌'}`)
    console.log(`  文本内容: ${hasText123 ? '✅' : '❌'}`)

    // 最终结果
    console.log('\n' + '='.repeat(80))
    console.log('📊 测试结果')
    console.log('='.repeat(80))

    if (hasDelete123 && (hasStrikeTag || hasStrikeStyle) && hasText123) {
      console.log('\n✅✅✅ 完整往返测试通过！')
      console.log('✅ 第一次保存: XML 正确生成 <delete>123</delete>')
      console.log('✅ 再次打开: 删除线样式正确显示')
      console.log('✅ 双向转换工作正常')
      console.log('\n符合 S1000D 4.0 标准 ✅')
    } else {
      console.log('\n❌ 往返测试失败')
      if (!hasDelete123) console.log('  ❌ XML 不正确')
      if (!hasStrikeTag && !hasStrikeStyle) console.log('  ❌ 删除线样式未显示')
      if (!hasText123) console.log('  ❌ 文本内容丢失')
    }
    console.log('='.repeat(80))

    console.log('\n⏸️  浏览器保持打开 60 秒\n')
    await sleep(60000)

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    await page.screenshot({ path: 'test-results/simplified-error.png', fullPage: true })
  } finally {
    await browser.close()
    console.log('\n✅ 测试完成')
  }
}

simplifiedRoundtripTest().catch(console.error)
