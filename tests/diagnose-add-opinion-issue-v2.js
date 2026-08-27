/**
 * 追加意见功能 - 处理人校验失败深度诊断 v2
 *
 * 问题：用户选择了处理人为自己的节点，但仍提示"请选择一个处理人为自己的节点"
 *
 * 排查方向：
 * 1. 类型不匹配（数字 vs 字符串）- 已在v1修复
 * 2. userid 字段为空或格式异常
 * 3. 多处理人场景下的分隔符问题
 * 4. currentUserId/currentUsername 为空
 * 5. Vuex store 未正确初始化
 * 6. 节点数据未正确加载
 * 7. 事件冒泡导致 selectedNode 被重置
 * 8. 缓存问题导致校验逻辑失效
 */

const assert = require('assert')

// 模拟 isCurrentUserNode 方法（已修复版本）
function isCurrentUserNode(node, currentUserId, currentUsername) {
  if (!node || !node.userid) return false
  const userids = node.userid.split(',').map(u => u.trim()).filter(u => u)
  const currentUserIdStr = String(currentUserId || '')
  const currentUsernameStr = String(currentUsername || '')
  return userids.includes(currentUserIdStr) || userids.includes(currentUsernameStr)
}

console.log('========================================')
console.log('追加意见功能 - 深度诊断 v2')
console.log('========================================\n')

// ========================================
// 场景1: 类型不匹配（v1已修复）
// ========================================
console.log('【场景1】类型不匹配场景（应已修复）')
const test1Cases = [
  {
    name: '字符串ID vs 数字ID',
    node: { userid: '1825043362301001729', ifexec: 'Y', seqno: 1 },
    currentUserId: 1825043362301001729,
    currentUsername: 'admin',
    expected: true
  },
  {
    name: '多处理人 - 数字ID在中间',
    node: { userid: '111,222,333', ifexec: 'Y', seqno: 1 },
    currentUserId: 222,
    currentUsername: 'admin',
    expected: true
  }
]

test1Cases.forEach((tc, i) => {
  const result = isCurrentUserNode(tc.node, tc.currentUserId, tc.currentUsername)
  const status = result === tc.expected ? '✅ 通过' : '❌ 失败'
  console.log(`  ${i + 1}. ${tc.name}: ${status}`)
  if (result !== tc.expected) {
    console.log(`     预期: ${tc.expected}, 实际: ${result}`)
  }
})
console.log()

// ========================================
// 场景2: userid 字段异常
// ========================================
console.log('【场景2】userid 字段异常场景')
const test2Cases = [
  {
    name: 'userid 为空字符串',
    node: { userid: '', ifexec: 'Y', seqno: 1 },
    currentUserId: '123',
    currentUsername: 'admin',
    expected: false,
    reason: 'userid为空时应返回false'
  },
  {
    name: 'userid 为纯空格',
    node: { userid: '   ', ifexec: 'Y', seqno: 1 },
    currentUserId: '123',
    currentUsername: 'admin',
    expected: false,
    reason: 'trim后为空应返回false'
  },
  {
    name: 'userid 包含空项（多个逗号）',
    node: { userid: '111,,222', ifexec: 'Y', seqno: 1 },
    currentUserId: '222',
    currentUsername: 'admin',
    expected: true,
    reason: 'filter(u => u)应过滤空项'
  },
  {
    name: 'userid 为 null',
    node: { userid: null, ifexec: 'Y', seqno: 1 },
    currentUserId: '123',
    currentUsername: 'admin',
    expected: false,
    reason: 'null应被安全处理'
  },
  {
    name: 'userid 为 undefined',
    node: { userid: undefined, ifexec: 'Y', seqno: 1 },
    currentUserId: '123',
    currentUsername: 'admin',
    expected: false,
    reason: 'undefined应被安全处理'
  },
  {
    name: 'userid 包含前后空格',
    node: { userid: ' 123 , 456 ', ifexec: 'Y', seqno: 1 },
    currentUserId: '123',
    currentUsername: 'admin',
    expected: true,
    reason: 'trim()应处理空格'
  }
]

test2Cases.forEach((tc, i) => {
  try {
    const result = isCurrentUserNode(tc.node, tc.currentUserId, tc.currentUsername)
    const status = result === tc.expected ? '✅ 通过' : '❌ 失败'
    console.log(`  ${i + 1}. ${tc.name}: ${status}`)
    if (result !== tc.expected) {
      console.log(`     预期: ${tc.expected}, 实际: ${result}`)
      console.log(`     原因: ${tc.reason}`)
    }
  } catch (e) {
    console.log(`  ${i + 1}. ${tc.name}: ❌ 抛出异常`)
    console.log(`     错误: ${e.message}`)
  }
})
console.log()

// ========================================
// 场景3: currentUserId/currentUsername 异常
// ========================================
console.log('【场景3】当前用户信息异常场景')
const test3Cases = [
  {
    name: 'currentUserId 为 null',
    node: { userid: '123', ifexec: 'Y', seqno: 1 },
    currentUserId: null,
    currentUsername: 'admin',
    expected: false,
    reason: 'ID为null且用户名不匹配应返回false'
  },
  {
    name: 'currentUserId 为 undefined',
    node: { userid: '123', ifexec: 'Y', seqno: 1 },
    currentUserId: undefined,
    currentUsername: 'admin',
    expected: false,
    reason: 'ID为undefined且用户名不匹配应返回false'
  },
  {
    name: '用户名匹配（ID为null）',
    node: { userid: 'admin,user2', ifexec: 'Y', seqno: 1 },
    currentUserId: null,
    currentUsername: 'admin',
    expected: true,
    reason: '用户名匹配应成功'
  },
  {
    name: '两者都为空',
    node: { userid: '123', ifexec: 'Y', seqno: 1 },
    currentUserId: null,
    currentUsername: null,
    expected: false,
    reason: '当前用户信息都为空应返回false'
  },
  {
    name: 'currentUserId 为空字符串',
    node: { userid: '123', ifexec: 'Y', seqno: 1 },
    currentUserId: '',
    currentUsername: 'admin',
    expected: false,
    reason: 'String("")会返回空字符串，不应匹配'
  }
]

test3Cases.forEach((tc, i) => {
  const result = isCurrentUserNode(tc.node, tc.currentUserId, tc.currentUsername)
  const status = result === tc.expected ? '✅ 通过' : '❌ 失败'
  console.log(`  ${i + 1}. ${tc.name}: ${status}`)
  if (result !== tc.expected) {
    console.log(`     预期: ${tc.expected}, 实际: ${result}`)
    console.log(`     原因: ${tc.reason}`)
    console.log(`     当前用户ID: ${tc.currentUserId} (类型: ${typeof tc.currentUserId})`)
    console.log(`     当前用户名: ${tc.currentUsername} (类型: ${typeof tc.currentUsername})`)
  }
})
console.log()

// ========================================
// 场景4: 特殊字符和边界情况
// ========================================
console.log('【场景4】特殊字符和边界情况')
const test4Cases = [
  {
    name: 'userid 包含中文逗号',
    node: { userid: '111，222', ifexec: 'Y', seqno: 1 },
    currentUserId: '222',
    currentUsername: 'admin',
    expected: false,
    reason: '中文逗号不会被split，整个字符串作为一个userid'
  },
  {
    name: 'userid 包含分号',
    node: { userid: '111;222', ifexec: 'Y', seqno: 1 },
    currentUserId: '222',
    currentUsername: 'admin',
    expected: false,
    reason: '分号不会被split，整个字符串作为一个userid'
  },
  {
    name: 'userid 末尾有逗号',
    node: { userid: '111,222,', ifexec: 'Y', seqno: 1 },
    currentUserId: '222',
    currentUsername: 'admin',
    expected: true,
    reason: 'filter会过滤末尾空串'
  },
  {
    name: 'userid 开头有逗号',
    node: { userid: ',111,222', ifexec: 'Y', seqno: 1 },
    currentUserId: '222',
    currentUsername: 'admin',
    expected: true,
    reason: 'filter会过滤开头空串'
  }
]

test4Cases.forEach((tc, i) => {
  const result = isCurrentUserNode(tc.node, tc.currentUserId, tc.currentUsername)
  const status = result === tc.expected ? '✅ 通过' : '❌ 失败'
  console.log(`  ${i + 1}. ${tc.name}: ${status}`)
  if (result !== tc.expected) {
    console.log(`     预期: ${tc.expected}, 实际: ${result}`)
    console.log(`     原因: ${tc.reason}`)
    const userids = tc.node.userid.split(',').map(u => u.trim()).filter(u => u)
    console.log(`     解析后的userids: [${userids.map(u => `"${u}"`).join(', ')}]`)
  }
})
console.log()

// ========================================
// 诊断建议
// ========================================
console.log('========================================')
console.log('诊断建议')
console.log('========================================')
console.log(`
如果用户遇到"请选择一个处理人为自己的节点"错误，请按以下步骤诊断：

1. 【前端控制台查看日志】
   打开浏览器开发者工具（F12），查看控制台输出：
   - [追加意见] 选中节点: {...}
   - [追加意见] 当前用户ID: xxx (类型: ...)
   - [追加意见] 当前用户名: xxx (类型: ...)
   - [追加意见] 节点处理人(userid): xxx (类型: ...)
   - [追加意见] 处理人校验结果: false

2. 【重点检查项】
   a) node.userid 是否为空/null/undefined
   b) currentUserId 和 currentUsername 是否都为空
   c) 类型是否不匹配（虽然已修复，但可能有缓存问题）
   d) userid 是否包含特殊字符（中文逗号、分号等）

3. 【常见原因】
   ✅ userid字段后端未返回 → 检查后端API
   ✅ Vuex store未初始化 → 刷新页面重新登录
   ✅ 选中了错误的节点 → 确认选中的是已处理且处理人为自己的节点
   ✅ 浏览器缓存问题 → 清除缓存或强制刷新（Ctrl+F5）
   ✅ 多处理人字段格式错误 → 检查后端数据

4. 【后端数据检查】
   执行SQL查询：
   SELECT id, nodename, userid, ifexec, seqno
   FROM wf_instance_dtl
   WHERE instid = '<流程实例ID>'
   ORDER BY seqno;

   确认：
   - userid 字段不为空
   - userid 包含当前登录用户的ID或用户名
   - ifexec = 'Y'（已处理）
   - seqno > 0（非创建节点）

5. 【紧急修复】
   如果确认是前端缓存问题，可尝试：
   - 清除浏览器缓存
   - 退出重新登录
   - 使用隐私模式/无痕模式访问

6. 【提供诊断信息】
   如果问题仍未解决，请提供：
   - 控制台完整日志截图
   - 选中节点的完整数据（console.log输出）
   - 当前用户信息（去敏后）
   - 后端API返回的原始数据
`)

console.log('========================================')
console.log('测试完成')
console.log('========================================')
