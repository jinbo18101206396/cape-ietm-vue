/**
 * Para设计器 - 精确复现用户报告的Bug
 *
 * 用户场景：
 * 1. 源码视图有两行：
 *    Line 10: <para>
 *    Line 11: <para></para>
 * 2. 点击Line 11的<para></para>铅笔图标
 * 3. 保存
 * 4. 结果：
 *    - Line 11下方生成新的<para></para>
 *    - Line 10的<para>失去了配对的</para>
 */

console.log('================================================================================')
console.log('精确复现用户Bug场景')
console.log('================================================================================\n')

// 初始XML内容
const initialXML = `Line 10: <para>
Line 11: <para></para>`

console.log('【初始状态】')
console.log(initialXML)
console.log('')

// 用户操作：点击Line 11的铅笔图标
console.log('【用户操作】点击Line 11的<para></para>铅笔图标')
console.log('')

// §1 setcontent()执行
console.log('=' .repeat(80))
console.log('§1 setcontent()执行 - 初始化设计器')
console.log('=' .repeat(80))
console.log('')

const clickedLine = 11
const lineContent = '<para></para>'
console.log(`this.lineno = ${clickedLine}`)
console.log(`当前行内容：${lineContent}`)
console.log('')

// 判断单行/多行para（Line 328）
console.log('判断逻辑（ParaDesigner.vue Line 328）：')
console.log(`  if (nowstr.lastIndexOf('</para>') > 0) {`)
console.log(`    // 单行para`)
console.log(`    this.endline = this.lineno`)
console.log(`  }`)
console.log('')

const hasClosingTag = lineContent.lastIndexOf('</para>') > 0
console.log(`lineContent.lastIndexOf('</para>') = ${lineContent.lastIndexOf('</para>')}`)
console.log(`结果：${hasClosingTag ? '✓ 单行para' : '✗ 多行para'}`)
console.log('')

if (hasClosingTag) {
  console.log(`✓ 设置 this.endline = ${clickedLine}`)
  console.log(`✓ 设计器加载成功`)
}
console.log('')

// §2 用户在设计器中编辑（或不编辑）后点击保存
console.log('=' .repeat(80))
console.log('§2 handleSave()执行 - 保存内容')
console.log('=' .repeat(80))
console.log('')

const lineno = clickedLine
const endline = clickedLine
console.log(`保存时的状态：`)
console.log(`  this.lineno = ${lineno}`)
console.log(`  this.endline = ${endline}`)
console.log('')

// §2.1 验证endline行是否存在（Line 417）
console.log('§2.1 验证endline行是否存在（Line 417-420）')
console.log('')

// 模拟CodeMirror的editor.getLine()
const editorLines = [
  null, null, null, null, null, null, null, null, null, null, // Line 0-9
  '<para>',        // Line 10
  '<para></para>'  // Line 11
]

const endlineContent = editorLines[endline]
console.log(`editor.getLine(${endline}) = "${endlineContent}"`)
console.log(`endlineContent存在：${!!endlineContent}`)
console.log('')

if (endlineContent) {
  console.log('✓ endline行存在，跳过重新搜索')
  console.log(`  actualEndline = this.endline = ${endline}`)
} else {
  console.log('✗ endline行不存在，需要重新搜索')
}
console.log('')

// §2.2 执行replaceRange（Line 446-451）
console.log('§2.2 执行replaceRange（Line 446-451）')
console.log('')

const actualEndline = endline
const currentLineContent = editorLines[actualEndline]

console.log(`const currentLineContent = editor.getLine(${actualEndline})`)
console.log(`  = "${currentLineContent}"`)
console.log(`  length = ${currentLineContent.length}`)
console.log('')

// 模拟新的XML内容（假设用户只是保存，没有修改）
const newXML = '<para></para>'
console.log(`新的XML内容：${newXML}`)
console.log('')

console.log(`执行：editor.replaceRange(`)
console.log(`  "${newXML}",`)
console.log(`  { line: ${lineno}, ch: 0 },`)
console.log(`  { line: ${actualEndline}, ch: ${currentLineContent.length} }`)
console.log(`)`)
console.log('')

console.log(`替换范围：Line ${lineno}:0 到 Line ${actualEndline}:${currentLineContent.length}`)
console.log('')

// §3 关键问题：为什么会生成新行？
console.log('=' .repeat(80))
console.log('§3 关键问题分析：为什么会在Line 11下方生成新的<para></para>？')
console.log('=' .repeat(80))
console.log('')

console.log('🤔 可能的原因：')
console.log('')

console.log('假设1：formateXml()添加了多余的换行符')
console.log('  - formateXml()会根据缩进格式化XML')
console.log('  - 如果XML末尾有换行符，replaceRange会保留')
console.log('  - 检查：Line 408的formateXml()调用')
console.log('')

console.log('假设2：html2para()生成的XML包含多个para标签')
console.log('  - UEditor的内容可能被错误解析')
console.log('  - 生成了多个<para>...</para>标签')
console.log('  - 检查：Line 399的html2para()返回值')
console.log('')

console.log('假设3：Line 10的<para>被误判为Line 11 para的一部分')
console.log('  - 但这与setcontent()的判断矛盾')
console.log('  - setcontent()明确判定Line 11是单行para')
console.log('  - 可能性：低')
console.log('')

// §4 深入分析：模拟真实的XML格式化
console.log('=' .repeat(80))
console.log('§4 模拟formateXml()的行为')
console.log('=' .repeat(80))
console.log('')

console.log('Line 407-408的代码：')
console.log(`  const indent = this.editor.getLine(this.lineno).indexOf('<')`)
console.log(`  xml = this.formateXml(xml, indent)`)
console.log('')

const indentPos = editorLines[lineno].indexOf('<')
console.log(`Line ${lineno}的缩进位置：${indentPos}（从第0列开始）`)
console.log('')

console.log('formateXml()可能的输出：')
console.log('  输入：<para></para>')
console.log('  输出1（无换行）：<para></para>')
console.log('  输出2（带换行）：<para></para>\\n')
console.log('  输出3（多行格式）：<para>\\n</para>\\n')
console.log('')

console.log('🔍 关键点：检查formateXml()是否添加了换行符')
console.log('')

// §5 真实Bug根因推测
console.log('=' .repeat(80))
console.log('§5 真实Bug根因推测')
console.log('=' .repeat(80))
console.log('')

console.log('基于用户描述的结果：')
console.log('  - "在<para></para>下方生成一个新的<para></para>"')
console.log('  - "原<para>标签对应的</para>丢失"')
console.log('')

console.log('这意味着：')
console.log('  1. replaceRange替换了错误的范围')
console.log('  2. 替换时删除了不该删除的内容')
console.log('  3. 插入的新内容产生了额外的行')
console.log('')

console.log('🔴 Bug根因（最可能）：')
console.log('')
console.log('❌ 问题：setcontent()和handleSave()对"单行para"的理解不一致')
console.log('')
console.log('setcontent()的逻辑（Line 328）：')
console.log('  - 只检查当前行是否包含</para>')
console.log('  - 不检查<para>和</para>是否配对')
console.log('  - Line 11包含</para>，判定为单行para ✓')
console.log('  - 设置 endline = 11 ✓')
console.log('')

console.log('handleSave()的逻辑（Line 417-441）：')
console.log('  - 读取 this.endline = 11')
console.log('  - 检查 editor.getLine(11) 是否存在：✓ 存在')
console.log('  - 直接使用 actualEndline = 11')
console.log('  - 执行 replaceRange(xml, {line:11, ch:0}, {line:11, ch:13})')
console.log('')

console.log('⚠️  等等！如果逻辑正确，为什么会出Bug？')
console.log('')

// §6 重新审视用户描述
console.log('=' .repeat(80))
console.log('§6 重新审视用户描述 - 可能的误解')
console.log('=' .repeat(80))
console.log('')

console.log('用户说："<para>"和"<para></para>"标签均有铅笔图标')
console.log('')
console.log('这意味着什么？')
console.log('  1. Line 10: <para> 有铅笔图标')
console.log('  2. Line 11: <para></para> 有铅笔图标')
console.log('')

console.log('等等！<para>是一个未闭合的开始标签！')
console.log('它怎么会有铅笔图标？')
console.log('')

console.log('可能性1：Line 10的<para>实际上是：')
console.log('  Line 10: <para>')
console.log('  Line 11: ...一些内容...')
console.log('  Line 12: </para>')
console.log('  Line 13: <para></para>')
console.log('')

console.log('可能性2：用户描述有误，实际XML是：')
console.log('  Line 10: <para>内容</para>')
console.log('  Line 11: <para></para>')
console.log('')

console.log('可能性3：确实是两个独立的标签：')
console.log('  Line 10: <para>  （未闭合，XML格式错误）')
console.log('  Line 11: <para></para>')
console.log('')

console.log('🎯 需要用户提供更详细的XML内容才能精确定位Bug')
console.log('')

// §7 如果真的是未闭合标签场景
console.log('=' .repeat(80))
console.log('§7 如果Line 10真的是未闭合的<para>（XML格式错误）')
console.log('=' .repeat(80))
console.log('')

console.log('XML结构：')
console.log('  Line 10: <para>               ← 未闭合的开始标签')
console.log('  Line 11: <para></para>        ← 完整的空para')
console.log('')

console.log('问题：Line 11的<para></para>有两种理解：')
console.log('')
console.log('理解A（XML解析器视角）：')
console.log('  - Line 10的<para>是开始标签')
console.log('  - Line 11的<para>是嵌套的para开始标签')
console.log('  - Line 11的</para>关闭了Line 11的<para>')
console.log('  - Line 10的<para>仍然未闭合（格式错误）')
console.log('')

console.log('理解B（文本匹配视角）：')
console.log('  - Line 11独立包含<para></para>')
console.log('  - Line 10的<para>与Line 11无关')
console.log('  - 两者是独立的para标签')
console.log('')

console.log('setcontent()使用的是【理解B】（文本匹配）')
console.log('  → 只看Line 11是否包含</para>')
console.log('  → 不管Line 10是什么状态')
console.log('')

console.log('🔴 潜在Bug：')
console.log('如果用户保存Line 11的para时，XML被重新格式化：')
console.log('  - formateXml()可能尝试"修复"XML结构')
console.log('  - 或者html2para()生成了包含多个para的XML')
console.log('  - 导致意外的结果')
console.log('')

console.log('=' .repeat(80))
console.log('结论')
console.log('=' .repeat(80))
console.log('')

console.log('🔴 Bug根因（推测）：')
console.log('1. 用户的XML包含未闭合或格式错误的标签')
console.log('2. setcontent()使用简单的文本匹配，判定Line 11为单行para')
console.log('3. 用户保存时，formateXml()或html2para()尝试修复格式')
console.log('4. 生成的新XML与原始结构不一致')
console.log('5. replaceRange替换后导致XML结构混乱')
console.log('')

console.log('🎯 需要用户提供的信息：')
console.log('1. 完整的XML内容（至少Line 8-15）')
console.log('2. 保存前的UEditor内容（HTML）')
console.log('3. html2para()生成的XML内容')
console.log('4. formateXml()格式化后的XML内容')
console.log('5. 保存后的实际XML内容（对比保存前）')
console.log('')

console.log('📋 建议的调试步骤：')
console.log('1. 在handleSave()的Line 399后添加console.log(xml)')
console.log('2. 在Line 408后添加console.log(xml)  // 格式化后')
console.log('3. 在Line 447前添加console.log({lineno, actualEndline, xml})')
console.log('4. 复现Bug，查看控制台输出')
console.log('5. 对比保存前后的editor.getValue()全文')
console.log('')
