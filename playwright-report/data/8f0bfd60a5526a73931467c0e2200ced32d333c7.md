# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: illustratedPartsCatalog.spec.js >> IllustratedPartsCatalog XML Generation >> 应该通过 S1000D Schema 校验（0 个错误）
- Location: tests\illustratedPartsCatalog.spec.js:98:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('div[role="tab"]:has-text("源码视图")')
    - locator resolved to <div role="tab" aria-selected="true" aria-disabled="false" class="ant-tabs-tab-active ant-tabs-tab">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div tabindex="-1" role="dialog" class="ant-modal-wrap ">…</div> from <div>…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div tabindex="-1" role="dialog" class="ant-modal-wrap ">…</div> from <div>…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    10 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div tabindex="-1" role="dialog" class="ant-modal-wrap ">…</div> from <div>…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
            - generic [ref=e84]:
              - tab "首页" [ref=e85] [cursor=pointer]:
                - generic [ref=e86]: 首页
              - 'tab "浏览或编辑DM内容 图标: close" [selected] [ref=e87] [cursor=pointer]':
                - generic [ref=e88]:
                  - text: 浏览或编辑DM内容
                  - 'generic "图标: close" [ref=e89]':
                    - img [ref=e90]
        - generic:
          - tabpanel
      - generic [ref=e93]:
        - generic [ref=e96]:
          - tree [ref=e99]:
            - 'treeitem "图标: down dmodule" [ref=e100]':
              - 'generic "图标: down" [ref=e102] [cursor=pointer]':
                - img [ref=e103]
              - generic "dmodule" [ref=e105] [cursor=pointer]
              - group [ref=e106]:
                - 'treeitem "图标: down identAndStatusSection" [ref=e107]':
                  - 'generic "图标: down" [ref=e109] [cursor=pointer]':
                    - img [ref=e110]
                  - generic "identAndStatusSection" [ref=e112] [cursor=pointer]
                - 'treeitem "图标: down content" [ref=e113]':
                  - 'generic "图标: down" [ref=e115] [cursor=pointer]':
                    - img [ref=e116]
                  - generic "content" [ref=e118] [cursor=pointer]
          - generic [ref=e119]:
            - generic [ref=e120]:
              - 'generic "图标: edit" [ref=e121]':
                - img [ref=e122]
              - generic [ref=e124]: 编辑模式 · 可编辑
              - generic [ref=e125]: DMC：DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN
            - generic [ref=e126]:
              - generic [ref=e127]:
                - generic:
                  - generic:
                    - generic:
                      - img
                    - generic: 请双击左侧树中的para/levelledPara/figure/table节点或点击铅笔图标打开设计器
                - tabpanel [ref=e128]:
                  - generic [ref=e129]:
                    - generic [ref=e130]:
                      - generic [ref=e131]:
                        - button "<" [ref=e132] [cursor=pointer]:
                          - generic: <
                        - generic [ref=e133]:
                          - generic "中/英文切换" [ref=e134]:
                            - combobox [ref=e135] [cursor=pointer]:
                              - generic "English" [ref=e137]
                              - 'generic "图标: down" [ref=e139]':
                                - img [ref=e140]
                          - 'button "图标: unordered-list 格式化" [ref=e142] [cursor=pointer]':
                            - 'generic "图标: unordered-list"':
                              - img
                            - generic: 格式化
                          - 'button "图标: plus-square 折叠/展开" [ref=e143] [cursor=pointer]':
                            - 'generic "图标: plus-square"':
                              - img
                            - generic: 折叠/展开
                          - 'button "图标: swap 移动行" [ref=e144] [cursor=pointer]':
                            - 'generic "图标: swap"':
                              - img
                            - generic: 移动行
                          - 'button "图标: search 查找" [ref=e145] [cursor=pointer]':
                            - 'generic "图标: search"':
                              - img
                            - generic: 查找
                          - 'button "图标: zoom-in 放大" [ref=e146] [cursor=pointer]':
                            - 'generic "图标: zoom-in"':
                              - img
                            - generic: 放大
                          - 'button "图标: zoom-out 缩小" [ref=e147] [cursor=pointer]':
                            - 'generic "图标: zoom-out"':
                              - img
                            - generic: 缩小
                          - 'button "图标: undo 撤销" [ref=e148] [cursor=pointer]':
                            - 'generic "图标: undo"':
                              - img
                            - generic: 撤销
                          - 'button "图标: redo 重做" [ref=e149] [cursor=pointer]':
                            - 'generic "图标: redo"':
                              - img
                            - generic: 重做
                          - 'button "图标: delete 删除行" [ref=e150] [cursor=pointer]':
                            - 'generic "图标: delete"':
                              - img
                            - generic: 删除行
                          - 'button "图标: download 导出" [ref=e151] [cursor=pointer]':
                            - 'generic "图标: download"':
                              - img
                            - generic: 导出
                        - button ">" [ref=e152] [cursor=pointer]:
                          - generic: ">"
                      - generic [ref=e154]:
                        - 'button "图标: save 未保存" [ref=e155] [cursor=pointer]':
                          - 'generic "图标: save"':
                            - img
                          - generic: 未保存
                        - 'button "图标: import 签入" [ref=e156] [cursor=pointer]':
                          - 'generic "图标: import"':
                            - img
                          - generic: 签入
                        - 'button "图标: link 引用DM" [ref=e157] [cursor=pointer]':
                          - 'generic "图标: link"':
                            - img
                          - generic: 引用DM
                        - 'button "图标: picture 插入图符" [ref=e158] [cursor=pointer]':
                          - 'generic "图标: picture"':
                            - img
                          - generic: 插入图符
                        - 'button "图标: file-text 内部引用" [ref=e159] [cursor=pointer]':
                          - 'generic "图标: file-text"':
                            - img
                          - generic: 内部引用
                        - 'button "图标: ordered-list 对象列表" [ref=e160] [cursor=pointer]':
                          - 'generic "图标: ordered-list"':
                            - img
                          - generic: 对象列表
                        - 'button "图标: check-circle 校验" [ref=e161] [cursor=pointer]':
                          - 'generic "图标: check-circle"':
                            - img
                          - generic: 校验
                        - 'button "图标: eye 预览" [ref=e162] [cursor=pointer]':
                          - 'generic "图标: eye"':
                            - img
                          - generic: 预览
                        - 'button "图标: sync 重建refs与DOCTYPE" [ref=e163] [cursor=pointer]':
                          - 'generic "图标: sync"':
                            - img
                          - generic: 重建refs与DOCTYPE
                        - 'button "图标: code 自定义生成" [ref=e164] [cursor=pointer]':
                          - 'generic "图标: code"':
                            - img
                          - generic: 自定义生成
                        - 'button "图标: file 由Word生成" [ref=e165] [cursor=pointer]':
                          - 'generic "图标: file"':
                            - img
                          - generic: 由Word生成
                    - generic [ref=e167]:
                      - textbox [ref=e168]
                      - generic [ref=e171]:
                        - generic [ref=e172]:
                          - generic [ref=e175]: "1"
                          - text: <?xml version="1.0" encoding="UTF-8"?>
                        - generic [ref=e176]:
                          - generic:
                            - generic [ref=e177]: "2"
                            - generic [ref=e179] [cursor=pointer]: ▾
                          - text: <dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://www.purl.org/dc/elements/1.1/" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/ipd.xsd">
                        - generic [ref=e180]:
                          - generic:
                            - generic [ref=e181]: "3"
                            - generic [ref=e183] [cursor=pointer]: ▸
                          - text: <identAndStatusSection>↔</identAndStatusSection>
                        - generic [ref=e184]:
                          - generic:
                            - generic [ref=e185]: "67"
                            - generic [ref=e187] [cursor=pointer]: ▾
                          - text: <content>
                        - generic [ref=e188]:
                          - generic:
                            - generic [ref=e189]: "68"
                            - generic [ref=e191] [cursor=pointer]: ▾
                            - link "✎" [ref=e194] [cursor=pointer]:
                              - /url: javascript:void(0);
                              - generic [ref=e195]: ✎
                          - text: <illustratedPartsCatalog>
                        - generic [ref=e196]:
                          - generic:
                            - generic [ref=e197]: "69"
                            - generic [ref=e199] [cursor=pointer]: ▾
                            - link "✎" [ref=e202] [cursor=pointer]:
                              - /url: javascript:void(0);
                              - generic [ref=e203]: ✎
                          - text: <figure xmlns:xlink="http://www.w3.org/1999/xlink">
                        - generic [ref=e204]:
                          - generic:
                            - generic [ref=e205]: "70"
                            - generic [ref=e207] [cursor=pointer]: ▾
                          - text: <title>测试图片</title>
                        - generic [ref=e208]:
                          - generic:
                            - generic [ref=e209]: "71"
                            - generic [ref=e211] [cursor=pointer]: ▾
                          - text: <graphic xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101-30101-00004-A-001-01">
                        - generic [ref=e212]:
                          - generic [ref=e213]: "72"
                          - text: </graphic>
                        - generic [ref=e214]:
                          - generic:
                            - generic [ref=e215]: "73"
                            - generic [ref=e217] [cursor=pointer]: ▾
                          - text: <legend>
                        - generic [ref=e218]:
                          - generic:
                            - generic [ref=e219]: "74"
                            - generic [ref=e221] [cursor=pointer]: ▾
                          - text: <definitionList>
                        - generic [ref=e222]:
                          - generic:
                            - generic [ref=e223]: "75"
                            - generic [ref=e225] [cursor=pointer]: ▾
                          - text: <definitionListItem>
                        - generic [ref=e226]:
                          - generic:
                            - generic [ref=e227]: "76"
                            - generic [ref=e229] [cursor=pointer]: ▾
                          - text: <listItemTerm>TL01</listItemTerm>
                        - generic [ref=e230]:
                          - generic:
                            - generic [ref=e231]: "77"
                            - generic [ref=e233] [cursor=pointer]: ▾
                          - text: <listItemDefinition>
                        - generic [ref=e234]:
                          - generic:
                            - generic [ref=e235]: "78"
                            - generic [ref=e237] [cursor=pointer]: ▾
                          - text: <para>高娜</para>
                        - generic [ref=e238]:
                          - generic [ref=e239]: "79"
                          - text: </listItemDefinition>
                        - generic [ref=e240]:
                          - generic [ref=e241]: "80"
                          - text: </definitionListItem>
                        - generic [ref=e242]:
                          - generic [ref=e243]: "81"
                          - text: </definitionList>
                        - generic [ref=e244]:
                          - generic [ref=e245]: "82"
                          - text: </legend>
                        - generic [ref=e246]:
                          - generic [ref=e247]: "83"
                          - text: </figure>
                        - generic [ref=e248]:
                          - generic:
                            - generic [ref=e249]: "84"
                            - generic [ref=e251] [cursor=pointer]: ▾
                          - text: <catalogSeqNumber catalogItemNumber="A02" indenture="3">
                        - generic [ref=e252]:
                          - generic:
                            - generic [ref=e253]: "85"
                            - generic [ref=e255] [cursor=pointer]: ▾
                          - text: <itemSequenceNumber itemSeqNumberValue="">
              - tablist [ref=e261]:
                - generic [ref=e262]:
                  - generic:
                    - generic:
                      - 'generic "图标: left"':
                        - img
                  - generic:
                    - generic:
                      - 'generic "图标: right"':
                        - img
                  - generic [ref=e266]:
                    - 'tab "图标: edit 设计视图" [disabled] [ref=e267]':
                      - generic [ref=e268]:
                        - 'generic "图标: edit" [ref=e269]':
                          - img [ref=e270]
                        - text: 设计视图
                    - 'tab "图标: code 源码视图" [selected] [ref=e272] [cursor=pointer]':
                      - generic [ref=e273]:
                        - 'generic "图标: code" [ref=e274]':
                          - img [ref=e275]
                        - text: 源码视图
          - generic [ref=e279]:
            - generic [ref=e280]:
              - generic [ref=e281]:
                - 'generic "图标: profile" [ref=e282]':
                  - img [ref=e283]
                - generic [ref=e285]: 属性
              - generic [ref=e286]:
                - 'generic "图标: select" [ref=e287]':
                  - img [ref=e288]
                - paragraph [ref=e290]: 请在左侧选择元素
            - generic [ref=e291]:
              - generic [ref=e292]:
                - 'generic "图标: apartment" [ref=e293]':
                  - img [ref=e294]
                - generic [ref=e296]: 元素
                - generic [ref=e297]: 双击插入
              - generic [ref=e298]:
                - 'generic "图标: select" [ref=e299]':
                  - img [ref=e300]
                - paragraph [ref=e302]: 请先选择元素
        - generic [ref=e303]:
          - generic [ref=e304] [cursor=pointer]:
            - generic [ref=e305]: 流程信息
            - 'generic "图标: up" [ref=e306]':
              - img [ref=e307]
          - text: ✓
  - dialog [ref=e311]:
    - document:
      - generic [ref=e314]:
        - generic [ref=e315]:
          - 'generic "icon: question-circle" [ref=e316]':
            - img [ref=e317]
          - generic [ref=e320]: 版本冲突
          - generic [ref=e321]: 该DM已被他人修改，本地版本已失效。是否重新加载最新内容？（本地未保存的修改将丢失）
        - generic [ref=e322]:
          - button "暂 不" [ref=e323] [cursor=pointer]:
            - generic: 暂 不
          - button "重新加载" [active] [ref=e324] [cursor=pointer]:
            - generic: 重新加载
```

# Test source

```ts
  8   | 
  9   |   test.beforeEach(async ({ page }) => {
  10  |     // 1. 访问登录页面
  11  |     await page.goto('http://localhost:3000/');
  12  | 
  13  |     // 2. 登录
  14  |     await page.fill('input[placeholder*="账户名"]', 'admin');
  15  |     await page.fill('input[placeholder*="密码"]', '123456');
  16  |     await page.click('button:has-text("登 录")');
  17  | 
  18  |     // 3. 等待登录成功并跳转
  19  |     await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  20  | 
  21  |     // 4. 访问目标 DM 编辑页面
  22  |     await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN');
  23  | 
  24  |     // 5. 等待页面加载完成
  25  |     await page.waitForLoadState('networkidle');
  26  |     await page.waitForTimeout(2000);
  27  |   });
  28  | 
  29  |   test('应该生成符合 S1000D Schema 的 catalogSeqNumber XML 结构', async ({ page }) => {
  30  |     // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
  31  |     await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
  32  |     await page.waitForTimeout(2000);
  33  | 
  34  |     // 2. 验证设计视图已加载
  35  |     await expect(page.locator('text=图解零部件')).toBeVisible();
  36  | 
  37  |     // 3. 验证目录表格中有数据
  38  |     const tableVisible = await page.locator('table').count();
  39  |     expect(tableVisible).toBeGreaterThan(0);
  40  | 
  41  |     // 4. 点击保存按钮生成 XML
  42  |     await page.click('.ipc-toolbar button:has-text("保存")');
  43  |     await page.waitForTimeout(3000);
  44  | 
  45  |     // 5. 切换到源码视图查看生成的 XML
  46  |     await page.click('div[role="tab"]:has-text("源码视图")');
  47  |     await page.waitForTimeout(1000);
  48  | 
  49  |     // 6. 获取 XML 内容
  50  |     const xmlContent = await page.locator('.CodeMirror').evaluate(el => {
  51  |       return el.CodeMirror.getValue();
  52  |     });
  53  | 
  54  |     console.log('Generated XML:', xmlContent);
  55  | 
  56  |     // 7. 验证 XML 结构
  57  |     // 7.1 验证包含 catalogSeqNumber
  58  |     expect(xmlContent).toContain('<catalogSeqNumber');
  59  |     expect(xmlContent).toContain('</catalogSeqNumber>');
  60  | 
  61  |     // 7.2 验证包含 itemSequenceNumber
  62  |     expect(xmlContent).toContain('<itemSequenceNumber');
  63  |     expect(xmlContent).toContain('</itemSequenceNumber>');
  64  | 
  65  |     // 7.3 验证包含 partIdentSegment (如果有数据)
  66  |     const hasPartIdentSegment = xmlContent.includes('<partIdentSegment>');
  67  |     if (hasPartIdentSegment) {
  68  |       // 验证 partIdentSegment 不为空
  69  |       expect(xmlContent).toMatch(/<partIdentSegment>\s*<descrForPart>[\s\S]*?<\/descrForPart>[\s\S]*?<\/partIdentSegment>/);
  70  | 
  71  |       // 验证 manufacturerCode 使用文本内容而非属性
  72  |       expect(xmlContent).not.toContain('manufacturerCodeValue=');
  73  | 
  74  |       // 验证元素顺序：partIdentSegment 应该在 partRef 之前
  75  |       const partIdentSegmentIndex = xmlContent.indexOf('<partIdentSegment>');
  76  |       const partRefIndex = xmlContent.indexOf('<partRef');
  77  |       if (partRefIndex > 0) {
  78  |         expect(partIdentSegmentIndex).toBeLessThan(partRefIndex);
  79  |       }
  80  |     }
  81  | 
  82  |     // 7.4 验证没有重复的 partIdentSegment
  83  |     const partIdentSegmentMatches = xmlContent.match(/<partIdentSegment>/g);
  84  |     if (partIdentSegmentMatches) {
  85  |       // 在同一个 itemSequenceNumber 中应该只有一个 partIdentSegment
  86  |       const itemSeqNumberMatches = xmlContent.match(/<itemSequenceNumber[^>]*>[\s\S]*?<\/itemSequenceNumber>/g);
  87  |       if (itemSeqNumberMatches) {
  88  |         itemSeqNumberMatches.forEach(itemSeq => {
  89  |           const segments = itemSeq.match(/<partIdentSegment>/g);
  90  |           if (segments) {
  91  |             expect(segments.length).toBeLessThanOrEqual(1);
  92  |           }
  93  |         });
  94  |       }
  95  |     }
  96  |   });
  97  | 
  98  |   test('应该通过 S1000D Schema 校验（0 个错误）', async ({ page }) => {
  99  |     // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
  100 |     await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
  101 |     await page.waitForTimeout(2000);
  102 | 
  103 |     // 2. 点击保存按钮生成 XML
  104 |     await page.click('.ipc-toolbar button:has-text("保存")');
  105 |     await page.waitForTimeout(3000);
  106 | 
  107 |     // 3. 切换到源码视图
> 108 |     await page.click('div[role="tab"]:has-text("源码视图")');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  109 |     await page.waitForTimeout(1000);
  110 | 
  111 |     // 4. 点击校验按钮
  112 |     await page.click('button:has-text("校验")');
  113 | 
  114 |     // 5. 等待校验完成
  115 |     await page.waitForTimeout(3000);
  116 | 
  117 |     // 6. 验证校验结果对话框出现
  118 |     await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
  119 | 
  120 |     // 7. 验证校验结果文本包含"0 个错误"
  121 |     const validationResult = await page.locator('.ant-modal-body').textContent();
  122 |     console.log('Validation Result:', validationResult);
  123 | 
  124 |     expect(validationResult).toContain('0 个错误');
  125 | 
  126 |     // 8. 截图保存校验结果
  127 |     await page.screenshot({
  128 |       path: 'tests/screenshots/validation-success.png',
  129 |       fullPage: true
  130 |     });
  131 | 
  132 |     // 9. 关闭校验对话框
  133 |     await page.keyboard.press('Escape');
  134 |   });
  135 | 
  136 |   test('应该正确处理 partIdentSegment 的子元素顺序', async ({ page }) => {
  137 |     // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
  138 |     await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
  139 |     await page.waitForTimeout(2000);
  140 | 
  141 |     // 2. 点击保存生成 XML
  142 |     await page.click('.ipc-toolbar button:has-text("保存")');
  143 |     await page.waitForTimeout(3000);
  144 | 
  145 |     // 3. 切换到源码视图
  146 |     await page.click('div[role="tab"]:has-text("源码视图")');
  147 |     await page.waitForTimeout(1000);
  148 | 
  149 |     // 4. 获取 XML 内容
  150 |     const xmlContent = await page.locator('.CodeMirror').evaluate(el => {
  151 |       return el.CodeMirror.getValue();
  152 |     });
  153 | 
  154 |     // 5. 使用正则表达式验证 itemSequenceNumber 的子元素顺序
  155 |     const itemSeqPattern = /<itemSequenceNumber[^>]*>([\s\S]*?)<\/itemSequenceNumber>/g;
  156 |     const matches = [...xmlContent.matchAll(itemSeqPattern)];
  157 | 
  158 |     expect(matches.length).toBeGreaterThan(0);
  159 | 
  160 |     matches.forEach(match => {
  161 |       const content = match[1];
  162 | 
  163 |       // 获取各元素的位置
  164 |       const partIdentSegmentPos = content.indexOf('<partIdentSegment>');
  165 |       const partRefPos = content.indexOf('<partRef');
  166 |       const quantityPos = content.indexOf('<quantityPerAssembly>');
  167 |       const uomPos = content.indexOf('<uom>');
  168 | 
  169 |       // 验证顺序：partIdentSegment (如果存在) < partRef < quantityPerAssembly < uom
  170 |       if (partIdentSegmentPos >= 0 && partRefPos >= 0) {
  171 |         expect(partIdentSegmentPos).toBeLessThan(partRefPos);
  172 |       }
  173 | 
  174 |       if (partRefPos >= 0 && quantityPos >= 0) {
  175 |         expect(partRefPos).toBeLessThan(quantityPos);
  176 |       }
  177 | 
  178 |       if (quantityPos >= 0 && uomPos >= 0) {
  179 |         expect(quantityPos).toBeLessThan(uomPos);
  180 |       }
  181 |     });
  182 |   });
  183 | 
  184 |   test('应该正确处理 manufacturerCode 的文本内容格式', async ({ page }) => {
  185 |     // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
  186 |     await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
  187 |     await page.waitForTimeout(2000);
  188 | 
  189 |     // 2. 点击保存生成 XML
  190 |     await page.click('.ipc-toolbar button:has-text("保存")');
  191 |     await page.waitForTimeout(3000);
  192 | 
  193 |     // 3. 切换到源码视图
  194 |     await page.click('div[role="tab"]:has-text("源码视图")');
  195 |     await page.waitForTimeout(1000);
  196 | 
  197 |     // 4. 获取 XML 内容
  198 |     const xmlContent = await page.locator('.CodeMirror').evaluate(el => {
  199 |       return el.CodeMirror.getValue();
  200 |     });
  201 | 
  202 |     // 5. 验证 manufacturerCode 格式
  203 |     if (xmlContent.includes('<manufacturerCode>')) {
  204 |       // 应该使用文本内容格式: <manufacturerCode>value</manufacturerCode>
  205 |       expect(xmlContent).toMatch(/<manufacturerCode>[^<]+<\/manufacturerCode>/);
  206 | 
  207 |       // 不应该使用属性格式: <manufacturerCode manufacturerCodeValue="..."/>
  208 |       expect(xmlContent).not.toContain('manufacturerCodeValue=');
```