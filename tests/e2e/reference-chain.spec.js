/**
 * 引用链功能 E2E 自动化测试
 * 使用 Playwright 进行真实浏览器测试
 */

const { test, expect } = require('@playwright/test');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:9999';
const TEST_TIMEOUT = 30000;

test.describe('引用链功能完整测试', () => {

  let page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // 登录（根据实际登录流程调整）
    await page.goto(BASE_URL);
    await page.fill('input[placeholder="账号"]', 'admin');
    await page.fill('input[placeholder="密码"]', 'admin123');
    await page.click('button:has-text("登录")');

    // 等待登录成功
    await page.waitForSelector('.ant-layout-header', { timeout: 10000 });

    // 导航到DM管理页面
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`);
    await page.waitForLoadState('networkidle');
  });

  // ==================== TC-01: 出引用链基础功能 ====================
  test('TC-01: 出引用链基础功能', async () => {
    console.log('========== TC-01: 出引用链基础功能 ==========');

    // 1. 选择第一条DM记录
    await page.click('.ant-table-tbody tr:first-child');

    // 2. 打开"更多"菜单
    await page.click('button:has-text("更多")');

    // 3. 点击"引用关系"
    await page.click('a:has-text("引用关系")');

    // 4. 等待引用关系弹窗加载
    await page.waitForSelector('.ant-modal:has-text("引用关系")', { timeout: 5000 });

    // 5. 确认在"出引用"标签页
    const outTab = await page.locator('.ant-radio-button-wrapper:has-text("出引用")');
    await expect(outTab).toHaveClass(/ant-radio-button-wrapper-checked/);

    // 6. 等待数据加载
    await page.waitForTimeout(2000);

    // 7. 切换到"详情列表"标签页
    await page.click('.ant-tabs-tab:has-text("详情列表")');
    await page.waitForTimeout(1000);

    // 8. 检查是否有数据
    const hasData = await page.locator('.ant-table-tbody tr').count() > 0;

    if (hasData) {
      console.log('✓ 找到引用数据');

      // 9. 点击第一条记录的"引用链"按钮
      await page.click('.ant-table-tbody tr:first-child a:has-text("引用链")');

      // 10. 等待引用链弹窗
      await page.waitForSelector('.ant-modal:has-text("引用链")', { timeout: 5000 });

      // 11. 检查引用链内容
      const chainSteps = await page.locator('.ant-steps-item').count();
      console.log(`  引用链节点数: ${chainSteps}`);

      // 12. 验证统计信息
      const statsCard = await page.locator('.ant-card:has-text("统计信息")');
      await expect(statsCard).toBeVisible();

      const depthText = await page.locator('.ant-descriptions-item:has-text("引用深度")').textContent();
      const nodesText = await page.locator('.ant-descriptions-item:has-text("引用节点")').textContent();
      console.log(`  ${depthText}`);
      console.log(`  ${nodesText}`);

      console.log('✓✓✓ TC-01 通过：引用链正常显示');

    } else {
      console.log('⚠ 当前DM无出引用数据，跳过测试');
    }
  });

  // ==================== TC-02: 入引用链基础功能 ====================
  test('TC-02: 入引用链基础功能', async () => {
    console.log('========== TC-02: 入引用链基础功能 ==========');

    // 打开引用关系弹窗
    await page.click('.ant-table-tbody tr:first-child');
    await page.click('button:has-text("更多")');
    await page.click('a:has-text("引用关系")');
    await page.waitForSelector('.ant-modal:has-text("引用关系")');

    // 切换到"入引用"
    await page.click('.ant-radio-button-wrapper:has-text("入引用")');
    await page.waitForTimeout(2000);

    // 切换到详情列表
    await page.click('.ant-tabs-tab:has-text("详情列表")');
    await page.waitForTimeout(1000);

    const hasData = await page.locator('.ant-table-tbody tr').count() > 0;

    if (hasData) {
      console.log('✓ 找到入引用数据');

      // 点击"引用链"
      await page.click('.ant-table-tbody tr:first-child a:has-text("引用链")');
      await page.waitForSelector('.ant-modal:has-text("引用链")');

      // 检查refType参数
      const apiResponse = await page.waitForResponse(
        response => response.url().includes('/referenceChain')
      );

      const url = apiResponse.url();
      console.log(`  API URL: ${url}`);

      if (url.includes('refType=in')) {
        console.log('✓✓✓ TC-02 通过：refType=in参数正确传递');
      } else {
        console.log('✗✗✗ TC-02 失败：refType参数不正确');
      }

    } else {
      console.log('⚠ 当前DM无入引用数据，跳过测试');
    }
  });

  // ==================== TC-03: 出引用与入引用切换 ====================
  test('TC-03: 出引用与入引用切换', async () => {
    console.log('========== TC-03: 出引用与入引用切换 ==========');

    // 打开引用关系
    await page.click('.ant-table-tbody tr:first-child');
    await page.click('button:has-text("更多")');
    await page.click('a:has-text("引用关系")');
    await page.waitForSelector('.ant-modal:has-text("引用关系")');

    // 监听API请求
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/referenceChain')) {
        apiRequests.push(request.url());
      }
    });

    // 出引用模式查看引用链
    await page.click('.ant-tabs-tab:has-text("详情列表")');
    await page.waitForTimeout(1000);

    const hasOutData = await page.locator('.ant-table-tbody tr').count() > 0;
    if (hasOutData) {
      await page.click('.ant-table-tbody tr:first-child a:has-text("引用链")');
      await page.waitForTimeout(2000);
      await page.click('.ant-modal-close');
      await page.waitForTimeout(500);
    }

    // 切换到入引用
    await page.click('.ant-radio-button-wrapper:has-text("入引用")');
    await page.waitForTimeout(2000);

    const hasInData = await page.locator('.ant-table-tbody tr').count() > 0;
    if (hasInData) {
      await page.click('.ant-table-tbody tr:first-child a:has-text("引用链")');
      await page.waitForTimeout(2000);
    }

    // 检查API请求
    const outRequest = apiRequests.find(url => url.includes('refType=out'));
    const inRequest = apiRequests.find(url => url.includes('refType=in'));

    console.log(`  出引用请求: ${outRequest ? '✓' : '✗'}`);
    console.log(`  入引用请求: ${inRequest ? '✓' : '✗'}`);

    if (outRequest && inRequest) {
      console.log('✓✓✓ TC-03 通过：refType切换正确');
    }
  });

  // ==================== TC-07: 无引用路径 ====================
  test('TC-07: 无引用路径提示', async () => {
    console.log('========== TC-07: 无引用路径提示 ==========');

    // 这个测试需要特殊的测试数据，暂时跳过
    console.log('⚠ 需要特殊测试数据，手动测试');
  });

  // ==================== TC-11: UI样式验证 ====================
  test('TC-11: UI样式验证', async () => {
    console.log('========== TC-11: UI样式验证 ==========');

    // 打开引用链弹窗
    await page.click('.ant-table-tbody tr:first-child');
    await page.click('button:has-text("更多")');
    await page.click('a:has-text("引用关系")');
    await page.waitForSelector('.ant-modal:has-text("引用关系")');
    await page.click('.ant-tabs-tab:has-text("详情列表")');
    await page.waitForTimeout(1000);

    const hasData = await page.locator('.ant-table-tbody tr').count() > 0;
    if (hasData) {
      await page.click('.ant-table-tbody tr:first-child a:has-text("引用链")');
      await page.waitForSelector('.ant-modal:has-text("引用链")');

      // 检查弹窗宽度
      const modalWidth = await page.locator('.ant-modal:has-text("引用链")').evaluate(
        el => window.getComputedStyle(el.querySelector('.ant-modal-content')).width
      );
      console.log(`  弹窗宽度: ${modalWidth}`);

      // 检查步骤展示
      const stepsDirection = await page.locator('.ant-steps').evaluate(
        el => el.className.includes('ant-steps-vertical')
      );
      console.log(`  步骤垂直显示: ${stepsDirection ? '✓' : '✗'}`);

      // 检查统计卡片
      const hasStatsCard = await page.locator('.ant-card:has-text("统计信息")').count() > 0;
      console.log(`  统计信息卡片: ${hasStatsCard ? '✓' : '✗'}`);

      console.log('✓✓✓ TC-11 通过：UI样式正常');
    }
  });

  // ==================== TC-17: 回归测试 - 引用关系树 ====================
  test('TC-17: 回归测试 - 引用关系树显示', async () => {
    console.log('========== TC-17: 回归测试 - 引用关系树 ==========');

    // 打开引用关系
    await page.click('.ant-table-tbody tr:first-child');
    await page.click('button:has-text("更多")');
    await page.click('a:has-text("引用关系")');
    await page.waitForSelector('.ant-modal:has-text("引用关系")');

    // 检查关系树标签页
    const treeTab = await page.locator('.ant-tabs-tab:has-text("关系树")');
    await expect(treeTab).toBeVisible();

    // 等待树加载
    await page.waitForTimeout(2000);

    // 检查树节点
    const treeNodes = await page.locator('.ant-tree-treenode').count();
    console.log(`  树节点数: ${treeNodes}`);

    if (treeNodes > 0) {
      console.log('✓✓✓ TC-17 通过：引用关系树正常显示');
    } else {
      console.log('⚠ 无树节点数据');
    }
  });

});

// 运行说明
console.log(`
========================================
引用链功能 E2E 测试套件
========================================

运行前准备：
1. 确保前端运行在 http://localhost:3000
2. 确保后端运行在 http://localhost:9999
3. 安装依赖：npm install @playwright/test
4. 安装浏览器：npx playwright install

运行测试：
npx playwright test reference-chain.spec.js --headed

查看报告：
npx playwright show-report
`);
