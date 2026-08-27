# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\p2-p3-fixes-verification.spec.js >> P2/P3 Fixes Verification >> P2-2: 节点表格应显示序号列
- Location: tests\e2e\p2-p3-fixes-verification.spec.js:50:3

# Error details

```
TimeoutError: locator.check: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.ant-table-tbody .ant-checkbox-input').first()

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - img [ref=e7]
  - generic [ref=e8]:
    - heading "404" [level=1] [ref=e9]
    - generic [ref=e10]: 抱歉，你访问的页面不存在或无权访问
    - button "返回首页" [ref=e12] [cursor=pointer]:
      - generic: 返回首页
```

# Test source

```ts
  1   | /**
  2   |  * P2/P3遗留问题修复 - E2E验证测试
  3   |  *
  4   |  * 测试5个修复点：
  5   |  * - P2-1: 启动流程成功提示信息优化
  6   |  * - P2-2: 启动流程节点表格序号列
  7   |  * - P2-3: 追加意见字数限制提示（已存在）
  8   |  * - P3-1: 启动流程模板下拉可搜索
  9   |  * - P3-2: 重启流程加载动画提示
  10  |  *
  11  |  * @author Claude AI Assistant
  12  |  * @date 2026-08-26
  13  |  */
  14  | 
  15  | const { test, expect } = require('@playwright/test')
  16  | 
  17  | const BASE_URL = 'http://localhost:3000'
  18  | 
  19  | // 测试数据
  20  | const TEST_USER = {
  21  |   username: 'admin',
  22  |   password: '123456'
  23  | }
  24  | 
  25  | test.describe('P2/P3 Fixes Verification', () => {
  26  |   test.beforeEach(async ({ page }) => {
  27  |     // 登录
  28  |     await page.goto(`${BASE_URL}/user/login`)
  29  |     await page.waitForLoadState('networkidle')
  30  | 
  31  |     // 填写用户名 - 使用更通用的选择器
  32  |     const usernameInput = page.locator('input').first()
  33  |     await usernameInput.clear()
  34  |     await usernameInput.fill(TEST_USER.username)
  35  | 
  36  |     // 填写密码
  37  |     await page.fill('input[type="password"]', TEST_USER.password)
  38  | 
  39  |     // 点击登录按钮
  40  |     await page.click('button:has-text("登 录")')
  41  | 
  42  |     // 等待登录成功跳转
  43  |     await page.waitForURL(/.*\/dashboard/, { timeout: 10000 })
  44  |     await page.waitForTimeout(2000)
  45  |   })
  46  | 
  47  |   /**
  48  |    * P2-2 验证：启动流程-节点表格序号列
  49  |    */
  50  |   test('P2-2: 节点表格应显示序号列', async ({ page }) => {
  51  |     // 1. 进入数据模块管理页面
  52  |     await page.goto(`${BASE_URL}/ietm/IetmDataModuleManagement`)
  53  |     await page.waitForTimeout(2000)
  54  | 
  55  |     // 2. 选择一条DM
  56  |     const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
> 57  |     await firstCheckbox.check()
      |                         ^ TimeoutError: locator.check: Timeout 10000ms exceeded.
  58  |     await page.waitForTimeout(500)
  59  | 
  60  |     // 3. 点击"启动流程"按钮
  61  |     const startFlowBtn = page.locator('button:has-text("启动流程")')
  62  |     await startFlowBtn.click()
  63  | 
  64  |     // 4. 等待弹窗打开
  65  |     await page.waitForSelector('.ant-modal:has-text("批量启动流程")', { timeout: 5000 })
  66  |     await page.waitForTimeout(1000)
  67  | 
  68  |     // 5. 验证序号列存在
  69  |     const seqNumberHeader = page.locator('.ant-modal .ant-table-thead th:has-text("序号")')
  70  |     expect(await seqNumberHeader.count()).toBeGreaterThan(0)
  71  | 
  72  |     console.log('✅ P2-2: 序号列已存在')
  73  | 
  74  |     // 6. 验证序号列的值（1, 2, 3...）
  75  |     const firstRow = page.locator('.ant-modal .ant-table-tbody tr').first()
  76  |     const firstSeqCell = firstRow.locator('td').first()
  77  |     const seqText = await firstSeqCell.textContent()
  78  |     expect(seqText.trim()).toBe('1')
  79  | 
  80  |     console.log(`✅ P2-2: 第一行序号显示为 "${seqText.trim()}"`)
  81  | 
  82  |     // 关闭弹窗
  83  |     await page.keyboard.press('Escape')
  84  |     await page.waitForTimeout(500)
  85  |   })
  86  | 
  87  |   /**
  88  |    * P3-1 验证：启动流程-模板下拉可搜索
  89  |    */
  90  |   test('P3-1: 模板下拉应支持搜索', async ({ page }) => {
  91  |     // 1. 进入数据模块管理页面
  92  |     await page.goto(`${BASE_URL}/ietm/IetmDataModuleManagement`)
  93  |     await page.waitForTimeout(2000)
  94  | 
  95  |     // 2. 选择一条DM
  96  |     const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
  97  |     await firstCheckbox.check()
  98  |     await page.waitForTimeout(500)
  99  | 
  100 |     // 3. 点击"启动流程"按钮
  101 |     const startFlowBtn = page.locator('button:has-text("启动流程")')
  102 |     await startFlowBtn.click()
  103 | 
  104 |     // 4. 等待弹窗打开
  105 |     await page.waitForSelector('.ant-modal:has-text("批量启动流程")', { timeout: 5000 })
  106 |     await page.waitForTimeout(1000)
  107 | 
  108 |     // 5. 点击模板下拉框
  109 |     const templateSelect = page.locator('.ant-modal .ant-select:has-text("请选择流程模板")').first()
  110 |     await templateSelect.click()
  111 |     await page.waitForTimeout(500)
  112 | 
  113 |     // 6. 检查下拉框是否有搜索输入框
  114 |     const searchInput = page.locator('.ant-select-dropdown .ant-select-search__field')
  115 |     expect(await searchInput.count()).toBeGreaterThan(0)
  116 | 
  117 |     console.log('✅ P3-1: 模板下拉框支持搜索')
  118 | 
  119 |     // 7. 尝试输入搜索关键词
  120 |     await searchInput.fill('测试')
  121 |     await page.waitForTimeout(1000)
  122 | 
  123 |     console.log('✅ P3-1: 搜索功能正常')
  124 | 
  125 |     // 关闭下拉框和弹窗
  126 |     await page.keyboard.press('Escape')
  127 |     await page.waitForTimeout(500)
  128 |     await page.keyboard.press('Escape')
  129 |     await page.waitForTimeout(500)
  130 |   })
  131 | 
  132 |   /**
  133 |    * P3-2 验证：重启流程-加载动画提示
  134 |    */
  135 |   test('P3-2: 重启流程应显示加载提示', async ({ page }) => {
  136 |     // 1. 进入数据模块管理页面
  137 |     await page.goto(`${BASE_URL}/ietm/IetmDataModuleManagement`)
  138 |     await page.waitForTimeout(2000)
  139 | 
  140 |     // 2. 选择一条已有流程的DM
  141 |     const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
  142 |     await firstCheckbox.check()
  143 |     await page.waitForTimeout(500)
  144 | 
  145 |     // 3. 点击"更多"按钮
  146 |     const moreBtn = page.locator('button:has-text("更多")')
  147 |     if (await moreBtn.count() > 0) {
  148 |       await moreBtn.click()
  149 |       await page.waitForTimeout(500)
  150 | 
  151 |       // 4. 点击"重启流程"
  152 |       const restartFlowBtn = page.locator('.ant-dropdown-menu-item:has-text("重启流程")')
  153 |       if (await restartFlowBtn.count() > 0) {
  154 |         await restartFlowBtn.click()
  155 | 
  156 |         // 5. 等待弹窗打开并检查加载提示
  157 |         await page.waitForSelector('.ant-modal:has-text("批量重启流程")', { timeout: 5000 })
```