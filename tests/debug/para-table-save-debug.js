/**
 * Para设计视图插入表格保存错误深度排查
 * 错误: "保存失败：Invalid count value: -1"
 *
 * 排查思路:
 * 1. UEditor生成的HTML table结构
 * 2. html2para转换过程
 * 3. cols属性计算逻辑
 * 4. XSD验证报错位置
 */

const { chromium } = require('playwright')

async function debugTableSaveError() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('======== Step 1: 登录 ========')
    await page.goto('http://localhost:3001/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 15000 })
    console.log('✅ 登录成功')

    console.log('\n======== Step 2: 进入数据模块管理 ========')
    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(3000)
    console.log('✅ 页面加载完成')

    console.log('\n======== Step 3: 打开Para设计器 ========')
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    await editButton.click()
    await page.waitForTimeout(3000)

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(2000)
    console.log('✅ Para设计器已打开')

    console.log('\n======== Step 4: 监听控制台日志 ========')
    const logs = []
    const errors = []

    page.on('console', msg => {
      const text = msg.text()
      logs.push(text)

      if (text.includes('convertHtmlTableToS1000D') ||
          text.includes('cols') ||
          text.includes('html2para')) {
        console.log('[Console]', text)
      }
    })

    page.on('pageerror', error => {
      errors.push(error.message)
      console.error('[PageError]', error.message)
    })

    console.log('\n======== Step 5: 插入表格 ========')

    // 切换到UEditor的iframe
    const editorFrame = page.frameLocator('iframe.edui-editor-iframeholder')

    // 点击"插入表格"按钮
    const tableButton = page.locator('.edui-button.edui-for-inserttable')
    await tableButton.click()
    await page.waitForTimeout(500)

    // 在弹出的表格选择面板中，选择一个3x3表格（模拟用户操作）
    // UEditor会显示一个10x10的网格选择器
    const tablePanel = page.locator('.edui-popup-content')
    if (await tablePanel.isVisible()) {
      // 点击第3行第3列的位置（创建3x3表格）
      await tablePanel.locator('td').nth(10).click() // 假设是10x10网格，第3行第3列=索引10
      await page.waitForTimeout(1000)
    }

    console.log('✅ 表格已插入')

    console.log('\n======== Step 6: 获取UEditor生成的HTML ========')

    // 在UEditor iframe中获取HTML内容
    const htmlContent = await page.evaluate(() => {
      // 访问UEditor实例
      const editor = window.UE?.getEditor()
      if (editor) {
        return editor.getContent()
      }
      return null
    })

    console.log('📄 UEditor生成的HTML:')
    console.log(htmlContent)

    // 提取table部分
    if (htmlContent) {
      const tableMatch = htmlContent.match(/<table[^>]*>[\s\S]*?<\/table>/i)
      if (tableMatch) {
        console.log('\n📊 提取的table HTML:')
        console.log(tableMatch[0])
      }
    }

    console.log('\n======== Step 7: 点击保存 ========')
    const saveButton = page.locator('button:has-text("保存")')
    await saveButton.click()
    await page.waitForTimeout(3000)

    console.log('\n======== Step 8: 检查错误 ========')

    // 检查是否有错误提示
    const errorMsg = await page.locator('.ant-message-error, .ant-notification-notice-error').textContent().catch(() => null)

    if (errorMsg) {
      console.log('❌ 错误信息:', errorMsg)
    } else {
      console.log('✅ 保存成功（或无明显错误提示）')
    }

    console.log('\n======== Step 9: 分析日志 ========')
    console.log(`\n收集到 ${logs.length} 条日志`)

    const relevantLogs = logs.filter(log =>
      log.includes('convertHtmlTableToS1000D') ||
      log.includes('cols') ||
      log.includes('html2para') ||
      log.includes('Invalid') ||
      log.includes('error')
    )

    console.log(`\n相关日志 (${relevantLogs.length} 条):`)
    relevantLogs.forEach((log, idx) => {
      console.log(`${idx + 1}. ${log}`)
    })

    if (errors.length > 0) {
      console.log(`\n❌ JavaScript错误 (${errors.length} 条):`)
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err}`)
      })
    }

    console.log('\n======== 等待30秒用于手动检查 ========')
    await page.waitForTimeout(30000)

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  } finally {
    await browser.close()
  }
}

// 运行测试
debugTableSaveError()
