/**
 * 正则表达式修复验证脚本
 * 验证所有8个bug的修复是否正确
 */

const tests = [
  {
    id: 'BUG-001',
    name: 'S1000D表格中<th>误匹配<thead>',
    regex: /<th(\s[^>]*)?\>/g,
    cases: [
      { input: '<th>', shouldMatch: true },
      { input: '<th class="header">', shouldMatch: true },
      { input: '<thead>', shouldMatch: false },
      { input: '<thread>', shouldMatch: false }
    ]
  },
  {
    id: 'BUG-002',
    name: '<sup>误匹配<superScript>',
    regex: /<sup(\s[^>]*)?\>/g,
    cases: [
      { input: '<sup>', shouldMatch: true },
      { input: '<sup class="x">', shouldMatch: true },
      { input: '<superScript>', shouldMatch: false },
      { input: '<support>', shouldMatch: false },
      { input: '<supply>', shouldMatch: false }
    ]
  },
  {
    id: 'BUG-003',
    name: '<sub>误匹配<subScript>',
    regex: /<sub(\s[^>]*)?\>/g,
    cases: [
      { input: '<sub>', shouldMatch: true },
      { input: '<sub id="1">', shouldMatch: true },
      { input: '<subScript>', shouldMatch: false },
      { input: '<subject>', shouldMatch: false },
      { input: '<submit>', shouldMatch: false }
    ]
  },
  {
    id: 'BUG-004',
    name: '<p>误匹配<para>和<pre>',
    regex: /<p(\s[^>]*)?\>/g,
    cases: [
      { input: '<p>', shouldMatch: true },
      { input: '<p class="text">', shouldMatch: true },
      { input: '<para>', shouldMatch: false },
      { input: '<pre>', shouldMatch: false }
    ]
  },
  {
    id: 'BUG-005',
    name: 'deflist中<th>误匹配<thead>',
    regex: /<th(\s[^>]*)?\>/g,
    cases: [
      { input: '<th>', shouldMatch: true },
      { input: '<th width="100">', shouldMatch: true },
      { input: '<thead>', shouldMatch: false },
      { input: '<thread>', shouldMatch: false }
    ]
  },
  {
    id: 'BUG-006',
    name: '<li>误匹配<list>和<link>',
    regex: /<li(\s[^>]*)?\>/g,
    cases: [
      { input: '<li>', shouldMatch: true },
      { input: '<li class="item">', shouldMatch: true },
      { input: '<list>', shouldMatch: false },
      { input: '<link>', shouldMatch: false }
    ]
  },
  {
    id: 'BUG-007',
    name: '<tr>误匹配<track>和<tree>',
    regex: /<tr(\s[^>]*)?\>/g,
    cases: [
      { input: '<tr>', shouldMatch: true },
      { input: '<tr class="row">', shouldMatch: true },
      { input: '<track>', shouldMatch: false },
      { input: '<tree>', shouldMatch: false }
    ]
  },
  {
    id: 'BUG-008',
    name: '<td>误匹配<tdata>',
    regex: /<td(\s[^>]*)?\>/g,
    cases: [
      { input: '<td>', shouldMatch: true },
      { input: '<td width="200">', shouldMatch: true },
      { input: '<tdata>', shouldMatch: false }
    ]
  }
]

console.log('🔍 正则表达式修复验证\n')
console.log('=' .repeat(80))

let totalTests = 0
let passedTests = 0
let failedTests = 0
const failedBugs = []

tests.forEach(({ id, name, regex, cases }) => {
  console.log(`\n${id}: ${name}`)
  console.log(`修复后正则: ${regex}\n`)

  let bugPassed = true

  cases.forEach(({ input, shouldMatch }) => {
    totalTests++
    regex.lastIndex = 0  // 重置正则状态
    const actualMatch = regex.test(input)
    const passed = actualMatch === shouldMatch

    if (passed) {
      passedTests++
      console.log(`  ✅ ${input.padEnd(30)} → ${actualMatch ? '匹配' : '不匹配'} (正确)`)
    } else {
      failedTests++
      bugPassed = false
      console.log(`  ❌ ${input.padEnd(30)} → ${actualMatch ? '匹配' : '不匹配'} (错误！预期: ${shouldMatch ? '匹配' : '不匹配'})`)
    }
  })

  if (!bugPassed) {
    failedBugs.push(id)
  }
})

console.log('\n' + '='.repeat(80))
console.log(`\n📊 测试结果:`)
console.log(`   总测试: ${totalTests}`)
console.log(`   ✅ 通过: ${passedTests}`)
console.log(`   ❌ 失败: ${failedTests}`)
console.log(`   成功率: ${(passedTests/totalTests*100).toFixed(1)}%`)

console.log(`\n📋 Bug修复状态:`)
console.log(`   修复总数: ${tests.length} 个bug`)
console.log(`   ✅ 验证通过: ${tests.length - failedBugs.length} 个`)
console.log(`   ❌ 验证失败: ${failedBugs.length} 个`)

if (failedBugs.length > 0) {
  console.log(`\n⚠️  仍存在问题的bug: ${failedBugs.join(', ')}`)
  process.exit(1)
} else {
  console.log(`\n✅ 所有bug修复验证通过！可以进行UI测试。`)
  process.exit(0)
}
