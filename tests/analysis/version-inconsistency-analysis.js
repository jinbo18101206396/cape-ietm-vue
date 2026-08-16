/**
 * 问题排查：版本号不一致分析
 *
 * 问题描述：
 * 版本对比页面顶部显示的版本号（来自数据库）与XML文件内部的issueNumber不一致
 *
 * 可能原因：
 * 1. 历史版本记录的issueNo/inWork与XML内容不同步
 * 2. 创建历史版本时未更新XML内部的版本标签
 * 3. 复制DM时保留了原XML的版本信息
 * 4. 手动编辑XML但未同步数据库
 */

console.log('=== 版本号不一致问题排查 ===\n')

let issues = []
let warnings = []

function addIssue(msg) {
  issues.push(msg)
  console.log(`❌ ${msg}`)
}

function addWarning(msg) {
  warnings.push(msg)
  console.log(`⚠️  ${msg}`)
}

console.log('📦 问题分析\n')

// 模拟场景
const scenario1 = {
  name: '场景1：数据库与XML不一致',
  dbVersion: { issueNo: '001', inWork: '03' },
  xmlVersion: { issueNumber: '001', inWork: '00' },
  source: 'XML可能是从旧版本复制的'
}

const scenario2 = {
  name: '场景2：签入时未更新XML',
  dbVersion: { issueNo: '002', inWork: '00' },
  xmlVersion: { issueNumber: '001', inWork: '05' },
  source: '签入新版本时数据库更新了，但XML内容未更新'
}

const scenarios = [scenario1, scenario2]

scenarios.forEach((s, idx) => {
  console.log(`\n${s.name}:`)
  console.log(`  数据库版本: ${s.dbVersion.issueNo}-${s.dbVersion.inWork}`)
  console.log(`  XML版本: ${s.xmlVersion.issueNumber}-${s.xmlVersion.inWork}`)

  const dbVer = `${s.dbVersion.issueNo}-${s.dbVersion.inWork}`
  const xmlVer = `${s.xmlVersion.issueNumber}-${s.xmlVersion.inWork}`

  if (dbVer !== xmlVer) {
    addIssue(`${s.name}: 版本号不一致 (DB: ${dbVer}, XML: ${xmlVer})`)
    console.log(`  可能原因: ${s.source}`)
  }
})

console.log('\n' + '='.repeat(60))
console.log('\n📋 解决方案\n')

console.log('方案1: 显示时提醒用户')
console.log('  - 在版本对比页面检测版本号不一致')
console.log('  - 显示警告提示："XML内部版本号与记录不一致"')
console.log('  - 同时显示两个版本号供用户参考')
console.log('')

console.log('方案2: 自动同步（推荐）')
console.log('  - 在保存DM时自动更新XML内部的issueNumber')
console.log('  - 确保数据库字段与XML内容保持一致')
console.log('  - 在签入时强制同步版本号')
console.log('')

console.log('方案3: 添加验证')
console.log('  - 在对比页面加载时验证版本号一致性')
console.log('  - 解析XML提取issueNumber和inWork')
console.log('  - 与数据库记录对比，不一致时标记')
console.log('')

console.log('='.repeat(60))
console.log('\n📌 建议实施步骤\n')

console.log('第1步: 添加版本号验证函数')
console.log('  - 解析XML提取<issueInfo>标签')
console.log('  - 对比数据库版本号')
console.log('  - 返回不一致信息')
console.log('')

console.log('第2步: 在版本对比页面显示警告')
console.log('  - 检测到不一致时显示醒目提示')
console.log('  - 显示"DB: 001-03 / XML: 001-00"')
console.log('')

console.log('第3步: 修复历史数据（可选）')
console.log('  - 提供批量修复工具')
console.log('  - 管理员可选择以DB为准或以XML为准')
console.log('')

console.log('第4步: 预防新问题')
console.log('  - 在保存/签入时强制同步')
console.log('  - 添加后端校验')
console.log('')

console.log('='.repeat(60))
console.log('\n✅ 结论\n')

console.log('问题根源：')
console.log('  - 数据库记录的版本号与XML内容的版本号是两个独立的数据')
console.log('  - 没有强制同步机制导致可能不一致')
console.log('')

console.log('当前影响：')
console.log('  - 用户看到的版本号与XML实际版本号不符')
console.log('  - 可能导致混淆和错误判断')
console.log('')

console.log('推荐方案：')
console.log('  1. 立即实施：添加版本号不一致警告提示')
console.log('  2. 中期优化：在保存时自动同步版本号')
console.log('  3. 长期改进：添加数据一致性校验')
console.log('')

if (issues.length > 0) {
  console.log(`发现问题数: ${issues.length}`)
  process.exit(1)
} else {
  console.log('分析完成')
  process.exit(0)
}
