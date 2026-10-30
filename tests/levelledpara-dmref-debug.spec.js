const { test, expect } = require('@playwright/test')

test.describe('LevelledPara DM引用调试', () => {
  test.beforeEach(async ({ page }) => {
    // 监听所有控制台日志
    page.on('console', msg => {
      const text = msg.text()
      console.log(`[浏览器控制台] ${text}`)
    })

    // 登录
    await page.goto('http://localhost:8080')
    await page.waitForTimeout(2000)

    // 填写登录信息
    await page.fill('input[placeholder="账户"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)
  })

  test('验证 DM 引用插入和保存', async ({ page }) => {
    console.log('\n========== 开始测试 ==========\n')

    // 1. 导航到数据模块管理
    console.log('步骤1: 导航到数据模块管理')
    await page.click('text=数据模块管理')
    await page.waitForTimeout(2000)

    // 2. 找到并打开一个数据模块
    console.log('步骤2: 打开数据模块编辑器')
    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    // 点击编辑按钮
    await page.click('button:has-text("编辑")')
    await page.waitForTimeout(3000)

    // 3. 切换到 LevelledPara 设计视图
    console.log('步骤3: 切换到设计视图')
    await page.click('text=设计视图')
    await page.waitForTimeout(2000)

    // 4. 添加警告
    console.log('步骤4: 添加警告')
    await page.click('button:has-text("添加警告")')
    await page.waitForTimeout(1000)

    // 5. 在 UEditor 中插入 DM 引用
    console.log('步骤5: 插入 DM 引用')

    // 找到 UEditor iframe
    const editorFrame = page.frameLocator('iframe.edui-default')
    const editorBody = editorFrame.locator('body')

    // 点击编辑区域
    await editorBody.click()
    await page.waitForTimeout(500)

    // 点击工具栏的 DM 引用按钮
    await page.click('button[title="DM引用"]')
    await page.waitForTimeout(1000)

    // 在弹出的对话框中选择一个 DM
    const dmDialog = page.locator('.ant-modal:visible')
    await dmDialog.locator('.ant-table-row').first().click()
    await page.waitForTimeout(500)

    // 点击确定
    await dmDialog.locator('button:has-text("确定")').click()
    await page.waitForTimeout(1000)

    // 6. 保存
    console.log('步骤6: 保存并查看日志')
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(3000)

    console.log('\n========== 关键日志点 ==========')
    console.log('请查看上面的控制台日志，重点关注：')
    console.log('1. [nodeToXml] 添加命名空间前/后')
    console.log('2. [nodeToXml] XML解析失败')
    console.log('3. ===== treeToXml 生成的 XML =====')
    console.log('================================\n')

    // 7. 切换回源码视图，检查生成的 XML
    console.log('步骤7: 切换到源码视图检查 XML')
    await page.click('text=源码视图')
    await page.waitForTimeout(2000)

    // 获取源码内容
    const sourceContent = await page.locator('.CodeMirror-code').textContent()
    console.log('\n========== 生成的 XML ==========')
    console.log(sourceContent)
    console.log('================================\n')

    // 8. 验证 XML 是否包含 parsererror
    if (sourceContent.includes('parsererror')) {
      console.log('❌ 错误：XML 中包含 parsererror')
      throw new Error('生成的 XML 包含 parsererror')
    } else {
      console.log('✅ XML 没有 parsererror')
    }

    // 9. 验证 XML 是否包含正确的 dmRef 标签
    if (sourceContent.includes('<dmRef') && sourceContent.includes('xlink:type')) {
      console.log('✅ XML 包含正确的 dmRef 标签')
    } else {
      console.log('❌ 错误：XML 中没有找到正确的 dmRef 标签')
      throw new Error('XML 中没有找到正确的 dmRef 标签')
    }

    // 10. 检查警告标签是否为空
    if (sourceContent.match(/<warning[^>]*\/>/)) {
      console.log('❌ 错误：warning 标签是空的')
      throw new Error('warning 标签是空的')
    } else {
      console.log('✅ warning 标签不为空')
    }

    console.log('\n========== 测试完成 ==========\n')
  })
})
