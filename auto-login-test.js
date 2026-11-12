/**
 * 自动登录测试 - 自动填写账号密码并点击登录
 */

const { chromium } = require('playwright')
const fs = require('fs')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function autoLoginTest() {
  const logFile = 'test-results/auto-login-test.txt'
  const log = (msg) => {
    console.log(msg)
    fs.appendFileSync(logFile, msg + '\n')
  }

  fs.writeFileSync(logFile, '')

  log('\n' + '='.repeat(80))
  log('🔍 删除线功能自动登录测试')
  log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()

  try {
    // 自动登录
    log('步骤 1: 访问登录页并自动登录')
    await page.goto('http://localhost:3000/user/login')
    await sleep(2000)

    // 填写账号
    log('填写账号: admin')
    await page.fill('input[type="text"], input[placeholder*="账"], input[id*="username"]', 'admin')
    await sleep(500)

    // 填写密码
    log('填写密码: 123456')
    await page.fill('input[type="password"], input[placeholder*="密码"], input[id*="password"]', '123456')
    await sleep(500)

    // 点击登录按钮
    log('点击登录按钮')
    await page.click('button:has-text("登录"), button[type="submit"], .ant-btn-primary')
    await sleep(3000)

    log('✅ 登录完成\n')

    // 等待跳转
    await page.waitForURL(/^((?!\/user\/login).)*$/, { timeout: 10000 })
    log('✅ 已跳转到主页\n')
    await sleep(2000)

    // 访问 DM 编辑器
    log('步骤 2: 访问 DM 编辑器')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(10000)
    log('✅ 页面已加载\n')

    // 等待 CodeMirror
    log('步骤 3: 等待源码编辑器')
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await sleep(2000)
    log('✅ 源码编辑器已加载\n')

    // 查找第 69 行
    log('步骤 4: 查找第 69 行')
    const line69 = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      if (cm && cm.CodeMirror) {
        return cm.CodeMirror.getLine(68)
      }
      return null
    })
    log(`第 69 行: ${line69}\n`)

    // 查找编辑图标
    log('步骤 5: 查找所有可能的编辑入口')

    // 等待页面完全加载
    await sleep(3000)

    // 列出所有可能的按钮和图标
    const allButtons = await page.locator('button, .anticon, [role="button"], .icon').all()
    log(`找到 ${allButtons.length} 个可交互元素`)

    // 查找包含"编辑"、"设计"的元素
    const editElements = await page.locator('button:has-text("编辑"), button:has-text("设计"), .anticon-edit, [title*="编辑"], [title*="设计"]').all()
    log(`找到 ${editElements.length} 个可能的编辑元素\n`)

    // 尝试点击编辑图标
    log('步骤 6: 尝试打开 Para 设计器')
    let opened = false

    // 方法1: 点击编辑图标
    for (let i = 0; i < editElements.length; i++) {
      try {
        if (await editElements[i].isVisible()) {
          log(`尝试点击元素 ${i}...`)
          await editElements[i].click({ timeout: 2000 })
          await sleep(2000)

          const hasDesigner = await page.locator('.para-designer, .ant-modal').count()
          if (hasDesigner > 0) {
            log('✅ Para 设计器已打开')
            opened = true
            break
          }
        }
      } catch (e) {
        log(`  元素 ${i} 点击失败`)
      }
    }

    // 方法2: 如果没有打开，尝试双击第 69 行
    if (!opened) {
      log('\n尝试双击第 69 行...')
      await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror')
        const line = cm.querySelectorAll('.CodeMirror-line')[68]
        if (line) {
          line.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        }
      })
      await sleep(2000)

      const hasDesigner = await page.locator('.para-designer, .ant-modal').count()
      if (hasDesigner > 0) {
        log('✅ Para 设计器已打开')
        opened = true
      }
    }

    // 方法3: 快捷键
    if (!opened) {
      log('\n尝试快捷键 Ctrl+E...')
      await page.keyboard.press('Control+E')
      await sleep(2000)

      const hasDesigner = await page.locator('.para-designer, .ant-modal').count()
      if (hasDesigner > 0) {
        log('✅ Para 设计器已打开')
        opened = true
      }
    }

    if (!opened) {
      log('❌ 无法打开 Para 设计器')
      await page.screenshot({ path: 'test-results/cannot-open-designer.png', fullPage: true })
      log('已保存截图: test-results/cannot-open-designer.png')
      throw new Error('无法打开设计器')
    }

    // 定位编辑器
    log('\n步骤 7: 定位编辑器 iframe')
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

    // 输入文本
    log('步骤 8: 输入文本 "123"')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await sleep(500)
    await editorBody.type('123', { delay: 100 })
    await sleep(500)
    log('✅ 已输入\n')

    // 应用删除线
    log('步骤 9: 应用删除线')
    await page.keyboard.press('Control+A')
    await sleep(500)
    await editorBody.evaluate(() => {
      document.body.innerHTML = '<p><s>123</s></p>'
    })
    await sleep(1000)

    const htmlAfter = await editorBody.innerHTML()
    log(`编辑器 HTML: ${htmlAfter}\n`)

    // 保存
    log('步骤 10: 保存')
    await page.click('button:has-text("保存")', { force: true })
    await sleep(5000)
    log('✅ 已保存\n')

    // 读取 XML
    log('步骤 11: 读取生成的 XML')
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
    })

    fs.writeFileSync('test-results/auto-login-generated.xml', xml)
    log('✅ XML 已保存: test-results/auto-login-generated.xml\n')

    // 提取并验证
    const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    log('='.repeat(80))
    log('生成的 <para> 内容:')
    log('='.repeat(80))
    if (paraMatch) {
      log(paraMatch[0])
    } else {
      log('❌ 未找到 <para>')
    }
    log('='.repeat(80))

    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
    const hasS123 = /<s>\s*123\s*<\/s>/.test(xml)
    const has123 = xml.includes('123')

    log('\n验证结果:')
    log(`  包含 "123": ${has123 ? '✅' : '❌'}`)
    log(`  包含 <s>123</s>: ${hasS123 ? '是 (未转换)' : '否'}`)
    log(`  包含 <delete>123</delete>: ${hasDelete123 ? '✅ 是' : '❌ 否'}`)

    log('\n' + '='.repeat(80))
    if (hasDelete123) {
      log('✅✅✅ 测试通过！删除线正确转换')
    } else {
      log('❌❌❌ 测试失败！')
      if (hasS123) {
        log('问题: <s> 标签未转换为 <delete>')
        log('原因: html2para 函数的转换逻辑未生效')
      } else if (!has123) {
        log('问题: 内容丢失')
      } else {
        log('问题: 转换结果不符合预期')
      }
    }
    log('='.repeat(80))

    log('\n浏览器保持打开 120 秒\n')
    await sleep(120000)

  } catch (error) {
    log('\n❌ 错误: ' + error.message)
    log(error.stack)
    await page.screenshot({ path: 'test-results/auto-login-error.png', fullPage: true })
    log('错误截图: test-results/auto-login-error.png')
  } finally {
    await browser.close()
    log('\n测试完成')
  }
}

autoLoginTest().catch(console.error)
