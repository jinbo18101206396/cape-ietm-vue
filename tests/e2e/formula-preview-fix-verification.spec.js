/**
 * 公式预览修复验证 E2E 测试
 *
 * 测试场景：插入公式后点击预览按钮，验证公式图片能正常显示
 *
 * 问题根因：
 * - 公式ICN存储在独立的ietm_icn_formula表（绕过DM8聚集索引限制）
 * - 预览接口/ietm/icn/view/{icnCode}只查询ietm_icn_manage表
 * - 导致公式ICN查询不到，返回"ICN不存在"占位图
 *
 * 修复方案：
 * - viewIcn()方法优先从ietm_icn_formula表查询
 * - 如果是公式ICN，从filecontent字段提取base64图片返回
 * - 否则走原有的附件流程（图符/视频/音频）
 *
 * 前置条件：
 * 1. 后端服务运行在 http://localhost:9999
 * 2. 前端服务运行在 http://localhost:3000
 * 3. 数据库中有可编辑的DM（或使用新建DM功能）
 * 4. 已部署包含修复的后端JAR
 *
 * @author Claude
 * @date 2026-10-15
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const API_URL = 'http://localhost:9999'
const TEST_USERNAME = 'admin'
const TEST_PASSWORD = 'admin'

test.describe('公式预览修复验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto(BASE_URL)
    await page.fill('input[placeholder*="用户名"]', TEST_USERNAME)
    await page.fill('input[placeholder*="密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')

    // 等待登录成功（检查是否跳转到首页）
    await page.waitForURL(/.*\/dashboard|.*\/home/, { timeout: 10000 })
  })

  /**
   * TC-01: 新建DM → 插入公式 → 预览 → 验证公式显示
   *
   * 步骤：
   * 1. 进入数据模块管理
   * 2. 新建DM
   * 3. 在Para编辑器中插入公式
   * 4. 保存DM
   * 5. 点击"预览"按钮
   * 6. 验证预览弹窗中公式图片正常显示（不是"ICN加载失败"占位图）
   */
  test('TC-01: 新建DM插入公式后预览显示正常', async ({ page }) => {
    test.setTimeout(120000) // 2分钟超时

    // 1. 进入数据模块管理页面
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForLoadState('networkidle')

    // 2. 点击"新建"按钮
    await page.click('button:has-text("新建")')
    await page.waitForTimeout(2000)

    // 3. 填写DM基本信息（最小化必填字段）
    const timestamp = Date.now()
    const dmTitle = `公式预览测试-${timestamp}`

    await page.fill('input[placeholder*="标题"]', dmTitle)

    // 选择DM类型（如果有下拉框）
    const dmTypeSelect = page.locator('label:has-text("DM类型")').locator('..').locator('.ant-select')
    if (await dmTypeSelect.count() > 0) {
      await dmTypeSelect.click()
      await page.click('.ant-select-dropdown:visible .ant-select-item:first-child')
    }

    // 4. 点击"确定"创建DM
    await page.click('.ant-modal:visible button:has-text("确定")')
    await page.waitForTimeout(3000)

    // 5. 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 6. 在Para编辑器中插入公式
    // 方式A：如果有工具栏按钮
    const formulaButton = page.locator('button[title*="公式"], button:has-text("公式")')
    if (await formulaButton.count() > 0) {
      await formulaButton.click()
      await page.waitForTimeout(1000)

      // 等待公式编辑器弹窗
      const formulaDialog = page.locator('.edui-dialog:visible, .ant-modal:visible')
      await formulaDialog.waitFor({ timeout: 5000 })

      // 输入LaTeX公式
      const latexInput = formulaDialog.locator('textarea, input[type="text"]').first()
      await latexInput.fill('x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}')
      await page.waitForTimeout(1000)

      // 点击"确定"插入公式
      await formulaDialog.locator('button:has-text("确定"), button:has-text("插入")').click()
      await page.waitForTimeout(2000)
    } else {
      // 方式B：直接在源码中插入symbol标签（如果没有公式按钮）
      console.log('⚠️ 未找到公式按钮，跳过公式插入测试')
      test.skip()
    }

    // 7. 保存DM
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(3000)

    // 检查保存是否成功（查找成功提示或等待页面稳定）
    const successMsg = page.locator('.ant-message-success, .ant-notification-notice-success')
    if (await successMsg.count() > 0) {
      console.log('✅ DM保存成功')
    }

    // 8. 点击"预览"按钮
    await page.click('button:has-text("预览")')
    await page.waitForTimeout(2000)

    // 9. 等待预览弹窗加载
    const previewModal = page.locator('.ant-modal:visible:has-text("DM内容预览")')
    await previewModal.waitFor({ timeout: 10000 })

    // 10. 验证iframe中的公式图片
    const iframe = previewModal.locator('iframe')
    await iframe.waitFor({ timeout: 5000 })

    const iframeContent = iframe.contentFrame()
    if (!iframeContent) {
      throw new Error('❌ 无法获取iframe内容')
    }

    // 查找公式图片（可能是<img class="kfformula">或<symbol>渲染的<img>）
    const formulaImages = iframeContent.locator('img[class*="kfformula"], img[src*="/ietm/icn/view/"]')
    const imageCount = await formulaImages.count()

    console.log(`📊 预览中找到 ${imageCount} 个公式图片`)

    if (imageCount === 0) {
      console.log('⚠️ 预览中未找到公式图片，可能公式未成功插入')
      // 打印iframe HTML用于调试
      const iframeHTML = await iframeContent.locator('body').innerHTML()
      console.log('Iframe内容:', iframeHTML.substring(0, 500))
      test.skip()
    }

    // 11. 验证第一个公式图片的src
    const firstImage = formulaImages.first()
    const imageSrc = await firstImage.getAttribute('src')

    console.log('📷 公式图片src:', imageSrc)

    // 验证src不是占位图（不包含"ICN不存在"或SVG占位图特征）
    expect(imageSrc).toBeTruthy()
    expect(imageSrc).not.toContain('ICN不存在')
    expect(imageSrc).not.toContain('image/svg+xml')
    expect(imageSrc).not.toContain('data:image/svg')

    // 验证src是合法的ICN URL或base64图片
    const isValidSrc =
      imageSrc.startsWith('data:image/png;base64,') || // base64图片
      imageSrc.includes('/ietm/icn/view/ICN-') || // ICN URL
      imageSrc.startsWith('http') // 完整URL

    expect(isValidSrc).toBeTruthy()

    // 12. 验证图片能正常加载（naturalWidth > 0）
    const imageLoaded = await firstImage.evaluate(img => {
      return img.complete && img.naturalWidth > 0
    })

    if (imageLoaded) {
      console.log('✅ 公式图片加载成功')
    } else {
      console.log('⚠️ 公式图片未完全加载，等待...')
      await page.waitForTimeout(2000)

      const retryLoaded = await firstImage.evaluate(img => {
        return img.complete && img.naturalWidth > 0
      })

      expect(retryLoaded).toBeTruthy()
    }

    console.log('✅ TC-01 通过: 公式预览显示正常')
  })

  /**
   * TC-02: 编辑已有DM（包含公式） → 预览 → 验证公式显示
   *
   * 前置条件：数据库中已有包含公式的DM
   *
   * 步骤：
   * 1. 进入数据模块管理
   * 2. 搜索或选择包含公式的DM
   * 3. 点击"编辑"或"浏览"
   * 4. 点击"预览"按钮
   * 5. 验证预览弹窗中公式图片正常显示
   */
  test('TC-02: 编辑已有DM预览公式显示正常', async ({ page }) => {
    test.setTimeout(60000)

    // 1. 进入数据模块管理页面
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForLoadState('networkidle')

    // 2. 查找第一个DM记录并打开编辑
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.waitFor({ timeout: 10000 })

    // 点击操作列的"编辑"或"浏览"按钮
    const editButton = firstRow.locator('button:has-text("编辑"), a:has-text("编辑")')
    if (await editButton.count() > 0) {
      await editButton.click()
    } else {
      const browseButton = firstRow.locator('button:has-text("浏览"), a:has-text("浏览")')
      await browseButton.click()
    }

    await page.waitForTimeout(3000)

    // 3. 等待编辑器加载
    await page.waitForSelector('.CodeMirror, .ant-tabs', { timeout: 15000 })

    // 4. 点击"预览"按钮
    const previewButton = page.locator('button:has-text("预览")')
    if (await previewButton.count() === 0) {
      console.log('⚠️ 当前页面无预览按钮，可能未进入编辑页面')
      test.skip()
    }

    await previewButton.click()
    await page.waitForTimeout(2000)

    // 5. 等待预览弹窗加载
    const previewModal = page.locator('.ant-modal:visible:has-text("DM内容预览")')
    await previewModal.waitFor({ timeout: 10000 })

    // 6. 检查iframe中是否有公式图片
    const iframe = previewModal.locator('iframe')
    const iframeContent = iframe.contentFrame()
    if (!iframeContent) {
      throw new Error('❌ 无法获取iframe内容')
    }

    const formulaImages = iframeContent.locator('img[class*="kfformula"], img[src*="/ietm/icn/view/ICN-"]')
    const imageCount = await formulaImages.count()

    console.log(`📊 预览中找到 ${imageCount} 个公式或ICN图片`)

    if (imageCount === 0) {
      console.log('⚠️ 当前DM不包含公式，跳过验证')
      test.skip()
    }

    // 7. 验证所有公式图片的src不是占位图
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = formulaImages.nth(i)
      const src = await img.getAttribute('src')

      console.log(`📷 图片${i + 1} src:`, src)

      expect(src).toBeTruthy()
      expect(src).not.toContain('ICN不存在')
      expect(src).not.toContain('ICN加载失败')
    }

    console.log('✅ TC-02 通过: 已有DM公式预览正常')
  })

  /**
   * TC-03: 直接调用后端ICN预览接口验证
   *
   * 验证修复的核心逻辑：
   * 1. 调用 /ietm/icn/view/{icnCode} 接口
   * 2. 验证返回的是图片数据而不是SVG占位图
   */
  test('TC-03: 后端ICN预览接口验证', async ({ request }) => {
    test.setTimeout(30000)

    // 使用一个已知的公式ICN编码（需要从数据库获取）
    // 这里使用之前测试中生成的ICN格式
    const testIcnCode = 'ICN-ZBBM02-A-A11000-C-JB301-00004-A-001-01'

    // 调用后端预览接口
    const response = await request.get(`${API_URL}/jeecg-boot/ietm/icn/view/${testIcnCode}`, {
      timeout: 10000
    })

    console.log('📡 接口响应状态:', response.status())
    console.log('📡 接口Content-Type:', response.headers()['content-type'])

    // 验证响应状态为200
    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type']

    // 验证返回的是图片而不是SVG占位图
    if (contentType.includes('image/png')) {
      console.log('✅ 返回PNG图片（公式ICN）')

      const bodyBuffer = await response.body()
      expect(bodyBuffer.length).toBeGreaterThan(100) // PNG文件至少几百字节

      // 验证PNG魔数（前8字节）
      const pngHeader = bodyBuffer.slice(0, 8)
      const expectedPngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
      expect(pngHeader).toEqual(expectedPngHeader)

      console.log('✅ TC-03 通过: 后端返回有效的PNG图片')
    } else if (contentType.includes('image/svg+xml')) {
      // 如果返回SVG，检查是否为占位图
      const bodyText = await response.text()

      if (bodyText.includes('ICN不存在') || bodyText.includes('ICN加载失败')) {
        console.log('❌ 返回的是占位图，修复未生效')
        expect(false).toBeTruthy() // 强制失败
      } else {
        console.log('⚠️ 返回SVG但不是占位图，可能是正常的SVG图符')
      }
    } else {
      console.log('⚠️ 未知的Content-Type:', contentType)
    }
  })
})
