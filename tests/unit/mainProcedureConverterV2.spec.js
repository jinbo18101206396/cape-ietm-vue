/**
 * mainProcedure 设计器单元测试
 * 测试转换器的核心功能
 *
 * @jest-environment jsdom
 */

import {
  parseXmlToTree,
  treeToXml,
  createEmptyNode,
  createEmptyHtmlContent,
  validateTree,
  regenerateIds
} from '@/views/ietm/ietmdatamodulemanagement/editor/utils/mainProcedureConverterV2'

describe('mainProcedureConverterV2', () => {

  // ==================== parseXmlToTree 测试 ====================

  describe('parseXmlToTree', () => {

    test('应该正确解析单行XML', () => {
      const xml = '<mainProcedure></mainProcedure>'
      const result = parseXmlToTree(xml)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('0')
      expect(result[0].stepno).toBe('《操作步骤》')
      expect(result[0].children).toEqual([])
    })

    test('应该正确解析包含一级步骤的XML', () => {
      const xml = `
        <mainProcedure>
          <proceduralStep>
            <title>步骤1</title>
          </proceduralStep>
          <proceduralStep>
            <title>步骤2</title>
          </proceduralStep>
        </mainProcedure>
      `
      const result = parseXmlToTree(xml)

      expect(result).toHaveLength(1)
      expect(result[0].children).toHaveLength(2)
      expect(result[0].children[0].id).toBe('1')
      expect(result[0].children[1].id).toBe('2')
    })

    test('应该正确解析嵌套步骤的XML', () => {
      const xml = `
        <mainProcedure>
          <proceduralStep>
            <title>步骤1</title>
            <proceduralStep>
              <title>步骤1.1</title>
            </proceduralStep>
          </proceduralStep>
        </mainProcedure>
      `
      const result = parseXmlToTree(xml)

      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].id).toBe('1')
      expect(result[0].children[0].children).toHaveLength(1)
      expect(result[0].children[0].children[0].id).toBe('1.1')
    })

    test('应该正确提取warning的嵌套结构', () => {
      const xml = `
        <mainProcedure>
          <proceduralStep>
            <warning>
              <warningAndCautionPara id="warn-001">危险内容</warningAndCautionPara>
            </warning>
          </proceduralStep>
        </mainProcedure>
      `
      const result = parseXmlToTree(xml)

      const step = result[0].children[0]
      expect(step.html.warning).toBeTruthy()

      const warnings = JSON.parse(step.html.warning)
      expect(warnings).toHaveLength(1)
      expect(warnings[0].content).toBe('危险内容')
      expect(warnings[0].id).toBe('warn-001')
    })

    test('应该正确提取caution的嵌套结构', () => {
      const xml = `
        <mainProcedure>
          <proceduralStep>
            <caution>
              <warningAndCautionPara id="caut-001">注意内容</warningAndCautionPara>
            </caution>
          </proceduralStep>
        </mainProcedure>
      `
      const result = parseXmlToTree(xml)

      const step = result[0].children[0]
      const cautions = JSON.parse(step.html.caution)
      expect(cautions).toHaveLength(1)
      expect(cautions[0].content).toBe('注意内容')
    })

    test('应该正确提取note的嵌套结构', () => {
      const xml = `
        <mainProcedure>
          <proceduralStep>
            <note>
              <notePara id="note-001">注解内容</notePara>
            </note>
          </proceduralStep>
        </mainProcedure>
      `
      const result = parseXmlToTree(xml)

      const step = result[0].children[0]
      const notes = JSON.parse(step.html.note)
      expect(notes).toHaveLength(1)
      expect(notes[0].content).toBe('注解内容')
    })

    test('应该抛出错误当XML为空', () => {
      expect(() => parseXmlToTree('')).toThrow('XML字符串为空')
    })

    test('应该抛出错误当XML格式错误', () => {
      const xml = '<mainProcedure><proceduralStep>'
      expect(() => parseXmlToTree(xml)).toThrow()
    })
  })

  // ==================== treeToXml 测试 ====================

  describe('treeToXml', () => {

    test('应该正确生成空mainProcedure', () => {
      const tree = [createEmptyNode('0', '-1')]
      tree[0].children = []

      const xml = treeToXml(tree)
      expect(xml).toBe('<mainProcedure>\n</mainProcedure>')
    })

    test('应该按S1000D顺序生成元素', () => {
      const tree = [createEmptyNode('0', '-1')]
      const step = createEmptyNode('1', '0')
      step.html = {
        warning: JSON.stringify([{ content: 'warning', id: 'w1' }]),
        caution: JSON.stringify([{ content: 'caution', id: 'c1' }]),
        para: JSON.stringify([{ content: 'para', id: 'p1' }]),
        note: JSON.stringify([{ content: 'note', id: 'n1' }]),
        figure: '',
        multimedia: '',
        table: ''
      }
      tree[0].children = [step]

      const xml = treeToXml(tree)

      // 验证顺序：warning → caution → note → para
      const warningIndex = xml.indexOf('<warning>')
      const cautionIndex = xml.indexOf('<caution>')
      const noteIndex = xml.indexOf('<note>')
      const paraIndex = xml.indexOf('<para')

      expect(warningIndex).toBeLessThan(cautionIndex)
      expect(cautionIndex).toBeLessThan(noteIndex)
      expect(noteIndex).toBeLessThan(paraIndex)
    })

    test('应该正确包装warning为warningAndCautionPara', () => {
      const tree = [createEmptyNode('0', '-1')]
      const step = createEmptyNode('1', '0')
      step.html = {
        warning: JSON.stringify([{ content: '<p>危险</p>', id: 'w1' }]),
        caution: '',
        para: '',
        note: '',
        figure: '',
        multimedia: '',
        table: ''
      }
      tree[0].children = [step]

      const xml = treeToXml(tree)

      expect(xml).toContain('<warning>')
      expect(xml).toContain('<warningAndCautionPara')
      expect(xml).toContain('</warningAndCautionPara>')
      expect(xml).toContain('</warning>')
      // 确保内容被正确提取（去除了<p>标签）
      expect(xml).toContain('危险')
    })

    test('应该正确处理xlink命名空间恢复', () => {
      const tree = [createEmptyNode('0', '-1')]
      const step = createEmptyNode('1', '0')
      step.html = {
        warning: '',
        caution: '',
        para: '',
        note: '',
        figure: JSON.stringify([{
          xml: '<figure><graphic xlink_href="test.jpg"/></figure>',
          id: 'fig1'
        }]),
        multimedia: '',
        table: ''
      }
      tree[0].children = [step]

      const xml = treeToXml(tree)

      // 应该恢复为 xlink:
      expect(xml).toContain('xlink:href')
      expect(xml).not.toContain('xlink_href')
    })
  })

  // ==================== 辅助函数测试 ====================

  describe('createEmptyNode', () => {
    test('应该创建正确的空节点结构', () => {
      const node = createEmptyNode('1', '0')

      expect(node.id).toBe('1')
      expect(node._parentId).toBe('0')
      expect(node.stepno).toBe('步骤1')
      expect(node.html).toHaveProperty('warning')
      expect(node.html).toHaveProperty('caution')
      expect(node.html).toHaveProperty('para')
      expect(node.html).toHaveProperty('note')
      expect(node.html).toHaveProperty('figure')
      expect(node.html).toHaveProperty('multimedia')
      expect(node.html).toHaveProperty('table')
    })
  })

  describe('validateTree', () => {
    test('应该验证通过正确的树结构', () => {
      const tree = [createEmptyNode('0', '-1')]
      const result = validateTree(tree)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('应该检测出非数组结构', () => {
      const result = validateTree({})

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('树形数据必须是数组')
    })

    test('应该检测出空数组', () => {
      const result = validateTree([])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('树形数据为空')
    })

    test('应该检测出根节点ID错误', () => {
      const tree = [createEmptyNode('1', '-1')]
      const result = validateTree(tree)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('regenerateIds', () => {
    test('应该正确重新生成所有节点ID', () => {
      const tree = [createEmptyNode('wrong', '-1')]
      const child1 = createEmptyNode('wrong1', 'wrong')
      const child2 = createEmptyNode('wrong2', 'wrong')
      const grandchild = createEmptyNode('wrong3', 'wrong1')

      child1.children = [grandchild]
      tree[0].children = [child1, child2]

      const result = regenerateIds(tree)

      expect(result[0].id).toBe('0')
      expect(result[0].children[0].id).toBe('1')
      expect(result[0].children[1].id).toBe('2')
      expect(result[0].children[0].children[0].id).toBe('1.1')
    })
  })

  // ==================== 集成测试 ====================

  describe('集成测试：XML → Tree → XML', () => {
    test('应该保持数据完整性（往返转换）', () => {
      const originalXml = `
        <mainProcedure>
          <proceduralStep>
            <title>检查油量</title>
            <warning>
              <warningAndCautionPara id="w1">危险：高温</warningAndCautionPara>
            </warning>
            <para id="p1">检查油位是否正常</para>
            <proceduralStep>
              <title>打开油箱盖</title>
              <para id="p2">逆时针旋转</para>
            </proceduralStep>
          </proceduralStep>
        </mainProcedure>
      `

      // XML → Tree
      const tree = parseXmlToTree(originalXml)

      // Tree → XML
      const generatedXml = treeToXml(tree)

      // 验证关键内容存在
      expect(generatedXml).toContain('检查油量')
      expect(generatedXml).toContain('危险：高温')
      expect(generatedXml).toContain('检查油位是否正常')
      expect(generatedXml).toContain('打开油箱盖')
      expect(generatedXml).toContain('逆时针旋转')

      // 验证结构正确
      expect(generatedXml).toContain('<mainProcedure>')
      expect(generatedXml).toContain('</mainProcedure>')
      expect(generatedXml).toContain('<proceduralStep>')
      expect(generatedXml).toContain('</proceduralStep>')

      // 验证嵌套结构正确
      const warningCount = (generatedXml.match(/<warning>/g) || []).length
      expect(warningCount).toBe(1)
    })
  })
})
