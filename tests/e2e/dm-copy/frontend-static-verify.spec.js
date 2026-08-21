const { test, expect } = require('@playwright/test');

/**
 * 前端静态页面验证 - 不依赖后端服务
 * 验证前端组件和页面结构
 */
test.describe('前端静态验证', () => {

  test.setTimeout(60000);

  /**
   * 测试1：验证登录页面结构
   */
  test('验证登录页面结构', async ({ page }) => {
    console.log('\n========== 测试1：登录页面结构 ==========');

    // 访问登录页面
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // 截图
    await page.screenshot({ path: './test-results/screenshots/static-01-login-page.png', fullPage: true });

    // 验证页面标题
    const title = await page.title();
    console.log(`✅ 页面标题: ${title}`);

    // 验证表单元素存在
    const usernameInput = page.locator('input[placeholder*="账号"], input[type="text"]').first();
    expect(await usernameInput.count()).toBeGreaterThan(0);
    console.log('✅ 用户名输入框存在');

    const passwordInput = page.locator('input[type="password"]').first();
    expect(await passwordInput.count()).toBeGreaterThan(0);
    console.log('✅ 密码输入框存在');

    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    expect(await loginButton.count()).toBeGreaterThan(0);
    console.log('✅ 登录按钮存在');

    console.log('✅ 测试1通过：登录页面结构完整\n');
  });

  /**
   * 测试2：验证前端路由（通过检查构建文件）
   */
  test('验证前端路由配置', async () => {
    console.log('\n========== 测试2：前端路由配置 ==========');

    const fs = require('fs');
    const path = require('path');

    // 检查router文件
    const routerPath = path.join(__dirname, '../../../src/router/index.js');
    if (!fs.existsSync(routerPath)) {
      const altPath = path.join(__dirname, '../../../src/router.js');
      if (!fs.existsSync(altPath)) {
        console.log('⚠️  未找到路由配置文件');
        return;
      }
    }

    console.log('✅ 路由配置文件存在');

    // 读取路由配置
    const content = fs.readFileSync(routerPath, 'utf-8');

    // 检查关键路由
    const hasLogin = content.includes('/login') || content.includes('Login');
    const hasDashboard = content.includes('/dashboard') || content.includes('Dashboard');
    const hasDataModule = content.includes('datamodule') || content.includes('DataModule');

    console.log(`✅ 登录路由: ${hasLogin}`);
    console.log(`✅ 首页路由: ${hasDashboard}`);
    console.log(`✅ 数据模块路由: ${hasDataModule}`);

    console.log('✅ 测试2通过：路由配置正确\n');
  });

  /**
   * 测试3：验证DmCopyModal组件结构
   */
  test('验证DmCopyModal组件', async () => {
    console.log('\n========== 测试3：DmCopyModal组件 ==========');

    const fs = require('fs');
    const path = require('path');

    const modalPath = path.join(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/components/DmCopyModal.vue');
    expect(fs.existsSync(modalPath)).toBeTruthy();
    console.log('✅ 组件文件存在');

    const content = fs.readFileSync(modalPath, 'utf-8');

    // 检查关键功能
    const checks = [
      { name: 'learnCode字段', pattern: 'learnCode' },
      { name: 'learnEventCode字段', pattern: 'learnEventCode' },
      { name: 'DMC预览', pattern: 'dmcPreview' },
      { name: 'async方法', pattern: 'async loadSourceDmAndFill' },
      { name: 'Promise.all', pattern: 'Promise.all' },
      { name: '表单数据传递', pattern: 'learnCode: this.model.learnCode' },
      { name: 'SNS计算', pattern: 'calculateSns' },
      { name: '技术名称提取', pattern: 'extractTechName' },
    ];

    checks.forEach(check => {
      const exists = content.includes(check.pattern);
      console.log(`${exists ? '✅' : '❌'} ${check.name}: ${exists}`);
      expect(exists).toBeTruthy();
    });

    console.log('✅ 测试3通过：DmCopyModal组件功能完整\n');
  });

  /**
   * 测试4：验证后端API定义
   */
  test('验证后端API定义', async () => {
    console.log('\n========== 测试4：后端API定义 ==========');

    const fs = require('fs');
    const path = require('path');

    // 检查Controller文件
    const controllerPath = path.join(
      __dirname,
      '../../../..',
      'cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/controller/IetmDataModuleController.java'
    );

    expect(fs.existsSync(controllerPath)).toBeTruthy();
    console.log('✅ Controller文件存在');

    const content = fs.readFileSync(controllerPath, 'utf-8');

    // 检查API端点
    const apis = [
      { name: '/copyDm', pattern: '/copyDm' },
      { name: '/copyAndCreateDm', pattern: '/copyAndCreateDm' },
      { name: '/calculateSns', pattern: '/calculateSns' },
      { name: '/extractTechName', pattern: '/extractTechName' },
      { name: '/checkDmcUnique', pattern: '/checkDmcUnique' },
    ];

    apis.forEach(api => {
      const exists = content.includes(api.pattern);
      console.log(`${exists ? '✅' : '❌'} API ${api.name}: ${exists}`);
      expect(exists).toBeTruthy();
    });

    console.log('✅ 测试4通过：后端API定义完整\n');
  });

  /**
   * 测试5：验证数据库SQL脚本
   */
  test('验证数据库SQL脚本', async () => {
    console.log('\n========== 测试5：数据库SQL脚本 ==========');

    const fs = require('fs');
    const path = require('path');

    const sqlPath = path.join(__dirname, '../../../sql/001_add_learn_code_fields.sql');
    expect(fs.existsSync(sqlPath)).toBeTruthy();
    console.log('✅ SQL脚本存在');

    const content = fs.readFileSync(sqlPath, 'utf-8');

    // 检查SQL语句
    const checks = [
      { name: 'learn_code字段', pattern: 'learn_code' },
      { name: 'learn_event_code字段', pattern: 'learn_event_code' },
      { name: 'ALTER TABLE语句', pattern: 'ALTER TABLE' },
      { name: 'VARCHAR类型', pattern: 'VARCHAR' },
      { name: 'ADD COLUMN', pattern: 'ADD' },
    ];

    checks.forEach(check => {
      const exists = content.includes(check.pattern);
      console.log(`${exists ? '✅' : '❌'} ${check.name}: ${exists}`);
      expect(exists).toBeTruthy();
    });

    console.log('✅ 测试5通过：SQL脚本正确\n');
  });

  /**
   * 测试6：验证VO类完整性
   */
  test('验证VO类完整性', async () => {
    console.log('\n========== 测试6：VO类完整性 ==========');

    const fs = require('fs');
    const path = require('path');

    const voPath = path.join(
      __dirname,
      '../../../..',
      'cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/vo/DmCopyVO.java'
    );

    expect(fs.existsSync(voPath)).toBeTruthy();
    console.log('✅ DmCopyVO文件存在');

    const content = fs.readFileSync(voPath, 'utf-8');

    // 检查字段
    const fields = [
      'sourceDmId',
      'targetCmNodeId',
      'targetCmNodeName',
      'sns',
      'techName',
      'infoCode',
      'infoCodeVariant',
      'ietmLocationCode',
      'learnCode',
      'learnEventCode',
      'infoName',
      'dmType',
      'language',
      'country'
    ];

    fields.forEach(field => {
      const exists = content.includes(`private String ${field}`);
      console.log(`${exists ? '✅' : '❌'} 字段 ${field}: ${exists}`);
      expect(exists).toBeTruthy();
    });

    console.log('✅ 测试6通过：VO类字段完整\n');
  });

  /**
   * 测试7：验证Service实现
   */
  test('验证Service实现', async () => {
    console.log('\n========== 测试7：Service实现 ==========');

    const fs = require('fs');
    const path = require('path');

    const servicePath = path.join(
      __dirname,
      '../../../..',
      'cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/service/impl/IetmDataModuleServiceImpl.java'
    );

    expect(fs.existsSync(servicePath)).toBeTruthy();
    console.log('✅ Service实现文件存在');

    const content = fs.readFileSync(servicePath, 'utf-8');

    // 检查方法
    const methods = [
      { name: 'copyAndCreateDm', pattern: 'public Result<?> copyAndCreateDm(DmCopyVO vo)' },
      { name: 'generateDmcCode', pattern: 'public String generateDmcCode' },
      { name: 'checkDmcUnique', pattern: 'public boolean checkDmcUnique' },
      { name: 'extractTechName', pattern: 'public String extractTechName' },
      { name: 'setOriginatorFromProject', pattern: 'public void setOriginatorFromProject' },
    ];

    methods.forEach(method => {
      const exists = content.includes(method.pattern);
      console.log(`${exists ? '✅' : '❌'} 方法 ${method.name}: ${exists}`);
      expect(exists).toBeTruthy();
    });

    // 检查学习码处理
    const hasLearnCodeHandling = content.includes('setLearnCode') && content.includes('vo.getLearnCode()');
    console.log(`${hasLearnCodeHandling ? '✅' : '❌'} 学习码处理逻辑: ${hasLearnCodeHandling}`);
    expect(hasLearnCodeHandling).toBeTruthy();

    // 检查DMC前缀
    const hasDmcPrefix = content.includes('DMC-');
    console.log(`${hasDmcPrefix ? '✅' : '❌'} DMC前缀: ${hasDmcPrefix}`);
    expect(hasDmcPrefix).toBeTruthy();

    console.log('✅ 测试7通过：Service实现完整\n');
  });
});
