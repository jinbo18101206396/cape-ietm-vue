/**
 * 测试环境检查脚本
 * 在运行 E2E 测试前检查所有前置条件
 */

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

const CHECKS = {
  frontend: {
    name: '前端服务',
    url: 'http://localhost:3000',
    required: true
  },
  backend: {
    name: '后端服务',
    url: 'http://localhost:8080/jeecg-boot/sys/common/api/getSystemInfo',
    required: true
  },
  testFile: {
    name: '测试文件',
    path: path.join(__dirname, '../tests/dm-full-features-test.spec.js'),
    required: true
  },
  playwrightConfig: {
    name: 'Playwright 配置',
    path: path.join(__dirname, '../playwright.config.js'),
    required: true
  }
}

async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(url, (res) => {
      resolve({ success: true, status: res.statusCode })
    })
    req.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
    req.setTimeout(10000, () => {
      req.destroy()
      resolve({ success: false, error: '超时' })
    })
  })
}

function checkFile(filePath) {
  if (fs.existsSync(filePath)) {
    return { success: true }
  }
  return { success: false, error: '文件不存在' }
}

async function runChecks() {
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║          IETM E2E 测试环境检查                            ║')
  console.log('╚═══════════════════════════════════════════════════════════╝\n')

  let allPassed = true

  // 检查前端服务
  console.log(`[1/4] 检查 ${CHECKS.frontend.name}...`)
  const frontendResult = await checkUrl(CHECKS.frontend.url)
  if (frontendResult.success) {
    console.log(`  ✅ ${CHECKS.frontend.name} 运行正常 (${frontendResult.status})\n`)
  } else {
    console.log(`  ❌ ${CHECKS.frontend.name} 不可访问: ${frontendResult.error}`)
    console.log(`     请确保前端服务已启动：npm run serve\n`)
    allPassed = false
  }

  // 检查后端服务
  console.log(`[2/4] 检查 ${CHECKS.backend.name}...`)
  const backendResult = await checkUrl(CHECKS.backend.url)
  if (backendResult.success) {
    console.log(`  ✅ ${CHECKS.backend.name} 运行正常 (${backendResult.status})\n`)
  } else {
    console.log(`  ❌ ${CHECKS.backend.name} 不可访问: ${backendResult.error}`)
    console.log(`     请确保后端服务已启动：mvn spring-boot:run\n`)
    allPassed = false
  }

  // 检查测试文件
  console.log(`[3/4] 检查 ${CHECKS.testFile.name}...`)
  const testFileResult = checkFile(CHECKS.testFile.path)
  if (testFileResult.success) {
    console.log(`  ✅ ${CHECKS.testFile.name} 存在\n`)

    // 检查测试配置
    const content = fs.readFileSync(CHECKS.testFile.path, 'utf-8')
    const s1000dMatch = content.match(/s1000dDmId:\s*['"]([^'"]+)['"]/)
    const gjb6600Match = content.match(/gjb6600DmId:\s*['"]([^'"]+)['"]/)

    console.log('  📋 当前测试 DM 配置：')
    if (s1000dMatch) {
      console.log(`     S1000D DM ID: ${s1000dMatch[1]}`)
    } else {
      console.log('     ⚠️  S1000D DM ID 未配置')
      allPassed = false
    }
    if (gjb6600Match) {
      console.log(`     GJB6600 DM ID: ${gjb6600Match[1]}\n`)
    } else {
      console.log('     ⚠️  GJB6600 DM ID 未配置\n')
      allPassed = false
    }
  } else {
    console.log(`  ❌ ${CHECKS.testFile.name} 不存在\n`)
    allPassed = false
  }

  // 检查 Playwright 配置
  console.log(`[4/4] 检查 ${CHECKS.playwrightConfig.name}...`)
  const configResult = checkFile(CHECKS.playwrightConfig.path)
  if (configResult.success) {
    console.log(`  ✅ ${CHECKS.playwrightConfig.name} 存在\n`)
  } else {
    console.log(`  ❌ ${CHECKS.playwrightConfig.name} 不存在\n`)
    allPassed = false
  }

  // 最终结果
  console.log('═══════════════════════════════════════════════════════════')
  if (allPassed) {
    console.log('✅ 所有检查通过！可以运行测试：')
    console.log('   npm run test:dm:headed     # 有界面模式（推荐）')
    console.log('   npm run test:dm            # 无头模式')
    console.log('   npm run test:dm:debug      # 调试模式\n')
  } else {
    console.log('❌ 部分检查失败。请解决上述问题后再运行测试。\n')
    console.log('💡 快速修复指南：')
    console.log('   1. 启动后端：cd ../cape-ietm-java && mvn spring-boot:run')
    console.log('   2. 启动前端：npm run serve')
    console.log('   3. 配置测试 DM：node scripts/prepare-test-data.js')
    console.log('   4. 重新检查：node scripts/check-test-env.js\n')
    process.exit(1)
  }
}

runChecks().catch(err => {
  console.error('检查过程中发生错误：', err)
  process.exit(1)
})
