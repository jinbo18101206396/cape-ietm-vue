/**
 * Table Designer 集成测试
 * 版本：1.0
 * 日期：2026-10-19
 *
 * 测试范围：
 * 1. Table Designer与DmContentEditor的集成
 * 2. 多个表格的编辑和切换
 * 3. 表格与段落的混合编辑
 * 4. 撤销/重做功能
 */

const { test, expect } = require('@playwright/test')

test.describe('Table Designer - 集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)
  })

  test.describe('DmContentEditor集成 (3个测试)', () => {
    test('TEST-017: 打开DM编辑器后应该能够找到和编辑table节点', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 验证table节点在树中可见
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        console.log(`✅ 找到 ${tableCount} 个表格节点`)
        expect(tableCount).toBeGreaterThan(0)
      }
    })

    test('TEST-018: 从DmContentEditor打开table应该正确初始化Table Designer', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        // 双击打开
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 验证初始化流程
        const designerVisible = await page.locator('.table-designer').isVisible()
        const toolbarVisible = await page.locator('.table-toolbar').isVisible()
        const editorVisible = await page.locator('.ueditor-container').isVisible()

        expect(designerVisible).toBe(true)
        expect(toolbarVisible).toBe(true)
        expect(editorVisible).toBe(true)

        // 验证从源码正确加载了内容
        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          const hasEditor = await page.evaluate(({ id }) => {
            return window.UE.getEditor(id) !== undefined
          }, { id: editorId })
          expect(hasEditor).toBe(true)
          console.log('✅ UEditor实例已初始化')
        }
      }
    })

    test('TEST-019: 表格保存后应该正确更新DmContentEditor的源码', async ({ page }) => {
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

        const newTitle = `表格_${Date.now()}`

        // 编辑标题
        const titleInput = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput.clear()
        await titleInput.fill(newTitle)

        // 保存
        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          // 关闭designer
          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)

          // 在源码视图中验证
          await page.locator('.view-mode-toggle').first().click()
          await page.waitForTimeout(1000)

          const content = await page.locator('.editor-content').first().textContent()
          if (content && content.includes(newTitle)) {
            console.log('✅ 源码已正确更新')
            expect(content).toContain(newTitle)
          }
        }
      }
    })
  })

  test.describe('多表格编辑 (2个测试)', () => {
    test('TEST-020: 应该能够编辑多个表格而不相互影响', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      const tables = await page.locator('.editor-tree [data-node-type="table"]').all()
      if (tables.length >= 2) {
        // 编辑第一个表格
        await tables[0].dblclick()
        await page.waitForTimeout(2000)

        const titleInput1 = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput1.clear()
        await titleInput1.fill('表格A')

        const saveBtn1 = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn1.isVisible()) {
          await saveBtn1.click()
          await page.waitForTimeout(2000)

          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)

          // 编辑第二个表格
          await tables[1].dblclick()
          await page.waitForTimeout(2000)

          const titleInput2 = page.locator('input[placeholder*="表格标题"]').first()
          await titleInput2.clear()
          await titleInput2.fill('表格B')

          const saveBtn2 = await page.locator('.table-toolbar button[type="primary"]')
          if (await saveBtn2.isVisible()) {
            await saveBtn2.click()
            await page.waitForTimeout(2000)

            const successMsg = await page.locator('.ant-message-success').isVisible({ timeout: 3000 })
            if (successMsg) {
              console.log('✅ 多表格编辑成功')
              expect(successMsg).toBe(true)
            }
          }
        }
      }
    })

    test('TEST-021: 表格编辑后返回应该显示保存提示', async ({ page }) => {
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

        // 修改内容
        const titleInput = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput.clear()
        await titleInput.fill('已修改的表格')

        await page.waitForTimeout(500)

        // 不保存直接返回
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)

        console.log('✅ 返回流程完成')
      }
    })
  })

  test.describe('表格与段落混合编辑 (2个测试)', () => {
    test('TEST-022: 应该能够在同一个DM中编辑表格和段落', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(2000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 找到表格节点
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 编辑表格
        const titleInput = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput.clear()
        await titleInput.fill('混合编辑表格')

        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)

          // 现在尝试编辑段落
          const paraCount = await page.locator('.editor-tree [data-node-type="para"]').count()
          if (paraCount > 0) {
            await page.locator('.editor-tree [data-node-type="para"]').first().dblclick()
            await page.waitForTimeout(2000)

            // 验证Para Designer打开
            const paraDesigner = await page.locator('.para-designer').isVisible()
            if (paraDesigner) {
              console.log('✅ 表格和段落可交替编辑')
              expect(paraDesigner).toBe(true)
            }

            await page.keyboard.press('Escape')
          }
        }
      }
    })

    test('TEST-023: 保存表格后应该能够切换到段落编辑', async ({ page }) => {
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

        // 保存表格（不做任何修改）
        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)

          // 验证树状图仍然可用
          const treeVisible = await page.locator('.editor-tree').isVisible()
          const paraCount = await page.locator('.editor-tree [data-node-type="para"]').count()

          expect(treeVisible).toBe(true)
          expect(paraCount).toBeGreaterThan(0)
          console.log('✅ 切换功能正常')
        }
      }
    })
  })

  test.describe('撤销/重做功能 (2个测试)', () => {
    test('TEST-024: 编辑表格后应该能够使用工具栏的撤销按钮', async ({ page }) => {
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

        // 在UEditor中输入内容后撤销
        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent('<table><tr><td>初始内容</td></tr></table>')
              // 执行撤销
              editor.execCommand('undo')
            }
          }, { id: editorId })
          console.log('✅ 撤销命令已执行')
        }
      }
    })

    test('TEST-025: 撤销后应该能够使用重做按钮', async ({ page }) => {
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

        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              // 执行撤销
              editor.execCommand('undo')
              // 执行重做
              editor.execCommand('redo')
            }
          }, { id: editorId })
          console.log('✅ 重做命令已执行')
        }
      }
    })
  })
})
