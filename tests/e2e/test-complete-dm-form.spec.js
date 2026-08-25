/**
 * 完整填写新建DM表单并创建测试数据
 */

const { test, expect } = require('@playwright/test')

test('完整填写表单创建测试DM', async ({ page }) => {
  console.log('\n=== 步骤1: 登录系统 ===')
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("登 录")')
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 })
  await page.waitForTimeout(2000)
  console.log('✓ 登录成功')

  console.log('\n=== 步骤2: 导航到数据模块管理 ===')
  await page.click('text=项目管理')
  await page.waitForTimeout(500)
  await page.click('text=数据模块管理')
  await page.waitForTimeout(3000)
  console.log('✓ 已进入数据模块管理')

  console.log('\n=== 步骤3: 点击新建按钮 ===')
  const newButton = page.locator('button:has-text("新建")').first()
  await newButton.click()
  await page.waitForTimeout(2000)
  console.log('✓ 打开新建对话框')

  console.log('\n=== 步骤4: 填写表单 ===')

  try {
    // 1. 密级 (必填下拉框)
    console.log('填写: 密级')
    const securitySelect = page.locator('.ant-modal .ant-form-item').filter({ hasText: '密级' }).locator('.ant-select').first()
    await securitySelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown:visible .ant-select-item').first().click()
    await page.waitForTimeout(300)
    console.log('  ✓ 选择密级')

    // 2. 信息码 (必填输入框，有弹窗选择)
    console.log('填写: 信息码')
    const infoCodeInput = page.locator('.ant-modal .ant-form-item').filter({ hasText: '信息码' }).locator('input').first()
    await infoCodeInput.click()
    await page.waitForTimeout(500)

    // 如果有弹窗选择器，使用它
    const hasInfoCodeDialog = await page.locator('.ant-modal:visible').count() > 1
    if (hasInfoCodeDialog) {
      console.log('  检测到信息码选择弹窗')
      await page.locator('.ant-modal:visible').last().locator('.ant-select-item, .ant-tree-node-content-wrapper').first().click()
      await page.waitForTimeout(300)
      await page.locator('.ant-modal:visible').last().locator('button:has-text("确定")').click()
      await page.waitForTimeout(300)
    } else {
      // 直接输入
      await infoCodeInput.fill('001')
    }
    console.log('  ✓ 填写信息码')

    // 3. SNS (自动生成，跳过)
    console.log('填写: SNS (自动生成)')
    console.log('  ✓ 跳过')

    // 4. 数据模块类型 (必填下拉框)
    console.log('填写: 数据模块类型')
    const dmTypeSelect = page.locator('.ant-modal .ant-form-item').filter({ hasText: '数据模块类型' }).locator('.ant-select').first()
    await dmTypeSelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown:visible .ant-select-item').first().click()
    await page.waitForTimeout(300)
    console.log('  ✓ 选择数据模块类型')

    // 5. 位置码 (必填下拉框)
    console.log('填写: 位置码')
    const locationSelect = page.locator('.ant-modal .ant-form-item').filter({ hasText: '位置码' }).locator('.ant-select').first()
    await locationSelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown:visible .ant-select-item').first().click()
    await page.waitForTimeout(300)
    console.log('  ✓ 选择位置码')

    // 6. 创作单位 (必填输入框)
    console.log('填写: 创作单位')
    const authorInput = page.locator('.ant-modal .ant-form-item').filter({ hasText: '创作单位' }).locator('input').first()
    await authorInput.fill('测试单位A')
    console.log('  ✓ 填写创作单位')

    // 7. 责任单位 (必填输入框)
    console.log('填写: 责任单位')
    const respInput = page.locator('.ant-modal .ant-form-item').filter({ hasText: '责任单位' }).locator('input').first()
    await respInput.fill('测试单位B')
    console.log('  ✓ 填写责任单位')

    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/dm-form-filled.png', fullPage: true })

    console.log('\n=== 步骤5: 提交表单 ===')
    const submitBtn = page.locator('.ant-modal .ant-btn-primary:has-text("确定")').first()
    await submitBtn.click()
    console.log('✓ 点击确定按钮')

    await page.waitForTimeout(5000)

    console.log('\n=== 步骤6: 验证创建结果 ===')

    // 检查对话框是否关闭
    const modalCount = await page.locator('.ant-modal:visible').count()
    console.log(`对话框数量: ${modalCount}`)

    if (modalCount === 0) {
      console.log('✓ 对话框已关闭')

      // 检查列表
      const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
      console.log(`列表行数: ${rows}`)

      if (rows > 0) {
        console.log('\n✅ DM创建成功！')

        // 获取第一行数据
        const firstRow = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').first()
        const cells = await firstRow.locator('td').all()

        console.log('\n第一行数据:')
        for (let i = 0; i < Math.min(cells.length, 8); i++) {
          const text = await cells[i].textContent()
          console.log(`  列${i + 1}: ${text.trim()}`)
        }

        await page.screenshot({ path: 'test-results/dm-list-with-data.png', fullPage: true })

        return { success: true, rowCount: rows }
      } else {
        console.log('⚠️  对话框关闭但列表仍为空')
        await page.screenshot({ path: 'test-results/dm-list-still-empty.png', fullPage: true })
      }
    } else {
      console.log('⚠️  对话框仍然打开')

      // 检查错误提示
      const errors = await page.locator('.ant-form-item-explain-error:visible').all()
      if (errors.length > 0) {
        console.log(`\n发现 ${errors.length} 个验证错误:`)
        for (const error of errors) {
          const text = await error.textContent()
          console.log(`  - ${text.trim()}`)
        }
      }

      await page.screenshot({ path: 'test-results/dm-form-validation-errors.png', fullPage: true })
    }
  } catch (error) {
    console.log('\n❌ 表单填写失败:', error.message)
    await page.screenshot({ path: 'test-results/dm-form-fill-error.png', fullPage: true })
    throw error
  }
})
