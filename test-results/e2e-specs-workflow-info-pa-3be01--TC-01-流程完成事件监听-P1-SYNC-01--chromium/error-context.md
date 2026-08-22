# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\specs\workflow-info-panel-regression.spec.js >> 流程信息面板回归测试 >> TC-01: 流程完成事件监听 (P1-SYNC-01)
- Location: tests\e2e\specs\workflow-info-panel-regression.spec.js:59:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
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
              - text: admin123
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
  2   |  * 流程信息面板回归测试套件
  3   |  * 验证P1-SYNC-01, P2-UI-01, P2-UI-02修复效果
  4   |  *
  5   |  * 前置条件：
  6   |  * 1. 后端服务运行在 http://localhost:9999
  7   |  * 2. 前端服务运行在 http://localhost:3000
  8   |  * 3. 数据库中存在可测试的DM和流程模板
  9   |  *
  10  |  * @date 2026-08-21
  11  |  */
  12  | 
  13  | const { test, expect } = require('@playwright/test')
  14  | 
  15  | // 测试配置
  16  | const BASE_URL = 'http://localhost:3000'
  17  | const API_BASE_URL = 'http://localhost:9999/jeecg-boot'
  18  | 
  19  | // 测试数据（需根据实际数据调整）
  20  | const TEST_USER = {
  21  |   username: process.env.TEST_USERNAME || 'admin',
  22  |   password: process.env.TEST_PASSWORD || 'admin123'
  23  | }
  24  | 
  25  | test.describe('流程信息面板回归测试', () => {
  26  |   let page
  27  |   let context
  28  | 
  29  |   test.beforeAll(async ({ browser }) => {
  30  |     context = await browser.newContext()
  31  |     page = await context.newPage()
  32  | 
  33  |     // 登录
  34  |     await page.goto(`${BASE_URL}/user/login`)
  35  |     await page.waitForSelector('#username', { timeout: 10000 })
  36  |     await page.fill('#username', TEST_USER.username)
  37  |     await page.fill('#password', TEST_USER.password)
  38  |     await page.click('button.login-button')
  39  | 
  40  |     // 等待登录完成（增加超时时间）
> 41  |     await page.waitForURL(/\/dashboard/, { timeout: 30000 })
      |                ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  42  |     console.log('✅ 登录成功')
  43  |   })
  44  | 
  45  |   test.afterAll(async () => {
  46  |     await context.close()
  47  |   })
  48  | 
  49  |   /**
  50  |    * TC-01: P1-SYNC-01验证（流程完成事件）
  51  |    *
  52  |    * 测试步骤：
  53  |    * 1. 选择一个已启动流程的DM
  54  |    * 2. 进入DM编辑器
  55  |    * 3. 在流程面板提交处理至最后节点
  56  |    * 4. 选择"通过"
  57  |    * 5. 验证控制台输出和事件触发
  58  |    */
  59  |   test('TC-01: 流程完成事件监听 (P1-SYNC-01)', async () => {
  60  |     console.log('\n🧪 执行 TC-01: 流程完成事件监听')
  61  | 
  62  |     // 监听控制台日志
  63  |     const consoleLogs = []
  64  |     page.on('console', msg => {
  65  |       const text = msg.text()
  66  |       consoleLogs.push(text)
  67  |       if (text.includes('[流程信息]')) {
  68  |         console.log(`  📋 控制台: ${text}`)
  69  |       }
  70  |     })
  71  | 
  72  |     // 1. 进入DM列表页
  73  |     await page.goto(`${BASE_URL}/ietm/ietmDataModuleManagement`)
  74  |     await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
  75  |     console.log('  ✅ 已进入DM列表页')
  76  | 
  77  |     // 2. 查找一个"流转中"状态的DM（已启动流程但未完成）
  78  |     const workflowInProgressRow = await page.locator('tr:has-text("流转中")').first()
  79  | 
  80  |     if (await workflowInProgressRow.count() === 0) {
  81  |       console.log('  ⚠️  未找到"流转中"状态的DM，跳过TC-01')
  82  |       test.skip()
  83  |       return
  84  |     }
  85  | 
  86  |     // 3. 点击编辑按钮
  87  |     await workflowInProgressRow.locator('a:has-text("编辑")').click()
  88  |     await page.waitForSelector('.dm-content-editor', { timeout: 10000 })
  89  |     console.log('  ✅ 已进入DM编辑器')
  90  | 
  91  |     // 4. 切换到流程信息面板
  92  |     const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
  93  |     if (await workflowTab.count() > 0) {
  94  |       await workflowTab.click()
  95  |       await page.waitForTimeout(1000)
  96  |       console.log('  ✅ 已切换到流程信息面板')
  97  |     }
  98  | 
  99  |     // 5. 查找当前可执行的节点
  100 |     const currentNodeRow = await page.locator('tr:has(button:has-text("执行处理"))').first()
  101 | 
  102 |     if (await currentNodeRow.count() === 0) {
  103 |       console.log('  ⚠️  未找到可执行的节点，跳过TC-01')
  104 |       test.skip()
  105 |       return
  106 |     }
  107 | 
  108 |     // 6. 点击"执行处理"
  109 |     await currentNodeRow.locator('button:has-text("执行处理")').click()
  110 |     await page.waitForSelector('.execute-modal', { timeout: 5000 })
  111 |     console.log('  ✅ 已打开执行处理弹窗')
  112 | 
  113 |     // 7. 检查是否为最后一个节点
  114 |     const nodeSeqno = await currentNodeRow.locator('td').nth(3).textContent()
  115 |     const allNodes = await page.locator('.wf-instance-dtl-table tbody tr').count()
  116 |     console.log(`  📊 当前节点序号: ${nodeSeqno}, 总节点数: ${allNodes}`)
  117 | 
  118 |     // 8. 选择"通过"
  119 |     await page.click('input[value="1"]') // ifpass=1表示通过
  120 |     await page.fill('textarea[placeholder*="意见"]', '自动化测试-流程完成')
  121 |     await page.click('button:has-text("提交处理")')
  122 | 
  123 |     // 9. 等待处理完成
  124 |     await page.waitForTimeout(3000)
  125 | 
  126 |     // 10. 验证控制台日志
  127 |     const workflowCompleteLog = consoleLogs.find(log =>
  128 |       log.includes('[流程信息]') && log.includes('流程已完成')
  129 |     )
  130 | 
  131 |     if (workflowCompleteLog) {
  132 |       console.log('  ✅ TC-01通过: 检测到流程完成事件日志')
  133 |       expect(workflowCompleteLog).toContain('[流程信息] 流程已完成')
  134 |     } else {
  135 |       console.log('  ⚠️  未检测到流程完成日志，可能不是最后节点')
  136 |       // 不强制失败，因为可能不是最后一个节点
  137 |     }
  138 | 
  139 |     // 11. 关闭编辑器
  140 |     await page.click('button:has-text("关闭")')
  141 |     await page.waitForTimeout(2000)
```