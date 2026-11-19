# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: illustratedPartsCatalog.spec.js >> IllustratedPartsCatalog XML Generation >> 应该正确处理 manufacturerCode 的文本内容格式
- Location: tests\illustratedPartsCatalog.spec.js:184:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: net::ERR_ABORTED at http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN
Call log:
  - navigating to "http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN", waiting until "load"

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
      - button "登录中..." [disabled] [ref=e52]
    - generic [ref=e53]:
      - text: Copyright © 2026
      - link "中国航空综合技术研究所" [ref=e54] [cursor=pointer]:
        - /url: "#"
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
> 22  |     await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN');
      |                ^ Error: page.goto: net::ERR_ABORTED at http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN
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
```