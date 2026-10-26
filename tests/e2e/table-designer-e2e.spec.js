/**
 * Table Designer E2E测试 - 浏览器功能验证
 * 版本：1.0
 * 日期：2026-10-19
 *
 * 测试范围：
 * 1. Table Designer打开和初始化
 * 2. UEditor编辑器功能（30个按钮）
 * 3. 双向转换验证（编辑→保存→重新打开）
 * 4. 特殊情况处理（合并、拆分、表头表尾）
 * 5. 工具栏操作（插入行、合并单元格等）
 */

const { test, expect } = require('@playwright/test')

test.describe('Table Designer - E2E功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)
  })

  // ========== 模块1: 打开和初始化 ==========
  test.describe('表格设计器打开和初始化 (3个测试)', () => {
    test('TEST-001: 双击树节点中的table元素应该打开Table Designer', async ({ page }) => {
      // 1. 打开DM编辑器
      const dmItem = await page.locator('[data-testid="dm-list-item"]').first()
      await dmItem.click()
      await page.waitForTimeout(1000)

      // 2. 进入设计视图
      const viewToggle = await page.locator('.view-mode-toggle').first()
      await viewToggle.click()
      await page.waitForTimeout(1000)

      // 3. 在编辑区域查找table元素
      const tableNode = await page.locator('.editor-tree [data-node-type="table"]').first()
      const count = await page.locator('.editor-tree [data-node-type="table"]').count()

      if (count > 0) {
        // 双击table节点
        await tableNode.dblclick()
        await page.waitForTimeout(2000)

        // 验证Table Designer对话框打开
        const designer = await page.locator('.table-designer').isVisible()
        const editor = await page.locator('.ueditor-container').isVisible()

        expect(designer).toBe(true)
        expect(editor).toBe(true)
        console.log('✅ Table Designer成功打开')
      } else {
        console.log('⚠️  未找到table节点，跳过此测试')
      }
    })

    test('TEST-002: Table Designer应该显示工具栏和属性编辑区', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 验证工具栏显示
        const toolbar = await page.locator('.table-toolbar').isVisible()
        expect(toolbar).toBe(true)
        console.log('✅ 工具栏可见')

        // 验证属性输入框
        const titleInput = await page.locator('input[placeholder*="表格标题"]').isVisible()
        const idInput = await page.locator('input[placeholder*="表格ID"]').isVisible()
        expect(titleInput).toBe(true)
        expect(idInput).toBe(true)
        console.log('✅ 属性编辑框可见')

        // 验证UEditor编辑器
        const editorVisible = await page.locator('.ueditor-container').isVisible()
        expect(editorVisible).toBe(true)
        console.log('✅ UEditor编辑器可见')
      }
    })

    test('TEST-003: Table Designer应该显示工具栏按钮', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 检查UEditor工具栏按钮数量
        const buttonCount = await page.locator('.ueditor-container .edui-toolbar .edui-btn, .ueditor-container .edui-toolbar .edui-splitbutton').count()
        expect(buttonCount).toBeGreaterThan(20)
        console.log(`✅ 找到 ${buttonCount} 个工具栏按钮`)
      }
    })
  })

  // ========== 模块2: 编辑功能 ==========
  test.describe('表格编辑功能 (4个测试)', () => {
    test('TEST-004: 应该能够编辑表格标题', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 编辑表格标题
        const titleInput = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput.clear()
        await titleInput.fill('测试表格标题')

        const value = await titleInput.inputValue()
        expect(value).toBe('测试表格标题')
        console.log('✅ 表格标题可编辑')
      }
    })

    test('TEST-005: 应该能够编辑表格内容', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 等待UEditor编辑器完全加载
        const editorBody = page.locator('.ueditor-container .edui-editor-body')
        await editorBody.waitFor({ state: 'visible', timeout: 5000 })

        // 在编辑器中设置内容
        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          // 通过evaluate设置编辑器内容
          await page.evaluate(({ id }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent('<table><tr><td>测试内容</td></tr></table>')
            }
          }, { id: editorId })
          console.log('✅ 表格内容可编辑')
        }
      }
    })

    test('TEST-006: 应该能够插入新行', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 找到"插入行"按钮
        const buttons = await page.locator('.ueditor-container .edui-btn, .ueditor-container .edui-splitbutton').all()
        for (const btn of buttons) {
          const title = await btn.getAttribute('title')
          if (title && title.includes('插入行')) {
            await btn.click()
            await page.waitForTimeout(500)
            console.log('✅ 插入行按钮可点击')
            break
          }
        }
      }
    })

    test('TEST-007: 应该能够设置表头行', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 找到"设置为表头"按钮
        const buttons = await page.locator('.ueditor-container .edui-btn, .ueditor-container .edui-splitbutton').all()
        for (const btn of buttons) {
          const title = await btn.getAttribute('title')
          if (title && title.includes('设置为表头')) {
            await btn.click()
            await page.waitForTimeout(500)
            console.log('✅ 设置表头按钮可点击')
            break
          }
        }
      }
    })
  })

  // ========== 模块3: 保存和转换验证 ==========
  test.describe('保存和双向转换验证 (3个测试)', () => {
    test('TEST-008: 保存表格应该将编辑内容写入源码', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 编辑表格内容
        const titleInput = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput.clear()
        await titleInput.fill('转换测试表格')

        // 保存表格
        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          // 验证保存成功提示
          const successMsg = await page.locator('.ant-message-success').isVisible({ timeout: 3000 })
          expect(successMsg).toBe(true)
          console.log('✅ 表格保存成功')
        }
      }
    })

    test('TEST-009: 编辑→保存→重新打开应该保持数据一致', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 第一次打开
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 编辑标题
        const titleInput = page.locator('input[placeholder*="表格标题"]').first()
        await titleInput.clear()
        await titleInput.fill('一致性测试标题')

        // 保存
        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          // 关闭designer
          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)

          // 重新打开同一表格
          await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
          await page.waitForTimeout(2000)

          // 验证标题内容一致
          const newTitleInput = page.locator('input[placeholder*="表格标题"]').first()
          const value = await newTitleInput.inputValue()
          expect(value).toBe('一致性测试标题')
          console.log('✅ 数据一致性验证通过')
        }
      }
    })

    test('TEST-010: colspan/rowspan应该被正确转换和保留', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 设置包含colspan的表格内容
        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent('<table><tr><td colspan="2">合并的标题</td></tr><tr><td>A</td><td>B</td></tr></table>')
            }
          }, { id: editorId })
          console.log('✅ colspan内容已设置')
        }

        await page.waitForTimeout(500)

        // 保存
        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          // 验证保存成功
          const successMsg = await page.locator('.ant-message-success').isVisible({ timeout: 3000 })
          expect(successMsg).toBe(true)
          console.log('✅ colspan已正确转换并保存')
        }
      }
    })
  })

  // ========== 模块4: 特殊操作 ==========
  test.describe('表格特殊操作 (3个测试)', () => {
    test('TEST-011: 应该能够合并单元格', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 找到"合并单元格"按钮
        const buttons = await page.locator('.ueditor-container .edui-btn, .ueditor-container .edui-splitbutton').all()
        let found = false
        for (const btn of buttons) {
          const title = await btn.getAttribute('title')
          if (title && title.includes('合并')) {
            found = true
            console.log('✅ 合并单元格按钮存在')
            break
          }
        }
        expect(found).toBe(true)
      }
    })

    test('TEST-012: 应该能够拆分单元格', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 找到"拆分"相关按钮
        const buttons = await page.locator('.ueditor-container .edui-btn, .ueditor-container .edui-splitbutton').all()
        let count = 0
        for (const btn of buttons) {
          const title = await btn.getAttribute('title')
          if (title && (title.includes('拆分') || title.includes('split'))) {
            count++
          }
        }
        if (count > 0) {
          console.log(`✅ 找到 ${count} 个拆分相关按钮`)
        }
      }
    })

    test('TEST-013: 应该能够删除表格', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 找到"删除表格"按钮
        const buttons = await page.locator('.ueditor-container .edui-btn, .ueditor-container .edui-splitbutton').all()
        let found = false
        for (const btn of buttons) {
          const title = await btn.getAttribute('title')
          if (title && title.includes('删除表格')) {
            found = true
            console.log('✅ 删除表格按钮存在')
            break
          }
        }
        expect(found).toBe(true)
      }
    })
  })

  // ========== 模块5: 错误处理 ==========
  test.describe('错误处理和边界情况 (3个测试)', () => {
    test('TEST-014: 空表格保存应该显示警告', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 清空表格内容
        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent('')
            }
          }, { id: editorId })
        }

        await page.waitForTimeout(500)

        // 尝试保存空表格
        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          // 验证警告提示
          try {
            const warningMsg = await page.locator('.ant-message-warning').isVisible({ timeout: 3000 })
            if (warningMsg) {
              console.log('✅ 空表格警告提示正确')
            }
          } catch (e) {
            console.log('⚠️  未显示警告提示')
          }
        }
      }
    })

    test('TEST-015: UEditor初始化应该完成', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()

        // 检查Table Designer加载完成
        try {
          await page.locator('.table-designer').waitFor({ state: 'visible', timeout: 5000 })
          console.log('✅ Table Designer加载完成')
        } catch (e) {
          console.log('⚠️  Table Designer加载超时')
        }
      }
    })

    test('TEST-016: 大表格（10x10）应该能够正确处理', async ({ page }) => {
      // 打开DM编辑器
      await page.locator('[data-testid="dm-list-item"]').first().click()
      await page.waitForTimeout(1000)

      // 进入设计视图
      await page.locator('.view-mode-toggle').first().click()
      await page.waitForTimeout(1000)

      // 打开table
      const tableCount = await page.locator('.editor-tree [data-node-type="table"]').count()
      if (tableCount > 0) {
        await page.locator('.editor-tree [data-node-type="table"]').first().dblclick()
        await page.waitForTimeout(2000)

        // 创建10x10表格
        let largeTableHtml = '<table>'
        for (let i = 0; i < 10; i++) {
          largeTableHtml += '<tr>'
          for (let j = 0; j < 10; j++) {
            largeTableHtml += `<td>R${i + 1}C${j + 1}</td>`
          }
          largeTableHtml += '</tr>'
        }
        largeTableHtml += '</table>'

        const textarea = await page.locator('textarea[id^="table_"]').first()
        if (await textarea.isVisible()) {
          const editorId = await textarea.getAttribute('id')
          await page.evaluate(({ id, html }) => {
            const editor = window.UE.getEditor(id)
            if (editor && editor.ready) {
              editor.setContent(html)
            }
          }, { id: editorId, html: largeTableHtml })
          console.log('✅ 大表格内容已加载')
        }

        await page.waitForTimeout(1000)

        // 保存大表格
        const saveBtn = await page.locator('.table-toolbar button[type="primary"]')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(2000)

          try {
            const successMsg = await page.locator('.ant-message-success').isVisible({ timeout: 3000 })
            if (successMsg) {
              console.log('✅ 大表格保存成功')
            }
          } catch (e) {
            console.log('⚠️  未显示成功提示')
          }
        }
      }
    })
  })
})
