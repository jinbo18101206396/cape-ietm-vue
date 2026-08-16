/**
 * 探索登录后的完整导航流程
 */

const { test, expect } = require('@playwright/test');

test('探索完整导航流程', async ({ page }) => {
  // 登录
  await page.goto('http://localhost:3000/user/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  await page.click('button:has-text("登 录")');
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
  await page.waitForTimeout(3000);

  console.log('\n=== 步骤1: 登录成功 ===');
  console.log('当前URL:', page.url());

  // 截图1：登录后首页
  await page.screenshot({ path: 'test-results/nav-step1-after-login.png', fullPage: true });

  // 查找所有一级菜单
  const topMenus = await page.locator('.ant-menu-submenu-title, .ant-menu-item').all();
  console.log(`\n=== 步骤2: 找到 ${topMenus.length} 个顶级菜单 ===`);

  for (let i = 0; i < Math.min(topMenus.length, 15); i++) {
    const text = await topMenus[i].textContent();
    console.log(`菜单 ${i}: "${text.trim()}"`);
  }

  // 查找"项目管理"
  console.log('\n=== 步骤3: 查找并点击"项目管理" ===');
  const projectMenu = page.locator('text=项目管理').first();
  const isVisible = await projectMenu.isVisible();
  console.log('项目管理菜单可见:', isVisible);

  if (isVisible) {
    await projectMenu.click();
    await page.waitForTimeout(1000);
    console.log('✓ 已点击"项目管理"');

    // 截图2：展开项目管理菜单
    await page.screenshot({ path: 'test-results/nav-step2-project-menu-expanded.png', fullPage: true });

    // 查找子菜单
    const subMenus = await page.locator('.ant-menu-submenu-open .ant-menu-item, .ant-menu-inline .ant-menu-item').all();
    console.log(`\n找到 ${subMenus.length} 个子菜单:`);

    for (let i = 0; i < Math.min(subMenus.length, 10); i++) {
      const text = await subMenus[i].textContent();
      console.log(`  子菜单 ${i}: "${text.trim()}"`);
    }

    // 查找"数据模块管理"
    console.log('\n=== 步骤4: 查找并点击"数据模块管理" ===');
    const dmMenu = page.locator('text=数据模块管理').first();
    const dmVisible = await dmMenu.isVisible();
    console.log('数据模块管理菜单可见:', dmVisible);

    if (dmVisible) {
      await dmMenu.click();
      await page.waitForTimeout(2000);
      console.log('✓ 已点击"数据模块管理"');

      // 截图3：数据模块管理页面
      await page.screenshot({ path: 'test-results/nav-step3-dm-management-page.png', fullPage: true });

      console.log('\n=== 步骤5: 分析页面结构 ===');
      console.log('当前URL:', page.url());

      // 检查是否有项目选择器
      const projectSelectorCount = await page.locator('.ant-select, [class*="project"], [class*="Project"]').count();
      console.log('可能的项目选择器数量:', projectSelectorCount);

      if (projectSelectorCount > 0) {
        console.log('\n发现项目选择器，尝试获取详情:');
        const selectors = await page.locator('.ant-select').all();
        for (let i = 0; i < Math.min(selectors.length, 5); i++) {
          const text = await selectors[i].textContent();
          const placeholder = await selectors[i].locator('.ant-select-selection-placeholder').textContent().catch(() => '');
          console.log(`  选择器 ${i}: 文本="${text.trim()}" placeholder="${placeholder}"`);
        }
      }

      // 检查表格
      const tables = await page.locator('.ant-table').all();
      console.log(`\n找到 ${tables.length} 个表格`);

      const tbodies = await page.locator('.ant-table-tbody').all();
      console.log(`找到 ${tbodies.length} 个tbody`);

      for (let i = 0; i < tbodies.length; i++) {
        const rows = await tbodies[i].locator('tr').count();
        console.log(`  tbody ${i}: ${rows} 行`);

        if (rows > 0) {
          const firstRowText = await tbodies[i].locator('tr').first().textContent();
          console.log(`    第一行内容: "${firstRowText.substring(0, 100)}"`);
        }
      }

      // 检查是否有"暂无数据"
      const emptyText = await page.locator('.ant-empty-description, .ant-table-placeholder').count();
      console.log('\n"暂无数据"提示数量:', emptyText);

      // 检查加载状态
      const loading = await page.locator('.ant-spin-spinning').count();
      console.log('加载中状态:', loading);

      // 打印页面主要按钮
      const buttons = await page.locator('button').all();
      console.log(`\n页面按钮 (前20个):`);
      for (let i = 0; i < Math.min(buttons.length, 20); i++) {
        const text = await buttons[i].textContent();
        if (text.trim()) {
          console.log(`  按钮 ${i}: "${text.trim()}"`);
        }
      }
    }
  }
});
