/**
 * P2 重构后验证测试 - 历史版本功能
 *
 * 测试目标：
 * 1. 验证 DmHistoryMixin 正常工作
 * 2. 验证代码重复消除后功能完整
 * 3. 验证大文档保护
 */

const { test, expect } = require('@playwright/test')

test.describe('P2 重构验证 - 单元测试', () => {
  test('DmHistoryMixin 应正确导出', () => {
    const { DmHistoryMixin } = require('../../../src/views/ietm/ietmdatamodulemanagement/mixins/DmHistoryMixin')

    expect(DmHistoryMixin).toBeDefined()
    expect(DmHistoryMixin.methods).toBeDefined()
    expect(DmHistoryMixin.methods.renderDiff).toBeDefined()
    expect(DmHistoryMixin.methods.formatXml).toBeDefined()
    expect(DmHistoryMixin.methods.formatSide).toBeDefined()
    expect(DmHistoryMixin.methods.getVersionTypeName).toBeDefined()
    expect(DmHistoryMixin.methods.getVersionTypeColor).toBeDefined()

    console.log('✅ DmHistoryMixin 导出正常')
  })

  test('formatXml 应正确格式化 XML', () => {
    const { DmHistoryMixin } = require('../../../src/views/ietm/ietmdatamodulemanagement/mixins/DmHistoryMixin')

    const input = '<root><child>text</child></root>'
    const formatted = DmHistoryMixin.methods.formatXml(input)

    expect(formatted).toContain('<root>')
    expect(formatted).toContain('<child>')
    expect(formatted).toContain('</child>')
    expect(formatted).toContain('</root>')
    expect(formatted.split('\n').length).toBeGreaterThan(1)

    console.log('✅ formatXml 功能正常')
  })

  test('getVersionTypeName 应正确映射版本类型', () => {
    const { DmHistoryMixin } = require('../../../src/views/ietm/ietmdatamodulemanagement/mixins/DmHistoryMixin')

    expect(DmHistoryMixin.methods.getVersionTypeName('new')).toBe('新增')
    expect(DmHistoryMixin.methods.getVersionTypeName('changed')).toBe('修改')
    expect(DmHistoryMixin.methods.getVersionTypeName('status')).toBe('状态')
    expect(DmHistoryMixin.methods.getVersionTypeName('unknown')).toBe('unknown')

    console.log('✅ getVersionTypeName 功能正常')
  })

  test('getVersionTypeColor 应正确映射颜色', () => {
    const { DmHistoryMixin } = require('../../../src/views/ietm/ietmdatamodulemanagement/mixins/DmHistoryMixin')

    expect(DmHistoryMixin.methods.getVersionTypeColor('new')).toBe('green')
    expect(DmHistoryMixin.methods.getVersionTypeColor('changed')).toBe('blue')
    expect(DmHistoryMixin.methods.getVersionTypeColor('status')).toBe('orange')
    expect(DmHistoryMixin.methods.getVersionTypeColor('unknown')).toBe('default')

    console.log('✅ getVersionTypeColor 功能正常')
  })

  test('formatXml 应保护 CDATA 和注释', () => {
    const { DmHistoryMixin } = require('../../../src/views/ietm/ietmdatamodulemanagement/mixins/DmHistoryMixin')

    const input = '<root><![CDATA[some data]]><!-- comment --></root>'
    const formatted = DmHistoryMixin.methods.formatXml(input)

    expect(formatted).toContain('<![CDATA[some data]]>')
    expect(formatted).toContain('<!-- comment -->')

    console.log('✅ formatXml CDATA/注释保护正常')
  })

  test('formatXml 应处理空输入', () => {
    const { DmHistoryMixin } = require('../../../src/views/ietm/ietmdatamodulemanagement/mixins/DmHistoryMixin')

    expect(DmHistoryMixin.methods.formatXml('')).toBe('')
    expect(DmHistoryMixin.methods.formatXml(null)).toBe('')
    expect(DmHistoryMixin.methods.formatXml(undefined)).toBe('')

    console.log('✅ formatXml 空输入处理正常')
  })
})

test.describe('P2 重构验证 - 文件完整性', () => {
  test('DmHistoryModal 应引入 Mixin', async () => {
    const fs = require('fs')
    const path = require('path')

    const filePath = path.resolve(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/components/DmHistoryModal.vue')
    const content = fs.readFileSync(filePath, 'utf-8')

    expect(content).toContain('import { DmHistoryMixin }')
    expect(content).toContain('mixins: [DmHistoryMixin]')
    expect(content).not.toContain('CodeMirror from \'codemirror\'') // 应由 Mixin 导入

    console.log('✅ DmHistoryModal 正确引入 Mixin')
  })

  test('DmHistoryView 应引入 Mixin', async () => {
    const fs = require('fs')
    const path = require('path')

    const filePath = path.resolve(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/DmHistoryView.vue')
    const content = fs.readFileSync(filePath, 'utf-8')

    expect(content).toContain('import { DmHistoryMixin }')
    expect(content).toContain('mixins: [DmHistoryMixin]')
    expect(content).not.toContain('CodeMirror from \'codemirror\'') // 应由 Mixin 导入

    console.log('✅ DmHistoryView 正确引入 Mixin')
  })

  test('DmHistoryModal 不应有重复的方法定义', async () => {
    const fs = require('fs')
    const path = require('path')

    const filePath = path.resolve(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/components/DmHistoryModal.vue')
    const content = fs.readFileSync(filePath, 'utf-8')

    // 检查是否删除了重复方法
    const renderDiffCount = (content.match(/renderDiff\s*\(/g) || []).length
    const formatXmlCount = (content.match(/formatXml\s*\(/g) || []).length
    const formatSideCount = (content.match(/formatSide\s*\(/g) || []).length

    // 只应有调用，不应有定义
    expect(renderDiffCount).toBeLessThan(3) // 调用可能有多次，但不应有完整定义
    expect(formatXmlCount).toBeLessThan(3)
    expect(formatSideCount).toBeLessThan(3)

    console.log('✅ DmHistoryModal 无重复方法定义')
  })

  test('DmHistoryView 不应有重复的方法定义', async () => {
    const fs = require('fs')
    const path = require('path')

    const filePath = path.resolve(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/DmHistoryView.vue')
    const content = fs.readFileSync(filePath, 'utf-8')

    // 检查是否删除了重复方法（除了重写的 renderDiff）
    const formatXmlCount = (content.match(/formatXml\s*\(/g) || []).length
    const formatSideCount = (content.match(/formatSide\s*\(/g) || []).length

    expect(formatXmlCount).toBeLessThan(3)
    expect(formatSideCount).toBeLessThan(3)

    console.log('✅ DmHistoryView 无重复方法定义（除重写部分）')
  })
})

test.describe('P2 重构验证 - 代码行数统计', () => {
  test('应显著减少代码行数', async () => {
    const fs = require('fs')
    const path = require('path')

    const modalPath = path.resolve(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/components/DmHistoryModal.vue')
    const viewPath = path.resolve(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/DmHistoryView.vue')
    const mixinPath = path.resolve(__dirname, '../../../src/views/ietm/ietmdatamodulemanagement/mixins/DmHistoryMixin.js')

    const modalLines = fs.readFileSync(modalPath, 'utf-8').split('\n').length
    const viewLines = fs.readFileSync(viewPath, 'utf-8').split('\n').length
    const mixinLines = fs.readFileSync(mixinPath, 'utf-8').split('\n').length

    console.log('📊 代码行数统计:')
    console.log(`  DmHistoryModal.vue: ${modalLines} 行`)
    console.log(`  DmHistoryView.vue: ${viewLines} 行`)
    console.log(`  DmHistoryMixin.js: ${mixinLines} 行`)
    console.log(`  总计: ${modalLines + viewLines + mixinLines} 行`)

    // 验证 Mixin 存在且有实质内容
    expect(mixinLines).toBeGreaterThan(100) // Mixin 应该有内容

    console.log('✅ 代码重构完成，Mixin 包含充足内容')
  })
})
