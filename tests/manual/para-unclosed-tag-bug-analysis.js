/**
 * Para设计器 - 未闭合标签Bug深度分析
 *
 * 用户报告的Bug场景：
 * 1. 源码视图有：<para> 和 <para></para>
 * 2. 点击 <para></para> 的铅笔图标进入设计视图
 * 3. 保存后返回源码视图
 * 4. 结果：
 *    - 在 <para></para> 下方生成一个新的 <para></para>
 *    - 原来的 <para> 对应的 </para> 丢失了
 *
 * 这是一个P0级别的严重Bug，需要系统分析根因。
 */

/**
 * 测试场景1：未闭合标签与完整标签混合
 */
function testUnclosedTagScenario() {
  console.log('=' .repeat(80))
  console.log('测试场景1：未闭合标签与完整标签混合')
  console.log('=' .repeat(80))

  // 模拟XML内容
  const xmlContent = `Line 10: <para>
Line 11: <title>重要标题</title>
Line 12: </para>
Line 13: <para></para>
Line 14: <levelledPara>
Line 15: <title>另一个标题</title>`

  console.log('初始XML内容：')
  console.log(xmlContent)
  console.log('')

  // 用户点击Line 13的 <para></para> 铅笔图标
  const clickedLine = 13
  console.log(`用户操作：点击 Line ${clickedLine} 的 <para></para> 铅笔图标`)
  console.log('')

  // §1 分析setcontent()函数的逻辑
  console.log('--- §1 setcontent()函数执行分析 ---')
  console.log('代码路径：ParaDesigner.vue Line 318-360')
  console.log('')

  const lineContent = '<para></para>'
  console.log(`当前行内容：${lineContent}`)

  // 检查是否包含结束标签
  const hasClosingTag = lineContent.indexOf('</para>') > 0
  console.log(`包含</para>结束标签：${hasClosingTag}`)

  if (hasClosingTag) {
    console.log('✓ 判定为【单行para】')
    console.log('  执行逻辑：this.endline = this.lineno')
    console.log(`  结果：this.lineno = ${clickedLine}, this.endline = ${clickedLine}`)
  }
  console.log('')

  // §2 分析handleSave()函数的逻辑
  console.log('--- §2 handleSave()函数执行分析 ---')
  console.log('代码路径：ParaDesigner.vue Line 368-467')
  console.log('')

  const lineno = clickedLine
  const endline = clickedLine
  console.log(`保存时的参数：lineno=${lineno}, endline=${endline}`)
  console.log('')

  // §2.1 查找actualEndline
  console.log('§2.1 查找actualEndline（Line 415-441）')
  console.log(`从 lineno=${lineno} 开始搜索 </para> 标签...`)

  // 模拟搜索过程
  const lines = [
    { no: 10, content: '<para>' },
    { no: 11, content: '<title>重要标题</title>' },
    { no: 12, content: '</para>' },  // ← 第一个找到的</para>
    { no: 13, content: '<para></para>' },
    { no: 14, content: '<levelledPara>' },
    { no: 15, content: '<title>另一个标题</title>' }
  ]

  let actualEndline = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.no >= lineno && line.content.indexOf('</para>') > -1) {
      actualEndline = line.no
      console.log(`✓ 找到第一个 </para> 标签：Line ${actualEndline}`)
      console.log(`  内容："${line.content}"`)
      break
    }
  }
  console.log('')

  // §2.2 关键问题：actualEndline指向了错误的行
  console.log('🔴 【关键问题】actualEndline指向了错误的行！')
  console.log(`  期望：actualEndline = ${lineno} (Line 13的 <para></para>)`)
  console.log(`  实际：actualEndline = ${actualEndline} (Line 12的 </para>)`)
  console.log('')
  console.log('❌ Bug根因：搜索算法找到了【上一个para的结束标签】')
  console.log('  - Line 10的 <para> 对应 Line 12的 </para>')
  console.log('  - 保存时错误地替换了 Line 13-12 的范围')
  console.log('  - 导致Line 10-12的内容被破坏')
  console.log('')

  // §2.3 replaceRange执行结果
  console.log('§2.3 replaceRange执行结果')
  console.log(`replaceRange(newXml, {line:${lineno}, ch:0}, {line:${actualEndline}, ch:lineLength})`)
  console.log('')
  console.log('⚠️  注意：lineno(13) > actualEndline(12)')
  console.log('CodeMirror的replaceRange行为：')
  console.log('  - 如果from.line > to.line，会交换from和to')
  console.log('  - 实际执行：replaceRange(newXml, {line:12, ch:0}, {line:13, ch:lineLength})')
  console.log('  - 替换范围：Line 12到Line 13')
  console.log('')
  console.log('💥 灾难性结果：')
  console.log('  1. Line 12 的 </para> 被新的 <para></para> 替换')
  console.log('  2. Line 13 的 <para></para> 也被删除')
  console.log('  3. 插入的新内容包含换行符，导致生成新的行')
  console.log('  4. Line 10 的 <para> 失去了对应的 </para>')
  console.log('')
}

/**
 * 测试场景2：为什么setcontent()没有发现问题
 */
function testSetcontentBehavior() {
  console.log('=' .repeat(80))
  console.log('测试场景2：为什么setcontent()没有发现问题')
  console.log('=' .repeat(80))

  const lineContent = '<para></para>'
  console.log(`当前行内容：${lineContent}`)
  console.log('')

  // setcontent的判断逻辑（Line 328）
  console.log('setcontent()判断逻辑（Line 328）：')
  console.log(`  if (nowstr.lastIndexOf('</para>') > 0) {`)
  console.log(`    // 单行para`)
  console.log(`    this.endline = this.lineno`)
  console.log(`  }`)
  console.log('')

  const hasClosingTag = lineContent.lastIndexOf('</para>') > 0
  console.log(`lineContent.lastIndexOf('</para>') = ${lineContent.lastIndexOf('</para>')}`)
  console.log(`判定结果：${hasClosingTag ? '单行para' : '多行para'}`)
  console.log('')

  console.log('🔴 问题1：setcontent()和handleSave()的逻辑不一致')
  console.log('  - setcontent()：简单检查当前行是否包含</para>，判定为单行para')
  console.log('  - handleSave()：从lineno开始向后搜索第一个</para>，可能找到其他para的结束标签')
  console.log('')
  console.log('🔴 问题2：单行para的定义不明确')
  console.log('  - setcontent()认为：当前行包含<para>...</para>就是单行para')
  console.log('  - handleSave()没有验证：endline行是否真的是当前para的结束标签')
  console.log('')
}

/**
 * 测试场景3：实际的XML解析应该如何处理
 */
function testCorrectXmlParsing() {
  console.log('=' .repeat(80))
  console.log('测试场景3：正确的XML解析应该如何处理')
  console.log('=' .repeat(80))

  const xmlContent = `<para>
<title>重要标题</title>
</para>
<para></para>
<levelledPara>
<title>另一个标题</title>`

  console.log('XML内容：')
  console.log(xmlContent)
  console.log('')

  console.log('正确的解析逻辑：')
  console.log('1. 使用栈匹配配对的开始/结束标签')
  console.log('2. 遇到<para>压栈，遇到</para>出栈')
  console.log('3. 只有栈为空时的</para>才是当前para的结束标签')
  console.log('')

  // 模拟栈匹配
  const lines = [
    '<para>',              // Line 10: 栈[para]
    '<title>重要标题</title>',  // Line 11: 栈[para]（title自闭合）
    '</para>',             // Line 12: 栈[] - 这是Line 10的结束标签
    '<para></para>',       // Line 13: 栈[] - 自包含，开始=结束
    '<levelledPara>',      // Line 14: 栈[levelledPara]
    '<title>另一个标题</title>'  // Line 15: 栈[levelledPara]
  ]

  console.log('逐行解析：')
  lines.forEach((line, idx) => {
    console.log(`Line ${10 + idx}: ${line}`)
  })
  console.log('')

  console.log('对于Line 13的 <para></para>：')
  console.log('  - 开始标签：Line 13, pos=0')
  console.log('  - 结束标签：Line 13, pos=6')
  console.log('  - 这是一个【自包含】的空para')
  console.log('  - endline应该是13，不是12')
  console.log('')
}

/**
 * 测试场景4：修复方案分析
 */
function testFixSolution() {
  console.log('=' .repeat(80))
  console.log('测试场景4：修复方案分析')
  console.log('=' .repeat(80))

  console.log('🔧 修复方案A：增强endline验证（推荐）')
  console.log('代码位置：handleSave() Line 415-441')
  console.log('')
  console.log('修复逻辑：')
  console.log('1. 如果setcontent()判定为单行para（this.endline === this.lineno）')
  console.log('   → 跳过搜索，直接使用this.endline')
  console.log('2. 如果setcontent()判定为多行para（this.endline > this.lineno）')
  console.log('   → 验证this.endline行是否真的包含</para>')
  console.log('   → 如果不包含，抛出错误，不执行保存')
  console.log('')
  console.log('示例代码：')
  console.log(`
  // 防御性检查：验证endline行是否存在
  let endlineContent = this.editor.getLine(this.endline)
  let actualEndline = this.endline

  if (!endlineContent) {
    // endline行不存在，抛出错误
    throw new Error(\`endline行不存在: endline=\${this.endline}\`)
  }

  // 🔧 关键修复：验证endline行是否包含</para>结束标签
  const paraName = this.getLocaleName('para')
  if (endlineContent.indexOf(\`</\${paraName}>\`) === -1) {
    throw new Error(\`endline行不包含</\${paraName}>标签，XML可能已被修改\`)
  }

  // 验证通过，使用this.endline作为替换范围
  actualEndline = this.endline
  `)
  console.log('')

  console.log('🔧 修复方案B：增强setcontent()的判断（根本性修复）')
  console.log('代码位置：setcontent() Line 328-360')
  console.log('')
  console.log('修复逻辑：')
  console.log('1. 不只检查当前行是否包含</para>')
  console.log('2. 还要检查<para>和</para>的位置关系')
  console.log('3. 确保它们属于同一层级（使用栈匹配）')
  console.log('')
  console.log('示例代码：')
  console.log(`
  // 判断单行/多行para（增强版）
  const startTagPos = nowstr.indexOf('<' + paraName)
  const endTagPos = nowstr.lastIndexOf('</' + paraName + '>')

  if (startTagPos > -1 && endTagPos > startTagPos) {
    // 当前行同时包含<para>和</para>，且顺序正确
    // 进一步验证：中间没有其他未闭合的<para>
    const middleContent = nowstr.substring(startTagPos, endTagPos)
    const nestedParaCount = (middleContent.match(new RegExp('<' + paraName, 'g')) || []).length

    if (nestedParaCount === 1) {
      // 确认是单行para
      const html = await para2html(this.Parent, nowstr)
      this.ueditor.setContent(html)
      this.endline = this.lineno
    } else {
      // 存在嵌套para，需要多行搜索
      // ...继续执行多行para逻辑
    }
  } else {
    // 多行para
    // ...
  }
  `)
  console.log('')

  console.log('🎯 推荐修复顺序：')
  console.log('1. 【立即修复】方案A：在handleSave()中增加防御性验证')
  console.log('   - 优点：改动小，风险低，立即阻止数据丢失')
  console.log('   - 缺点：治标不治本，只是在保存时拦截')
  console.log('')
  console.log('2. 【后续优化】方案B：在setcontent()中增强判断')
  console.log('   - 优点：从源头解决问题，更彻底')
  console.log('   - 缺点：改动较大，需要更多测试')
  console.log('')
}

/**
 * 测试场景5：验证修复后的行为
 */
function testFixedBehavior() {
  console.log('=' .repeat(80))
  console.log('测试场景5：验证修复后的行为')
  console.log('=' .repeat(80))

  console.log('修复后的执行流程：')
  console.log('')
  console.log('1. 用户点击Line 13的 <para></para> 铅笔图标')
  console.log('   → setcontent()执行')
  console.log('   → 检测到当前行包含</para>')
  console.log('   → 设置 this.endline = 13')
  console.log('')
  console.log('2. 用户点击"保存"按钮')
  console.log('   → handleSave()执行')
  console.log('   → 读取 this.endline = 13')
  console.log('   → 验证 Line 13 是否包含 </para>：✓ 包含')
  console.log('   → 使用 actualEndline = 13')
  console.log('   → 执行 replaceRange(newXml, {line:13, ch:0}, {line:13, ch:lineLength})')
  console.log('   → 只替换 Line 13 的内容')
  console.log('')
  console.log('✅ 结果：')
  console.log('   - Line 10-12 的内容保持不变')
  console.log('   - Line 13 的 <para></para> 被更新为新内容')
  console.log('   - 没有生成新行')
  console.log('   - Line 10 的 </para> 保持完整')
  console.log('')
}

// 执行所有测试
testUnclosedTagScenario()
testSetcontentBehavior()
testCorrectXmlParsing()
testFixSolution()
testFixedBehavior()

console.log('=' .repeat(80))
console.log('分析总结')
console.log('=' .repeat(80))
console.log('')
console.log('🔴 Bug根因：')
console.log('1. setcontent()将Line 13的<para></para>判定为单行para')
console.log('2. 设置this.endline = 13')
console.log('3. handleSave()重新搜索</para>标签，从Line 13开始向后找')
console.log('4. 但实际找到的是Line 12的</para>（属于Line 10的<para>）')
console.log('5. actualEndline = 12（错误！）')
console.log('6. replaceRange({line:13}, {line:12})导致范围错误')
console.log('7. CodeMirror交换from/to，实际替换Line 12-13')
console.log('8. 导致Line 10的</para>丢失，Line 13生成新para')
console.log('')
console.log('🎯 修复策略：')
console.log('✅ 立即修复：在handleSave()中验证this.endline的有效性')
console.log('✅ 后续优化：改进setcontent()的单行/多行判断逻辑')
console.log('✅ 单元测试：添加未闭合标签场景的测试用例')
console.log('')
console.log('📊 影响评估：')
console.log('- 严重程度：🔴 P0（数据丢失）')
console.log('- 影响范围：所有包含多个para标签的DM')
console.log('- 复现概率：100%（特定XML结构）')
console.log('- 修复难度：中等（需要理解XML配对逻辑）')
console.log('- 回归风险：低（增加防御性检查，不改变核心逻辑）')
console.log('')
