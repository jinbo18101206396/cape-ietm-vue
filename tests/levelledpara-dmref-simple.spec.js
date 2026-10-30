const { chromium } = require('playwright')

async function test() {
  console.log('\n========== 开始测试 ==========\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 监听控制台
  const logs = []
  page.on('console', msg => {
    const text = msg.text()
    logs.push(text)
    console.log(`[浏览器] ${text}`)
  })

  try {
    // 登录
    console.log('步骤1: 登录')
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // 截图查看页面
    await page.screenshot({ path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/login-page.png' })
    console.log('已截图: tests/screenshots/login-page.png')

    // 等待登录表单
    await page.waitForSelector('input[type="text"]', { timeout: 60000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'admin')

    // 截图查看填写后的状态
    await page.screenshot({ path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/login-filled.png' })
    console.log('已截图: tests/screenshots/login-filled.png')

    // 尝试不同的登录按钮选择器
    const loginBtn = await page.locator('button').filter({ hasText: '登录' }).or(page.locator('button[type="submit"]')).first()
    await loginBtn.click()
    await page.waitForTimeout(5000)

    // 导航到数据模块管理
    console.log('步骤2: 导航到数据模块管理')
    await page.click('text=数据模块管理')
    await page.waitForTimeout(2000)

    // 打开第一个数据模块
    console.log('步骤3: 打开数据模块')
    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.click()
    await page.waitForTimeout(1000)
    await page.click('button:has-text("编辑")')
    await page.waitForTimeout(3000)

    // 切换到设计视图
    console.log('步骤4: 切换到设计视图')
    await page.click('text=设计视图')
    await page.waitForTimeout(2000)

    // 添加警告
    console.log('步骤5: 添加警告')
    await page.click('button:has-text("添加警告")')
    await page.waitForTimeout(1000)

    // 插入 DM 引用
    console.log('步骤6: 插入 DM 引用')
    const editorFrame = page.frameLocator('iframe.edui-default')
    await editorFrame.locator('body').click()
    await page.waitForTimeout(500)

    await page.click('button[title="DM引用"]')
    await page.waitForTimeout(1000)

    const dmDialog = page.locator('.ant-modal:visible')
    await dmDialog.locator('.ant-table-row').first().click()
    await page.waitForTimeout(500)
    await dmDialog.locator('button:has-text("确定")').click()
    await page.waitForTimeout(1000)

    // 保存
    console.log('步骤7: 保存')
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(3000)

    // 提取关键日志
    console.log('\n========== 关键日志 ==========')
    const nodeToXmlLogs = logs.filter(l => l.includes('[nodeToXml]'))
    const treeToXmlLogs = logs.filter(l => l.includes('treeToXml'))

    console.log('nodeToXml 日志:')
    nodeToXmlLogs.forEach(l => console.log(l))

    console.log('\ntreeToXml 日志:')
    treeToXmlLogs.forEach(l => console.log(l))

    // 切换到源码视图
    console.log('\n步骤8: 切换到源码视图')
    await page.click('text=源码视图')
    await page.waitForTimeout(2000)

    // 检查 XML
    const sourceContent = await page.locator('.CodeMirror-code').textContent()

    console.log('\n========== 验证结果 ==========')
    if (sourceContent.includes('parsererror')) {
      console.log('❌ XML 包含 parsererror')
    } else {
      console.log('✅ XML 没有 parsererror')
    }

    if (sourceContent.includes('<dmRef') && sourceContent.includes('xlink:type')) {
      console.log('✅ XML 包含正确的 dmRef 标签')
    } else {
      console.log('❌ XML 缺少 dmRef 标签')
    }

    if (sourceContent.match(/<warning[^>]*\/>/)) {
      console.log('❌ warning 标签为空')
    } else {
      console.log('✅ warning 标签不为空')
    }

    console.log('\n========== 测试完成 ==========\n')

    await page.waitForTimeout(3000)

  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await browser.close()
  }
}

test()
