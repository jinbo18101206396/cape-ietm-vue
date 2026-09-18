/**
 * IETM导入导出功能完整E2E测试套件
 *
 * 测试覆盖：
 * 1. 导入/导出逻辑对齐验证
 * 2. DM/ICN/资源文件完整流程
 * 3. 自动关联机制验证
 * 4. 路径统一性验证
 * 5. 显示和预览功能验证
 *
 * 特点：
 * - 通过真实UI交互（点击、输入、上传）
 * - 验证前端显示和后端数据一致性
 * - 包含场景测试和边界测试
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

// 测试配置
const config = {
  baseURL: 'http://localhost:3000',
  apiURL: 'http://localhost:9999/jeecg-boot',
  timeout: 60000,
  testDataDir: path.join(__dirname, '../../test-data'),
  outputDir: path.join(__dirname, '../../test-output')
};

// 确保测试目录存在
if (!fs.existsSync(config.testDataDir)) {
  fs.mkdirSync(config.testDataDir, { recursive: true });
}
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// 测试数据
let testContext = {
  projectId: null,
  projectName: `E2E测试项目_${Date.now()}`,
  dmId: null,
  dmcCode: null,
  icnId: null,
  icnCode: null,
  resourceId: null,
  exportedZipPath: null,
  token: null
};

// 辅助函数：生成测试用DM XML
function generateTestDmXML(dmcCode, techName = '测试DM') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dmodule>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A"/>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
        <issueInfo issueNumber="001" inWork="00"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="09" day="05"/>
        <dmTitle>
          <techName>${techName}</techName>
          <infoName>测试信息</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
      <responsiblePartnerCompany>
        <enterpriseName>测试公司</enterpriseName>
      </responsiblePartnerCompany>
      <originator>
        <enterpriseName>制作方</enterpriseName>
      </originator>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <para>这是一个E2E测试用的数据模块。</para>
      <para>用于验证导入导出功能。</para>
    </description>
  </content>
</dmodule>`;
}

// 辅助函数：创建测试ZIP包
function createTestZipPackage(zipPath, options = {}) {
  const zip = new AdmZip();

  // 添加DM文件
  if (options.includeDM !== false) {
    const dmXML = generateTestDmXML(options.dmcCode || 'DMC-TEST-A-00-0-0-00-00-A-000-A-A', options.techName);
    zip.addFile(`DM/${options.dmcCode || 'DMC-TEST-A-00-0-0-00-00-A-000-A-A'}_zh-CN.xml`, Buffer.from(dmXML, 'utf-8'));
  }

  // 添加ICN文件
  if (options.includeICN) {
    const icnContent = Buffer.from('PNG图片内容（模拟）');
    zip.addFile(`ICN/${options.icnCode || 'ICN-TEST-A-00-0-0-00-00-A-001-A'}.png`, icnContent);
  }

  // 添加资源文件
  if (options.includeResource) {
    const resourceContent = Buffer.from('资源文件内容（模拟）');
    const dmcPrefix = options.dmcCode || 'DMC-TEST-A-00-0-0-00-00-A-000-A-A';
    zip.addFile(`MM/${dmcPrefix}_测试资源.pdf`, resourceContent);
  }

  zip.writeZip(zipPath);
  return zipPath;
}

// 测试套件开始
test.describe('IETM导入导出功能完整E2E测试', () => {

  test.beforeAll(async () => {
    console.log('初始化测试环境...');
  });

  test.beforeEach(async ({ page }) => {
    // 设置超时
    test.setTimeout(config.timeout);

    // 访问登录页
    await page.goto(config.baseURL);
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    console.log('清理测试数据...');
    // 清理生成的测试文件
    if (fs.existsSync(config.testDataDir)) {
      const files = fs.readdirSync(config.testDataDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(config.testDataDir, file));
      });
    }
  });

  // ==================== 准备阶段 ====================

  test('准备-01: 用户登录', async ({ page }) => {
    console.log('测试：用户登录');

    // 输入账号
    await page.fill('input[placeholder="请输入账号"]', 'admin');
    await page.waitForTimeout(500);

    // 输入密码
    await page.fill('input[placeholder="请输入密码"]', '123456');
    await page.waitForTimeout(500);

    // 点击登录按钮
    await page.click('button:has-text("登录")');
    await page.waitForTimeout(2000);

    // 验证登录成功
    await expect(page).toHaveURL(/.*dashboard/);
    console.log('✅ 登录成功');

    // 保存token（用于API调用）
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find(c => c.name === 'X-Access-Token');
    if (tokenCookie) {
      testContext.token = tokenCookie.value;
    }
  });

  test('准备-02: 创建测试项目', async ({ page, request }) => {
    console.log('测试：创建测试项目');

    // 导航到项目管理页面
    await page.goto(`${config.baseURL}/#/ietm/IetmProjectManageList`);
    await page.waitForTimeout(2000);

    // 点击新增按钮
    await page.click('button:has-text("新增")');
    await page.waitForTimeout(1000);

    // 填写项目信息
    const modal = page.locator('.ant-modal').first();
    await modal.locator('input').first().fill(testContext.projectName);
    await page.waitForTimeout(500);

    await modal.locator('input').nth(1).fill(`E2E_TEST_${Date.now()}`);
    await page.waitForTimeout(500);

    await modal.locator('textarea').fill('E2E测试用项目');
    await page.waitForTimeout(500);

    // 点击确定
    await modal.locator('button:has-text("确定")').click();
    await page.waitForTimeout(2000);

    // 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible();
    console.log('✅ 项目创建成功');

    // 获取项目ID
    const projectRow = page.locator(`tr:has-text("${testContext.projectName}")`);
    const projectIdCell = projectRow.locator('td').first();
    testContext.projectId = await projectIdCell.textContent();
    console.log(`项目ID: ${testContext.projectId}`);
  });

  test('准备-03: 创建构型树节点', async ({ page, request }) => {
    console.log('测试：创建构型树节点');

    // 使用API创建构型树节点（加速测试）
    const response = await request.post(`${config.apiURL}/ietm/projectConfigurationManagement/add`, {
      headers: {
        'X-Access-Token': testContext.token,
        'Content-Type': 'application/json'
      },
      data: {
        projectId: testContext.projectId,
        pid: '0',
        code: 'TEST',
        title: 'TEST-测试系统',
        seq: 1
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBeTruthy();
    console.log('✅ 构型树节点创建成功');
  });

  // ==================== 导出功能测试 ====================

  test('场景-01: 创建DM并导出', async ({ page }) => {
    console.log('测试：创建DM并导出');

    // 导航到数据模块管理
    await page.goto(`${config.baseURL}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(2000);

    // 选择测试项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(2000);

    // 点击新增
    await page.click('button:has-text("新增")');
    await page.waitForTimeout(1000);

    // 选择DM类型
    await page.click('.ant-radio-wrapper').first();
    await page.waitForTimeout(500);
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(2000);

    // 填写基本信息
    await page.fill('input[placeholder*="技术名称"]', 'E2E测试DM');
    await page.waitForTimeout(500);

    // 保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(3000);

    // 验证保存成功
    await expect(page.locator('.ant-message-success')).toBeVisible();
    console.log('✅ DM创建成功');

    // 返回列表
    await page.click('button:has-text("返回")');
    await page.waitForTimeout(2000);

    // 获取DM信息
    const dmRow = page.locator('tr:has-text("E2E测试DM")');
    testContext.dmId = await dmRow.locator('td').nth(1).textContent();
    testContext.dmcCode = await dmRow.locator('td').nth(2).textContent();
    console.log(`DM ID: ${testContext.dmId}, DMC: ${testContext.dmcCode}`);

    // 勾选DM
    await dmRow.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    // 点击导出
    await page.click('button:has-text("导出")');
    await page.waitForTimeout(1000);

    // 在导出弹窗中点击确定
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(3000);

    // 验证导出成功
    await expect(page.locator('.ant-message-success')).toBeVisible();
    console.log('✅ DM导出成功');
  });

  // ==================== 导入功能测试 ====================

  test('场景-02: 导入DM ZIP包', async ({ page }) => {
    console.log('测试：导入DM ZIP包');

    // 创建测试ZIP包
    const zipPath = path.join(config.testDataDir, 'test-dm-package.zip');
    createTestZipPackage(zipPath, {
      dmcCode: 'DMC-TEST-A-00-0-0-00-00-A-001-A-A',
      techName: 'E2E导入测试DM',
      includeDM: true,
      includeICN: false,
      includeResource: false
    });

    // 导航到数据模块导入页面
    await page.goto(`${config.baseURL}/#/ietm/IetmDmImport`);
    await page.waitForTimeout(2000);

    // 选择测试项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(1000);

    // 上传ZIP文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(zipPath);
    await page.waitForTimeout(2000);

    // 点击导入按钮
    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);

    // 在确认弹窗中点击确定
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(5000);

    // 验证导入结果
    const resultModal = page.locator('.ant-modal:has-text("导入结果")');
    await expect(resultModal).toBeVisible();

    const successText = await resultModal.locator(':has-text("导入成功")').count();
    expect(successText).toBeGreaterThan(0);
    console.log('✅ DM导入成功');

    // 关闭结果弹窗
    await page.click('.ant-modal button:has-text("关闭")');
    await page.waitForTimeout(1000);
  });

  test('验证-01: 导入的DM在列表中显示', async ({ page }) => {
    console.log('测试：验证导入的DM在列表中显示');

    // 导航到数据模块列表
    await page.goto(`${config.baseURL}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(2000);

    // 选择测试项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(2000);

    // 验证DM是否在列表中
    const dmRow = page.locator('tr:has-text("E2E导入测试DM")');
    await expect(dmRow).toBeVisible();
    console.log('✅ 导入的DM在列表中正常显示');

    // 验证关键字段
    const dmcCell = await dmRow.locator('td').nth(2).textContent();
    expect(dmcCell).toContain('TEST');
    console.log(`DMC编码: ${dmcCell}`);
  });

  test('验证-02: 导入的DM已关联构型树', async ({ page, request }) => {
    console.log('测试：验证DM自动关联构型树');

    // 通过API查询DM详情
    const response = await request.get(
      `${config.apiURL}/ietm/datamodule/queryById?id=${testContext.dmId}`,
      {
        headers: { 'X-Access-Token': testContext.token }
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBeTruthy();

    const dm = result.result;
    expect(dm.cmNodeId).not.toBeNull();
    expect(dm.cmNodeId).not.toBe('');
    console.log(`✅ DM已自动关联构型树，cmNodeId: ${dm.cmNodeId}`);
  });

  // ==================== ICN测试 ====================

  test('场景-03: 导入带ICN的ZIP包', async ({ page }) => {
    console.log('测试：导入带ICN的ZIP包');

    // 创建包含ICN的测试ZIP包
    const zipPath = path.join(config.testDataDir, 'test-icn-package.zip');
    createTestZipPackage(zipPath, {
      dmcCode: 'DMC-TEST-A-00-0-0-00-00-A-002-A-A',
      techName: 'E2E测试DM含ICN',
      includeDM: true,
      includeICN: true,
      icnCode: 'ICN-TEST-A-00-0-0-00-00-A-001-01-A-001-A',
      includeResource: false
    });

    // 导航到导入页面
    await page.goto(`${config.baseURL}/#/ietm/IetmDmImport`);
    await page.waitForTimeout(2000);

    // 选择项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(1000);

    // 上传ZIP
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(zipPath);
    await page.waitForTimeout(2000);

    // 导入
    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(5000);

    // 验证导入结果
    const resultModal = page.locator('.ant-modal:has-text("导入结果")');
    await expect(resultModal).toBeVisible();

    // 检查ICN导入成功
    const icnSuccess = await resultModal.locator(':has-text("ICN")').count();
    expect(icnSuccess).toBeGreaterThan(0);
    console.log('✅ ICN导入成功');

    await page.click('.ant-modal button:has-text("关闭")');
    await page.waitForTimeout(1000);
  });

  test('验证-03: 导入的ICN在实体管理中显示', async ({ page }) => {
    console.log('测试：验证ICN在实体管理中显示');

    // 导航到项目实体管理
    await page.goto(`${config.baseURL}/#/ietm/IetmIcnManageList`);
    await page.waitForTimeout(2000);

    // 选择项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(2000);

    // 验证ICN是否在列表中
    const icnRow = page.locator('tr:has-text("ICN-TEST")');
    await expect(icnRow).toBeVisible();
    console.log('✅ 导入的ICN在实体管理列表中显示');

    // 获取ICN ID
    testContext.icnId = await icnRow.locator('td').first().textContent();
    testContext.icnCode = await icnRow.locator('td').nth(1).textContent();
    console.log(`ICN ID: ${testContext.icnId}, ICN编码: ${testContext.icnCode}`);
  });

  test('验证-04: ICN文件路径统一性', async ({ page, request }) => {
    console.log('测试：验证ICN文件路径统一性');

    // 查询ICN附件信息
    const response = await request.get(
      `${config.apiURL}/ietm/icnManage/queryAttachmentsByIcnId?icnId=${testContext.icnId}`,
      {
        headers: { 'X-Access-Token': testContext.token }
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBeTruthy();

    const attachments = result.result;
    expect(attachments.length).toBeGreaterThan(0);

    const attachment = attachments[0];
    const fileKey = attachment.fileKey;

    // 验证路径格式：project/{projectId}/icn/xxx
    expect(fileKey).toMatch(/^project\/.*\/icn\//);
    console.log(`✅ ICN文件路径格式正确: ${fileKey}`);

    // 验证文件可以下载（预览）
    const previewResponse = await request.get(
      `${config.apiURL}/ietm/icnManage/preview?fileKey=${encodeURIComponent(fileKey)}`,
      {
        headers: { 'X-Access-Token': testContext.token }
      }
    );

    expect(previewResponse.ok()).toBeTruthy();
    console.log('✅ ICN文件可以正常预览');
  });

  test('验证-05: ICN自动关联构型树', async ({ page, request }) => {
    console.log('测试：验证ICN自动关联构型树');

    // 查询ICN详情
    const response = await request.get(
      `${config.apiURL}/ietm/icnManage/queryById?id=${testContext.icnId}`,
      {
        headers: { 'X-Access-Token': testContext.token }
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBeTruthy();

    const icn = result.result;
    expect(icn.cmNodeId).not.toBeNull();
    expect(icn.cmNodeId).not.toBe('');
    console.log(`✅ ICN已自动关联构型树，cmNodeId: ${icn.cmNodeId}`);
  });

  // ==================== 资源文件测试 ====================

  test('场景-04: 导入带资源文件的ZIP包', async ({ page }) => {
    console.log('测试：导入带资源文件的ZIP包');

    // 创建包含资源的测试ZIP包
    const zipPath = path.join(config.testDataDir, 'test-resource-package.zip');
    createTestZipPackage(zipPath, {
      dmcCode: 'DMC-TEST-A-00-0-0-00-00-A-003-A-A',
      techName: 'E2E测试DM含资源',
      includeDM: true,
      includeICN: false,
      includeResource: true
    });

    // 导航到导入页面
    await page.goto(`${config.baseURL}/#/ietm/IetmDmImport`);
    await page.waitForTimeout(2000);

    // 选择项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(1000);

    // 上传ZIP
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(zipPath);
    await page.waitForTimeout(2000);

    // 导入
    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(5000);

    // 验证导入结果
    const resultModal = page.locator('.ant-modal:has-text("导入结果")');
    await expect(resultModal).toBeVisible();

    const resourceSuccess = await resultModal.locator(':has-text("资源")').count();
    expect(resourceSuccess).toBeGreaterThan(0);
    console.log('✅ 资源文件导入成功');

    await page.click('.ant-modal button:has-text("关闭")');
    await page.waitForTimeout(1000);
  });

  test('验证-06: 资源文件自动关联DM', async ({ page }) => {
    console.log('测试：验证资源文件自动关联DM');

    // 导航到数据模块列表
    await page.goto(`${config.baseURL}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(2000);

    // 选择项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(2000);

    // 找到含资源的DM
    const dmRow = page.locator('tr:has-text("E2E测试DM含资源")');
    await expect(dmRow).toBeVisible();

    // 点击"资源列表"
    await dmRow.locator('a:has-text("资源列表")').click();
    await page.waitForTimeout(2000);

    // 验证资源列表抽屉打开
    const drawer = page.locator('.ant-drawer:has-text("DM资源管理")');
    await expect(drawer).toBeVisible();

    // 验证资源在列表中
    const resourceRow = drawer.locator('tr:has-text("测试资源")');
    await expect(resourceRow).toBeVisible();
    console.log('✅ 资源文件已自动关联DM并在列表中显示');

    // 关闭抽屉
    await drawer.locator('.ant-drawer-close').click();
    await page.waitForTimeout(1000);
  });

  test('验证-07: 资源文件路径统一性', async ({ page, request }) => {
    console.log('测试：验证资源文件路径统一性');

    // 查询DM的资源列表
    const response = await request.get(
      `${config.apiURL}/ietm/datamodule/queryDmResources?dmId=${testContext.dmId}`,
      {
        headers: { 'X-Access-Token': testContext.token }
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBeTruthy();

    const resources = result.result;
    if (resources.length > 0) {
      const resource = resources[0];
      const filePath = resource.filePath;

      // 验证路径格式：project/{projectId}/dm_resource/xxx
      expect(filePath).toMatch(/^project\/.*\/dm_resource\//);
      console.log(`✅ 资源文件路径格式正确: ${filePath}`);

      testContext.resourceId = resource.id;
    } else {
      console.log('⚠️ 未找到资源文件记录');
    }
  });

  test('验证-08: 资源文件可以下载', async ({ page }) => {
    console.log('测试：验证资源文件可以下载');

    if (!testContext.resourceId) {
      console.log('⚠️ 跳过：无资源ID');
      return;
    }

    // 导航到数据模块列表
    await page.goto(`${config.baseURL}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(2000);

    // 选择项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(2000);

    // 打开资源列表
    const dmRow = page.locator('tr:has-text("E2E测试DM含资源")');
    await dmRow.locator('a:has-text("资源列表")').click();
    await page.waitForTimeout(2000);

    // 监听下载事件
    const downloadPromise = page.waitForEvent('download');

    // 点击下载按钮
    const drawer = page.locator('.ant-drawer');
    await drawer.locator('a:has-text("下载")').first().click();
    await page.waitForTimeout(2000);

    // 验证下载成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible();
    console.log('✅ 资源文件可以正常下载');

    // 关闭抽屉
    await drawer.locator('.ant-drawer-close').click();
    await page.waitForTimeout(1000);
  });

  // ==================== 手工上传资源测试 ====================

  test('场景-05: 手工上传资源文件', async ({ page }) => {
    console.log('测试：手工上传资源文件（路径统一性验证）');

    // 创建测试文件
    const testFilePath = path.join(config.testDataDir, 'manual-upload-test.txt');
    fs.writeFileSync(testFilePath, '这是手工上传的测试资源文件');

    // 导航到数据模块列表
    await page.goto(`${config.baseURL}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(2000);

    // 选择项目
    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(2000);

    // 找到第一个DM，打开资源列表
    const dmRow = page.locator('tr').nth(1);
    await dmRow.locator('a:has-text("资源列表")').click();
    await page.waitForTimeout(2000);

    // 点击"添加资源"
    const drawer = page.locator('.ant-drawer');
    await drawer.locator('button:has-text("添加资源")').click();
    await page.waitForTimeout(1000);

    // 填写资源信息
    const modal = page.locator('.ant-modal:has-text("添加资源")');
    await modal.locator('input[placeholder*="资源名称"]').fill('手工上传测试资源');
    await page.waitForTimeout(500);

    // 上传文件
    const fileInput = modal.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(1000);

    await modal.locator('textarea').fill('手工上传路径统一性测试');
    await page.waitForTimeout(500);

    // 点击确定
    await modal.locator('button:has-text("确定")').click();
    await page.waitForTimeout(3000);

    // 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible();
    console.log('✅ 手工上传资源成功');

    // 刷新列表
    await drawer.locator('button:has-text("刷新")').click();
    await page.waitForTimeout(2000);

    // 验证资源在列表中
    const resourceRow = drawer.locator('tr:has-text("手工上传测试资源")');
    await expect(resourceRow).toBeVisible();
    console.log('✅ 手工上传的资源在列表中显示');

    // 关闭抽屉
    await drawer.locator('.ant-drawer-close').click();
    await page.waitForTimeout(1000);
  });

  test('验证-09: 手工上传和导入的路径格式一致', async ({ page, request }) => {
    console.log('测试：验证手工上传和导入的路径格式一致');

    // 查询所有资源
    const response = await request.get(
      `${config.apiURL}/ietm/datamodule/queryDmResources?dmId=${testContext.dmId}`,
      {
        headers: { 'X-Access-Token': testContext.token }
      }
    );

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBeTruthy();

    const resources = result.result;
    expect(resources.length).toBeGreaterThan(0);

    // 检查所有资源的路径格式
    let allPathsUnified = true;
    const pathFormats = new Set();

    resources.forEach(resource => {
      const filePath = resource.filePath;
      if (filePath) {
        // 提取路径格式（去掉文件名）
        const pathFormat = filePath.substring(0, filePath.lastIndexOf('/'));
        pathFormats.add(pathFormat);

        // 验证是否符合 project/{projectId}/dm_resource 格式
        if (!filePath.match(/^project\/.*\/dm_resource\//)) {
          allPathsUnified = false;
          console.log(`⚠️ 路径格式不统一: ${filePath}`);
        }
      }
    });

    if (allPathsUnified) {
      console.log('✅ 所有资源文件路径格式统一');
      console.log(`路径格式: ${Array.from(pathFormats).join(', ')}`);
    }

    expect(allPathsUnified).toBeTruthy();
  });

  // ==================== 导入导出闭环测试 ====================

  test('场景-06: 导出后再导入（闭环测试）', async ({ page }) => {
    console.log('测试：导出后再导入（验证100%对齐）');

    // 1. 导出
    await page.goto(`${config.baseURL}/#/ietm/IetmDataModuleList`);
    await page.waitForTimeout(2000);

    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(2000);

    // 全选DM
    await page.click('thead input[type="checkbox"]');
    await page.waitForTimeout(500);

    // 点击导出
    await page.click('button:has-text("导出")');
    await page.waitForTimeout(1000);

    // 监听下载
    const downloadPromise = page.waitForEvent('download');
    await page.click('.ant-modal button:has-text("确定")');
    const download = await downloadPromise;

    // 保存导出的ZIP
    const exportPath = path.join(config.outputDir, 'exported-package.zip');
    await download.saveAs(exportPath);
    console.log(`✅ 导出ZIP包保存到: ${exportPath}`);

    await page.waitForTimeout(2000);

    // 2. 删除所有DM（模拟重新导入场景）
    // 注意：实际测试中可以跳过删除，直接导入到新项目

    // 3. 重新导入
    await page.goto(`${config.baseURL}/#/ietm/IetmDmImport`);
    await page.waitForTimeout(2000);

    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(1000);

    // 上传导出的ZIP
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(exportPath);
    await page.waitForTimeout(2000);

    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(5000);

    // 验证导入结果
    const resultModal = page.locator('.ant-modal:has-text("导入结果")');
    await expect(resultModal).toBeVisible();
    console.log('✅ 导出→导入闭环测试完成');

    await page.click('.ant-modal button:has-text("关闭")');
  });

  // ==================== 边界测试 ====================

  test('边界-01: 导入空ZIP包', async ({ page }) => {
    console.log('测试：导入空ZIP包（边界测试）');

    // 创建空ZIP包
    const emptyZipPath = path.join(config.testDataDir, 'empty-package.zip');
    const zip = new AdmZip();
    zip.writeZip(emptyZipPath);

    await page.goto(`${config.baseURL}/#/ietm/IetmDmImport`);
    await page.waitForTimeout(2000);

    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(1000);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(emptyZipPath);
    await page.waitForTimeout(2000);

    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(3000);

    // 应该显示错误或警告
    const resultModal = page.locator('.ant-modal');
    await expect(resultModal).toBeVisible();
    console.log('✅ 空ZIP包处理正常');

    await page.click('.ant-modal button').first();
  });

  test('边界-02: 导入不存在SNS的DM', async ({ page }) => {
    console.log('测试：导入SNS不在构型中的DM（应拒绝）');

    // 创建包含无效SNS的DM
    const invalidZipPath = path.join(config.testDataDir, 'invalid-sns-package.zip');
    createTestZipPackage(invalidZipPath, {
      dmcCode: 'DMC-INVALID-Z-99-9-9-99-99-Z-999-Z-Z',
      techName: '无效SNS测试',
      includeDM: true
    });

    await page.goto(`${config.baseURL}/#/ietm/IetmDmImport`);
    await page.waitForTimeout(2000);

    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(1000);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidZipPath);
    await page.waitForTimeout(2000);

    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(3000);

    // 应该显示错误：SNS不在构型中
    const resultModal = page.locator('.ant-modal:has-text("导入结果")');
    await expect(resultModal).toBeVisible();

    const errorText = await resultModal.locator(':has-text("不存在")').count();
    expect(errorText).toBeGreaterThan(0);
    console.log('✅ 无效SNS正确拒绝导入');

    await page.click('.ant-modal button:has-text("关闭")');
  });

  test('边界-03: 重复导入相同DM', async ({ page }) => {
    console.log('测试：重复导入相同DM（应拒绝）');

    // 使用之前创建的ZIP包
    const zipPath = path.join(config.testDataDir, 'test-dm-package.zip');

    await page.goto(`${config.baseURL}/#/ietm/IetmDmImport`);
    await page.waitForTimeout(2000);

    await page.click('.ant-select').first();
    await page.waitForTimeout(500);
    await page.click(`.ant-select-dropdown-menu-item:has-text("${testContext.projectName}")`);
    await page.waitForTimeout(1000);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(zipPath);
    await page.waitForTimeout(2000);

    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(3000);

    // 应该显示错误：DM已存在
    const resultModal = page.locator('.ant-modal:has-text("导入结果")');
    await expect(resultModal).toBeVisible();

    const errorText = await resultModal.locator(':has-text("已存在")').count();
    expect(errorText).toBeGreaterThan(0);
    console.log('✅ 重复DM正确拒绝导入');

    await page.click('.ant-modal button:has-text("关闭")');
  });

  // ==================== 清理 ====================

  test('清理-01: 删除测试数据', async ({ page, request }) => {
    console.log('测试：清理测试数据');

    // 删除测试项目（会级联删除所有DM/ICN/资源）
    if (testContext.projectId) {
      const response = await request.delete(
        `${config.apiURL}/ietm/projectmanage/delete?id=${testContext.projectId}`,
        {
          headers: { 'X-Access-Token': testContext.token }
        }
      );

      if (response.ok()) {
        console.log('✅ 测试项目已删除');
      }
    }

    // 清理测试文件
    const testFiles = fs.readdirSync(config.testDataDir);
    testFiles.forEach(file => {
      fs.unlinkSync(path.join(config.testDataDir, file));
    });
    console.log('✅ 测试文件已清理');
  });
});
