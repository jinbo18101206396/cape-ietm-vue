/**
 * 追加意见功能 - 处理人校验问题诊断脚本
 *
 * 问题描述：
 * 用户在"追加意见"弹出框中点击"确定"时，系统提示"请选择一个处理人为自己的节点"，
 * 但用户已经选择了处理人为自己的节点。
 *
 * 可能原因分析：
 * 1. node.userid 字段格式问题（逗号分隔的多个用户ID）
 * 2. currentUserId 与 node.userid 数据类型不匹配（字符串 vs 数字）
 * 3. currentUsername 与 node.userid 比较逻辑问题
 * 4. node.userid 为空或null
 * 5. 大小写敏感问题
 * 6. 前后空格问题
 */

console.log('=============================================')
console.log('追加意见 - 处理人校验诊断')
console.log('=============================================\n')

// 模拟 isCurrentUserNode 方法
function isCurrentUserNode(node, currentUserId, currentUsername) {
  console.log('--- 开始校验 ---')
  console.log('节点数据:', JSON.stringify(node, null, 2))
  console.log('当前用户ID:', currentUserId, '(类型:', typeof currentUserId, ')')
  console.log('当前用户名:', currentUsername, '(类型:', typeof currentUsername, ')')

  if (!node || !node.userid) {
    console.log('❌ 校验失败: node 或 node.userid 为空')
    return false
  }

  console.log('node.userid 原始值:', node.userid, '(类型:', typeof node.userid, ')')

  const userids = node.userid.split(',').map(u => u.trim()).filter(u => u)
  console.log('处理后的 userids 数组:', userids)

  const matchById = userids.includes(currentUserId)
  const matchByName = userids.includes(currentUsername)

  console.log('按ID匹配:', matchById)
  console.log('按用户名匹配:', matchByName)

  const result = matchById || matchByName
  console.log(result ? '✅ 校验通过' : '❌ 校验失败')
  console.log('--- 结束校验 ---\n')

  return result
}

// 测试场景
const testCases = [
  {
    desc: '场景1: 字符串ID vs 字符串userid (正常)',
    node: { userid: '1234567890123456789', nodename: '审批节点' },
    currentUserId: '1234567890123456789',
    currentUsername: 'admin',
    expected: true
  },
  {
    desc: '场景2: 数字ID vs 字符串userid (类型不匹配)',
    node: { userid: '1234567890123456789', nodename: '审批节点' },
    currentUserId: 1234567890123456789,  // 数字类型
    currentUsername: 'admin',
    expected: false  // 会失败，因为类型不匹配
  },
  {
    desc: '场景3: 多个处理人（逗号分隔）',
    node: { userid: 'user1,user2,user3', nodename: '审批节点' },
    currentUserId: 'user2',
    currentUsername: 'admin',
    expected: true
  },
  {
    desc: '场景4: 带空格的userid',
    node: { userid: ' user1 , user2 , user3 ', nodename: '审批节点' },
    currentUserId: 'user2',
    currentUsername: 'admin',
    expected: true
  },
  {
    desc: '场景5: 按用户名匹配',
    node: { userid: 'admin,user2', nodename: '审批节点' },
    currentUserId: '999',
    currentUsername: 'admin',
    expected: true
  },
  {
    desc: '场景6: userid为空',
    node: { userid: '', nodename: '创建节点' },
    currentUserId: '1234567890123456789',
    currentUsername: 'admin',
    expected: false
  },
  {
    desc: '场景7: userid为null',
    node: { userid: null, nodename: '未分配节点' },
    currentUserId: '1234567890123456789',
    currentUsername: 'admin',
    expected: false
  },
  {
    desc: '场景8: 雪花ID (19位数字字符串)',
    node: { userid: '1825043362301001729', nodename: '审批节点' },
    currentUserId: '1825043362301001729',
    currentUsername: 'admin',
    expected: true
  },
  {
    desc: '场景9: 雪花ID (数字类型 - 精度丢失)',
    node: { userid: '1825043362301001729', nodename: '审批节点' },
    currentUserId: 1825043362301001729,  // 超过 Number.MAX_SAFE_INTEGER
    currentUsername: 'admin',
    expected: false  // 会失败，因为精度丢失
  },
  {
    desc: '场景10: 用户名大小写不匹配',
    node: { userid: 'Admin', nodename: '审批节点' },
    currentUserId: '999',
    currentUsername: 'admin',
    expected: false  // 大小写敏感
  },
]

// 执行测试
let passed = 0
let failed = 0

testCases.forEach((tc, index) => {
  console.log(`\n==================== ${tc.desc} ====================`)
  const result = isCurrentUserNode(tc.node, tc.currentUserId, tc.currentUsername)
  const status = result === tc.expected ? '✅ PASS' : '❌ FAIL'

  if (result === tc.expected) {
    passed++
  } else {
    failed++
    console.log(`🔴 预期: ${tc.expected}, 实际: ${result}`)
  }

  console.log(`${status}`)
})

console.log('\n=============================================')
console.log(`测试结果: ${passed}/${testCases.length} 通过`)
if (failed > 0) {
  console.log(`❌ ${failed} 个场景失败`)
}
console.log('=============================================\n')

// 诊断建议
console.log('【诊断建议】')
console.log('1. 检查浏览器控制台，查看选中节点的实际数据:')
console.log('   在 showAddOpinionModal() 方法中添加: console.log("selectedNode:", this.selectedNode)')
console.log('   在 showAddOpinionModal() 方法中添加: console.log("currentUserId:", this.currentUserId)')
console.log('   在 showAddOpinionModal() 方法中添加: console.log("currentUsername:", this.currentUsername)')
console.log('')
console.log('2. 常见问题及解决方案:')
console.log('   - 如果 currentUserId 是数字类型，改为字符串: String(userInfo.id)')
console.log('   - 如果 node.userid 为空，检查后端是否正确返回处理人ID')
console.log('   - 如果是雪花ID精度问题，确保后端以字符串形式返回ID')
console.log('   - 如果大小写问题，使用 toLowerCase() 统一转换')
console.log('')
console.log('3. 快速修复方案（如果是类型问题）:')
console.log('   修改 isCurrentUserNode 方法:')
console.log('   const userids = node.userid.split(",").map(u => String(u).trim()).filter(u => u)')
console.log('   return userids.includes(String(this.currentUserId)) || userids.includes(String(this.currentUsername))')
