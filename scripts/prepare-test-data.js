#!/usr/bin/env node

/**
 * E2E 测试数据准备脚本
 * 从数据库查询可用的测试 DM ID，并自动更新测试配置
 *
 * 使用方法：
 * 1. 确保 application-dm8.yml 中的数据库配置正确
 * 2. 运行：node scripts/prepare-test-data.js
 * 3. 脚本会查询数据库并更新 tests/dm-full-features-test.spec.js 中的 TEST_CONFIG
 */

const fs = require('fs')
const path = require('path')

// 数据库配置（从 application-dm8.yml 读取）
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 5236,
  database: 'IETM',
  user: 'IETM',
  password: 'AvicCape301'
}

// 测试文件路径
const TEST_FILE = path.join(__dirname, '../tests/dm-full-features-test.spec.js')

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║     IETM E2E 测试数据准备脚本                              ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

console.log('⚠️  警告：本脚本需要达梦数据库（DM8）驱动')
console.log('⚠️  如果您未安装 dmdb 或 node-dmdb 包，请手动配置测试 ID\n')

console.log('📋 手动配置步骤：\n')
console.log('1. 连接到数据库：')
console.log(`   jdbc:dm://${DB_CONFIG.host}:${DB_CONFIG.port}/?${DB_CONFIG.database}\n`)

console.log('2. 执行以下 SQL 查询：\n')

const sql1 = `
-- 查询 S1000D 4.0 测试 DM
SELECT id, dm_code, p.project_name, p.ietm_standard
FROM ietm_data_module dm
JOIN ietm_project p ON dm.project_id = p.id
WHERE p.ietm_standard = 'S1000D4.0'
  AND dm.checkout_user IS NULL
  AND dm.dm_content IS NOT NULL
LIMIT 1;
`

const sql2 = `
-- 查询 GJB6600 测试 DM
SELECT id, dm_code, p.project_name, p.ietm_standard
FROM ietm_data_module dm
JOIN ietm_project p ON dm.project_id = p.id
WHERE p.ietm_standard = 'GJB6600'
  AND dm.checkout_user IS NULL
  AND dm.dm_content IS NOT NULL
LIMIT 1;
`

console.log(sql1)
console.log(sql2)

console.log('3. 将查询到的 id 复制到测试配置中：\n')
console.log(`   文件位置：${TEST_FILE}`)
console.log('   搜索 "TEST_CONFIG" 并更新以下字段：')
console.log('     - s1000dDmId: "<从查询1获取的id>"')
console.log('     - gjb6600DmId: "<从查询2获取的id>"\n')

console.log('4. 保存文件后运行测试：')
console.log('   npm run test:dm:headed\n')

console.log('═══════════════════════════════════════════════════════════')
console.log('💡 提示：如果需要自动化此过程，请考虑以下方案：')
console.log('   1. 安装达梦 JDBC 驱动并通过 Java 查询（推荐）')
console.log('   2. 使用 ODBC 驱动 + node-odbc')
console.log('   3. 编写 SQL 脚本手动执行并复制结果')
console.log('═══════════════════════════════════════════════════════════\n')

// 检查测试文件是否存在
if (fs.existsSync(TEST_FILE)) {
  const content = fs.readFileSync(TEST_FILE, 'utf-8')
  const s1000dMatch = content.match(/s1000dDmId:\s*['"]([^'"]+)['"]/)
  const gjb6600Match = content.match(/gjb6600DmId:\s*['"]([^'"]+)['"]/)

  console.log('📄 当前测试配置：')
  if (s1000dMatch) {
    console.log(`   S1000D DM ID: ${s1000dMatch[1]}`)
  }
  if (gjb6600Match) {
    console.log(`   GJB6600 DM ID: ${gjb6600Match[1]}`)
  }
  console.log()
} else {
  console.error(`❌ 错误：测试文件不存在：${TEST_FILE}`)
  process.exit(1)
}

console.log('✅ 准备工作完成！请按照上述步骤配置测试数据。\n')
