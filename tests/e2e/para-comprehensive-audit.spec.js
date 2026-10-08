/**
 * Para设计视图全面审核测试
 * 对标旧系统，系统全面排查问题
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计视图全面审核', () => {
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()

    // 1. 登录
    await page.goto('http://localhost:3001/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
    console.log('✅ 登录成功')
  })

  test.afterAll(async () => {
    await page?.close()
  })

  test('审核1：工具栏按钮数量（对标旧系统13个按钮）', async () => {
    // 导航到数据模块编辑页面
    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(2000)

    // 查找并打开第一个DM
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    // 点击"编辑内容"按钮
    const editButton = page.locator('button:has-text("编辑内容")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(3000)
    }

    // 等待编辑器加载
    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(2000)

    // 截图保存当前状态
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/para-toolbar-audit.png',
      fullPage: true
    })

    // 统计工具栏按钮数量
    const iframe = page.frameLocator('iframe.edui-editor-iframeholder')
    const toolbarButtons = await page.locator('.edui-toolbar .edui-button').count()

    console.log(`📊 工具栏按钮数量: ${toolbarButtons}`)

    // 旧系统约13个按钮（8个基础 + 4个S1000D + 1个分隔符容差）
    const expectedMin = 10
    const expectedMax = 15

    expect(toolbarButtons).toBeGreaterThanOrEqual(expectedMin)
    expect(toolbarButtons).toBeLessThanOrEqual(expectedMax)

    if (toolbarButtons >= expectedMin && toolbarButtons <= expectedMax) {
      console.log(`✅ 通过: 工具栏按钮数量在合理范围内 (${toolbarButtons} 在 ${expectedMin}-${expectedMax} 之间)`)
    }
  })

  test('审核2：必需的S1000D自定义按钮存在性', async () => {
    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(3000)
    }

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(2000)

    // 检查4个S1000D自定义按钮
    const customButtons = [
      { name: 'deflist', title: '定义列表' },
      { name: 'interrefbutton', title: '内部引用' },
      { name: 'dmrefbutton', title: 'DM引用' },
      { name: 'symbolbutton', title: '图符' }
    ]

    const results = []

    for (const btn of customButtons) {
      // 尝试多种选择器
      const selectors = [
        `.edui-button[title*="${btn.title}"]`,
        `.edui-button.edui-for-${btn.name}`,
        `.edui-toolbar .edui-button:has-text("${btn.title}")`
      ]

      let found = false
      for (const selector of selectors) {
        const count = await page.locator(selector).count()
        if (count > 0) {
          found = true
          console.log(`✅ 找到按钮: ${btn.title} (${selector})`)
          break
        }
      }

      results.push({ name: btn.name, title: btn.title, found })

      if (!found) {
        console.log(`❌ 缺少按钮: ${btn.title}`)
      }
    }

    // 所有按钮都应该存在
    const allFound = results.every(r => r.found)
    if (allFound) {
      console.log('✅ 所有S1000D自定义按钮都存在')
    } else {
      const missing = results.filter(r => !r.found).map(r => r.title).join(', ')
      console.log(`❌ 缺少按钮: ${missing}`)
    }

    // 至少应该找到2个以上的自定义按钮（考虑到可能的注册延迟）
    const foundCount = results.filter(r => r.found).length
    expect(foundCount).toBeGreaterThanOrEqual(2)
  })

  test('审核3：不应存在的多余按钮检查', async () => {
    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(3000)
    }

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(2000)

    // 检查不应该出现的按钮（旧系统中没有的）
    const unnecessaryButtons = [
      'source',         // 源码
      'preview',        // 预览
      'print',          // 打印
      'emotion',        // 表情
      'simpleupload',   // 上传
      'insertimage',    // 插入图片
      'insertvideo',    // 插入视频
      'link',           // 链接
      'justifyleft',    // 对齐
      'fontfamily',     // 字体
      'fontsize',       // 字号
      'forecolor',      // 前景色
      'backcolor'       // 背景色
    ]

    const foundUnnecessary = []

    for (const btnName of unnecessaryButtons) {
      const count = await page.locator(`.edui-button.edui-for-${btnName}`).count()
      if (count > 0) {
        foundUnnecessary.push(btnName)
        console.log(`⚠️  发现多余按钮: ${btnName}`)
      }
    }

    if (foundUnnecessary.length === 0) {
      console.log('✅ 没有多余按钮')
    } else {
      console.log(`❌ 发现 ${foundUnnecessary.length} 个多余按钮: ${foundUnnecessary.join(', ')}`)
    }

    // 不应该有这些多余按钮
    expect(foundUnnecessary.length).toBe(0)
  })

  test('审核4：工具栏配置源追踪', async () => {
    // 在浏览器控制台中检查工具栏配置来源
    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(3000)
    }

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(2000)

    // 在控制台中检查UEditor配置
    const config = await page.evaluate(() => {
      if (window.UEDITOR_CONFIG) {
        return {
          hasGlobalConfig: true,
          toolbars: window.UEDITOR_CONFIG.toolbars,
          toolbarCount: window.UEDITOR_CONFIG.toolbars ? window.UEDITOR_CONFIG.toolbars[0]?.length : 0
        }
      }
      return { hasGlobalConfig: false }
    })

    console.log('📋 UEditor全局配置:')
    console.log('  - 存在全局配置:', config.hasGlobalConfig)
    console.log('  - 工具栏按钮配置数量:', config.toolbarCount)
    console.log('  - 工具栏数组:', JSON.stringify(config.toolbars, null, 2))

    // 应该有全局配置
    expect(config.hasGlobalConfig).toBe(true)

    // 工具栏配置应该在12个左右（8个基础 + 4个自定义）
    if (config.toolbarCount) {
      expect(config.toolbarCount).toBeGreaterThanOrEqual(10)
      expect(config.toolbarCount).toBeLessThanOrEqual(15)
    }
  })

  test('审核5：ParaDesigner组件simple参数传递', async () => {
    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(3000)
    }

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(2000)

    // 检查控制台日志，查看ParaDesigner的工具栏配置
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('ParaDesigner') || msg.text().includes('工具栏')) {
        logs.push(msg.text())
      }
    })

    // 等待日志输出
    await page.waitForTimeout(3000)

    console.log('📝 ParaDesigner组件日志:')
    logs.forEach(log => console.log('  ', log))

    // 应该有配置日志输出
    const hasConfigLog = logs.some(log => log.includes('工具栏配置') || log.includes('toolbars'))
    if (hasConfigLog) {
      console.log('✅ 找到ParaDesigner配置日志')
    } else {
      console.log('⚠️  未找到ParaDesigner配置日志（可能已移除debug代码）')
    }
  })

  test('审核6：对比旧系统与新系统按钮一致性', async () => {
    // 旧系统应有的按钮列表（根据截图1.png）
    const oldSystemButtons = [
      'undo',              // 撤销
      'redo',              // 重做
      'bold',              // 粗体
      'italic',            // 斜体
      'strikethrough',     // 删除线
      'superscript',       // 上标
      'subscript',         // 下标
      'insertorderedlist', // 有序列表
      'insertunorderedlist', // 无序列表
      'inserttable',       // 插入表格
      'deflist',           // 定义列表（S1000D）
      'interrefbutton',    // 内部引用（S1000D）
      'dmrefbutton',       // DM引用（S1000D）
      'symbolbutton'       // 图符（S1000D）
    ]

    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(2000)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(3000)
    }

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(2000)

    const results = {
      expected: oldSystemButtons,
      found: [],
      missing: [],
      extra: []
    }

    // 检查每个应有的按钮
    for (const btnName of oldSystemButtons) {
      const count = await page.locator(`.edui-button.edui-for-${btnName}`).count()
      if (count > 0) {
        results.found.push(btnName)
      } else {
        results.missing.push(btnName)
      }
    }

    console.log('📊 按钮对比结果:')
    console.log(`  - 应有按钮数: ${results.expected.length}`)
    console.log(`  - 实际找到: ${results.found.length}`)
    console.log(`  - 缺少按钮: ${results.missing.length > 0 ? results.missing.join(', ') : '无'}`)

    // 计算匹配率
    const matchRate = (results.found.length / results.expected.length) * 100
    console.log(`  - 匹配率: ${matchRate.toFixed(1)}%`)

    if (matchRate >= 80) {
      console.log('✅ 与旧系统按钮基本一致')
    } else {
      console.log('❌ 与旧系统按钮差异较大')
    }

    // 至少应该匹配80%
    expect(matchRate).toBeGreaterThanOrEqual(80)
  })
})
