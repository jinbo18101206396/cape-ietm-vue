/**
 * ⚠️ DEPRECATED - 此文件已废弃
 *
 * 请使用 levelledParaConverterV2.js 替代
 *
 * 迁移说明：
 * - parseXmlToTree  → levelledParaConverterV2.parseXmlToTree
 * - treeToXml       → levelledParaConverterV2.treeToXml
 * - validateTree    → levelledParaConverterV2.validateTree
 * - regenerateIds   → levelledParaConverterV2.regenerateIds ✅ 已迁移 (2026-10-31)
 * - createEmptyNode → levelledParaConverterV2.createEmptyNode
 *
 * V2 改进：
 * - ✅ 属性值转义（防止 XML 格式错误）
 * - ✅ Namespace 优化（符合 S1000D 最佳实践）
 * - ✅ 双重序列化修复
 * - ✅ 完整的单元测试覆盖
 *
 * @deprecated 请使用 levelledParaConverterV2.js
 * @since 2026-10-31 标记为废弃
 */

/**
 * levelledParaConverter.js
 * levelledPara XML ↔ TreeGrid 数据结构双向转换工具
 *
 * 功能：
 * 1. parseXmlToTree: 将 <levelledPara> XML 解析为 TreeGrid 树形数据结构
 * 2. treeToXml: 将 TreeGrid 树形数据结构转换回 <levelledPara> XML
 * 3. validateTree: 验证树形数据结构合法性
 *
 * 数据结构：
 * TreeNode {
 *   id: '1.1.2',           // 层级ID（自动生成）
 *   type: 'para',          // 内容类型：para/warning/caution/note/figure/multimedia/table
 *   title: '标题',          // 节点标题（必填）
 *   content: '<para>...</para>', // 原始XML内容
 *   children: []           // 子节点数组
 * }
 */

/**
 * 解析 levelledPara XML 为树形结构
 * @param {string} xmlString - levelledPara XML字符串
 * @returns {Array<TreeNode>} 树形节点数组
 */
export function parseXmlToTree(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    return []
  }

  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

    // 检查解析错误
    const parserError = xmlDoc.querySelector('parsererror')
    if (parserError) {
      console.error('XML解析错误:', parserError.textContent)
      throw new Error('XML格式错误')
    }

    const levelledParaNode = xmlDoc.querySelector('levelledPara')
    if (!levelledParaNode) {
      throw new Error('未找到 <levelledPara> 根节点')
    }

    // 创建根节点对象（对应旧系统的root节点）
    const rootNode = {
      id: '0',
      type: 'levelledPara',
      title: '根节点',
      content: xmlString,
      children: [],
      html: {} // 根节点通常没有内容
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
 * @param {Element} parentElement - 父级 XML 元素
 * @param {Array<TreeNode>} targetArray - 目标数组
 * @param {string} parentId - 父级ID前缀
 */
function parseChildren(parentElement, targetArray, parentId) {
  const contentTypes = ['para', 'warning', 'caution', 'note', 'figure', 'multimedia', 'table']
  let index = 1

  for (let i = 0; i < parentElement.childNodes.length; i++) {
    const child = parentElement.childNodes[i]

    // 跳过文本节点和注释
    if (child.nodeType !== 1) continue

    const tagName = child.nodeName.toLowerCase()

    // 只处理7种内容类型
    if (!contentTypes.includes(tagName)) continue

    // 生成层级ID
    const nodeId = parentId ? `${parentId}.${index}` : `${index}`

    // 提取标题
    const title = extractTitle(child, tagName)

    // 序列化当前节点的XML内容
    const serializer = new XMLSerializer()
    const content = serializer.serializeToString(child)

    // 创建树节点
    const treeNode = {
      id: nodeId,
      type: tagName,
      title: title || `${tagName} ${nodeId}`,
      content: content,
      children: [],
      html: {
        para: '[]',
        warning: '[]',
        caution: '[]',
        note: '[]',
        figure: '[]',
        multimedia: '[]',
        table: '[]'
      }
    }

    // 递归解析子节点（检查是否有7种内容类型的子元素）
    const hasContentChildren = Array.from(child.childNodes).some(childNode => {
      if (childNode.nodeType !== 1) return false
      const childTagName = childNode.nodeName.toLowerCase()
      return contentTypes.includes(childTagName)
    })

    if (hasContentChildren) {
      parseChildren(child, treeNode.children, nodeId)
    }

    targetArray.push(treeNode)
    index++
  }
}

/**
 * 提取节点标题
 * @param {Element} element - XML元素
 * @param {string} type - 内容类型
 * @returns {string} 标题文本
 */
function extractTitle(element, type) {
  // 根据不同类型提取标题
  switch (type) {
    case 'para':
    case 'warning':
    case 'caution':
    case 'note':
      // 提取文本内容的前30个字符作为标题
      const text = element.textContent || ''
      return text.trim().substring(0, 30) + (text.length > 30 ? '...' : '')

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

    default:
      return type
  }
}

/**
 * 将树形结构转换为 levelledPara XML
 * @param {Array<TreeNode>} treeData - 树形数据数组
 * @returns {string} levelledPara XML字符串
 */
export function treeToXml(treeData) {
  if (!treeData || treeData.length === 0) {
    return '<levelledPara></levelledPara>'
  }

  try {
    let xml = '<levelledPara>\n'

    // 递归生成子节点XML
    treeData.forEach(node => {
      xml += nodeToXml(node, 1)
    })

    xml += '</levelledPara>'

    return xml
  } catch (error) {
    console.error('treeToXml 错误:', error)
    throw error
  }
}

/**
 * 递归将树节点转换为XML
 * 核心原理：
 * 1. node.content 包含节点本身的XML（由parseXmlToTree提取或重建）
 * 2. node.children 包含解析出的子节点（来自XML中的嵌套内容类型）
 * 3. 递归输出时：
 *    a. 如果节点有子节点，则content中不应包含子节点，需要拆分处理
 *    b. 如果节点无子节点，则content本身是完整的元素
 *
 * @param {TreeNode} node - 树节点
 * @param {number} depth - 缩进深度
 * @returns {string} XML字符串
 */
function nodeToXml(node, depth) {
  const indent = '  '.repeat(depth)

  // ============ 第一步：解析节点的content获取标签名和属性 ============
  let tagName = node.type || 'para'
  let attributes = ''
  let nodeInnerContent = ''

  if (node.content) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(node.content, 'text/xml')

      // 检查解析错误
      if (doc.querySelector('parsererror')) {
        throw new Error('Invalid XML')
      }

      const element = doc.documentElement
      tagName = element.nodeName

      // 提取属性
      attributes = Array.from(element.attributes)
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(' ')

      // 获取节点的直接文本内容（不包括子元素）
      // 因为parseChildren只将content类型的子元素放入children数组，
      // 所以content中的文本内容是安全的
      nodeInnerContent = getDirectTextContent(element)

    } catch (error) {
      console.warn('[nodeToXml] Failed to parse content, using fallback:', error)
      // 解析失败时使用安全的后备方案
      nodeInnerContent = ''
    }
  }

  // ============ 第二步：生成开始标签 ============
  let xml = `${indent}<${tagName}${attributes ? ' ' + attributes : ''}>\n`

  // ============ 第三步：添加节点自身的内容 ============
  if (nodeInnerContent && nodeInnerContent.trim()) {
    const lines = nodeInnerContent.split('\n')
    lines.forEach(line => {
      if (line.trim()) {
        xml += `${indent}  ${line.trim()}\n`
      }
    })
  }

  // ============ 第四步：递归添加子节点 ============
  // 注意：children 只包含通过parseChildren提取的同类型子节点
  // 这些子节点也会被parseChildren处理，所以这里直接递归
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      xml += nodeToXml(child, depth + 1)
    })
  }

  // ============ 第五步：生成结束标签 ============
  xml += `${indent}</${tagName}>\n`

  return xml
}

/**
 * 获取元素的直接文本内容（不包括子元素的文本）
 * @param {Element} element - DOM元素
 * @returns {string} 直接文本内容
 */
function getDirectTextContent(element) {
  let text = ''
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i]
    if (node.nodeType === 3) { // 文本节点
      text += node.textContent
    }
  }
  return text.trim()
}

/**
 * 验证树形数据结构
 * @param {Array<TreeNode>} treeData - 树形数据数组
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTree(treeData) {
  const errors = []
  const contentTypes = ['para', 'warning', 'caution', 'note', 'figure', 'multimedia', 'table']

  function validateNode(node, depth = 1, path = '') {
    const currentPath = path ? `${path}.${node.id}` : node.id

    // 检查必填字段
    if (!node.id) {
      errors.push(`节点 ${currentPath} 缺少 ID`)
    }
    if (!node.type) {
      errors.push(`节点 ${currentPath} 缺少类型`)
    } else if (!contentTypes.includes(node.type)) {
      errors.push(`节点 ${currentPath} 类型 "${node.type}" 不合法，必须是: ${contentTypes.join(', ')}`)
    }
    if (!node.title || !node.title.trim()) {
      errors.push(`节点 ${currentPath} 缺少标题`)
    }
    if (!node.content) {
      errors.push(`节点 ${currentPath} 缺少内容`)
    }

    // 检查深度限制（最大10层）
    if (depth > 10) {
      errors.push(`节点 ${currentPath} 深度超过限制（最大10层）`)
    }

    // 递归验证子节点
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        validateNode(child, depth + 1, currentPath)
      })
    }
  }

  if (!Array.isArray(treeData)) {
    return { valid: false, errors: ['树形数据必须是数组'] }
  }

  treeData.forEach(node => validateNode(node))

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 重新生成树形结构的ID（确保ID连续且正确）
 * @param {Array<TreeNode>} treeData - 树形数据数组
 * @param {string} parentId - 父级ID前缀
 * @returns {Array<TreeNode>} 更新后的树形数据
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

/**
 * 查找指定ID的节点
 * @param {Array<TreeNode>} treeData - 树形数据数组
 * @param {string} targetId - 目标节点ID
 * @returns {TreeNode|null} 找到的节点或null
 */
export function findNodeById(treeData, targetId) {
  if (!Array.isArray(treeData)) return null

  for (const node of treeData) {
    if (node.id === targetId) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, targetId)
      if (found) return found
    }
  }

  return null
}

/**
 * 获取节点的父级路径
 * @param {string} nodeId - 节点ID（如 '1.2.3'）
 * @returns {string} 父级ID（如 '1.2'），如果是根节点则返回空字符串
 */
export function getParentId(nodeId) {
  if (!nodeId || typeof nodeId !== 'string') return ''
  const parts = nodeId.split('.')
  if (parts.length <= 1) return ''
  parts.pop()
  return parts.join('.')
}

/**
 * 创建空节点模板
 * @param {string} type - 节点类型
 * @param {string} id - 节点ID
 * @returns {TreeNode} 节点对象
 */
export function createEmptyNode(type, id) {
  const templates = {
    para: `<para>${type} ${id}</para>`,
    warning: `<warning><warningAndCautionPara>${type} ${id}</warningAndCautionPara></warning>`,
    caution: `<caution><warningAndCautionPara>${type} ${id}</warningAndCautionPara></caution>`,
    note: `<note><notePara>${type} ${id}</notePara></note>`,
    figure: `<figure><title>Figure ${id}</title><graphic/></figure>`,
    multimedia: `<multimedia><multimediaObject><imageObject><imageData icnRef=""/></imageObject></multimediaObject></multimedia>`,
    table: `<table><title>Table ${id}</title><tgroup cols="2"><tbody><row><entry/><entry/></row></tbody></tgroup></table>`
  }

  return {
    id,
    type,
    title: `${type} ${id}`,
    content: templates[type] || `<${type}>${type} ${id}</${type}>`,
    children: [],
    html: {
      para: '[]',
      warning: '[]',
      caution: '[]',
      note: '[]',
      figure: '[]',
      multimedia: '[]',
      table: '[]'
    }
  }
}

export default {
  parseXmlToTree,
  treeToXml,
  validateTree,
  regenerateIds,
  findNodeById,
  getParentId,
  createEmptyNode
}
