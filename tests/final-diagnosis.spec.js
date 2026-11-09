/**
 * 最终诊断测试 - 等待服务器并完成验证
 */
const { test } = require('@playwright/test')

test.describe('上标预览最终诊断', () => {
  test.setTimeout(300000) // 5分钟超时

  test('等待服务器并完成诊断', async ({ page }) => {
    console.log('\n========== 等待服务器启动 ==========\n')

    // 等待服务器就绪（最多等待3分钟）
    let serverReady = false
    const maxWait = 90 // 90次 * 2秒 = 3分钟

    for (let i = 0; i < maxWait; i++) {
      try {
        const response = await page.goto('http://localhost:3000/', {
          waitUntil: 'domcontentloaded',
          timeout: 2000
        })
        if (response && response.ok()) {
          console.log(`✅ 服务器已就绪 (第 ${i + 1} 次尝试)\n`)
          serverReady = true
          break
        }
      } catch (error) {
        if (i % 5 === 0) {
          console.log(`⏳ 等待服务器... (${i + 1}/${maxWait})`)
        }
        await page.waitForTimeout(2000)
      }
    }

    if (!serverReady) {
      console.log('❌ 服务器在3分钟内未启动\n')
      return
    }

    // 收集日志
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      logs.push(text)
      if (text.includes('🔍 [Preview Debug]')) {
        console.log(`[Console] ${text}`)
      }
    })

    console.log('========== 访问DM编辑器页面 ==========\n')

    const url = 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN'

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    console.log('✅ 页面加载完成\n')

    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/page-loaded.png' })

    console.log('========== 查找并点击预览按钮 ==========\n')

    // 查找预览按钮
    const previewButton = page.locator('button').filter({ hasText: /预览/ }).first()

    if (await previewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ 找到预览按钮')
      await previewButton.click()
      console.log('✅ 已点击预览\n')

      await page.waitForTimeout(3000)
      await page.screenshot({ path: 'test-results/preview-clicked.png' })
    } else {
      console.log('⚠️ 未找到预览按钮\n')
    }

    console.log('========== 分析日志 ==========\n')

    const debugLogs = logs.filter(log => log.includes('🔍 [Preview Debug]'))

    if (debugLogs.length > 0) {
      console.log(`✅ 捕获到 ${debugLogs.length} 条调试日志:\n`)
      debugLogs.forEach((log, i) => {
        console.log(`${i + 1}. ${log}`)
      })

      // 分析结果
      const hasSuperScript = debugLogs.some(log => log.includes('是否包含<superScript>标签: true'))
      const hasSup = debugLogs.some(log => log.includes('转换后是否包含<sup>: true'))

      console.log('\n📊 诊断结果:')
      console.log(`  后端返回<superScript>标签: ${hasSuperScript ? '✅' : '❌'}`)
      console.log(`  转换后包含<sup>标签: ${hasSup ? '✅' : '❌'}`)

      if (hasSuperScript && hasSup) {
        console.log('\n✅ 转换成功！问题可能在CSS或后续处理')
      } else if (hasSuperScript && !hasSup) {
        console.log('\n❌ 转换失败！replace()未生效')
      } else {
        console.log('\n⚠️ 后端未返回<superScript>标签')
      }
    } else {
      console.log('❌ 未捕获到调试日志')
      console.log('   原因: 代码未生效或预览未打开\n')
    }

    // 检查iframe
    console.log('\n========== 检查预览iframe ==========\n')

    try {
      const modal = page.locator('.ant-modal:has-text("DM内容预览")')
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('✅ 预览弹框已打开')

        const iframe = modal.locator('iframe').first()
        const frame = await iframe.contentFrame()

        if (frame) {
          const html = await frame.locator('body').innerHTML()
          console.log(`\niframe内容分析:`)
          console.log(`  长度: ${html.length}`)
          console.log(`  包含<sup>: ${html.includes('<sup>') ? '✅' : '❌'}`)
          console.log(`  包含<superScript>: ${html.includes('<superScript>') ? '✅' : '❌'}`)

          if (html.length < 800) {
            console.log(`\n完整内容:\n${html}`)
          }
        }
      } else {
        console.log('❌ 预览弹框未打开')
      }
    } catch (e) {
      console.log(`⚠️ iframe检查失败: ${e.message}`)
    }

    console.log('\n========== 诊断完成 ==========\n')

    await page.waitForTimeout(5000)
  })
})
