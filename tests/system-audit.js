#!/usr/bin/env node
/**
 * system-audit.js
 * 系统性排查类似问题
 */

const fs = require('fs')
const path = require('path')

console.log('\n' + '='.repeat(80))
console.log('系统性排查 - 查找类似问题')
console.log('='.repeat(80) + '\n')

const issues = []

// ============================================
// 排查1：查找其他 XML 处理文件
// ============================================

console.log('排查1: 查找其他 XML 转换器文件')
console.log('-'.repeat(80))

const searchPaths = [
  'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils',
  'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components'
]

const xmlFiles = []

function findFiles(dir, pattern) {
  try {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        findFiles(fullPath, pattern)
      } else if (pattern.test(file)) {
        xmlFiles.push(fullPath)
      }
    })
  } catch (e) {
    // 目录不存在或无权限
  }
}

searchPaths.forEach(p => findFiles(p, /converter|xml|serialize|parse/i))

console.log(`发现 ${xmlFiles.length} 个 XML 处理相关文件:\n`)
xmlFiles.forEach(f => console.log(`  - ${path.basename(f)}`))

// ============================================
// 排查2：检查每个文件的问题
// ============================================

console.log('\n排查2: 检查潜在问题')
console.log('-'.repeat(80))

xmlFiles.forEach(filePath => {
  const fileName = path.basename(filePath)
  const content = fs.readFileSync(filePath, 'utf8')
  
  // 问题1: 属性值未转义
  const attrRegex = /attr\.(name|value)|getAttribute|setAttribute/i
  const hasAttrHandling = attrRegex.test(content)
  const hasEscapeFunc = content.includes('escapeXml') || content.includes('escape')
  
  if (hasAttrHandling && !hasEscapeFunc) {
    issues.push({
      file: fileName,
      type: '属性转义缺失',
      severity: 'P1',
      description: '文件中处理 XML 属性但可能缺少转义'
    })
  }
  
  // 问题2: XMLSerializer 使用
  if (content.includes('XMLSerializer') && content.includes('serializeToString')) {
    const hasDoubleSerialize = (content.match(/serializeToString/g) || []).length > 3
    if (hasDoubleSerialize) {
      issues.push({
        file: fileName,
        type: '可能的双重序列化',
        severity: 'P2',
        description: '多次使用 serializeToString，可能导致双重序列化'
      })
    }
  }
  
  // 问题3: namespace 声明
  const nsCount = (content.match(/xmlns:xlink/g) || []).length
  if (nsCount > 2) {
    issues.push({
      file: fileName,
      type: 'Namespace 冗余',
      severity: 'P3',
      description: `发现 ${nsCount} 处 namespace 声明，可能冗余`
    })
  }
  
  // 问题4: 正则表达式替换 XML
  if (content.includes('.replace(') && content.includes('xmlns:')) {
    const replaceCount = (content.match(/\.replace\([^)]*xmlns:/g) || []).length
    if (replaceCount > 0) {
      issues.push({
        file: fileName,
        type: '正则表达式处理 namespace',
        severity: 'P2',
        description: '使用正则表达式处理 namespace，可能不安全'
      })
    }
  }
})

// ============================================
// 排查3: 特定模式检查
// ============================================

console.log('\n排查3: 特定反模式检查')
console.log('-'.repeat(80))

const patterns = [
  { name: '未转义的属性拼接', regex: /="\$\{[^}]+\}"(?!.*escape)/i, severity: 'P1' },
  { name: '直接字符串拼接 XML', regex: /<[a-z]+[^>]*="\$\{/i, severity: 'P1' },
  { name: '多次解析同一 XML', regex: /parseFromString.*parseFromString/s, severity: 'P2' }
]

xmlFiles.forEach(filePath => {
  const fileName = path.basename(filePath)
  const content = fs.readFileSync(filePath, 'utf8')
  
  patterns.forEach(pattern => {
    if (pattern.regex.test(content)) {
      issues.push({
        file: fileName,
        type: pattern.name,
        severity: pattern.severity,
        description: `检测到反模式: ${pattern.name}`
      })
    }
  })
})

// ============================================
// 排查结果汇总
// ============================================

console.log('\n' + '='.repeat(80))
console.log('排查结果汇总')
console.log('='.repeat(80) + '\n')

if (issues.length === 0) {
  console.log('✅ 未发现其他类似问题\n')
  process.exit(0)
}

// 按严重程度分组
const byLevel = { P1: [], P2: [], P3: [] }
issues.forEach(issue => {
  byLevel[issue.severity].push(issue)
})

console.log(`发现 ${issues.length} 个潜在问题:\n`)

Object.keys(byLevel).forEach(level => {
  if (byLevel[level].length > 0) {
    console.log(`${level} 问题 (${byLevel[level].length} 个):`)
    byLevel[level].forEach(issue => {
      console.log(`  ⚠️  ${issue.file}`)
      console.log(`     类型: ${issue.type}`)
      console.log(`     说明: ${issue.description}\n`)
    })
  }
})

console.log('建议: 对发现的问题进行详细审查\n')

process.exit(0)
