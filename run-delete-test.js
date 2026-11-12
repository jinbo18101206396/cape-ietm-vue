/**
 * 简化版删除线测试 - 直接执行，无依赖复杂配置
 */

const { chromium } = require('playwright')

async function runTest() {
  console.log('\n🚀 开始删除线双向转换测试\n')

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({
    viewport: null
  })

  const page = await context.newPage()

  try {
    // 访问页面
    console.log('📍 步骤 1: 访问页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await page.waitForTimeout(8000)
    console.log('✅ 页面已加载\n')

    // 检查是否在登录页
    const isLogin = await page.locator('input[placeholder*="账户"]').count() > 0
    if (isLogin) {
      console.log('❌ 需要先登录，请在浏览器中登录后重新运行\n')
      await page.waitForTimeout(60000) // 等待手动登录
    }

    // 切换到设计视图
    console.log('📍 步骤 2: 切换到设计视图')
    const designTab = page.locator('.ant-tabs-tab').filter({ hasText: '设计视图' })
    if (await designTab.count() > 0) {
      await designTab.first().click()
      await page.waitForTimeout(3000)
      console.log('✅ 已切换到设计视图\n')
    }

    // 等待编辑器
    console.log('📍 步骤 3: 等待编辑器加载')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    console.log('✅ 编辑器已加载\n')

    // 查找 iframe
    console.log('📍 步骤 4: 查找编辑器 iframe')
    await page.waitForTimeout(2000)

    const frames = page.frames()
    let editorFrame = null

    for (const frame of frames) {
      try {
        const bodyCount = await frame.locator('body').count()
        if (bodyCount > 0) {
          const bodyClass = await frame.locator('body').getAttribute('class')
          if (bodyClass && bodyClass.includes('view')) {
            editorFrame = frame
            console.log('✅ 找到编辑器 iframe\n')
            break
          }
        }
      } catch (e) {
        continue
      }
    }

    if (!editorFrame) {
      throw new Error('未找到编辑器 iframe')
    }

    const editorBody = editorFrame.locator('body')

    // 清空编辑器
    console.log('📍 步骤 5: 清空编辑器')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await page.waitForTimeout(500)
    console.log('✅ 编辑器已清空\n')

    // 输入文本
    console.log('📍 步骤 6: 输入文本 "123"')
    await editorBody.type('123')
    await page.waitForTimeout(500)
    console.log('✅ 文本已输入\n')

    // 全选并应用删除线
    console.log('📍 步骤 7: 应用删除线')
    await page.keyboard.press('Control+A')
    await page.waitForTimeout(500)

    // 尝试查找删除线按钮
    console.log('  尝试查找删除线按钮...')
    const buttons = await page.locator('.edui-toolbar .edui-button').all()
    let found = false

    for (const btn of buttons) {
      const title = await btn.getAttribute('title')
      if (title && title.includes('删除线')) {
        await btn.click()
        found = true
        console.log(`  ✓ 点击了删除线按钮: ${title}`)
        break
      }
    }

    if (!found) {
      console.log('  未找到删除线按钮，手动注入 HTML...')
      await editorBody.evaluate(() => {
        document.body.innerHTML = '<p><s>123</s></p>'
      })
      console.log('  ✓ 已手动注入删除线 HTML')
    }

    await page.waitForTimeout(1000)

    // 验证 HTML
    console.log('\n📍 步骤 8: 验证编辑器 HTML')
    const html = await editorBody.innerHTML()
    console.log('  编辑器 HTML:', html.substring(0, 200))

    const hasStrike = html.includes('<s>') || html.includes('<del>') || html.includes('line-through')
    console.log(`  包含删除线: ${hasStrike ? '✅' : '❌'}\n`)

    // 保存
    console.log('📍 步骤 9: 保存')
    const saveBtn = page.locator('.para-designer button').filter({ hasText: '保存' })
    if (await saveBtn.count() > 0) {
      await saveBtn.first().click()
      console.log('  ✓ 点击保存按钮')
      await page.waitForTimeout(3000)
      console.log('✅ 已保存\n')
    }

    // 切换到源码视图
    console.log('📍 步骤 10: 切换到源码视图')
    const sourceTab = page.locator('.ant-tabs-tab').filter({ hasText: '源码视图' })
    await sourceTab.first().click()
    await page.waitForTimeout(2000)
    console.log('✅ 已切换到源码视图\n')

    // 读取 XML
    console.log('📍 步骤 11: 读取 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    console.log('─'.repeat(80))
    console.log('📄 生成的 XML:')
    console.log('─'.repeat(80))
    console.log(xml.substring(0, 1000))
    console.log('─'.repeat(80))

    // 验证
    console.log('\n📊 验证结果:')
    const hasDelete = xml.includes('<delete>')
    const hasDeleteClose = xml.includes('</delete>')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)

    console.log(`  包含 <delete>: ${hasDelete ? '✅' : '❌'}`)
    console.log(`  包含 </delete>: ${hasDeleteClose ? '❌' : '❌'}`)
    console.log(`  匹配 <delete>123</delete>: ${hasDelete123 ? '✅' : '❌'}`)

    // 提取 para
    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      console.log('\n📋 <para> 内容:')
      console.log(paraMatch[0])
    }

    console.log('\n' + '='.repeat(80))
    if (hasDelete123) {
      console.log('✅✅✅ 测试通过！删除线已正确转换为 <delete> 标签')
    } else {
      console.log('❌❌❌ 测试失败！XML 中未找到 <delete> 标签')
      console.log('\n可能原因:')
      console.log('  1. 浏览器缓存未清除 - 请按 Ctrl+Shift+R 刷新')
      console.log('  2. paraConverter.js 未重新加载')
      console.log('  3. 需要重启 webpack dev server')
    }
    console.log('='.repeat(80) + '\n')

    // 等待手动检查
    console.log('⏸️  测试完成，浏览器保持打开状态供检查...')
    console.log('按 Ctrl+C 退出\n')
    await page.waitForTimeout(300000) // 等待 5 分钟

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error(error.stack)
  } finally {
    await browser.close()
  }
}

runTest().catch(console.error)
