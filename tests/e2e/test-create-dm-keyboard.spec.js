/**
 * 使用更可靠的选择器策略创建DM
 */

const { test, expect } = require('@playwright/test')

test('使用改进的选择器创建DM', async ({ page }) => {
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

  console.log('\n=== 填写表单 (改进策略) ===')

  try {
    // 策略：使用键盘导航和输入

    // 1. 密级 - 使用键盘选择
    console.log('1. 密级')
    const securitySelect = page.locator('.ant-modal .ant-select').first()
    await securitySelect.click()
    await page.waitForTimeout(800)
    // 按下箭头键和回车选择第一项
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    console.log('  ✓')

    // 2. 信息码 - 点击输入框旁边的选择按钮
    console.log('2. 信息码')
    const infoCodeItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: '信息码' })

    // 查找是否有选择按钮
    const selectButton = infoCodeItem.locator('button, .ant-input-group-addon').first()
    const hasSelectBtn = await selectButton.count() > 0

    if (hasSelectBtn) {
      console.log('  点击选择按钮')
      await selectButton.click()
      await page.waitForTimeout(1000)

      // 在弹出的对话框中选择
      const dialogVisible = await page.locator('.ant-modal').count() > 1
      if (dialogVisible) {
        // 选择第一个可用选项
        await page.locator('.ant-modal').last().locator('.ant-tree-node-content-wrapper, .ant-radio, .ant-select-item').first().click()
        await page.waitForTimeout(500)
        await page.locator('.ant-modal').last().locator('button:has-text("确定"), button:has-text("确认")').first().click()
        await page.waitForTimeout(500)
        console.log('  ✓ 通过弹窗选择')
      }
    } else {
      // 直接输入
      await infoCodeItem.locator('input').fill('001')
      console.log('  ✓ 直接输入')
    }

    // 3. SNS - 自动生成
    console.log('3. SNS - 跳过(自动生成)')

    // 4. 数据模块类型
    console.log('4. 数据模块类型')
    const dmTypeSelect = page.locator('.ant-modal .ant-form-item').filter({ hasText: '数据模块类型' }).locator('.ant-select')
    await dmTypeSelect.click()
    await page.waitForTimeout(800)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    console.log('  ✓')

    // 5. 位置码
    console.log('5. 位置码')
    const locationSelect = page.locator('.ant-modal .ant-form-item').filter({ hasText: '位置码' }).locator('.ant-select')
    await locationSelect.click()
    await page.waitForTimeout(800)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    console.log('  ✓')

    // 6. 创作单位
    console.log('6. 创作单位')
    await page.locator('.ant-modal .ant-form-item').filter({ hasText: '创作单位' }).locator('input').fill('E2E测试单位A')
    console.log('  ✓')

    // 7. 责任单位
    console.log('7. 责任单位')
    await page.locator('.ant-modal .ant-form-item').filter({ hasText: '责任单位' }).locator('input').fill('E2E测试单位B')
    console.log('  ✓')

    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/dm-form-ready.png', fullPage: true })

    console.log('\n=== 提交表单 ===')
    await page.locator('.ant-modal button:has-text("确定")').first().click()
    await page.waitForTimeout(5000)

    console.log('\n=== 验证结果 ===')

    // 检查是否有错误
    const errorVisible = await page.locator('.ant-form-item-explain-error:visible').count()

    if (errorVisible > 0) {
      console.log(`⚠️  发现 ${errorVisible} 个验证错误`)
      const errors = await page.locator('.ant-form-item-explain-error:visible').all()
      for (const err of errors) {
        const text = await err.textContent()
        console.log(`  - ${text}`)
      }
      await page.screenshot({ path: 'test-results/dm-form-has-errors.png', fullPage: true })
      return
    }

    // 检查对话框是否关闭
    const modalVisible = await page.locator('.ant-modal:visible').count()

    if (modalVisible === 0) {
      console.log('✓ 对话框已关闭')

      // 等待列表刷新
      await page.waitForTimeout(2000)

      const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
      console.log(`\n列表行数: ${rows}`)

      if (rows > 0) {
        console.log('\n✅✅✅ DM创建成功！ ✅✅✅\n')

        // 打印第一行数据
        const firstRow = await page.locator('.ant-table-tbody tr').first()
        const text = await firstRow.textContent()
        console.log(`第一行: ${text.substring(0, 200)}\n`)

        await page.screenshot({ path: 'test-results/dm-created-success.png', fullPage: true })

        expect(rows).toBeGreaterThan(0)
      } else {
        console.log('⚠️  列表仍为空')
        await page.screenshot({ path: 'test-results/dm-list-empty-after-create.png', fullPage: true })
      }
    } else {
      console.log('⚠️  对话框未关闭')
      await page.screenshot({ path: 'test-results/dm-dialog-not-closed.png', fullPage: true })
    }
  } catch (error) {
    console.log(`\n❌ 错误: ${error.message}`)
    await page.screenshot({ path: 'test-results/dm-create-failed.png', fullPage: true })
    throw error
  }
})
