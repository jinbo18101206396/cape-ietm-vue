#!/usr/bin/env node
/**
 * 深度审计：重建 refs 功能的潜在缺陷排查
 * 检查边界条件、数据流、错误处理等深层问题
 */

const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const DM_EDITOR = path.join(PROJECT_ROOT, 'src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')
const NOTATIONS = path.join(PROJECT_ROOT, 'src/views/ietm/ietmdatamodulemanagement/editor/utils/notations.js')
const ICN_EXT = path.join(PROJECT_ROOT, 'src/views/ietm/ietmdatamodulemanagement/editor/utils/icnFileExt.js')

let issues = []
let warnings = []
let passed = 0

function checkIssue(condition, message, severity = 'error') {
  if (condition) {
    if (severity === 'error') {
      issues.push('❌ ' + message)
    } else {
      warnings.push('⚠️  ' + message)
    }
  } else {
    passed++
  }
}

console.log('================================================================================')
console.log('IETM 重建 refs 功能 - 深度缺陷审计')
console.log('================================================================================\n')

// ==================== 1. 读取源码 ====================
const dmEditorContent = fs.readFileSync(DM_EDITOR, 'utf-8')
const notationsContent = fs.readFileSync(NOTATIONS, 'utf-8')
const icnExtContent = fs.readFileSync(ICN_EXT, 'utf-8')

// ==================== 2. _torefs() 深度检查 ====================
console.log('【1】_torefs() 方法深度检查\n')

// 检查是否有 nodeList 为空的检测
const hasNodeListEmptyCheck = /if\s*\([^)]*!this\.nodeList[^)]*\|[^)]*this\.nodeList\.length\s*===\s*0/s.test(dmEditorContent)
checkIssue(!hasNodeListEmptyCheck, '1.1 缺少 nodeList 为空的检测', 'error')

// 检查是否抛出错误
const hasThrowError = /throw new Error/.test(dmEditorContent) && /XML.*解析.*失败|解析.*失败.*XML/i.test(dmEditorContent)
checkIssue(!hasThrowError, '1.2 XML 解析失败未抛出错误', 'error')

// 检查 brexDmRef 保留逻辑
const hasBrexDmRefExclude = /brexDmRef/.test(dmEditorContent) && /continue/.test(dmEditorContent)
checkIssue(!hasBrexDmRefExclude, '1.3 brexDmRef 排除逻辑可能缺失', 'warning')

// 检查是否有 refs 块已存在的处理
const hasExistingRefsHandling = /<refs>/.test(dmEditorContent)
checkIssue(!hasExistingRefsHandling, '1.4 缺少已有 <refs> 块的查找逻辑', 'warning')

// ==================== 3. _correctIcn() 深度检查 ====================
console.log('\n【2】_correctIcn() 方法深度检查\n')

// 检查大小写匹配实现
const hasCaseInsensitiveMatch = /toLowerCase\(\)\.startsWith\(.*toLowerCase\(\)/.test(dmEditorContent)
checkIssue(!hasCaseInsensitiveMatch, '2.1 ICN 大小写匹配未正确实现', 'error')

// 检查是否有空 icnlist 的警告
const hasIcnlistEmptyWarning = /icnlist\.length\s*===\s*0.*g_m\.length\s*>\s*0/.test(dmEditorContent)
checkIssue(!hasIcnlistEmptyWarning, '2.2 icnlist 为空时未给用户提示', 'error')

// 检查是否在匹配时添加了 '.' 分隔符（防止 ICN-001 匹配 ICN-001-backup.cgm）
const hasProperDotSeparator = /\.toLowerCase\(\)\s*\+\s*['"]\.['"]/.test(dmEditorContent)
checkIssue(!hasProperDotSeparator, '2.3 ICN 匹配可能匹配到错误文件（未用点分隔）', 'error')

// 检查是否有去重逻辑
const hasDeduplication = /_deduplicatePreserveOrder|new Set\(\)/.test(dmEditorContent)
checkIssue(!hasDeduplication, '2.4 缺少 ICN 去重逻辑', 'warning')

// 检查 Promise 处理
const hasPromiseResolveReject = /_icnSuffixResolve/.test(dmEditorContent) && /_icnSuffixReject/.test(dmEditorContent)
checkIssue(!hasPromiseResolveReject, '2.5 补后缀弹框的 Promise 处理可能缺失', 'error')

// ==================== 4. _updateDoctype() 深度检查 ====================
console.log('\n【3】_updateDoctype() 方法深度检查\n')

// 检查是否查找 <dmodule> 行
const findsDmoduleLine = /dmoduleLine/.test(dmEditorContent) && /<dmodule/.test(dmEditorContent)
checkIssue(!findsDmoduleLine, '3.1 未查找 <dmodule> 标签位置', 'error')

// 检查未找到 <dmodule> 的错误处理
const handlesMissingDmodule = /dmoduleLine\s*===\s*-1/.test(dmEditorContent)
checkIssue(!handlesMissingDmodule, '3.2 未处理找不到 <dmodule> 的情况', 'error')

// 检查 DOCTYPE 已存在的处理
const handlesDoctypeExists = /doctypeLineFound/.test(dmEditorContent) && /doctypeEndLine/.test(dmEditorContent)
checkIssue(!handlesDoctypeExists, '3.3 DOCTYPE 替换逻辑可能不完整', 'error')

// 检查是否查找 ]> 结束符
const findsDocTypeEnd = /\]>/.test(dmEditorContent)
checkIssue(!findsDocTypeEnd, '3.4 未查找 DOCTYPE 的 ]> 结束符', 'error')

// 检查是否保证 DOCTYPE 后有换行（避免与 <dmodule> 粘连）
const ensuresNewline = /doctypeWithNewline|newdoctype.*\\n/.test(dmEditorContent)
checkIssue(!ensuresNewline, '3.5 DOCTYPE 后可能缺少换行符', 'error')

// 检查 replaceRange 调用
const hasReplaceRange = /replaceRange/.test(dmEditorContent)
checkIssue(!hasReplaceRange, '3.6 未使用 replaceRange 替换 DOCTYPE', 'error')

// 检查格式化调用
const callsFormateDM = /formateDM\(\)/.test(dmEditorContent)
checkIssue(!callsFormateDM, '3.7 未调用 formateDM 格式化文档', 'error')

// 检查树刷新调用
const callsRefreshTree = /refreshTree\(\)/.test(dmEditorContent)
checkIssue(!callsRefreshTree, '3.8 未调用 refreshTree 刷新导航树', 'error')

// ==================== 5. 数据流检查 ====================
console.log('\n【4】数据流完整性检查\n')

// 检查 icnlist 初始化
const hasIcnlistInit = /this\.icnlist\s*=\s*\[\]/.test(dmEditorContent)
checkIssue(!hasIcnlistInit, '4.1 icnlist 未初始化', 'error')

// 检查 icnlist 从 XML 解析
const parsesIcnlistFromXml = /_parseIcnlistFromXml/.test(dmEditorContent) && /<!ENTITY/.test(dmEditorContent)
checkIssue(!parsesIcnlistFromXml, '4.2 未从 XML 解析 icnlist', 'error')

// 检查 icnlist 在 DM 加载时调用
const callsParseOnLoad = /_parseIcnlistFromXml/.test(dmEditorContent)
checkIssue(!callsParseOnLoad, '4.3 DM 加载时未解析 icnlist', 'warning')

// 检查 entities 去重
const hasEntitiesDedup = /seen\s*=\s*new Set\(\)/.test(dmEditorContent)
checkIssue(!hasEntitiesDedup, '4.4 ENTITY 声明未去重', 'warning')

// 检查 g_m_withseq 顺序保证
const hasSequencePreservation = /g_m_withseq/.test(dmEditorContent)
checkIssue(!hasSequencePreservation, '4.5 ICN 顺序保证逻辑可能缺失', 'warning')

// ==================== 6. 组件依赖检查 ====================
console.log('\n【5】组件依赖完整性检查\n')

// 检查 $refs.editor 存在性检测
const checksEditorRef = /this\.\$refs\.editor/.test(dmEditorContent)
checkIssue(!checksEditorRef, '5.1 未使用 $refs.editor', 'error')

// 检查 $refs.icnSuffixModal 存在性检测
const checksIcnModalRef = /this\.\$refs\.icnSuffixModal/.test(dmEditorContent)
checkIssue(!checksIcnModalRef, '5.2 未使用 $refs.icnSuffixModal', 'error')

// 检查模板中是否注册了 icnSuffixModal
const hasIcnModalInTemplate = /<icn-suffix-modal\s+ref=["']icnSuffixModal["']/.test(dmEditorContent)
checkIssue(!hasIcnModalInTemplate, '5.3 模板中未注册 icnSuffixModal', 'error')

// 检查是否导入了 IcnSuffixModal 组件
const importsIcnModal = /IcnSuffixModal|icn-suffix-modal/.test(dmEditorContent)
checkIssue(!importsIcnModal, '5.4 未导入 IcnSuffixModal 组件', 'warning')

// ==================== 7. NOTATIONS 表检查 ====================
console.log('\n【6】NOTATIONS 映射表检查\n')

// 检查是否导出
const exportsNotations = /export\s+(const|let|var)\s+NOTATIONS/.test(notationsContent)
checkIssue(!exportsNotations, '6.1 NOTATIONS 未正确导出', 'error')

// 检查 webm 和 ogg 格式
const hasWebm = /'webm'\s*:/.test(notationsContent)
const hasOgg = /'ogg'\s*:/.test(notationsContent)
checkIssue(!hasWebm, '6.2 缺少 webm 格式', 'error')
checkIssue(!hasOgg, '6.3 缺少 ogg 格式', 'error')

// 检查辅助函数
const hasHasNotation = /export\s+function\s+hasNotation/.test(notationsContent)
const hasGetNotation = /export\s+function\s+getNotation/.test(notationsContent)
checkIssue(!hasHasNotation, '6.4 缺少 hasNotation() 函数', 'warning')
checkIssue(!hasGetNotation, '6.5 缺少 getNotation() 函数', 'warning')

// ==================== 8. ICN 白名单检查 ====================
console.log('\n【7】ICN 文件后缀白名单检查\n')

// 检查是否导出
const exportsIcnExt = /export\s+(const|let|var)\s+ICN_FILE_EXT/.test(icnExtContent)
checkIssue(!exportsIcnExt, '7.1 ICN_FILE_EXT 未正确导出', 'error')

// 检查关键格式
const hasCgm = /['"]\.cgm['"]/.test(icnExtContent)
const hasSvg = /['"]\.svg['"]/.test(icnExtContent)
const hasPng = /['"]\.png['"]/.test(icnExtContent)
const hasMp4 = /['"]\.mp4['"]/.test(icnExtContent)
checkIssue(!hasCgm, '7.2 ICN 白名单缺少 .cgm', 'error')
checkIssue(!hasSvg, '7.3 ICN 白名单缺少 .svg', 'error')
checkIssue(!hasPng, '7.4 ICN 白名单缺少 .png', 'error')
checkIssue(!hasMp4, '7.5 ICN 白名单缺少 .mp4', 'error')

// 检查辅助函数
const hasIsValidIcnExt = /export\s+function\s+isValidIcnExt/.test(icnExtContent)
const hasNormalizeExt = /export\s+function\s+normalizeExt/.test(icnExtContent)
checkIssue(!hasIsValidIcnExt, '7.6 缺少 isValidIcnExt() 函数', 'warning')
checkIssue(!hasNormalizeExt, '7.7 缺少 normalizeExt() 函数', 'warning')

// ==================== 9. 边界条件检查 ====================
console.log('\n【8】边界条件处理检查\n')

// 空 XML 文档
const handlesEmptyXml = /content.*trim\(\)/.test(dmEditorContent) || /xml.*length/.test(dmEditorContent)
checkIssue(!handlesEmptyXml, '8.1 未处理空 XML 文档', 'warning')

// 没有图形元素的情况
const handlesNoGraphics = /g_m\.length\s*===\s*0/.test(dmEditorContent) || /entities\.length\s*===\s*0/.test(dmEditorContent)
checkIssue(!handlesNoGraphics, '8.2 未处理没有图形元素的情况', 'warning')

// DOCTYPE 不存在的情况
const handlesNoDoctypeCase = /else\s*{[^}]*插入新DOCTYPE|doctypeLineFound\s*===\s*-1[^}]*插入/.test(dmEditorContent)
checkIssue(!handlesNoDoctypeCase, '8.3 未处理 DOCTYPE 不存在的情况', 'error')

// ==================== 10. 潜在 Bug 检查 ====================
console.log('\n【9】潜在 Bug 排查\n')

// 检查是否有 linenoOffset 计算
const hasLinenoOffset = /linenoOffset|getLinenoOffset/.test(dmEditorContent)
checkIssue(!hasLinenoOffset, '9.1 未计算 linenoOffset', 'warning')

// 检查是否在替换后重新计算 linenoOffset
const recalcsLinenoOffset = /formateDM.*linenoOffset|linenoOffset.*formateDM/.test(dmEditorContent)
checkIssue(!recalcsLinenoOffset, '9.2 替换后未重新计算 linenoOffset', 'warning')

// 检查是否有防止重复调用的保护
const hasReentranceProtection = /this\._regenRefsRunning/.test(dmEditorContent) || /isProcessing/.test(dmEditorContent)
checkIssue(!hasReentranceProtection, '9.3 缺少重入保护（防止重复调用）', 'warning')

// 检查弹框取消时是否 reject Promise
const rejectsOnCancel = /onIcnSuffixCancel/.test(dmEditorContent) && /_icnSuffixReject/.test(dmEditorContent)
checkIssue(!rejectsOnCancel, '9.4 弹框取消时未 reject Promise', 'error')

// 检查是否清理 Promise 回调
const cleansUpCallbacks = /_icnSuffixResolve\s*=\s*null/.test(dmEditorContent) || /delete\s+this\._icnSuffixResolve/.test(dmEditorContent)
checkIssue(!cleansUpCallbacks, '9.5 未清理 Promise 回调（潜在内存泄漏）', 'warning')

// ==================== 输出结果 ====================
console.log('\n================================================================================')
console.log('审计结果汇总')
console.log('================================================================================\n')

if (issues.length > 0) {
  console.log('【严重问题】\n')
  issues.forEach(issue => console.log(issue))
  console.log()
}

if (warnings.length > 0) {
  console.log('【警告】\n')
  warnings.forEach(warning => console.log(warning))
  console.log()
}

console.log(`✅ 通过: ${passed}`)
console.log(`❌ 严重问题: ${issues.length}`)
console.log(`⚠️  警告: ${warnings.length}`)
console.log(`总计: ${passed + issues.length + warnings.length}`)

const total = passed + issues.length + warnings.length
const passRate = ((passed / total) * 100).toFixed(1)
console.log(`通过率: ${passRate}%`)
console.log('================================================================================\n')

if (issues.length > 0) {
  console.log('⚠️  发现严重问题，需要立即修复')
  process.exit(1)
} else if (warnings.length > 0) {
  console.log('✅ 无严重问题，但有警告需要关注')
  process.exit(0)
} else {
  console.log('✅ 所有检查通过')
  process.exit(0)
}
