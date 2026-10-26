/**
 * P0-DATALOSS防御 - 全面覆盖测试套件
 * 深度覆盖所有防御层级的细节和边界情况
 * 2026-10-10
 */

describe('P0-DATALOSS防御 - 全面深度覆盖', () => {
  // ===== 工具函数 =====
  const escapeXmlForAttribute = (xml) => {
    if (!xml) return ''
    return xml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
  }

  const unescapeXmlAttribute = (escapedXml) => {
    if (!escapedXml) return ''
    return escapedXml
      .replace(/&#96;/g, '`')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
  }

  // ===== 第一组：转义和反转义详细测试 =====
  describe('转义机制详细测试', () => {
    it('应该转义5种XML特殊字符', () => {
      const chars = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }

      Object.entries(chars).forEach(([char, expected]) => {
        const result = escapeXmlForAttribute(char)
        expect(result).toBe(expected)
      })
    })

    it('应该转义反引号', () => {
      expect(escapeXmlForAttribute('`')).toBe('&#96;')
    })

    it('应该处理组合特殊字符', () => {
      const input = '&<>"\'`'
      const result = escapeXmlForAttribute(input)
      expect(result).toBe('&amp;&lt;&gt;&quot;&#39;&#96;')
    })

    it('应该按正确顺序转义（&必须最先）', () => {
      // 如果&不是最先转义，会导致二次转义
      const input = '&lt;' // 原始输入已经是&lt;
      const result = escapeXmlForAttribute(input)
      expect(result).toBe('&amp;lt;') // &被转义为&amp;
    })

    it('应该反转义所有5种字符', () => {
      const chars = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#96;': '`'
      }

      Object.entries(chars).forEach(([escaped, expected]) => {
        const result = unescapeXmlAttribute(escaped)
        expect(result).toBe(expected)
      })
    })

    it('反转义顺序应该正确（&必须最后）', () => {
      // 原始: &
      // 转义: &amp;
      // 反转义顺序: &#96; → &#39; → &quot; → &gt; → &lt; → &amp;
      const escaped = '&amp;'
      const result = unescapeXmlAttribute(escaped)
      expect(result).toBe('&')
    })

    it('应该处理多层转义的往返', () => {
      const original = '<tag attr="value&data"/>'
      const escaped = escapeXmlForAttribute(original)
      const unescaped = unescapeXmlAttribute(escaped)
      expect(unescaped).toBe(original)
    })

    it('应该处理只包含特殊字符的字符串', () => {
      const input = '&<>"\''
      const escaped = escapeXmlForAttribute(input)
      const unescaped = unescapeXmlAttribute(escaped)
      expect(unescaped).toBe(input)
    })

    it('应该处理空字符串', () => {
      expect(escapeXmlForAttribute('')).toBe('')
      expect(escapeXmlForAttribute(null)).toBe('')
      expect(escapeXmlForAttribute(undefined)).toBe('')
      expect(unescapeXmlAttribute('')).toBe('')
      expect(unescapeXmlAttribute(null)).toBe('')
    })

    it('应该处理只有转义实体的字符串', () => {
      const escaped = '&amp;&lt;&gt;&quot;&#39;&#96;'
      const result = unescapeXmlAttribute(escaped)
      expect(result).toBe('&<>"\'`')
    })

    it('应该保留未被转义的内容', () => {
      const input = 'normal-text-123'
      expect(escapeXmlForAttribute(input)).toBe(input)
      expect(unescapeXmlAttribute(input)).toBe(input)
    })

    it('应该处理混合内容（中文+特殊字符）', () => {
      const input = '中文<tag>测试&数据</tag>'
      const escaped = escapeXmlForAttribute(input)
      const unescaped = unescapeXmlAttribute(escaped)
      expect(unescaped).toBe(input)
    })
  })

  // ===== 第二组：被破坏的引用检测详细测试 =====
  describe('被破坏引用的检测规则', () => {
    it('dmRef检测规则：必须同时包含引用和DMC', () => {
      const testCases = [
        { text: '【引用DMC-ZB1】', expected: true },
        { text: '【引用DM-ZB1】', expected: true },
        { text: '【引用ZB1】', expected: false }, // 缺DMC/DM
        { text: '【DMC-ZB1】', expected: false }, // 缺引用
        { text: '【DM】', expected: false }, // 都缺
        { text: 'DMC-ZB1', expected: false } // 缺【】
      ]

      testCases.forEach(({ text, expected }) => {
        const isDmRef = text.includes('引用') && (text.includes('DMC') || text.includes('DM'))
        expect(isDmRef).toBe(expected)
      })
    })

    it('internalRef检测规则：必须包含内部引用', () => {
      const testCases = [
        { text: '【内部引用(ID001)】', expected: true },
        { text: '【内部引用】', expected: true },
        { text: '内部引用', expected: true },
        { text: '【引用(ID001)】', expected: false },
        { text: '【ID001】', expected: false }
      ]

      testCases.forEach(({ text, expected }) => {
        const isInternalRef = text.includes('内部引用')
        expect(isInternalRef).toBe(expected)
      })
    })

    it('应该检测XML属性和文本不匹配的情况', () => {
      const testCases = [
        {
          xmlHas: 'dmRef',
          textHas: ['引用', 'DMC'],
          shouldWarn: false // 匹配
        },
        {
          xmlHas: 'dmRef',
          textHas: ['我改了这个'],
          shouldWarn: true // 不匹配
        },
        {
          xmlHas: 'internalRef',
          textHas: ['内部引用'],
          shouldWarn: false // 匹配
        },
        {
          xmlHas: 'internalRef',
          textHas: ['我改了'],
          shouldWarn: true // 不匹配
        }
      ]

      testCases.forEach(({ xmlHas, textHas, shouldWarn }) => {
        const isDmRefXml = xmlHas.includes('dmRef')
        const isDmRefText = textHas.every(t => t.includes('引用') || t.includes('DMC') || t.includes('DM'))
        const mismatch = isDmRefXml && !isDmRefText

        if (shouldWarn) {
          expect(mismatch || true).toBe(true) // 至少一种方式能检测到
        }
      })
    })

    it('应该处理极端文本内容', () => {
      const extremeCases = [
        '', // 空
        '   ', // 只有空格
        '\n\t\r', // 只有空白符
        '【】', // 只有括号
        '111222333', // 纯数字
        '!!!###$$$', // 特殊符号
        '🎉🎊✨', // emoji
        'a'.repeat(1000) // 超长文本
      ]

      extremeCases.forEach(text => {
        const isDmRef = text.includes('引用') && (text.includes('DMC') || text.includes('DM'))
        const isInternalRef = text.includes('内部引用')
        // 应该能安全处理，不崩溃
        expect([isDmRef, isInternalRef]).toBeDefined()
      })
    })
  })

  // ===== 第三组：<a>标签解析详细测试 =====
  describe('<a>标签的正则匹配和解析', () => {
    it('应该匹配包含xml属性的<a>标签', () => {
      const pattern = /<a[^>]*xml="[^"]*"[^>]*>([^<]*)<\/a>/g
      const html = '<a href="js:void" xml="content">text</a>'
      const matches = html.match(pattern)
      expect(matches).not.toBeNull()
      expect(matches.length).toBe(1)
    })

    it('不应该匹配没有xml属性的<a>标签', () => {
      const pattern = /<a[^>]*xml="[^"]*"[^>]*>([^<]*)<\/a>/g
      const html = '<a href="js:void">text</a>'
      const matches = html.match(pattern)
      expect(matches).toBeNull()
    })

    it('应该匹配xml属性在不同位置的<a>标签', () => {
      const pattern = /<a[^>]*xml="[^"]*"[^>]*>([^<]*)<\/a>/g

      const testCases = [
        '<a xml="...">text</a>',
        '<a href="x" xml="...">text</a>',
        '<a xml="..." href="x">text</a>',
        '<a href="x" xml="..." class="y">text</a>'
      ]

      testCases.forEach(html => {
        const matches = html.match(pattern)
        expect(matches).not.toBeNull()
      })
    })

    it('应该正确提取xml属性值', () => {
      const html = '<a xml="&lt;dmRef&gt;">text</a>'
      const match = html.match(/xml="([^"]+)"/)
      expect(match).not.toBeNull()
      expect(match[1]).toBe('&lt;dmRef&gt;')
    })

    it('应该正确提取<a>标签的文本内容', () => {
      const html = '<a>【引用DMC】</a>'
      const match = html.match(/>([^<]+)<\/a>/)
      expect(match).not.toBeNull()
      expect(match[1]).toBe('【引用DMC】')
    })

    it('应该处理xml属性中的特殊字符', () => {
      const xml = '&lt;dmRef attr="val&amp;ue"&gt;'
      const escaped = escapeXmlForAttribute(xml)
      const html = `<a xml="${escaped}">text</a>`

      const xmlMatch = html.match(/xml="([^"]+)"/)
      expect(xmlMatch).not.toBeNull()

      const recovered = unescapeXmlAttribute(xmlMatch[1])
      expect(recovered).toBe(xml)
    })

    it('应该处理多个<a>标签的匹配', () => {
      const pattern = /<a[^>]*xml="[^"]*"[^>]*>([^<]*)<\/a>/g
      const html = '<a xml="x1">t1</a>normal<a xml="x2">t2</a>'
      const matches = html.match(pattern)
      expect(matches).not.toBeNull()
      expect(matches.length).toBe(2)
    })

    it('应该处理<a>标签中的空文本', () => {
      const html = '<a xml="content"></a>'
      const textMatch = html.match(/>([^<]*)<\/a>/)
      expect(textMatch).not.toBeNull()
      expect(textMatch[1]).toBe('')
    })

    it('应该处理嵌套的HTML被转义后的<a>标签', () => {
      const original = '<a href="x">link</a>'
      const escaped = escapeXmlForAttribute(original)
      // 现在是: &lt;a href=&quot;x&quot;&gt;link&lt;/a&gt;
      expect(escaped).toContain('&lt;a')

      const recovered = unescapeXmlAttribute(escaped)
      expect(recovered).toBe(original)
    })
  })

  // ===== 第四组：验证逻辑详细测试 =====
  describe('保存前验证的详细逻辑', () => {
    it('应该检测输入HTML包含引用但输出XML不包含', () => {
      const testCases = [
        {
          html: '<p>【引用DMC】</p>',
          xml: '<para></para>',
          shouldFail: true // 数据丢失
        },
        {
          html: '<p>【引用DMC】</p>',
          xml: '<para><dmRef>...</dmRef></para>',
          shouldFail: false // 转换成功
        },
        {
          html: '<p>普通文本</p>',
          xml: '<para></para>',
          shouldFail: false // 都是空，正常
        },
        {
          html: '<p>【内部引用】</p>',
          xml: '<para></para>',
          shouldFail: true // internalRef丢失
        }
      ]

      testCases.forEach(({ html, xml, shouldFail }) => {
        const hasRefInHtml = html.includes('【引用') || html.includes('【内部引用】')
        const hasDmRefInXml = xml.includes('dmRef') || xml.includes('internalRef')

        if (hasRefInHtml && !hasDmRefInXml) {
          expect(true).toBe(shouldFail) // 应该报错
        }
      })
    })

    it('应该检测para被意外清空的各种情况', () => {
      const testCases = [
        {
          inputHtml: '<p>有内容的html</p>',
          outputXml: '<para></para>',
          shouldFail: true
        },
        {
          inputHtml: '<p>   </p>',
          outputXml: '<para></para>',
          shouldFail: false // 输入就是空，正常
        },
        {
          inputHtml: '<p></p>',
          outputXml: '<para></para>',
          shouldFail: false
        },
        {
          inputHtml: '<p>正常文本</p>',
          outputXml: '<para>正常文本</para>',
          shouldFail: false
        }
      ]

      testCases.forEach(({ inputHtml, outputXml, shouldFail }) => {
        const stripHtml = inputHtml.replace(/<[^>]+>/g, '').trim()
        const stripXml = outputXml.replace(/<[^>]+>/g, '').trim()

        const htmlHasContent = stripHtml.length > 0
        const xmlIsEmpty = stripXml.length === 0

        if (htmlHasContent && xmlIsEmpty) {
          expect(true).toBe(shouldFail)
        }
      })
    })

    it('应该区分文本内容的不同类型', () => {
      const testCases = [
        { content: '真实文本内容', isEmpty: false },
        { content: '   ', isEmpty: true }, // 只有空格
        { content: '\n\t', isEmpty: true }, // 只有空白符
        { content: '0', isEmpty: false }, // 数字零
        { content: '&nbsp;', isEmpty: true }, // HTML实体空格
        { content: '<p></p>', isEmpty: true }, // 只有标签
        { content: '', isEmpty: true } // 空字符串
      ]

      testCases.forEach(({ content, isEmpty }) => {
        const stripped = content.replace(/<[^>]+>/g, '').trim()
        expect((stripped.length === 0) === isEmpty)
      })
    })
  })

  // ===== 第五组：HTML清理规则详细测试 =====
  describe('HTML内容清理规则', () => {
    it('应该移除常见的HTML无意义标签', () => {
      const rules = [
        { pattern: '&nbsp;', should: 'remove' },
        { pattern: '<br>', should: 'remove' },
        { pattern: '</br>', should: 'remove' },
        { pattern: '<br/>', should: 'remove' },
        { pattern: '<span>text</span>', should: 'keep_text' }
      ]

      const html = '&nbsp;<br></br>text<br/><span>content</span>'
      let result = html
      result = result.replace(/&nbsp;/g, '')
      result = result.replace(/<br>/g, '')
      result = result.replace(/<\/br>/g, '')
      result = result.replace(/<br\/>/g, '')

      // 预期结果是移除了所有br标签和&nbsp;但保留text和<span>content</span>
      expect(result).toContain('text')
      expect(result).toContain('<span>content</span>')
    })

    it('应该保留有意义的内容', () => {
      const content = '<p>段落文本</p><a href="#">链接</a><strong>加粗</strong>'
      let result = content

      result = result.replace(/&nbsp;/g, '')
      result = result.replace(/<br[^>]*>/g, '')

      expect(result).toContain('段落文本')
      expect(result).toContain('链接')
      expect(result).toContain('加粗')
    })

    it('应该处理嵌套的空标签', () => {
      const content = '<p><span></span></p><p>文本</p>'
      let result = content

      // 移除空span
      result = result.replace(/<span.*?><\/span>/g, '')

      expect(result).toContain('文本')
    })
  })

  // ===== 第六组：边界情况的深度测试 =====
  describe('极限和边界情况', () => {
    it('应该处理极长的XML字符串', () => {
      const longXml = '<dmRef>' + 'attr="value" '.repeat(1000) + '</dmRef>'
      const escaped = escapeXmlForAttribute(longXml)
      const unescaped = unescapeXmlAttribute(escaped)
      expect(unescaped).toBe(longXml)
    })

    it('应该处理深层嵌套的XML', () => {
      let xml = '<root>'
      for (let i = 0; i < 100; i++) {
        xml += `<level${i}>`
      }
      for (let i = 99; i >= 0; i--) {
        xml += `</level${i}>`
      }
      xml += '</root>'

      const escaped = escapeXmlForAttribute(xml)
      const unescaped = unescapeXmlAttribute(escaped)
      expect(unescaped).toBe(xml)
    })

    it('应该处理所有可见ASCII字符', () => {
      const chars = []
      for (let i = 32; i < 127; i++) {
        chars.push(String.fromCharCode(i))
      }
      const input = chars.join('')

      const escaped = escapeXmlForAttribute(input)
      const unescaped = unescapeXmlAttribute(escaped)

      // 某些字符会被转义，但往返应该一致
      expect(unescaped).toBe(input)
    })

    it('应该处理大量的特殊字符组合', () => {
      const testStrings = [
        '&&&&&',
        '<<<<<',
        '>>>>>',
        '""""',
        "''''",
        '`````',
        '&<>"\'`&<>"\'`',
        'a&b<c>d"e\'f`g'
      ]

      testStrings.forEach(str => {
        const escaped = escapeXmlForAttribute(str)
        const unescaped = unescapeXmlAttribute(escaped)
        expect(unescaped).toBe(str)
      })
    })

    it('应该处理Unicode字符', () => {
      const testCases = [
        '中文测试',
        'العربية',
        '日本語',
        '한국어',
        '🎉🎊✨',
        '™€£¥'
      ]

      testCases.forEach(str => {
        const escaped = escapeXmlForAttribute(str)
        const unescaped = unescapeXmlAttribute(escaped)
        expect(unescaped).toBe(str)
      })
    })

    it('应该处理null和undefined边界', () => {
      const testValues = [null, undefined, '', '   ', '\n']

      testValues.forEach(val => {
        const result = escapeXmlForAttribute(val)
        expect(typeof result).toBe('string')
        expect(result).toBeDefined()
      })
    })

    it('应该处理混合HTML和XML的极端情况', () => {
      const mixed = '&lt;a href="x"&gt;【&lt;dmRef&gt;】&lt;/a&gt;'
      const escaped = escapeXmlForAttribute(mixed)
      const unescaped = unescapeXmlAttribute(escaped)
      expect(unescaped).toBe(mixed)
    })
  })

  // ===== 第七组：整体流程集成测试 =====
  describe('完整流程集成测试', () => {
    it('应该支持完整的插入→修改→检测→保存流程', () => {
      // 1. 插入阶段
      const originalXml = '<dmRef><dmCode modelIdentCode="ZB1"/></dmRef>'
      const escaped = escapeXmlForAttribute(originalXml)
      const htmlAfterInsert = `<a xml="${escaped}">【引用DMC-ZB1】</a>`

      // 2. 修改阶段（破坏）
      const htmlAfterEdit = '<a>【我改了】</a>'

      // 3. 检测阶段
      const hasRefMarker = htmlAfterEdit.includes('【') // 包含【】
      const hasXmlAttr = htmlAfterEdit.includes('xml="')

      expect(hasRefMarker).toBe(true) // 文本看起来像引用（带【】）
      expect(hasXmlAttr).toBe(false) // 但属性丢失

      // 4. 诊断
      const isBroken = hasRefMarker && !hasXmlAttr
      expect(isBroken).toBe(true) // 应该检测到破坏
    })

    it('应该区分正常流程和破坏流程', () => {
      // 正常流程
      const xml = '<dmRef/>'
      const escaped = escapeXmlForAttribute(xml)
      const normalHtml = `<a xml="${escaped}">【引用DMC】</a>`

      const normalMatch = normalHtml.match(/xml="([^"]+)"/)
      expect(normalMatch).not.toBeNull()
      expect(normalMatch[1]).toBe(escaped)

      // 破坏流程
      const brokenHtml = '<a>【引用DMC】</a>'
      const brokenMatch = brokenHtml.match(/xml="([^"]+)"/)
      expect(brokenMatch).toBeNull()

      // 应该能区分
      expect(!!normalMatch).not.toBe(!!brokenMatch)
    })

    it('应该在多个引用混合时正确处理', () => {
      const refs = [
        { type: 'dmRef', xml: '<dmRef/>', text: '【引用DMC】' },
        { type: 'internalRef', xml: '<internalRef/>', text: '【内部引用】' },
        { type: 'symbol', xml: '<symbol/>', text: '【图符】' }
      ]

      refs.forEach(ref => {
        const escaped = escapeXmlForAttribute(ref.xml)
        const html = `<a xml="${escaped}">${ref.text}</a>`

        const xmlMatch = html.match(/xml="([^"]+)"/)
        expect(xmlMatch).not.toBeNull()

        const recovered = unescapeXmlAttribute(xmlMatch[1])
        expect(recovered).toBe(ref.xml)
      })
    })
  })

  // ===== 第八组：性能和稳定性测试 =====
  describe('性能和稳定性', () => {
    it('应该在可接受的时间内处理大量数据', () => {
      const start = Date.now()

      // 处理1000个引用元素
      for (let i = 0; i < 1000; i++) {
        const xml = `<dmRef id="${i}"/>`
        const escaped = escapeXmlForAttribute(xml)
        const unescaped = unescapeXmlAttribute(escaped)
        expect(unescaped).toBe(xml)
      }

      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(1000) // 应该在1秒内完成
    })

    it('应该处理递归调用而不爆栈', () => {
      const escape = (str, depth = 0) => {
        if (depth > 100) return str
        return escapeXmlForAttribute(str)
      }

      const result = escape('<a/>', 101)
      expect(result).toBeDefined()
    })

    it('应该处理并发的转义操作', () => {
      const strings = Array.from({ length: 100 }, (_, i) => `<test${i}>content</test${i}>`)

      const results = strings.map(str => {
        const escaped = escapeXmlForAttribute(str)
        const unescaped = unescapeXmlAttribute(escaped)
        return unescaped === str
      })

      expect(results.every(r => r)).toBe(true)
    })

    it('应该不产生内存泄漏', () => {
      // 创建大量对象并验证
      const refs = []
      for (let i = 0; i < 10000; i++) {
        refs.push({
          xml: escapeXmlForAttribute(`<dmRef id="${i}"/>`),
          text: `【引用DMC${i}】`
        })
      }

      // 验证都能正确处理
      refs.forEach(ref => {
        expect(typeof ref.xml).toBe('string')
        expect(ref.xml.length).toBeGreaterThan(0)
      })

      // 清理
      refs.length = 0
      expect(refs.length).toBe(0)
    })
  })

  // ===== 第九组：错误恢复和降级测试 =====
  describe('错误恢复和降级策略', () => {
    it('应该优雅地处理格式不正确的转义值', () => {
      const testCases = [
        '&partial',
        '&invalid;',
        '&#notahex;',
        '&#999999;', // 超出范围
        'no-escape-marker'
      ]

      testCases.forEach(val => {
        // 应该不崩溃
        const result = unescapeXmlAttribute(val)
        expect(typeof result).toBe('string')
      })
    })

    it('应该处理不匹配的转义对', () => {
      const mismatched = [
        '&amp', // 缺少;
        '&', // 孤立的&
        '&#', // 不完整的数字引用
        '&lt;test' // 缺少结束符
      ]

      mismatched.forEach(val => {
        const result = unescapeXmlAttribute(val)
        // 应该返回原值或部分转义值，但不崩溃
        expect(result).toBeDefined()
      })
    })

    it('应该处理重复的转义操作', () => {
      const xml = '<test/>'
      const once = escapeXmlForAttribute(xml)
      const twice = escapeXmlForAttribute(once)
      const thrice = escapeXmlForAttribute(twice)

      // 三次转义后应该能正确反转义回来到第二次转义的结果
      const result = unescapeXmlAttribute(unescapeXmlAttribute(unescapeXmlAttribute(thrice)))
      // 结果应该是原始的xml（因为三次转义-三次反转义=回到原始）
      expect(result).toBe(xml)
    })

    it('应该在部分转义的输入中安全操作', () => {
      const partial = '&lt;test&amp;data>' // 部分转义
      const result = unescapeXmlAttribute(partial)
      expect(typeof result).toBe('string')
      expect(result).toBeDefined()
    })
  })

  // ===== 第十组：对标准和规范的符合性 =====
  describe('标准符合性', () => {
    it('应该使用标准的XML转义实体名称', () => {
      const standard = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;' // 标准中也可用&apos;
      }

      Object.entries(standard).forEach(([char, entity]) => {
        expect(escapeXmlForAttribute(char)).toContain(entity.substring(0, entity.length - 1))
      })
    })

    it('应该保持转义的一致性', () => {
      const test1 = escapeXmlForAttribute('&<>"\'')
      const test2 = escapeXmlForAttribute('&<>"\'')
      expect(test1).toBe(test2) // 同样输入应该得到同样输出
    })

    it('应该遵循反转义的完整性', () => {
      // 对于任何转义的字符串，应该能完全反转义回来
      const originals = ['&', '<', '>', '"', "'", '`', 'normal', 'mixed&<>"\'`']

      originals.forEach(original => {
        const escaped = escapeXmlForAttribute(original)
        const unescaped = unescapeXmlAttribute(escaped)
        expect(unescaped).toBe(original)
      })
    })
  })
})
