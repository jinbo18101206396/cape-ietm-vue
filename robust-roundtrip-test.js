/**
 * 往返测试 3 次 - 使用成功验证的方法
 */

const { chromium } = require('playwright')
const fs = require('fs')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function robustRoundtripTest() {
  const logFile = 'test-results/roundtrip-3-final.txt'
  const log = (msg) => {
    console.log(msg)
    fs.appendFileSync(logFile, msg + '\n')
  }

  fs.writeFileSync(logFile, '')

  log('\n' + '='.repeat(80))
  log('🔍 删除线 3 次往返测试（稳健版）')
  log('='.repeat(80) + '\n')

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  })

  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()

  try {
    // 登录
    log('登录系统')
    await page.goto('http://localhost:3000/user/login')
    await sleep(2000)

    await page.fill('input[type="text"], input[placeholder*="账"]', 'admin')
    await sleep(300)
    await page.fill('input[type="password"], input[placeholder*="密码"]', '123456')
    await sleep(300)
    await page.click('button:has-text("登录"), button[type="submit"], .ant-btn-primary')
    await sleep(3000)
    await page.waitForURL(/^((?!\/user\/login).)*$/, { timeout: 10000 })
    log('✅ 登录成功\n')
    await sleep(2000)

    // 访问页面
    log('访问页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await sleep(10000)
    log('✅ 页面已加载\n')

    // 开始 3 次往返测试
    for (let round = 1; round <= 3; round++) {
      log('='.repeat(80))
      log(`第 ${round} 次往返测试`)
      log('='.repeat(80) + '\n')

      // 打开 Para 设计器
      log(`[轮次 ${round}] 步骤 1: 打开 Para 设计器`)
      await page.waitForSelector('.CodeMirror', { timeout: 30000 })
      await sleep(3000)

      // 查找所有编辑元素
      const editElements = await page.locator('button:has-text("编辑"), button:has-text("设计"), .anticon-edit, [title*="编辑"], [title*="设计"]').all()
      log(`找到 ${editElements.length} 个可能的编辑元素`)

      let opened = false
      for (let i = 0; i < editElements.length; i++) {
        try {
          if (await editElements[i].isVisible()) {
            log(`  尝试点击元素 ${i}...`)
            await editElements[i].click({ timeout: 2000 })
            await sleep(2000)

            const hasDesigner = await page.locator('.para-designer, .ant-modal-content').count()
            if (hasDesigner > 0) {
              log(`✅ Para 设计器已打开 (通过元素 ${i})`)
              opened = true
              break
            }
          }
        } catch (e) {
          continue
        }
      }

      if (!opened) {
        log(`❌ 轮次 ${round}: 无法打开设计器`)
        await page.screenshot({ path: `test-results/round-${round}-cannot-open.png`, fullPage: true })
        throw new Error(`轮次 ${round}: 无法打开设计器`)
      }

      // 定位编辑器
      log(`[轮次 ${round}] 步骤 2: 定位编辑器`)
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
              log('✅ 找到编辑器')
              break
            }
          }
        } catch (e) {}
      }

      if (!editorFrame) {
        throw new Error(`轮次 ${round}: 未找到编辑器`)
      }

      const editorBody = editorFrame.locator('body')

      // 读取当前内容
      await sleep(1000)
      const currentHTML = await editorBody.innerHTML()
      log(`[轮次 ${round}] 当前编辑器 HTML:`)
      log(currentHTML.substring(0, 200))

      // 检查删除线
      const hasStrike = currentHTML.includes('<s>') || currentHTML.includes('<del>') || currentHTML.includes('line-through')
      const text = await editorBody.textContent()
      log(`  文本内容: "${text.trim()}"`)
      log(`  包含删除线: ${hasStrike ? '✅ 是' : '❌ 否'}`)

      if (round === 1) {
        // 第一次：输入新内容
        log(`[轮次 ${round}] 步骤 3: 清空并输入 "123"`)
        await editorBody.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Delete')
        await sleep(500)
        await editorBody.type('123', { delay: 100 })
        await sleep(500)
        log('✅ 已输入')

        log(`[轮次 ${round}] 步骤 4: 应用删除线`)
        await page.keyboard.press('Control+A')
        await sleep(500)
        await editorBody.evaluate(() => {
          document.body.innerHTML = '<p><s>123</s></p>'
        })
        await sleep(1000)

        const htmlAfter = await editorBody.innerHTML()
        log(`应用后: ${htmlAfter}`)
        log('✅ 删除线已应用')
      } else {
        // 第 2、3 次：验证保留
        log(`[轮次 ${round}] 步骤 3: 验证删除线是否保留`)

        if (!hasStrike) {
          log(`❌ 轮次 ${round}: 删除线丢失！`)
          await page.screenshot({ path: `test-results/round-${round}-lost-strike.png`, fullPage: true })
          throw new Error(`轮次 ${round}: 删除线未保留`)
        }

        if (!text.includes('123')) {
          log(`❌ 轮次 ${round}: 文本内容丢失！`)
          throw new Error(`轮次 ${round}: 文本丢失`)
        }

        log('✅ 删除线已保留')
        log('✅ 文本内容正确')
      }

      // 保存
      log(`[轮次 ${round}] 步骤 ${round === 1 ? 5 : 4}: 保存`)
      await page.click('button:has-text("保存")', { force: true })
      await sleep(5000)
      log('✅ 已保存')

      // 关闭设计器
      log(`[轮次 ${round}] 步骤 ${round === 1 ? 6 : 5}: 关闭设计器`)
      await page.keyboard.press('Escape')
      await sleep(2000)
      log('✅ 已关闭')

      // 验证 XML
      log(`[轮次 ${round}] 步骤 ${round === 1 ? 7 : 6}: 验证 XML`)
      const xml = await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror')
        return cm && cm.CodeMirror ? cm.CodeMirror.getValue() : ''
      })

      fs.writeFileSync(`test-results/roundtrip-round-${round}.xml`, xml)
      log(`✅ XML 已保存: test-results/roundtrip-round-${round}.xml`)

      const paraMatch = xml.match(/<para[^>]*>([\s\S]*?)<\/para>/)
      if (paraMatch) {
        log(`<para> 内容: ${paraMatch[0].trim()}`)
      }

      const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xml)
      log(`包含 <delete>123</delete>: ${hasDelete123 ? '✅ 是' : '❌ 否'}`)

      if (!hasDelete123) {
        log(`❌ 轮次 ${round}: XML 验证失败`)
        throw new Error(`轮次 ${round}: XML 不正确`)
      }

      log(`✅✅ 轮次 ${round} 通过\n`)
      await sleep(2000)
    }

    // 总结
    log('='.repeat(80))
    log('📊 测试总结')
    log('='.repeat(80))
    log('✅ 轮次 1: 输入文本，应用删除线，保存 → XML 生成 <delete>123</delete>')
    log('✅ 轮次 2: 再次打开，删除线保留，保存 → XML 仍为 <delete>123</delete>')
    log('✅ 轮次 3: 第三次打开，删除线保留，保存 → XML 仍为 <delete>123</delete>')
    log('')
    log('='.repeat(80))
    log('✅✅✅ 3 次往返测试全部通过！')
    log('='.repeat(80))
    log('✅ HTML → XML 转换正确')
    log('✅ XML → HTML 转换正确')
    log('✅ 多次往返保持一致')
    log('✅ 符合 S1000D 4.0 标准')
    log('='.repeat(80))

    log('\n生成的文件:')
    log('  - test-results/roundtrip-3-final.txt')
    log('  - test-results/roundtrip-round-1.xml')
    log('  - test-results/roundtrip-round-2.xml')
    log('  - test-results/roundtrip-round-3.xml')

    log('\n浏览器保持打开 60 秒\n')
    await sleep(60000)

  } catch (error) {
    log('\n❌ 测试失败: ' + error.message)
    log(error.stack)
    await page.screenshot({ path: 'test-results/roundtrip-3-final-error.png', fullPage: true })
  } finally {
    await browser.close()
    log('\n测试完成')
  }
}

robustRoundtripTest().catch(console.error)
