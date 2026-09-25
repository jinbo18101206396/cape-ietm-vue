/**
 * Para设计器单行para保存E2E测试
 * P0缺陷验证：单行para编辑后不应丢失原XML内容
 *
 * 测试目标：真实浏览器环境下验证单行para的完整保存流程
 */

import { test, expect } from '@playwright/test'

test.describe('Para设计器 - 单行para保存P0修复验证', () => {

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
  })

  test('P0-01: 单行para编辑保存后，下一行内容不丢失', async ({ page }) => {
    // 1. 打开第一个DM的编辑器
    await page.click('.ant-table-tbody tr:first-child .iconfont.icon-edit')
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 2. 等待CodeMirror加载完成
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().length > 0
    })

    // 3. 在源码视图中找到一个单行para（或插入一个测试用的）
    const insertTestXml = `
    <para id="test-single-line">原始内容测试</para>
    <para id="test-next-line">下一行para</para>
    <title>标题元素</title>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      // 在第10行插入测试XML
      const insertPos = { line: 10, ch: 0 }
      cm.replaceRange(xml, insertPos)
    }, insertTestXml)

    // 4. 获取插入后的行号（找到test-single-line所在行）
    const testLineNo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const content = cm.getValue()
      const lines = content.split('\n')
      return lines.findIndex(line => line.includes('test-single-line'))
    })

    console.log(`测试para位于第${testLineNo}行`)

    // 5. 点击单行para的铅笔图标（进入设计视图）
    // 首先需要在该行上点击，让行号区域显示编辑图标
    await page.evaluate((lineNo) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const lineHandle = cm.getLineHandle(lineNo)
      // 触发行号区域的hover事件
      const gutterElement = document.querySelector(`.CodeMirror-linenumber:nth-child(${lineNo + 1})`)
      if (gutterElement) {
        const event = new MouseEvent('mouseenter', { bubbles: true })
        gutterElement.dispatchEvent(event)
      }
    }, testLineNo)

    // 等待编辑图标出现并点击
    await page.waitForTimeout(500) // 等待hover效果

    // 直接调用打开Para设计器的方法
    const paraDesignerOpened = await page.evaluate((lineNo) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const line = cm.getLine(lineNo)

      // 模拟点击铅笔图标的逻辑（直接调用openPara方法）
      if (window.dmEditorInstance && typeof window.dmEditorInstance.openParaDesigner === 'function') {
        window.dmEditorInstance.openParaDesigner(lineNo)
        return true
      }
      return false
    }, testLineNo)

    if (!paraDesignerOpened) {
      // 备选方案：直接打开Para设计器弹窗
      await page.evaluate((lineNo) => {
        // 触发组件的openParaDesigner方法
        const vueApp = document.querySelector('#app').__vue__
        if (vueApp && vueApp.$children) {
          // 递归查找DmContentEditor组件
          function findComponent(children, name) {
            for (const child of children) {
              if (child.$options.name === name) return child
              if (child.$children.length > 0) {
                const found = findComponent(child.$children, name)
                if (found) return found
              }
            }
            return null
          }
          const editor = findComponent(vueApp.$children, 'DmContentEditor')
          if (editor && editor.openParaDesigner) {
            editor.openParaDesigner(lineNo)
          }
        }
      }, testLineNo)
    }

    // 6. 等待Para设计器弹窗打开
    await page.waitForSelector('.para-designer-modal', { timeout: 10000 })

    // 7. 等待UEditor加载完成
    await page.waitForSelector('#ueditor_para iframe', { timeout: 10000 })
    await page.waitForTimeout(2000) // 等待UEditor完全初始化

    // 8. 在UEditor中编辑内容
    const newContent = '修改后的内容ABC'
    await page.frameLocator('#ueditor_para iframe').locator('body').fill(newContent)

    // 9. 点击保存按钮
    await page.click('.para-designer-modal button:has-text("保存")')
    await page.waitForTimeout(1000) // 等待保存完成

    // 10. 验证：检查源码视图中的XML
    const xmlAfterSave = await page.evaluate((lineNo) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return {
        testLine: cm.getLine(lineNo),
        nextLine: cm.getLine(lineNo + 1),
        nextLine2: cm.getLine(lineNo + 2)
      }
    }, testLineNo)

    console.log('保存后的XML:', xmlAfterSave)

    // ✓ 验证1：单行para被正确替换
    expect(xmlAfterSave.testLine).toContain('<para id="test-single-line">')
    expect(xmlAfterSave.testLine).toContain('修改后的内容ABC')
    expect(xmlAfterSave.testLine).toContain('</para>')

    // ✓ 验证2：下一行内容未丢失
    expect(xmlAfterSave.nextLine).toContain('test-next-line')
    expect(xmlAfterSave.nextLine).not.toContain('</para></para>') // 不应有重复的结束标签

    // ✓ 验证3：第三行也未受影响
    expect(xmlAfterSave.nextLine2).toContain('<title>')
  })

  test('P0-02: 单行para内容变短，不残留原内容', async ({ page }) => {
    await page.click('.ant-table-tbody tr:first-child .iconfont.icon-edit')
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 插入一个内容很长的单行para
    const longContent = `    <para id="test-long">这是一段非常非常非常长的原始内容1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ</para>
    <para id="test-next">下一个para</para>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.replaceRange(xml, { line: 10, ch: 0 })
    }, longContent)

    const testLineNo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const lines = cm.getValue().split('\n')
      return lines.findIndex(line => line.includes('test-long'))
    })

    // 打开Para设计器
    await page.evaluate((lineNo) => {
      const vueApp = document.querySelector('#app').__vue__
      function findComponent(children, name) {
        for (const child of children) {
          if (child.$options.name === name) return child
          if (child.$children.length > 0) {
            const found = findComponent(child.$children, name)
            if (found) return found
          }
        }
        return null
      }
      const editor = findComponent(vueApp.$children, 'DmContentEditor')
      if (editor && editor.openParaDesigner) {
        editor.openParaDesigner(lineNo)
      }
    }, testLineNo)

    await page.waitForSelector('.para-designer-modal', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // 编辑为很短的内容
    const shortContent = '短'
    await page.frameLocator('#ueditor_para iframe').locator('body').fill(shortContent)

    await page.click('.para-designer-modal button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 验证：短内容正确保存，无残留
    const xmlAfterSave = await page.evaluate((lineNo) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm.getLine(lineNo)
    }, testLineNo)

    console.log('短内容保存后:', xmlAfterSave)

    expect(xmlAfterSave).toContain('<para id="test-long">短</para>')
    expect(xmlAfterSave).not.toContain('1234567890') // 原长内容不应残留
    expect(xmlAfterSave).not.toContain('ABCDEFG')
  })

  test('P0-03: 单行para内容变长，不错位覆盖', async ({ page }) => {
    await page.click('.ant-table-tbody tr:first-child .iconfont.icon-edit')
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 插入一个内容很短的单行para
    const shortXml = `    <para id="test-short">短</para>
    <para id="test-next-important">重要的下一行</para>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.replaceRange(xml, { line: 10, ch: 0 })
    }, shortXml)

    const testLineNo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const lines = cm.getValue().split('\n')
      return lines.findIndex(line => line.includes('test-short'))
    })

    await page.evaluate((lineNo) => {
      const vueApp = document.querySelector('#app').__vue__
      function findComponent(children, name) {
        for (const child of children) {
          if (child.$options.name === name) return child
          if (child.$children.length > 0) {
            const found = findComponent(child.$children, name)
            if (found) return found
          }
        }
        return null
      }
      const editor = findComponent(vueApp.$children, 'DmContentEditor')
      if (editor && editor.openParaDesigner) {
        editor.openParaDesigner(lineNo)
      }
    }, testLineNo)

    await page.waitForSelector('.para-designer-modal', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // 编辑为很长的内容
    const longContent = '这是一段非常非常非常长的新内容XYZXYZXYZXYZXYZXYZXYZXYZ'
    await page.frameLocator('#ueditor_para iframe').locator('body').fill(longContent)

    await page.click('.para-designer-modal button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 验证：长内容正确保存，下一行未被覆盖
    const result = await page.evaluate((lineNo) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return {
        testLine: cm.getLine(lineNo),
        nextLine: cm.getLine(lineNo + 1)
      }
    }, testLineNo)

    console.log('长内容保存后:', result)

    expect(result.testLine).toContain('非常非常非常长的新内容')
    expect(result.testLine).toContain('</para>')
    expect(result.nextLine).toContain('test-next-important')
    expect(result.nextLine).toContain('重要的下一行')
  })

  test('P0-04: 多行para不受影响（回归测试）', async ({ page }) => {
    await page.click('.ant-table-tbody tr:first-child .iconfont.icon-edit')
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 插入一个多行para
    const multiLineXml = `    <para id="test-multiline">
      第一行内容
      第二行内容
      第三行内容
    </para>
    <para id="test-after">后续para</para>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.replaceRange(xml, { line: 10, ch: 0 })
    }, multiLineXml)

    const testLineNo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const lines = cm.getValue().split('\n')
      return lines.findIndex(line => line.includes('test-multiline'))
    })

    await page.evaluate((lineNo) => {
      const vueApp = document.querySelector('#app').__vue__
      function findComponent(children, name) {
        for (const child of children) {
          if (child.$options.name === name) return child
          if (child.$children.length > 0) {
            const found = findComponent(child.$children, name)
            if (found) return found
          }
        }
        return null
      }
      const editor = findComponent(vueApp.$children, 'DmContentEditor')
      if (editor && editor.openParaDesigner) {
        editor.openParaDesigner(lineNo)
      }
    }, testLineNo)

    await page.waitForSelector('.para-designer-modal', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // 编辑多行para
    await page.frameLocator('#ueditor_para iframe').locator('body').fill('多行编辑后的内容')

    await page.click('.para-designer-modal button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 验证：多行para正确保存，后续内容不受影响
    const result = await page.evaluate((lineNo) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const lines = []
      for (let i = lineNo; i < lineNo + 10; i++) {
        const line = cm.getLine(i)
        if (line) lines.push(line)
      }
      return lines.join('\n')
    }, testLineNo)

    console.log('多行para保存后:', result)

    expect(result).toContain('多行编辑后的内容')
    expect(result).toContain('</para>')
    expect(result).toContain('test-after')
    expect(result).toContain('后续para')
  })
})
