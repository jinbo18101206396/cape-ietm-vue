#!/usr/bin/env node
/**
 * IETM 一期全量测试 - 代码静态验证脚本
 *
 * 不依赖运行环境，通过代码分析验证关键功能
 */

const fs = require('fs')
const path = require('path')

const BASE_DIR = path.resolve(__dirname, '..')
let passed = 0
let failed = 0
let warnings = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`)
    passed++
    return true
  } else {
    console.error(`❌ ${message}`)
    failed++
    return false
  }
}

function warn(message) {
  console.log(`⚠️  ${message}`)
  warnings++
}

console.log('================================================================================')
console.log('IETM 一期全量测试 - 代码静态验证')
console.log('================================================================================\n')

// ============================================================================
// 1. 重建 refs 功能验证
// ============================================================================
console.log('【1】重建 refs 与 DOCTYPE 功能验证\n')

const editorPath = path.join(BASE_DIR, 'src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')

if (!fs.existsSync(editorPath)) {
  console.error(`❌ 编辑器文件不存在: ${editorPath}`)
  process.exit(1)
}

const editorContent = fs.readFileSync(editorPath, 'utf-8')

// 1.1 检查三段式方法存在
assert(editorContent.includes('_torefs()') || editorContent.includes('_torefs ()'),
  '1.1 _torefs() 方法存在')
assert(editorContent.includes('_correctIcn()') || editorContent.includes('_correctIcn ()'),
  '1.2 _correctIcn() 方法存在')
assert(editorContent.includes('_updateDoctype()') || editorContent.includes('_updateDoctype ()'),
  '1.3 _updateDoctype() 方法存在')

// 1.2 检查 P0 修复：ICN 大小写匹配
const icnMatchPattern = /toLowerCase\(\)\.startsWith\(.*\.toLowerCase\(\)/
if (icnMatchPattern.test(editorContent)) {
  console.log('✅ 1.4 ICN 大小写不敏感匹配已实现')
  passed++
} else {
  console.error('❌ 1.4 ICN 大小写不敏感匹配未实现')
  failed++
}

// 1.3 检查 P0 修复：icnlist 为空检测
const icnlistCheckPattern = /icnlist.*length.*===.*0/
if (icnlistCheckPattern.test(editorContent)) {
  console.log('✅ 1.5 icnlist 为空检测已实现')
  passed++
} else {
  console.error('❌ 1.5 icnlist 为空检测未实现')
  failed++
}

// 1.4 检查防御性编程：XML 解析失败检测
const xmlParseCheckPattern = /nodeList.*length.*===.*0/
const xmlParseCheckCount = (editorContent.match(xmlParseCheckPattern) || []).length
if (xmlParseCheckCount >= 2) {
  console.log(`✅ 1.6 XML 解析失败检测已实现 (${xmlParseCheckCount}处)`)
  passed++
} else {
  console.error(`❌ 1.6 XML 解析失败检测不足 (仅${xmlParseCheckCount}处，预期>=2)`)
  failed++
}

// 1.5 检查 brexDmRef 排除逻辑
if (editorContent.includes('brexDmRef')) {
  console.log('✅ 1.7 brexDmRef 排除逻辑存在')
  passed++
} else {
  console.error('❌ 1.7 brexDmRef 排除逻辑不存在')
  failed++
}

console.log('')

// ============================================================================
// 2. NOTATION 映射验证
// ============================================================================
console.log('【2】NOTATION 映射表验证\n')

const notationsPath = path.join(BASE_DIR, 'src/views/ietm/ietmdatamodulemanagement/editor/utils/notations.js')

if (fs.existsSync(notationsPath)) {
  const notationsContent = fs.readFileSync(notationsPath, 'utf-8')

  // 检查导出
  assert(notationsContent.includes('export const NOTATIONS'),
    '2.1 NOTATIONS 常量已导出')

  // 粗略统计条目数（查找冒号数量）
  const entryCount = (notationsContent.match(/:\s*['"]/g) || []).length
  if (entryCount >= 100) {
    console.log(`✅ 2.2 NOTATION 映射表包含 ${entryCount} 个条目 (>=100)`)
    passed++
  } else {
    console.error(`❌ 2.2 NOTATION 映射表仅包含 ${entryCount} 个条目 (<100)`)
    failed++
  }

  // 检查辅助函数
  assert(notationsContent.includes('hasNotation'),
    '2.3 hasNotation() 辅助函数存在')
  assert(notationsContent.includes('getNotation'),
    '2.4 getNotation() 辅助函数存在')

  // 检查新增格式
  assert(notationsContent.includes('webm'),
    '2.5 webm 格式已添加')
  assert(notationsContent.includes('ogg'),
    '2.6 ogg 格式已添加')
} else {
  console.error(`❌ NOTATION 映射文件不存在: ${notationsPath}`)
  failed += 6
}

console.log('')

// ============================================================================
// 3. ICN 白名单验证
// ============================================================================
console.log('【3】ICN 文件后缀白名单验证\n')

const icnExtPath = path.join(BASE_DIR, 'src/views/ietm/ietmdatamodulemanagement/editor/utils/icnFileExt.js')

if (fs.existsSync(icnExtPath)) {
  const icnExtContent = fs.readFileSync(icnExtPath, 'utf-8')

  assert(icnExtContent.includes('export const ICN_FILE_EXT'),
    '3.1 ICN_FILE_EXT 常量已导出')

  // 检查常见格式
  assert(icnExtContent.includes('.cgm'),
    '3.2 .cgm 格式存在')
  assert(icnExtContent.includes('.svg'),
    '3.3 .svg 格式存在')
  assert(icnExtContent.includes('.png'),
    '3.4 .png 格式存在')
  assert(icnExtContent.includes('.mp4'),
    '3.5 .mp4 格式存在')

  // 检查辅助函数
  assert(icnExtContent.includes('isValidIcnExt'),
    '3.6 isValidIcnExt() 辅助函数存在')
  assert(icnExtContent.includes('normalizeExt'),
    '3.7 normalizeExt() 辅助函数存在')
} else {
  console.error(`❌ ICN 白名单文件不存在: ${icnExtPath}`)
  failed += 7
}

console.log('')

// ============================================================================
// 4. 预览功能验证
// ============================================================================
console.log('【4】预览功能验证\n')

// 检查预览方法
assert(editorContent.includes('doPreview()') || editorContent.includes('doPreview ()'),
  '4.1 doPreview() 方法存在')

// 检查大文档警告
const previewSizeCheck = /sizeKB\s*>\s*500/
if (previewSizeCheck.test(editorContent)) {
  console.log('✅ 4.2 预览大文档警告已实现 (>500KB)')
  passed++
} else {
  warn('4.2 预览大文档警告未找到')
}

// 检查防御性编程
assert(editorContent.includes('previewing'),
  '4.3 预览防重复点击保护存在')

console.log('')

// ============================================================================
// 5. 校验功能验证
// ============================================================================
console.log('【5】校验功能验证\n')

assert(editorContent.includes('doValidate()') || editorContent.includes('doValidate ()'),
  '5.1 doValidate() 方法存在')

assert(editorContent.includes('locateerror') || editorContent.includes('locateError'),
  '5.2 错误定位功能存在')

console.log('')

// ============================================================================
// 6. 元素操作验证
// ============================================================================
console.log('【6】元素操作功能验证\n')

assert(editorContent.includes('onInsertElement') || editorContent.includes('_insertElement'),
  '6.1 元素插入功能存在')

assert(editorContent.includes('_deleteElement'),
  '6.2 元素删除功能存在')

assert(editorContent.includes('_moveElement'),
  '6.3 元素移动功能存在')

console.log('')

// ============================================================================
// 7. 撤销/重做验证
// ============================================================================
console.log('【7】撤销/重做功能验证\n')

assert(editorContent.includes('doUndo'),
  '7.1 撤销功能存在')

assert(editorContent.includes('doRedo'),
  '7.2 重做功能存在')

console.log('')

// ============================================================================
// 8. 格式化验证
// ============================================================================
console.log('【8】格式化功能验证\n')

assert(editorContent.includes('doFormat'),
  '8.1 格式化功能存在')

assert(editorContent.includes('formateDM'),
  '8.2 formateDM() 方法存在')

console.log('')

// ============================================================================
// 9. 代码质量检查
// ============================================================================
console.log('【9】代码质量检查\n')

// 检查 console.log 数量（调试日志应该适量）
const consoleLogCount = (editorContent.match(/console\.log/g) || []).length
if (consoleLogCount > 0 && consoleLogCount < 100) {
  console.log(`✅ 9.1 调试日志数量合理 (${consoleLogCount}条)`)
  passed++
} else if (consoleLogCount === 0) {
  warn('9.1 无调试日志（可能影响调试）')
} else {
  warn(`9.1 调试日志过多 (${consoleLogCount}条)`)
}

// 检查 TODO/FIXME
const todoCount = (editorContent.match(/TODO|FIXME/gi) || []).length
if (todoCount === 0) {
  console.log('✅ 9.2 无待办事项标记')
  passed++
} else {
  warn(`9.2 存在 ${todoCount} 个待办事项标记`)
}

// 检查错误处理
const catchCount = (editorContent.match(/catch\s*\(/g) || []).length
if (catchCount >= 5) {
  console.log(`✅ 9.3 错误处理充分 (${catchCount}个 catch 块)`)
  passed++
} else {
  warn(`9.3 错误处理可能不足 (${catchCount}个 catch 块)`)
}

console.log('')

// ============================================================================
// 10. 历史版本功能检查
// ============================================================================
console.log('【10】历史版本功能检查\n')

const historyModalPath = path.join(BASE_DIR, 'src/views/ietm/ietmdatamodulemanagement/components/DmHistoryModal.vue')

if (fs.existsSync(historyModalPath)) {
  const historyContent = fs.readFileSync(historyModalPath, 'utf-8')

  assert(historyContent.includes('renderDiff') || historyContent.includes('MergeView'),
    '10.1 版本对比功能存在')

  assert(historyContent.includes('formatXml') || historyContent.includes('格式化'),
    '10.2 XML 格式化功能存在')

  assert(historyContent.includes('selectedRowKeys') || historyContent.includes('多选'),
    '10.3 版本多选功能存在')

  console.log('✅ 10.4 DmHistoryModal.vue 文件存在')
  passed++
} else {
  console.error(`❌ 历史版本弹框文件不存在: ${historyModalPath}`)
  failed += 4
}

console.log('')

// ============================================================================
// 汇总报告
// ============================================================================
console.log('================================================================================')
console.log('测试汇总')
console.log('================================================================================')
console.log(`✅ 通过: ${passed}`)
console.log(`❌ 失败: ${failed}`)
console.log(`⚠️  警告: ${warnings}`)
console.log(`总计: ${passed + failed}`)
console.log(`通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
console.log('================================================================================\n')

if (failed === 0) {
  console.log('🎉 所有关键功能验证通过！')
  process.exit(0)
} else {
  console.log(`⚠️  存在 ${failed} 个失败项，请检查代码`)
  process.exit(1)
}
