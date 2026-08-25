/**
 * 简化策略：跳过复杂选择器，直接输入值
 */

const { test, expect } = require('@playwright/test')

test('简化策略创建DM', async ({ page }) => {
  console.log('\n=== 登录并导航 ===')
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("登 录")')
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 })
  await page.waitForTimeout(2000)

  await page.click('text=项目管理')
  await page.waitForTimeout(500)
  await page.click('text=数据模块管理')
  await page.waitForTimeout(3000)

  console.log('\n=== 打开新建对话框 ===')
  await page.locator('button:has-text("新建")').first().click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'test-results/step1-dialog-opened.png', fullPage: true })

  console.log('\n=== 填写表单（简化策略）===')

  // 获取所有必填字段
  const formItems = await page.locator('.ant-modal .ant-form-item').all()
  console.log(`表单项数量: ${formItems.length}`)

  // 策略：依次按Tab键，遇到下拉框用Enter+ArrowDown+Enter，遇到输入框直接输入

  // 1. 密级（下拉框）
  console.log('\n1. 处理密级')
  await page.keyboard.press('Tab') // 聚焦到第一个字段
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter') // 打开下拉框
  await page.waitForTimeout(500)
  await page.keyboard.press('ArrowDown') // 选择第一项
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter') // 确认
  await page.waitForTimeout(500)
  console.log('  ✓ 密级')

  // 2. 信息码（输入框，跳过选择器，直接关闭可能的弹窗）
  console.log('\n2. 处理信息码')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)

  // 检查是否弹出了选择对话框
  const modalCount1 = await page.locator('.ant-modal:visible').count()
  if (modalCount1 > 1) {
    console.log('  检测到信息码选择弹窗，关闭它')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }

  // 直接在输入框输入
  await page.keyboard.type('040')
  await page.waitForTimeout(500)
  console.log('  ✓ 信息码: 040')

  // 3. SNS（自动生成，跳过）
  console.log('\n3. 处理SNS')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  console.log('  ✓ SNS (自动)')

  // 4. 数据模块类型（下拉框）
  console.log('\n4. 处理数据模块类型')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  console.log('  ✓ 数据模块类型')

  // 5. 信息码变量（可选，跳过）
  console.log('\n5. 处理信息码变量')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  console.log('  ✓ 跳过')

  // 6. 位置码（下拉框）
  console.log('\n6. 处理位置码')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  console.log('  ✓ 位置码')

  // 7-8. 学习码、学习事件码（可选，跳过）
  console.log('\n7-8. 处理可选字段')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)
  console.log('  ✓ 跳过')

  // 9. 创作单位
  console.log('\n9. 处理创作单位')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.keyboard.type('E2E-TestOrg-A')
  await page.waitForTimeout(300)
  console.log('  ✓ 创作单位')

  // 10. 责任单位
  console.log('\n10. 处理责任单位')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.keyboard.type('E2E-TestOrg-B')
  await page.waitForTimeout(300)
  console.log('  ✓ 责任单位')

  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'test-results/step2-form-filled.png', fullPage: true })

  console.log('\n=== 提交表单 ===')
  // 点击确定按钮
  await page.locator('.ant-modal:visible button.ant-btn-primary').first().click()
  await page.waitForTimeout(5000)

  console.log('\n=== 验证结果 ===')

  // 检查验证错误
  const errors = await page.locator('.ant-form-item-explain-error:visible').all()
  if (errors.length > 0) {
    console.log(`\n⚠️  发现 ${errors.length} 个验证错误:`)
    for (const err of errors) {
      const text = await err.textContent()
      console.log(`  - ${text.trim()}`)
    }
    await page.screenshot({ path: 'test-results/step3-validation-errors.png', fullPage: true })
    throw new Error('表单验证失败')
  }

  // 检查对话框
  const modalVisible = await page.locator('.ant-modal:visible').count()
  console.log(`对话框数量: ${modalVisible}`)

  if (modalVisible === 0) {
    console.log('✓ 对话框已关闭')

    await page.waitForTimeout(2000)
    const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
    console.log(`\n列表行数: ${rows}`)

    if (rows > 0) {
      console.log('\n🎉🎉🎉 DM创建成功！ 🎉🎉🎉\n')

      const firstRow = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').first()
      const rowText = await firstRow.textContent()
      console.log(`第一行数据: ${rowText.substring(0, 150)}...\n`)

      await page.screenshot({ path: 'test-results/step4-success.png', fullPage: true })

      // 断言成功
      expect(rows).toBeGreaterThan(0)

      console.log('✅ 测试数据创建成功，可以开始真正的UI测试了！\n')
    } else {
      console.log('⚠️  列表仍为空')
      await page.screenshot({ path: 'test-results/step4-list-empty.png', fullPage: true })
      throw new Error('DM创建后列表仍为空')
    }
  } else {
    console.log('⚠️  对话框未关闭，可能提交失败')
    await page.screenshot({ path: 'test-results/step4-dialog-open.png', fullPage: true })
    throw new Error('对话框未关闭')
  }
})
