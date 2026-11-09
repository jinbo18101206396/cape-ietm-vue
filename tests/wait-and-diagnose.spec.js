/**
 * 等待服务器就绪后运行上标预览诊断
 */

const { test, expect } = require('@playwright/test')

test.describe('上标预览问题诊断（等待服务器就绪）', () => {
  test.setTimeout(300000) // 5分钟超时

  test('等待服务器启动并诊断问题', async ({ page }) => {
    console.log('\n========== 等待服务器就绪 ==========')

    const maxRetries = 60 // 最多等待60次 = 2分钟
    let serverReady = false

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await page.goto('http://localhost:3000/', {
          waitUntil: 'domcontentloaded',
          timeout: 2000
        })

        if (response && response.ok()) {
          console.log(`✅ 服务器已就绪 (尝试 ${i + 1}/${maxRetries})`)
          serverReady = true
          break
        }
      } catch (error) {
        console.log(`⏳ 等待服务器启动... (${i + 1}/${maxRetries})`)
        await page.waitForTimeout(2000)
      }
    }

    if (!serverReady) {
      console.log('❌ 服务器在2分钟内未能启动')
      return
    }

    // 收集控制台日志
    const consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push({ type: msg.type(), text: text })

      // 实时打印关键日志
      if (text.includes('🔍 [Preview Debug]')) {
        console.log(`\n[Console] ${text}`)
      }
    })

    console.log('\n========== 步骤1：访问DM内容编辑器 ==========')

    const url = 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN'
    console.log(`访问: ${url}`)

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    console.log('✅ 页面加载成功')

    await page.waitForTimeout(3000)

    console.log('\n========== 步骤2：查找并进入Para设计视图 ==========')

    // 等待页面完全加载
    await page.waitForLoadState('domcontentloaded')

    // 截图当前页面状态
    await page.screenshot({ path: 'test-results/step1-page-loaded.png', fullPage: false })
    console.log('✅ 截图: step1-page-loaded.png')

    // 尝试查找"设计视图"标签或按钮
    try {
      const designViewTab = page.locator('text=/设计视图|源码视图/').first()
      if (await designViewTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 找到设计/源码视图切换')

        // 确保在设计视图
        const activeTab = await page.locator('.ant-tabs-tab-active').textContent().catch(() => '')
        console.log(`当前标签: ${activeTab}`)

        if (activeTab.includes('源码')) {
          const designTab = page.locator('text=设计视图').first()
          await designTab.click()
          console.log('✅ 切换到设计视图')
          await page.waitForTimeout(1000)
        }
      }
    } catch (e) {
      console.log('⚠️ 未找到视图切换标签')
    }

    console.log('\n========== 步骤3：在编辑器中输入上标 ==========')

    // 查找UEditor iframe
    const iframes = page.frameLocator('iframe')
    let editorFound = false

    try {
      // 尝试定位编辑器body
      const editorBody = iframes.first().locator('body[contenteditable="true"], body').first()

      if (await editorBody.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 找到编辑器')
        editorFound = true

        // 清空并输入内容
        await editorBody.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Delete')

        // 输入 "1"
        await editorBody.type('1', { delay: 100 })
        console.log('✅ 输入: 1')

        await page.waitForTimeout(500)

        // 查找并点击上标按钮
        const supButtons = [
          'div[title="上标"]',
          'a[title="上标"]',
          '.edui-button[title="上标"]',
          '[title*="上标"]'
        ]

        let supClicked = false
        for (const selector of supButtons) {
          try {
            const btn = page.locator(selector).first()
            if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await btn.click()
              console.log(`✅ 点击上标按钮: ${selector}`)
              supClicked = true
              break
            }
          } catch (e) {
            // 继续尝试
          }
        }

        if (!supClicked) {
          console.log('⚠️ 未找到上标按钮，尝试快捷键')
        }

        await page.waitForTimeout(300)

        // 输入 "2"
        await editorBody.type('2', { delay: 100 })
        console.log('✅ 输入: 2')

        await page.waitForTimeout(1000)

        // 截图编辑状态
        await page.screenshot({ path: 'test-results/step2-editor-content.png' })
        console.log('✅ 截图: step2-editor-content.png')
      }
    } catch (error) {
      console.log('❌ 编辑器操作失败:', error.message)
    }

    if (!editorFound) {
      console.log('❌ 未找到编辑器，终止测试')
      await page.screenshot({ path: 'test-results/error-no-editor.png', fullPage: true })
      return
    }

    console.log('\n========== 步骤4：保存内容 ==========')

    try {
      const saveButton = page.locator('button').filter({ hasText: /^保存$/ }).first()
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click()
        console.log('✅ 点击保存按钮')
        await page.waitForTimeout(2000)
      }
    } catch (e) {
      console.log('⚠️ 保存操作可能失败:', e.message)
    }

    console.log('\n========== 步骤5：点击预览按钮并捕获日志 ==========')

    try {
      const previewButton = page.locator('button').filter({ hasText: /预览/ }).first()
      if (await previewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ 找到预览按钮')

        await previewButton.click()
        console.log('✅ 点击预览按钮')

        // 等待预览弹框和日志输出
        await page.waitForTimeout(3000)

        // 截图预览状态
        await page.screenshot({ path: 'test-results/step3-preview-modal.png', fullPage: false })
        console.log('✅ 截图: step3-preview-modal.png')
      }
    } catch (e) {
      console.log('❌ 预览操作失败:', e.message)
    }

    console.log('\n========== 步骤6：分析Console日志 ==========')

    const debugLogs = consoleLogs.filter(log =>
      log.text.includes('🔍') ||
      log.text.includes('Preview Debug') ||
      log.text.includes('superScript') ||
      log.text.includes('<sup>')
    )

    console.log(`\n找到 ${debugLogs.length} 条调试日志：\n`)

    if (debugLogs.length > 0) {
      debugLogs.forEach((log, i) => {
        console.log(`[${i + 1}] ${log.text}`)
      })

      // 分析结果
      const hasSuperScriptTag = debugLogs.some(log => log.text.includes('是否包含<superScript>标签: true'))
      const hasSupAfterConversion = debugLogs.some(log => log.text.includes('转换后是否包含<sup>: true'))

      console.log('\n========== 🎯 诊断结果 ==========\n')

      if (hasSuperScriptTag && hasSupAfterConversion) {
        console.log('✅ 标签转换成功！')
        console.log('   后端返回了<superScript>标签')
        console.log('   前端成功转换为<sup>标签')
        console.log('\n   问题可能在于:')
        console.log('   1. CSS样式未正确应用')
        console.log('   2. <sup>标签在后续步骤被修改')
        console.log('   3. iframe渲染问题')
      } else if (hasSuperScriptTag && !hasSupAfterConversion) {
        console.log('❌ 标签转换失败！')
        console.log('   后端返回了<superScript>标签')
        console.log('   但前端转换没有生成<sup>标签')
        console.log('\n   可能原因:')
        console.log('   1. replace()正则不匹配（如标签有属性）')
        console.log('   2. body变量被后续代码覆盖')
      } else if (!hasSuperScriptTag) {
        console.log('⚠️ 后端未返回<superScript>标签')
        console.log('   可能原因:')
        console.log('   1. 内容未正确保存到数据库')
        console.log('   2. 后端XSLT已经转换过了')
        console.log('   3. 保存时转换逻辑有问题')
      }
    } else {
      console.log('❌ 未检测到任何调试日志')
      console.log('   可能原因:')
      console.log('   1. 调试代码未生效（前端未重新编译）')
      console.log('   2. 预览弹框未成功打开')
      console.log('   3. show()方法未被调用')
    }

    console.log('\n========== 步骤7：检查预览iframe内容 ==========')

    try {
      const modal = page.locator('.ant-modal').filter({ hasText: 'DM内容预览' })
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        const iframe = modal.locator('iframe').first()
        const frameContent = await iframe.contentFrame()

        if (frameContent) {
          const bodyHTML = await frameContent.locator('body').innerHTML()
          console.log('\niframe内容（前300字符）:')
          console.log(bodyHTML.substring(0, 300))

          const hasSupInDOM = bodyHTML.includes('<sup>')
          const hasSuperScriptInDOM = bodyHTML.includes('<superScript>')

          console.log(`\n📊 DOM分析:`)
          console.log(`  包含<sup>: ${hasSupInDOM ? '✅' : '❌'}`)
          console.log(`  包含<superScript>: ${hasSuperScriptInDOM ? '✅' : '❌'}`)

          if (hasSupInDOM) {
            const supElements = await frameContent.locator('sup').count()
            console.log(`  <sup>标签数量: ${supElements}`)
          }
        }
      }
    } catch (e) {
      console.log('⚠️ 无法检查iframe内容:', e.message)
    }

    console.log('\n========== 诊断完成 ==========\n')
    console.log('请查看以上输出和截图文件。')

    // 保持页面打开以便查看
    await page.waitForTimeout(5000)
  })
})
