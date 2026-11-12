/**
 * ParaDesigner 修复验证测试
 *
 * 问题：点击第69行铅笔图标报错 "Cannot read properties of undefined (reading 'dom')"
 * 根因：CodeMirror 实例未就绪时就调用 getLine() 方法
 * 修复：
 *   1. ParaDesigner.setcontent() 增加防御性检查
 *   2. DmContentEditor._openParaDesigner() 等待 CodeMirror 就绪
 */

const { test, expect } = require('@playwright/test')

test.describe('ParaDesigner 编辑器就绪性修复', () => {
  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间，因为页面可能需要时间加载
    test.setTimeout(60000)

    // 导航到测试页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2120391209032593409?mode=edit&dmc=DMC-ZB1-A-01-00-00-00A-007A-A_001-02_zh-CN')

    // 等待页面主要内容加载完成
    await page.waitForLoadState('networkidle')

    // 等待编辑器容器出现
    await page.waitForSelector('.dm-editor-page', { timeout: 10000 })
  })

  test('应该能正常打开第69行的para设计器而不报错', async ({ page }) => {
    // 监听控制台错误
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 监听页面错误
    const pageErrors = []
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })

    // 等待 CodeMirror 编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })
    console.log('✓ CodeMirror 编辑器已加载')

    // 等待源码视图中的内容出现
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.lineCount() > 0
    }, { timeout: 10000 })
    console.log('✓ 源码内容已加载')

    // 滚动到第69行附近
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.scrollIntoView({ line: 69, ch: 0 })
    })
    console.log('✓ 已滚动到第69行')

    // 等待一下确保 gutter 图标渲染完成
    await page.waitForTimeout(1000)

    // 查找第69行的 para 元素
    const line69Text = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm.getLine(68) // 0-based index
    })
    console.log('第69行内容:', line69Text)

    // 点击第69行的 gutter（铅笔图标）
    // CodeMirror 的行号是从0开始的，所以第69行是索引68
    try {
      // 尝试点击 dmGutter 中的铅笔图标
      const gutterClicked = await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror').CodeMirror
        const lineNo = 68 // 第69行 (0-based)

        // 查找这一行的 gutter 元素
        const gutterElement = document.querySelector(`.CodeMirror-gutter-wrapper[style*="top: ${lineNo * 20}px"]`)
        if (!gutterElement) {
          console.log('未找到 gutter 元素')
          return false
        }

        // 模拟点击 gutter
        const dmGutter = document.querySelector('.CodeMirror-gutter.dmGutter')
        if (!dmGutter) {
          console.log('未找到 dmGutter')
          return false
        }

        // 触发 gutterClick 事件
        cm.constructor.signal(cm, 'gutterClick', cm, lineNo, 'dmGutter', new MouseEvent('click'))
        return true
      })

      if (!gutterClicked) {
        console.warn('⚠ 无法通过脚本点击 gutter，尝试手动定位并点击')

        // 备用方案：直接调用打开设计器的方法
        await page.evaluate(() => {
          const app = document.querySelector('#app').__vue__
          const editor = app.$children.find(c => c.$options.name === 'DmContentEditor')
          if (editor) {
            editor._openParaDesigner(68) // 第69行 (0-based)
          }
        })
      }

      console.log('✓ 已触发打开 para 设计器')

      // 等待设计视图切换
      await page.waitForTimeout(2000)

      // 等待设计器容器出现
      await page.waitForSelector('.para-designer', { timeout: 10000 })
      console.log('✓ Para 设计器容器已出现')

      // 等待 UEditor 加载
      await page.waitForSelector('.edui-editor', { timeout: 10000 })
      console.log('✓ UEditor 已加载')

      // 检查是否有错误消息
      const errorMessages = await page.evaluate(() => {
        const messages = []
        document.querySelectorAll('.ant-message-error').forEach(el => {
          messages.push(el.textContent)
        })
        return messages
      })

      console.log('页面错误消息:', errorMessages)
      console.log('控制台错误:', consoleErrors)
      console.log('页面异常:', pageErrors)

      // 验证没有 "加载内容失败" 的错误
      expect(errorMessages.join(' ')).not.toContain('加载内容失败')

      // 验证没有 "Cannot read properties of undefined" 错误
      const hasUndefinedError = [...consoleErrors, ...pageErrors].some(
        err => err.includes('Cannot read properties of undefined') && err.includes('dom')
      )
      expect(hasUndefinedError).toBe(false)

      // 验证 UEditor 内容已加载
      const hasContent = await page.evaluate(() => {
        const editor = document.querySelector('.edui-editor iframe')
        if (!editor) return false

        const doc = editor.contentDocument || editor.contentWindow.document
        return doc.body && doc.body.innerHTML.trim().length > 0
      })

      expect(hasContent).toBe(true)
      console.log('✓ UEditor 内容已正常加载')

    } catch (error) {
      console.error('测试失败:', error)

      // 截图保存错误状态
      await page.screenshot({ path: 'para-designer-error.png', fullPage: true })
      console.log('✓ 已保存错误截图: para-designer-error.png')

      throw error
    }
  })

  test('应该在 CodeMirror 未就绪时显示友好提示', async ({ page }) => {
    // 这个测试验证防御性检查是否工作

    // 等待页面加载
    await page.waitForSelector('.dm-editor-page', { timeout: 10000 })

    // 模拟 CodeMirror 未就绪的情况
    const result = await page.evaluate(() => {
      const app = document.querySelector('#app').__vue__
      const editor = app.$children.find(c => c.$options.name === 'DmContentEditor')

      if (!editor) return { success: false, error: '未找到编辑器组件' }

      // 临时清空 CodeMirror 实例
      const originalCm = editor.$refs.editor.cm
      editor.$refs.editor.cm = null

      // 尝试打开设计器
      editor._openParaDesigner(68)

      // 等待一下
      return new Promise(resolve => {
        setTimeout(() => {
          // 恢复 CodeMirror 实例
          editor.$refs.editor.cm = originalCm
          resolve({ success: true })
        }, 2000)
      })
    })

    expect(result.success).toBe(true)

    // 等待错误消息出现
    await page.waitForTimeout(500)

    // 检查是否显示了友好的错误提示
    const errorMessages = await page.evaluate(() => {
      const messages = []
      document.querySelectorAll('.ant-message-error, .ant-message-warning').forEach(el => {
        messages.push(el.textContent)
      })
      return messages
    })

    console.log('错误提示消息:', errorMessages)

    // 应该有错误提示，但不是原始的 undefined 错误
    const hasUndefinedError = errorMessages.some(
      msg => msg.includes('Cannot read properties of undefined')
    )
    expect(hasUndefinedError).toBe(false)

    // 应该有友好的提示
    const hasFriendlyMessage = errorMessages.some(
      msg => msg.includes('编辑器未就绪') || msg.includes('请稍后重试')
    )
    expect(hasFriendlyMessage).toBe(true)

    console.log('✓ 防御性检查工作正常')
  })
})
