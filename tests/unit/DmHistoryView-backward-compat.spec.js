/**
 * 向后兼容性测试：验证DmHistoryView.vue添加中文支持不影响英文元素
 */

describe('DmHistoryView.vue 中文支持向后兼容性验证', () => {
  // 模拟formatXml函数（修改后）
  function formatXmlNew(xml) {
    if (!xml || !xml.trim()) return xml

    const PADDING = ' '.repeat(2)
    const reg = /(>)(<)(\/*)/g
    let formatted = xml.replace(reg, '$1\n$2$3')

    let pad = 0
    formatted = formatted.split('\n').map(node => {
      let indent = 0
      // 修改后：支持中文 [\w一-鿿]
      if (node.match(/.+<\/[\w一-鿿][^>]*>$/)) {
        indent = 0
      } else if (node.match(/^<\/[\w一-鿿]/)) {
        if (pad !== 0) pad -= 1
      } else if (node.match(/^<[\w一-鿿]([^>]*[^\/])?>.*$/)) {
        indent = 1
      } else {
        indent = 0
      }

      const padding = PADDING.repeat(pad)
      pad += indent
      return padding + node
    }).join('\n')

    return formatted
  }

  // 模拟formatXml函数（修改前）
  function formatXmlOld(xml) {
    if (!xml || !xml.trim()) return xml

    const PADDING = ' '.repeat(2)
    const reg = /(>)(<)(\/*)/g
    let formatted = xml.replace(reg, '$1\n$2$3')

    let pad = 0
    formatted = formatted.split('\n').map(node => {
      let indent = 0
      // 修改前：只用\w
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1
      } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
        indent = 1
      } else {
        indent = 0
      }

      const padding = PADDING.repeat(pad)
      pad += indent
      return padding + node
    }).join('\n')

    return formatted
  }

  describe('✅ S1000D英文标准：修改前后完全一致', () => {
    test('简单XML结构', () => {
      const xml = '<dmodule><content><para>text</para></content></dmodule>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      // 断言：英文XML格式化结果完全一致
      expect(resultNew).toBe(resultOld)
    })

    test('复杂S1000D结构', () => {
      const xml = '<dmodule><identAndStatusSection><dmAddress><dmIdent><dmCode modelIdentCode="TEST"/></dmIdent></dmAddress></identAndStatusSection><content><description><para>test content</para></description></content></dmodule>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      // 断言：复杂结构格式化结果完全一致
      expect(resultNew).toBe(resultOld)
    })

    test('常见S1000D元素', () => {
      const elements = [
        'dmodule', 'identAndStatusSection', 'dmAddress', 'dmIdent',
        'dmCode', 'issueInfo', 'languageCode', 'content', 'description',
        'para', 'proceduralStep', 'warning', 'caution', 'note',
        'table', 'row', 'entry', 'figure', 'graphic'
      ]

      elements.forEach(elem => {
        const xml = `<root><${elem}>content</${elem}></root>`

        const resultOld = formatXmlOld(xml)
        const resultNew = formatXmlNew(xml)

        expect(resultNew).toBe(resultOld,
          `元素 ${elem} 格式化应该完全一致`)
      })
    })

    test('带属性的标签', () => {
      const xml = '<dmodule version="4.0"><dmCode modelIdentCode="TEST" systemDiffCode="A"/><para id="para-001">text</para></dmodule>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      expect(resultNew).toBe(resultOld)
    })

    test('自闭合标签', () => {
      const xml = '<root><dmCode modelIdentCode="TEST"/><issueInfo issueNumber="001" inWork="00"/></root>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      expect(resultNew).toBe(resultOld)
    })

    test('嵌套深层结构', () => {
      const xml = '<a><b><c><d><e><f>text</f></e></d></c></b></a>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      expect(resultNew).toBe(resultOld)

      // 验证缩进层级正确
      const lines = resultNew.split('\n')
      expect(lines[0]).toBe('<a>')
      expect(lines[1]).toBe('  <b>')
      expect(lines[2]).toBe('    <c>')
      expect(lines[3]).toBe('      <d>')
      expect(lines[4]).toBe('        <e>')
      expect(lines[5]).toBe('          <f>text</f>')
    })
  })

  describe('✅ 唯一差异：修复了GJB中文模式不缩进的bug', () => {
    test('GJB中文元素：修改前无缩进，修改后有缩进', () => {
      const xml = '<数据模块><内容><说明>文本</说明></内容></数据模块>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      // 修改前：中文元素不缩进（bug）
      expect(resultOld.split('\n')[1]).toBe('<内容><说明>文本</说明></内容>')

      // 修改后：中文元素正确缩进（bug修复）
      expect(resultNew.split('\n')[1]).toBe('  <内容>')
      expect(resultNew.split('\n')[2]).toBe('    <说明>文本</说明>')
    })

    test('混合中英文：英文部分格式不受影响', () => {
      const xml = '<dmodule><数据模块><content><说明>text</说明></content></数据模块></dmodule>'

      const resultNew = formatXmlNew(xml)
      const lines = resultNew.split('\n')

      // 验证：英文和中文都能正确缩进
      expect(lines[0]).toBe('<dmodule>')
      expect(lines[1]).toBe('  <数据模块>')
      expect(lines[2]).toBe('    <content>') // 英文仍正常
      expect(lines[3]).toBe('      <说明>text</说明>')
      expect(lines[4]).toBe('    </content>')
      expect(lines[5]).toBe('  </数据模块>')
      expect(lines[6]).toBe('</dmodule>')
    })
  })

  describe('边界情况验证', () => {
    test('空XML', () => {
      expect(formatXmlNew('')).toBe('')
      expect(formatXmlNew('  ')).toBe('  ')
      expect(formatXmlNew(null)).toBe(null)
    })

    test('单个标签', () => {
      const xmls = [
        '<root/>',
        '<root></root>',
        '<root>text</root>'
      ]

      xmls.forEach(xml => {
        const resultOld = formatXmlOld(xml)
        const resultNew = formatXmlNew(xml)
        expect(resultNew).toBe(resultOld)
      })
    })

    test('特殊字符内容', () => {
      const xml = '<root><para>special &lt;&gt;&amp;"\'</para></root>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      expect(resultNew).toBe(resultOld)
    })

    test('CDATA区块', () => {
      const xml = '<root><![CDATA[some data]]></root>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXmlNew(xml)

      expect(resultNew).toBe(resultOld)
    })
  })

  describe('正则匹配验证', () => {
    test('英文元素名匹配', () => {
      const regexNew = /^<[\w一-鿿]/
      const regexOld = /^<\w/

      const englishTags = [
        '<dmodule>', '<para>', '<content>', '<table>',
        '<dmCode>', '<issueInfo>', '<description>'
      ]

      englishTags.forEach(tag => {
        // 英文元素：修改前后都能匹配
        expect(regexOld.test(tag)).toBe(true)
        expect(regexNew.test(tag)).toBe(true)
      })
    })

    test('中文元素名匹配', () => {
      const regexNew = /^<[\w一-鿿]/
      const regexOld = /^<\w/

      const chineseTags = [
        '<数据模块>', '<内容>', '<说明>', '<步骤>',
        '<警告>', '<表格>', '<图形>'
      ]

      chineseTags.forEach(tag => {
        // 中文元素：修改前不匹配（bug），修改后能匹配（bug修复）
        expect(regexOld.test(tag)).toBe(false) // 修改前
        expect(regexNew.test(tag)).toBe(true) // 修改后
      })
    })
  })

  describe('性能验证：正则性能不受影响', () => {
    test('大文档格式化', () => {
      // 生成大文档（1000个元素）
      let xml = '<root>'
      for (let i = 0; i < 1000; i++) {
        xml += `<item${i}><subitem>content</subitem></item${i}>`
      }
      xml += '</root>'

      const start = Date.now()
      const result = formatXmlNew(xml)
      const duration = Date.now() - start

      // 验证：大文档格式化在合理时间内完成（<1秒）
      expect(duration).toBeLessThan(1000)
      expect(result).toBeTruthy()
    })
  })
})
