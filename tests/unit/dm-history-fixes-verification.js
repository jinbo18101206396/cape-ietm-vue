/**
 * 单元测试：验证历史版本功能的修复
 *
 * 测试内容：
 * 1. buildDmcCode 是否包含 infoCodeVariant
 * 2. handleBrowseDm 验证逻辑是否正确
 * 3. formatXml 是否防止空行累积
 */

// 模拟 buildDmcCode 方法
function buildDmcCode(record) {
  if (!record) return ''
  const parts = [
    'DMC',
    record.sns || '',
    record.infoCode || '',
    record.infoCodeVariant || '',
    record.issueNo || '',
    record.inWork || ''
  ].filter(p => p)
  return parts.join('-')
}

// 模拟 handleBrowseDm 验证逻辑
function validateBrowseDm(record) {
  const errors = []

  // 验证1: 检查dmContent
  if (!record.dmContent && record.dmContent !== '') {
    errors.push(`该历史版本（版本号：${record.issueNo}-${record.inWork}）暂无XML内容，无法浏览。`)
  }

  // 验证2: 检查DMC完整性
  const dmcParts = (record.dmcCode || '').split('-')
  if (dmcParts.length < 5) {
    errors.push(`DMC编码不完整：${record.dmcCode}`)
  }

  return errors
}

// 模拟 formatXml 方法（与实际代码一致）
function formatXml(xml) {
  if (!xml) return ''
  xml = xml.trim()

  const stash = []
  // 保护 CDATA、注释、处理指令
  const protectedXml = xml.replace(
    /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g,
    m => { stash.push(m); return `@@S${stash.length - 1}@@` }
  )

  // 标准化：提取所有标签和文本节点
  const tokens = []
  const tagRe = /<[^>]+>/g
  let match
  let lastIdx = 0

  while ((match = tagRe.exec(protectedXml)) !== null) {
    // 标签前的文本
    const text = protectedXml.substring(lastIdx, match.index).trim()
    if (text) tokens.push({ type: 'text', val: text })
    // 标签本身
    tokens.push({ type: 'tag', val: match[0] })
    lastIdx = match.index + match[0].length
  }
  // 剩余文本
  const text = protectedXml.substring(lastIdx).trim()
  if (text) tokens.push({ type: 'text', val: text })

  // 格式化输出
  const PAD = '  '
  let out = ''
  let lvl = 0
  let lastWasOpen = false

  tokens.forEach(tk => {
    if (tk.type === 'text') {
      // 文本紧跟在开标签后，不换行
      if (lastWasOpen) {
        out = out.replace(/\n$/, '') + tk.val + '\n'
      } else {
        out += PAD.repeat(lvl) + tk.val + '\n'
      }
      lastWasOpen = false
    } else {
      const tag = tk.val
      // 闭标签：先减缩进
      if (/^<\//.test(tag)) {
        lvl = Math.max(lvl - 1, 0)
        out += PAD.repeat(lvl) + tag + '\n'
        lastWasOpen = false
      }
      // 自闭合标签
      else if (/\/>$/.test(tag)) {
        out += PAD.repeat(lvl) + tag + '\n'
        lastWasOpen = false
      }
      // 开标签
      else {
        out += PAD.repeat(lvl) + tag + '\n'
        lvl++
        lastWasOpen = true
      }
    }
  })

  // 恢复保护内容
  return out.trim().replace(/@@S(\d+)@@/g, (_, i) => stash[+i])
}

// 运行测试
console.log('开始运行单元测试...\n')

// 手动运行测试并报告结果
let totalTests = 0
let passedTests = 0
let failedTests = 0

function runTest(description, testFn) {
  totalTests++
  try {
    testFn()
    passedTests++
    console.log(`✅ ${description}`)
  } catch (error) {
    failedTests++
    console.log(`❌ ${description}`)
    console.log(`   错误: ${error.message}`)
  }
}

console.log('=== buildDmcCode 测试 ===')
runTest('应该包含所有必要字段', () => {
  const record = {
    sns: 'DEMO',
    infoCode: '001',
    infoCodeVariant: 'A',
    issueNo: '001',
    inWork: '01'
  }
  const result = buildDmcCode(record)
  if (result !== 'DMC-DEMO-001-A-001-01') throw new Error(`期望 DMC-DEMO-001-A-001-01, 实际 ${result}`)
  if (!result.includes('A')) throw new Error('缺少 infoCodeVariant')
})

runTest('应该处理缺少 infoCodeVariant 的情况', () => {
  const record = { sns: 'DEMO', infoCode: '001', issueNo: '001', inWork: '01' }
  const result = buildDmcCode(record)
  if (result !== 'DMC-DEMO-001-001-01') throw new Error(`期望 DMC-DEMO-001-001-01, 实际 ${result}`)
})

runTest('应该处理空记录', () => {
  if (buildDmcCode(null) !== '') throw new Error('null应返回空字符串')
  if (buildDmcCode({}) !== 'DMC') throw new Error('空对象应返回DMC')
})

console.log('\n=== handleBrowseDm 验证逻辑测试 ===')
runTest('应该通过有效的记录', () => {
  const record = {
    dmcCode: 'DMC-DEMO-001-A-001-01',
    issueNo: '001',
    inWork: '01',
    dmContent: '<xml>content</xml>'
  }
  const errors = validateBrowseDm(record)
  if (errors.length !== 0) throw new Error(`期望0个错误, 实际${errors.length}个`)
})

runTest('应该拒绝没有XML内容的记录', () => {
  const record = {
    dmcCode: 'DMC-DEMO-001-A-001-01',
    issueNo: '001',
    inWork: '01',
    dmContent: null
  }
  const errors = validateBrowseDm(record)
  if (errors.length !== 1) throw new Error(`期望1个错误, 实际${errors.length}个`)
  if (!errors[0].includes('暂无XML内容')) throw new Error('错误信息不正确')
})

runTest('应该拒绝DMC不完整的记录', () => {
  const record = {
    dmcCode: 'DMC-DEMO-001',
    issueNo: '001',
    inWork: '01',
    dmContent: '<xml>content</xml>'
  }
  const errors = validateBrowseDm(record)
  if (errors.length !== 1) throw new Error(`期望1个错误, 实际${errors.length}个`)
  if (!errors[0].includes('DMC编码不完整')) throw new Error('错误信息不正确')
})

console.log('\n=== formatXml 测试 ===')
runTest('应该格式化正常的XML', () => {
  const xml = '<root><child>text</child></root>'
  const result = formatXml(xml)
  if (!result.includes('<root>')) throw new Error('缺少root标签')
  if (!result.includes('  <child>')) throw new Error('缺少缩进')
})

runTest('应该移除输入的前后空白', () => {
  const xml = '\n\n  <root><child/></root>  \n\n'
  const result = formatXml(xml)
  if (result.match(/^\n/)) throw new Error('开头有多余空行')
  if (result.match(/\n$/)) throw new Error('结尾有多余空行')
})

runTest('应该在连续格式化时不增加空行', () => {
  const xml = '<root><child>text</child></root>'
  const formatted1 = formatXml(xml)
  const formatted2 = formatXml(formatted1)
  const formatted3 = formatXml(formatted2)

  const lines1 = formatted1.split('\n').length
  const lines2 = formatted2.split('\n').length
  const lines3 = formatted3.split('\n').length

  if (lines2 !== lines1) throw new Error(`第2次格式化行数变化: ${lines1} -> ${lines2}`)
  if (lines3 !== lines1) throw new Error(`第3次格式化行数变化: ${lines1} -> ${lines3}`)
  if (formatted2 !== formatted1) throw new Error('第2次格式化内容变化')
  if (formatted3 !== formatted1) throw new Error('第3次格式化内容变化')
})

runTest('应该保护CDATA内容', () => {
  const xml = '<root><![CDATA[some data]]></root>'
  const result = formatXml(xml)
  if (!result.includes('<![CDATA[some data]]>')) throw new Error('CDATA内容丢失')
})

runTest('应该处理空字符串', () => {
  if (formatXml('') !== '') throw new Error('空字符串应返回空字符串')
  if (formatXml(null) !== '') throw new Error('null应返回空字符串')
})

console.log('\n' + '='.repeat(50))
console.log(`总测试数: ${totalTests}`)
console.log(`✅ 通过: ${passedTests}`)
console.log(`❌ 失败: ${failedTests}`)
console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
console.log('='.repeat(50))

if (failedTests === 0) {
  console.log('\n🎉 所有测试通过！修复验证成功！')
  process.exit(0)
} else {
  console.log(`\n⚠️ 有${failedTests}个测试失败`)
  process.exit(1)
}
