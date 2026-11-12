/**
 * 通过源码视图行内操作打开设计器的测试
 */

const { chromium } = require('playwright')
const fs = require('fs')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testViaSourceView() {
  const logFile = 'test-results/source-view-test.txt'
  const log = (msg) => {
    console.log(msg)
    fs.appendFileSync(logFile, msg + '\n')
  }

  fs.writeFileSync(logFile, '')

  log('\n' + '='.repeat(80))
  log('🔍 通过源码视图测试删除线功能')
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
    log('步骤 2: 访问页面（默认在源码视图）')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(10000)
    log('✅ 页面已加载\n')

    // 等待 CodeMirror
    log('步骤 3: 等待源码编辑器加载')
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await sleep(2000)
    log('✅ CodeMirror 已加载\n')

    // 查找第 69 行内容
    log('步骤 4: 查找第 69 行')
    const line69 = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      if (cm && cm.CodeMirror) {
        return cm.CodeMirror.getLine(68) // 0-indexed
      }
      return null
    })
    log(`第 69 行内容: ${line69}\n`)

    // 点击第 69 行定位光标
    log('步骤 5: 点击第 69 行定位光标')
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setCursor({line: 68, ch: 0})
      cm.focus()
    })
    await sleep(1000)
    log('✅ 光标已定位到第 69 行\n')

    // 查找铅笔图标或编辑按钮
    log('步骤 6: 查找编辑图标/按钮')

    // 方法1: 查找所有可能的编辑图标
    const editIcons = await page.locator('.anticon-edit, .codemirror-icon-edit, [title*="编辑"], [title*="设计"], button:has-text("编辑")').all()
    log(`找到 ${editIcons.length} 个可能的编辑元素`)

    for (let i = 0; i < editIcons.length; i++) {
      try {
        const isVisible = await editIcons[i].isVisible()
        const title = await editIcons[i].getAttribute('title')
        const text = await editIcons[i].textContent()
        log(`  [${i}] 可见: ${isVisible}, title: ${title}, 文本: ${text}`)
      } catch (e) {
        log(`  [${i}] 无法获取信息`)
      }
    }

    // 尝试点击第一个可见的编辑图标
    log('\n步骤 7: 尝试点击编辑图标')
    let clicked = false
    for (const icon of editIcons) {
      try {
        if (await icon.isVisible()) {
          await icon.click({ timeout: 3000 })
          log('✅ 点击了一个编辑图标')
          clicked = true
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!clicked) {
      log('⚠️ 未找到可点击的编辑图标')
      log('尝试使用快捷键...')
      await page.keyboard.press('Control+E')
      log('已按 Ctrl+E')
    }

    await sleep(3000)

    // 检查是否打开了设计器
    log('\n步骤 8: 检查 Para 设计器是否打开')
    const designerCount = await page.locator('.para-designer, .ant-modal-content').count()
    log(`找到 ${designerCount} 个弹窗/设计器`)

    if (designerCount === 0) {
      log('❌ Para 设计器未打开')
      log('\n尝试其他方法...')

      // 尝试右键菜单
      log('尝试右键点击第 69 行...')
      await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror')
        const line = cm.querySelector('.CodeMirror-line')
        if (line) {
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window
          })
          line.dispatchEvent(event)
        }
      })
      await sleep(2000)

      const contextMenu = await page.locator('.ant-dropdown, .context-menu').count()
      log(`右键菜单: ${contextMenu > 0 ? '已出现' : '未出现'}`)

      throw new Error('无法打开 Para 设计器')
    }

    log('✅ Para 设计器已打开\n')

    // 定位编辑器
    log('步骤 9: 定位编辑器 iframe')
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
            log('✅ 找到编辑器\n')
            break
          }
        }
      } catch (e) {}
    }

    if (!editorFrame) {
      throw new Error('未找到编辑器')
    }

    const editorBody = editorFrame.locator('body')

    // 清空并输入
    log('步骤 10: 输入文本 "123"')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    log('✅ 已输入\n')

    // 应用删除线
    log('步骤 11: 应用删除线')
    await page.keyboard.press('Control+A')
    await sleep(500)
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)
    log('✅ 删除线已应用\n')

    // 保存
    log('步骤 12: 保存')
    await page.click('button:has-text("保存")', { force: true })
    await sleep(5000)
    log('✅ 已保存\n')

    // 读取 XML
    log('步骤 13: 读取 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    fs.writeFileSync('test-results/source-view-generated.xml', xml)

    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    log('='.repeat(80))
    log('生成的 <para>:')
    log('='.repeat(80))
    if (paraMatch) {
      log(paraMatch[0])
    } else {
      log('未找到')
    }
    log('='.repeat(80))

    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
    log(`\n结果: ${hasDelete123 ? '✅ 通过' : '❌ 失败'}\n`)

    log('浏览器保持打开 120 秒\n')
    await sleep(120000)

  } catch (error) {
    log('\n❌ 错误: ' + error.message)
    await page.screenshot({ path: 'test-results/source-view-error.png', fullPage: true })
  } finally {
    await browser.close()
    log('\n测试完成')
  }
}

testViaSourceView().catch(console.error)
