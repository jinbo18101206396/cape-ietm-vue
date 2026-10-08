import { test, expect } from '@playwright/test'

/**
 * Para 设计视图编辑区空白问题诊断测试
 * 目标：系统化诊断问题的真实原因
 */

test.describe('Para Designer Layout Diagnosis', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到编辑页面
    await page.goto('http://localhost:3000/ietm')
    await page.waitForTimeout(2000)

    // 登录如果需要
    const loginButton = page.locator('input[placeholder*="用户"]')
    if (await loginButton.isVisible()) {
      await loginButton.fill('admin')
      await page.locator('input[type="password"]').fill('admin')
      await page.locator('button:has-text("登录")').click()
      await page.waitForTimeout(2000)
    }
  })

  test('深层诊断：容器高度计算链', async ({ page }) => {
    console.log('\n=== 第一步：打开 Para 设计器 ===')

    // 点击数据模块列表中的一条
    const dataModuleRow = page.locator('table tbody tr').first()
    await dataModuleRow.click()
    await page.waitForTimeout(1000)

    // 双击树中的 para 节点打开设计器
    const paraNode = page.locator('.ant-tree-node').filter({ hasText: /para|<para/ }).first()
    if (await paraNode.isVisible()) {
      await paraNode.dblclick()
      await page.waitForTimeout(2000)
    }

    console.log('✅ Para 设计器已打开')

    // 运行深层诊断脚本
    const diagnosis = await page.evaluate(() => {
      const results = {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        containers: {},
        iframe: {},
        iframeInternal: {}
      }

      // 1. 查找容器层级
      const designViewContainer = document.querySelector('.design-view-container')
      const paraDesigner = document.querySelector('.para-designer')
      const ueditorContainer = document.querySelector('.ueditor-container')
      const iframe = document.querySelector('iframe') as HTMLIFrameElement

      if (designViewContainer) {
        const rect = designViewContainer.getBoundingClientRect()
        results.containers['designViewContainer'] = {
          clientHeight: (designViewContainer as HTMLElement).clientHeight,
          offsetHeight: (designViewContainer as HTMLElement).offsetHeight,
          scrollHeight: (designViewContainer as HTMLElement).scrollHeight,
          computedHeight: window.getComputedStyle(designViewContainer).height,
          computedFlex: window.getComputedStyle(designViewContainer).flex,
          rect: { top: rect.top, bottom: rect.bottom, height: rect.height }
        }
      }

      if (paraDesigner) {
        const rect = paraDesigner.getBoundingClientRect()
        results.containers['paraDesigner'] = {
          clientHeight: (paraDesigner as HTMLElement).clientHeight,
          offsetHeight: (paraDesigner as HTMLElement).offsetHeight,
          computedHeight: window.getComputedStyle(paraDesigner).height,
          computedFlex: window.getComputedStyle(paraDesigner).flex,
          computedMinHeight: window.getComputedStyle(paraDesigner).minHeight,
          rect: { top: rect.top, bottom: rect.bottom, height: rect.height }
        }
      }

      if (ueditorContainer) {
        const rect = ueditorContainer.getBoundingClientRect()
        results.containers['ueditorContainer'] = {
          clientHeight: (ueditorContainer as HTMLElement).clientHeight,
          offsetHeight: (ueditorContainer as HTMLElement).offsetHeight,
          computedHeight: window.getComputedStyle(ueditorContainer).height,
          computedFlex: window.getComputedStyle(ueditorContainer).flex,
          computedMinHeight: window.getComputedStyle(ueditorContainer).minHeight,
          rect: { top: rect.top, bottom: rect.bottom, height: rect.height }
        }
      }

      // 2. 查找 iframe
      if (iframe) {
        results.iframe = {
          width: iframe.width,
          height: iframe.height,
          style_width: iframe.style.width,
          style_height: iframe.style.height,
          offsetHeight: iframe.offsetHeight,
          clientHeight: iframe.clientHeight,
          computedHeight: window.getComputedStyle(iframe).height,
          computedFlex: window.getComputedStyle(iframe).flex
        }

        // 3. 查找 iframe 内部结构
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            const body = iframeDoc.body
            const html = iframeDoc.documentElement

            results.iframeInternal = {
              html: {
                offsetHeight: html.offsetHeight,
                clientHeight: html.clientHeight,
                computedHeight: window.getComputedStyle(html).height,
                computedMargin: window.getComputedStyle(html).margin,
                computedPadding: window.getComputedStyle(html).padding
              },
              body: {
                offsetHeight: body.offsetHeight,
                clientHeight: body.clientHeight,
                scrollHeight: body.scrollHeight,
                computedHeight: window.getComputedStyle(body).height,
                computedMargin: window.getComputedStyle(body).margin,
                computedPadding: window.getComputedStyle(body).padding,
                computedOverflow: window.getComputedStyle(body).overflow
              },
              styleTag: {
                count: iframeDoc.querySelectorAll('style').length,
                firstContent: iframeDoc.querySelector('style')?.textContent?.substring(0, 300)
              },
              editableContent: {
                height: iframeDoc.querySelector('[contenteditable]')?.offsetHeight,
                scrollHeight: iframeDoc.querySelector('[contenteditable]')?.scrollHeight
              }
            }
          }
        } catch (e) {
          results.iframeInternal.error = (e as Error).message
        }
      }

      return results
    })

    console.log('\n=== 诊断结果 ===')
    console.log('视口尺寸:', diagnosis.viewport)
    console.log('\n容器层级:')
    Object.entries(diagnosis.containers).forEach(([name, data]) => {
      console.log(`\n${name}:`, data)
    })
    console.log('\niframe 外部:', diagnosis.iframe)
    console.log('\niframe 内部:', diagnosis.iframeInternal)

    // 保存诊断结果供后续分析
    await page.context().storageState({ path: 'diagnosis-result.json' })
  })

  test('验证修复：编辑区应该充满容器', async ({ page }) => {
    console.log('\n=== 第二步：验证修复效果 ===')

    // 打开 Para 设计器
    const paraNode = page.locator('.ant-tree-node').filter({ hasText: /para|<para/ }).first()
    if (await paraNode.isVisible()) {
      await paraNode.dblclick()
      await page.waitForTimeout(2000)
    }

    const verification = await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      const ueditorContainer = document.querySelector('.ueditor-container') as HTMLElement

      if (!iframe || !ueditorContainer) {
        return { success: false, error: 'iframe 或 ueditorContainer 不存在' }
      }

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        const body = iframeDoc?.body
        const html = iframeDoc?.documentElement

        if (!body || !html) {
          return { success: false, error: 'iframe 内部 body 或 html 不存在' }
        }

        const containerHeight = ueditorContainer.clientHeight
        const bodyHeight = body.offsetHeight
        const htmlHeight = html.offsetHeight

        // 理想情况：body 高度应该等于容器高度或接近
        const fillRatio = bodyHeight / containerHeight
        const isOK = fillRatio > 0.9 // 至少填充 90%

        return {
          success: isOK,
          containerHeight,
          bodyHeight,
          htmlHeight,
          fillRatio: (fillRatio * 100).toFixed(1) + '%',
          status: isOK ? '✅ 编辑区充分填充' : '❌ 编辑区未充分填充'
        }
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }
    })

    console.log('\n验证结果:', verification)

    // 断言
    expect(verification.success).toBe(true)
  })

  test('深度追踪：UEditor 初始化参数', async ({ page }) => {
    console.log('\n=== 第三步：追踪 UEditor 初始化 ===')

    // 在页面加载前注入日志代码
    await page.evaluateOnNewDocument(() => {
      (window as any).ueditorInitLog = {
        configParams: [],
        iframeCreated: []
      }

      // 劫持 UE.getEditor
      const originalGetEditor = (window as any).UE?.getEditor
      if (originalGetEditor) {
        (window as any).UE.getEditor = function(id: string, config: any) {
          console.log('[INTERCEPT] UE.getEditor called with config:', config)
          ;(window as any).ueditorInitLog.configParams.push({
            id,
            initialFrameHeight: config.initialFrameHeight,
            initialFrameWidth: config.initialFrameWidth,
            toolbars: config.toolbars ? 'defined' : 'undefined'
          })
          return originalGetEditor.call(this, id, config)
        }
      }
    })

    // 导航到页面
    await page.goto('http://localhost:3000/ietm')
    await page.waitForTimeout(2000)

    // 打开 Para 设计器
    const paraNode = page.locator('.ant-tree-node').filter({ hasText: /para|<para/ }).first()
    if (await paraNode.isVisible()) {
      await paraNode.dblclick()
      await page.waitForTimeout(2000)
    }

    // 获取初始化日志
    const initLog = await page.evaluate(() => (window as any).ueditorInitLog)
    console.log('\nUEditor 初始化日志:', initLog)
  })
})
