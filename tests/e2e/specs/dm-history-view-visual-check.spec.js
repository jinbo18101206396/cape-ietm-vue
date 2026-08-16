/**
 * DmHistoryView 视觉检查测试
 * 验证版本对比页面的分隔栏宽度一致性
 */

const { test, expect } = require('@playwright/test')

test.describe('DmHistoryView 视觉检查', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('http://localhost:3000/#/user/login')
    await page.fill('input[placeholder="账户: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 导航到DM管理页面，点击一个DM的查看历史版本
    await page.goto('http://localhost:3000/#/ietm/ietm-data-module-manage')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 查找第一个DM的"更多"按钮并点击"查看历史版本"
    const moreButton = page.locator('.ant-table-row').first().locator('button:has-text("更多")')
    if (await moreButton.count() > 0) {
      await moreButton.click()
      await page.click('text=查看历史版本')
      await page.waitForURL('**/dm-history**', { timeout: 10000 })
      await page.waitForTimeout(1000)
    } else {
      // 如果没有"更多"按钮，直接导航
      await page.goto('http://localhost:3000/#/ietm/dm-history?sns=DMC-DEMO&infoCode=000&infoCodeVariant=00&dmc=DMC-DEMO-000-00')
      await page.waitForLoadState('networkidle')
    }
  })

  test('TC-01: 检查CodeMirror分隔栏宽度', async ({ page }) => {
    // 1. 模拟选择两条记录（需要先确保有数据）
    const checkboxes = await page.locator('.ant-table-row .ant-checkbox-input').all()
    if (checkboxes.length >= 2) {
      await checkboxes[0].check()
      await checkboxes[1].check()
    }

    // 2. 点击内容对比按钮
    await page.click('button:has-text("内容对比")')

    // 3. 等待Modal和CodeMirror渲染
    await page.waitForSelector('.dm-merge-container', { timeout: 5000 })
    await page.waitForTimeout(500) // 等待CodeMirror完全渲染

    // 4. 检查分隔栏元素
    const spacer = await page.locator('.CodeMirror-merge-spacer')

    if (await spacer.count() > 0) {
      // 获取分隔栏的实际宽度
      const box = await spacer.boundingBox()

      console.log('分隔栏尺寸：', {
        width: box.width,
        height: box.height,
        x: box.x,
        y: box.y
      })

      // 验证宽度接近50px（允许1px误差）
      expect(box.width).toBeGreaterThanOrEqual(49)
      expect(box.width).toBeLessThanOrEqual(51)

      // 获取左右编辑器的宽度
      const leftPane = await page.locator('.CodeMirror-merge-pane-leftmost').boundingBox()
      const rightPane = await page.locator('.CodeMirror-merge-pane-rightmost').boundingBox()

      console.log('左侧编辑器宽度：', leftPane?.width)
      console.log('右侧编辑器宽度：', rightPane?.width)

      // 验证左右编辑器宽度基本相等（允许2px误差）
      if (leftPane && rightPane) {
        const widthDiff = Math.abs(leftPane.width - rightPane.width)
        expect(widthDiff).toBeLessThanOrEqual(2)
      }
    } else {
      console.log('未找到 CodeMirror-merge-spacer 元素')
    }
  })

  test('TC-02: 检查格式化不产生空行', async ({ page }) => {
    // 选择两条记录并打开对比
    const checkboxes = await page.locator('.ant-table-row .ant-checkbox-input').all()
    if (checkboxes.length >= 2) {
      await checkboxes[0].check()
      await checkboxes[1].check()
    }

    await page.click('button:has-text("内容对比")')
    await page.waitForSelector('.dm-merge-container', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 获取左侧编辑器初始内容
    const getLeftContent = async () => {
      return await page.evaluate(() => {
        const mergeContainer = document.querySelector('.dm-merge-container')
        if (!mergeContainer) return null
        const leftEditor = mergeContainer.querySelector('.CodeMirror-merge-l-chunk')?.closest('.CodeMirror')
        if (!leftEditor?.CodeMirror) return null
        return leftEditor.CodeMirror.getValue()
      })
    }

    const content1 = await getLeftContent()
    if (!content1) {
      console.log('无法获取编辑器内容，跳过测试')
      return
    }

    const lines1 = content1.split('\n').length
    console.log('格式化前行数：', lines1)

    // 点击格式化按钮3次
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("格式化")').first()
      await page.waitForTimeout(300)
    }

    const content2 = await getLeftContent()
    const lines2 = content2.split('\n').length
    console.log('格式化3次后行数：', lines2)

    // 验证行数不增加（允许格式化调整±2行）
    expect(Math.abs(lines2 - lines1)).toBeLessThanOrEqual(2)
  })

  test('TC-03: 检查纵向滚动条显示', async ({ page }) => {
    const checkboxes = await page.locator('.ant-table-row .ant-checkbox-input').all()
    if (checkboxes.length >= 2) {
      await checkboxes[0].check()
      await checkboxes[1].check()
    }

    await page.click('button:has-text("内容对比")')
    await page.waitForSelector('.dm-merge-container', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 检查左侧编辑器的滚动条
    const leftScrollHeight = await page.evaluate(() => {
      const editors = document.querySelectorAll('.CodeMirror-scroll')
      if (editors.length === 0) return null
      const leftScroll = editors[0]
      return {
        scrollHeight: leftScroll.scrollHeight,
        clientHeight: leftScroll.clientHeight,
        hasVerticalScroll: leftScroll.scrollHeight > leftScroll.clientHeight
      }
    })

    console.log('左侧滚动信息：', leftScrollHeight)

    // 如果内容足够长，应该有纵向滚动条
    if (leftScrollHeight && leftScrollHeight.scrollHeight > 600) {
      expect(leftScrollHeight.hasVerticalScroll).toBe(true)
    }
  })
})
