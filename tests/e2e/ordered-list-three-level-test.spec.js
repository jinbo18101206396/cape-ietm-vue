/**
 * 三级有序列表插入验证测试
 *
 * 测试步骤：
 * 1. 登录系统
 * 2. 进入 DM 内容编辑器
 * 3. 在源码视图点击第 69 行的铅笔图标
 * 4. 在 para 设计视图插入三级有序列表
 * 5. 保存并验证 XML 格式
 * 6. 重新进入设计视图验证显示
 */

const { test, expect } = require('@playwright/test')

test.describe('三级有序列表功能测试', () => {
  test('应该能正确插入、保存和显示三级有序列表', async ({ page }) => {
    // 步骤 1: 登录系统
    console.log('步骤 1: 访问登录页面...')
    await page.goto('http://localhost:3000/')
    await page.waitForLoadState('networkidle')

    // 步骤 2: 点击登录按钮
    console.log('步骤 2: 点击登录按钮...')
    const loginButton = page.locator('button:has-text("登录")')
    await loginButton.click()
    await page.waitForLoadState('networkidle')

    // 步骤 3: 进入 DM 内容编辑器页面
    console.log('步骤 3: 进入 DM 内容编辑器页面...')
    const editorUrl = 'http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(editorUrl)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // 等待页面完全加载

    // 步骤 4: 在源码视图点击第 69 行的铅笔图标
    console.log('步骤 4: 点击第 69 行的铅笔图标...')

    // 查找第 69 行的铅笔图标（编辑按钮）
    const line69EditButton = page.locator('.CodeMirror-line').nth(68).locator('button[title*="编辑"], button:has-text("✏"), .edit-icon, button[aria-label*="编辑"]').first()

    // 如果没找到，尝试其他方式定位
    const editButtons = page.locator('button').filter({ hasText: /编辑|✏️/ })
    const line69Button = editButtons.nth(68)

    // 尝试点击
    try {
      if (await line69EditButton.count() > 0) {
        await line69EditButton.click()
      } else if (await line69Button.count() > 0) {
        await line69Button.click()
      } else {
        // 如果找不到特定图标，尝试通过行号定位
        const line69 = page.locator('[data-line="69"], .line-69, .cm-line').nth(68)
        await line69.hover()
        await page.waitForTimeout(500)
        const editIcon = line69.locator('button, .icon, [role="button"]').first()
        await editIcon.click()
      }
    } catch (error) {
      console.error('点击第 69 行编辑按钮失败，尝试截图...')
      await page.screenshot({ path: 'test-screenshots/line69-edit-error.png', fullPage: true })
      throw error
    }

    await page.waitForTimeout(1000)

    // 步骤 5: 进入 para 设计视图，点击"有序列表"按钮
    console.log('步骤 5: 在设计视图中点击"有序列表"按钮...')

    // 等待设计视图加载
    await page.waitForSelector('.para-designer, .design-view, [class*="designer"]', { timeout: 5000 })

    // 查找有序列表按钮
    const orderedListButton = page.locator('button:has-text("有序列表"), button[title*="有序列表"], button[aria-label*="有序列表"]').first()

    if (await orderedListButton.count() === 0) {
      console.log('未找到"有序列表"按钮，尝试查找工具栏按钮...')
      await page.screenshot({ path: 'test-screenshots/toolbar-before-click.png', fullPage: true })

      // 尝试通过 icon 或其他方式查找
      const toolbarButtons = page.locator('.toolbar button, [class*="toolbar"] button')
      console.log(`找到 ${await toolbarButtons.count()} 个工具栏按钮`)
    }

    await orderedListButton.click()
    await page.waitForTimeout(500)

    // 步骤 5.1: 插入三级有序列表内容
    console.log('步骤 5.1: 输入三级有序列表内容...')

    // 查找编辑区域
    const editArea = page.locator('.editor-content, .design-editor, [contenteditable="true"]').first()

    // 输入三级有序列表内容
    // 第一级
    await editArea.click()
    await page.keyboard.type('第一级')
    await page.keyboard.press('Enter')

    // 第二级（需要缩进）
    await page.keyboard.press('Tab')
    await page.keyboard.type('第二级')
    await page.keyboard.press('Enter')

    // 第三级（再次缩进）
    await page.keyboard.press('Tab')
    await page.keyboard.type('第三级')

    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-screenshots/after-insert-list.png', fullPage: true })

    // 步骤 6: 点击页面右上角的"保存"按钮
    console.log('步骤 6: 点击保存按钮...')

    const saveButton = page.locator('button:has-text("保存"), button[title*="保存"]').first()
    await saveButton.click()
    await page.waitForTimeout(2000) // 等待保存完成

    // 步骤 7: 回到源码视图，验证生成的 XML
    console.log('步骤 7: 验证生成的 XML...')

    // 等待回到源码视图
    await page.waitForSelector('.CodeMirror, .xml-editor, [class*="code-editor"]', { timeout: 5000 })

    // 获取 XML 内容
    const xmlContent = await page.locator('.CodeMirror-code, .xml-content').textContent()

    console.log('生成的 XML 内容片段：')
    console.log(xmlContent.substring(0, 500))

    // 验证 XML 包含正确的列表标签
    expect(xmlContent).toContain('randomList')

    // 截图保存 XML 视图
    await page.screenshot({ path: 'test-screenshots/xml-after-save.png', fullPage: true })

    // 步骤 8: 再次点击第 69 行的铅笔图标，进入设计视图
    console.log('步骤 8: 再次进入设计视图验证显示...')

    await page.waitForTimeout(1000)

    // 再次点击编辑按钮
    try {
      if (await line69EditButton.count() > 0) {
        await line69EditButton.click()
      } else if (await line69Button.count() > 0) {
        await line69Button.click()
      } else {
        const line69 = page.locator('[data-line="69"], .line-69').nth(68)
        await line69.hover()
        const editIcon = line69.locator('button').first()
        await editIcon.click()
      }
    } catch (error) {
      console.error('第二次点击编辑按钮失败')
      await page.screenshot({ path: 'test-screenshots/second-edit-error.png', fullPage: true })
    }

    await page.waitForTimeout(1000)

    // 验证设计视图中的列表显示
    await page.waitForSelector('.para-designer, .design-view', { timeout: 5000 })

    // 验证列表项是否正确显示
    const listItems = page.locator('ol li, [class*="list-item"]')
    const listItemCount = await listItems.count()

    console.log(`设计视图中找到 ${listItemCount} 个列表项`)

    // 截图最终的设计视图
    await page.screenshot({ path: 'test-screenshots/design-view-final.png', fullPage: true })

    // 验证列表结构
    expect(listItemCount).toBeGreaterThan(0)

    console.log('✅ 测试完成！')
  })
})
