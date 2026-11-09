/**
 * 增强版诊断 - 详细分析页面结构
 */
const { test } = require('@playwright/test')

test.describe('上标预览深度诊断', () => {
  test.setTimeout(300000)

  test('深度分析页面并找到预览功能', async ({ page }) => {
    console.log('\n========== 等待服务器 ==========\n')

    // 快速检查服务器
    let ready = false
    for (let i = 0; i < 30; i++) {
      try {
        const res = await page.goto('http://localhost:3000/', { timeout: 2000 })
        if (res && res.ok()) {
          console.log('✅ 服务器就绪\n')
          ready = true
          break
        }
      } catch (e) {
        await page.waitForTimeout(1000)
      }
    }

    if (!ready) {
      console.log('❌ 服务器未启动\n')
      return
    }

    // 监听日志
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      logs.push(text)
      if (text.includes('🔍 [Preview Debug]')) {
        console.log(`\n[Console] ${text}`)
      }
    })

    console.log('========== 访问页面 ==========\n')

    const url = 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN'

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    console.log('✅ 页面加载完成\n')

    await page.waitForTimeout(5000)

    console.log('========== 分析页面结构 ==========\n')

    // 获取页面详细信息
    const pageInfo = await page.evaluate(() => {
      const result = {
        title: document.title,
        buttons: [],
        tabs: [],
        modals: [],
        iframes: [],
        textContent: document.body.textContent.substring(0, 500)
      }

      // 所有按钮
      document.querySelectorAll('button').forEach((btn, i) => {
        const text = btn.textContent.trim()
        const title = btn.getAttribute('title')
        const className = btn.className
        const visible = btn.offsetParent !== null

        if (text || title) {
          result.buttons.push({
            index: i,
            text: text.substring(0, 50),
            title: title,
            className: className.substring(0, 50),
            visible: visible
          })
        }
      })

      // 标签页
      document.querySelectorAll('.ant-tabs-tab').forEach(tab => {
        result.tabs.push(tab.textContent.trim())
      })

      // Modal
      document.querySelectorAll('.ant-modal').forEach(modal => {
        result.modals.push({
          visible: modal.style.display !== 'none',
          title: modal.querySelector('.ant-modal-title')?.textContent
        })
      })

      // iframe
      document.querySelectorAll('iframe').forEach(iframe => {
        result.iframes.push({
          id: iframe.id,
          src: iframe.src.substring(0, 100)
        })
      })

      return result
    })

    console.log('页面信息:')
    console.log(`  标题: ${pageInfo.title}`)
    console.log(`  按钮数量: ${pageInfo.buttons.length}`)
    console.log(`  标签页: ${pageInfo.tabs.join(', ')}`)
    console.log(`  iframe数量: ${pageInfo.iframes.length}`)

    // 列出所有按钮
    console.log('\n所有按钮:')
    pageInfo.buttons.forEach((btn, i) => {
      if (i < 30) { // 只显示前30个
        const status = btn.visible ? '✓' : '✗'
        console.log(`  ${status} [${i}] "${btn.text}" ${btn.title ? `(${btn.title})` : ''}`)
      }
    })

    // 查找预览相关按钮
    const previewButtons = pageInfo.buttons.filter(btn =>
      (btn.text && btn.text.includes('预览')) ||
      (btn.title && btn.title.includes('预览')) ||
      (btn.text && btn.text.includes('Preview'))
    )

    console.log(`\n找到 ${previewButtons.length} 个预览相关按钮:`)
    previewButtons.forEach(btn => {
      console.log(`  [${btn.index}] "${btn.text}" visible=${btn.visible}`)
    })

    await page.screenshot({ path: 'test-results/page-analysis.png', fullPage: true })
    console.log('\n✅ 全页截图: page-analysis.png')

    // 尝试点击预览按钮
    if (previewButtons.length > 0) {
      console.log('\n========== 尝试点击预览按钮 ==========\n')

      for (const btn of previewButtons) {
        try {
          console.log(`尝试点击按钮 [${btn.index}]: "${btn.text}"`)

          await page.locator('button').nth(btn.index).click()
          console.log('✅ 点击成功')

          await page.waitForTimeout(3000)

          // 检查是否有modal打开
          const modalVisible = await page.locator('.ant-modal').isVisible().catch(() => false)

          if (modalVisible) {
            console.log('✅ Modal已打开！')
            await page.screenshot({ path: 'test-results/modal-opened.png' })
            break
          } else {
            console.log('⚠️ Modal未打开，尝试下一个按钮')
          }
        } catch (e) {
          console.log(`❌ 点击失败: ${e.message}`)
        }
      }
    }

    console.log('\n========== 检查调试日志 ==========\n')

    const debugLogs = logs.filter(log => log.includes('🔍 [Preview Debug]'))

    if (debugLogs.length > 0) {
      console.log(`✅ 捕获到 ${debugLogs.length} 条调试日志:\n`)
      debugLogs.forEach(log => console.log(`  ${log}`))

      const hasSuperScript = debugLogs.some(log => log.includes('是否包含<superScript>标签: true'))
      const hasSup = debugLogs.some(log => log.includes('转换后是否包含<sup>: true'))

      console.log('\n📊 结果:')
      console.log(`  后端返回<superScript>: ${hasSuperScript ? '✅' : '❌'}`)
      console.log(`  转换后有<sup>: ${hasSup ? '✅' : '❌'}`)

      if (hasSuperScript && hasSup) {
        console.log('\n✅✅✅ 转换成功！修复有效！')
      }
    } else {
      console.log('❌ 未捕获到调试日志')

      // 显示所有console日志
      console.log('\n所有console日志（前20条）:')
      logs.slice(0, 20).forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.substring(0, 100)}`)
      })
    }

    console.log('\n========== 诊断完成 ==========\n')

    await page.waitForTimeout(3000)
  })
})
