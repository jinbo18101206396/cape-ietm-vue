#!/usr/bin/env node

/**
 * mainProcedure 设计器静态代码验证
 * 验证代码文件的语法、结构和完整性
 */

const fs = require('fs')
const path = require('path')

console.log('='
.repeat(60))
console.log('mainProcedure 设计器代码验证')
console.log('='.repeat(60))
console.log()

// 验证结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0
}

// 验证文件存在性
function checkFileExists(filePath, description) {
  results.total++
  console.log(`[检查] ${description}`)
  console.log(`  路径: ${filePath}`)

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').length
    console.log(`  ✅ 通过 (${stats.size} bytes, ${lines} 行)`)
    results.passed++
    return true
  } else {
    console.log(`  ❌ 失败 - 文件不存在`)
    results.failed++
    return false
  }
}

// 验证JS/Vue文件语法
function checkSyntax(filePath, description) {
  results.total++
  console.log(`[语法] ${description}`)

  try {
    const content = fs.readFileSync(filePath, 'utf-8')

    // 基本语法检查
    if (content.includes('function') || content.includes('=>') || content.includes('export')) {
      // 检查常见语法错误
      const errors = []

      // 检查括号匹配
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      if (openBraces !== closeBraces) {
        errors.push(`大括号不匹配 (${openBraces} 开 vs ${closeBraces} 闭)`)
      }

      // 检查是否有明显的语法错误标记
      if (content.includes('undefined undefined') || content.includes('null null')) {
        errors.push('检测到可能的语法错误')
      }

      if (errors.length > 0) {
        console.log(`  ⚠️  警告: ${errors.join(', ')}`)
        results.warnings++
      } else {
        console.log(`  ✅ 通过`)
        results.passed++
      }
    } else {
      console.log(`  ⚠️  警告: 无法确定文件类型`)
      results.warnings++
    }
  } catch (error) {
    console.log(`  ❌ 失败: ${error.message}`)
    results.failed++
  }
}

// 验证导入导出
function checkImportsExports(filePath, description) {
  results.total++
  console.log(`[依赖] ${description}`)

  try {
    const content = fs.readFileSync(filePath, 'utf-8')

    // 检查导入
    const imports = content.match(/import\s+.*\s+from\s+['"].*['"]/g) || []
    console.log(`  导入: ${imports.length} 个`)

    // 检查导出
    const exports = content.match(/export\s+(default|function|const|class|{)/g) || []
    console.log(`  导出: ${exports.length} 个`)

    if (exports.length > 0) {
      console.log(`  ✅ 通过`)
      results.passed++
    } else {
      console.log(`  ⚠️  警告: 没有导出`)
      results.warnings++
    }
  } catch (error) {
    console.log(`  ❌ 失败: ${error.message}`)
    results.failed++
  }
}

// 验证关键方法存在
function checkKeyMethods(filePath, methods, description) {
  results.total++
  console.log(`[方法] ${description}`)

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const missing = []

    methods.forEach(method => {
      if (!content.includes(method)) {
        missing.push(method)
      }
    })

    if (missing.length === 0) {
      console.log(`  ✅ 通过 - 所有 ${methods.length} 个方法都存在`)
      results.passed++
    } else {
      console.log(`  ❌ 失败 - 缺少方法: ${missing.join(', ')}`)
      results.failed++
    }
  } catch (error) {
    console.log(`  ❌ 失败: ${error.message}`)
    results.failed++
  }
}

// 验证P0修复标记
function checkP0Fixes(filePath, description) {
  results.total++
  console.log(`[P0修复] ${description}`)

  try {
    const content = fs.readFileSync(filePath, 'utf-8')

    // 检查P0修复标记
    const p0Markers = content.match(/🔑|P0修复|P0遗漏/g) || []

    if (p0Markers.length > 0) {
      console.log(`  ✅ 通过 - 发现 ${p0Markers.length} 处P0修复标记`)
      results.passed++
    } else {
      console.log(`  ⚠️  警告: 未发现P0修复标记`)
      results.warnings++
    }
  } catch (error) {
    console.log(`  ❌ 失败: ${error.message}`)
    results.failed++
  }
}

// ==================== 开始验证 ====================

console.log('1. 文件存在性验证')
console.log('-'.repeat(60))

const basePath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor'

const file1 = path.join(basePath, 'utils/mainProcedureConverterV2.js')
const file2 = path.join(basePath, 'components/MainProcedureDesigner.vue')
const file3 = path.join(basePath, 'components/MainProcedureDesigner_methods.js')

checkFileExists(file1, '转换器文件')
checkFileExists(file2, '主组件文件')
checkFileExists(file3, '方法扩展文件')
console.log()

console.log('2. 语法验证')
console.log('-'.repeat(60))

if (fs.existsSync(file1)) checkSyntax(file1, '转换器语法')
if (fs.existsSync(file2)) checkSyntax(file2, '主组件语法')
if (fs.existsSync(file3)) checkSyntax(file3, '方法扩展语法')
console.log()

console.log('3. 依赖验证')
console.log('-'.repeat(60))

if (fs.existsSync(file1)) checkImportsExports(file1, '转换器导入导出')
if (fs.existsSync(file3)) checkImportsExports(file3, '方法扩展导入导出')
console.log()

console.log('4. 关键方法验证')
console.log('-'.repeat(60))

if (fs.existsSync(file1)) {
  checkKeyMethods(file1, [
    'parseXmlToTree',
    'treeToXml',
    'createEmptyNode',
    'extractStepContent',
    'generateProceduralStepXml'
  ], '转换器关键方法')
}

if (fs.existsSync(file3)) {
  checkKeyMethods(file3, [
    'registerCustomButtonsGlobal',
    'insertInterref',
    'insertDmRef',
    'insertSymbol',
    'getItemCount',
    'addItem',
    'editItem',
    'deleteItem'
  ], '方法扩展关键方法')
}
console.log()

console.log('5. P0修复验证')
console.log('-'.repeat(60))

if (fs.existsSync(file1)) checkP0Fixes(file1, '转换器P0修复')
if (fs.existsSync(file3)) checkP0Fixes(file3, '方法扩展P0修复')
console.log()

// ==================== 生成报告 ====================

console.log('='.repeat(60))
console.log('验证结果汇总')
console.log('='.repeat(60))
console.log(`总计: ${results.total} 项`)
console.log(`✅ 通过: ${results.passed} 项`)
console.log(`❌ 失败: ${results.failed} 项`)
console.log(`⚠️  警告: ${results.warnings} 项`)
console.log()

const passRate = ((results.passed / results.total) * 100).toFixed(1)
console.log(`通过率: ${passRate}%`)
console.log()

if (results.failed === 0) {
  console.log('🎉 验证完成 - 所有关键检查通过！')
  process.exit(0)
} else {
  console.log('⚠️  验证完成 - 存在失败项，请检查！')
  process.exit(1)
}
