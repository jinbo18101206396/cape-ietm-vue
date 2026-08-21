#!/usr/bin/env node

/**
 * 测试结果快速查看脚本
 * 解析test-report.json并以友好的格式显示
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, 'test-report.json');
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');

console.log('\n' + '='.repeat(80));
console.log('IETM项目实体管理预览功能 - 测试结果总结');
console.log('='.repeat(80));

try {
  // 读取报告
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

  // 基本信息
  console.log('\n📋 基本信息');
  console.log('-'.repeat(80));
  console.log(`开始时间: ${new Date(report.startTime).toLocaleString('zh-CN')}`);
  console.log(`结束时间: ${new Date(report.endTime).toLocaleString('zh-CN')}`);
  const duration = (new Date(report.endTime) - new Date(report.startTime)) / 1000;
  console.log(`执行时长: ${duration.toFixed(2)}秒`);
  console.log(`测试环境: ${report.environment.baseURL}`);
  console.log(`浏览器视口: ${report.environment.browserViewport}`);

  // 统计信息
  console.log('\n📊 测试统计');
  console.log('-'.repeat(80));
  console.log(`总计: ${report.summary.total}`);
  console.log(`✅ 通过: ${report.summary.passed}`);
  console.log(`❌ 失败: ${report.summary.failed}`);
  console.log(`⏭️  跳过: ${report.summary.skipped}`);
  const passRate = report.summary.total > 0
    ? (report.summary.passed / report.summary.total * 100).toFixed(2)
    : 0;
  console.log(`📈 通过率: ${passRate}%`);

  // 阶段结果
  console.log('\n🔄 执行阶段');
  console.log('-'.repeat(80));

  const phases = [
    { key: 'environmentCheck', name: '环境检查' },
    { key: 'login', name: '用户登录' },
    { key: 'openProject', name: '打开项目' },
    { key: 'navigation', name: '导航到ICN管理页面' },
    { key: 'configTree', name: '构型树准备' }
  ];

  phases.forEach(phase => {
    if (report.phases[phase.key]) {
      const p = report.phases[phase.key];
      const icon = p.success ? '✅' : '❌';
      const status = p.success ? '通过' : '失败';
      console.log(`${icon} ${phase.name}: ${status}`);
      if (p.error) {
        console.log(`   错误: ${p.error}`);
      }
    }
  });

  // 详细测试结果
  console.log('\n📝 测试详情');
  console.log('-'.repeat(80));

  report.tests.forEach((test, index) => {
    let icon = '';
    if (test.status === 'passed') icon = '✅';
    else if (test.status === 'failed') icon = '❌';
    else icon = '⏭️';

    console.log(`${icon} [${index + 1}] ${test.name}`);
    console.log(`   状态: ${test.status}`);
    console.log(`   执行时间: ${test.duration}ms`);
    if (test.error) {
      console.log(`   错误信息: ${test.error}`);
    }
  });

  // 问题列表
  if (report.issues && report.issues.length > 0) {
    console.log('\n⚠️  发现的问题');
    console.log('-'.repeat(80));

    report.issues.forEach((issue, index) => {
      const severityIcons = {
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
      };
      const icon = severityIcons[issue.severity] || 'ℹ️';
      console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
    });
  }

  // 截图信息
  if (report.screenshots && report.screenshots.length > 0) {
    console.log(`\n📸 截图 (${report.screenshots.length}张)`);
    console.log('-'.repeat(80));
    console.log(`目录: ${SCREENSHOTS_DIR}`);
    console.log('\n截图列表:');
    report.screenshots.forEach((screenshot, index) => {
      console.log(`  ${index + 1}. ${screenshot.filename} - ${screenshot.description}`);
    });
  }

  // 解决方案
  if (report.summary.failed > 0) {
    console.log('\n🛠️  解决方案');
    console.log('-'.repeat(80));

    if (report.phases.navigation && !report.phases.navigation.success) {
      console.log('❌ 问题: 项目实体管理菜单未配置');
      console.log('\n解决步骤:');
      console.log('1. 找到SQL脚本文件:');
      console.log('   src/views/ietm/icnmanage/IetmIcnManage_menu_insert.sql');
      console.log('');
      console.log('2. 在数据库中执行该SQL脚本');
      console.log('');
      console.log('3. 重启后端服务 (如果需要)');
      console.log('');
      console.log('4. 清除浏览器缓存并重新登录');
      console.log('');
      console.log('5. 重新运行测试:');
      console.log('   npx playwright test tests/autonomous-e2e-test.spec.js');
    }
  }

  // 下一步
  console.log('\n🚀 下一步操作');
  console.log('-'.repeat(80));
  console.log('查看详细报告:');
  console.log(`  - Markdown报告: AUTONOMOUS_TEST_FINAL_REPORT.md`);
  console.log(`  - JSON报告: test-report.json`);
  console.log(`  - 截图目录: test-screenshots/`);
  console.log('');
  console.log('重新运行测试:');
  console.log('  npx playwright test tests/autonomous-e2e-test.spec.js');
  console.log('');
  console.log('查看Playwright HTML报告:');
  console.log('  npx playwright show-report playwright-report');

  console.log('\n' + '='.repeat(80));
  console.log('报告查看完成');
  console.log('='.repeat(80) + '\n');

} catch (error) {
  console.error('\n❌ 错误: 无法读取测试报告');
  console.error(`详细信息: ${error.message}`);
  console.error('\n请确保已运行测试: npx playwright test tests/autonomous-e2e-test.spec.js\n');
  process.exit(1);
}
