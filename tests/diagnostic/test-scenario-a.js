/**
 * 场景A测试：直接进入源码视图
 * 使用 Playwright 自动化测试
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testScenarioA() {
  console.log('========================================');
  console.log('场景A：直接进入源码视图测试');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // 1. 访问登录页
    console.log('1. 访问登录页面...');
    await page.goto('http://localhost:3000/user/login', { waitUntil: 'networkidle' });

    // 等待登录表单加载
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('   ✓ 登录页加载完成\n');

    // 2. 输入凭据
    console.log('2. 输入登录凭据...');
    const usernameInput = await page.locator('input[type="text"]').first();
    await usernameInput.fill('admin');

    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill('admin');

    console.log('   ✓ 凭据已输入\n');

    // 3. 点击登录
    console.log('3. 点击登录按钮...');
    await page.locator('button[type="submit"]').click();

    // 等待跳转到主页
    await page.waitForURL('**/dashboard/**', { timeout: 15000 });
    console.log('   ✓ 登录成功\n');

    // 4. 导航到数据模块列表
    console.log('4. 导航到数据模块列表...');
    await page.goto('http://localhost:3000/ietm/IetmDataModuleManagementIndex', { waitUntil: 'networkidle' });
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 15000 });
    console.log('   ✓ 列表加载完成\n');

    // 5. 点击第一个DM的"浏览或编辑DM内容"
    console.log('5. 点击"浏览或编辑DM内容"...');
    const editButton = page.locator('.ant-table-tbody tr').first().locator('a:has-text("浏览或编辑DM内容")');
    await editButton.click();

    // 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 20000 });
    await page.waitForTimeout(2000); // 等待完全渲染
    console.log('   ✓ 编辑器加载完成\n');

    // 6. 运行验证脚本
    console.log('6. 运行测量脚本...');

    const verificationScript = fs.readFileSync(
      path.join(__dirname, 'quick-verify.js'),
      'utf-8'
    );

    const result = await page.evaluate((script) => {
      // 注入并执行脚本
      const cm = document.querySelector('.CodeMirror');
      if (!cm) return { error: '找不到 CodeMirror 元素' };

      const gutters = cm.querySelector('.CodeMirror-gutters');
      const foldGutter = cm.querySelector('.CodeMirror-foldgutter');
      const scroll = cm.querySelector('.CodeMirror-scroll');
      const firstLine = cm.querySelector('.CodeMirror-line');
      const cmInstance = cm.CodeMirror;

      if (!gutters || !foldGutter || !scroll || !firstLine || !cmInstance) {
        return { error: 'CodeMirror 元素不完整' };
      }

      const data = {
        // 核心布局
        guttersWidth: gutters.offsetWidth,
        foldGutterLeft: foldGutter.offsetLeft,
        scrollHeight: scroll.offsetHeight,

        // 文本测量
        lineHeight: firstLine.offsetHeight,
        charWidth: cmInstance.defaultCharWidth(),

        // 内部缓存
        cachedCharWidth: cmInstance.display.cachedCharWidth,
        cachedTextHeight: cmInstance.display.cachedTextHeight,

        // 额外信息
        lineCount: cmInstance.lineCount(),
        contentLength: cmInstance.getValue().length,

        // 容器状态
        tabPaneDisplay: (() => {
          const tabPane = cm.closest('.ant-tabs-tabpane');
          return tabPane ? window.getComputedStyle(tabPane).display : 'N/A';
        })(),

        sourceViewHeight: (() => {
          const sourceView = cm.closest('.dm-source-view');
          return sourceView ? sourceView.offsetHeight : 0;
        })()
      };

      // 执行检查
      const checks = {
        guttersOK: data.guttersWidth > 50,
        foldGutterOK: data.foldGutterLeft === 44,
        scrollOK: data.scrollHeight > 600,
        lineHeightOK: data.lineHeight > 15 && data.lineHeight < 30,
        charWidthOK: data.charWidth > 5 && data.charWidth < 15,
        cachedCharWidthOK: data.cachedCharWidth > 5,
        cachedTextHeightOK: data.cachedTextHeight > 15
      };

      data.checks = checks;
      data.allOK = Object.values(checks).every(v => v);

      return data;
    }, verificationScript);

    if (result.error) {
      console.error('   ❌ 错误:', result.error);
      return { success: false, error: result.error };
    }

    console.log('   ✓ 测量完成\n');

    // 7. 显示结果
    console.log('========================================');
    console.log('📊 场景A 测量结果');
    console.log('========================================\n');

    console.log('布局尺寸:');
    console.log('  Gutters 宽度:', result.guttersWidth, 'px', result.checks.guttersOK ? '✅' : '❌');
    console.log('  折叠列位置:', result.foldGutterLeft, 'px', result.checks.foldGutterOK ? '✅' : '❌');
    console.log('  Scroll 高度:', result.scrollHeight, 'px', result.checks.scrollOK ? '✅' : '❌');
    console.log('');

    console.log('文本测量:');
    console.log('  行高:', result.lineHeight, 'px', result.checks.lineHeightOK ? '✅' : '❌');
    console.log('  字符宽度:', result.charWidth.toFixed(2), 'px', result.checks.charWidthOK ? '✅' : '❌');
    console.log('');

    console.log('内部状态:');
    console.log('  缓存字符宽度:', result.cachedCharWidth.toFixed(2), 'px', result.checks.cachedCharWidthOK ? '✅' : '❌');
    console.log('  缓存文本高度:', result.cachedTextHeight.toFixed(2), 'px', result.checks.cachedTextHeightOK ? '✅' : '❌');
    console.log('');

    console.log('内容信息:');
    console.log('  总行数:', result.lineCount);
    console.log('  内容长度:', result.contentLength, '字符');
    console.log('');

    console.log('容器状态:');
    console.log('  TabPane display:', result.tabPaneDisplay);
    console.log('  SourceView 高度:', result.sourceViewHeight, 'px');
    console.log('');

    console.log('========================================');
    if (result.allOK) {
      console.log('✅ 场景A 所有检查通过！');
    } else {
      console.log('❌ 场景A 发现问题！');
      const failedChecks = Object.entries(result.checks)
        .filter(([_, pass]) => !pass)
        .map(([name]) => name);
      console.log('失败项:', failedChecks.join(', '));
    }
    console.log('========================================\n');

    // 8. 保存结果
    const reportPath = path.join(__dirname, '../test-results/scenario-a-result.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      scenario: 'A',
      description: '直接进入源码视图',
      timestamp: new Date().toISOString(),
      result,
      success: result.allOK
    }, null, 2));

    console.log('测试结果已保存:', reportPath);
    console.log('');

    // 9. 截图保存
    const screenshotPath = path.join(__dirname, '../test-results/scenario-a-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('截图已保存:', screenshotPath);
    console.log('');

    return { success: true, result };

  } catch (error) {
    console.error('测试失败:', error.message);

    // 保存错误截图
    try {
      const errorScreenshot = path.join(__dirname, '../test-results/scenario-a-error.png');
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log('错误截图已保存:', errorScreenshot);
    } catch (e) {
      // 忽略截图错误
    }

    return { success: false, error: error.message };

  } finally {
    console.log('按任意键关闭浏览器...');
    // 等待用户检查
    await new Promise(resolve => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
      });
    });

    await browser.close();
  }
}

// 运行测试
if (require.main === module) {
  testScenarioA()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('未处理的错误:', error);
      process.exit(1);
    });
}

module.exports = { testScenarioA };
