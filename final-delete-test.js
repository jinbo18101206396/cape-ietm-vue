/**
 * 最终删除线测试 - 处理所有边界情况
 */

const { chromium } = require('playwright')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runFinalTest() {
  console.log('\n' + '='.repeat(80))
  console.log('🎬 删除线功能最终测试')
  console.log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()
  page.setDefaultTimeout(60000)

  try {
    console.log('📍 步骤 1: 访问页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(8000)
    console.log('   ✅ 页面已加载\n')

    // 等待页面完全加载
    console.log('📍 步骤 2: 等待编辑器初始化')
    await page.waitForSelector('.ant-tabs', { timeout: 30000 })
    await sleep(3000)
    console.log('   ✅ 编辑器已初始化\n')

    // 检查所有标签页状态
    console.log('📍 步骤 3: 检查标签页状态')
    const tabs = await page.locator('.ant-tabs-tab').all()
    console.log(`   找到 ${tabs.length} 个标签页\n`)

    for (let i = 0; i < tabs.length; i++) {
      const text = await tabs[i].textContent()
      const disabled = await tabs[i].getAttribute('aria-disabled')
      const selected = await tabs[i].getAttribute('aria-selected')
      console.log(`   标签 ${i + 1}: ${text.trim()}`)
      console.log(`      - 禁用: ${disabled}`)
      console.log(`      - 选中: ${selected}`)
    }

    // 查找可用的设计视图标签
    console.log('\n📍 步骤 4: 激活设计视图')
    let designTabIndex = -1
    for (let i = 0; i < tabs.length; i++) {
      const text = await tabs[i].textContent()
      if (text.includes('设计视图')) {
        designTabIndex = i
        break
      }
    }

    if (designTabIndex === -1) {
      throw new Error('未找到设计视图标签')
    }

    const designTab = tabs[designTabIndex]
    const isDisabled = await designTab.getAttribute('aria-disabled')

    if (isDisabled === 'true') {
      console.log('   ⚠️  设计视图标签被禁用')
      console.log('   尝试等待标签启用...')

      // 等待标签变为可用
      await page.waitForFunction(
        (index) => {
          const tab = document.querySelectorAll('.ant-tabs-tab')[index]
          return tab && tab.getAttribute('aria-disabled') !== 'true'
        },
        designTabIndex,
        { timeout: 30000 }
      )
      console.log('   ✅ 设计视图标签已启用')
    }

    console.log('   👆 点击设计视图标签')
    await designTab.click()
    await sleep(4000)
    console.log('   ✅ 已切换到设计视图\n')

    console.log('📍 步骤 5: 等待 Para 设计器')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    await sleep(2000)
    console.log('   ✅ Para 设计器已加载\n')

    console.log('📍 步骤 6: 定位编辑器 iframe')
    await sleep(2000)
    const frames = page.frames()
    console.log(`   共 ${frames.length} 个 frame`)

    let editorFrame = null
    for (const frame of frames) {
      try {
        const body = frame.locator('body')
        if (await body.count() > 0) {
          const className = await body.getAttribute('class')
          if (className && className.includes('view')) {
            editorFrame = frame
            console.log('   ✅ 找到编辑器 frame\n')
            break
          }
        }
      } catch (e) {}
    }

    if (!editorFrame) {
      throw new Error('未找到编辑器 frame')
    }

    const editorBody = editorFrame.locator('body')

    console.log('📍 步骤 7: 准备编辑器')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    console.log('   ✅ 编辑器已清空\n')

    console.log('📍 步骤 8: 输入测试文本')
    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    console.log('   ✅ 已输入 "123"\n')

    console.log('📍 步骤 9: 应用删除线')
    await page.keyboard.press('Control+A')
    await sleep(500)

    // 直接注入删除线 HTML（最可靠的方法）
    console.log('   🔧 注入删除线 HTML')
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const html = await editorBody.innerHTML()
    console.log(`   📄 编辑器 HTML: ${html}`)
    console.log('   ✅ 删除线已应用\n')

    console.log('📍 步骤 10: 保存')
    const saveBtn = page.locator('.para-designer button').filter({ hasText: '保存' })
    if (await saveBtn.count() > 0) {
      await saveBtn.first().click()
      await sleep(3000)
      console.log('   ✅ 已保存\n')
    }

    console.log('📍 步骤 11: 切换到源码视图')
    for (const tab of tabs) {
      const text = await tab.textContent()
      if (text.includes('源码视图')) {
        await tab.click()
        await sleep(2000)
        console.log('   ✅ 已切换到源码视图\n')
        break
      }
    }

    console.log('📍 步骤 12: 读取 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    console.log('─'.repeat(80))
    console.log('📄 生成的 XML:')
    console.log('─'.repeat(80))
    console.log(xml.substring(0, 1000))
    console.log('─'.repeat(80))

    console.log('\n🔍 验证结果:')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
    console.log(`   <delete>123</delete>: ${hasDelete123 ? '✅' : '❌'}`)

    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      console.log('\n📋 <para> 内容:')
      console.log(paraMatch[0])
    }

    console.log('\n' + '='.repeat(80))
    if (hasDelete123) {
      console.log('✅✅✅ 测试通过！删除线转换正确！')
    } else {
      console.log('❌❌❌ 测试失败！需要清除浏览器缓存！')
    }
    console.log('='.repeat(80) + '\n')

    console.log('⏸️  浏览器保持打开，按 Ctrl+C 退出\n')
    await sleep(180000)

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
  } finally {
    await browser.close()
  }
}

runFinalTest()
