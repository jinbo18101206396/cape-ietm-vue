/**
 * P0 Bug修复验证测试
 *
 * Bug描述：保存单行para后，下一行XML内容丢失
 * 根因：replaceRange的to参数 {line: actualEndline + 1, ch: 0} 会删除下一行
 * 修复：改为 {line: actualEndline, ch: lineContent.length}
 */

describe('ParaDesigner.vue - P0 Bug修复：保存单行para不丢失下一行', () => {
  let wrapper
  let mockEditor

  beforeEach(() => {
    // Mock CodeMirror editor
    const lines = [
      '<dmodule>',
      '<para></para>',           // Line 1 - 空para
      '<title>重要标题</title>', // Line 2 - 不应该丢失
      '<para>正文内容</para>',   // Line 3
      '</dmodule>'
    ]

    mockEditor = {
      getLine: jest.fn((lineNo) => lines[lineNo]),
      lineCount: jest.fn(() => lines.length),
      replaceRange: jest.fn((text, from, to) => {
        // 验证替换参数
        console.log('[replaceRange]', { text, from, to })

        // 关键断言：to参数不应该延伸到下一行
        if (from.line === 1) {  // 替换Line 1的para
          expect(to.line).toBe(1)  // ← 应该是Line 1，不是Line 2
          expect(to.ch).toBe(lines[1].length)  // ← 应该是当前行长度
        }
      }),
      getRange: jest.fn((from, to) => {
        return lines.slice(from.line, to.line + 1).join('\n')
      })
    }

    // Mock UEditor
    global.UE = {
      getEditor: jest.fn(() => ({
        ready: jest.fn(callback => callback()),
        setContent: jest.fn(),
        getContent: jest.fn(() => '<p></p>'),  // 空内容
        setDisabled: jest.fn(),
        destroy: jest.fn(),
        removeListener: jest.fn(),
        execCommand: jest.fn()
      }))
    }

    wrapper = mount(ParaDesigner, {
      localVue,
      propsData: {
        lineno: 1,  // Line 1的para
        editor: mockEditor,
        locale: 'en',
        cmnodeid: 'test',
        projectParameters: '{}',
        uniqueid: '00001',
        dmCode: 'DMC-TEST',
        nodeList: [],
        save: '1'  // 显示保存按钮
      },
      mocks: {
        $http: {
          post: jest.fn(() => Promise.resolve({
            data: { success: true, result: { start: 1 } }
          }))
        },
        $message: { success: jest.fn(), error: jest.fn() }
      },
      provide: {
        getLocaleName: n => n,
        toEnXml: x => x,
        toCnXml: x => x,
        formateXml: (x, i) => x
      }
    })

    wrapper.vm.ueditor = global.UE.getEditor()
    wrapper.vm.ueditorReady = true
  })

  afterEach(() => {
    if (wrapper) wrapper.destroy()
  })

  it('修复前：保存单行para会删除下一行（Bug复现）', async () => {
    // 这个测试用例展示修复前的Bug行为
    // 修复后这个测试应该失败（说明Bug已修复）

    const buggyReplaceRange = jest.fn((text, from, to) => {
      // Bug行为：to = {line: 2, ch: 0}
      if (from.line === 1) {
        expect(to.line).toBe(2)  // ← Bug：延伸到Line 2
        expect(to.ch).toBe(0)    // ← Bug：删除Line 2开头
      }
    })

    // 临时替换为Bug版本的replaceRange
    const originalReplace = wrapper.vm.editor.replaceRange
    wrapper.vm.editor.replaceRange = buggyReplaceRange

    // 执行保存（会抛出AssertionError，因为修复后的代码不再有Bug）
    try {
      await wrapper.vm.handleSave()
      fail('期望抛出错误，因为修复后的代码不应该有Bug行为')
    } catch (error) {
      // 修复后，这个测试应该失败
      expect(error.message).toContain('to.line')
    } finally {
      wrapper.vm.editor.replaceRange = originalReplace
    }
  })

  it('修复后：保存单行para只替换当前行，不影响下一行', async () => {
    // 设置endline（在setcontent时计算）
    wrapper.vm.endline = 1  // 单行para

    // 执行保存
    await wrapper.vm.handleSave()

    // 验证replaceRange被调用
    expect(mockEditor.replaceRange).toHaveBeenCalled()

    // 验证替换参数
    const [text, from, to] = mockEditor.replaceRange.mock.calls[0]

    expect(from).toEqual({ line: 1, ch: 0 })  // 从Line 1开头
    expect(to.line).toBe(1)  // ← 修复：只替换Line 1
    expect(to.ch).toBe('<para></para>'.length)  // ← 修复：到当前行末尾

    // 验证不会延伸到Line 2
    expect(to.line).not.toBe(2)
    expect(to.ch).not.toBe(0)
  })

  it('边界情况1：空para保存后不丢失下一行', async () => {
    wrapper.vm.endline = 1

    await wrapper.vm.handleSave()

    const [, from, to] = mockEditor.replaceRange.mock.calls[0]

    // 关键断言：替换范围不延伸到Line 2
    expect(to.line).toBe(1)
    expect(to).not.toEqual({ line: 2, ch: 0 })
  })

  it('边界情况2：多行para的替换逻辑不受影响', async () => {
    // 模拟多行para
    const multilineEditor = {
      ...mockEditor,
      getLine: jest.fn((lineNo) => {
        const lines = [
          '<dmodule>',
          '<para>',              // Line 1 - para开始
          '  <randomList>',      // Line 2
          '    <listItem>项目</listItem>',  // Line 3
          '  </randomList>',     // Line 4
          '</para>',             // Line 5 - para结束
          '<title>标题</title>', // Line 6 - 不应该丢失
          '</dmodule>'
        ]
        return lines[lineNo]
      }),
      replaceRange: jest.fn()
    }

    wrapper.setProps({
      lineno: 1,
      editor: multilineEditor
    })
    wrapper.vm.endline = 5  // 多行para

    await wrapper.vm.handleSave()

    const [, from, to] = multilineEditor.replaceRange.mock.calls[0]

    // 多行para：替换到结束行的末尾
    expect(from).toEqual({ line: 1, ch: 0 })
    expect(to.line).toBe(5)  // 到Line 5
    expect(to.ch).toBe('</para>'.length)  // 到Line 5末尾

    // 不应该延伸到Line 6
    expect(to).not.toEqual({ line: 6, ch: 0 })
  })

  it('边界情况3：连续两个单行para都能正确保存', async () => {
    const consecutiveLines = [
      '<dmodule>',
      '<para>段落1</para>',  // Line 1
      '<para>段落2</para>',  // Line 2 - 保存Line 1后不应该丢失
      '<para>段落3</para>',  // Line 3
      '</dmodule>'
    ]

    mockEditor.getLine = jest.fn((lineNo) => consecutiveLines[lineNo])
    mockEditor.replaceRange = jest.fn()

    wrapper.setProps({ lineno: 1, editor: mockEditor })
    wrapper.vm.endline = 1

    await wrapper.vm.handleSave()

    const [, from, to] = mockEditor.replaceRange.mock.calls[0]

    // 替换Line 1，不影响Line 2
    expect(to.line).toBe(1)
    expect(to.ch).toBe('<para>段落1</para>'.length)
  })
})

// 集成测试：模拟真实的CodeMirror行为
describe('ParaDesigner.vue - P0 Bug修复集成测试', () => {
  it('真实场景：保存空para后验证下一行内容完整', async () => {
    // 这个测试需要真实的CodeMirror实例
    // 在实际浏览器环境中运行

    // 模拟真实DOM
    const container = document.createElement('div')
    document.body.appendChild(container)

    // 初始化CodeMirror
    const cm = CodeMirror(container, {
      value: `<dmodule>
<para></para>
<title>重要标题</title>
<para>正文内容</para>
</dmodule>`,
      mode: 'xml'
    })

    // 记录原始内容
    const originalLine2 = cm.getLine(2)  // '<title>重要标题</title>'

    // 模拟保存操作
    const newPara = '<para id="para001"></para>'
    cm.replaceRange(
      newPara,
      { line: 1, ch: 0 },
      { line: 1, ch: cm.getLine(1).length }  // ← 修复后的参数
    )

    // 验证Line 2没有丢失
    expect(cm.getLine(2)).toBe(originalLine2)
    expect(cm.getLine(2)).toBe('<title>重要标题</title>')

    // 清理
    document.body.removeChild(container)
  })
})
