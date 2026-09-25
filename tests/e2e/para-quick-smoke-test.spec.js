/**
 * Para设计器快速冒烟测试
 * 验证8个正则修复在真实UI环境下的效果
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计器正则修复冒烟测试', () => {

  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(60000)

    // 访问登录页
    await page.goto('http://localhost:3000/user/login', { waitUntil: 'networkidle' })

    // 登录
    await page.fill('input[placeholder*="用户名"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin')
    await page.click('button:has-text("登录")')

    // 等待跳转到主页
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 导航到数据模块管理
    await page.goto('http://localhost:3000/ietm/ietmdatamodulemanagement/IetmDataModuleManagement', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // 点击第一个DM的编辑按钮
    const editBtn = page.locator('button:has-text("编辑"), a:has-text("编辑")').first()
    await editBtn.click()
    await page.waitForTimeout(3000)
  })

  test('快速验证：上下标转换不会死循环', async ({ page }) => {
    console.log('🧪 测试上下标转换（BUG-002/003修复验证）')

    // 切换到设计视图
    const designTab = page.locator('.ant-tabs-tab').filter({ hasText: '设计视图' })
    if (await designTab.isVisible()) {
      await designTab.click()
      await page.waitForTimeout(1000)
    }

    // 在编辑器中输入包含上标的内容
    const editorFrame = page.frameLocator('iframe[class*="edui"]').first()
    const body = editorFrame.locator('body')

    await body.click()
    await body.type('水的化学式是H2O，面积单位是m2')
    await page.waitForTimeout(500)

    // 切换到源码视图查看XML
    const sourceTab = page.locator('.ant-tabs-tab').filter({ hasText: '源码视图' })
    await sourceTab.click()
    await page.waitForTimeout(1000)

    // 获取源码内容
    const sourceContent = await page.locator('.CodeMirror').textContent()
    console.log('源码视图内容（前200字符）:', sourceContent.substring(0, 200))

    // 验证：不应该出现 <superScriptcript> 这样的错误标签
    expect(sourceContent).not.toContain('<superScriptcript>')
    expect(sourceContent).not.toContain('<subScriptcript>')
    console.log('  ✅ 上下标转换正常，无死循环')

    // 再次切换到设计视图，验证往返转换
    await designTab.click()
    await page.waitForTimeout(1000)

    // 再次切换到源码视图
    await sourceTab.click()
    await page.waitForTimeout(1000)

    const sourceContent2 = await page.locator('.CodeMirror').textContent()

    // 再次验证
    expect(sourceContent2).not.toContain('<superScriptcript>')
    expect(sourceContent2).not.toContain('<subScriptcript>')
    console.log('  ✅ 往返转换验证通过')
  })

  test('快速验证：para标签不会被误匹配为p标签', async ({ page }) => {
    console.log('🧪 测试<para>标签不被误匹配（BUG-004修复验证）')

    // 切换到源码视图
    const sourceTab = page.locator('.ant-tabs-tab').filter({ hasText: '源码视图' })
    await sourceTab.click()
    await page.waitForTimeout(1000)

    // 查找当前源码中的para标签数量
    const sourceContent = await page.locator('.CodeMirror').textContent()
    const paraCount = (sourceContent.match(/<para>/g) || []).length
    console.log(`  当前源码中<para>标签数量: ${paraCount}`)

    // 切换到设计视图
    const designTab = page.locator('.ant-tabs-tab').filter({ hasText: '设计视图' })
    await designTab.click()
    await page.waitForTimeout(1000)

    // 再切换回源码视图
    await sourceTab.click()
    await page.waitForTimeout(1000)

    // 验证para标签数量没有变化
    const sourceContent2 = await page.locator('.CodeMirror').textContent()
    const paraCount2 = (sourceContent2.match(/<para>/g) || []).length
    console.log(`  转换后源码中<para>标签数量: ${paraCount2}`)

    expect(paraCount2).toBe(paraCount)

    // 验证：不应该出现错误的 <p>xxx</para> 结构
    expect(sourceContent2).not.toMatch(/<p[^>]*>.*?<\/para>/s)
    console.log('  ✅ para标签保持完整，未被误匹配')
  })

  test('快速验证：表格thead标签不被误匹配', async ({ page }) => {
    console.log('🧪 测试<thead>标签不被误匹配（BUG-001修复验证）')

    // 切换到源码视图
    const sourceTab = page.locator('.ant-tabs-tab').filter({ hasText: '源码视图' })
    await sourceTab.click()
    await page.waitForTimeout(1000)

    // 获取源码内容
    const sourceContent = await page.locator('.CodeMirror').textContent()

    // 如果存在thead标签，验证往返转换
    if (sourceContent.includes('<thead>')) {
      console.log('  发现<thead>标签，进行往返转换测试')

      const theadCount = (sourceContent.match(/<thead>/g) || []).length
      console.log(`  当前<thead>标签数量: ${theadCount}`)

      // 切换到设计视图
      const designTab = page.locator('.ant-tabs-tab').filter({ hasText: '设计视图' })
      await designTab.click()
      await page.waitForTimeout(1000)

      // 再切换回源码视图
      await sourceTab.click()
      await page.waitForTimeout(1000)

      // 验证thead标签数量没有变化
      const sourceContent2 = await page.locator('.CodeMirror').textContent()
      const theadCount2 = (sourceContent2.match(/<thead>/g) || []).length
      console.log(`  转换后<thead>标签数量: ${theadCount2}`)

      expect(theadCount2).toBe(theadCount)
      console.log('  ✅ thead标签保持完整，未被误匹配')
    } else {
      console.log('  ⚠️  当前DM不包含<thead>标签，跳过此验证')
    }
  })
})
