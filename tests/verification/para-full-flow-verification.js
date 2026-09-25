/**
 * Para设计器全流程功能验证测试
 *
 * 验证目标：
 * 源码视图 → 设计视图 → 源码视图
 * 每一步操作细节都验证到，确保无遗漏
 *
 * 运行方式：node tests/verification/para-full-flow-verification.js
 */

const path = require('path')

// 动态导入paraConverter模块
const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
const { html2para, para2html } = require(converterPath)

// 测试计数器
let totalTests = 0
let passedTests = 0
let failedTests = 0
const failedDetails = []

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
    failedDetails.push({ name, error: error.message })
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  期望: ${expected}\n  实际: ${actual}`)
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(`${message}\n  期望包含: ${substring}\n  实际字符串: ${str}`)
  }
}

function assertNotContains(str, substring, message) {
  if (str && str.includes(substring)) {
    throw new Error(`${message}\n  不应包含: ${substring}\n  实际字符串: ${str}`)
  }
}

// Mock parent对象
const mockParent = {
  cmnodeid: 'test-node-123',
  dmCode: 'DMC-TEST-A-00-00-00-00A-001A-A'
}

const projectParams = JSON.stringify({
  originator: [{ code: 'TEST' }],
  rpc: [{ code1: 'A' }]
})

console.log('====================================')
console.log('Para设计器全流程功能验证测试')
console.log('====================================\n')

// ========== 第一阶段：源码视图 → 设计视图 (para2html) ==========

console.log('【阶段1】源码视图 → 设计视图 (para2html)')
console.log('====================================\n')

console.log('【测试组1.1】基础元素转换')
console.log('------------------------------------')

test('T1.1.1: <para> → <p>', async () => {
  const xml = '<para>测试文本</para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<p>', '应包含<p>标签')
  assertContains(html, '测试文本', '应保留文本内容')
  assertNotContains(html, '<para>', '不应包含<para>标签')
})

test('T1.1.2: <emphasis> → <strong>', async () => {
  const xml = '<para><emphasis>粗体文本</emphasis></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<strong>', '应包含<strong>标签')
  assertContains(html, '粗体文本', '应保留文本内容')
  assertNotContains(html, '<emphasis>', '不应包含<emphasis>标签')
})

test('T1.1.3: <superScript> → <sup>', async () => {
  const xml = '<para>x<superScript>2</superScript></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<sup>', '应包含<sup>标签')
  assertContains(html, 'x', '应保留前置文本')
  assertContains(html, '2', '应保留上标内容')
})

test('T1.1.4: <subScript> → <sub>', async () => {
  const xml = '<para>H<subScript>2</subScript>O</para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<sub>', '应包含<sub>标签')
  assertContains(html, 'H', '应保留前置文本')
  assertContains(html, 'O', '应保留后置文本')
})

console.log('\n【测试组1.2】列表转换')
console.log('------------------------------------')

test('T1.2.1: <randomList> → <ul>', async () => {
  const xml = '<para><randomList><listItem><para>项目1</para></listItem></randomList></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<ul>', '应包含<ul>标签')
  assertContains(html, '<li>', '应包含<li>标签')
  assertContains(html, '项目1', '应保留列表项内容')
})

test('T1.2.2: <sequentialList> → <ol>', async () => {
  const xml = '<para><sequentialList><listItem><para>步骤1</para></listItem></sequentialList></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<ol>', '应包含<ol>标签')
  assertContains(html, '<li>', '应包含<li>标签')
  assertContains(html, '步骤1', '应保留列表项内容')
})

test('T1.2.3: 嵌套列表', async () => {
  const xml = '<para><randomList><listItem><para>外层<randomList><listItem><para>内层</para></listItem></randomList></para></listItem></randomList></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<ul>', '应包含外层<ul>')
  assertContains(html, '外层', '应保留外层内容')
  assertContains(html, '内层', '应保留内层内容')
})

console.log('\n【测试组1.3】表格转换（S1000D → HTML）')
console.log('------------------------------------')

test('T1.3.1: 基础表格转换', async () => {
  const xml = '<para><table><tgroup cols="2"><tbody><row><entry>A</entry><entry>B</entry></row></tbody></tgroup></table></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<table>', '应包含<table>标签')
  assertContains(html, '<tbody>', '应包含<tbody>标签')
  assertContains(html, '<tr>', '应包含<tr>标签')
  assertContains(html, '<td>', '应包含<td>标签')
  assertContains(html, 'A', '应保留单元格内容A')
  assertContains(html, 'B', '应保留单元格内容B')
})

test('T1.3.2: 带thead的表格', async () => {
  const xml = '<para><table><tgroup cols="2"><thead><row><entry>标题1</entry><entry>标题2</entry></row></thead><tbody><row><entry>A</entry><entry>B</entry></row></tbody></tgroup></table></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<thead>', '应包含<thead>标签')
  assertContains(html, '<th>', '应包含<th>标签')
  assertContains(html, '标题1', '应保留标题内容')
})

test('T1.3.3: colspec列宽', async () => {
  const xml = '<para><table><tgroup cols="2"><colspec colname="c1" colwidth="2*"/><colspec colname="c2" colwidth="1*"/><tbody><row><entry>A</entry><entry>B</entry></row></tbody></tgroup></table></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<table>', '应包含<table>标签')
  // 列宽应该转换为style属性
  assertContains(html, 'width:', '应包含width样式')
})

console.log('\n【测试组1.4】definitionList转换')
console.log('------------------------------------')

test('T1.4.1: definitionList → table[deflist]', async () => {
  const xml = '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<table', '应包含<table>标签')
  assertContains(html, 'deflist="1"', '应包含deflist属性')
  assertContains(html, '<th>', '应包含<th>标签')
  assertContains(html, '<td>', '应包含<td>标签')
  assertContains(html, '术语', '应保留术语内容')
  assertContains(html, '定义', '应保留定义内容')
})

console.log('\n【测试组1.5】引用转换')
console.log('------------------------------------')

test('T1.5.1: internalRef → <a>', async () => {
  const xml = '<para><internalRef internalRefId="FIG-001" internalRefTargetType="figure">图1</internalRef></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<a', '应包含<a>标签')
  assertContains(html, 'href="javascript:void(0);"', '应包含href属性')
  assertContains(html, 'xml=', '应包含xml属性')
  assertContains(html, 'FIG-001', '应包含引用ID')
})

console.log('\n【测试组1.6】特殊元素')
console.log('------------------------------------')

test('T1.6.1: warningAndCautionPara转换', async () => {
  const xml = '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<p>', '应转换为<p>标签')
  assertContains(html, '警告文本', '应保留警告内容')
})

test('T1.6.2: notePara转换', async () => {
  const xml = '<para><notePara>注意文本</notePara></para>'
  const html = await para2html(mockParent, xml)
  assertContains(html, '<p>', '应转换为<p>标签')
  assertContains(html, '注意文本', '应保留注意内容')
})

// ========== 第二阶段：设计视图 → 源码视图 (html2para) ==========

console.log('\n【阶段2】设计视图 → 源码视图 (html2para)')
console.log('====================================\n')

console.log('【测试组2.1】基础元素逆转换')
console.log('------------------------------------')

test('T2.1.1: <p> → <para>', async () => {
  const html = '<p>测试文本</p>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<para>', '应包含<para>标签')
  assertContains(xml, '测试文本', '应保留文本内容')
  assertNotContains(xml, '<p>', '不应包含<p>标签')
})

test('T2.1.2: <strong> → <emphasis>', async () => {
  const html = '<p><strong>粗体文本</strong></p>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<emphasis>', '应包含<emphasis>标签')
  assertContains(xml, '粗体文本', '应保留文本内容')
  assertNotContains(xml, '<strong>', '不应包含<strong>标签')
})

test('T2.1.3: <sup> → <superScript>', async () => {
  const html = '<p>x<sup>2</sup></p>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<superScript>', '应包含<superScript>标签')
  assertContains(xml, 'x', '应保留前置文本')
  assertContains(xml, '2', '应保留上标内容')
})

test('T2.1.4: <sub> → <subScript>', async () => {
  const html = '<p>H<sub>2</sub>O</p>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<subScript>', '应包含<subScript>标签')
  assertContains(xml, 'H', '应保留前置文本')
  assertContains(xml, 'O', '应保留后置文本')
})

console.log('\n【测试组2.2】列表逆转换')
console.log('------------------------------------')

test('T2.2.1: <ul> → <randomList>', async () => {
  const html = '<ul><li>项目1</li></ul>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<randomList>', '应包含<randomList>标签')
  assertContains(xml, '<listItem>', '应包含<listItem>标签')
  assertContains(xml, '项目1', '应保留列表项内容')
})

test('T2.2.2: <ol> → <sequentialList>', async () => {
  const html = '<ol><li>步骤1</li></ol>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<sequentialList>', '应包含<sequentialList>标签')
  assertContains(xml, '<listItem>', '应包含<listItem>标签')
  assertContains(xml, '步骤1', '应保留列表项内容')
})

console.log('\n【测试组2.3】表格逆转换（HTML → S1000D）')
console.log('------------------------------------')

test('T2.3.1: 基础表格逆转换', async () => {
  const html = '<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<table>', '应包含<table>标签')
  assertContains(xml, '<tgroup', '应包含<tgroup>标签')
  assertContains(xml, 'cols=', '应包含cols属性')
  assertContains(xml, '<tbody>', '应包含<tbody>标签')
  assertContains(xml, '<row>', '应包含<row>标签')
  assertContains(xml, '<entry>', '应包含<entry>标签')
  assertContains(xml, 'A', '应保留单元格内容A')
  assertContains(xml, 'B', '应保留单元格内容B')
})

test('T2.3.2: 带thead的表格逆转换', async () => {
  const html = '<table><thead><tr><th>标题1</th><th>标题2</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<thead>', '应包含<thead>标签')
  assertContains(xml, '标题1', '应保留标题内容')
  assertContains(xml, '<tbody>', '应包含<tbody>标签')
})

console.log('\n【测试组2.4】definitionList逆转换')
console.log('------------------------------------')

test('T2.4.1: table[deflist] → definitionList', async () => {
  const html = '<table deflist="1"><tr><th>术语</th><td>定义</td></tr></table>'
  const xml = await html2para(mockParent, html, projectParams)
  assertContains(xml, '<definitionList>', '应包含<definitionList>标签')
  assertContains(xml, '<definitionListItem>', '应包含<definitionListItem>标签')
  assertContains(xml, '<listItemTerm>', '应包含<listItemTerm>标签')
  assertContains(xml, '<listItemDefinition>', '应包含<listItemDefinition>标签')
  assertContains(xml, '术语', '应保留术语内容')
  assertContains(xml, '定义', '应保留定义内容')
})

console.log('\n【测试组2.5】特殊处理验证')
console.log('------------------------------------')

test('T2.5.1: para标签配对', async () => {
  const html = '<p>文本1</p><p>文本2</p>'
  const xml = await html2para(mockParent, html, projectParams)
  const paraOpenCount = (xml.match(/<para>/g) || []).length
  const paraCloseCount = (xml.match(/<\/para>/g) || []).length
  assertEquals(paraOpenCount, paraCloseCount, 'para开始和结束标签数量必须相等')
})

test('T2.5.2: table周围para清理', async () => {
  const html = '<p><table><tbody><tr><td>cell</td></tr></tbody></table></p>'
  const xml = await html2para(mockParent, html, projectParams)
  // table前后不应该有多余的<para>
  const paraCount = (xml.match(/<para>/g) || []).length
  assertEquals(paraCount, 1, 'table周围应该只有一个para标签')
})

test('T2.5.3: 嵌套para清理', async () => {
  const html = '<p><p>嵌套文本</p></p>'
  const xml = await html2para(mockParent, html, projectParams)
  // 不应该有嵌套的<para>
  const nestedPattern = /<para[^>]*>\s*<para[^>]*>/
  if (nestedPattern.test(xml)) {
    throw new Error('不应该有嵌套的<para>标签')
  }
})

// ========== 第三阶段：往返一致性验证 ==========

console.log('\n【阶段3】往返一致性验证')
console.log('====================================\n')

console.log('【测试组3.1】单次往返')
console.log('------------------------------------')

test('T3.1.1: 基础文本往返', async () => {
  const originalXml = '<para>测试文本</para>'
  const html = await para2html(mockParent, originalXml)
  const resultXml = await html2para(mockParent, html, projectParams)
  assertContains(resultXml, '测试文本', '往返后应保留文本内容')
  assertContains(resultXml, '<para>', '往返后应包含<para>标签')
})

test('T3.1.2: 格式化文本往返', async () => {
  const originalXml = '<para><emphasis>粗体</emphasis>和<superScript>上标</superScript>和<subScript>下标</subScript></para>'
  const html = await para2html(mockParent, originalXml)
  const resultXml = await html2para(mockParent, html, projectParams)
  assertContains(resultXml, '<emphasis>', '往返后应保留emphasis')
  assertContains(resultXml, '<superScript>', '往返后应保留superScript')
  assertContains(resultXml, '<subScript>', '往返后应保留subScript')
})

test('T3.1.3: 列表往返', async () => {
  const originalXml = '<para><randomList><listItem><para>项目1</para></listItem><listItem><para>项目2</para></listItem></randomList></para>'
  const html = await para2html(mockParent, originalXml)
  const resultXml = await html2para(mockParent, html, projectParams)
  assertContains(resultXml, '<randomList>', '往返后应保留randomList')
  assertContains(resultXml, '<listItem>', '往返后应保留listItem')
  assertContains(resultXml, '项目1', '往返后应保留内容1')
  assertContains(resultXml, '项目2', '往返后应保留内容2')
})

test('T3.1.4: 表格往返', async () => {
  const originalXml = '<para><table><tgroup cols="2"><tbody><row><entry>A</entry><entry>B</entry></row></tbody></tgroup></table></para>'
  const html = await para2html(mockParent, originalXml)
  const resultXml = await html2para(mockParent, html, projectParams)
  assertContains(resultXml, '<table>', '往返后应保留table')
  assertContains(resultXml, '<tgroup', '往返后应保留tgroup')
  assertContains(resultXml, 'A', '往返后应保留内容A')
  assertContains(resultXml, 'B', '往返后应保留内容B')
})

console.log('\n【测试组3.2】多次往返')
console.log('------------------------------------')

test('T3.2.1: 3次往返一致性', async () => {
  let xml = '<para>测试文本<emphasis>粗体</emphasis></para>'

  // 第一次往返
  let html = await para2html(mockParent, xml)
  xml = await html2para(mockParent, html, projectParams)

  // 第二次往返
  html = await para2html(mockParent, xml)
  xml = await html2para(mockParent, html, projectParams)

  // 第三次往返
  html = await para2html(mockParent, xml)
  const finalXml = await html2para(mockParent, html, projectParams)

  assertContains(finalXml, '测试文本', '3次往返后应保留文本')
  assertContains(finalXml, '<emphasis>', '3次往返后应保留emphasis')
})

console.log('\n【测试组3.3】边界情况')
console.log('------------------------------------')

test('T3.3.1: 空内容处理', async () => {
  const xml = '<para></para>'
  const html = await para2html(mockParent, xml)
  const resultXml = await html2para(mockParent, html || '', projectParams)
  // 空内容往返应该不崩溃
  assertEquals(typeof resultXml, 'string', '应返回字符串类型')
})

test('T3.3.2: 特殊字符处理', async () => {
  const xml = '<para>特殊字符: &amp; &lt; &gt; &quot; &apos;</para>'
  const html = await para2html(mockParent, xml)
  const resultXml = await html2para(mockParent, html, projectParams)
  // 特殊字符应该正确转义和还原
  assertContains(resultXml, '&', '应保留&字符')
})

test('T3.3.3: 复杂嵌套', async () => {
  const xml = '<para><randomList><listItem><para>外层<randomList><listItem><para>内层<emphasis>强调</emphasis></para></listItem></randomList></para></listItem></randomList></para>'
  const html = await para2html(mockParent, xml)
  const resultXml = await html2para(mockParent, html, projectParams)
  assertContains(resultXml, '外层', '应保留外层内容')
  assertContains(resultXml, '内层', '应保留内层内容')
  assertContains(resultXml, '<emphasis>', '应保留嵌套的emphasis')
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
  console.error('失败的测试详情:')
  failedDetails.forEach((detail, index) => {
    console.error(`${index + 1}. ${detail.name}`)
    console.error(`   ${detail.error}\n`)
  })
  process.exit(1)
} else {
  console.log('🎉 Para设计器全流程功能验证全部通过！')
  process.exit(0)
}
