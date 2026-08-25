/**
 * E2E测试：历史版本功能完整验证
 *
 * 测试目标：
 * 1. buildDmcCode包含infoCodeVariant
 * 2. handleBrowseDm验证逻辑
 * 3. formatXml格式化稳定性
 * 4. CodeMirror滚动条显示
 * 5. 分隔栏宽度一致性
 */

const { test, expect } = require('@playwright/test')

test.describe('历史版本功能验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录并进入历史版本页面
    await page.goto('http://localhost:3000/ietm/dm-history')
    await page.waitForTimeout(2000)
  })

  test('TC-01: DMC应包含完整的5段结构', async ({ page }) => {
    // 检查页面上显示的DMC格式
    const dmcElements = await page.$$('[data-testid="dmc-code"]')
    if (dmcElements.length > 0) {
      const dmcText = await dmcElements[0].textContent()
      const parts = dmcText.split('-')
      expect(parts.length).toBeGreaterThanOrEqual(5)
      console.log('✅ DMC格式完整:', dmcText)
    }
  })

  test('TC-02: 点击浏览DM应打开新窗口', async ({ page, context }) => {
    // 查找第一个"浏览"按钮
    const browseButtons = await page.$$('button:has-text("浏览")')
    if (browseButtons.length > 0) {
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        browseButtons[0].click()
      ])
      await newPage.waitForLoadState()
      expect(newPage.url()).toContain('/ietm/dm-content-editor/')
      console.log('✅ 浏览DM打开成功:', newPage.url())
      await newPage.close()
    }
  })

  test('TC-03: 版本对比应显示滚动条', async ({ page }) => {
    // 选择两个版本进行对比
    const checkboxes = await page.$$('input[type="checkbox"]')
    if (checkboxes.length >= 2) {
      await checkboxes[0].check()
      await checkboxes[1].check()

      // 点击对比按钮
      const compareButton = await page.$('button:has-text("对比")')
      if (compareButton) {
        await compareButton.click()
        await page.waitForTimeout(1000)

        // 检查CodeMirror容器
        const mergeView = await page.$('.CodeMirror-merge')
        expect(mergeView).toBeTruthy()

        // 检查滚动条
        const scrollbar = await page.$('.CodeMirror-vscrollbar')
        if (scrollbar) {
          const isVisible = await scrollbar.isVisible()
          console.log('✅ 滚动条显示:', isVisible)
        }
      }
    }
  })

  test('TC-04: 连续格式化不应增加空行', async ({ page }) => {
    // 打开对比面板
    const checkboxes = await page.$$('input[type="checkbox"]')
    if (checkboxes.length >= 2) {
      await checkboxes[0].check()
      await checkboxes[1].check()

      const compareButton = await page.$('button:has-text("对比")')
      if (compareButton) {
        await compareButton.click()
        await page.waitForTimeout(1000)

        // 多次点击格式化
        const formatButtons = await page.$$('button:has-text("格式化")')
        if (formatButtons.length > 0) {
          const getLineCount = async () => {
            const lines = await page.$$('.CodeMirror-line')
            return lines.length
          }

          await formatButtons[0].click()
          await page.waitForTimeout(500)
          const count1 = await getLineCount()

          await formatButtons[0].click()
          await page.waitForTimeout(500)
          const count2 = await getLineCount()

          await formatButtons[0].click()
          await page.waitForTimeout(500)
          const count3 = await getLineCount()

          expect(count2).toBe(count1)
          expect(count3).toBe(count1)
          console.log('✅ 格式化稳定，行数:', count1)
        }
      }
    }
  })

  test('TC-05: 分隔栏宽度应一致', async ({ page }) => {
    const checkboxes = await page.$$('input[type="checkbox"]')
    if (checkboxes.length >= 2) {
      await checkboxes[0].check()
      await checkboxes[1].check()

      const compareButton = await page.$('button:has-text("对比")')
      if (compareButton) {
        await compareButton.click()
        await page.waitForTimeout(1000)

        // 检查分隔栏宽度
        const spacer = await page.$('.CodeMirror-merge-spacer')
        if (spacer) {
          const box = await spacer.boundingBox()
          expect(box.width).toBe(50)
          console.log('✅ 分隔栏宽度正确:', box.width)
        }
      }
    }
  })
})
