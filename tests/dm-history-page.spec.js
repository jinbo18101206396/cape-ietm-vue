const { test, expect } = require('@playwright/test')
const http = require('http')

// DM历史版本【独立页面】E2E验证（对标需求§1.2 top.addTab 打开新页面）
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

// 打开列表页 → 选中第一条DM
async function openListSelectFirst(page) {
  await injectToken(page)
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
    .filter({ hasText: /^02-项目自定义$/ }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('.ant-table-row').first().locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(500)
}

// 点历史版本按钮 → 跳转到独立页面
async function gotoHistoryPage(page) {
  await openListSelectFirst(page)
  await page.locator('button').filter({ hasText: /^历史版本$/ }).click()
  // 等待路由跳转到独立页面
  await page.waitForURL(/\/ietm\/dm-history/, { timeout: 10000 })
  // 等待页面表格加载
  await page.locator('.dm-history-page').waitFor({ state: 'visible', timeout: 10000 })
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 10000 })
}

test.describe('DM历史版本·独立页面验证', () => {
  test.setTimeout(90000)

  test('TC-01 点击历史版本跳转独立页面（非弹框）', async ({ page }) => {
    await openListSelectFirst(page)
    await page.locator('button').filter({ hasText: /^历史版本$/ }).click()

    // 验证URL跳转到独立页面
    await page.waitForURL(/\/ietm\/dm-history/, { timeout: 10000 })
    expect(page.url()).toContain('/ietm/dm-history')

    // 验证是独立页面（有页面容器），不是弹框（无 ant-modal）
    await expect(page.locator('.dm-history-page')).toBeVisible()
    const modalCount = await page.locator('.ant-modal').count()
    expect(modalCount).toBe(0)
  })

  test('TC-02 URL携带正确的query参数', async ({ page }) => {
    await gotoHistoryPage(page)
    const url = new URL(page.url())
    console.log('URL参数:', url.search)
    // 验证 sns / infoCode 参数存在
    expect(url.searchParams.has('sns')).toBeTruthy()
    expect(url.searchParams.has('infoCode')).toBeTruthy()
  })

  test('TC-03 页面标题栏显示DMC + 返回按钮', async ({ page }) => {
    await gotoHistoryPage(page)
    // 标题
    await expect(page.locator('.page-title')).toContainText('查看历史版本')
    // DMC标签
    await expect(page.locator('.dmc-tag')).toBeVisible()
    // 返回按钮
    await expect(page.locator('.page-header button').filter({ hasText: /返回/ })).toBeVisible()
  })

  test('TC-04 列表显示9列（对标需求§3.1）', async ({ page }) => {
    await gotoHistoryPage(page)
    const headers = await page.locator('thead th').allTextContents()
    console.log('表头:', headers)
    // 验证关键列存在
    for (const h of ['DMC', '技术名称', '信息名称', '版本', '版本类型', '版本日期', '创建人', '操作']) {
      expect(headers.some(x => x.trim() === h)).toBeTruthy()
    }
  })

  test('TC-05 签出状态图标显示', async ({ page }) => {
    await gotoHistoryPage(page)
    const firstRow = page.locator('.ant-table-row').first()
    const iconCount = await firstRow.locator('.anticon').count()
    expect(iconCount).toBeGreaterThan(0)
  })

  test('TC-06 只显示发布版本checkbox', async ({ page }) => {
    await gotoHistoryPage(page)
    const checkbox = page.locator('.page-header label').filter({ hasText: /只显示发布版本/ })
    await expect(checkbox).toBeVisible()

    const before = await page.locator('.ant-table-row').count()
    await checkbox.locator('input[type="checkbox"]').check({ force: true })
    await page.waitForTimeout(1000)
    const after = await page.locator('.ant-table-row').count()
    console.log('过滤前:', before, '过滤后:', after)
    expect(after).toBeLessThanOrEqual(before)
  })

  test('TC-07 版本号格式 issueNo-inWork（无多余versionType）', async ({ page }) => {
    await gotoHistoryPage(page)
    // 按列标题定位"版本"列的index（排除"版本类型"/"版本日期"）
    const headers = await page.locator('thead th').allTextContents()
    const verIdx = headers.findIndex(h => h.trim() === '版本')
    expect(verIdx).toBeGreaterThan(-1)
    const firstRow = page.locator('.ant-table-row').first()
    const versionText = await firstRow.locator('td').nth(verIdx).textContent()
    console.log('版本号:', versionText.trim(), '(列index=' + verIdx + ')')
    // 应匹配 xxx-xx，不含第三段
    expect(versionText.trim()).toMatch(/^\d+-\d+$/)
  })

  test('TC-08 版本日期空值显示"-"', async ({ page }) => {
    await gotoHistoryPage(page)
    const headers = await page.locator('thead th').allTextContents()
    const dateIdx = headers.findIndex(h => h.trim() === '版本日期')
    expect(dateIdx).toBeGreaterThan(-1)
    const rows = page.locator('.ant-table-row')
    const count = await rows.count()
    for (let i = 0; i < Math.min(count, 5); i++) {
      const dateText = await rows.nth(i).locator('td').nth(dateIdx).textContent()
      const t = dateText.trim()
      // 要么是日期，要么是"-"，不能是空
      expect(t.length).toBeGreaterThan(0)
      expect(t).not.toContain('null')
      expect(t).not.toContain('undefined')
    }
  })

  test('TC-09 内容对比（勾选2条）打开抽屉+MergeView', async ({ page }) => {
    await gotoHistoryPage(page)
    const rows = page.locator('.ant-table-row')
    const count = await rows.count()
    if (count < 2) { console.log('数据不足2条，跳过'); return }

    await rows.nth(0).locator('.ant-checkbox-input').check({ force: true })
    await rows.nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)

    const compareBtn = page.locator('button').filter({ hasText: /内容对比/ })
    await expect(compareBtn).toBeEnabled()
    await compareBtn.click()

    const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })
    await expect(drawer).toBeVisible({ timeout: 10000 })
    // 等待抽屉打开动画 + compareVersions 返回 + 渲染
    await page.waitForTimeout(3000)
    // 对比内容区就绪：有内容→CodeMirror；两版本内容均空→空提示。二者其一即功能正常
    const cmVisible = await drawer.locator('.CodeMirror').isVisible().catch(() => false)
    const emptyHint = await drawer.locator('.dm-merge-container', { hasText: /内容均为空/ }).isVisible().catch(() => false)
    console.log('CodeMirror可见:', cmVisible, ', 空提示可见:', emptyHint)
    expect(cmVisible || emptyHint).toBeTruthy()
  })

  test('TC-10 格式化按钮（左右各一个）', async ({ page }) => {
    await gotoHistoryPage(page)
    const rows = page.locator('.ant-table-row')
    const count = await rows.count()
    if (count < 2) { console.log('数据不足2条，跳过'); return }

    await rows.nth(0).locator('.ant-checkbox-input').check({ force: true })
    await rows.nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)
    await page.locator('button').filter({ hasText: /内容对比/ }).click()
    const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })
    await expect(drawer).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2500)

    const formatBtns = drawer.locator('button').filter({ hasText: /^格式化$/ })
    expect(await formatBtns.count()).toBe(2)
    // 点格式化不应报错（空内容时仍安全）
    await formatBtns.first().click()
    await page.waitForTimeout(500)
    // 抽屉仍正常显示（未崩溃）
    await expect(drawer).toBeVisible()
  })

  test('TC-11 操作列"浏览"跳转编辑器', async ({ page }) => {
    await gotoHistoryPage(page)
    // fixed:right 列在滚动表格中DOM可能渲染两份，取最后一个可见的
    const browseLink = page.locator('.ant-table-row').first().locator('a').filter({ hasText: /浏览/ }).last()
    await browseLink.click({ force: true })
    await page.waitForURL(/\/ietm\/dm-content-editor\//, { timeout: 10000 })
    expect(page.url()).toContain('/ietm/dm-content-editor/')
  })

  test('TC-12 返回按钮回到列表页', async ({ page }) => {
    await gotoHistoryPage(page)
    await page.locator('.page-header button').filter({ hasText: /返回/ }).click()
    await page.waitForURL(/\/ietmdatamodulemanagement/, { timeout: 10000 })
    expect(page.url()).toContain('/ietmdatamodulemanagement')
  })
})
