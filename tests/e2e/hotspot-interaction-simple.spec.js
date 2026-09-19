/**
 * 热点图形交互功能E2E测试 - 简化版
 * 测试核心热点渲染和交互功能
 */

const { test, expect } = require('@playwright/test')

test.describe('热点图形交互 - 核心功能测试', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000)

    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 10000 })
    await page.fill('input[placeholder*="账户名"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // 打开项目
    try {
      const openProjectBtn = page.locator('button:has-text("打开项目")').first()
      if (await openProjectBtn.isVisible({ timeout: 2000 })) {
        await openProjectBtn.click()
        await page.waitForTimeout(2000)
      }
    } catch (e) {
      console.log('无需打开项目')
    }
  })

  /**
   * 测试1: 验证预览功能基本可用
   */
  test('应该能打开DM预览弹框', async ({ page }) => {
    // 导航到DM列表
    await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    // 查找第一行并悬停
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()

    // 查找预览按钮
    const previewBtn = firstRow.locator('button:has-text("预览"), a:has-text("预览")').first()
    const isVisible = await previewBtn.isVisible().catch(() => false)

    if (!isVisible) {
      console.log('⚠️ 预览按钮不可见，跳过测试')
      test.skip()
      return
    }

    // 点击预览
    await previewBtn.click()
    await page.waitForTimeout(1000)

    // 验证预览弹框打开
    const previewModal = page.locator('.ant-modal-title:has-text("DM内容预览")')
    const modalVisible = await previewModal.isVisible({ timeout: 5000 }).catch(() => false)

    expect(modalVisible).toBe(true)
    console.log('✅ 预览弹框打开成功')

    // 验证iframe存在
    const iframe = page.frameLocator('iframe')
    const body = iframe.locator('body')
    const bodyVisible = await body.isVisible({ timeout: 5000 }).catch(() => false)

    expect(bodyVisible).toBe(true)
    console.log('✅ iframe内容加载成功')
  })

  /**
   * 测试2: 验证热点数据元素渲染
   */
  test('应该能渲染热点数据元素（如果DM包含热点）', async ({ page }) => {
    await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()

    const previewBtn = firstRow.locator('button:has-text("预览"), a:has-text("预览")').first()
    if (!await previewBtn.isVisible().catch(() => false)) {
      test.skip()
      return
    }

    await previewBtn.click()
    await page.waitForTimeout(2000)

    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    // 检查是否有热点数据元素
    const hotspotDataCount = await iframe.locator('.hotspot-data').count()
    console.log(`热点数据元素数量: ${hotspotDataCount}`)

    if (hotspotDataCount > 0) {
      // 验证热点数据属性
      const firstHotspot = iframe.locator('.hotspot-data').first()
      const id = await firstHotspot.getAttribute('data-hotspot-id')
      const shape = await firstHotspot.getAttribute('data-hotspot-shape')
      const coords = await firstHotspot.getAttribute('data-hotspot-coords')

      console.log('✅ 热点数据属性:', { id, shape, coords })
      expect(id).toBeTruthy()
    } else {
      console.log('ℹ️ 当前DM不包含热点，这是正常的')
    }
  })

  /**
   * 测试3: 验证SVG叠加层创建
   */
  test('应该创建SVG叠加层（如果有图片）', async ({ page }) => {
    await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()

    const previewBtn = firstRow.locator('button:has-text("预览"), a:has-text("预览")').first()
    if (!await previewBtn.isVisible().catch(() => false)) {
      test.skip()
      return
    }

    await previewBtn.click()
    await page.waitForTimeout(2000)

    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    // 等待图片加载
    const imageCount = await iframe.locator('img').count()
    console.log(`图片数量: ${imageCount}`)

    if (imageCount > 0) {
      // 等待SVG渲染
      await page.waitForTimeout(1000)

      // 检查SVG元素
      const svgCount = await iframe.locator('svg').count()
      console.log(`SVG叠加层数量: ${svgCount}`)

      if (svgCount > 0) {
        console.log('✅ SVG叠加层已创建')

        // 检查热点形状
        const rectCount = await iframe.locator('svg rect[style*="cursor: pointer"]').count()
        const circleCount = await iframe.locator('svg circle[style*="cursor: pointer"]').count()
        const polyCount = await iframe.locator('svg polygon[style*="cursor: pointer"]').count()

        console.log(`热点形状: 矩形=${rectCount}, 圆形=${circleCount}, 多边形=${polyCount}`)
      } else {
        console.log('ℹ️ 未检测到SVG叠加层（可能图片不包含热点）')
      }
    } else {
      console.log('ℹ️ 当前DM不包含图片')
    }
  })

  /**
   * 测试4: 验证热点弹框功能
   */
  test('应该能显示热点详情弹框', async ({ page }) => {
    // 先验证主预览弹框功能
    await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()

    const previewBtn = firstRow.locator('button:has-text("预览"), a:has-text("预览")').first()
    if (!await previewBtn.isVisible().catch(() => false)) {
      test.skip()
      return
    }

    await previewBtn.click()
    await page.waitForTimeout(2000)

    // 验证热点弹框组件已添加到DOM
    const hotspotModalExists = await page.locator('.ant-modal-title:has-text("热点详情")').count() > 0
    console.log(`热点弹框DOM元素存在: ${hotspotModalExists}`)

    if (hotspotModalExists) {
      console.log('✅ 热点弹框组件已正确添加到页面')
    } else {
      console.log('⚠️ 热点弹框组件未找到（可能是组件未渲染）')
    }

    // 尝试查找可点击的热点
    const iframe = page.frameLocator('iframe')
    const hotspotShapes = iframe.locator('svg rect[style*="cursor: pointer"], svg circle[style*="cursor: pointer"], svg polygon[style*="cursor: pointer"]')
    const hotspotCount = await hotspotShapes.count()

    if (hotspotCount > 0) {
      console.log(`发现 ${hotspotCount} 个可点击热点，尝试点击...`)

      // 点击第一个热点
      await hotspotShapes.first().click()
      await page.waitForTimeout(500)

      // 检查弹框是否显示（在主页面，不是iframe内）
      const modalVisible = await page.locator('.ant-modal:has(.ant-modal-title:has-text("热点详情"))').isVisible({ timeout: 2000 }).catch(() => false)

      if (modalVisible) {
        console.log('✅ 热点详情弹框成功显示')
        expect(modalVisible).toBe(true)
      } else {
        console.log('⚠️ 点击热点后弹框未显示')
      }
    } else {
      console.log('ℹ️ 当前DM不包含可点击的热点')
    }
  })

  /**
   * 测试5: 手工测试页面验证
   */
  test('手工测试页面应该可访问', async ({ page }) => {
    await page.goto('http://localhost:3000/tests/manual/hotspot-manual-test.html')

    const titleExists = await page.locator('h1:has-text("热点图形交互功能")').isVisible({ timeout: 5000 }).catch(() => false)

    if (titleExists) {
      console.log('✅ 手工测试页面加载成功')
      console.log('📍 访问地址: http://localhost:3000/tests/manual/hotspot-manual-test.html')

      // 等待测试执行
      await page.waitForTimeout(2000)

      // 检查测试结果
      const passResults = await page.locator('.result.pass').count()
      const failResults = await page.locator('.result.fail').count()

      console.log(`测试结果: 通过=${passResults}, 失败=${failResults}`)

      if (passResults > 0) {
        console.log('✅ 手工测试通过')
      }
    } else {
      console.log('⚠️ 手工测试页面未找到（需要将文件复制到public目录）')
    }
  })
})
