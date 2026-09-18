#!/usr/bin/env node
/**
 * 数据模块导入E2E测试运行脚本
 * 自动运行测试并生成详细报告
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// 配置
const CONFIG = {
  testFile: 'tests/e2e/dm-import-complete.spec.js',
  reportDir: 'tests/test-results',
  htmlReportDir: 'tests/test-results/html-report'
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('')
  log('='.repeat(60), 'cyan')
  log(title, 'cyan')
  log('='.repeat(60), 'cyan')
  console.log('')
}

// 检查前置条件
function checkPrerequisites() {
  logSection('检查前置条件')

  // 检查前端服务
  log('检查前端服务 (http://localhost:3000)...', 'blue')
  try {
    execSync('curl -s http://localhost:3000 > /dev/null', { stdio: 'ignore' })
    log('✓ 前端服务运行中', 'green')
  } catch (error) {
    log('✗ 前端服务未运行，请先启动: npm run serve', 'red')
    process.exit(1)
  }

  // 检查后端服务
  log('检查后端服务 (http://localhost:9999)...', 'blue')
  try {
    execSync('curl -s http://localhost:9999 > /dev/null', { stdio: 'ignore' })
    log('✓ 后端服务运行中', 'green')
  } catch (error) {
    log('✗ 后端服务未运行，请先启动后端', 'red')
    process.exit(1)
  }

  // 检查Playwright安装
  log('检查Playwright安装...', 'blue')
  try {
    execSync('npx playwright --version', { stdio: 'ignore' })
    log('✓ Playwright已安装', 'green')
  } catch (error) {
    log('✗ Playwright未安装，正在安装...', 'yellow')
    execSync('npm install -D @playwright/test', { stdio: 'inherit' })
    execSync('npx playwright install chromium', { stdio: 'inherit' })
  }

  // 检查jszip
  log('检查jszip依赖...', 'blue')
  try {
    require.resolve('jszip')
    log('✓ jszip已安装', 'green')
  } catch (error) {
    log('✗ jszip未安装（测试需要），正在安装...', 'yellow')
    execSync('npm install jszip', { stdio: 'inherit' })
  }
}

// 清理旧的测试结果
function cleanupOldResults() {
  logSection('清理旧测试结果')

  if (fs.existsSync(CONFIG.reportDir)) {
    log('删除旧测试结果...', 'blue')
    fs.rmSync(CONFIG.reportDir, { recursive: true, force: true })
    log('✓ 清理完成', 'green')
  }
}

// 运行测试
function runTests() {
  logSection('运行E2E测试')

  log('开始运行测试套件...', 'blue')
  log(`测试文件: ${CONFIG.testFile}`, 'blue')
  console.log('')

  try {
    execSync(`npx playwright test ${CONFIG.testFile} --reporter=list,html,json`, {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    })
    log('\n✓ 所有测试通过', 'green')
    return true
  } catch (error) {
    log('\n✗ 部分测试失败', 'red')
    return false
  }
}

// 解析测试结果
function parseResults() {
  logSection('测试结果汇总')

  const resultsFile = path.join(CONFIG.reportDir, 'results.json')

  if (!fs.existsSync(resultsFile)) {
    log('未找到测试结果文件', 'yellow')
    return null
  }

  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'))

  // 统计
  const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  }

  results.suites.forEach(suite => {
    suite.specs.forEach(spec => {
      stats.total++
      spec.tests.forEach(test => {
        if (test.status === 'expected') {
          stats.passed++
        } else if (test.status === 'unexpected') {
          stats.failed++
        } else if (test.status === 'skipped') {
          stats.skipped++
        }
        stats.duration += test.duration || 0
      })
    })
  })

  // 输出统计
  log(`总测试数: ${stats.total}`, 'blue')
  log(`通过: ${stats.passed}`, 'green')
  if (stats.failed > 0) {
    log(`失败: ${stats.failed}`, 'red')
  }
  if (stats.skipped > 0) {
    log(`跳过: ${stats.skipped}`, 'yellow')
  }
  log(`总耗时: ${(stats.duration / 1000).toFixed(2)}秒`, 'blue')

  return stats
}

// 生成测试报告
function generateReport(stats) {
  logSection('测试报告')

  // HTML报告
  const htmlReport = path.join(CONFIG.htmlReportDir, 'index.html')
  if (fs.existsSync(htmlReport)) {
    log(`HTML报告: ${htmlReport}`, 'blue')
    log('在浏览器中打开: npx playwright show-report', 'cyan')
  }

  // 生成Markdown报告
  const mdReport = generateMarkdownReport(stats)
  const mdReportPath = path.join(CONFIG.reportDir, 'test-report.md')
  fs.writeFileSync(mdReportPath, mdReport, 'utf-8')
  log(`Markdown报告: ${mdReportPath}`, 'blue')

  console.log('')
}

// 生成Markdown报告
function generateMarkdownReport(stats) {
  const timestamp = new Date().toLocaleString('zh-CN')
  const passRate = stats ? ((stats.passed / stats.total) * 100).toFixed(1) : 'N/A'

  return `# 数据模块导入E2E测试报告

## 测试信息

- **测试时间**: ${timestamp}
- **测试文件**: ${CONFIG.testFile}
- **浏览器**: Chromium

## 测试统计

| 指标 | 数值 |
|------|------|
| 总测试数 | ${stats?.total || 'N/A'} |
| ✅ 通过 | ${stats?.passed || 'N/A'} |
| ❌ 失败 | ${stats?.failed || 'N/A'} |
| ⏭️ 跳过 | ${stats?.skipped || 'N/A'} |
| 通过率 | ${passRate}% |
| ⏱️ 总耗时 | ${stats ? (stats.duration / 1000).toFixed(2) : 'N/A'}秒 |

## 测试覆盖范围

### 功能测试
- ✅ ZIP文件解压并显示内部文件名
- ✅ 上传后文件状态为"待校验"
- ✅ 混合文件类型识别（DM + ICN）
- ✅ 校验按钮调用新API端点
- ✅ 校验后状态更新

### DDN自动填充
- ✅ 校验后自动填充型号和密级
- ✅ 不覆盖用户已填写字段
- ✅ 密级格式标准化（1位→2位）
- ✅ 多DM文件使用第一个DM信息

### 完整流程
- ✅ 上传→校验→自动填充→导入
- ✅ 单个XML文件处理
- ✅ 混合上传（XML + ZIP）

### 边界和异常
- ✅ 空ZIP文件处理
- ✅ 超大ZIP文件性能测试（50个DM）
- ✅ 仅ICN文件不填充DDN
- ✅ 无效XML文件处理

### UI交互
- ✅ 清空列表功能
- ✅ 删除单个文件
- ✅ 查看校验详情
- ✅ 统计信息更新

## 测试结果

${stats?.failed > 0 ? '⚠️ **部分测试失败，请查看详细日志**' : '✅ **所有测试通过**'}

## 详细报告

查看完整HTML报告:
\`\`\`bash
npx playwright show-report
\`\`\`

---
*报告生成时间: ${timestamp}*
`
}

// 主函数
async function main() {
  console.clear()
  log('╔═══════════════════════════════════════════════════════════╗', 'cyan')
  log('║      数据模块导入 E2E 自动化测试                          ║', 'cyan')
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan')
  console.log('')

  try {
    // 1. 检查前置条件
    checkPrerequisites()

    // 2. 清理旧结果
    cleanupOldResults()

    // 3. 运行测试
    const success = runTests()

    // 4. 解析结果
    const stats = parseResults()

    // 5. 生成报告
    generateReport(stats)

    // 6. 总结
    logSection('测试完成')
    if (success) {
      log('🎉 所有测试通过！', 'green')
      process.exit(0)
    } else {
      log('⚠️  部分测试失败，请查看详细报告', 'yellow')
      process.exit(1)
    }
  } catch (error) {
    log(`\n❌ 测试运行失败: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

// 运行
if (require.main === module) {
  main()
}

module.exports = { main }
