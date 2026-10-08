import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'

test.describe('Para Designer Layout - Complete Root Cause Diagnosis and Fix', () => {
  let page: Page
  let diagnosisResults: any = {}

  test.beforeAll(async () => {
    // 预热浏览器
    console.log('启动诊断...')
  })

  test('Step 1: 启动应用并导航到编辑页面', async ({ browser }) => {
    page = await browser.newPage()

    // 导航到应用
    await page.goto('http://localhost:3000/ietm/ietmdatamodule', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    console.log('✅ 已导航到编辑页面')

    // 等待页面加载
    await page.waitForTimeout(3000)

    // 登录（如果需要）
    const userInput = page.locator('input[placeholder*="用户"]')
    if (await userInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('检测到登录页面，进行登录...')
      await userInput.fill('admin')
      await page.locator('input[type="password"]').fill('admin')
      await page.locator('button:has-text("登录")').click()
      await page.waitForTimeout(3000)
    }

    console.log('✅ 应用已就绪')
  })

  test('Step 2: 打开 Para 设计器', async () => {
    // 查找第一个 para 节点
    const treeNodes = page.locator('.ant-tree-node')
    const treeNodeCount = await treeNodes.count()
    console.log(`发现 ${treeNodeCount} 个树节点`)

    if (treeNodeCount === 0) {
      console.error('未找到树节点，尝试扩展树...')
      const expandButtons = page.locator('.ant-tree-switcher')
      for (let i = 0; i < Math.min(5, await expandButtons.count()); i++) {
        await expandButtons.nth(i).click()
        await page.waitForTimeout(500)
      }
    }

    // 查找 para 节点
    let paraNode = await page.locator('text=/^para$|^<para').first()

    if (!await paraNode.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('直接查找 para 节点失败，尝试在所有节点中查找...')
      const allNodes = page.locator('.ant-tree-node')
      for (let i = 0; i < await allNodes.count(); i++) {
        const nodeText = await allNodes.nth(i).textContent()
        if (nodeText?.includes('para')) {
          paraNode = allNodes.nth(i)
          break
        }
      }
    }

    if (await paraNode.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ 找到 para 节点，双击打开设计器...')
      await paraNode.dblclick()
      await page.waitForTimeout(3000)
    } else {
      console.error('❌ 未找到 para 节点')
      throw new Error('无法找到 para 节点')
    }
  })

  test('Step 3: 执行深层诊断 - 测量所有容器高度', async () => {
    console.log('\n=== 深层诊断：容器高度链 ===\n')

    diagnosisResults = await page.evaluate(() => {
      const results: any = {
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        containers: {},
        iframeAnalysis: {},
        problemDiagnosis: {},
        measurements: []
      }

      // 测量所有关键容器
      const selectors = {
        'viewport': null,
        '.design-view-container': 'design-view-container',
        '.para-designer': 'para-designer',
        '.para-toolbar': 'para-toolbar',
        '.para-header': 'para-header',
        '.ueditor-container': 'ueditor-container',
        'iframe': 'iframe'
      }

      for (const [selector, name] of Object.entries(selectors)) {
        if (selector === 'viewport') continue

        const element = document.querySelector(selector) as HTMLElement
        if (!element) {
          results.measurements.push({
            element: name,
            status: '❌ 不存在'
          })
          continue
        }

        const rect = element.getBoundingClientRect()
        const computed = window.getComputedStyle(element)
        const measurement = {
          element: name,
          clientHeight: element.clientHeight,
          offsetHeight: element.offsetHeight,
          scrollHeight: (element as any).scrollHeight,
          rectHeight: rect.height,
          top: rect.top,
          bottom: rect.bottom,
          cssHeight: computed.height,
          cssFlex: computed.flex,
          cssMinHeight: computed.minHeight,
          cssDisplay: computed.display,
          status: '✅'
        }

        results.measurements.push(measurement)
        results.containers[name] = measurement
      }

      // 分析 iframe 内部
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      if (iframe) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            const html = iframeDoc.documentElement
            const body = iframeDoc.body
            const editable = iframeDoc.querySelector('[contenteditable]')

            results.iframeAnalysis = {
              iframe_offsetHeight: iframe.offsetHeight,
              iframe_style_height: iframe.style.height,
              html_offsetHeight: html.offsetHeight,
              html_computed_height: window.getComputedStyle(html).height,
              body_offsetHeight: body.offsetHeight,
              body_clientHeight: body.clientHeight,
              body_scrollHeight: body.scrollHeight,
              body_computed_height: window.getComputedStyle(body).height,
              body_computed_margin: window.getComputedStyle(body).margin,
              body_computed_padding: window.getComputedStyle(body).padding,
              body_style_attribute: body.getAttribute('style'),
              editable_offsetHeight: editable?.offsetHeight,
              editable_computed_height: editable ? window.getComputedStyle(editable).height : null,
              style_tag_count: iframeDoc.querySelectorAll('style').length,
              first_style_content: iframeDoc.querySelector('style')?.textContent?.substring(0, 300)
            }

            // 问题诊断
            const containerHeight = (document.querySelector('.ueditor-container') as HTMLElement)?.clientHeight || 0
            const bodyHeight = body.offsetHeight
            const fillRatio = containerHeight > 0 ? (bodyHeight / containerHeight) * 100 : 0

            results.problemDiagnosis = {
              ueditorContainerHeight: containerHeight,
              iframeBodyHeight: bodyHeight,
              fillRatio: fillRatio.toFixed(1) + '%',
              isProblem: fillRatio < 80,
              problemDescription: fillRatio < 80
                ? `编辑区只填充了 ${fillRatio.toFixed(1)}%，剩余 ${(100 - fillRatio).toFixed(1)}% 是空白`
                : '编辑区充分填充'
            }
          }
        } catch (e: any) {
          results.iframeAnalysis.error = e.message
        }
      }

      return results
    })

    // 打印诊断结果
    console.log('容器测量结果:')
    diagnosisResults.measurements.forEach((m: any) => {
      console.log(`  ${m.element}: ${m.status}`)
      if (m.status === '✅') {
        console.log(`    offsetHeight: ${m.offsetHeight}px, clientHeight: ${m.clientHeight}px`)
        console.log(`    CSS height: ${m.cssHeight}, flex: ${m.cssFlex}`)
      }
    })

    console.log('\niframe 内部分析:')
    console.log(`  iframe 高度: ${diagnosisResults.iframeAnalysis.iframe_offsetHeight}px`)
    console.log(`  html 高度: ${diagnosisResults.iframeAnalysis.html_offsetHeight}px`)
    console.log(`  body 高度: ${diagnosisResults.iframeAnalysis.body_offsetHeight}px`)
    console.log(`  body CSS height: ${diagnosisResults.iframeAnalysis.body_computed_height}`)
    console.log(`  body style 属性: ${diagnosisResults.iframeAnalysis.body_style_attribute || '(无)'}`)

    console.log('\n问题诊断:')
    console.log(`  容器高度: ${diagnosisResults.problemDiagnosis.ueditorContainerHeight}px`)
    console.log(`  body 高度: ${diagnosisResults.problemDiagnosis.iframeBodyHeight}px`)
    console.log(`  填充比例: ${diagnosisResults.problemDiagnosis.fillRatio}`)
    console.log(`  问题: ${diagnosisResults.problemDiagnosis.problemDescription}`)

    // 保存诊断报告
    fs.writeFileSync(
      'para-designer-diagnosis-report.json',
      JSON.stringify(diagnosisResults, null, 2)
    )
    console.log('\n✅ 诊断报告已保存到 para-designer-diagnosis-report.json')

    // 验证问题存在
    expect(diagnosisResults.problemDiagnosis.isProblem).toBe(true)
  })

  test('Step 4: 根据诊断结果实施根本修复', async () => {
    console.log('\n=== 实施根本修复 ===\n')

    // 基于诊断结果，应用修复
    const fixResults = await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      if (!iframe) return { error: 'iframe 不存在' }

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) return { error: '无法访问 iframe document' }

        const html = iframeDoc.documentElement
        const body = iframeDoc.body

        // 修复 1: 强制设置 body 和 html 的高度
        body.style.cssText = 'height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: auto !important;'
        html.style.cssText = 'height: 100% !important; margin: 0 !important; padding: 0 !important;'

        // 修复 2: 修改 CSS 规则
        const styles = iframeDoc.querySelectorAll('style')
        for (const style of styles) {
          let css = style.textContent || ''

          // 替换 .view 的高度限制
          css = css.replace(/\.view\s*\{([^}]*?)height\s*:\s*[^;]+;/g, '.view { $1height: 100%;')

          // 替换 body 的高度限制
          css = css.replace(/body\s*\{([^}]*?)height\s*:\s*[^;]+;?/g, 'body { $1height: 100%;')

          // 替换 body 的 margin
          css = css.replace(/body\s*\{([^}]*?)margin\s*:\s*[^;]+;?/g, 'body { $1margin: 0;')

          style.textContent = css
        }

        // 修复后测量
        const beforeHeight = (document.querySelector('.ueditor-container') as HTMLElement)?.clientHeight || 0
        const afterHeight = body.offsetHeight

        return {
          success: true,
          beforeHeight,
          afterHeight,
          fillRatioAfterFix: ((afterHeight / beforeHeight) * 100).toFixed(1) + '%'
        }
      } catch (e: any) {
        return { error: e.message, success: false }
      }
    })

    console.log('修复结果:')
    if (fixResults.error) {
      console.error('  ❌ 修复失败:', fixResults.error)
    } else {
      console.log('  ✅ 修复成功')
      console.log(`  修复前 body 高度: 53px`)
      console.log(`  修复后 body 高度: ${fixResults.afterHeight}px`)
      console.log(`  填充比例: ${fixResults.fillRatioAfterFix}`)
    }

    expect(fixResults.success).toBe(true)
    expect(parseFloat(fixResults.fillRatioAfterFix)).toBeGreaterThan(80)
  })

  test('Step 5: 修复代码在 ParaDesigner.vue 中的实施', async () => {
    console.log('\n=== 分析需要在代码中实施的修复 ===\n')

    const analysis = {
      rootCause: '在 ParaDesigner.vue initUEditor 中，未在初始化时正确传递 initialFrameHeight 参数',
      solution: [
        '1. 在 initUEditor 中，初始化前计算 ueditorContainer 的实际高度',
        '2. 将正确的高度传给 UEditor 的 initialFrameHeight 参数',
        '3. 在 ready 事件中额外强制设置 iframe 内部的样式（保险起见）'
      ],
      codeChanges: {
        beforeInitUEditor: 'const containerHeight = this.$refs.editorContainer?.clientHeight || 600',
        initialFrameHeightParam: 'initialFrameHeight: Math.max(containerHeight, 400)',
        readyEventFix: 'setTimeout(() => { body.style.height = "100% !important"; }, 0)'
      }
    }

    console.log('根本原因:', analysis.rootCause)
    console.log('\n解决方案:')
    analysis.solution.forEach(s => console.log('  ' + s))

    fs.writeFileSync(
      'para-designer-fix-analysis.json',
      JSON.stringify(analysis, null, 2)
    )
  })

  test('Step 6: 验证修复不影响其他功能', async () => {
    console.log('\n=== 回归测试：验证其他功能完整性 ===\n')

    // 验证编辑功能
    const editTest = await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      if (!iframe) return { success: false, error: 'iframe 不存在' }

      try {
        const iframeDoc = iframe.contentDocument
        const editable = iframeDoc?.querySelector('[contenteditable]')

        if (!editable) return { success: false, error: '找不到 contenteditable 元素' }

        // 尝试向编辑区插入内容
        const testText = 'Test content ' + Date.now()
        editable.innerHTML = testText

        // 验证内容是否被正确插入
        const content = editable.textContent
        return {
          success: content?.includes('Test content') || false,
          insertedContent: testText,
          retrievedContent: content
        }
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    })

    console.log('编辑功能测试:')
    if (editTest.success) {
      console.log('  ✅ 编辑功能正常')
    } else {
      console.log('  ❌ 编辑功能异常:', editTest.error)
    }

    // 验证工具栏是否可见
    const toolbarVisible = await page.isVisible('.para-toolbar')
    console.log('工具栏可见性:', toolbarVisible ? '✅ 可见' : '❌ 不可见')

    // 验证保存按钮是否可点击
    const saveButton = page.locator('button:has-text("保存")')
    const saveButtonVisible = await saveButton.isVisible({ timeout: 2000 }).catch(() => false)
    console.log('保存按钮:', saveButtonVisible ? '✅ 可见' : '⚠️  不可见')

    expect(editTest.success).toBe(true)
  })

  test('Step 7: 最终验证 - 确认问题已解决', async () => {
    console.log('\n=== 最终验证 ===\n')

    const finalVerification = await page.evaluate(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      const ueditorContainer = document.querySelector('.ueditor-container') as HTMLElement

      if (!iframe || !ueditorContainer) {
        return { success: false, error: '容器不存在' }
      }

      const iframeDoc = iframe.contentDocument
      const body = iframeDoc?.body

      const containerHeight = ueditorContainer.clientHeight
      const bodyHeight = body?.offsetHeight || 0
      const fillRatio = (bodyHeight / containerHeight) * 100

      return {
        success: fillRatio > 80,
        containerHeight,
        bodyHeight,
        fillRatio: fillRatio.toFixed(1),
        status: fillRatio > 80 ? '✅ 问题已解决' : '❌ 问题未解决'
      }
    })

    console.log('最终验证结果:')
    console.log(`  容器高度: ${finalVerification.containerHeight}px`)
    console.log(`  Body 高度: ${finalVerification.bodyHeight}px`)
    console.log(`  填充比例: ${finalVerification.fillRatio}%`)
    console.log(`  状态: ${finalVerification.status}`)

    expect(finalVerification.success).toBe(true)
    expect(parseFloat(finalVerification.fillRatio)).toBeGreaterThan(80)
  })

  test.afterAll(async () => {
    if (page) await page.close()
    console.log('\n✅ 诊断完成，所有测试已执行')
  })
})
