/**
 * Para设计器缩进不一致修复验证（手动测试脚本）
 *
 * 修复11和修复12的逻辑验证
 *
 * 运行方式：在浏览器控制台中复制粘贴执行
 */

// 模拟CodeMirror编辑器
const mockEditor = {
  lines: [],

  lineCount() {
    return this.lines.length
  },

  getLine(n) {
    return this.lines[n] || null
  },

  setLines(lines) {
    this.lines = lines
  }
}

// 模拟修复前的搜索逻辑（有bug）
function searchEndTagOld(editor, startLine, paraName, beginidx) {
  let endline = -1

  for (let i = startLine; i < editor.lineCount(); i++) {
    const str = editor.getLine(i)
    const closingTagIdx = str.indexOf(`</${paraName}>`)
    const indentIdx = str.indexOf('<')

    // ❌ Bug: 严格要求缩进完全相等
    if (closingTagIdx > -1 && beginidx === indentIdx) {
      endline = i
      break
    }
  }

  return endline
}

// 模拟修复后的搜索逻辑（已修复）
function searchEndTagNew(editor, startLine, paraName, beginidx) {
  let endline = -1

  // 第一轮：严格匹配（缩进 <= beginidx）
  for (let i = startLine; i < editor.lineCount(); i++) {
    const str = editor.getLine(i)
    const closingTagIdx = str.indexOf(`</${paraName}>`)
    const indentIdx = str.indexOf('<')

    // ✅ 修复：允许结束标签缩进 <= 开始标签缩进
    if (closingTagIdx > -1 && indentIdx <= beginidx) {
      endline = i
      console.log(`  ✓ 第一轮匹配成功: 行${i}, 缩进${indentIdx}`)
      break
    }
  }

  // 第二轮：兜底匹配（如果第一轮没找到，放弃缩进检查）
  if (endline === -1) {
    console.log(`  ⚠️  第一轮匹配失败，启动兜底匹配`)
    for (let i = startLine; i < editor.lineCount(); i++) {
      const str = editor.getLine(i)
      if (str.indexOf(`</${paraName}>`) > -1) {
        endline = i
        console.log(`  ✓ 兜底匹配成功: 行${i}`)
        break
      }
    }
  }

  return endline
}

// 测试用例
const testCases = [
  {
    name: 'TC-01: 结束标签缩进等于开始标签（正常情况）',
    lines: [
      '    <para id="test1">',
      '      <emphasis>内容</emphasis>',
      '    </para>',
      '    <title>下一个元素</title>'
    ],
    startLine: 0,
    beginidx: 4,
    expectedOld: 2,
    expectedNew: 2
  },
  {
    name: 'TC-02: 结束标签缩进小于开始标签（左对齐）- BUG场景',
    lines: [
      '      <para id="test2">',
      '        <emphasis>内容</emphasis>',
      '    </para>',  // 缩进4 < 开始标签缩进6
      '    <title>下一个元素</title>'
    ],
    startLine: 0,
    beginidx: 6,
    expectedOld: -1,  // ❌ 旧逻辑：6 !== 4，找不到结束标签
    expectedNew: 2    // ✅ 新逻辑：4 <= 6，第一轮匹配成功
  },
  {
    name: 'TC-03: 结束标签缩进大于开始标签（异常）- BUG场景',
    lines: [
      '    <para id="test3">',
      '      <emphasis>内容</emphasis>',
      '        </para>',  // 缩进8 > 开始标签缩进4
      '    <title>下一个元素</title>'
    ],
    startLine: 0,
    beginidx: 4,
    expectedOld: -1,  // ❌ 旧逻辑：4 !== 8，找不到结束标签
    expectedNew: 2    // ✅ 新逻辑：第一轮失败，兜底匹配成功
  },
  {
    name: 'TC-04: 极端缩进不一致 - BUG场景',
    lines: [
      '      <para id="test4">',
      '        <emphasis>内容</emphasis>',
      '  </para>',  // 缩进2 < 开始标签缩进6（极端左对齐）
      '    <title>下一个元素</title>'
    ],
    startLine: 0,
    beginidx: 6,
    expectedOld: -1,  // ❌ 旧逻辑：6 !== 2，找不到结束标签
    expectedNew: 2    // ✅ 新逻辑：2 <= 6，第一轮匹配成功
  },
  {
    name: 'TC-05: 多个para连续（验证不会误匹配）',
    lines: [
      '    <para id="test5a">',
      '      <emphasis>Para A</emphasis>',
      '    </para>',
      '    <para id="test5b">',
      '      <emphasis>Para B</emphasis>',
      '    </para>',
      '    <title>下一个元素</title>'
    ],
    startLine: 0,
    beginidx: 4,
    expectedOld: 2,
    expectedNew: 2
  }
]

// 执行测试
console.log('========================================')
console.log('Para设计器缩进修复验证')
console.log('========================================\n')

let passedOld = 0
let passedNew = 0
let totalTests = testCases.length

testCases.forEach((testCase, index) => {
  console.log(`\n【测试 ${index + 1}/${totalTests}】${testCase.name}`)
  console.log('XML结构:')
  testCase.lines.forEach((line, i) => {
    console.log(`  ${i}: ${JSON.stringify(line)}`)
  })

  mockEditor.setLines(testCase.lines)

  // 测试旧逻辑
  console.log('\n🔴 旧逻辑（修复前）:')
  const resultOld = searchEndTagOld(mockEditor, testCase.startLine, 'para', testCase.beginidx)
  const passOld = resultOld === testCase.expectedOld
  console.log(`  结果: endline=${resultOld}`)
  console.log(`  预期: endline=${testCase.expectedOld}`)
  console.log(`  ${passOld ? '✅ PASS' : '❌ FAIL'}`)
  if (passOld) passedOld++

  // 测试新逻辑
  console.log('\n🟢 新逻辑（修复后）:')
  const resultNew = searchEndTagNew(mockEditor, testCase.startLine, 'para', testCase.beginidx)
  const passNew = resultNew === testCase.expectedNew
  console.log(`  结果: endline=${resultNew}`)
  console.log(`  预期: endline=${testCase.expectedNew}`)
  console.log(`  ${passNew ? '✅ PASS' : '❌ FAIL'}`)
  if (passNew) passedNew++

  console.log(`\n${'='.repeat(60)}`)
})

// 汇总结果
console.log('\n\n========================================')
console.log('测试结果汇总')
console.log('========================================')
console.log(`旧逻辑（修复前）: ${passedOld}/${totalTests} 通过 (${(passedOld/totalTests*100).toFixed(1)}%)`)
console.log(`新逻辑（修复后）: ${passedNew}/${totalTests} 通过 (${(passedNew/totalTests*100).toFixed(1)}%)`)

if (passedNew === totalTests) {
  console.log('\n✅ 所有测试通过！修复成功！')
} else {
  console.log(`\n❌ 仍有 ${totalTests - passedNew} 个测试失败，需要继续修复`)
}

console.log('\n预期改进:')
console.log(`  修复前失败: ${totalTests - passedOld} 个场景`)
console.log(`  修复后失败: ${totalTests - passedNew} 个场景`)
console.log(`  改进率: ${((passedNew - passedOld) / totalTests * 100).toFixed(1)}%`)
