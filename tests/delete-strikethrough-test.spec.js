/**
 * 删除线功能测试 - S1000D <delete> 元素
 * 测试目标：验证删除线在设计视图中正确转换为 S1000D <delete> 标签
 *
 * 测试步骤：
 * 1. 登录系统
 * 2. 进入 para 设计视图
 * 3. 插入删除线文本 "123"
 * 4. 保存并验证生成的 XML
 *
 * 预期结果：
 * XML 应包含 <delete>123</delete>
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  dmURL: 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN',
  username: 'admin',
  password: 'admin123',
  timeout: 30000
}

test.describe('删除线功能 S1000D 合规性测试', () => {
  test.setTimeout(60000)

  test('应将删除线文本正确转换为 <delete> 元素', async ({ page }) => {
    console.log('🔹 步骤 1: 访问登录页面')
    await page.goto(TEST_CONFIG.baseURL + '/user/login')
    await page.waitForLoadState('networkidle')

    console.log('🔹 步骤 2: 登录')
    await page.fill('input[placeholder="账户: admin"]', TEST_CONFIG.username)
    await page.fill('input[placeholder="密码: admin123"]', TEST_CONFIG.password)
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)

    console.log('🔹 步骤 3: 进入 DM 编辑器')
    await page.goto(TEST_CONFIG.dmURL)
    await page.waitForTimeout(5000)

    console.log('🔹 步骤 4: 切换到设计视图')
    // 查找并点击"设计视图"标签
    const designViewTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
    if (await designViewTab.count() > 0) {
      await designViewTab.click()
      await page.waitForTimeout(2000)
    } else {
      console.log('⚠️ 未找到设计视图标签，可能已在设计视图中')
    }

    console.log('🔹 步骤 5: 等待 Para 设计器加载')
    await page.waitForSelector('.para-designer', { timeout: TEST_CONFIG.timeout })
    await page.waitForTimeout(2000)

    console.log('🔹 步骤 6: 查找 UEditor 编辑区域')
    const editorFrame = page.frameLocator('iframe.edui-default')
    const editorBody = editorFrame.locator('body.view')

    // 验证编辑器已加载
    await expect(editorBody).toBeVisible({ timeout: TEST_CONFIG.timeout })
    console.log('✅ UEditor 编辑器已加载')

    console.log('🔹 步骤 7: 清空编辑器内容')
    await editorBody.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await page.waitForTimeout(500)

    console.log('🔹 步骤 8: 输入测试文本 "123"')
    await editorBody.type('123')
    await page.waitForTimeout(500)

    console.log('🔹 步骤 9: 全选文本')
    await page.keyboard.press('Control+A')
    await page.waitForTimeout(500)

    console.log('🔹 步骤 10: 点击删除线按钮')
    // 查找删除线按钮 (工具栏中的删除线图标)
    const strikethroughButton = page.locator('.edui-toolbar .edui-button[title*="删除线"], .edui-toolbar .edui-button[title*="strikethrough"]').first()

    if (await strikethroughButton.count() > 0) {
      await strikethroughButton.click()
      await page.waitForTimeout(1000)
      console.log('✅ 删除线按钮已点击')
    } else {
      // 尝试使用快捷键
      console.log('⚠️ 未找到删除线按钮，尝试使用快捷键 Ctrl+Shift+S')
      await page.keyboard.press('Control+Shift+S')
      await page.waitForTimeout(1000)
    }

    console.log('🔹 步骤 11: 验证删除线样式已应用')
    const styledText = editorBody.locator('s, del, strike, [style*="text-decoration"][style*="line-through"]')
    await expect(styledText).toBeVisible({ timeout: 5000 })
    const textContent = await styledText.textContent()
    expect(textContent).toBe('123')
    console.log('✅ 删除线样式已应用到文本')

    console.log('🔹 步骤 12: 点击保存按钮')
    const saveButton = page.locator('.para-designer button:has-text("保存")')
    await saveButton.click()
    await page.waitForTimeout(3000)

    // 等待保存成功提示
    const successMessage = page.locator('.ant-message-success:has-text("保存成功")')
    await expect(successMessage).toBeVisible({ timeout: 10000 })
    console.log('✅ 保存成功')

    console.log('🔹 步骤 13: 切换到源码视图查看 XML')
    await page.click('.ant-tabs-tab:has-text("源码视图")')
    await page.waitForTimeout(2000)

    console.log('🔹 步骤 14: 读取 XML 内容')
    // 获取 CodeMirror 编辑器内容
    const xmlContent = await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror')
      if (cmElement && cmElement.CodeMirror) {
        return cmElement.CodeMirror.getValue()
      }
      return ''
    })

    console.log('📄 生成的 XML (前 500 字符):')
    console.log(xmlContent.substring(0, 500))

    console.log('🔹 步骤 15: 验证 XML 包含 <delete> 标签')
    // 验证关键结构
    expect(xmlContent).toContain('<para')
    expect(xmlContent).toContain('</para>')
    expect(xmlContent).toContain('<delete>')
    expect(xmlContent).toContain('</delete>')

    // 提取 para 内容进行详细验证
    const paraMatch = xmlContent.match(/<para[^>]*>([\s\S]*?)<\/para>/)
    if (paraMatch) {
      const paraContent = paraMatch[1].trim()
      console.log('📋 提取的 para 内容:', paraContent)

      // 验证 delete 标签包裹文本
      expect(paraContent).toMatch(/<delete>\s*123\s*<\/delete>/)
      console.log('✅ XML 结构正确: <delete>123</delete>')
    } else {
      throw new Error('未找到 <para> 标签')
    }

    console.log('\n✅ 测试通过: 删除线文本已正确转换为 S1000D <delete> 元素')
  })
})
