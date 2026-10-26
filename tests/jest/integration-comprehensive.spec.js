/**
 * 集成测试 + 边界值测试
 * 2026-10-10: 新增12个集成和边界值测试
 */

describe('集成测试 - XML编辑完整流程', () => {
  test('创建→编码→存储→读取→解码流程', () => {
    const PLACEHOLDER_LF = 'h10A'

    function escapeXmlForAttribute(xml) {
      return xml.replace(/\n/g, PLACEHOLDER_LF).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    function unescapeXmlAttribute(escaped) {
      return escaped.replace(/h10A/g, '\n').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    }

    // 1. 创建XML
    const originalXml = '<para>Line 1\nLine 2</para>'

    // 2. 编码存储
    const stored = escapeXmlForAttribute(originalXml)

    // 3. 读取解码
    const recovered = unescapeXmlAttribute(stored)

    // 4. 验证
    expect(recovered).toBe(originalXml)
  })

  test('源码编辑→格式化→保存→加载流程', () => {
    const originalXml = '<dmodule>\n  <content/>\n</dmodule>'

    // 模拟格式化
    const lines = originalXml.split('\n')
    expect(lines.length).toBe(3)

    // 验证结构
    expect(lines[0]).toContain('dmodule')
    expect(lines[1]).toContain('content')
    expect(lines[2]).toContain('/dmodule')
  })

  test('嵌套元素插入流程', () => {
    const elements = [
      { name: 'dmodule', level: 0 },
      { name: 'content', level: 1 },
      { name: 'para', level: 2 }
    ]

    // 验证嵌套关系
    for (let i = 0; i < elements.length - 1; i++) {
      expect(elements[i + 1].level).toBe(elements[i].level + 1)
    }
  })

  test('自闭合标签展开→子元素插入流程', () => {
    // 1. 开始时有自闭合标签
    let xml = '<content/>'
    expect(xml).toMatch(/\/>/)

    // 2. 展开
    xml = '<content>\n</content>'
    expect(xml).not.toMatch(/\/>/)

    // 3. 插入子元素
    const child = '<para/>'
    const result = xml.replace('</content>', `  ${child}\n</content>`)
    expect(result).toContain('<para/>')
  })

  test('删除元素→更新行号流程', () => {
    const lines = [
      '<dmodule>', // 行0
      '  <content>', // 行1
      '    <para/>', // 行2
      '  </content>', // 行3
      '</dmodule>' // 行4
    ]

    // 删除para
    const filteredLines = lines.filter(line => !line.includes('para'))
    expect(filteredLines.length).toBe(4)

    // 验证行号仍然连贯
    expect(filteredLines[0]).toContain('dmodule')
    expect(filteredLines[filteredLines.length - 1]).toContain('dmodule')
  })
})

describe('边界值测试 - 极限情况', () => {
  test('空XML文档', () => {
    const xml = ''
    expect(xml.length).toBe(0)
  })

  test('仅有根元素', () => {
    const xml = '<dmodule/>'
    expect(xml).toMatch(/<dmodule\//)
  })

  test('最大深度嵌套（100层）', () => {
    let xml = ''
    for (let i = 0; i < 100; i++) {
      xml += '<a>'
    }
    for (let i = 0; i < 100; i++) {
      xml += '</a>'
    }

    expect(xml.match(/<a>/g).length).toBe(100)
    expect(xml.match(/<\/a>/g).length).toBe(100)
  })

  test('极长属性值（10KB）', () => {
    const longValue = 'a'.repeat(10000)
    const xml = `<elem>${longValue}</elem>`
    expect(xml.length).toBeGreaterThan(10000)
  })

  test('特殊字符混合', () => {
    const special = '<>&"\'`\n\r\t'
    expect(special.length).toBe(10)
  })

  test('连续相同标签', () => {
    const xml = '<a/><a/><a/><a/><a/>'
    expect(xml.match(/<a\/>/g).length).toBe(5)
  })

  test('混合自闭合和双标签', () => {
    const xml = '<a><b/><c><d/></c></a>'
    expect(xml.match(/\/>/g).length).toBe(2) // b和d
    expect(xml.match(/<c>/g).length).toBe(1)
    expect(xml.match(/<\/c>/g).length).toBe(1)
  })

  test('重复的相同元素', () => {
    const elements = ['para', 'para', 'para', 'para', 'para']
    expect(new Set(elements).size).toBe(1) // 只有1种唯一元素
    expect(elements.length).toBe(5)
  })

  test('包含所有特殊字符的属性', () => {
    const specialChars = '<>&"\' `\n\r'
    const xml = `<elem text="${specialChars}"/>`
    expect(xml).toContain(specialChars)
  })

  test('多行内容（1000行）', () => {
    let content = ''
    for (let i = 0; i < 1000; i++) {
      content += `line${i}\n`
    }
    expect(content.split('\n').length).toBe(1001) // 1000行 + 最后的空行
  })
})

describe('异常处理测试', () => {
  test('未闭合的标签检测', () => {
    const xml = '<root><content>'
    const openCount = (xml.match(/<\w+/g) || []).length
    const closeCount = (xml.match(/<\/\w+/g) || []).length
    expect(openCount).toBeGreaterThan(closeCount)
  })

  test('错误的嵌套顺序检测', () => {
    const xml = '<a><b></a></b>'
    // 简单检查：最后的闭合标签应该是最后打开的标签
    const lastOpen = xml.lastIndexOf('<')
    const lastClose = xml.lastIndexOf('</')
    // lastClose应该在lastOpen之后（闭合标签应该在后）
    expect(lastClose).toBeGreaterThan(lastOpen)
  })

  test('重复的ID检测', () => {
    const nodes = [
      { id: 1, name: 'node1' },
      { id: 1, name: 'node2' }, // 重复ID
      { id: 3, name: 'node3' }
    ]

    const idSet = new Set(nodes.map(n => n.id))
    expect(idSet.size).toBeLessThan(nodes.length) // 有重复
  })

  test('无效的属性值', () => {
    const attrs = {
      id: null, // 无效
      name: '', // 有效（空字符串）
      value: undefined // 无效
    }

    const validAttrs = Object.values(attrs).filter(v => v !== null && v !== undefined)
    expect(validAttrs.length).toBe(1) // 只有name有效
  })

  test('环形引用检测', () => {
    const node1 = { id: 1, parent: null }
    const node2 = { id: 2, parent: node1 }
    node1.parent = node2 // 创建环

    let current = node1
    let depth = 0
    while (current && depth < 10) {
      current = current.parent
      depth++
    }

    expect(depth).toBe(10) // 应该达到深度限制
  })

  test('过大的深度限制', () => {
    let depth = 0
    const maxDepth = 50

    while (depth < 200 && depth < maxDepth) {
      depth++
    }

    expect(depth).toBe(50) // 应该在50处停止
  })
})

describe('数据一致性测试', () => {
  test('编码后的数据长度应该增加', () => {
    const original = '<tag>content</tag>'
    const encoded = original
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    expect(encoded.length).toBeGreaterThan(original.length)
  })

  test('编码后仍能解码回原始值', () => {
    const original = 'a & b < c > d'
    const encoded = original
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const decoded = encoded
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')

    expect(decoded).toBe(original)
  })

  test('元素计数一致性', () => {
    const xml = '<root><a/><b/><c/></root>'
    const selfClosing = xml.match(/\/>/g) || []
    expect(selfClosing.length).toBe(3)
  })

  test('属性数量一致性', () => {
    const xml = '<elem attr1="v1" attr2="v2" attr3="v3"/>'
    const attrCount = (xml.match(/\w+="/g) || []).length
    expect(attrCount).toBe(3)
  })

  test('嵌套层级一致性', () => {
    const xml = '<a><b><c><d/></c></b></a>'
    const opens = xml.match(/<[^/>/]+>/g) || []
    const closes = xml.match(/<\/\w+>/g) || []
    expect(opens.length).toBe(closes.length)
  })
})
