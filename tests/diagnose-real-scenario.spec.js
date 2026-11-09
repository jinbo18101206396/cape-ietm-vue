/**
 * 上标预览问题 - 针对具体DM页面的完整诊断
 * 页面: http://localhost:3000/ietm/dm-content-editor/2119611605359517698
 */

const { test, expect } = require('@playwright/test')

test.describe('上标预览实际场景诊断', () => {
  test.setTimeout(180000)

  test('在实际DM页面中诊断上标预览问题', async ({ page, context }) => {

    // 收集所有控制台日志
    const consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      const type = msg.type()
      consoleLogs.push({ type, text, timestamp: new Date().toISOString() })

      // 实时输出关键日志
      if (text.includes('🔍 [Preview Debug]') || text.includes('superScript') || text.includes('<sup>')) {
        console.log(`\n[${type.toUpperCase()}] ${text}`)
      }
    })

    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`)
    })

    console.log('\n========== 开始诊断 ==========\n')

    // 步骤1: 访问页面
    console.log('步骤1: 访问DM内容编辑器...')
    const url = 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN'

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    console.log('✅ 页面加载完成\n')
    await page.waitForTimeout(3000)

    // 步骤2: 截图并查看页面结构
    console.log('步骤2: 分析页面结构...')
    await page.screenshot({ path: 'test-results/dm-page-initial.png', fullPage: false })

    // 获取页面标题和主要元素
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasAntd: !!document.querySelector('.ant-layout'),
        hasEditor: !!document.querySelector('iframe[id*="ueditor"]'),
        tabs: Array.from(document.querySelectorAll('.ant-tabs-tab')).map(t => t.textContent.trim())
      }
    })

    console.log('页面信息:')
    console.log(`  标题: ${pageInfo.title}`)
    console.log(`  Ant Design: ${pageInfo.hasAntd ? '✅' : '❌'}`)
    console.log(`  UEditor: ${pageInfo.hasEditor ? '✅' : '❌'}`)
    console.log(`  标签页: ${pageInfo.tabs.join(', ')}\n`)

    // 步骤3: 查找预览按钮
    console.log('步骤3: 查找预览按钮...')

    const previewButtons = await page.locator('button').evaluateAll(buttons => {
      return buttons.map((btn, idx) => ({
        index: idx,
        text: btn.textContent.trim(),
        title: btn.getAttribute('title'),
        visible: btn.offsetParent !== null
      })).filter(b =>
        b.text.includes('预览') ||
        (b.title && b.title.includes('预览'))
      )
    })

    console.log(`找到 ${previewButtons.length} 个预览按钮:`)
    previewButtons.forEach(btn => {
      console.log(`  - "${btn.text}" ${btn.visible ? '(可见)' : '(隐藏)'}`)
    })

    if (previewButtons.length === 0) {
      console.log('❌ 未找到预览按钮\n')
      await page.screenshot({ path: 'test-results/dm-page-no-preview-button.png', fullPage: true })
      return
    }

    // 步骤4: 直接点击预览按钮（跳过编辑，测试现有内容）
    console.log('\n步骤4: 点击预览按钮（测试现有内容）...')

    try {
      // 尝试点击第一个可见的预览按钮
      await page.locator('button').filter({ hasText: '预览' }).first().click()
      console.log('✅ 已点击预览按钮\n')

      // 等待预览弹框
      await page.waitForTimeout(2000)

    } catch (error) {
      console.log(`❌ 点击预览失败: ${error.message}\n`)
    }

    // 步骤5: 检查预览弹框
    console.log('步骤5: 检查预览弹框...')

    const modalVisible = await page.locator('.ant-modal:has-text("DM内容预览")').isVisible().catch(() => false)

    if (modalVisible) {
      console.log('✅ 预览弹框已打开\n')
      await page.screenshot({ path: 'test-results/dm-preview-modal.png' })

      // 检查iframe
      const iframeVisible = await page.locator('.ant-modal:has-text("DM内容预览") iframe').isVisible().catch(() => false)

      if (iframeVisible) {
        console.log('✅ 预览iframe存在\n')

        // 获取iframe内容
        try {
          const iframe = page.frameLocator('.ant-modal:has-text("DM内容预览") iframe').first()
          const iframeBody = iframe.locator('body')

          const iframeContent = await iframeBody.innerHTML().catch(() => '')

          console.log('iframe内容分析:')
          console.log(`  长度: ${iframeContent.length} 字符`)
          console.log(`  包含<sup>标签: ${iframeContent.includes('<sup>') ? '✅' : '❌'}`)
          console.log(`  包含<superScript>标签: ${iframeContent.includes('<superScript>') ? '✅' : '❌'}`)

          if (iframeContent.length < 1000) {
            console.log('\niframe完整内容:')
            console.log(iframeContent)
          } else {
            console.log('\niframe内容（前500字符）:')
            console.log(iframeContent.substring(0, 500))
          }

        } catch (error) {
          console.log(`⚠️ 无法读取iframe内容: ${error.message}`)
        }
      } else {
        console.log('❌ 预览iframe不存在\n')
      }

    } else {
      console.log('❌ 预览弹框未打开\n')
    }

    // 步骤6: 分析控制台日志
    console.log('\n步骤6: 分析控制台日志...\n')

    const debugLogs = consoleLogs.filter(log =>
      log.text.includes('🔍 [Preview Debug]')
    )

    if (debugLogs.length > 0) {
      console.log(`✅ 找到 ${debugLogs.length} 条调试日志:\n`)
      debugLogs.forEach((log, i) => {
        console.log(`${i + 1}. ${log.text}`)
      })

      // 详细分析
      const analysis = {
        hasSuperScript: debugLogs.some(log => log.text.includes('是否包含<superScript>标签: true')),
        hasSup: debugLogs.some(log => log.text.includes('转换后是否包含<sup>: true')),
        originalHTML: debugLogs.find(log => log.text.includes('后端返回的原始HTML'))?.text
      }

      console.log('\n📊 日志分析结果:')
      console.log(`  后端返回<superScript>: ${analysis.hasSuperScript ? '✅ 是' : '❌ 否'}`)
      console.log(`  转换后有<sup>: ${analysis.hasSup ? '✅ 是' : '❌ 否'}`)

      if (analysis.hasSuperScript && analysis.hasSup) {
        console.log('\n✅ 转换逻辑正常！')
        console.log('   问题可能在CSS渲染或iframe加载')
      } else if (analysis.hasSuperScript && !analysis.hasSup) {
        console.log('\n❌ 转换失败！')
        console.log('   replace()没有生效')
      } else if (!analysis.hasSuperScript) {
        console.log('\n⚠️ 后端没有返回<superScript>标签')
        console.log('   可能后端已转换，或内容不包含上标')
      }

    } else {
      console.log('❌ 未找到调试日志')
      console.log('   说明 DmPreviewModal.vue 的代码未执行')
      console.log('   可能原因:')
      console.log('   1. 前端代码未重新编译')
      console.log('   2. 浏览器缓存了旧代码')
      console.log('   3. show()方法未被调用')
    }

    // 步骤7: 查看所有console日志
    console.log('\n步骤7: 所有相关日志:\n')
    const relevantLogs = consoleLogs.filter(log =>
      log.text.includes('Preview') ||
      log.text.includes('superScript') ||
      log.text.includes('modal') ||
      log.text.toLowerCase().includes('show')
    )

    if (relevantLogs.length > 0) {
      console.log(`找到 ${relevantLogs.length} 条相关日志:`)
      relevantLogs.slice(0, 20).forEach((log, i) => {
        console.log(`  ${i + 1}. [${log.type}] ${log.text}`)
      })
    } else {
      console.log('未找到相关日志')
    }

    // 最终总结
    console.log('\n========== 诊断总结 ==========\n')

    const hasDebugCode = debugLogs.length > 0
    const modalOpened = modalVisible

    if (hasDebugCode && modalOpened) {
      console.log('✅ 调试代码已生效，预览已打开')
      console.log('   请查看上述日志分析确定具体问题')
    } else if (!hasDebugCode && modalOpened) {
      console.log('⚠️ 预览已打开，但调试代码未执行')
      console.log('   需要重新编译前端代码')
    } else if (!modalOpened) {
      console.log('❌ 预览未能打开')
      console.log('   无法进行进一步诊断')
    }

    console.log('\n截图文件已保存到 test-results/ 目录')
    console.log('========== 诊断完成 ==========\n')

    // 保持浏览器打开
    await page.waitForTimeout(5000)
  })
})
