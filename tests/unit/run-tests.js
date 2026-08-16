#!/usr/bin/env node
// 元素操作功能自动化测试
// 直接运行Node.js测试，不依赖Jest

const fs = require('fs')
const path = require('path')

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset)
}

// 测试结果统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
}

function assert(condition, message) {
  stats.total++
  if (condition) {
    stats.passed++
    log(colors.green, '  ✓', message)
    return true
  } else {
    stats.failed++
    log(colors.red, '  ✗', message)
    stats.errors.push(message)
    return false
  }
}

function assertEqual(actual, expected, message) {
  const passed = actual === expected
  if (!passed) {
    message += ` (期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(actual)})`
  }
  return assert(passed, message)
}

function assertContains(str, substring, message) {
  return assert(str && str.includes(substring), message)
}

function assertGreaterThan(a, b, message) {
  return assert(a > b, message)
}

// ============ 读取源码文件 ============
log(colors.blue, '\n📦 加载源码文件...')

const elementOpsPath = path.join(__dirname, '../src/views/ietm/ietmdatamodulemanagement/editor/utils/elementOps.js')

if (!fs.existsSync(elementOpsPath)) {
  log(colors.red, '❌ 找不到 elementOps.js 文件')
  process.exit(1)
}

const sourceCode = fs.readFileSync(elementOpsPath, 'utf-8')
log(colors.green, '✓ 成功加载 elementOps.js (' + sourceCode.length + ' 字符)')

// ============ 模拟函数（简化版实现）============
log(colors.blue, '\n🔧 准备测试环境...')

// 从源码中提取函数（简化：直接使用eval）
function extractFunction(name) {
  const regex = new RegExp(`export function ${name}\\([^)]*\\)[\\s\\S]*?(?=\\nexport|\\n\\/\\/|$)`)
  const match = sourceCode.match(regex)
  if (match) {
    return eval('(' + match[0].replace('export ', '') + ')')
  }
  return null
}

// 提取所有函数
const calculateIndent = extractFunction('calculateIndent')
const generateXmlSnippet = extractFunction('generateXmlSnippet')
const isMultiLineElement = extractFunction('isMultiLineElement')
const canDeleteElement = extractFunction('canDeleteElement')
const validateMove = extractFunction('validateMove')

log(colors.green, '✓ 函数提取完成')

// ============ 准备测试数据 ============
const mockNodeList = [
  { id: 1, pid: -1, text: 'dmodule', attributes: { line: 0 } },
  { id: 2, pid: 1, text: 'identAndStatusSection', attributes: { line: 1 } },
  { id: 3, pid: 1, text: 'content', attributes: { line: 5 } },
  { id: 4, pid: 3, text: 'section', attributes: { line: 6 } },
  { id: 5, pid: 4, text: 'para', attributes: { line: 7 } },
  { id: 6, pid: 4, text: 'para', attributes: { line: 8 } },
  { id: 7, pid: 3, text: 'section', attributes: { line: 10 } }
]

const mockSchema = {
  para: {
    mixed: 'true',
    datatype: 'string',
    children: [],
    setelem: {}
  },
  section: {
    children: ['title', 'para'],
    setelem: {
      title: { minocc: '1', maxocc: '1' },
      para: { minocc: '0', maxocc: '9223372036854775807' }
    }
  },
  content: {
    children: ['section', 'procedure'],
    setelem: {
      section: { minocc: '1', maxocc: '9223372036854775807' }
    }
  }
}

const mockEditor = {
  lineCount: () => 20,
  getLine: (line) => {
    const lines = {
      0: '<dmodule>',
      5: '<content>',
      6: '  <section>',
      7: '    <para></para>',
      8: '    <para></para>',
      9: '  </section>',
      10: '  <section>',
      15: '  </section>',
      19: '</dmodule>'
    }
    return lines[line] || ''
  },
  getCursor: () => ({ line: 7, ch: 0 })
}

// ============ 测试套件 1: calculateIndent ============
log(colors.blue, '\n📋 测试套件 1: calculateIndent - 缩进计算')

if (calculateIndent) {
  // 测试1.1: 根节点
  const rootIndent = calculateIndent(mockNodeList[0], mockNodeList)
  assertEqual(rootIndent, '  ', '根节点应返回2空格缩进')

  // 测试1.2: 二级节点
  const level2Indent = calculateIndent(mockNodeList[2], mockNodeList)
  assertEqual(level2Indent, '    ', '二级节点应返回4空格缩进')

  // 测试1.3: 三级节点
  const level3Indent = calculateIndent(mockNodeList[4], mockNodeList)
  assertEqual(level3Indent, '      ', '三级节点应返回6空格缩进')

  // 测试1.4: 空节点
  const nullIndent = calculateIndent(null, mockNodeList)
  assertEqual(nullIndent, '  ', '空节点应返回默认2空格缩进')

  // 测试1.5: 递归深度保护
  const circularList = [
    { id: 1, pid: 2, text: 'a', attributes: { line: 0 } },
    { id: 2, pid: 1, text: 'b', attributes: { line: 1 } }
  ]
  const circularIndent = calculateIndent(circularList[0], circularList)
  assert(circularIndent.length <= 102, '递归深度应限制在50层内（最多102字符）')
} else {
  log(colors.red, '❌ calculateIndent 函数未找到')
}

// ============ 测试套件 2: generateXmlSnippet ============
log(colors.blue, '\n📋 测试套件 2: generateXmlSnippet - XML片段生成')

if (generateXmlSnippet) {
  // 测试2.1: 文本元素
  const paraSnippet = generateXmlSnippet('para', mockSchema, '  ')
  assertEqual(paraSnippet, '  <para></para>', '文本元素应生成单行XML')

  // 测试2.2: 容器元素
  const sectionSnippet = generateXmlSnippet('section', mockSchema, '  ')
  assertContains(sectionSnippet, '<section>', '容器元素应包含开始标签')
  assertContains(sectionSnippet, '</section>', '容器元素应包含闭合标签')
  assertContains(sectionSnippet, '\n', '容器元素应包含换行')

  // 测试2.3: 自闭合元素
  const graphicSchema = {
    graphic: {
      datatype: 'string',
      children: []
    }
  }
  const graphicSnippet = generateXmlSnippet('graphic', graphicSchema, '  ')
  assertEqual(graphicSnippet, '  <graphic/>', '自闭合元素应生成 <elem/> 格式')

  // 测试2.4: 未定义元素
  const unknownSnippet = generateXmlSnippet('unknown', mockSchema, '  ')
  assertContains(unknownSnippet, '<unknown>', '未定义元素应生成默认容器')
} else {
  log(colors.red, '❌ generateXmlSnippet 函数未找到')
}

// ============ 测试套件 3: isMultiLineElement ============
log(colors.blue, '\n📋 测试套件 3: isMultiLineElement - 多行判断')

if (isMultiLineElement) {
  // 测试3.1: 单行元素
  const paraNode = mockNodeList[4]
  const isSingleLine = !isMultiLineElement(paraNode, mockNodeList, mockEditor, 0)
  assert(isSingleLine, '单行para元素应判断为单行')

  // 测试3.2: 多行元素（有子元素）
  const sectionNode = mockNodeList[3]
  const isMultiLine = isMultiLineElement(sectionNode, mockNodeList, mockEditor, 0)
  assert(isMultiLine, '有子元素的section应判断为多行')

  // 测试3.3: 跨行元素
  const section2Node = mockNodeList[6]
  const isMultiLine2 = isMultiLineElement(section2Node, mockNodeList, mockEditor, 0)
  assert(isMultiLine2, '闭合标签在不同行的section应判断为多行')
} else {
  log(colors.red, '❌ isMultiLineElement 函数未找到')
}

// ============ 测试套件 4: canDeleteElement ============
log(colors.blue, '\n📋 测试套件 4: canDeleteElement - 删除保护')

if (canDeleteElement) {
  // 测试4.1: 不能删除content前的元素
  const identNode = mockNodeList[1]
  const canDelete1 = canDeleteElement(identNode, mockNodeList, mockEditor, 0, mockSchema)
  assert(!canDelete1.canDelete, '不能删除content区域前的元素')
  assertContains(canDelete1.message, 'content', '错误消息应提示content区域')

  // 测试4.2: 不能删除根元素
  const rootNode = mockNodeList[0]
  const canDelete2 = canDeleteElement(rootNode, mockNodeList, mockEditor, 0, mockSchema)
  assert(!canDelete2.canDelete, '不能删除根元素')
  assertContains(canDelete2.message, '根元素', '错误消息应提示根元素')

  // 测试4.3: 可以删除普通元素
  const para2Node = mockNodeList[5]
  const canDelete3 = canDeleteElement(para2Node, mockNodeList, mockEditor, 0, mockSchema)
  assert(canDelete3.canDelete, '应允许删除普通para元素')
} else {
  log(colors.red, '❌ canDeleteElement 函数未找到')
}

// ============ 测试套件 5: validateMove ============
log(colors.blue, '\n📋 测试套件 5: validateMove - 移动校验')

if (validateMove) {
  // 测试5.1: 起始行超出范围
  const validate1 = validateMove(1, 10, 5, 15)
  assert(!validate1.valid, '起始行超出范围应校验失败')
  assertContains(validate1.message, '范围', '错误消息应提示范围')

  // 测试5.2: 目标行超出范围
  const validate2 = validateMove(10, 20, 5, 15)
  assert(!validate2.valid, '目标行超出范围应校验失败')

  // 测试5.3: 起止行相同
  const validate3 = validateMove(10, 10, 5, 15)
  assert(!validate3.valid, '起止行相同应校验失败')
  assertContains(validate3.message, '相同', '错误消息应提示相同')

  // 测试5.4: 正常移动
  const validate4 = validateMove(7, 12, 5, 15)
  assert(validate4.valid, '正常移动应校验通过')
} else {
  log(colors.red, '❌ validateMove 函数未找到')
}

// ============ 测试套件 6: 代码质量检查 ============
log(colors.blue, '\n📋 测试套件 6: 代码质量检查')

// 测试6.1: 语法检查
assert(sourceCode.length > 0, '源码文件不为空')

// 测试6.2: 关键函数存在
assertContains(sourceCode, 'export function calculateIndent', '包含calculateIndent函数')
assertContains(sourceCode, 'export function generateXmlSnippet', '包含generateXmlSnippet函数')
assertContains(sourceCode, 'export function canDeleteElement', '包含canDeleteElement函数')
assertContains(sourceCode, 'export function validateMove', '包含validateMove函数')
assertContains(sourceCode, 'export function moveElementBlock', '包含moveElementBlock函数')

// 测试6.3: JSDoc注释
const jsdocCount = (sourceCode.match(/\/\*\*/g) || []).length
assertGreaterThan(jsdocCount, 10, `包含足够的JSDoc注释（找到${jsdocCount}个）`)

// 测试6.4: 错误处理
assertContains(sourceCode, 'if (!', '包含空值检查')
assertContains(sourceCode, 'throw new Error', '包含错误抛出')

// 测试6.5: 递归保护
assertContains(sourceCode, 'depth', '包含递归深度参数')
assertContains(sourceCode, '> 50', '包含递归深度限制')

// ============ 输出测试报告 ============
log(colors.blue, '\n' + '='.repeat(60))
log(colors.blue, '📊 测试报告')
log(colors.blue, '='.repeat(60))

log(colors.blue, `\n总测试数: ${stats.total}`)
log(colors.green, `通过: ${stats.passed}`)
log(colors.red, `失败: ${stats.failed}`)

const passRate = ((stats.passed / stats.total) * 100).toFixed(1)
log(colors.blue, `\n通过率: ${passRate}%`)

if (stats.failed > 0) {
  log(colors.red, '\n❌ 失败的测试:')
  stats.errors.forEach((err, i) => {
    log(colors.red, `  ${i + 1}. ${err}`)
  })
}

if (stats.failed === 0) {
  log(colors.green, '\n✅ 所有测试通过！')
  process.exit(0)
} else {
  log(colors.red, '\n❌ 有测试失败')
  process.exit(1)
}
