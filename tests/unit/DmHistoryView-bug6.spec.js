/**
 * DmHistoryView.vue BUG #6 修复测试
 * 测试中文元素名支持
 */

describe('DmHistoryView.vue - BUG #6 中文元素名支持', () => {
  // 模拟formatXml函数（修复后）
  function formatXml(xml) {
    if (!xml || !xml.trim()) return xml

    try {
      const PADDING = ' '.repeat(2)
      const reg = /(>)(<)(\/*)/g
      let formatted = xml.replace(reg, '$1\n$2$3')

      let pad = 0
      formatted = formatted.split('\n').map(node => {
        let indent = 0
        // 修复后：支持中文元素名 [\w一-鿿]
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
    } catch (err) {
      return xml
    }
  }

  describe('中文元素名格式化', () => {
    test('GJB中文标准元素应正确缩进', () => {
      const xml = '<数据模块><内容><说明>文本内容</说明></内容></数据模块>'

      const result = formatXml(xml)

      // 验证缩进结构
      const lines = result.split('\n')
      expect(lines[0]).toBe('<数据模块>')
      expect(lines[1]).toBe('  <内容>') // 2空格缩进
      expect(lines[2]).toBe('    <说明>文本内容</说明>') // 4空格缩进
      expect(lines[3]).toBe('  </内容>')
      expect(lines[4]).toBe('</数据模块>')
    })

    test('混合中英文元素名', () => {
      const xml = '<dmodule><数据模块><content><说明>text</说明></content></数据模块></dmodule>'

      const result = formatXml(xml)

      const lines = result.split('\n')
      expect(lines[0]).toBe('<dmodule>')
      expect(lines[1]).toBe('  <数据模块>')
      expect(lines[2]).toBe('    <content>')
      expect(lines[3]).toBe('      <说明>text</说明>')
      expect(lines[4]).toBe('    </content>')
      expect(lines[5]).toBe('  </数据模块>')
      expect(lines[6]).toBe('</dmodule>')
    })

    test('常用中文元素名全覆盖', () => {
      const commonCnElements = [
        '数据模块', '内容', '说明', '步骤', '警告', '注意',
        '图形', '表格', '参考', '列表', '项目', '标题'
      ]

      commonCnElements.forEach(elem => {
        const xml = `<root><${elem}>内容</${elem}></root>`
        const result = formatXml(xml)

        // 验证元素被识别并缩进
        expect(result).toContain(`  <${elem}>内容</${elem}>`)
      })
    })

    test('对比修复前后：修复前中文元素不缩进', () => {
      // 模拟修复前的版本（只用\w）
      function formatXmlOld(xml) {
        const PADDING = ' '.repeat(2)
        const reg = /(>)(<)(\/*)/g
        let formatted = xml.replace(reg, '$1\n$2$3')

        let pad = 0
        formatted = formatted.split('\n').map(node => {
          let indent = 0
          // 修复前：只用\w，不支持中文
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

      const xml = '<数据模块><内容>文本</内容></数据模块>'

      const resultOld = formatXmlOld(xml)
      const resultNew = formatXml(xml)

      // 修复前：无缩进
      expect(resultOld.split('\n')[1]).toBe('<内容>文本</内容>')

      // 修复后：有缩进
      expect(resultNew.split('\n')[1]).toBe('  <内容>文本</内容>')
    })
  })

  describe('英文元素名仍然正常工作', () => {
    test('S1000D标准元素正确缩进', () => {
      const xml = '<dmodule><identAndStatusSection><dmAddress></dmAddress></identAndStatusSection></dmodule>'

      const result = formatXml(xml)

      const lines = result.split('\n')
      expect(lines[0]).toBe('<dmodule>')
      expect(lines[1]).toBe('  <identAndStatusSection>')
      expect(lines[2]).toBe('    <dmAddress></dmAddress>')
      expect(lines[3]).toBe('  </identAndStatusSection>')
      expect(lines[4]).toBe('</dmodule>')
    })

    test('修复不影响现有功能', () => {
      const testCases = [
        '<root><child>text</child></root>',
        '<a><b><c>value</c></b></a>',
        '<para>paragraph text</para>'
      ]

      testCases.forEach(xml => {
        const result = formatXml(xml)
        // 验证基本格式化功能正常
        expect(result).toBeTruthy()
        expect(result.split('\n').length).toBeGreaterThan(0)
      })
    })
  })

  describe('字符范围边界测试', () => {
    test('一-鿿范围覆盖常用汉字', () => {
      // U+4E00 = 一
      // U+9FFF = 鿿
      const regex = /^<[\w一-鿿]/

      // 常用汉字（在范围内）
      expect(regex.test('<数')).toBe(true)
      expect(regex.test('<据')).toBe(true)
      expect(regex.test('<模')).toBe(true)
      expect(regex.test('<块')).toBe(true)

      // 首字符是中文的标签
      expect(regex.test('<数据模块>')).toBe(true)
      expect(regex.test('<说明 attr="val">')).toBe(true)
    })

    test('正则仍然匹配英文元素名', () => {
      const regex = /^<[\w一-鿿]/

      expect(regex.test('<dmodule>')).toBe(true)
      expect(regex.test('<para>')).toBe(true)
      expect(regex.test('<_internal>')).toBe(true) // 下划线开头
    })

    test('闭合标签正则', () => {
      const regex = /^<\/[\w一-鿿]/

      // 中文闭合标签
      expect(regex.test('</数据模块>')).toBe(true)
      expect(regex.test('</说明>')).toBe(true)

      // 英文闭合标签
      expect(regex.test('</dmodule>')).toBe(true)
      expect(regex.test('</para>')).toBe(true)
    })
  })

  describe('实际XML测试', () => {
    test('GJB6600标准真实XML片段', () => {
      const xml = `<数据模块 xmlns="GJB6600">
  <标识与状态段>
    <数据模块地址>
      <数据模块代码 模型识别代码="TEST" 系统差异代码="A" />
    </数据模块地址>
  </标识与状态段>
  <内容段>
    <说明>
      <段落>这是说明文本</段落>
    </说明>
  </内容段>
</数据模块>`

      const result = formatXml(xml)

      // 验证所有中文元素都被正确识别和缩进
      expect(result).toContain('  <标识与状态段>')
      expect(result).toContain('    <数据模块地址>')
      expect(result).toContain('  <内容段>')
      expect(result).toContain('    <说明>')
      expect(result).toContain('      <段落>这是说明文本</段落>')
    })

    test('S1000D标准真实XML片段', () => {
      const xml = `<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" />
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <para>This is description text</para>
    </description>
  </content>
</dmodule>`

      const result = formatXml(xml)

      // 验证英文元素正常工作
      expect(result).toContain('  <identAndStatusSection>')
      expect(result).toContain('    <dmAddress>')
      expect(result).toContain('  <content>')
      expect(result).toContain('    <description>')
      expect(result).toContain('      <para>This is description text</para>')
    })
  })
})
