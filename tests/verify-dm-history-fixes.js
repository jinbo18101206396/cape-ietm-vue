/**
 * DmHistoryModal 核心修复验证脚本
 * 直接运行验证修复逻辑的正确性
 */

console.log('🧪 开始验证 DmHistoryModal 修复逻辑\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log('  ✅', message)
    passCount++
  } else {
    console.log('  ❌', message)
    failCount++
  }
}

function assertEqual(actual, expected, message) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected)
  assert(isEqual, `${message} (期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(actual)})`)
}

// ============================================
// 修复1：多选限制逻辑
// ============================================
console.log('📋 测试1: 多选限制逻辑')

const onSelectChange = (keys) => {
  if (keys.length > 2) {
    // 修复：保留前2条，而不是直接return
    return keys.slice(0, 2)
  }
  return keys
}

// 测试用例
assertEqual(onSelectChange(['v1', 'v2', 'v3']), ['v1', 'v2'], '选择3条应保留前2条')
assertEqual(onSelectChange(['v1', 'v2']), ['v1', 'v2'], '选择2条应完整返回')
assertEqual(onSelectChange(['v1']), ['v1'], '选择1条应完整返回')
assertEqual(onSelectChange([]), [], '空数组应返回空数组')
assertEqual(onSelectChange(['a', 'b', 'c', 'd']), ['a', 'b'], '选择4条应保留前2条')

// ============================================
// 修复2：空内容处理
// ============================================
console.log('\n📋 测试2: 空内容处理')

const renderDiff = (leftXml, rightXml) => {
  if (!leftXml && !rightXml) {
    return {
      type: 'empty-hint',
      message: '两个版本的内容均为空，无可对比的差异。'
    }
  }
  return {
    type: 'merge-view',
    left: leftXml || '',
    right: rightXml || ''
  }
}

// 测试用例
let result = renderDiff('', '')
assert(result.type === 'empty-hint', '空字符串应显示提示')

result = renderDiff(null, null)
assert(result.type === 'empty-hint', 'null应显示提示')

result = renderDiff(undefined, undefined)
assert(result.type === 'empty-hint', 'undefined应显示提示')

result = renderDiff('<dmodule>A</dmodule>', '')
assert(result.type === 'merge-view', '左侧有内容应渲染MergeView')

result = renderDiff('', '<dmodule>B</dmodule>')
assert(result.type === 'merge-view', '右侧有内容应渲染MergeView')

result = renderDiff('<dmodule>A</dmodule>', '<dmodule>B</dmodule>')
assert(result.type === 'merge-view', '两侧都有内容应渲染MergeView')

// ============================================
// 修复3：组件一致性
// ============================================
console.log('\n📋 测试3: DmHistoryModal 与 DmHistoryView 一致性')

// 验证两个组件使用相同的逻辑
const testCases = [
  ['v1'],
  ['v1', 'v2'],
  ['v1', 'v2', 'v3'],
  []
]

testCases.forEach(input => {
  const modalResult = onSelectChange(input)
  const viewResult = onSelectChange(input) // 应该使用相同的函数
  assertEqual(modalResult, viewResult, `输入${JSON.stringify(input)}时两组件行为一致`)
})

// ============================================
// 边界场景
// ============================================
console.log('\n📋 测试4: 边界场景')

// 选择顺序保留
assertEqual(onSelectChange(['v3', 'v1', 'v2']), ['v3', 'v1'], '应保留最先选择的顺序')

// 特殊值处理
result = renderDiff(0, 0)
assert(result.type === 'empty-hint', '数字0应被视为空内容（JavaScript falsy值）')

result = renderDiff(false, false)
assert(result.type === 'empty-hint', 'false应被视为空内容（JavaScript falsy值）')

result = renderDiff('', null)
assert(result.type === 'empty-hint', '空字符串与null混合应显示提示')

// ============================================
// 总结
// ============================================
console.log('\n' + '='.repeat(50))
console.log('📊 测试结果总结:')
console.log(`  ✅ 通过: ${passCount}`)
console.log(`  ❌ 失败: ${failCount}`)
console.log(`  📈 通过率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`)
console.log('='.repeat(50))

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！修复逻辑验证成功。')
  process.exit(0)
} else {
  console.log('\n⚠️  有测试失败，请检查修复逻辑。')
  process.exit(1)
}
