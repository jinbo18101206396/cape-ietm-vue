/**
 * 轻量级诊断 - 最小化内存使用
 */
const { test } = require('@playwright/test')

test.describe('上标预览轻量诊断', () => {
  test.setTimeout(180000)

  test('快速诊断', async ({ page }) => {
    // 监听关键日志
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('🔍 [Preview Debug]')) {
        console.log(`\n${text}`)
      }
    })

    console.log('\n访问页面...')

    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })

    await page.waitForTimeout(5000)

    console.log('查找按钮...\n')

    // 简单查找预览按钮
    const buttons = await page.$$eval('button', btns =>
      btns.map((b, i) => ({
        i,
        text: b.textContent.trim(),
        visible: b.offsetParent !== null
      })).filter(b => b.visible && b.text.includes('预览'))
    )

    console.log(`找到 ${buttons.length} 个预览按钮`)

    if (buttons.length > 0) {
      console.log(`点击: "${buttons[0].text}"\n`)
      await page.locator('button').filter({ hasText: '预览' }).first().click()
      await page.waitForTimeout(3000)

      console.log('检查结果...\n')

      const hasModal = await page.locator('.ant-modal').isVisible().catch(() => false)
      console.log(`Modal打开: ${hasModal ? '✅' : '❌'}`)
    } else {
      console.log('❌ 未找到预览按钮')
    }

    await page.waitForTimeout(2000)
  })
})
