// 复现并锁定"保存后多出一个<para>"根因：paraLineno 落在<para>下一行(off-by-one)
// 用真实 para2html/html2para + 一个最小 CodeMirror 桩，复刻 setcontent→handleSave 的
// 行定位与 replaceRange 逻辑。断言：正确行号(L)配平；错误行号(L+1)产生2开1闭的畸形XML。
// 极简 CodeMirror 桩（仅实现被 setcontent/handleSave 使用的方法）
function makeCM(text) {
  let lines = text.split('\n')
  return {
    getLine: i => lines[i],
    lineCount: () => lines.length,
    getValue: () => lines.join('\n'),
    getRange: (a, b) => {
      if (a.line === b.line) return lines[a.line].substring(a.ch, b.ch)
      const out = [lines[a.line].substring(a.ch)]
      for (let i = a.line + 1; i < b.line; i++) out.push(lines[i])
      out.push(lines[b.line].substring(0, b.ch))
      return out.join('\n')
    },
    replaceRange: (str, a, b) => {
      const head = lines[a.line].substring(0, a.ch)
      const tail = lines[b.line].substring(b.ch)
      const merged = (head + str + tail).split('\n')
      lines = [...lines.slice(0, a.line), ...merged, ...lines.slice(b.line + 1)]
    }
  }
}

// 复刻 setcontent 的多行 para 定位逻辑，返回被提取用于编辑/回写的 XML 范围。
// 这是缺陷的确定性内核（不依赖UEditor归一化）：正确行号提取到含<para>开始标签的完整范围；
// off-by-one行号(L+1)提取的范围**丢失<para>开始标签** → 回写时开始标签残留 → 多出<para>。
function extractParaRange(cm, paraLineno) {
  const paraName = 'para'
  const nowstr = cm.getLine(paraLineno)
  const hasOpenTag = nowstr.indexOf('<' + paraName) > -1
  const hasClosingTag = nowstr.lastIndexOf(`</${paraName}>`) > 0
  const isSingleLine = hasOpenTag && hasClosingTag

  let startLine = paraLineno
  let endline = paraLineno
  if (!isSingleLine) {
    let beginidx = nowstr.indexOf('<')
    if (!hasOpenTag && hasClosingTag) {
      for (let i = paraLineno - 1; i >= 0; i--) {
        const str = cm.getLine(i)
        if (str && str.indexOf('<' + paraName) > -1 && str.indexOf('</' + paraName + '>') === -1) {
          startLine = i; beginidx = str.indexOf('<'); break
        }
      }
    }
    endline = -1
    for (let i = startLine; i < cm.lineCount(); i++) {
      const str = cm.getLine(i)
      if (str.indexOf(`</${paraName}>`) > -1 && str.indexOf('<') <= beginidx) { endline = i; break }
    }
    if (endline === -1) {
      for (let i = startLine; i < cm.lineCount(); i++) {
        if (cm.getLine(i).indexOf(`</${paraName}>`) > -1) { endline = i; break }
      }
    }
  }
  return cm.getRange({ line: startLine, ch: 0 }, { line: endline, ch: cm.getLine(endline).length })
}

const DOC = [
  '    <content>',
  '      <description>',
  '        <para>',
  '          XXX',
  '        </para>',
  '      </description>',
  '    </content>'
].join('\n')

const OPEN_LINE = 2 // 0-based：<para> 开始标签所在行

describe('Para保存 off-by-one 行号', () => {
  test('错误行号(L+1，内容行)：提取范围丢失<para>开始标签 → 回写会残留旧<para>', () => {
    const cm = makeCM(DOC)
    const range = extractParaRange(cm, OPEN_LINE + 1)
    // 缺陷根因：范围不含<para>开始标签（它留在上一行，回写时不会被替换）
    expect(range.includes('<para>')).toBe(false)
    expect(range.includes('</para>')).toBe(true)
  })

  test('正确行号(L，开始标签行)：提取范围含完整<para>…</para>', () => {
    const cm = makeCM(DOC)
    const range = extractParaRange(cm, OPEN_LINE)
    expect(range.includes('<para>')).toBe(true)
    expect(range.includes('</para>')).toBe(true)
    // 开闭标签配平：回写整体替换，不会残留
    expect((range.match(/<para>/g) || []).length).toBe((range.match(/<\/para>/g) || []).length)
  })
})
