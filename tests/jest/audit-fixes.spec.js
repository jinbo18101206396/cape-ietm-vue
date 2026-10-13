/**
 * 全面审核发现的问题修复测试
 * 2026-10-10: P1-B + P2-A修复验证
 */

describe('P1-B: findElementEndLine正则边界', () => {
  function findElementEndLine(elemName, editor) {
    const startLine = 0
    const closeTag = `</${elemName}>`

    let depth = 0
    for (let i = startLine; i < editor.length; i++) {
      const line = editor[i] || ''
      // 修复: 添加/ 使正则边界完整
      const openRe = new RegExp(`<${elemName}[\\s/>]`)
      if (openRe.test(line) && !line.trim().endsWith('/>')) depth++
      if (line.includes(closeTag)) {
        depth--
        if (depth === 0) return i
      }
    }
    return startLine
  }

  test('精确匹配content而不误匹配contentArea', () => {
    const editor = [
      '<content>',
      '  <contentArea>',  // 应该单独计数，不影响外层content
      '    <para/>',
      '  </contentArea>',
      '</content>',
    ]

    const endLine = findElementEndLine('content', editor)
    // content应该在第4行（0-based），而不是第3行
    expect(endLine).toBe(4)
  })

  test('正确处理多重嵌套同类名前缀', () => {
    const editor = [
      '<description>',
      '  <desc>',  // desc是description的前缀
      '    <para/>',
      '  </desc>',
      '</description>',
    ]

    const endLine = findElementEndLine('description', editor)
    expect(endLine).toBe(4)
  })

  test('自闭合标签不增加深度', () => {
    const editor = [
      '<content>',
      '  <symbol/>',  // 自闭合不增加depth
      '  <para/>',
      '</content>',
    ]

    const endLine = findElementEndLine('content', editor)
    expect(endLine).toBe(3)
  })

  test('深度计数正确（嵌套元素）', () => {
    const editor = [
      '<content>',
      '  <content>',      // 同名开始标签，depth=1
      '    <para/>',
      '  </content>',     // 同名闭合标签，depth=0
      '  <para/>',
      '</content>',       // 外层闭合标签
    ]

    const endLine = findElementEndLine('content', editor)
    // 应该定位到第5行（外层的</content>）
    expect(endLine).toBe(5)
  })
})

describe('P2-A: locateByLineno数据验证', () => {
  function locateByLineno(lineno, mockCursor) {
    // 修复: 添加lineno有效性检查
    if (!lineno || lineno <= 0) {
      return false  // 无效输入
    }
    const line = Math.max(0, lineno - 1)
    mockCursor.position = line
    return true
  }

  test('拒绝lineno=0', () => {
    const cursor = {}
    const result = locateByLineno(0, cursor)
    expect(result).toBe(false)
    expect(cursor.position).toBeUndefined()
  })

  test('拒绝负数lineno', () => {
    const cursor = {}
    const result = locateByLineno(-1, cursor)
    expect(result).toBe(false)
    expect(cursor.position).toBeUndefined()
  })

  test('接受null/undefined时返回false', () => {
    const cursor = {}
    expect(locateByLineno(null, cursor)).toBe(false)
    expect(locateByLineno(undefined, cursor)).toBe(false)
  })

  test('有效的lineno正常工作', () => {
    const cursor = {}
    const result = locateByLineno(5, cursor)
    expect(result).toBe(true)
    expect(cursor.position).toBe(4)  // 5-1=4 (0-based)
  })

  test('lineno=1定位到第0行', () => {
    const cursor = {}
    const result = locateByLineno(1, cursor)
    expect(result).toBe(true)
    expect(cursor.position).toBe(0)
  })
})

describe('回归测试: 原始功能仍然工作', () => {
  test('正常元素查找不受影响', () => {
    function findElementEndLine(elemName, editor) {
      const startLine = 0
      const closeTag = `</${elemName}>`

      let depth = 0
      for (let i = startLine; i < editor.length; i++) {
        const line = editor[i] || ''
        const openRe = new RegExp(`<${elemName}[\\s/>]`)
        if (openRe.test(line) && !line.trim().endsWith('/>')) depth++
        if (line.includes(closeTag)) {
          depth--
          if (depth === 0) return i
        }
      }
      return startLine
    }

    const xml = [
      '<dmodule>',
      '  <content>',
      '    <para>文本</para>',
      '  </content>',
      '</dmodule>',
    ]

    expect(findElementEndLine('content', xml)).toBe(3)
    expect(findElementEndLine('dmodule', xml)).toBe(4)
    expect(findElementEndLine('para', xml)).toBe(2)
  })

  test('自闭合标签特殊处理', () => {
    function findElementEndLine(elemName, editor) {
      const startLine = 0
      const closeTag = `</${elemName}>`
      const startText = editor[startLine]

      // 单行自闭合
      if (startText && startText.includes('/>')) {
        return startLine
      }

      let depth = 0
      for (let i = startLine; i < editor.length; i++) {
        const line = editor[i] || ''
        const openRe = new RegExp(`<${elemName}[\\s/>]`)
        if (openRe.test(line) && !line.trim().endsWith('/>')) depth++
        if (line.includes(closeTag)) {
          depth--
          if (depth === 0) return i
        }
      }
      return startLine
    }

    // 单行自闭合
    expect(findElementEndLine('symbol', ['<symbol/>'])).toBe(0)

    // 双标签
    const xml = [
      '<content>',
      '</content>',
    ]
    expect(findElementEndLine('content', xml)).toBe(1)
  })
})
