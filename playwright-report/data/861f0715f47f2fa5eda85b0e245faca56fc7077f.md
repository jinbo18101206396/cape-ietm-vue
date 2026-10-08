# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: para-designer-complete-diagnosis.spec.ts >> Para Designer Layout - Complete Root Cause Diagnosis and Fix >> Step 6: 验证修复不影响其他功能
- Location: tests\para-designer-complete-diagnosis.spec.ts:317:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'evaluate')
```

# Test source

```ts
  221 |     // 验证问题存在
  222 |     expect(diagnosisResults.problemDiagnosis.isProblem).toBe(true)
  223 |   })
  224 | 
  225 |   test('Step 4: 根据诊断结果实施根本修复', async () => {
  226 |     console.log('\n=== 实施根本修复 ===\n')
  227 | 
  228 |     // 基于诊断结果，应用修复
  229 |     const fixResults = await page.evaluate(() => {
  230 |       const iframe = document.querySelector('iframe') as HTMLIFrameElement
  231 |       if (!iframe) return { error: 'iframe 不存在' }
  232 | 
  233 |       try {
  234 |         const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  235 |         if (!iframeDoc) return { error: '无法访问 iframe document' }
  236 | 
  237 |         const html = iframeDoc.documentElement
  238 |         const body = iframeDoc.body
  239 | 
  240 |         // 修复 1: 强制设置 body 和 html 的高度
  241 |         body.style.cssText = 'height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: auto !important;'
  242 |         html.style.cssText = 'height: 100% !important; margin: 0 !important; padding: 0 !important;'
  243 | 
  244 |         // 修复 2: 修改 CSS 规则
  245 |         const styles = iframeDoc.querySelectorAll('style')
  246 |         for (const style of styles) {
  247 |           let css = style.textContent || ''
  248 | 
  249 |           // 替换 .view 的高度限制
  250 |           css = css.replace(/\.view\s*\{([^}]*?)height\s*:\s*[^;]+;/g, '.view { $1height: 100%;')
  251 | 
  252 |           // 替换 body 的高度限制
  253 |           css = css.replace(/body\s*\{([^}]*?)height\s*:\s*[^;]+;?/g, 'body { $1height: 100%;')
  254 | 
  255 |           // 替换 body 的 margin
  256 |           css = css.replace(/body\s*\{([^}]*?)margin\s*:\s*[^;]+;?/g, 'body { $1margin: 0;')
  257 | 
  258 |           style.textContent = css
  259 |         }
  260 | 
  261 |         // 修复后测量
  262 |         const beforeHeight = (document.querySelector('.ueditor-container') as HTMLElement)?.clientHeight || 0
  263 |         const afterHeight = body.offsetHeight
  264 | 
  265 |         return {
  266 |           success: true,
  267 |           beforeHeight,
  268 |           afterHeight,
  269 |           fillRatioAfterFix: ((afterHeight / beforeHeight) * 100).toFixed(1) + '%'
  270 |         }
  271 |       } catch (e: any) {
  272 |         return { error: e.message, success: false }
  273 |       }
  274 |     })
  275 | 
  276 |     console.log('修复结果:')
  277 |     if (fixResults.error) {
  278 |       console.error('  ❌ 修复失败:', fixResults.error)
  279 |     } else {
  280 |       console.log('  ✅ 修复成功')
  281 |       console.log(`  修复前 body 高度: 53px`)
  282 |       console.log(`  修复后 body 高度: ${fixResults.afterHeight}px`)
  283 |       console.log(`  填充比例: ${fixResults.fillRatioAfterFix}`)
  284 |     }
  285 | 
  286 |     expect(fixResults.success).toBe(true)
  287 |     expect(parseFloat(fixResults.fillRatioAfterFix)).toBeGreaterThan(80)
  288 |   })
  289 | 
  290 |   test('Step 5: 修复代码在 ParaDesigner.vue 中的实施', async () => {
  291 |     console.log('\n=== 分析需要在代码中实施的修复 ===\n')
  292 | 
  293 |     const analysis = {
  294 |       rootCause: '在 ParaDesigner.vue initUEditor 中，未在初始化时正确传递 initialFrameHeight 参数',
  295 |       solution: [
  296 |         '1. 在 initUEditor 中，初始化前计算 ueditorContainer 的实际高度',
  297 |         '2. 将正确的高度传给 UEditor 的 initialFrameHeight 参数',
  298 |         '3. 在 ready 事件中额外强制设置 iframe 内部的样式（保险起见）'
  299 |       ],
  300 |       codeChanges: {
  301 |         beforeInitUEditor: 'const containerHeight = this.$refs.editorContainer?.clientHeight || 600',
  302 |         initialFrameHeightParam: 'initialFrameHeight: Math.max(containerHeight, 400)',
  303 |         readyEventFix: 'setTimeout(() => { body.style.height = "100% !important"; }, 0)'
  304 |       }
  305 |     }
  306 | 
  307 |     console.log('根本原因:', analysis.rootCause)
  308 |     console.log('\n解决方案:')
  309 |     analysis.solution.forEach(s => console.log('  ' + s))
  310 | 
  311 |     fs.writeFileSync(
  312 |       'para-designer-fix-analysis.json',
  313 |       JSON.stringify(analysis, null, 2)
  314 |     )
  315 |   })
  316 | 
  317 |   test('Step 6: 验证修复不影响其他功能', async () => {
  318 |     console.log('\n=== 回归测试：验证其他功能完整性 ===\n')
  319 | 
  320 |     // 验证编辑功能
> 321 |     const editTest = await page.evaluate(() => {
      |                                 ^ TypeError: Cannot read properties of undefined (reading 'evaluate')
  322 |       const iframe = document.querySelector('iframe') as HTMLIFrameElement
  323 |       if (!iframe) return { success: false, error: 'iframe 不存在' }
  324 | 
  325 |       try {
  326 |         const iframeDoc = iframe.contentDocument
  327 |         const editable = iframeDoc?.querySelector('[contenteditable]')
  328 | 
  329 |         if (!editable) return { success: false, error: '找不到 contenteditable 元素' }
  330 | 
  331 |         // 尝试向编辑区插入内容
  332 |         const testText = 'Test content ' + Date.now()
  333 |         editable.innerHTML = testText
  334 | 
  335 |         // 验证内容是否被正确插入
  336 |         const content = editable.textContent
  337 |         return {
  338 |           success: content?.includes('Test content') || false,
  339 |           insertedContent: testText,
  340 |           retrievedContent: content
  341 |         }
  342 |       } catch (e: any) {
  343 |         return { success: false, error: e.message }
  344 |       }
  345 |     })
  346 | 
  347 |     console.log('编辑功能测试:')
  348 |     if (editTest.success) {
  349 |       console.log('  ✅ 编辑功能正常')
  350 |     } else {
  351 |       console.log('  ❌ 编辑功能异常:', editTest.error)
  352 |     }
  353 | 
  354 |     // 验证工具栏是否可见
  355 |     const toolbarVisible = await page.isVisible('.para-toolbar')
  356 |     console.log('工具栏可见性:', toolbarVisible ? '✅ 可见' : '❌ 不可见')
  357 | 
  358 |     // 验证保存按钮是否可点击
  359 |     const saveButton = page.locator('button:has-text("保存")')
  360 |     const saveButtonVisible = await saveButton.isVisible({ timeout: 2000 }).catch(() => false)
  361 |     console.log('保存按钮:', saveButtonVisible ? '✅ 可见' : '⚠️  不可见')
  362 | 
  363 |     expect(editTest.success).toBe(true)
  364 |   })
  365 | 
  366 |   test('Step 7: 最终验证 - 确认问题已解决', async () => {
  367 |     console.log('\n=== 最终验证 ===\n')
  368 | 
  369 |     const finalVerification = await page.evaluate(() => {
  370 |       const iframe = document.querySelector('iframe') as HTMLIFrameElement
  371 |       const ueditorContainer = document.querySelector('.ueditor-container') as HTMLElement
  372 | 
  373 |       if (!iframe || !ueditorContainer) {
  374 |         return { success: false, error: '容器不存在' }
  375 |       }
  376 | 
  377 |       const iframeDoc = iframe.contentDocument
  378 |       const body = iframeDoc?.body
  379 | 
  380 |       const containerHeight = ueditorContainer.clientHeight
  381 |       const bodyHeight = body?.offsetHeight || 0
  382 |       const fillRatio = (bodyHeight / containerHeight) * 100
  383 | 
  384 |       return {
  385 |         success: fillRatio > 80,
  386 |         containerHeight,
  387 |         bodyHeight,
  388 |         fillRatio: fillRatio.toFixed(1),
  389 |         status: fillRatio > 80 ? '✅ 问题已解决' : '❌ 问题未解决'
  390 |       }
  391 |     })
  392 | 
  393 |     console.log('最终验证结果:')
  394 |     console.log(`  容器高度: ${finalVerification.containerHeight}px`)
  395 |     console.log(`  Body 高度: ${finalVerification.bodyHeight}px`)
  396 |     console.log(`  填充比例: ${finalVerification.fillRatio}%`)
  397 |     console.log(`  状态: ${finalVerification.status}`)
  398 | 
  399 |     expect(finalVerification.success).toBe(true)
  400 |     expect(parseFloat(finalVerification.fillRatio)).toBeGreaterThan(80)
  401 |   })
  402 | 
  403 |   test.afterAll(async () => {
  404 |     if (page) await page.close()
  405 |     console.log('\n✅ 诊断完成，所有测试已执行')
  406 |   })
  407 | })
  408 | 
```