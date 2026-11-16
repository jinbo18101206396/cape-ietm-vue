# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\mainprocedure-dialog-regression.spec.js >> MainProcedureDesigner 对话框回归测试 >> P0-5: 对话框关闭后可重新打开（状态正确重置）
- Location: tests\mainprocedure-dialog-regression.spec.js:243:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('.ant-tabs-tab:has-text("警告")').first()

```

# Page snapshot

```yaml
- generic [ref=e6]:
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
  - main [ref=e52]:
    - generic [ref=e53]:
      - tablist [ref=e54]:
        - generic [ref=e55]:
          - generic:
            - generic:
              - 'generic "图标: left"':
                - img
          - generic:
            - generic:
              - 'generic "图标: right"':
                - img
          - generic [ref=e59]:
            - tab "首页" [ref=e60] [cursor=pointer]:
              - generic [ref=e61]: 首页
            - 'tab "浏览或编辑DM内容 图标: close" [selected] [ref=e62] [cursor=pointer]':
              - generic [ref=e63]:
                - text: 浏览或编辑DM内容
                - 'generic "图标: close" [ref=e64]':
                  - img [ref=e65]
      - generic:
        - tabpanel
    - generic [ref=e68]:
      - generic [ref=e71]:
        - tree [ref=e74]:
          - 'treeitem "图标: down dmodule" [ref=e75]':
            - 'generic "图标: down" [ref=e77] [cursor=pointer]':
              - img [ref=e78]
            - generic "dmodule" [ref=e80] [cursor=pointer]
            - group [ref=e81]:
              - 'treeitem "图标: down identAndStatusSection" [ref=e82]':
                - 'generic "图标: down" [ref=e84] [cursor=pointer]':
                  - img [ref=e85]
                - generic "identAndStatusSection" [ref=e87] [cursor=pointer]
              - 'treeitem "图标: down content" [ref=e88]':
                - 'generic "图标: down" [ref=e90] [cursor=pointer]':
                  - img [ref=e91]
                - generic "content" [ref=e93] [cursor=pointer]
        - generic [ref=e94]:
          - generic [ref=e95]:
            - 'generic "图标: edit" [ref=e96]':
              - img [ref=e97]
            - generic [ref=e99]: 编辑模式 · 可编辑
            - generic [ref=e100]: DMC：DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN
          - generic [ref=e101]:
            - tabpanel [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]:
                  - generic [ref=e106]:
                    - button "<" [ref=e107] [cursor=pointer]:
                      - generic: <
                    - generic [ref=e108]:
                      - generic "中/英文切换" [ref=e109]:
                        - combobox [ref=e110] [cursor=pointer]:
                          - generic "English" [ref=e112]
                          - 'generic "图标: down" [ref=e114]':
                            - img [ref=e115]
                      - 'button "图标: unordered-list 格式化" [ref=e117] [cursor=pointer]':
                        - 'generic "图标: unordered-list"':
                          - img
                        - generic: 格式化
                      - 'button "图标: plus-square 折叠/展开" [ref=e118] [cursor=pointer]':
                        - 'generic "图标: plus-square"':
                          - img
                        - generic: 折叠/展开
                      - 'button "图标: swap 移动行" [ref=e119] [cursor=pointer]':
                        - 'generic "图标: swap"':
                          - img
                        - generic: 移动行
                      - 'button "图标: search 查找" [ref=e120] [cursor=pointer]':
                        - 'generic "图标: search"':
                          - img
                        - generic: 查找
                      - 'button "图标: zoom-in 放大" [ref=e121] [cursor=pointer]':
                        - 'generic "图标: zoom-in"':
                          - img
                        - generic: 放大
                      - 'button "图标: zoom-out 缩小" [ref=e122] [cursor=pointer]':
                        - 'generic "图标: zoom-out"':
                          - img
                        - generic: 缩小
                      - 'button "图标: undo 撤销" [ref=e123] [cursor=pointer]':
                        - 'generic "图标: undo"':
                          - img
                        - generic: 撤销
                      - 'button "图标: redo 重做" [ref=e124] [cursor=pointer]':
                        - 'generic "图标: redo"':
                          - img
                        - generic: 重做
                      - 'button "图标: delete 删除行" [ref=e125] [cursor=pointer]':
                        - 'generic "图标: delete"':
                          - img
                        - generic: 删除行
                      - 'button "图标: download 导出" [ref=e126] [cursor=pointer]':
                        - 'generic "图标: download"':
                          - img
                        - generic: 导出
                    - button ">" [ref=e127] [cursor=pointer]:
                      - generic: ">"
                  - generic [ref=e129]:
                    - 'button "图标: save 已保存" [ref=e130] [cursor=pointer]':
                      - 'generic "图标: save"':
                        - img
                      - generic: 已保存
                    - 'button "图标: import 签入" [ref=e131] [cursor=pointer]':
                      - 'generic "图标: import"':
                        - img
                      - generic: 签入
                    - 'button "图标: link 引用DM" [ref=e132] [cursor=pointer]':
                      - 'generic "图标: link"':
                        - img
                      - generic: 引用DM
                    - 'button "图标: picture 插入图符" [ref=e133] [cursor=pointer]':
                      - 'generic "图标: picture"':
                        - img
                      - generic: 插入图符
                    - 'button "图标: file-text 内部引用" [ref=e134] [cursor=pointer]':
                      - 'generic "图标: file-text"':
                        - img
                      - generic: 内部引用
                    - 'button "图标: ordered-list 对象列表" [ref=e135] [cursor=pointer]':
                      - 'generic "图标: ordered-list"':
                        - img
                      - generic: 对象列表
                    - 'button "图标: check-circle 校验" [ref=e136] [cursor=pointer]':
                      - 'generic "图标: check-circle"':
                        - img
                      - generic: 校验
                    - 'button "图标: eye 预览" [ref=e137] [cursor=pointer]':
                      - 'generic "图标: eye"':
                        - img
                      - generic: 预览
                    - 'button "图标: sync 重建refs与DOCTYPE" [ref=e138] [cursor=pointer]':
                      - 'generic "图标: sync"':
                        - img
                      - generic: 重建refs与DOCTYPE
                    - 'button "图标: code 自定义生成" [ref=e139] [cursor=pointer]':
                      - 'generic "图标: code"':
                        - img
                      - generic: 自定义生成
                    - 'button "图标: file 由Word生成" [ref=e140] [cursor=pointer]':
                      - 'generic "图标: file"':
                        - img
                      - generic: 由Word生成
                - generic [ref=e142]:
                  - textbox [ref=e143]
                  - generic [ref=e148]:
                    - generic [ref=e149]:
                      - generic [ref=e150]: "1"
                      - text: <?xml version="1.0" encoding="UTF-8"?>
                    - generic [ref=e151]:
                      - generic:
                        - generic [ref=e154]: "2"
                        - generic [ref=e156] [cursor=pointer]: ▾
                      - text: <dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://www.purl.org/dc/elements/1.1/" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/proced.xsd">
                    - generic [ref=e157]:
                      - generic:
                        - generic [ref=e158]: "3"
                        - generic [ref=e160] [cursor=pointer]: ▸
                      - text: <identAndStatusSection>↔</identAndStatusSection>
                    - generic [ref=e161]:
                      - generic:
                        - generic [ref=e162]: "67"
                        - generic [ref=e164] [cursor=pointer]: ▾
                      - text: <content>
                    - generic [ref=e165]:
                      - generic:
                        - generic [ref=e166]: "68"
                        - generic [ref=e168] [cursor=pointer]: ▾
                      - text: <procedure>
                    - generic [ref=e169]:
                      - generic:
                        - generic [ref=e170]: "69"
                        - generic [ref=e172] [cursor=pointer]: ▾
                        - link "✎" [ref=e175] [cursor=pointer]:
                          - /url: javascript:void(0);
                          - generic [ref=e176]: ✎
                      - text: <preliminaryRqmts>
                    - generic [ref=e177]:
                      - generic:
                        - generic [ref=e178]: "70"
                        - generic [ref=e180] [cursor=pointer]: ▾
                      - text: <productionMaintData>
                    - generic [ref=e181]:
                      - generic:
                        - generic [ref=e182]: "71"
                        - generic [ref=e184] [cursor=pointer]: ▾
                      - text: <workArea>任务区域信息</workArea>
                    - generic [ref=e185]:
                      - generic [ref=e186]: "72"
                      - text: <taskDuration id="rw001" unitOfMeasure="小时" startupDuration="1" procedureDuration="2" closeupDuration="3"></taskDuration>
                    - generic [ref=e187]:
                      - generic [ref=e188]: "73"
                      - text: </productionMaintData>
                    - generic [ref=e189]:
                      - generic:
                        - generic [ref=e190]: "74"
                        - generic [ref=e192] [cursor=pointer]: ▾
                      - text: <productionMaintData>
                    - generic [ref=e193]:
                      - generic:
                        - generic [ref=e194]: "75"
                        - generic [ref=e196] [cursor=pointer]: ▾
                      - text: <zoneRef id="qy001" zoneNumber="qybh001">
                    - generic [ref=e197]:
                      - generic:
                        - generic [ref=e198]: "76"
                        - generic [ref=e200] [cursor=pointer]: ▾
                      - text: <name>区域名称信息</name>
                    - generic [ref=e201]:
                      - generic:
                        - generic [ref=e202]: "77"
                        - generic [ref=e204] [cursor=pointer]: ▾
                      - text: <refs>
                    - generic [ref=e205]:
                      - generic:
                        - generic [ref=e206]: "78"
                        - generic [ref=e208] [cursor=pointer]: ▾
                      - text: <dmRef xlink_type="simple" xlink_show="replace" xlink_actuate="onRequest">
                    - generic [ref=e209]:
                      - generic:
                        - generic [ref=e210]: "79"
                        - generic [ref=e212] [cursor=pointer]: ▾
                      - text: <dmRefIdent>
                    - generic [ref=e213]:
                      - generic [ref=e214]: "80"
                      - text: <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="212" infoCodeVariant="A" itemLocationCode="A"/>
                    - generic [ref=e215]:
                      - generic [ref=e216]: "81"
                      - text: <language languageIsoCode="zh" countryIsoCode="CN"/>
                    - generic [ref=e217]:
                      - generic [ref=e218]: "82"
                      - text: </dmRefIdent>
                    - generic [ref=e219]:
                      - generic:
                        - generic [ref=e220]: "83"
                        - generic [ref=e222] [cursor=pointer]: ▾
                      - text: <dmRefAddressItems>
                    - generic [ref=e223]:
                      - generic:
                        - generic [ref=e224]: "84"
                        - generic [ref=e226] [cursor=pointer]: ▾
                      - text: <dmTitle>
                    - generic [ref=e227]:
                      - generic:
                        - generic [ref=e228]: "85"
                        - generic [ref=e230] [cursor=pointer]: ▾
                      - text: <techName>说明（总论）</techName>
                    - generic [ref=e231]:
                      - generic:
                        - generic [ref=e232]: "86"
                        - generic [ref=e234] [cursor=pointer]: ▾
                      - text: <infoName>2</infoName>
                    - generic [ref=e235]:
                      - generic [ref=e236]: "87"
                      - text: </dmTitle>
                    - generic [ref=e237]:
                      - generic [ref=e238]: "88"
                      - text: </dmRefAddressItems>
                    - generic [ref=e239]:
                      - generic [ref=e240]: "89"
                      - text: </dmRef>
                    - generic [ref=e241]:
                      - generic [ref=e242]: "90"
                      - text: </refs>
                    - generic [ref=e243]:
                      - generic [ref=e244]: "91"
                      - text: </zoneRef>
                    - generic [ref=e245]:
                      - generic:
                        - generic [ref=e246]: "92"
                        - generic [ref=e248] [cursor=pointer]: ▾
                      - text: <accessPointRef id="kg001" accessPointNumber="kgbh001">
                    - generic [ref=e249]:
                      - generic:
                        - generic [ref=e250]: "93"
                        - generic [ref=e252] [cursor=pointer]: ▾
                      - text: <name>口盖名称信息</name>
                    - generic [ref=e253]:
                      - generic:
                        - generic [ref=e254]: "94"
                        - generic [ref=e256] [cursor=pointer]: ▾
                      - text: <refs>
                    - generic [ref=e257]:
                      - generic:
                        - generic [ref=e258]: "95"
                        - generic [ref=e260] [cursor=pointer]: ▾
                      - text: <dmRef xlink_type="simple" xlink_show="replace" xlink_actuate="onRequest">
                    - generic [ref=e261]:
                      - generic:
                        - generic [ref=e262]: "96"
                        - generic [ref=e264] [cursor=pointer]: ▾
                      - text: <dmRefIdent>
                    - generic [ref=e265]:
                      - generic [ref=e266]: "97"
                      - text: <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="01" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/>
                    - generic [ref=e267]:
                      - generic [ref=e268]: "98"
                      - text: <language languageIsoCode="zh" countryIsoCode="CN"/>
                    - generic [ref=e269]:
                      - generic [ref=e270]: "99"
                      - text: </dmRefIdent>
                    - generic [ref=e271]:
                      - generic:
                        - generic [ref=e272]: "100"
                        - generic [ref=e274] [cursor=pointer]: ▾
                      - text: <dmRefAddressItems>
                    - generic [ref=e275]:
                      - generic:
                        - generic [ref=e276]: "101"
                        - generic [ref=e278] [cursor=pointer]: ▾
                      - text: <dmTitle>
                    - generic [ref=e279]:
                      - generic:
                        - generic [ref=e280]: "102"
                        - generic [ref=e282] [cursor=pointer]: ▾
                      - text: <techName>项目自定义</techName>
                    - generic [ref=e283]:
                      - generic:
                        - generic [ref=e284]: "103"
                        - generic [ref=e286] [cursor=pointer]: ▾
                      - text: <infoName>符号清单</infoName>
                    - generic [ref=e287]:
                      - generic [ref=e288]: "104"
                      - text: </dmTitle>
                    - generic [ref=e289]:
                      - generic [ref=e290]: "105"
                      - text: </dmRefAddressItems>
                    - generic [ref=e291]:
                      - generic [ref=e292]: "106"
                      - text: </dmRef>
            - tablist [ref=e298]:
              - generic [ref=e299]:
                - generic:
                  - generic:
                    - 'generic "图标: left"':
                      - img
                - generic:
                  - generic:
                    - 'generic "图标: right"':
                      - img
                - generic [ref=e303]:
                  - 'tab "图标: edit 设计视图" [disabled] [ref=e304]':
                    - generic [ref=e305]:
                      - 'generic "图标: edit" [ref=e306]':
                        - img [ref=e307]
                      - text: 设计视图
                  - 'tab "图标: code 源码视图" [selected] [ref=e309] [cursor=pointer]':
                    - generic [ref=e310]:
                      - 'generic "图标: code" [ref=e311]':
                        - img [ref=e312]
                      - text: 源码视图
        - generic [ref=e316]:
          - generic [ref=e317]:
            - generic [ref=e318]:
              - 'generic "图标: profile" [ref=e319]':
                - img [ref=e320]
              - generic [ref=e322]: 属性
              - generic [ref=e323]: <dmodule>
              - generic [ref=e324]: "1"
            - generic [ref=e326]:
              - generic "id" [ref=e327]:
                - generic [ref=e328]: id
              - textbox [ref=e330]
          - generic [ref=e331]:
            - generic [ref=e332]:
              - 'generic "图标: apartment" [ref=e333]':
                - img [ref=e334]
              - generic [ref=e336]: 元素
              - generic [ref=e337]: 双击插入
            - generic [ref=e338]:
              - generic [ref=e339]:
                - generic [ref=e340]:
                  - generic [ref=e341]: 子元素
                  - generic [ref=e342]: "1"
                - generic "Description" [ref=e344] [cursor=pointer]
              - generic [ref=e345]:
                - generic [ref=e346]:
                  - generic [ref=e347]: 同级元素
                  - generic [ref=e348]: "0"
                - generic [ref=e350]: 无
      - generic [ref=e351]:
        - generic [ref=e352] [cursor=pointer]:
          - generic [ref=e353]: 流程信息
          - 'generic "图标: up" [ref=e354]':
            - img [ref=e355]
        - text: ✓
```

# Test source

```ts
  1   | /**
  2   |  * MainProcedureDesigner 对话框回归测试
  3   |  *
  4   |  * 页面结构（基于实际截图确认）：
  5   |  * - 访问 DM URL 后直接进入 MainProcedureDesigner（无需切换 Tab）
  6   |  * - 左侧：步骤树（《操作步骤》→ 步骤1）
  7   |  * - 右侧：内容 Tabs（警告/注意/段落/注/插图/多媒体/表格）
  8   |  * - 每个 Tab 有工具栏：增加/编辑/删除/上移/下移
  9   |  * - 点击"增加"→ 弹出内容编辑对话框（UEditor）
  10  |  * - UEditor 工具栏有：内部引用 / DM引用 / 图符 自定义按钮
  11  |  *
  12  |  * 运行：
  13  |  *   npm run test:mainprocedure:headed   ← 推荐（可视化）
  14  |  *   npm run test:mainprocedure:debug    ← 调试
  15  |  */
  16  | 
  17  | const { test, expect } = require('@playwright/test')
  18  | const http = require('http')
  19  | const fs = require('fs')
  20  | 
  21  | // ── 配置 ─────────────────────────────────────────────────────────────────────
  22  | // 注意：使用 playwright.config.js（baseURL=3000），不用 playwright.config.ts（baseURL=3003）
  23  | // 运行命令：npm run test:mainprocedure:headed
  24  | const BASE_URL = 'http://localhost:3000'
  25  | const API_URL  = 'http://localhost:9999'
  26  | 
  27  | // 包含 mainProcedure 的测试 DM（212A = 操作步骤类型）
  28  | const MAINPROC_DM_URL = `${BASE_URL}/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN`
  29  | 
  30  | const SS_DIR = 'tests/screenshots/mainprocedure'
  31  | 
  32  | // ── 辅助：通过 API 登录，注入 token ──────────────────────────────────────────
  33  | async function login(page) {
  34  |   await page.goto(BASE_URL)
  35  |   await page.waitForLoadState('domcontentloaded')
  36  | 
  37  |   const token = await new Promise((resolve, reject) => {
  38  |     const body = JSON.stringify({ username: 'admin', password: '123456' })
  39  |     const req = http.request({
  40  |       hostname: 'localhost', port: 9999,
  41  |       path: '/jeecg-boot/sys/login', method: 'POST',
  42  |       headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  43  |     }, (res) => {
  44  |       let data = ''
  45  |       res.on('data', c => data += c)
  46  |       res.on('end', () => {
  47  |         try {
  48  |           const d = JSON.parse(data)
  49  |           d.success ? resolve(d.result.token) : reject(new Error(d.message || '登录失败'))
  50  |         } catch (e) { reject(e) }
  51  |       })
  52  |     })
  53  |     req.on('error', reject)
  54  |     req.write(body)
  55  |     req.end()
  56  |   })
  57  | 
  58  |   await page.evaluate(t => {
  59  |     localStorage.setItem('pro__Access-Token', JSON.stringify({ value: t, expire: Date.now() + 86400000 }))
  60  |   }, token)
  61  |   console.log('✓ 登录成功，token 已注入')
  62  | }
  63  | 
  64  | // ── 辅助：截图 ───────────────────────────────────────────────────────────────
  65  | async function ss(page, name) {
  66  |   if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true })
  67  |   await page.screenshot({ path: `${SS_DIR}/${name}.png` })
  68  | }
  69  | 
  70  | // ── 辅助：进入 MainProcedureDesigner（访问 DM URL 后页面即为设计视图）────────
  71  | async function openMainProcedureDM(page) {
  72  |   await page.goto(MAINPROC_DM_URL, { waitUntil: 'networkidle', timeout: 30000 })
  73  |   await page.waitForTimeout(2000)
  74  | 
  75  |   // 等待步骤树出现（确认已进入 MainProcedureDesigner）
  76  |   await page.waitForSelector('.ant-tree', { timeout: 15000 })
  77  |   console.log('✓ MainProcedureDesigner 已加载')
  78  | 
  79  |   // 选中第一个步骤节点（"步骤1"或任意步骤）
  80  |   const stepNode = page.locator('.ant-tree-node-content-wrapper').filter({ hasText: /步骤/ }).first()
  81  |   if (await stepNode.isVisible({ timeout: 3000 }).catch(() => false)) {
  82  |     await stepNode.click()
  83  |     await page.waitForTimeout(400)
  84  |     console.log('✓ 步骤1 已选中')
  85  |   } else {
  86  |     // 若没有步骤，点任意节点
  87  |     await page.locator('.ant-tree-node-content-wrapper').first().click().catch(() => {})
  88  |     await page.waitForTimeout(400)
  89  |   }
  90  | }
  91  | 
  92  | // ── 辅助：点击内容 Tab 并打开编辑器 ─────────────────────────────────────────
  93  | // tabText: 警告 | 注意 | 段落 | 注
  94  | async function openEditorForTab(page, tabText) {
  95  |   // 1. 切换到目标 Tab
> 96  |   await page.locator(`.ant-tabs-tab:has-text("${tabText}")`).first().click()
      |                                                                      ^ Error: locator.click: Test timeout of 120000ms exceeded.
  97  |   await page.waitForTimeout(400)
  98  | 
  99  |   // 2. 点击"增加"按钮（Tab 内工具栏）
  100 |   await page.locator('.tab-toolbar button:has-text("增加")').first().click()
  101 |   await page.waitForTimeout(1500)
  102 | 
  103 |   // 3. 等待 UEditor 加载完成
  104 |   await page.locator('.edui-container').first().waitFor({ state: 'visible', timeout: 10000 })
  105 |   console.log(`✓ 编辑器已打开（${tabText}）`)
  106 | }
  107 | 
  108 | // ── 辅助：关闭最顶层模态框 ──────────────────────────────────────────────────
  109 | async function closeTopModal(page) {
  110 |   const cancelBtn = page.locator('.ant-modal-wrap:visible .ant-modal-footer button:has-text("取消")').last()
  111 |   if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  112 |     await cancelBtn.click()
  113 |   } else {
  114 |     await page.keyboard.press('Escape')
  115 |   }
  116 |   await page.waitForTimeout(500)
  117 | }
  118 | 
  119 | // ── 辅助：统计可见模态框数量 ─────────────────────────────────────────────────
  120 | async function countModals(page) {
  121 |   return page.locator('.ant-modal-wrap:visible').count()
  122 | }
  123 | 
  124 | // ── 辅助：UEditor 工具栏按钮点击（支持多种选择器备用）──────────────────────
  125 | async function clickUEditorButton(page, titlePattern) {
  126 |   // UEditor 按钮可能是 <div class="edui-btn"> 或 <button>，title 属性放在外层容器
  127 |   const selectors = [
  128 |     `.edui-toolbar [title="${titlePattern}"]`,
  129 |     `.edui-toolbar [title*="${titlePattern}"]`,
  130 |     `.edui-toolbar .edui-btn[title*="${titlePattern}"]`,
  131 |     `.edui-toolbar .edui-button[title*="${titlePattern}"]`,
  132 |   ]
  133 |   for (const sel of selectors) {
  134 |     const el = page.locator(sel).first()
  135 |     if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
  136 |       await el.click()
  137 |       return true
  138 |     }
  139 |   }
  140 |   console.warn(`⚠️  未找到 UEditor 按钮: ${titlePattern}`)
  141 |   return false
  142 | }
  143 | 
  144 | // =============================================================================
  145 | // 测试套件 1：P0 对话框功能测试
  146 | // =============================================================================
  147 | test.describe('MainProcedureDesigner 对话框回归测试', () => {
  148 |   test.setTimeout(120_000)
  149 | 
  150 |   test.beforeEach(async ({ page }) => {
  151 |     await login(page)
  152 |     await openMainProcedureDM(page)
  153 |   })
  154 | 
  155 |   // ── P0-1 ─────────────────────────────────────────────────────────────────
  156 |   test('P0-1: 警告Tab - 内部引用对话框正常打开/关闭', async ({ page }) => {
  157 |     await openEditorForTab(page, '警告')
  158 |     await ss(page, 'p0-1-editor-opened')
  159 | 
  160 |     const before = await countModals(page)
  161 |     const clicked = await clickUEditorButton(page, '内部引用')
  162 |     expect(clicked, '未找到内部引用按钮').toBe(true)
  163 |     await page.waitForTimeout(800)
  164 |     await ss(page, 'p0-1-after-click')
  165 | 
  166 |     const after = await countModals(page)
  167 |     expect(after, '内部引用对话框未弹出').toBeGreaterThan(before)
  168 | 
  169 |     // 验证对话框标题
  170 |     const title = await page.locator('.ant-modal-wrap:visible .ant-modal-title').last().textContent()
  171 |     console.log('对话框标题:', title)
  172 |     expect(title).toMatch(/引用/)
  173 | 
  174 |     // 关闭
  175 |     await closeTopModal(page)
  176 |     const afterClose = await countModals(page)
  177 |     expect(afterClose, '对话框未正常关闭').toBeLessThan(after)
  178 |     console.log('✅ P0-1 通过')
  179 |   })
  180 | 
  181 |   // ── P0-2 ─────────────────────────────────────────────────────────────────
  182 |   test('P0-2: 快速连续点击 - 不产生重复对话框（核心验证：修复去掉了双重visible赋值）', async ({ page }) => {
  183 |     await openEditorForTab(page, '警告')
  184 | 
  185 |     // 快速点击 3 次内部引用按钮
  186 |     for (let i = 0; i < 3; i++) {
  187 |       await clickUEditorButton(page, '内部引用')
  188 |       await page.waitForTimeout(200)
  189 |     }
  190 |     await page.waitForTimeout(800)
  191 |     await ss(page, 'p0-2-triple-click')
  192 | 
  193 |     // 编辑器modal(1) + 内部引用modal(1) = 最多2个；若有重复叠加则 > 2
  194 |     const count = await countModals(page)
  195 |     console.log(`可见对话框数量: ${count}（期望 ≤ 2）`)
  196 |     expect(count, '对话框重复叠加（双重 visible 更新 BUG 未修复）').toBeLessThanOrEqual(2)
```