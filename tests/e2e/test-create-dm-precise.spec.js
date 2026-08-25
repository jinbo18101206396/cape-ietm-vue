/**
 * 精确定位策略创建DM
 * 根据截图分析：
 * - 密级: 下拉框(已有默认值"公开")
 * - 信息码: 需点击搜索图标弹窗选择
 * - 数据模块类型: 下拉框
 * - 位置码: 下拉框(已有默认值"A")
 * - 创作单位: 下拉框
 * - 责任单位: 下拉框
 */

const { test, expect } = require('@playwright/test')

// 辅助函数：选择Ant Design下拉框的第一个选项
async function selectFirstOption(page, formItemLabel) {
  const formItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: formItemLabel })
  const select = formItem.locator('.ant-select').first()
  await select.click()
  await page.waitForTimeout(800)

  // 等待下拉选项出现并点击第一个
  const dropdown = page.locator('.ant-select-dropdown').last()
  await dropdown.waitFor({ state: 'visible', timeout: 3000 })
  await dropdown.locator('.ant-select-item-option').first().click()
  await page.waitForTimeout(500)
}

test('精确策略创建DM', async ({ page }) => {
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

  console.log('\n=== 填写表单（精确定位）===')

  // 1. 密级 - 已有默认值"公开"，无需操作
  console.log('1. 密级: 使用默认值"公开"')

  // 2. 信息码 - 点击搜索图标弹窗选择
  console.log('2. 信息码: 点击搜索图标')
  const infoCodeItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: '信息码' }).first()
  // 点击输入框或搜索图标触发弹窗
  const searchIcon = infoCodeItem.locator('.anticon-search, .ant-input-suffix, input').first()
  await searchIcon.click()
  await page.waitForTimeout(1500)

  // 检查是否弹出选择对话框
  const modalCount = await page.locator('.ant-modal-wrap:visible').count()
  console.log(`   当前可见对话框数: ${modalCount}`)
  await page.screenshot({ path: 'test-results/precise-infocode-dialog.png', fullPage: true })

  if (modalCount > 1) {
    console.log('   检测到信息码选择弹窗')
    // 在最上层弹窗中选择
    const infoDialog = page.locator('.ant-modal-wrap:visible').last()

    // 尝试多种可能的选择方式
    // 方式1: 树节点
    const treeNodes = await infoDialog.locator('.ant-tree-node-content-wrapper').count()
    // 方式2: 表格行
    const tableRows = await infoDialog.locator('.ant-table-tbody tr').count()
    // 方式3: 列表项
    const listItems = await infoDialog.locator('.ant-list-item, .ant-select-item').count()

    console.log(`   树节点:${treeNodes} 表格行:${tableRows} 列表项:${listItems}`)

    if (treeNodes > 0) {
      // 展开并选择叶子节点
      const switchers = await infoDialog.locator('.ant-tree-switcher:not(.ant-tree-switcher-noop)').all()
      if (switchers.length > 0) {
        await switchers[0].click()
        await page.waitForTimeout(500)
      }
      await infoDialog.locator('.ant-tree-node-content-wrapper').last().click()
      await page.waitForTimeout(500)
    } else if (tableRows > 0) {
      await infoDialog.locator('.ant-table-tbody tr').first().click()
      await page.waitForTimeout(500)
    }

    // 点击确定
    await infoDialog.locator('button:has-text("确定"), button:has-text("确认")').first().click()
    await page.waitForTimeout(1000)
    console.log('   ✓ 信息码已选择')
  } else {
    console.log('   ⚠️ 未弹出选择对话框，尝试直接输入')
    await infoCodeItem.locator('input').fill('040')
  }

  // 3. 数据模块类型 - 下拉框
  console.log('3. 数据模块类型')
  await selectFirstOption(page, '数据模块类型')
  console.log('   ✓')

  // 4. 位置码 - 已有默认值"A"
  console.log('4. 位置码: 使用默认值"A"')

  // 5. 创作单位 - 下拉框
  console.log('5. 创作单位')
  await selectFirstOption(page, '创作单位')
  console.log('   ✓')

  // 6. 责任单位 - 下拉框
  console.log('6. 责任单位')
  await selectFirstOption(page, '责任单位')
  console.log('   ✓')

  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'test-results/precise-form-filled.png', fullPage: true })

  console.log('\n=== 提交表单 ===')
  await page.locator('.ant-modal:visible button:has-text("保存")').first().click()
  await page.waitForTimeout(5000)

  console.log('\n=== 验证结果 ===')

  // 检查验证错误
  const errors = await page.locator('.ant-form-item-explain-error:visible').all()
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} 个验证错误:`)
    for (const err of errors) {
      const text = await err.textContent()
      console.log(`  - ${text.trim()}`)
    }
    await page.screenshot({ path: 'test-results/precise-errors.png', fullPage: true })
  }

  const modalVisible = await page.locator('.ant-modal:visible').count()

  if (modalVisible === 0) {
    console.log('✓ 对话框已关闭')
    await page.waitForTimeout(2000)
    const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
    console.log(`\n列表行数: ${rows}`)

    if (rows > 0) {
      console.log('\n🎉 DM创建成功！\n')
      await page.screenshot({ path: 'test-results/precise-success.png', fullPage: true })
      expect(rows).toBeGreaterThan(0)
    } else {
      throw new Error('列表仍为空')
    }
  } else {
    console.log('⚠️  对话框未关闭')
    await page.screenshot({ path: 'test-results/precise-dialog-open.png', fullPage: true })
    throw new Error('提交后对话框未关闭')
  }
})
