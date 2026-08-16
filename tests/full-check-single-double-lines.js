#!/usr/bin/env node
// 全面排查单行/双行元素相关问题

const fs = require('fs')
const path = require('path')

console.log('🔍 全面排查单行/双行元素相关问题\n')
console.log('='.repeat(70))

const baseDir = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor'

// 需要检查的文件
const filesToCheck = [
  'utils/elementOps.js',
  'utils/xmlTree.js',
  'components/DmSourceView.vue',
  'DmContentEditor.vue'
]

const issues = []
let totalChecks = 0

function checkFile(filePath) {
  console.log(`\n📄 检查: ${path.basename(filePath)}`)
  console.log('-'.repeat(70))

  const code = fs.readFileSync(path.join(baseDir, filePath), 'utf8')

  // 1. 检查所有使用 lineno 的地方
  const linenoUsages = code.match(/\.lineno|lineno\s*===|lineno\s*==/g) || []
  console.log(`\n发现 ${linenoUsages.length} 处 lineno 使用`)

  // 2. 检查所有行号计算
  const lineCalculations = code.match(/line\s*[+\-]\s*\d+|lineno\s*[+\-]\s*\d+/g) || []
  console.log(`发现 ${lineCalculations.length} 处行号计算`)

  // 3. 检查闭合标签相关处理
  const closeTags = code.match(/<\/[\w]+>|closeTag|closingTag|endTag/g) || []
  console.log(`发现 ${closeTags.length} 处闭合标签相关代码`)

  return { linenoUsages: linenoUsages.length, lineCalculations: lineCalculations.length, closeTags: closeTags.length }
}

// 检查所有文件
const results = {}
filesToCheck.forEach(file => {
  results[file] = checkFile(file)
})

console.log('\n' + '='.repeat(70))
console.log('📊 统计汇总')
console.log('='.repeat(70))

for (const [file, stats] of Object.entries(results)) {
  console.log(`\n${file}:`)
  console.log(`  lineno使用: ${stats.linenoUsages}`)
  console.log(`  行号计算: ${stats.lineCalculations}`)
  console.log(`  闭合标签: ${stats.closeTags}`)
}

console.log('\n' + '='.repeat(70))
console.log('🔍 深度分析')
console.log('='.repeat(70))

// 深度检查每个关键函数
const opsPath = path.join(baseDir, 'utils/elementOps.js')
const opsCode = fs.readFileSync(opsPath, 'utf8')

const functionsToCheck = [
  'calculateInsertLine',
  'isMultiLineElement',
  'canDeleteElement',
  'deleteLine',
  'deleteThisAndChildren',
  'moveElementBlock'
]

console.log('\n📋 关键函数分析:')

functionsToCheck.forEach(funcName => {
  const regex = new RegExp(`(export )?function ${funcName}[\\s\\S]*?(?=\\nexport function|\\n\\/\\*\\*|$)`, 'm')
  const match = opsCode.match(regex)

  if (match) {
    const funcCode = match[0]
    const hasCloseTagHandling = funcCode.includes('</') || funcCode.includes('closeTag') || funcCode.includes('endTag')
    const hasMultiLineCheck = funcCode.includes('多行') || funcCode.includes('multiLine') || funcCode.includes('isMultiLine')
    const hasLinenoOffset = funcCode.includes('linenoOffset')

    console.log(`\n  ${funcName}:`)
    console.log(`    闭合标签处理: ${hasCloseTagHandling ? '✅' : '⚠️'}`)
    console.log(`    多行检查: ${hasMultiLineCheck ? '✅' : '⚠️'}`)
    console.log(`    linenoOffset: ${hasLinenoOffset ? '✅' : '⚠️'}`)

    if (!hasCloseTagHandling) {
      issues.push(`${funcName}: 缺少闭合标签处理`)
    }
  } else {
    console.log(`\n  ${funcName}: ❌ 未找到`)
    issues.push(`${funcName}: 函数未找到`)
  }
})

console.log('\n' + '='.repeat(70))
console.log('🎯 潜在问题点')
console.log('='.repeat(70))

// 检查具体问题
const problemPatterns = [
  {
    name: 'node.attributes.line (应该是lineno)',
    pattern: /node\.attributes\.line(?!no)/g,
    files: ['utils/elementOps.js', 'DmContentEditor.vue']
  },
  {
    name: '未考虑闭合标签的行号查找',
    pattern: /getLine\(.*\).*includes.*<\//g,
    files: ['utils/elementOps.js']
  },
  {
    name: '硬编码的行数偏移',
    pattern: /line\s*[+\-]\s*1(?!\d)/g,
    files: ['utils/elementOps.js']
  }
]

console.log()
problemPatterns.forEach(({ name, pattern, files }) => {
  console.log(`\n检查: ${name}`)
  files.forEach(file => {
    const fullPath = path.join(baseDir, file)
    const code = fs.readFileSync(fullPath, 'utf8')
    const matches = code.match(pattern)
    if (matches && matches.length > 0) {
      console.log(`  ⚠️  ${file}: 发现 ${matches.length} 处`)
      issues.push(`${file}: ${name} (${matches.length}处)`)
    } else {
      console.log(`  ✅ ${file}: 未发现问题`)
    }
  })
})

console.log('\n' + '='.repeat(70))
console.log('📝 需要修复的具体问题')
console.log('='.repeat(70))

if (issues.length === 0) {
  console.log('\n✅ 未发现明显问题！')
} else {
  console.log()
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue}`)
  })
}

console.log('\n' + '='.repeat(70))
console.log('💡 排查建议')
console.log('='.repeat(70))
console.log(`
应该重点关注的场景:

1. 插入元素 (calculateInsertLine)
   - 需要考虑父元素是单行还是双行
   - 插入到闭合标签之前还是之后

2. 删除元素 (deleteLine / deleteThisAndChildren)
   - 单行元素：删除一行
   - 双行元素：需要删除从开始标签到闭合标签的所有行

3. 移动元素 (moveElementBlock)
   - 需要正确计算元素的起止行
   - 双行元素要找到闭合标签

4. 判断多行 (isMultiLineElement)
   - 这是核心判断函数
   - 必须准确识别单行/双行

5. 光标定位 (locateNode)
   - 已修复：支持闭合标签行

6. 属性设置 (setProperty)
   - 需要确保在开始标签上设置属性
   - 不能在闭合标签上设置
`)

process.exit(issues.length > 0 ? 1 : 0)
