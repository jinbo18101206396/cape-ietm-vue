# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\codemirror-layout-fix.spec.js >> CodeMirror 布局修复验证 >> 控制台应该显示正确的重建日志
- Location: tests\e2e\codemirror-layout-fix.spec.js:165:3

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
- generic [ref=e9]:
  - generic [ref=e10]:
    - generic [ref=e11]:
      - heading "IETM 研发管理系统" [level=1] [ref=e12]
      - paragraph [ref=e13]: 武器装备交互式电子技术手册
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: 📊
        - generic [ref=e17]: 智能数据管理与分析
      - generic [ref=e18]:
        - generic [ref=e19]: 🔒
        - generic [ref=e20]: 企业级安全保障
      - generic [ref=e21]:
        - generic [ref=e22]: ⚡
        - generic [ref=e23]: 高效协同工作流
  - generic [ref=e24]:
    - generic [ref=e25]:
      - heading "用户登录" [level=2] [ref=e26]
      - paragraph [ref=e27]: 欢迎使用 IETM 研发管理系统
    - generic [ref=e28]:
      - generic [ref=e30]:
        - generic [ref=e35]:
          - generic [ref=e36]: 账户名
          - generic [ref=e37]:
            - textbox "账户名" [ref=e38]:
              - /placeholder: 请输入账户名 / admin
              - text: admin
            - generic: 👤
        - generic [ref=e43]:
          - generic [ref=e44]: 密码
          - generic [ref=e45]:
            - textbox "密码" [ref=e46]:
              - /placeholder: 请输入密码 / 123456
              - text: "123456"
            - generic: 🔒
      - generic [ref=e47]:
        - generic [ref=e48] [cursor=pointer]:
          - checkbox "记住密码" [checked] [ref=e49]
          - generic [ref=e50]: 记住密码
        - link "忘记密码？" [ref=e51] [cursor=pointer]:
          - /url: "#"
      - button "登 录" [ref=e52] [cursor=pointer]
    - generic [ref=e53]:
      - text: Copyright © 2026
      - link "中国航空综合技术研究所" [ref=e54] [cursor=pointer]:
        - /url: "#"
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