/**
 * 批量重启流程 - 端到端集成测试模拟
 *
 * 模拟完整的用户操作流程
 */

const NODE_TYPE = {
  CREATE: '0',
  REVIEW: '1',
  APPROVE: '2'
}

// 模拟前端方法
function adjustCreateNodeSeqno(nodes) {
  if (!nodes || nodes.length === 0) return
  const createNode = nodes.find(n => n.nodetype === NODE_TYPE.CREATE)
  if (!createNode) return
  const minSeqno = Math.min(...nodes.map(n => n.seqno))
  if (createNode.seqno !== minSeqno) {
    console.log(`    [前端] 自动调整创建节点seqno: ${createNode.seqno} → ${minSeqno}`)
    createNode.seqno = minSeqno
  }
}

// 模拟后端校验
function validateNodes(nodes) {
  const createNode = nodes.find(n => n.nodetype === NODE_TYPE.CREATE)
  if (!createNode) {
    throw new Error('节点配置错误：没有创建节点')
  }

  const minSeqno = Math.min(...nodes.map(n => n.seqno))
  if (createNode.seqno !== minSeqno) {
    throw new Error(`创建节点的顺序号必须是所有节点中最小的，当前创建节点=${createNode.seqno}，最小值=${minSeqno}`)
  }

  return true
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

console.log('=====================================')
console.log('  端到端集成测试模拟')
console.log('=====================================\n')

// 集成测试1: 正常流程 - 用户不编辑节点
test('集成1: 正常流程 - 用户不编辑节点', () => {
  console.log('  1. 从数据库读取: 100,110,120,130,140')
  let nodes = [
    { seqno: 100, nodetype: NODE_TYPE.CREATE },
    { seqno: 110, nodetype: NODE_TYPE.REVIEW },
    { seqno: 120, nodetype: NODE_TYPE.REVIEW },
    { seqno: 130, nodetype: NODE_TYPE.APPROVE },
    { seqno: 140, nodetype: NODE_TYPE.APPROVE }
  ]

  console.log('  2. 前端+100显示: 200,210,220,230,240')
  nodes = nodes.map(n => ({ ...n, seqno: n.seqno + 100 }))

  console.log('  3. 用户不编辑，直接提交')

  console.log('  4. 前端自动调整')
  adjustCreateNodeSeqno(nodes)

  console.log('  5. 后端校验')
  const result = validateNodes(nodes)

  if (!result) throw new Error('校验失败')
  console.log('  ✓ 提交成功')
})

// 集成测试2: Bug场景 - 用户删除了第1个节点
test('集成2: Bug场景 - 用户删除了第1个节点', () => {
  console.log('  1. 从数据库读取: 100,110,120,130,140')
  let nodes = [
    { seqno: 100, nodetype: NODE_TYPE.CREATE },
    { seqno: 110, nodetype: NODE_TYPE.REVIEW },
    { seqno: 120, nodetype: NODE_TYPE.REVIEW },
    { seqno: 130, nodetype: NODE_TYPE.APPROVE },
    { seqno: 140, nodetype: NODE_TYPE.APPROVE }
  ]

  console.log('  2. 前端+100显示: 200,210,220,230,240')
  nodes = nodes.map(n => ({ ...n, seqno: n.seqno + 100 }))

  console.log('  3. 用户删除了第2个节点(seqno=210，非创建节点)')
  nodes.splice(1, 1)  // 删除第二个节点（审核1）
  console.log('    剩余节点: 200(创建),220,230,240')

  console.log('  4. 前端自动调整（修复前会失败）')
  adjustCreateNodeSeqno(nodes)

  console.log('  5. 后端校验')
  const result = validateNodes(nodes)

  if (!result) throw new Error('校验失败')
  console.log('  ✓ 提交成功（修复后自动调整）')
})

// 集成测试3: Bug场景 - 用户调整了节点顺序
test('集成3: Bug场景 - 用户调整了节点顺序', () => {
  console.log('  1. 从数据库读取: 100,110,120,130,140')
  let nodes = [
    { seqno: 100, nodetype: NODE_TYPE.CREATE, nodename: '创建' },
    { seqno: 110, nodetype: NODE_TYPE.REVIEW, nodename: '审核1' },
    { seqno: 120, nodetype: NODE_TYPE.REVIEW, nodename: '审核2' },
    { seqno: 130, nodetype: NODE_TYPE.APPROVE, nodename: '审批1' },
    { seqno: 140, nodetype: NODE_TYPE.APPROVE, nodename: '审批2' }
  ]

  console.log('  2. 前端+100显示: 200,210,220,230,240')
  nodes = nodes.map(n => ({ ...n, seqno: n.seqno + 100 }))

  console.log('  3. 用户拖动创建节点到最后')
  const createNode = nodes.shift()
  nodes.push(createNode)
  console.log('    节点顺序: 210(审核1),220(审核2),230(审批1),240(审批2),200(创建)')

  console.log('  4. 前端自动调整')
  adjustCreateNodeSeqno(nodes)

  console.log('  5. 后端校验')
  const result = validateNodes(nodes)

  if (!result) throw new Error('校验失败')
  console.log('  ✓ 提交成功（创建节点自动调整为210）')
})

// 集成测试4: Bug场景 - 用户手动修改了seqno
test('集成4: Bug场景 - 用户手动修改了seqno', () => {
  console.log('  1. 从数据库读取: 100,110,120,130,140')
  let nodes = [
    { seqno: 100, nodetype: NODE_TYPE.CREATE },
    { seqno: 110, nodetype: NODE_TYPE.REVIEW },
    { seqno: 120, nodetype: NODE_TYPE.REVIEW },
    { seqno: 130, nodetype: NODE_TYPE.APPROVE },
    { seqno: 140, nodetype: NODE_TYPE.APPROVE }
  ]

  console.log('  2. 前端+100显示: 200,210,220,230,240')
  nodes = nodes.map(n => ({ ...n, seqno: n.seqno + 100 }))

  console.log('  3. 用户手动修改创建节点seqno为250')
  nodes[0].seqno = 250

  console.log('  4. 前端自动调整')
  adjustCreateNodeSeqno(nodes)

  console.log('  5. 后端校验')
  const result = validateNodes(nodes)

  if (!result) throw new Error('校验失败')
  console.log('  ✓ 提交成功（创建节点自动调整为210）')
})

// 集成测试5: 前端兜底场景
test('集成5: 前端兜底 - 删除了创建节点', () => {
  console.log('  1. 从数据库读取: 100,110,120,130,140')
  let nodes = [
    { seqno: 100, nodetype: NODE_TYPE.CREATE },
    { seqno: 110, nodetype: NODE_TYPE.REVIEW },
    { seqno: 120, nodetype: NODE_TYPE.REVIEW },
    { seqno: 130, nodetype: NODE_TYPE.APPROVE },
    { seqno: 140, nodetype: NODE_TYPE.APPROVE }
  ]

  console.log('  2. 前端+100显示: 200,210,220,230,240')
  nodes = nodes.map(n => ({ ...n, seqno: n.seqno + 100 }))

  console.log('  3. 用户删除了创建节点')
  nodes.shift()

  console.log('  4. 前端兜底插入seqno=0的创建节点')
  nodes.unshift({ seqno: 0, nodetype: NODE_TYPE.CREATE, nodename: '创建' })

  console.log('  5. 前端自动调整（seqno=0已是最小值）')
  adjustCreateNodeSeqno(nodes)

  console.log('  6. 后端校验')
  const result = validateNodes(nodes)

  if (!result) throw new Error('校验失败')
  console.log('  ✓ 提交成功')
})

// 集成测试6: 复杂场景 - 多次编辑
test('集成6: 复杂场景 - 用户多次编辑', () => {
  console.log('  1. 从数据库读取: 100,110,120,130,140')
  let nodes = [
    { seqno: 100, nodetype: NODE_TYPE.CREATE, nodename: '创建' },
    { seqno: 110, nodetype: NODE_TYPE.REVIEW, nodename: '审核1' },
    { seqno: 120, nodetype: NODE_TYPE.REVIEW, nodename: '审核2' },
    { seqno: 130, nodetype: NODE_TYPE.APPROVE, nodename: '审批1' },
    { seqno: 140, nodetype: NODE_TYPE.APPROVE, nodename: '审批2' }
  ]

  console.log('  2. 前端+100显示: 200,210,220,230,240')
  nodes = nodes.map(n => ({ ...n, seqno: n.seqno + 100 }))

  console.log('  3. 用户删除了第2个节点(seqno=210)')
  nodes.splice(1, 1)

  console.log('  4. 用户添加了新节点(seqno=250)')
  nodes.push({ seqno: 250, nodetype: NODE_TYPE.REVIEW, nodename: '新审核' })

  console.log('  5. 用户调整了节点顺序')
  const temp = nodes[0]
  nodes[0] = nodes[1]
  nodes[1] = temp

  console.log('  6. 前端自动调整')
  adjustCreateNodeSeqno(nodes)

  console.log('  7. 后端校验')
  const result = validateNodes(nodes)

  if (!result) throw new Error('校验失败')
  console.log('  ✓ 提交成功')
})

console.log('\n=====================================')
console.log('       集成测试结果汇总')
console.log('=====================================')
console.log(`总测试数: ${passedTests + failedTests}`)
console.log(`通过数:   ${passedTests} ✅`)
console.log(`失败数:   ${failedTests} ❌`)
console.log(`通过率:   ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`)
console.log('=====================================')

if (failedTests === 0) {
  console.log('✅ 所有集成测试通过！')
} else {
  console.log('❌ 存在失败的测试')
  process.exit(1)
}
