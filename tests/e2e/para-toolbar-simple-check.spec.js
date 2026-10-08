/**
 * Para设计视图工具栏简单检查
 * 快速验证修复效果
 */

const { test, expect } = require('@playwright/test')

test.describe('Para工具栏快速检查', () => {
  test('检查工具栏按钮数量', async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:3001/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 15000 })
    console.log('✅ 登录成功')

    // 2. 进入数据模块管理
    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(3000)
    console.log('✅ 进入数据模块管理页面')

    // 3. 打开第一个DM
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    // 4. 点击编辑内容
    const editButton = page.locator('button:has-text("编辑内容")')
    await editButton.click()
    await page.waitForTimeout(3000)
    console.log('✅ 打开编辑器')

    // 5. 等待Para设计器加载
    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(3000)
    console.log('✅ Para设计器已加载')

    // 6. 截图
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/para-toolbar-final.png',
      fullPage: true
    })
    console.log('✅ 截图已保存')

    // 7. 统计工具栏按钮
    const toolbarButtons = await page.locator('.edui-toolbar .edui-button').count()
    console.log(`\n📊 工具栏按钮总数: ${toolbarButtons}`)

    // 8. 检查UEditor全局配置
    const config = await page.evaluate(() => {
      if (window.UEDITOR_CONFIG && window.UEDITOR_CONFIG.toolbars) {
        return {
          configExists: true,
          toolbars: window.UEDITOR_CONFIG.toolbars[0],
          count: window.UEDITOR_CONFIG.toolbars[0].length
        }
      }
      return { configExists: false }
    })

    console.log('\n📋 UEditor全局配置:')
    console.log('  - 配置存在:', config.configExists)
    if (config.configExists) {
      console.log('  - 配置的按钮数:', config.count)
      console.log('  - 配置的按钮列表:', config.toolbars.join(', '))
    }

    // 9. 检查必需按钮
    console.log('\n🔍 检查关键按钮:')

    const requiredButtons = [
      { name: 'undo', label: '撤销' },
      { name: 'redo', label: '重做' },
      { name: 'bold', label: '粗体' },
      { name: 'italic', label: '斜体' },
      { name: 'inserttable', label: '表格' }
    ]

    for (const btn of requiredButtons) {
      const count = await page.locator(`.edui-button.edui-for-${btn.name}`).count()
      console.log(`  ${count > 0 ? '✅' : '❌'} ${btn.label} (${btn.name}): ${count > 0 ? '存在' : '缺失'}`)
    }

    // 10. 检查S1000D自定义按钮
    console.log('\n🔧 检查S1000D自定义按钮:')

    const customButtons = [
      { name: 'deflist', label: '定义列表' },
      { name: 'interrefbutton', label: '内部引用' },
      { name: 'dmrefbutton', label: 'DM引用' },
      { name: 'symbolbutton', label: '图符' }
    ]

    let customFound = 0
    for (const btn of customButtons) {
      const count = await page.locator(`.edui-button.edui-for-${btn.name}`).count()
      if (count > 0) customFound++
      console.log(`  ${count > 0 ? '✅' : '❌'} ${btn.label} (${btn.name}): ${count > 0 ? '存在' : '缺失'}`)
    }

    // 11. 验证结果
    console.log('\n📈 验证结果:')

    // 旧系统约12-13个按钮
    const isReasonable = toolbarButtons >= 10 && toolbarButtons <= 20
    console.log(`  工具栏按钮数: ${toolbarButtons} ${isReasonable ? '✅ 合理' : '❌ 不合理'}`)

    const hasCustom = customFound >= 2
    console.log(`  S1000D按钮数: ${customFound}/4 ${hasCustom ? '✅ 部分存在' : '❌ 缺失'}`)

    // 断言
    expect(toolbarButtons).toBeGreaterThanOrEqual(10)
    expect(toolbarButtons).toBeLessThanOrEqual(20)

    if (isReasonable && hasCustom) {
      console.log('\n✅✅✅ 修复成功！工具栏已精简并接近旧系统')
    } else if (isReasonable) {
      console.log('\n⚠️ 工具栏数量合理，但缺少S1000D自定义按钮')
    } else {
      console.log('\n❌ 工具栏仍有问题，需要进一步修复')
    }
  })
})
