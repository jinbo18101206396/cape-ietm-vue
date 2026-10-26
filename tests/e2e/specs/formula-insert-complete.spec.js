/**
 * 插入公式功能 - 完整端到端测试
 *
 * 测试范围：
 * 1. 公式按钮显示
 * 2. 公式编辑器打开
 * 3. LaTeX输入和预览
 * 4. 公式插入到编辑器
 * 5. 公式保存到数据库
 * 6. 公式回显验证
 * 7. 多公式保存
 * 8. 边界条件测试
 *
 * 运行方法：
 * npm run test:e2e
 */

const { chromium } = require('playwright')

describe('插入公式功能 - E2E测试', () => {
  let browser
  let context
  let page

  // 测试配置
  const BASE_URL = 'http://localhost:3000'
  const BACKEND_URL = 'http://localhost:9999'

  // 测试账号（根据实际情况修改）
  const TEST_USER = {
    username: 'admin',
    password: '123456'
  }

  // 测试数据
  const TEST_FORMULAS = [
    {
      latex: '\\frac{1}{2}',
      description: '简单分数'
    },
    {
      latex: 'x^2 + y^2 = z^2',
      description: '勾股定理'
    },
    {
      latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
      description: '求和公式'
    }
  ]

  beforeAll(async () => {
    // 启动浏览器
    browser = await chromium.launch({
      headless: false, // 设置为true可以无头模式运行
      slowMo: 100 // 减速100ms以便观察
    })

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN'
    })

    page = await context.newPage()

    // 监听控制台输出
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('浏览器控制台错误:', msg.text())
      }
    })

    // 监听网络错误
    page.on('pageerror', error => {
      console.error('页面错误:', error.message)
    })
  })

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }
  })

  describe('前置条件检查', () => {
    test('后端服务应该可访问', async () => {
      const response = await page.goto(`${BACKEND_URL}/jeecg-boot/sys/common/403`)
      expect(response.status()).toBeGreaterThanOrEqual(200)
      expect(response.status()).toBeLessThan(500)
    })

    test('前端应用应该可访问', async () => {
      const response = await page.goto(BASE_URL)
      expect(response.status()).toBe(200)
    })
  })

  describe('用户登录', () => {
    test('应该成功登录系统', async () => {
      await page.goto(`${BASE_URL}/user/login`)

      // 输入用户名和密码
      await page.fill('input[placeholder*="账号"]', TEST_USER.username)
      await page.fill('input[placeholder*="密码"]', TEST_USER.password)

      // 点击登录按钮
      await page.click('button:has-text("登录")')

      // 等待跳转到首页
      await page.waitForURL('**/dashboard/**', { timeout: 10000 })

      // 验证登录成功
      const url = page.url()
      expect(url).toContain('dashboard')
    }, 30000)
  })

  describe('打开DM编辑页面', () => {
    test('应该导航到数据模块管理', async () => {
      // 点击数据模块管理菜单
      await page.click('text=数据模块管理')
      await page.waitForTimeout(1000)

      // 等待列表加载
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })
    })

    test('应该打开第一个DM的编辑页面', async () => {
      // 点击第一个DM的"编辑"按钮
      await page.click('.ant-table-tbody tr:first-child button:has-text("编辑")')

      // 等待编辑页面加载
      await page.waitForSelector('.ietm-editor-container', { timeout: 10000 })
    })

    test('应该切换到Para设计视图', async () => {
      // 查找并点击"Para设计视图"标签
      const paraTab = await page.locator('text=Para设计视图').first()
      await paraTab.click()

      // 等待UEditor加载
      await page.waitForSelector('.edui-editor', { timeout: 10000 })
    })
  })

  describe('公式按钮功能', () => {
    test('工具栏应该显示公式按钮', async () => {
      // 查找公式按钮
      const formulaButton = await page.locator('.edui-button[title="插入公式"]').first()
      await expect(formulaButton).toBeVisible()
    })

    test('点击公式按钮应该打开公式编辑器对话框', async () => {
      // 点击公式按钮
      await page.click('.edui-button[title="插入公式"]')

      // 等待对话框打开
      await page.waitForSelector('.formula-editor-dialog', { timeout: 5000 })

      // 验证对话框标题
      const dialogTitle = await page.locator('.ant-modal-title:has-text("插入公式")').first()
      await expect(dialogTitle).toBeVisible()
    })

    test('公式编辑器应该包含KityFormula组件', async () => {
      // 验证KityFormula编辑器存在
      const kityEditor = await page.locator('#kityformula_editor').first()
      await expect(kityEditor).toBeVisible()
    })
  })

  describe('公式插入功能', () => {
    for (let i = 0; i < TEST_FORMULAS.length; i++) {
      const formula = TEST_FORMULAS[i]

      test(`应该插入公式 ${i + 1}: ${formula.description}`, async () => {
        // 如果不是第一个公式，先打开对话框
        if (i > 0) {
          await page.click('.edui-button[title="插入公式"]')
          await page.waitForSelector('.formula-editor-dialog', { timeout: 5000 })
        }

        // 输入LaTeX代码
        const latexInput = await page.locator('#kityformula_editor textarea').first()
        await latexInput.fill(formula.latex)

        // 等待预览更新
        await page.waitForTimeout(1000)

        // 点击确定按钮
        await page.click('.formula-editor-dialog button:has-text("确定")')

        // 等待对话框关闭
        await page.waitForSelector('.formula-editor-dialog', { state: 'hidden', timeout: 5000 })

        // 验证公式图片插入到编辑器
        const formulaImages = await page.locator('.edui-body-container img.kfformula')
        expect(await formulaImages.count()).toBeGreaterThanOrEqual(i + 1)

        // 等待一下再继续
        await page.waitForTimeout(500)
      }, 15000)
    }
  })

  describe('公式保存功能', () => {
    test('点击保存应该成功保存公式', async () => {
      // 监听保存API调用
      let saveApiCalled = false
      page.on('response', response => {
        if (response.url().includes('/ietm/dm/formula/save')) {
          saveApiCalled = true
        }
      })

      // 点击保存按钮
      await page.click('button:has-text("保存")')

      // 等待保存完成
      await page.waitForTimeout(3000)

      // 验证API被调用
      expect(saveApiCalled).toBe(true)

      // 验证成功提示
      const successMessage = await page.locator('.ant-message-success').first()
      await expect(successMessage).toBeVisible({ timeout: 5000 })
    }, 30000)
  })

  describe('公式回显功能', () => {
    test('刷新页面后公式应该正确回显', async () => {
      // 刷新页面
      await page.reload({ waitUntil: 'networkidle' })

      // 等待编辑器加载
      await page.waitForSelector('.ietm-editor-container', { timeout: 10000 })

      // 切换到Para设计视图
      const paraTab = await page.locator('text=Para设计视图').first()
      await paraTab.click()
      await page.waitForSelector('.edui-editor', { timeout: 10000 })

      // 等待公式加载
      await page.waitForTimeout(2000)

      // 验证公式图片数量
      const formulaImages = await page.locator('.edui-body-container img.kfformula')
      const count = await formulaImages.count()
      expect(count).toBeGreaterThanOrEqual(TEST_FORMULAS.length)
    }, 30000)
  })

  describe('边界条件测试', () => {
    test('空LaTeX应该禁用确定按钮', async () => {
      // 打开公式对话框
      await page.click('.edui-button[title="插入公式"]')
      await page.waitForSelector('.formula-editor-dialog', { timeout: 5000 })

      // 清空LaTeX输入
      const latexInput = await page.locator('#kityformula_editor textarea').first()
      await latexInput.fill('')

      // 验证确定按钮是否禁用
      const confirmButton = await page.locator('.formula-editor-dialog button:has-text("确定")').first()
      const isDisabled = await confirmButton.isDisabled()
      expect(isDisabled).toBe(true)

      // 关闭对话框
      await page.click('.formula-editor-dialog button:has-text("取消")')
    })

    test('复杂LaTeX应该正确处理', async () => {
      const complexLatex = '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}'

      // 打开对话框
      await page.click('.edui-button[title="插入公式"]')
      await page.waitForSelector('.formula-editor-dialog', { timeout: 5000 })

      // 输入复杂LaTeX
      const latexInput = await page.locator('#kityformula_editor textarea').first()
      await latexInput.fill(complexLatex)

      // 等待预览
      await page.waitForTimeout(1000)

      // 点击确定
      await page.click('.formula-editor-dialog button:has-text("确定")')

      // 验证插入成功
      await page.waitForSelector('.formula-editor-dialog', { state: 'hidden', timeout: 5000 })
      const formulaImages = await page.locator('.edui-body-container img.kfformula')
      expect(await formulaImages.count()).toBeGreaterThan(0)
    }, 15000)
  })

  describe('集成测试', () => {
    test('公式与其他元素混合使用', async () => {
      // 输入普通文本
      const editorBody = await page.locator('.edui-body-container').first()
      await editorBody.click()
      await page.keyboard.type('这是一个包含公式的段落：')

      // 插入公式
      await page.click('.edui-button[title="插入公式"]')
      await page.waitForSelector('.formula-editor-dialog')
      const latexInput = await page.locator('#kityformula_editor textarea').first()
      await latexInput.fill('E = mc^2')
      await page.click('.formula-editor-dialog button:has-text("确定")')
      await page.waitForTimeout(500)

      // 继续输入文本
      await page.keyboard.type('，这是爱因斯坦质能方程。')

      // 保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(3000)

      // 验证保存成功
      const successMessage = await page.locator('.ant-message-success').first()
      await expect(successMessage).toBeVisible({ timeout: 5000 })
    }, 30000)
  })
})
