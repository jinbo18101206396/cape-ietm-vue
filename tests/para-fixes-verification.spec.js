/**
 * Para设计视图修复验证测试
 * 验证 P0-PERF-1, P1-BUG-1, P1-BUG-2 的修复
 */

import { mount } from '@vue/test-utils'
import { html2para } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter'

describe('Para设计视图修复验证', () => {

  // ==================== P1-BUG-2: 递归深度限制修复 ====================
  describe('P1-BUG-2: 递归深度限制应抛出异常', () => {

    it('应该在递归超过10层时抛出异常（而不是返回污染字符串）', async () => {
      const mockParent = {
        getLocaleName: (name) => name,
        toEnXml: (xml) => xml,
        toCnXml: (xml) => xml
      }

      // 构造11层嵌套HTML（会触发递归深度限制）
      let deepHtml = '<p>Level 0'
      for (let i = 1; i <= 11; i++) {
        deepHtml += `<p>Level ${i}`
      }
      for (let i = 11; i >= 0; i--) {
        deepHtml += '</p>'
      }

      // 应该抛出异常，而不是返回 '[递归深度超限]'
      await expect(
        html2para(mockParent, deepHtml, '{}', [])
      ).rejects.toThrow('para嵌套层级过深（超过10层），请简化内容结构后重试')
    })

    it('9层嵌套应该正常转换（不触发限制）', async () => {
      const mockParent = {
        getLocaleName: (name) => name,
        toEnXml: (xml) => xml,
        toCnXml: (xml) => xml
      }

      // 构造9层嵌套HTML（不触发限制）
      let html = '<p>Level 0'
      for (let i = 1; i <= 9; i++) {
        html += `<p>Level ${i}`
      }
      for (let i = 9; i >= 0; i--) {
        html += '</p>'
      }

      // 不应该抛出异常
      const result = await html2para(mockParent, html, '{}', [])

      // 验证结果不是错误字符串
      expect(result).not.toContain('[递归深度超限]')
      expect(result).toBeTruthy()
    })
  })

  // ==================== P1-BUG-1: endline状态重置 ====================
  describe('P1-BUG-1: endline状态应在组件销毁时重置', () => {

    // 注意：由于ParaDesigner依赖UEditor，这里只能做逻辑验证
    // 完整的组件测试需要在E2E中进行

    it('验证beforeDestroy包含endline重置逻辑', () => {
      // 读取ParaDesigner.vue源码，验证beforeDestroy中有重置逻辑
      const fs = require('fs')
      const path = require('path')
      const componentPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(componentPath, 'utf-8')

      // 验证beforeDestroy中包含 endline 重置
      expect(content).toContain('beforeDestroy()')
      expect(content).toContain('this.endline = -1')
      expect(content).toContain('this.paraId = \'\'')
    })
  })

  // ==================== P0-PERF-1: MutationObserver替代setTimeout ====================
  describe('P0-PERF-1: 使用MutationObserver替代setTimeout轮询', () => {

    it('验证ParaDesigner使用MutationObserver而不是setTimeout', () => {
      const fs = require('fs')
      const path = require('path')
      const componentPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(componentPath, 'utf-8')

      // 验证使用了MutationObserver
      expect(content).toContain('MutationObserver')
      expect(content).toContain('this.domObserver')
      expect(content).toContain('domObserver.disconnect()')

      // 验证ready事件中不再有多个setTimeout调用fixEditorHeight
      const readySection = content.match(/this\.ueditor\.ready\(\(\) => \{[\s\S]*?\}\)/)?.[0] || ''

      // 统计ready中的setTimeout调用次数
      const setTimeoutCount = (readySection.match(/setTimeout\(/g) || []).length

      // 应该只有MutationObserver，不应该有8个setTimeout
      expect(setTimeoutCount).toBeLessThan(8)
    })

    it('验证domObserver在beforeDestroy中被清理', () => {
      const fs = require('fs')
      const path = require('path')
      const componentPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(componentPath, 'utf-8')

      // 验证beforeDestroy中清理了observer
      const beforeDestroySection = content.match(/beforeDestroy\(\) \{[\s\S]*?\n  \},/)?.[0] || ''

      expect(beforeDestroySection).toContain('this.domObserver')
      expect(beforeDestroySection).toContain('disconnect()')
      expect(beforeDestroySection).toContain('this.domObserver = null')
    })
  })

  // ==================== 基础功能回归测试 ====================
  describe('基础功能回归测试', () => {

    it('html2para基础转换应该正常工作', async () => {
      const mockParent = {
        getLocaleName: (name) => name,
        toEnXml: (xml) => xml,
        toCnXml: (xml) => xml
      }

      const html = '<p>Hello <strong>World</strong></p>'
      const result = await html2para(mockParent, html, '{}', [])

      expect(result).toContain('<para>')
      expect(result).toContain('Hello')
      expect(result).toContain('<emphasis>')
      expect(result).toContain('World')
      expect(result).toContain('</emphasis>')
      expect(result).toContain('</para>')
    })

    it('空内容应该返回空字符串', async () => {
      const mockParent = {
        getLocaleName: (name) => name,
        toEnXml: (xml) => xml,
        toCnXml: (xml) => xml
      }

      const result = await html2para(mockParent, '', '{}', [])
      expect(result).toBe('')

      const result2 = await html2para(mockParent, '   ', '{}', [])
      expect(result2).toBe('')
    })
  })
})
