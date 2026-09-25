/**
 * Para设计器进入方式E2E测试
 * 验证从源码视图通过gutter图标进入设计视图的功能
 * 对标旧系统：点击行号右侧铅笔图标 ✏️ 进入Para设计器
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计器进入方式测试', () => {
  const baseURL = 'http://localhost:3000'
  const dmId = '1862031398009929730' // 测试DM ID

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto(`${baseURL}/#/login`)
    await page.waitForLoadState('networkidle')
    await page.locator('input[placeholder="请输入账户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('123456')
    await page.locator('button:has-text("登 录")').click()
    await page.waitForTimeout(2000)

    // 进入DM编辑器
    await page.goto(`${baseURL}/#/ietm/dm-content-editor/${dmId}?mode=edit`)
    await page.waitForTimeout(3000)
  })

  /**
   * TC-01: 验证gutter图标显示
   * 预期：para元素行号右侧显示蓝色铅笔图标 ✏️
   */
  test('TC-01: para元素行显示铅笔图标', async ({ page }) => {
    // 等待编辑器加载完成
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 10000 })

    // 检查dmGutter列存在
    await expect(page.locator('.CodeMirror-gutters .dmGutter')).toBeAttached()

    // 检查至少有一个铅笔图标
    const icons = page.locator('.gutter-design-marker .fa-pencil')
    await expect(icons.first()).toBeVisible({ timeout: 5000 })
    const count = await icons.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  /**
   * TC-02: 点击gutter图标打开Para设计器
   * 预期：点击铅笔图标后，切换到设计视图页签，Para设计器打开
   */
  test('TC-02: 点击铅笔图标打开Para设计器', async ({ page }) => {
    // 等待编辑器加载
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 10000 })

    // 点击第一个铅笔图标
    await page.locator('.gutter-design-marker .fa-pencil').first().click({ force: true })
    await page.waitForTimeout(1000)

    // 验证切换到设计视图页签
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('设计视图')

    // 验证Para设计器已打开
    await expect(page.locator('.para-designer-container')).toBeVisible({ timeout: 5000 })
  })

  /**
   * TC-03: 非para元素不显示图标
   * 预期：dmodule/content等非para元素行不显示铅笔图标
   */
  test('TC-03: 非para元素行不显示铅笔图标', async ({ page }) => {
    // 等待编辑器加载
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 10000 })

    // 获取所有带图标的行
    const markerCount = await page.locator('.gutter-design-marker').count()

    // 获取总行数
    const totalLines = await page.locator('.CodeMirror-line').count()

    // 带图标的行应该远少于总行数（只有para才有图标）
    expect(markerCount).toBeLessThan(totalLines / 2)
  })

  /**
   * TC-04: 图标悬停提示
   * 预期：鼠标悬停在铅笔图标上时，显示"设计视图【para】"提示
   */
  test('TC-04: 图标悬停显示提示信息', async ({ page }) => {
    // 等待编辑器加载
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 10000 })

    // 获取第一个图标链接
    const link = page.locator('.gutter-design-link').first()

    // 验证title属性包含"设计视图"
    const title = await link.getAttribute('title')
    expect(title).toMatch(/设计视图/)
  })

  /**
   * TC-05: 格式化后图标刷新
   * 预期：点击格式化按钮后，铅笔图标位置正确刷新（行号可能变化）
   */
  test('TC-05: 格式化后图标正确刷新', async ({ page }) => {
    // 等待编辑器加载
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 10000 })

    // 记录格式化前的图标数量
    const countBefore = await page.locator('.gutter-design-marker').count()

    // 点击格式化按钮
    await page.locator('button:has-text("格式化")').click()
    await page.waitForTimeout(1000)

    // 验证格式化后图标数量不变
    const countAfter = await page.locator('.gutter-design-marker').count()
    expect(countAfter).toBe(countBefore)
  })

  /**
   * TC-06: 中文模式下图标正常显示
   * 预期：切换到中文后，图标仍然正常显示
   */
  test('TC-06: 中文模式下图标正常显示', async ({ page }) => {
    // 等待编辑器加载
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 10000 })

    // 切换到中文模式（如果有切换按钮）
    const langBtn = page.locator('button:has-text("中文")')
    if (await langBtn.count() > 0) {
      await langBtn.click()
      await page.waitForTimeout(1000)
    }

    // 验证图标仍然显示
    await expect(page.locator('.gutter-design-marker .fa-pencil').first()).toBeVisible()

    // 验证title包含"设计视图"
    const title = await page.locator('.gutter-design-link').first().getAttribute('title')
    expect(title).toMatch(/设计视图/)
  })

  /**
   * TC-07: 双击树节点与点击图标等价
   * 预期：两种方式都能打开Para设计器，功能等价
   */
  test('TC-07: 双击树节点与点击图标功能等价', async ({ page }) => {
    // 等待编辑器加载
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 10000 })

    // 方式1: 点击铅笔图标
    await page.locator('.gutter-design-marker .fa-pencil').first().click({ force: true })
    await page.waitForTimeout(1000)

    // 验证设计器打开
    await expect(page.locator('.para-designer-container')).toBeVisible()

    // 切换回源码视图
    await page.locator('.ant-tabs-tab:has-text("源码视图")').click()
    await page.waitForTimeout(500)

    // 方式2: 双击树节点（如果树可见）
    const west = page.locator('.region-west')
    if (await west.isVisible()) {
      await page.locator('.dm-structure-tree .tree-node:has-text("para")').first().dblclick()
      await page.waitForTimeout(1000)

      // 验证设计器再次打开
      await expect(page.locator('.para-designer-container')).toBeVisible()
    }
  })
})
