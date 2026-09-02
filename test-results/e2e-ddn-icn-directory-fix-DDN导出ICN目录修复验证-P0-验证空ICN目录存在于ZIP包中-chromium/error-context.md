# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ddn-icn-directory-fix.spec.js >> DDN导出ICN目录修复验证 >> P0: 验证空ICN目录存在于ZIP包中
- Location: tests\e2e\ddn-icn-directory-fix.spec.js:14:3

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.fill: Test timeout of 180000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="请输入账户名"]')

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
  1   | const { test, expect } = require('@playwright/test');
  2   | const path = require('path');
  3   | const fs = require('fs');
  4   | const AdmZip = require('adm-zip');
  5   | 
  6   | /**
  7   |  * DDN导出ICN目录修复验证 - 最小化测试
  8   |  *
  9   |  * 核心验证：修复后的ZIP包中必须包含ICN/目录（即使为空）
  10  |  */
  11  | 
  12  | test.describe('DDN导出ICN目录修复验证', () => {
  13  | 
  14  |   test('P0: 验证空ICN目录存在于ZIP包中', async ({ page }) => {
  15  |     console.log('\n========== P0核心验证：ICN目录必须存在 ==========\n');
  16  | 
  17  |     // 1. 登录
  18  |     console.log('步骤1: 登录系统...');
  19  |     await page.goto('http://localhost:3000/user/login');
  20  | 
  21  |     // 等待登录页面加载
  22  |     await page.waitForLoadState('networkidle');
  23  |     await page.waitForTimeout(1000);
  24  | 
  25  |     // 填写登录信息
> 26  |     await page.fill('input[placeholder="请输入账户名"]', 'admin');
      |                ^ Error: page.fill: Test timeout of 180000ms exceeded.
  27  |     await page.fill('input[placeholder="请输入密码"]', 'admin');
  28  | 
  29  |     // 点击登录按钮
  30  |     await page.click('button[type="submit"].login-button');
  31  |     console.log('已提交登录...');
  32  | 
  33  |     // 等待登录成功（等待跳转或主页加载）
  34  |     await page.waitForURL(/\/#\/(?!user\/login)/, { timeout: 10000 });
  35  |     console.log('登录成功，已跳转到主页');
  36  |     await page.waitForTimeout(2000);
  37  | 
  38  |     // 2. 打开项目（如果需要）
  39  |     console.log('步骤2: 检查是否需要打开项目...');
  40  |     try {
  41  |       const openProjectBtn = await page.locator('button:has-text("打开项目")').first();
  42  |       if (await openProjectBtn.isVisible({ timeout: 3000 })) {
  43  |         console.log('发现"打开项目"按钮，正在打开...');
  44  |         await openProjectBtn.click();
  45  |         await page.waitForTimeout(1500);
  46  | 
  47  |         // 选择第一个项目
  48  |         const firstProject = page.locator('.ant-table-row').first();
  49  |         if (await firstProject.isVisible({ timeout: 3000 })) {
  50  |           await firstProject.click();
  51  |           await page.waitForTimeout(500);
  52  |           await page.click('button:has-text("确定")');
  53  |           console.log('已选择并打开项目');
  54  |           await page.waitForTimeout(2000);
  55  |         }
  56  |       } else {
  57  |         console.log('未找到"打开项目"按钮，项目可能已打开');
  58  |       }
  59  |     } catch (e) {
  60  |       console.log('项目选择步骤跳过:', e.message);
  61  |     }
  62  | 
  63  |     // 3. 导航到DDN导出页面
  64  |     console.log('步骤3: 导航到DDN导出页面...');
  65  |     await page.goto('http://localhost:3000/#/ietm/ietmddn-export');
  66  |     await page.waitForLoadState('networkidle');
  67  |     await page.waitForTimeout(2000);
  68  | 
  69  |     // 验证页面加载成功
  70  |     const pageTitle = await page.textContent('h2, .page-title, .ant-page-header-heading-title');
  71  |     console.log(`当前页面标题: ${pageTitle}`);
  72  | 
  73  |     // 4. 添加DM到导出列表
  74  |     console.log('步骤4: 添加DM到导出列表...');
  75  | 
  76  |     // 点击"添加DM"按钮
  77  |     const addDmBtn = page.locator('button:has-text("添加DM")');
  78  |     await addDmBtn.waitFor({ state: 'visible', timeout: 10000 });
  79  |     await addDmBtn.click();
  80  |     console.log('已点击"添加DM"按钮');
  81  |     await page.waitForTimeout(2000);
  82  | 
  83  |     // 在弹窗中选择第一个DM
  84  |     console.log('在弹窗中选择DM...');
  85  |     const modal = page.locator('.ant-modal');
  86  |     await modal.waitFor({ state: 'visible', timeout: 5000 });
  87  | 
  88  |     const firstCheckbox = modal.locator('.ant-table-tbody .ant-checkbox-input').first();
  89  |     await firstCheckbox.waitFor({ state: 'visible', timeout: 5000 });
  90  |     await firstCheckbox.check();
  91  |     console.log('已选择第一个DM');
  92  |     await page.waitForTimeout(1000);
  93  | 
  94  |     // 点击确定按钮
  95  |     const confirmBtn = modal.locator('button:has-text("确定")');
  96  |     await confirmBtn.click();
  97  |     console.log('已点击"确定"按钮');
  98  |     await page.waitForTimeout(2000);
  99  | 
  100 |     // 5. 验证DM已添加
  101 |     const dmRows = await page.locator('.ant-table-tbody tr').count();
  102 |     console.log(`步骤5: 已添加 ${dmRows} 个DM到导出列表`);
  103 |     expect(dmRows).toBeGreaterThan(0);
  104 | 
  105 |     // 6. 确保"引用ICN"和"引用DM"都未勾选（测试最简单场景）
  106 |     console.log('步骤6: 确保导出选项未勾选...');
  107 | 
  108 |     // 查找所有checkbox，取消勾选
  109 |     const checkboxes = await page.locator('input[type="checkbox"]').all();
  110 |     for (const checkbox of checkboxes) {
  111 |       if (await checkbox.isChecked()) {
  112 |         await checkbox.uncheck();
  113 |         await page.waitForTimeout(200);
  114 |       }
  115 |     }
  116 |     console.log('已清除所有导出选项勾选');
  117 | 
  118 |     // 7. 生成数据包
  119 |     console.log('步骤7: 生成数据包...');
  120 | 
  121 |     const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  122 | 
  123 |     const generateBtn = page.locator('button:has-text("生成数据包")');
  124 |     await generateBtn.click();
  125 |     console.log('已点击"生成数据包"按钮，等待下载...');
  126 | 
```