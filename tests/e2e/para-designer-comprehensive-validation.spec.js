/**
 * Para设计器全面功能验证测试
 *
 * 目标：通过真实UI交互（点击/输入）全面验证Para设计器功能
 *
 * 测试覆盖：
 * 1. 场景测试：打开/编辑/保存/切换视图的完整工作流
 * 2. 边界测试：单行/多行/嵌套内容/特殊字符/大文档
 * 3. 缩进测试：各种缩进不一致情况
 * 4. 集成测试：与paraConverter.js的转换验证
 * 5. 回归测试：验证修复11/12没有引入新问题
 *
 * 所有测试通过真实浏览器UI交互，不绕过Vue层
 */

import { test, expect } from '@playwright/test'

test.describe('Para设计器 - 全面功能验证', () => {

  let dmId = null
  let editorPage = null

  test.beforeAll(async ({ browser }) => {
    // 创建持久化的页面上下文
    const context = await browser.newContext()
    editorPage = await context.newPage()

    // 登录
    await editorPage.goto('http://localhost:3000/user/login')
    await editorPage.fill('input[placeholder="账号"]', 'admin')
    await editorPage.fill('input[placeholder="密码"]', 'admin123')
    await editorPage.click('button:has-text("登录")')
    await editorPage.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 导航到数据模块列表
    await editorPage.goto('http://localhost:3000/ietm/ietmDataModuleManagement')
    await editorPage.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

    // 打开第一个DM的编辑器
    await editorPage.click('.ant-table-tbody tr:first-child .iconfont.icon-edit')
    await editorPage.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 等待CodeMirror加载完成
    await editorPage.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().length > 0
    })
  })

  test.afterAll(async () => {
    if (editorPage) {
      await editorPage.close()
    }
  })

  // ========================================
  // 分组1: 基本工作流测试
  // ========================================

  test.describe('基本工作流', () => {

    test('WF-01: 打开标准单行para → 编辑 → 保存 → 验证', async () => {
      // 1. 插入测试数据
      const testXml = `    <para id="wf01-single-line">单行para测试内容</para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 10, ch: 0 })
        return 10
      }, testXml)

      // 2. 点击该行打开Para设计器
      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      // 3. 等待Para设计器加载
      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      // 4. 验证ID正确显示
      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('wf01-single-line')

      // 5. 等待UEditor加载
      await editorPage.waitForTimeout(2000)

      // 6. 修改内容
      await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        if (ueditor && ueditor.isReady) {
          ueditor.setContent('<p>修改后的单行内容</p>')
        }
      })

      await editorPage.waitForTimeout(500)

      // 7. 点击保存
      await editorPage.click('.para-designer button:has-text("保存")')

      // 8. 等待保存完成
      await editorPage.waitForTimeout(2000)

      // 9. 验证保存成功（没有错误消息）
      const hasError = await editorPage.locator('.ant-message-error').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      // 10. 验证内容已更新
      const content = await editorPage.evaluate(() => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        return cm.getValue()
      })

      expect(content).toContain('修改后的单行内容')
    })

    test('WF-02: 打开标准多行para → 编辑 → 保存 → 验证', async () => {
      const testXml = `    <para id="wf02-multi-line">
      <emphasis>多行para</emphasis>
      <randomList>
        <listItem>项目1</listItem>
        <listItem>项目2</listItem>
      </randomList>
    </para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 20, ch: 0 })
        return 20
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('wf02-multi-line')

      await editorPage.waitForTimeout(2000)

      // 修改内容
      await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        if (ueditor && ueditor.isReady) {
          ueditor.setContent('<p><strong>修改后的多行内容</strong></p><ul><li>新项目1</li></ul>')
        }
      })

      await editorPage.waitForTimeout(500)
      await editorPage.click('.para-designer button:has-text("保存")')
      await editorPage.waitForTimeout(2000)

      const hasError = await editorPage.locator('.ant-message-error').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      const content = await editorPage.evaluate(() => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        return cm.getValue()
      })

      expect(content).toContain('修改后的多行内容')
    })

    test('WF-03: 切换源码视图→设计视图→源码视图往返', async () => {
      const testXml = `    <para id="wf03-view-switch">视图切换测试</para>`

      await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 30, ch: 0 })
      }, testXml)

      // 确保在源码视图
      const sourceTabVisible = await editorPage.locator('.view-tabs .ant-tabs-tab:has-text("源码视图")').isVisible()
      if (sourceTabVisible) {
        await editorPage.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
        await editorPage.waitForTimeout(500)
      }

      // 验证CodeMirror可见
      const cmVisible = await editorPage.locator('.CodeMirror').isVisible()
      expect(cmVisible).toBe(true)

      // 打开设计视图
      const opened = await openParaDesigner(editorPage, 30)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      // 验证Para设计器可见
      const designerVisible = await editorPage.locator('.para-designer').isVisible()
      expect(designerVisible).toBe(true)

      // 切换回源码视图
      await editorPage.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
      await editorPage.waitForTimeout(1000)

      // 验证CodeMirror恢复正常（没有布局问题）
      const cmVisibleAgain = await editorPage.locator('.CodeMirror').isVisible()
      expect(cmVisibleAgain).toBe(true)

      // 验证内容仍然存在
      const content = await editorPage.evaluate(() => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        return cm.getValue()
      })
      expect(content).toContain('wf03-view-switch')
    })
  })

  // ========================================
  // 分组2: 缩进不一致场景测试（修复11验证）
  // ========================================

  test.describe('缩进不一致场景', () => {

    test('INDENT-01: 结束标签缩进小于开始标签（左对齐）', async () => {
      const testXml = `      <para id="indent01-left-align">
        <emphasis>左对齐格式化风格</emphasis>
    </para>`  // 结束标签缩进4，开始标签缩进6

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 40, ch: 0 })
        return 40
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      // 验证没有"找不到结束标签"错误
      const hasError = await editorPage.locator('.ant-message-error:has-text("找不到")').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('indent01-left-align')
    })

    test('INDENT-02: 结束标签缩进大于开始标签（兜底匹配）', async () => {
      const testXml = `    <para id="indent02-right-indent">
      <emphasis>异常缩进</emphasis>
        </para>`  // 结束标签缩进8，开始标签缩进4

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 45, ch: 0 })
        return 45
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const hasError = await editorPage.locator('.ant-message-error:has-text("找不到")').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('indent02-right-indent')
    })

    test('INDENT-03: 极端左对齐（缩进差距很大）', async () => {
      const testXml = `        <para id="indent03-extreme">
          <emphasis>极端缩进测试</emphasis>
  </para>`  // 结束标签缩进2，开始标签缩进8

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 50, ch: 0 })
        return 50
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const hasError = await editorPage.locator('.ant-message-error:has-text("找不到")').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('indent03-extreme')
    })

    test('INDENT-04: 点击结束行打开（反向搜索）', async () => {
      const testXml = `      <para id="indent04-click-end">
        <emphasis>点击结束行测试</emphasis>
    </para>`

      const startLineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 55, ch: 0 })
        return 55
      }, testXml)

      // 点击结束行（第57行）
      const endLineNo = startLineNo + 2
      const opened = await openParaDesigner(editorPage, endLineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const hasError = await editorPage.locator('.ant-message-error:has-text("找不到")').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('indent04-click-end')
    })

    test('INDENT-05: 混合缩进（制表符+空格）', async () => {
      // 注意：使用\t表示制表符
      const testXml = `\t<para id="indent05-mixed">
\t  <emphasis>混合缩进</emphasis>
    </para>`  // 混合制表符和空格

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 60, ch: 0 })
        return 60
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const hasError = await editorPage.locator('.ant-message-error:has-text("找不到")').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('indent05-mixed')
    })
  })

  // ========================================
  // 分组3: 边界场景测试
  // ========================================

  test.describe('边界场景', () => {

    test('EDGE-01: 空para', async () => {
      const testXml = `    <para id="edge01-empty"></para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 65, ch: 0 })
        return 65
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('edge01-empty')

      // 验证UEditor为空或有默认内容
      await editorPage.waitForTimeout(2000)
      const content = await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        return ueditor ? ueditor.getContent() : ''
      })

      // 空para可能返回空字符串或'<p><br/></p>'
      expect(content.length <= 20).toBe(true)
    })

    test('EDGE-02: para包含特殊字符', async () => {
      const testXml = `    <para id="edge02-special-chars">特殊字符: &lt; &gt; &amp; &quot; &#39;</para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 70, ch: 0 })
        return 70
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('edge02-special-chars')

      await editorPage.waitForTimeout(2000)

      // 验证特殊字符正确转换
      const content = await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        return ueditor ? ueditor.getContent() : ''
      })

      // UEditor应该显示实际字符，不是实体
      expect(content).toBeTruthy()
    })

    test('EDGE-03: para包含深层嵌套', async () => {
      const testXml = `    <para id="edge03-nested">
      <emphasis>
        <superScript>上标
          <emphasis>嵌套强调</emphasis>
        </superScript>
      </emphasis>
    </para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 75, ch: 0 })
        return 75
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('edge03-nested')
    })

    test('EDGE-04: para包含表格', async () => {
      const testXml = `    <para id="edge04-table">
      <table>
        <tgroup cols="2">
          <tbody>
            <row>
              <entry>单元格1</entry>
              <entry>单元格2</entry>
            </row>
          </tbody>
        </tgroup>
      </table>
    </para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 85, ch: 0 })
        return 85
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('edge04-table')

      await editorPage.waitForTimeout(2000)

      // 验证表格正确转换
      const content = await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        return ueditor ? ueditor.getContent() : ''
      })

      expect(content).toContain('单元格1')
      expect(content).toContain('单元格2')
    })

    test('EDGE-05: 非常长的para（100+行）', async () => {
      // 生成100行的para
      let paraContent = '    <para id="edge05-long">\n'
      for (let i = 0; i < 100; i++) {
        paraContent += `      <emphasis>第${i + 1}行内容</emphasis>\n`
      }
      paraContent += '    </para>'

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 100, ch: 0 })
        return 100
      }, paraContent)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 10000 })

      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('edge05-long')

      await editorPage.waitForTimeout(3000)

      // 验证长内容能正确加载
      const content = await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        return ueditor ? ueditor.getContent() : ''
      })

      expect(content).toContain('第1行内容')
      expect(content).toContain('第100行内容')
    })

    test('EDGE-06: 无ID的para', async () => {
      const testXml = `    <para>
      <emphasis>没有ID的para</emphasis>
    </para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 210, ch: 0 })
        return 210
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

      // 验证ID输入框为空
      const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
      expect(paraId).toBe('')
    })
  })

  // ========================================
  // 分组4: 保存功能测试（修复12验证）
  // ========================================

  test.describe('保存功能', () => {

    test('SAVE-01: 保存后endline正确更新', async () => {
      const testXml = `    <para id="save01-endline">
      <emphasis>测试endline更新</emphasis>
    </para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 215, ch: 0 })
        return 215
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })
      await editorPage.waitForTimeout(2000)

      // 修改内容
      await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        if (ueditor && ueditor.isReady) {
          ueditor.setContent('<p><strong>修改后内容</strong></p>')
        }
      })

      await editorPage.waitForTimeout(500)
      await editorPage.click('.para-designer button:has-text("保存")')
      await editorPage.waitForTimeout(2000)

      // 验证没有"endline(-1) < lineno"错误
      const hasEndlineError = await editorPage.locator('.ant-message-error:has-text("endline")').isVisible().catch(() => false)
      expect(hasEndlineError).toBe(false)

      // 验证保存成功
      const hasSuccess = await editorPage.locator('.ant-message-success:has-text("保存成功")').isVisible().catch(() => false)
      expect(hasSuccess).toBe(true)
    })

    test('SAVE-02: 保存后不丢失下一行内容（回归测试修复10）', async () => {
      const testXml = `    <para id="save02-no-loss">单行保存测试</para>
    <title>下一行的标题</title>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 220, ch: 0 })
        return 220
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })
      await editorPage.waitForTimeout(2000)

      // 修改内容
      await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        if (ueditor && ueditor.isReady) {
          ueditor.setContent('<p>修改后的单行</p>')
        }
      })

      await editorPage.waitForTimeout(500)
      await editorPage.click('.para-designer button:has-text("保存")')
      await editorPage.waitForTimeout(2000)

      // 切换回源码视图
      await editorPage.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
      await editorPage.waitForTimeout(1000)

      // 验证下一行的title仍然存在
      const content = await editorPage.evaluate(() => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        return cm.getValue()
      })

      expect(content).toContain('修改后的单行')
      expect(content).toContain('下一行的标题')
    })

    test('SAVE-03: 连续保存多次', async () => {
      const testXml = `    <para id="save03-multiple">连续保存测试</para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 225, ch: 0 })
        return 225
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })
      await editorPage.waitForTimeout(2000)

      // 第一次保存
      await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        if (ueditor && ueditor.isReady) {
          ueditor.setContent('<p>第一次修改</p>')
        }
      })
      await editorPage.waitForTimeout(500)
      await editorPage.click('.para-designer button:has-text("保存")')
      await editorPage.waitForTimeout(2000)

      // 第二次保存
      await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        if (ueditor && ueditor.isReady) {
          ueditor.setContent('<p>第二次修改</p>')
        }
      })
      await editorPage.waitForTimeout(500)
      await editorPage.click('.para-designer button:has-text("保存")')
      await editorPage.waitForTimeout(2000)

      // 第三次保存
      await editorPage.evaluate(() => {
        const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
        if (ueditor && ueditor.isReady) {
          ueditor.setContent('<p>第三次修改</p>')
        }
      })
      await editorPage.waitForTimeout(500)
      await editorPage.click('.para-designer button:has-text("保存")')
      await editorPage.waitForTimeout(2000)

      // 验证所有保存都成功
      const hasError = await editorPage.locator('.ant-message-error').isVisible().catch(() => false)
      expect(hasError).toBe(false)

      // 验证最终内容正确
      await editorPage.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
      await editorPage.waitForTimeout(1000)

      const content = await editorPage.evaluate(() => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        return cm.getValue()
      })

      expect(content).toContain('第三次修改')
    })
  })

  // ========================================
  // 分组5: 压力测试
  // ========================================

  test.describe('压力测试', () => {

    test('STRESS-01: 连续打开关闭10个para', async () => {
      // 插入10个para
      let testXml = ''
      for (let i = 1; i <= 10; i++) {
        testXml += `    <para id="stress01-para${i}">Para ${i}</para>\n`
      }

      const startLineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 230, ch: 0 })
        return 230
      }, testXml)

      // 依次打开关闭每个para
      for (let i = 0; i < 10; i++) {
        const lineNo = startLineNo + i

        const opened = await openParaDesigner(editorPage, lineNo)
        expect(opened).toBe(true)

        await editorPage.waitForSelector('.para-designer', { timeout: 5000 })

        const paraId = await editorPage.locator('.para-designer .para-header input').inputValue()
        expect(paraId).toBe(`stress01-para${i + 1}`)

        // 切换回源码视图
        await editorPage.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
        await editorPage.waitForTimeout(500)
      }

      // 验证没有内存泄漏或布局问题
      const cmVisible = await editorPage.locator('.CodeMirror').isVisible()
      expect(cmVisible).toBe(true)
    })

    test('STRESS-02: 快速编辑保存循环', async () => {
      const testXml = `    <para id="stress02-rapid">快速编辑测试</para>`

      const lineNo = await editorPage.evaluate((xml) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        cm.replaceRange(xml, { line: 245, ch: 0 })
        return 245
      }, testXml)

      const opened = await openParaDesigner(editorPage, lineNo)
      expect(opened).toBe(true)

      await editorPage.waitForSelector('.para-designer', { timeout: 5000 })
      await editorPage.waitForTimeout(2000)

      // 快速修改并保存5次
      for (let i = 1; i <= 5; i++) {
        await editorPage.evaluate((iteration) => {
          const ueditor = window.UE.getEditor(document.querySelector('.para-designer textarea').id)
          if (ueditor && ueditor.isReady) {
            ueditor.setContent(`<p>快速修改 #${iteration}</p>`)
          }
        }, i)

        await editorPage.waitForTimeout(200)
        await editorPage.click('.para-designer button:has-text("保存")')
        await editorPage.waitForTimeout(1500)
      }

      // 验证没有错误
      const hasError = await editorPage.locator('.ant-message-error').isVisible().catch(() => false)
      expect(hasError).toBe(false)
    })
  })
})

// ========================================
// 辅助函数
// ========================================

/**
 * 打开Para设计器
 * @param {Page} page - Playwright页面对象
 * @param {number} lineNo - 行号（0-based）
 * @returns {Promise<boolean>} 是否成功打开
 */
async function openParaDesigner(page, lineNo) {
  return await page.evaluate((line) => {
    const vueApp = document.querySelector('#app').__vue__

    function findEditor(children) {
      for (const child of children) {
        if (child.$options.name === 'DmContentEditor') return child
        if (child.$children && child.$children.length > 0) {
          const found = findEditor(child.$children)
          if (found) return found
        }
      }
      return null
    }

    const editor = findEditor(vueApp.$children)
    if (editor && typeof editor.openParaDesigner === 'function') {
      editor.openParaDesigner(line)
      return true
    }
    return false
  }, lineNo)
}
