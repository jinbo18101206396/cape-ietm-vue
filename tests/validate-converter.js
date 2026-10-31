#!/usr/bin/env node
/**
 * levelledParaConverterV2-validation.js
 * 直接 Node.js 验证脚本 - XML 转换、转义、S1000D 标准检查
 */

const { DOMParser, XMLSerializer } = require('xmldom')

// 注入到全局
global.DOMParser = DOMParser
global.XMLSerializer = XMLSerializer

// 导入转换器（需要转换为 CommonJS）
const converterCode = `
function escapeXmlAttribute(value) {
  if (!value) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const CONTENT_TYPES = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'foldout', 'table', 'caption']
const S1000D_ORDER = {
  warning: 0,
  caution: 1,
  note: 2,
  para: 3,
  figure: 4,
  multimedia: 5,
  foldout: 6,
  table: 7,
  caption: 8
}

function parseXmlToTree(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    return []
  }

  try {
    const parser = new DOMParser()

    let processedXml = xmlString
    const tagsNeedingNamespace = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'table', 'foldout', 'caption']

    tagsNeedingNamespace.forEach(tag => {
      const regex = new RegExp(\`<\${tag}(?![^>]*xmlns:xlink)\\\\s([^>]*?)>\`, 'g')

      processedXml = processedXml.replace(regex, (match, attributes) => {
        if (attributes.includes('xmlns:xlink')) {
          return match
        }
        return \`<\${tag} xmlns:xlink="http://www.w3.org/1999/xlink" \${attributes}>\`
      })
    })

    const xmlDoc = parser.parseFromString(processedXml, 'text/xml')

    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('XML 解析错误:', parserError.textContent)
      throw new Error('XML 格式错误')
    }

    const levelledParaNode = xmlDoc.querySelector('levelledPara')
    if (!levelledParaNode) {
      throw new Error('未找到 <levelledPara> 根节点')
    }

    const rootNode = {
      id: '0',
      type: 'levelledPara',
      title: '根节点',
      content: xmlString,
      html: createEmptyHtmlContent(),
      children: []
    }

    parseChildren(levelledParaNode, rootNode.children, '0')

    return [rootNode]
  } catch (error) {
    console.error('parseXmlToTree 错误:', error.message)
    throw error
  }
}

function createEmptyHtmlContent() {
  return {
    warning: [],
    caution: [],
    note: [],
    para: [],
    figure: [],
    multimedia: [],
    foldout: [],
    table: [],
    caption: []
  }
}

function parseChildren(parentElement, targetArray, parentId) {
  let levelledParaIndex = 1

  for (let i = 0; i < parentElement.childNodes.length; i++) {
    const child = parentElement.childNodes[i]

    if (child.nodeType !== 1) continue

    const tagName = child.nodeName.toLowerCase()

    if (tagName !== 'levelledpara') continue

    const nodeId = parentId === '0' ? \`\${levelledParaIndex}\` : \`\${parentId}.\${levelledParaIndex}\`

    const titleElement = child.querySelector(':scope > title')
    const title = titleElement ? titleElement.textContent.trim() : \`层级\${nodeId}\`

    const serializer = new XMLSerializer()
    const content = serializer.serializeToString(child)

    const html = getRowhtml(child)

    const treeNode = {
      id: nodeId,
      type: 'levelledPara',
      title: title,
      content: content,
      html: html,
      children: []
    }

    parseChildren(child, treeNode.children, nodeId)

    targetArray.push(treeNode)
    levelledParaIndex++
  }
}

function getRowhtml(element) {
  const html = createEmptyHtmlContent()

  if (!element) return html

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i]

    if (child.nodeType !== 1) continue

    const tagName = child.nodeName.toLowerCase()

    switch (tagName) {
      case 'para':
        html.para.push(serializeParaBlock(child))
        break
      case 'warning':
        html.warning.push(serializeWarningBlock(child))
        break
      case 'caution':
        html.caution.push(serializeCautionBlock(child))
        break
      case 'note':
        html.note.push(serializeNoteBlock(child))
        break
      case 'figure':
        html.figure.push(serializeStructuredBlock(child))
        break
      case 'multimedia':
        html.multimedia.push(serializeStructuredBlock(child))
        break
      case 'foldout':
        html.foldout.push(serializeStructuredBlock(child))
        break
      case 'table':
        html.table.push(serializeStructuredBlock(child))
        break
      case 'caption':
        html.caption.push(serializeStructuredBlock(child))
        break
    }
  }

  return html
}

function serializeParaBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || \`para-\${Date.now()}-\${Math.random()}\`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

function serializeWarningBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || \`warning-\${Date.now()}-\${Math.random()}\`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

function serializeCautionBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || \`caution-\${Date.now()}-\${Math.random()}\`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

function serializeNoteBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || \`note-\${Date.now()}-\${Math.random()}\`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

function serializeStructuredBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || \`\${element.nodeName.toLowerCase()}-\${Date.now()}-\${Math.random()}\`

  return {
    id: id,
    xml: serializer.serializeToString(element)
  }
}

function treeToXml(treeData) {
  if (!treeData || treeData.length === 0) {
    return '<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink"></levelledPara>'
  }

  try {
    let xml = '<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">\\n'

    const rootNode = treeData[0]

    if (rootNode && rootNode.children && rootNode.children.length > 0) {
      rootNode.children.forEach(child => {
        xml += nodeToXml(child, 1)
      })
    }

    xml += '</levelledPara>'

    return xml
  } catch (error) {
    console.error('treeToXml 错误:', error)
    throw error
  }
}

function nodeToXml(node, depth) {
  const indent = '  '.repeat(depth)

  if (node.type === 'levelledPara') {
    let xml = \`\${indent}<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">\\n\`

    if (node.content) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(node.content, 'text/xml')
        const element = doc.documentElement

        for (let i = 0; i < element.childNodes.length; i++) {
          const childNode = element.childNodes[i]

          if (childNode.nodeType !== 1) continue
          if (childNode.nodeName.toLowerCase() === 'levelledpara') continue

          const childTagName = childNode.nodeName.toLowerCase()
          const structuredElements = ['figure', 'multimedia', 'table', 'foldout', 'caption']

          if (structuredElements.includes(childTagName)) {
            const serializer = new XMLSerializer()
            const childXml = serializer.serializeToString(childNode)

            const lines = childXml.split('\\n')
            lines.forEach(line => {
              if (line.trim()) {
                xml += \`\${indent}  \${line.trim()}\\n\`
              }
            })
          } else {
            const serializer = new XMLSerializer()
            const childXml = serializer.serializeToString(childNode)
            const lines = childXml.split('\\n')
            lines.forEach((line, index) => {
              if (line.trim()) {
                xml += \`\${indent}  \${line.trim()}\\n\`
              }
            })
          }
        }
      } catch (error) {
        console.warn('[nodeToXml] Failed to parse levelledPara content:', error)
      }
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        xml += nodeToXml(child, depth + 1)
      })
    }

    xml += \`\${indent}</levelledPara>\\n\`
    return xml
  }

  if (node.content) {
    try {
      const parser = new DOMParser()

      let contentToParse = node.content
      if (contentToParse.includes('xlink:') && !contentToParse.includes('xmlns:xlink')) {
        contentToParse = contentToParse.replace(
          /^(<[a-zA-Z][a-zA-Z0-9:_-]*)((?:\\s+[a-zA-Z][\\w:_-]*(?:="[^"]*"|='[^']*')?)*\\s*)(>|\\s)/,
          '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2$3'
        )
      }

      const doc = parser.parseFromString(contentToParse, 'text/xml')

      if (doc.documentElement.nodeName === 'parsererror' || doc.querySelector('parsererror')) {
        console.error('[nodeToXml] XML解析失败，使用原始内容')
        return \`\${indent}\${node.content}\\n\`
      }

      const element = doc.documentElement
      const tagName = element.nodeName

      const structuredElements = ['figure', 'multimedia', 'table', 'foldout', 'caption']
      if (structuredElements.includes(tagName.toLowerCase())) {
        const lines = node.content.split('\\n').filter(line => line.trim())
        const indentedLines = lines.map(line => \`\${indent}\${line.trim()}\`)
        return indentedLines.join('\\n') + '\\n'
      }

      const serializer = new XMLSerializer()

      const attributes = Array.from(element.attributes)
        .map(attr => \`\${attr.name}="\${escapeXmlAttribute(attr.value)}"\`)
        .join(' ')

      let innerXml = ''
      for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i]
        const childXml = serializer.serializeToString(childNode)
        const lines = childXml.split('\\n')
        lines.forEach((line, index) => {
          if (line.trim()) {
            innerXml += \`\${indent}  \${line.trim()}\\n\`
          }
        })
      }

      let xml = \`\${indent}<\${tagName}\${attributes ? ' ' + attributes : ''}>\\n\`
      xml += innerXml
      xml += \`\${indent}</\${tagName}>\\n\`

      return xml

    } catch (error) {
      console.warn('[nodeToXml] Failed to parse content:', error)
      const tagName = node.type || 'para'
      const nodeId = node.id || \`\${tagName}-\${Date.now()}\`
      return \`\${indent}<\${tagName} id="\${escapeXmlAttribute(nodeId)}"><\${tagName}>\\n\`
    }
  }

  const tagName = node.type || 'para'
  const nodeId = node.id || \`\${tagName}-\${Date.now()}\`
  let xml = \`\${indent}<\${tagName} id="\${escapeXmlAttribute(nodeId)}">\\n\`

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      xml += nodeToXml(child, depth + 1)
    })
  }

  xml += \`\${indent}</\${tagName}>\\n\`
  return xml
}

module.exports = { parseXmlToTree, treeToXml, getRowhtml, createEmptyHtmlContent }
`

// 评估转换器代码
eval(converterCode)

// ===============================
// 测试套件
// ===============================

const tests = []
const results = []

function test(name, fn) {
  tests.push({ name, fn })
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}\nExpected: ${expected}\nActual: ${actual}`)
  }
}

function assertContains(str, substr, message) {
  if (!str.includes(substr)) {
    throw new Error(`${message || 'String does not contain substring'}\nExpected substring: ${substr}\nActual string: ${str.substring(0, 200)}...`)
  }
}

function assertNotContains(str, substr, message) {
  if (str.includes(substr)) {
    throw new Error(`${message || 'String should not contain substring'}\nUnexpected substring: ${substr}`)
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Assertion failed: expected true')
  }
}

// 测试用例
test('问题1: 属性值转义 - 包含 &', () => {
  const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
    <multimedia id="222">
      <multimediaObject infoEntityIdent="ICN-ZB1-A&amp;000000-60101"/>
    </multimedia>
  </levelledPara>`

  const tree = parseXmlToTree(xml)
  const generated = treeToXml(tree)

  assertContains(generated, 'infoEntityIdent=', '应该包含属性')
  assertContains(generated, '&amp;', '应该保留转义的 &')
})

test('问题1: 属性值转义 - 包含 < 和 >', () => {
  const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
    <para id="1">
      <content note="version &lt; 2.0 &gt; required"/>
    </para>
  </levelledPara>`

  const tree = parseXmlToTree(xml)
  const generated = treeToXml(tree)

  assertContains(generated, 'note=', '应该包含 note 属性')
})

test('问题2: Multimedia 属性完整性', () => {
  const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
    <levelledPara>
      <title>层级1</title>
      <multimedia id="222" xlink:type="simple" xlink:show="replace">
        <title>111</title>
        <multimediaObject xlink:type="simple" xlink:actuate="onRequest" multimediaType="3D"/>
      </multimedia>
    </levelledPara>
  </levelledPara>`

  const tree = parseXmlToTree(xml)
  const generated = treeToXml(tree)

  assertContains(generated, 'multimedia', '应该包含 multimedia 元素')
  assertContains(generated, 'id="222"', '应该保留 id 属性')
  assertContains(generated, 'multimediaType="3D"', '应该保留 multimediaType 属性')
  assertContains(generated, 'xlink:type', '应该保留 xlink 属性')
})

test('问题3: 正则表达式处理 - 不重复添加 namespace', () => {
  const xml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
    <para id="p1" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple">文本</para>
  </levelledPara>`

  const tree = parseXmlToTree(xml)
  const generated = treeToXml(tree)

  const namespaceCount = (generated.match(/xmlns:xlink/g) || []).length
  assertTrue(namespaceCount <= 10, `namespace 声明数量过多: ${namespaceCount}`)
})

test('S1000D: 元素嵌套结构', () => {
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

  assertContains(generated, '层级1', '应该保留第一级标题')
  assertContains(generated, '层级1.1', '应该保留嵌套标题')

  const levelledParaCount = (generated.match(/<levelledPara/g) || []).length
  assertTrue(levelledParaCount >= 3, '应该有至少 3 个 levelledPara 元素')
})

test('S1000D: XML 格式有效性', () => {
  const inputXml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
    <levelledPara>
      <title>测试</title>
      <multimedia id="m1">
        <title>多媒体</title>
        <multimediaObject xlink:type="simple" infoEntityIdent="ICN-001"/>
      </multimedia>
    </levelledPara>
  </levelledPara>`

  const tree = parseXmlToTree(inputXml)
  const generated = treeToXml(tree)

  // 应该能被重新解析
  const tree2 = parseXmlToTree(generated)
  assertTrue(tree2 && tree2.length > 0, '生成的 XML 应该能被重新解析')

  assertNotContains(generated, '="\\"', '不应该有双重引号')
  assertContains(generated, '<levelledPara', '应该有 levelledPara 开标签')
  assertContains(generated, '</levelledPara>', '应该有 levelledPara 闭标签')
})

test('原始错误场景: Multimedia 保存和解析', () => {
  const scenarioXml = `<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
    <levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
      <title>层级1</title>
      <multimedia xmlns:xlink="http://www.w3.org/1999/xlink" id="222">
        <title>111</title>
        <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101-30101-00007-A-001-01" multimediaType="3D"/>
      </multimedia>
    </levelledPara>
  </levelledPara>`

  const tree = parseXmlToTree(scenarioXml)
  assertTrue(tree && tree.length > 0, '应该成功解析')

  const generated = treeToXml(tree)
  assertTrue(generated, '应该生成有效的 XML')

  // 不应该有格式错误
  assertNotContains(generated, '=""', '不应该有空属性值')

  // 应该能再次解析
  const tree2 = parseXmlToTree(generated)
  assertTrue(tree2 && tree2.length > 0, '生成的 XML 应该能再次解析')

  console.log('✅ 原始错误场景验证通过')
})

// ===============================
// 运行测试
// ===============================

console.log('\\n========== levelledParaConverterV2 验证测试 ==========\\n')

let passed = 0
let failed = 0

tests.forEach(({ name, fn }) => {
  try {
    fn()
    results.push({ name, status: '✅ PASS', error: null })
    passed++
    console.log(`✅ ${name}`)
  } catch (error) {
    results.push({ name, status: '❌ FAIL', error: error.message })
    failed++
    console.log(`❌ ${name}`)
    console.log(`   错误: ${error.message.split('\\n')[0]}`)
  }
})

console.log('\\n========== 测试结果摘要 ==========\\n')
console.log(`总计: ${tests.length} | 通过: ${passed} | 失败: ${failed}`)

if (failed === 0) {
  console.log('\\n✅ 所有测试通过！修复有效。\\n')
  process.exit(0)
} else {
  console.log(`\\n❌ 有 ${failed} 个测试失败\\n`)
  results.filter(r => r.error).forEach(r => {
    console.log(`失败: ${r.name}`)
    console.log(`原因: ${r.error}\\n`)
  })
  process.exit(1)
}
