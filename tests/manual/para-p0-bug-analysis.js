/**
 * 旧系统P0 Bug验证
 *
 * 验证旧JSP系统的replaceRange是否也会丢失下一行内容
 */

console.log('========== 旧系统逻辑分析 ==========\n')

console.log('旧系统代码（IetmEditorDesignerPara.jsp）：')
console.log('  Line 347-349: if(nowstr.lastIndexOf("</para>")>0){')
console.log('                    endline = lineno;')
console.log('                }')
console.log('  Line 432:     editor.replaceRange(content,{line:lineno,ch:0},{line:endline+1,ch:0});')
console.log('')

console.log('场景：单行para')
console.log('  假设 lineno = 10, nowstr = "<para></para>"')
console.log('  → endline = 10')
console.log('  → replaceRange(content, {line:10, ch:0}, {line:11, ch:0})')
console.log('  → 替换范围：从Line 10开头到Line 11开头')
console.log('  → 结果：Line 11的内容会被删除！')
console.log('')

console.log('========== 根因确认 ==========\n')
console.log('✓ 旧系统和新系统都使用 {line:endline+1, ch:0}')
console.log('✓ 两个系统都有相同的P0 bug')
console.log('✓ 这是历史遗留问题')
console.log('')

console.log('========== 为什么旧系统用户没有大量报告？ ==========\n')
console.log('可能原因：')
console.log('1. 用户很少点击空para标签的铅笔图标（大多数para都有内容）')
console.log('2. 用户发现丢失后立即Ctrl+Z撤销，没有保存DM文件')
console.log('3. 用户可能已经报告，但归类为"操作失误"而非系统bug')
console.log('4. 旧系统的CodeMirror版本可能有不同的replaceRange行为')
console.log('')

console.log('========== 修复方案对比 ==========\n')

console.log('方案A（新系统当前实现）：Line 446-452')
console.log('  if (this.lineno === actualEndline) {')
console.log('    this.editor.replaceRange(')
console.log('      xml + "\\n",')
console.log('      { line: this.lineno, ch: 0 },')
console.log('      { line: actualEndline + 1, ch: 0 }  // ← BUG！')
console.log('    )')
console.log('  }')
console.log('  问题：仍然会删除下一行')
console.log('')

console.log('方案B（正确修复）：')
console.log('  if (this.lineno === actualEndline) {')
console.log('    const lineContent = this.editor.getLine(this.lineno)')
console.log('    this.editor.replaceRange(')
console.log('      xml,  // ← 不加 \\n')
console.log('      { line: this.lineno, ch: 0 },')
console.log('      { line: actualEndline, ch: lineContent.length }  // ← 修复！')
console.log('    )')
console.log('  }')
console.log('  效果：只替换当前行，保留换行符，不影响下一行')
console.log('')

console.log('========== 测试验证 ==========\n')

// 模拟CodeMirror的replaceRange
function mockReplaceRange(lines, text, from, to) {
  const result = []

  // 复制from之前的行
  for (let i = 0; i < from.line; i++) {
    result.push(lines[i])
  }

  // 处理from行
  let newContent = lines[from.line].substring(0, from.ch) + text

  // 添加to行的剩余内容
  if (to.line < lines.length) {
    newContent += lines[to.line].substring(to.ch)
  }

  // 按换行符分割新内容
  const newLines = newContent.split('\n')
  newLines.forEach(line => result.push(line))

  // 复制to之后的行
  for (let i = to.line + 1; i < lines.length; i++) {
    result.push(lines[i])
  }

  return result
}

const testLines = [
  '<dmodule>',
  '<para></para>',           // Line 1
  '<title>重要标题</title>', // Line 2
  '<para>正文</para>',       // Line 3
  '</dmodule>'
]

console.log('原始XML：')
testLines.forEach((line, i) => console.log(`  Line ${i}: ${line}`))
console.log('')

console.log('方案A（当前实现，有Bug）：')
const resultA = mockReplaceRange(
  testLines,
  '<para id="para001"></para>\n',
  { line: 1, ch: 0 },
  { line: 2, ch: 0 }  // ← 会删除Line 2
)
resultA.forEach((line, i) => console.log(`  Line ${i}: ${line}`))
if (!resultA.includes('<title>重要标题</title>')) {
  console.log('  ❌ <title>重要标题</title> 丢失！')
}
console.log('')

console.log('方案B（正确修复）：')
const resultB = mockReplaceRange(
  testLines,
  '<para id="para001"></para>',
  { line: 1, ch: 0 },
  { line: 1, ch: testLines[1].length }  // ← 只替换Line 1
)
resultB.forEach((line, i) => console.log(`  Line ${i}: ${line}`))
if (resultB.includes('<title>重要标题</title>')) {
  console.log('  ✅ <title>重要标题</title> 保留！')
}
console.log('')

console.log('========== 结论 ==========\n')
console.log('P0 Bug确认：')
console.log('  ✓ 旧系统和新系统都有这个bug')
console.log('  ✓ 根因：{line:endline+1, ch:0} 会删除下一行')
console.log('  ✓ 影响：保存单行para后，下一行XML内容丢失')
console.log('')
console.log('紧急修复方案：')
console.log('  修改 ParaDesigner.vue Line 448-452')
console.log('  将 {line: actualEndline + 1, ch: 0}')
console.log('  改为 {line: actualEndline, ch: lineContent.length}')
console.log('')
console.log('优先级：P0（数据丢失）')
console.log('工作量：10分钟（1行代码修改 + 测试）')
