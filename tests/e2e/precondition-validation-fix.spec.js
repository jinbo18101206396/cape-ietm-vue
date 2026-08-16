/**
 * 前置条件校验修复验证测试
 *
 * 测试修复的3处前置条件：
 * 1. 签出按钮 - 工作流校验（前端）
 * 2. 签出确认 - 工作流校验（前端二次查询）
 * 3. 项目参数 - 格式校验（前端）
 *
 * 策略：非破坏性测试 - 使用Mock/拦截API，不真实修改数据库
 */

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API_BASE = 'http://localhost:9999/jeecg-boot';

// 测试账号
const USERNAME = 'admin';
const PASSWORD = '123456';
let TOKEN = '';

test.describe('前置条件校验修复验证', () => {

  test.beforeAll(async ({ request }) => {
    // 登录获取token
    const loginResp = await request.post(`${API_BASE}/sys/login`, {
      data: { username: USERNAME, password: PASSWORD }
    });
    const loginData = await loginResp.json();
    if (loginData.success && loginData.result && loginData.result.token) {
      TOKEN = loginData.result.token;
    }
  });

  test.beforeEach(async ({ page }) => {
    // 注入token到localStorage
    await page.goto(BASE);
    await page.evaluate((token) => {
      localStorage.setItem('pro__Access-Token', token);
      localStorage.setItem('Vue-Access-Token', token);
    }, TOKEN);
  });

  test('P0-1: 签出按钮 - 未启动工作流应拒绝', async ({ page }) => {
    // Mock列表API，返回未启动工作流的DM
    await page.route('**/ietm/datamodule/list**', async route => {
      const resp = await route.fetch();
      const json = await resp.json();

      if (json.result && json.result.records && json.result.records.length > 0) {
        // 修改第一条数据：未启动工作流
        json.result.records[0].workflowInstanceId = null;  // 未启动工作流
        json.result.records[0].workflowStep = null;
        json.result.records[0].workflowStatus = null;
        json.result.records[0].workflowStatus_dictText = '未启动';
        json.result.records[0].checkoutUser = null;  // 未被签出
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      });
    });

    // 进入列表页
    await page.goto(`${BASE}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(1000);

    // 选中第一行
    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // 点击签出按钮
    const checkoutBtn = page.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(500);

    // 验证：应显示警告消息
    const warningMsg = page.locator('.ant-message-warning');
    await expect(warningMsg).toBeVisible({ timeout: 3000 });
    const msgText = await warningMsg.textContent();
    expect(msgText).toContain('该DM还未启动流程');

    // 验证：不应弹出签出确认对话框
    const modal = page.locator('.ant-modal-title:has-text("签出确认")');
    await expect(modal).not.toBeVisible();
  });

  test('P0-2: 签出按钮 - 非DM编写节点应拒绝', async ({ page }) => {
    // Mock列表API，返回审核中节点的DM
    await page.route('**/ietm/datamodule/list**', async route => {
      const resp = await route.fetch();
      const json = await resp.json();

      if (json.result && json.result.records && json.result.records.length > 0) {
        // 修改第一条数据：已启动工作流，但节点为"审核"
        json.result.records[0].workflowInstanceId = 'wf_test_12345';  // 已启动
        json.result.records[0].workflowStep = '审核';  // 非"DM编写"节点
        json.result.records[0].workflowStatus = '1';
        json.result.records[0].workflowStatus_dictText = '进行中';
        json.result.records[0].checkoutUser = null;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      });
    });

    await page.goto(`${BASE}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    const checkoutBtn = page.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(500);

    // 验证：应显示警告消息
    const warningMsg = page.locator('.ant-message-warning');
    await expect(warningMsg).toBeVisible({ timeout: 3000 });
    const msgText = await warningMsg.textContent();
    expect(msgText).toContain('当前流程节点不是"DM编写"');

    // 验证：不应弹出签出确认对话框
    const modal = page.locator('.ant-modal-title:has-text("签出确认")');
    await expect(modal).not.toBeVisible();
  });

  test('P0-3: 签出确认 - 二次查询发现工作流状态变化应拒绝', async ({ page }) => {
    // Mock列表API：初始返回正常状态
    await page.route('**/ietm/datamodule/list**', async route => {
      const resp = await route.fetch();
      const json = await resp.json();

      if (json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = 'wf_test_12345';
        json.result.records[0].workflowStep = 'DM编写';  // 正常节点
        json.result.records[0].workflowStatus = '1';
        json.result.records[0].checkoutUser = null;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      });
    });

    // Mock queryById API：返回工作流已取消的状态（模拟并发变更）
    await page.route('**/ietm/datamodule/queryById**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            id: 'test_dm_001',
            workflowInstanceId: null,  // 工作流已被取消
            workflowStep: null,
            checkoutUser: null
          }
        })
      });
    });

    await page.goto(`${BASE}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    const checkoutBtn = page.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(500);

    // 应弹出确认对话框（按钮校验通过）
    const modal = page.locator('.ant-modal-title:has-text("签出确认")');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 点击确定按钮
    const okBtn = page.locator('.ant-modal-footer button.ant-btn-primary:has-text("确定")');
    await okBtn.click();
    await page.waitForTimeout(500);

    // 验证：应显示错误消息（二次查询校验失败）
    const errorMsg = page.locator('.ant-message-error');
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
    const msgText = await errorMsg.textContent();
    expect(msgText).toContain('该DM还未启动流程');
  });

  test('P0-4: 签出确认 - 二次查询发现节点变化应拒绝', async ({ page }) => {
    // Mock列表API：初始返回DM编写节点
    await page.route('**/ietm/datamodule/list**', async route => {
      const resp = await route.fetch();
      const json = await resp.json();

      if (json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = 'wf_test_12345';
        json.result.records[0].workflowStep = 'DM编写';
        json.result.records[0].workflowStatus = '1';
        json.result.records[0].checkoutUser = null;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      });
    });

    // Mock queryById API：返回节点已变为"审核"
    await page.route('**/ietm/datamodule/queryById**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            id: 'test_dm_001',
            workflowInstanceId: 'wf_test_12345',
            workflowStep: '审核',  // 节点已变化
            checkoutUser: null
          }
        })
      });
    });

    await page.goto(`${BASE}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    const checkoutBtn = page.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.ant-modal-title:has-text("签出确认")');
    await expect(modal).toBeVisible({ timeout: 3000 });

    const okBtn = page.locator('.ant-modal-footer button.ant-btn-primary:has-text("确定")');
    await okBtn.click();
    await page.waitForTimeout(500);

    // 验证：应显示错误消息
    const errorMsg = page.locator('.ant-message-error');
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
    const msgText = await errorMsg.textContent();
    expect(msgText).toContain('当前流程节点不是"DM编写"');
  });

  test('P0-5: 签出成功 - 合法场景应通过（回归测试）', async ({ page }) => {
    // Mock列表API：正常状态
    await page.route('**/ietm/datamodule/list**', async route => {
      const resp = await route.fetch();
      const json = await resp.json();

      if (json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = 'wf_test_12345';
        json.result.records[0].workflowStep = 'DM编写';
        json.result.records[0].workflowStatus = '1';
        json.result.records[0].checkoutUser = null;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      });
    });

    // Mock queryById API：返回正常状态
    await page.route('**/ietm/datamodule/queryById**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            id: 'test_dm_001',
            workflowInstanceId: 'wf_test_12345',
            workflowStep: 'DM编写',
            checkoutUser: null,
            inWork: '01',
            issueNo: '001'
          }
        })
      });
    });

    // Mock签出API：成功
    await page.route('**/ietm/datamodule/checkOut**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '签出成功' })
      });
    });

    await page.goto(`${BASE}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    const checkoutBtn = page.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(500);

    // 确认对话框出现
    const modal = page.locator('.ant-modal-title:has-text("签出确认")');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // 点击确定
    const okBtn = page.locator('.ant-modal-footer button.ant-btn-primary:has-text("确定")');
    await okBtn.click();
    await page.waitForTimeout(500);

    // 验证：应显示成功消息
    const successMsg = page.locator('.ant-message-success');
    await expect(successMsg).toBeVisible({ timeout: 3000 });
    const msgText = await successMsg.textContent();
    expect(msgText).toContain('签出成功');
  });

  test.skip('P0-6: 项目参数 - 非法cageCode应拒绝', async ({ page }) => {
    // 注意：此测试需要真实项目数据和项目参数配置页面
    // 标记为skip，实际测试时需要手工验证或调整测试路径

    await page.goto(`${BASE}/#/ietm/IetmProjectList`);
    await page.waitForTimeout(1000);

    // TODO: 导航到项目参数配置页面（具体路径需确认）
    // TODO: 输入非法cageCode（如"123"，应为5位）
    // TODO: 点击保存
    // TODO: 验证错误提示："必须为5位字母或数字"
  });
});
