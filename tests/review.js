#!/usr/bin/env node
const fs = require('fs')

console.log('\n' + '='.repeat(80))
console.log('代码审查 - 检查错改和漏改')
console.log('='.repeat(80) + '\n')

const issues = []

// 检查1: formulaConverter.js
console.log('检查1: formulaConverter.js')
console.log('-'.repeat(80))

const formulaPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/formulaConverter.js'
const formulaContent = fs.readFileSync(formulaPath, 'utf8')

if (formulaContent.includes('function escapeXmlAttribute')) {
  console.log('✅ 转义函数已添加')
} else {
  issues.push({ file: 'formulaConverter.js', issue: '转义函数缺失' })
  console.log('❌ 转义函数缺失')
}

const hasEscape = formulaContent.match(/formulaHtmlToXmlSymbol[\s\S]{1,500}escapeXmlAttribute/)
if (hasEscape) {
  console.log('✅ 转义函数已应用')
} else {
  issues.push({ file: 'formulaConverter.js', issue: '转义函数未应用' })
  console.log('❌ 转义函数未应用')
}

// 检查2: figureConverter.js
console.log('\n检查2: figureConverter.js')
console.log('-'.repeat(80))

const figurePath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/figureConverter.js'
const figureContent = fs.readFileSync(figurePath, 'utf8')

const hasOldNamespaceLogic = figureContent.includes("if (figureXml.includes('xlink:') && !figureXml.includes('xmlns:xlink'))")
if (hasOldNamespaceLogic) {
  issues.push({ file: 'figureConverter.js', issue: 'namespace 预处理未移除' })
  console.log('❌ namespace 预处理未移除')
} else {
  console.log('✅ namespace 预处理已移除')
}

if (figureContent.includes('const xmlDoc = $.parseXML(figureXml)')) {
  console.log('✅ XML 解析逻辑存在')
} else {
  issues.push({ file: 'figureConverter.js', issue: 'XML 解析逻辑被误删' })
  console.log('❌ XML 解析逻辑缺失')
}

// 检查3: levelledParaConverterV2.js
console.log('\n检查3: levelledParaConverterV2.js')
console.log('-'.repeat(80))

const v2Path = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/levelledParaConverterV2.js'
const v2Content = fs.readFileSync(v2Path, 'utf8')

if (v2Content.includes('export function regenerateIds')) {
  console.log('✅ regenerateIds 已添加')
} else {
  issues.push({ file: 'levelledParaConverterV2.js', issue: 'regenerateIds 缺失' })
  console.log('❌ regenerateIds 缺失')
}

if (v2Content.match(/export default\s*{[^}]*regenerateIds/)) {
  console.log('✅ regenerateIds 在 export default')
} else {
  issues.push({ file: 'levelledParaConverterV2.js', issue: 'regenerateIds 未导出' })
  console.log('❌ regenerateIds 未导出')
}

// 检查4: Vue 组件
console.log('\n检查4: Vue 组件引用')
console.log('-'.repeat(80))

const designerPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue'
const designerContent = fs.readFileSync(designerPath, 'utf8')

if (designerContent.includes('levelledParaConverterV2') && designerContent.includes('regenerateIds')) {
  console.log('✅ LevelledParaDesigner.vue 已切换到 V2')
} else {
  issues.push({ file: 'LevelledParaDesigner.vue', issue: '未正确切换到 V2' })
  console.log('❌ LevelledParaDesigner.vue 未切换')
}

// 检查5: 旧版标记
console.log('\n检查5: 旧版废弃标记')
console.log('-'.repeat(80))

const oldPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/levelledParaConverter.js'
const oldContent = fs.readFileSync(oldPath, 'utf8')

if (oldContent.includes('DEPRECATED')) {
  console.log('✅ 旧版已标记 DEPRECATED')
} else {
  issues.push({ file: 'levelledParaConverter.js', issue: '未标记 DEPRECATED' })
  console.log('❌ 未标记 DEPRECATED')
}

// 总结
console.log('\n' + '='.repeat(80))
console.log('审查总结')
console.log('='.repeat(80) + '\n')

if (issues.length === 0) {
  console.log('✅ 未发现错改或漏改！所有修改正确完成。\n')
  process.exit(0)
} else {
  console.log(`⚠️  发现 ${issues.length} 个问题:\n`)
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.file}: ${issue.issue}`)
  })
  console.log()
  process.exit(1)
}
