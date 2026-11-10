/**
 * 增强版测试 - 添加更多调试信息
 */

const { chromium } = require('playwright')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function enhancedTest() {
  console.log('\n' + '='.repeat(80))
  console.log('🎬 删除线功能测试 - 增强调试版')
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

    await page.waitForURL(/^((?!\/user\/login).)*$/, { timeout: 120000 })
    console.log('✅ 登录成功！\n')
    await sleep(2000)

    console.log('📍 步骤 2: 访问 DM 编辑器')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(10000)
    console.log('✅ 页面已加载\n')

    console.log('📍 步骤 3: 检查标签页状态')
    await page.waitForSelector('.ant-tabs', { timeout: 60000 })

    // 获取所有标签页信息
    const tabsInfo = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
      return tabs.map((tab, i) => ({
        index: i,
        text: tab.textContent.trim(),
        disabled: tab.getAttribute('aria-disabled'),
        selected: tab.getAttribute('aria-selected'),
        classes: tab.className
      }))
    })

    console.log('找到的标签页:')
    tabsInfo.forEach(tab => {
      console.log(`  [${tab.index}] ${tab.text}`)
      console.log(`      禁用: ${tab.disabled}, 选中: ${tab.selected}`)
    })
    console.log()

    // 找到设计视图标签
    const designTabIndex = tabsInfo.findIndex(t => t.text.includes('设计视图'))
    if (designTabIndex === -1) {
      throw new Error('未找到设计视图标签')
    }

    console.log(`设计视图标签索引: ${designTabIndex}`)
    console.log(`设计视图标签状态: 禁用=${tabsInfo[designTabIndex].disabled}\n`)

    // 如果标签被禁用，等待一段时间看是否会变为可用
    if (tabsInfo[designTabIndex].disabled === 'true') {
      console.log('⚠️  设计视图标签当前被禁用')
      console.log('等待 10 秒...\n')
      await sleep(10000)

      // 重新检查状态
      const newStatus = await page.evaluate((idx) => {
        const tab = document.querySelectorAll('.ant-tabs-tab')[idx]
        return {
          disabled: tab.getAttribute('aria-disabled'),
          classes: tab.className
        }
      }, designTabIndex)

      console.log(`10秒后状态: 禁用=${newStatus.disabled}\n`)
    }

    console.log('📍 步骤 4: 尝试点击设计视图（无论是否禁用）')
    try {
      await page.locator('.ant-tabs-tab').nth(designTabIndex).click({ force: true, timeout: 5000 })
      console.log('✅ 已点击设计视图标签\n')
    } catch (e) {
      console.log(`⚠️  点击失败: ${e.message}`)
      console.log('尝试使用 JavaScript 点击...\n')

      await page.evaluate((idx) => {
        const tab = document.querySelectorAll('.ant-tabs-tab')[idx]
        tab.click()
      }, designTabIndex)
      console.log('✅ JavaScript 点击完成\n')
    }

    await sleep(4000)

    console.log('📍 步骤 5: 检查是否成功切换到设计视图')
    const hasDesigner = await page.locator('.para-designer').count()
    console.log(`Para 设计器存在: ${hasDesigner > 0 ? '是' : '否'}\n`)

    if (hasDesigner === 0) {
      console.log('❌ 未找到 Para 设计器')
      console.log('可能原因:')
      console.log('  1. 设计视图标签被禁用且无法点击')
      console.log('  2. 页面数据未加载完成')
      console.log('  3. 需要先加载或选择某些内容\n')

      // 截图保存
      await page.screenshot({ path: 'test-results/design-view-failed.png', fullPage: true })
      console.log('📸 已保存截图: test-results/design-view-failed.png\n')

      throw new Error('无法进入设计视图')
    }

    console.log('✅ Para 设计器已加载\n')

    console.log('📍 步骤 6: 定位编辑器 iframe')
    await sleep(2000)
    const frames = page.frames()
    console.log(`共 ${frames.length} 个 frame\n`)

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

    console.log('📍 步骤 7: 清空并输入文本')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    console.log('✅ 已输入 "123"\n')

    console.log('📍 步骤 8: 应用删除线')
    await page.keyboard.press('Control+A')
    await sleep(500)

    console.log('注入删除线 HTML: <p><s>123</s></p>')
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const html = await editorBody.innerHTML()
    console.log(`编辑器 HTML: ${html}`)
    console.log('✅ 删除线已应用\n')

    console.log('📍 步骤 9: 保存')
    await page.click('.para-designer button:has-text("保存")')
    await sleep(4000)
    console.log('✅ 已保存\n')

    console.log('📍 步骤 10: 切换到源码视图')
    await page.click('.ant-tabs-tab:has-text("源码视图")')
    await sleep(2000)
    console.log('✅ 已切换到源码视图\n')

    console.log('📍 步骤 11: 读取 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    console.log('─'.repeat(80))
    console.log('📄 生成的 XML:')
    console.log('─'.repeat(80))
    console.log(xml.substring(0, 1500))
    console.log('─'.repeat(80))

    console.log('\n🔍 验证结果:')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
    console.log(`匹配 <delete>123</delete>: ${hasDelete123 ? '✅' : '❌'}`)

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
    } else {
      console.log('❌❌❌ 测试失败！')
      console.log('❌ XML 中未找到 <delete> 标签')
    }
    console.log('='.repeat(80))

    console.log('\n⏸️  浏览器保持打开 60 秒\n')
    await sleep(60000)

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    await page.screenshot({ path: 'test-results/error.png', fullPage: true })
    console.log('📸 已保存错误截图\n')
  } finally {
    await browser.close()
    console.log('\n✅ 浏览器已关闭')
  }
}

enhancedTest().catch(console.error)
