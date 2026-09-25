# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\codemirror-layout-fix.spec.js >> CodeMirror 布局修复验证 >> 多次切换布局保持一致
- Location: tests\e2e\codemirror-layout-fix.spec.js:107:3

# Error details

```
Test timeout of 60000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="账号"]')

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
        - menuitem "···" [ref=e46]:
          - generic [ref=e47] [cursor=pointer]: ···
    - generic [ref=e48]:
      - 'generic "图标: search" [ref=e50] [cursor=pointer]':
        - img [ref=e51]
      - 'link "图标: question-circle-o" [ref=e54] [cursor=pointer]':
        - /url: http://doc.jeecg.com
        - 'generic "图标: question-circle-o" [ref=e55]':
          - img [ref=e56]
      - 'generic "图标: bell" [ref=e62] [cursor=pointer]':
        - img [ref=e63]
      - generic [ref=e65] [cursor=pointer]: 欢迎您，管理员
      - 'link "图标: logout 退出登录" [ref=e68] [cursor=pointer]':
        - /url: javascript:;
        - 'generic "图标: logout" [ref=e69]':
          - img [ref=e70]
        - text: 退出登录
      - generic "系统设置"
  - main [ref=e72]:
    - generic [ref=e73]:
      - tablist [ref=e74]:
        - generic [ref=e75]:
          - generic:
            - generic:
              - 'generic "图标: left"':
                - img
          - generic:
            - generic:
              - 'generic "图标: right"':
                - img
          - generic [ref=e79]:
            - tab "首页" [ref=e80] [cursor=pointer]:
              - generic [ref=e81]: 首页
            - 'tab "浏览或编辑DM内容 图标: close" [selected] [ref=e82] [cursor=pointer]':
              - generic [ref=e83]:
                - text: 浏览或编辑DM内容
                - 'generic "图标: close" [ref=e84]':
                  - img [ref=e85]
      - generic:
        - tabpanel
    - generic [ref=e88]:
      - generic [ref=e91]:
        - tree [ref=e94]:
          - 'treeitem "图标: down dmodule" [ref=e95]':
            - 'generic "图标: down" [ref=e97] [cursor=pointer]':
              - img [ref=e98]
            - generic "dmodule" [ref=e100] [cursor=pointer]
            - group [ref=e101]:
              - 'treeitem "图标: down identAndStatusSection" [ref=e102]':
                - 'generic "图标: down" [ref=e104] [cursor=pointer]':
                  - img [ref=e105]
                - generic "identAndStatusSection" [ref=e107] [cursor=pointer]
              - 'treeitem "图标: down content" [ref=e108]':
                - 'generic "图标: down" [ref=e110] [cursor=pointer]':
                  - img [ref=e111]
                - generic "content" [ref=e113] [cursor=pointer]
        - generic [ref=e114]:
          - generic [ref=e115]:
            - 'generic "图标: edit" [ref=e116]':
              - img [ref=e117]
            - generic [ref=e119]: 编辑模式 · 可编辑
            - generic [ref=e120]: DMC：DMC-ZB1-A-03-00-00-00A-007A-A_001-03_zh-CN
          - generic [ref=e121]:
            - tabpanel [ref=e123]:
              - generic [ref=e124]:
                - generic [ref=e125]:
                  - generic [ref=e126]:
                    - button "<" [ref=e127] [cursor=pointer]:
                      - generic: <
                    - generic [ref=e128]:
                      - generic "中/英文切换" [ref=e129]:
                        - combobox [ref=e130] [cursor=pointer]:
                          - generic "English" [ref=e132]
                          - 'generic "图标: down" [ref=e134]':
                            - img [ref=e135]
                      - 'button "图标: unordered-list 格式化" [ref=e137] [cursor=pointer]':
                        - 'generic "图标: unordered-list"':
                          - img
                        - generic: 格式化
                      - 'button "图标: plus-square 折叠/展开" [ref=e138] [cursor=pointer]':
                        - 'generic "图标: plus-square"':
                          - img
                        - generic: 折叠/展开
                      - 'button "图标: swap 移动行" [ref=e139] [cursor=pointer]':
                        - 'generic "图标: swap"':
                          - img
                        - generic: 移动行
                      - 'button "图标: search 查找" [ref=e140] [cursor=pointer]':
                        - 'generic "图标: search"':
                          - img
                        - generic: 查找
                      - 'button "图标: zoom-in 放大" [ref=e141] [cursor=pointer]':
                        - 'generic "图标: zoom-in"':
                          - img
                        - generic: 放大
                      - 'button "图标: zoom-out 缩小" [ref=e142] [cursor=pointer]':
                        - 'generic "图标: zoom-out"':
                          - img
                        - generic: 缩小
                      - 'button "图标: undo 撤销" [ref=e143] [cursor=pointer]':
                        - 'generic "图标: undo"':
                          - img
                        - generic: 撤销
                      - 'button "图标: redo 重做" [ref=e144] [cursor=pointer]':
                        - 'generic "图标: redo"':
                          - img
                        - generic: 重做
                      - 'button "图标: delete 删除行" [ref=e145] [cursor=pointer]':
                        - 'generic "图标: delete"':
                          - img
                        - generic: 删除行
                      - 'button "图标: download 导出" [ref=e146] [cursor=pointer]':
                        - 'generic "图标: download"':
                          - img
                        - generic: 导出
                    - button ">" [ref=e147] [cursor=pointer]:
                      - generic: ">"
                  - generic [ref=e149]:
                    - 'button "图标: save 已保存" [ref=e150] [cursor=pointer]':
                      - 'generic "图标: save"':
                        - img
                      - generic: 已保存
                    - 'button "图标: import 签入" [ref=e151] [cursor=pointer]':
                      - 'generic "图标: import"':
                        - img
                      - generic: 签入
                    - 'button "图标: link 引用DM" [ref=e152] [cursor=pointer]':
                      - 'generic "图标: link"':
                        - img
                      - generic: 引用DM
                    - 'button "图标: picture 插入图符" [ref=e153] [cursor=pointer]':
                      - 'generic "图标: picture"':
                        - img
                      - generic: 插入图符
                    - 'button "图标: file-text 内部引用" [ref=e154] [cursor=pointer]':
                      - 'generic "图标: file-text"':
                        - img
                      - generic: 内部引用
                    - 'button "图标: ordered-list 对象列表" [ref=e155] [cursor=pointer]':
                      - 'generic "图标: ordered-list"':
                        - img
                      - generic: 对象列表
                    - 'button "图标: check-circle 校验" [ref=e156] [cursor=pointer]':
                      - 'generic "图标: check-circle"':
                        - img
                      - generic: 校验
                    - 'button "图标: eye 预览" [ref=e157] [cursor=pointer]':
                      - 'generic "图标: eye"':
                        - img
                      - generic: 预览
                    - 'button "图标: sync 重建refs与DOCTYPE" [ref=e158] [cursor=pointer]':
                      - 'generic "图标: sync"':
                        - img
                      - generic: 重建refs与DOCTYPE
                    - 'button "图标: code 自定义生成" [ref=e159] [cursor=pointer]':
                      - 'generic "图标: code"':
                        - img
                      - generic: 自定义生成
                    - 'button "图标: file 由Word生成" [ref=e160] [cursor=pointer]':
                      - 'generic "图标: file"':
                        - img
                      - generic: 由Word生成
                - generic [ref=e162]:
                  - textbox [ref=e163]
                  - generic [ref=e168]:
                    - generic [ref=e169]:
                      - generic [ref=e172]: "1"
                      - text: <?xml version="1.0" encoding="UTF-8"?>
                    - generic [ref=e173]:
                      - generic:
                        - generic [ref=e174]: "2"
                        - generic [ref=e176] [cursor=pointer]: ▾
                      - text: <dmodule xmlns:dc="http://www.purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/descript.xsd">
                    - generic [ref=e177]:
                      - generic:
                        - generic [ref=e178]: "3"
                        - generic [ref=e180] [cursor=pointer]: ▸
                      - text: <identAndStatusSection>↔</identAndStatusSection>
                    - generic [ref=e181]:
                      - generic:
                        - generic [ref=e182]: "67"
                        - generic [ref=e184] [cursor=pointer]: ▾
                      - text: <content>
                    - generic [ref=e185]:
                      - generic:
                        - generic [ref=e186]: "68"
                        - generic [ref=e188] [cursor=pointer]: ▾
                      - text: <description>
                    - generic [ref=e189]:
                      - generic:
                        - generic [ref=e190]: "69"
                        - generic [ref=e192] [cursor=pointer]: ▾
                        - link "✎" [ref=e195] [cursor=pointer]:
                          - /url: javascript:void(0);
                          - generic [ref=e196]: ✎
                      - text: <para>
                    - generic [ref=e197]:
                      - generic [ref=e198]: "70"
                      - text: <symbol infoEntityIdent="ICN-ZB1-A-020000-60101-30101-00017-A-001-01" reproductionWidth="1920" reproductionHeight="1080" reproductionScale="100"/>
                    - generic [ref=e199]:
                      - generic:
                        - generic [ref=e200]: "71"
                        - generic [ref=e202] [cursor=pointer]: ▾
                      - text: <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
                    - generic [ref=e203]:
                      - generic:
                        - generic [ref=e204]: "72"
                        - generic [ref=e206] [cursor=pointer]: ▾
                      - text: <dmRefIdent>
                    - generic [ref=e207]:
                      - generic [ref=e208]: "73"
                      - text: <dmCode assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A" modelIdentCode="ZB1" subSubSystemCode="0" subSystemCode="0" systemCode="00" systemDiffCode="A"/>
                    - generic [ref=e209]:
                      - generic [ref=e210]: "74"
                      - text: <language languageIsoCode="zh" countryIsoCode="CN"/>
                    - generic [ref=e211]:
                      - generic [ref=e212]: "75"
                      - text: </dmRefIdent>
                    - generic [ref=e213]:
                      - generic:
                        - generic [ref=e214]: "76"
                        - generic [ref=e216] [cursor=pointer]: ▾
                      - text: <dmRefAddressItems>
                    - generic [ref=e217]:
                      - generic:
                        - generic [ref=e218]: "77"
                        - generic [ref=e220] [cursor=pointer]: ▾
                      - text: <dmTitle>
                    - generic [ref=e221]:
                      - generic:
                        - generic [ref=e222]: "78"
                        - generic [ref=e224] [cursor=pointer]: ▾
                      - text: <techName>《内置构型》</techName>
                    - generic [ref=e225]:
                      - generic:
                        - generic [ref=e226]: "79"
                        - generic [ref=e228] [cursor=pointer]: ▾
                      - text: <infoName>符号清单</infoName>
                    - generic [ref=e229]:
                      - generic [ref=e230]: "80"
                      - text: </dmTitle>
                    - generic [ref=e231]:
                      - generic [ref=e232]: "81"
                      - text: </dmRefAddressItems>
                    - generic [ref=e233]:
                      - generic [ref=e234]: "82"
                      - text: </dmRef>
            - tablist [ref=e240]:
              - generic [ref=e241]:
                - generic:
                  - generic:
                    - 'generic "图标: left"':
                      - img
                - generic:
                  - generic:
                    - 'generic "图标: right"':
                      - img
                - generic [ref=e245]:
                  - 'tab "图标: edit 设计视图" [disabled] [ref=e246]':
                    - generic [ref=e247]:
                      - 'generic "图标: edit" [ref=e248]':
                        - img [ref=e249]
                      - text: 设计视图
                  - 'tab "图标: code 源码视图" [selected] [ref=e251] [cursor=pointer]':
                    - generic [ref=e252]:
                      - 'generic "图标: code" [ref=e253]':
                        - img [ref=e254]
                      - text: 源码视图
        - generic [ref=e258]:
          - generic [ref=e259]:
            - generic [ref=e260]:
              - 'generic "图标: profile" [ref=e261]':
                - img [ref=e262]
              - generic [ref=e264]: 属性
            - generic [ref=e265]:
              - 'generic "图标: select" [ref=e266]':
                - img [ref=e267]
              - paragraph [ref=e269]: 请在左侧选择元素
          - generic [ref=e270]:
            - generic [ref=e271]:
              - 'generic "图标: apartment" [ref=e272]':
                - img [ref=e273]
              - generic [ref=e275]: 元素
              - generic [ref=e276]: 双击插入
            - generic [ref=e277]:
              - 'generic "图标: select" [ref=e278]':
                - img [ref=e279]
              - paragraph [ref=e281]: 请先选择元素
      - generic [ref=e282]:
        - generic [ref=e283] [cursor=pointer]:
          - generic [ref=e284]: 流程信息
          - 'generic "图标: up" [ref=e285]':
            - img [ref=e286]
        - text: ✓
```

# Test source

```ts
  1   | /**
  2   |  * CodeMirror 布局修复验证测试
  3   |  *
  4   |  * 测试场景：从设计视图切换到源码视图时，CodeMirror 布局应该正常
  5   |  */
  6   | 
  7   | const { test, expect } = require('@playwright/test');
  8   | 
  9   | test.describe('CodeMirror 布局修复验证', () => {
  10  |   test.beforeEach(async ({ page }) => {
  11  |     // 登录
  12  |     await page.goto('http://localhost:3000/user/login');
> 13  |     await page.fill('input[placeholder="账号"]', 'admin');
      |                ^ Error: page.fill: Test timeout of 60000ms exceeded.
  14  |     await page.fill('input[placeholder="密码"]', 'admin');
  15  |     await page.click('button:has-text("登录")');
  16  |     await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  17  | 
  18  |     // 进入数据模块列表
  19  |     await page.goto('http://localhost:3000/ietm/IetmDataModuleManagementIndex');
  20  |     await page.waitForLoadState('networkidle');
  21  |   });
  22  | 
  23  |   test('从设计视图切换到源码视图，布局应该正常', async ({ page }) => {
  24  |     // 1. 找到第一个 DM 并进入编辑
  25  |     const firstRow = page.locator('.ant-table-tbody tr').first();
  26  |     await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();
  27  | 
  28  |     // 等待编辑器加载
  29  |     await page.waitForSelector('.CodeMirror', { timeout: 15000 });
  30  | 
  31  |     // 2. 记录直接进入源码视图的布局（对照组）
  32  |     const directMeasurements = await page.evaluate(() => {
  33  |       const gutters = document.querySelector('.CodeMirror-gutters');
  34  |       const foldGutter = document.querySelector('.CodeMirror-foldgutter');
  35  |       const cmScroll = document.querySelector('.CodeMirror-scroll');
  36  | 
  37  |       return {
  38  |         guttersWidth: gutters?.offsetWidth || 0,
  39  |         foldGutterLeft: foldGutter?.offsetLeft || 0,
  40  |         scrollHeight: cmScroll?.offsetHeight || 0
  41  |       };
  42  |     });
  43  | 
  44  |     console.log('直接进入源码视图的测量:', directMeasurements);
  45  | 
  46  |     // 验证直接进入时布局正常
  47  |     expect(directMeasurements.guttersWidth).toBeGreaterThan(50);
  48  |     expect(directMeasurements.foldGutterLeft).toBe(44);
  49  |     expect(directMeasurements.scrollHeight).toBeGreaterThan(600);
  50  | 
  51  |     // 3. 双击 para 进入设计视图
  52  |     const paraNode = page.locator('.ztree li:has-text("para")').first();
  53  |     await paraNode.dblclick();
  54  | 
  55  |     // 等待设计视图加载
  56  |     await page.waitForSelector('.para-designer', { timeout: 5000 });
  57  | 
  58  |     // 确认当前在设计视图
  59  |     const designTabActive = await page.locator('.view-tabs .ant-tabs-tab-active:has-text("设计视图")').isVisible();
  60  |     expect(designTabActive).toBe(true);
  61  | 
  62  |     // 4. 点击"源码视图"标签切换回源码视图
  63  |     await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")');
  64  | 
  65  |     // 等待切换完成和 rebuildEditor 执行
  66  |     // 使用多个等待策略确保重建完成
  67  |     await page.waitForTimeout(500); // 等待 requestAnimationFrame 完成
  68  | 
  69  |     // 等待 rebuildEditor 的日志出现
  70  |     await page.waitForFunction(() => {
  71  |       return performance.getEntriesByType('measure').length > 0 || true;
  72  |     }, { timeout: 2000 }).catch(() => {
  73  |       // 超时不影响测试，继续
  74  |     });
  75  | 
  76  |     // 5. 测量切换后的布局
  77  |     const switchedMeasurements = await page.evaluate(() => {
  78  |       const gutters = document.querySelector('.CodeMirror-gutters');
  79  |       const foldGutter = document.querySelector('.CodeMirror-foldgutter');
  80  |       const cmScroll = document.querySelector('.CodeMirror-scroll');
  81  |       const tabPane = document.querySelector('.CodeMirror')?.closest('.ant-tabs-tabpane');
  82  | 
  83  |       return {
  84  |         guttersWidth: gutters?.offsetWidth || 0,
  85  |         foldGutterLeft: foldGutter?.offsetLeft || 0,
  86  |         scrollHeight: cmScroll?.offsetHeight || 0,
  87  |         tabPaneDisplay: tabPane ? window.getComputedStyle(tabPane).display : 'N/A'
  88  |       };
  89  |     });
  90  | 
  91  |     console.log('切换后的测量:', switchedMeasurements);
  92  | 
  93  |     // 6. 验证修复效果
  94  |     expect(switchedMeasurements.tabPaneDisplay).not.toBe('none');
  95  |     expect(switchedMeasurements.guttersWidth).toBeGreaterThan(50);
  96  |     expect(switchedMeasurements.foldGutterLeft).toBe(44);
  97  |     expect(switchedMeasurements.scrollHeight).toBeGreaterThan(600);
  98  | 
  99  |     // 7. 对比两次测量，应该一致
  100 |     expect(Math.abs(switchedMeasurements.guttersWidth - directMeasurements.guttersWidth)).toBeLessThan(5);
  101 |     expect(switchedMeasurements.foldGutterLeft).toBe(directMeasurements.foldGutterLeft);
  102 |     expect(Math.abs(switchedMeasurements.scrollHeight - directMeasurements.scrollHeight)).toBeLessThan(50);
  103 | 
  104 |     console.log('✅ 布局修复验证通过！');
  105 |   });
  106 | 
  107 |   test('多次切换布局保持一致', async ({ page }) => {
  108 |     // 1. 进入编辑器
  109 |     const firstRow = page.locator('.ant-table-tbody tr').first();
  110 |     await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();
  111 |     await page.waitForSelector('.CodeMirror', { timeout: 15000 });
  112 | 
  113 |     // 2. 进入设计视图
```