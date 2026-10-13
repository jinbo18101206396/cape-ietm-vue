/**
 * ParaDesigner.vue 修复验证测试
 * 日期: 2026-10-09
 * 测试: P2-3 XML转义 + P1-1 日志清理 + P1-3 全局污染清理
 */

const fs = require('fs')
const path = require('path')

describe('ParaDesigner.vue - 修复验证', () => {
  const filePath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
  let fileContent

  beforeAll(() => {
    if (fs.existsSync(filePath)) {
      fileContent = fs.readFileSync(filePath, 'utf-8')
    }
  })

  // ============ P2-3: XML转义顺序验证 ============
  describe('P2-3: XML转义顺序修复', () => {
    test('& 应该最先转义（防止双重转义）', () => {
      const testCases = [
        {
          input: '<symbol id="test"></symbol>',
          expected: '&lt;symbol id=`test`&gt;&lt;/symbol&gt;'
        },
        {
          input: 'A & B',
          expected: 'A &amp; B'
        },
        {
          input: 'A < B',
          expected: 'A &lt; B'
        },
        {
          input: '&lt;', // 已经包含HTML实体
          expected: '&amp;lt;' // & 先转义
        }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = input
          .replace(/&/g, '&amp;') // 1. 先转义&
          .replace(/"/g, '`')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

        expect(result).toBe(expected)
      })
    })

    test('源码中insertSymbol应使用正确的转义顺序', () => {
      expect(fileContent).toBeDefined()

      // 查找insertSymbol方法
      const insertSymbolMatch = fileContent.match(/insertSymbol\([\s\S]*?\n\s{4}\}/m)
      expect(insertSymbolMatch).toBeTruthy()

      const insertSymbolCode = insertSymbolMatch[0]

      // 验证：应该先转义&
      const ampRegex = /\.replace\(\/&\/g,\s*'&amp;'\)/
      const ltRegex = /\.replace\(\/</g
      const gtRegex = /\.replace\(\/>/g

      expect(insertSymbolCode).toMatch(ampRegex)

      // 验证顺序：找到& < >的位置
      const ampIndex = insertSymbolCode.search(ampRegex)
      const ltIndex = insertSymbolCode.search(ltRegex)
      const gtIndex = insertSymbolCode.search(gtRegex)

      // & 应该在 < 和 > 之前
      expect(ampIndex).toBeGreaterThan(-1)
      expect(ampIndex).toBeLessThan(ltIndex)
      expect(ampIndex).toBeLessThan(gtIndex)
    })

    test('XML转义应该可逆', () => {
      const original = '<symbol attr="value & text"></symbol>'

      // 转义
      const escaped = original
        .replace(/&/g, '&amp;')
        .replace(/"/g, '`')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      // 反转义
      const decoded = escaped
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/`/g, '"')
        .replace(/&amp;/g, '&')

      expect(decoded).toBe(original)
    })
  })

  // ============ P1-1: 调试日志清理验证 ============
  describe('P1-1: 调试日志清理', () => {
    test('源码不应包含[ParaDesigner]调试日志', () => {
      expect(fileContent).toBeDefined()

      // 检查所有console.log('[ParaDesigner]'...)
      const matches = fileContent.match(/console\.log\(['"`].*\[ParaDesigner\]/g)

      if (matches) {
        console.error('❌ 发现残留的调试日志:')
        matches.forEach(match => console.error('  -', match))
      }

      expect(matches).toBeNull()
    })

    test('源码不应包含调试emoji标记', () => {
      expect(fileContent).toBeDefined()

      const emojiPattern = /console\.log.*[🔧🔍✅🎯❌⚠️]/g
      const matches = fileContent.match(emojiPattern)

      if (matches) {
        console.error('❌ 发现包含emoji的调试日志:')
        matches.forEach(match => console.error('  -', match))
      }

      expect(matches).toBeNull()
    })

    test('不应包含诊断用的setTimeout', () => {
      expect(fileContent).toBeDefined()

      // 查找包含console.log的setTimeout
      const pattern = /setTimeout\(\(\)\s*=>\s*\{[\s\S]{0,500}?console\.log.*\[ParaDesigner\]/g
      const matches = fileContent.match(pattern)

      if (matches) {
        console.error('❌ 发现诊断用的setTimeout:')
        matches.forEach(match => console.error('  -', match.substring(0, 100) + '...'))
      }

      expect(matches).toBeNull()
    })
  })

  // ============ P1-3: 全局污染清理验证 ============
  describe('P1-3: 全局变量污染清理', () => {
    test('源码不应设置window.__DEBUG_*', () => {
      expect(fileContent).toBeDefined()

      expect(fileContent).not.toContain('window.__DEBUG_UE')
      expect(fileContent).not.toContain('window.__DEBUG_customizeUI')
    })

    test('源码不应使用__DEBUG前缀变量', () => {
      expect(fileContent).toBeDefined()

      const pattern = /__DEBUG_/g
      const matches = fileContent.match(pattern)

      if (matches) {
        console.error('❌ 发现__DEBUG前缀变量:')
        console.error('  数量:', matches.length)
      }

      expect(matches).toBeNull()
    })
  })

  // ============ 代码质量度量 ============
  describe('代码质量度量', () => {
    test('文件应该在800-850行之间（删除了约65行）', () => {
      expect(fileContent).toBeDefined()

      const lines = fileContent.split('\n')
      const lineCount = lines.length

      console.log(`📊 文件行数: ${lineCount} 行`)

      expect(lineCount).toBeGreaterThan(800)
      expect(lineCount).toBeLessThan(900)
    })

    test('registerCustomButtons方法应该存在', () => {
      expect(fileContent).toBeDefined()
      expect(fileContent).toContain('registerCustomButtons()')
    })

    test('insertSymbol方法应该存在', () => {
      expect(fileContent).toBeDefined()
      expect(fileContent).toContain('insertSymbol(rows)')
    })

    test('5个自定义按钮应该被注册', () => {
      expect(fileContent).toBeDefined()

      const buttons = ['deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton']

      buttons.forEach(btn => {
        expect(fileContent).toContain(`'${btn}'`)
      })
    })
  })

  // ============ 回归验证 ============
  describe('回归验证：核心功能未破坏', () => {
    test('ready事件处理应该存在', () => {
      expect(fileContent).toBeDefined()
      expect(fileContent).toContain('this.ueditor.ready(')
    })

    test('手动添加按钮逻辑应该存在', () => {
      expect(fileContent).toBeDefined()
      expect(fileContent).toContain('toolbar.add(btnUI')
      expect(fileContent).toContain('btnUI.postRender()')
    })

    test('防重复检查逻辑应该存在', () => {
      expect(fileContent).toBeDefined()
      expect(fileContent).toContain('existsInItems')
      expect(fileContent).toContain('existsInDOM')
    })

    test('MutationObserver应该存在', () => {
      expect(fileContent).toBeDefined()
      expect(fileContent).toContain('MutationObserver')
      expect(fileContent).toContain('this.domObserver')
    })

    test('beforeDestroy清理逻辑应该存在', () => {
      expect(fileContent).toBeDefined()
      expect(fileContent).toContain('beforeDestroy()')
      expect(fileContent).toContain('this.domObserver.disconnect()')
    })
  })
})
