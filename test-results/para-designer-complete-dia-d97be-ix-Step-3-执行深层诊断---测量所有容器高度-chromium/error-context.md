# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: para-designer-complete-diagnosis.spec.ts >> Para Designer Layout - Complete Root Cause Diagnosis and Fix >> Step 3: 执行深层诊断 - 测量所有容器高度
- Location: tests\para-designer-complete-diagnosis.spec.ts:80:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'evaluate')
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test'
  2   | import * as fs from 'fs'
  3   | 
  4   | test.describe('Para Designer Layout - Complete Root Cause Diagnosis and Fix', () => {
  5   |   let page: Page
  6   |   let diagnosisResults: any = {}
  7   | 
  8   |   test.beforeAll(async () => {
  9   |     // 预热浏览器
  10  |     console.log('启动诊断...')
  11  |   })
  12  | 
  13  |   test('Step 1: 启动应用并导航到编辑页面', async ({ browser }) => {
  14  |     page = await browser.newPage()
  15  | 
  16  |     // 导航到应用
  17  |     await page.goto('http://localhost:3000/ietm/ietmdatamodule', {
  18  |       waitUntil: 'networkidle',
  19  |       timeout: 30000
  20  |     })
  21  | 
  22  |     console.log('✅ 已导航到编辑页面')
  23  | 
  24  |     // 等待页面加载
  25  |     await page.waitForTimeout(3000)
  26  | 
  27  |     // 登录（如果需要）
  28  |     const userInput = page.locator('input[placeholder*="用户"]')
  29  |     if (await userInput.isVisible({ timeout: 2000 }).catch(() => false)) {
  30  |       console.log('检测到登录页面，进行登录...')
  31  |       await userInput.fill('admin')
  32  |       await page.locator('input[type="password"]').fill('admin')
  33  |       await page.locator('button:has-text("登录")').click()
  34  |       await page.waitForTimeout(3000)
  35  |     }
  36  | 
  37  |     console.log('✅ 应用已就绪')
  38  |   })
  39  | 
  40  |   test('Step 2: 打开 Para 设计器', async () => {
  41  |     // 查找第一个 para 节点
  42  |     const treeNodes = page.locator('.ant-tree-node')
  43  |     const treeNodeCount = await treeNodes.count()
  44  |     console.log(`发现 ${treeNodeCount} 个树节点`)
  45  | 
  46  |     if (treeNodeCount === 0) {
  47  |       console.error('未找到树节点，尝试扩展树...')
  48  |       const expandButtons = page.locator('.ant-tree-switcher')
  49  |       for (let i = 0; i < Math.min(5, await expandButtons.count()); i++) {
  50  |         await expandButtons.nth(i).click()
  51  |         await page.waitForTimeout(500)
  52  |       }
  53  |     }
  54  | 
  55  |     // 查找 para 节点
  56  |     let paraNode = await page.locator('text=/^para$|^<para').first()
  57  | 
  58  |     if (!await paraNode.isVisible({ timeout: 2000 }).catch(() => false)) {
  59  |       console.log('直接查找 para 节点失败，尝试在所有节点中查找...')
  60  |       const allNodes = page.locator('.ant-tree-node')
  61  |       for (let i = 0; i < await allNodes.count(); i++) {
  62  |         const nodeText = await allNodes.nth(i).textContent()
  63  |         if (nodeText?.includes('para')) {
  64  |           paraNode = allNodes.nth(i)
  65  |           break
  66  |         }
  67  |       }
  68  |     }
  69  | 
  70  |     if (await paraNode.isVisible({ timeout: 2000 }).catch(() => false)) {
  71  |       console.log('✅ 找到 para 节点，双击打开设计器...')
  72  |       await paraNode.dblclick()
  73  |       await page.waitForTimeout(3000)
  74  |     } else {
  75  |       console.error('❌ 未找到 para 节点')
  76  |       throw new Error('无法找到 para 节点')
  77  |     }
  78  |   })
  79  | 
  80  |   test('Step 3: 执行深层诊断 - 测量所有容器高度', async () => {
  81  |     console.log('\n=== 深层诊断：容器高度链 ===\n')
  82  | 
> 83  |     diagnosisResults = await page.evaluate(() => {
      |                                   ^ TypeError: Cannot read properties of undefined (reading 'evaluate')
  84  |       const results: any = {
  85  |         timestamp: new Date().toISOString(),
  86  |         viewport: {
  87  |           width: window.innerWidth,
  88  |           height: window.innerHeight
  89  |         },
  90  |         containers: {},
  91  |         iframeAnalysis: {},
  92  |         problemDiagnosis: {},
  93  |         measurements: []
  94  |       }
  95  | 
  96  |       // 测量所有关键容器
  97  |       const selectors = {
  98  |         'viewport': null,
  99  |         '.design-view-container': 'design-view-container',
  100 |         '.para-designer': 'para-designer',
  101 |         '.para-toolbar': 'para-toolbar',
  102 |         '.para-header': 'para-header',
  103 |         '.ueditor-container': 'ueditor-container',
  104 |         'iframe': 'iframe'
  105 |       }
  106 | 
  107 |       for (const [selector, name] of Object.entries(selectors)) {
  108 |         if (selector === 'viewport') continue
  109 | 
  110 |         const element = document.querySelector(selector) as HTMLElement
  111 |         if (!element) {
  112 |           results.measurements.push({
  113 |             element: name,
  114 |             status: '❌ 不存在'
  115 |           })
  116 |           continue
  117 |         }
  118 | 
  119 |         const rect = element.getBoundingClientRect()
  120 |         const computed = window.getComputedStyle(element)
  121 |         const measurement = {
  122 |           element: name,
  123 |           clientHeight: element.clientHeight,
  124 |           offsetHeight: element.offsetHeight,
  125 |           scrollHeight: (element as any).scrollHeight,
  126 |           rectHeight: rect.height,
  127 |           top: rect.top,
  128 |           bottom: rect.bottom,
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
```