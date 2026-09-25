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
      - generic [ref=e69] [cursor=pointer]:
        - img [ref=e71]
        - text: 欢迎您，管理员
      - 'link "图标: logout 退出登录" [ref=e73] [cursor=pointer]':
        - /url: javascript:;
        - 'generic "图标: logout" [ref=e74]':
          - img [ref=e75]
        - text: 退出登录
      - generic "系统设置"
  - main [ref=e77]:
    - generic [ref=e78]:
      - tablist [ref=e79]:
        - generic [ref=e80]:
          - generic:
            - generic:
              - 'generic "图标: left"':
                - img
          - generic:
            - generic:
              - 'generic "图标: right"':
                - img
          - tab "首页" [selected] [ref=e85] [cursor=pointer]:
            - generic [ref=e86]: 首页
      - generic:
        - tabpanel
    - generic [ref=e88]:
      - generic [ref=e89]:
        - generic [ref=e91]:
          - generic [ref=e95]:
            - 'generic "图标: folder" [ref=e96]':
              - img [ref=e97]
            - text: 手册项目
          - generic [ref=e100]:
            - generic [ref=e103]:
              - combobox [ref=e105] [cursor=pointer]:
                - generic "项目名称" [ref=e107]
                - 'generic "图标: down" [ref=e109]':
                  - img [ref=e110]
              - generic [ref=e112]:
                - textbox "请输入关键字" [ref=e113]
                - 'generic "图标: search" [ref=e115] [cursor=pointer]':
                  - img [ref=e116]
            - generic [ref=e123]:
              - table [ref=e125]:
                - rowgroup [ref=e133]:
                  - row "序号 项目名称 装备编码 IETM标准 密级 操作" [ref=e134]:
                    - columnheader "序号" [ref=e135]:
                      - generic [ref=e137]: 序号
                    - columnheader "项目名称" [ref=e138]:
                      - generic [ref=e140]: 项目名称
                    - columnheader "装备编码" [ref=e141]:
                      - generic [ref=e143]: 装备编码
                    - columnheader "IETM标准" [ref=e144]:
                      - generic [ref=e146]: IETM标准
                    - columnheader "密级" [ref=e147]:
                      - generic [ref=e149]: 密级
                    - columnheader "操作" [ref=e150]:
                      - generic [ref=e152]: 操作
              - table [ref=e154]:
                - rowgroup [ref=e162]:
                  - row "1 项目3 ZB3 S1000D4.2 公开 打开项目" [ref=e163]:
                    - cell "1" [ref=e164]
                    - cell "项目3" [ref=e165]
                    - cell "ZB3" [ref=e166]
                    - cell "S1000D4.2" [ref=e167]
                    - cell "公开" [ref=e168]:
                      - generic [ref=e170]: 公开
                    - cell "打开项目" [ref=e171]:
                      - generic [ref=e172]: 打开项目
                  - row "2 项目2 ZB2 S1000D4.1 公开 打开项目" [ref=e173]:
                    - cell "2" [ref=e174]
                    - cell "项目2" [ref=e175]
                    - cell "ZB2" [ref=e176]
                    - cell "S1000D4.1" [ref=e177]
                    - cell "公开" [ref=e178]:
                      - generic [ref=e180]: 公开
                    - cell "打开项目" [ref=e181]:
                      - generic [ref=e182]: 打开项目
                  - row "3 项目1 ZB1 S1000D4.0 公开 ✓ 当前项目" [ref=e183]:
                    - cell "3" [ref=e184]
                    - cell "项目1" [ref=e185]
                    - cell "ZB1" [ref=e186]
                    - cell "S1000D4.0" [ref=e187]
                    - cell "公开" [ref=e188]:
                      - generic [ref=e190]: 公开
                    - cell "✓ 当前项目" [ref=e191]:
                      - generic [ref=e192]: ✓ 当前项目
                  - row "4 项目4 ZB4 GJB6600 公开 打开项目" [ref=e193]:
                    - cell "4" [ref=e194]
                    - cell "项目4" [ref=e195]
                    - cell "ZB4" [ref=e196]
                    - cell "GJB6600" [ref=e197]
                    - cell "公开" [ref=e198]:
                      - generic [ref=e200]: 公开
                    - cell "打开项目" [ref=e201]:
                      - generic [ref=e202]: 打开项目
                  - row "5 项目5 ZB5 S1000D4.0 公开 打开项目" [ref=e203]:
                    - cell "5" [ref=e204]
                    - cell "项目5" [ref=e205]
                    - cell "ZB5" [ref=e206]
                    - cell "S1000D4.0" [ref=e207]
                    - cell "公开" [ref=e208]:
                      - generic [ref=e210]: 公开
                    - cell "打开项目" [ref=e211]:
                      - generic [ref=e212]: 打开项目
        - generic [ref=e214]:
          - generic [ref=e218]:
            - 'generic "图标: check-circle" [ref=e219]':
              - img [ref=e220]
            - text: 我的待办
          - generic [ref=e224]:
            - generic [ref=e225]:
              - 'button "图标: check-circle 批量审批" [disabled] [ref=e226]':
                - 'generic "图标: check-circle"':
                  - img
                - generic: 批量审批
              - generic [ref=e228]:
                - combobox [ref=e230] [cursor=pointer]:
                  - generic "标题" [ref=e232]
                  - 'generic "图标: down" [ref=e234]':
                    - img [ref=e235]
                - generic [ref=e237]:
                  - textbox "请输入关键字" [ref=e238]
                  - 'generic "图标: search" [ref=e240] [cursor=pointer]':
                    - img [ref=e241]
              - generic [ref=e243]: 【★紧急 ★★特急】
            - generic [ref=e249]:
              - table [ref=e251]:
                - rowgroup [ref=e259]:
                  - row "状态 标题 节点 创建人 创建日期" [ref=e260]:
                    - columnheader [ref=e261]:
                      - checkbox [ref=e268] [cursor=pointer]
                    - columnheader "状态" [ref=e270]:
                      - generic [ref=e272]: 状态
                    - columnheader "标题" [ref=e273]:
                      - generic [ref=e275]: 标题
                    - columnheader "节点" [ref=e276]:
                      - generic [ref=e278]: 节点
                    - columnheader "创建人" [ref=e279]:
                      - generic [ref=e281]: 创建人
                    - columnheader "创建日期" [ref=e282]:
                      - generic [ref=e284]: 创建日期
              - table [ref=e286]:
                - rowgroup [ref=e294]:
                  - 'row "图标: check-circle DMC-ZB1-A-03-00-00-00A-007A-A_001-03_zh-CN DM编写 管理员 2026-08-29" [ref=e295] [cursor=pointer]':
                    - cell [ref=e296]:
                      - checkbox [ref=e300]
                    - 'cell "图标: check-circle" [ref=e302]':
                      - 'generic "图标: check-circle" [ref=e303]':
                        - img [ref=e304]
                    - cell "DMC-ZB1-A-03-00-00-00A-007A-A_001-03_zh-CN" [ref=e307]:
                      - generic [ref=e308]: DMC-ZB1-A-03-00-00-00A-007A-A_001-03_zh-CN
                    - cell "DM编写" [ref=e309]
                    - cell "管理员" [ref=e310]
                    - cell "2026-08-29" [ref=e311]
                  - 'row "图标: lock DMC-ZB1-A-05-00-00-00A-007A-A_001-05_zh-CN DM编写 管理员 2026-08-31" [ref=e312] [cursor=pointer]':
                    - cell [ref=e313]:
                      - checkbox [ref=e317]
                    - 'cell "图标: lock" [ref=e319]':
                      - 'generic "图标: lock" [ref=e320]':
                        - img [ref=e321]
                    - cell "DMC-ZB1-A-05-00-00-00A-007A-A_001-05_zh-CN" [ref=e323]:
                      - generic [ref=e324]: DMC-ZB1-A-05-00-00-00A-007A-A_001-05_zh-CN
                    - cell "DM编写" [ref=e325]
                    - cell "管理员" [ref=e326]
                    - cell "2026-08-31" [ref=e327]
                  - 'row "图标: lock DMC-ZB1-A-02-00-00-00A-007A-A_002-02_zh-CN DM编写 管理员 2026-08-31" [ref=e328] [cursor=pointer]':
                    - cell [ref=e329]:
                      - checkbox [ref=e333]
                    - 'cell "图标: lock" [ref=e335]':
                      - 'generic "图标: lock" [ref=e336]':
                        - img [ref=e337]
                    - cell "DMC-ZB1-A-02-00-00-00A-007A-A_002-02_zh-CN" [ref=e339]:
                      - generic [ref=e340]: DMC-ZB1-A-02-00-00-00A-007A-A_002-02_zh-CN
                    - cell "DM编写" [ref=e341]
                    - cell "管理员" [ref=e342]
                    - cell "2026-08-31" [ref=e343]
                  - 'row "图标: lock DMC-ZB1-A-01-00-00-00A-007A-A_002-01_zh-CN 校对 管理员 2026-08-27" [ref=e344] [cursor=pointer]':
                    - cell [ref=e345]:
                      - checkbox [ref=e349]
                    - 'cell "图标: lock" [ref=e351]':
                      - 'generic "图标: lock" [ref=e352]':
                        - img [ref=e353]
                    - cell "DMC-ZB1-A-01-00-00-00A-007A-A_002-01_zh-CN" [ref=e355]:
                      - generic [ref=e356]: DMC-ZB1-A-01-00-00-00A-007A-A_002-01_zh-CN
                    - cell "校对" [ref=e357]
                    - cell "管理员" [ref=e358]
                    - cell "2026-08-27" [ref=e359]
                  - 'row "图标: lock DMC-ZB1-A-04-00-00-00A-007A-A_003-01_zh-CN DM编写 管理员 2026-09-18" [ref=e360] [cursor=pointer]':
                    - cell [ref=e361]:
                      - checkbox [ref=e365]
                    - 'cell "图标: lock" [ref=e367]':
                      - 'generic "图标: lock" [ref=e368]':
                        - img [ref=e369]
                    - cell "DMC-ZB1-A-04-00-00-00A-007A-A_003-01_zh-CN" [ref=e371]:
                      - generic [ref=e372]: DMC-ZB1-A-04-00-00-00A-007A-A_003-01_zh-CN
                    - cell "DM编写" [ref=e373]
                    - cell "管理员" [ref=e374]
                    - cell "2026-09-18" [ref=e375]
      - generic [ref=e376]:
        - generic [ref=e378]:
          - generic [ref=e382]:
            - 'generic "图标: database" [ref=e383]':
              - img [ref=e384]
            - text: 数据模块
          - generic [ref=e387]:
            - generic [ref=e390]:
              - combobox [ref=e392] [cursor=pointer]:
                - generic "DMC编码" [ref=e394]
                - 'generic "图标: down" [ref=e396]':
                  - img [ref=e397]
              - generic [ref=e399]:
                - textbox "请输入关键字" [ref=e400]
                - 'generic "图标: search" [ref=e402] [cursor=pointer]':
                  - img [ref=e403]
            - generic [ref=e410]:
              - table [ref=e412]:
                - rowgroup [ref=e419]:
                  - row "序号 DMC编码 技术名称 信息名称 DM类型" [ref=e420]:
                    - columnheader "序号" [ref=e421]:
                      - generic [ref=e423]: 序号
                    - columnheader "DMC编码" [ref=e424]:
                      - generic [ref=e427]: DMC编码
                    - columnheader "技术名称" [ref=e428]:
                      - generic [ref=e431]: 技术名称
                    - columnheader "信息名称" [ref=e432]:
                      - generic [ref=e435]: 信息名称
                    - columnheader "DM类型" [ref=e436]:
                      - generic [ref=e439]: DM类型
              - table [ref=e441]:
                - rowgroup [ref=e448]:
                  - row "1 DMC-ZB1-A-03-00-00-00A-007A-A_001-03_zh-CN 项目自定义 符号清单 描述性" [ref=e449]:
                    - cell "1" [ref=e450]
                    - cell "DMC-ZB1-A-03-00-00-00A-007A-A_001-03_zh-CN" [ref=e451]
                    - cell "项目自定义" [ref=e452]
                    - cell "符号清单" [ref=e453]
                    - cell "描述性" [ref=e454]
                  - row "2 DMC-ZB1-A-05-00-00-00A-007A-A_001-05_zh-CN 计划/非计划维修（总论） 符号清单 描述性" [ref=e455]:
                    - cell "2" [ref=e456]
                    - cell "DMC-ZB1-A-05-00-00-00A-007A-A_001-05_zh-CN" [ref=e457]
                    - cell "计划/非计划维修（总论）" [ref=e458]
                    - cell "符号清单" [ref=e459]
                    - cell "描述性" [ref=e460]
                  - row "3 DMC-ZB1-A-04-00-00-00A-007A-A_003-01_zh-CN 使用限制（总论） 符号清单1 描述性" [ref=e461]:
                    - cell "3" [ref=e462]
                    - cell "DMC-ZB1-A-04-00-00-00A-007A-A_003-01_zh-CN" [ref=e463]
                    - cell "使用限制（总论）" [ref=e464]
                    - cell "符号清单1" [ref=e465]
                    - cell "描述性" [ref=e466]
                  - row "4 DMC-ZB1-A-02-00-00-00A-007A-A_002-02_zh-CN 项目自定义 符号清单1 描述性" [ref=e467]:
                    - cell "4" [ref=e468]
                    - cell "DMC-ZB1-A-02-00-00-00A-007A-A_002-02_zh-CN" [ref=e469]
                    - cell "项目自定义" [ref=e470]
                    - cell "符号清单1" [ref=e471]
                    - cell "描述性" [ref=e472]
                  - row "5 DMC-ZB1-A-01-00-00-00A-007A-A_002-01_zh-CN 项目自定义 符号清单 描述性" [ref=e473]:
                    - cell "5" [ref=e474]
                    - cell "DMC-ZB1-A-01-00-00-00A-007A-A_002-01_zh-CN" [ref=e475]
                    - cell "项目自定义" [ref=e476]
                    - cell "符号清单" [ref=e477]
                    - cell "描述性" [ref=e478]
                  - row "6 DMC-ZB1-A-00-00-00-00A-007A-A_003-00_zh-CN 《内置构型》 符号清单 描述性" [ref=e479]:
                    - cell "6" [ref=e480]
                    - cell "DMC-ZB1-A-00-00-00-00A-007A-A_003-00_zh-CN" [ref=e481]
                    - cell "《内置构型》" [ref=e482]
                    - cell "符号清单" [ref=e483]
                    - cell "描述性" [ref=e484]
        - generic [ref=e486]:
          - generic [ref=e490]:
            - 'generic "图标: file-text" [ref=e491]':
              - img [ref=e492]
            - text: 项目实体
          - generic [ref=e495]:
            - generic [ref=e498]:
              - combobox [ref=e500] [cursor=pointer]:
                - generic "ICN编号" [ref=e502]
                - 'generic "图标: down" [ref=e504]':
                  - img [ref=e505]
              - generic [ref=e507]:
                - textbox "请输入关键字" [ref=e508]
                - 'generic "图标: search" [ref=e510] [cursor=pointer]':
                  - img [ref=e511]
            - generic [ref=e518]:
              - table [ref=e520]:
                - rowgroup [ref=e526]:
                  - row "序号 ICN编号 文件名称 文件大小" [ref=e527]:
                    - columnheader "序号" [ref=e528]:
                      - generic [ref=e530]: 序号
                    - columnheader "ICN编号" [ref=e531]:
                      - generic [ref=e534]: ICN编号
                    - columnheader "文件名称" [ref=e535]:
                      - generic [ref=e538]: 文件名称
                    - columnheader "文件大小" [ref=e539]:
                      - generic [ref=e541]: 文件大小
              - table [ref=e543]:
                - rowgroup [ref=e549]:
                  - row "1 ICN-ZB1-A-000000-60101-30101-00010-A-001-01 test-triangle.gltf 0.00 KB" [ref=e550]:
                    - cell "1" [ref=e551]
                    - cell "ICN-ZB1-A-000000-60101-30101-00010-A-001-01" [ref=e552]
                    - cell "test-triangle.gltf" [ref=e553]
                    - cell "0.00 KB" [ref=e554]
                  - row "2 ICN-ZB1-A-000000-60101-30101-00008-A-001-01 test-pyramid.stl 0.00 KB" [ref=e555]:
                    - cell "2" [ref=e556]
                    - cell "ICN-ZB1-A-000000-60101-30101-00008-A-001-01" [ref=e557]
                    - cell "test-pyramid.stl" [ref=e558]
                    - cell "0.00 KB" [ref=e559]
                  - row "3 ICN-ZB1-A-000000-60101-30101-00007-A-001-01 DamagedHelmet.glb 3.60 KB" [ref=e560]:
                    - cell "3" [ref=e561]
                    - cell "ICN-ZB1-A-000000-60101-30101-00007-A-001-01" [ref=e562]
                    - cell "DamagedHelmet.glb" [ref=e563]
                    - cell "3.60 KB" [ref=e564]
                  - row "4 ICN-ZB1-A-000000-60101-30101-00006-A-001-01 test-cube.wrl 0.00 KB" [ref=e565]:
                    - cell "4" [ref=e566]
                    - cell "ICN-ZB1-A-000000-60101-30101-00006-A-001-01" [ref=e567]
                    - cell "test-cube.wrl" [ref=e568]
                    - cell "0.00 KB" [ref=e569]
                  - row "5 ICN-ZB1-A-020000-60101-30101-00018-A-001-01 风景3.jpg 0.36 KB" [ref=e570]:
                    - cell "5" [ref=e571]
                    - cell "ICN-ZB1-A-020000-60101-30101-00018-A-001-01" [ref=e572]
                    - cell "风景3.jpg" [ref=e573]
                    - cell "0.36 KB" [ref=e574]
                  - row "6 ICN-ZB1-A-020000-60101-30101-00017-A-001-01 风景2.jpg 0.08 KB" [ref=e575]:
                    - cell "6" [ref=e576]
                    - cell "ICN-ZB1-A-020000-60101-30101-00017-A-001-01" [ref=e577]
                    - cell "风景2.jpg" [ref=e578]
                    - cell "0.08 KB" [ref=e579]
                  - row "7 ICN-ZB1-A-020000-60101-30101-00016-A-001-01 风景1.jpg 0.32 KB" [ref=e580]:
                    - cell "7" [ref=e581]
                    - cell "ICN-ZB1-A-020000-60101-30101-00016-A-001-01" [ref=e582]
                    - cell "风景1.jpg" [ref=e583]
                    - cell "0.32 KB" [ref=e584]
                  - row "8 ICN-ZB1-A-020000-60101-30101-00015-A-001-01 多多.mp4 0.93 KB" [ref=e585]:
                    - cell "8" [ref=e586]
                    - cell "ICN-ZB1-A-020000-60101-30101-00015-A-001-01" [ref=e587]
                    - cell "多多.mp4" [ref=e588]
                    - cell "0.93 KB" [ref=e589]
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