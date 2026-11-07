#!/usr/bin/env node
/**
 * foldout-s1000d-compliance-test.js
 * foldout 元素的 S1000D 4.0 标准符合性检查
 *
 * 测试目标：
 * 1. foldout 元素的结构是否符合 S1000D 4.0 标准
 * 2. 属性要求
 * 3. 子元素要求
 * 4. 嵌套规则
 * 5. XML格式正确性
 */

const { DOMParser } = require('xmldom')

const parser = new DOMParser({
  errorHandler: {
    warning: (msg) => console.warn('⚠️  XML Warning:', msg),
    error: (msg) => console.error('❌ XML Error:', msg),
    fatalError: (msg) => console.error('💥 XML Fatal Error:', msg)
  }
})

// ============================================
// S1000D 4.0 标准规则 - foldout 元素
// ============================================

const FOLDOUT_RULES = {
  // foldout 的必需属性（根据 S1000D 4.0）
  requiredAttributes: ['id'],

  // foldout 的可选属性
  optionalAttributes: ['applicRefId', 'changeMark', 'changeType', 'reasonForUpdateRefIds', 'securityClassification'],

  // foldout 允许的子元素（根据 S1000D 4.0 DTD）
  // foldout 可以包含：para, warning, caution, note, proceduralStep, figure, multimedia, table 等
  allowedChildren: [
    'para',
    'warning',
    'caution',
    'note',
    'proceduralStep',
    'figure',
    'multimedia',
    'table',
    'randomList',
    'definitionList',
    'sequentialList'
  ],

  // foldout 必须至少包含一个内容元素
  minChildren: 1,

  // foldout 可以出现的父元素
  allowedParents: [
    'levelledPara',
    'proceduralStep',
    'description',
    'content'
  ]
}

// ============================================
// 测试用例
// ============================================

const TEST_CASES = [
  {
    name: 'TEST-1: 基本 foldout 结构（单个 para）',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>测试标题</title>
    <foldout id="foldout-001">
      <para>这是折叠内容</para>
    </foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: true,
    description: '测试最基本的 foldout 结构，包含一个 para 子元素'
  },

  {
    name: 'TEST-2: foldout 包含多个段落',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>测试标题</title>
    <foldout id="foldout-002">
      <para>第一段内容</para>
      <para>第二段内容</para>
      <para>第三段内容</para>
    </foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: true,
    description: '测试 foldout 包含多个 para 元素'
  },

  {
    name: 'TEST-3: foldout 包含警告元素',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>测试标题</title>
    <foldout id="foldout-003">
      <warning>
        <warningAndCautionPara>注意事项</warningAndCautionPara>
      </warning>
      <para>详细说明</para>
    </foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: true,
    description: '测试 foldout 包含 warning 和 para 元素'
  },

  {
    name: 'TEST-4: foldout 包含图片',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>测试标题</title>
    <foldout id="foldout-004">
      <para>参见下图</para>
      <figure id="fig-001">
        <title>示意图</title>
        <graphic infoEntityIdent="ICN-001"/>
      </figure>
    </foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: true,
    description: '测试 foldout 包含 figure 元素'
  },

  {
    name: 'TEST-5: foldout 缺少 id 属性（不符合标准）',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>测试标题</title>
    <foldout>
      <para>缺少id属性</para>
    </foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: false,
    description: '测试 foldout 缺少必需的 id 属性'
  },

  {
    name: 'TEST-6: foldout 为空（不符合标准）',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>测试标题</title>
    <foldout id="foldout-006"></foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: false,
    description: '测试空的 foldout 元素（必须包含至少一个子元素）'
  },

  {
    name: 'TEST-7: 当前实现生成的 XML（富文本编辑器）',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>层级1</title>
    <foldout id="foldout-1793877550457"><p>测试XML生成：这是折叠内容</p></foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: false, // <p> 不是 S1000D 标准元素
    description: '测试当前实现生成的 XML（包含 HTML <p> 标签，不符合标准）'
  },

  {
    name: 'TEST-8: 正确的实现（应该生成 para）',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>层级1</title>
    <foldout id="foldout-1793877550457">
      <para>测试XML生成：这是折叠内容</para>
    </foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: true,
    description: '测试符合标准的实现（使用 para 而不是 p）'
  },

  {
    name: 'TEST-9: foldout 包含复杂内容',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>复杂折叠内容</title>
    <foldout id="foldout-009">
      <para>引言段落</para>
      <warning>
        <warningAndCautionPara>重要警告</warningAndCautionPara>
      </warning>
      <para>详细说明</para>
      <table id="table-001">
        <title>数据表</title>
        <tgroup cols="2">
          <tbody>
            <row>
              <entry>项目1</entry>
              <entry>值1</entry>
            </row>
          </tbody>
        </tgroup>
      </table>
      <para>总结段落</para>
    </foldout>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: true,
    description: '测试 foldout 包含复杂的混合内容'
  },

  {
    name: 'TEST-10: foldout 嵌套在 levelledPara 中',
    xml: `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>父级</title>
    <para>引言</para>
    <levelledPara>
      <title>子级</title>
      <foldout id="foldout-010">
        <para>嵌套的折叠内容</para>
      </foldout>
    </levelledPara>
  </levelledPara>
</levelledPara>`,
    expectedCompliant: true,
    description: '测试 foldout 在嵌套 levelledPara 中的位置'
  }
]

// ============================================
// 检查函数
// ============================================

/**
 * 检查 foldout 元素的合规性
 */
function checkFoldoutCompliance(doc, testName) {
  const errors = []
  const warnings = []
  const info = []

  // 查找所有 foldout 元素
  const foldouts = doc.getElementsByTagName('foldout')

  if (foldouts.length === 0) {
    warnings.push('未找到 foldout 元素')
    return { errors, warnings, info, compliant: false }
  }

  for (let i = 0; i < foldouts.length; i++) {
    const foldout = foldouts[i]
    const foldoutId = foldout.getAttribute('id') || `(未命名-索引${i})`

    info.push(`检查 foldout: ${foldoutId}`)

    // 检查1：必需属性
    if (!foldout.getAttribute('id')) {
      errors.push(`${foldoutId}: 缺少必需的 'id' 属性`)
    }

    // 检查2：子元素数量
    const children = Array.from(foldout.childNodes).filter(
      node => node.nodeType === 1 // 只计算元素节点
    )

    if (children.length === 0) {
      errors.push(`${foldoutId}: foldout 不能为空，必须包含至少一个内容元素`)
    }

    // 检查3：子元素类型
    for (const child of children) {
      const childName = child.nodeName

      // 🔑 关键检查：是否包含 HTML 标签（<p>, <div> 等）
      if (['p', 'div', 'span', 'br', 'strong', 'em', 'b', 'i', 'u'].includes(childName.toLowerCase())) {
        errors.push(`${foldoutId}: 包含 HTML 标签 <${childName}>，不符合 S1000D 标准。应使用 <para> 代替 <p>`)
      }

      // 检查是否为允许的 S1000D 元素
      if (!FOLDOUT_RULES.allowedChildren.includes(childName)) {
        warnings.push(`${foldoutId}: 子元素 <${childName}> 可能不是 foldout 的标准子元素`)
      }
    }

    // 检查4：父元素类型
    const parent = foldout.parentNode
    if (parent && parent.nodeType === 1) {
      const parentName = parent.nodeName
      if (!FOLDOUT_RULES.allowedParents.includes(parentName)) {
        warnings.push(`${foldoutId}: 父元素 <${parentName}> 可能不是 foldout 的标准父元素`)
      }
    }

    // 检查5：属性检查
    const attributes = foldout.attributes
    for (let j = 0; j < attributes.length; j++) {
      const attr = attributes[j]
      if (!FOLDOUT_RULES.requiredAttributes.includes(attr.name) &&
          !FOLDOUT_RULES.optionalAttributes.includes(attr.name)) {
        warnings.push(`${foldoutId}: 属性 '${attr.name}' 不在 S1000D 标准属性列表中`)
      }
    }
  }

  const compliant = errors.length === 0

  return { errors, warnings, info, compliant, foldoutCount: foldouts.length }
}

/**
 * 运行单个测试用例
 */
function runTest(testCase) {
  console.log('\n' + '='.repeat(80))
  console.log(`${testCase.name}`)
  console.log('='.repeat(80))
  console.log(`描述: ${testCase.description}`)
  console.log(`预期结果: ${testCase.expectedCompliant ? '✅ 符合标准' : '❌ 不符合标准'}`)
  console.log()

  // 解析 XML
  const doc = parser.parseFromString(testCase.xml, 'text/xml')

  // 检查解析错误
  const parserErrors = doc.getElementsByTagName('parsererror')
  if (parserErrors.length > 0) {
    console.log('❌ XML 解析错误:')
    console.log(parserErrors[0].textContent)
    return { name: testCase.name, passed: false, compliant: false }
  }

  // 检查合规性
  const result = checkFoldoutCompliance(doc, testCase.name)

  // 输出信息
  if (result.info.length > 0) {
    console.log('ℹ️  信息:')
    result.info.forEach(msg => console.log(`   ${msg}`))
    console.log()
  }

  // 输出警告
  if (result.warnings.length > 0) {
    console.log('⚠️  警告:')
    result.warnings.forEach(msg => console.log(`   ${msg}`))
    console.log()
  }

  // 输出错误
  if (result.errors.length > 0) {
    console.log('❌ 错误:')
    result.errors.forEach(msg => console.log(`   ${msg}`))
    console.log()
  }

  // 判断测试是否通过
  const actualCompliant = result.compliant
  const passed = actualCompliant === testCase.expectedCompliant

  console.log(`实际结果: ${actualCompliant ? '✅ 符合标准' : '❌ 不符合标准'}`)
  console.log(`测试状态: ${passed ? '✅ PASSED' : '❌ FAILED'}`)

  if (!passed) {
    console.log(`\n⚠️  预期 ${testCase.expectedCompliant ? '符合' : '不符合'} 标准，但实际 ${actualCompliant ? '符合' : '不符合'}`)
  }

  return {
    name: testCase.name,
    passed,
    compliant: actualCompliant,
    expectedCompliant: testCase.expectedCompliant,
    errors: result.errors.length,
    warnings: result.warnings.length,
    foldoutCount: result.foldoutCount
  }
}

// ============================================
// 主程序
// ============================================

console.log('╔═══════════════════════════════════════════════════════════════════════════════╗')
console.log('║         foldout 元素 S1000D 4.0 标准符合性检查                                ║')
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝')
console.log()
console.log('📋 测试概述:')
console.log(`   - 测试用例数量: ${TEST_CASES.length}`)
console.log(`   - S1000D 版本: 4.0`)
console.log(`   - 检查重点: foldout 元素的结构、属性、子元素合规性`)
console.log()

// 运行所有测试
const results = TEST_CASES.map(runTest)

// ============================================
// 总结报告
// ============================================

console.log('\n\n' + '═'.repeat(80))
console.log('📊 测试总结报告')
console.log('═'.repeat(80))

const totalTests = results.length
const passedTests = results.filter(r => r.passed).length
const compliantTests = results.filter(r => r.compliant).length
const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)
const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0)

console.log()
console.log(`总测试数:     ${totalTests}`)
console.log(`通过测试:     ${passedTests}/${totalTests} (${(passedTests / totalTests * 100).toFixed(1)}%)`)
console.log(`符合标准:     ${compliantTests}/${totalTests} (${(compliantTests / totalTests * 100).toFixed(1)}%)`)
console.log(`总错误数:     ${totalErrors}`)
console.log(`总警告数:     ${totalWarnings}`)
console.log()

// 失败的测试
const failedTests = results.filter(r => !r.passed)
if (failedTests.length > 0) {
  console.log('❌ 失败的测试:')
  failedTests.forEach(r => {
    console.log(`   - ${r.name}`)
    console.log(`     预期: ${r.expectedCompliant ? '符合' : '不符合'}, 实际: ${r.compliant ? '符合' : '不符合'}`)
  })
  console.log()
}

// ============================================
// 关键发现
// ============================================

console.log('═'.repeat(80))
console.log('🔍 关键发现')
console.log('═'.repeat(80))
console.log()

// 检查 TEST-7 (当前实现)
const currentImplTest = results.find(r => r.name.includes('TEST-7'))
if (currentImplTest && !currentImplTest.compliant) {
  console.log('⚠️  当前实现的问题:')
  console.log('   TEST-7 显示当前实现生成的 XML 包含 HTML <p> 标签')
  console.log('   这不符合 S1000D 4.0 标准')
  console.log()
  console.log('   问题: <foldout id="..."><p>内容</p></foldout>')
  console.log('   应为: <foldout id="..."><para>内容</para></foldout>')
  console.log()
  console.log('   💡 建议: 修改富文本编辑器的输出，将 <p> 转换为 <para>')
  console.log()
}

// 检查 TEST-8 (正确实现)
const correctImplTest = results.find(r => r.name.includes('TEST-8'))
if (correctImplTest && correctImplTest.compliant) {
  console.log('✅ 正确的实现方式:')
  console.log('   TEST-8 显示了符合标准的 XML 结构')
  console.log('   <foldout id="..."><para>内容</para></foldout>')
  console.log()
}

console.log('═'.repeat(80))
console.log('📝 结论')
console.log('═'.repeat(80))
console.log()

if (passedTests === totalTests) {
  console.log('✅ 所有测试通过')
  console.log()
} else {
  console.log(`❌ ${totalTests - passedTests} 个测试失败`)
  console.log()
}

if (currentImplTest && !currentImplTest.compliant) {
  console.log('⚠️  当前 foldout 实现不完全符合 S1000D 4.0 标准')
  console.log('   主要问题: 使用 HTML 标签 <p> 而不是 S1000D 标准的 <para>')
  console.log()
  console.log('   建议的修复优先级: 🔴 高')
  console.log('   影响范围: XML 导出、数据交换、标准符合性')
  console.log()
  process.exit(1)
} else {
  console.log('✅ foldout 实现符合 S1000D 4.0 标准')
  console.log()
  process.exit(0)
}
