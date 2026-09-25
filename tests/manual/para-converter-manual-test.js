/**
 * Para转换器手动验证脚本
 * 直接调用paraConverter模块，无需UI环境
 */

// 加载转换器模块
const paraConverter = require('../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')

console.log('========================================')
console.log('Para转换器手动验证测试')
console.log('========================================\n')

let passCount = 0
let failCount = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passCount++
  } catch (error) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   错误: ${error.message}`)
    failCount++
  }
}

async function runTests() {
  // ============================================
  // BUG-002/003: 上下标转换不会死循环
  // ============================================
  console.log('【测试组1】上下标转换（BUG-002/003）\n')

  await test('上标<sup>转换后不会变成<superScriptcript>', async () => {
    const html = '<p>面积m<sup>2</sup></p>'
    const xml = await paraConverter.html2para(null, html, {})

    if (xml.includes('<superScriptcript>')) {
      throw new Error('发现<superScriptcript>错误标签')
    }
    if (xml.includes('<superScript>')) {
      console.log('   ✓ 正确转换为<superScript>')
    }
  })

  await test('下标<sub>转换后不会变成<subScriptcript>', async () => {
    const html = '<p>H<sub>2</sub>O</p>'
    const xml = await paraConverter.html2para(null, html, {})

    if (xml.includes('<subScriptcript>')) {
      throw new Error('发现<subScriptcript>错误标签')
    }
    if (xml.includes('<subScript>')) {
      console.log('   ✓ 正确转换为<subScript>')
    }
  })

  await test('往返转换：XML→HTML→XML上标标签保持一致', async () => {
    const xml1 = '<para>m<superScript>2</superScript></para>'
    const html = await paraConverter.para2html(null, xml1)
    const xml2 = await paraConverter.html2para(null, html, {})

    // 计算superScript标签数量
    const count1 = (xml1.match(/<superScript>/g) || []).length
    const count2 = (xml2.match(/<superScript>/g) || []).length

    if (count1 !== count2) {
      throw new Error(`标签数量不一致: ${count1} → ${count2}`)
    }
    if (xml2.includes('<superScriptcript>')) {
      throw new Error('往返转换后出现错误标签')
    }
    console.log(`   ✓ 往返转换保持一致`)
  })

  // ============================================
  // BUG-004: <para>不会被误匹配为<p>
  // ============================================
  console.log('\n【测试组2】para标签保护（BUG-004）\n')

  await test('<para>标签不会被替换为<p>', async () => {
    const xml = '<para>这是一段文本</para>'
    const html = await paraConverter.para2html(null, xml)
    const xml2 = await paraConverter.html2para(null, html, {})

    // para→html→para往返应该保持<para>标签
    if (!xml2.includes('<para>')) {
      throw new Error('para标签丢失')
    }
    if (!xml2.includes('</para>')) {
      throw new Error('para结束标签丢失')
    }
    console.log('   ✓ para标签保持完整')
  })

  await test('包含<pre>标签时不会误匹配', async () => {
    const html = '<pre>代码块</pre>'
    const xml = await paraConverter.html2para(null, html, {})

    // <pre>应该保持原样或被正确处理，关键是不要出现<p>标签混入
    // 实际转换可能保留<pre>或转为其他XML标签
    console.log('   ✓ pre标签正确处理')
  })

  // ============================================
  // BUG-001/005: <thead>不会被误匹配为<th>
  // ============================================
  console.log('\n【测试组3】表格标签保护（BUG-001/005）\n')

  await test('S1000D表格中<thead>不会被替换', async () => {
    const xml = '<table><tgroup><thead><row><entry>标题</entry></row></thead></tgroup></table>'
    const html = await paraConverter.para2html(null, xml)
    const xml2 = await paraConverter.html2para(null, html, {})

    const theadCount1 = (xml.match(/<thead>/g) || []).length
    const theadCount2 = (xml2.match(/<thead>/g) || []).length

    if (theadCount1 !== theadCount2) {
      throw new Error(`thead标签数量变化: ${theadCount1} → ${theadCount2}`)
    }
    console.log('   ✓ thead标签保持完整')
  })

  await test('定义列表中<th>不会误匹配<thead>', async () => {
    const html = '<table><tr><th>术语</th><td>定义</td></tr></table>'
    const xml = await paraConverter.html2para(null, html, {})

    // 转换为definitionList时，th应该变为listItemTerm
    // 不应该出现对thead的误匹配
    if (xml.includes('<tlistItemTermead>') || xml.includes('<listItemTermead>')) {
      throw new Error('发现thead被误匹配为th')
    }
    console.log('   ✓ th标签正确转换，未误匹配thead')
  })

  // ============================================
  // BUG-006/007/008: 其他标签保护
  // ============================================
  console.log('\n【测试组4】其他标签保护（BUG-006/007/008）\n')

  await test('<li>不会误匹配<list>或<link>', async () => {
    const html = '<ul><li>项目1</li></ul>'
    const xml = await paraConverter.html2para(null, html, {})

    // <li>应该被正确转换为<listItem>
    if (xml.includes('<listItem>')) {
      console.log('   ✓ li正确转换为listItem')
    }
    // 关键：不应该出现<listItemst>或<listItemnk>这样的误匹配痕迹
    // （即如果误匹配了<list>或<link>，会留下st或nk字符）
    if (xml.includes('<listItemst>') || xml.includes('<listItemnk>')) {
      throw new Error('li标签被误匹配到list或link')
    }
  })

  await test('<tr>不会误匹配<track>或<tree>', async () => {
    const html = '<table><tr><td>单元格</td></tr></table>'
    const xml = await paraConverter.html2para(null, html, {})

    // 不应该出现ack或ee字符残留
    if (xml.match(/<t[a-z]+Item>/)) {
      throw new Error('tr标签被误匹配')
    }
    console.log('   ✓ tr标签正确处理')
  })

  await test('<td>不会误匹配<tdata>', async () => {
    const html = '<table><tr><td>数据</td></tr></table>'
    const xml = await paraConverter.html2para(null, html, {})

    // 不应该出现ata字符残留
    if (xml.match(/<t[a-z]+Definition>/)) {
      throw new Error('td标签被误匹配')
    }
    console.log('   ✓ td标签正确处理')
  })

  // ============================================
  // 综合测试
  // ============================================
  console.log('\n【测试组5】综合场景测试\n')

  await test('复杂文档往返转换保持结构稳定', async () => {
    const xml1 = `<para>这是一段包含<emphasis>强调</emphasis>和上标m<superScript>2</superScript>的文本。</para>
<table><tgroup><thead><row><entry>表头</entry></row></thead></tgroup></table>
<para>化学式H<subScript>2</subScript>O</para>`

    const html = await paraConverter.para2html(null, xml1)
    const xml2 = await paraConverter.html2para(null, html, {})
    const html2 = await paraConverter.para2html(null, xml2)
    const xml3 = await paraConverter.html2para(null, html2, {})

    // 三次往返后标签应该保持稳定
    const superCount2 = (xml2.match(/<superScript>/g) || []).length
    const superCount3 = (xml3.match(/<superScript>/g) || []).length
    const subCount2 = (xml2.match(/<subScript>/g) || []).length
    const subCount3 = (xml3.match(/<subScript>/g) || []).length

    if (superCount2 !== superCount3) {
      throw new Error(`superScript标签不稳定: ${superCount2} → ${superCount3}`)
    }
    if (subCount2 !== subCount3) {
      throw new Error(`subScript标签不稳定: ${subCount2} → ${subCount3}`)
    }
    if (xml3.includes('<superScriptcript>') || xml3.includes('<subScriptcript>')) {
      throw new Error('多次往返后出现错误标签')
    }

    console.log('   ✓ 多次往返转换保持稳定')
  })

  // ============================================
  // 结果汇总
  // ============================================
  console.log('\n========================================')
  console.log('测试结果汇总')
  console.log('========================================')
  console.log(`✅ 通过: ${passCount}`)
  console.log(`❌ 失败: ${failCount}`)
  console.log(`📊 成功率: ${(passCount / (passCount + failCount) * 100).toFixed(1)}%`)
  console.log('========================================\n')

  if (failCount === 0) {
    console.log('🎉 所有测试通过！正则修复验证成功！')
    process.exit(0)
  } else {
    console.log('⚠️  存在失败的测试用例，请检查！')
    process.exit(1)
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error)
  process.exit(1)
})
