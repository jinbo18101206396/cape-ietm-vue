/**
 * 上标预览问题 - 实时诊断测试
 * 目的：自动重现问题并捕获调试日志
 */

const { test, expect } = require('@playwright/test')

test.describe('上标预览问题实时诊断', () => {
  test.setTimeout(120000) // 2分钟超时

  test('诊断上标预览显示问题', async ({ page }) => {
    // 收集控制台日志
    const consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push({
        type: msg.type(),
        text: text
      })
      // 实时打印调试日志
      if (text.includes('🔍 [Preview Debug]') || text.includes('Preview') || text.includes('superScript')) {
        console.log(`[Console ${msg.type()}] ${text}`)
      }
    })

    // 捕获错误
    page.on('pageerror', error => {
      console.error(`[Page Error] ${error.message}`)
    })

    console.log('\n========== 步骤1：访问DM内容编辑器 ==========')

    // 访问指定的DM编辑页面
    const url = 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN'
    console.log(`访问URL: ${url}`)

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
      console.log('✅ 页面加载成功')
    } catch (error) {
      console.error('❌ 页面加载失败:', error.message)
      console.log('尝试等待页面元素...')
    }

    // 等待页面加载
    await page.waitForTimeout(3000)

    console.log('\n========== 步骤2：查找Para设计器 ==========')

    // 尝试多种选择器查找Para设计器
    const selectors = [
      'button:has-text("设计视图")',
      'button:has-text("段落")',
      '[data-testid="para-designer"]',
      '.para-designer',
      'button[title*="para"]',
      'button[title*="段落"]'
    ]

    let designerButton = null
    for (const selector of selectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          console.log(`✅ 找到设计器入口: ${selector}`)
          designerButton = element
          break
        }
      } catch (e) {
        // 继续尝试
      }
    }

    if (!designerButton) {
      console.log('⚠️ 未找到设计器按钮，尝试查找页面中的所有按钮...')
      const buttons = await page.$$('button')
      console.log(`找到 ${buttons.length} 个按钮`)

      for (let i = 0; i < Math.min(buttons.length, 20); i++) {
        const text = await buttons[i].textContent()
        const title = await buttons[i].getAttribute('title')
        console.log(`  按钮${i}: text="${text}" title="${title}"`)
      }
    }

    console.log('\n========== 步骤3：查找并点击"段落"设计器 ==========')

    // 尝试找到并点击段落相关的元素
    try {
      // 方案1：查找包含"段落"或"para"的按钮
      const paraButton = await page.locator('button').filter({ hasText: /段落|para/i }).first()
      if (await paraButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 找到段落按钮')
        await paraButton.click()
        await page.waitForTimeout(2000)
      }
    } catch (e) {
      console.log('⚠️ 未能点击段落按钮:', e.message)
    }

    console.log('\n========== 步骤4：查找UEditor编辑器 ==========')

    // 查找UEditor编辑器
    const editorSelectors = [
      '.edui-editor',
      '.ueditor-container',
      'iframe[id*="ueditor"]',
      '#ueditor_0',
      '.edui-body-container'
    ]

    let editorFound = false
    for (const selector of editorSelectors) {
      const element = await page.$(selector)
      if (element) {
        console.log(`✅ 找到编辑器: ${selector}`)
        editorFound = true
        break
      }
    }

    if (!editorFound) {
      console.log('⚠️ 未找到UEditor编辑器')
      console.log('尝试截图保存当前页面状态...')
      await page.screenshot({ path: 'test-results/diagnose-page-state.png', fullPage: true })
      console.log('✅ 截图已保存: test-results/diagnose-page-state.png')
    }

    console.log('\n========== 步骤5：输入测试内容（上标） ==========')

    try {
      // 查找UEditor的iframe
      const editorFrame = page.frameLocator('iframe[id*="ueditor"]').first()
      const editorBody = editorFrame.locator('body')

      if (await editorBody.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 找到编辑器内容区域')

        // 清空内容
        await editorBody.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Delete')

        // 输入 "1"
        await editorBody.type('1')
        console.log('✅ 输入: 1')

        // 点击上标按钮
        const supButton = page.locator('button[title*="上标"], button[title*="superscript"], .edui-button[title*="上标"]').first()
        if (await supButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await supButton.click()
          console.log('✅ 点击上标按钮')
        } else {
          console.log('⚠️ 未找到上标按钮，尝试使用快捷键')
          await page.keyboard.press('Control+Shift+Equal')
        }

        // 输入 "2"
        await editorBody.type('2')
        console.log('✅ 输入: 2')

        await page.waitForTimeout(1000)
      } else {
        console.log('❌ 编辑器内容区域不可见')
      }
    } catch (error) {
      console.log('❌ 输入内容时出错:', error.message)
    }

    console.log('\n========== 步骤6：保存内容 ==========')

    try {
      const saveButton = page.locator('button:has-text("保存"), button[title*="保存"]').first()
      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click()
        console.log('✅ 点击保存按钮')
        await page.waitForTimeout(2000)
      } else {
        console.log('⚠️ 未找到保存按钮')
      }
    } catch (error) {
      console.log('❌ 保存时出错:', error.message)
    }

    console.log('\n========== 步骤7：点击预览按钮 ==========')

    try {
      const previewButton = page.locator('button:has-text("预览"), button[title*="预览"]').first()
      if (await previewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 找到预览按钮，准备点击...')

        // 等待一下确保保存完成
        await page.waitForTimeout(1000)

        await previewButton.click()
        console.log('✅ 点击预览按钮')

        // 等待预览弹框出现
        await page.waitForTimeout(2000)
      } else {
        console.log('⚠️ 未找到预览按钮')
      }
    } catch (error) {
      console.log('❌ 点击预览时出错:', error.message)
    }

    console.log('\n========== 步骤8：分析Console日志 ==========')

    // 过滤出调试相关的日志
    const debugLogs = consoleLogs.filter(log =>
      log.text.includes('🔍') ||
      log.text.includes('Preview') ||
      log.text.includes('superScript') ||
      log.text.includes('<sup>')
    )

    console.log(`\n找到 ${debugLogs.length} 条相关日志：`)
    debugLogs.forEach((log, i) => {
      console.log(`[${i + 1}] [${log.type}] ${log.text}`)
    })

    // 检查是否有我们的调试日志
    const hasDebugLogs = debugLogs.some(log => log.text.includes('🔍 [Preview Debug]'))

    if (hasDebugLogs) {
      console.log('\n✅ 检测到调试日志，说明代码已生效')

      // 分析日志内容
      const hasSuperScript = debugLogs.some(log => log.text.includes('是否包含<superScript>标签: true'))
      const hasSup = debugLogs.some(log => log.text.includes('转换后是否包含<sup>: true'))

      console.log('\n📊 日志分析结果：')
      console.log(`  - 后端返回包含<superScript>: ${hasSuperScript ? '✅ 是' : '❌ 否'}`)
      console.log(`  - 转换后包含<sup>: ${hasSup ? '✅ 是' : '❌ 否'}`)

      if (hasSuperScript && hasSup) {
        console.log('\n✅ 标签转换成功！问题可能在：')
        console.log('  1. CSS样式未生效')
        console.log('  2. iframe渲染问题')
        console.log('  3. 标签被后续代码修改')
      } else if (hasSuperScript && !hasSup) {
        console.log('\n❌ 标签转换失败！可能原因：')
        console.log('  1. 正则表达式不匹配')
        console.log('  2. body变量被覆盖')
      } else if (!hasSuperScript) {
        console.log('\n⚠️ 后端返回的HTML不包含<superScript>标签')
        console.log('  可能后端已转换，或者内容未正确保存')
      }
    } else {
      console.log('\n❌ 未检测到调试日志，说明：')
      console.log('  1. 前端代码未重新编译')
      console.log('  2. 预览弹框未打开')
      console.log('  3. 代码路径未执行')
    }

    console.log('\n========== 步骤9：检查预览弹框内容 ==========')

    try {
      // 查找预览弹框中的iframe
      const previewModal = page.locator('.ant-modal:has-text("DM内容预览")')
      if (await previewModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 找到预览弹框')

        const previewIframe = previewModal.locator('iframe').first()
        if (await previewIframe.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✅ 找到预览iframe')

          // 获取iframe内容
          const frameContent = await previewIframe.contentFrame()
          if (frameContent) {
            const bodyHTML = await frameContent.locator('body').innerHTML()
            console.log('\n预览iframe的HTML内容（前500字符）:')
            console.log(bodyHTML.substring(0, 500))

            // 检查是否包含上标标签
            const hasSupTag = bodyHTML.includes('<sup>')
            const hasSuperScriptTag = bodyHTML.includes('<superScript>')

            console.log('\n📊 iframe内容分析：')
            console.log(`  - 包含<sup>标签: ${hasSupTag ? '✅ 是' : '❌ 否'}`)
            console.log(`  - 包含<superScript>标签: ${hasSuperScriptTag ? '✅ 是' : '❌ 否'}`)

            if (hasSupTag) {
              // 检查sup标签的样式
              const supElement = await frameContent.locator('sup').first()
              if (await supElement.isVisible().catch(() => false)) {
                const computedStyle = await supElement.evaluate(el => {
                  const style = window.getComputedStyle(el)
                  return {
                    verticalAlign: style.verticalAlign,
                    fontSize: style.fontSize,
                    display: style.display
                  }
                })
                console.log('\n<sup>标签的CSS样式:')
                console.log(JSON.stringify(computedStyle, null, 2))
              }
            }

            // 截图保存预览状态
            await page.screenshot({ path: 'test-results/diagnose-preview-state.png', fullPage: true })
            console.log('\n✅ 预览截图已保存: test-results/diagnose-preview-state.png')
          }
        } else {
          console.log('❌ 未找到预览iframe')
        }
      } else {
        console.log('❌ 未找到预览弹框')
      }
    } catch (error) {
      console.log('❌ 检查预览内容时出错:', error.message)
    }

    console.log('\n========== 诊断完成 ==========')
    console.log('\n请检查以上输出和截图文件以确定问题原因。')

    // 保持页面打开一段时间以便查看
    await page.waitForTimeout(3000)
  })
})
