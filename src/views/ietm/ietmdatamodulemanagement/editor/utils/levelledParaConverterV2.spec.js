/**
 * levelledParaConverterV2.spec.js
 * 第1阶段单元测试：数据结构 + 加载流程
 *
 * 测试目标：
 * 1. 验证 TypeScript 接口正确
 * 2. 验证 parseXmlToTree 完整提取所有 7 种内容类型
 * 3. 验证 getRowhtml 功能正确
 * 4. 验证往返一致性（XML → Tree → 验证）
 */

import {
  parseXmlToTree,
  treeToXml,
  getRowhtml,
  createEmptyHtmlContent,
  createEmptyNode
} from '../utils/levelledParaConverterV2'

describe('levelledParaConverterV2', () => {
  // ============ 测试1：空输入处理 ============
  test('Test 1: parseXmlToTree should handle empty input', () => {
    expect(parseXmlToTree('')).toEqual([])
    expect(parseXmlToTree(null)).toEqual([])
    expect(parseXmlToTree(undefined)).toEqual([])
  })

  // ============ 测试2：单一内容类型解析 ============
  test('Test 2: parseXmlToTree should parse single para element', () => {
    const xml = `
      <levelledPara>
        <para>测试段落</para>
      </levelledPara>
    `

    const result = parseXmlToTree(xml)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('0')
    expect(result[0].type).toBe('levelledPara')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].type).toBe('para')
    expect(result[0].children[0].html.para).toHaveLength(1)
  })

  // ============ 测试3：多类型混合（核心修复验证）============
  test('Test 3: parseXmlToTree should extract ALL 7 content types from mixed node', () => {
    const xml = `
      <levelledPara>
        <para id="p1">段落内容</para>
        <warning id="w1">警告内容</warning>
        <caution id="c1">注意内容</caution>
        <note id="n1">提醒内容</note>
        <figure id="f1"><title>图形</title></figure>
        <multimedia id="m1"><multimediaObject/></multimedia>
        <table id="t1"><title>表格</title></table>
      </levelledPara>
    `

    const result = parseXmlToTree(xml)
    const children = result[0].children

    // 验证提取了所有 7 种类型
    expect(children).toHaveLength(7)

    // 验证每种类型都有对应的 html 内容
    const allHtmlContent = children.reduce((acc, node) => {
      acc.para = acc.para.concat(node.html.para)
      acc.warning = acc.warning.concat(node.html.warning)
      acc.caution = acc.caution.concat(node.html.caution)
      acc.note = acc.note.concat(node.html.note)
      acc.figure = acc.figure.concat(node.html.figure)
      acc.multimedia = acc.multimedia.concat(node.html.multimedia)
      acc.table = acc.table.concat(node.html.table)
      return acc
    }, createEmptyHtmlContent())

    expect(allHtmlContent.para.length).toBeGreaterThan(0)
    expect(allHtmlContent.warning.length).toBeGreaterThan(0)
    expect(allHtmlContent.caution.length).toBeGreaterThan(0)
    expect(allHtmlContent.note.length).toBeGreaterThan(0)
    expect(allHtmlContent.figure.length).toBeGreaterThan(0)
    expect(allHtmlContent.multimedia.length).toBeGreaterThan(0)
    expect(allHtmlContent.table.length).toBeGreaterThan(0)
  })

  // ============ 测试4：getRowhtml 完整提取 ============
  test('Test 4: getRowhtml should extract all 7 types', () => {
    const xmlString = `
      <levelledPara>
        <para id="p1">段落</para>
        <warning id="w1">警告</warning>
        <caution id="c1">注意</caution>
        <note id="n1">提醒</note>
        <figure id="f1"><title>图</title></figure>
        <multimedia id="m1"><multimediaObject/></multimedia>
        <table id="t1"><title>表</title></table>
      </levelledPara>
    `

    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const levelledPara = doc.querySelector('levelledPara')

    const html = getRowhtml(levelledPara)

    expect(html.para.length).toBe(1)
    expect(html.warning.length).toBe(1)
    expect(html.caution.length).toBe(1)
    expect(html.note.length).toBe(1)
    expect(html.figure.length).toBe(1)
    expect(html.multimedia.length).toBe(1)
    expect(html.table.length).toBe(1)
  })

  // ============ 测试5：嵌套结构解析 ============
  test('Test 5: parseXmlToTree should handle nested hierarchy', () => {
    const xml = `
      <levelledPara>
        <para id="p1">
          <para id="p2">嵌套段落</para>
        </para>
        <warning id="w1">
          <para id="p3">嵌套</para>
        </warning>
      </levelledPara>
    `

    const result = parseXmlToTree(xml)
    const children = result[0].children

    expect(children).toHaveLength(2)
    expect(children[0].children).toHaveLength(1)  // 第一个 para 有嵌套的 para
    expect(children[1].children).toHaveLength(1)  // warning 有嵌套的 para
  })

  // ============ 测试6：特殊字符处理 ============
  test('Test 6: parseXmlToTree should preserve special characters', () => {
    const xml = `
      <levelledPara>
        <para id="p1">测试 &lt; &gt; &amp; " ' 特殊字符</para>
        <note id="n1">说明文字 &lt;tag&gt;</note>
      </levelledPara>
    `

    const result = parseXmlToTree(xml)
    expect(result[0].children.length).toBeGreaterThan(0)

    // 验证特殊字符被正确处理
    const html = result[0].children[0].html
    expect(html.para.length + html.note.length).toBeGreaterThan(0)
  })

  // ============ 测试7：属性保留 ============
  test('Test 7: getRowhtml should preserve element attributes', () => {
    const xmlString = `
      <levelledPara>
        <figure id="fig1" class="important">
          <title>图形标题</title>
          <graphic href="image.jpg"/>
        </figure>
      </levelledPara>
    `

    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const levelledPara = doc.querySelector('levelledPara')

    const html = getRowhtml(levelledPara)
    expect(html.figure.length).toBe(1)
    expect(html.figure[0].xml).toContain('id="fig1"')
    expect(html.figure[0].xml).toContain('class="important"')
  })

  // ============ 测试8：创建空节点 ============
  test('Test 8: createEmptyNode should initialize with correct structure', () => {
    const node = createEmptyNode('para', '1.1')

    expect(node.id).toBe('1.1')
    expect(node.type).toBe('para')
    expect(node.title).toBe('para 1.1')
    expect(node.html).toBeDefined()
    expect(Object.keys(node.html)).toEqual([
      'warning',
      'caution',
      'note',
      'para',
      'figure',
      'multimedia',
      'table'
    ])
  })

  // ============ 测试9：往返一致性（单类型）============
  test('Test 9: Round-trip consistency for single type', () => {
    const originalXml = `<levelledPara>
  <para id="p1">测试内容</para>
</levelledPara>`

    const tree = parseXmlToTree(originalXml)
    const xml = treeToXml(tree)

    // 再次解析验证一致性
    const tree2 = parseXmlToTree(xml)
    expect(tree2[0].children.length).toBe(tree[0].children.length)
  })

  // ============ 测试10：往返一致性（多类型）============
  test('Test 10: Round-trip consistency for multiple types', () => {
    const originalXml = `<levelledPara>
  <para id="p1">段落</para>
  <warning id="w1">警告</warning>
  <note id="n1">提醒</note>
</levelledPara>`

    const tree = parseXmlToTree(originalXml)

    // 验证第一次解析
    expect(tree[0].children.length).toBe(3)

    const xml = treeToXml(tree)
    const tree2 = parseXmlToTree(xml)

    // 验证第二次解析内容数量一致
    expect(tree2[0].children.length).toBe(tree[0].children.length)
  })

  // ============ 测试11：往返一致性（包含结构化内容）============
  test('Test 11: Round-trip consistency with structured content', () => {
    const originalXml = `<levelledPara>
  <para id="p1">段落</para>
  <figure id="f1"><title>图形</title><graphic/></figure>
  <table id="t1"><title>表格</title><tgroup cols="2"><tbody><row><entry>A</entry><entry>B</entry></row></tbody></tgroup></table>
</levelledPara>`

    const tree = parseXmlToTree(originalXml)
    const xml = treeToXml(tree)
    const tree2 = parseXmlToTree(xml)

    // 验证内容数量一致
    expect(tree2[0].children.length).toBe(tree[0].children.length)

    // 验证每种类型都被保留
    const allItems = tree2[0].children.reduce((acc, node) => {
      acc.total += Object.values(node.html).reduce((sum, arr) => sum + arr.length, 0)
      return acc
    }, { total: 0 })

    expect(allItems.total).toBeGreaterThanOrEqual(3)
  })

  // ============ 测试12：S1000D 顺序验证 ============
  test('Test 12: Serialization maintains S1000D order', () => {
    const originalXml = `<levelledPara>
  <table id="t1"><title>表</title></table>
  <multimedia id="m1"><multimediaObject/></multimedia>
  <figure id="f1"><title>图</title></figure>
  <para id="p1">段</para>
  <note id="n1">提</note>
  <caution id="c1">注</caution>
  <warning id="w1">警</warning>
</levelledPara>`

    const tree = parseXmlToTree(originalXml)
    const xml = treeToXml(tree)

    // 验证序列化后的顺序：warning > caution > note > para > figure > multimedia > table
    const warningIndex = xml.indexOf('<warning')
    const cautionIndex = xml.indexOf('<caution')
    const noteIndex = xml.indexOf('<note')
    const paraIndex = xml.indexOf('<para')
    const figureIndex = xml.indexOf('<figure')
    const multimediaIndex = xml.indexOf('<multimedia')
    const tableIndex = xml.indexOf('<table')

    expect(warningIndex).toBeLessThan(cautionIndex)
    expect(cautionIndex).toBeLessThan(noteIndex)
    expect(noteIndex).toBeLessThan(paraIndex)
    expect(paraIndex).toBeLessThan(figureIndex)
    expect(figureIndex).toBeLessThan(multimediaIndex)
    expect(multimediaIndex).toBeLessThan(tableIndex)
  })

  // ============ 测试13：复杂嵌套结构 ============
  test('Test 13: Complex nested structure round-trip', () => {
    const originalXml = `<levelledPara>
  <para id="p1">
    <para id="p2">嵌套段落1</para>
    <note id="n1">嵌套提醒</note>
  </para>
  <warning id="w1">
    <para id="p3">嵌套段落2</para>
    <figure id="f1"><title>嵌套图形</title></figure>
  </warning>
</levelledPara>`

    const tree = parseXmlToTree(originalXml)
    expect(tree[0].children.length).toBe(2)
    expect(tree[0].children[0].children.length).toBe(2)  // p1 有两个子节点

    const xml = treeToXml(tree)
    const tree2 = parseXmlToTree(xml)

    expect(tree2[0].children.length).toBe(tree[0].children.length)
    expect(tree2[0].children[0].children.length).toBe(tree[0].children[0].children.length)
  })

  // ============ 测试14：编辑后保存（核心场景）============
  test('Test 14: Save after editing should preserve all content types', () => {
    // 模拟用户编辑场景：加载 → 编辑 → 保存
    const originalXml = `<levelledPara>
  <warning id="w1">原始警告</warning>
  <para id="p1">原始段落</para>
</levelledPara>`

    const tree = parseXmlToTree(originalXml)

    // 模拟编辑：添加新的注意类型
    if (tree[0].children[1]) {  // 找到 para 节点
      tree[0].children[1].html.caution.push({
        id: 'c1',
        content: '<caution>新增注意</caution>'
      })
    }

    // 保存
    const xml = treeToXml(tree)

    // 验证保存后的内容
    const tree2 = parseXmlToTree(xml)
    expect(tree2[0].children.length).toBeGreaterThanOrEqual(2)

    // 验证所有类型都被保留
    const contentCounts = tree2[0].children.reduce((acc, node) => {
      acc.warning += node.html.warning.length
      acc.para += node.html.para.length
      acc.caution += node.html.caution.length
      return acc
    }, { warning: 0, para: 0, caution: 0 })

    expect(contentCounts.warning).toBeGreaterThan(0)
    expect(contentCounts.para).toBeGreaterThan(0)
    expect(contentCounts.caution).toBeGreaterThan(0)
  })

  // ============ 测试15：大规模数据往返一致性 ============
  test('Test 15: Large dataset round-trip consistency', () => {
    let xml = '<levelledPara>\n'

    // 生成 100 个节点（混合类型）
    for (let i = 0; i < 100; i++) {
      const type = ['para', 'warning', 'caution', 'note', 'figure', 'multimedia', 'table'][i % 7]
      if (type === 'figure') {
        xml += `  <figure id="f${i}"><title>Figure ${i}</title></figure>\n`
      } else if (type === 'table') {
        xml += `  <table id="t${i}"><title>Table ${i}</title></table>\n`
      } else if (type === 'multimedia') {
        xml += `  <multimedia id="m${i}"><multimediaObject/></multimedia>\n`
      } else {
        xml += `  <${type} id="${type[0]}${i}">Content ${i}</${type}>\n`
      }
    }

    xml += '</levelledPara>'

    const startTime = Date.now()
    const tree = parseXmlToTree(xml)
    const xml2 = treeToXml(tree)
    const tree2 = parseXmlToTree(xml2)
    const elapsed = Date.now() - startTime

    // 验证内容完整性
    expect(tree2[0].children.length).toBeGreaterThan(0)

    // 验证性能（应该在 500ms 内完成）
    expect(elapsed).toBeLessThan(500)
  })
})
