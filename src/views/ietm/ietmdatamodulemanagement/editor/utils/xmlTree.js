// editor/utils/xmlTree.js
// 对标 legacy getTreeNodesfromXml（需求 §8.1 CONFIRMED）+ linenoOffset 动态（§8.2 CONFIRMED）

// XML 元素名字符类：必须支持中文（GJB6600 元素名如 数据模块/内容/说明）。
// \w 不匹配中文，会导致中文元素的 lineno 计算失败。'一-鿿' 覆盖 CJK 统一表意文字。
const TAG = '[A-Za-z_\\u4e00-\\u9fff][\\w.\\-\\u4e00-\\u9fff]*'

let _nodeIdCounter = 0

/**
 * 从 XML 字符串构建扁平 nodeList（§8.1 CONFIRMED）。
 * 假设：格式化后每元素独占一行（§8.2 前提）。
 */
export function getTreeNodesfromXml(xmlStr, rootName = 'dmodule') {
  const nodes = []
  if (!xmlStr) {
    return nodes
  }
  _nodeIdCounter = 0

  let xml = xmlStr
  const rootIdx = xml.indexOf('<' + rootName)
  if (rootIdx < 0) {
    console.error('[xmlTree] 未找到根元素:', rootName, 'XML前100字符:', xml.substring(0, 100))
    return nodes
  }
  xml = xml.substring(rootIdx)
  xml = xml.replace(new RegExp('<' + rootName + '[^>]*>'), '<' + rootName + '>')
  xml = xml.replace(/(\s)([\w]+):/g, '$1$2_').replace(/<([\w]+):/g, '<$1_').replace(/<\/([\w]+):/g, '</$1_')

  let doc
  try { doc = new DOMParser().parseFromString(xml, 'text/xml') } catch (e) {
    console.error('[xmlTree] XML解析异常:', e.message)
    return nodes
  }
  if (doc.getElementsByTagName('parsererror').length > 0) {
    console.error('[xmlTree] XML格式错误，存在parsererror')
    return nodes
  }

  const root = doc.documentElement
  const rootNode = { id: 0, pid: -1, text: rootName,
    attributes: { name: rootName, path: '/' + rootName, lineno: 1, attrval: '' } }
  nodes.push(rootNode)
  _loopNode(root, '/' + rootName, 0, nodes)
  _calcLinenoFromXml(nodes, xml)  // 使用真实XML计算行号
  return nodes
}

function _loopNode(domNode, path, pid, nodes) {
  for (let i = 0; i < domNode.childNodes.length; i++) {
    const child = domNode.childNodes[i]
    if (child.nodeType === Node.COMMENT_NODE) {
      nodes.push({ id: ++_nodeIdCounter, pid, text: '##comment##',
        attributes: { name: '##comment##', path: path + '/##comment##', lineno: 0, attrval: '{}' } })
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const name = child.nodeName
    const childPath = path + '/' + name
    const attrObj = {}
    for (let a = 0; a < child.attributes.length; a++) {
      attrObj[child.attributes[a].name] = child.attributes[a].value
    }
    let textContent = ''
    if (child.children.length === 0) textContent = (child.textContent || '').trim().substring(0, 30)
    const nodeId = ++_nodeIdCounter
    nodes.push({ id: nodeId, pid, text: name,
      attributes: { name, path: childPath, lineno: 0, attrval: JSON.stringify(attrObj), textContent } })
    _loopNode(child, childPath, nodeId, nodes)
  }
}

/**
 * 从XML字符串计算真实行号（修复版）
 * 通过深度优先遍历XML行，匹配节点顺序
 * lineno表示相对于dmodule的行号（dmodule=1）
 */
function _calcLinenoFromXml(nodes, xml) {
  const lines = xml.split('\n')

  // 找到dmodule（或根元素）所在行作为基准
  let dmLineIdx = 0
  const rootName = nodes[0] ? nodes[0].text : 'dmodule'
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.match(new RegExp(`^<${rootName}[\\s>/]`))) {
      dmLineIdx = i
      break
    }
  }

  let nodeIdx = 0 // 当前要匹配的节点索引
  const stack = [] // 标签栈，用于跟踪深度

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    const trimmed = line.trim()

    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('<!--')) continue

    // 匹配开始标签: <tagname 或 <tagname> 或 <tagname/>（TAG支持中文元素名）
    const openMatch = trimmed.match(new RegExp('^<(' + TAG + ')[\\s/>]'))
    if (openMatch) {
      const tagName = openMatch[1]

      // 检查是否匹配当前节点
      if (nodeIdx < nodes.length && nodes[nodeIdx].text === tagName) {
        // 计算相对于dmodule的行号
        nodes[nodeIdx].attributes.lineno = lineIdx - dmLineIdx + 1
        nodeIdx++
      }

      // 如果不是自闭合标签，入栈
      if (!trimmed.endsWith('/>')) {
        stack.push(tagName)
      }
      continue
    }

    // 匹配闭合标签: </tagname>（TAG支持中文元素名）
    const closeMatch = trimmed.match(new RegExp('^</(' + TAG + ')>'))
    if (closeMatch) {
      const tagName = closeMatch[1]
      // 出栈
      if (stack.length > 0 && stack[stack.length - 1] === tagName) {
        stack.pop()
      }
      continue
    }
  }

  // 检查是否所有节点都找到了行号
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].attributes.lineno === 0) {
      _calcLineno([nodes[i]]) // 使用旧逻辑填充
    }
  }
}

/** 行号推算（旧版，已废弃，保留作为fallback） */
function _calcLineno(nodes) {
  let lineno = 1
  nodes[0] && (nodes[0].attributes.lineno = lineno)
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i]
    const depth = (n.attributes.path.match(/\//g) || []).length - 1
    const prevDepth = (nodes[i - 1].attributes.path.match(/\//g) || []).length - 1
    if (depth < prevDepth) lineno += (prevDepth - depth)
    lineno++
    n.attributes.lineno = lineno
  }
}

/**
 * 按编辑器行反查节点（§8.2 getnodeBylineno）
 * 增强版：支持双行元素的闭合标签行
 * @param {Array} nodeList - 节点列表
 * @param {Number} editorLine - 编辑器行号（1-based）
 * @param {Number} linenoOffset - dmodule起始行偏移
 * @param {Object} cm - CodeMirror实例（可选，用于检查闭合标签）
 * @returns {Object|null} 匹配的节点
 */
export function getnodeBylineno(nodeList, editorLine, linenoOffset, cm = null) {
  const target = editorLine - linenoOffset + 1

  // 1. 首先尝试精确匹配开始标签行
  const exactMatch = nodeList.find(n => n.attributes && n.attributes.lineno === target)
  if (exactMatch) return exactMatch

  // 2. 如果没有精确匹配，且提供了cm实例，检查是否是闭合标签行
  if (cm) {
    const lineContent = cm.getLine(editorLine - 1) // CodeMirror使用0-based行号
    if (lineContent) {
      const trimmed = lineContent.trim()
      // 检查是否是闭合标签 </tagname>（TAG支持中文元素名）
      const closeTagMatch = trimmed.match(new RegExp('^</(' + TAG + ')>$'))
      if (closeTagMatch) {
        const tagName = closeTagMatch[1]
        // 向上查找最近的开始标签行
        for (let i = editorLine - 2; i >= 0; i--) {
          const prevLine = cm.getLine(i)
          if (prevLine && new RegExp('^<' + tagName + '[\\s>/]').test(prevLine.trim())) {
            // 找到对应的开始标签行，查找该行的节点
            const openTagLine = i + 1 // 转为1-based
            const openTarget = openTagLine - linenoOffset + 1
            const node = nodeList.find(n => n.attributes && n.attributes.lineno === openTarget)
            if (node && node.text === tagName) {
              return node
            }
          }
        }
      }
    }
  }

  // 3. 如果仍然没有找到，返回null
  return null
}

/** 动态 linenoOffset（§8.2 CONFIRMED：扫描 <dmodule> 所在 1-indexed 行） */
export function getLinenoOffset(cm) {
  const total = cm.lineCount()
  for (let i = 0; i < total; i++) {
    const line = cm.getLine(i) || ''
    if (/^\s*<dmodule[\s>]/.test(line) || /^\s*<数据模块[\s>]/.test(line)) return i + 1
  }
  return 1
}

/** 从 from 行起找 <elename> 所在行（0-indexed），找不到返回 -1（§50.6） */
export function findLineno(cm, elename, from = 0) {
  const total = cm.lineCount()
  for (let i = from; i < total; i++) {
    const l = cm.getLine(i) || ''
    if (l.includes('<' + elename + '>') || l.includes('<' + elename + ' ')) return i
  }
  return -1
}

/** XML 2 空格格式化（§14.4 等价） */
export function formatXml(xml, indent = 2) {
  let out = '', depth = 0
  const pad = ' '.repeat(indent)
  const lines = _splitGluedTags(xml).map(l => l.trim()).filter(l => l)
  for (const line of lines) {
    if (line.startsWith('<?') || line.startsWith('<!')) { out += line + '\n'; continue }
    const isClose = /^<\//.test(line)
    const isSelf = /\/>$/.test(line)
    // 内联叶子元素（同行含闭合标签，如 <techName>x</techName>）不应递增缩进层级
    const hasInlineClose = /<\//.test(line)
    const isOpen = /^<[^/!?]/.test(line) && !isSelf && !isClose && !hasInlineClose
    if (isClose && depth > 0) depth--
    out += pad.repeat(depth) + line + '\n'
    if (isOpen) depth++
  }
  return out
}

/**
 * 拆分同行粘连的标签（Bug2/6）：把 `<content><refs></refs>` 拆成独立行，供 formatXml 缩进。
 * - 回车补全把 <refs></refs> 插在父元素同行，旧 formatXml 只按 \n 拆行无法分开 → 元素不换行。
 * - 仅在「> 紧跟另一个标签的 <」处断行；`<title>文本</title>` 因中间有文本不被拆，内联叶子保持一行。
 * - prologue(<?...?>) / DOCTYPE(<!...) 行原样保留，不注入换行，避免破坏内部实体子集。
 */
function _splitGluedTags(xml) {
  const result = []
  xml.split('\n').forEach(line => {
    const t = line.trim()
    if (!t) return
    // prologue / DOCTYPE 原样保留；无 >< 粘连的行（含内联文本 <t>x</t>）也原样保留
    if (t.startsWith('<?') || t.startsWith('<!') || !/></.test(t)) { result.push(t); return }
    // 分词为「标签 | 文本」序列，逐 token 独占一行；但把紧邻的空元素对 <name></name> 合并回一行
    // （文本/mixed 元素需保持 <para></para> 单行，光标才能落在中间输入文本）。
    const tokens = t.match(/<[^>]+>|[^<]+/g) || [t]
    const closeNameOf = s => (s && (s.match(/^<\/([^\s>]+)>$/) || [])[1])
    let i = 0
    while (i < tokens.length) {
      const tok = tokens[i]
      // 开标签名：<name> 或 <name attr..>，排除自闭合(/>)、闭合(</)、声明(<?/<!)
      const openMatch = tok.match(/^<([^\s>/!?]+)[^>]*>$/)
      const openName  = (openMatch && !tok.endsWith('/>')) ? openMatch[1] : undefined
      const t1 = tokens[i + 1], t2 = tokens[i + 2]
      if (openName && closeNameOf(t1) === openName) {
        result.push(tok + t1)          // <name></name> 空元素合并单行
        i += 2
      } else if (openName && t1 && t1.charAt(0) !== '<' && closeNameOf(t2) === openName) {
        result.push(tok + t1 + t2)     // <name>文本</name> 文本叶子合并单行（光标可落中间）
        i += 3
      } else {
        result.push(tok)               // 其余（开/闭/自闭合/文本）各自独占一行
        i++
      }
    }
  })
  return result
}

/** 从根标签截起（去掉 <?xml?>/<!DOCTYPE> 前缀，§17.2） */
export function extractRootContent(xml, rootTag = 'dmodule') {
  const idx = xml.indexOf('<' + rootTag)
  return idx >= 0 ? xml.substring(idx) : xml
}

/** 构建 antd a-tree treeData */
export function buildAntTreeData(nodeList) {
  const map = {}
  nodeList.forEach(n => { map[n.id] = { key: String(n.id), title: n.text, children: [], _node: n } })
  const roots = []
  nodeList.forEach(n => {
    if (n.pid === -1 || n.pid == null) { roots.push(map[n.id]); return }
    if (map[n.pid]) map[n.pid].children.push(map[n.id])
  })
  return roots
}

/** 按 antd key 找节点 */
export function findNodeByKey(nodeList, key) {
  return nodeList.find(n => String(n.id) === String(key)) || null
}

/** 构建中文 cnNodeList（§7.5） */
export function buildCnNodeList(nodeList, en2cnElem) {
  return nodeList.map(n => {
    const cnName = (en2cnElem || {})[n.text] || n.text
    return { ...n, text: cnName, attributes: { ...n.attributes, name: cnName } }
  })
}
