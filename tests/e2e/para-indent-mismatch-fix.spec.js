/**
 * Para设计器P0缺陷修复验证：缩进不一致导致的"找不到结束标签"错误
 *
 * 修复11：放宽缩进匹配条件
 * 修复12：错误消息显示正确的行号
 *
 * Bug根因：
 * 1. 严格的 beginidx === indentIdx 要求开始和结束标签缩进完全相同
 * 2. 实际XML可能因手动编辑、格式化工具产生缩进不一致
 * 3. 导致"XML格式错误：找不到 </para> 结束标签（行70）"
 * 4. 进而导致保存时"endline(-1) < lineno(69)"错误
 *
 * 测试策略：
 * - TC-01: 结束标签缩进等于开始标签（正常情况）
 * - TC-02: 结束标签缩进小于开始标签（左对齐格式化）
 * - TC-03: 结束标签缩进大于开始标签（异常但应兜底匹配）
 * - TC-04: 点击结束行打开设计器（反向搜索场景）
 * - TC-05: 保存后验证endline正确更新
 */

import { test, expect } from '@playwright/test'

test.describe('Para设计器 - 缩进不一致P0修复验证', () => {

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 导航到数据模块列表
    await page.goto('http://localhost:3000/ietm/ietmDataModuleManagement')
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

    // 打开第一个DM的编辑器
    await page.click('.ant-table-tbody tr:first-child .iconfont.icon-edit')
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 等待CodeMirror加载完成
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().length > 0
    })
  })

  test('TC-01: 结束标签缩进等于开始标签（正常情况）', async ({ page }) => {
    // 插入标准缩进的多行para
    const testXml = `    <para id="tc01-normal-indent">
      <emphasis>正常缩进的内容</emphasis>
      <randomList>
        <listItem>项目1</listItem>
      </randomList>
    </para>`

    const lineNo = await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const insertPos = { line: 15, ch: 0 }
      cm.replaceRange(xml, insertPos)
      return 15
    }, testXml)

    // 点击开始行，打开设计器
    const result = await page.evaluate((line) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const vueApp = document.querySelector('#app').__vue__

      function findEditor(children) {
        for (const child of children) {
          if (child.$options.name === 'DmContentEditor') return child
          if (child.$children.length > 0) {
            const found = findEditor(child.$children)
            if (found) return found
          }
        }
        return null
      }

      const editor = findEditor(vueApp.$children)
      if (editor && typeof editor.openParaDesigner === 'function') {
        editor.openParaDesigner(line)
        return { success: true }
      }
      return { success: false, error: '未找到编辑器组件' }
    }, lineNo)

    expect(result.success).toBe(true)

    // 等待Para设计器加载
    await page.waitForSelector('.para-designer', { timeout: 5000 })

    // 验证：没有错误消息
    const errorVisible = await page.locator('.ant-message-error').isVisible().catch(() => false)
    expect(errorVisible).toBe(false)

    // 验证：ID输入框正确显示
    const paraId = await page.locator('.para-designer input[placeholder=""]').first().inputValue()
    expect(paraId).toBe('tc01-normal-indent')
  })

  test('TC-02: 结束标签缩进小于开始标签（左对齐格式化）', async ({ page }) => {
    // 插入结束标签左对齐的多行para（常见的格式化风格）
    const testXml = `      <para id="tc02-left-align">
        <emphasis>内容缩进更深</emphasis>
        <randomList>
          <listItem>项目1</listItem>
        </randomList>
    </para>`  // 结束标签缩进是4空格，开始标签是6空格

    const lineNo = await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const insertPos = { line: 20, ch: 0 }
      cm.replaceRange(xml, insertPos)
      return 20
    }, testXml)

    // 点击开始行，打开设计器
    const result = await page.evaluate((line) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const vueApp = document.querySelector('#app').__vue__

      function findEditor(children) {
        for (const child of children) {
          if (child.$options.name === 'DmContentEditor') return child
          if (child.$children.length > 0) {
            const found = findEditor(child.$children)
            if (found) return found
          }
        }
        return null
      }

      const editor = findEditor(vueApp.$children)
      if (editor && typeof editor.openParaDesigner === 'function') {
        editor.openParaDesigner(line)
        return { success: true }
      }
      return { success: false, error: '未找到编辑器组件' }
    }, lineNo)

    expect(result.success).toBe(true)

    // 等待Para设计器加载
    await page.waitForSelector('.para-designer', { timeout: 5000 })

    // 验证：没有"找不到结束标签"错误
    const errorVisible = await page.locator('.ant-message-error').isVisible().catch(() => false)
    expect(errorVisible).toBe(false)

    // 验证：ID输入框正确显示
    const paraId = await page.locator('.para-designer input[placeholder=""]').first().inputValue()
    expect(paraId).toBe('tc02-left-align')
  })

  test('TC-03: 结束标签缩进大于开始标签（兜底匹配）', async ({ page }) => {
    // 插入结束标签缩进更大的多行para（异常但应该兜底处理）
    const testXml = `    <para id="tc03-right-indent">
      <emphasis>异常缩进场景</emphasis>
        </para>`  // 结束标签缩进是8空格，开始标签是4空格

    const lineNo = await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const insertPos = { line: 25, ch: 0 }
      cm.replaceRange(xml, insertPos)
      return 25
    }, testXml)

    // 点击开始行，打开设计器
    const result = await page.evaluate((line) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const vueApp = document.querySelector('#app').__vue__

      function findEditor(children) {
        for (const child of children) {
          if (child.$options.name === 'DmContentEditor') return child
          if (child.$children.length > 0) {
            const found = findEditor(child.$children)
            if (found) return found
          }
        }
        return null
      }

      const editor = findEditor(vueApp.$children)
      if (editor && typeof editor.openParaDesigner === 'function') {
        editor.openParaDesigner(line)
        return { success: true }
      }
      return { success: false, error: '未找到编辑器组件' }
    }, lineNo)

    expect(result.success).toBe(true)

    // 等待Para设计器加载
    await page.waitForSelector('.para-designer', { timeout: 5000 })

    // 验证：兜底匹配成功，没有错误
    const errorVisible = await page.locator('.ant-message-error').isVisible().catch(() => false)
    expect(errorVisible).toBe(false)

    // 验证：ID输入框正确显示
    const paraId = await page.locator('.para-designer input[placeholder=""]').first().inputValue()
    expect(paraId).toBe('tc03-right-indent')
  })

  test('TC-04: 点击结束行打开设计器（反向搜索场景）', async ({ page }) => {
    // 插入多行para
    const testXml = `    <para id="tc04-click-endline">
      <emphasis>测试点击结束行</emphasis>
      <randomList>
        <listItem>项目1</listItem>
      </randomList>
    </para>`

    const startLineNo = await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const insertPos = { line: 30, ch: 0 }
      cm.replaceRange(xml, insertPos)
      return 30
    }, testXml)

    // 点击结束行（第35行），打开设计器
    const endLineNo = startLineNo + 5
    const result = await page.evaluate((line) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const vueApp = document.querySelector('#app').__vue__

      function findEditor(children) {
        for (const child of children) {
          if (child.$options.name === 'DmContentEditor') return child
          if (child.$children.length > 0) {
            const found = findEditor(child.$children)
            if (found) return found
          }
        }
        return null
      }

      const editor = findEditor(vueApp.$children)
      if (editor && typeof editor.openParaDesigner === 'function') {
        editor.openParaDesigner(line)
        return { success: true }
      }
      return { success: false, error: '未找到编辑器组件' }
    }, endLineNo)

    expect(result.success).toBe(true)

    // 等待Para设计器加载
    await page.waitForSelector('.para-designer', { timeout: 5000 })

    // 验证：反向搜索成功，没有错误
    const errorVisible = await page.locator('.ant-message-error').isVisible().catch(() => false)
    expect(errorVisible).toBe(false)

    // 验证：ID输入框正确显示
    const paraId = await page.locator('.para-designer input[placeholder=""]').first().inputValue()
    expect(paraId).toBe('tc04-click-endline')
  })

  test('TC-05: 保存后验证endline正确更新（修复保存错误）', async ({ page }) => {
    // 插入多行para
    const testXml = `    <para id="tc05-save-test">
      <emphasis>测试保存功能</emphasis>
    </para>`

    const lineNo = await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const insertPos = { line: 40, ch: 0 }
      cm.replaceRange(xml, insertPos)
      return 40
    }, testXml)

    // 打开设计器
    const openResult = await page.evaluate((line) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const vueApp = document.querySelector('#app').__vue__

      function findEditor(children) {
        for (const child of children) {
          if (child.$options.name === 'DmContentEditor') return child
          if (child.$children.length > 0) {
            const found = findEditor(child.$children)
            if (found) return found
          }
        }
        return null
      }

      const editor = findEditor(vueApp.$children)
      if (editor && typeof editor.openParaDesigner === 'function') {
        editor.openParaDesigner(line)
        return { success: true }
      }
      return { success: false, error: '未找到编辑器组件' }
    }, lineNo)

    expect(openResult.success).toBe(true)

    // 等待Para设计器加载
    await page.waitForSelector('.para-designer', { timeout: 5000 })

    // 等待UEditor加载完成
    await page.waitForTimeout(2000)

    // 在UEditor中添加内容
    await page.evaluate(() => {
      const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
      if (ueditor && ueditor.isReady) {
        ueditor.setContent('<p><strong>修改后的内容</strong></p>')
      }
    })

    await page.waitForTimeout(500)

    // 点击保存按钮
    await page.click('.para-designer button:has-text("保存")')

    // 等待保存完成
    await page.waitForTimeout(2000)

    // 验证：没有"endline(-1) < lineno"错误
    const saveErrorVisible = await page.locator('.ant-message-error:has-text("endline")').isVisible().catch(() => false)
    expect(saveErrorVisible).toBe(false)

    // 验证：出现保存成功消息
    const successVisible = await page.locator('.ant-message-success:has-text("保存成功")').isVisible().catch(() => false)
    expect(successVisible).toBe(true)

    // 验证：源码视图中para内容已更新
    const updatedContent = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm.getValue()
    })

    expect(updatedContent).toContain('修改后的内容')
    expect(updatedContent).toContain('tc05-save-test')
  })

  test('TC-06: 连续缩进不一致的多个para（压力测试）', async ({ page }) => {
    // 插入多个缩进不一致的para
    const testXml = `    <para id="tc06-para1">
      <emphasis>Para 1</emphasis>
    </para>
      <para id="tc06-para2">
        <emphasis>Para 2</emphasis>
      </para>
  <para id="tc06-para3">
    <emphasis>Para 3</emphasis>
  </para>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const insertPos = { line: 45, ch: 0 }
      cm.replaceRange(xml, insertPos)
    }, testXml)

    // 依次打开每个para，验证都能正确识别
    const paraIds = ['tc06-para1', 'tc06-para2', 'tc06-para3']
    const startLines = [45, 48, 51]

    for (let i = 0; i < paraIds.length; i++) {
      const result = await page.evaluate((line) => {
        const vueApp = document.querySelector('#app').__vue__

        function findEditor(children) {
          for (const child of children) {
            if (child.$options.name === 'DmContentEditor') return child
            if (child.$children.length > 0) {
              const found = findEditor(child.$children)
              if (found) return found
            }
          }
          return null
        }

        const editor = findEditor(vueApp.$children)
        if (editor && typeof editor.openParaDesigner === 'function') {
          editor.openParaDesigner(line)
          return { success: true }
        }
        return { success: false }
      }, startLines[i])

      expect(result.success).toBe(true)

      // 等待Para设计器加载
      await page.waitForSelector('.para-designer', { timeout: 5000 })

      // 验证ID
      const paraId = await page.locator('.para-designer input[placeholder=""]').first().inputValue()
      expect(paraId).toBe(paraIds[i])

      // 关闭设计器（切换回源码视图）
      await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
      await page.waitForTimeout(500)
    }
  })
})
