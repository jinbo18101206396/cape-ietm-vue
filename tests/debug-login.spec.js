/**
 * 调试测试 - 检查登录后可访问的页面
 */
const { test, expect } = require('@playwright/test');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  username: 'admin',
  password: '123456'
};

test.describe('调试测试 - 登录和导航', () => {
  test('检查登录和可访问页面', async ({ page }) => {
    // 1. 访问登录页
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForTimeout(2000);

    console.log('📍 当前URL:', page.url());
    await page.screenshot({ path: 'debug-01-login-page.png', fullPage: true });

    // 2. 登录
    await page.fill('#username, input[placeholder*="账户名"]', TEST_CONFIG.username);
    await page.fill('#password, input[placeholder*="密码"]', TEST_CONFIG.password);
    await page.screenshot({ path: 'debug-02-filled-form.png', fullPage: true });

    await page.click('button:has-text("登录"), button[type="submit"]');
    await page.waitForTimeout(3000);

    console.log('📍 登录后URL:', page.url());
    await page.screenshot({ path: 'debug-03-after-login.png', fullPage: true });

    // 3. 检查是否有租户选择
    const hasTenantModal = await page.locator('.ant-modal:has-text("租户")').count() > 0;
    if (hasTenantModal) {
      console.log('🔍 发现租户选择弹窗');
      await page.click('.ant-modal .ant-list-item:first-child, .ant-modal .tenant-item:first-child');
      await page.waitForTimeout(2000);
      console.log('📍 选择租户后URL:', page.url());
      await page.screenshot({ path: 'debug-04-after-tenant.png', fullPage: true });
    }

    // 4. 等待进入主页面
    await page.waitForTimeout(2000);
    console.log('📍 最终URL:', page.url());

    // 5. 尝试查找菜单
    const menuItems = await page.locator('.ant-menu-item, .ant-menu-submenu').allTextContents();
    console.log('🔍 找到的菜单项:', menuItems);

    await page.screenshot({ path: 'debug-05-dashboard.png', fullPage: true });

    // 6. 尝试访问ICN管理页面
    console.log('\n尝试访问ICN管理页面...');
    await page.goto(`${TEST_CONFIG.baseURL}/icnmanage/ietmIcnManageList`);
    await page.waitForTimeout(3000);

    console.log('📍 访问ICN管理页URL:', page.url());
    const pageContent = await page.textContent('body');
    console.log('🔍 页面内容预览:', pageContent.substring(0, 200));

    await page.screenshot({ path: 'debug-06-icn-page.png', fullPage: true });

    // 7. 检查是否有404错误
    const has404 = pageContent.includes('404') || pageContent.includes('不存在') || pageContent.includes('无权访问');
    if (has404) {
      console.error('❌ 页面显示404或无权访问');
      console.log('💡 建议：');
      console.log('   1. 检查数据库是否已执行菜单SQL');
      console.log('   2. 检查admin用户是否有权限');
      console.log('   3. 尝试其他路径');
    }

    // 8. 尝试其他可能的路径
    const alternativePaths = [
      '/ietm/IetmIcnManageList',
      '/ietm/icnmanage/IetmIcnManageList',
      '/icnmanage/IetmIcnManageList'
    ];

    for (const path of alternativePaths) {
      console.log(`\n尝试访问: ${path}`);
      await page.goto(`${TEST_CONFIG.baseURL}${path}`);
      await page.waitForTimeout(2000);
      const content = await page.textContent('body');
      const is404 = content.includes('404') || content.includes('不存在');
      console.log(`  结果: ${is404 ? '❌ 404' : '✅ 可访问'}`);

      if (!is404) {
        console.log('🎉 找到可访问的路径:', path);
        await page.screenshot({ path: `debug-07-working-path-${path.replace(/\//g, '-')}.png`, fullPage: true });
        break;
      }
    }
  });
});
