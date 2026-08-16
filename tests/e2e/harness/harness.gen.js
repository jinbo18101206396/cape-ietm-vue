// 自动生成，请勿手改。源：build-harness.js（抽取真实源码）

window.__SRC = (function() {
const TAG = '[A-Za-z_\\u4e00-\\u9fff][\\w.\\-\\u4e00-\\u9fff]*'

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
      const openName = (openMatch && !tok.endsWith('/>')) ? openMatch[1] : undefined
      const t1 = tokens[i + 1]; const t2 = tokens[i + 2]
      if (openName && closeNameOf(t1) === openName) {
        result.push(tok + t1) // <name></name> 空元素合并单行
        i += 2
      } else if (openName && t1 && t1.charAt(0) !== '<' && closeNameOf(t2) === openName) {
        result.push(tok + t1 + t2) // <name>文本</name> 文本叶子合并单行（光标可落中间）
        i += 3
      } else {
        result.push(tok) // 其余（开/闭/自闭合/文本）各自独占一行
        i++
      }
    }
  })
  return result
}

function formatXml(xml, indent = 2) {
  let out = ''; let depth = 0
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

function getnodeBylineno(nodeList, editorLine, linenoOffset, cm = null) {
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
          if (prevLine && prevLine.trim().startsWith('<' + tagName)) {
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

function getLinenoOffset(cm) {
  const total = cm.lineCount()
  for (let i = 0; i < total; i++) {
    const line = cm.getLine(i) || ''
    if (/^\s*<dmodule[\s>]/.test(line) || /^\s*<数据模块[\s>]/.test(line)) return i + 1
  }
  return 1
}

function lineAtomic(cm, lineNo) {
  const line = cm.getLine(lineNo)
  if (!line) return
  cm.doc.findMarks({ line: lineNo, ch: 0 }, { line: lineNo, ch: line.length })
    .forEach(m => { if (m.atomic) m.clear() })
  const openStart = line.indexOf('<')
  const openEnd = line.indexOf('>')
  if (openStart >= 0 && openEnd > openStart) {
    cm.doc.markText(
      { line: lineNo, ch: openStart },
      { line: lineNo, ch: openEnd + 1 },
      { atomic: true }
    )
  }
  // 同行内的独立闭合标签（如 <elem>text</elem> 的末尾部分）
  const closeIdx = line.indexOf('</')
  if (closeIdx >= 0 && closeIdx !== openStart) {
    const closeEnd = line.lastIndexOf('>')
    if (closeEnd > closeIdx) {
      cm.doc.markText(
        { line: lineNo, ch: closeIdx },
        { line: lineNo, ch: closeEnd + 1 },
        { atomic: true }
      )
    }
  }
}

function _writeAttr(line, name, val) {
  // 属性名转义为正则字面量；匹配前加 (^|\s) 词边界，避免属性名互为子串时误match
  // （如属性 id 落在 validid 内部）。helper 内联，保证纯函数可被单测独立抽取。
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // XML 属性值转义：值含 " & < > 时不转义会生成非法 XML，refreshTree 的 DOMParser 会解析失败
  const escVal = v => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const en = esc(name)
  const exists = new RegExp('(^|\\s)' + en + '\\s*=\\s*"[^"]*"')
  if (exists.test(line)) {
    if (val === '' || val == null) { return line.replace(new RegExp('(^|\\s)' + en + '\\s*=\\s*"[^"]*"'), '') }
    // 用函数式替换，避免 val 中的 $1/$& 被当作替换模式展开
    return line.replace(new RegExp('(^|\\s)(' + en + ')(\\s*=\\s*")([^"]*)(")'),
      (m, g1, g2, g3) => g1 + g2 + g3 + escVal(val) + '"')
  }
  if (val !== '' && val != null) {
    const attrStr = ' ' + name + '="' + escVal(val) + '"'
    // 自闭合标签 <tag/>：插到 /> 之前，避免命中 /> 里的 '>' 产生 <tag/ attr="v">（Bug3）
    if (/\/>\s*$/.test(line)) return line.replace(/\/>(\s*)$/, (m, tail) => attrStr + '/>' + tail)
    // 函数式替换，避免 val 中的 $ 序列展开
    return line.replace('>', () => attrStr + '>')
  }
  return line
}

function _allowedChildSet(cm, nodeList, linenoOffset, schema) {
  if (!nodeList || !linenoOffset || !schema) return null
  const cursor = cm.getCursor()
  const parent = getnodeBylineno(nodeList, cursor.line + 1, linenoOffset, cm)
  if (!parent) return null
  const def = schema[parent.text]
  if (!def || !def.children) return null
  const setelem = def.setelem || {}
  const choiceMembers = def.children.filter(cc => setelem[cc] && setelem[cc].ifchoice === 'true')
  const choiceOccupied = choiceMembers.length > 0 &&
    nodeList.some(n => n.pid === parent.id && choiceMembers.includes(n.text))
  const set = new Set()
  def.children.forEach(c => {
    const occ = setelem[c]
    if (occ) {
      const max = occ.maxocc
      if (max && max !== String(Number.MAX_SAFE_INTEGER) && max !== '9223372036854775807') {
        const exist = nodeList.filter(n => n.pid === parent.id && n.text === c).length
        if (exist >= Number(max)) return
      }
      if (occ.ifchoice === 'true' && choiceOccupied) {
        const cExists = nodeList.some(n => n.pid === parent.id && n.text === c)
        if (!cExists) return
      }
    }
    set.add(c)
  })
  return set
}

function _elementHint(cm, options, ctx = {}) {
  const schemaInfo = (options && options.schemaInfo) ||
    ((cm.getOption('hintOptions') || {}).schemaInfo) || {}
  const inner = CodeMirror.hint.xml(cm, Object.assign({}, options, { schemaInfo }))
  if (!inner || !inner.list || !inner.list.length) return inner

  const { nodeList, linenoOffset, schema, onPick } = ctx
  // 与东区一致的可插入子元素过滤（Bug1）：定位光标所在父节点，套用 maxocc + ifchoice 约束。
  const allowed = _allowedChildSet(cm, nodeList, linenoOffset, schema)

  inner.list = inner.list
    .filter(item => {
      const s = typeof item === 'string' ? item : (item.displayText || item.text || '')
      if (s.charAt(0) !== '<') return true // 属性名/值补全：放行
      if (s.charAt(1) === '/') return false // 过滤父级闭合标签候选 </parent>（Bug1）
      // allowed 为 null 表示无法判定父节点（如中文态 schema 键不匹配）→ 不额外过滤，避免误删
      if (!allowed) return true
      return allowed.has(s.slice(1)) // 仅保留东区认可的子元素（maxocc/ifchoice 已达上限则剔除）
    })
    .map(item => {
      if (item.charAt(0) !== '<') return item // 属性补全原样放行
      const name = item.slice(1) // 去掉前导 '<'
      const open = '<' + name + '>'; const close = '</' + name + '>'
      return {
        displayText: item, // 列表仍显示 <name（与原生一致，用户可辨识）
        text: open + close, // completeSingle 等回退路径也能拿到完整文本
        hint(editor, data) {
          editor.replaceRange(open + close, data.from, data.to)
          // 光标落到 >< 之间，便于继续输文本或触发子元素补全
          editor.setCursor({ line: data.from.line, ch: data.from.ch + open.length })
          // 新标签重新原子化（开/闭标签只读，中间文本可编辑）
          lineAtomic(editor, data.from.line)
          if (typeof onPick === 'function') onPick() // 触发格式化+刷新树（Bug2/6/7）
        }
      }
    })
  return inner
}

return { TAG, formatXml, getnodeBylineno, getLinenoOffset, lineAtomic, _writeAttr, _allowedChildSet, _elementHint }
})()
