/**
 * levelledParaConverterV2.js
 * 完整修复版 levelledPara XML ↔ TreeGrid 双向转换
 *
 * 核心修复点：
 * 1. 一个节点 = 多种内容类型共存（getRowhtml 完整提取）
 * 2. 嵌套元素保留原始 XML（figure/multimedia/table）
 * 3. 递归序列化所有 7 种类型（S1000D 顺序）
 */

// 定义常量（不需要从 TypeScript 导入）
// 🔑 S1000D 4.0 符合性修复：添加 foldout 和 caption
const CONTENT_TYPES = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'foldout', 'table', 'caption']
const S1000D_ORDER = {
  warning: 0,
  caution: 1,
  note: 2,
  para: 3,
  figure: 4,
  multimedia: 5,
  foldout: 6,      // 🔑 新增：S1000D 标准要求
  table: 7,
  caption: 8       // 🔑 新增：S1000D 标准要求
}

/**
 * 完整解析 XML 为树形结构
 * @param {string} xmlString - levelledPara XML 字符串
 * @returns {LevelledParaNode[]} 树形节点数组
 */
export function parseXmlToTree(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    return []
  }

  try {
    const parser = new DOMParser()

    // 🔑 优化：不需要预处理添加 xmlns:xlink
    // 原因：XML namespace 会自动继承到所有子元素，只需在根元素声明一次
    // 之前在所有使用 xlink: 的元素上添加 xmlns:xlink 是冗余的

    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

    // 检查解析错误
    const parserError = xmlDoc.querySelector ? xmlDoc.querySelector('parsererror') : null
    if (parserError) {
      console.error('XML 解析错误:', parserError.textContent)
      throw new Error('XML 格式错误')
    }

    const levelledParaNode = xmlDoc.querySelector('levelledPara')
    if (!levelledParaNode) {
      throw new Error('未找到 <levelledPara> 根节点')
    }

    // 创建根节点
    const rootNode = {
      id: '0',
      type: 'levelledPara',
      title: '根节点',
      content: xmlString,
      html: createEmptyHtmlContent(),
      children: []
    }

    // 递归解析子节点
    parseChildren(levelledParaNode, rootNode.children, '0')

    return [rootNode]
  } catch (error) {
    console.error('parseXmlToTree 错误:', error)
    throw error
  }
}

/**
 * 递归解析子节点
 * 🔑 S1000D 标准：只递归处理嵌套的 <levelledPara>，不处理内容类型元素
 * @param {Element} parentElement - 父级 XML 元素
 * @param {Array} targetArray - 目标子节点数组
 * @param {string} parentId - 父级 ID 前缀
 */
function parseChildren(parentElement, targetArray, parentId) {
  let levelledParaIndex = 1  // levelledPara 索引

  for (let i = 0; i < parentElement.childNodes.length; i++) {
    const child = parentElement.childNodes[i]

    // 跳过文本节点和注释
    if (child.nodeType !== 1) continue

    const tagName = child.nodeName.toLowerCase()

    // 🔑 S1000D 标准：只处理嵌套的 <levelledPara>，形成层级结构
    // 内容类型元素（para/warning/figure）由 getRowhtml 提取到 node.html，不创建树节点
    if (tagName !== 'levelledpara') continue

    // 生成层级 ID
    const nodeId = parentId === '0' ? `${levelledParaIndex}` : `${parentId}.${levelledParaIndex}`

    // 提取标题
    const titleElement = child.querySelector(':scope > title')
    const title = titleElement ? titleElement.textContent.trim() : `层级${nodeId}`

    // 序列化当前节点的 XML 内容
    const serializer = new XMLSerializer()
    const content = serializer.serializeToString(child)

    // 提取内容（不包括嵌套的 levelledPara）
    const html = getRowhtml(child)

    // 创建树节点
    const treeNode = {
      id: nodeId,
      type: 'levelledPara',
      title: title,
      content: content,
      html: html,
      children: []
    }

    // 🔑 递归处理嵌套的 <levelledPara> 子节点
    parseChildren(child, treeNode.children, nodeId)

    targetArray.push(treeNode)
    levelledParaIndex++
  }
}

/**
 * 关键修复：完整提取节点内所有 7 种内容类型
 * 对标旧系统的 getRowhtml() 方法
 *
 * @param {Element} element - XML 元素
 * @returns {LevelledParaContent} 包含所有 7 种类型的内容对象
 */
export function getRowhtml(element) {
  const html = createEmptyHtmlContent()

  if (!element) return html

  // 遍历所有子元素，按类型分类
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i]

    if (child.nodeType !== 1) continue  // 只处理元素节点

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
        // 🔑 S1000D 符合性：foldout 是结构化元素
        html.foldout.push(serializeStructuredBlock(child))
        break
      case 'table':
        html.table.push(serializeStructuredBlock(child))
        break
      case 'caption':
        // 🔑 S1000D 符合性：caption 是结构化元素
        html.caption.push(serializeStructuredBlock(child))
        break
      default:
        break
    }

  }

  return html
}

/**
 * 序列化段落块（para/warning/caution/note）
 * 保留文本内容和嵌套标签
 */
function serializeParaBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || `para-${Date.now()}-${Math.random()}`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

/**
 * 序列化警告块（对标旧系统 getSavedother 中的 warning 处理）
 */
function serializeWarningBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || `warning-${Date.now()}-${Math.random()}`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

/**
 * 序列化注意块
 */
function serializeCautionBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || `caution-${Date.now()}-${Math.random()}`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

/**
 * 序列化提醒块
 */
function serializeNoteBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || `note-${Date.now()}-${Math.random()}`

  return {
    id: id,
    content: serializer.serializeToString(element)
  }
}

/**
 * 序列化结构化块（figure/multimedia/table）
 * 保留完整的 XML（包括所有嵌套元素和属性）
 */
function serializeStructuredBlock(element) {
  const serializer = new XMLSerializer()
  const id = element.getAttribute('id') || `${element.nodeName.toLowerCase()}-${Date.now()}-${Math.random()}`

  return {
    id: id,
    xml: serializer.serializeToString(element)
  }
}

/**
 * 创建空的 HTML 内容对象
 */
export function createEmptyHtmlContent() {
  return {
    warning: [],
    caution: [],
    note: [],
    para: [],
    figure: [],
    multimedia: [],
    foldout: [],    // 🔑 S1000D 符合性：添加 foldout
    table: [],
    caption: []     // 🔑 S1000D 符合性：添加 caption
  }
}

/**
 * 提取节点标题（仅用于 fallback，当 <title> 元素不存在时）
 * 🔑 关键修复：对标旧系统，warning/caution/note 不提取文本作为标题
 */
function extractTitle(element, type) {
  switch (type) {
    case 'para':
      // para 类型：提取文本内容的前30个字符作为标题
      const text = element.textContent || ''
      return text.trim().substring(0, 30) + (text.length > 30 ? '...' : '')

    case 'warning':
    case 'caution':
    case 'note':
      // 🔑 关键修复：这些类型不应该有 fallback 标题，返回类型名
      return type

    case 'figure': {
      const title = element.querySelector('title')
      return title ? title.textContent.trim() : 'Figure'
    }

    case 'multimedia': {
      const multimediaObject = element.querySelector('multimediaObject')
      if (multimediaObject) {
        const imageObj = multimediaObject.querySelector('imageObject')
        if (imageObj) {
          const imageData = imageObj.querySelector('imageData')
          if (imageData) {
            const icnRef = imageData.getAttribute('icnRef')
            return icnRef || 'Multimedia'
          }
        }
      }
      return 'Multimedia'
    }

    case 'table': {
      const title = element.querySelector('title')
      return title ? title.textContent.trim() : 'Table'
    }

    case 'foldout':
      return 'Foldout'

    case 'caption':
      return 'Caption'

    default:
      return type
  }
}

/**
 * 将树形结构转换为 levelledPara XML
 * ✅ 正确实现：只生成一个外层 <levelledPara>，内部是内容元素的嵌套
 * @param {Array} treeData - 树形数据数组
 * @returns {string} levelledPara XML字符串
 */
export function treeToXml(treeData) {
  if (!treeData || treeData.length === 0) {
    return '<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink"></levelledPara>'
  }

  try {
    // 🔑 P0修复：添加 xlink 命名空间声明，dmRef 标签需要此命名空间
    let xml = '<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">\n'

    // treeData[0] 是根节点，包含实际的内容节点
    const rootNode = treeData[0]

    if (rootNode && rootNode.children && rootNode.children.length > 0) {
      // 递归生成子节点XML（从 depth=1 开始）
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

/**
 * XML 属性值转义函数
 * 将特殊字符转义为实体引用
 */
function escapeXmlAttribute(value) {
  if (!value) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 递归将树节点转换为XML
 * 🔑 S1000D 标准：根据 node.type 区分处理
 *   - type='levelledPara': 生成 <levelledPara> 嵌套结构
 *   - 其他类型: 生成内容标签（para/warning/figure等）
 *
 * @param {Object} node - 树节点
 * @param {number} depth - 缩进深度
 * @returns {string} XML字符串
 */
function nodeToXml(node, depth) {
  const indent = '  '.repeat(depth)

  // 🔑 S1000D 标准：嵌套的 levelledPara 生成 <levelledPara> 标签
  if (node.type === 'levelledPara') {
    // 🔑 优化：只有根 levelledPara（depth=0 时由 treeToXml 处理）需要声明 xmlns:xlink
    // 嵌套的 levelledPara 继承父元素的 namespace，不需要重复声明
    let xml = `${indent}<levelledPara>\n`

    // 从 node.content 中提取直接内容（不包括嵌套的 levelledPara）
    if (node.content) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(node.content, 'text/xml')
        const element = doc.documentElement

        // 序列化直接子节点（排除嵌套的 levelledPara）
        for (let i = 0; i < element.childNodes.length; i++) {
          const childNode = element.childNodes[i]

          // 跳过文本节点和嵌套的 levelledPara（由 node.children 处理）
          if (childNode.nodeType !== 1) continue
          if (childNode.nodeName.toLowerCase() === 'levelledpara') continue

          const childTagName = childNode.nodeName.toLowerCase()

          // 🔑 P0修复：对结构化元素（multimedia/figure/table），直接使用原始 XML 内容
          // 避免双重序列化导致属性变化和格式错误
          const structuredElements = ['figure', 'multimedia', 'table', 'foldout', 'caption']

          if (structuredElements.includes(childTagName)) {
            // 直接序列化结构化元素，确保属性完整且格式正确
            const serializer = new XMLSerializer()
            const childXml = serializer.serializeToString(childNode)

            // 🔑 关键：对每行添加缩进，但保持原始属性格式
            const lines = childXml.split('\n')
            lines.forEach(line => {
              if (line.trim()) {
                xml += `${indent}  ${line.trim()}\n`
              }
            })
          } else {
            // 非结构化元素使用标准序列化
            const serializer = new XMLSerializer()
            const childXml = serializer.serializeToString(childNode)
            const lines = childXml.split('\n')
            lines.forEach((line, index) => {
              if (line.trim()) {
                xml += `${indent}  ${line.trim()}\n`
              }
            })
          }
        }
      } catch (error) {
        console.warn('[nodeToXml] Failed to parse levelledPara content:', error)
      }
    }

    // 递归添加嵌套的 levelledPara 子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        xml += nodeToXml(child, depth + 1)
      })
    }

    xml += `${indent}</levelledPara>\n`
    return xml
  }

  // 🔑 内容类型元素：生成对应的标签（para/warning/figure等）
  if (node.content) {
    try {
      const parser = new DOMParser()

      // 🔑 优化：不需要添加 xmlns:xlink
      // 原因：所有元素都继承根元素的 namespace 声明
      const doc = parser.parseFromString(node.content, 'text/xml')

      // 🔑 改进的 parsererror 检测（parsererror 在 xhtml 命名空间中）
      if (doc.documentElement.nodeName === 'parsererror' || doc.querySelector('parsererror')) {
        console.error('[nodeToXml] XML解析失败，使用原始内容')
        return `${indent}${node.content}\n`
      }

      const element = doc.documentElement
      const tagName = element.nodeName

      // 🔑 关键修复：结构化元素（figure/multimedia/table/foldout/caption）直接使用原始XML
      // 这些元素的XML已由各自的converter生成，不需要二次解析和格式化
      const structuredElements = ['figure', 'multimedia', 'table', 'foldout', 'caption']
      if (structuredElements.includes(tagName.toLowerCase())) {
        // 直接返回原始XML，添加当前层级的缩进
        const lines = node.content.split('\n').filter(line => line.trim())
        const indentedLines = lines.map(line => `${indent}${line.trim()}`)
        return indentedLines.join('\n') + '\n'
      }

      // 🔑 非结构化元素（para/warning/caution/note）：需要重新格式化
      const serializer = new XMLSerializer()

      // 提取标签名和属性（转义属性值）
      const attributes = Array.from(element.attributes)
        .map(attr => `${attr.name}="${escapeXmlAttribute(attr.value)}"`)
        .join(' ')

      // 序列化所有子节点
      let innerXml = ''
      for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i]
        const childXml = serializer.serializeToString(childNode)
        const lines = childXml.split('\n')
        lines.forEach((line, index) => {
          if (line.trim()) {
            innerXml += `${indent}  ${line.trim()}\n`
          }
        })
      }

      // 生成完整标签
      let xml = `${indent}<${tagName}${attributes ? ' ' + attributes : ''}>\n`
      xml += innerXml
      xml += `${indent}</${tagName}>\n`

      return xml

    } catch (error) {
      console.warn('[nodeToXml] Failed to parse content:', error)
      const tagName = node.type || 'para'
      const nodeId = node.id || `${tagName}-${Date.now()}`
      return `${indent}<${tagName} id="${escapeXmlAttribute(nodeId)}"></${tagName}>\n`
    }
  }

  // Fallback：没有 content 时使用基本结构
  const tagName = node.type || 'para'
  const nodeId = node.id || `${tagName}-${Date.now()}`
  let xml = `${indent}<${tagName} id="${escapeXmlAttribute(nodeId)}">\n`

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      xml += nodeToXml(child, depth + 1)
    })
  }

  xml += `${indent}</${tagName}>\n`
  return xml
}

/**
 * 获取元素的直接文本内容（不包括子元素）
 * @param {Element} element - XML 元素
 * @returns {string} 直接文本内容
 */
function getDirectTextContent(element) {
  let textContent = ''

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i]

    // 只处理文本节点和 CDATA 节点
    if (child.nodeType === 3 || child.nodeType === 4) {
      textContent += child.nodeValue
    }
  }

  return textContent
}

/**
 * 创建空节点
 */
export function createEmptyNode(type, id) {
  const templates = {
    para: `<para id="${id}"><para>新段落</para></para>`,
    warning: `<warning id="${id}"><warningAndCautionPara>新警告</warningAndCautionPara></warning>`,
    caution: `<caution id="${id}"><warningAndCautionPara>新注意</warningAndCautionPara></caution>`,
    note: `<note id="${id}"><notePara>新提醒</notePara></note>`,
    figure: `<figure id="${id}"><title>新图形</title><graphic/></figure>`,
    multimedia: `<multimedia id="${id}"><multimediaObject><imageObject><imageData icnRef=""/></imageObject></multimediaObject></multimedia>`,
    table: `<table id="${id}"><title>新表格</title><tgroup cols="2"><tbody><row><entry/><entry/></row></tbody></tgroup></table>`
  }

  // 🔑 S1000D 标准：支持创建嵌套的 levelledPara 节点
  if (type === 'levelledPara') {
    return {
      id,
      type: 'levelledPara',
      title: `层级${id}`,
      content: `<levelledPara></levelledPara>`,
      html: createEmptyHtmlContent(),
      children: []
    }
  }

  return {
    id,
    type,
    title: `${type} ${id}`,
    content: templates[type] || `<${type}>${type}</${type}>`,
    html: createEmptyHtmlContent(),
    children: []
  }
}

/**
 * 验证树形数据结构的合法性
 * 检查必填字段、数据类型、深度限制等
 *
 * @param {Array<LevelledParaNode>} treeData - 树形数据数组
 * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
 */
export function validateTree(treeData) {
  const errors = []
  const contentTypes = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'table', 'foldout', 'caption']

  function validateNode(node, depth = 1, path = '', isRoot = false) {
    const currentPath = path ? `${path}.${node.id}` : node.id

    // 🔑 S1000D 标准：levelledPara 可以是根节点或嵌套节点
    if (node.type === 'levelledPara') {
      // levelledPara 只验证子节点
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
          validateNode(child, depth + 1, currentPath, false)
        })
      }
      return
    }

    // 检查必填字段
    if (!node.id) {
      errors.push(`节点 ${currentPath} 缺少 ID`)
    }

    if (!node.type) {
      errors.push(`节点 ${currentPath} 缺少类型`)
    } else if (!contentTypes.includes(node.type)) {
      errors.push(`节点 ${currentPath} 类型 "${node.type}" 不合法，必须是: ${contentTypes.join(', ')}`)
    }

    // title 是可选的（S1000D 标准允许无标题节点），不验证

    if (!node.html) {
      errors.push(`节点 ${currentPath} 缺少 html 容器`)
    }

    // 检查深度限制（最大 10 层）
    if (depth > 10) {
      errors.push(`节点 ${currentPath} 深度超过限制（最大 10 层）`)
    }

    // 递归验证子节点
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        validateNode(child, depth + 1, currentPath, false)
      })
    }
  }

  // 检查输入
  if (!Array.isArray(treeData)) {
    return { valid: false, errors: ['树形数据必须是数组'] }
  }

  // 验证每个根节点（传入 isRoot=true）
  treeData.forEach(node => validateNode(node, 1, '', true))

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 重新生成树节点的ID
 * 🔑 从 levelledParaConverter.js 迁移，统一使用 V2
 *
 * @param {Array<TreeNode>} treeData - 树形数据数组
 * @param {string} parentId - 父节点ID（默认为空字符串表示根节点）
 * @returns {Array<TreeNode>} 重新生成ID后的树形数据
 */
export function regenerateIds(treeData, parentId = '') {
  if (!Array.isArray(treeData)) return []

  // 🔑 S1000D 标准：levelledPara 节点和内容节点分别计数
  let levelledParaIndex = 0
  let contentIndex = 0

  return treeData.map((node) => {
    let newId

    if (node.type === 'levelledPara') {
      // levelledPara 节点：按同级 levelledPara 计数
      levelledParaIndex++
      newId = parentId ? `${parentId}.${levelledParaIndex}` : `${levelledParaIndex}`
    } else {
      // 内容节点：按同级内容节点计数
      contentIndex++
      newId = parentId ? `${parentId}.${contentIndex}` : `${contentIndex}`
    }

    const newNode = {
      ...node,
      id: newId
    }

    if (node.children && node.children.length > 0) {
      newNode.children = regenerateIds(node.children, newId)
    }

    return newNode
  })
}

export default {
  parseXmlToTree,
  treeToXml,
  getRowhtml,
  createEmptyHtmlContent,
  createEmptyNode,
  validateTree,
  regenerateIds
}

// CommonJS 导出（用于 Node.js/Jest）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseXmlToTree,
    treeToXml,
    getRowhtml,
    createEmptyHtmlContent,
    createEmptyNode,
    validateTree,
    regenerateIds
  }
}
