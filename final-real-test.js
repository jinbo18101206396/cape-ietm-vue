/**
 * 最终真实测试 - 使用 JavaScript 直接操作避免点击问题
 */

const { chromium } = require('playwright')
const fs = require('fs')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function finalRealTest() {
  const logFile = 'test-results/final-real-log.txt'
  const log = (msg) => {
    console.log(msg)
    fs.appendFileSync(logFile, msg + '\n')
  }

  fs.writeFileSync(logFile, '')

  log('\n' + '='.repeat(80))
  log('🔍 删除线功能最终真实验证')
  log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
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
    log('步骤 2: 访问页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(12000)
    log('✅ 页面已加载\n')

    // 等待设计视图可用
    log('步骤 3: 等待设计视图标签可用')
    await page.waitForSelector('.ant-tabs', { timeout: 60000 })

    let waited = 0
    while (waited < 30000) {
      const enabled = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
        const designTab = tabs.find(t => t.textContent.includes('设计视图'))
        return designTab && designTab.getAttribute('aria-disabled') !== 'true'
      })

      if (enabled) {
        log(`✅ 设计视图已可用 (等待 ${waited}ms)\n`)
        break
      }

      await sleep(1000)
      waited += 1000
    }

    // 使用 JavaScript 直接点击标签
    log('步骤 4: 使用 JavaScript 点击设计视图标签')
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
      const designTab = tabs.find(t => t.textContent.includes('设计视图'))
      if (designTab) {
        designTab.click()
      }
    })
    await sleep(4000)
    log('✅ 已点击\n')

    // 检查设计器是否出现
    log('步骤 5: 检查 Para 设计器')
    const hasDesigner = await page.locator('.para-designer').count()
    log(`Para 设计器数量: ${hasDesigner}`)

    if (hasDesigner === 0) {
      log('❌ Para 设计器未出现\n')
      throw new Error('设计器未加载')
    }
    log('✅ Para 设计器已加载\n')

    // 定位编辑器
    log('步骤 6: 定位编辑器')
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
      log('❌ 未找到编辑器')
      throw new Error('未找到编辑器')
    }

    const editorBody = editorFrame.locator('body')

    // 清空并输入
    log('步骤 7: 输入文本')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    log('✅ 已输入 "123"\n')

    // 应用删除线
    log('步骤 8: 应用删除线')
    await page.keyboard.press('Control+A')
    await sleep(500)
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const htmlBefore = await editorBody.innerHTML()
    log('应用删除线后的 HTML:')
    log(htmlBefore)
    log('')

    // 保存
    log('步骤 9: 保存')
    await page.click('.para-designer button:has-text("保存")', { force: true })
    await sleep(5000)
    log('✅ 已点击保存\n')

    // 切换到源码视图
    log('步骤 10: 切换到源码视图')
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'))
      const sourceTab = tabs.find(t => t.textContent.includes('源码视图'))
      if (sourceTab) {
        sourceTab.click()
      }
    })
    await sleep(3000)
    log('✅ 已切换\n')

    // 读取 XML
    log('步骤 11: 读取生成的 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    // 保存 XML
    fs.writeFileSync('test-results/final-generated.xml', xml)
    log('✅ XML 已保存到: test-results/final-generated.xml\n')

    // 提取 para
    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)

    log('='.repeat(80))
    log('生成的 <para> 内容:')
    log('='.repeat(80))
    if (paraMatch) {
      log(paraMatch[0])
    } else {
      log('❌ 未找到 <para> 标签')
    }
    log('='.repeat(80))

    // 验证
    log('\n验证结果:')
    const hasDelete = xml.includes('<delete>')
    const hasDeleteClose = xml.includes('</delete>')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
    const has123 = xml.includes('123')
    const hasS = xml.includes('<s>')

    log(`  包含文本 "123": ${has123 ? '✅' : '❌'}`)
    log(`  包含 <delete>: ${hasDelete ? '✅' : '❌'}`)
    log(`  包含 </delete>: ${hasDeleteClose ? '✅' : '❌'}`)
    log(`  包含 <s>: ${hasS ? '是 (未转换)' : '否'}`)
    log(`  匹配 <delete>123</delete>: ${hasDelete123 ? '✅ 是' : '❌ 否'}`)

    log('\n' + '='.repeat(80))
    if (hasDelete123) {
      log('✅✅✅ 测试通过！')
      log('删除线已正确转换为 <delete>123</delete>')
    } else {
      log('❌❌❌ 测试失败！')
      if (!has123) {
        log('  问题: 文本 "123" 丢失')
      } else if (hasS) {
        log('  问题: <s> 标签未转换为 <delete>')
        log('  说明: html2para 函数的转换逻辑未生效')
      } else if (!hasDelete) {
        log('  问题: 完全没有 <delete> 标签')
      } else {
        log('  问题: <delete> 标签存在但内容不对')
      }
    }
    log('='.repeat(80))

    log('\n查看生成的文件:')
    log('  - test-results/final-real-log.txt (本日志)')
    log('  - test-results/final-generated.xml (完整 XML)')

    log('\n浏览器保持打开 120 秒\n')
    await sleep(120000)

  } catch (error) {
    log('\n❌ 错误: ' + error.message)
    log(error.stack)
    await page.screenshot({ path: 'test-results/final-error.png', fullPage: true })
    log('截图: test-results/final-error.png')
  } finally {
    await browser.close()
    log('\n测试完成')
  }
}

finalRealTest().catch(console.error)
