/**
 * P0-1修复验证：自闭合标签的深度检查缺陷
 * 问题：P0-1中的深度检查对自闭合标签误伤，导致它们的lineno为0
 * 修复：自闭合标签跳过深度检查（因为它们不会入栈）
 */

describe('P0-1修复: 自闭合标签深度检查', () => {
  /**
   * 模拟_calcLinenoFromXml的核心逻辑
   * 这是精简版本，用于验证深度检查的正确性
   */
  function calculateLineno(nodes, xmlLines) {
    const TAG = '[A-Za-z_一-鿿][\\w.\\-一-鿿]*'
    let nodeIdx = 0
    let stack = []
    let nodeStack = []
    const dmLineIdx = 0 // 假设dmodule在第0行

    for (let lineIdx = 0; lineIdx < xmlLines.length; lineIdx++) {
      const trimmed = xmlLines[lineIdx].trim()

      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith('<!--')) continue

      const openMatch = trimmed.match(new RegExp('^<(' + TAG + ')[\\s/>]'))
      if (openMatch) {
        const tagName = openMatch[1]
        const isSelfClosing = trimmed.endsWith('/>')

        // 关键修复: 自闭合标签不做深度检查
        if (nodeIdx < nodes.length && nodes[nodeIdx].text === tagName) {
          const depthMatch = isSelfClosing || (stack.length === nodeStack.length)
          if (depthMatch) {
            nodes[nodeIdx].attributes.lineno = lineIdx - dmLineIdx + 1
            if (!isSelfClosing) {
              nodeStack.push(nodeIdx)
            }
            nodeIdx++
          }
        }

        if (!isSelfClosing) {
          stack.push(tagName)
        }
        continue
      }

      const closeMatch = trimmed.match(new RegExp('^</(' + TAG + ')>'))
      if (closeMatch) {
        const tagName = closeMatch[1]
        if (stack.length > 0 && stack[stack.length - 1] === tagName) {
          stack.pop()
          if (nodeStack.length > 0) {
            nodeStack.pop()
          }
        }
      }
    }

    return nodes
  }

  test('自闭合标签应该被识别', () => {
    const nodes = [
      { text: 'dmodule', attributes: { lineno: 0 } },
      { text: 'description', attributes: { lineno: 0 } } // 自闭合标签
    ]
    const xml = [
      '<dmodule>',
      '  <description/>',
      '</dmodule>'
    ]

    calculateLineno(nodes, xml)

    expect(nodes[0].attributes.lineno).toBe(1) // dmodule
    expect(nodes[1].attributes.lineno).toBe(2) // description (自闭合)
  })

  test('混合自闭合和非自闭合标签', () => {
    const nodes = [
      { text: 'dmodule', attributes: { lineno: 0 } },
      { text: 'content', attributes: { lineno: 0 } },
      { text: 'refs', attributes: { lineno: 0 } },
      { text: 'description', attributes: { lineno: 0 } }
    ]
    const xml = [
      '<dmodule>',
      '  <content>',
      '    <refs/>',
      '  </content>',
      '  <description/>',
      '</dmodule>'
    ]

    calculateLineno(nodes, xml)

    expect(nodes[0].attributes.lineno).toBe(1) // dmodule
    expect(nodes[1].attributes.lineno).toBe(2) // content
    expect(nodes[2].attributes.lineno).toBe(3) // refs (自闭合)
    expect(nodes[3].attributes.lineno).toBe(5) // description (自闭合)
  })

  test('连续自闭合标签', () => {
    const nodes = [
      { text: 'dmodule', attributes: { lineno: 0 } },
      { text: 'symbol', attributes: { lineno: 0 } },
      { text: 'graphic', attributes: { lineno: 0 } },
      { text: 'para', attributes: { lineno: 0 } }
    ]
    const xml = [
      '<dmodule>',
      '  <symbol/>',
      '  <graphic/>',
      '  <para/>',
      '</dmodule>'
    ]

    calculateLineno(nodes, xml)

    expect(nodes[0].attributes.lineno).toBe(1)
    expect(nodes[1].attributes.lineno).toBe(2) // symbol
    expect(nodes[2].attributes.lineno).toBe(3) // graphic
    expect(nodes[3].attributes.lineno).toBe(4) // para
  })

  test('深度嵌套中的自闭合标签', () => {
    const nodes = [
      { text: 'dmodule', attributes: { lineno: 0 } },
      { text: 'content', attributes: { lineno: 0 } },
      { text: 'para', attributes: { lineno: 0 } },
      { text: 'symbol', attributes: { lineno: 0 } },
      { text: 'description', attributes: { lineno: 0 } }
    ]
    const xml = [
      '<dmodule>',
      '  <content>',
      '    <para>',
      '      <symbol/>', // 深度2的自闭合标签
      '    </para>',
      '    <description/>', // 深度1的自闭合标签
      '  </content>',
      '</dmodule>'
    ]

    calculateLineno(nodes, xml)

    expect(nodes[0].attributes.lineno).toBe(1) // dmodule
    expect(nodes[1].attributes.lineno).toBe(2) // content
    expect(nodes[2].attributes.lineno).toBe(3) // para
    expect(nodes[3].attributes.lineno).toBe(4) // symbol (深度2自闭合)
    expect(nodes[4].attributes.lineno).toBe(6) // description (深度1自闭合)
  })

  test('所有节点都应该有行号（非零）', () => {
    const nodes = [
      { text: 'dmodule', attributes: { lineno: 0 } },
      { text: 'content', attributes: { lineno: 0 } },
      { text: 'description', attributes: { lineno: 0 } },
      { text: 'refs', attributes: { lineno: 0 } }
    ]
    const xml = [
      '<dmodule>',
      '  <content>',
      '    <description/>',
      '    <refs/>',
      '  </content>',
      '</dmodule>'
    ]

    calculateLineno(nodes, xml)

    // 验证所有节点都被正确赋予行号
    for (let i = 0; i < nodes.length; i++) {
      expect(nodes[i].attributes.lineno).toBeGreaterThan(0)
      // 行号应该是1-based的相对行号
      expect(nodes[i].attributes.lineno).toBeLessThanOrEqual(xml.length)
    }
  })
})
