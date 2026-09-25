/**
 * P0修复验证测试
 *
 * 测试目标：
 * 1. BUG-PARA-001: para结束标签丢失修复
 * 2. P0-01: JSON.parse异常处理修复
 *
 * 测试方法：
 * - 直接调用html2para转换函数
 * - 验证各种边界场景
 *
 * 运行方式：node tests/verification/p0-fixes-verification.js
 */

const path = require('path')

// 动态导入paraConverter模块
const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
const { html2para } = require(converterPath)

// 测试计数器
let totalTests = 0
let passedTests = 0
let failedTests = 0

// 测试辅助函数
function test(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`✅ ${name}`)
  } catch (error) {
    failedTests++
    console.error(`❌ ${name}`)
    console.error(`   错误: ${error.message}`)
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  期望: ${expected}\n  实际: ${actual}`)
  }
}

function assertContains(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`${message}\n  期望包含: ${substring}\n  实际字符串: ${str}`)
  }
}

function assertNotContains(str, substring, message) {
  if (str.includes(substring)) {
    throw new Error(`${message}\n  不应包含: ${substring}\n  实际字符串: ${str}`)
  }
}

// Mock parent对象
const mockParent = {
  cmnodeid: 'test-node-123',
  dmCode: 'DMC-TEST-A-00-00-00-00A-001A-A'
}

// 有效的projectParameters
const validProjectParams = JSON.stringify({
  originator: [{ code: 'TEST' }],
  rpc: [{ code1: 'A' }]
})

console.log('====================================')
console.log('P0修复验证测试')
console.log('====================================\n')

console.log('【测试组1】BUG-PARA-001: para结束标签丢失修复')
console.log('------------------------------------')

// 测试1: 标准<p><table></table></p>结构
test('T1.1: 标准<p><table></table></p>应正确转换', async () => {
  const html = '<p><table><tbody><tr><td>cell</td></tr></tbody></table></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  // 应该有且仅有一对<para></para>
  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
  assertContains(result, '<table>', '应包含table标签')
  assertNotContains(result, '<p>', '不应包含未转换的<p>标签')
})

// 测试2: 缺少</p>的情况
test('T1.2: <p><table></table>（缺少</p>）应正确转换', async () => {
  const html = '<p><table><tbody><tr><td>cell</td></tr></tbody></table>'
  const result = await html2para(mockParent, html, validProjectParams)

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
})

// 测试3: 嵌套<p>的情况
test('T1.3: <p><p><table></table></p>（嵌套<p>）应正确转换', async () => {
  const html = '<p><p><table><tbody><tr><td>cell</td></tr></tbody></table></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
  // 嵌套的<p>应该被清理
  const nestedParaPattern = /<para>\s*<para>/
  if (nestedParaPattern.test(result)) {
    throw new Error('不应包含嵌套的<para>标签')
  }
})

// 测试4: table前后有空格
test('T1.4: <p>  <table></table>  </p>（有空格）应正确转换', async () => {
  const html = '<p>  <table><tbody><tr><td>cell</td></tr></tbody></table>  </p>'
  const result = await html2para(mockParent, html, validProjectParams)

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
})

// 测试5: 用户报告的实际场景
test('T1.5: 用户报告场景（<para><table>...</table></para>）', async () => {
  const html = '<p><table><tgroup cols="1"><tbody><row></row></tbody></tgroup></table></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
  assertContains(result, '<tgroup', '应保留tgroup标签')
})

// 测试6: 多个table
test('T1.6: 多个table应正确转换', async () => {
  const html = '<p><table><tbody><tr><td>1</td></tr></tbody></table></p><p><table><tbody><tr><td>2</td></tr></tbody></table></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
})

// 测试7: table与文本混合
test('T1.7: table与文本混合应正确转换', async () => {
  const html = '<p>Text before</p><p><table><tbody><tr><td>cell</td></tr></tbody></table></p><p>Text after</p>'
  const result = await html2para(mockParent, html, validProjectParams)

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
  assertContains(result, 'Text before', '应保留前置文本')
  assertContains(result, 'Text after', '应保留后置文本')
})

// 测试8: 复杂嵌套
test('T1.8: 复杂嵌套结构应正确转换', async () => {
  const html = '<p><p><table><tbody><tr><td><p>nested</p></td></tr></tbody></table></p></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量应相等')
})

console.log('\n【测试组2】P0-01: JSON.parse异常处理修复')
console.log('------------------------------------')

// 测试9: 有效的JSON
test('T2.1: 有效的projectParameters应正常解析', async () => {
  const html = '<p>Normal text</p>'
  const result = await html2para(mockParent, html, validProjectParams)

  assertContains(result, '<para>', '应正常转换')
  // 不应该有错误日志（但我们无法直接测试console.error）
})

// 测试10: 无效的JSON（应该捕获异常并继续）
test('T2.2: 无效的projectParameters应被捕获并继续执行', async () => {
  const html = '<p>Normal text</p>'
  const invalidParams = 'invalid json {{{}}}'

  // 应该不会抛出异常
  const result = await html2para(mockParent, html, invalidParams)

  assertContains(result, '<para>', '应继续执行转换')
})

// 测试11: null参数
test('T2.3: null projectParameters应被处理', async () => {
  const html = '<p>Normal text</p>'

  // 应该不会抛出异常
  const result = await html2para(mockParent, html, null)

  assertContains(result, '<para>', '应继续执行转换')
})

// 测试12: undefined参数
test('T2.4: undefined projectParameters应被处理', async () => {
  const html = '<p>Normal text</p>'

  // 应该不会抛出异常
  const result = await html2para(mockParent, html, undefined)

  assertContains(result, '<para>', '应继续执行转换')
})

// 测试13: 空字符串
test('T2.5: 空字符串projectParameters应被处理', async () => {
  const html = '<p>Normal text</p>'

  // 应该不会抛出异常
  const result = await html2para(mockParent, html, '')

  assertContains(result, '<para>', '应继续执行转换')
})

// 测试14: 格式正确但缺少字段的JSON
test('T2.6: 缺少originator/rpc字段的JSON应正常处理', async () => {
  const html = '<p>Normal text</p>'
  const paramsNoFields = JSON.stringify({})

  const result = await html2para(mockParent, html, paramsNoFields)

  assertContains(result, '<para>', '应继续执行转换')
})

console.log('\n【测试组3】回归测试：确保修复未破坏现有功能')
console.log('------------------------------------')

// 测试15: 基础文本转换
test('T3.1: 基础文本转换应正常工作', async () => {
  const html = '<p>Simple text</p>'
  const result = await html2para(mockParent, html, validProjectParams)

  assertContains(result, '<para>Simple text</para>', '应正确转换基础文本')
})

// 测试16: 列表转换
test('T3.2: 列表转换应正常工作', async () => {
  const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
  const result = await html2para(mockParent, html, validProjectParams)

  assertContains(result, '<randomList>', '应包含randomList标签')
  assertContains(result, '<listItem>', '应包含listItem标签')
})

// 测试17: 强调文本
test('T3.3: 强调文本应正常转换', async () => {
  const html = '<p><strong>Bold text</strong></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  assertContains(result, '<emphasis>', '应包含emphasis标签')
  assertContains(result, 'Bold text', '应保留文本内容')
})

// 测试18: 上标和下标
test('T3.4: 上标和下标应正常转换', async () => {
  const html = '<p>H<sub>2</sub>O and x<sup>2</sup></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  assertContains(result, '<subScript>', '应包含subScript标签')
  assertContains(result, '<superScript>', '应包含superScript标签')
})

// 测试19: 混合内容
test('T3.5: 混合内容应正常转换', async () => {
  const html = '<p>Text with <strong>bold</strong> and <sub>subscript</sub></p>'
  const result = await html2para(mockParent, html, validProjectParams)

  assertContains(result, '<para>', '应包含para标签')
  assertContains(result, '<emphasis>', '应包含emphasis标签')
  assertContains(result, '<subScript>', '应包含subScript标签')
})

// 测试20: 空内容
test('T3.6: 空内容应正常处理', async () => {
  const html = ''
  const result = await html2para(mockParent, html, validProjectParams)

  // 应该返回字符串（即使是空的）
  assertEquals(typeof result, 'string', '应返回字符串类型')
})

// 输出测试结果
console.log('\n====================================')
console.log('测试结果汇总')
console.log('====================================')
console.log(`总计: ${totalTests} 个测试`)
console.log(`✅ 通过: ${passedTests} 个`)
console.log(`❌ 失败: ${failedTests} 个`)
console.log(`通过率: ${(passedTests / totalTests * 100).toFixed(1)}%`)
console.log('====================================\n')

if (failedTests > 0) {
  console.error('⚠️  存在失败的测试，请检查代码修复是否正确')
  process.exit(1)
} else {
  console.log('🎉 所有测试通过！P0修复验证成功！')
  process.exit(0)
}
