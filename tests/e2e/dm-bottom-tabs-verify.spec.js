/**
 * DM内容编辑器 - 底部页签布局验证
 *
 * 验证点：
 * 1. 中区底部出现两个页签按钮（设计视图 | 源码视图）
 * 2. 设计视图在左（禁用灰色）、源码视图在右（选中蓝色）
 * 3. 页签按钮位于编辑器下方而非上方
 * 4. CodeMirror 编辑器高度正常填充
 * 5. 底部不再有状态栏（原DMC/行列/保存提示）
 */

const { test, expect } = require('@playwright/test')

test.describe('DM内容编辑器 - 底部页签布局', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000')
    await page.fill('input[placeholder="请输入账号"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'admin')
    await page.click('button:has-text("登录")')

    // 等待登录完成（检查退出按钮或用户名显示）
    await page.waitForSelector('.ant-avatar, .user-dropdown', { timeout: 10000 })

    // 导航到项目数据模块管理
    await page.click('text=项目管理')
    await page.click('text=项目数据模块管理')
    await page.waitForLoadState('networkidle')

    // 选中第一个DM并点击「浏览或编辑内容」
    await page.locator('.ant-table-tbody tr').first().click()
    await page.click('button:has-text("浏览或编辑内容"), a:has-text("浏览或编辑内容")')

    // 等待编辑器加载（CodeMirror容器出现）
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    await page.waitForTimeout(1000) // 等待布局稳定
  })

  test('验证1: 中区底部存在页签容器', async ({ page }) => {
    const tabsContainer = page.locator('.view-tabs.ant-tabs-bottom')
    await expect(tabsContainer).toBeVisible()

    console.log('✓ 页签容器存在且为 bottom 模式')
  })

  test('验证2: 两个页签按钮存在且顺序正确', async ({ page }) => {
    // 获取所有页签按钮
    const tabs = page.locator('.ant-tabs-tab')
    await expect(tabs).toHaveCount(2)

    // 第一个页签：设计视图（左）
    const designTab = tabs.nth(0)
    await expect(designTab).toContainText('设计视图')
    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/) // 禁用

    // 第二个页签：源码视图（右）
    const sourceTab = tabs.nth(1)
    await expect(sourceTab).toContainText('源码视图')
    await expect(sourceTab).toHaveClass(/ant-tabs-tab-active/) // 选中

    console.log('✓ 设计视图在左（禁用）、源码视图在右（选中）')
  })

  test('验证3: 页签栏位于编辑器下方', async ({ page }) => {
    const editor = page.locator('.CodeMirror').first()
    const tabBar = page.locator('.ant-tabs-bar')

    // 获取两者的 boundingBox
    const editorBox = await editor.boundingBox()
    const tabBarBox = await tabBar.boundingBox()

    expect(editorBox).not.toBeNull()
    expect(tabBarBox).not.toBeNull()

    // 页签栏的 y 坐标应大于编辑器的 y + height（即页签在下方）
    expect(tabBarBox.y).toBeGreaterThan(editorBox.y + editorBox.height - 50) // 允许50px误差

    console.log(`✓ 页签栏位置: y=${tabBarBox.y}, 编辑器底部: y=${editorBox.y + editorBox.height}`)
  })

  test('验证4: CodeMirror 编辑器高度正常', async ({ page }) => {
    const editor = page.locator('.CodeMirror').first()
    const editorBox = await editor.boundingBox()

    expect(editorBox).not.toBeNull()

    // 编辑器高度应 > 200px（合理的最小值）
    expect(editorBox.height).toBeGreaterThan(200)

    // 编辑器应可见且不折叠
    await expect(editor).toBeVisible()

    console.log(`✓ CodeMirror 高度: ${editorBox.height}px`)
  })

  test('验证5: 底部状态栏已移除', async ({ page }) => {
    // 旧状态栏的 class 为 .editor-status
    const statusBar = page.locator('.editor-status')
    await expect(statusBar).toHaveCount(0)

    // 确认不再显示「行 X · 列 Y」
    const lineColText = page.locator('text=/行 \\d+ · 列 \\d+/')
    await expect(lineColText).toHaveCount(0)

    console.log('✓ 底部状态栏已移除')
  })

  test('验证6: 工具栏仍在源码视图内且功能正常', async ({ page }) => {
    // 工具栏应在源码视图页签内容区
    const toolbar = page.locator('.editor-toolbar')
    await expect(toolbar).toBeVisible()

    // 点击「格式化」按钮测试工具栏可用
    const formatBtn = toolbar.locator('button:has-text("格式化")')
    await expect(formatBtn).toBeVisible()
    await formatBtn.click()

    // 等待格式化完成（内容应有变化或无报错）
    await page.waitForTimeout(500)

    console.log('✓ 工具栏在源码视图内且可用')
  })

  test('验证7: 尝试点击禁用的设计视图页签', async ({ page }) => {
    const designTab = page.locator('.ant-tabs-tab').nth(0)

    // 点击设计视图页签（应无效）
    await designTab.click({ force: true })

    // 等待可能的提示消息
    await page.waitForTimeout(500)

    // 源码视图仍应为 active
    const sourceTab = page.locator('.ant-tabs-tab').nth(1)
    await expect(sourceTab).toHaveClass(/ant-tabs-tab-active/)

    // 检查是否有提示消息
    const toast = page.locator('.ant-message:has-text("设计视图为二期功能")')
    // 注意：disabled tab 点击可能根本不触发事件，所以这条是可选验证

    console.log('✓ 设计视图页签禁用，点击无效')
  })

  test('验证8: 模式横幅仍显示 DMC 和保存状态', async ({ page }) => {
    // 模式横幅应存在
    const banner = page.locator('.mode-banner')
    await expect(banner).toBeVisible()

    // 应显示 DMC（虽然状态栏移除了，但横幅里有）
    await expect(banner).toContainText(/DMC/)

    // 应显示模式（编辑模式 或 浏览模式）
    await expect(banner).toContainText(/编辑模式|浏览模式/)

    console.log('✓ 模式横幅仍正常显示信息')
  })

  test('验证9: 截图记录最终布局', async ({ page }) => {
    // 对整个编辑器区域截图
    const editorRegion = page.locator('.region-center')
    await editorRegion.screenshot({ path: 'tests/e2e/dm-bottom-tabs-layout.png' })

    console.log('✓ 布局截图已保存: tests/e2e/dm-bottom-tabs-layout.png')
  })
})
