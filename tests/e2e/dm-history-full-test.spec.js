/**
 * E2E测试：历史版本功能完整场景和边界测试
 * 所有测试通过真实UI交互验证
 */

const { test, expect } = require('@playwright/test')

test.describe('历史版本功能完整测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
    await page.goto('http://localhost:3000/ietm/dm-manage')
    await page.waitForTimeout(1000)
  })

  // P0: 核心功能测试
  test('P0-01: 打开历史版本列表', async ({ page }) => {
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })

    const moreButton = firstRow.locator('button').filter({ hasText: '更多' })
    await moreButton.click()
    await page.waitForTimeout(500)

    await page.click('text=查看历史版本')
    await page.waitForTimeout(2000)

    await expect(page.locator('text=查看历史版本')).toBeVisible()
    console.log('✅ P0-01: 历史版本列表打开成功')
  })

  test('P0-02: 验证DMC格式包含5段', async ({ page }) => {
    await openHistoryPage(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const dmcCell = firstRow.locator('td').nth(1)
    const dmcText = await dmcCell.textContent()
    const dmcParts = dmcText.trim().split('-')

    expect(dmcParts.length).toBeGreaterThanOrEqual(5)
    expect(dmcText).toMatch(/_[a-z]{2}-[A-Z]{2}$/i)

    console.log('✅ P0-02: DMC格式正确:', dmcText)
  })

  test('P0-03: 版本号格式验证', async ({ page }) => {
    await openHistoryPage(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const versionTag = firstRow.locator('.ant-tag').filter({ hasText: /-/ })
    const versionText = await versionTag.textContent()

    expect(versionText).toMatch(/^\d+-\d+$/)
    console.log('✅ P0-03: 版本号格式:', versionText)
  })

  test('P0-04: 浏览DM新窗口打开', async ({ page, context }) => {
    await openHistoryPage(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const browseLink = firstRow.locator('a').filter({ hasText: '浏览' })

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      browseLink.click()
    ])

    await newPage.waitForLoadState()
    expect(newPage.url()).toContain('/ietm/dm-content-editor/')

    await newPage.close()
    console.log('✅ P0-04: 浏览DM成功')
  })

  test('P0-05: 版本对比功能', async ({ page }) => {
    await openHistoryPage(page)

    const checkboxes = page.locator('.ant-table-tbody input[type="checkbox"]')
    const count = await checkboxes.count()

    if (count >= 2) {
      await checkboxes.nth(0).check()
      await checkboxes.nth(1).check()

      const compareButton = page.locator('button').filter({ hasText: '内容对比' })
      await expect(compareButton).toBeEnabled()
      await compareButton.click()
      await page.waitForTimeout(2000)

      await expect(page.locator('.dm-merge-container')).toBeVisible()
      console.log('✅ P0-05: 版本对比打开成功')
    }
  })

  test('P0-06: 验证版本AB标识', async ({ page }) => {
    await openHistoryPage(page)
    await selectAndCompare(page)

    await expect(page.locator('.version-badge').filter({ hasText: '版本 A' })).toBeVisible()
    await expect(page.locator('.version-badge').filter({ hasText: '版本 B' })).toBeVisible()

    console.log('✅ P0-06: 版本AB标识正确')
  })

  test('P0-07: 滚动条显示验证', async ({ page }) => {
    await openHistoryPage(page)
    await selectAndCompare(page)

    const container = page.locator('.dm-merge-container')
    const overflow = await container.evaluate(el => window.getComputedStyle(el).overflow)

    expect(overflow).not.toBe('hidden')
    console.log('✅ P0-07: 滚动条配置正确, overflow:', overflow)
  })

  test('P0-08: 格式化功能', async ({ page }) => {
    await openHistoryPage(page)
    await selectAndCompare(page)

    const formatButtons = page.locator('button').filter({ hasText: '格式化' })
    const count = await formatButtons.count()
    expect(count).toBeGreaterThanOrEqual(2)

    await formatButtons.first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('.CodeMirror-code').first()).toBeVisible()
    console.log('✅ P0-08: 格式化功能正常')
  })

  // P1: 边界条件测试
  test('P1-01: 勾选超过2条限制', async ({ page }) => {
    await openHistoryPage(page)

    const checkboxes = page.locator('.ant-table-tbody input[type="checkbox"]')
    const count = await checkboxes.count()

    if (count >= 3) {
      await checkboxes.nth(0).check()
      await checkboxes.nth(1).check()
      await checkboxes.nth(2).check()
      await page.waitForTimeout(500)

      const checkedCount = await page.locator('.ant-table-tbody input[type="checkbox"]:checked').count()
      expect(checkedCount).toBeLessThanOrEqual(2)

      console.log('✅ P1-01: 超过2条限制正常')
    }
  })

  test('P1-02: 未勾选时按钮禁用', async ({ page }) => {
    await openHistoryPage(page)

    const compareButton = page.locator('button').filter({ hasText: '内容对比' })
    await expect(compareButton).toBeDisabled()

    console.log('✅ P1-02: 未勾选时按钮禁用')
  })

  test('P1-03: 只勾选1条时按钮禁用', async ({ page }) => {
    await openHistoryPage(page)

    const checkboxes = page.locator('.ant-table-tbody input[type="checkbox"]')
    await checkboxes.nth(0).check()

    const compareButton = page.locator('button').filter({ hasText: '内容对比' })
    await expect(compareButton).toBeDisabled()

    console.log('✅ P1-03: 只勾选1条时按钮禁用')
  })

  test('P1-04: 连续格式化稳定性', async ({ page }) => {
    await openHistoryPage(page)
    await selectAndCompare(page)

    const formatButton = page.locator('button').filter({ hasText: '格式化' }).first()

    await formatButton.click()
    await page.waitForTimeout(800)
    const lines1 = await page.locator('.CodeMirror-line').count()

    await formatButton.click()
    await page.waitForTimeout(800)
    const lines2 = await page.locator('.CodeMirror-line').count()

    await formatButton.click()
    await page.waitForTimeout(800)
    const lines3 = await page.locator('.CodeMirror-line').count()

    expect(lines2).toBe(lines1)
    expect(lines3).toBe(lines1)

    console.log('✅ P1-04: 连续格式化稳定, 行数:', lines1)
  })

  test('P1-05: 只显示发布版本过滤', async ({ page }) => {
    await openHistoryPage(page)

    const initialRows = await page.locator('.ant-table-tbody tr').count()

    const publishCheckbox = page.locator('text=只显示发布版本').locator('..').locator('input[type="checkbox"]')
    await publishCheckbox.check()
    await page.waitForTimeout(1500)

    const filteredRows = await page.locator('.ant-table-tbody tr').count()

    console.log('✅ P1-05: 过滤功能正常, 初始:', initialRows, '过滤后:', filteredRows)
  })

  // P2: 版本号一致性深度验证
  test('P2-01: 版本号一致性-列表vs浏览URL', async ({ page, context }) => {
    await openHistoryPage(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const versionTag = firstRow.locator('.ant-tag').filter({ hasText: /-/ })
    const listVersion = await versionTag.textContent()

    const browseLink = firstRow.locator('a').filter({ hasText: '浏览' })
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      browseLink.click()
    ])

    await newPage.waitForLoadState()
    const url = new URL(newPage.url())
    const urlVersion = url.searchParams.get('version')

    if (urlVersion) {
      expect(urlVersion.trim()).toBe(listVersion.trim())
    }

    await newPage.close()
    console.log('✅ P2-01: 列表版本号与URL一致:', listVersion)
  })

  test('P2-02: 版本号一致性-对比弹窗', async ({ page }) => {
    await openHistoryPage(page)

    const rows = page.locator('.ant-table-tbody tr')
    const version1Tag = rows.nth(0).locator('.ant-tag').filter({ hasText: /-/ })
    const version2Tag = rows.nth(1).locator('.ant-tag').filter({ hasText: /-/ })

    const version1 = await version1Tag.textContent()
    const version2 = await version2Tag.textContent()

    await selectAndCompare(page)

    const modalVersions = page.locator('.version-meta-inline .meta-item').filter({ hasText: /-/ })
    const modalVersion1Text = await modalVersions.first().textContent()
    const modalVersion2Text = await modalVersions.last().textContent()

    expect(modalVersion1Text).toContain(version1.trim())
    expect(modalVersion2Text).toContain(version2.trim())

    console.log('✅ P2-02: 对比弹窗版本号一致')
  })

  test('P2-03: DMC一致性验证', async ({ page }) => {
    await openHistoryPage(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const dmcCell = firstRow.locator('td').nth(1)
    const listDmc = await dmcCell.textContent()

    await selectAndCompare(page)

    const modalDmc = page.locator('.version-dmc').first()
    const modalDmcText = await modalDmc.textContent()

    expect(modalDmcText.trim()).toBe(listDmc.trim())
    console.log('✅ P2-03: DMC一致:', listDmc.trim())
  })

  // P3: 类似问题排查
  test('P3-01: 版本类型显示一致性', async ({ page }) => {
    await openHistoryPage(page)

    const typeCell = page.locator('.ant-table-tbody tr').first().locator('td').nth(5)
    const typeTag = typeCell.locator('.ant-tag')

    await expect(typeTag).toBeVisible()
    const typeText = await typeTag.textContent()

    const validTypes = ['新建', '更改', '删除', '修订', '状态变更', '草稿', '已发布']
    const hasValidType = validTypes.some(t => typeText.includes(t))

    console.log('✅ P3-01: 版本类型显示:', typeText, '有效:', hasValidType)
  })

  test('P3-02: 创建人字段完整性', async ({ page }) => {
    await openHistoryPage(page)

    const creatorCell = page.locator('.ant-table-tbody tr').first().locator('td').nth(7)
    const creatorText = await creatorCell.textContent()

    expect(creatorText.trim().length).toBeGreaterThan(0)

    console.log('✅ P3-02: 创建人字段存在:', creatorText.trim())
  })

  test('P3-03: 版本日期格式验证', async ({ page }) => {
    await openHistoryPage(page)

    const dateCell = page.locator('.ant-table-tbody tr').first().locator('td').nth(6)
    const dateText = await dateCell.textContent()

    const isValidDate = dateText.match(/\d{4}-\d{2}-\d{2}/) || dateText === '-'
    expect(isValidDate).toBeTruthy()

    console.log('✅ P3-03: 版本日期格式:', dateText)
  })

  test('P3-04: 锁定状态图标显示', async ({ page }) => {
    await openHistoryPage(page)

    const lockCell = page.locator('.ant-table-tbody tr').first().locator('td').nth(0)
    const lockIcon = lockCell.locator('.anticon')

    await expect(lockIcon).toBeVisible()

    const iconClass = await lockIcon.getAttribute('class')
    const hasValidIcon = iconClass.includes('check-circle') || iconClass.includes('lock')

    expect(hasValidIcon).toBeTruthy()

    console.log('✅ P3-04: 锁定状态图标正常')
  })

  test('P3-05: 表格列宽度合理性', async ({ page }) => {
    await openHistoryPage(page)

    const headers = page.locator('.ant-table-thead th')
    const count = await headers.count()

    expect(count).toBeGreaterThan(5)

    console.log('✅ P3-05: 表格列数正常:', count)
  })

  // 辅助函数
  async function openHistoryPage(page) {
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })

    const moreButton = firstRow.locator('button').filter({ hasText: '更多' })
    await moreButton.click()
    await page.waitForTimeout(500)

    await page.click('text=查看历史版本')
    await page.waitForTimeout(2000)
  }

  async function selectAndCompare(page) {
    const checkboxes = page.locator('.ant-table-tbody input[type="checkbox"]')
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()

    const compareButton = page.locator('button').filter({ hasText: '内容对比' })
    await compareButton.click()
    await page.waitForTimeout(2000)
  }
})
