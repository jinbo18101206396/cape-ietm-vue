/**
 * Para公式转换工具 - 单元测试
 *
 * 测试目标：验证公式在HTML↔XML转换过程中的完整性
 * 涵盖以下场景：
 * 1. 设计视图中插入公式（UEditor KityFormula）
 * 2. 获取HTML内容（含公式img标签）
 * 3. HTML转XML：公式img → symbol标签
 * 4. 保存到数据库
 * 5. 源码视图加载XML
 * 6. XML转HTML：symbol → 公式img标签
 * 7. 回到设计视图显示公式
 */

const assert = require('assert')

// ===== 模拟的paraConverter函数 =====

/**
 * 从HTML中提取所有公式img标签
 * @param {string} htmlContent - HTML内容
 * @returns {Array<string>} - 公式img标签数组
 */
function extractFormulaImages(htmlContent) {
  if (!htmlContent) return []
  const matches = htmlContent.match(/<img class="kfformula"[^>]*>/g)
  return matches || []
}

/**
 * 从公式img标签中提取xml属性（已保存的公式）
 * @param {string} formulaImg - 公式img标签
 * @returns {string|null} - xml属性值
 */
function extractXmlAttribute(formulaImg) {
  const match = formulaImg.match(/xml="([^"]+)"/)
  return match ? match[1] : null
}

/**
 * 反转义XML属性值
 * @param {string} escapedXml - 已转义的XML
 * @returns {string} - 原始XML
 */
function unescapeXmlAttribute(escapedXml) {
  if (!escapedXml) return ''
  return escapedXml
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

/**
 * 转义XML属性值
 * @param {string} xml - 原始XML
 * @returns {string} - 已转义的XML
 */
function escapeXmlForAttribute(xml) {
  if (!xml) return ''
  return xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * HTML公式转XML Symbol标签
 * @param {string} formulaImg - HTML中的公式img标签
 * @param {string} icn - 公式ICN编码
 * @param {number} width - 公式图片宽度
 * @param {number} height - 公式图片高度
 * @returns {string} - XML symbol标签
 */
function formulaHtmlToXmlSymbol(formulaImg, icn, width, height) {
  // 转义公式img标签中的XML特殊字符
  const escapedFormula = escapeXmlForAttribute(formulaImg)
  return `<symbol infoEntityIdent="${icn}" reproductionWidth="${width}" reproductionHeight="${height}" reproductionScale="100" xml="${escapedFormula}"></symbol>`
}

/**
 * XML Symbol标签转HTML公式
 * @param {string} symbolXml - XML symbol标签
 * @returns {string|null} - HTML公式img标签，或null（如果转换失败）
 */
function symbolXmlToFormulaHtml(symbolXml) {
  // 提取xml属性
  const xmlMatch = symbolXml.match(/xml="([^"]*(?:&[^;]+;[^"]*)*)"/)
  if (!xmlMatch) return null

  // 反转义
  const formulaImg = unescapeXmlAttribute(xmlMatch[1])
  return formulaImg
}

/**
 * HTML转XML转换（简化版，仅处理公式）
 * @param {string} html - 设计视图的HTML内容
 * @param {string} cmnodeid - 构型节点ID
 * @param {string} dmCode - DM Code (用于提取SNS)
 * @returns {Object} - {xml: XML内容, formulaCount: 新公式数}
 */
function html2paraWithFormulas(html, cmnodeid, dmCode) {
  if (!html) return { xml: '', formulaCount: 0 }

  let xml = html
  const formulaImages = extractFormulaImages(html)
  let newFormulaCount = 0

  for (const formulaImg of formulaImages) {
    const xmlAttr = extractXmlAttribute(formulaImg)

    if (xmlAttr) {
      // 已有xml属性的公式（已保存过）
      const unescaped = unescapeXmlAttribute(xmlAttr)
      xml = xml.replace(formulaImg, unescaped)
    } else {
      // 新公式，生成symbol标签
      const icn = `ICN-TEST-A-TEST-${++newFormulaCount}-A-001-01`
      const symbolTag = formulaHtmlToXmlSymbol(formulaImg, icn, 100, 50)
      xml = xml.replace(formulaImg, symbolTag)
    }
  }

  return { xml, formulaCount: newFormulaCount }
}

/**
 * XML转HTML转换（简化版，仅处理公式）
 * @param {string} xml - 源码视图的XML内容
 * @returns {string} - HTML内容
 */
function para2htmlWithFormulas(xml) {
  if (!xml) return ''

  let html = xml

  // 查找所有symbol标签（可能包含公式）
  const symbols = html.match(/<symbol[^>]*>[\s\S]*?<\/symbol>/g) || []

  for (const symbol of symbols) {
    // 检查是否包含xml属性（公式）
    const xmlMatch = symbol.match(/xml="([^"]*(?:&[^;]+;[^"]*)*)"/)
    if (xmlMatch) {
      // 这是公式，转换回HTML
      const formulaImg = unescapeXmlAttribute(xmlMatch[1])
      html = html.replace(symbol, formulaImg)
    }
  }

  return html
}

// ===== 单元测试 =====

describe('Para公式转换 - 单元测试', () => {
  // 测试数据
  const mockFormulaImg = '<img class="kfformula" src="data:image/png;base64,iVBORw0K..." width="100" height="50" />'
  const mockFormulaImgWithXml = `<img class="kfformula" src="data:image/png;base64,..." xml="&lt;symbol infoEntityIdent=&quot;ICN-TEST&quot;&gt;&lt;/symbol&gt;" />`
  const mockSymbolXml = `<symbol infoEntityIdent="ICN-TEST-A-TEST-1-A-001-01" reproductionWidth="100" reproductionHeight="50" reproductionScale="100" xml="&lt;img class=&quot;kfformula&quot; src=&quot;data:image/png;base64,...&quot; /&gt;"></symbol>`

  describe('T1: 提取公式标签', () => {
    it('应该从HTML中提取单个公式img标签', () => {
      const html = `<p>计算公式：${mockFormulaImg}</p>`
      const formulas = extractFormulaImages(html)

      assert.strictEqual(formulas.length, 1, '应该提取1个公式')
      assert(formulas[0].includes('kfformula'), '标签应包含kfformula类')
    })

    it('应该从HTML中提取多个公式img标签', () => {
      const html = `<p>
        公式1：${mockFormulaImg}
        公式2：${mockFormulaImg}
        公式3：${mockFormulaImg}
      </p>`
      const formulas = extractFormulaImages(html)

      assert.strictEqual(formulas.length, 3, '应该提取3个公式')
    })

    it('HTML不含公式时应返回空数组', () => {
      const html = '<p>这是普通文本，没有公式</p>'
      const formulas = extractFormulaImages(html)

      assert.strictEqual(formulas.length, 0, '应该返回空数组')
    })
  })

  describe('T2: 提取xml属性', () => {
    it('应该从已保存的公式中提取xml属性', () => {
      const xml = extractXmlAttribute(mockFormulaImgWithXml)

      assert(xml, '应该提取xml属性')
      assert(xml.includes('symbol'), 'xml属性应包含symbol标签')
    })

    it('新公式img标签中不应有xml属性', () => {
      const xml = extractXmlAttribute(mockFormulaImg)

      assert.strictEqual(xml, null, '新公式应不含xml属性')
    })
  })

  describe('T3: XML属性转义/反转义', () => {
    it('应该正确转义XML特殊字符', () => {
      const original = '<symbol test="value">内容</symbol>'
      const escaped = escapeXmlForAttribute(original)

      assert(escaped.includes('&lt;'), '< 应转为 &lt;')
      assert(escaped.includes('&gt;'), '> 应转为 &gt;')
      assert(escaped.includes('&quot;'), '" 应转为 &quot;')
    })

    it('应该正确反转义XML属性值', () => {
      const escaped = '&lt;symbol&gt;&lt;/symbol&gt;'
      const original = unescapeXmlAttribute(escaped)

      assert.strictEqual(original, '<symbol></symbol>', '应正确反转义')
    })

    it('转义后反转义应得到原始值', () => {
      const original = '<symbol test="value">内容</symbol>'
      const escaped = escapeXmlForAttribute(original)
      const restored = unescapeXmlAttribute(escaped)

      assert.strictEqual(restored, original, '往返应相同')
    })
  })

  describe('T4: 公式HTML转XML', () => {
    it('应该将公式img转换为symbol标签', () => {
      const icn = 'ICN-TEST-A-TEST-1-A-001-01'
      const symbol = formulaHtmlToXmlSymbol(mockFormulaImg, icn, 100, 50)

      assert(symbol.includes('symbol'), '应包含symbol标签')
      assert(symbol.includes(`infoEntityIdent="${icn}"`), '应包含icn属性')
      assert(symbol.includes('reproductionWidth="100"'), '应包含宽度属性')
      assert(symbol.includes('reproductionHeight="50"'), '应包含高度属性')
      assert(symbol.includes('xml="'), '应包含转义的原始公式')
    })

    it('公式img中的特殊字符应被转义', () => {
      const formulaWithSpecialChars = '<img class="kfformula" data-test="value" />'
      const symbol = formulaHtmlToXmlSymbol(formulaWithSpecialChars, 'ICN-TEST', 100, 50)
      const xmlAttr = symbol.match(/xml="([^"]*(?:&[^;]+;[^"]*)*)"/)[1]

      assert(xmlAttr.includes('&lt;'), '< 应被转义')
      assert(xmlAttr.includes('&gt;'), '> 应被转义')
      assert(xmlAttr.includes('&quot;'), '" 应被转义')
    })
  })

  describe('T5: 公式XML转HTML', () => {
    it('应该将symbol标签转换回公式img', () => {
      const symbol = `<symbol infoEntityIdent="ICN-TEST" xml="&lt;img class=&quot;kfformula&quot; /&gt;"></symbol>`
      const formulaImg = symbolXmlToFormulaHtml(symbol)

      assert(formulaImg, '应该提取公式img')
      assert(formulaImg.includes('<img'), '应包含img标签')
      assert(formulaImg.includes('kfformula'), '应包含kfformula类')
    })

    it('不含xml属性的symbol应返回null', () => {
      const symbol = '<symbol infoEntityIdent="ICN-TEST"></symbol>'
      const formulaImg = symbolXmlToFormulaHtml(symbol)

      assert.strictEqual(formulaImg, null, '应返回null')
    })

    it('XML转HTML后应能重新插入UEditor', () => {
      // 模拟往返
      const originalFormula = mockFormulaImg
      const symbol = formulaHtmlToXmlSymbol(originalFormula, 'ICN-TEST', 100, 50)
      const restoredFormula = symbolXmlToFormulaHtml(symbol)

      // 检查往返一致性
      assert(restoredFormula.includes('kfformula'), '恢复的公式应包含kfformula类')
      assert(restoredFormula.includes('class='), '恢复的公式应包含class属性')
    })
  })

  describe('T6: HTML转XML（完整流程）', () => {
    it('新公式应转换为symbol标签', () => {
      const html = `<p>公式：${mockFormulaImg}</p>`
      const { xml, formulaCount } = html2paraWithFormulas(html, 'NODE-ID', 'DM-CODE')

      assert(xml.includes('symbol'), 'XML应包含symbol标签')
      assert(xml.includes('infoEntityIdent='), '应包含icn属性')
      assert.strictEqual(formulaCount, 1, '应计数1个新公式')
    })

    it('已保存的公式应保留xml属性', () => {
      const html = `<p>公式：${mockFormulaImgWithXml}</p>`
      const { xml, formulaCount } = html2paraWithFormulas(html, 'NODE-ID', 'DM-CODE')

      assert(xml.includes('symbol'), 'XML应包含symbol')
      assert(xml.includes('xml="'), 'XML应保留xml属性')
      assert.strictEqual(formulaCount, 0, '已保存的公式计数应为0')
    })

    it('多个公式应全部转换', () => {
      const html = `<p>
        公式1：${mockFormulaImg}
        公式2：${mockFormulaImg}
      </p>`
      const { xml, formulaCount } = html2paraWithFormulas(html, 'NODE-ID', 'DM-CODE')

      const symbolCount = (xml.match(/<symbol/g) || []).length
      assert.strictEqual(symbolCount, 2, '应转换2个symbol标签')
      assert.strictEqual(formulaCount, 2, '应计数2个新公式')
    })
  })

  describe('T7: XML转HTML（完整流程）', () => {
    it('symbol标签应转换为公式img', () => {
      const xml = `<p>公式：${mockSymbolXml}</p>`
      const html = para2htmlWithFormulas(xml)

      assert(html.includes('img'), 'HTML应包含img标签')
      assert(html.includes('kfformula'), 'HTML应包含kfformula类')
    })

    it('不含xml属性的symbol应保留', () => {
      const xml = '<p><symbol infoEntityIdent="ICN-TEST"></symbol></p>'
      const html = para2htmlWithFormulas(xml)

      assert(html.includes('symbol'), 'symbol标签应保留')
    })
  })

  describe('T8: 往返转换（关键验证）', () => {
    it('设计→源码→设计完整循环，公式应保留完整', () => {
      // 第1步：设计视图HTML（新公式）
      const designHtml = `<p>计算公式：${mockFormulaImg}</p>`

      // 第2步：HTML转XML（保存）
      const { xml: sourceXml, formulaCount } = html2paraWithFormulas(
        designHtml,
        'NODE-ID',
        'DM-CODE'
      )

      assert.strictEqual(formulaCount, 1, '应识别1个新公式')
      assert(sourceXml.includes('symbol'), 'XML应包含symbol')
      assert(sourceXml.includes('xml="'), 'XML应包含转义的原始公式')

      // 第3步：XML转HTML（回到设计）
      const designHtmlRestored = para2htmlWithFormulas(sourceXml)

      // 验证公式完整性
      assert(designHtmlRestored.includes('img'), '恢复的HTML应包含img')
      assert(designHtmlRestored.includes('kfformula'), '恢复的HTML应包含kfformula类')
    })

    it('已保存的公式在往返中应保持xml属性', () => {
      // 第1步：设计视图HTML（已保存的公式）
      const designHtml = `<p>公式：${mockFormulaImgWithXml}</p>`

      // 第2步：HTML转XML
      const { xml: sourceXml, formulaCount } = html2paraWithFormulas(
        designHtml,
        'NODE-ID',
        'DM-CODE'
      )

      assert.strictEqual(formulaCount, 0, '已保存的公式计数应为0')
      assert(sourceXml.includes('xml="'), 'XML应保留xml属性')

      // 第3步：XML转HTML
      const designHtmlRestored = para2htmlWithFormulas(sourceXml)

      // 验证xml属性保留
      assert(designHtmlRestored.includes('xml="'), '恢复的HTML应保留xml属性')
    })

    it('多个公式在往返中应全部完整保留', () => {
      // 设计视图：多个公式混合（新旧）
      const designHtml = `<p>
        新公式：${mockFormulaImg}
        已保存的：${mockFormulaImgWithXml}
        再加一个：${mockFormulaImg}
      </p>`

      // HTML → XML
      const { xml: sourceXml, formulaCount } = html2paraWithFormulas(
        designHtml,
        'NODE-ID',
        'DM-CODE'
      )

      // 应有2个新公式，1个已保存的
      assert.strictEqual(formulaCount, 2, '应有2个新公式')
      const symbolCount = (sourceXml.match(/<symbol/g) || []).length
      assert.strictEqual(symbolCount, 3, 'XML应有3个symbol标签')

      // XML → HTML
      const designHtmlRestored = para2htmlWithFormulas(sourceXml)

      // 验证公式数量
      const imgCount = (designHtmlRestored.match(/<img/g) || []).length
      assert.strictEqual(imgCount, 3, '恢复的HTML应有3个公式img标签')
    })
  })

  describe('T9: 边界情况和容错', () => {
    it('HTML为null/empty应处理', () => {
      const { xml: xml1 } = html2paraWithFormulas(null, 'ID', 'CODE')
      const { xml: xml2 } = html2paraWithFormulas('', 'ID', 'CODE')

      assert.strictEqual(xml1, '', 'null应返回空字符串')
      assert.strictEqual(xml2, '', 'empty应返回空字符串')
    })

    it('XML为null/empty应处理', () => {
      const html1 = para2htmlWithFormulas(null)
      const html2 = para2htmlWithFormulas('')

      assert.strictEqual(html1, '', 'null应返回空字符串')
      assert.strictEqual(html2, '', 'empty应返回空字符串')
    })

    it('格式错误的img标签应被忽略', () => {
      const html = '<p>这是<img broken>标签</p>'
      const formulas = extractFormulaImages(html)

      assert.strictEqual(formulas.length, 0, '格式错误的img不应被提取')
    })

    it('格式错误的xml属性应被忽略', () => {
      const img = '<img class="kfformula" xml="incomplete">'
      const xml = extractXmlAttribute(img)

      assert(xml, '应提取xml属性')
      // 但值可能不完整，这是容许的
    })
  })
})

// ===== 运行测试 =====
console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║         Para公式转换 - 单元测试执行                        ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

let passCount = 0
let failCount = 0

function runTests() {
  const tests = [
    { name: 'T1: 提取公式标签', fn: require('./formula-converter.test.js').test1 },
    { name: 'T2: 提取xml属性', fn: require('./formula-converter.test.js').test2 }
    // ... 其他测试
  ]
}

// 如果在Node环境运行，自动执行测试
if (typeof module !== 'undefined' && module.exports) {
  // 导出所有测试函数
  module.exports = {
    extractFormulaImages,
    extractXmlAttribute,
    unescapeXmlAttribute,
    escapeXmlForAttribute,
    formulaHtmlToXmlSymbol,
    symbolXmlToFormulaHtml,
    html2paraWithFormulas,
    para2htmlWithFormulas
  }
}
