/**
 * paraConverter.js 全面测试
 * 对标 Para设计器开发需求文档.md §8 转换规则
 */

import { para2html, html2para } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter'

// Mock axios for captionGroup API calls
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({
    data: { success: true, result: { html: '<table><tr><td>mock</td></tr></table>' } }
  }))
}))

describe('paraConverter.js - §8 转换规则全面测试', () => {

  // ========== §8.2.1 definitionList 转换 ==========
  describe('§8.2.1 definitionList ↔ table 转换', () => {

    it('para2html: 应将 definitionList 转为带 deflist="1" 属性的 table', async () => {
      const xml = `<para>
        <definitionList>
          <definitionListItem>
            <listItemTerm>术语1</listItemTerm>
            <listItemDefinition>定义1</listItemDefinition>
          </definitionListItem>
          <definitionListItem>
            <listItemTerm>术语2</listItemTerm>
            <listItemDefinition>定义2</listItemDefinition>
          </definitionListItem>
        </definitionList>
      </para>`

      const html = await para2html(null, xml)

      expect(html).toContain('<table deflist="1">')
      expect(html).toContain('<tr>')
      expect(html).toContain('<th>术语1</th>')
      expect(html).toContain('<td>定义1</td>')
      expect(html).toContain('<th>术语2</th>')
      expect(html).toContain('<td>定义2</td>')
      expect(html).toContain('</table>')
    })

    it('para2html: 应处理自闭合的 listItemTerm 和 listItemDefinition', async () => {
      const xml = `<para>
        <definitionList>
          <definitionListItem>
            <listItemTerm/>
            <listItemDefinition/>
          </definitionListItem>
        </definitionList>
      </para>`

      const html = await para2html(null, xml)

      expect(html).toContain('<th></th>')
      expect(html).toContain('<td></td>')
    })

    it('html2para: 应将 deflist="1" 的 table 还原为 definitionList', async () => {
      const html = `<p>
        <table deflist="1">
          <tr>
            <th>术语A</th>
            <td>定义A</td>
          </tr>
        </table>
      </p>`

      const xml = await html2para(null, html)

      expect(xml).toContain('<definitionList>')
      expect(xml).toContain('<definitionListItem>')
      expect(xml).toContain('<listItemTerm>术语A</listItemTerm>')
      expect(xml).toContain('<listItemDefinition>定义A</listItemDefinition>')
      expect(xml).toContain('</definitionList>')
    })

    it('双向转换一致性：definitionList → HTML → definitionList', async () => {
      const originalXml = `<para>
        <definitionList>
          <definitionListItem>
            <listItemTerm>CPU</listItemTerm>
            <listItemDefinition>Central Processing Unit</listItemDefinition>
          </definitionListItem>
        </definitionList>
      </para>`

      const html = await para2html(null, originalXml)
      const backToXml = await html2para(null, html)

      // 规范化空白后比较
      const normalize = (s) => s.replace(/\s+/g, ' ').trim()
      expect(normalize(backToXml)).toContain(normalize('<definitionList>'))
      expect(normalize(backToXml)).toContain(normalize('<listItemTerm>CPU</listItemTerm>'))
      expect(normalize(backToXml)).toContain(normalize('<listItemDefinition>Central Processing Unit</listItemDefinition>'))
    })
  })

  // ========== §8.2.2 基础元素转换 ==========
  describe('§8.2.2 基础元素转换', () => {

    it('para2html: para → p', async () => {
      const xml = '<para>测试段落</para>'
      const html = await para2html(null, xml)
      expect(html).toBe('<p>测试段落</p>')
    })

    it('html2para: p → para', async () => {
      const html = '<p>测试段落</p>'
      const xml = await html2para(null, html)
      expect(xml).toBe('<para>测试段落</para>')
    })

    it('para2html: superScript → sup', async () => {
      const xml = '<para>x<superScript>2</superScript></para>'
      const html = await para2html(null, xml)
      expect(html).toBe('<p>x<sup>2</sup></p>')
    })

    it('html2para: sup → superScript', async () => {
      const html = '<p>x<sup>2</sup></p>'
      const xml = await html2para(null, html)
      expect(xml).toBe('<para>x<superScript>2</superScript></para>')
    })

    it('para2html: subScript → sub', async () => {
      const xml = '<para>H<subScript>2</subScript>O</para>'
      const html = await para2html(null, xml)
      expect(html).toBe('<p>H<sub>2</sub>O</p>')
    })

    it('html2para: sub → subScript', async () => {
      const html = '<p>H<sub>2</sub>O</p>'
      const xml = await html2para(null, html)
      expect(xml).toBe('<para>H<subScript>2</subScript>O</para>')
    })

    it('para2html: emphasis → strong', async () => {
      const xml = '<para><emphasis>重要</emphasis></para>'
      const html = await para2html(null, xml)
      expect(html).toBe('<p><strong>重要</strong></p>')
    })

    it('html2para: strong → emphasis', async () => {
      const html = '<p><strong>重要</strong></p>'
      const xml = await html2para(null, html)
      expect(xml).toBe('<para><emphasis>重要</emphasis></para>')
    })

    it('para2html: randomList → ul', async () => {
      const xml = `<para>
        <randomList>
          <listItem><para>项1</para></listItem>
          <listItem><para>项2</para></listItem>
        </randomList>
      </para>`
      const html = await para2html(null, xml)
      expect(html).toContain('<ul>')
      expect(html).toContain('<li><p>项1</p></li>')
      expect(html).toContain('<li><p>项2</p></li>')
      expect(html).toContain('</ul>')
    })

    it('html2para: ul → randomList', async () => {
      const html = `<p>
        <ul>
          <li><p>项1</p></li>
          <li><p>项2</p></li>
        </ul>
      </p>`
      const xml = await html2para(null, html)
      expect(xml).toContain('<randomList>')
      expect(xml).toContain('<listItem><para>项1</para></listItem>')
      expect(xml).toContain('<listItem><para>项2</para></listItem>')
      expect(xml).toContain('</randomList>')
    })

    it('para2html: sequentialList → ol', async () => {
      const xml = `<para>
        <sequentialList>
          <listItem><para>步骤1</para></listItem>
          <listItem><para>步骤2</para></listItem>
        </sequentialList>
      </para>`
      const html = await para2html(null, xml)
      expect(html).toContain('<ol>')
      expect(html).toContain('<li><p>步骤1</p></li>')
      expect(html).toContain('<li><p>步骤2</p></li>')
      expect(html).toContain('</ol>')
    })

    it('html2para: ol → sequentialList', async () => {
      const html = `<p>
        <ol>
          <li><p>步骤1</p></li>
          <li><p>步骤2</p></li>
        </ol>
      </p>`
      const xml = await html2para(null, html)
      expect(xml).toContain('<sequentialList>')
      expect(xml).toContain('<listItem><para>步骤1</para></listItem>')
      expect(xml).toContain('<listItem><para>步骤2</para></listItem>')
      expect(xml).toContain('</sequentialList>')
    })
  })

  // ========== §8.2.3 内部引用 internalRef ==========
  describe('§8.2.3 internalRef 转换', () => {

    it('para2html: 应将 internalRef 转为带 xml 属性的 <a> 标签（非自闭合）', async () => {
      const xml = '<para><internalRef internalRefId="fig-001" internalRefTargetType="figure">图1</internalRef></para>'
      const html = await para2html(null, xml)

      expect(html).toContain('<a href="javascript:void(0);"')
      expect(html).toContain('xml="')
      expect(html).toContain('【figure(fig-001)】')
      expect(html).toContain('</a>')
    })

    it('para2html: 应将自闭合 internalRef 转为 <a> 标签', async () => {
      const xml = '<para><internalRef internalRefId="table-002" internalRefTargetType="table"/></para>'
      const html = await para2html(null, xml)

      expect(html).toContain('<a href="javascript:void(0);"')
      expect(html).toContain('【table(table-002)】')
    })

    it('html2para: 应将带 xml 属性的 <a> 标签还原为 internalRef', async () => {
      const html = '<p><a href="javascript:void(0);" xml="&lt;internalRef internalRefId=`ref123` internalRefTargetType=`hotspot`/&gt;">【hotspot(ref123)】</a></p>'
      const xml = await html2para(null, html)

      expect(xml).toContain('<internalRef')
      expect(xml).toContain('internalRefId="ref123"')
      expect(xml).toContain('internalRefTargetType="hotspot"')
    })
  })

  // ========== §8.2.4 DM引用 dmRef ==========
  describe('§8.2.4 dmRef 转换', () => {

    it('para2html: 应将 dmRef 转为带特定样式的 <a> 标签', async () => {
      const xml = '<para><dmRef><dmCode modelIdentCode="A" systemDiffCode="B"/><dmTitle>参考DM</dmTitle></dmRef></para>'
      const html = await para2html(null, xml)

      expect(html).toContain('<a dmref="1"')
      expect(html).toContain('href="javascript:void(0);"')
      expect(html).toContain('style="color:#0000ff;cursor:pointer"')
      expect(html).toContain('【参考DM】')
    })

    it('html2para: 应将 dmref="1" 的 <a> 标签还原为 dmRef', async () => {
      const html = '<p><a dmref="1" xml="&lt;dmRef&gt;&lt;dmCode modelIdentCode=`M123`/&gt;&lt;dmTitle&gt;标题&lt;/dmTitle&gt;&lt;/dmRef&gt;">【标题】</a></p>'
      const xml = await html2para(null, html)

      expect(xml).toContain('<dmRef>')
      expect(xml).toContain('modelIdentCode="M123"')
      expect(xml).toContain('<dmTitle>标题</dmTitle>')
      expect(xml).toContain('</dmRef>')
    })
  })

  // ========== §8.2.5 图形 graphic ==========
  describe('§8.2.5 graphic 转换', () => {

    it('para2html: 应将 graphic 转为 <img> 标签', async () => {
      const xml = '<para><graphic infoEntityIdent="ICN-001"/></para>'
      const html = await para2html(null, xml)

      expect(html).toContain('<img')
      expect(html).toContain('src="/jeecg-boot/ietm/dm-resource/displayResource?resourceName=ICN-001"')
      expect(html).toContain('xml="')
    })

    it('html2para: 应将带 xml 属性的 <img> 还原为 graphic', async () => {
      const html = '<p><img src="/path/to/image" xml="&lt;graphic infoEntityIdent=`ICN-999`/&gt;"/></p>'
      const xml = await html2para(null, html)

      expect(xml).toContain('<graphic')
      expect(xml).toContain('infoEntityIdent="ICN-999"')
    })
  })

  // ========== §8.2.6 符号 symbol ==========
  describe('§8.2.6 symbol 转换', () => {

    it('para2html: 应将 symbol 转为带边框的 <img> 标签', async () => {
      const xml = '<para><symbol infoEntityIdent="SYM-ABC" boardno="001"/></para>'
      const html = await para2html(null, xml)

      expect(html).toContain('<img')
      expect(html).toContain('infoEntityIdent="SYM-ABC"')
      expect(html).toContain('boardno="001"')
      expect(html).toContain('style="border:1px solid red;"')
      expect(html).toContain('xml="')
    })

    it('html2para: 应将带 infoEntityIdent 和 boardno 的 <img> 还原为 symbol', async () => {
      const html = '<p><img infoEntityIdent="SYM-XYZ" boardno="999" xml="&lt;symbol infoEntityIdent=`SYM-XYZ` boardno=`999`/&gt;"/></p>'
      const xml = await html2para(null, html)

      expect(xml).toContain('<symbol')
      expect(xml).toContain('infoEntityIdent="SYM-XYZ"')
      expect(xml).toContain('boardno="999"')
    })
  })

  // ========== §8.2.7 多媒体 multimediaObject ==========
  describe('§8.2.7 multimediaObject 转换', () => {

    it('para2html: 应将 multimediaObject 转为 <video> 标签', async () => {
      const xml = '<para><multimediaObject multimediaObjectType="2" multimediaObjectPath="video.mp4"/></para>'
      const html = await para2html(null, xml)

      expect(html).toContain('<video')
      expect(html).toContain('src="/jeecg-boot/ietm/dm-resource/displayResource?resourceName=video.mp4"')
      expect(html).toContain('controls')
      expect(html).toContain('xml="')
    })

    it('html2para: 应将 <video> 还原为 multimediaObject', async () => {
      const html = '<p><video src="/path/to/video" xml="&lt;multimediaObject multimediaObjectType=`2` multimediaObjectPath=`test.mp4`/&gt;" controls></video></p>'
      const xml = await html2para(null, html)

      expect(xml).toContain('<multimediaObject')
      expect(xml).toContain('multimediaObjectType="2"')
      expect(xml).toContain('multimediaObjectPath="test.mp4"')
    })
  })

  // ========== §8.2.8 公式 verbatimText ==========
  describe('§8.2.8 verbatimText (公式) 转换', () => {

    it('para2html: 应将带 mathml 样式的 verbatimText 转为带特定类的 span', async () => {
      const xml = '<para><verbatimText verbatimStyle="vs23"><verbatimContent>E=mc^2</verbatimContent></verbatimText></para>'
      const html = await para2html(null, xml)

      expect(html).toContain('<span')
      expect(html).toContain('class="formula"')
      expect(html).toContain('xml="')
      expect(html).toContain('E=mc^2')
    })

    it('html2para: 应将 class="formula" 的 span 还原为 verbatimText', async () => {
      const html = '<p><span class="formula" xml="&lt;verbatimText verbatimStyle=`vs23`&gt;&lt;verbatimContent&gt;F=ma&lt;/verbatimContent&gt;&lt;/verbatimText&gt;">F=ma</span></p>'
      const xml = await html2para(null, html)

      expect(xml).toContain('<verbatimText')
      expect(xml).toContain('verbatimStyle="vs23"')
      expect(xml).toContain('<verbatimContent>F=ma</verbatimContent>')
    })
  })

  // ========== §8.3 captionGroup 转换 ==========
  describe('§8.3 captionGroup (需后端API) 转换', () => {

    it('para2html: 应调用 API 将 captionGroup 转为 table（mock）', async () => {
      const xml = '<para><captionGroup><captionRow><captionEntry><captionLine>单元格</captionLine></captionEntry></captionRow></captionGroup></para>'
      const html = await para2html(null, xml)

      // Mock axios 返回 HTML
      expect(html).toContain('<table>')
      expect(html).toContain('mock')
    })

    it('html2para: 应将 captiontype="1" 的 table 还原为 captionGroup', async () => {
      const html = '<p><table captiontype="1"><tr><td>数据</td></tr></table></p>'
      const xml = await html2para(null, html)

      expect(xml).toContain('<captionGroup>')
      expect(xml).toContain('<captionRow>')
      expect(xml).toContain('<captionEntry>')
      expect(xml).toContain('<captionLine>数据</captionLine>')
      expect(xml).toContain('</captionGroup>')
    })
  })

  // ========== 边界情况 ==========
  describe('边界情况', () => {

    it('para2html: 空字符串应返回空', async () => {
      expect(await para2html(null, '')).toBe('')
      expect(await para2html(null, '   ')).toBe('')
    })

    it('html2para: 空字符串应返回空', async () => {
      expect(await html2para(null, '')).toBe('')
      expect(await html2para(null, '   ')).toBe('')
    })

    it('para2html: 不含特殊标签的纯文本应保持不变', async () => {
      const text = '<para>纯文本</para>'
      const html = await para2html(null, text)
      expect(html).toBe('<p>纯文本</p>')
    })

    it('html2para: 普通 table（无 deflist/captiontype）应保持不变', async () => {
      const html = '<p><table><tr><td>普通表格</td></tr></table></p>'
      const xml = await html2para(null, html)
      expect(xml).toContain('<table>')
      expect(xml).toContain('<tr>')
      expect(xml).toContain('<td>普通表格</td>')
    })

    it('复杂嵌套结构：列表中嵌套图形和引用', async () => {
      const xml = `<para>
        <randomList>
          <listItem>
            <para>项1包含<graphic infoEntityIdent="ICN-001"/>图形</para>
          </listItem>
          <listItem>
            <para>项2包含<internalRef internalRefId="ref-001" internalRefTargetType="para">引用</internalRef></para>
          </listItem>
        </randomList>
      </para>`

      const html = await para2html(null, xml)

      expect(html).toContain('<ul>')
      expect(html).toContain('<img')
      expect(html).toContain('ICN-001')
      expect(html).toContain('<a href="javascript:void(0);"')
      expect(html).toContain('【para(ref-001)】')

      const backToXml = await html2para(null, html)
      expect(backToXml).toContain('<randomList>')
      expect(backToXml).toContain('<graphic')
      expect(backToXml).toContain('<internalRef')
    })
  })

  // ========== 属性保留测试 ==========
  describe('属性保留', () => {

    it('para2html: 应保留 para 标签的 id 属性', async () => {
      const xml = '<para id="para-123">内容</para>'
      const html = await para2html(null, xml)
      expect(html).toContain('id="para-123"')
    })

    it('html2para: 应保留 p 标签的 id 属性', async () => {
      const html = '<p id="para-456">内容</p>'
      const xml = await html2para(null, html)
      expect(xml).toContain('id="para-456"')
    })

    it('para2html: 应保留 randomList 的 listItemPrefix 属性', async () => {
      const xml = '<para><randomList listItemPrefix="pf05"><listItem><para>项</para></listItem></randomList></para>'
      const html = await para2html(null, xml)
      expect(html).toContain('listItemPrefix="pf05"')
    })

    it('html2para: 应保留 ul 的 listItemPrefix 属性', async () => {
      const html = '<p><ul listItemPrefix="pf05"><li><p>项</p></li></ul></p>'
      const xml = await html2para(null, html)
      expect(xml).toContain('listItemPrefix="pf05"')
    })
  })
})
