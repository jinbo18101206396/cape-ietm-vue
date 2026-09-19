# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\model-3d-viewer.spec.js >> Model3DViewer - ICN管理预览测试 >> 应该支持OBJ格式预览
- Location: tests\e2e\model-3d-viewer.spec.js:106:3

# Error details

```
Test timeout of 60000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('input[placeholder*="账号"]')

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
  2   |  * Model3DViewer E2E测试
  3   |  *
  4   |  * 测试策略：
  5   |  * 1. ICN管理 - 上传并预览各种3D格式
  6   |  * 2. DM预览 - 多媒体3D对象预览
  7   |  * 3. 格式兼容性测试
  8   |  * 4. 错误处理测试
  9   |  *
  10  |  * @date 2026-09-19
  11  |  */
  12  | 
  13  | const { test, expect } = require('@playwright/test')
  14  | const path = require('path')
  15  | 
  16  | // 测试配置
  17  | const TEST_CONFIG = {
  18  |   baseURL: 'http://localhost:3000',
  19  |   timeout: 30000,
  20  |   testDataPath: path.join(__dirname, '../test-data/3d-models')
  21  | }
  22  | 
  23  | // 登录辅助函数
  24  | async function login(page) {
  25  |   await page.goto(TEST_CONFIG.baseURL)
> 26  |   await page.fill('input[placeholder*="账号"]', 'admin')
      |              ^ Error: page.fill: Test timeout of 60000ms exceeded.
  27  |   await page.fill('input[placeholder*="密码"]', 'admin123')
  28  |   await page.click('button:has-text("登录")')
  29  |   await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  30  | }
  31  | 
  32  | // 导航到ICN管理
  33  | async function gotoIcnManage(page) {
  34  |   await page.goto(`${TEST_CONFIG.baseURL}/#/ietm/icnmanage`)
  35  |   await page.waitForSelector('.ant-table', { timeout: 10000 })
  36  | }
  37  | 
  38  | test.describe('Model3DViewer - ICN管理预览测试', () => {
  39  |   test.beforeEach(async ({ page }) => {
  40  |     await login(page)
  41  |     await gotoIcnManage(page)
  42  |   })
  43  | 
  44  |   test('应该支持VRML格式预览', async ({ page }) => {
  45  |     // 1. 查找已有的VRML文件或跳过
  46  |     const vrmlRow = page.locator('tr:has-text(".wrl")').first()
  47  |     const hasVrml = await vrmlRow.count() > 0
  48  | 
  49  |     if (!hasVrml) {
  50  |       test.skip('未找到VRML测试数据')
  51  |       return
  52  |     }
  53  | 
  54  |     // 2. 点击预览按钮
  55  |     await vrmlRow.locator('[title="浏览"]').click()
  56  | 
  57  |     // 3. 等待Model3DViewer加载
  58  |     await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })
  59  | 
  60  |     // 4. 验证查看器元素
  61  |     await expect(page.locator('.viewer-container')).toBeVisible()
  62  |     await expect(page.locator('.controls-hint')).toBeVisible()
  63  | 
  64  |     // 5. 验证格式显示
  65  |     const modelInfo = page.locator('.model-info')
  66  |     if (await modelInfo.count() > 0) {
  67  |       await expect(modelInfo).toContainText('VRML')
  68  |     }
  69  | 
  70  |     // 6. 验证控制提示
  71  |     await expect(page.locator('.controls-hint')).toContainText('左键拖动')
  72  |     await expect(page.locator('.controls-hint')).toContainText('右键拖动')
  73  |     await expect(page.locator('.controls-hint')).toContainText('滚轮')
  74  |   })
  75  | 
  76  |   test('应该支持glTF格式预览', async ({ page }) => {
  77  |     // 查找glTF文件
  78  |     const gltfRow = page.locator('tr:has-text(".gltf"), tr:has-text(".glb")').first()
  79  |     const hasGltf = await gltfRow.count() > 0
  80  | 
  81  |     if (!hasGltf) {
  82  |       test.skip('未找到glTF测试数据')
  83  |       return
  84  |     }
  85  | 
  86  |     // 点击预览
  87  |     await gltfRow.locator('[title="浏览"]').click()
  88  | 
  89  |     // 等待加载
  90  |     await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })
  91  | 
  92  |     // 验证格式
  93  |     const modelInfo = page.locator('.model-info')
  94  |     if (await modelInfo.count() > 0) {
  95  |       const text = await modelInfo.textContent()
  96  |       expect(text).toMatch(/glTF|GLB/i)
  97  |     }
  98  | 
  99  |     // 验证模型统计信息
  100 |     if (await modelInfo.isVisible()) {
  101 |       await expect(modelInfo).toContainText('顶点')
  102 |       await expect(modelInfo).toContainText('面数')
  103 |     }
  104 |   })
  105 | 
  106 |   test('应该支持OBJ格式预览', async ({ page }) => {
  107 |     const objRow = page.locator('tr:has-text(".obj")').first()
  108 |     const hasObj = await objRow.count() > 0
  109 | 
  110 |     if (!hasObj) {
  111 |       test.skip('未找到OBJ测试数据')
  112 |       return
  113 |     }
  114 | 
  115 |     await objRow.locator('[title="浏览"]').click()
  116 |     await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })
  117 | 
  118 |     const modelInfo = page.locator('.model-info')
  119 |     if (await modelInfo.count() > 0) {
  120 |       await expect(modelInfo).toContainText('OBJ')
  121 |     }
  122 |   })
  123 | 
  124 |   test('应该支持STL格式预览', async ({ page }) => {
  125 |     const stlRow = page.locator('tr:has-text(".stl")').first()
  126 |     const hasStl = await stlRow.count() > 0
```