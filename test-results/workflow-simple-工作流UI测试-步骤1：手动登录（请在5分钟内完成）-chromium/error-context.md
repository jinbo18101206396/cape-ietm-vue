# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow-simple.spec.js >> 工作流UI测试 >> 步骤1：手动登录（请在5分钟内完成）
- Location: tests\workflow-simple.spec.js:20:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 300000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
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
  2   |  * 工作流信息模块 - 简化版UI交互测试
  3   |  *
  4   |  * 使用说明：
  5   |  * 1. 运行测试后会打开浏览器
  6   |  * 2. 请手动登录系统（5分钟超时）
  7   |  * 3. 登录成功后测试会自动继续
  8   |  */
  9   | 
  10  | const { test, expect } = require('@playwright/test')
  11  | 
  12  | const BASE_URL = 'http://localhost:3000'
  13  | 
  14  | test.setTimeout(600000) // 10分钟总超时
  15  | 
  16  | let auth = { cookies: null, authenticated: false }
  17  | 
  18  | test.describe('工作流UI测试', () => {
  19  | 
  20  |   test('步骤1：手动登录（请在5分钟内完成）', async ({ page }) => {
  21  |     console.log('\n' + '='.repeat(60))
  22  |     console.log('   请在打开的浏览器中手动登录')
  23  |     console.log('   登录后请等待，测试会自动继续...')
  24  |     console.log('   超时时间：5分钟')
  25  |     console.log('='.repeat(60) + '\n')
  26  | 
  27  |     await page.goto(BASE_URL)
  28  |     await page.waitForLoadState('networkidle')
  29  | 
  30  |     // 等待登录成功（5分钟）
  31  |     await Promise.race([
  32  |       page.waitForSelector('.user-dropdown-menu', { timeout: 300000 }),
  33  |       page.waitForSelector('text=工作台', { timeout: 300000 }),
  34  |       page.waitForSelector('text=管理员', { timeout: 300000 }),
> 35  |       page.waitForURL(/dashboard|index/, { timeout: 300000 })
      |            ^ TimeoutError: page.waitForURL: Timeout 300000ms exceeded.
  36  |     ])
  37  | 
  38  |     auth.cookies = await page.context().cookies()
  39  |     auth.authenticated = true
  40  | 
  41  |     console.log('\n✓ 登录成功！\n')
  42  |     await page.screenshot({ path: 'test-results/step1-logged-in.png' })
  43  |   })
  44  | 
  45  |   test('步骤2：验证删除按钮状态', async ({ page }) => {
  46  |     test.skip(!auth.authenticated)
  47  | 
  48  |     console.log('\n[测试] 删除按钮状态验证')
  49  | 
  50  |     await page.context().addCookies(auth.cookies)
  51  |     await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
  52  |     await page.waitForTimeout(3000)
  53  | 
  54  |     const row = page.locator('table tbody tr').first()
  55  |     await row.click()
  56  |     await page.waitForTimeout(500)
  57  | 
  58  |     const detailBtn = page.locator('button:has-text("详情")').first()
  59  |     await detailBtn.click()
  60  |     await page.waitForTimeout(3000)
  61  | 
  62  |     const tab = page.locator('.ant-tabs-tab:has-text("流程信息")')
  63  |     await tab.click()
  64  |     await page.waitForTimeout(2000)
  65  | 
  66  |     await page.screenshot({ path: 'test-results/step2-workflow-panel.png' })
  67  | 
  68  |     // 未选中时删除按钮应禁用
  69  |     await page.click('text=流程信息')
  70  |     await page.waitForTimeout(500)
  71  | 
  72  |     const deleteBtn = page.locator('button:has-text("删除")').first()
  73  |     const disabled = await deleteBtn.isDisabled()
  74  | 
  75  |     console.log(`✓ 未选中节点，删除按钮disabled: ${disabled}`)
  76  |     expect(disabled).toBe(true)
  77  | 
  78  |     await page.screenshot({ path: 'test-results/step2-delete-disabled.png' })
  79  |   })
  80  | 
  81  |   test('步骤3：验证新增节点自动填充', async ({ page }) => {
  82  |     test.skip(!auth.authenticated)
  83  | 
  84  |     console.log('\n[测试] 新增节点自动填充用户')
  85  | 
  86  |     await page.context().addCookies(auth.cookies)
  87  |     await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
  88  |     await page.waitForTimeout(2000)
  89  | 
  90  |     const row = page.locator('table tbody tr').first()
  91  |     await row.click()
  92  |     await page.waitForTimeout(500)
  93  | 
  94  |     const detailBtn = page.locator('button:has-text("详情")').first()
  95  |     await detailBtn.click()
  96  |     await page.waitForTimeout(3000)
  97  | 
  98  |     const tab = page.locator('.ant-tabs-tab:has-text("流程信息")')
  99  |     await tab.click()
  100 |     await page.waitForTimeout(2000)
  101 | 
  102 |     const countBefore = await page.locator('table tbody tr').count()
  103 |     console.log(`当前节点数: ${countBefore}`)
  104 | 
  105 |     const addBtn = page.locator('button:has-text("新增")').first()
  106 |     if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  107 |       await addBtn.click()
  108 |       await page.waitForTimeout(2000)
  109 | 
  110 |       await page.screenshot({ path: 'test-results/step3-after-add.png' })
  111 | 
  112 |       const countAfter = await page.locator('table tbody tr').count()
  113 |       console.log(`新增后节点数: ${countAfter}`)
  114 | 
  115 |       if (countAfter > countBefore) {
  116 |         const newRow = page.locator('table tbody tr').last()
  117 |         const cells = await newRow.locator('td').all()
  118 | 
  119 |         for (let i = 0; i < Math.min(5, cells.length); i++) {
  120 |           const text = await cells[i].textContent()
  121 |           if (text.trim() && text.trim() !== '-' && !text.match(/^\d+$/)) {
  122 |             console.log(`找到用户单元格[列${i+1}]: "${text.trim()}"`)
  123 | 
  124 |             const blueSpan = cells[i].locator('.new-node-user')
  125 |             const hasBlue = await blueSpan.isVisible().catch(() => false)
  126 | 
  127 |             if (hasBlue) {
  128 |               console.log('✓✓ 找到蓝色样式！')
  129 |               const color = await blueSpan.evaluate(el =>
  130 |                 window.getComputedStyle(el).color
  131 |               )
  132 |               console.log(`✓ 颜色: ${color}`)
  133 |             }
  134 |             break
  135 |           }
```