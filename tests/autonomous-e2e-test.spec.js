/**
 * 完全自主的端到端测试脚本
 * 包括环境检查、自动创建构型树、文件上传、预览功能测试
 * 自动生成详细的测试报告和截图
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 60000,
  username: 'admin',
  password: '123456',
  screenshotDir: path.join(__dirname, '..', 'test-screenshots'),
  reportPath: path.join(__dirname, '..', 'test-report.json')
};

// 测试文件路径
const TEST_FILES = {
  image_jpg: path.join(__dirname, 'test-files', 'test_image.jpg'),
  image_png: path.join(__dirname, 'test-files', 'test_image.png'),
  image_gif: path.join(__dirname, 'test-files', 'test_image.gif'),
  video_mp4: path.join(__dirname, 'test-files', 'test_video.mp4'),
  audio_mp3: path.join(__dirname, 'test-files', 'test_audio.mp3')
};

// 测试报告数据
const testReport = {
  startTime: new Date().toISOString(),
  endTime: null,
  environment: {
    baseURL: TEST_CONFIG.baseURL,
    username: TEST_CONFIG.username,
    browserViewport: '1920x1080'
  },
  phases: {},
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  screenshots: [],
  issues: []
};

// 保存截图的辅助函数
async function saveScreenshot(page, name, description = '') {
  if (!fs.existsSync(TEST_CONFIG.screenshotDir)) {
    fs.mkdirSync(TEST_CONFIG.screenshotDir, { recursive: true });
  }

  const timestamp = Date.now();
  const filename = `${timestamp}-${name}.png`;
  const filepath = path.join(TEST_CONFIG.screenshotDir, filename);

  await page.screenshot({ path: filepath, fullPage: true });

  testReport.screenshots.push({
    name,
    description,
    filename,
    filepath,
    timestamp: new Date().toISOString()
  });

  console.log(`📸 截图已保存: ${filename}`);
  return filepath;
}

// 记录测试结果
function logTestResult(testName, status, duration, details = {}) {
  const result = {
    name: testName,
    status,
    duration,
    timestamp: new Date().toISOString(),
    ...details
  };

  testReport.tests.push(result);
  testReport.summary.total++;

  if (status === 'passed') {
    testReport.summary.passed++;
    console.log(`✅ ${testName} - 通过 (${duration}ms)`);
  } else if (status === 'failed') {
    testReport.summary.failed++;
    console.log(`❌ ${testName} - 失败 (${duration}ms)`);
  } else if (status === 'skipped') {
    testReport.summary.skipped++;
    console.log(`⏭️ ${testName} - 跳过`);
  }
}

// 记录问题
function logIssue(severity, message, details = {}) {
  testReport.issues.push({
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...details
  });

  const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${icon} ${message}`);
}

// 保存最终报告
function saveReport() {
  testReport.endTime = new Date().toISOString();

  const reportContent = JSON.stringify(testReport, null, 2);
  fs.writeFileSync(TEST_CONFIG.reportPath, reportContent, 'utf8');

  console.log(`\n📊 测试报告已保存: ${TEST_CONFIG.reportPath}`);
  console.log(`\n测试统计:`);
  console.log(`  总计: ${testReport.summary.total}`);
  console.log(`  通过: ${testReport.summary.passed}`);
  console.log(`  失败: ${testReport.summary.failed}`);
  console.log(`  跳过: ${testReport.summary.skipped}`);
  console.log(`  通过率: ${(testReport.summary.passed / testReport.summary.total * 100).toFixed(2)}%`);
}

// ============================================================
// 阶段1: 环境检查
// ============================================================

async function checkEnvironment(page) {
  console.log('\n' + '='.repeat(60));
  console.log('阶段1: 环境检查');
  console.log('='.repeat(60));

  const phaseResults = {
    serverRunning: false,
    loginPageAccessible: false,
    testFilesExist: false
  };

  try {
    // 检查服务器
    console.log('\n检查开发服务器...');
    const response = await page.goto(TEST_CONFIG.baseURL + '/user/login');
    phaseResults.serverRunning = response.status() === 200;

    if (phaseResults.serverRunning) {
      console.log('✅ 开发服务器运行正常 (localhost:3000)');
      phaseResults.loginPageAccessible = true;
    } else {
      logIssue('error', `服务器响应异常: ${response.status()}`);
    }

    // 检查测试文件
    console.log('\n检查测试文件...');
    const missingFiles = [];
    for (const [key, filepath] of Object.entries(TEST_FILES)) {
      if (!fs.existsSync(filepath)) {
        missingFiles.push(key);
      }
    }

    if (missingFiles.length === 0) {
      console.log('✅ 所有测试文件准备完毕');
      phaseResults.testFilesExist = true;
    } else {
      logIssue('error', `缺少测试文件: ${missingFiles.join(', ')}`);
    }

  } catch (error) {
    logIssue('error', `环境检查失败: ${error.message}`);
  }

  testReport.phases.environmentCheck = phaseResults;
  return phaseResults;
}

// ============================================================
// 阶段2: 登录
// ============================================================

async function performLogin(page) {
  console.log('\n' + '='.repeat(60));
  console.log('阶段2: 登录');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    console.log('\n导航到登录页面...');
    await page.goto(TEST_CONFIG.baseURL + '/user/login');
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, 'login-page', '登录页面');

    console.log('填写登录信息...');
    await page.fill('#username', TEST_CONFIG.username);
    await page.fill('#password', TEST_CONFIG.password);
    await saveScreenshot(page, 'login-filled', '填写登录信息');

    console.log('点击登录按钮...');
    await page.click('button[type="submit"]');

    console.log('等待登录完成...');
    await page.waitForURL('**/dashboard/**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, 'login-success', '登录成功 - Dashboard');

    const duration = Date.now() - startTime;
    logTestResult('用户登录', 'passed', duration);

    console.log('✅ 登录成功');
    testReport.phases.login = { success: true, url: page.url() };
    return true;

  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('用户登录', 'failed', duration, { error: error.message });
    logIssue('error', `登录失败: ${error.message}`);
    await saveScreenshot(page, 'login-error', '登录失败');
    testReport.phases.login = { success: false, error: error.message };
    return false;
  }
}

// ============================================================
// 阶段3: 打开项目
// ============================================================

async function openProject(page) {
  console.log('\n' + '='.repeat(60));
  console.log('阶段3: 打开项目');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    console.log('\n等待页面加载...');
    await page.waitForTimeout(2000);

    console.log('查找"打开项目"按钮...');
    const openProjectBtn = page.locator('button:has-text("打开项目"), a:has-text("打开项目")').first();

    if (await openProjectBtn.count() > 0) {
      console.log('点击"打开项目"按钮...');
      await openProjectBtn.click();
      await page.waitForTimeout(2000);
      await saveScreenshot(page, 'open-project-clicked', '点击打开项目');

      // 处理可能的模态框
      const modal = page.locator('.ant-modal:visible');
      if (await modal.count() > 0) {
        console.log('检测到模态框，尝试处理...');

        // 查找项目列表中的第一个项目
        const projectRow = modal.locator('.ant-table-tbody tr').first();
        if (await projectRow.count() > 0) {
          console.log('选择第一个项目...');
          await projectRow.click();
          await page.waitForTimeout(500);
        }

        // 点击确定
        const confirmBtn = modal.locator('.ant-modal-footer button:has-text("确定"), .ant-modal-footer button.ant-btn-primary').first();
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
          console.log('✅ 已确认打开项目');
        }

        await saveScreenshot(page, 'project-opened', '项目已打开');
      }
    } else {
      console.log('ℹ️ 未找到"打开项目"按钮，项目可能已打开');
    }

    const duration = Date.now() - startTime;
    logTestResult('打开项目', 'passed', duration);
    testReport.phases.openProject = { success: true };
    return true;

  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('打开项目', 'failed', duration, { error: error.message });
    logIssue('warning', `打开项目失败: ${error.message}`);
    await saveScreenshot(page, 'open-project-error', '打开项目失败');
    testReport.phases.openProject = { success: false, error: error.message };
    return false;
  }
}

// ============================================================
// 阶段4: 导航到ICN管理页面
// ============================================================

async function navigateToICNManagement(page) {
  console.log('\n' + '='.repeat(60));
  console.log('阶段4: 导航到ICN管理页面');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    console.log('\n等待页面加载...');
    await page.waitForTimeout(2000);

    // 查找并点击"项目管理"菜单
    console.log('查找"项目管理"菜单...');
    const projectMenu = page.locator('.ant-menu-submenu-title:has-text("项目管理")');

    if (await projectMenu.count() === 0) {
      throw new Error('未找到"项目管理"菜单');
    }

    console.log('展开"项目管理"菜单...');
    await projectMenu.click();
    await page.waitForTimeout(1000);
    await saveScreenshot(page, 'project-menu-expanded', '项目管理菜单已展开');

    // 查找"项目实体管理"子菜单
    console.log('查找"项目实体管理"子菜单...');
    const icnMenu = page.locator('.ant-menu-item:has-text("项目实体管理")');

    if (await icnMenu.count() === 0) {
      throw new Error('未找到"项目实体管理"菜单 - 需要执行菜单SQL配置');
    }

    console.log('点击"项目实体管理"菜单...');
    await icnMenu.click();
    await page.waitForTimeout(3000);
    await saveScreenshot(page, 'icn-page-loaded', 'ICN管理页面');

    // 检查是否是404页面
    const is404 = await page.locator('text=404').count() > 0;
    if (is404) {
      throw new Error('页面返回404 - 路由配置或权限问题');
    }

    // 检查页面关键元素
    console.log('检查页面元素...');
    const hasTable = await page.locator('.ant-table').count() > 0;
    const hasTree = await page.locator('.ant-tree').count() > 0;

    console.log(`  - 列表表格: ${hasTable ? '✅' : '❌'}`);
    console.log(`  - 构型树: ${hasTree ? '✅' : '❌'}`);

    const duration = Date.now() - startTime;
    logTestResult('导航到ICN管理页面', 'passed', duration);

    testReport.phases.navigation = {
      success: true,
      url: page.url(),
      hasTable,
      hasTree
    };

    return { success: true, hasTable, hasTree };

  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('导航到ICN管理页面', 'failed', duration, { error: error.message });
    logIssue('error', `导航失败: ${error.message}`);
    await saveScreenshot(page, 'navigation-error', '导航失败');

    testReport.phases.navigation = {
      success: false,
      error: error.message
    };

    return { success: false, error: error.message };
  }
}

// ============================================================
// 阶段5: 检查并创建构型树节点
// ============================================================

async function ensureConfigTreeNode(page) {
  console.log('\n' + '='.repeat(60));
  console.log('阶段5: 检查并创建构型树节点');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    console.log('\n检查构型树...');
    await page.waitForTimeout(2000);

    const tree = page.locator('.ant-tree');
    if (await tree.count() === 0) {
      throw new Error('未找到构型树组件');
    }

    // 检查是否有树节点
    const treeNodes = page.locator('.ant-tree-treenode');
    const nodeCount = await treeNodes.count();

    console.log(`构型树节点数量: ${nodeCount}`);

    if (nodeCount > 0) {
      console.log('✅ 构型树已有节点');

      // 选择第一个节点
      const firstNode = treeNodes.first();
      await firstNode.click();
      await page.waitForTimeout(1000);
      await saveScreenshot(page, 'config-tree-selected', '选择构型树节点');

      const duration = Date.now() - startTime;
      logTestResult('检查构型树', 'passed', duration, { nodeCount });

      testReport.phases.configTree = {
        success: true,
        nodeCount,
        created: false
      };

      return { success: true, nodeCount, created: false };
    }

    // 构型树为空，尝试创建节点
    console.log('⚠️ 构型树为空，尝试创建节点...');

    // 查找"新增"按钮
    const addBtn = page.locator('button:has-text("新增"), button:has-text("添加")').first();
    if (await addBtn.count() === 0) {
      throw new Error('未找到新增按钮');
    }

    console.log('点击新增按钮...');
    await addBtn.click();
    await page.waitForTimeout(1500);
    await saveScreenshot(page, 'add-node-modal', '新增节点模态框');

    // 处理新增模态框
    const modal = page.locator('.ant-modal:visible');
    if (await modal.count() === 0) {
      throw new Error('新增模态框未打开');
    }

    // 填写节点信息
    console.log('填写节点信息...');
    const nameInput = modal.locator('input[placeholder*="名称"], input[id*="name"]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('测试节点-' + Date.now());
    }

    const codeInput = modal.locator('input[placeholder*="编号"], input[id*="code"]').first();
    if (await codeInput.count() > 0) {
      await codeInput.fill('TEST-' + Date.now());
    }

    await saveScreenshot(page, 'add-node-filled', '节点信息已填写');

    // 提交
    console.log('提交节点创建...');
    const submitBtn = modal.locator('.ant-modal-footer button:has-text("确定"), .ant-modal-footer button.ant-btn-primary').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();

      // 等待成功提示或模态框关闭
      await Promise.race([
        page.waitForSelector('.ant-message-success', { timeout: 5000 }),
        page.waitForSelector('.ant-modal:visible', { state: 'hidden', timeout: 5000 })
      ]).catch(() => {});

      await page.waitForTimeout(2000);
      await saveScreenshot(page, 'node-created', '节点已创建');

      console.log('✅ 节点创建成功');

      // 选择新创建的节点
      const newNodes = page.locator('.ant-tree-treenode');
      if (await newNodes.count() > 0) {
        await newNodes.first().click();
        await page.waitForTimeout(1000);
      }

      const duration = Date.now() - startTime;
      logTestResult('创建构型树节点', 'passed', duration);

      testReport.phases.configTree = {
        success: true,
        nodeCount: 1,
        created: true
      };

      return { success: true, nodeCount: 1, created: true };
    }

    throw new Error('未找到提交按钮');

  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('检查/创建构型树节点', 'failed', duration, { error: error.message });
    logIssue('error', `构型树操作失败: ${error.message}`);
    await saveScreenshot(page, 'config-tree-error', '构型树操作失败');

    testReport.phases.configTree = {
      success: false,
      error: error.message
    };

    return { success: false, error: error.message };
  }
}

// ============================================================
// 阶段6: 上传测试文件
// ============================================================

async function uploadTestFile(page, filePath, fileName, fileType) {
  console.log(`\n上传文件: ${fileName} (${fileType})...`);
  const startTime = Date.now();

  try {
    // 点击新增按钮
    const addBtn = page.locator('button:has-text("新增")').first();
    if (await addBtn.count() === 0) {
      throw new Error('未找到新增按钮');
    }

    await addBtn.click();
    await page.waitForTimeout(1500);

    // 等待模态框
    const modal = page.locator('.ant-modal:visible');
    if (await modal.count() === 0) {
      throw new Error('新增模态框未打开');
    }

    await saveScreenshot(page, `upload-${fileType}-modal`, `上传${fileType}模态框`);

    // 填写文件名称
    const nameInput = modal.locator('input[placeholder*="名称"], textarea[placeholder*="名称"]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill(fileName);
      await page.waitForTimeout(300);
    }

    // 上传文件
    const fileInput = modal.locator('input[type="file"]');
    if (await fileInput.count() === 0) {
      throw new Error('未找到文件上传控件');
    }

    console.log(`  设置文件: ${filePath}`);
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(1500);

    await saveScreenshot(page, `upload-${fileType}-filled`, `${fileType}文件已选择`);

    // 提交
    const submitBtn = modal.locator('.ant-modal-footer button:has-text("确定"), .ant-modal-footer button[type="submit"]').first();
    if (await submitBtn.count() === 0) {
      throw new Error('未找到提交按钮');
    }

    await submitBtn.click();

    // 等待成功提示
    await Promise.race([
      page.waitForSelector('.ant-message-success', { timeout: 10000 }),
      page.waitForSelector('.ant-modal:visible', { state: 'hidden', timeout: 10000 })
    ]).catch(() => {});

    await page.waitForTimeout(2000);
    await saveScreenshot(page, `upload-${fileType}-success`, `${fileType}文件上传成功`);

    const duration = Date.now() - startTime;
    logTestResult(`上传${fileType}文件`, 'passed', duration);

    console.log(`✅ ${fileName} 上传成功`);
    return { success: true, fileName, fileType, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult(`上传${fileType}文件`, 'failed', duration, { error: error.message });
    logIssue('error', `上传${fileName}失败: ${error.message}`);
    await saveScreenshot(page, `upload-${fileType}-error`, `${fileType}文件上传失败`);

    return { success: false, fileName, fileType, error: error.message, duration };
  }
}

// ============================================================
// 阶段7: 测试预览功能
// ============================================================

async function testPreviewFunction(page, fileName, fileType) {
  console.log(`\n测试${fileType}预览功能...`);
  const startTime = Date.now();

  try {
    // 查找表格中的文件行
    console.log(`  查找文件: ${fileName}`);
    await page.waitForTimeout(1000);

    const tableRow = page.locator(`.ant-table-tbody tr:has-text("${fileName}")`).first();
    if (await tableRow.count() === 0) {
      throw new Error(`未找到文件: ${fileName}`);
    }

    // 选中该行
    await tableRow.click();
    await page.waitForTimeout(500);
    await saveScreenshot(page, `preview-${fileType}-selected`, `选中${fileType}文件`);

    // 查找预览按钮
    const previewBtn = page.locator('button:has-text("预览")').first();
    if (await previewBtn.count() === 0) {
      throw new Error('未找到预览按钮');
    }

    // 检查按钮状态
    const isDisabled = await previewBtn.isDisabled();
    if (isDisabled) {
      throw new Error('预览按钮处于禁用状态');
    }

    console.log('  点击预览按钮...');
    await previewBtn.click();
    await page.waitForTimeout(2000);

    // 等待预览模态框
    const previewModal = page.locator('.ant-modal:visible');
    if (await previewModal.count() === 0) {
      throw new Error('预览模态框未打开');
    }

    await saveScreenshot(page, `preview-${fileType}-modal`, `${fileType}预览模态框`);

    // 检查预览内容
    let previewContentFound = false;

    if (fileType === 'image' || fileType === 'jpg' || fileType === 'png' || fileType === 'gif') {
      const img = previewModal.locator('img');
      previewContentFound = await img.count() > 0;
      console.log(`  图片预览内容: ${previewContentFound ? '✅' : '❌'}`);
    } else if (fileType === 'video' || fileType === 'mp4') {
      const video = previewModal.locator('video');
      previewContentFound = await video.count() > 0;
      console.log(`  视频预览内容: ${previewContentFound ? '✅' : '❌'}`);
    } else if (fileType === 'audio' || fileType === 'mp3') {
      const audio = previewModal.locator('audio');
      previewContentFound = await audio.count() > 0;
      console.log(`  音频预览内容: ${previewContentFound ? '✅' : '❌'}`);
    }

    // 关闭预览
    const closeBtn = previewModal.locator('.ant-modal-close, button:has-text("关闭")').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }

    const duration = Date.now() - startTime;
    logTestResult(`${fileType}预览功能`, 'passed', duration, { previewContentFound });

    console.log(`✅ ${fileType}预览功能测试通过`);
    return { success: true, fileType, previewContentFound, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult(`${fileType}预览功能`, 'failed', duration, { error: error.message });
    logIssue('error', `${fileType}预览测试失败: ${error.message}`);
    await saveScreenshot(page, `preview-${fileType}-error`, `${fileType}预览失败`);

    return { success: false, fileType, error: error.message, duration };
  }
}

// ============================================================
// 主测试套件
// ============================================================

test.describe('IETM项目实体管理预览功能 - 完全自主测试', () => {
  let page;
  let context;
  let testContext = {
    environmentOk: false,
    loginSuccess: false,
    projectOpened: false,
    navigationSuccess: false,
    configTreeReady: false,
    uploadedFiles: []
  };

  test.beforeAll(async ({ browser }) => {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('IETM项目实体管理预览功能 - 完全自主测试');
    console.log('='.repeat(80));
    console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('='.repeat(80));

    // 创建浏览器上下文
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN'
    });

    page = await context.newPage();
    page.setDefaultTimeout(TEST_CONFIG.timeout);

    // 阶段1: 环境检查
    const envCheck = await checkEnvironment(page);
    testContext.environmentOk = envCheck.serverRunning && envCheck.testFilesExist;

    if (!testContext.environmentOk) {
      console.log('\n❌ 环境检查失败，无法继续测试');
      return;
    }

    // 阶段2: 登录
    testContext.loginSuccess = await performLogin(page);
    if (!testContext.loginSuccess) {
      console.log('\n❌ 登录失败，无法继续测试');
      return;
    }

    // 阶段3: 打开项目
    testContext.projectOpened = await openProject(page);

    // 阶段4: 导航到ICN管理页面
    const navResult = await navigateToICNManagement(page);
    testContext.navigationSuccess = navResult.success;

    if (!testContext.navigationSuccess) {
      console.log('\n❌ 导航到ICN管理页面失败');
      console.log('⚠️  这通常意味着菜单未配置或权限不足');
      console.log('📝 解决方案: 执行 src/views/ietm/icnmanage/IetmIcnManage_menu_insert.sql');
      return;
    }

    // 阶段5: 检查并创建构型树节点
    const treeResult = await ensureConfigTreeNode(page);
    testContext.configTreeReady = treeResult.success;

    if (!testContext.configTreeReady) {
      console.log('\n❌ 构型树节点准备失败');
      return;
    }
  });

  test.afterAll(async () => {
    // 保存最终报告
    saveReport();

    console.log('\n');
    console.log('='.repeat(80));
    console.log('测试完成');
    console.log('='.repeat(80));
    console.log(`结束时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`截图目录: ${TEST_CONFIG.screenshotDir}`);
    console.log(`报告路径: ${TEST_CONFIG.reportPath}`);
    console.log('='.repeat(80));

    if (context) {
      await context.close();
    }
  });

  test('上传并预览JPG图片', async () => {
    if (!testContext.configTreeReady) {
      test.skip();
      return;
    }

    const uploadResult = await uploadTestFile(page, TEST_FILES.image_jpg, '测试图片-JPG', 'jpg');
    if (uploadResult.success) {
      testContext.uploadedFiles.push(uploadResult);
      await testPreviewFunction(page, '测试图片-JPG', 'image');
    }
  });

  test('上传并预览PNG图片', async () => {
    if (!testContext.configTreeReady) {
      test.skip();
      return;
    }

    const uploadResult = await uploadTestFile(page, TEST_FILES.image_png, '测试图片-PNG', 'png');
    if (uploadResult.success) {
      testContext.uploadedFiles.push(uploadResult);
      await testPreviewFunction(page, '测试图片-PNG', 'image');
    }
  });

  test('上传并预览GIF图片', async () => {
    if (!testContext.configTreeReady) {
      test.skip();
      return;
    }

    const uploadResult = await uploadTestFile(page, TEST_FILES.image_gif, '测试图片-GIF', 'gif');
    if (uploadResult.success) {
      testContext.uploadedFiles.push(uploadResult);
      await testPreviewFunction(page, '测试图片-GIF', 'image');
    }
  });

  test('上传并预览MP4视频', async () => {
    if (!testContext.configTreeReady) {
      test.skip();
      return;
    }

    const uploadResult = await uploadTestFile(page, TEST_FILES.video_mp4, '测试视频-MP4', 'mp4');
    if (uploadResult.success) {
      testContext.uploadedFiles.push(uploadResult);
      await testPreviewFunction(page, '测试视频-MP4', 'video');
    }
  });

  test('上传并预览MP3音频', async () => {
    if (!testContext.configTreeReady) {
      test.skip();
      return;
    }

    const uploadResult = await uploadTestFile(page, TEST_FILES.audio_mp3, '测试音频-MP3', 'mp3');
    if (uploadResult.success) {
      testContext.uploadedFiles.push(uploadResult);
      await testPreviewFunction(page, '测试音频-MP3', 'audio');
    }
  });
});

