/**
 * 测试：Figure设计器图形/图例tabs显示冲突修复验证
 *
 * 问题：图形tab激活时图例页面空白，图例tab激活时图形页面空白
 * 修复：添加CSS规则 .ant-tabs-tabpane-inactive { display: none !important; }
 *
 * 验证要点：
 * 1. 图形tab激活时，只显示图形内容，图例内容完全隐藏
 * 2. 图例tab激活时，只显示图例内容，图形内容完全隐藏
 * 3. tab切换流畅，无内容混乱
 */

const { test, expect } = require('@playwright/test')

test.describe('Figure设计器Tabs显示冲突修复验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="账号: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/analysis')

    // 进入DM内容编辑页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/1862370819219382274?dmc=DMC-ZB1-A-04-00-00-00A-007A-A_001-01_zh-CN&mode=edit')
    await page.waitForSelector('.editor-body', { timeout: 30000 })

    // 点击figure的铅笔图标打开设计器
    const gutterMarker = page.locator('.CodeMirror-gutter-elt').filter({ hasText: '✎' }).first()
    await gutterMarker.click()
    await page.waitForSelector('.figure-designer', { timeout: 10000 })
  })

  test('图形tab激活时，只显示图形内容', async ({ page }) => {
    // 确保图形tab处于激活状态
    const graphicTab = page.locator('.ant-tabs-tab').filter({ hasText: /图形\[\d+\]/ })
    await graphicTab.click()

    // 等待tab切换完成
    await page.waitForTimeout(500)

    // 检查图形tab pane的状态
    const graphicPane = page.locator('.ant-tabs-tabpane').first()
    const graphicPaneClasses = await graphicPane.getAttribute('class')
    expect(graphicPaneClasses).toContain('ant-tabs-tabpane-active')
    expect(graphicPaneClasses).not.toContain('ant-tabs-tabpane-inactive')

    // 检查图形内容是否可见
    const graphicTable = graphicPane.locator('table').first()
    await expect(graphicTable).toBeVisible()

    // 检查图例tab pane的状态
    const legendPane = page.locator('.ant-tabs-tabpane').nth(1)
    const legendPaneClasses = await legendPane.getAttribute('class')
    expect(legendPaneClasses).toContain('ant-tabs-tabpane-inactive')

    // ✅ 关键验证：图例pane的display应该为none
    const legendPaneDisplay = await legendPane.evaluate(el => window.getComputedStyle(el).display)
    expect(legendPaneDisplay).toBe('none')

    console.log('✅ 图形tab激活时，图例内容已完全隐藏')
  })

  test('图例tab激活时，只显示图例内容', async ({ page }) => {
    // 点击图例tab
    const legendTab = page.locator('.ant-tabs-tab').filter({ hasText: /图例\[\d+\]/ })
    await legendTab.click()

    // 等待tab切换完成
    await page.waitForTimeout(500)

    // 检查图例tab pane的状态
    const legendPane = page.locator('.ant-tabs-tabpane').nth(1)
    const legendPaneClasses = await legendPane.getAttribute('class')
    expect(legendPaneClasses).toContain('ant-tabs-tabpane-active')
    expect(legendPaneClasses).not.toContain('ant-tabs-tabpane-inactive')

    // 检查图例内容是否可见（表格或"暂无数据"）
    const legendContent = legendPane.locator('table, .ant-empty')
    await expect(legendContent.first()).toBeVisible()

    // 检查图形tab pane的状态
    const graphicPane = page.locator('.ant-tabs-tabpane').first()
    const graphicPaneClasses = await graphicPane.getAttribute('class')
    expect(graphicPaneClasses).toContain('ant-tabs-tabpane-inactive')

    // ✅ 关键验证：图形pane的display应该为none
    const graphicPaneDisplay = await graphicPane.evaluate(el => window.getComputedStyle(el).display)
    expect(graphicPaneDisplay).toBe('none')

    console.log('✅ 图例tab激活时，图形内容已完全隐藏')
  })

  test('tab切换流畅，无内容混乱', async ({ page }) => {
    // 初始状态：图形tab激活
    const graphicTab = page.locator('.ant-tabs-tab').filter({ hasText: /图形\[\d+\]/ })
    const legendTab = page.locator('.ant-tabs-tab').filter({ hasText: /图例\[\d+\]/ })

    // 切换到图例tab
    await legendTab.click()
    await page.waitForTimeout(300)

    const legendPaneDisplay1 = await page.locator('.ant-tabs-tabpane').nth(1).evaluate(
      el => window.getComputedStyle(el).display
    )
    expect(legendPaneDisplay1).not.toBe('none')

    const graphicPaneDisplay1 = await page.locator('.ant-tabs-tabpane').first().evaluate(
      el => window.getComputedStyle(el).display
    )
    expect(graphicPaneDisplay1).toBe('none')

    // 切换回图形tab
    await graphicTab.click()
    await page.waitForTimeout(300)

    const graphicPaneDisplay2 = await page.locator('.ant-tabs-tabpane').first().evaluate(
      el => window.getComputedStyle(el).display
    )
    expect(graphicPaneDisplay2).not.toBe('none')

    const legendPaneDisplay2 = await page.locator('.ant-tabs-tabpane').nth(1).evaluate(
      el => window.getComputedStyle(el).display
    )
    expect(legendPaneDisplay2).toBe('none')

    console.log('✅ Tab切换正常，无内容混乱')
  })

  test('图例tab：新建图例功能正常', async ({ page }) => {
    // 切换到图例tab
    const legendTab = page.locator('.ant-tabs-tab').filter({ hasText: /图例\[\d+\]/ })
    await legendTab.click()
    await page.waitForTimeout(500)

    // 点击"新建图例"按钮
    const addLegendBtn = page.locator('button').filter({ hasText: '新建图例' })
    await addLegendBtn.click()
    await page.waitForTimeout(300)

    // 验证表格中出现新行
    const legendTable = page.locator('.ant-tabs-tabpane').nth(1).locator('table')
    const rows = legendTable.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    // 填写图例数据
    const firstRow = rows.first()
    const noInput = firstRow.locator('input').first()
    const nameInput = firstRow.locator('input').nth(1)

    await noInput.fill('001')
    await nameInput.fill('测试图例')

    // 验证输入值
    await expect(noInput).toHaveValue('001')
    await expect(nameInput).toHaveValue('测试图例')

    console.log('✅ 图例tab新建功能正常')
  })
})
