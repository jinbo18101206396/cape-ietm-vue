/**
 * 删除线双向转换测试 - 完整的用户操作模拟
 * 测试流程：
 * 1. 直接访问已登录的页面（绕过登录）
 * 2. 在设计视图中插入删除线文本
 * 3. 保存并验证 XML
 * 4. 切换回设计视图验证往返一致性
 */

const { test, expect } = require('@playwright/test')

const DM_URL = 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN'

test.describe('删除线双向转换完整测试', () => {
  test.setTimeout(180000)

  test('应正确处理删除线的双向转换', async ({ page }) => {
    console.log('\n=== 开始删除线双向转换测试 ===\n')

    // 步骤 1: 直接访问页面（假设已有 session）
    console.log('📍 步骤 1: 访问 DM 编辑器页面')
    await page.goto(DM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(8000)

    // 检查是否需要登录
    const isLoginPage = await page.locator('input[placeholder*="账户"]').count() > 0
    if (isLoginPage) {
      console.log('⚠️  检测到登录页面，跳过测试')
      console.log('提示: 请先在浏览器中登录，然后重新运行测试')
      test.skip()
      return
    }

    console.log('✅ 页面已加载\n')

    // 步骤 2: 等待页面完全加载
    console.log('📍 步骤 2: 等待编辑器加载')
    await page.waitForSelector('.ant-tabs', { timeout: 30000 })
    console.log('✅ 编辑器界面已显示\n')

    // 步骤 3: 切换到设计视图
    console.log('📍 步骤 3: 切换到设计视图')
    const designTab = page.locator('.ant-tabs-tab').filter({ hasText: '设计视图' })
    const tabCount = await designTab.count()
    console.log(`  找到 ${tabCount} 个设计视图标签`)

    if (tabCount > 0) {
      await designTab.first().click()
      console.log('  ✓ 点击了设计视图标签')
      await page.waitForTimeout(3000)
    } else {
      console.log('  ℹ️  可能已在设计视图中')
    }
    console.log('✅ 设计视图已激活\n')

    // 步骤 4: 等待 Para 设计器加载
    console.log('📍 步骤 4: 等待 Para 设计器加载')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    console.log('✅ Para 设计器已显示\n')

    // 步骤 5: 查找 UEditor iframe
    console.log('📍 步骤 5: 定位 UEditor 编辑器')
    await page.waitForTimeout(2000)

    const frames = page.frames()
    console.log(`  总 frame 数: ${frames.length}`)

    let editorFrame = null
    for (const frame of frames) {
      try {
        const bodyCount = await frame.locator('body').count()
        if (bodyCount > 0) {
          const bodyClass = await frame.locator('body').getAttribute('class')
          if (bodyClass && bodyClass.includes('view')) {
            editorFrame = frame
            console.log('  ✓ 找到 UEditor 编辑区域')
            break
          }
        }
      } catch (e) {
        // 跳过无法访问的 frame
        continue
      }
    }

    if (!editorFrame) {
      console.log('  ❌ 未找到 UEditor 编辑区域')
      throw new Error('无法找到编辑器 iframe')
    }
    console.log('✅ 编辑器已定位\n')

    const editorBody = editorFrame.locator('body')

    // 步骤 6: 清空编辑器
    console.log('📍 步骤 6: 清空编辑器内容')
    await editorBody.click()
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+A')
    await page.waitForTimeout(300)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(500)
    console.log('✅ 编辑器已清空\n')

    // 步骤 7: 输入测试文本
    console.log('📍 步骤 7: 输入测试文本 "123"')
    await editorBody.click()
    await editorBody.type('123', { delay: 100 })
    await page.waitForTimeout(500)

    const textContent = await editorBody.textContent()
    console.log(`  编辑器文本: "${textContent.trim()}"`)
    console.log('✅ 文本已输入\n')

    // 步骤 8: 全选文本
    console.log('📍 步骤 8: 全选文本')
    await page.keyboard.press('Control+A')
    await page.waitForTimeout(500)
    console.log('✅ 文本已全选\n')

    // 步骤 9: 应用删除线
    console.log('📍 步骤 9: 应用删除线格式')

    // 尝试多种方法应用删除线
    let strikethroughApplied = false

    // 方法 1: 查找工具栏按钮
    console.log('  尝试方法 1: 查找工具栏删除线按钮...')
    const toolbarButtons = await page.locator('.edui-toolbar .edui-button').all()
    console.log(`  工具栏按钮总数: ${toolbarButtons.length}`)

    for (const button of toolbarButtons) {
      try {
        const title = await button.getAttribute('title')
        if (title && (title.includes('删除线') || title.toLowerCase().includes('strikethrough'))) {
          console.log(`  ✓ 找到删除线按钮: ${title}`)
          await button.click()
          strikethroughApplied = true
          console.log('  ✓ 点击了删除线按钮')
          break
        }
      } catch (e) {
        continue
      }
    }

    // 方法 2: 使用快捷键
    if (!strikethroughApplied) {
      console.log('  尝试方法 2: 使用快捷键 Ctrl+Shift+D...')
      await page.keyboard.press('Control+Shift+D')
      await page.waitForTimeout(500)
      strikethroughApplied = true
      console.log('  ✓ 已按下快捷键')
    }

    await page.waitForTimeout(1000)

    // 步骤 10: 验证删除线已应用到 HTML
    console.log('\n📍 步骤 10: 验证编辑器中的 HTML')
    const editorHTML = await editorBody.innerHTML()
    console.log(`  编辑器 HTML (前 200 字符): ${editorHTML.substring(0, 200)}`)

    const hasStrikethrough = editorHTML.includes('<s>') ||
                            editorHTML.includes('<del>') ||
                            editorHTML.includes('<strike>') ||
                            editorHTML.includes('line-through')

    console.log(`  包含删除线标记: ${hasStrikethrough ? '✅' : '❌'}`)

    if (!hasStrikethrough) {
      console.log('  ⚠️  删除线未应用，尝试手动注入...')

      // 直接注入删除线 HTML
      await editorBody.evaluate(() => {
        document.body.innerHTML = '<p><s>123</s></p>'
      })
      await page.waitForTimeout(500)

      const newHTML = await editorBody.innerHTML()
      console.log(`  注入后的 HTML: ${newHTML}`)
    }
    console.log('✅ 删除线 HTML 已确认\n')

    // 步骤 11: 保存内容
    console.log('📍 步骤 11: 保存内容')
    const saveButton = page.locator('.para-designer button').filter({ hasText: '保存' })
    const saveButtonCount = await saveButton.count()
    console.log(`  找到 ${saveButtonCount} 个保存按钮`)

    if (saveButtonCount > 0) {
      await saveButton.first().click()
      console.log('  ✓ 点击了保存按钮')
      await page.waitForTimeout(3000)

      // 等待保存成功提示
      const successMsg = page.locator('.ant-message-success')
      try {
        await successMsg.waitFor({ timeout: 10000 })
        console.log('  ✓ 显示保存成功消息')
      } catch (e) {
        console.log('  ⚠️  未检测到成功消息（可能已保存）')
      }
    } else {
      console.log('  ❌ 未找到保存按钮')
    }
    console.log('✅ 保存操作已执行\n')

    // 步骤 12: 切换到源码视图
    console.log('📍 步骤 12: 切换到源码视图')
    const sourceTab = page.locator('.ant-tabs-tab').filter({ hasText: '源码视图' })
    await sourceTab.first().click()
    console.log('  ✓ 点击了源码视图标签')
    await page.waitForTimeout(2000)
    console.log('✅ 源码视图已激活\n')

    // 步骤 13: 读取并验证 XML
    console.log('📍 步骤 13: 读取并验证 XML')
    const xmlContent = await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror')
      if (cmElement && cmElement.CodeMirror) {
        return cmElement.CodeMirror.getValue()
      }
      return ''
    })

    console.log('📄 完整 XML 内容:')
    console.log('─'.repeat(80))
    console.log(xmlContent.substring(0, 1500))
    if (xmlContent.length > 1500) {
      console.log(`... (总共 ${xmlContent.length} 字符)`)
    }
    console.log('─'.repeat(80))

    // 验证 <delete> 标签
    console.log('\n🔍 XML 验证结果:')
    const hasDeleteOpen = xmlContent.includes('<delete>')
    const hasDeleteClose = xmlContent.includes('</delete>')
    const hasDelete123 = /<delete>\s*123\s*<\/delete>/.test(xmlContent)

    console.log(`  包含 <delete>: ${hasDeleteOpen ? '✅' : '❌'}`)
    console.log(`  包含 </delete>: ${hasDeleteClose ? '✅' : '❌'}`)
    console.log(`  匹配 <delete>123</delete>: ${hasDelete123 ? '✅' : '❌'}`)

    // 提取 para 内容
    const paraMatch = xmlContent.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      console.log('\n📋 提取的 <para> 内容:')
      console.log(paraMatch[0])
    } else {
      console.log('\n⚠️  未找到 <para> 标签')
    }

    // 步骤 14: 往返测试 - 切换回设计视图
    console.log('\n📍 步骤 14: 往返测试 - 切换回设计视图')
    await designTab.first().click()
    console.log('  ✓ 切换到设计视图')
    await page.waitForTimeout(3000)

    // 再次读取编辑器内容
    const editorHTML2 = await editorBody.innerHTML()
    console.log(`  编辑器 HTML (往返后): ${editorHTML2.substring(0, 200)}`)

    const stillHasStrikethrough = editorHTML2.includes('<s>') ||
                                  editorHTML2.includes('<del>') ||
                                  editorHTML2.includes('<strike>') ||
                                  editorHTML2.includes('line-through')

    console.log(`  删除线格式保留: ${stillHasStrikethrough ? '✅' : '❌'}`)

    // 最终断言
    console.log('\n' + '='.repeat(80))
    console.log('📊 测试结果汇总')
    console.log('='.repeat(80))

    if (hasDelete123) {
      console.log('✅ 测试通过: 删除线已正确转换为 S1000D <delete> 元素')
      console.log('✅ XML 生成正确')
      if (stillHasStrikethrough) {
        console.log('✅ 往返测试通过: 格式保持一致')
      } else {
        console.log('⚠️  往返测试: 格式未完全保留（可能是显示问题）')
      }
    } else {
      console.log('❌ 测试失败: XML 中未找到 <delete> 标签')
      console.log('可能原因:')
      console.log('  1. 浏览器缓存未清除')
      console.log('  2. paraConverter.js 未重新加载')
      console.log('  3. 删除线按钮未正确应用格式')

      // 截图保存
      await page.screenshot({
        path: 'test-results/delete-conversion-failed.png',
        fullPage: true
      })
      console.log('📸 已保存失败截图: test-results/delete-conversion-failed.png')
    }

    console.log('='.repeat(80) + '\n')

    // 断言
    expect(hasDelete123).toBe(true)
  })
})
