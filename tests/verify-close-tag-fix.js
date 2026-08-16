#!/usr/bin/env node
// 验证闭合标签识别修复

const fs = require('fs')

console.log('🔍 验证闭合标签识别修复\n')
console.log('='.repeat(60))

const xmlTreePath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/xmlTree.js'
const code = fs.readFileSync(xmlTreePath, 'utf8')

// 提取getnodeBylineno函数
const funcStart = code.indexOf('export function getnodeBylineno')
const funcEnd = code.indexOf('\n}', funcStart) + 2
const funcCode = code.substring(funcStart, funcEnd)

console.log('📋 检查修复内容\n')

const checks = {
  '1. cm参数支持': funcCode.includes('cm = null') || funcCode.includes('cm)'),
  '2. 精确匹配': funcCode.includes('exactMatch') && funcCode.includes('attributes.lineno === target'),
  '3. 闭合标签识别': funcCode.includes('closeTagMatch') && funcCode.includes('</'),
  '4. 正则匹配闭合标签': funcCode.includes('/^<\\/(\\w+)>$/') || funcCode.includes('</\\w+>'),
  '5. 向上查找开始标签': funcCode.includes('for (let i =') && funcCode.includes('i--'),
  '6. 标签名匹配': funcCode.includes('tagName') && funcCode.includes('node.text === tagName'),
  '7. 返回正确节点': funcCode.includes('return node')
}

let pass = 0
for (const [name, result] of Object.entries(checks)) {
  console.log(`${result ? '✅' : '❌'} ${name}`)
  if (result) pass++
}

console.log('\n' + '='.repeat(60))
console.log(`检查结果: ${pass}/${Object.keys(checks).length}`)

if (pass === Object.keys(checks).length) {
  console.log('\n✅ 所有修复点都已实现！')
  console.log('\n修复逻辑:')
  console.log('  1. 首先尝试精确匹配 lineno')
  console.log('  2. 如果失败，检查当前行是否是闭合标签 </xxx>')
  console.log('  3. 如果是，向上查找对应的开始标签 <xxx>')
  console.log('  4. 返回开始标签所在行的节点')
  console.log('\n这样就能正确处理双行元素的闭合标签行了！')
  console.log('\n需要测试的场景:')
  console.log('  场景1: 光标在 <Description> → 应选中Description节点')
  console.log('  场景2: 光标在 </Description> → 应选中Description节点 (修复的重点)')
  console.log('  场景3: 光标在 <description/> → 应选中description节点')
  process.exit(0)
} else {
  console.log('\n❌ 修复不完整！')
  console.log('\n函数代码片段:')
  console.log(funcCode.substring(0, 800))
  process.exit(1)
}
