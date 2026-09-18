#!/usr/bin/env node

/**
 * 测试运行器
 * 执行P0+P1修复验证测试并生成报告
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('========================================')
console.log('  数据模块导入功能 P0+P1 测试验证')
console.log('========================================\n')

// 检查环境
console.log('1️⃣  检查测试环境...\n')

// 检查前端服务
try {
  execSync('curl -s http://localhost:3000 > /dev/null', { stdio: 'ignore' })
  console.log('✅ 前端服务运行正常 (http://localhost:3000)')
} catch (error) {
  console.log('❌ 前端服务未运行 (http://localhost:3000)')
  console.log('   请先启动前端服务: npm run serve\n')
  process.exit(1)
}

// 检查后端服务
try {
  execSync('curl -s http://localhost:9999 > /dev/null', { stdio: 'ignore' })
  console.log('✅ 后端服务运行正常 (http://localhost:9999)')
} catch (error) {
  console.log('⚠️  后端服务未运行 (http://localhost:9999)')
  console.log('   部分测试可能失败')
}

// 检查Playwright
try {
  execSync('npx playwright --version', { stdio: 'ignore' })
  console.log('✅ Playwright已安装')
} catch (error) {
  console.log('❌ Playwright未安装')
  console.log('   请运行: npm install @playwright/test\n')
  process.exit(1)
}

console.log('\n2️⃣  准备测试数据...\n')

// 创建必要的目录
const dirs = ['tests/temp', 'tests/test-data', 'test-results']
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`✅ 创建目录: ${dir}`)
  }
})

console.log('\n3️⃣  运行测试...\n')

// 运行测试
try {
  console.log('开始执行测试用例...\n')

  const testCommand = 'npx playwright test tests/dmimport-p0-p1-verification.spec.js --reporter=html,line'

  execSync(testCommand, {
    stdio: 'inherit',
    cwd: process.cwd()
  })

  console.log('\n✅ 测试执行完成！')

} catch (error) {
  console.log('\n⚠️  部分测试失败，请查看详细报告')
}

console.log('\n4️⃣  生成测试报告...\n')

// 打开测试报告
console.log('📊 测试报告位置:')
console.log('   HTML报告: playwright-report/index.html')
console.log('   执行命令查看: npx playwright show-report\n')

console.log('========================================')
console.log('  测试完成')
console.log('========================================\n')

console.log('💡 提示:')
console.log('   - 查看HTML报告: npm run test:e2e:report')
console.log('   - 重新运行测试: npm run test:dmimport')
console.log('   - 调试模式运行: npm run test:dmimport:debug\n')
