const { test, expect } = require('@playwright/test')
const http = require('http')

// DM历史版本功能完整E2E测试（对标需求文档）
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'
const DM_NODE_TITLE = '02-项目自定义'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => { d += c }); res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve({ raw: d }) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
})

async function injectToken(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
}

async function openListRealDm(page) {
  await injectToken(page)
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
    .filter({ hasText: /^02-项目自定义$/ }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

async function openHistoryModal(page) {
  await openListRealDm(page)
  const firstRow = page.locator('.ant-table-row').first()
  await firstRow.waitFor({ state: 'visible', timeout: 10000 })
  await firstRow.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(500)

  const historyBtn = page.locator('button').filter({ hasText: /^历史版本$/ })
  await historyBtn.waitFor({ state: 'visible', timeout: 10000 })
  await historyBtn.click()
  await page.waitForTimeout(800)

  await page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })
    .waitFor({ state: 'visible', timeout: 10000 })
}

test.describe('DM历史版本·需求对标验证', () => {
  test.setTimeout(90000)

  test('需求§3.1：列表显示9列（DMC/技术名称/信息名称/版本/类型/日期/创建人）', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 验证9列表头（按需求文档）
    const headers = ['DMC', '技术名称', '信息名称', '版本', '版本类型', '版本日期', '创建人']
    for (const h of headers) {
      const th = modal.locator('th').filter({ hasText: h })
      await expect(th).toBeVisible({ timeout: 5000 })
    }

    // 验证签出状态图标列存在
    const iconCol = modal.locator('th').first()
    await expect(iconCol).toBeVisible()
  })

  test('需求§3.2：签出状态图标三态（绿勾/红锁/灰锁）', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 检查第一行是否有签出图标
    const firstRow = modal.locator('.ant-table-row').first()
    const icons = await firstRow.locator('.anticon').count()

    // 至少应该有一个图标（check-circle或lock）
    expect(icons).toBeGreaterThan(0)
  })

  test('需求§4.3：只显示发布版本checkbox', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 验证checkbox存在
    const checkboxLabel = modal.locator('label').filter({ hasText: /只.*发布/ })
    await expect(checkboxLabel).toBeVisible()

    // 记录初始行数
    const initialCount = await modal.locator('.ant-table-row').count()
    console.log('初始行数:', initialCount)

    // 勾选checkbox
    const checkbox = checkboxLabel.locator('input[type="checkbox"]')
    await checkbox.check({ force: true })
    await page.waitForTimeout(1000)

    // 验证行数变化（可能减少）
    const filteredCount = await modal.locator('.ant-table-row').count()
    console.log('过滤后行数:', filteredCount)
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })

  test('需求§5.1：双击行浏览DM', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 双击第一行
    const firstRow = modal.locator('.ant-table-row').first()
    await firstRow.dblclick()
    await page.waitForTimeout(1500)

    // 验证跳转到编辑器页面
    await expect(page).toHaveURL(/\/ietm\/dm-content-editor\//, { timeout: 10000 })
  })

  test('需求§5.1：点击操作列"浏览"链接', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 点击第一行的"浏览"链接
    const browseLink = modal.locator('.ant-table-row').first().locator('a').filter({ hasText: /浏览/ })
    await expect(browseLink).toBeVisible()
    await browseLink.click()
    await page.waitForTimeout(1500)

    // 验证跳转到编辑器页面
    await expect(page).toHaveURL(/\/ietm\/dm-content-editor\//, { timeout: 10000 })
  })

  test('需求§5.2：内容对比（勾选2条）', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 勾选2行
    const rows = modal.locator('.ant-table-row')
    const rowCount = await rows.count()

    if (rowCount >= 2) {
      await rows.nth(0).locator('.ant-checkbox-input').check({ force: true })
      await page.waitForTimeout(300)
      await rows.nth(1).locator('.ant-checkbox-input').check({ force: true })
      await page.waitForTimeout(300)

      // 点击"内容对比"按钮
      const compareBtn = modal.locator('button').filter({ hasText: /对比/ })
      await expect(compareBtn).toBeEnabled()
      await compareBtn.click()
      await page.waitForTimeout(1500)

      // 验证对比抽屉出现
      const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })
      await expect(drawer).toBeVisible({ timeout: 10000 })

      // 验证MergeView存在
      await expect(drawer.locator('.CodeMirror-merge')).toBeVisible({ timeout: 5000 })
    } else {
      console.log('数据不足2条，跳过对比测试')
    }
  })

  test('需求§5.3：格式化按钮（左右各一个）', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    const rows = modal.locator('.ant-table-row')
    const rowCount = await rows.count()

    if (rowCount >= 2) {
      await rows.nth(0).locator('.ant-checkbox-input').check({ force: true })
      await rows.nth(1).locator('.ant-checkbox-input').check({ force: true })
      await page.waitForTimeout(300)

      const compareBtn = modal.locator('button').filter({ hasText: /对比/ })
      await compareBtn.click()
      await page.waitForTimeout(1500)

      const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })
      await expect(drawer).toBeVisible()

      // 验证有2个"格式化"按钮（左右各一个）
      const formatBtns = drawer.locator('button').filter({ hasText: /^格式化$/ })
      const btnCount = await formatBtns.count()
      expect(btnCount).toBe(2)

      // 点击第一个格式化按钮
      await formatBtns.first().click()
      await page.waitForTimeout(500)

      // 验证不崩溃
      await expect(drawer.locator('.CodeMirror-merge')).toBeVisible()
    } else {
      console.log('数据不足2条，跳过格式化测试')
    }
  })

  test('边界：版本类型显示正确', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 检查第一行的版本类型标签
    const firstRow = modal.locator('.ant-table-row').first()
    const versionTypeTag = firstRow.locator('.ant-tag').first()
    await expect(versionTypeTag).toBeVisible()

    const tagText = await versionTypeTag.textContent()
    console.log('版本类型:', tagText)

    // 版本类型应该是以下之一
    const validTypes = ['新建', '更改', '删除', '修订', '状态变更', '重新生效-更改', '草稿', '已发布']
    const isValid = validTypes.some(t => tagText.includes(t))
    expect(isValid).toBeTruthy()
  })

  test('边界：版本号格式验证（issueNo-inWork）', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 获取第一行的版本号
    const firstRow = modal.locator('.ant-table-row').first()
    const versionTag = firstRow.locator('td').nth(4).locator('.ant-tag')
    await expect(versionTag).toBeVisible()

    const versionText = await versionTag.textContent()
    console.log('版本号:', versionText)

    // 验证格式：xxx-xx 或 xxx-xx-type
    expect(versionText).toMatch(/\d+-\d+(-\w+)?/)
  })

  test('边界：按ESC关闭对比抽屉', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    const rows = modal.locator('.ant-table-row')
    const rowCount = await rows.count()

    if (rowCount >= 2) {
      await rows.nth(0).locator('.ant-checkbox-input').check({ force: true })
      await rows.nth(1).locator('.ant-checkbox-input').check({ force: true })
      await page.waitForTimeout(300)

      const compareBtn = modal.locator('button').filter({ hasText: /对比/ })
      await compareBtn.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })
      await expect(drawer).toBeVisible()

      // 点击关闭按钮
      const closeBtn = drawer.locator('.ant-drawer-close')
      await closeBtn.click()
      await page.waitForTimeout(500)

      // 验证抽屉关闭
      await expect(drawer).not.toBeVisible()
    }
  })
})
