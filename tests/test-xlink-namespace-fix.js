/**
 * 测试 xlink 命名空间修复
 * 验证：当 warning/para 等元素包含 xlink 属性时，命名空间声明会被正确添加
 */

// 模拟修复函数
function addXlinkNamespace(content) {
  if (content && content.includes('xlink:') && !content.includes('xmlns:xlink')) {
    return content.replace(/^(<[a-zA-Z]+)(\s|>)/, '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2')
  }
  return content
}

// 测试用例
const testCases = [
  {
    name: '包含 xlink 的 warning 元素',
    input: '<warning id="warning-1"><dmRef xlink:type="simple" xlink:show="replace">test</dmRef></warning>',
    expected: '<warning xmlns:xlink="http://www.w3.org/1999/xlink" id="warning-1"><dmRef xlink:type="simple" xlink:show="replace">test</dmRef></warning>',
  },
  {
    name: '已有命名空间的元素',
    input: '<warning xmlns:xlink="http://www.w3.org/1999/xlink" id="warning-1"><dmRef xlink:type="simple">test</dmRef></warning>',
    expected: '<warning xmlns:xlink="http://www.w3.org/1999/xlink" id="warning-1"><dmRef xlink:type="simple">test</dmRef></warning>',
  },
  {
    name: '不包含 xlink 的元素',
    input: '<warning id="warning-1">普通文本</warning>',
    expected: '<warning id="warning-1">普通文本</warning>',
  },
  {
    name: 'para 元素包含 xlink',
    input: '<para id="para-1"><internalRef xlink:href="#ref1">参考</internalRef></para>',
    expected: '<para xmlns:xlink="http://www.w3.org/1999/xlink" id="para-1"><internalRef xlink:href="#ref1">参考</internalRef></para>',
  },
]

console.log('\n========== 测试 xlink 命名空间修复 ==========\n')

let passed = 0
let failed = 0

testCases.forEach((testCase, index) => {
  const result = addXlinkNamespace(testCase.input)
  const success = result === testCase.expected

  if (success) {
    console.log(`✅ 测试 ${index + 1}: ${testCase.name}`)
    passed++
  } else {
    console.log(`❌ 测试 ${index + 1}: ${testCase.name}`)
    console.log(`   输入: ${testCase.input.substring(0, 100)}`)
    console.log(`   期望: ${testCase.expected.substring(0, 100)}`)
    console.log(`   实际: ${result.substring(0, 100)}`)
    failed++
  }
})

console.log(`\n========== 测试结果 ==========`)
console.log(`通过: ${passed}/${testCases.length}`)
console.log(`失败: ${failed}/${testCases.length}`)
console.log(`=============================\n`)

process.exit(failed > 0 ? 1 : 0)
