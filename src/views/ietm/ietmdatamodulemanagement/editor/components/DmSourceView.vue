<template>
  <div class="dm-source-view"><textarea ref="textarea"></textarea></div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/xml/xml.js'
import 'codemirror/addon/fold/foldgutter.js'
import 'codemirror/addon/fold/foldgutter.css'
import 'codemirror/addon/fold/xml-fold.js'
import 'codemirror/addon/edit/matchtags.js'
import 'codemirror/addon/hint/show-hint.js'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/hint/xml-hint.js'
import 'codemirror/addon/search/search.js'
import 'codemirror/addon/search/searchcursor.js'
import 'codemirror/addon/dialog/dialog.js'
import 'codemirror/addon/dialog/dialog.css'
import 'codemirror/addon/selection/active-line.js'

import { getLinenoOffset, findLineno, getnodeBylineno, formatXml } from '../utils/xmlTree'
import { editorAtomic, editorKeyEvent, lineAtomic } from '../utils/editorProtect'

export default {
  name: 'DmSourceView',
  props: {
    value:    { type: String,  default: '' },
    schema:   { type: Object,  default: () => ({}) },
    theme:    { type: String,  default: 'idea' },
    readonly: { type: Boolean, default: false }
  },
  data() {
    return {
      cm: null,
      nodeList: [],
      linenoOffset: 1,
      fontSize: 14
    }
  },
  mounted() {
    const cm = this.cm = CodeMirror.fromTextArea(this.$refs.textarea, {
      mode: 'xml',
      theme: this.theme,
      lineNumbers: true,
      lineWrapping: true,
      styleActiveLine: true,
      matchTags: { bothTags: true },
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'dmGutter'],
      hintOptions: { schemaInfo: this.schema || {} },
      extraKeys: {
        'Ctrl-S': () => this.$parent && this.$parent.doSave && this.$parent.doSave(),
        'Ctrl-Z': () => cm.undo(),
        'Ctrl-D': () => this.$parent && this.$parent.doDeleteElement && this.$parent.doDeleteElement(),
        'Ctrl-Q': () => cm.execCommand('toggleFold'),
        // 回车弹提示不放这里：keydown(editorProtect 规则3) 会 preventDefault 拦回车，
        // 导致 extraKeys.Enter 永不触发。按需求 §50.3 改到 keyup 上（见下方 cm.on('keyup')）。
        '/':      c => this._completeIfNeeded(c),
        'Space':  c => this._completeIfNeeded(c),
        '=':      c => this._completeIfNeeded(c)
      },
      readOnly: this.readonly
    })
    cm.setSize('100%', '100%')

    cm.on('change', () => {
      this.$emit('content-change', cm.getValue())
      lineAtomic(cm, cm.getCursor().line)
    })
    cm.on('cursorActivity', () => {
      const cursor = cm.getCursor()
      lineAtomic(cm, cursor.line)
      this.$emit('cursor-change', { line: cursor.line + 1, col: cursor.ch + 1 })
      if (cm.getOption('noevent') === '1') { cm.setOption('noevent', null); return }
      // 传入cm实例以支持双行元素闭合标签的识别
      const node = getnodeBylineno(this.nodeList, cursor.line + 1, this.linenoOffset, cm)
      if (node) this.$emit('cursor-node', node)
    })

    // 回车弹子元素提示（§50.3：keydown 拦回车不换行，keyup 弹提示分工）。
    // keydown 里的 preventDefault 不影响 keyup 触发，故提示逻辑必须放这里。
    cm.on('keyup', (editor, e) => {
      if (e.keyCode === 13) this._completeIfNeeded(editor)
    })

    editorKeyEvent(cm,
      () => this.nodeList,
      () => this.linenoOffset,
      () => this.schema
    )

    if (this.value) this.setValue(this.value)
  },
  beforeDestroy() { if (this.cm) this.cm.toTextArea() },

  methods: {
    setValue(val) { this.cm.setValue(val || '') },
    getValue()    { return this.cm.getValue() },

    /** 格式化 → 重算 linenoOffset → 全量原子化 → 折叠 identSection */
    formateDM() {
      const raw = this.cm.getValue()
      const formatted = formatXml(raw, 2)
      this.cm.setValue(formatted)
      this.linenoOffset = getLinenoOffset(this.cm)
      editorAtomic(this.cm)
      this._foldIdentSection()
      this.$emit('content-change', formatted)
    },

    setNodeList(nodes)  { this.nodeList = nodes },
    setHintSchema(s)    { this.cm.setOption('hintOptions', { schemaInfo: s || {} }) },
    setReadOnly(v)      { this.cm.setOption('readOnly', v) },
    setTheme(t)         { this.cm.setOption('theme', t) },

    /** 按树节点行号定位（§7.2） */
    locateNode(node) {
      if (!node || node.attributes == null) return
      const lineno = node.attributes.lineno
      if (lineno == null) return
      const line = Math.max(0, lineno + this.linenoOffset - 2)
      this.cm.setOption('noevent', '1')
      this.cm.setCursor({ line, ch: 0 })
      this.cm.scrollIntoView({ line, ch: 0 }, 100)
    },

    /** 校验错误行号定位（§17.4）
     *  入参 lineno 为对话框显示行号（1-based，已由 doValidate 换算 = 后端行号 - 1 + linenoOffset）。
     *  0-based 行索引 = lineno - 1；取列与落点用同一行（修正 §17.4 源码取下一行的偏移隐患）：
     *  光标置于标签名首字符（'<' 后第 1 个字符），即 begintagidx + 1。 */
    locateByLineno(lineno) {
      const line = Math.max(0, lineno - 1)
      const text = this.cm.getLine(line) || ''
      const begintagidx = text.indexOf('<')
      // §17.4 原意为光标落标签名首字符；但本版有 §50.2 原子标签保护
      // （<...> 被 markText atomic 标记），光标无法进入标签内部，只能落在标签左边缘。
      // 故落到 '<' 处（begintagidx）；不置 noevent，保留 cursorActivity 树联动刷新属性面板（§17.4 预期）。
      const ch = begintagidx >= 0 ? begintagidx : 0
      this.cm.setCursor({ line, ch })
      this.cm.scrollIntoView({ line, ch }, 100)
    },

    /** 属性写回（§13.2） */
    setProperty(lineno, attrName, attrVal) {
      const editorLine = Math.max(0, lineno + this.linenoOffset - 2)
      const content = this.cm.getLine(editorLine)
      if (content == null) return
      let tagLine = editorLine
      if (/^\s*<\//.test(content)) {
        // 元素名须支持中文（GJB6600 如 </说明>）；\w+ 不匹配中文会导致向上找不到开始标签行
        const m = content.match(/<\/([A-Za-z_一-鿿][\w.\-一-鿿]*)/)
        if (m) {
          for (let i = editorLine - 1; i >= 0; i--) {
            const prevLine = this.cm.getLine(i)
            if (prevLine && prevLine.includes('<' + m[1])) { tagLine = i; break }
          }
        }
      }
      const lineContent = this.cm.getLine(tagLine)
      if (lineContent == null) return
      const replaced = _writeAttr(lineContent, attrName, attrVal)
      if (replaced !== lineContent) {
        this.cm.replaceRange(replaced,
          { line: tagLine, ch: 0 },
          { line: tagLine, ch: lineContent.length })
        this.$emit('content-change', this.cm.getValue())
      }
    },

    foldCurrent() { this.cm.execCommand('toggleFold') },
    find()        { this.cm.execCommand('find') },
    undo()        { this.cm.undo() },
    redo()        { this.cm.redo() },
    // 清空撤销/重做历史：加载与语言切换完成后调用，避免撤销退回到初始空文档（§Bug5）
    clearHistory(){ this.cm && this.cm.clearHistory() },
    fontDelta(d)  {
      this.fontSize = Math.max(10, this.fontSize + d)
      this.$el.querySelectorAll('.CodeMirror').forEach(el => { el.style.fontSize = this.fontSize + 'px' })
      this.cm.refresh()
    },

    // 暴露给父组件的方法
    getEditor()        { return this.cm },
    getLinenoOffset()  { return this.linenoOffset },

    _foldIdentSection() {
      const n = findLineno(this.cm, 'identAndStatusSection')
      if (n >= 0) this.cm.foldCode({ line: n, ch: 0 })
    },
    _completeIfNeeded(c) {
      if (c.getOption('readOnly')) return
      setTimeout(() => {
        if (c.state.completionActive) return
        // onPick：选中子元素插入后，格式化+通知父组件刷新树，使回车补全与双击插入一致（§14.1）。
        // 直接把回调交给候选项的 hint()（见 _elementHint），避免旧写法监听 completionActive
        // 时的竞态（showHint 后 on('pick') 注册时机不稳，导致格式化从不触发 → Bug2/6/7）。
        const onPick = () => {
          setTimeout(() => {
            this.formateDM()                // 拆开与父元素同行的粘连标签并重排缩进
            this.$emit('element-inserted')  // 通知父组件刷新树
          }, 0)
        }
        c.showHint({
          hint: (cm, opts) => _elementHint(cm, opts, {
            nodeList: this.nodeList,
            linenoOffset: this.linenoOffset,
            schema: this.schema,
            onPick
          }),
          completeSingle: false
        })
      }, 100)
    }
  }
}

/**
 * 基于 stock CodeMirror.hint.xml，但把「插入 <name 片段」改为「插入完整 <name></name>，
 * 光标置于 >< 之间」（需求 §14.1）。原生片段会被 editorProtect 规则5/6 卡成不可编辑死胡同，
 * 故补全须一次性产出结构完整、可续编辑的元素。
 */
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
      if (s.charAt(0) !== '<') return true          // 属性名/值补全：放行
      if (s.charAt(1) === '/') return false          // 过滤父级闭合标签候选 </parent>（Bug1）
      // allowed 为 null 表示无法判定父节点（如中文态 schema 键不匹配）→ 不额外过滤，避免误删
      if (!allowed) return true
      return allowed.has(s.slice(1))                 // 仅保留东区认可的子元素（maxocc/ifchoice 已达上限则剔除）
    })
    .map(item => {
      if (item.charAt(0) !== '<') return item        // 属性补全原样放行
      const name = item.slice(1)                     // 去掉前导 '<'
      const open = '<' + name + '>', close = '</' + name + '>'
      return {
        displayText: item,                           // 列表仍显示 <name（与原生一致，用户可辨识）
        text: open + close,                          // completeSingle 等回退路径也能拿到完整文本
        hint(editor, data) {
          editor.replaceRange(open + close, data.from, data.to)
          // 光标落到 >< 之间，便于继续输文本或触发子元素补全
          editor.setCursor({ line: data.from.line, ch: data.from.ch + open.length })
          // 新标签重新原子化（开/闭标签只读，中间文本可编辑）
          lineAtomic(editor, data.from.line)
          if (typeof onPick === 'function') onPick()  // 触发格式化+刷新树（Bug2/6/7）
        }
      }
    })
  return inner
}

/**
 * 计算光标所在父元素的可插入子元素集合（英文名），逻辑与 schemaDriver.getAddableChildren 对齐。
 * 返回 Set<string>；无法判定父节点或 schema 未命中时返回 null（调用方不做额外过滤）。
 */
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

/** 属性写回核心（§13.2 四分支） */
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
    if (val === '' || val == null)
      return line.replace(new RegExp('(^|\\s)' + en + '\\s*=\\s*"[^"]*"'), '')
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
</script>
<style lang="less" scoped>
.dm-source-view { flex: 1; min-height: 0; }
/deep/ .CodeMirror { height: 100%; font-family: 'Consolas', monospace; font-size: 14px; }
/deep/ .CodeMirror-gutters { border-right: 1px solid #ddd; }
/deep/ .dmGutter { width: 18px; cursor: pointer; }
</style>
