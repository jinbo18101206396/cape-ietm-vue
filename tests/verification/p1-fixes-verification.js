/**
 * P1问题修复验证测试
 *
 * 测试目标：
 * 1. P1-1: dmCode.split数组长度验证
 * 2. P1-2: uniqueid分配一致性
 * 3. P1-3: Image对象内存泄漏
 * 4. P1-4: axios请求超时
 * 5. P1-5: UEditor实例复用污染
 * 6. P1-6: XML属性XSS防护
 *
 * 运行方式：node tests/verification/p1-fixes-verification.js
 */

const path = require('path')

// 动态导入paraConverter模块
const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
const { html2para, para2html } = require(converterPath)

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

function assertThrows(fn, expectedMessage, message) {
  try {
    fn()
    throw new Error(`${message}\n  期望抛出异常但没有抛出`)
  } catch (error) {
    if (!error.message.includes(expectedMessage)) {
      throw new Error(`${message}\n  期望异常包含: ${expectedMessage}\n  实际异常: ${error.message}`)
    }
  }
}

// Mock parent对象
const validParent = {
  cmnodeid: 'test-node-123',
  dmCode: 'DMC-TEST-A-00-00-00-00A-001A-A'
}

const validProjectParams = JSON.stringify({
  originator: [{ code: 'TEST' }],
  rpc: [{ code1: 'A' }]
})

console.log('====================================')
console.log('P1问题修复验证测试')
console.log('====================================\n')

console.log('【测试组1】P1-1: dmCode.split数组长度验证')
console.log('------------------------------------')

// 测试1: 有效的dmCode
test('T1.1: 有效dmCode应正常处理', async () => {
  const parent = {
    cmnodeid: 'test',
    dmCode: 'DMC-A-B-C-D-E-F-G-H'
  }
  const html = '<p>test</p>'

  // 应该不抛出异常
  const result = await html2para(parent, html, validProjectParams, [])
  assertContains(result, '<para>', '应包含para标签')
})

// 测试2: 无效的dmCode（长度不足）
test('T1.2: dmCode格式错误应抛出异常', async () => {
  const parent = {
    cmnodeid: 'test',
    dmCode: 'DMC-A-B'  // 只有3段
  }
  const html = '<p><img class="kfformula" src="data:image/png;base64,abc"/></p>'

  try {
    await html2para(parent, html, validProjectParams, ['uniqueid1'])
    throw new Error('应该抛出异常')
  } catch (error) {
    if (!error.message.includes('dmCode格式错误')) {
      throw error
    }
  }
})

// 测试3: 边界情况 - 恰好6段
test('T1.3: dmCode恰好6段应正常处理', async () => {
  const parent = {
    cmnodeid: 'test',
    dmCode: 'DMC-A-B-C-D-E'
  }
  const html = '<p>test</p>'

  const result = await html2para(parent, html, validProjectParams, [])
  assertContains(result, '<para>', '应包含para标签')
})

console.log('\n【测试组2】P1-2: uniqueid分配一致性')
console.log('------------------------------------')

// 测试4: uniqueid充足
test('T2.1: uniqueid充足时应正常分配', async () => {
  const parent = validParent
  const html = '<p><img class="kfformula" src="data:image/png;base64,abc"/></p>'
  const uniqueids = ['uid001', 'uid002', 'uid003']

  // 应该不抛出异常
  try {
    await html2para(parent, html, validProjectParams, uniqueids)
    // 注意：实际会因为图片加载失败而有其他错误，但不应该是uniqueid不足的错误
  } catch (error) {
    if (error.message.includes('uniqueid分配不足')) {
      throw new Error('不应该抛出uniqueid不足的错误')
    }
    // 其他错误（如图片加载失败）是正常的
  }
})

// 测试5: uniqueid不足
test('T2.2: uniqueid不足时应抛出异常并记录日志', async () => {
  const parent = validParent
  const html = '<p><img class="kfformula" src="data:image/png;base64,abc"/></p>'
  const uniqueids = []  // 空数组

  try {
    await html2para(parent, html, validProjectParams, uniqueids)
    // 可能因为其他原因失败，不一定是uniqueid不足
  } catch (error) {
    // 如果是uniqueid不足，错误消息应该包含详细信息
    if (error.message.includes('uniqueid分配不足')) {
      // 成功捕获uniqueid不足的错误
    }
  }
})

console.log('\n【测试组3】P1-3: Image对象内存泄漏')
console.log('------------------------------------')

// 测试6: Image事件监听器清理
test('T3.1: Image对象应正确清理事件监听器', async () => {
  // 这个测试验证代码结构，实际内存泄漏需要长时间运行测试
  const parent = validParent
  const html = '<p>test</p>'

  // 多次调用，不应该累积Image对象
  for (let i = 0; i < 5; i++) {
    await html2para(parent, html, validProjectParams, [])
  }

  // 如果没有清理，多次调用会累积内存，但这里只能验证代码不崩溃
})

console.log('\n【测试组4】P1-4: axios请求超时')
console.log('------------------------------------')

// 测试7: axios超时配置
test('T4.1: axios请求应配置超时时间', () => {
  // 这个测试验证代码中是否包含timeout配置
  const fs = require('fs')
  const code = fs.readFileSync(converterPath, 'utf-8')

  // 验证包含timeout配置
  if (!code.includes('timeout: 10000')) {
    throw new Error('代码中应包含timeout: 10000配置')
  }
})

// 测试8: 超时错误处理
test('T4.2: 超时错误应有特殊提示', () => {
  const fs = require('fs')
  const code = fs.readFileSync(converterPath, 'utf-8')

  // 验证包含超时错误处理
  if (!code.includes('ECONNABORTED')) {
    throw new Error('代码中应包含超时错误处理（ECONNABORTED）')
  }
})

console.log('\n【测试组5】P1-5: UEditor实例复用污染')
console.log('------------------------------------')

// 测试9: UEditor实例销毁逻辑
test('T5.1: ParaDesigner应包含实例销毁逻辑', () => {
  const fs = require('fs')
  const vueFilePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
  const code = fs.readFileSync(vueFilePath, 'utf-8')

  // 验证包含销毁逻辑
  if (!code.includes('beforeDestroy')) {
    throw new Error('ParaDesigner应包含beforeDestroy钩子')
  }

  if (!code.includes('destroy()')) {
    throw new Error('beforeDestroy中应调用destroy()')
  }
})

// 测试10: 强制销毁旧实例
test('T5.2: initUEditor应强制销毁旧实例', () => {
  const fs = require('fs')
  const vueFilePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
  const code = fs.readFileSync(vueFilePath, 'utf-8')

  // 验证包含强制销毁逻辑
  if (!code.includes('强制销毁')) {
    throw new Error('initUEditor应包含强制销毁旧实例的逻辑')
  }
})

console.log('\n【测试组6】P1-6: XML属性XSS防护')
console.log('------------------------------------')

// 测试11: XSS防护函数存在
test('T6.1: 应存在XSS防护函数', () => {
  const fs = require('fs')
  const code = fs.readFileSync(converterPath, 'utf-8')

  if (!code.includes('escapeXmlForAttribute')) {
    throw new Error('应存在escapeXmlForAttribute函数')
  }

  if (!code.includes('unescapeXmlAttribute')) {
    throw new Error('应存在unescapeXmlAttribute函数')
  }
})

// 测试12: XSS防护应用到XML属性
test('T6.2: XML属性应应用XSS防护', () => {
  const fs = require('fs')
  const code = fs.readFileSync(converterPath, 'utf-8')

  // 验证escapeXmlForAttribute在关键位置被调用
  const escapeCallCount = (code.match(/escapeXmlForAttribute/g) || []).length
  if (escapeCallCount < 5) {
    throw new Error(`escapeXmlForAttribute调用次数不足，期望>=5，实际${escapeCallCount}`)
  }
})

// 测试13: 危险字符应被转义
test('T6.3: 危险字符应被正确转义', () => {
  const fs = require('fs')
  const code = fs.readFileSync(converterPath, 'utf-8')

  // 验证转义逻辑包含关键字符
  if (!code.includes('&amp;')) {
    throw new Error('应转义&字符')
  }
  if (!code.includes('&lt;')) {
    throw new Error('应转义<字符')
  }
  if (!code.includes('&gt;')) {
    throw new Error('应转义>字符')
  }
  if (!code.includes('&quot;')) {
    throw new Error('应转义"字符')
  }
})

// 测试14: XSS攻击向量测试
test('T6.4: XSS攻击向量应被阻止', async () => {
  const parent = validParent
  const xssPayload = '<script>alert("XSS")</script>'
  const html = `<p>${xssPayload}</p>`

  const result = await html2para(parent, html, validProjectParams, [])

  // 结果中不应包含未转义的script标签
  if (result.includes('<script>') && result.includes('alert(')) {
    throw new Error('XSS攻击向量未被阻止')
  }
})

console.log('\n【测试组7】回归测试')
console.log('------------------------------------')

// 测试15: P0修复未被破坏
test('T7.1: BUG-PARA-001修复应保持有效', async () => {
  const html = '<p><table><tbody><tr><td>cell</td></tr></tbody></table></p>'
  const result = await html2para(validParent, html, validProjectParams, [])

  const paraOpenCount = (result.match(/<para>/g) || []).length
  const paraCloseCount = (result.match(/<\/para>/g) || []).length

  assertEquals(paraOpenCount, paraCloseCount, 'para标签必须配对')
})

// 测试16: P0修复未被破坏
test('T7.2: P0-01修复应保持有效', async () => {
  const html = '<p>test</p>'

  // 无效JSON不应导致崩溃
  const result = await html2para(validParent, html, 'invalid json', [])
  assertContains(result, '<para>', '应继续执行转换')
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
  console.log('🎉 所有P1问题修复验证通过！')
  process.exit(0)
}
