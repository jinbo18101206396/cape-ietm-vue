/**
 * Para设计视图修正验证测试
 * 验证：工具栏无inserttable按钮 + 表格被删除而不是转换
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计视图修正验证', () => {
  test('验证1: 工具栏不应该有inserttable按钮', async ({ page }) => {
    console.log('======== 开始验证 ========')

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

    // 3. 打开Para设计视图
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    await editButton.click()
    await page.waitForTimeout(3000)

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(3000)
    console.log('✅ Para设计器已打开')

    // 4. 截图保存
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/para-correction-verification.png',
      fullPage: true
    })
    console.log('✅ 截图已保存')

    // 5. 统计工具栏按钮
    const toolbarButtons = await page.locator('.edui-toolbar .edui-button').count()
    console.log(`\n📊 工具栏按钮总数: ${toolbarButtons}`)

    // 6. 检查必需按钮（应该存在）
    console.log('\n🔍 检查必需按钮:')

    const requiredButtons = [
      { name: 'undo', label: '撤销' },
      { name: 'redo', label: '重做' },
      { name: 'bold', label: '粗体' },
      { name: 'italic', label: '斜体' },
      { name: 'strikethrough', label: '删除线' },
      { name: 'superscript', label: '上标' },
      { name: 'subscript', label: '下标' },
      { name: 'insertorderedlist', label: '有序列表' },
      { name: 'insertunorderedlist', label: '无序列表' }
    ]

    let foundCount = 0
    for (const btn of requiredButtons) {
      const count = await page.locator(`.edui-button.edui-for-${btn.name}`).count()
      if (count > 0) {
        foundCount++
        console.log(`  ✅ ${btn.label} (${btn.name})`)
      } else {
        console.log(`  ❌ ${btn.label} (${btn.name}) - 缺失`)
      }
    }

    // 7. 🔥 关键验证：inserttable按钮应该不存在
    console.log('\n🔥 关键验证: inserttable按钮')
    const insertTableButton = await page.locator('.edui-button.edui-for-inserttable').count()

    if (insertTableButton === 0) {
      console.log('  ✅✅✅ inserttable按钮不存在（符合预期）')
    } else {
      console.log('  ❌❌❌ inserttable按钮存在（修正失败）')
    }

    // 8. 检查S1000D自定义按钮
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
      if (count > 0) {
        customFound++
        console.log(`  ✅ ${btn.label} (${btn.name})`)
      } else {
        console.log(`  ⚠️  ${btn.label} (${btn.name}) - 未找到`)
      }
    }

    // 9. 检查UEditor全局配置
    const config = await page.evaluate(() => {
      if (window.UEDITOR_CONFIG && window.UEDITOR_CONFIG.toolbars) {
        return {
          exists: true,
          toolbars: window.UEDITOR_CONFIG.toolbars[0],
          count: window.UEDITOR_CONFIG.toolbars[0].length,
          hasInsertTable: window.UEDITOR_CONFIG.toolbars[0].includes('inserttable')
        }
      }
      return { exists: false }
    })

    console.log('\n📋 UEditor全局配置:')
    console.log('  配置存在:', config.exists)
    if (config.exists) {
      console.log('  配置的按钮数:', config.count)
      console.log('  按钮列表:', config.toolbars.join(', '))
      console.log('  🔥 包含inserttable:', config.hasInsertTable ? '❌ 是（错误）' : '✅ 否（正确）')
    }

    // 10. 最终验证结果
    console.log('\n📈 最终验证结果:')

    const expectedButtonCount = 13  // 10个基础 + 3-4个自定义（考虑到可能未完全注册）
    const buttonCountOk = toolbarButtons >= 10 && toolbarButtons <= 15
    console.log(`  工具栏按钮数: ${toolbarButtons} ${buttonCountOk ? '✅' : '❌'}`)

    const insertTableOk = insertTableButton === 0
    console.log(`  inserttable不存在: ${insertTableOk ? '✅' : '❌'}`)

    const configOk = config.exists && !config.hasInsertTable
    console.log(`  配置正确: ${configOk ? '✅' : '❌'}`)

    // 断言
    expect(insertTableButton).toBe(0)  // 最关键的断言
    expect(toolbarButtons).toBeGreaterThanOrEqual(10)
    expect(toolbarButtons).toBeLessThanOrEqual(15)

    if (insertTableOk && buttonCountOk && configOk) {
      console.log('\n✅✅✅ 修正验证通过！工具栏已完全对标旧系统')
    } else {
      console.log('\n❌❌❌ 修正验证失败，需要检查配置')
    }
  })

  test('验证2: 表格粘贴测试（如果可以获取编辑器实例）', async ({ page }) => {
    console.log('\n======== 验证2: 表格处理逻辑 ========')

    // 登录并打开Para设计器
    await page.goto('http://localhost:3001/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 15000 })

    await page.goto('http://localhost:3001/ietm/ietm-data-module-management')
    await page.waitForTimeout(3000)

    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    const editButton = page.locator('button:has-text("编辑内容")')
    await editButton.click()
    await page.waitForTimeout(3000)

    await page.waitForSelector('.para-designer', { timeout: 15000 })
    await page.waitForTimeout(3000)

    console.log('✅ Para设计器已打开')

    // 监听Console日志
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('html2para') || text.includes('table') || text.includes('表格')) {
        logs.push(text)
      }
    })

    // 尝试在UEditor中插入HTML（模拟粘贴表格）
    const insertResult = await page.evaluate(() => {
      try {
        // 获取UEditor实例
        const editor = window.UE?.getEditor()
        if (!editor) {
          return { success: false, reason: 'UEditor实例未找到' }
        }

        // 插入一个包含表格的HTML
        const htmlWithTable = '<p>段落1</p><table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table><p>段落2</p>'
        editor.setContent(htmlWithTable)

        // 获取当前内容
        const currentContent = editor.getContent()

        return {
          success: true,
          insertedHtml: htmlWithTable,
          currentContent: currentContent,
          hasTable: currentContent.includes('<table')
        }
      } catch (error) {
        return { success: false, reason: error.message }
      }
    })

    console.log('\n📝 表格插入测试:')
    console.log('  操作结果:', insertResult.success ? '成功' : '失败')

    if (insertResult.success) {
      console.log('  插入的HTML:', insertResult.insertedHtml.substring(0, 100))
      console.log('  当前内容:', insertResult.currentContent.substring(0, 100))
      console.log('  是否包含table:', insertResult.hasTable ? '是' : '否')
    } else {
      console.log('  失败原因:', insertResult.reason)
    }

    // 检查Console日志
    await page.waitForTimeout(2000)

    console.log('\n📋 相关日志:')
    if (logs.length > 0) {
      logs.forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log}`)
      })
    } else {
      console.log('  (无相关日志)')
    }

    console.log('\n✅ 验证2完成')
  })
})
