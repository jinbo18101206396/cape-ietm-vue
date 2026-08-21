/**
 * 调试测试 - 通过菜单导航到ICN管理
 */
const { test, expect } = require('@playwright/test');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  username: 'admin',
  password: '123456'
};

test.describe('通过菜单导航测试', () => {
  test('通过菜单打开ICN管理页面', async ({ page }) => {
    // 1. 登录
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForTimeout(2000);

    await page.fill('#username', TEST_CONFIG.username);
    await page.fill('#password', TEST_CONFIG.password);
    await page.click('button:has-text("登录")');
    await page.waitForTimeout(3000);

    console.log('✅ 登录成功');
    await page.screenshot({ path: 'menu-01-logged-in.png', fullPage: true });

    // 2. 查找并点击"项目管理"菜单
    const projectMenu = page.locator('text=项目管理').first();
    if (await projectMenu.count() > 0) {
      console.log('🔍 找到"项目管理"菜单');
      await projectMenu.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'menu-02-project-menu-clicked.png', fullPage: true });

      // 3. 查找子菜单
      const submenuItems = await page.locator('.ant-menu-submenu-open .ant-menu-item, .ant-menu-inline .ant-menu-item').allTextContents();
      console.log('🔍 项目管理的子菜单:', submenuItems);

      // 4. 尝试查找包含"实体"、"ICN"等关键词的菜单项
      const keywords = ['实体', 'ICN', 'icn', 'entity'];
      for (const keyword of keywords) {
        const menuItem = page.locator(`.ant-menu-item:has-text("${keyword}")`).first();
        if (await menuItem.count() > 0) {
          console.log(`🎯 找到包含"${keyword}"的菜单项`);
          const menuText = await menuItem.textContent();
          console.log(`   菜单文本: ${menuText}`);

          await menuItem.click();
          await page.waitForTimeout(3000);

          console.log('📍 导航后的URL:', page.url());
          await page.screenshot({ path: `menu-03-after-click-${keyword}.png`, fullPage: true });

          // 检查页面内容
          const pageText = await page.textContent('body');
          if (pageText.includes('404') || pageText.includes('不存在')) {
            console.log('❌ 页面显示404');
          } else {
            console.log('✅ 页面加载成功');
            // 检查页面是否有表格、构型树等元素
            const hasTable = await page.locator('.ant-table').count() > 0;
            const hasTree = await page.locator('.ant-tree').count() > 0;
            console.log(`   - 是否有表格: ${hasTable}`);
            console.log(`   - 是否有树形结构: ${hasTree}`);
          }
          break;
        }
      }
    } else {
      console.log('❌ 未找到"项目管理"菜单');
    }

    // 5. 显示所有菜单项（用于调试）
    console.log('\n📋 所有可见的菜单项:');
    const allMenuItems = await page.locator('.ant-menu-item').allTextContents();
    allMenuItems.forEach((item, index) => {
      if (item.trim()) {
        console.log(`   ${index + 1}. ${item.trim()}`);
      }
    });
  });
});
