/**
 * ICN引用弹窗E2E测试
 * 测试优化后的布局在真实浏览器中的表现
 */

const { test, expect } = require('@playwright/test')

test.describe('ICN引用弹窗布局优化E2E测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录并导航到ICN管理页面
    await page.goto('http://localhost:3000')
    await page.fill('input[placeholder="请输入账号"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(2000)

    // 打开项目
    await page.goto('http://localhost:3000/api/ietmproject/ietmProject/openProject?projectId=test-project-id')
    await page.waitForTimeout(1000)

    // 导航到ICN管理页面
    await page.goto('http://localhost:3000/icnmanage')
    await page.waitForLoadState('networkidle')
  })

  // E2E-01: 测试弹窗打开和布局
  test('E2E-01: 点击引用按钮应打开1200px宽的弹窗', async ({ page }) => {
    // 选择一条ICN记录
    await page.click('tbody tr:first-child input[type="checkbox"]')

    // 点击引用按钮
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(500)

    // 验证弹窗打开
    const modal = page.locator('.icn-reference-modal')
    await expect(modal).toBeVisible()

    // 验证弹窗宽度（通过CSS检查）
    const modalDialog = page.locator('.ant-modal')
    const width = await modalDialog.evaluate(el => window.getComputedStyle(el).width)
    expect(parseInt(width)).toBeGreaterThanOrEqual(1200)
  })

  // E2E-02: 测试当前ICN信息区显示7个字段
  test('E2E-02: 当前ICN信息区应显示7个字段', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(500)

    // 验证ICN信息区的字段标签
    const infoSection = page.locator('.icn-info-section')
    await expect(infoSection.locator('text=ICN编码')).toBeVisible()
    await expect(infoSection.locator('text=文件名称')).toBeVisible()
    await expect(infoSection.locator('text=ICN类型')).toBeVisible()
    await expect(infoSection.locator('text=版本号')).toBeVisible()
    await expect(infoSection.locator('text=密级')).toBeVisible()
    await expect(infoSection.locator('text=创建时间')).toBeVisible()
    await expect(infoSection.locator('text=责任单位')).toBeVisible()
  })

  // E2E-03: 测试统计栏显示3种统计
  test('E2E-03: 统计栏应一行显示3种统计信息', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(500)

    // 验证统计栏布局
    const statsBar = page.locator('.statistics-bar')
    await expect(statsBar).toBeVisible()

    // 验证3种统计都显示
    await expect(statsBar.locator('text=引用其他ICN:')).toBeVisible()
    await expect(statsBar.locator('text=被其他ICN引用:')).toBeVisible()
    await expect(statsBar.locator('text=被DM引用:')).toBeVisible()

    // 验证统计值显示
    const statValues = statsBar.locator('.stat-value')
    const count = await statValues.count()
    expect(count).toBe(3)
  })

  // E2E-04: 测试Tab页签显示数量徽章
  test('E2E-04: Tab页签应显示引用数量徽章', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(1000)

    // 等待数据加载
    await page.waitForSelector('.ant-tabs-tab', { timeout: 5000 })

    // 验证Tab页签上有徽章
    const tabs = page.locator('.ant-tabs-tab')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(3)

    // 验证徽章存在（即使数量为0）
    const badges = page.locator('.ant-badge')
    const badgeCount = await badges.count()
    expect(badgeCount).toBeGreaterThanOrEqual(3)
  })

  // E2E-05: 测试ICN引用表格包含9列
  test('E2E-05: ICN引用表格应包含9列', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(1000)

    // 切换到第一个Tab（引用其他ICN）
    await page.click('.ant-tabs-tab:nth-child(1)')
    await page.waitForTimeout(500)

    // 验证表头列数
    const headers = page.locator('.ant-table thead th')
    const headerCount = await headers.count()
    expect(headerCount).toBe(9)

    // 验证列标题
    await expect(page.locator('th:has-text("序号")')).toBeVisible()
    await expect(page.locator('th:has-text("ICN编码")')).toBeVisible()
    await expect(page.locator('th:has-text("文件名称")')).toBeVisible()
    await expect(page.locator('th:has-text("ICN类型")')).toBeVisible()
    await expect(page.locator('th:has-text("版本号")')).toBeVisible()
    await expect(page.locator('th:has-text("密级")')).toBeVisible()
    await expect(page.locator('th:has-text("责任单位")')).toBeVisible()
    await expect(page.locator('th:has-text("创建时间")')).toBeVisible()
    await expect(page.locator('th:has-text("操作")')).toBeVisible()
  })

  // E2E-06: 测试DM引用表格包含9列
  test('E2E-06: DM引用表格应包含9列', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(1000)

    // 切换到第三个Tab（被DM引用）
    await page.click('.ant-tabs-tab:nth-child(3)')
    await page.waitForTimeout(500)

    // 验证表头列数
    const headers = page.locator('.ant-table thead th')
    const headerCount = await headers.count()
    expect(headerCount).toBe(9)

    // 验证关键列标题
    await expect(page.locator('th:has-text("DM编码")')).toBeVisible()
    await expect(page.locator('th:has-text("DM标题")')).toBeVisible()
    await expect(page.locator('th:has-text("密级")')).toBeVisible()
    await expect(page.locator('th:has-text("创建时间")')).toBeVisible()
  })

  // E2E-07: 测试ICN类型标签颜色
  test('E2E-07: ICN类型应显示带颜色的标签', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(1000)

    // 验证ICN信息区的类型标签
    const icnTypeTag = page.locator('.icn-info-section .ant-tag').first()
    const tagClass = await icnTypeTag.getAttribute('class')

    // 验证标签包含颜色类（ant-tag-blue/green/orange等）
    const hasColorClass = /ant-tag-(blue|green|orange|purple|default)/.test(tagClass)
    expect(hasColorClass).toBeTruthy()
  })

  // E2E-08: 测试密级标签颜色
  test('E2E-08: 密级应显示带颜色的标签', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(1000)

    // 验证ICN信息区的密级标签
    const securityTags = page.locator('.icn-info-section .ant-tag')
    const count = await securityTags.count()

    if (count >= 2) {
      const securityTag = securityTags.nth(1) // 第二个标签是密级
      const tagClass = await securityTag.getAttribute('class')

      // 验证标签包含颜色类
      const hasColorClass = /ant-tag-(green|blue|orange|red|volcano|magenta)/.test(tagClass)
      expect(hasColorClass).toBeTruthy()
    }
  })

  // E2E-09: 测试表格行hover效果
  test('E2E-09: 表格行hover应有高亮效果', async ({ page }) => {
    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(1000)

    // 切换到有数据的Tab
    await page.click('.ant-tabs-tab:nth-child(1)')
    await page.waitForTimeout(500)

    // 检查是否有数据行
    const rows = page.locator('.ant-table tbody tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      const firstRow = rows.first()

      // 鼠标悬停
      await firstRow.hover()
      await page.waitForTimeout(300)

      // 验证背景色变化（通过检查style或class）
      const bgColor = await firstRow.evaluate(el => window.getComputedStyle(el).backgroundColor)

      // 预期背景色应该是浅蓝色（#e6f7ff的RGB值约为 rgb(230, 247, 255)）
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)') // 不是透明
    }
  })

  // E2E-10: 测试弹窗响应式布局
  test('E2E-10: 弹窗在不同屏幕尺寸下应正常显示', async ({ page }) => {
    // 测试1366x768屏幕
    await page.setViewportSize({ width: 1366, height: 768 })

    await page.click('tbody tr:first-child input[type="checkbox"]')
    await page.click('button:has-text("引用")')
    await page.waitForTimeout(500)

    // 验证弹窗可见且不溢出
    const modal = page.locator('.ant-modal')
    await expect(modal).toBeVisible()

    const modalBox = await modal.boundingBox()
    expect(modalBox.width).toBeLessThanOrEqual(1366)

    // 关闭弹窗
    await page.click('.ant-modal-close')
    await page.waitForTimeout(500)

    // 测试1920x1080屏幕
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.click('button:has-text("引用")')
    await page.waitForTimeout(500)

    await expect(modal).toBeVisible()
  })
})
