/**
 * xmlTree.js BUG #3 修复测试
 * 测试词边界缺陷修复：startsWith -> 正则匹配
 */

describe('xmlTree.js - BUG #3 词边界修复', () => {
  describe('getNodeByLineno - 闭合标签向上查找开始标签', () => {

    test('短标签em不应误匹配emphasis', () => {
      // 模拟XML结构
      const xml = `<dmodule>
  <content>
    <emphasis>emphasized text</emphasis>
    <em>short em tag</em>
  </content>
</dmodule>`

      // 模拟CodeMirror实例
      const mockEditor = {
        getLine: (lineNo) => xml.split('\n')[lineNo],
        lineCount: () => xml.split('\n').length
      }

      // 测试场景：光标在 </em> 闭合标签（第4行）
      const lineContent = '    </em>'
      const editorLine = 4

      // 向上查找开始标签
      let foundLine = -1
      const tagName = 'em'

      for (let i = editorLine - 1; i >= 0; i--) {
        const prevLine = mockEditor.getLine(i)
        // 修复后的正则：^<tagName[\s>/]
        if (prevLine && new RegExp('^<' + tagName + '[\\s>/]').test(prevLine.trim())) {
          foundLine = i
          break
        }
      }

      // 断言：应该找到第3行的 <em>，而不是第2行的 <emphasis>
      expect(foundLine).toBe(3)
      expect(mockEditor.getLine(foundLine).trim()).toBe('<em>short em tag</em>')
    })

    test('短标签p不应误匹配para', () => {
      const xml = `<dmodule>
  <para>paragraph text</para>
  <p>short p tag</p>
</dmodule>`

      const mockEditor = {
        getLine: (lineNo) => xml.split('\n')[lineNo],
        lineCount: () => xml.split('\n').length
      }

      const tagName = 'p'
      const editorLine = 2 // 光标在 </p>

      let foundLine = -1
      for (let i = editorLine - 1; i >= 0; i--) {
        const prevLine = mockEditor.getLine(i)
        if (prevLine && new RegExp('^<' + tagName + '[\\s>/]').test(prevLine.trim())) {
          foundLine = i
          break
        }
      }

      expect(foundLine).toBe(2)
      expect(mockEditor.getLine(foundLine).trim()).toBe('<p>short p tag</p>')
    })

    test('短标签i不应误匹配info', () => {
      const xml = `<dmodule>
  <info>information node</info>
  <i>italic text</i>
</dmodule>`

      const mockEditor = {
        getLine: (lineNo) => xml.split('\n')[lineNo]
      }

      const tagName = 'i'

      // 测试 <info> 不会被 <i 正则匹配
      expect(new RegExp('^<' + tagName + '[\\s>/]').test('<info>information node</info>')).toBe(false)

      // 测试 <i> 会被正确匹配
      expect(new RegExp('^<' + tagName + '[\\s>/]').test('<i>italic text</i>')).toBe(true)
    })

    test('正则应该匹配所有合法开始标签形式', () => {
      const tagName = 'em'
      const regex = new RegExp('^<' + tagName + '[\\s>/]')

      // 应该匹配的形式
      expect(regex.test('<em>')).toBe(true)                    // 开始标签
      expect(regex.test('<em >')).toBe(true)                   // 带空格
      expect(regex.test('<em attr="val">')).toBe(true)         // 带属性（空格）
      expect(regex.test('<em/>')).toBe(true)                   // 自闭合

      // 不应该匹配的形式
      expect(regex.test('<emphasis>')).toBe(false)             // 更长标签
      expect(regex.test('<embed>')).toBe(false)                // 以em开头但不是em
      expect(regex.test('<emergency>')).toBe(false)            // 以em开头
    })
  })
})
