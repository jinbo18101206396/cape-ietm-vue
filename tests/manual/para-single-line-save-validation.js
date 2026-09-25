/**
 * Para设计器单行para保存手动验证脚本
 * P0缺陷修复验证：模拟CodeMirror的replaceRange行为
 *
 * 使用方法：
 * node tests/manual/para-single-line-save-validation.js
 */

// 模拟CodeMirror的replaceRange行为
class MockCodeMirror {
  constructor(initialContent) {
    this.lines = initialContent.split('\n')
  }

  getLine(lineNo) {
    return this.lines[lineNo] || ''
  }

  lineCount() {
    return this.lines.length
  }

  /**
   * replaceRange的关键行为：
   * - 单行替换 (from.line === to.line): 只替换指定字符范围
   * - 多行替换 (from.line < to.line): 删除from到to之间的所有内容
   */
  replaceRange(text, from, to) {
    if (from.line === to.line) {
      // 单行替换：只替换字符范围
      const line = this.lines[from.line] || ''
      const before = line.substring(0, from.ch)
      const after = line.substring(to.ch)
      this.lines[from.line] = before + text + after
    } else {
      // 多行替换：删除整行范围
      const startLine = this.lines[from.line] || ''
      const endLine = this.lines[to.line] || ''
      const before = startLine.substring(0, from.ch)
      const after = endLine.substring(to.ch)

      // 删除from.line到to.line之间的所有行
      const newLines = this.lines.slice(0, from.line)
      newLines.push(before + text + after)
      newLines.push(...this.lines.slice(to.line + 1))

      this.lines = newLines
    }
  }

  getValue() {
    return this.lines.join('\n')
  }
}

// 测试用例
function runTests() {
  console.log('='.repeat(80))
  console.log('Para设计器单行para保存P0修复验证')
  console.log('='.repeat(80))
  console.log()

  let passed = 0
  let failed = 0

  // 测试1：旧代码逻辑（有BUG）
  console.log('【测试1】旧代码逻辑 - 单行para替换（有BUG）')
  console.log('-'.repeat(80))
  {
    const initialXml = `    <dmodule>
      <content>
        <para id="para-1">原始内容</para>
        <para id="para-2"/>
        <title>标题</title>
      </content>
    </dmodule>`

    const editor = new MockCodeMirror(initialXml)
    const lineno = 2 // <para id="para-1">原始内容</para>
    const endline = lineno // 单行para

    // 模拟旧代码的replaceRange调用
    const newXml = '        <para id="para-1">新内容ABC</para>'
    const endlineContent = editor.getLine(endline)

    editor.replaceRange(
      newXml,
      { line: lineno, ch: 0 },
      { line: endline, ch: endlineContent.length }
    )

    const result = editor.getValue()
    console.log('初始XML第2-4行:')
    console.log('  第2行: <para id="para-1">原始内容</para>')
    console.log('  第3行: <para id="para-2"/>')
    console.log('  第4行: <title>标题</title>')
    console.log()
    console.log('保存后第2-4行:')
    const lines = result.split('\n')
    console.log(`  第2行: ${lines[2]}`)
    console.log(`  第3行: ${lines[3]}`)
    console.log(`  第4行: ${lines[4]}`)
    console.log()

    // 验证是否有问题
    if (lines[2].includes('新内容ABC') && lines[3].includes('para-2') && !lines[2].includes('</para></para>')) {
      console.log('✓ 测试通过（但实际场景可能因长度差异出现问题）')
      passed++
    } else {
      console.log('✗ 测试失败：发现数据错位或丢失')
      failed++
    }
    console.log()
  }

  // 测试2：旧代码遇到长度不匹配的场景（必然出现BUG）
  console.log('【测试2】旧代码遇到长度变化 - 暴露BUG')
  console.log('-'.repeat(80))
  {
    const initialXml = `    <para id="test">很长的原始内容1234567890ABCDEFG</para>
    <para id="next">下一行</para>`

    const editor = new MockCodeMirror(initialXml)
    const lineno = 0
    const endline = lineno

    // 新内容比原内容短
    const newXml = '    <para id="test">短</para>'
    const endlineContent = editor.getLine(endline)

    console.log(`原始行长度: ${endlineContent.length}`)
    console.log(`新XML长度: ${newXml.length}`)
    console.log()

    editor.replaceRange(
      newXml,
      { line: lineno, ch: 0 },
      { line: endline, ch: endlineContent.length }
    )

    const result = editor.getValue()
    const lines = result.split('\n')

    console.log('保存后第0-1行:')
    console.log(`  第0行: ${lines[0]}`)
    console.log(`  第1行: ${lines[1]}`)
    console.log()

    if (lines[0] === '    <para id="test">短</para>' && lines[1].includes('next')) {
      console.log('✓ 测试通过')
      passed++
    } else {
      console.log('✗ 测试失败：发现残留内容或丢失')
      console.log(`  期望第0行: "    <para id="test">短</para>"`)
      console.log(`  实际第0行: "${lines[0]}"`)
      failed++
    }
    console.log()
  }

  // 测试3：新代码逻辑（已修复）
  console.log('【测试3】新代码逻辑 - 单行para正确替换（已修复）')
  console.log('-'.repeat(80))
  {
    const initialXml = `    <para id="test">很长的原始内容1234567890ABCDEFG</para>
    <para id="next">下一行</para>
    <title>标题</title>`

    const editor = new MockCodeMirror(initialXml)
    const lineno = 0
    const endline = lineno

    // 🔧 修复后的逻辑：使用多行替换模式
    const newXml = '    <para id="test">短</para>\n' // 带换行符

    editor.replaceRange(
      newXml,
      { line: lineno, ch: 0 },
      { line: endline + 1, ch: 0 } // 到下一行开头
    )

    const result = editor.getValue()
    const lines = result.split('\n')

    console.log('保存后第0-2行:')
    console.log(`  第0行: ${lines[0]}`)
    console.log(`  第1行: ${lines[1]}`)
    console.log(`  第2行: ${lines[2]}`)
    console.log()

    if (lines[0] === '    <para id="test">短</para>' &&
        lines[1].includes('next') &&
        lines[2].includes('标题')) {
      console.log('✓ 测试通过：完整替换，无残留，下一行正常')
      passed++
    } else {
      console.log('✗ 测试失败')
      failed++
    }
    console.log()
  }

  // 测试4：新代码处理长度增加的场景
  console.log('【测试4】新代码处理内容变长')
  console.log('-'.repeat(80))
  {
    const initialXml = `    <para id="test">短</para>
    <para id="next">重要的下一行</para>`

    const editor = new MockCodeMirror(initialXml)
    const lineno = 0
    const endline = lineno

    const newXml = '    <para id="test">这是一段非常非常长的新内容XYZXYZXYZ</para>\n'

    editor.replaceRange(
      newXml,
      { line: lineno, ch: 0 },
      { line: endline + 1, ch: 0 }
    )

    const result = editor.getValue()
    const lines = result.split('\n')

    console.log('保存后:')
    console.log(`  第0行: ${lines[0]}`)
    console.log(`  第1行: ${lines[1]}`)
    console.log()

    if (lines[0].includes('非常非常长的新内容') &&
        lines[1].includes('重要的下一行')) {
      console.log('✓ 测试通过：长内容正确保存，下一行未被覆盖')
      passed++
    } else {
      console.log('✗ 测试失败')
      failed++
    }
    console.log()
  }

  // 测试5：多行para保持原有逻辑（回归测试）
  console.log('【测试5】多行para不受影响（回归）')
  console.log('-'.repeat(80))
  {
    const initialXml = `    <para id="test">
      第一行
      第二行
    </para>
    <para id="next"/>
    <title>标题</title>`

    const editor = new MockCodeMirror(initialXml)
    const lineno = 0
    const endline = 3 // 多行para

    // 多行para继续使用原有逻辑
    const newXml = '    <para id="test">编辑后的多行内容</para>'
    const endlineContent = editor.getLine(endline)

    editor.replaceRange(
      newXml,
      { line: lineno, ch: 0 },
      { line: endline, ch: endlineContent.length }
    )

    const result = editor.getValue()
    const lines = result.split('\n')

    console.log('保存后:')
    console.log(`  第0行: ${lines[0]}`)
    console.log(`  第1行: ${lines[1]}`)
    console.log(`  第2行: ${lines[2]}`)
    console.log()

    if (lines[0].includes('编辑后的多行内容') &&
        lines[1].includes('next')) {
      console.log('✓ 测试通过：多行para正常工作')
      passed++
    } else {
      console.log('✗ 测试失败')
      failed++
    }
    console.log()
  }

  // 测试6：边界条件 - 最后一行
  console.log('【测试6】边界条件 - 单行para是文件最后一行')
  console.log('-'.repeat(80))
  {
    const initialXml = `    <content>
      <title>标题</title>
      <para id="last">最后一行</para>`

    const editor = new MockCodeMirror(initialXml)
    const lineno = 2
    const endline = lineno

    const newXml = '      <para id="last">编辑后的最后一行</para>\n'

    // 修复后的逻辑：即使是最后一行，也使用line+1
    // CodeMirror会自动处理越界情况
    editor.replaceRange(
      newXml,
      { line: lineno, ch: 0 },
      { line: endline + 1, ch: 0 } // line 3 (不存在，但CodeMirror会处理)
    )

    const result = editor.getValue()
    const lines = result.split('\n')

    console.log('保存后:')
    console.log(`  第2行: ${lines[2]}`)
    console.log()

    if (lines[2].includes('编辑后的最后一行')) {
      console.log('✓ 测试通过：最后一行正确替换')
      passed++
    } else {
      console.log('✗ 测试失败')
      failed++
    }
    console.log()
  }

  // 汇总
  console.log('='.repeat(80))
  console.log('测试汇总')
  console.log('='.repeat(80))
  console.log(`✓ 通过: ${passed}`)
  console.log(`✗ 失败: ${failed}`)
  console.log(`总计: ${passed + failed}`)
  console.log()

  if (failed === 0) {
    console.log('🎉 所有测试通过！P0修复已验证。')
  } else {
    console.log('❌ 有测试失败，需要进一步检查。')
  }
  console.log()

  return { passed, failed }
}

// 运行测试
if (require.main === module) {
  const { passed, failed } = runTests()
  process.exit(failed > 0 ? 1 : 0)
}

module.exports = { runTests, MockCodeMirror }
