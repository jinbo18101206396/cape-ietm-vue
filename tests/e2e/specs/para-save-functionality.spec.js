/**
 * Para设计器保存功能 E2E 测试
 * 对标需求文档 §3.3 保存逻辑
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999'

test.describe('Para设计器保存功能（§3.3）', () => {

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="账户: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  })

  test('§3.3.1 点击保存按钮应触发 html2para 转换并调用后端保存', async ({ page }) => {
    // 监听保存API调用
    let saveApiCalled = false
    let savedContent = null

    page.on('request', req => {
      if (req.url().includes('/ietm/dm-content/save')) {
        saveApiCalled = true
        const postData = req.postDataJSON()
        if (postData) {
          savedContent = postData.dm_content || postData.content
        }
      }
    })

    // 打开某个DM进入编辑器
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(2000)

    // 找一个DM并点击"编辑"
    const editBtn = page.locator('a[title="编辑"]').first()
    if (await editBtn.count() > 0) {
      await editBtn.click()
      await page.waitForTimeout(3000)

      // 在源码视图中找到一个 <para> 元素并双击
      const cm = page.locator('.CodeMirror')
      await expect(cm).toBeVisible({ timeout: 5000 })

      // 使用搜索功能定位 <para>
      await page.keyboard.press('Control+F')
      await page.fill('.CodeMirror-search-field', '<para')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // 关闭搜索框
      await page.keyboard.press('Escape')

      // 双击打开Para设计器
      await page.dblclick('.CodeMirror-line:has-text("<para")')
      await page.waitForTimeout(2000)

      // 检查Para设计器是否打开
      const paraDesigner = page.locator('.para-designer')
      if (await paraDesigner.count() > 0) {
        await expect(paraDesigner).toBeVisible()

        // 等待UEditor加载完成
        await page.waitForTimeout(2000)

        // 修改内容（在UEditor中输入）
        const editorFrame = page.frameLocator('.edui-editor-iframeholder iframe').first()
        const editorBody = editorFrame.locator('body')

        if (await editorBody.count() > 0) {
          await editorBody.click()
          await page.keyboard.press('Control+A')
          await page.keyboard.type('测试保存功能：修改后的段落内容')
          await page.waitForTimeout(500)

          // 点击保存按钮
          const saveBtn = page.locator('.para-toolbar button:has-text("保存")')
          await saveBtn.click()
          await page.waitForTimeout(2000)

          // 验证API调用
          expect(saveApiCalled).toBeTruthy()

          // 验证保存的内容经过 html2para 转换
          if (savedContent) {
            expect(savedContent).toContain('<para')
            expect(savedContent).toContain('测试保存功能')
          }

          // 验证成功消息
          const successMsg = page.locator('.ant-message-success')
          await expect(successMsg).toBeVisible({ timeout: 3000 })
        }
      }
    }
  })

  test('§3.3.2 Ctrl+S 快捷键应触发保存', async ({ page }) => {
    // 打开DM编辑器
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(2000)

    const editBtn = page.locator('a[title="编辑"]').first()
    if (await editBtn.count() > 0) {
      await editBtn.click()
      await page.waitForTimeout(3000)

      // 定位并双击打开Para设计器
      await page.keyboard.press('Control+F')
      await page.fill('.CodeMirror-search-field', '<para')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
      await page.dblclick('.CodeMirror-line:has-text("<para")')
      await page.waitForTimeout(2000)

      const paraDesigner = page.locator('.para-designer')
      if (await paraDesigner.count() > 0) {
        await page.waitForTimeout(2000)

        // 监听保存API
        let ctrlSSaveTriggered = false
        page.on('request', req => {
          if (req.url().includes('/ietm/dm-content/save')) {
            ctrlSSaveTriggered = true
          }
        })

        // 按 Ctrl+S
        await page.keyboard.press('Control+S')
        await page.waitForTimeout(2000)

        // 验证保存被触发
        expect(ctrlSSaveTriggered).toBeTruthy()
      }
    }
  })

  test('§3.3.3 保存后应替换源码视图中的原 <para> 元素', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(2000)

    const editBtn = page.locator('a[title="编辑"]').first()
    if (await editBtn.count() > 0) {
      await editBtn.click()
      await page.waitForTimeout(3000)

      // 打开Para设计器
      await page.keyboard.press('Control+F')
      await page.fill('.CodeMirror-search-field', '<para')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')

      // 记录原始内容
      const originalText = await page.locator('.CodeMirror-line:has-text("<para")').first().textContent()

      await page.dblclick('.CodeMirror-line:has-text("<para")')
      await page.waitForTimeout(2000)

      const paraDesigner = page.locator('.para-designer')
      if (await paraDesigner.count() > 0) {
        await page.waitForTimeout(2000)

        // 修改内容
        const editorFrame = page.frameLocator('.edui-editor-iframeholder iframe').first()
        const editorBody = editorFrame.locator('body')

        if (await editorBody.count() > 0) {
          await editorBody.click()
          await page.keyboard.press('Control+A')
          await page.keyboard.type('E2E测试：验证源码替换')
          await page.waitForTimeout(500)

          // 保存
          await page.keyboard.press('Control+S')
          await page.waitForTimeout(2000)

          // 等待Para设计器关闭（返回源码视图）
          await page.waitForTimeout(1000)

          // 验证源码视图中的内容已更新
          const updatedText = await page.locator('.CodeMirror-line:has-text("<para")').first().textContent()

          // 内容应该不同
          expect(updatedText).not.toBe(originalText)

          // 应该包含新内容
          expect(updatedText).toContain('E2E测试')
        }
      }
    }
  })

  test('§3.3.4 只读模式（ifedit=0）不应显示保存按钮', async ({ page }) => {
    // 这个测试需要模拟只读模式打开Para设计器
    // 由于当前无法直接构造只读URL，这里记录测试意图

    // 预期行为：
    // 1. 当 save=0 或 ifedit=0 时，保存按钮不显示
    // 2. Ctrl+S 快捷键不生效
    // 3. 编辑器内容只读

    // 标记为pending，需要后续完善
    test.skip()
  })

  test('§3.3.5 保存失败应显示错误提示', async ({ page }) => {
    // Mock API返回失败
    await page.route('**/ietm/dm-content/save', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '保存失败：模拟错误'
        })
      })
    })

    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(2000)

    const editBtn = page.locator('a[title="编辑"]').first()
    if (await editBtn.count() > 0) {
      await editBtn.click()
      await page.waitForTimeout(3000)

      // 打开Para设计器
      await page.keyboard.press('Control+F')
      await page.fill('.CodeMirror-search-field', '<para')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
      await page.dblclick('.CodeMirror-line:has-text("<para")')
      await page.waitForTimeout(2000)

      const paraDesigner = page.locator('.para-designer')
      if (await paraDesigner.count() > 0) {
        await page.waitForTimeout(2000)

        // 尝试保存
        const saveBtn = page.locator('.para-toolbar button:has-text("保存")')
        await saveBtn.click()
        await page.waitForTimeout(2000)

        // 验证错误消息
        const errorMsg = page.locator('.ant-message-error')
        await expect(errorMsg).toBeVisible({ timeout: 3000 })
      }
    }
  })
})
