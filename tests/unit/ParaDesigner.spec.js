/**
 * ParaDesigner 组件单元测试
 * 测试问题2修复：replaceRange参数正确性
 */

import { mount, createLocalVue } from '@vue/test-utils'
import ParaDesigner from '@/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue'
import { para2html, html2para } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter'

const localVue = createLocalVue()

// Mock UEditor
global.UE = {
  getEditor: jest.fn(() => ({
    ready: jest.fn(callback => callback()),
    setContent: jest.fn(),
    getContent: jest.fn(() => '<p>测试内容</p>'),
    setDisabled: jest.fn(),
    destroy: jest.fn(),
    removeListener: jest.fn(),
    execCommand: jest.fn()
  }))
}

describe('ParaDesigner.vue - 问题2修复测试', () => {
  let wrapper
  let mockEditor

  beforeEach(() => {
    // Mock CodeMirror editor
    mockEditor = {
      getLine: jest.fn((lineNo) => {
        const lines = [
          '<title>标题</title>',
          '<para id="p1">第一段</para>',
          '<para id="p2">',
          '  第二段内容',
          '</para>',
          '<para id="p3">第三段</para>'
        ]
        return lines[lineNo] || ''
      }),
      lineCount: jest.fn(() => 6),
      getRange: jest.fn(() => '<para id="p2">\n  第二段内容\n</para>'),
      replaceRange: jest.fn()
    }

    wrapper = mount(ParaDesigner, {
      localVue,
      propsData: {
        lineno: 2,
        pflag: '',
        ifedit: '1',
        simple: '0',
        save: '1',
        editor: mockEditor,
        locale: 'en',
        cmnodeid: 'test-node-id',
        projectParameters: '{"originator":[{"code":"TEST"}],"rpc":[{"code1":"RPC"}]}',
        uniqueid: '00001',
        dmCode: 'DMC-TEST-A-00-00-00-00A-001A-A',
        nodeList: []
      },
      mocks: {
        $http: {
          post: jest.fn(() => Promise.resolve({
            data: { success: true, result: { start: 1 } }
          }))
        },
        $message: {
          success: jest.fn(),
          error: jest.fn()
        }
      },
      provide: {
        getLocaleName: (name) => name,
        toEnXml: (xml) => xml,
        toCnXml: (xml) => xml,
        formateXml: (xml, indent) => xml
      }
    })

    // 设置组件状态
    wrapper.vm.ueditor = global.UE.getEditor()
    wrapper.vm.ueditorReady = true
    wrapper.vm.paraId = 'p2'
    wrapper.vm.lineno = 2
    wrapper.vm.endline = 4
  })

  afterEach(() => {
    wrapper.destroy()
  })

  describe('核心修复：replaceRange参数', () => {
    it('TC-U01: 应使用正确的replaceRange参数（精确到行尾）', async () => {
      // 模拟保存操作
      await wrapper.vm.handleSave()

      // 等待异步操作完成
      await wrapper.vm.$nextTick()

      // 验证replaceRange被调用
      expect(mockEditor.replaceRange).toHaveBeenCalled()

      // 获取调用参数
      const callArgs = mockEditor.replaceRange.mock.calls[0]
      const [xml, from, to] = callArgs

      // ✅ 验证from参数
      expect(from).toEqual({ line: 2, ch: 0 })

      // ✅ 验证to参数：应该是endline行尾，而不是endline+1行首
      expect(to.line).toBe(4) // endline = 4
      expect(to.ch).toBe(mockEditor.getLine(4).length) // 行尾字符位置

      // ❌ 确保不是错误的参数
      expect(to).not.toEqual({ line: 5, ch: 0 }) // 不应该是endline+1
    })

    it('TC-U02: 应正确计算endline行的长度', async () => {
      const endline = 4
      const lineContent = mockEditor.getLine(endline)

      expect(lineContent).toBe('</para>')
      expect(lineContent.length).toBe(7)

      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      const callArgs = mockEditor.replaceRange.mock.calls[0]
      const [, , to] = callArgs

      expect(to.ch).toBe(7) // '</para>'.length
    })

    it('TC-U03: 边界测试 - para是最后一行', async () => {
      // 模拟para是文档最后一个元素
      wrapper.vm.lineno = 5
      wrapper.vm.endline = 5
      mockEditor.getLine.mockReturnValue('<para id="last">最后段落</para>')
      mockEditor.lineCount.mockReturnValue(6)

      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      const callArgs = mockEditor.replaceRange.mock.calls[0]
      const [, from, to] = callArgs

      expect(from).toEqual({ line: 5, ch: 0 })
      expect(to.line).toBe(5)
      expect(to.ch).toBe('<para id="last">最后段落</para>'.length)
    })

    it('TC-U04: 边界测试 - 空行para', async () => {
      wrapper.vm.lineno = 2
      wrapper.vm.endline = 2
      mockEditor.getLine.mockReturnValue('<para id="empty"></para>')

      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      const callArgs = mockEditor.replaceRange.mock.calls[0]
      const [, from, to] = callArgs

      expect(from).toEqual({ line: 2, ch: 0 })
      expect(to).toEqual({ line: 2, ch: '<para id="empty"></para>'.length })
    })
  })

  describe('数据完整性验证', () => {
    it('TC-U05: 不应删除endline后的内容', async () => {
      // 模拟完整的XML结构
      const mockLines = [
        '<title>标题</title>',
        '<para id="p1">第一段</para>',
        '<para id="p2">第二段</para>',
        '<para id="p3">第三段</para>',
        '<section><title>章节</title></section>'
      ]

      mockEditor.getLine.mockImplementation(i => mockLines[i] || '')
      mockEditor.lineCount.mockReturnValue(5)

      wrapper.vm.lineno = 2
      wrapper.vm.endline = 2

      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      const callArgs = mockEditor.replaceRange.mock.calls[0]
      const [, from, to] = callArgs

      // 验证替换范围只包含para#p2这一行
      expect(from.line).toBe(2)
      expect(to.line).toBe(2)

      // 验证不会影响第3行（para#p3）
      expect(to.line).toBeLessThan(3)
    })

    it('TC-U06: 多行para应正确替换整个范围', async () => {
      const mockLines = [
        '<para id="multi">',
        '  第一行',
        '  第二行',
        '  第三行',
        '</para>',
        '<para id="next">下一段</para>'
      ]

      mockEditor.getLine.mockImplementation(i => mockLines[i] || '')
      mockEditor.getRange.mockReturnValue(mockLines.slice(0, 5).join('\n'))

      wrapper.vm.lineno = 0
      wrapper.vm.endline = 4

      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      const callArgs = mockEditor.replaceRange.mock.calls[0]
      const [, from, to] = callArgs

      // 应该从第0行开头到第4行结尾
      expect(from).toEqual({ line: 0, ch: 0 })
      expect(to).toEqual({ line: 4, ch: '</para>'.length })

      // 不应该影响第5行
      expect(to.line).toBeLessThan(5)
    })
  })

  describe('保存流程完整性', () => {
    it('TC-U07: 保存成功后应触发save事件', async () => {
      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      // 验证触发了save事件
      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save').length).toBe(1)
    })

    it('TC-U08: 保存成功后应触发refresh事件', async () => {
      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      // 验证触发了refresh事件，并传递了lineno参数
      expect(wrapper.emitted('refresh')).toBeTruthy()
      expect(wrapper.emitted('refresh')[0]).toEqual([2])
    })

    it('TC-U09: 保存过程中应显示loading状态', async () => {
      const savePromise = wrapper.vm.handleSave()

      // 保存中
      expect(wrapper.vm.saving).toBe(true)

      await savePromise
      await wrapper.vm.$nextTick()

      // 保存完成
      expect(wrapper.vm.saving).toBe(false)
    })

    it('TC-U10: 保存成功应显示成功消息', async () => {
      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.$message.success).toHaveBeenCalledWith('保存成功')
    })
  })

  describe('异常处理', () => {
    it('TC-U11: 转换失败应显示错误消息', async () => {
      // 模拟html2para抛出错误
      wrapper.vm.ueditor.getContent = jest.fn(() => {
        throw new Error('转换失败')
      })

      await wrapper.vm.handleSave()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.$message.error).toHaveBeenCalled()
      expect(wrapper.vm.saving).toBe(false)
    })

    it('TC-U12: 防止重复提交', async () => {
      wrapper.vm.saving = true

      await wrapper.vm.handleSave()

      // 不应该调用replaceRange
      expect(mockEditor.replaceRange).not.toHaveBeenCalled()
    })
  })

  describe('Props验证', () => {
    it('TC-U13: lineno属性应正确传递', () => {
      expect(wrapper.vm.lineno).toBe(2)
    })

    it('TC-U14: editor属性应正确传递', () => {
      expect(wrapper.vm.editor).toBe(mockEditor)
      expect(wrapper.vm.editor.getLine).toBeDefined()
    })

    it('TC-U15: readonly模式应禁用编辑', async () => {
      await wrapper.setProps({ ifedit: '0' })
      expect(wrapper.vm.readonly).toBe(true)
    })
  })
})

describe('ParaDesigner.vue - 问题3相关测试', () => {
  it('TC-U16: 应正确emit save事件供父组件处理', async () => {
    const mockEditor = {
      getLine: jest.fn(() => '<para id="test">内容</para>'),
      lineCount: jest.fn(() => 2),
      getRange: jest.fn(() => '<para id="test">内容</para>'),
      replaceRange: jest.fn()
    }

    const wrapper = mount(ParaDesigner, {
      localVue,
      propsData: {
        lineno: 0,
        editor: mockEditor,
        locale: 'en',
        cmnodeid: 'test',
        projectParameters: '{}',
        uniqueid: '00001',
        dmCode: 'DMC-TEST',
        nodeList: []
      },
      mocks: {
        $http: {
          post: jest.fn(() => Promise.resolve({ data: { success: true, result: { start: 1 } } }))
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
    wrapper.vm.endline = 0

    await wrapper.vm.handleSave()
    await wrapper.vm.$nextTick()

    // 父组件应该能接收到save事件并执行视图切换
    expect(wrapper.emitted('save')).toBeTruthy()

    wrapper.destroy()
  })
})
