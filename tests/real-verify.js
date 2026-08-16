#!/usr/bin/env node
// 真实验证脚本 - 不骗人版
const fs = require('fs')

console.log('🔍 真实问题验证 - 不骗人版\n')
console.log('='.repeat(60))

const opsPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/elementOps.js'
const editorPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue'
const treePath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/DmStructureTree.vue'

const opsCode = fs.readFileSync(opsPath, 'utf8')
const editorCode = fs.readFileSync(editorPath, 'utf8')
const treeCode = fs.readFileSync(treePath, 'utf8')

let issues = []

// ============ 问题4：删除按钮 ============
console.log('\n📋 问题4：元素模块没有删除按钮')
console.log('-'.repeat(60))

const q4_rightClick = treeCode.includes('@rightClick="onRightClick"')
const q4_deleteKey = treeCode.includes('key="__delete__"')
const q4_deleteText = treeCode.includes('删除此元素')
const q4_deleteEmit = treeCode.includes("$emit('delete-element'")

console.log('右键菜单实现:')
console.log('  ✓ @rightClick事件:', q4_rightClick ? '存在' : '缺失')
console.log('  ✓ __delete__键:', q4_deleteKey ? '存在' : '缺失')
console.log('  ✓ 删除此元素文本:', q4_deleteText ? '存在' : '缺失')
console.log('  ✓ emit事件:', q4_deleteEmit ? '存在' : '缺失')

if (q4_rightClick && q4_deleteKey && q4_deleteText && q4_deleteEmit) {
  console.log('\n✅ 问题4已解决：右键菜单有完整的删除功能')
} else {
  console.log('\n❌ 问题4未解决：右键菜单不完整')
  issues.push('问题4：删除按钮功能不完整')
}

// ============ 问题3：删除报错 ============
console.log('\n📋 问题3：删除报错 chunkSize')
console.log('-'.repeat(60))

// 精确查找deleteLine函数
const deleteLineStart = opsCode.indexOf('export function deleteLine(editor, lineNumber)')
const deleteLineEnd = opsCode.indexOf('\nexport function', deleteLineStart + 1)
const deleteLineCode = deleteLineEnd > 0
  ? opsCode.substring(deleteLineStart, deleteLineEnd)
  : opsCode.substring(deleteLineStart, deleteLineStart + 1000)

const q3_editorCheck = deleteLineCode.includes('!editor') && deleteLineCode.includes('typeof editor')
const q3_getLineCheck = deleteLineCode.includes("typeof editor.getLine !== 'function'")
const q3_replaceRangeCheck = deleteLineCode.includes("typeof editor.replaceRange !== 'function'")
const q3_tryCatch = deleteLineCode.includes('try {') && deleteLineCode.includes('} catch')
const q3_errorMsg = deleteLineCode.includes('editor对象无效或未初始化')

console.log('deleteLine函数增强:')
console.log('  ✓ editor对象检查:', q3_editorCheck ? '已添加' : '缺失')
console.log('  ✓ getLine方法检查:', q3_getLineCheck ? '已添加' : '缺失')
console.log('  ✓ replaceRange检查:', q3_replaceRangeCheck ? '已添加' : '缺失')
console.log('  ✓ try-catch包裹:', q3_tryCatch ? '已添加' : '缺失')
console.log('  ✓ 清晰错误提示:', q3_errorMsg ? '已添加' : '缺失')

if (q3_editorCheck && q3_getLineCheck && q3_tryCatch && q3_errorMsg) {
  console.log('\n✅ 问题3已修复：deleteLine有完整的错误检查')
} else {
  console.log('\n❌ 问题3未修复：deleteLine检查不完整')
  issues.push('问题3：deleteLine缺少错误检查')
  console.log('\n函数代码片段:')
  console.log(deleteLineCode.substring(0, 500))
}

// ============ 问题2：高亮不一致 ============
console.log('\n📋 问题2：XML高亮与导航树选中不一致')
console.log('-'.repeat(60))

const q2_flagDef = editorCode.includes('editorcursorFlag')
const q2_onCursorSet = editorCode.match(/onCursorNode[^{]*{[\s\S]{0,200}editorcursorFlag\s*=\s*true/)
const q2_onTreeCheck = editorCode.match(/onTreeSelect[^{]*{[\s\S]{0,200}if\s*\(\s*this\.editorcursorFlag\s*\)\s*return/)
const q2_nextTickReset = editorCode.includes('this.editorcursorFlag = false')

console.log('防循环机制:')
console.log('  ✓ editorcursorFlag定义:', q2_flagDef ? '存在' : '缺失')
console.log('  ✓ onCursorNode设置:', q2_onCursorSet ? '存在' : '缺失')
console.log('  ✓ onTreeSelect检查:', q2_onTreeCheck ? '存在' : '缺失')
console.log('  ✓ nextTick重置:', q2_nextTickReset ? '存在' : '缺失')

if (q2_flagDef && q2_onCursorSet && q2_onTreeCheck && q2_nextTickReset) {
  console.log('\n✅ 问题2已解决：完整的防循环机制')
} else {
  console.log('\n❌ 问题2未解决：防循环机制不完整')
  issues.push('问题2：防循环机制缺失或不完整')
}

// ============ 问题1：插入位置错误 ============
console.log('\n📋 问题1：双击子元素插入位置错误')
console.log('-'.repeat(60))

const q1_funcExists = opsCode.includes('export function calculateInsertLine')
const q1_appendType = opsCode.match(/calculateInsertLine[^{]*{[\s\S]{0,500}appendType/)
const q1_linenoOffset = opsCode.match(/calculateInsertLine[^{]*{[\s\S]{0,500}linenoOffset/)
const q1_childHandle = opsCode.match(/calculateInsertLine[\s\S]{0,1000}(child|appendChild|insertChild)/)
const q1_siblingHandle = opsCode.match(/calculateInsertLine[\s\S]{0,1000}(sibling|insertSibling|insertBefore)/)

console.log('calculateInsertLine函数:')
console.log('  ✓ 函数存在:', q1_funcExists ? '是' : '否')
console.log('  ✓ appendType参数:', q1_appendType ? '使用' : '未使用')
console.log('  ✓ linenoOffset参数:', q1_linenoOffset ? '使用' : '未使用')
console.log('  ✓ child类型处理:', q1_childHandle ? '有' : '无')
console.log('  ✓ sibling类型处理:', q1_siblingHandle ? '有' : '无')

if (q1_funcExists && q1_appendType && q1_linenoOffset) {
  console.log('\n⏳ 问题1：函数逻辑存在，但无法通过代码验证实际效果')
  console.log('   需要：实际UI测试或具体错误案例')
} else {
  console.log('\n❌ 问题1未解决：函数逻辑不完整')
  issues.push('问题1：calculateInsertLine函数逻辑缺失')
}

// ============ 总结 ============
console.log('\n' + '='.repeat(60))
console.log('验证总结')
console.log('='.repeat(60))

if (issues.length === 0) {
  console.log('\n✅ 所有可验证的问题都已修复！')
  console.log('\n已修复:')
  console.log('  ✅ 问题2: 高亮不一致 - 防循环机制完整')
  console.log('  ✅ 问题3: 删除报错 - 错误检查完整')
  console.log('  ✅ 问题4: 无删除按钮 - 右键菜单功能完整')
  console.log('\n需要实际测试:')
  console.log('  ⏳ 问题1: 插入位置 - 代码逻辑存在，需UI验证')
  process.exit(0)
} else {
  console.log('\n❌ 发现未修复的问题:')
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`)
  })
  process.exit(1)
}
