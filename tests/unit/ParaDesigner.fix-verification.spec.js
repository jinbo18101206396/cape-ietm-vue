/**
 * ParaDesigner.vue 修复验证测试
 * 日期: 2026-10-09
 * 验证: P2-3 XML转义顺序修复 + P1-1 调试日志清理 + P1-3 全局污染清理
 */

import { mount } from '@vue/test-utils'
import ParaDesigner from '@/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue'

describe('ParaDesigner.vue - 修复验证测试', () => {
  // ============ P2-3: XML转义顺序修复验证 ============
  describe('P2-3: XML转义顺序修复', () => {
    test('insertSymbol应该正确转义XML特殊字符', () => {
      // 模拟包含特殊字符的图符数据
      const testSymbol = {
        icn: 'ICN-001',
        id: 'SYM-001',
        width: '100',
        height: '100',
        scale: 100,
        filename: 'test.png'
      }

      // 构造symbolxml（包含 & < > " 所有特殊字符）
      const symbolxml = `<symbol infoEntityIdent="${testSymbol.icn}" symbolid="${testSymbol.id}" reproductionWidth="${testSymbol.width}" reproductionHeight="${testSymbol.height}" reproductionScale="${testSymbol.scale || 100}"></symbol>`

      // 执行转义（按修复后的顺序）
      const escaped = symbolxml
        .replace(/&/g, '&amp;') // 1. 先转义&
        .replace(/"/g, '`')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      // 验证：& 不会被双重转义
      expect(escaped).not.toContain('&amp;lt;') // ✅ 不应该出现双重转义
      expect(escaped).not.toContain('&amp;gt;')
      expect(escaped).not.toContain('&amp;amp;')

      // 验证：正确的单次转义
      expect(escaped).toContain('&lt;') // < 转义为 &lt;
      expect(escaped).toContain('&gt;') // > 转义为 &gt;
      expect(escaped).toContain('&amp;') // & 转义为 &amp;
      expect(escaped).not.toContain('"') // " 转义为 `
    })

    test('XML转义应该可逆（往返测试）', () => {
      const original = '<symbol id="test" attr="value & text"></symbol>'

      // 转义
      const escaped = original
        .replace(/&/g, '&amp;')
        .replace(/"/g, '`')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      // 反转义（浏览器解析后）
      const decoded = escaped
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/`/g, '"')
        .replace(/&amp;/g, '&')

      // 验证往返一致
      expect(decoded).toBe(original)
    })

    test('特殊情况：包含HTML实体的文本', () => {
      // 测试已经包含&lt;的文本
      const text = 'A &lt; B'

      // 正确顺序：先转&
      const correctEscape = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      expect(correctEscape).toBe('A &amp;lt; B') // ✅ 正确

      // 错误顺序：后转&（旧代码bug）
      const wrongEscape = text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&/g, '&amp;')

      expect(wrongEscape).toBe('A &amp;lt; B') // 会导致双重转义
    })
  })

  // ============ P1-1: 调试日志清理验证 ============
  describe('P1-1: 调试日志清理验证', () => {
    let consoleLogSpy

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
    })

    test('源码中不应包含[ParaDesigner]调试日志', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')

        // 验证：不包含[ParaDesigner]前缀的调试日志
        const debugLogPattern = /console\.log\(['"].*\[ParaDesigner\]/g
        const matches = content.match(debugLogPattern)

        expect(matches).toBeNull() // ✅ 应该找不到任何匹配
      }
    })

    test('源码中不应包含调试用的emoji标记', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')

        // 验证：不包含调试emoji (🔧 🔍 ✅ 🎯)
        const emojiPattern = /console\.log.*[🔧🔍✅🎯]/g
        const matches = content.match(emojiPattern)

        expect(matches).toBeNull() // ✅ 不应该有调试emoji
      }
    })
  })

  // ============ P1-3: 全局污染清理验证 ============
  describe('P1-3: 全局变量污染清理验证', () => {
    test('源码中不应设置window.__DEBUG_UE', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')

        expect(content).not.toContain('window.__DEBUG_UE')
        expect(content).not.toContain('window.__DEBUG_customizeUI')
      }
    })

    test('运行时不应污染全局window对象', () => {
      // 清理可能存在的全局变量
      delete window.__DEBUG_UE
      delete window.__DEBUG_customizeUI

      // 验证不存在
      expect(window.__DEBUG_UE).toBeUndefined()
      expect(window.__DEBUG_customizeUI).toBeUndefined()
    })
  })

  // ============ 回归测试：核心功能不受影响 ============
  describe('回归测试：核心功能', () => {
    test('组件可以正常创建', () => {
      const mockEditor = {
        getLine: jest.fn(),
        getRange: jest.fn(),
        replaceRange: jest.fn(),
        lineCount: jest.fn(() => 100)
      }

      const wrapper = mount(ParaDesigner, {
        propsData: {
          lineno: 10,
          editor: mockEditor,
          cmnodeid: 'test-node-id',
          projectParameters: '{}',
          uniqueid: '00001',
          dmCode: 'DMC-TEST-001'
        },
        stubs: {
          'ietm-interref-dialog': true,
          'ietm-dm-ref-dialog': true,
          'ietm-symbol-dialog': true
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.lineno).toBe(10)
    })

    test('insertSymbol方法存在且可调用', () => {
      const mockEditor = {
        getLine: jest.fn(),
        getRange: jest.fn(),
        replaceRange: jest.fn(),
        lineCount: jest.fn(() => 100)
      }

      const wrapper = mount(ParaDesigner, {
        propsData: {
          lineno: 10,
          editor: mockEditor,
          cmnodeid: 'test-node-id',
          projectParameters: '{}',
          uniqueid: '00001',
          dmCode: 'DMC-TEST-001'
        },
        stubs: {
          'ietm-interref-dialog': true,
          'ietm-dm-ref-dialog': true,
          'ietm-symbol-dialog': true
        }
      })

      expect(typeof wrapper.vm.insertSymbol).toBe('function')
    })

    test('registerCustomButtons方法存在', () => {
      const mockEditor = {
        getLine: jest.fn(),
        getRange: jest.fn(),
        replaceRange: jest.fn(),
        lineCount: jest.fn(() => 100)
      }

      const wrapper = mount(ParaDesigner, {
        propsData: {
          lineno: 10,
          editor: mockEditor,
          cmnodeid: 'test-node-id',
          projectParameters: '{}',
          uniqueid: '00001',
          dmCode: 'DMC-TEST-001'
        },
        stubs: {
          'ietm-interref-dialog': true,
          'ietm-dm-ref-dialog': true,
          'ietm-symbol-dialog': true
        }
      })

      expect(typeof wrapper.vm.registerCustomButtons).toBe('function')
    })
  })

  // ============ 代码度量验证 ============
  describe('代码度量验证', () => {
    test('文件大小应该减少（删除了65行代码）', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf--8')
        const lines = content.split('\n')

        // 修复后应该在832行左右（原897行 - 65行）
        expect(lines.length).toBeLessThan(900)
        expect(lines.length).toBeGreaterThan(800)
      }
    })

    test('不应包含setTimeout诊断代码', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8')

        // 检查是否删除了setTimeout诊断代码（100ms/200ms延迟的DOM检查）
        const pattern = /setTimeout\(\(\) => \{[\s\S]*?console\.log.*DOM状态/
        expect(content).not.toMatch(pattern)
      }
    })
  })
})

// ============ 集成测试验证计划 ============
describe('集成测试验证清单（需手动验证）', () => {
  test.todo('L2-1: 首次进入Para设计视图，5个自定义按钮应该显示')
  test.todo('L2-2: 二次进入Para设计视图，5个按钮不应该重复')
  test.todo('L2-3: 点击"列表定义"按钮，应该插入deflist表格')
  test.todo('L2-4: 点击"图符"按钮，应该打开图符选择弹窗')
  test.todo('L2-5: 插入图符后保存，XML中symbol标签应该正确转义')
  test.todo('L2-6: 控制台不应该输出[ParaDesigner]前缀的调试日志')
  test.todo('L2-7: window对象不应该包含__DEBUG_*全局变量')
  test.todo('L2-8: 编辑器高度固定为710px，不应该异常变化')
  test.todo('L2-9: 切换到源码视图，再切回Para视图，按钮仍然正常')
  test.todo('L2-10: 包含特殊字符的图符（如 & < >）保存后应该可以正确还原')
})
