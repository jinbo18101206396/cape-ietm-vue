/**
 * 增强容错性的DM创建测试
 */

const { test, expect } = require('@playwright/test')

// 登录函数
async function login(page) {
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("登 录")')

  // 等待跳转完成
  await page.waitForURL(/dashboard|home/i, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  console.log('✓ 登录成功，当前URL:', page.url())
}

// 选择下拉框选项
async function selectOption(page, formItemLabel, optionIndex = 1) {
  const formItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: formItemLabel })
  const select = formItem.locator('.ant-select').first()
  await select.click()
  await page.waitForTimeout(800)

  const options = page.locator('.ant-select-dropdown:visible li[role="option"]')
  await options.first().waitFor({ state: 'visible', timeout: 3000 })

  const count = await options.count()
  const targetIndex = Math.min(optionIndex, count - 1)
  await options.nth(targetIndex).click()
  await page.waitForTimeout(500)
}

test('容错性增强的DM创建', async ({ page }) => {
  console.log('\n=== 步骤1: 登录 ===')
  await login(page)

  console.log('\n=== 步骤2: 导航到数据模块管理 ===')

  // 等待菜单加载
  await page.waitForSelector('.ant-menu', { timeout: 10000 })

  // 点击项目管理
  const projectMenu = page.locator('text=项目管理').first()
  await projectMenu.waitFor({ state: 'visible', timeout: 10000 })
  await projectMenu.click()
  await page.waitForTimeout(800)
  console.log('✓ 点击项目管理')

  // 点击数据模块管理
  const dmMenu = page.locator('text=数据模块管理').first()
  await dmMenu.waitFor({ state: 'visible', timeout: 10000 })
  await dmMenu.click()
  await page.waitForTimeout(3000)
  console.log('✓ 点击数据模块管理')

  console.log('\n=== 步骤3: 打开新建对话框 ===')
  const newBtn = page.locator('button:has-text("新建")').first()
  await newBtn.waitFor({ state: 'visible', timeout: 10000 })
  await newBtn.click()
  await page.waitForTimeout(2000)
  console.log('✓ 打开新建对话框')

  await page.screenshot({ path: 'test-results/enhanced-dialog.png', fullPage: true })

  console.log('\n=== 步骤4: 填写表单 ===')

  try {
    // 1. 密级 - 默认值
    console.log('1. 密级: 默认')

    // 2. 信息码
    console.log('2. 信息码')
    const infoCodeInput = page.locator('.ant-modal .ant-form-item').filter({ hasText: '信息码' }).locator('input').first()
    await infoCodeInput.click()
    await page.waitForTimeout(1500)

    const modalCount = await page.locator('.ant-modal-wrap:visible').count()
    if (modalCount > 1) {
      console.log('   有信息码选择弹窗')
      const dialog = page.locator('.ant-modal-wrap:visible').last()

      // 尝试点击树节点或表格行
      const treeNode = dialog.locator('.ant-tree-node-content-wrapper').last()
      const tableRow = dialog.locator('.ant-table-tbody tr').first()

      if (await treeNode.count() > 0) {
        await treeNode.click()
        await page.waitForTimeout(500)
      } else if (await tableRow.count() > 0) {
        await tableRow.click()
        await page.waitForTimeout(500)
      }

      await dialog.locator('button:has-text("确定")').first().click()
      await page.waitForTimeout(1000)
      console.log('   ✓')
    } else {
      console.log('   无弹窗，按Escape关闭下拉')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // 3. 数据模块类型
    console.log('3. 数据模块类型')
    await selectOption(page, '数据模块类型', 1)
    console.log('   ✓')

    // 4. 位置码 - 默认
    console.log('4. 位置码: 默认')

    // 5. 创作单位
    console.log('5. 创作单位')
    await selectOption(page, '创作单位', 1)
    console.log('   ✓')

    // 6. 责任单位
    console.log('6. 责任单位')
    await selectOption(page, '责任单位', 1)
    console.log('   ✓')

    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/enhanced-filled.png', fullPage: true })

    console.log('\n=== 步骤5: 提交 ===')
    await page.locator('.ant-modal:visible button.ant-btn-primary').first().click()
    await page.waitForTimeout(5000)

    console.log('\n=== 步骤6: 验证 ===')

    const modalVisible = await page.locator('.ant-modal:visible').count()

    if (modalVisible === 0) {
      console.log('✓ 对话框已关闭')
      await page.waitForTimeout(2000)

      const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
      console.log(`列表行数: ${rows}`)

      if (rows > 0) {
        console.log('\n🎉 DM创建成功！\n')
        await page.screenshot({ path: 'test-results/enhanced-success.png', fullPage: true })
        expect(rows).toBeGreaterThan(0)
      } else {
        throw new Error('列表为空')
      }
    } else {
      console.log('⚠️  对话框未关闭')

      // 检查错误
      const errors = await page.locator('.ant-form-explain:visible, .ant-form-item-explain-error:visible').all()
      if (errors.length > 0) {
        console.log('验证错误:')
        for (const err of errors) {
          const text = await err.textContent()
          console.log(`  - ${text.trim()}`)
        }
      }

      await page.screenshot({ path: 'test-results/enhanced-dialog-open.png', fullPage: true })
      throw new Error('对话框未关闭')
    }
  } catch (error) {
    console.log(`\n❌ 错误: ${error.message}`)
    await page.screenshot({ path: 'test-results/enhanced-error.png', fullPage: true })
    throw error
  }
})
