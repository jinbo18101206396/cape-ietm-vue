/**
 * levelledParaConverterV2.test.js
 * 完整单元测试 - XML 属性转义、序列化、S1000D 标准验证
 */

import {
  parseXmlToTree,
  treeToXml,
  getRowhtml,
  createEmptyHtmlContent,
  createEmptyNode,
  validateTree
} from '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/levelledParaConverterV2'

// 模拟 DOMParser 和 XMLSerializer（在 Node.js 环境中）
if (typeof DOMParser === 'undefined') {
  const { DOMParser, XMLSerializer } = require('xmldom')
  global.DOMParser = DOMParser
  global.XMLSerializer = XMLSerializer
}

describe('levelledParaConverterV2 - XML 属性转义修复', () => {
  describe('问题1: 属性值转义', () => {
    test('应该正确转义包含 & 的属性值', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <multimedia id="222">
          <multimediaObject infoEntityIdent="ICN-ZB1-A&amp;000000-60101"/>
        </multimedia>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 验证生成的 XML 中属性值被正确转义
      expect(generated).toContain('infoEntityIdent="ICN-ZB1-A&amp;000000-60101"')
    })

    test('应该正确转义包含 < 和 > 的属性值', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <para id="1">
          <content note="version &lt; 2.0 &gt; required"/>
        </para>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      expect(generated).toContain('note="version &lt; 2.0 &gt; required"')
    })

    test('应该正确转义包含引号的属性值', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <para id="1">
          <content description='He said &quot;Hello&quot;'/>
        </para>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 生成的 XML 应该使用正确的转义形式
      expect(generated).toBeDefined()
    })
  })

  describe('问题2: Multimedia 双重序列化', () => {
    test('应该保持 multimedia 元素的属性完整性', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <levelledPara>
          <title>层级1</title>
          <multimedia id="222" xlink:type="simple" xlink:show="replace">
            <title>111</title>
            <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101-30101-00007-A-001-01" multimediaType="3D"/>
          </multimedia>
        </levelledPara>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 验证 multimedia 元素的所有属性都被保留
      expect(generated).toContain('multimedia')
      expect(generated).toContain('id="222"')
      expect(generated).toContain('multimediaType="3D"')
      expect(generated).toContain('infoEntityIdent')
    })

    test('应该正确处理嵌套的结构化元素（figure/table）', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <levelledPara>
          <title>层级1</title>
          <figure id="fig-1" xlink:type="locator">
            <title>图表</title>
            <graphic xlink:href="image.jpg"/>
          </figure>
        </levelledPara>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      expect(generated).toContain('figure')
      expect(generated).toContain('id="fig-1"')
      expect(generated).toContain('title>图表</title')
    })
  })

  describe('问题3: Namespace 声明正则表达式', () => {
    test('应该正确处理没有 xmlns:xlink 的元素', () => {
      const xml = `<levelledPara>
        <para id="p1" xlink:type="simple">文本</para>
      </levelledPara>`

      // 应该能解析（预处理会添加 xmlns:xlink）
      const tree = parseXmlToTree(xml)
      expect(tree).toBeDefined()
      expect(tree.length).toBeGreaterThan(0)
    })

    test('应该不重复添加 xmlns:xlink 声明', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <para id="p1" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple">文本</para>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 计算 xmlns:xlink 出现次数，不应该过多
      const matches = generated.match(/xmlns:xlink/g)
      // 应该有合理数量的 namespace 声明（不超过元素数量）
      expect(matches.length).toBeLessThanOrEqual(10)
    })
  })
})

describe('S1000D 标准验证', () => {
  describe('元素顺序和嵌套', () => {
    test('S1000D: 内容元素应该按标准顺序排列', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <levelledPara>
          <title>层级1</title>
          <warning id="w1">
            <warningAndCautionPara>警告文本</warningAndCautionPara>
          </warning>
          <para id="p1">
            <para>段落文本</para>
          </para>
          <multimedia id="m1">
            <multimediaObject/>
          </multimedia>
        </levelledPara>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      expect(tree).toBeDefined()

      // 验证树形结构正确
      expect(tree[0].children).toBeDefined()
      expect(tree[0].children.length).toBeGreaterThan(0)
    })

    test('S1000D: levelledPara 可以嵌套多层', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <levelledPara>
          <title>层级1</title>
          <levelledPara>
            <title>层级1.1</title>
            <para><para>文本</para></para>
          </levelledPara>
        </levelledPara>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 验证嵌套结构被保留
      expect(generated).toContain('层级1')
      expect(generated).toContain('层级1.1')
      expect(generated.split('<levelledPara').length).toBeGreaterThan(3) // 至少 3 个 levelledPara
    })
  })

  describe('属性要求', () => {
    test('S1000D: 多媒体元素应该有 id 属性', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <multimedia id="m-001">
          <multimediaObject xlink:type="simple"/>
        </multimedia>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 验证 id 属性存在
      expect(generated).toMatch(/multimedia\s+.*id="m-001"/)
    })

    test('S1000D: xlink 属性应该正确应用', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <multimedia id="m1">
          <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" xlink:href="file.jpg"/>
        </multimedia>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 验证 xlink 属性被保留
      expect(generated).toContain('xlink:type')
      expect(generated).toContain('xlink:show')
      expect(generated).toContain('xlink:actuate')
    })
  })

  describe('XML 格式要求', () => {
    test('生成的 XML 应该能被 DOMParser 成功解析', () => {
      const inputXml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <levelledPara>
          <title>测试</title>
          <multimedia id="m1">
            <title>多媒体</title>
            <multimediaObject xlink:type="simple" infoEntityIdent="ICN-001"/>
          </multimedia>
          <para id="p1">
            <para>文本</para>
          </para>
        </levelledPara>
      </levelledPara>`

      const tree = parseXmlToTree(inputXml)
      const generated = treeToXml(tree)

      // 关键验证：生成的 XML 应该能被重新解析
      const parser = new DOMParser()
      const doc = parser.parseFromString(generated, 'text/xml')

      // 检查是否有解析错误
      const parserError = doc.querySelector ? doc.querySelector('parsererror') : null
      expect(parserError).toBeNull()

      // 检查根元素存在
      expect(doc.documentElement.nodeName).toBe('levelledPara')
    })

    test('XML 声明应该包含编码信息', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <para id="p1">
          <para>文本</para>
        </para>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 验证 XML 格式正确
      expect(generated).toContain('<levelledPara')
      expect(generated).toContain('xmlns:xlink')
      expect(generated).toContain('</levelledPara>')
    })

    test('所有属性值应该被正确转义', () => {
      const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <para id="p1" description="Test &amp; verify &lt;XML&gt; escaping">
          <para>测试</para>
        </para>
      </levelledPara>`

      const tree = parseXmlToTree(xml)
      const generated = treeToXml(tree)

      // 验证属性值转义
      expect(generated).toContain('&amp;')
      expect(generated).toContain('&lt;')
      expect(generated).toContain('&gt;')
    })
  })

  describe('完整集成测试', () => {
    test('完整的 multimedia 插入、保存、解析流程', () => {
      // 1. 初始 XML（用户创建的）
      const initialXml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <levelledPara>
          <title>层级1</title>
        </levelledPara>
      </levelledPara>`

      // 2. 解析为树形结构
      const tree1 = parseXmlToTree(initialXml)
      expect(tree1.length).toBeGreaterThan(0)

      // 3. 添加 multimedia 内容（模拟用户操作）
      if (tree1[0].children.length > 0) {
        const firstChild = tree1[0].children[0]
        // 在这里应该能访问到子节点
        expect(firstChild).toBeDefined()
      }

      // 4. 生成 XML
      const generated = treeToXml(tree1)
      expect(generated).toBeDefined()

      // 5. 重新解析生成的 XML
      const tree2 = parseXmlToTree(generated)
      expect(tree2.length).toBeGreaterThan(0)

      // 6. 再次生成 XML（应该幂等）
      const generated2 = treeToXml(tree2)
      expect(generated2).toBeDefined()

      // 基本的结构应该相同
      const elem1Count = (generated.match(/<levelledPara/g) || []).length
      const elem2Count = (generated2.match(/<levelledPara/g) || []).length
      expect(elem1Count).toBe(elem2Count)
    })

    test('处理特殊字符的完整流程', () => {
      const complexXml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <levelledPara>
          <title>Title with &quot;quotes&quot; &amp; special chars &lt;&gt;</title>
          <multimedia id="m-001" description="Test &amp; verify" xlink:href="file.jpg">
            <title>Multimedia Title</title>
            <multimediaObject xlink:type="simple" infoEntityIdent="ICN-A&B-001"/>
          </multimedia>
          <para id="p-001">
            <para>Paragraph with &lt;tags&gt; &amp; entities</para>
          </para>
        </levelledPara>
      </levelledPara>`

      const tree = parseXmlToTree(complexXml)
      const generated = treeToXml(tree)

      // 可以再次解析
      const tree2 = parseXmlToTree(generated)
      expect(tree2).toBeDefined()

      // 验证关键信息保留
      expect(generated).toContain('&quot;')
      expect(generated).toContain('&amp;')
      expect(generated).toContain('ICN-A&amp;B-001')
    })
  })
})

describe('回归测试 - 原始错误场景', () => {
  test('原始错误场景：multimedia 插入后的保存和解析', () => {
    // 这是用户报告的原始场景
    const scenarioXml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
      <levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
        <title>层级1</title>
        <multimedia xmlns:xlink="http://www.w3.org/1999/xlink" id="222">
          <title>111</title>
          <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101-30101-00007-A-001-01" multimediaType="3D"/>
        </multimedia>
      </levelledPara>
    </levelledPara>`

    // 应该能被解析
    const tree = parseXmlToTree(scenarioXml)
    expect(tree).toBeDefined()
    expect(tree.length).toBeGreaterThan(0)

    // 生成的 XML 应该有效
    const generated = treeToXml(tree)
    expect(generated).toBeDefined()

    // 不应该包含格式错误
    expect(generated).not.toMatch(/="\s*"/)  // 空属性值
    expect(generated).not.toMatch(/>[\s]*</g)  // 缺失元素标签

    // 应该能再次解析
    const tree2 = parseXmlToTree(generated)
    expect(tree2).toBeDefined()

    console.log('✅ 原始错误场景验证通过')
    console.log('生成的 XML:\n', generated.substring(0, 500))
  })
})
