/**
 * 完整的端到端删除线测试
 * 包含详细的调试信息
 */

const { test, expect } = require('@playwright/test')

test.describe('删除线 E2E 测试', () => {
  test.setTimeout(120000)

  test('完整流程测试', async ({ page, context }) => {
    // 禁用缓存
    await context.route('**/*', route => route.continue())

    console.log('🔹 步骤 1: 清除所有缓存并访问页面')
    await context.clearCookies()
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN', {
      waitUntil: 'networkidle'
    })
    await page.waitForTimeout(5000)

    console.log('🔹 步骤 2: 等待页面完全加载')
    await page.waitForSelector('.ant-tabs', { timeout: 30000 })

    console.log('🔹 步骤 3: 切换到设计视图')
    const designTab = page.locator('.ant-tabs-tab', { hasText: '设计视图' })
    if (await designTab.count() > 0) {
      await designTab.click()
      console.log('  ✓ 点击了设计视图标签')
      await page.waitForTimeout(3000)
    } else {
      console.log('  ! 可能已在设计视图')
    }

    console.log('🔹 步骤 4: 等待 Para 设计器加载')
    await page.waitForSelector('.para-designer', { timeout: 30000 })
    console.log('  ✓ Para 设计器已显示')

    console.log('🔹 步骤 5: 等待 UEditor iframe')
    const iframeCount = await page.locator('iframe').count()
    console.log('  iframe 数量:', iframeCount)

    if (iframeCount === 0) {
      console.log('  ❌ 未找到 UEditor iframe')
      return
    }

    // 获取第一个 iframe
    const frames = page.frames()
    console.log('  总 frame 数:', frames.length)

    let editorFrame = null
    for (const frame of frames) {
      const frameUrl = frame.url()
      console.log('  检查 frame:', frameUrl)

      // 检查是否是 UEditor 的编辑区域
      const hasBody = await frame.locator('body').count() > 0
      if (hasBody) {
        const bodyClass = await frame.locator('body').getAttribute('class')
        console.log('    body class:', bodyClass)
        if (bodyClass && bodyClass.includes('view')) {
          editorFrame = frame
          console.log('  ✓ 找到 UEditor 编辑区域')
          break
        }
      }
    }

    if (!editorFrame) {
      console.log('  ❌ 未找到 UEditor 编辑 frame')
      return
    }

    const editorBody = editorFrame.locator('body')

    console.log('🔹 步骤 6: 清空编辑器')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await page.waitForTimeout(500)

    console.log('🔹 步骤 7: 输入测试文本 "123"')
    await editorBody.type('123')
    await page.waitForTimeout(500)

    console.log('🔹 步骤 8: 全选文本')
    await page.keyboard.press('Control+A')
    await page.waitForTimeout(500)

    console.log('🔹 步骤 9: 查找并点击删除线按钮')
    // 方法1: 尝试查找工具栏按钮
    const toolbar = page.locator('.edui-toolbar')
    const strikeButton = toolbar.locator('.edui-button').filter({ hasText: /删除线|strikethrough/i })

    if (await strikeButton.count() > 0) {
      await strikeButton.first().click()
      console.log('  ✓ 点击了删除线按钮')
    } else {
      // 方法2: 使用快捷键
      console.log('  ! 未找到删除线按钮，尝试快捷键')
      await page.keyboard.press('Control+Shift+D')
    }

    await page.waitForTimeout(1000)

    console.log('🔹 步骤 10: 检查编辑器中的 HTML')
    const editorHTML = await editorBody.innerHTML()
    console.log('  编辑器 HTML:', editorHTML)

    const hasStrikethrough = editorHTML.includes('<s>') ||
                            editorHTML.includes('<del>') ||
                            editorHTML.includes('<strike>') ||
                            editorHTML.includes('text-decoration') ||
                            editorHTML.includes('line-through')

    console.log('  包含删除线标记:', hasStrikethrough ? '✅' : '❌')

    if (!hasStrikethrough) {
      console.log('  ⚠️ 删除线未应用，请手动点击删除线按钮')
      // 截图
      await page.screenshot({ path: 'test-results/strikethrough-not-applied.png' })
      return
    }

    console.log('🔹 步骤 11: 拦截保存请求')
    let capturedXML = null

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('save') || url.includes('updateDmContentData')) {
        console.log('  📡 捕获到响应:', url)
        try {
          const body = await response.text()
          console.log('  响应体前 500 字符:', body.substring(0, 500))
        } catch (e) {
          console.log('  无法读取响应:', e.message)
        }
      }
    })

    // 监听请求
    page.on('request', request => {
      const url = request.url()
      if (url.includes('save') || url.includes('updateDmContentData')) {
        console.log('  📤 发送请求:', url)
        const postData = request.postData()
        if (postData) {
          console.log('  请求体前 500 字符:', postData.substring(0, 500))
          // 尝试提取 XML
          if (postData.includes('<para')) {
            const match = postData.match(/<para[^>]*>[\s\S]*?<\/para>/)
            if (match) {
              capturedXML = match[0]
              console.log('  📋 提取的 para XML:', capturedXML)
            }
          }
        }
      }
    })

    console.log('🔹 步骤 12: 点击保存按钮')
    const saveButton = page.locator('.para-designer button', { hasText: '保存' })
    await saveButton.click()
    console.log('  ✓ 点击了保存按钮')

    await page.waitForTimeout(3000)

    // 检查是否有成功提示
    const successMsg = page.locator('.ant-message-success')
    if (await successMsg.count() > 0) {
      console.log('  ✅ 显示保存成功消息')
    }

    console.log('🔹 步骤 13: 切换到源码视图')
    const sourceTab = page.locator('.ant-tabs-tab', { hasText: '源码视图' })
    await sourceTab.click()
    await page.waitForTimeout(2000)

    console.log('🔹 步骤 14: 读取源码视图中的 XML')
    const xmlContent = await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror')
      if (cmElement && cmElement.CodeMirror) {
        return cmElement.CodeMirror.getValue()
      }
      return ''
    })

    console.log('📄 完整 XML (前 1000 字符):')
    console.log(xmlContent.substring(0, 1000))

    console.log('\n🔹 步骤 15: 验证 <delete> 标签')

    const hasDeleteTag = xmlContent.includes('<delete>')
    const hasDeleteClose = xmlContent.includes('</delete>')
    const hasDelete123 = xmlContent.match(/<delete>\s*123\s*<\/delete>/)

    console.log('  包含 <delete>:', hasDeleteTag ? '✅' : '❌')
    console.log('  包含 </delete>:', hasDeleteClose ? '✅' : '❌')
    console.log('  匹配 <delete>123</delete>:', hasDelete123 ? '✅' : '❌')

    if (hasDelete123) {
      console.log('\n✅ 测试通过！删除线已正确转换为 <delete> 标签')
    } else {
      console.log('\n❌ 测试失败！')

      if (capturedXML) {
        console.log('捕获的 XML:', capturedXML)
      }

      // 查找实际的 para 内容
      const paraMatch = xmlContent.match(/<para[^>]*>([\s\S]*?)<\/para>/)
      if (paraMatch) {
        console.log('实际的 para 内容:', paraMatch[0])
      }

      // 截图
      await page.screenshot({ path: 'test-results/delete-tag-missing.png', fullPage: true })
    }

    expect(hasDelete123).toBeTruthy()
  })
})
