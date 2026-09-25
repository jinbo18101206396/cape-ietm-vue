/**
 * CRITICAL Bug验证脚本
 * 直接运行验证td内多个para的修复
 */

// 手动复制html2para的关键逻辑进行测试
function testCriticalFix() {
  console.log('=== CRITICAL Bug修复验证 ===\n')

  // 测试用例1: td内单个para
  console.log('测试1: td内单个para')
  testSinglePara()

  // 测试用例2: td内多个para (CRITICAL)
  console.log('\n测试2: td内多个para (CRITICAL)')
  testMultiplePara()

  // 测试用例3: td内三个para
  console.log('\n测试3: td内三个para')
  testThreePara()

  console.log('\n=== 验证完成 ===')
}

function testSinglePara() {
  const input = '<td><para>定义A</para></td>'

  // 模拟修复后的正则 - 使用+量词匹配一个或多个para
  const regex1 = /<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g
  const match1 = regex1.exec(input)

  if (match1) {
    const result = '<listItemDefinition>' + match1[2] + '</listItemDefinition>'
    console.log('输入:', input)
    console.log('输出:', result)

    if (result.includes('</td>')) {
      console.log('❌ 失败: 仍有残留</td>标签')
    } else {
      console.log('✅ 通过: 无残留标签')
    }
  } else {
    console.log('❌ 正则未匹配')
  }
}

function testMultiplePara() {
  const input = '<td><para>段落1</para><para>段落2</para></td>'

  // 修复前的正则 - 只匹配一个para
  const regexOld = /<td(\s[^>]*)?>(\s*<para>[\s\S]*?<\/para>\s*)<\/td>/g
  const matchOld = regexOld.exec(input)

  console.log('【修复前】')
  if (matchOld) {
    const resultOld = '<listItemDefinition>' + matchOld[2] + '</listItemDefinition>'
    const remaining = input.replace(matchOld[0], resultOld)
    console.log('输入:', input)
    console.log('输出:', remaining)

    if (remaining.includes('</td>')) {
      console.log('❌ 失败: 有残留</td>标签 - 这就是BUG!')
      console.log('残留内容:', remaining)
    }
  }

  // 修复后的正则 - 使用+量词匹配一个或多个para
  const regexNew = /<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g
  const matchNew = regexNew.exec(input)

  console.log('\n【修复后】')
  if (matchNew) {
    const resultNew = '<listItemDefinition>' + matchNew[2] + '</listItemDefinition>'
    console.log('输入:', input)
    console.log('输出:', resultNew)

    if (resultNew.includes('</td>')) {
      console.log('❌ 失败: 仍有残留</td>标签')
    } else if (resultNew.includes('<para>段落1</para>') && resultNew.includes('<para>段落2</para>')) {
      console.log('✅ 通过: 两个para都被正确转换，无残留标签')
    } else {
      console.log('⚠️ 部分通过: 无残留但内容不完整')
    }
  } else {
    console.log('❌ 正则未匹配')
  }
}

function testThreePara() {
  const input = '<td><para>P1</para><para>P2</para><para>P3</para></td>'

  // 修复后的正则
  const regex = /<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g
  const match = regex.exec(input)

  if (match) {
    const result = '<listItemDefinition>' + match[2] + '</listItemDefinition>'
    console.log('输入:', input)
    console.log('输出:', result)

    const hasAllPara = result.includes('<para>P1</para>') &&
                       result.includes('<para>P2</para>') &&
                       result.includes('<para>P3</para>')
    const hasNoTd = !result.includes('</td>') && !result.includes('<td')

    if (hasAllPara && hasNoTd) {
      console.log('✅ 通过: 三个para都被正确转换，无残留标签')
    } else {
      console.log('❌ 失败')
      console.log('  - 包含所有para:', hasAllPara)
      console.log('  - 无残留td:', hasNoTd)
    }
  } else {
    console.log('❌ 正则未匹配')
  }
}

// 运行测试
testCriticalFix()
