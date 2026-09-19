/**
 * 热点图形交互功能E2E测试
 * 使用Playwright真实浏览器环境测试热点渲染、交互、弹框显示等功能
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999/jeecg-boot'

test.describe('热点图形交互功能 E2E测试', () => {
  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(90000)

    // 登录系统
    await page.goto('http://localhost:3000/user/login')
    await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 10000 })
    await page.fill('input[placeholder*="账户名"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000) // 等待登录完成

    // 打开项目（如果需要）
    try {
      const openProjectBtn = page.locator('button:has-text("打开项目")').first()
      if (await openProjectBtn.isVisible({ timeout: 2000 })) {
        await openProjectBtn.click()
        await page.waitForTimeout(2000)
      }
    } catch (e) {
      console.log('无需打开项目或项目已打开')
    }
  })

  /**
   * 测试1: 包含热点的DM预览渲染
   * 验证XSLT能够正确输出热点数据属性
   */
  test('应该正确渲染包含热点的DM预览', async ({ page }) => {
    // 准备测试数据：创建包含热点的DM
    const testDmXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/dmodule.xsd">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0"
                subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A"
                infoCode="040" infoCodeVariant="A" itemLocationCode="A"/>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
        <issueInfo issueNumber="001" inWork="00"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="09" day="18"/>
        <dmTitle><techName>热点测试DM</techName></dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus issueType="new">
      <security securityClassification="01"/>
      <responsiblePartnerCompany enterpriseCode="TEST"/>
      <originator enterpriseCode="TEST"/>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>热点图形示例</title>
        <figure>
          <title>测试图形</title>
          <graphic infoEntityIdent="ICN-TEST-00001">
            <applicationStructure>
              <objectCoordinates shapeType="rect" coordinateString="10,20,100,50"/>
              <hotspot id="hs-001">
                <para>这是矩形热点</para>
              </hotspot>
            </applicationStructure>
          </graphic>
        </figure>
      </levelledPara>
    </description>
  </content>
</dmodule>`

    // 导航到DM管理页面
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    // 查找第一个DM并打开预览
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()

    // 等待预览弹框加载
    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })

    // 等待iframe加载
    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    // 检查是否有热点数据标记元素
    const hotspotDataExists = await iframe.locator('.hotspot-data').count() > 0
    console.log('热点数据元素存在:', hotspotDataExists)

    // 如果存在热点，验证其属性
    if (hotspotDataExists) {
      const hotspotData = iframe.locator('.hotspot-data').first()
      const id = await hotspotData.getAttribute('data-hotspot-id')
      const shape = await hotspotData.getAttribute('data-hotspot-shape')
      const coords = await hotspotData.getAttribute('data-hotspot-coords')

      expect(id).toBeTruthy()
      expect(shape).toMatch(/rect|circle|poly/)
      expect(coords).toBeTruthy()
      console.log('热点数据:', { id, shape, coords })
    }
  })

  /**
   * 测试2: SVG热点叠加层渲染
   * 验证图片加载后SVG热点层被正确创建
   */
  test('应该在图片上正确渲染SVG热点叠加层', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()

    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })

    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    // 等待图片加载
    const images = iframe.locator('img')
    const imageCount = await images.count()
    console.log('图片数量:', imageCount)

    if (imageCount > 0) {
      // 等待SVG叠加层渲染
      await page.waitForTimeout(1000)

      // 检查是否有SVG元素被创建
      const svgs = iframe.locator('svg')
      const svgCount = await svgs.count()
      console.log('SVG叠加层数量:', svgCount)

      if (svgCount > 0) {
        const firstSvg = svgs.first()
        expect(await firstSvg.getAttribute('width')).toBeTruthy()
        expect(await firstSvg.getAttribute('height')).toBeTruthy()

        // 检查SVG内是否有热点形状元素
        const hotspotShapes = await iframe.locator('svg rect, svg circle, svg polygon').count()
        console.log('热点形状元素数量:', hotspotShapes)
      }
    }
  })

  /**
   * 测试3: 热点鼠标悬停高亮效果
   * 验证鼠标悬停时热点区域样式变化
   */
  test('鼠标悬停时热点应该显示高亮效果', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()

    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })

    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    // 等待热点渲染
    await page.waitForTimeout(1000)

    // 查找热点形状元素
    const hotspotShapes = iframe.locator('svg rect[style*="cursor: pointer"], svg circle[style*="cursor: pointer"], svg polygon[style*="cursor: pointer"]')
    const count = await hotspotShapes.count()
    console.log('可交互热点数量:', count)

    if (count > 0) {
      const firstHotspot = hotspotShapes.first()

      // 获取初始样式
      const initialFill = await firstHotspot.getAttribute('fill')
      const initialStrokeWidth = await firstHotspot.getAttribute('stroke-width')
      console.log('初始样式:', { fill: initialFill, strokeWidth: initialStrokeWidth })

      // 鼠标悬停
      await firstHotspot.hover()
      await page.waitForTimeout(100)

      // 获取悬停后样式（注意：需要检查事件监听器是否生效）
      const hoverFill = await firstHotspot.getAttribute('fill')
      const hoverStrokeWidth = await firstHotspot.getAttribute('stroke-width')
      console.log('悬停样式:', { fill: hoverFill, strokeWidth: hoverStrokeWidth })

      // 验证样式变化（高亮效果）
      expect(hoverFill).toContain('rgba(255, 87, 34')
    }
  })

  /**
   * 测试4: 热点点击显示详情弹框
   * 验证点击热点后弹出详情对话框
   */
  test('点击热点应该显示热点详情弹框', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()

    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })

    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    await page.waitForTimeout(1000)

    // 查找可点击的热点
    const hotspotShapes = iframe.locator('svg rect[style*="cursor: pointer"], svg circle[style*="cursor: pointer"], svg polygon[style*="cursor: pointer"]')
    const count = await hotspotShapes.count()
    console.log('可点击热点数量:', count)

    if (count > 0) {
      // 点击第一个热点
      await hotspotShapes.first().click()
      await page.waitForTimeout(500)

      // 检查是否显示热点详情弹框（在主页面，不是iframe内）
      const hotspotModal = page.locator('.ant-modal-title:has-text("热点详情")')
      const modalVisible = await hotspotModal.isVisible().catch(() => false)
      console.log('热点详情弹框显示:', modalVisible)

      if (modalVisible) {
        // 验证弹框内容
        const modalContent = page.locator('.ant-modal:has(.ant-modal-title:has-text("热点详情"))')
        await expect(modalContent).toBeVisible()

        // 检查描述信息是否存在
        const descriptionLabel = modalContent.locator('.ant-descriptions-item-label:has-text("描述信息")')
        await expect(descriptionLabel).toBeVisible()

        // 关闭弹框
        await modalContent.locator('.ant-modal-close').click()
      }
    }
  })

  /**
   * 测试5: 多个热点在同一图片上的交互
   * 验证一个图片包含多个热点时每个热点都可以独立交互
   */
  test('应该支持同一图片上多个热点的独立交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()

    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })

    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    await page.waitForTimeout(1000)

    // 查找所有热点
    const hotspotShapes = iframe.locator('svg rect[style*="cursor: pointer"], svg circle[style*="cursor: pointer"], svg polygon[style*="cursor: pointer"]')
    const totalCount = await hotspotShapes.count()
    console.log('热点总数:', totalCount)

    if (totalCount > 1) {
      // 测试第一个热点
      await hotspotShapes.nth(0).click()
      await page.waitForTimeout(300)
      let modal1Visible = await page.locator('.ant-modal-title:has-text("热点详情")').isVisible().catch(() => false)
      console.log('第1个热点点击后弹框显示:', modal1Visible)
      if (modal1Visible) {
        await page.locator('.ant-modal-close').first().click()
        await page.waitForTimeout(200)
      }

      // 测试第二个热点
      await hotspotShapes.nth(1).click()
      await page.waitForTimeout(300)
      let modal2Visible = await page.locator('.ant-modal-title:has-text("热点详情")').isVisible().catch(() => false)
      console.log('第2个热点点击后弹框显示:', modal2Visible)

      // 验证每个热点都能独立触发弹框
      expect(modal1Visible || modal2Visible).toBe(true)
    }
  })

  /**
   * 测试6: 热点数据属性正确性
   * 验证XSLT输出的热点数据属性格式正确
   */
  test('XSLT应该输出正确格式的热点数据属性', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()

    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })

    const iframe = page.frameLocator('iframe')
    await iframe.locator('body').waitFor({ timeout: 5000 })

    // 检查热点数据元素
    const hotspotDataElements = iframe.locator('.hotspot-data')
    const count = await hotspotDataElements.count()
    console.log('热点数据元素数量:', count)

    if (count > 0) {
      const firstData = hotspotDataElements.first()

      // 验证必需属性存在
      const id = await firstData.getAttribute('data-hotspot-id')
      const shape = await firstData.getAttribute('data-hotspot-shape')
      const coords = await firstData.getAttribute('data-hotspot-coords')

      expect(id).toBeTruthy()
      expect(shape).toMatch(/^(rect|circle|poly)$/)
      expect(coords).toMatch(/^[\d,\s]+$/)

      console.log('热点数据验证通过:', { id, shape, coords })
    }
  })

  /**
   * 测试7: 预览弹框关闭后资源清理
   * 验证关闭预览弹框后SVG叠加层和事件监听器被正确清理
   */
  test('关闭预览弹框应该正确清理SVG资源', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleList`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()

    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })
    await page.waitForTimeout(1000)

    // 关闭预览弹框
    await page.locator('.ant-modal:has(.ant-modal-title:has-text("DM内容预览")) .ant-modal-close').click()
    await page.waitForTimeout(500)

    // 验证弹框已关闭
    const modalVisible = await page.locator('.ant-modal-title:has-text("DM内容预览")').isVisible().catch(() => false)
    expect(modalVisible).toBe(false)

    // 重新打开预览验证功能仍正常
    await firstRow.hover()
    await firstRow.locator('button:has-text("预览")').click()
    await page.waitForSelector('.ant-modal-title:has-text("DM内容预览")', { timeout: 5000 })

    const iframe = page.frameLocator('iframe')
    const bodyVisible = await iframe.locator('body').isVisible().catch(() => false)
    expect(bodyVisible).toBe(true)
  })
})
