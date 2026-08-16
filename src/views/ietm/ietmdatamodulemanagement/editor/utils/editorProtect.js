// editor/utils/editorProtect.js
// 对标 legacy IetmEditorUtils-src.js 编辑期保护（需求 §50 CONFIRMED）

/**
 * 全量原子化：遍历所有行对开/闭标签 markText({atomic:true})（§50.2）。
 */
export function editorAtomic(cm) {
  cm.doc.getAllMarks().forEach(m => { if (m.atomic) m.clear() })
  const total = cm.lineCount()
  for (let i = 0; i < total; i++) lineAtomic(cm, i)
}

/**
 * 单行原子化（§50.2）：对开标签 <...> 和闭合标签 </...> markText。
 */
export function lineAtomic(cm, lineNo) {
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

/**
 * 键盘事件保护（§50.3 keydown，绑定到 cm 实例）。
 * getNodeList / getLinenoOffset / getSchema 均为 getter 函数（响应式取最新值）。
 */
export function editorKeyEvent(cm, getNodeList, getLinenoOffset, getSchema) {
  cm.on('keydown', (editor, e) => {
    const code = e.keyCode
    const ctrl = e.ctrlKey

    // 规则2：Ctrl / 功能键 / 导航键直接放行
    if (ctrl || code === 27 || (code >= 33 && code <= 40) || code === 9) return
    // 规则3：回车拦截（换行由元素插入负责）
    if (code === 13) { e.preventDefault(); return }

    const cursor = editor.getCursor()
    const linenoOffset = getLinenoOffset ? getLinenoOffset() : 1

    // 规则4：prologue（<?xml?>/<!DOCTYPE>）及 <dmodule> 起始行只读。
    // linenoOffset 为 <dmodule> 的 1-indexed 行号，其 0-indexed 行 = linenoOffset-1；
    // cursor.line 为 0-indexed，故 cursor.line <= linenoOffset-1 即 < linenoOffset 时落在该区域。
    // 注意：identAndStatusSection 位于 <dmodule> 之后，此处不拦截（仅由 _foldIdentSection 折叠）。
    if (cursor.line < linenoOffset) { _block(editor, e); return }

    const lineContent = editor.getLine(cursor.line) || ''
    // content / 内容 行只读
    if (/\s*<content[\s>]/.test(lineContent) || /\s*<内容[\s>]/.test(lineContent)) {
      _block(editor, e); return
    }

    // 规则5：光标在标签名区（token type === tag），非导航键拦截
    const token = editor.getTokenAt(cursor)
    const isNav = code >= 37 && code <= 40
    if (!isNav && token.type === 'tag') { _block(editor, e); return }

    // 规则6：结构符区（=、/>）拦截。
    // 注意：'>' 不在此处拦截 —— '>' 的 token.type 是 'tag bracket'，
    // 需求§50.3 行11明确"tok.type 为 null 或 tag bracket → 放行"（元素文本区入口）；
    // 且规则5 已保护 '>' 左侧的 tag-name 位置，拦截 '>' 本身属过度拦截，
    // 会导致 hint 补全插入 <elem></elem> 后光标落在 >< 边界处仍无法输入文本。
    if (!isNav && (token.string === '=' || token.string === '/>')) {
      _block(editor, e); return
    }

    // 规则7：非导航/删除/空格时，检查文本可编辑性（mixed/string）
    if (!isNav && code !== 8 && code !== 46 && code !== 32) {
      const schema = getSchema ? getSchema() : {}
      const parent = _findParentTagName(editor, cursor.line)
      if (parent) {
        const def = schema[parent]
        const elemName = _currentElemName(editor, cursor)
        const setem = def && def.setelem && elemName ? def.setelem[elemName] : null
        if (setem && setem.mixed !== 'true' && setem.typnam !== 'string') {
          _block(editor, e)
          return
        }
      }
    }
  })
  // TODO(二期)：粘贴/剪切/拖拽保护（§50.4 beforeChange/cut/dragstart）
}

function _block(editor, e) {
  e.preventDefault()
  e.stopPropagation()
}

// 元素名字符类：须支持中文（GJB6600 元素名如 说明/内容）。\w 不匹配中文，
// 会导致 rule7 找不到父元素而跳过文本可编辑性校验（保护失效）。
const TAG = '[A-Za-z_\\u4e00-\\u9fff][\\w.\\-\\u4e00-\\u9fff]*'

function _findParentTagName(cm, lineNo) {
  for (let i = lineNo; i >= 0; i--) {
    const l = cm.getLine(i) || ''
    const m = l.match(new RegExp('^\\s*<(' + TAG + ')[\\s>]'))
    if (m && !l.trim().startsWith('</')) return m[1]
  }
  return null
}

function _currentElemName(cm, cursor) {
  const l = cm.getLine(cursor.line) || ''
  const m = l.match(new RegExp('^\\s*<(' + TAG + ')[\\s>]'))
  return m ? m[1] : null
}
