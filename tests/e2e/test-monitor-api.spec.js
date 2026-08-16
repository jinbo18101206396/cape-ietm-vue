/**
 * 监听真实API请求
 */

const { test, expect } = require('@playwright/test');

test('监听DM列表API请求', async ({ page }) => {
  const apiCalls = [];

  // 监听所有请求
  page.on('request', request => {
    const url = request.url();
    if (url.includes('ietm') || url.includes('DataModule') || url.includes('list')) {
      apiCalls.push({
        method: request.method(),
        url: url,
        headers: request.headers()
      });
    }
  });

  // 登录
  await page.goto('http://localhost:3000/user/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123456');
  await page.click('button:has-text("登 录")');
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('\n=== 导航到数据模块管理 ===');
  await page.click('text=项目管理');
  await page.waitForTimeout(500);
  await page.click('text=数据模块管理');
  await page.waitForTimeout(5000); // 等待API调用

  console.log(`\n=== 捕获到 ${apiCalls.length} 个IETM相关API请求 ===`);

  apiCalls.forEach((call, index) => {
    console.log(`\n请求 ${index + 1}:`);
    console.log(`  方法: ${call.method}`);
    console.log(`  URL: ${call.url}`);
    console.log(`  Token: ${call.headers['x-access-token'] ? call.headers['x-access-token'].substring(0, 50) + '...' : 'N/A'}`);
  });

  // 截图最终状态
  await page.screenshot({ path: 'test-results/dm-list-with-api.png', fullPage: true });
});
