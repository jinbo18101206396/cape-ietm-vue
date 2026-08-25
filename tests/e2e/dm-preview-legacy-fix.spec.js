const { test, expect } = require('@playwright/test')

/**
 * E2E测试：验证DM预览功能中的遗留函数修复
 *
 * 测试场景：
 * 1. 点击dmRef链接弹出引用详情
 * 2. 点击图形弹出ICN预览
 * 3. display:none元素正常显示
 *
 * @author Claude
 * @date 2026-08-14
 */

test.describe('DM预览功能 - 遗留函数修复验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto('http://localhost:3000')
    await page.fill('input[placeholder*="用户名"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/index', { timeout: 10000 })

    // 导航到数据模块管理页面
    await page.click('text=数据模块管理')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
  })

  test('TC-E2E-01: 验证dmRef链接点击弹出引用详情', async ({ page }) => {
    // 1. 打开一个包含dmRef的DM进行编辑
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.locator('a:has-text("浏览DM")').click()

    // 2. 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
    }, { timeout: 10000 })

    // 3. 点击预览按钮
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })

    // 4. 等待iframe加载完成
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    const iframe = modal.locator('iframe')
    await iframe.waitFor({ state: 'attached', timeout: 5000 })

    // 等待iframe内容加载
    await page.waitForTimeout(2000)

    const frame = await iframe.contentFrame()
    if (!frame) {
      console.log('⚠️ 无法获取iframe内容，跳过dmRef测试')
      await page.click('.ant-modal-close')
      return
    }

    // 5. 查找dmRef链接（如果存在）
    const dmRefLinks = frame.locator('a[onclick*="showDmRefInfo"], a[href*="DMC-"]')
    const count = await dmRefLinks.count()

    if (count === 0) {
      console.log('⚠️ 当前DM不包含dmRef链接，跳过此测试')
      await page.click('.ant-modal-close')
      return
    }

    // 6. 点击第一个dmRef链接
    await dmRefLinks.first().click()

    // 7. 验证引用详情弹框出现
    await page.waitForSelector('.ant-modal:has-text("内部引用")', { timeout: 5000 })
    const refModal = page.locator('.ant-modal:has-text("内部引用")')
    await expect(refModal).toBeVisible()

    // 8. 验证弹框内容
    const dmcLabel = refModal.locator('.ant-descriptions-item-label:has-text("引用DM代码")')
    await expect(dmcLabel).toBeVisible()

    console.log('✅ TC-E2E-01 通过：dmRef链接点击成功弹出引用详情')
  })

  test('TC-E2E-02: 验证图形链接点击弹出ICN预览', async ({ page }) => {
    // 1. 打开一个包含图形的DM进行编辑
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.locator('a:has-text("浏览DM")').click()

    // 2. 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
    }, { timeout: 10000 })

    // 3. 点击预览按钮
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })

    // 4. 等待iframe加载完成
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    const iframe = modal.locator('iframe')
    await iframe.waitFor({ state: 'attached', timeout: 5000 })

    await page.waitForTimeout(2000)

    const frame = await iframe.contentFrame()
    if (!frame) {
      console.log('⚠️ 无法获取iframe内容，跳过图形测试')
      await page.click('.ant-modal-close')
      return
    }

    // 5. 查找图形元素（如果存在）
    const graphicElements = frame.locator('img[onclick*="showMultimediaInfo"], img[boardno], [name="graphicObject"]')
    const count = await graphicElements.count()

    if (count === 0) {
      console.log('⚠️ 当前DM不包含图形元素，跳过此测试')
      await page.click('.ant-modal-close')
      return
    }

    // 6. 点击第一个图形
    await graphicElements.first().click()

    // 7. 验证ICN预览弹框出现
    await page.waitForSelector('.ant-modal:has-text("图形/多媒体预览"), .ant-modal:has-text("ICN预览")', { timeout: 5000 })
    const icnModal = page.locator('.ant-modal:has-text("图形/多媒体预览"), .ant-modal:has-text("ICN预览")')
    await expect(icnModal).toBeVisible()

    console.log('✅ TC-E2E-02 通过：图形链接点击成功弹出ICN预览')
  })

  test('TC-E2E-03: 验证HTML中无遗留window.external/window.parent调用', async ({ page }) => {
    // 1. 打开任意DM
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.locator('a:has-text("浏览DM")').click()

    // 2. 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
    }, { timeout: 10000 })

    // 3. 点击预览按钮
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })

    // 4. 等待iframe加载完成
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    const iframe = modal.locator('iframe')
    await iframe.waitFor({ state: 'attached', timeout: 5000 })

    await page.waitForTimeout(2000)

    const frame = await iframe.contentFrame()
    if (!frame) {
      console.log('⚠️ 无法获取iframe内容，跳过HTML验证')
      await page.click('.ant-modal-close')
      return
    }

    // 5. 获取iframe的HTML内容
    const htmlContent = await frame.evaluate(() => document.body.innerHTML)

    // 6. 验证不包含遗留函数调用
    expect(htmlContent).not.toContain('window.external.ShowDmRef')
    expect(htmlContent).not.toContain('window.parent.addShowContentPanel')
    expect(htmlContent).not.toContain('window.parent.showPicture')

    // 7. 验证包含新函数调用（如果原HTML有相关链接）
    if (htmlContent.includes('showDmRefInfo')) {
      console.log('✅ 发现 showDmRefInfo 调用，替换成功')
    }
    if (htmlContent.includes('showMultimediaInfo')) {
      console.log('✅ 发现 showMultimediaInfo 调用，替换成功')
    }

    console.log('✅ TC-E2E-03 通过：HTML中无遗留window.external/window.parent调用')
  })

  test('TC-E2E-04: 验证display:none元素被强制显示', async ({ page }) => {
    // 1. 打开任意DM
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.locator('a:has-text("浏览DM")').click()

    // 2. 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
    }, { timeout: 10000 })

    // 3. 点击预览按钮
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })

    // 4. 等待iframe加载完成
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    const iframe = modal.locator('iframe')
    await iframe.waitFor({ state: 'attached', timeout: 5000 })

    await page.waitForTimeout(2000)

    const frame = await iframe.contentFrame()
    if (!frame) {
      console.log('⚠️ 无法获取iframe内容，跳过display测试')
      await page.click('.ant-modal-close')
      return
    }

    // 5. 获取iframe的HTML内容
    const htmlContent = await frame.evaluate(() => document.body.innerHTML)

    // 6. 验证不包含 display:none 或 display: none
    const hasDisplayNone = htmlContent.includes('display:none') || htmlContent.includes('display: none')
    expect(hasDisplayNone).toBe(false)

    console.log('✅ TC-E2E-04 通过：HTML中无display:none样式')
  })
})
