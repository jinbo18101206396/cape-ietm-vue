# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\mainprocedure-dialog-regression.spec.js >> MainProcedureDesigner 对话框回归测试 >> P2-2: 表格Tab - 增加弹出框正常工作
- Location: tests\mainprocedure-dialog-regression.spec.js:336:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('.ant-tabs-tab:has-text("表格")').first()

```

# Test source

```ts
  238 |     expect(await countModals(page)).toBeLessThan(after)
  239 |     console.log('✅ P0-4 通过')
  240 |   })
  241 | 
  242 |   // ── P0-5 ─────────────────────────────────────────────────────────────────
  243 |   test('P0-5: 对话框关闭后可重新打开（状态正确重置）', async ({ page }) => {
  244 |     await openEditorForTab(page, '警告')
  245 | 
  246 |     // 第一次打开 → 关闭
  247 |     await clickUEditorButton(page, '内部引用')
  248 |     await page.waitForTimeout(500)
  249 |     const firstOpen = await countModals(page)
  250 |     expect(firstOpen).toBeGreaterThan(0)
  251 |     await closeTopModal(page)
  252 |     await page.waitForTimeout(400)
  253 | 
  254 |     // 第二次打开
  255 |     await clickUEditorButton(page, '内部引用')
  256 |     await page.waitForTimeout(500)
  257 |     const secondOpen = await countModals(page)
  258 |     expect(secondOpen, '第二次打开失败').toBeGreaterThan(0)
  259 |     await ss(page, 'p0-5-reopen')
  260 |     console.log('✅ P0-5 通过')
  261 |   })
  262 | 
  263 |   // ── P0-6 ─────────────────────────────────────────────────────────────────
  264 |   test('P0-6: 多个Tab（警告/注意/段落/注）均可使用内部引用按钮', async ({ page }) => {
  265 |     for (const tab of ['警告', '注意', '段落', '注']) {
  266 |       console.log(`  测试 Tab: ${tab}`)
  267 | 
  268 |       await openEditorForTab(page, tab)
  269 |       await clickUEditorButton(page, '内部引用')
  270 |       await page.waitForTimeout(500)
  271 | 
  272 |       const count = await countModals(page)
  273 |       expect(count, `${tab} Tab：内部引用对话框未弹出`).toBeGreaterThan(0)
  274 |       await ss(page, `p0-6-${tab}`)
  275 | 
  276 |       // 关闭所有对话框
  277 |       await closeTopModal(page)  // 内部引用
  278 |       await page.waitForTimeout(300)
  279 |       await closeTopModal(page)  // 编辑器
  280 |       await page.waitForTimeout(500)
  281 |     }
  282 |     console.log('✅ P0-6 通过')
  283 |   })
  284 | 
  285 |   // ── P1-1（性能）────────────────────────────────────────────────────────────
  286 |   test('P1-1: 控制台无 Vue 响应式警告/错误（无双重 visible 更新）', async ({ page }) => {
  287 |     const errors = []
  288 |     page.on('console', msg => {
  289 |       if (msg.type() === 'error') errors.push(msg.text())
  290 |     })
  291 | 
  292 |     await openEditorForTab(page, '警告')
  293 | 
  294 |     // 完整生命周期：打开 → 关闭 → 重新打开 → 关闭
  295 |     await clickUEditorButton(page, '内部引用')
  296 |     await page.waitForTimeout(500)
  297 |     await closeTopModal(page)
  298 |     await page.waitForTimeout(300)
  299 |     await clickUEditorButton(page, '内部引用')
  300 |     await page.waitForTimeout(500)
  301 |     await closeTopModal(page)
  302 | 
  303 |     // 过滤无关噪音（ResizeObserver、favicon 等）
  304 |     const relevant = errors.filter(e =>
  305 |       !e.includes('ResizeObserver') &&
  306 |       !e.includes('favicon') &&
  307 |       !e.includes('net::ERR_') &&
  308 |       !e.includes('404')
  309 |     )
  310 |     console.log(`相关错误数: ${relevant.length}`)
  311 |     if (relevant.length > 0) console.log('错误详情:', relevant)
  312 |     expect(relevant.length, '存在控制台错误:\n' + relevant.join('\n')).toBe(0)
  313 |     console.log('✅ P1-1 通过')
  314 |   })
  315 | 
  316 |   // ── P2-1（稳定性）──────────────────────────────────────────────────────────
  317 |   test('P2-1: 重复打开关闭 10 次 - 无残留对话框', async ({ page }) => {
  318 |     await openEditorForTab(page, '警告')
  319 | 
  320 |     for (let i = 0; i < 10; i++) {
  321 |       await clickUEditorButton(page, '内部引用')
  322 |       await page.waitForTimeout(250)
  323 |       await page.keyboard.press('Escape')
  324 |       await page.waitForTimeout(250)
  325 |     }
  326 | 
  327 |     await ss(page, 'p2-1-after-10-cycles')
  328 |     const remaining = await countModals(page)
  329 |     console.log(`10次循环后可见对话框数: ${remaining}（期望 ≤ 1）`)
  330 |     // 只剩下内容编辑器本身（1个），无多余残留
  331 |     expect(remaining, '存在残留对话框').toBeLessThanOrEqual(1)
  332 |     console.log('✅ P2-1 通过')
  333 |   })
  334 | 
  335 |   // ── P2-2（表格编辑器）──────────────────────────────────────────────────────
  336 |   test('P2-2: 表格Tab - 增加弹出框正常工作', async ({ page }) => {
  337 |     // 表格 Tab
> 338 |     await page.locator('.ant-tabs-tab:has-text("表格")').first().click()
      |                                                                ^ Error: locator.click: Target page, context or browser has been closed
  339 |     await page.waitForTimeout(400)
  340 |     await ss(page, 'p2-2-table-tab')
  341 | 
  342 |     const before = await countModals(page)
  343 | 
  344 |     await page.locator('.tab-toolbar button:has-text("增加")').first().click()
  345 |     await page.waitForTimeout(2000)
  346 |     await ss(page, 'p2-2-table-editor')
  347 | 
  348 |     const after = await countModals(page)
  349 |     expect(after, '表格编辑器未弹出').toBeGreaterThan(before)
  350 | 
  351 |     // 关闭
  352 |     await closeTopModal(page)
  353 |     console.log('✅ P2-2 通过')
  354 |   })
  355 | })
  356 | 
  357 | // =============================================================================
  358 | // 测试套件 2：Vue 实例状态验证（通过 evaluate 直接检查组件内部状态）
  359 | // =============================================================================
  360 | test.describe('MainProcedureDesigner Vue 实例状态验证', () => {
  361 |   test.setTimeout(120_000)
  362 | 
  363 |   test.beforeEach(async ({ page }) => {
  364 |     await login(page)
  365 |     await openMainProcedureDM(page)
  366 |   })
  367 | 
  368 |   // ── 实例注册验证 ────────────────────────────────────────────────────────────
  369 |   test('State-1: 全局实例映射与对话框 ref 均已正确注册', async ({ page }) => {
  370 |     await openEditorForTab(page, '警告')
  371 | 
  372 |     const result = await page.evaluate(() => {
  373 |       const instances = window.$MAINPROCEDURE_DESIGNER_INSTANCES || {}
  374 |       const count = Object.keys(instances).length
  375 |       const first = Object.values(instances)[0]
  376 |       if (!first) return { ok: false, reason: '无实例', count }
  377 | 
  378 |       const refs = first.$refs || {}
  379 |       return {
  380 |         ok: true,
  381 |         count,
  382 |         hasInterref:    !!refs.interrefDialog,
  383 |         hasDmref:       !!refs.dmrefDialog,
  384 |         hasSymbol:      !!refs.symbolDialog,
  385 |         interrefOpenFn: typeof refs.interrefDialog?.open === 'function',
  386 |         dmrefOpenFn:    typeof refs.dmrefDialog?.open  === 'function',
  387 |         symbolOpenFn:   typeof refs.symbolDialog?.open === 'function',
  388 |         // 初始 visible 应全为 false
  389 |         interrefVisible: first.interrefDialogVisible,
  390 |         dmrefVisible:    first.dmrefDialogVisible,
  391 |         symbolVisible:   first.symbolDialogVisible,
  392 |       }
  393 |     })
  394 | 
  395 |     console.log('Vue 实例检查结果:', JSON.stringify(result, null, 2))
  396 | 
  397 |     expect(result.ok,            '无 MainProcedure 实例').toBe(true)
  398 |     expect(result.count,         '实例数 = 0').toBeGreaterThan(0)
  399 |     expect(result.hasInterref,   'interrefDialog ref 缺失').toBe(true)
  400 |     expect(result.hasDmref,      'dmrefDialog ref 缺失').toBe(true)
  401 |     expect(result.hasSymbol,     'symbolDialog ref 缺失').toBe(true)
  402 |     expect(result.interrefOpenFn,'interrefDialog.open() 方法缺失').toBe(true)
  403 |     expect(result.dmrefOpenFn,   'dmrefDialog.open() 方法缺失').toBe(true)
  404 |     expect(result.symbolOpenFn,  'symbolDialog.open() 方法缺失').toBe(true)
  405 |     expect(result.interrefVisible,'interrefDialogVisible 初始值应为 false').toBe(false)
  406 |     expect(result.dmrefVisible,   'dmrefDialogVisible 初始值应为 false').toBe(false)
  407 |     expect(result.symbolVisible,  'symbolDialogVisible 初始值应为 false').toBe(false)
  408 | 
  409 |     console.log('✅ State-1 通过')
  410 |   })
  411 | 
  412 |   // ── 核心修复验证：visible 状态一致性 ───────────────────────────────────────
  413 |   test('State-2: 点击内部引用按钮后 visible 状态由 .sync 单向管理（无双重更新）', async ({ page }) => {
  414 |     await openEditorForTab(page, '警告')
  415 | 
  416 |     // 点击内部引用按钮
  417 |     await clickUEditorButton(page, '内部引用')
  418 |     await page.waitForTimeout(800)
  419 |     await ss(page, 'state2-after-open')
  420 | 
  421 |     // 检查 parent(组件实例) 和 child(对话框) 的 visible 状态一致性
  422 |     const result = await page.evaluate(() => {
  423 |       const instances = window.$MAINPROCEDURE_DESIGNER_INSTANCES || {}
  424 |       const first = Object.values(instances)[0]
  425 |       if (!first) return null
  426 | 
  427 |       const dialog = first.$refs?.interrefDialog
  428 |       return {
  429 |         parentVisible: first.interrefDialogVisible,     // 父组件侧（.sync 绑定）
  430 |         childVisible:  dialog?.visible,                  // 子组件侧（props.visible）
  431 |         consistent:    first.interrefDialogVisible === dialog?.visible,
  432 |       }
  433 |     })
  434 | 
  435 |     console.log('visible 一致性检查:', JSON.stringify(result, null, 2))
  436 | 
  437 |     if (result) {
  438 |       // 对话框应已打开
```