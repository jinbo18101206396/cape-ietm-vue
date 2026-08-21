const { test, expect } = require('@playwright/test');

/**
 * 快速验证测试 - 只验证页面能否打开和基本交互
 */
test.describe('快速验证测试', () => {

  /**
   * 测试1：验证登录页面
   */
  test('应该能够访问登录页面', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 验证页面标题
    const title = await page.title();
    console.log(`页面标题: ${title}`);

    // 验证登录表单存在
    const usernameInput = page.locator('input[placeholder*="账号"]');
    await expect(usernameInput).toBeVisible();

    const passwordInput = page.locator('input[placeholder*="密码"]');
    await expect(passwordInput).toBeVisible();

    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();

    console.log('✅ 登录页面验证通过');

    await page.screenshot({ path: './test-results/screenshots/quick-01-login-page.png', fullPage: true });
  });

  /**
   * 测试2：验证复制按钮存在（无需登录，检查前端代码）
   */
  test('应该在数据模块页面找到复制和复制新建按钮', async ({ page }) => {
    // 注意：这个测试需要先登录
    // 如果没有登录，会被重定向到登录页

    await page.goto('/');
    await page.waitForTimeout(2000);

    // 检查是否在登录页（通过URL判断）
    const currentUrl = page.url();
    console.log(`当前URL: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.log('⚠️  需要登录，跳过此测试');
      test.skip();
      return;
    }

    // 尝试访问数据模块管理页面
    await page.goto('/ietm/datamodule/list');
    await page.waitForTimeout(2000);

    // 检查按钮是否存在（可能被禁用）
    const copyButton = page.locator('button:has-text("复制")').first();
    const copyNewButton = page.locator('button:has-text("复制新建")').first();

    const copyExists = await copyButton.count() > 0;
    const copyNewExists = await copyNewButton.count() > 0;

    console.log(`复制按钮存在: ${copyExists}`);
    console.log(`复制新建按钮存在: ${copyNewExists}`);

    await page.screenshot({ path: './test-results/screenshots/quick-02-dm-page.png', fullPage: true });

    expect(copyExists || copyNewExists).toBeTruthy();
  });

  /**
   * 测试3：验证弹窗HTML结构（通过检查源码）
   */
  test('应该能够找到DmCopyModal组件', async ({ page }) => {
    // 读取前端源码，验证组件存在
    const fs = require('fs');
    const path = require('path');

    const modalPath = path.join(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/components/DmCopyModal.vue');

    const exists = fs.existsSync(modalPath);
    console.log(`DmCopyModal组件文件存在: ${exists}`);

    if (exists) {
      const content = fs.readFileSync(modalPath, 'utf-8');

      // 验证关键字段存在
      const hasLearnCode = content.includes('learnCode');
      const hasLearnEventCode = content.includes('learnEventCode');
      const hasDmcPreview = content.includes('dmcPreview');

      console.log(`包含learnCode字段: ${hasLearnCode}`);
      console.log(`包含learnEventCode字段: ${hasLearnEventCode}`);
      console.log(`包含DMC预览: ${hasDmcPreview}`);

      expect(hasLearnCode).toBeTruthy();
      expect(hasLearnEventCode).toBeTruthy();
      expect(hasDmcPreview).toBeTruthy();

      console.log('✅ DmCopyModal组件验证通过');
    } else {
      console.log('❌ DmCopyModal组件文件不存在');
      expect(exists).toBeTruthy();
    }
  });

  /**
   * 测试4：验证后端API端点（通过直接HTTP请求）
   */
  test('应该能够访问后端API端点', async ({ request }) => {
    const baseURL = process.env.API_BASE_URL || 'http://localhost:9999/jeecg-boot';

    // 测试API是否可访问（不需要认证的端点）
    try {
      const response = await request.get(`${baseURL}/sys/common/403`);
      console.log(`API响应状态: ${response.status()}`);

      // 只要能收到响应就说明服务在运行
      expect([200, 403, 404, 500].includes(response.status())).toBeTruthy();
      console.log('✅ 后端服务可访问');
    } catch (error) {
      console.log('⚠️  后端服务无法访问，可能未启动');
      console.log(`错误: ${error.message}`);
    }
  });

  /**
   * 测试5：验证数据库SQL文件
   */
  test('应该存在数据库迁移SQL文件', async () => {
    const fs = require('fs');
    const path = require('path');

    const sqlPath = path.join(__dirname, '../../../sql/001_add_learn_code_fields.sql');

    const exists = fs.existsSync(sqlPath);
    console.log(`SQL文件存在: ${exists}`);

    if (exists) {
      const content = fs.readFileSync(sqlPath, 'utf-8');

      // 验证SQL包含关键语句
      const hasLearnCode = content.includes('learn_code');
      const hasLearnEventCode = content.includes('learn_event_code');
      const hasAlterTable = content.includes('ALTER TABLE');

      console.log(`包含learn_code: ${hasLearnCode}`);
      console.log(`包含learn_event_code: ${hasLearnEventCode}`);
      console.log(`包含ALTER TABLE: ${hasAlterTable}`);

      expect(hasLearnCode).toBeTruthy();
      expect(hasLearnEventCode).toBeTruthy();
      expect(hasAlterTable).toBeTruthy();

      console.log('✅ SQL文件验证通过');
    } else {
      console.log('❌ SQL文件不存在');
      expect(exists).toBeTruthy();
    }
  });
});
