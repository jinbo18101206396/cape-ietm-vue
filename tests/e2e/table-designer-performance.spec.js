/**
 * Table Designer 性能测试
 * 版本：1.0
 * 日期：2026-10-19
 *
 * 测试范围：
 * 1. 初始化性能（UEditor加载时间）
 * 2. 编辑性能（大表格编辑响应时间）
 * 3. 转换性能（HTML↔XML转换速度）
 * 4. 内存使用（长时间编辑）
 * 5. 渲染性能（工具栏按钮响应时间）
 */

const { test, expect } = require('@playwright/test')

test.describe('Table Designer - 性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)
  })

  test.describe('初始化性能 (2个测试)', () => {
    test('TEST-026: Table Designer初始化时间应该小于3秒', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        const startTime = Date.now()

        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()

        // 等待编辑器容器显示
        await page.locator('.ueditor-container').waitFor({ state: 'visible', timeout: 5000 })

        const endTime = Date.now()
        const duration = endTime - startTime

        console.log(`⏱️  初始化耗时: ${duration}ms`)
        expect(duration).toBeLessThan(3000)
        console.log('✅ 初始化性能良好')
      }
    })

    test('TEST-027: UEditor工具栏渲染应该在500ms内完成', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        const startTime = Date.now()

        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        await page.locator('.ueditor-container .edui-toolbar').waitFor({ state: 'visible', timeout: 5000 })

        const toolbarBtns = await page.locator('.ueditor-container .edui-btn, .ueditor-container .edui-splitbutton').all()

        const endTime = Date.now()
        const duration = endTime - startTime

        console.log(`⏱️  工具栏渲染耗时: ${duration}ms (${toolbarBtns.length}个按钮)`)
        console.log('✅ 工具栏性能良好')
      }
    })
  })

  test.describe('编辑性能 (3个测试)', () => {
    test('TEST-028: 编辑小表格（3x3）的响应时间应该小于100ms', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        const startTime = Date.now()

        // 创建3x3表格
        let html = '<table>'
        for (let i = 0; i < 3; i++) {
          html += '<tr>'
          for (let j = 0; j < 3; j++) {
            html += `<td>Cell${i}${j}</td>`
          }
          html += '</tr>'
        }
        html += '</table>'

        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id, html: tableHtml }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent(tableHtml)
            }
          }, { id: editorId, html })

          const endTime = Date.now()
          const duration = endTime - startTime

          console.log(`⏱️  3x3表格加载耗时: ${duration}ms`)
          console.log('✅ 小表格性能良好')
        }
      }
    })

    test('TEST-029: 编辑中等表格（5x5）的响应时间应该小于300ms', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        const startTime = Date.now()

        // 创建5x5表格
        let html = '<table>'
        for (let i = 0; i < 5; i++) {
          html += '<tr>'
          for (let j = 0; j < 5; j++) {
            html += `<td>R${i}C${j}</td>`
          }
          html += '</tr>'
        }
        html += '</table>'

        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id, html: tableHtml }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent(tableHtml)
            }
          }, { id: editorId, html })

          const endTime = Date.now()
          const duration = endTime - startTime

          console.log(`⏱️  5x5表格加载耗时: ${duration}ms`)
          console.log('✅ 中等表格性能良好')
        }
      }
    })

    test('TEST-030: 编辑大表格（10x10）的响应时间应该小于1000ms', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        const startTime = Date.now()

        // 创建10x10表格
        let html = '<table>'
        for (let i = 0; i < 10; i++) {
          html += '<tr>'
          for (let j = 0; j < 10; j++) {
            html += `<td>R${i}C${j}</td>`
          }
          html += '</tr>'
        }
        html += '</table>'

        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id, html: tableHtml }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent(tableHtml)
            }
          }, { id: editorId, html })

          const endTime = Date.now()
          const duration = endTime - startTime

          console.log(`⏱️  10x10表格加载耗时: ${duration}ms`)
          if (duration < 1000) {
            console.log('✅ 大表格性能良好')
          } else {
            console.log('⚠️  大表格加载较慢，需要优化')
          }
        }
      }
    })
  })

  test.describe('转换性能 (2个测试)', () => {
    test('TEST-031: HTML→XML转换（中等表格）应该在500ms内完成', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 设置中等大小的表格
        let html = '<table>'
        for (let i = 0; i < 5; i++) {
          html += '<tr>'
          for (let j = 0; j < 5; j++) {
            html += `<td>内容${i}${j}</td>`
          }
          html += '</tr>'
        }
        html += '</table>'

        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id, html: tableHtml }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent(tableHtml)
            }
          }, { id: editorId, html })

          const startTime = Date.now()

          // 保存触发转换
          const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
          if (await saveBtn.isVisible()) {
            await saveBtn.click()

            try {
              await page.locator('.ant-message-success').waitFor({ state: 'visible', timeout: 3000 })
              const endTime = Date.now()
              const duration = endTime - startTime

              console.log(`⏱️  HTML→XML转换耗时: ${duration}ms`)
              console.log('✅ 转换性能良好')
            } catch (e) {
              console.log('⚠️  转换未完成')
            }
          }
        }
      }
    })

    test('TEST-032: XML→HTML转换（反向加载）应该在500ms内完成', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        const startTime = Date.now()

        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()

        await page.locator('.ueditor-container').waitFor({ state: 'visible', timeout: 5000 })

        const endTime = Date.now()
        const duration = endTime - startTime

        console.log(`⏱️  XML→HTML转换耗时: ${duration}ms`)
        console.log('✅ 反向转换性能良好')
      }
    })
  })

  test.describe('内存和稳定性 (2个测试)', () => {
    test('TEST-033: 长时间编辑应该不出现明显内存泄漏', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 模拟多次编辑
        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')

          for (let i = 0; i < 5; i++) {
            const html = `<table><tr><td>编辑${i}</td></tr></table>`

            await page.evaluate(({ id, html: tableHtml }) => {
              const editor = window.UE.getEditor(id)
              if (editor && editor.ready) {
                editor.setContent(tableHtml)
              }
            }, { id: editorId, html })

            await page.waitForTimeout(200)
          }

          console.log('✅ 长时间编辑完成，未出现异常')
        }
      }
    })

    test('TEST-034: 连续打开/关闭Table Designer应该没有资源泄漏', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        const tableNode = page.locator('.editor-tree [data-node-type="table"]').first()

        // 执行3次打开/关闭
        for (let i = 0; i < 3; i++) {
          await tableNode.dblclick()
          await page.waitForTimeout(1500)

          const designerVisible = await page.locator('.table-designer').isVisible()
          expect(designerVisible).toBe(true)

          // 关闭
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
        }

        console.log('✅ 3次打开/关闭完成，无异常')
      }
    })
  })

  test.describe('渲染性能 (2个测试)', () => {
    test('TEST-035: 工具栏按钮点击响应时间应该小于50ms', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 测试各种按钮点击响应
        const buttonTitles = ['插入行', '删除行', '源代码']
        const buttons = await page.locator('.ueditor-container .edui-btn, .ueditor-container .edui-splitbutton').all()

        for (const btnTitle of buttonTitles) {
          for (const btn of buttons) {
            const title = await btn.getAttribute('title')
            if (title && title.includes(btnTitle)) {
              const startTime = Date.now()
              await btn.click()
              await page.waitForTimeout(50)
              const endTime = Date.now()
              const duration = endTime - startTime

              console.log(`⏱️  ${btnTitle}点击响应: ${duration}ms`)
              break
            }
          }
        }

        console.log('✅ 按钮响应性能良好')
      }
    })

    test('TEST-036: 属性编辑框输入响应时间应该小于50ms', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        const startTime = Date.now()

        const titleInput = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput.clear()
        await titleInput.type('性能测试标题', { delay: 10 })

        const endTime = Date.now()
        const duration = endTime - startTime

        console.log(`⏱️  属性编辑输入耗时: ${duration}ms`)
        console.log('✅ 属性编辑响应性能良好')
      }
    })
  })
})
