/**
 * 诊断脚本：检查删除线修复是否在浏览器中生效
 */

const fs = require('fs')
const path = require('path')

console.log('=== 删除线修复诊断报告 ===\n')

// 1. 检查源文件
const sourceFile = './src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js'
const sourceContent = fs.readFileSync(sourceFile, 'utf8')

console.log('✅ 步骤 1: 源文件检查')
console.log('   文件路径:', sourceFile)
console.log('   文件大小:', sourceContent.length, 'bytes')

const hasDeleteToS = sourceContent.includes("replace(/<delete>/g, '<s>')")
const hasSToDelete = sourceContent.includes("replace(/<s(\\s[^>]*)?>\\g, '<delete>')")
const hasDelToDelete = sourceContent.includes("replace(/<del(\\s[^>]*)?>\\g, '<delete>')")
const hasStrikeToDelete = sourceContent.includes("replace(/<strike(\\s[^>]*)?>\\g, '<delete>')")

console.log('   ✓ para2html: delete → s    :', hasDeleteToS ? '✅' : '❌')
console.log('   ✓ html2para: s → delete    :', hasSToDelete ? '✅' : '❌')
console.log('   ✓ html2para: del → delete  :', hasDelToDelete ? '✅' : '❌')
console.log('   ✓ html2para: strike → delete:', hasStrikeToDelete ? '✅' : '❌')

// 2. 提取修改的行
console.log('\n✅ 步骤 2: 修改内容')
const lines = sourceContent.split('\n')
const relevantLines = lines.filter((line, idx) => {
  return line.includes('delete') && line.includes('replace') && (
    line.includes('<s>') || line.includes('<del>') || line.includes('<strike>')
  )
})

console.log('   找到', relevantLines.length, '处修改:')
relevantLines.forEach((line, i) => {
  console.log(`   ${i + 1}. ${line.trim()}`)
})

// 3. 检查文件最后修改时间
const stats = fs.statSync(sourceFile)
const now = new Date()
const mtime = new Date(stats.mtime)
const timeDiff = (now - mtime) / 1000 / 60 // 分钟

console.log('\n✅ 步骤 3: 文件时间戳')
console.log('   最后修改:', mtime.toLocaleString('zh-CN'))
console.log('   距离现在:', Math.floor(timeDiff), '分钟前')

if (timeDiff > 10) {
  console.log('   ⚠️ 警告: 文件修改时间较早，可能不是最新的')
}

// 4. 输出结论
console.log('\n=== 诊断结论 ===')
if (hasDeleteToS && hasSToDelete && hasDelToDelete && hasStrikeToDelete) {
  console.log('✅ 源文件修改完整且正确')
  console.log('\n下一步操作:')
  console.log('1. 确认 webpack dev server 正在运行')
  console.log('2. 检查浏览器控制台是否有 [HMR] 更新提示')
  console.log('3. 在浏览器中按 Ctrl+Shift+R 强制刷新（清除缓存）')
  console.log('4. 如果仍未生效，重启 webpack dev server')
  console.log('5. 访问页面: http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
} else {
  console.log('❌ 源文件修改不完整')
  console.log('缺失的修改:')
  if (!hasDeleteToS) console.log('  - para2html: delete → s')
  if (!hasSToDelete) console.log('  - html2para: s → delete')
  if (!hasDelToDelete) console.log('  - html2para: del → delete')
  if (!hasStrikeToDelete) console.log('  - html2para: strike → delete')
}

console.log('\n=== 手动验证步骤 ===')
console.log('1. 打开页面并进入 para 设计视图')
console.log('2. 打开浏览器开发者工具 (F12)')
console.log('3. 在 Console 中运行以下代码检查:')
console.log('   ```javascript')
console.log('   // 检查模块是否已更新')
console.log('   console.log(window.$PARA_DESIGNER_INSTANCES)')
console.log('   ```')
console.log('4. 输入文本 "123"，选中后点击删除线按钮')
console.log('5. 在 Elements 面板检查是否生成了 <s> 标签')
console.log('6. 点击保存，切换到源码视图')
console.log('7. 检查 XML 是否包含 <delete>123</delete>')
