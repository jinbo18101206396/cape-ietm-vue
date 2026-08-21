/**
 * IETM系统 - 基础功能自动化测试
 * 测试登录功能和基本导航
 */
const { test, expect } = require('@playwright/test');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  username: 'admin',
  password: '123456'
};

test.describe('IETM系统 - 基础功能测试', () => {

  test('1. 登录功能测试', async ({ page }) => {
    console.log('\n===== 测试：登录功能 =====');

    // 访问登录页
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForTimeout(2000);

    // 验证登录页面元素
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    console.log('✅ 登录页面元素正常显示');

    // 输入用户名和密码
    await page.fill('#username', TEST_CONFIG.username);
    await page.fill('#password', TEST_CONFIG.password);

    // 点击登录按钮
    await page.click('button[type="submit"]');

    // 等待登录成功 - 跳转到dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });

    console.log('✅ 登录成功，跳转到主页');

    // 验证已登录状态
    const currentUrl = page.url();
    expect(currentUrl).toContain('dashboard');

    console.log(`📍 当前页面: ${currentUrl}`);
  });

  test('2. 主页面布局测试', async ({ page }) => {
    console.log('\n===== 测试：主页面布局 =====');

    // 先登录
    await login(page);

    // 检查主要布局元素
    const hasHeader = await page.locator('.ant-layout-header, header').count() > 0;
    const hasSider = await page.locator('.ant-layout-sider, .ant-menu').count() > 0;
    const hasContent = await page.locator('.ant-layout-content, main').count() > 0;

    console.log(`✅ 页头存在: ${hasHeader}`);
    console.log(`✅ 侧边栏存在: ${hasSider}`);
    console.log(`✅ 内容区存在: ${hasContent}`);

    expect(hasHeader).toBeTruthy();
    expect(hasSider).toBeTruthy();
    expect(hasContent).toBeTruthy();
  });

  test('3. 菜单系统测试', async ({ page }) => {
    console.log('\n===== 测试：菜单系统 =====');

    // 先登录
    await login(page);

    // 获取所有主菜单项
    const mainMenuItems = await page.locator('.ant-menu-submenu-title').allTextContents();
    console.log('🔍 主菜单项:', mainMenuItems.filter(item => item.trim()));

    // 验证期望的菜单项存在
    const expectedMenus = ['首页', '项目管理', '系统管理'];
    for (const menuName of expectedMenus) {
      const menuExists = mainMenuItems.some(item => item.includes(menuName));
      console.log(`  ${menuName}: ${menuExists ? '✅' : '❌'}`);
    }

    // 尝试展开"项目管理"菜单
    const projectMenu = page.locator('.ant-menu-submenu-title:has-text("项目管理")').first();
    if (await projectMenu.count() > 0) {
      await projectMenu.click();
      await page.waitForTimeout(1000);

      const submenuItems = await page.locator('.ant-menu-submenu-open .ant-menu-item').allTextContents();
      console.log('🔍 项目管理子菜单:', submenuItems.filter(item => item.trim()));
    }
  });

  test('4. 用户信息和退出功能测试', async ({ page }) => {
    console.log('\n===== 测试：用户信息和退出 =====');

    // 先登录
    await login(page);

    // 查找用户信息区域
    const userAvatar = page.locator('.ant-avatar, .user-avatar, .header-avatar').first();
    if (await userAvatar.count() > 0) {
      console.log('✅ 找到用户头像');

      // 点击用户头像打开下拉菜单
      await userAvatar.click();
      await page.waitForTimeout(500);

      // 检查下拉菜单项
      const dropdownVisible = await page.locator('.ant-dropdown-menu').count() > 0;
      if (dropdownVisible) {
        const menuItems = await page.locator('.ant-dropdown-menu-item').allTextContents();
        console.log('🔍 用户菜单项:', menuItems);

        // 检查是否有退出选项
        const hasLogout = menuItems.some(item => item.includes('退出') || item.includes('登出'));
        console.log(`${hasLogout ? '✅' : '❌'} 退出功能存在`);
      }
    } else {
      console.log('⚠️ 未找到用户头像元素');
    }
  });

  test('5. 响应式布局测试', async ({ page }) => {
    console.log('\n===== 测试：响应式布局 =====');

    // 先登录
    await login(page);

    // 测试不同视口大小
    const viewports = [
      { width: 1920, height: 1080, name: '桌面端(1920x1080)' },
      { width: 1366, height: 768, name: '笔记本(1366x768)' },
      { width: 768, height: 1024, name: '平板(768x1024)' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      const hasSider = await page.locator('.ant-layout-sider').isVisible();
      console.log(`${viewport.name}: 侧边栏${hasSider ? '显示' : '隐藏'}`);
    }
  });
});

/**
 * 辅助函数：登录系统
 */
async function login(page) {
  await page.goto(TEST_CONFIG.baseURL);
  await page.waitForTimeout(2000);

  await page.fill('#username', TEST_CONFIG.username);
  await page.fill('#password', TEST_CONFIG.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  await page.waitForTimeout(2000);
}
