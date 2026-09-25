/**
 * 批量重启流程 - adjustCreateNodeSeqno逻辑测试
 *
 * 测试修复后的前端逻辑是否正确
 */

// 模拟NODE_TYPE常量
const NODE_TYPE = {
  CREATE: '0',
  REVIEW: '1',
  APPROVE: '2'
}

// 模拟adjustCreateNodeSeqno方法（复制自前端）
function adjustCreateNodeSeqno(nodes) {
  if (!nodes || nodes.length === 0) {
    return { adjusted: false, reason: '节点列表为空' }
  }

  // 1. 找到创建节点
  const createNode = nodes.find(n => n.nodetype === NODE_TYPE.CREATE)
  if (!createNode) {
    return { adjusted: false, reason: '未找到创建节点' }
  }

  // 2. 计算所有节点中的最小seqno
  const minSeqno = Math.min(...nodes.map(n => n.seqno))

  // 3. 如果创建节点的seqno不是最小值，自动调整
  const oldSeqno = createNode.seqno
  if (createNode.seqno !== minSeqno) {
    createNode.seqno = minSeqno
    return { adjusted: true, oldSeqno, newSeqno: minSeqno }
  }

  return { adjusted: false, reason: '创建节点已是最小值' }
}

// 测试用例
const tests = []
let passedTests = 0
let failedTests = 0

function test(name, testFn) {
  try {
    testFn()
    console.log(`✅ ${name}`)
    passedTests++
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   错误: ${error.message}`)
    failedTests++
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: 期望 ${expected}, 实际 ${actual}`)
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(message)
  }
}

console.log('=====================================')
console.log('  adjustCreateNodeSeqno 逻辑测试')
console.log('=====================================\n')

// 测试1: 空数组
test('测试1: 空数组', () => {
  const result = adjustCreateNodeSeqno([])
  assertFalse(result.adjusted, '空数组不应该调整')
  assertEquals(result.reason, '节点列表为空', '应返回正确的原因')
})

// 测试2: null输入
test('测试2: null输入', () => {
  const result = adjustCreateNodeSeqno(null)
  assertFalse(result.adjusted, 'null不应该调整')
})

// 测试3: 无创建节点
test('测试3: 无创建节点', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: 210, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertFalse(result.adjusted, '无创建节点不应该调整')
  assertEquals(result.reason, '未找到创建节点', '应返回正确的原因')
})

// 测试4: 创建节点已是最小值（正常情况）
test('测试4: 创建节点已是最小值', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.CREATE },
    { seqno: 210, nodetype: NODE_TYPE.REVIEW },
    { seqno: 220, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertFalse(result.adjusted, '已是最小值不需要调整')
  assertEquals(nodes[0].seqno, 200, 'seqno不应该改变')
})

// 测试5: 创建节点不是最小值 - 需要调整（Bug场景）
test('测试5: 创建节点不是最小值 - 需要调整', () => {
  const nodes = [
    { seqno: 210, nodetype: NODE_TYPE.REVIEW },  // 最小值
    { seqno: 220, nodetype: NODE_TYPE.CREATE },   // 创建节点
    { seqno: 230, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该进行调整')
  assertEquals(result.oldSeqno, 220, '旧值应为220')
  assertEquals(result.newSeqno, 210, '新值应为210')
  assertEquals(nodes[1].seqno, 210, 'seqno应该被调整为210')
})

// 测试6: 删除了第1个节点的场景
test('测试6: 删除了第1个节点', () => {
  const nodes = [
    { seqno: 210, nodetype: NODE_TYPE.REVIEW },  // 删除了200
    { seqno: 220, nodetype: NODE_TYPE.CREATE },
    { seqno: 230, nodetype: NODE_TYPE.REVIEW }
  ]
  const originalSeqno = nodes[1].seqno
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, 210, '创建节点应调整为210')
  assertTrue(originalSeqno !== nodes[1].seqno, 'seqno应该改变')
})

// 测试7: 创建节点在最后
test('测试7: 创建节点在最后', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: 210, nodetype: NODE_TYPE.APPROVE },
    { seqno: 230, nodetype: NODE_TYPE.CREATE }   // 最后
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[2].seqno, 200, '创建节点应调整为200')
})

// 测试8: 只有创建节点
test('测试8: 只有创建节点', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.CREATE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertFalse(result.adjusted, '只有一个节点不需要调整')
  assertEquals(nodes[0].seqno, 200, 'seqno不应该改变')
})

// 测试9: 创建节点seqno=0（前端兜底场景）
test('测试9: 创建节点seqno=0', () => {
  const nodes = [
    { seqno: 0, nodetype: NODE_TYPE.CREATE },    // 前端兜底插入
    { seqno: 210, nodetype: NODE_TYPE.REVIEW },
    { seqno: 220, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertFalse(result.adjusted, '0已是最小值')
  assertEquals(nodes[0].seqno, 0, 'seqno应保持0')
})

// 测试10: 多个节点，创建节点在中间
test('测试10: 多个节点，创建节点在中间', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: 210, nodetype: NODE_TYPE.REVIEW },
    { seqno: 220, nodetype: NODE_TYPE.CREATE },   // 中间
    { seqno: 230, nodetype: NODE_TYPE.APPROVE },
    { seqno: 240, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[2].seqno, 200, '创建节点应调整为200')
})

// 测试11: 负数seqno
test('测试11: 负数seqno', () => {
  const nodes = [
    { seqno: -10, nodetype: NODE_TYPE.REVIEW },  // 负数
    { seqno: 0, nodetype: NODE_TYPE.CREATE },
    { seqno: 10, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, -10, '创建节点应调整为-10')
})

// 测试12: 大数值seqno
test('测试12: 大数值seqno', () => {
  const nodes = [
    { seqno: 1000, nodetype: NODE_TYPE.REVIEW },
    { seqno: 2000, nodetype: NODE_TYPE.CREATE },
    { seqno: 3000, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, 1000, '创建节点应调整为1000')
})

// 测试13: 用户报告的真实场景
test('测试13: 用户报告的真实场景', () => {
  // 第2次重启，删除了seqno=200的节点
  const nodes = [
    { seqno: 210, nodetype: NODE_TYPE.REVIEW },  // 最小值
    { seqno: 220, nodetype: NODE_TYPE.REVIEW },
    { seqno: 230, nodetype: NODE_TYPE.CREATE },  // 用户报告：创建节点=230，最小值=200
    { seqno: 240, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(result.oldSeqno, 230, '旧值应为230')
  assertEquals(result.newSeqno, 210, '新值应为210（修正后）')
  assertEquals(nodes[2].seqno, 210, '创建节点应调整为210')
})

// 测试14: 相同seqno（边界情况）
test('测试14: 多个节点有相同seqno', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: 200, nodetype: NODE_TYPE.CREATE },   // 相同
    { seqno: 210, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertFalse(result.adjusted, '相同值不需要调整')
  assertEquals(nodes[1].seqno, 200, 'seqno应保持200')
})

// 测试15: 浮点数seqno
test('测试15: 浮点数seqno', () => {
  const nodes = [
    { seqno: 200.5, nodetype: NODE_TYPE.REVIEW },
    { seqno: 210, nodetype: NODE_TYPE.CREATE },
    { seqno: 220, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, 200.5, '创建节点应调整为200.5')
})

console.log('\n=====================================')
console.log('           测试结果汇总')
console.log('=====================================')
console.log(`总测试数: ${passedTests + failedTests}`)
console.log(`通过数:   ${passedTests} ✅`)
console.log(`失败数:   ${failedTests} ❌`)
console.log(`通过率:   ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`)
console.log('=====================================')

if (failedTests === 0) {
  console.log('✅ 所有逻辑测试通过！')
} else {
  console.log('❌ 存在失败的测试，请检查！')
  process.exit(1)
}
