/**
 * 完整往返测试 - 测试删除线的双向转换
 * 1. 点击第69行铅笔图标进入设计视图
 * 2. 输入文本并应用删除线
 * 3. 保存并验证 XML
 * 4. 再次点击铅笔图标
 * 5. 验证删除线样式是否正确显示
 */

const { chromium } = require('playwright')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fullRoundtripTest() {
  console.log('\n' + '='.repeat(80))
  console.log('🎬 删除线完整往返测试')
  console.log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()

  try {
    // ==================== 登录 ====================
    console.log('📍 步骤 1: 登录系统')
    await page.goto('http://localhost:3000/user/login')
    await sleep(2000)

    console.log('👉 请在浏览器中手动登录')
    console.log('   账户: admin')
    console.log('   密码: 123456\n')
    console.log('⏳ 等待登录...\n')

    await page.waitForURL(/^((?!\/user\/login).)*$/, { timeout: 120000 })
    console.log('✅ 登录成功！\n')
    await sleep(2000)

    // ==================== 访问页面 ====================
    console.log('📍 步骤 2: 访问 DM 编辑器页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(10000)
    console.log('✅ 页面已加载\n')

    // ==================== 查找第69行 ====================
    console.log('📍 步骤 3: 查找第 69 行')
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await sleep(2000)

    // 获取第69行的内容
    const line69Content = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      if (cm && cm.CodeMirror) {
        const lineContent = cm.CodeMirror.getLine(68) // 0-indexed
        return lineContent
      }
      return null
    })

    console.log(`第 69 行内容: ${line69Content}`)
    console.log()

    // ==================== 点击铅笔图标 ====================
    console.log('📍 步骤 4: 点击第 69 行的铅笔图标')

    // 滚动到第69行
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.scrollIntoView({line: 68, ch: 0})
    })
    await sleep(1000)

    // 点击第69行
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setCursor({line: 68, ch: 0})
    })
    await sleep(500)

    // 查找并点击铅笔图标
    console.log('查找铅笔图标...')
    const pencilIcon = page.locator('.codemirror-icon-edit, .anticon-edit, [title*="编辑"], [title*="设计"]').first()
    const iconCount = await pencilIcon.count()
    console.log(`找到 ${iconCount} 个编辑图标`)

    if (iconCount > 0) {
      await pencilIcon.click()
      console.log('✅ 点击了铅笔图标\n')
    } else {
      // 尝试其他方法触发设计视图
      console.log('⚠️  未找到铅笔图标，尝试使用快捷键...')
      await page.keyboard.press('Control+E')
      console.log('已按 Ctrl+E\n')
    }

    await sleep(3000)

    // ==================== 验证进入设计视图 ====================
    console.log('📍 步骤 5: 验证已进入 Para 设计视图')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    console.log('✅ Para 设计器已打开\n')

    // ==================== 查找编辑器 ====================
    console.log('📍 步骤 6: 定位编辑器 iframe')
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

    // ==================== 清空并输入文本 ====================
    console.log('📍 步骤 7: 清空编辑器并输入 "123"')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)

    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    console.log('✅ 已输入文本\n')

    // ==================== 应用删除线 ====================
    console.log('📍 步骤 8: 应用删除线格式')
    await page.keyboard.press('Control+A')
    await sleep(500)

    // 注入删除线 HTML
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const html1 = await editorBody.innerHTML()
    console.log(`编辑器 HTML: ${html1}`)
    console.log('✅ 删除线已应用\n')

    // ==================== 保存 ====================
    console.log('📍 步骤 9: 保存')
    await page.click('.para-designer button:has-text("保存")')
    await sleep(4000)

    try {
      await page.waitForSelector('.ant-message-success', { timeout: 5000 })
      console.log('✅ 保存成功提示已显示')
    } catch (e) {
      console.log('ℹ️  未检测到成功提示')
    }
    console.log()

    // ==================== 关闭设计视图 ====================
    console.log('📍 步骤 10: 关闭设计视图')
    const closeButton = page.locator('.para-designer .ant-modal-close, .para-designer button:has-text("取消"), .para-designer .close')
    const closeCount = await closeButton.count()

    if (closeCount > 0) {
      await closeButton.first().click()
      console.log('✅ 点击了关闭按钮\n')
    } else {
      console.log('⚠️  未找到关闭按钮，按 Escape 键\n')
      await page.keyboard.press('Escape')
    }

    await sleep(2000)

    // ==================== 验证 XML ====================
    console.log('📍 步骤 11: 验证生成的 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      console.log('📋 生成的 <para> 内容:')
      console.log('─'.repeat(80))
      console.log(paraMatch[0])
      console.log('─'.repeat(80))
    }

    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
    console.log(`\n验证: ${hasDelete123 ? '✅' : '❌'} XML 包含 <delete>123</delete>\n`)

    if (!hasDelete123) {
      console.log('❌ 第一次保存失败，XML 不正确\n')
      throw new Error('XML 验证失败')
    }

    // ==================== 往返测试：再次打开设计视图 ====================
    console.log('📍 步骤 12: 【往返测试】再次点击第 69 行铅笔图标')
    await sleep(2000)

    // 再次点击第69行
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setCursor({line: 68, ch: 0})
    })
    await sleep(500)

    // 查找并点击铅笔图标
    const pencilIcon2 = page.locator('.codemirror-icon-edit, .anticon-edit, [title*="编辑"], [title*="设计"]').first()
    if (await pencilIcon2.count() > 0) {
      await pencilIcon2.click()
      console.log('✅ 再次点击了铅笔图标\n')
    } else {
      await page.keyboard.press('Control+E')
      console.log('已按 Ctrl+E\n')
    }

    await sleep(3000)

    // ==================== 验证设计视图已打开 ====================
    console.log('📍 步骤 13: 验证设计视图已重新打开')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    console.log('✅ Para 设计器已重新打开\n')

    // ==================== 查找编辑器并验证内容 ====================
    console.log('📍 步骤 14: 验证删除线样式是否正确显示')
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
      throw new Error('未找到编辑器 frame')
    }

    const editorBody2 = editorFrame2.locator('body')
    await sleep(1000)

    // 读取编辑器内容
    const html2 = await editorBody2.innerHTML()
    console.log('📄 编辑器 HTML:')
    console.log('─'.repeat(80))
    console.log(html2)
    console.log('─'.repeat(80))

    // 验证删除线标签
    const hasStrikeTag = html2.includes('<s>') || html2.includes('<del>') || html2.includes('<strike>')
    const hasStrikeStyle = html2.includes('line-through')
    const hasText123 = html2.includes('123')

    console.log('\n🔍 往返验证结果:')
    console.log(`  包含删除线标签 (<s>/<del>/<strike>): ${hasStrikeTag ? '✅' : '❌'}`)
    console.log(`  包含删除线样式 (line-through): ${hasStrikeStyle ? '✅' : '❌'}`)
    console.log(`  包含文本 "123": ${hasText123 ? '✅' : '❌'}`)

    // 检查文本样式
    const textElement = editorBody2.locator('body *')
    const computedStyle = await textElement.first().evaluate(el => {
      return window.getComputedStyle(el).textDecoration
    })
    console.log(`  计算样式: ${computedStyle}`)

    // 最终验证
    console.log('\n' + '='.repeat(80))
    if (hasDelete123 && (hasStrikeTag || hasStrikeStyle) && hasText123) {
      console.log('✅✅✅ 完整往返测试通过！')
      console.log('✅ XML 生成正确: <delete>123</delete>')
      console.log('✅ 删除线样式正确显示')
      console.log('✅ 双向转换工作正常')
    } else {
      console.log('❌ 往返测试失败')
      if (!hasDelete123) console.log('  - XML 不包含 <delete>123</delete>')
      if (!hasStrikeTag && !hasStrikeStyle) console.log('  - 删除线样式未正确显示')
      if (!hasText123) console.log('  - 文本内容丢失')
    }
    console.log('='.repeat(80))

    console.log('\n⏸️  浏览器保持打开 60 秒供检查\n')
    await sleep(60000)

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error.stack)
    await page.screenshot({ path: 'test-results/roundtrip-error.png', fullPage: true })
    console.log('📸 已保存错误截图\n')
  } finally {
    await browser.close()
    console.log('\n✅ 测试完成')
  }
}

fullRoundtripTest().catch(console.error)
