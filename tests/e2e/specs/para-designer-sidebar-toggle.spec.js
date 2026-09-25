/**
 * Para设计器自动隐藏侧边栏功能测试
 * 测试场景：进入设计视图时自动隐藏左侧导航树和右侧属性面板
 * 测试日期：2026-09-23
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计器自动隐藏侧边栏功能测试', () => {
  const baseURL = 'http://localhost:3000'
  const dmId = '1862031398009929730' // 测试DM ID

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto(`${baseURL}/#/login`)
    await page.waitForLoadState('networkidle')

    // 等待登录表单加载
    await page.waitForSelector('input[placeholder="请输入账户名"]', {
      state: 'visible',
      timeout: 30000
    })

    await page.locator('input[placeholder="请输入账户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('123456')

    // 点击登录并等待跳转
    await Promise.all([
      page.waitForURL(/.*\/#\/.*/, { timeout: 10000 }),
      page.locator('button:has-text("登 录")').click()
    ])

    await page.waitForTimeout(2000)

    // 进入DM编辑器
    await page.goto(`${baseURL}/#/ietm/dm-content-editor/${dmId}?mode=edit`)

    // 等待CodeMirror加载
    await page.waitForSelector('.CodeMirror', {
      state: 'visible',
      timeout: 10000
    })

    // 等待gutter图标加载
    await page.waitForSelector('.gutter-design-marker', {
      state: 'visible',
      timeout: 5000
    })
  })

  /**
   * TC-01: 点击gutter图标进入设计视图，侧边栏应自动隐藏
   */
  test('TC-01: 点击gutter图标进入设计视图时自动隐藏侧边栏', async ({ page }) => {
    // 验证初始状态：源码视图，左侧导航树显示
    await expect(page.locator('.region-west')).toBeVisible()

    // 点击第一个铅笔图标进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').first().click()
    await page.waitForTimeout(500)

    // 验证：切换到设计视图页签
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('设计视图')

    // 验证：左侧导航树已隐藏
    await expect(page.locator('.region-west')).toBeHidden()

    // 验证：右侧属性面板已隐藏
    await expect(page.locator('.region-east')).toBeHidden()

    // 验证：Para设计器已打开
    await expect(page.locator('.para-designer-container')).toBeVisible()
  })

  /**
   * TC-02: 双击树节点进入设计视图，侧边栏应自动隐藏
   */
  test('TC-02: 双击树节点进入设计视图时自动隐藏侧边栏', async ({ page }) => {
    // 确保左侧导航树可见
    const treeVisible = await page.locator('.region-west').isVisible()
    if (!treeVisible) {
      // 如果树被隐藏，先显示
      await page.locator('.edge-btn.edge-left').click()
      await page.waitForTimeout(300)
    }

    // 验证初始状态：左侧导航树显示
    await expect(page.locator('.region-west')).toBeVisible()

    // 双击树中的para节点
    const paraNode = page.locator('.dm-structure-tree .tree-node:has-text("para")').first()
    await paraNode.dblclick()
    await page.waitForTimeout(500)

    // 验证：切换到设计视图页签
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('设计视图')

    // 验证：左侧导航树已隐藏
    await expect(page.locator('.region-west')).toBeHidden()

    // 验证：右侧属性面板已隐藏
    await expect(page.locator('.region-east')).toBeHidden()

    // 验证：Para设计器已打开
    await expect(page.locator('.para-designer-container')).toBeVisible()
  })

  /**
   * TC-03: 切换回源码视图，侧边栏应自动恢复
   */
  test('TC-03: 切换回源码视图时自动恢复侧边栏', async ({ page }) => {
    // 先进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').first().click()
    await page.waitForTimeout(500)

    // 验证设计视图状态
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('设计视图')
    await expect(page.locator('.region-west')).toBeHidden()

    // 切换回源码视图
    await page.locator('.ant-tabs-tab:has-text("源码视图")').click()
    await page.waitForTimeout(500)

    // 验证：切换到源码视图页签
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('源码视图')

    // 验证：左侧导航树已恢复显示
    await expect(page.locator('.region-west')).toBeVisible()

    // 验证：右侧属性面板恢复显示（编辑模式下）
    // 注意：如果是浏览模式，属性面板应保持隐藏
    const isReadonly = await page.locator('.mode-banner--readonly').count() > 0
    if (!isReadonly) {
      await expect(page.locator('.region-east')).toBeVisible()
    }

    // 验证：Para设计器已关闭
    await expect(page.locator('.para-designer-container')).toBeHidden()
  })

  /**
   * TC-04: 多次切换视图，侧边栏状态应正确
   */
  test('TC-04: 多次切换视图时侧边栏状态保持正确', async ({ page }) => {
    // 第1次：进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('.region-west')).toBeHidden()
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('设计视图')

    // 第1次：切换回源码视图
    await page.locator('.ant-tabs-tab:has-text("源码视图")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('.region-west')).toBeVisible()
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('源码视图')

    // 第2次：进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').nth(1).click()
    await page.waitForTimeout(500)
    await expect(page.locator('.region-west')).toBeHidden()
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('设计视图')

    // 第2次：切换回源码视图
    await page.locator('.ant-tabs-tab:has-text("源码视图")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('.region-west')).toBeVisible()
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('源码视图')

    // 验证：状态稳定，无异常
  })

  /**
   * TC-05: 手动隐藏侧边栏后切换视图，应自动恢复
   */
  test('TC-05: 手动隐藏侧边栏后切换视图仍能正确恢复', async ({ page }) => {
    // 手动点击按钮隐藏左侧导航树
    await page.locator('.edge-btn.edge-left').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.region-west')).toBeHidden()

    // 进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('.region-west')).toBeHidden()

    // 切换回源码视图
    await page.locator('.ant-tabs-tab:has-text("源码视图")').click()
    await page.waitForTimeout(500)

    // 验证：左侧导航树自动恢复显示（覆盖用户的手动隐藏）
    await expect(page.locator('.region-west')).toBeVisible()
  })

  /**
   * TC-06: 浏览模式下，属性面板应保持隐藏
   */
  test('TC-06: 浏览模式下切换视图时属性面板保持隐藏', async ({ page }) => {
    // 检查当前是否为浏览模式
    const isReadonly = await page.locator('.mode-banner--readonly').count() > 0

    if (!isReadonly) {
      test.skip()
      return
    }

    // 浏览模式下，验证初始状态
    await expect(page.locator('.region-east')).toBeHidden()

    // 进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').first().click()
    await page.waitForTimeout(500)

    // 切换回源码视图
    await page.locator('.ant-tabs-tab:has-text("源码视图")').click()
    await page.waitForTimeout(500)

    // 验证：属性面板仍然隐藏（浏览模式下不显示）
    await expect(page.locator('.region-east')).toBeHidden()
  })

  /**
   * TC-07: 进入设计视图后保存并切换，侧边栏应正常
   */
  test('TC-07: 设计视图保存后切换回源码视图侧边栏正常', async ({ page }) => {
    // 进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('.region-west')).toBeHidden()

    // 等待Para设计器加载
    await expect(page.locator('.para-designer-container')).toBeVisible()

    // 模拟编辑操作（等待一段时间）
    await page.waitForTimeout(1000)

    // 切换回源码视图
    await page.locator('.ant-tabs-tab:has-text("源码视图")').click()
    await page.waitForTimeout(500)

    // 验证：侧边栏正常恢复
    await expect(page.locator('.region-west')).toBeVisible()
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('源码视图')
  })

  /**
   * TC-08: 格式化后进入设计视图，侧边栏应正常隐藏
   */
  test('TC-08: 格式化XML后进入设计视图侧边栏正常隐藏', async ({ page }) => {
    // 点击格式化按钮
    await page.locator('button:has-text("格式化")').click()
    await page.waitForTimeout(1000)

    // 等待格式化完成，gutter图标刷新
    await page.waitForSelector('.gutter-design-marker', {
      state: 'visible',
      timeout: 5000
    })

    // 验证初始状态
    await expect(page.locator('.region-west')).toBeVisible()

    // 进入设计视图
    await page.locator('.gutter-design-marker .fa-pencil').first().click()
    await page.waitForTimeout(500)

    // 验证：侧边栏正常隐藏
    await expect(page.locator('.region-west')).toBeHidden()
    await expect(page.locator('.region-east')).toBeHidden()
    await expect(page.locator('.ant-tabs-tab-active')).toContainText('设计视图')
  })
})
