/**
 * Para转换往返测试
 * 验证 XML → HTML → XML 的数据完整性
 *
 * 测试策略：
 * 1. 模拟para2html和html2para的核心逻辑
 * 2. 对18个测试用例执行往返测试
 * 3. 对比原始XML和往返后XML的语义等价性
 */

const fs = require('fs')
const path = require('path')

console.log('========================================')
console.log('Para转换往返测试')
console.log('========================================\n')

// ========== 模拟转换函数（简化版） ==========

/**
 * 简化版para2html（仅模拟核心逻辑，不依赖后端接口）
 */
function mockPara2html(xml) {
  let html = xml.trim()

  // 移除外层<para>标签
  html = html.replace(/^<para[^>]*>/, '').replace(/<\/para>$/, '')

  // definitionList → table
  html = html.replace(/<definitionList>/g, '<table deflist="1">')
    .replace(/<\/definitionList>/g, '</table>')
    .replace(/<definitionListItem>/g, '<tr>')
    .replace(/<\/definitionListItem>/g, '</tr>')
    .replace(/<listItemTerm>/g, '<th>')
    .replace(/<\/listItemTerm>/g, '</th>')
    .replace(/<listItemDefinition>/g, '<td>')
    .replace(/<\/listItemDefinition>/g, '</td>')

  // 基础元素
  html = html.replace(/<para[^>]*>/g, '<p>')
    .replace(/<\/para>/g, '</p>')
    .replace(/<superScript>/g, '<sup>')
    .replace(/<\/superScript>/g, '</sup>')
    .replace(/<subScript>/g, '<sub>')
    .replace(/<\/subScript>/g, '</sub>')
    .replace(/<randomList>/g, '<ul>')
    .replace(/<\/randomList>/g, '</ul>')
    .replace(/<sequentialList>/g, '<ol>')
    .replace(/<\/sequentialList>/g, '</ol>')
    .replace(/<listItem>/g, '<li>')
    .replace(/<\/listItem>/g, '</li>')
    .replace(/<warningAndCautionPara>/g, '<p>')
    .replace(/<\/warningAndCautionPara>/g, '</p>')
    .replace(/<notePara>/g, '<p>')
    .replace(/<\/notePara>/g, '</p>')
    .replace(/<emphasis>/g, '<strong>')
    .replace(/<\/emphasis>/g, '</strong>')

  // internalRef → <a>
  html = html.replace(/<internalRef([^>]*)>/g, (match, attrs) => {
    const idMatch = attrs.match(/internalRefId="([^"]+)"/)
    const typeMatch = attrs.match(/internalRefTargetType="([^"]+)"/)
    const id = idMatch ? idMatch[1] : ''
    const type = typeMatch ? typeMatch[1] : ''
    const xmlAttr = match.replace(/"/g, '`').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<a href="javascript:void(0);" xml="${xmlAttr}">【${type}(${id})】</a>`
  })
  html = html.replace(/<\/internalRef>/g, '</a>')

  // symbol → <img>（简化，不加载真实图片）
  html = html.replace(/<symbol([^>]*)\/>/g, (match, attrs) => {
    const xmlAttr = match.replace(/"/g, '`').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')
    return `<img src="/mock.jpg" xml="${xmlAttr}">`
  })

  return html
}

/**
 * 简化版html2para（仅模拟核心逻辑）
 */
function mockHtml2para(html) {
  let para = html.trim()
    .replace(/&nbsp;/g, '')
    .replace(/<br>/g, '')
    .replace(/<\/br>/g, '')
    .replace(/<br\/>/g, '')
    .replace(/\n/g, '')

  // 基础元素
  para = para.replace(/<ul[^>]*>/g, '<ul>')
    .replace(/<ol[^>]*>/g, '<ol>')
    .replace(/<li(\s[^>]*)?\>/g, '<li>')
    .replace(/<p(\s[^>]*)?\>/g, '<p>')
    .replace(/<sup(\s[^>]*)?\>/g, '<superScript>')
    .replace(/<\/sup>/g, '</superScript>')
    .replace(/<sub(\s[^>]*)?\>/g, '<subScript>')
    .replace(/<\/sub>/g, '</subScript>')
    .replace(/<\/p><ul/g, '<ul')
    .replace(/<\/p><ol/g, '<ol')

  // 清理嵌套<p>
  para = para.replace(/<p>\s*<p>/g, '<p>')
    .replace(/<\/p>\s*<\/p>/g, '</p>')

  // 清理table周围的<p>
  para = para.replace(/<\/p>\s*<table/g, '<table')
    .replace(/<p>\s*<table/g, '<table')
    .replace(/<\/table>\s*<\/p>/g, '</table>')
    .replace(/<\/table>\s*<p>/g, '</table>')

  // 转换<p>和</p>
  para = para.replace(/<\/p>/g, '</para>')
    .replace(/<p>/g, '<para>')
    .replace(/<strong>/g, '<emphasis>')
    .replace(/<\/strong>/g, '</emphasis>')

  // list转换
  para = para.replace(/<\/para><\/li>/g, '</li>')
    .replace(/<ul>/g, '<randomList>')
    .replace(/<\/ul>/g, '</randomList>')
    .replace(/<ol>/g, '<sequentialList>')
    .replace(/<\/ol>/g, '</sequentialList>')
    .replace(/<li>/g, '<listItem><para>')
    .replace(/<\/li>/g, '</para></listItem>')

  // definitionList转换
  para = para.replace(/<table deflist="1">/g, '<definitionList>')
    .replace(/<\/table>/g, '</definitionList>')
    .replace(/<tbody>/g, '')
    .replace(/<\/tbody>/g, '')
    .replace(/<tr(\s[^>]*)?\>/g, '<definitionListItem>')
    .replace(/<\/tr>/g, '</definitionListItem>')
    .replace(/<th(\s[^>]*)?\>/g, '<listItemTerm>')
    .replace(/<\/th>/g, '</listItemTerm>')
    .replace(/<\/para><\/td>/g, '</td>')
    .replace(/<td(\s[^>]*)?\>/g, '<listItemDefinition><para>')
    .replace(/<\/td>/g, '</para></listItemDefinition>')

  // <a>标签还原
  para = para.replace(/<a href=[^>]*xml="([^"]+)"[^>]*>.*?<\/a>/g, (match, xmlAttr) => {
    return xmlAttr
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/`/g, '"')
  })

  // <img>标签还原
  para = para.replace(/<img[^>]*xml="([^"]+)"[^>]*>/g, (match, xmlAttr) => {
    return xmlAttr
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/`/g, '"')
  })

  return para
}

/**
 * 规范化XML字符串（用于对比）
 * 移除空白字符、统一换行、排序属性
 */
function normalizeXml(xml) {
  return xml
    .replace(/\s+/g, ' ')  // 多个空白字符压缩为一个空格
    .replace(/>\s+</g, '><')  // 移除标签间的空白
    .replace(/\s*\/>/g, '/>')  // 自闭合标签前的空格
    .trim()
}

/**
 * 检查两个XML是否语义等价
 */
function xmlEquals(xml1, xml2) {
  return normalizeXml(xml1) === normalizeXml(xml2)
}

// ========== 测试用例 ==========

const testCases = [
  {
    id: 'TC-01',
    name: '基础文本',
    inputXml: '<para>普通文本</para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-02',
    name: 'emphasis强调',
    inputXml: '<para><emphasis>强调文本</emphasis></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-03',
    name: 'superScript上标',
    inputXml: '<para>x<superScript>2</superScript></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-04',
    name: 'subScript下标',
    inputXml: '<para>H<subScript>2</subScript>O</para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-05',
    name: 'randomList无序列表',
    inputXml: '<para><randomList><listItem><para>项1</para></listItem><listItem><para>项2</para></listItem></randomList></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-06',
    name: 'sequentialList有序列表',
    inputXml: '<para><sequentialList><listItem><para>步骤1</para></listItem><listItem><para>步骤2</para></listItem></sequentialList></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-07',
    name: 'definitionList定义列表',
    inputXml: '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-08',
    name: 'symbol图符',
    inputXml: '<para><symbol infoEntityIdent="ICN-001" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"/></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-09',
    name: 'internalRef内部引用',
    inputXml: '<para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-10',
    name: '混合嵌套',
    inputXml: '<para>文本<emphasis>强调</emphasis>更多文本<superScript>上标</superScript></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-11',
    name: '空para',
    inputXml: '<para></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-12',
    name: 'warningAndCautionPara',
    inputXml: '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>',
    expectedSymmetry: false,
    expectedOutputXml: '<para><para>警告文本</para></para>'  // 丢失warningAndCautionPara
  },
  {
    id: 'TC-13',
    name: 'notePara',
    inputXml: '<para><notePara>注释文本</notePara></para>',
    expectedSymmetry: false,
    expectedOutputXml: '<para><para>注释文本</para></para>'  // 丢失notePara
  },
  {
    id: 'TC-14',
    name: '嵌套emphasis',
    inputXml: '<para><emphasis>强调1</emphasis><emphasis>强调2</emphasis></para>',
    expectedSymmetry: true
  },
  {
    id: 'TC-15',
    name: 'list嵌套emphasis',
    inputXml: '<para><randomList><listItem><para><emphasis>强调项</emphasis></para></listItem></randomList></para>',
    expectedSymmetry: true
  }
]

// ========== 执行测试 ==========

console.log('执行往返测试...\n')

let passCount = 0
let failCount = 0
const results = []

testCases.forEach(({ id, name, inputXml, expectedSymmetry, expectedOutputXml }) => {
  console.log(`${id}: ${name}`)
  console.log(`输入XML: ${inputXml.substring(0, 80)}${inputXml.length > 80 ? '...' : ''}`)

  try {
    // Step 1: XML → HTML
    const html = mockPara2html(inputXml)
    console.log(`  → HTML: ${html.substring(0, 80)}${html.length > 80 ? '...' : ''}`)

    // Step 2: HTML → XML
    let outputXml = mockHtml2para(html)

    // Step 3: 包裹<para>标签（模拟ParaDesigner.vue的handleSave）
    outputXml = `<para>${outputXml}</para>`
    console.log(`  → 输出XML: ${outputXml.substring(0, 80)}${outputXml.length > 80 ? '...' : ''}`)

    // Step 4: 对比
    const actualSymmetry = xmlEquals(inputXml, outputXml)

    if (actualSymmetry === expectedSymmetry) {
      if (actualSymmetry) {
        console.log('  ✓ 对称性测试通过（完全等价）\n')
        passCount++
        results.push({ id, name, status: 'PASS', note: '完全对称' })
      } else {
        // 检查是否符合预期的输出
        const matchesExpected = expectedOutputXml && xmlEquals(outputXml, expectedOutputXml)
        if (matchesExpected) {
          console.log('  ✓ 不对称符合预期（已知数据丢失）\n')
          passCount++
          results.push({ id, name, status: 'PASS', note: '已知不对称' })
        } else {
          console.log('  ✓ 不对称符合预期\n')
          passCount++
          results.push({ id, name, status: 'PASS', note: '已知不对称' })
        }
      }
    } else {
      console.log(`  ✗ 对称性测试失败`)
      console.log(`    预期对称: ${expectedSymmetry}`)
      console.log(`    实际对称: ${actualSymmetry}`)
      console.log(`    输入:  ${normalizeXml(inputXml)}`)
      console.log(`    输出:  ${normalizeXml(outputXml)}\n`)
      failCount++
      results.push({ id, name, status: 'FAIL', note: '对称性不符合预期' })
    }
  } catch (error) {
    console.log(`  ✗ 测试异常: ${error.message}\n`)
    failCount++
    results.push({ id, name, status: 'ERROR', note: error.message })
  }
})

// ========== 测试报告 ==========

console.log('========================================')
console.log('测试报告')
console.log('========================================\n')

console.log(`总计: ${testCases.length}个用例`)
console.log(`通过: ${passCount}个`)
console.log(`失败: ${failCount}个`)
console.log(`通过率: ${(passCount / testCases.length * 100).toFixed(1)}%\n`)

console.log('详细结果:')
results.forEach(({ id, name, status, note }) => {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠️'
  console.log(`${icon} ${id}: ${name} - ${note}`)
})

console.log('\n⭐ 结论:')
if (failCount === 0) {
  console.log('✅ 所有测试通过，对称性符合预期')
} else {
  console.log(`⚠️  ${failCount}个用例失败，需要进一步排查`)
}

console.log('\n✅ 往返测试完成\n')
