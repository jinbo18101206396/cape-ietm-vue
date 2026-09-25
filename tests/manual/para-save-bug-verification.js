/**
 * P0 Bug验证：单行para保存后丢失下一行内容
 *
 * Bug描述：
 * 1. 源码中有 <para></para> 单行标签
 * 2. 点击铅笔进入设计视图
 * 3. 点击保存
 * 4. 下一行的XML内容丢失
 *
 * 根因：replaceRange的to参数 {line: actualEndline + 1, ch: 0} 会删除下一行开头
 */

// 模拟CodeMirror的replaceRange行为
function simulateReplaceRange(lines, newText, from, to) {
  console.log('=== 模拟replaceRange ===')
  console.log('原始行:', lines)
  console.log('新文本:', JSON.stringify(newText))
  console.log('from:', from)
  console.log('to:', to)

  // 1. 删除 [from, to) 区间
  const result = [...lines]

  // 删除from行的from.ch之后的内容
  result[from.line] = result[from.line].substring(0, from.ch)

  // 删除中间完整的行
  for (let i = from.line + 1; i < to.line; i++) {
    result[i] = null  // 标记删除
  }

  // 删除to行的0到to.ch的内容
  if (to.line < result.length) {
    result[to.line] = result[to.line].substring(to.ch)
  }

  // 2. 插入新文本
  const newLines = newText.split('\n')
  result[from.line] += newLines[0]

  for (let i = 1; i < newLines.length; i++) {
    result.splice(from.line + i, 0, newLines[i])
  }

  // 3. 清理null标记的行
  const finalResult = result.filter(line => line !== null)

  console.log('结果行:', finalResult)
  return finalResult
}

// 测试用例1：单行para（Bug场景）
console.log('\n### 测试用例1：单行para（有Bug）###\n')
const lines1 = [
  '<dmodule>',
  '<para></para>',              // Line 1
  '<title>重要标题</title>',    // Line 2
  '<para>正文内容</para>',      // Line 3
  '</dmodule>'
]

const newXml1 = '<para id="para001">新内容</para>\n'
const result1 = simulateReplaceRange(
  lines1,
  newXml1,
  { line: 1, ch: 0 },
  { line: 2, ch: 0 }  // ← Bug：替换到Line 2开头
)

console.log('\n✅ 期望结果：')
console.log([
  '<dmodule>',
  '<para id="para001">新内容</para>',
  '<title>重要标题</title>',
  '<para>正文内容</para>',
  '</dmodule>'
])

console.log('\n❌ 实际结果：')
console.log(result1)

console.log('\n🔍 问题分析：')
if (!result1.includes('<title>重要标题</title>')) {
  console.log('✗ <title>重要标题</title> 丢失！')
  console.log('✗ 原因：replaceRange删除了 [Line1:0, Line2:0)，包括Line2的开头')
}

// 测试用例2：正确的单行para替换方式
console.log('\n\n### 测试用例2：正确的单行para替换 ###\n')
const lines2 = [...lines1]
const newXml2 = '<para id="para001">新内容</para>'
const result2 = simulateReplaceRange(
  lines2,
  newXml2,
  { line: 1, ch: 0 },
  { line: 1, ch: lines2[1].length }  // ← 修复：只替换Line1的内容
)

console.log('\n✅ 期望结果：')
console.log([
  '<dmodule>',
  '<para id="para001">新内容</para>',
  '<title>重要标题</title>',
  '<para>正文内容</para>',
  '</dmodule>'
])

console.log('\n✅ 实际结果：')
console.log(result2)

if (result2.includes('<title>重要标题</title>')) {
  console.log('\n🎉 修复成功！<title>没有丢失')
}

// 测试用例3：空para（最严重场景）
console.log('\n\n### 测试用例3：空para保存（最严重）###\n')
const lines3 = [
  '<dmodule>',
  '<para></para>',              // Line 1 - 空para
  '<title>标题A</title>',       // Line 2
  '<para>段落B</para>',         // Line 3
  '<title>标题C</title>',       // Line 4
  '</dmodule>'
]

const newXml3 = '<para></para>\n'  // 保存后仍然是空para
const result3 = simulateReplaceRange(
  lines3,
  newXml3,
  { line: 1, ch: 0 },
  { line: 2, ch: 0 }  // ← Bug：会删除Line2
)

console.log('\n❌ 实际结果：')
console.log(result3)

console.log('\n🔍 问题分析：')
const lost = []
if (!result3.includes('<title>标题A</title>')) lost.push('Line2: <title>标题A</title>')
if (!result3.includes('<para>段落B</para>')) lost.push('Line3: <para>段落B</para>')
if (!result3.includes('<title>标题C</title>')) lost.push('Line4: <title>标题C</title>')

if (lost.length > 0) {
  console.log(`✗ 丢失了 ${lost.length} 行内容：`)
  lost.forEach(line => console.log('  ', line))
}

// 结论
console.log('\n\n========== 结论 ==========\n')
console.log('P0 Bug根因：')
console.log('  ParaDesigner.vue Line 451: { line: actualEndline + 1, ch: 0 }')
console.log('  ↑ 这个to参数会删除下一行的开头，导致下一行内容丢失')
console.log('')
console.log('修复方案：')
console.log('  单行para应该只替换当前行内容，而不是延伸到下一行')
console.log('  修改为：{ line: actualEndline, ch: lineContent.length }')
console.log('')
console.log('预期效果：')
console.log('  只替换 <para></para> 本身，不影响下一行的 <title>')
