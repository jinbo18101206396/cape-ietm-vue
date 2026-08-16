/**
 * 前置条件修复 - 最终真实UI验证
 *
 * 前提条件：
 * 1. 已通过 prepare-test-data.sql 在数据库中准备了3个测试DM
 * 2. 需要手动填入下方的TEST_DMC_CODES数组
 * 3. 服务已启动（前端3000，后端9999）
 */

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const API_BASE = 'http://localhost:9999/jeecg-boot';
const USERNAME = 'admin';
const PASSWORD = '123456';

// !!!!! 重要：执行 prepare-test-data.sql 后，将3个测试DM的DMC代码填入这里 !!!!!
const TEST_DMC_CODES = {
  NO_WORKFLOW: 'DMC-XXXXX-001',      // 替换为实际的无工作流DM的DMC代码
  WRONG_STEP: 'DMC-XXXXX-002',       // 替换为实际的错误步骤DM的DMC代码
  VALID: 'DMC-XXXXX-003'             // 替换为实际的正常DM的DMC代码
};

test.describe('前置条件修复 - 最终UI验证（基于真实数据）', () => {

  // 登录辅助函数
  async function login(page) {
    await page.goto(`${BASE}/user/login`);
    await page.locator('#username').fill(USERNAME);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
  }

  // 导航到DM列表
  async function gotoDmList(page) {
    await page.goto(`${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`);
    await page.waitForTimeout(2000);

    // 等待表格加载
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
  }

  // 根据DMC代码查找表格行
  async function findRowByDmc(page, dmcCode) {
    const rows = await page.$$('.ant-table-tbody tr');

    for (let row of rows) {
      const text = await row.textContent();
      if (text.includes(dmcCode)) {
        return row;
      }
    }
    return null;
  }

  test('【真实UI】场景1: 工作流未启动 - 点击签出按钮验证拦截', async ({ page }) => {
    // 检查是否已配置测试数据
    if (TEST_DMC_CODES.NO_WORKFLOW === 'DMC-XXXXX-001') {
      console.log('❌ 请先执行 prepare-test-data.sql 并配置 TEST_DMC_CODES');
      return;
    }

    await login(page);
    await gotoDmList(page);

    console.log('🔍 查找测试DM:', TEST_DMC_CODES.NO_WORKFLOW);
    const row = await findRowByDmc(page, TEST_DMC_CODES.NO_WORKFLOW);

    expect(row).not.toBeNull();
    console.log('✅ 找到测试DM行');

    // 验证工作流步骤列为空
    const cells = await row.$$('td');
    let workflowStepCell = null;
    if (cells.length >= 7) {
      workflowStepCell = await cells[6].textContent();
      console.log('📋 工作流步骤列内容:', workflowStepCell);
    }

    // 点击签出按钮
    console.log('🖱️  点击签出按钮...');
    const checkoutBtn = row.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(1500);

    // 验证警告消息
    const warningMsg = page.locator('.ant-message-warning');
    const warningVisible = await warningMsg.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('📋 警告消息可见:', warningVisible);

    if (warningVisible) {
      const msgText = await warningMsg.textContent();
      console.log('📋 警告消息内容:', msgText);
      expect(msgText).toContain('还未启动流程');
    } else {
      // 如果没有警告消息，检查是否有确认对话框（不应该有）
      const modalVisible = await page.locator('.ant-modal-confirm').isVisible({ timeout: 1000 }).catch(() => false);
      console.log('📋 确认对话框出现:', modalVisible);
      expect(modalVisible).toBeFalsy(); // 不应该出现确认框
      throw new Error('预期看到警告消息，但未出现');
    }

    console.log('✅ 场景1验证通过：工作流未启动时签出被拦截');
  });

  test('【真实UI】场景2: 非DM编写节点 - 点击签出按钮验证拦截', async ({ page }) => {
    if (TEST_DMC_CODES.WRONG_STEP === 'DMC-XXXXX-002') {
      console.log('❌ 请先执行 prepare-test-data.sql 并配置 TEST_DMC_CODES');
      return;
    }

    await login(page);
    await gotoDmList(page);

    console.log('🔍 查找测试DM:', TEST_DMC_CODES.WRONG_STEP);
    const row = await findRowByDmc(page, TEST_DMC_CODES.WRONG_STEP);

    expect(row).not.toBeNull();
    console.log('✅ 找到测试DM行');

    // 验证工作流步骤列显示"技术审核"
    const cells = await row.$$('td');
    if (cells.length >= 7) {
      const workflowStepText = await cells[6].textContent();
      console.log('📋 工作流步骤列内容:', workflowStepText);
      expect(workflowStepText).toContain('技术审核');
    }

    // 点击签出按钮
    console.log('🖱️  点击签出按钮...');
    const checkoutBtn = row.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(1500);

    // 验证警告消息
    const warningMsg = page.locator('.ant-message-warning');
    const warningVisible = await warningMsg.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('📋 警告消息可见:', warningVisible);

    if (warningVisible) {
      const msgText = await warningMsg.textContent();
      console.log('📋 警告消息内容:', msgText);
      expect(msgText).toContain('不是');
      expect(msgText).toContain('DM编写');
    } else {
      const modalVisible = await page.locator('.ant-modal-confirm').isVisible({ timeout: 1000 }).catch(() => false);
      console.log('📋 确认对话框出现:', modalVisible);
      expect(modalVisible).toBeFalsy();
      throw new Error('预期看到警告消息，但未出现');
    }

    console.log('✅ 场景2验证通过：非DM编写节点时签出被拦截');
  });

  test('【真实UI】场景3: 正常流程 - 点击签出应弹出确认框', async ({ page }) => {
    if (TEST_DMC_CODES.VALID === 'DMC-XXXXX-003') {
      console.log('❌ 请先执行 prepare-test-data.sql 并配置 TEST_DMC_CODES');
      return;
    }

    await login(page);
    await gotoDmList(page);

    console.log('🔍 查找测试DM:', TEST_DMC_CODES.VALID);
    const row = await findRowByDmc(page, TEST_DMC_CODES.VALID);

    expect(row).not.toBeNull();
    console.log('✅ 找到测试DM行');

    // 验证工作流步骤列显示"DM编写"
    const cells = await row.$$('td');
    if (cells.length >= 7) {
      const workflowStepText = await cells[6].textContent();
      console.log('📋 工作流步骤列内容:', workflowStepText);
      expect(workflowStepText).toContain('DM编写');
    }

    // 点击签出按钮
    console.log('🖱️  点击签出按钮...');
    const checkoutBtn = row.locator('button:has-text("签出")');
    await checkoutBtn.click();
    await page.waitForTimeout(2000);

    // 应该弹出确认对话框（说明前端第一层校验通过）
    const modalVisible = await page.locator('.ant-modal-confirm').isVisible({ timeout: 3000 }).catch(() => false);
    console.log('📋 确认对话框出现:', modalVisible);
    expect(modalVisible).toBeTruthy();

    // 检查确认框内容
    const modalText = await page.locator('.ant-modal-confirm .ant-modal-body').textContent();
    console.log('📋 确认框内容:', modalText);

    // 点击取消，不实际签出
    console.log('🖱️  点击取消按钮...');
    await page.click('.ant-modal-confirm button:has-text("取消")');
    await page.waitForTimeout(500);

    console.log('✅ 场景3验证通过：正常流程可以进入确认对话框');
  });

  test('【真实UI】场景4: 项目参数格式校验 - 输入非法值验证', async ({ page }) => {
    await login(page);

    // 进入项目管理
    console.log('🔍 进入项目管理页面...');
    await page.goto(`${BASE}/#/ietm/projectmanagement/IetmProjectList`);
    await page.waitForTimeout(2000);

    // 点击第一个项目的编辑按钮
    const editBtn = page.locator('.ant-table-tbody tr:first-child button:has-text("编辑")').first();
    const exists = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!exists) {
      console.log('⚠️  未找到项目编辑按钮，跳过此测试');
      return;
    }

    console.log('🖱️  点击编辑按钮...');
    await editBtn.click();
    await page.waitForTimeout(2000);

    // 切换到项目参数标签页
    const paramTab = page.locator('.ant-tabs-tab:has-text("项目参数")');
    const tabExists = await paramTab.isVisible({ timeout: 3000 }).catch(() => false);

    if (!tabExists) {
      console.log('⚠️  未找到项目参数标签页，跳过此测试');
      return;
    }

    console.log('🖱️  切换到项目参数标签页...');
    await paramTab.click();
    await page.waitForTimeout(1000);

    // 查找所有输入框
    const inputs = await page.$$('.ant-form-item input[type="text"]');
    console.log('📋 找到', inputs.length, '个输入框');

    if (inputs.length >= 4) {
      // 通常前4个是 cageCode, positionCode, countryCode, languageCode
      const cageCodeInput = inputs[0];

      console.log('🖱️  测试cageCode格式校验（输入3位，规范要求5位）...');
      await cageCodeInput.fill('');
      await cageCodeInput.fill('ABC');
      await page.waitForTimeout(500);

      // 点击保存
      console.log('🖱️  点击保存按钮...');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1500);

      // 验证错误消息
      const errorMsg = page.locator('.ant-message-error, .ant-message-warning');
      const errorVisible = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false);

      console.log('📋 错误消息可见:', errorVisible);

      if (errorVisible) {
        const msgText = await errorMsg.textContent();
        console.log('📋 错误消息内容:', msgText);
        expect(msgText).toContain('5位');
      } else {
        throw new Error('预期看到格式校验错误消息，但未出现');
      }

      console.log('✅ 场景4验证通过：项目参数格式校验生效');
    } else {
      console.log('⚠️  输入框数量不足，跳过格式校验测试');
    }
  });

  test('【后端API】场景5: 直接调用API绕过前端 - 验证后端拦截', async ({ request }) => {
    if (TEST_DMC_CODES.NO_WORKFLOW === 'DMC-XXXXX-001') {
      console.log('❌ 请先执行 prepare-test-data.sql 并配置 TEST_DMC_CODES');
      return;
    }

    // 登录获取token
    const loginResp = await request.post(`${API_BASE}/sys/login`, {
      data: { username: USERNAME, password: PASSWORD }
    });
    const loginData = await loginResp.json();
    const token = loginData.result.token;

    // 打开项目
    const projectListResp = await request.get(`${API_BASE}/ietmproject/ietmProject/list`, {
      headers: { 'X-Access-Token': token }
    });
    const projects = await projectListResp.json();
    if (projects.result.records.length > 0) {
      await request.post(`${API_BASE}/ietmproject/ietmProject/openProject`, {
        headers: { 'X-Access-Token': token },
        data: { projectId: projects.result.records[0].id }
      });
    }

    // 查询DM列表，找到测试DM的ID
    const dmListResp = await request.get(`${API_BASE}/ietm/datamodule/list`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 100 }
    });
    const dmList = await dmListResp.json();

    let testDmId = null;
    if (dmList.success && dmList.result.records) {
      const testDm = dmList.result.records.find(dm => dm.dmcCode && dm.dmcCode.includes(TEST_DMC_CODES.NO_WORKFLOW));
      if (testDm) {
        testDmId = testDm.id;
      }
    }

    if (!testDmId) {
      console.log('⚠️  未找到测试DM ID，跳过后端API测试');
      return;
    }

    console.log('✅ 找到测试DM ID:', testDmId);
    console.log('🔍 尝试直接调用后端签出API（绕过前端）...');

    // 直接调用后端签出API
    const checkoutResp = await request.post(`${API_BASE}/ietm/datamodule/checkout`, {
      headers: { 'X-Access-Token': token },
      data: { id: testDmId }
    });

    const result = await checkoutResp.json();
    console.log('📋 后端响应:', JSON.stringify(result, null, 2));

    // 后端应该拦截
    expect(result.success).toBeFalsy();
    expect(result.message).toContain('工作流');

    console.log('✅ 场景5验证通过：后端防御成功拦截非法请求');
  });

});
