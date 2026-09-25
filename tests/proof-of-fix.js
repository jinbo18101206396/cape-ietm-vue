/**
 * 对比测试：证明修复前后的真实差异
 * 通过回退到修复前的代码，对比行为变化
 */

console.log('=== 修复前后对比测试 ===\n')

// ==========================================
// CRITICAL修复验证：td内多个para
// ==========================================

console.log('【CRITICAL测试】td内多个para残留标签问题\n')

const testInput = '<td><para>段落1</para><para>段落2</para></td>'

// 修复前的正则（只匹配一个para）
console.log('修复前的代码：')
console.log('正则: /<td(\\s[^>]*)?>(\\s*<para>[\\s\\S]*?<\\/para>\\s*)<\\/td>/g')
console.log('说明: 使用 [\\s\\S]*? 非贪婪匹配，只会匹配到第一个</para>\n')

const regexOld = /<td(\s[^>]*)?>(\s*<para>[\s\S]*?<\/para>\s*)<\/td>/g
const matchOld = regexOld.exec(testInput)

if (matchOld) {
  console.log('匹配结果:')
  console.log('  match[0] (完整匹配):', matchOld[0])
  console.log('  match[2] (捕获组):', matchOld[2])

  const resultOld = testInput.replace(matchOld[0], '<listItemDefinition>' + matchOld[2] + '</listItemDefinition>')
  console.log('\n替换后的字符串:', resultOld)

  if (resultOld.includes('</td>')) {
    console.log('❌ 问题确认: 存在残留的</td>标签!')
    console.log('   残留部分:', resultOld.match(/<para>段落2<\/para><\/td>/)[0])
  }
}

console.log('\n' + '='.repeat(50) + '\n')

// 修复后的正则（匹配所有para）
console.log('修复后的代码：')
console.log('正则: /<td(\\s[^>]*)?>(\\s*(?:<para>[\\s\\S]*?<\\/para>\\s*)+)<\\/td>/g')
console.log('说明: 使用 (?:...)+ 匹配一个或多个para\n')

const regexNew = /<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g
const matchNew = regexNew.exec(testInput)

if (matchNew) {
  console.log('匹配结果:')
  console.log('  match[0] (完整匹配):', matchNew[0])
  console.log('  match[2] (捕获组):', matchNew[2])

  const resultNew = testInput.replace(matchNew[0], '<listItemDefinition>' + matchNew[2] + '</listItemDefinition>')
  console.log('\n替换后的字符串:', resultNew)

  if (!resultNew.includes('</td>')) {
    console.log('✅ 修复验证: 无残留标签!')

    if (resultNew.includes('<para>段落1</para>') && resultNew.includes('<para>段落2</para>')) {
      console.log('✅ 内容验证: 两个para都被正确转换!')
    }
  }
}

console.log('\n' + '='.repeat(50) + '\n')

// ==========================================
// 量化对比
// ==========================================

console.log('【量化对比】\n')

const testCases = [
  '<td><para>A</para></td>',
  '<td><para>A</para><para>B</para></td>',
  '<td><para>A</para><para>B</para><para>C</para></td>',
  '<td><para>A</para><para>B</para><para>C</para><para>D</para></td>'
]

console.log('测试用例数量:', testCases.length)
console.log('')

let oldBugCount = 0
let newBugCount = 0

testCases.forEach((input, i) => {
  const paraCount = (input.match(/<para>/g) || []).length

  // 修复前
  const regexOld = /<td(\s[^>]*)?>(\s*<para>[\s\S]*?<\/para>\s*)<\/td>/g
  const matchOld = regexOld.exec(input)
  const resultOld = matchOld ? input.replace(matchOld[0], '<listItemDefinition>' + matchOld[2] + '</listItemDefinition>') : input
  const hasOldBug = resultOld.includes('</td>')

  // 修复后
  const regexNew = /<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g
  const matchNew = regexNew.exec(input)
  const resultNew = matchNew ? input.replace(matchNew[0], '<listItemDefinition>' + matchNew[2] + '</listItemDefinition>') : input
  const hasNewBug = resultNew.includes('</td>')

  if (hasOldBug) oldBugCount++
  if (hasNewBug) newBugCount++

  console.log(`用例${i+1}: ${paraCount}个para`)
  console.log(`  修复前: ${hasOldBug ? '❌ 有残留' : '✅ 无残留'}`)
  console.log(`  修复后: ${hasNewBug ? '❌ 有残留' : '✅ 无残留'}`)
  console.log('')
})

console.log('统计结果:')
console.log(`  修复前BUG数: ${oldBugCount}/${testCases.length} (${(oldBugCount/testCases.length*100).toFixed(1)}%)`)
console.log(`  修复后BUG数: ${newBugCount}/${testCases.length} (${(newBugCount/testCases.length*100).toFixed(1)}%)`)
console.log(`  BUG减少数: ${oldBugCount - newBugCount}`)

if (oldBugCount > 0 && newBugCount === 0) {
  console.log('\n✅ 结论: 修复有效，所有BUG已消除!')
} else {
  console.log('\n❌ 结论: 修复无效或不完整')
}
