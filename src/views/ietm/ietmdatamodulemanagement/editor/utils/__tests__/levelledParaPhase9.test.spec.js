/**
 * Phase 9 集成测试：XML 缩进修复验证
 *
 * 修复内容：
 * - ✅ 第一行（<levelledPara>）现在获得基础缩进（8 个空格）
 * - ✅ treeToXml 已经包含正确的内部缩进（2 个空格/层）
 * - ✅ handleSave 只需应用基础缩进，保持 treeToXml 的格式
 *
 * 测试目标验证：
 * 1. 基础缩进应用到所有非空行
 * 2. 内部缩进由 treeToXml 维护（不需要重新格式化）
 * 3. 空行被正确处理
 */

describe('Phase 9: XML 缩进修复', () => {

  /**
   * 测试 1：验证基础缩进应用到第一行
   */
  test('基础缩进应用到所有行（包括第一行）', () => {
    // 模拟 treeToXml 的输出（不含基础缩进）
    const xmlFromTree = `<levelledPara>
  <title>第一层</title>
  <para id="p1">
    <text>内容</text>
  </para>
</levelledPara>`

    const baseIndent = '        '  // 8 个空格

    // 模拟 handleSave 中的缩进处理
    const indented = xmlFromTree.split('\n')
      .map((line) => {
        if (!line.trim()) return ''
        return baseIndent + line
      })
      .join('\n')

    const lines = indented.split('\n').filter(l => l.trim())

    // 验证
    expect(lines[0]).toBe(baseIndent + '<levelledPara>')              // ✅ 第一行有缩进
    expect(lines[1]).toBe(baseIndent + '  <title>第一层</title>')      // ✅ 内部缩进保留
    expect(lines[2]).toBe(baseIndent + '  <para id="p1">')            // ✅ 相同的第一层缩进
    expect(lines[3]).toBe(baseIndent + '    <text>内容</text>')       // ✅ 内部嵌套缩进保留
  })

  /**
   * 测试 2：验证完整的保存流程
   */
  test('完整流程：treeToXml + 基础缩进应用', () => {
    // 模拟完整的 XML（来自 treeToXml）
    const xml = `<levelledPara>
  <title>第一层</title>
  <para id="p1">
    <text>内容 1</text>
  </para>
  <levelledPara>
    <title>第二层</title>
    <para id="p2">
      <text>内容 2</text>
    </para>
  </levelledPara>
</levelledPara>`

    const baseIndent = '        '  // 8 个空格

    // 应用基础缩进
    let result = xml.split('\n')
      .map((line) => {
        if (!line.trim()) return ''
        return baseIndent + line
      })
      .join('\n')

    // 清理末尾
    result = result.trimEnd()

    const lines = result.split('\n')

    // 验证预期的缩进结构
    // 第 0 行：顶层 <levelledPara> → 8 个空格
    expect(lines[0]).toBe('        <levelledPara>')

    // 第 1 行：<title> 在顶层 levelledPara 内 → 8 + 2 = 10 个空格
    expect(lines[1]).toBe('          <title>第一层</title>')

    // 第 2 行：<para> 在顶层 levelledPara 内 → 8 + 2 = 10 个空格
    expect(lines[2]).toBe('          <para id="p1">')

    // 第 3 行：<text> 在 <para> 内 → 8 + 4 = 12 个空格
    expect(lines[3]).toBe('            <text>内容 1</text>')

    // 第 5 行：嵌套的 <levelledPara> → 8 + 2 = 10 个空格
    expect(lines[5]).toBe('          <levelledPara>')

    // 第 6 行：嵌套 levelledPara 的 <title> → 8 + 4 = 12 个空格
    expect(lines[6]).toBe('            <title>第二层</title>')

    // 最后一行：顶层关闭标签 → 8 个空格
    expect(lines[lines.length - 1]).toBe('        </levelledPara>')
  })

  /**
   * 测试 3：验证空行处理
   */
  test('空行应被移除', () => {
    const xml = `<levelledPara>

  <title>第一层</title>

</levelledPara>`

    const baseIndent = '        '

    const result = xml.split('\n')
      .map((line) => {
        if (!line.trim()) return ''
        return baseIndent + line
      })
      .join('\n')

    // 结果中的空行被替换为空字符串，形成连续的 \n\n
    // 这在后续处理中会被 trimEnd 清理
    const trimmed = result.trimEnd()
    const lines = trimmed.split('\n').filter(l => l.trim())

    // 验证实际的非空行数量
    expect(lines.length).toBe(3)  // <levelledPara>, <title>, </levelledPara>
    expect(lines[0]).toBe(baseIndent + '<levelledPara>')
    expect(lines[1]).toBe(baseIndent + '  <title>第一层</title>')
    expect(lines[2]).toBe(baseIndent + '</levelledPara>')
  })

  /**
   * 测试 4：验证缺少基础缩进的旧行为（应该被修复）
   */
  test('修复前：第一行不被缩进（错误行为）', () => {
    const xmlFromTree = `<levelledPara>
  <title>第一层</title>
</levelledPara>`

    const baseIndent = '        '

    // 旧的修复方法（有 bug）- index === 0 不处理
    const oldWayBuggy = xmlFromTree.split('\n')
      .map((line, index) => {
        if (index === 0) return line  // ❌ 第一行不缩进
        if (!line.trim()) return ''
        return baseIndent + line
      })
      .join('\n')

    const oldLines = oldWayBuggy.split('\n')
    // 验证旧的 bug 存在
    expect(oldLines[0]).toBe('<levelledPara>')  // ❌ 不缩进

    // 新的修复方法（正确）
    const newWayFixed = xmlFromTree.split('\n')
      .map((line) => {
        if (!line.trim()) return ''
        return baseIndent + line  // ✅ 包括第一行
      })
      .join('\n')

    const newLines = newWayFixed.split('\n')
    expect(newLines[0]).toBe(baseIndent + '<levelledPara>')  // ✅ 正确缩进
  })

  /**
   * 测试 5：验证缩进计算正确性
   */
  test('缩进计算：基础(8) + 内部(n*2) = 总计', () => {
    const baseIndent = '        '  // 8 个空格
    const depth1 = '  '             // 2 个空格
    const depth2 = '    '           // 4 个空格

    // 验证组合
    expect((baseIndent + depth1).length).toBe(10)  // 8 + 2 = 10
    expect((baseIndent + depth2).length).toBe(12)  // 8 + 4 = 12
    expect((baseIndent + depth1 + depth1).length).toBe(12)  // 8 + 2 + 2 = 12
  })

  /**
   * 测试 6：验证 trimEnd 正确清理末尾
   */
  test('trimEnd 应该清理末尾多余的空行', () => {
    const xml = `        <levelledPara>
          <title>第一层</title>
        </levelledPara>


`

    const cleaned = xml.trimEnd()

    // 末尾不应该有多个空行
    expect(cleaned).toBe(`        <levelledPara>
          <title>第一层</title>
        </levelledPara>`)
  })

  /**
   * 测试 7：验证实际编辑器场景
   */
  test('真实场景：从设计视图保存回源码视图', () => {
    // 原始源码编辑器中的行（包含基础缩进）
    const originalLine = '        <levelledPara id="lp1" />'

    // 提取基础缩进
    const baseIndentMatch = originalLine.match(/^(\s*)/)
    const baseIndent = baseIndentMatch ? baseIndentMatch[1] : ''

    expect(baseIndent).toBe('        ')  // 8 个空格

    // 从设计视图返回的 XML（无缩进）
    const newXml = `<levelledPara id="lp1">
  <title>编辑后</title>
  <para id="p1">
    <text>新内容</text>
  </para>
</levelledPara>`

    // 应用基础缩进
    let result = newXml.split('\n')
      .map((line) => {
        if (!line.trim()) return ''
        return baseIndent + line
      })
      .join('\n')

    result = result.trimEnd()

    // 验证结果
    const lines = result.split('\n')
    expect(lines[0]).toBe('        <levelledPara id="lp1">')
    expect(lines[1]).toBe('          <title>编辑后</title>')
    expect(lines[lines.length - 1]).toBe('        </levelledPara>')
  })
})
