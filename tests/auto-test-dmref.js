const { chromium } = require('playwright')

async function test() {
  console.log('\n========== 自动化测试开始 ==========\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // 减慢操作以便观察
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 收集关键日志
  const logs = []
  page.on('console', msg => {
    const text = msg.text()
    logs.push(text)

    if (text.includes('[nodeToXml]') || text.includes('treeToXml') || text.includes('添加命名空间')) {
      console.log(`[日志] ${text}`)
    }
  })

  try {
    // 1. 直接访问编辑页面（假设已登录或使用 session storage）
    console.log('步骤1: 访问编辑页面')
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 尝试登录
    try {
      const loginInput = await page.locator('input[type="text"]').first()
      if (await loginInput.isVisible({ timeout: 3000 })) {
        console.log('步骤2: 登录')
        await page.fill('input[type="text"]', 'admin')
        await page.fill('input[type="password"]', 'admin')

        // 查找登录按钮
        const buttons = await page.locator('button').all()
        for (const btn of buttons) {
          const text = await btn.textContent()
          if (text && text.includes('登录')) {
            await btn.click()
            break
          }
        }
        await page.waitForTimeout(5000)
      }
    } catch (e) {
      console.log('已登录或跳过登录')
    }

    // 3. 直接访问已知的数据模块编辑页面
    console.log('步骤3: 访问数据模块编辑页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2115071394537517057?mode=edit&dmc=DMC-ZB1-A-05-00-00-00A-007A-A_001-01_zh-CN')
    await page.waitForTimeout(3000)

    // 4. 切换到设计视图
    console.log('步骤4: 切换到设计视图')
    const designViewTab = page.locator('text=设计视图')
    await designViewTab.click()
    await page.waitForTimeout(2000)

    // 5. 添加警告
    console.log('步骤5: 添加警告')
    const addWarningBtn = page.locator('button').filter({ hasText: '添加警告' })
    await addWarningBtn.click()
    await page.waitForTimeout(1000)

    // 6. 在 UEditor 中插入 DM 引用
    console.log('步骤6: 插入 DM 引用')

    // 点击 UEditor 编辑区域
    const editorFrame = page.frameLocator('iframe.edui-default')
    await editorFrame.locator('body').click()
    await page.waitForTimeout(500)

    // 点击 DM 引用按钮
    const dmRefBtn = page.locator('[title="DM引用"]')
    await dmRefBtn.click()
    await page.waitForTimeout(1500)

    // 选择第一个 DM
    const dmDialog = page.locator('.ant-modal').filter({ hasText: 'DM引用' })
    await dmDialog.locator('.ant-table-row').first().click()
    await page.waitForTimeout(500)

    // 点击确定
    await dmDialog.locator('button').filter({ hasText: '确定' }).click()
    await page.waitForTimeout(1000)

    // 7. 保存
    console.log('步骤7: 保存')
    const saveBtn = page.locator('button').filter({ hasText: '保存' }).first()
    await saveBtn.click()
    await page.waitForTimeout(3000)

    // 8. 输出关键日志
    console.log('\n========== 关键日志 ==========')
    const nodeToXmlLogs = logs.filter(l => l.includes('[nodeToXml]'))
    console.log('nodeToXml 日志数量:', nodeToXmlLogs.length)
    nodeToXmlLogs.forEach(l => console.log(l))

    const treeToXmlLogs = logs.filter(l => l.includes('===== treeToXml'))
    console.log('\ntreeToXml 日志数量:', treeToXmlLogs.length)

    // 查找生成的 XML
    const xmlStartIdx = logs.findIndex(l => l.includes('===== treeToXml 生成的 XML ====='))
    if (xmlStartIdx >= 0) {
      console.log('\n生成的 XML:')
      for (let i = xmlStartIdx; i < Math.min(xmlStartIdx + 20, logs.length); i++) {
        console.log(logs[i])
      }
    }

    console.log('\n========== 测试完成 ==========')

    // 保持浏览器打开以便查看
    await page.waitForTimeout(5000)

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error(error.stack)
  } finally {
    await browser.close()
  }
}

test().catch(console.error)
