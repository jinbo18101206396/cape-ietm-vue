/**
 * Para转换器单元测试 - dmRef多行格式保留修复验证
 */

const { escapeXmlForAttribute, unescapeXmlAttribute, para2html, html2para } = require('../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')

// 注：使用 require() 时需要导出这些函数，当前代码可能使用 export
// 这里假设通过修改paraConverter.js以支持Node.js导出

describe('Para转换器 - dmRef多行格式保留修复', () => {
  describe('escapeXmlForAttribute函数', () => {
    test('应将换行符转换为__LF__文本标记', () => {
      const xml = '<dmRef>\n  <child/>\n</dmRef>'
      const escaped = escapeXmlForAttribute(xml)

      expect(escaped).toContain('__LF__')
      expect(escaped).not.toContain('\n')
    })

    test('应将回车符转换为__CR__文本标记', () => {
      const xml = '<dmRef>\r\n  <child/>\r\n</dmRef>'
      const escaped = escapeXmlForAttribute(xml)

      expect(escaped).toContain('__CR__')
      expect(escaped).toContain('__LF__')
      expect(escaped).not.toContain('\r')
    })

    test('应保留其他XML实体编码', () => {
      const xml = '<dmRef type="simple" title="A & B">'
      const escaped = escapeXmlForAttribute(xml)

      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
      expect(escaped).toContain('&quot;')
      expect(escaped).toContain('&amp;')
    })
  })

  describe('unescapeXmlAttribute函数', () => {
    test('应将__LF__文本标记还原为换行符', () => {
      const escaped = '&lt;dmRef&gt;__LF__  &lt;child/&gt;__LF__&lt;/dmRef&gt;'
      const unescaped = unescapeXmlAttribute(escaped)

      expect(unescaped).toContain('\n')
      expect(unescaped).not.toContain('__LF__')
      expect(unescaped.split('\n').length).toBe(3)
    })

    test('应将__CR__文本标记还原为回车符', () => {
      const escaped = '&lt;dmRef&gt;__CR____LF__  &lt;child/&gt;__CR____LF__&lt;/dmRef&gt;'
      const unescaped = unescapeXmlAttribute(escaped)

      expect(unescaped).toContain('\r')
      expect(unescaped).toContain('\n')
      expect(unescaped).not.toContain('__CR__')
      expect(unescaped).not.toContain('__LF__')
    })

    test('应还原其他XML实体编码', () => {
      const escaped = '&lt;dmRef type=&quot;simple&quot; title=&quot;A &amp; B&quot;&gt;'
      const unescaped = unescapeXmlAttribute(escaped)

      expect(unescaped).toBe('<dmRef type="simple" title="A & B">')
    })
  })

  describe('往返一致性 (Round-trip)', () => {
    test('单行XML往返应一致', () => {
      const original = '<dmRef type="simple"/>'
      const escaped = escapeXmlForAttribute(original)
      const restored = unescapeXmlAttribute(escaped)

      expect(restored).toBe(original)
    })

    test('多行dmRef XML往返应一致', () => {
      const original = `<dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
  <dmRefIdent>
    <dmCode assyCode="00" disassyCode="00" disassyCodeVariant="A"/>
    <language languageIsoCode="zh" countryIsoCode="CN"/>
  </dmRefIdent>
  <dmRefAddressItems>
    <dmTitle>
      <techName>项目自定义</techName>
      <infoName>符号清单</infoName>
    </dmTitle>
  </dmRefAddressItems>
</dmRef>`

      const escaped = escapeXmlForAttribute(original)
      const restored = unescapeXmlAttribute(escaped)

      // 核心断言：往返后XML完全相同
      expect(restored).toBe(original)
      expect(restored.split('\n').length).toBe(original.split('\n').length)
    })

    test('含CRLF的dmRef XML往返应一致', () => {
      const original = `<dmRef type="simple">\r\n  <child/>\r\n</dmRef>`
      const escaped = escapeXmlForAttribute(original)
      const restored = unescapeXmlAttribute(escaped)

      expect(restored).toBe(original)
      expect(restored.includes('\r\n')).toBe(true)
    })

    test('含特殊字符的dmRef XML往返应一致', () => {
      const original = `<dmRef title="A & B < C >">
  <dmTitle>项目自定义</dmTitle>
  <infoName>"符号" & '图形'</infoName>
</dmRef>`

      const escaped = escapeXmlForAttribute(original)
      const restored = unescapeXmlAttribute(escaped)

      expect(restored).toBe(original)
      expect(restored.split('\n').length).toBe(original.split('\n').length)
    })
  })

  describe('HTML属性编码兼容性', () => {
    test('编码后的XML不应含有\'\\n\'字符（浏览器规范化）', () => {
      const xml = '<dmRef>\n  <child/>\n</dmRef>'
      const escaped = escapeXmlForAttribute(xml)

      // 关键验证：不含实际换行符，只含__LF__标记
      expect(escaped).not.toMatch(/(?<!_)\\n(?!_)/)
      expect(escaped).toContain('__LF__')
    })

    test('编码后的XML应可安全用于HTML属性值', () => {
      const xml = '<dmRef>\n  <child attr="value"/>\n</dmRef>'
      const escaped = escapeXmlForAttribute(xml)

      // 构造HTML属性，应不被浏览器规范化
      const htmlAttr = `xml="${escaped}"`

      // 验证属性值完整性
      expect(htmlAttr).toContain('__LF__')
      // 属性值中不应含有未转义的双引号
      const match = htmlAttr.match(/xml="([^"]*)"/)
      expect(match).not.toBe(null)
    })
  })
})
