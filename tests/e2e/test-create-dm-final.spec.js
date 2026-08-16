/**
 * 最终版本：使用Ant Design Vue 1.7.8正确的选择器创建DM
 */

const { test, expect } = require('@playwright/test');

// 选择下拉框选项（跳过第0项"请选择"，选第index项）
async function selectOption(page, formItemLabel, optionIndex = 1) {
  const formItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: formItemLabel });
  const select = formItem.locator('.ant-select').first();
  await select.click();
  await page.waitForTimeout(800);

  // 使用旧版选择器
  const options = page.locator('.ant-select-dropdown:visible li[role="option"]');
  await options.first().waitFor({ state: 'visible', timeout: 3000 });

  const count = await options.count();
  console.log(`   选项数: ${count}`);

  // 选择指定索引（默认选第1个真实选项，跳过"请选择"）
  const targetIndex = Math.min(optionIndex, count - 1);
  await options.nth(targetIndex).click();
  await page.waitForTimeout(500);
}

test('最终版创建DM', async ({ page }) => {
  console.log('\n=== 登录并导航 ===');
  await page.goto('http://localhost:3000/user/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  await page.click('button:has-text("登 录")');
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  await page.click('text=项目管理');
  await page.waitForTimeout(500);
  await page.click('text=数据模块管理');
  await page.waitForTimeout(3000);

  console.log('\n=== 打开新建对话框 ===');
  await page.locator('button:has-text("新建")').first().click();
  await page.waitForTimeout(2000);

  console.log('\n=== 填写表单 ===');

  // 1. 密级 - 已有默认值"公开"
  console.log('1. 密级: 默认"公开"');

  // 2. 信息码 - 点击输入框，可能弹出选择框
  console.log('2. 信息码');
  const infoCodeItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: '信息码' }).first();
  await infoCodeItem.locator('input').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/final-infocode-click.png', fullPage: true });

  // 检查弹窗
  const modalWraps = await page.locator('.ant-modal-wrap:visible').count();
  console.log(`   可见弹窗数: ${modalWraps}`);

  if (modalWraps > 1) {
    // 有信息码选择弹窗
    const infoDialog = page.locator('.ant-modal-wrap:visible').last();

    // 分析弹窗内容
    const treeCount = await infoDialog.locator('li[class*="tree-treenode"]').count();
    const tableCount = await infoDialog.locator('.ant-table-tbody tr').count();
    console.log(`   树节点:${treeCount} 表格行:${tableCount}`);

    if (treeCount > 0) {
      // 点击最后一个叶子节点
      await infoDialog.locator('.ant-tree-node-content-wrapper').last().click();
      await page.waitForTimeout(500);
    } else if (tableCount > 0) {
      await infoDialog.locator('.ant-table-tbody tr').first().click();
      await page.waitForTimeout(500);
    }

    // 确定
    const confirmBtn = infoDialog.locator('button:has-text("确定"), button:has-text("确认")').first();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
    }
    console.log('   ✓ 信息码已选择');
  } else {
    console.log('   信息码可能是普通输入或需要其他方式');
    // 尝试关闭可能的下拉
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // 3. 数据模块类型
  console.log('3. 数据模块类型');
  await selectOption(page, '数据模块类型', 1);
  console.log('   ✓');

  // 4. 位置码 - 默认"A"
  console.log('4. 位置码: 默认"A"');

  // 5. 创作单位
  console.log('5. 创作单位');
  await selectOption(page, '创作单位', 1);
  console.log('   ✓');

  // 6. 责任单位
  console.log('6. 责任单位');
  await selectOption(page, '责任单位', 1);
  console.log('   ✓');

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/final-form-filled.png', fullPage: true });

  console.log('\n=== 提交表单 ===');
  await page.locator('.ant-modal:visible button:has-text("保存")').first().click();
  await page.waitForTimeout(5000);

  console.log('\n=== 验证结果 ===');

  // 检查验证错误
  const errors = await page.locator('.ant-form-explain, .ant-form-item-explain-error').all();
  const visibleErrors = [];
  for (const err of errors) {
    if (await err.isVisible().catch(() => false)) {
      const text = await err.textContent();
      if (text.trim()) visibleErrors.push(text.trim());
    }
  }

  if (visibleErrors.length > 0) {
    console.log(`⚠️  验证错误:`);
    visibleErrors.forEach(e => console.log(`  - ${e}`));
    await page.screenshot({ path: 'test-results/final-errors.png', fullPage: true });
  }

  const modalVisible = await page.locator('.ant-modal:visible').count();

  if (modalVisible === 0) {
    console.log('✓ 对话框已关闭');
    await page.waitForTimeout(2000);
    const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count();
    console.log(`\n列表行数: ${rows}`);

    if (rows > 0) {
      console.log('\n🎉🎉🎉 DM创建成功！ 🎉🎉🎉\n');
      await page.screenshot({ path: 'test-results/final-success.png', fullPage: true });
      expect(rows).toBeGreaterThan(0);
    } else {
      throw new Error('列表仍为空');
    }
  } else {
    console.log('⚠️  对话框未关闭');
    await page.screenshot({ path: 'test-results/final-dialog-open.png', fullPage: true });
    throw new Error('提交后对话框未关闭');
  }
});
