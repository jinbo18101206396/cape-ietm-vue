/**
 * 批量重启流程 - 边界场景深度测试
 *
 * 测试极端情况和边界条件
 */

const NODE_TYPE = {
  CREATE: '0',
  REVIEW: '1',
  APPROVE: '2'
}

function adjustCreateNodeSeqno(nodes) {
  if (!nodes || nodes.length === 0) {
    return { adjusted: false, reason: '节点列表为空' }
  }

  const createNode = nodes.find(n => n.nodetype === NODE_TYPE.CREATE)
  if (!createNode) {
    return { adjusted: false, reason: '未找到创建节点' }
  }

  const minSeqno = Math.min(...nodes.map(n => n.seqno))
  const oldSeqno = createNode.seqno

  if (createNode.seqno !== minSeqno) {
    createNode.seqno = minSeqno
    return { adjusted: true, oldSeqno, newSeqno: minSeqno }
  }

  return { adjusted: false, reason: '创建节点已是最小值' }
}

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

console.log('=====================================')
console.log('  边界场景深度测试')
console.log('=====================================\n')

// 边界测试1: 极大的节点数量
test('边界1: 100个节点', () => {
  const nodes = []
  for (let i = 1; i <= 100; i++) {
    nodes.push({
      seqno: i * 10,
      nodetype: i === 50 ? NODE_TYPE.CREATE : NODE_TYPE.REVIEW
    })
  }
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[49].seqno, 10, '创建节点应调整为10')
})

// 边界测试2: seqno = Number.MAX_SAFE_INTEGER
test('边界2: 极大seqno值', () => {
  const nodes = [
    { seqno: Number.MAX_SAFE_INTEGER - 1, nodetype: NODE_TYPE.REVIEW },
    { seqno: Number.MAX_SAFE_INTEGER, nodetype: NODE_TYPE.CREATE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, Number.MAX_SAFE_INTEGER - 1, '应调整为MAX-1')
})

// 边界测试3: seqno = Number.MIN_SAFE_INTEGER
test('边界3: 极小seqno值', () => {
  const nodes = [
    { seqno: Number.MIN_SAFE_INTEGER, nodetype: NODE_TYPE.REVIEW },
    { seqno: 0, nodetype: NODE_TYPE.CREATE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, Number.MIN_SAFE_INTEGER, '应调整为MIN')
})

// 边界测试4: 所有节点seqno相同
test('边界4: 所有节点seqno相同', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: 200, nodetype: NODE_TYPE.CREATE },
    { seqno: 200, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(!result.adjusted, '相同值不需要调整')
  assertEquals(nodes[1].seqno, 200, 'seqno应保持200')
})

// 边界测试5: seqno递减序列
test('边界5: seqno递减序列', () => {
  const nodes = [
    { seqno: 300, nodetype: NODE_TYPE.REVIEW },
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: 250, nodetype: NODE_TYPE.CREATE },  // 中间值
    { seqno: 100, nodetype: NODE_TYPE.APPROVE }  // 最小
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[2].seqno, 100, '应调整为100')
})

// 边界测试6: 创建节点有额外属性（确保不影响其他属性）
test('边界6: 保持其他属性不变', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW, nodename: '审核1', userid: 'user1' },
    { seqno: 230, nodetype: NODE_TYPE.CREATE, nodename: '创建', userid: 'admin', extra: 'test' }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, 200, 'seqno应调整')
  assertEquals(nodes[1].nodename, '创建', 'nodename应保持不变')
  assertEquals(nodes[1].userid, 'admin', 'userid应保持不变')
  assertEquals(nodes[1].extra, 'test', 'extra应保持不变')
})

// 边界测试7: NaN seqno
test('边界7: 包含NaN seqno', () => {
  const nodes = [
    { seqno: NaN, nodetype: NODE_TYPE.REVIEW },
    { seqno: 200, nodetype: NODE_TYPE.CREATE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  // Math.min会返回NaN
  assertTrue(result.adjusted, '应该调整')
  assertTrue(isNaN(nodes[1].seqno), 'seqno应为NaN')
})

// 边界测试8: Infinity seqno
test('边界8: 包含Infinity', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: Infinity, nodetype: NODE_TYPE.CREATE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, 200, '应调整为200')
})

// 边界测试9: 混合正负数
test('边界9: 混合正负数', () => {
  const nodes = [
    { seqno: -100, nodetype: NODE_TYPE.REVIEW },
    { seqno: 0, nodetype: NODE_TYPE.REVIEW },
    { seqno: 100, nodetype: NODE_TYPE.CREATE },
    { seqno: 50, nodetype: NODE_TYPE.APPROVE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[2].seqno, -100, '应调整为-100')
})

// 边界测试10: 字符串类型的seqno（类型转换）
test('边界10: 字符串seqno自动转数字', () => {
  const nodes = [
    { seqno: '200', nodetype: NODE_TYPE.REVIEW },
    { seqno: 230, nodetype: NODE_TYPE.CREATE }
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, 200, '应调整为200（字符串转数字）')
})

// 边界测试11: 多个创建节点（应该只调整找到的第一个）
test('边界11: 多个创建节点', () => {
  const nodes = [
    { seqno: 200, nodetype: NODE_TYPE.REVIEW },
    { seqno: 230, nodetype: NODE_TYPE.CREATE },  // 第一个
    { seqno: 240, nodetype: NODE_TYPE.CREATE }   // 第二个
  ]
  const result = adjustCreateNodeSeqno(nodes)
  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[1].seqno, 200, '第一个创建节点应调整')
  assertEquals(nodes[2].seqno, 240, '第二个创建节点不应该调整')
})

// 边界测试12: 性能测试 - 1000个节点
test('边界12: 性能测试 - 1000个节点', () => {
  const nodes = []
  for (let i = 1; i <= 1000; i++) {
    nodes.push({
      seqno: i * 10,
      nodetype: i === 500 ? NODE_TYPE.CREATE : NODE_TYPE.REVIEW
    })
  }

  const startTime = Date.now()
  const result = adjustCreateNodeSeqno(nodes)
  const duration = Date.now() - startTime

  assertTrue(result.adjusted, '应该调整')
  assertEquals(nodes[499].seqno, 10, '创建节点应调整为10')
  assertTrue(duration < 100, `性能应该在100ms内完成，实际${duration}ms`)
  console.log(`   性能: ${duration}ms`)
})

console.log('\n=====================================')
console.log('         边界测试结果汇总')
console.log('=====================================')
console.log(`总测试数: ${passedTests + failedTests}`)
console.log(`通过数:   ${passedTests} ✅`)
console.log(`失败数:   ${failedTests} ❌`)
console.log(`通过率:   ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`)
console.log('=====================================')

if (failedTests === 0) {
  console.log('✅ 所有边界测试通过！')
} else {
  console.log('❌ 存在失败的测试')
  process.exit(1)
}
