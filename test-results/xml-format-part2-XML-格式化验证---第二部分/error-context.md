# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: xml-format-part2.spec.js >> XML 格式化验证 - 第二部分
- Location: tests\xml-format-part2.spec.js:14:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.CodeMirror') to be visible

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
  2   |  * XML 格式化修复验证 - 第二部分
  3   |  *
  4   |  * 前提：用户已经手动导航到源码视图页面
  5   |  *
  6   |  * 测试步骤：
  7   |  * 4. 点击第 69 行的铅笔图标
  8   |  * 5. 点击右上角的"保存"
  9   |  * 6. 检查 XML 文件是否为多行格式化
  10  |  */
  11  | 
  12  | const { test, expect } = require('@playwright/test')
  13  | 
  14  | test('XML 格式化验证 - 第二部分', async ({ page }) => {
  15  |   console.log('\n' + '='.repeat(70))
  16  |   console.log('🔍 XML 格式化修复验证 - 第二部分')
  17  |   console.log('='.repeat(70) + '\n')
  18  | 
  19  |   // 假设页面已经打开，连接到现有页面
  20  |   const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'
  21  |   await page.goto(url, { waitUntil: 'networkidle' })
  22  | 
  23  |   // 等待 CodeMirror 加载
> 24  |   await page.waitForSelector('.CodeMirror', { timeout: 15000 })
      |              ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  25  |   await page.waitForTimeout(3000)
  26  |   console.log('📍 已连接到编辑器页面\n')
  27  | 
  28  |   // 步骤 1: 读取第 69 行初始 XML
  29  |   console.log('📍 步骤 1: 读取第 69 行初始 XML')
  30  |   const initialXml = await page.evaluate(() => {
  31  |     const cmElement = document.querySelector('.CodeMirror')
  32  |     if (!cmElement) return null
  33  |     const cm = cmElement.CodeMirror || window.cmInstance
  34  |     if (!cm) return null
  35  | 
  36  |     let xml = ''
  37  |     let foundPara = false
  38  |     for (let i = 68; i < Math.min(cm.lineCount(), 100); i++) {
  39  |       const line = cm.getLine(i)
  40  |       if (!line) continue
  41  |       if (line.includes('<para')) foundPara = true
  42  |       if (foundPara) xml += line + '\n'
  43  |       if (foundPara && line.includes('</para>')) break
  44  |     }
  45  |     return xml.trim()
  46  |   })
  47  | 
  48  |   const initialLineCount = initialXml ? (initialXml.match(/\n/g) || []).length : 0
  49  |   console.log(`   - 初始换行数: ${initialLineCount}`)
  50  |   console.log(`   - 格式化状态: ${initialLineCount > 5 ? '✅ 多行' : '⚠️ 单行'}`)
  51  |   console.log('   ✅ 初始状态读取完成\n')
  52  | 
  53  |   // 步骤 2: 点击第 69 行的铅笔图标
  54  |   console.log('📍 步骤 2: 点击第 69 行的铅笔图标')
  55  | 
  56  |   // 等待页面加载完成
  57  |   await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  58  |   await page.waitForTimeout(1000)
  59  | 
  60  |   // 查找所有编辑图标
  61  |   const allIcons = await page.locator('i, [class*="icon"], button').all()
  62  |   console.log(`   - 页面共有 ${allIcons.length} 个图标/按钮`)
  63  | 
  64  |   let designerOpened = false
  65  | 
  66  |   // 遍历查找编辑图标
  67  |   for (let i = 0; i < allIcons.length; i++) {
  68  |     try {
  69  |       const icon = allIcons[i]
  70  |       const classes = await icon.getAttribute('class').catch(() => '')
  71  | 
  72  |       if (classes && (classes.includes('edit') || classes.includes('pencil') || classes.includes('design'))) {
  73  |         const isVisible = await icon.isVisible({ timeout: 500 })
  74  |         if (isVisible) {
  75  |           console.log(`   - 尝试点击第 ${i + 1} 个编辑图标`)
  76  |           await icon.click()
  77  |           await page.waitForTimeout(2000)
  78  | 
  79  |           // 检查设计器是否打开
  80  |           const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)
  81  |           if (saveBtn) {
  82  |             designerOpened = true
  83  |             console.log(`   ✅ 设计器已打开\n`)
  84  |             break
  85  |           }
  86  |         }
  87  |       }
  88  |     } catch (e) {
  89  |       // 继续尝试下一个
  90  |     }
  91  |   }
  92  | 
  93  |   if (!designerOpened) {
  94  |     console.log('   ❌ 无法打开设计器')
  95  |     await page.screenshot({ path: 'debug-no-designer.png', fullPage: true })
  96  |     console.log('   📸 调试截图: debug-no-designer.png')
  97  |     throw new Error('无法打开 para 设计器')
  98  |   }
  99  | 
  100 |   // 步骤 3: 点击保存按钮
  101 |   console.log('📍 步骤 3: 点击右上角的"保存"按钮')
  102 | 
  103 |   const saveButtons = await page.locator('button:has-text("保存")').all()
  104 |   console.log(`   - 找到 ${saveButtons.length} 个保存按钮`)
  105 | 
  106 |   if (saveButtons.length > 0) {
  107 |     await saveButtons[0].click()
  108 |     console.log('   ✅ 已点击保存按钮')
  109 |     await page.waitForTimeout(3000)
  110 |     console.log('   ✅ 保存完成\n')
  111 |   } else {
  112 |     throw new Error('未找到保存按钮')
  113 |   }
  114 | 
  115 |   // 步骤 4: 检查保存后的 XML 格式
  116 |   console.log('📍 步骤 4: 检查 XML 文件是否为多行格式化')
  117 | 
  118 |   const savedXml = await page.evaluate(() => {
  119 |     const cmElement = document.querySelector('.CodeMirror')
  120 |     if (!cmElement) return null
  121 |     const cm = cmElement.CodeMirror || window.cmInstance
  122 |     if (!cm) return null
  123 | 
  124 |     let xml = ''
```