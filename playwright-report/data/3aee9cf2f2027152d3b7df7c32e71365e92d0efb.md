# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: illustratedPartsCatalog.spec.js >> IllustratedPartsCatalog XML Generation >> 应该正确处理 partIdentSegment 的子元素顺序
- Location: tests\illustratedPartsCatalog.spec.js:136:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
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
                    - 'button "图标: save 已保存" [ref=e155] [cursor=pointer]':
                      - 'generic "图标: save"':
                        - img
                      - generic: 已保存
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
                      - generic [ref=e177]: "2"
                      - text: <dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://www.purl.org/dc/elements/1.1/" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/ipd.xsd">
                    - generic [ref=e178]:
                      - generic [ref=e179]: "3"
                      - text: <identAndStatusSection>↔</identAndStatusSection>
                    - generic [ref=e180]:
                      - generic [ref=e181]: "67"
                      - text: <content>
                    - generic [ref=e182]:
                      - generic:
                        - generic [ref=e183]: "68"
                        - link "✎" [ref=e186] [cursor=pointer]:
                          - /url: javascript:void(0);
                          - generic [ref=e187]: ✎
                      - text: <illustratedPartsCatalog>
                    - generic [ref=e188]:
                      - generic:
                        - generic [ref=e189]: "69"
                        - link "✎" [ref=e192] [cursor=pointer]:
                          - /url: javascript:void(0);
                          - generic [ref=e193]: ✎
                      - text: <figure xmlns:xlink="http://www.w3.org/1999/xlink">
                    - generic [ref=e194]:
                      - generic [ref=e195]: "70"
                      - text: <title>测试图片</title>
                    - generic [ref=e196]:
                      - generic [ref=e197]: "71"
                      - text: <graphic xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101-30101-00004-A-001-01">
                    - generic [ref=e198]:
                      - generic [ref=e199]: "72"
                      - text: </graphic>
                    - generic [ref=e200]:
                      - generic [ref=e201]: "73"
                      - text: <legend>
                    - generic [ref=e202]:
                      - generic [ref=e203]: "74"
                      - text: <definitionList>
                    - generic [ref=e204]:
                      - generic [ref=e205]: "75"
                      - text: <definitionListItem>
                    - generic [ref=e206]:
                      - generic [ref=e207]: "76"
                      - text: <listItemTerm>TL01</listItemTerm>
                    - generic [ref=e208]:
                      - generic [ref=e209]: "77"
                      - text: <listItemDefinition>
                    - generic [ref=e210]:
                      - generic [ref=e211]: "78"
                      - text: <para>高娜</para>
                    - generic [ref=e212]:
                      - generic [ref=e213]: "79"
                      - text: </listItemDefinition>
                    - generic [ref=e214]:
                      - generic [ref=e215]: "80"
                      - text: </definitionListItem>
                    - generic [ref=e216]:
                      - generic [ref=e217]: "81"
                      - text: </definitionList>
                    - generic [ref=e218]:
                      - generic [ref=e219]: "82"
                      - text: </legend>
                    - generic [ref=e220]:
                      - generic [ref=e221]: "83"
                      - text: </figure>
                    - generic [ref=e222]:
                      - generic [ref=e223]: "84"
                      - text: <catalogSeqNumber catalogItemNumber="A02" indenture="3">
            - tablist [ref=e229]:
              - generic [ref=e230]:
                - generic:
                  - generic:
                    - 'generic "图标: left"':
                      - img
                - generic:
                  - generic:
                    - 'generic "图标: right"':
                      - img
                - generic [ref=e234]:
                  - 'tab "图标: edit 设计视图" [disabled] [ref=e235]':
                    - generic [ref=e236]:
                      - 'generic "图标: edit" [ref=e237]':
                        - img [ref=e238]
                      - text: 设计视图
                  - 'tab "图标: code 源码视图" [selected] [ref=e240] [cursor=pointer]':
                    - generic [ref=e241]:
                      - 'generic "图标: code" [ref=e242]':
                        - img [ref=e243]
                      - text: 源码视图
        - generic [ref=e247]:
          - generic [ref=e248]:
            - generic [ref=e249]:
              - 'generic "图标: profile" [ref=e250]':
                - img [ref=e251]
              - generic [ref=e253]: 属性
            - generic [ref=e254]:
              - 'generic "图标: select" [ref=e255]':
                - img [ref=e256]
              - paragraph [ref=e258]: 请在左侧选择元素
          - generic [ref=e259]:
            - generic [ref=e260]:
              - 'generic "图标: apartment" [ref=e261]':
                - img [ref=e262]
              - generic [ref=e264]: 元素
              - generic [ref=e265]: 双击插入
            - generic [ref=e266]:
              - 'generic "图标: select" [ref=e267]':
                - img [ref=e268]
              - paragraph [ref=e270]: 请先选择元素
      - generic [ref=e272] [cursor=pointer]:
        - generic [ref=e273]: 流程信息
        - 'generic "图标: up" [ref=e274]':
          - img [ref=e275]
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | 
  3   | /**
  4   |  * IllustratedPartsCatalog XML 生成和校验测试
  5   |  * 验证 S1000D 4.0 IPD Schema 符合性
  6   |  */
  7   | test.describe('IllustratedPartsCatalog XML Generation', () => {
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
> 25  |     await page.waitForLoadState('networkidle');
      |                ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
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
  108 |     await page.click('div[role="tab"]:has-text("源码视图")');
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
```