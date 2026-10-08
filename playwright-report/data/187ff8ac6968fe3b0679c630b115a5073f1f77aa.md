# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: para-designer-complete-diagnosis.spec.ts >> Para Designer Layout - Complete Root Cause Diagnosis and Fix >> Step 4: 根据诊断结果实施根本修复
- Location: tests\para-designer-complete-diagnosis.spec.ts:225:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'evaluate')
```

# Test source

```ts
  129 |           cssHeight: computed.height,
  130 |           cssFlex: computed.flex,
  131 |           cssMinHeight: computed.minHeight,
  132 |           cssDisplay: computed.display,
  133 |           status: '✅'
  134 |         }
  135 | 
  136 |         results.measurements.push(measurement)
  137 |         results.containers[name] = measurement
  138 |       }
  139 | 
  140 |       // 分析 iframe 内部
  141 |       const iframe = document.querySelector('iframe') as HTMLIFrameElement
  142 |       if (iframe) {
  143 |         try {
  144 |           const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  145 |           if (iframeDoc) {
  146 |             const html = iframeDoc.documentElement
  147 |             const body = iframeDoc.body
  148 |             const editable = iframeDoc.querySelector('[contenteditable]')
  149 | 
  150 |             results.iframeAnalysis = {
  151 |               iframe_offsetHeight: iframe.offsetHeight,
  152 |               iframe_style_height: iframe.style.height,
  153 |               html_offsetHeight: html.offsetHeight,
  154 |               html_computed_height: window.getComputedStyle(html).height,
  155 |               body_offsetHeight: body.offsetHeight,
  156 |               body_clientHeight: body.clientHeight,
  157 |               body_scrollHeight: body.scrollHeight,
  158 |               body_computed_height: window.getComputedStyle(body).height,
  159 |               body_computed_margin: window.getComputedStyle(body).margin,
  160 |               body_computed_padding: window.getComputedStyle(body).padding,
  161 |               body_style_attribute: body.getAttribute('style'),
  162 |               editable_offsetHeight: editable?.offsetHeight,
  163 |               editable_computed_height: editable ? window.getComputedStyle(editable).height : null,
  164 |               style_tag_count: iframeDoc.querySelectorAll('style').length,
  165 |               first_style_content: iframeDoc.querySelector('style')?.textContent?.substring(0, 300)
  166 |             }
  167 | 
  168 |             // 问题诊断
  169 |             const containerHeight = (document.querySelector('.ueditor-container') as HTMLElement)?.clientHeight || 0
  170 |             const bodyHeight = body.offsetHeight
  171 |             const fillRatio = containerHeight > 0 ? (bodyHeight / containerHeight) * 100 : 0
  172 | 
  173 |             results.problemDiagnosis = {
  174 |               ueditorContainerHeight: containerHeight,
  175 |               iframeBodyHeight: bodyHeight,
  176 |               fillRatio: fillRatio.toFixed(1) + '%',
  177 |               isProblem: fillRatio < 80,
  178 |               problemDescription: fillRatio < 80
  179 |                 ? `编辑区只填充了 ${fillRatio.toFixed(1)}%，剩余 ${(100 - fillRatio).toFixed(1)}% 是空白`
  180 |                 : '编辑区充分填充'
  181 |             }
  182 |           }
  183 |         } catch (e: any) {
  184 |           results.iframeAnalysis.error = e.message
  185 |         }
  186 |       }
  187 | 
  188 |       return results
  189 |     })
  190 | 
  191 |     // 打印诊断结果
  192 |     console.log('容器测量结果:')
  193 |     diagnosisResults.measurements.forEach((m: any) => {
  194 |       console.log(`  ${m.element}: ${m.status}`)
  195 |       if (m.status === '✅') {
  196 |         console.log(`    offsetHeight: ${m.offsetHeight}px, clientHeight: ${m.clientHeight}px`)
  197 |         console.log(`    CSS height: ${m.cssHeight}, flex: ${m.cssFlex}`)
  198 |       }
  199 |     })
  200 | 
  201 |     console.log('\niframe 内部分析:')
  202 |     console.log(`  iframe 高度: ${diagnosisResults.iframeAnalysis.iframe_offsetHeight}px`)
  203 |     console.log(`  html 高度: ${diagnosisResults.iframeAnalysis.html_offsetHeight}px`)
  204 |     console.log(`  body 高度: ${diagnosisResults.iframeAnalysis.body_offsetHeight}px`)
  205 |     console.log(`  body CSS height: ${diagnosisResults.iframeAnalysis.body_computed_height}`)
  206 |     console.log(`  body style 属性: ${diagnosisResults.iframeAnalysis.body_style_attribute || '(无)'}`)
  207 | 
  208 |     console.log('\n问题诊断:')
  209 |     console.log(`  容器高度: ${diagnosisResults.problemDiagnosis.ueditorContainerHeight}px`)
  210 |     console.log(`  body 高度: ${diagnosisResults.problemDiagnosis.iframeBodyHeight}px`)
  211 |     console.log(`  填充比例: ${diagnosisResults.problemDiagnosis.fillRatio}`)
  212 |     console.log(`  问题: ${diagnosisResults.problemDiagnosis.problemDescription}`)
  213 | 
  214 |     // 保存诊断报告
  215 |     fs.writeFileSync(
  216 |       'para-designer-diagnosis-report.json',
  217 |       JSON.stringify(diagnosisResults, null, 2)
  218 |     )
  219 |     console.log('\n✅ 诊断报告已保存到 para-designer-diagnosis-report.json')
  220 | 
  221 |     // 验证问题存在
  222 |     expect(diagnosisResults.problemDiagnosis.isProblem).toBe(true)
  223 |   })
  224 | 
  225 |   test('Step 4: 根据诊断结果实施根本修复', async () => {
  226 |     console.log('\n=== 实施根本修复 ===\n')
  227 | 
  228 |     // 基于诊断结果，应用修复
> 229 |     const fixResults = await page.evaluate(() => {
      |                                   ^ TypeError: Cannot read properties of undefined (reading 'evaluate')
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
  321 |     const editTest = await page.evaluate(() => {
  322 |       const iframe = document.querySelector('iframe') as HTMLIFrameElement
  323 |       if (!iframe) return { success: false, error: 'iframe 不存在' }
  324 | 
  325 |       try {
  326 |         const iframeDoc = iframe.contentDocument
  327 |         const editable = iframeDoc?.querySelector('[contenteditable]')
  328 | 
  329 |         if (!editable) return { success: false, error: '找不到 contenteditable 元素' }
```