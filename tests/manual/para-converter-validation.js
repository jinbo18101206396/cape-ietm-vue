/**
 * Para转换器手动验证脚本
 * 直接运行转换函数，验证 §8 转换规则
 */

// 模拟 para2html 核心逻辑（不依赖 axios）
function para2htmlSync(str) {
  if (!str || !str.trim()) return ''

  let html = str.trim()

  // §8.2.1 definitionList转table
  const deflists = html.match(/<definitionList.*?<\/definitionList>/g)
  if (deflists != null) {
    deflists.forEach(m => {
      let html_ = m.replace(/<definitionList>/g, '<table deflist="1">')
        .replace('</definitionList>', '</table>')
        .replace(/<definitionListItem>/g, '<tr>')
        .replace(/<\/definitionListItem>/g, '</tr>')
        .replace(/<listItemTerm\/>/g, '<th></th>')
        .replace(/<listItemTerm>/g, '<th>')
        .replace(/<\/listItemTerm>/g, '</th>')
        .replace(/<listItemDefinition\/>/g, '<td></td>')
        .replace(/<listItemDefinition>/g, '<td>')
        .replace(/<\/listItemDefinition>/g, '</td>')
      html = html.replace(m, html_)
    })
  }

  // §8.2.2 基础元素转换
  html = html.replace(/<para/g, '<p')
    .replace(/<\/para>/g, '</p>')
    .replace(/<superScript>/g, '<sup>')
    .replace(/<\/superScript>/g, '</sup>')
    .replace(/<subScript>/g, '<sub>')
    .replace(/<\/subScript>/g, '</sub>')
    .replace(/<randomList/g, '<ul')
    .replace(/<\/randomList>/g, '</ul>')
    .replace(/<sequentialList/g, '<ol')
    .replace(/<\/sequentialList>/g, '</ol>')
    .replace(/<listItem/g, '<li')
    .replace(/<\/listItem>/g, '</li>')
    .replace(/<emphasis>/g, '<strong>')
    .replace(/<\/emphasis>/g, '</strong>')

  return html
}

// 模拟 html2para 核心逻辑
function html2paraSync(str) {
  if (!str || !str.trim()) return ''

  let xml = str.trim()

  // §8.2.1 table转definitionList
  const deflistTables = xml.match(/<table\s+deflist="1".*?<\/table>/g)
  if (deflistTables != null) {
    deflistTables.forEach(m => {
      let xml_ = m.replace(/<table\s+deflist="1".*?>/g, '<definitionList>')
        .replace('</table>', '</definitionList>')
        .replace(/<tr.*?>/g, '<definitionListItem>')
        .replace(/<\/tr>/g, '</definitionListItem>')
        .replace(/<th><\/th>/g, '<listItemTerm/>')
        .replace(/<th>/g, '<listItemTerm>')
        .replace(/<\/th>/g, '</listItemTerm>')
        .replace(/<td><\/td>/g, '<listItemDefinition/>')
        .replace(/<td.*?>/g, '<listItemDefinition>')
        .replace(/<\/td>/g, '</listItemDefinition>')
      xml = xml.replace(m, xml_)
    })
  }

  // §8.2.2 基础元素转换
  xml = xml.replace(/<p/g, '<para')
    .replace(/<\/p>/g, '</para>')
    .replace(/<sup>/g, '<superScript>')
    .replace(/<\/sup>/g, '</superScript>')
    .replace(/<sub>/g, '<subScript>')
    .replace(/<\/sub>/g, '</subScript>')
    .replace(/<ul/g, '<randomList')
    .replace(/<\/ul>/g, '</randomList>')
    .replace(/<ol/g, '<sequentialList')
    .replace(/<\/ol>/g, '</sequentialList>')
    .replace(/<li/g, '<listItem')
    .replace(/<\/li>/g, '</listItem>')
    .replace(/<strong>/g, '<emphasis>')
    .replace(/<\/strong>/g, '</emphasis>')

  return xml
}

// 测试用例
const tests = [
  {
    name: '§8.2.2-1: para → p',
    input: '<para>测试段落</para>',
    expected: '<p>测试段落</p>',
    fn: para2htmlSync
  },
  {
    name: '§8.2.2-2: p → para',
    input: '<p>测试段落</p>',
    expected: '<para>测试段落</para>',
    fn: html2paraSync
  },
  {
    name: '§8.2.2-3: superScript → sup',
    input: '<para>x<superScript>2</superScript></para>',
    expected: '<p>x<sup>2</sup></p>',
    fn: para2htmlSync
  },
  {
    name: '§8.2.2-4: sup → superScript',
    input: '<p>x<sup>2</sup></p>',
    expected: '<para>x<superScript>2</superScript></para>',
    fn: html2paraSync
  },
  {
    name: '§8.2.2-5: subScript → sub',
    input: '<para>H<subScript>2</subScript>O</para>',
    expected: '<p>H<sub>2</sub>O</p>',
    fn: para2htmlSync
  },
  {
    name: '§8.2.2-6: sub → subScript',
    input: '<p>H<sub>2</sub>O</p>',
    expected: '<para>H<subScript>2</subScript>O</para>',
    fn: html2paraSync
  },
  {
    name: '§8.2.2-7: emphasis → strong',
    input: '<para><emphasis>重要</emphasis></para>',
    expected: '<p><strong>重要</strong></p>',
    fn: para2htmlSync
  },
  {
    name: '§8.2.2-8: strong → emphasis',
    input: '<p><strong>重要</strong></p>',
    expected: '<para><emphasis>重要</emphasis></para>',
    fn: html2paraSync
  },
  {
    name: '§8.2.2-9: randomList → ul',
    input: '<para><randomList><listItem>项1</listItem></randomList></para>',
    expected: '<p><ul><li>项1</li></ul></p>',
    fn: para2htmlSync
  },
  {
    name: '§8.2.2-10: ul → randomList',
    input: '<p><ul><li>项1</li></ul></p>',
    expected: '<para><randomList><listItem>项1</listItem></randomList></para>',
    fn: html2paraSync
  },
  {
    name: '§8.2.2-11: sequentialList → ol',
    input: '<para><sequentialList><listItem>步骤1</listItem></sequentialList></para>',
    expected: '<p><ol><li>步骤1</li></ol></p>',
    fn: para2htmlSync
  },
  {
    name: '§8.2.2-12: ol → sequentialList',
    input: '<p><ol><li>步骤1</li></ol></p>',
    expected: '<para><sequentialList><listItem>步骤1</listItem></sequentialList></para>',
    fn: html2paraSync
  },
  {
    name: '§8.2.1-1: definitionList → table',
    input: `<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition>定义</listItemDefinition></definitionListItem></definitionList></para>`,
    expected: '<table deflist="1"><tr><th>术语</th><td>定义</td></tr></table>',
    fn: para2htmlSync,
    partialMatch: true
  },
  {
    name: '§8.2.1-2: table → definitionList',
    input: '<p><table deflist="1"><tr><th>术语</th><td>定义</td></tr></table></p>',
    expected: '<definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition>定义</listItemDefinition></definitionListItem></definitionList>',
    fn: html2paraSync,
    partialMatch: true
  },
  {
    name: '§8.2.1-3: 自闭合 listItemTerm/listItemDefinition',
    input: '<para><definitionList><definitionListItem><listItemTerm/><listItemDefinition/></definitionListItem></definitionList></para>',
    expected: '<th></th><td></td>',
    fn: para2htmlSync,
    partialMatch: true
  }
]

// 运行测试
console.log('========== Para 转换器验证测试 ==========\n')

let passed = 0
let failed = 0

tests.forEach(test => {
  const result = test.fn(test.input)
  const success = test.partialMatch
    ? result.includes(test.expected)
    : result === test.expected

  if (success) {
    console.log(`✓ ${test.name}`)
    passed++
  } else {
    console.log(`✗ ${test.name}`)
    console.log(`  输入: ${test.input}`)
    console.log(`  期望: ${test.expected}`)
    console.log(`  实际: ${result}`)
    failed++
  }
})

console.log(`\n========== 测试结果 ==========`)
console.log(`通过: ${passed}/${tests.length}`)
console.log(`失败: ${failed}/${tests.length}`)
console.log(`通过率: ${(passed / tests.length * 100).toFixed(1)}%`)

// 双向转换一致性测试
console.log(`\n========== 双向转换一致性测试 ==========\n`)

const roundTripTests = [
  {
    name: '段落 + 上标',
    xml: '<para>面积为 10m<superScript>2</superScript></para>'
  },
  {
    name: '段落 + 下标',
    xml: '<para>水的化学式是 H<subScript>2</subScript>O</para>'
  },
  {
    name: '段落 + 加粗',
    xml: '<para><emphasis>重要提示</emphasis>：请注意安全</para>'
  },
  {
    name: '无序列表',
    xml: '<para><randomList><listItem>第一项</listItem><listItem>第二项</listItem></randomList></para>'
  },
  {
    name: '有序列表',
    xml: '<para><sequentialList><listItem>步骤1</listItem><listItem>步骤2</listItem></sequentialList></para>'
  }
]

let rtPassed = 0
let rtFailed = 0

roundTripTests.forEach(test => {
  const html = para2htmlSync(test.xml)
  const backToXml = html2paraSync(html)

  // 规范化空白后比较
  const normalize = s => s.replace(/\s+/g, '').trim()
  const success = normalize(backToXml) === normalize(test.xml)

  if (success) {
    console.log(`✓ ${test.name}`)
    rtPassed++
  } else {
    console.log(`✗ ${test.name}`)
    console.log(`  原始XML: ${test.xml}`)
    console.log(`  HTML:    ${html}`)
    console.log(`  还原XML: ${backToXml}`)
    rtFailed++
  }
})

console.log(`\n========== 双向测试结果 ==========`)
console.log(`通过: ${rtPassed}/${roundTripTests.length}`)
console.log(`失败: ${rtFailed}/${roundTripTests.length}`)
console.log(`通过率: ${(rtPassed / roundTripTests.length * 100).toFixed(1)}%`)

// 总结
console.log(`\n========== 总体评估 ==========`)
const totalPassed = passed + rtPassed
const totalTests = tests.length + roundTripTests.length
const overallRate = (totalPassed / totalTests * 100).toFixed(1)

console.log(`总通过: ${totalPassed}/${totalTests}`)
console.log(`总通过率: ${overallRate}%`)

if (overallRate >= 95) {
  console.log(`评级: ⭐⭐⭐⭐⭐ 优秀`)
} else if (overallRate >= 85) {
  console.log(`评级: ⭐⭐⭐⭐ 良好`)
} else if (overallRate >= 70) {
  console.log(`评级: ⭐⭐⭐ 合格`)
} else {
  console.log(`评级: ⭐⭐ 需改进`)
}
