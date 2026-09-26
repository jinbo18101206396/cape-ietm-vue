# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\para-real-browser-complete.spec.js >> Para设计器真实浏览器完整验证 >> 场景4: 混合内容编辑验证
- Location: tests\e2e\para-real-browser-complete.spec.js:405:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.ant-table tbody tr:first-child .ant-table-row-expand-icon')

```

# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e9]:
    - generic [ref=e10]:
      - link "logo IETM" [ref=e12] [cursor=pointer]:
        - /url: /
        - img "logo" [ref=e13]
        - heading "IETM" [level=1] [ref=e14]
      - menu [ref=e16]:
        - 'menuitem "图标: home 首页" [ref=e17] [cursor=pointer]':
          - 'link "图标: home 首页" [ref=e18]':
            - /url: /dashboard/analysis
            - 'generic "图标: home" [ref=e19]':
              - img [ref=e20]
            - text: 首页
        - 'menuitem "图标: copy 手册管理" [ref=e22]':
          - generic [ref=e24] [cursor=pointer]:
            - 'generic "图标: copy" [ref=e25]':
              - img [ref=e26]
            - text: 手册管理
        - 'menuitem "图标: audit 项目管理" [ref=e28]':
          - generic [ref=e30] [cursor=pointer]:
            - 'generic "图标: audit" [ref=e31]':
              - img [ref=e32]
            - text: 项目管理
        - 'menuitem "图标: interation 数据交换" [ref=e34]':
          - generic [ref=e36] [cursor=pointer]:
            - 'generic "图标: interation" [ref=e37]':
              - img [ref=e38]
            - text: 数据交换
        - 'menuitem "图标: global 数据发布" [ref=e40]':
          - generic [ref=e42] [cursor=pointer]:
            - 'generic "图标: global" [ref=e43]':
              - img [ref=e44]
            - text: 数据发布
        - 'menuitem "图标: setting 系统管理" [ref=e46]':
          - generic [ref=e48] [cursor=pointer]:
            - 'generic "图标: setting" [ref=e49]':
              - img [ref=e50]
            - text: 系统管理
    - generic [ref=e52]:
      - 'generic "图标: search" [ref=e54] [cursor=pointer]':
        - img [ref=e55]
      - 'link "图标: question-circle-o" [ref=e58] [cursor=pointer]':
        - /url: http://doc.jeecg.com
        - 'generic "图标: question-circle-o" [ref=e59]':
          - img [ref=e60]
      - 'generic "图标: bell" [ref=e66] [cursor=pointer]':
        - img [ref=e67]
      - generic [ref=e69] [cursor=pointer]: 欢迎您，管理员
      - 'link "图标: logout 退出登录" [ref=e72] [cursor=pointer]':
        - /url: javascript:;
        - 'generic "图标: logout" [ref=e73]':
          - img [ref=e74]
        - text: 退出登录
      - generic "系统设置"
  - main [ref=e76]:
    - generic [ref=e77]:
      - tablist [ref=e78]:
        - generic [ref=e79]:
          - generic:
            - generic:
              - 'generic "图标: left"':
                - img
          - generic:
            - generic:
              - 'generic "图标: right"':
                - img
          - tab "首页" [selected] [ref=e84] [cursor=pointer]:
            - generic [ref=e85]: 首页
      - generic:
        - tabpanel
    - generic [ref=e87]:
      - generic [ref=e88]:
        - generic [ref=e90]:
          - generic [ref=e94]:
            - 'generic "图标: folder" [ref=e95]':
              - img [ref=e96]
            - text: 手册项目
          - generic [ref=e99]:
            - generic [ref=e102]:
              - combobox [ref=e104] [cursor=pointer]:
                - generic "项目名称" [ref=e106]
                - 'generic "图标: down" [ref=e108]':
                  - img [ref=e109]
              - generic [ref=e111]:
                - textbox "请输入关键字" [ref=e112]
                - 'generic "图标: search" [ref=e114] [cursor=pointer]':
                  - img [ref=e115]
            - generic [ref=e122]:
              - table [ref=e124]:
                - rowgroup [ref=e132]:
                  - row "序号 项目名称 装备编码 IETM标准 密级 操作" [ref=e133]:
                    - columnheader "序号" [ref=e134]:
                      - generic [ref=e136]: 序号
                    - columnheader "项目名称" [ref=e137]:
                      - generic [ref=e139]: 项目名称
                    - columnheader "装备编码" [ref=e140]:
                      - generic [ref=e142]: 装备编码
                    - columnheader "IETM标准" [ref=e143]:
                      - generic [ref=e145]: IETM标准
                    - columnheader "密级" [ref=e146]:
                      - generic [ref=e148]: 密级
                    - columnheader "操作" [ref=e149]:
                      - generic [ref=e151]: 操作
              - table [ref=e153]:
                - rowgroup [ref=e161]:
                  - row "1 项目3 ZB3 S1000D4.2 公开 打开项目" [ref=e162]:
                    - cell "1" [ref=e163]
                    - cell "项目3" [ref=e164]
                    - cell "ZB3" [ref=e165]
                    - cell "S1000D4.2" [ref=e166]
                    - cell "公开" [ref=e167]:
                      - generic [ref=e169]: 公开
                    - cell "打开项目" [ref=e170]:
                      - generic [ref=e171]: 打开项目
                  - row "2 项目2 ZB2 S1000D4.1 公开 打开项目" [ref=e172]:
                    - cell "2" [ref=e173]
                    - cell "项目2" [ref=e174]
                    - cell "ZB2" [ref=e175]
                    - cell "S1000D4.1" [ref=e176]
                    - cell "公开" [ref=e177]:
                      - generic [ref=e179]: 公开
                    - cell "打开项目" [ref=e180]:
                      - generic [ref=e181]: 打开项目
                  - row "3 项目1 ZB1 S1000D4.0 公开 打开项目" [ref=e182]:
                    - cell "3" [ref=e183]
                    - cell "项目1" [ref=e184]
                    - cell "ZB1" [ref=e185]
                    - cell "S1000D4.0" [ref=e186]
                    - cell "公开" [ref=e187]:
                      - generic [ref=e189]: 公开
                    - cell "打开项目" [ref=e190]:
                      - generic [ref=e191]: 打开项目
                  - row "4 项目4 ZB4 GJB6600 公开 打开项目" [ref=e192]:
                    - cell "4" [ref=e193]
                    - cell "项目4" [ref=e194]
                    - cell "ZB4" [ref=e195]
                    - cell "GJB6600" [ref=e196]
                    - cell "公开" [ref=e197]:
                      - generic [ref=e199]: 公开
                    - cell "打开项目" [ref=e200]:
                      - generic [ref=e201]: 打开项目
                  - row "5 项目5 ZB5 S1000D4.0 公开 打开项目" [ref=e202]:
                    - cell "5" [ref=e203]
                    - cell "项目5" [ref=e204]
                    - cell "ZB5" [ref=e205]
                    - cell "S1000D4.0" [ref=e206]
                    - cell "公开" [ref=e207]:
                      - generic [ref=e209]: 公开
                    - cell "打开项目" [ref=e210]:
                      - generic [ref=e211]: 打开项目
        - generic [ref=e213]:
          - generic [ref=e217]:
            - 'generic "图标: check-circle" [ref=e218]':
              - img [ref=e219]
            - text: 我的待办
          - generic [ref=e223]:
            - generic [ref=e224]:
              - 'button "图标: check-circle 批量审批" [disabled] [ref=e225]':
                - 'generic "图标: check-circle"':
                  - img
                - generic: 批量审批
              - generic [ref=e227]:
                - combobox [ref=e229] [cursor=pointer]:
                  - generic "标题" [ref=e231]
                  - 'generic "图标: down" [ref=e233]':
                    - img [ref=e234]
                - generic [ref=e236]:
                  - textbox "请输入关键字" [ref=e237]
                  - 'generic "图标: search" [ref=e239] [cursor=pointer]':
                    - img [ref=e240]
              - generic [ref=e242]: 【★紧急 ★★特急】
            - generic [ref=e248]:
              - table [ref=e250]:
                - rowgroup [ref=e258]:
                  - row "状态 标题 节点 创建人 创建日期" [ref=e259]:
                    - columnheader [ref=e260]:
                      - checkbox [disabled] [ref=e267]
                    - columnheader "状态" [ref=e269]:
                      - generic [ref=e271]: 状态
                    - columnheader "标题" [ref=e272]:
                      - generic [ref=e274]: 标题
                    - columnheader "节点" [ref=e275]:
                      - generic [ref=e277]: 节点
                    - columnheader "创建人" [ref=e278]:
                      - generic [ref=e280]: 创建人
                    - columnheader "创建日期" [ref=e281]:
                      - generic [ref=e283]: 创建日期
              - generic:
                - table:
                  - rowgroup
              - generic [ref=e284]: 暂无待办事项
      - generic [ref=e285]:
        - generic [ref=e287]:
          - generic [ref=e291]:
            - 'generic "图标: database" [ref=e292]':
              - img [ref=e293]
            - text: 数据模块
          - generic [ref=e296]:
            - generic [ref=e299]:
              - combobox [ref=e301] [cursor=pointer]:
                - generic "DMC编码" [ref=e303]
                - 'generic "图标: down" [ref=e305]':
                  - img [ref=e306]
              - generic [ref=e308]:
                - textbox "请输入关键字" [ref=e309]
                - 'generic "图标: search" [ref=e311] [cursor=pointer]':
                  - img [ref=e312]
            - generic [ref=e319]:
              - table [ref=e321]:
                - rowgroup [ref=e328]:
                  - row "序号 DMC编码 技术名称 信息名称 DM类型" [ref=e329]:
                    - columnheader "序号" [ref=e330]:
                      - generic [ref=e332]: 序号
                    - columnheader "DMC编码" [ref=e333]:
                      - generic [ref=e336]: DMC编码
                    - columnheader "技术名称" [ref=e337]:
                      - generic [ref=e340]: 技术名称
                    - columnheader "信息名称" [ref=e341]:
                      - generic [ref=e344]: 信息名称
                    - columnheader "DM类型" [ref=e345]:
                      - generic [ref=e348]: DM类型
              - generic:
                - table:
                  - rowgroup
              - generic [ref=e349]: 暂无数据模块
        - generic [ref=e351]:
          - generic [ref=e355]:
            - 'generic "图标: file-text" [ref=e356]':
              - img [ref=e357]
            - text: 项目实体
          - generic [ref=e360]:
            - generic [ref=e363]:
              - combobox [ref=e365] [cursor=pointer]:
                - generic "ICN编号" [ref=e367]
                - 'generic "图标: down" [ref=e369]':
                  - img [ref=e370]
              - generic [ref=e372]:
                - textbox "请输入关键字" [ref=e373]
                - 'generic "图标: search" [ref=e375] [cursor=pointer]':
                  - img [ref=e376]
            - generic [ref=e383]:
              - table [ref=e385]:
                - rowgroup [ref=e391]:
                  - row "序号 ICN编号 文件名称 文件大小" [ref=e392]:
                    - columnheader "序号" [ref=e393]:
                      - generic [ref=e395]: 序号
                    - columnheader "ICN编号" [ref=e396]:
                      - generic [ref=e399]: ICN编号
                    - columnheader "文件名称" [ref=e400]:
                      - generic [ref=e403]: 文件名称
                    - columnheader "文件大小" [ref=e404]:
                      - generic [ref=e406]: 文件大小
              - generic:
                - table:
                  - rowgroup
              - generic [ref=e407]: 暂无实体ICN数据
```

# Test source

```ts
  313 |       const editor = window.dmEditor?.editor
  314 |       if (!editor) return
  315 | 
  316 |       const content = editor.getValue()
  317 |       const lines = content.split('\n')
  318 |       for (let i = lines.length - 1; i >= 0; i--) {
  319 |         if (lines[i].includes('<definitionList>')) {
  320 |           // 点击该行的gutter图标
  321 |           const lineHandle = editor.getLineHandle(i)
  322 |           const gutterMarkers = lineHandle.gutterMarkers
  323 |           if (gutterMarkers && gutterMarkers['gutter-icons']) {
  324 |             gutterMarkers['gutter-icons'].click()
  325 |           }
  326 |           break
  327 |         }
  328 |       }
  329 |     })
  330 | 
  331 |     await page.waitForSelector('#para_ueditor', { timeout: 10000 })
  332 |     console.log('✅ 设计视图打开')
  333 |     await page.waitForTimeout(2000)
  334 | 
  335 |     // 5. 验证转换: definitionList → table with deflist="1"
  336 |     const htmlContent = await page.evaluate(() => {
  337 |       const ue = window.UE.getEditor('para_ueditor')
  338 |       return ue ? ue.getContent() : ''
  339 |     })
  340 | 
  341 |     expect(htmlContent).toContain('<table')
  342 |     expect(htmlContent).toContain('deflist="1"')
  343 |     expect(htmlContent).toContain('<th>术语1</th>')
  344 |     expect(htmlContent).toContain('<td>')
  345 |     expect(htmlContent).toContain('定义段落1')
  346 |     expect(htmlContent).toContain('定义段落2')
  347 |     expect(htmlContent).toContain('定义段落3')
  348 |     console.log('✅ 验证通过: definitionList正确转换为table')
  349 | 
  350 |     // 6. 关键验证: td内多个para不应残留</td>标签
  351 |     const hasBadClosingTags = htmlContent.includes('</para></td></td>')
  352 |     expect(hasBadClosingTags).toBe(false)
  353 |     console.log('✅ 验证通过: td内多个para无残留标签（CRITICAL bug已修复）')
  354 | 
  355 |     // 7. 在UEditor中编辑表格（添加新行）
  356 |     await page.evaluate(() => {
  357 |       const ue = window.UE.getEditor('para_ueditor')
  358 |       if (ue) {
  359 |         const content = ue.getContent()
  360 |         // 在table结束前添加新行
  361 |         const newRow = '<tr><th>术语3（新增）</th><td>定义3（新增）</td></tr>'
  362 |         const updated = content.replace('</table>', newRow + '</table>')
  363 |         ue.setContent(updated)
  364 |       }
  365 |     })
  366 |     console.log('✅ 添加新表格行')
  367 |     await page.waitForTimeout(1000)
  368 | 
  369 |     // 8. 保存
  370 |     await page.click('button:has-text("确定")')
  371 |     await page.waitForTimeout(1000)
  372 | 
  373 |     // 9. 验证XML正确生成
  374 |     const updatedXml = await page.evaluate(() => {
  375 |       const editor = window.dmEditor?.editor
  376 |       return editor ? editor.getValue() : ''
  377 |     })
  378 | 
  379 |     // 验证新增行
  380 |     expect(updatedXml).toContain('术语3（新增）')
  381 |     expect(updatedXml).toContain('定义3（新增）')
  382 |     expect(updatedXml).toContain('<listItemTerm>术语3（新增）</listItemTerm>')
  383 |     expect(updatedXml).toContain('<listItemDefinition><para>定义3（新增）</para></listItemDefinition>')
  384 |     console.log('✅ 验证通过: 新增表格行正确转换为XML')
  385 | 
  386 |     // 10. 验证原有多个para保持完整
  387 |     const hasAllParas = updatedXml.includes('定义段落1') &&
  388 |                         updatedXml.includes('定义段落2') &&
  389 |                         updatedXml.includes('定义段落3')
  390 |     expect(hasAllParas).toBe(true)
  391 |     console.log('✅ 验证通过: td内多个para完整保留')
  392 | 
  393 |     // 11. 验证无残留标签
  394 |     const hasResidualTags = updatedXml.match(/<\/td>(?!.*<(table|tr|th|td))/g)
  395 |     expect(hasResidualTags).toBeNull()
  396 |     console.log('✅ 验证通过: 无任何残留</td>标签')
  397 | 
  398 |     console.log('🎉 场景3测试完成\n')
  399 |   })
  400 | 
  401 |   /**
  402 |    * 场景4: 混合内容编辑验证
  403 |    * 测试emphasis、superScript、subScript等混合使用
  404 |    */
  405 |   test('场景4: 混合内容编辑验证', async ({ page }) => {
  406 |     console.log('\n🧪 开始测试: 场景4 - 混合内容编辑')
  407 | 
  408 |     const testXml = `<para>普通文本 <emphasis>强调文本</emphasis> H<subScript>2</subScript>O X<superScript>2</superScript> 结束</para>`
  409 | 
  410 |     // 1-3. 进入编辑器
  411 |     await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
  412 |     await page.waitForSelector('.ant-table', { timeout: 10000 })
> 413 |     await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  414 |     await page.waitForTimeout(500)
  415 |     await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
  416 |     await page.waitForSelector('.codemirror-container', { timeout: 15000 })
  417 | 
  418 |     // 插入测试XML
  419 |     await page.evaluate((xml) => {
  420 |       const editor = window.dmEditor?.editor
  421 |       if (editor) {
  422 |         const content = editor.getValue()
  423 |         const insertPos = content.indexOf('</dmodule>') - 1
  424 |         editor.replaceRange(xml + '\n', editor.posFromIndex(insertPos))
  425 |       }
  426 |     }, testXml)
  427 | 
  428 |     await page.waitForTimeout(1000)
  429 |     console.log('✅ 插入混合格式测试XML')
  430 | 
  431 |     // 4. 打开设计视图
  432 |     await page.evaluate(() => {
  433 |       const editor = window.dmEditor?.editor
  434 |       if (!editor) return
  435 | 
  436 |       const content = editor.getValue()
  437 |       const lines = content.split('\n')
  438 |       for (let i = lines.length - 1; i >= 0; i--) {
  439 |         if (lines[i].includes('<emphasis>')) {
  440 |           const lineHandle = editor.getLineHandle(i)
  441 |           const gutterMarkers = lineHandle.gutterMarkers
  442 |           if (gutterMarkers && gutterMarkers['gutter-icons']) {
  443 |             gutterMarkers['gutter-icons'].click()
  444 |           }
  445 |           break
  446 |         }
  447 |       }
  448 |     })
  449 | 
  450 |     await page.waitForSelector('#para_ueditor', { timeout: 10000 })
  451 |     await page.waitForTimeout(2000)
  452 |     console.log('✅ 设计视图打开')
  453 | 
  454 |     // 5. 验证HTML转换
  455 |     const htmlContent = await page.evaluate(() => {
  456 |       const ue = window.UE.getEditor('para_ueditor')
  457 |       return ue ? ue.getContent() : ''
  458 |     })
  459 | 
  460 |     expect(htmlContent).toContain('<strong>强调文本</strong>')  // emphasis → strong
  461 |     expect(htmlContent).toContain('<sub>2</sub>')               // subScript → sub
  462 |     expect(htmlContent).toContain('<sup>2</sup>')               // superScript → sup
  463 |     console.log('✅ 验证通过: 混合格式正确转换为HTML')
  464 | 
  465 |     // 6. 编辑：添加新的格式文本
  466 |     await page.evaluate(() => {
  467 |       const ue = window.UE.getEditor('para_ueditor')
  468 |       if (ue) {
  469 |         const content = ue.getContent()
  470 |         ue.setContent(content + ' <strong>新强调</strong> E=mc<sup>2</sup>')
  471 |       }
  472 |     })
  473 |     console.log('✅ 添加新格式文本')
  474 |     await page.waitForTimeout(1000)
  475 | 
  476 |     // 7. 保存
  477 |     await page.click('button:has-text("确定")')
  478 |     await page.waitForTimeout(1000)
  479 | 
  480 |     // 8. 验证XML
  481 |     const updatedXml = await page.evaluate(() => {
  482 |       const editor = window.dmEditor?.editor
  483 |       return editor ? editor.getValue() : ''
  484 |     })
  485 | 
  486 |     expect(updatedXml).toContain('<emphasis>新强调</emphasis>')
  487 |     expect(updatedXml).toContain('<superScript>2</superScript>')
  488 |     expect(updatedXml).toContain('<subScript>2</subScript>')
  489 |     console.log('✅ 验证通过: 混合格式正确转换回XML')
  490 | 
  491 |     console.log('🎉 场景4测试完成\n')
  492 |   })
  493 | 
  494 |   /**
  495 |    * 场景5: 大文档性能测试
  496 |    * 测试包含50个para的大文档编辑性能
  497 |    */
  498 |   test('场景5: 大文档性能测试', async ({ page }) => {
  499 |     console.log('\n🧪 开始测试: 场景5 - 大文档性能测试')
  500 | 
  501 |     // 生成50个para
  502 |     let largeXml = ''
  503 |     for (let i = 1; i <= 50; i++) {
  504 |       largeXml += `<para>段落${i}: 这是一个测试段落，包含一些内容。<emphasis>强调${i}</emphasis></para>\n`
  505 |     }
  506 | 
  507 |     // 1-3. 进入编辑器
  508 |     await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
  509 |     await page.waitForSelector('.ant-table', { timeout: 10000 })
  510 |     await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
  511 |     await page.waitForTimeout(500)
  512 |     await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
  513 |     await page.waitForSelector('.codemirror-container', { timeout: 15000 })
```