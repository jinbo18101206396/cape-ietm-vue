/**
 * 尝试创建测试DM或查找现有DM
 */

const { test, expect } = require('@playwright/test')

test('创建测试DM数据', async ({ page }) => {
  // 登录
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("登 录")')
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 })
  await page.waitForTimeout(2000)

  console.log('\n=== 导航到数据模块管理 ===')
  await page.click('text=项目管理')
  await page.waitForTimeout(500)
  await page.click('text=数据模块管理')
  await page.waitForTimeout(3000)

  console.log('当前URL:', page.url())

  // 截图当前状态
  await page.screenshot({ path: 'test-results/dm-list-page.png', fullPage: true })

  // 检查是否有数据
  const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
  console.log(`\n表格数据行数: ${rows}`)

  if (rows > 0) {
    console.log('✓ 数据库有DM记录，可以直接测试')

    // 打印前5行数据
    const allRows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').all()
    for (let i = 0; i < Math.min(allRows.length, 5); i++) {
      const text = await allRows[i].textContent()
      console.log(`行 ${i + 1}: ${text.substring(0, 150)}`)
    }
  } else {
    console.log('✗ 数据库没有DM记录')

    // 尝试点击"新建"按钮创建DM
    const newButton = page.locator('button:has-text("新建")')
    const isEnabled = await newButton.isEnabled()

    console.log('\n新建按钮状态:', isEnabled ? '可用' : '禁用')

    if (isEnabled) {
      console.log('\n=== 尝试创建新DM ===')
      await newButton.click()
      await page.waitForTimeout(2000)

      // 截图新建对话框
      await page.screenshot({ path: 'test-results/dm-create-dialog.png', fullPage: true })

      // 查找表单字段
      const inputs = await page.locator('.ant-modal input, .ant-modal .ant-select').all()
      console.log(`\n找到 ${inputs.length} 个表单字段`)

      // 检查是否需要先创建项目
      const modalTitle = await page.locator('.ant-modal-title').textContent().catch(() => '')
      console.log('对话框标题:', modalTitle)

      const modalContent = await page.locator('.ant-modal-body').textContent().catch(() => '')
      console.log('对话框内容预览:', modalContent.substring(0, 200))
    }
  }
})
