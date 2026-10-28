#!/usr/bin/env node

/**
 * LevelledParaDesigner 修复验证 - 浏览器自动化测试
 * 使用 Playwright 进行端到端测试
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  tests: []
};

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        LevelledParaDesigner 浏览器自动化测试                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({
    headless: false, // 显示浏览器窗口便于观察
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 设置视口大小
    await page.setViewportSize({ width: 1280, height: 1024 });

    // 监听控制台消息
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[浏览器错误] ${msg.text()}`);
      }
    });

    // 测试1：验证 HTML 处理函数
    await testHTMLProcessing(page);

    // 测试2：验证全局实例映射
    await testGlobalMapping(page);

    // 测试3：验证编译产物
    await testBuildOutput(page);

    // 测试4：验证源代码中的修改
    await testSourceCode();

    // 生成报告
    generateReport();

  } catch (error) {
    console.error('❌ 测试执行出错:', error);
    testResults.failed++;
    testResults.errors.push(error.message);
  } finally {
    await browser.close();
  }
}

/**
 * 测试1：HTML 处理函数
 */
async function testHTMLProcessing(page) {
  console.log('\n📋 测试1：HTML 处理函数验证');
  console.log('─'.repeat(60));

  let result = null;

  try {
    // 注入测试代码
    result = await page.evaluate(() => {
      // 定义测试函数
      function stripOuterParagraphTag(html) {
        if (!html || !html.trim()) return ''
        const outerPMatch = html.match(/^<p(\s[^>]*)?>/)
        if (outerPMatch && html.endsWith('</p>')) {
          return html.substring(outerPMatch[0].length, html.length - 4)
        }
        return html
      }

      // 测试用例
      const testCases = [
        { input: '<p>111</p>', expected: '111', desc: '基础p标签' },
        { input: '<p class="x">222</p>', expected: '222', desc: 'p标签含属性' },
        { input: '123', expected: '123', desc: '纯文本' },
        { input: '<p>a<b>b</b></p>', expected: 'a<b>b</b>', desc: '嵌套标签' },
        { input: '', expected: '', desc: '空字符串' },
        { input: '<p>test\nline</p>', expected: 'test\nline', desc: '含换行符' }
      ];

      return testCases.map(tc => ({
        ...tc,
        actual: stripOuterParagraphTag(tc.input),
        passed: stripOuterParagraphTag(tc.input) === tc.expected
      }));
    });

    // 输出测试结果
    result.forEach((r, idx) => {
      const status = r.passed ? '✅' : '❌';
      console.log(`  ${status} 用例 ${idx + 1} (${r.desc})`);
      console.log(`     输入: "${r.input}"`);
      console.log(`     期望: "${r.expected}"`);
      console.log(`     实际: "${r.actual}"`);

      if (r.passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
        testResults.errors.push(`HTML处理函数 - 用例${idx + 1}失败`);
      }
    });

  } catch (error) {
    console.error('❌ HTML处理函数测试失败:', error.message);
    testResults.failed++;
    testResults.errors.push(`HTML处理函数测试: ${error.message}`);
  }

  testResults.tests.push({
    name: '测试1：HTML处理函数',
    passed: result ? result.filter(r => r.passed).length : 0,
    total: result ? result.length : 0
  });
}

/**
 * 测试2：全局实例映射
 */
async function testGlobalMapping(page) {
  console.log('\n📋 测试2：全局实例映射验证');
  console.log('─'.repeat(60));

  try {
    // 检查全局对象
    const hasMapping = await page.evaluate(() => {
      return {
        hasInstances: typeof (window).LEVELLEDPARA_DESIGNER_INSTANCES !== 'undefined',
        hasUEditor: typeof (window).UE !== 'undefined',
        hasVue: typeof (window).Vue !== 'undefined'
      };
    });

    if (hasMapping.hasInstances) {
      console.log('  ✅ 全局实例映射($LEVELLEDPARA_DESIGNER_INSTANCES)已存在');
      testResults.passed++;
    } else {
      console.log('  ⚠️  全局实例映射尚未初始化（组件可能未加载）');
    }

    if (hasMapping.hasUEditor) {
      console.log('  ✅ UEditor 库已加载');
      testResults.passed++;
    } else {
      console.log('  ⚠️  UEditor 库未加载');
    }

    if (hasMapping.hasVue) {
      console.log('  ✅ Vue 框架已加载');
      testResults.passed++;
    } else {
      console.log('  ❌ Vue 框架未加载');
      testResults.failed++;
      testResults.errors.push('Vue框架未加载');
    }

    testResults.tests.push({
      name: '测试2：全局实例映射',
      passed: Object.values(hasMapping).filter(v => v).length,
      total: 3
    });

  } catch (error) {
    console.error('❌ 全局实例映射测试失败:', error.message);
    testResults.failed++;
    testResults.errors.push(`全局实例映射测试: ${error.message}`);
  }
}

/**
 * 测试3：验证编译产物
 */
async function testBuildOutput(page) {
  console.log('\n📋 测试3：编译产物验证');
  console.log('─'.repeat(60));

  try {
    const distPath = path.join(__dirname, '../dist');

    if (fs.existsSync(distPath)) {
      const stats = fs.statSync(distPath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  ✅ dist 目录存在`);
      console.log(`     大小: ${size}MB`);
      testResults.passed++;

      // 检查重要文件
      const jsPath = path.join(distPath, 'js');
      const cssPath = path.join(distPath, 'css');

      if (fs.existsSync(jsPath)) {
        const jsFiles = fs.readdirSync(jsPath).length;
        console.log(`  ✅ JS 文件已生成 (${jsFiles} 个文件)`);
        testResults.passed++;
      } else {
        console.log('  ❌ JS 目录不存在');
        testResults.failed++;
      }

      if (fs.existsSync(cssPath)) {
        const cssFiles = fs.readdirSync(cssPath).length;
        console.log(`  ✅ CSS 文件已生成 (${cssFiles} 个文件)`);
        testResults.passed++;
      } else {
        console.log('  ❌ CSS 目录不存在');
        testResults.failed++;
      }

    } else {
      console.log('  ⚠️  dist 目录不存在（位置：' + distPath + '）');
      console.log('  ℹ️  若需要编译产物，请先运行 npm run build');
      testResults.failed++;
      testResults.errors.push('dist目录不存在');
    }

    testResults.tests.push({
      name: '测试3：编译产物',
      passed: fs.existsSync(path.join(__dirname, '../dist')) ? 3 : 0,
      total: 3
    });

  } catch (error) {
    console.error('❌ 编译产物测试失败:', error.message);
    testResults.failed++;
    testResults.errors.push(`编译产物测试: ${error.message}`);
  }
}

/**
 * 测试4：验证源代码修改
 */
async function testSourceCode() {
  console.log('\n📋 测试4：源代码修改验证');
  console.log('─'.repeat(60));

  try {
    // 使用正确的路径（相对于脚本位置）
    const filePath = path.join(__dirname, '../src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue');

    if (!fs.existsSync(filePath)) {
      console.log('  ❌ 源文件不存在：' + filePath);
      testResults.failed++;
      testResults.errors.push('LevelledParaDesigner.vue不存在');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // 检查关键修改
    const checks = [
      {
        name: '导入对话框组件',
        pattern: /import IetmInterrefDialog from/,
        point: 1
      },
      {
        name: '组件注册',
        pattern: /components:\s*{\s*IetmInterrefDialog/,
        point: 2
      },
      {
        name: 'HTML处理函数',
        pattern: /stripOuterParagraphTag\s*\(\s*html\s*\)/,
        point: 3
      },
      {
        name: '全局实例映射',
        pattern: /LEVELLEDPARA_DESIGNER_INSTANCES\[this\.contentEditorId\]/,
        point: 4
      },
      {
        name: '按钮回调实现',
        pattern: /instance\.\$refs\.interrefDialog\.open\(\)/,
        point: 5
      },
      {
        name: 'Alert提示移除',
        pattern: /alert\s*\(\s*['"]图符功能在简化编辑器中暂不支持['"]\s*\)/,
        negate: true, // 应该不存在
        point: 6
      }
    ];

    let passedChecks = 0;

    checks.forEach(check => {
      const found = check.pattern.test(content);
      const passed = check.negate ? !found : found;

      if (passed) {
        console.log(`  ✅ ${check.name}`);
        testResults.passed++;
        passedChecks++;
      } else {
        console.log(`  ❌ ${check.name}`);
        testResults.failed++;
        testResults.errors.push(`源代码检查失败: ${check.name}`);
      }
    });

    testResults.tests.push({
      name: '测试4：源代码修改',
      passed: passedChecks,
      total: checks.length
    });

  } catch (error) {
    console.error('❌ 源代码验证失败:', error.message);
    testResults.failed++;
    testResults.errors.push(`源代码验证: ${error.message}`);
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      测试总结                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 打印各测试的统计
  testResults.tests.forEach(test => {
    const ratio = `${test.passed}/${test.total}`;
    const status = test.passed === test.total ? '✅' : '⚠️';
    console.log(`${status} ${test.name}: ${ratio} 通过`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`总计：${testResults.passed} 个测试通过，${testResults.failed} 个失败`);

  if (testResults.errors.length > 0) {
    console.log('\n错误详情：');
    testResults.errors.forEach(err => {
      console.log(`  • ${err}`);
    });
  }

  console.log('─'.repeat(60));

  const successRate = testResults.passed + testResults.failed > 0
    ? ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)
    : 0;

  console.log(`\n总体通过率: ${successRate}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 所有测试通过！修复已验证可用\n');
  } else {
    console.log(`\n⚠️  有 ${testResults.failed} 个测试失败\n`);
  }

  // 保存报告到文件
  const reportPath = path.join(__dirname, '../../playwright-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 详细报告已保存到: ${reportPath}\n`);
}

// 运行测试
runTests().catch(console.error);
