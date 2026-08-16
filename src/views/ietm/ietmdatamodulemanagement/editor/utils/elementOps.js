// editor/utils/elementOps.js
// 元素插入、删除、移动操作（§14.1-14.3）

/**
 * 计算元素插入的缩进空格数
 * @param {Object} parentNode - 父节点
 * @param {Array} nodeList - 全部节点列表
 * @returns {String} 缩进字符串（如 "  " / "    "）
 */
export function calculateIndent(parentNode, nodeList) {
  // 空值检查：如果父节点不存在，返回默认缩进
  if (!parentNode) return '  '

  // 查找父节点的层级
  let level = 0
  let current = parentNode
  while (current && current.pid !== -1 && current.pid != null) {
    level++
    current = nodeList.find(n => n.id === current.pid)
    // 防止无限循环（数据异常时）
    if (level > 50) break
  }
  // 子元素比父元素多一级缩进（2空格/级）
  return '  '.repeat(level + 1)
}

/**
 * 生成元素的XML片段
 * @param {String} elemName - 元素名（英文）
 * @param {Object} schema - schema定义
 * @param {String} indent - 缩进字符串
 * @returns {String} XML片段
 */
export function generateXmlSnippet(elemName, schema, indent) {
  const elemDef = schema[elemName]

  // 判断是否为文本类元素（mixed content model 或 xs:string）
  const isTextElem = elemDef && (elemDef.mixed === 'true' || elemDef.datatype === 'string')

  // 判断是否为自闭合元素（无子元素且无文本内容的简单类型）
  const isSelfClosing = elemDef &&
    (!elemDef.children || elemDef.children.length === 0) &&
    !isTextElem &&
    elemDef.datatype === 'string'

  if (isSelfClosing) {
    // 自闭合标签
    return `${indent}<${elemName}/>`
  } else if (isTextElem) {
    // 文本元素：<para></para> 光标置于中间
    return `${indent}<${elemName}></${elemName}>`
  } else {
    // 容器元素：换行闭合
    return `${indent}<${elemName}>\n${indent}</${elemName}>`
  }
}

/**
 * 检查元素是否为自闭合标签，如果是则展开
 * @param {Object} node - 父节点
 * @param {Object} editor - CodeMirror实例
 * @param {Number} linenoOffset - dmodule起始行偏移
 * @returns {Boolean} 是否进行了展开操作
 */
export function expandSelfClosingTag(node, editor, linenoOffset) {
  const startLine = node.attributes.lineno + linenoOffset - 2  // 转为0-based编辑器行号
  const lineText = editor.getLine(startLine)

  if (!lineText) return false

  const trimmed = lineText.trim()
  const elemName = node.text

  // 检查是否是自闭合标签 <elemName ... />
  const selfClosingMatch = trimmed.match(new RegExp(`^(\\s*)<${elemName}([^>]*)\\/>`))

  if (selfClosingMatch) {
    const indent = selfClosingMatch[1]
    const attrs = selfClosingMatch[2]

    // 展开为双标签
    const expanded = `${indent}<${elemName}${attrs}>\n${indent}</${elemName}>`

    editor.replaceRange(
      expanded,
      { line: startLine, ch: 0 },
      { line: startLine, ch: lineText.length }
    )

    return true
  }

  return false
}

/**
 * 计算元素插入位置的行号
 * @param {Object} node - 当前节点
 * @param {String} appendType - 插入类型：'child' | 'sibling'
 * @param {Array} nodeList - 全部节点列表
 * @param {Number} linenoOffset - dmodule 起始行偏移
 * @param {Number} depth - 递归深度（内部参数）
 * @param {Object} editor - CodeMirror实例（用于自闭合标签展开）
 * @returns {Number} 插入位置行号（0-based）
 */
export function calculateInsertLine(node, appendType, nodeList, linenoOffset, depth = 0, editor = null) {
  // 防止递归过深
  if (depth > 50) {
    console.warn('[calculateInsertLine] 递归深度过大，可能存在数据异常')
    return (node.attributes.lineno || 0) + linenoOffset - 1
  }

  const baseLine = node.attributes.lineno || 0
  const displayLine = baseLine + linenoOffset - 2 // 转为0-based编辑器行号

  if (appendType === 'child') {
    // 插入为子元素：先检查父元素是否为自闭合标签
    if (editor) {
      const wasExpanded = expandSelfClosingTag(node, editor, linenoOffset)
      if (wasExpanded) {
        // 展开后，插入位置在开始标签的下一行（0-based）
        return displayLine + 1
      }
    }

    // 插入为子元素：在开始标签的下一行（0-based）
    return displayLine + 1
  } else {
    // 插入为同级元素：在该元素【自身闭合标签】之后（0-based）
    // 修复：旧逻辑递归找最后子元素，会把同级元素错误插入到当前元素内部。
    // 正确做法：找到 node 自身结束行（自闭合行 or </node> 行），插入到其后。
    const endLine = findElementEndLine(node, editor, linenoOffset)
    return endLine + 1
  }
}

/**
 * 查找元素的结束行（0-based编辑器行号）
 * - 自闭合 <node/>：返回开始标签行
 * - 双标签 <node>...</node>：返回 </node> 所在行
 * @param {Object} node - 节点
 * @param {Object} editor - CodeMirror实例
 * @param {Number} linenoOffset - dmodule起始行偏移
 * @returns {Number} 结束行（0-based）
 */
export function findElementEndLine(node, editor, linenoOffset) {
  const startLine = node.attributes.lineno + linenoOffset - 2 // 0-based

  // 无 editor 时降级：返回开始行（调用方 +1 后即下一行）
  if (!editor) return startLine

  const startText = editor.getLine(startLine) || ''
  const elemName = node.text
  const closeTag = `</${elemName}>`

  // 单行自闭合或单行双标签（同行含闭合）→ 结束行即开始行
  if (startText.includes('/>') || startText.includes(closeTag)) {
    return startLine
  }

  // 向下查找匹配的闭合标签（考虑同名元素嵌套，用深度计数）
  let depth = 0
  const maxSearch = Math.min(editor.lineCount(), startLine + 500)
  for (let i = startLine; i < maxSearch; i++) {
    const line = editor.getLine(i) || ''
    // 同名开始标签（非自闭合）depth+1
    const openRe = new RegExp(`<${elemName}[\\s>]`)
    if (openRe.test(line) && !line.trim().endsWith('/>')) depth++
    if (line.includes(closeTag)) {
      depth--
      if (depth === 0) return i
    }
  }

  console.warn(`[findElementEndLine] 未找到 ${elemName} 的闭合标签，返回开始行`)
  return startLine
}

/**
 * 检查光标是否在元素的开始标签和闭合标签之间
 * @param {String} currentLineText - 当前行文本
 * @param {Object} cursorPos - 光标位置 {line, ch}
 * @returns {Boolean}
 */
export function isCursorBetweenTags(currentLineText, cursorPos) {
  const beforeCursor = currentLineText.substring(0, cursorPos.ch)
  const afterCursor = currentLineText.substring(cursorPos.ch)

  // 光标前有 >, 光标后有 <
  const hasOpenTag = beforeCursor.trim().endsWith('>')
  const hasCloseTag = afterCursor.trim().startsWith('</')

  return hasOpenTag && hasCloseTag
}

/**
 * 判断元素是否跨多行
 * @param {Object} node - 节点
 * @param {Array} nodeList - 全部节点列表
 * @param {Object} editor - CodeMirror 实例
 * @param {Number} linenoOffset - dmodule 起始行偏移
 * @returns {Boolean}
 */
export function isMultiLineElement(node, nodeList, editor, linenoOffset) {
  const startLine = node.attributes.lineno + linenoOffset - 2  // 转为0-based
  const startText = editor.getLine(startLine)

  // 检查是否为单行元素：同行包含开始和闭合标签
  const elemName = node.text
  const openTag = `<${elemName}`
  const closeTag = `</${elemName}>`

  if (startText && startText.includes(openTag) && startText.includes(closeTag)) {
    return false // 单行元素
  }

  // 检查是否有子元素
  const children = nodeList.filter(n => n.pid === node.id)
  if (children.length > 0) {
    return true // 有子元素，必定多行
  }

  // 查找闭合标签所在行（扩大搜索范围到500行）
  const totalLines = editor.lineCount()
  const maxSearch = Math.min(totalLines, startLine + 500)
  for (let i = startLine + 1; i < maxSearch; i++) {
    const line = editor.getLine(i)
    if (line && line.includes(closeTag)) {
      return i > startLine // 闭合标签不在同一行
    }
  }

  // 未找到闭合标签，按多行处理（可能是超大元素或数据异常）
  console.warn(`[isMultiLineElement] 未找到元素 ${elemName} 的闭合标签，按多行处理`)
  return true
}

/**
 * 检查是否可以删除元素
 * @param {Object} node - 要删除的节点
 * @param {Array} nodeList - 全部节点列表
 * @param {Object} editor - CodeMirror 实例
 * @param {Number} linenoOffset - dmodule 起始行偏移
 * @param {Object} schema - schema定义
 * @returns {Object} {canDelete: Boolean, message: String}
 */
export function canDeleteElement(node, nodeList, editor, linenoOffset, schema) {
  // 检查1：不能删除content声明行之前的元素
  const nodeLine = node.attributes.lineno + linenoOffset - 2  // 转为0-based
  const contentStartLine = findContentStartLine(editor)

  if (contentStartLine >= 0 && nodeLine < contentStartLine) {
    return {
      canDelete: false,
      message: '不能删除content区域之前的元素（identAndStatusSection等必需节）'
    }
  }

  // 检查2：不能删除根元素
  if (node.pid === -1 || node.pid == null) {
    return {
      canDelete: false,
      message: '不能删除根元素'
    }
  }

  // 检查3：检查父元素的必需子元素约束
  const parent = nodeList.find(n => n.id === node.pid)
  if (parent && schema) {
    const parentDef = schema[parent.text]
    if (parentDef && parentDef.setelem) {
      const elemConstraint = parentDef.setelem[node.text]
      if (elemConstraint && elemConstraint.minocc) {
        const minOcc = Number(elemConstraint.minocc)
        if (minOcc > 0) {
          // 统计同类型兄弟元素数量
          const siblings = nodeList.filter(n => n.pid === parent.id && n.text === node.text)
          if (siblings.length <= minOcc) {
            return {
              canDelete: false,
              message: `该元素是必需的（最少需要 ${minOcc} 个），不能删除`
            }
          }
        }
      }
    }
  }

  // 注：不再检查"当前光标行是否闭合标签"。
  // 删除操作针对的是树上选中的 node（node 总是指向开始标签行），
  // 与编辑器光标当前位置无关。若在此依赖 editor.getCursor()，会出现
  // "光标恰好停在某个 </xxx> 行时，右键删除其他节点被误判"的bug。

  return { canDelete: true }
}

/**
 * 查找content标签起始行
 * @param {Object} editor - CodeMirror 实例
 * @returns {Number} content起始行（0-based），未找到返回-1
 */
function findContentStartLine(editor) {
  for (let i = 0; i < editor.lineCount(); i++) {
    const line = editor.getLine(i)
    if (line && line.trim().startsWith('<content')) {
      return i
    }
  }
  return -1
}

/**
 * 删除单行元素
 * @param {Object} editor - CodeMirror 实例
 * @param {Number} lineNumber - 行号（0-based）
 */
export function deleteLine(editor, lineNumber) {
  // 严格检查editor对象
  if (!editor || typeof editor.getLine !== 'function' || typeof editor.replaceRange !== 'function') {
    throw new Error('editor对象无效或未初始化')
  }

  const lineText = editor.getLine(lineNumber)
  if (!lineText && lineText !== '') {
    throw new Error(`无法获取第${lineNumber}行内容`)
  }

  // 删除该行
  try {
    editor.replaceRange('',
      { line: lineNumber, ch: 0 },
      { line: lineNumber + 1, ch: 0 }
    )
  } catch (err) {
    throw new Error(`删除行失败: ${err.message}`)
  }

  // 智能合并：如果删除后前后两行都是标签，且可以合并，则合并
  // （此处简化实现，legacy 有更复杂的合并逻辑）

  return true
}

/**
 * 删除多行元素（整棵子树）
 * @param {Object} node - 要删除的节点
 * @param {Array} nodeList - 全部节点列表
 * @param {Object} editor - CodeMirror 实例
 * @param {Number} linenoOffset - dmodule 起始行偏移
 */
export function deleteThisAndChildren(node, nodeList, editor, linenoOffset) {
  const startLine = node.attributes.lineno + linenoOffset - 2  // 转为0-based

  // 用 findElementEndLine（带深度计数）查找【匹配的】闭合标签行。
  // 修复：旧逻辑从maxLine向下找第一个 </elem>，对同名嵌套
  // (<levelledPara><levelledPara></levelledPara></levelledPara>)
  // 会错误匹配到内层闭合标签，导致外层闭合标签残留、删除不干净。
  const endLine = findElementEndLine(node, editor, linenoOffset)

  // 删除从 startLine 到 endLine+1 的所有行
  editor.replaceRange('',
    { line: startLine, ch: 0 },
    { line: endLine + 1, ch: 0 }
  )

  return true
}

/**
 * 获取节点的所有后代
 * @param {Object} node - 节点
 * @param {Array} nodeList - 全部节点列表
 * @returns {Array} 后代节点数组
 */
export function getAllDescendants(node, nodeList) {
  const children = nodeList.filter(n => n.pid === node.id)
  const descendants = [...children]
  children.forEach(child => {
    descendants.push(...getAllDescendants(child, nodeList))
  })
  return descendants
}

/**
 * 校验移动操作的合法性
 * @param {Number} fromLine - 起始行（1-based，用户输入）
 * @param {Number} toLine - 目标行（1-based，用户输入）
 * @param {Number} contentStartLine - content区域起始行
 * @param {Number} contentEndLine - content区域结束行
 * @returns {Object} {valid: Boolean, message: String}
 */
export function validateMove(fromLine, toLine, contentStartLine, contentEndLine) {
  // 转为 0-based
  const from = fromLine - 1
  const to = toLine - 1

  // 检查范围
  if (from < contentStartLine || from >= contentEndLine) {
    return { valid: false, message: '起始行超出content范围' }
  }
  if (to < contentStartLine || to >= contentEndLine) {
    return { valid: false, message: '目标行超出content范围' }
  }

  // 检查是否移动到自身
  if (from === to) {
    return { valid: false, message: '起始行与目标行相同' }
  }

  return { valid: true }
}

/**
 * 移动元素块
 * @param {Object} fromNode - 要移动的节点
 * @param {Number} fromLine - 起始行号（1-based，用户输入）
 * @param {Number} toLine - 目标行号（1-based，用户输入）
 * @param {Array} nodeList - 全部节点列表
 * @param {Object} editor - CodeMirror 实例
 * @param {Number} linenoOffset - dmodule 起始行偏移
 */
export function moveElementBlock(fromNode, fromLine, toLine, nodeList, editor, linenoOffset) {
  // 转为0-based
  const from0 = fromLine - 1
  const to0 = toLine - 1

  // 查找元素的起止行
  const startLine = fromNode.attributes.lineno + linenoOffset - 2  // 转为0-based

  // 查找元素结束行：用 findElementEndLine（带深度计数），与 deleteThisAndChildren 一致。
  // 旧逻辑从 maxLine 向下找第一个 </elem>，对同名嵌套
  // (<levelledPara><levelledPara></levelledPara></levelledPara>)
  // 会错误匹配内层闭合标签，导致外层闭合标签残留、移动块不完整（与Bug已修的删除同源）。
  const endLine = findElementEndLine(fromNode, editor, linenoOffset)

  // 检查是否移入自身内部
  if (to0 >= startLine && to0 <= endLine) {
    throw new Error('不能将元素移入自身内部')
  }

  // 提取要移动的代码块
  const lines = []
  for (let i = startLine; i <= endLine; i++) {
    const line = editor.getLine(i)
    if (line !== undefined) {
      lines.push(line)
    }
  }
  const blockText = lines.join('\n')

  if (!blockText.trim()) {
    throw new Error('要移动的代码块为空')
  }

  // 删除原位置的代码块
  editor.replaceRange('',
    { line: startLine, ch: 0 },
    { line: endLine + 1, ch: 0 }
  )

  // 计算实际插入位置（删除后行号会变化）
  let insertLine = to0
  if (to0 > startLine) {
    // 目标在原位置之后，需要减去删除的行数
    const deletedLines = endLine - startLine + 1
    insertLine = to0 - deletedLines
  }

  // 插入到新位置
  editor.replaceRange(blockText + '\n',
    { line: insertLine, ch: 0 }
  )

  // 返回移动后元素的 0-based 真实首行，供调用方定位光标（向下移动时 != toLine-1）
  return insertLine
}
