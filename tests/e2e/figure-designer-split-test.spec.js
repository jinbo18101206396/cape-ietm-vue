const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 })
  const context = await browser.newContext()
  const page = await context.newPage()

  const outputDir = path.resolve('C:/Users/86135/.playwright-mcp')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    console.log('🔐 步骤1: 登录系统')
    await page.goto('http://localhost:3001/user/login')
    await page.fill('input[placeholder="账号: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
    console.log('✅ 登录成功')

    console.log('\n📝 步骤2: 导航到DM管理页面')
    await page.click('text=手册管理')
    await page.waitForTimeout(1000)
    await page.click('text=数据模块管理')
    await page.waitForTimeout(2000)

    console.log('\n🔍 步骤3: 查找并打开测试DM')
    await page.fill('input[placeholder="请输入DMC编码"]', 'DMC-ZB1-A-04-00-00-00A-007A-A_001-01')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(2000)

    const editButtons = await page.locator('button:has-text("浏览或编辑DM内容")').all()
    if (editButtons.length > 0) {
      await editButtons[0].click()
      console.log('✅ 打开DM编辑器')
    } else {
      throw new Error('未找到"浏览或编辑DM内容"按钮')
    }

    await page.waitForTimeout(3000)

    console.log('\n📊 步骤4: 点击图形的铅笔图标')
    // 查找所有行号69的gutter marker（figure标签所在行）
    const gutterMarkers = await page.locator('.CodeMirror-linenumber:has-text("69")').all()
    if (gutterMarkers.length > 0) {
      await gutterMarkers[0].hover()
      await page.waitForTimeout(500)

      // 查找铅笔图标链接
      const pencilLink = page.locator('a[href="javascript:void(0);"]').filter({ hasText: '✎' })
      await pencilLink.click()
      console.log('✅ 点击铅笔图标成功')
    }

    await page.waitForTimeout(2000)

    console.log('\n🎨 步骤5: 验证GraphicDesigner是否显示')
    const graphicDesigner = await page.locator('.figure-graphic-designer').isVisible()
    console.log('GraphicDesigner可见:', graphicDesigner)

    if (graphicDesigner) {
      // 截图保存
      await page.screenshot({ path: path.join(outputDir, 'graphic-designer-visible.png'), fullPage: true })
      console.log('✅ GraphicDesigner显示正常')

      // 验证图形列表
      const graphicTable = await page.locator('.graphic-designer table').isVisible()
      console.log('图形列表可见:', graphicTable)

      // 验证热点编辑区域
      const hotspotSection = await page.locator('.hotspot-section').isVisible()
      console.log('热点编辑区可见:', hotspotSection)

      // 验证预览面板
      const previewPanel = await page.locator('.right-preview').isVisible()
      console.log('预览面板可见:', previewPanel)

      // 获取图形数量
      const graphicRows = await page.locator('.graphic-designer table tbody tr').count()
      console.log('图形数量:', graphicRows)
    }

    console.log('\n📝 步骤6: 切换到图例（模拟用户修改XML）')
    console.log('⚠️ 由于figure内部已经没有tabs，需要通过其他方式触发LegendDesigner')
    console.log('建议：手工在XML中添加<legend>标签，然后点击铅笔图标')

    console.log('\n✅ 测试完成')
    console.log('📸 截图保存在:', outputDir)

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    await page.screenshot({ path: path.join(outputDir, 'error.png'), fullPage: true })
  }

  await page.waitForTimeout(5000)
  await browser.close()
})()
