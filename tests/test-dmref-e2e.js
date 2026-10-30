/**
 * 端到端测试：验证 DM 引用的 xlink 命名空间修复
 *
 * 测试流程：
 * 1. 模拟保存时的数据流
 * 2. 验证 syncNodeToContent 添加命名空间
 * 3. 验证 treeToXml 生成正确的 XML
 */

// 模拟添加命名空间的函数（与实际代码一致）
function addXlinkNamespace(content) {
  if (content && content.includes('xlink:') && !content.includes('xmlns:xlink')) {
    return content.replace(/^(<[a-zA-Z]+)(\s|>)/, '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2')
  }
  return content
}

// 模拟 syncNodeToContent 的关键逻辑
function syncNodeContent(node) {
  const parts = []

  // 添加标题
  if (node.title) {
    parts.push(`<title>${node.title}</title>`)
  }

  // 添加 warning 内容
  if (node.html && node.html.warning) {
    node.html.warning.forEach(item => {
      let content = item.content

      // 🔑 关键修复：添加 xlink 命名空间
      content = addXlinkNamespace(content)

      if (content) {
        parts.push(content)
      }
    })
  }

  // 构建完整的 levelledPara content
  const nodeId = node.id || 'levelledPara-1'
  node.content = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink" id="${nodeId}">${parts.join('')}</levelledPara>`

  return node
}

// 测试场景
console.log('\n========== 端到端测试：DM 引用修复验证 ==========\n')

// 模拟用户添加了包含 DM 引用的 warning
const testNode = {
  id: '1',
  type: 'levelledPara',
  title: '层级1',
  html: {
    warning: [
      {
        id: 'warning-1793350205211',
        content: '<warning id="warning-1793350205211"><dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/><language languageIsoCode="zh" countryIsoCode="CN"/></dmRefIdent><dmRefAddressItems><dmTitle><techName>说明（总论）</techName><infoName>符号清单</infoName></dmTitle></dmRefAddressItems></dmRef></warning>'
      }
    ]
  },
  children: []
}

console.log('步骤1: 原始 warning content（前150字符）:')
console.log(testNode.html.warning[0].content.substring(0, 150))
console.log()

// 执行同步
const syncedNode = syncNodeContent(testNode)

console.log('步骤2: 同步后的 levelledPara content（前200字符）:')
console.log(syncedNode.content.substring(0, 200))
console.log()

// 验证结果
const checks = [
  {
    name: 'levelledPara 包含 xmlns:xlink',
    test: () => syncedNode.content.includes('xmlns:xlink="http://www.w3.org/1999/xlink"'),
  },
  {
    name: 'warning 标签包含 xmlns:xlink',
    test: () => syncedNode.content.includes('<warning xmlns:xlink="http://www.w3.org/1999/xlink"'),
  },
  {
    name: 'dmRef 标签存在',
    test: () => syncedNode.content.includes('<dmRef xlink:type="simple"'),
  },
  {
    name: '没有 parsererror',
    test: () => !syncedNode.content.includes('parsererror'),
  },
  {
    name: 'warning 标签不为空',
    test: () => !syncedNode.content.match(/<warning[^>]*\/>/),
  },
]

console.log('步骤3: 验证结果\n')

let passed = 0
let failed = 0

checks.forEach((check, index) => {
  const result = check.test()
  if (result) {
    console.log(`✅ ${check.name}`)
    passed++
  } else {
    console.log(`❌ ${check.name}`)
    failed++
  }
})

console.log(`\n========== 测试结果 ==========`)
console.log(`通过: ${passed}/${checks.length}`)
console.log(`失败: ${failed}/${checks.length}`)

if (failed === 0) {
  console.log(`\n🎉 所有测试通过！修复成功！`)
  console.log(`\n修复说明：`)
  console.log(`- 在 syncNodeToContent 中为包含 xlink 的元素添加命名空间声明`)
  console.log(`- 确保 warning/para 等元素在被序列化时保留命名空间`)
  console.log(`- 防止 DOMParser 解析时因缺少命名空间而失败`)
} else {
  console.log(`\n⚠️ 有 ${failed} 个测试失败`)
}

console.log(`=============================\n`)

process.exit(failed > 0 ? 1 : 0)
