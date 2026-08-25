/**
 * 分析新建DM对话框并创建测试数据
 */

const { test, expect } = require('@playwright/test')

test('分析并填写新建DM表单', async ({ page }) => {
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

  console.log('\n=== 点击新建按钮 ===')
  const newButton = page.locator('button:has-text("新建")').first()
  await newButton.click()
  await page.waitForTimeout(2000)

  console.log('\n=== 分析对话框结构 ===')

  // 获取对话框标题
  const modalTitle = await page.locator('.ant-modal-title').textContent()
  console.log('对话框标题:', modalTitle)

  // 分析所有表单项
  const formItems = await page.locator('.ant-modal .ant-form-item').all()
  console.log(`\n找到 ${formItems.length} 个表单项:\n`)

  for (let i = 0; i < formItems.length; i++) {
    const item = formItems[i]

    // 获取标签
    const label = await item.locator('.ant-form-item-label label').textContent().catch(() => '')

    // 获取是否必填
    const required = await item.locator('.ant-form-item-required').count() > 0

    // 获取输入类型
    const hasInput = await item.locator('input').count() > 0
    const hasSelect = await item.locator('.ant-select').count() > 0
    const hasTextarea = await item.locator('textarea').count() > 0

    let inputType = ''
    if (hasInput) inputType = 'input'
    else if (hasSelect) inputType = 'select'
    else if (hasTextarea) inputType = 'textarea'

    console.log(`${i + 1}. ${required ? '* ' : '  '}${label.trim()} [${inputType}]`)

    // 如果是下拉框，尝试获取placeholder
    if (hasSelect) {
      const placeholder = await item.locator('.ant-select-selection-placeholder').textContent().catch(() => '')
      if (placeholder) {
        console.log(`   提示: ${placeholder}`)
      }
    }

    // 如果是输入框，获取placeholder
    if (hasInput) {
      const input = item.locator('input')
      const placeholder = await input.getAttribute('placeholder').catch(() => '')
      if (placeholder) {
        console.log(`   提示: ${placeholder}`)
      }
    }
  }

  console.log('\n=== 尝试填写表单 ===')

  try {
    // 方案：填写最少必填项
    // 通常第一个输入框是技术名称
    const firstInput = page.locator('.ant-modal input[type="text"]').first()
    await firstInput.fill('E2E测试DM-自动创建')
    console.log('✓ 填写第一个输入框: E2E测试DM-自动创建')

    await page.waitForTimeout(1000)

    // 查找并点击提交按钮
    const submitBtn = page.locator('.ant-modal .ant-btn-primary:has-text("确定"), .ant-modal .ant-btn-primary:has-text("确认"), .ant-modal .ant-btn-primary:has-text("提交")').first()

    const submitBtnText = await submitBtn.textContent()
    console.log(`\n点击按钮: "${submitBtnText.trim()}"`)

    await submitBtn.click()
    await page.waitForTimeout(3000)

    // 检查结果
    console.log('\n=== 检查创建结果 ===')

    // 检查错误提示
    const errorCount = await page.locator('.ant-message-error, .ant-notification-error, .ant-form-item-explain-error').count()

    if (errorCount > 0) {
      console.log(`\n⚠️  发现 ${errorCount} 个错误提示:`)

      const errors = await page.locator('.ant-message-error, .ant-notification-error, .ant-form-item-explain-error').all()
      for (let i = 0; i < errors.length; i++) {
        const errorText = await errors[i].textContent()
        console.log(`  ${i + 1}. ${errorText.trim()}`)
      }

      await page.screenshot({ path: 'test-results/create-dm-validation-error.png', fullPage: true })

      console.log('\n=== 需要填写更多字段 ===')

      // 列出所有必填但未填写的字段
      const requiredItems = await page.locator('.ant-modal .ant-form-item-required').all()
      console.log(`\n必填字段 (${requiredItems.length}个):`)

      for (const item of requiredItems) {
        const label = await item.textContent()
        console.log(`  - ${label.trim()}`)
      }
    } else {
      // 检查对话框是否关闭
      const modalVisible = await page.locator('.ant-modal').isVisible()

      if (!modalVisible) {
        console.log('✓ 对话框已关闭')

        // 检查列表是否有数据
        await page.waitForTimeout(2000)
        const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
        console.log(`\n列表行数: ${rows}`)

        if (rows > 0) {
          console.log('\n✅ DM创建成功！')

          const firstRow = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').first()
          const rowText = await firstRow.textContent()
          console.log(`第一行: ${rowText.substring(0, 150)}...`)

          await page.screenshot({ path: 'test-results/dm-created-successfully.png', fullPage: true })
        } else {
          console.log('⚠️  对话框关闭但列表仍为空')
        }
      } else {
        console.log('⚠️  对话框仍然打开，可能需要填写更多字段')
        await page.screenshot({ path: 'test-results/create-dm-still-open.png', fullPage: true })
      }
    }
  } catch (error) {
    console.log('\n❌ 填写表单时出错:', error.message)
    await page.screenshot({ path: 'test-results/create-dm-exception.png', fullPage: true })
  }
})
