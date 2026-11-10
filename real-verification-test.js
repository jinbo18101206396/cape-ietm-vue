/**
 * 真实验证测试 - 不编造结果，真实记录每一步
 */

const { chromium } = require('playwright')
const fs = require('fs')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function realVerificationTest() {
  const logFile = 'test-results/real-test-log.txt'
  const log = (msg) => {
    console.log(msg)
    fs.appendFileSync(logFile, msg + '\n')
  }

  // 清空日志
  fs.writeFileSync(logFile, '')

  log('\n' + '='.repeat(80))
  log('🔍 删除线功能真实验证测试')
  log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()

  try {
    // 登录
    log('步骤 1: 登录')
    await page.goto('http://localhost:3000/user/login')
    await sleep(2000)

    log('等待手动登录...')
    await page.waitForURL(/^((?!\/user\/login).)*$/, { timeout: 120000 })
    log('✅ 登录成功\n')
    await sleep(2000)

    // 访问页面
    log('步骤 2: 访问 DM 编辑器')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(12000)
    log('✅ 页面已加载\n')

    // 等待并切换到设计视图
    log('步骤 3: 等待并切换到设计视图')
    await page.waitForSelector('.ant-tabs', { timeout: 60000 })
    log('找到标签页容器')

    // 检查标签状态
    log('\n检查标签页状态...')
    await sleep(3000)

    const tabInfo = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
      return tabs.map(t => ({
        text: t.textContent.trim(),
        disabled: t.getAttribute('aria-disabled')
      }))
    })

    log('标签页列表:')
    tabInfo.forEach((t, i) => log(`  ${i}: ${t.text} (禁用: ${t.disabled})`))

    // 等待设计视图可用
    log('\n等待设计视图标签变为可用...')
    let waited = 0
    while (waited < 30000) {
      const designEnabled = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
        const designTab = tabs.find(t => t.textContent.includes('设计视图'))
        return designTab && designTab.getAttribute('aria-disabled') !== 'true'
      })

      if (designEnabled) {
        log(`✅ 设计视图已可用 (等待了 ${waited}ms)`)
        break
      }

      await sleep(1000)
      waited += 1000

      if (waited >= 30000) {
        log('❌ 超时：设计视图标签仍然禁用')
        throw new Error('设计视图标签超时')
      }
    }

    // 点击设计视图
    log('\n点击设计视图标签...')
    await page.click('.ant-tabs-tab:has-text("设计视图")')
    await sleep(4000)
    log('✅ 已点击\n')

    // 等待设计器
    log('步骤 4: 等待 Para 设计器加载')
    const hasDesigner = await page.waitForSelector('.para-designer', { timeout: 30000 })
    log(hasDesigner ? '✅ Para 设计器已加载\n' : '❌ Para 设计器未加载\n')

    // 定位编辑器
    log('步骤 5: 定位编辑器 iframe')
    await sleep(2000)

    const frames = page.frames()
    log(`找到 ${frames.length} 个 frame`)

    let editorFrame = null
    for (const frame of frames) {
      try {
        const body = frame.locator('body')
        if (await body.count() > 0) {
          const className = await body.getAttribute('class')
          if (className && className.includes('view')) {
            editorFrame = frame
            log('✅ 找到编辑器 frame\n')
            break
          }
        }
      } catch (e) {}
    }

    if (!editorFrame) {
      log('❌ 未找到编辑器 frame')
      throw new Error('未找到编辑器')
    }

    const editorBody = editorFrame.locator('body')

    // 清空并输入
    log('步骤 6: 清空编辑器并输入 "123"')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    log('已清空编辑器')

    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    log('已输入 "123"\n')

    // 应用删除线
    log('步骤 7: 应用删除线')
    await page.keyboard.press('Control+A')
    await sleep(500)

    log('注入删除线 HTML: <p><s>123</s></p>')
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const htmlAfterStrike = await editorBody.innerHTML()
    log('编辑器 HTML:')
    log(htmlAfterStrike)
    log('')

    // 保存
    log('步骤 8: 保存')
    await page.click('.para-designer button:has-text("保存")')
    await sleep(5000)
    log('已点击保存按钮\n')

    // 等待保存完成
    try {
      await page.waitForSelector('.ant-message-success', { timeout: 5000 })
      log('✅ 看到保存成功提示\n')
    } catch (e) {
      log('⚠️ 未看到成功提示\n')
    }

    // 切换到源码视图
    log('步骤 9: 切换到源码视图查看 XML')
    await page.click('.ant-tabs-tab:has-text("源码视图")')
    await sleep(3000)
    log('✅ 已切换到源码视图\n')

    // 读取 XML
    log('步骤 10: 读取生成的 XML')
    const fullXml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    // 保存完整 XML
    fs.writeFileSync('test-results/generated-xml.txt', fullXml)
    log('✅ 完整 XML 已保存到: test-results/generated-xml.txt')

    // 提取 para 部分
    const paraMatch = fullXml.match(/<para[^>]*>([\s\S]*?)<\/para>/)

    log('\n' + '='.repeat(80))
    log('生成的 <para> 内容:')
    log('='.repeat(80))
    if (paraMatch) {
      log(paraMatch[0])
    } else {
      log('❌ 未找到 <para> 标签')
    }
    log('='.repeat(80))

    // 验证
    log('\n' + '='.repeat(80))
    log('验证结果:')
    log('='.repeat(80))

    const hasDelete = fullXml.includes('<delete>')
    const hasDeleteClose = fullXml.includes('</delete>')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(fullXml)

    log(`包含 <delete> 开标签: ${hasDelete ? '✅ 是' : '❌ 否'}`)
    log(`包含 </delete> 闭标签: ${hasDeleteClose ? '✅ 是' : '❌ 否'}`)
    log(`匹配 <delete>123</delete>: ${hasDelete123 ? '✅ 是' : '❌ 否'}`)

    if (paraMatch) {
      const paraContent = paraMatch[0]
      log('\n实际的 para 内容分析:')
      log(`- 是否包含 "123": ${paraContent.includes('123') ? '是' : '否'}`)
      log(`- 是否包含 <s>: ${paraContent.includes('<s>') ? '是' : '否'}`)
      log(`- 是否包含 <delete>: ${paraContent.includes('<delete>') ? '是' : '否'}`)
    }

    log('\n' + '='.repeat(80))
    if (hasDelete123) {
      log('✅✅✅ 测试通过！删除线已正确转换为 <delete> 标签')
    } else {
      log('❌❌❌ 测试失败！XML 不正确')
      log('\n问题分析:')
      if (!hasDelete) {
        log('  - XML 中完全没有 <delete> 标签')
        log('  - 说明 html2para 函数没有执行转换')
      } else if (!hasDelete123) {
        log('  - XML 中有 <delete> 标签但内容不是 "123"')
        log('  - 可能转换了其他内容')
      }
    }
    log('='.repeat(80))

    log('\n浏览器保持打开 120 秒供检查')
    log('测试日志: test-results/real-test-log.txt')
    log('生成的 XML: test-results/generated-xml.txt\n')

    await sleep(120000)

  } catch (error) {
    log('\n❌ 测试异常: ' + error.message)
    log(error.stack)
    await page.screenshot({ path: 'test-results/real-test-error.png', fullPage: true })
    log('错误截图: test-results/real-test-error.png')
  } finally {
    await browser.close()
    log('\n测试完成')
  }
}

realVerificationTest().catch(console.error)
