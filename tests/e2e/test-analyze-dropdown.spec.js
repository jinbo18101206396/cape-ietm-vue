/**
 * 分析下拉框展开后的DOM结构
 */

const { test } = require('@playwright/test');

test('分析下拉框结构', async ({ page }) => {
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

  await page.locator('button:has-text("新建")').first().click();
  await page.waitForTimeout(2000);

  console.log('\n=== 点击"数据模块类型"下拉框 ===');
  const dmTypeItem = page.locator('.ant-modal .ant-form-item').filter({ hasText: '数据模块类型' });
  const select = dmTypeItem.locator('.ant-select').first();
  await select.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'test-results/dropdown-expanded.png', fullPage: true });

  // 分析所有可能的下拉容器
  console.log('\n=== 分析下拉容器 ===');

  const dropdownSelectors = [
    '.ant-select-dropdown',
    '.ant-select-dropdown-menu',
    '.ant-select-dropdown-menu-item',
    '.ant-select-item',
    '.ant-select-item-option',
    'li[role="option"]',
    '.ant-select-dropdown li',
    '[class*="dropdown"] li'
  ];

  for (const selector of dropdownSelectors) {
    const count = await page.locator(selector).count();
    console.log(`${selector}: ${count} 个元素`);

    if (count > 0 && count < 20) {
      const items = await page.locator(selector).all();
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const text = await items[i].textContent().catch(() => '');
        const visible = await items[i].isVisible().catch(() => false);
        if (text.trim()) {
          console.log(`  [${visible ? '可见' : '隐藏'}] ${i}: "${text.trim().substring(0, 30)}"`);
        }
      }
    }
  }

  // 查找所有可见的li元素
  console.log('\n=== 所有可见的li元素 ===');
  const allLis = await page.locator('li:visible').all();
  console.log(`可见li数量: ${allLis.length}`);
  for (let i = 0; i < Math.min(allLis.length, 15); i++) {
    const text = await allLis[i].textContent().catch(() => '');
    const className = await allLis[i].getAttribute('class').catch(() => '');
    if (text.trim()) {
      console.log(`  li[${i}]: "${text.trim().substring(0, 25)}" class="${className}"`);
    }
  }
});
