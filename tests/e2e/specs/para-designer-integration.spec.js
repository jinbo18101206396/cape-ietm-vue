/**
 * Para设计器进入方式 - 集成测试
 * 测试DmSourceView与DmContentEditor的事件传递链
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计器进入方式集成测试', () => {
  const baseURL = 'http://localhost:3000'
  let page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // 登录
    await page.goto(`${baseURL}/#/login`)
    await page.fill('input[placeholder="请输入账号"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
  })

  test.afterEach(async () => {
    await page.close()
  })

  /**
   * IT-01: 验证事件传递链完整性
   * DmSourceView gutterClick → DmContentEditor onGutterClick → _openParaDesigner
   */
  test('IT-01: 事件传递链完整', async () => {
    // 打开DM编辑器
    await page.goto(`${baseURL}/#/ietm/ietmdatamodulemanagement/IetmDatamodulemanagementList`)
    await page.waitForTimeout(2000)

    // 点击第一个DM的编辑按钮
    await page.click('text=编辑')
    await page.waitForTimeout(3000)

    // 验证CodeMirror加载
    await expect(page.locator('.CodeMirror')).toBeVisible()

    // 验证gutter图标显示
    const markers = page.locator('.gutter-design-marker')
    const count = await markers.count()
    expect(count).toBeGreaterThan(0)

    // 点击第一个图标
    await markers.first().click()
    await page.waitForTimeout(1000)

    // 验证切换到设计视图页签
    const activeTab = page.locator('.ant-tabs-tab-active')
    await expect(activeTab).toContainText('设计视图')

    // 验证Para设计器打开
    await expect(page.locator('.para-designer-container')).toBeVisible()

    console.log('✅ IT-01: 事件传递链完整 - 通过')
  })

  /**
   * IT-02: 验证只读模式下的行为
   * 只读模式下点击图标应提示无法编辑
   */
  test('IT-02: 只读模式下禁止打开设计器', async () => {
    // 以浏览模式打开DM
    await page.goto(`${baseURL}/#/ietm/ietmdatamodulemanagement/IetmDatamodulemanagementList`)
    await page.waitForTimeout(2000)

    // 点击第一个DM的查看按钮
    await page.click('text=查看')
    await page.waitForTimeout(3000)

    // 验证只读横幅显示
    const banner = page.locator('.mode-banner--readonly')
    await expect(banner).toBeVisible()

    // 验证gutter图标显示（只读模式下也显示图标）
    const markers = page.locator('.gutter-design-marker')
    const count = await markers.count()
    expect(count).toBeGreaterThan(0)

    // 点击图标
    await markers.first().click()
    await page.waitForTimeout(500)

    // 验证提示信息
    const message = page.locator('.ant-message')
    await expect(message).toContainText('浏览模式下无法编辑')

    // 验证未切换到设计视图
    const sourceTab = page.locator('.ant-tabs-tab-active')
    await expect(sourceTab).toContainText('源码视图')

    console.log('✅ IT-02: 只读模式下禁止打开设计器 - 通过')
  })

  /**
   * IT-03: 验证中英文切换后图标功能正常
   */
  test('IT-03: 中英文切换后图标可点击', async () => {
    // 打开DM编辑器
    await page.goto(`${baseURL}/#/ietm/ietmdatamodulemanagement/IetmDatamodulemanagementList`)
    await page.waitForTimeout(2000)
    await page.click('text=编辑')
    await page.waitForTimeout(3000)

    // 切换到中文
    await page.selectOption('select', '中文')
    await page.waitForTimeout(2000)

    // 验证图标仍然显示
    const markers = page.locator('.gutter-design-marker')
    const count = await markers.count()
    expect(count).toBeGreaterThan(0)

    // 验证图标title为中文
    const firstMarker = markers.first()
    const title = await firstMarker.locator('a').getAttribute('title')
    expect(title).toContain('设计视图')

    // 点击图标
    await firstMarker.click()
    await page.waitForTimeout(1000)

    // 验证设计器打开
    await expect(page.locator('.para-designer-container')).toBeVisible()

    console.log('✅ IT-03: 中英文切换后图标可点击 - 通过')
  })

  /**
   * IT-04: 验证格式化后图标刷新
   */
  test('IT-04: 格式化后图标刷新正确', async () => {
    // 打开DM编辑器
    await page.goto(`${baseURL}/#/ietm/ietmdatamodulemanagement/IetmDatamodulemanagementList`)
    await page.waitForTimeout(2000)
    await page.click('text=编辑')
    await page.waitForTimeout(3000)

    // 记录格式化前的图标数量
    const markersBefore = page.locator('.gutter-design-marker')
    const countBefore = await markersBefore.count()

    // 点击格式化按钮
    await page.click('button:has-text("格式化")')
    await page.waitForTimeout(1000)

    // 验证格式化后图标数量不变
    const markersAfter = page.locator('.gutter-design-marker')
    const countAfter = await markersAfter.count()
    expect(countAfter).toBe(countBefore)

    // 验证格式化后图标仍可点击
    await markersAfter.first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('.para-designer-container')).toBeVisible()

    console.log(`✅ IT-04: 格式化后图标刷新正确 (${countBefore}个图标) - 通过`)
  })

  /**
   * IT-05: 验证双击树节点与点击图标等价
   */
  test('IT-05: 双击树节点与点击图标功能等价', async () => {
    // 打开DM编辑器
    await page.goto(`${baseURL}/#/ietm/ietmdatamodulemanagement/IetmDatamodulemanagementList`)
    await page.waitForTimeout(2000)
    await page.click('text=编辑')
    await page.waitForTimeout(3000)

    // 方式1: 点击图标
    const marker = page.locator('.gutter-design-marker').first()
    await marker.click()
    await page.waitForTimeout(1000)

    // 验证设计器打开
    await expect(page.locator('.para-designer-container')).toBeVisible()

    // 切换回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    // 方式2: 双击树节点
    const treeNode = page.locator('.dm-structure-tree .tree-node:has-text("para")').first()
    await treeNode.dblclick()
    await page.waitForTimeout(1000)

    // 验证设计器再次打开
    await expect(page.locator('.para-designer-container')).toBeVisible()

    console.log('✅ IT-05: 双击树节点与点击图标功能等价 - 通过')
  })

  /**
   * IT-06: 验证非para元素不显示图标
   */
  test('IT-06: 非para元素不显示图标', async () => {
    // 打开DM编辑器
    await page.goto(`${baseURL}/#/ietm/ietmdatamodulemanagement/IetmDatamodulemanagementList`)
    await page.waitForTimeout(2000)
    await page.click('text=编辑')
    await page.waitForTimeout(3000)

    // 获取所有行数
    const lines = await page.locator('.CodeMirror-line').count()

    // 获取图标数量
    const markers = await page.locator('.gutter-design-marker').count()

    // 图标数应该远少于总行数（只有para才有图标）
    expect(markers).toBeLessThan(lines / 2)

    console.log(`✅ IT-06: 非para元素不显示图标 (${markers}个图标 / ${lines}行) - 通过`)
  })
})
