const { test, expect } = require('@playwright/test')
const http = require('http')

// DM历史版本功能E2E测试（真实UI验证，不绕过Vue层）
// 覆盖：9列显示、签出图标、发布过滤、2行对比、格式化、浏览DM
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978' // 项目1(ZB1)
const DM_NODE_TITLE = '02-项目自定义' // DM挂载节点

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
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

// 真实树导航：打开列表页 → 点击DM挂载节点 → 等待真实DM行加载
async function openListRealDm(page) {
  await injectToken(page)
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
    .filter({ hasText: /^02-项目自定义$/ }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

// 打开第一条DM的历史版本弹窗（选中第一行 + 点击顶部工具栏按钮）
async function openHistoryModal(page) {
  await openListRealDm(page)
  // 选中第一行DM
  const firstRow = page.locator('.ant-table-row').first()
  await firstRow.waitFor({ state: 'visible', timeout: 10000 })
  await firstRow.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(500)

  // 点击顶部工具栏的"历史版本"按钮
  const historyBtn = page.locator('button').filter({ hasText: /^历史版本$/ })
  await historyBtn.waitFor({ state: 'visible', timeout: 10000 })
  await historyBtn.click()
  await page.waitForTimeout(800)

  // 等待弹窗出现
  await page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })
    .waitFor({ state: 'visible', timeout: 10000 })
}

// stub 历史版本接口返回测试数据
async function stubHistoryVersions(page, records) {
  await page.route('**/ietm/datamodule/historyVersions**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, result: records })
    })
  )
}

// stub 对比接口返回测试内容
async function stubCompare(page, sourceContent, targetContent) {
  await page.route('**/ietm/datamodule/compareVersions**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: { sourceContent, targetContent }
      })
    })
  )
}

test.describe('DM历史版本·真实UI验证', () => {
  test.setTimeout(90000)

  test('TC-01 打开历史版本弹窗显示9列', async ({ page }) => {
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 验证9列标题存在
    const headers = ['DMC代码', '发布号', '工作号', '版本类型', '是否最新', '签出人', '签出时间', '发布日期', '创建人']
    for (const h of headers) {
      await expect(modal.locator('th').filter({ hasText: h })).toBeVisible()
    }
  })

  test('TC-02 签出状态图标显示（本人签出/他人签出/未签出）', async ({ page }) => {
    const mockData = [
      {
        id: '1001',
        dmcCode: 'DMC-TEST-001',
        issueNo: '001',
        inWork: '00',
        versionType: '1',
        isLatest: '1',
        checkoutUser: 'admin',
        checkoutTime: '2026-08-08 10:00:00',
        issueDate: '2026-08-08',
        createBy: 'admin'
      },
      {
        id: '1002',
        dmcCode: 'DMC-TEST-002',
        issueNo: '002',
        inWork: '00',
        versionType: '1',
        isLatest: '0',
        checkoutUser: 'other',
        checkoutTime: '2026-08-07 10:00:00',
        issueDate: '2026-08-07',
        createBy: 'admin'
      },
      {
        id: '1003',
        dmcCode: 'DMC-TEST-003',
        issueNo: '003',
        inWork: '00',
        versionType: '0',
        isLatest: '0',
        checkoutUser: null,
        checkoutTime: null,
        issueDate: '2026-08-06',
        createBy: 'admin'
      }
    ]
    await stubHistoryVersions(page, mockData)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 验证第1行：绿勾（本人签出）
    const row1 = modal.locator('.ant-table-row').nth(0)
    await expect(row1.locator('.anticon-check-circle')).toBeVisible()
    await expect(row1.locator('.anticon-check-circle')).toHaveCSS('color', 'rgb(82, 196, 26)') // #52c41a

    // 验证第2行：红锁（他人签出）
    const row2 = modal.locator('.ant-table-row').nth(1)
    await expect(row2.locator('.anticon-lock')).toBeVisible()
    await expect(row2.locator('.anticon-lock')).toHaveCSS('color', 'rgb(245, 34, 45)') // #f5222d

    // 验证第3行：灰锁（未签出）
    const row3 = modal.locator('.ant-table-row').nth(2)
    await expect(row3.locator('.anticon-lock')).toBeVisible()
    await expect(row3.locator('.anticon-lock')).toHaveCSS('color', 'rgb(191, 191, 191)') // #bfbfbf
  })

  test('TC-03 "只看发布版本"复选框过滤功能', async ({ page }) => {
    const allData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '001', inWork: '01', versionType: '0', isLatest: '0', issueDate: null, createBy: 'admin' },
      { id: '3', dmcCode: 'DMC-003', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' }
    ]
    const publishedData = allData.filter(r => r.versionType === '1')

    // 初始未勾选，返回全部
    await stubHistoryVersions(page, allData)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 验证初始显示3行
    await expect(modal.locator('.ant-table-row')).toHaveCount(3)

    // 勾选"只看发布版本"
    await stubHistoryVersions(page, publishedData)
    const checkbox = modal.locator('.ant-checkbox-input').filter({ has: page.locator('text=/只看发布版本/') })
    await checkbox.check({ force: true })
    await page.waitForTimeout(800)

    // 验证只显示2行（发布版本）
    await expect(modal.locator('.ant-table-row')).toHaveCount(2)
  })

  test('TC-04 选择2行后"对比"按钮可用', async ({ page }) => {
    const mockData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' }
    ]
    await stubHistoryVersions(page, mockData)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    const compareBtn = modal.locator('button').filter({ hasText: /对比/ })

    // 初始状态：禁用
    await expect(compareBtn).toBeDisabled()

    // 选中第1行
    await modal.locator('.ant-table-row').nth(0).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)
    await expect(compareBtn).toBeDisabled() // 仍禁用

    // 选中第2行
    await modal.locator('.ant-table-row').nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)
    await expect(compareBtn).toBeEnabled() // 可用
  })

  test('TC-05 选择3行后"对比"按钮禁用', async ({ page }) => {
    const mockData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' },
      { id: '3', dmcCode: 'DMC-003', issueNo: '003', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-06', createBy: 'admin' }
    ]
    await stubHistoryVersions(page, mockData)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    const compareBtn = modal.locator('button').filter({ hasText: /对比/ })

    // 选中3行
    for (let i = 0; i < 3; i++) {
      await modal.locator('.ant-table-row').nth(i).locator('.ant-checkbox-input').check({ force: true })
      await page.waitForTimeout(200)
    }

    // 验证禁用
    await expect(compareBtn).toBeDisabled()
  })

  test('TC-06 点击"对比"打开对比抽屉显示MergeView', async ({ page }) => {
    const mockData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' }
    ]
    const sourceXml = '<dmodule><title>Version 1</title></dmodule>'
    const targetXml = '<dmodule><title>Version 2</title></dmodule>'

    await stubHistoryVersions(page, mockData)
    await stubCompare(page, sourceXml, targetXml)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 选中2行
    await modal.locator('.ant-table-row').nth(0).locator('.ant-checkbox-input').check({ force: true })
    await modal.locator('.ant-table-row').nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)

    // 点击对比
    await modal.locator('button').filter({ hasText: /对比/ }).click()
    await page.waitForTimeout(1000)

    // 验证对比抽屉出现
    const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })
    await expect(drawer).toBeVisible()

    // 验证MergeView存在（CodeMirror-merge容器）
    await expect(drawer.locator('.CodeMirror-merge')).toBeVisible()

    // 验证左右DMC代码显示
    await expect(drawer.locator('text=/DMC-001/')).toBeVisible()
    await expect(drawer.locator('text=/DMC-002/')).toBeVisible()
  })

  test('TC-07 对比抽屉"格式化双方"按钮功能', async ({ page }) => {
    const mockData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' }
    ]
    // 未格式化的紧凑XML
    const sourceXml = '<dmodule><title>Test</title><content><para>Data</para></content></dmodule>'
    const targetXml = '<dmodule><title>Test2</title><content><para>Data2</para></content></dmodule>'

    await stubHistoryVersions(page, mockData)
    await stubCompare(page, sourceXml, targetXml)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 选中2行并对比
    await modal.locator('.ant-table-row').nth(0).locator('.ant-checkbox-input').check({ force: true })
    await modal.locator('.ant-table-row').nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)
    await modal.locator('button').filter({ hasText: /对比/ }).click()
    await page.waitForTimeout(1000)

    const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })

    // 点击"格式化双方"
    const formatBtn = drawer.locator('button').filter({ hasText: /格式化双方/ })
    await formatBtn.click()
    await page.waitForTimeout(500)

    // 验证格式化后内容有换行（检查CodeMirror内容行数）
    const cmLines = drawer.locator('.CodeMirror-line')
    await expect(cmLines.first()).toBeVisible()
    const count = await cmLines.count()
    expect(count).toBeGreaterThan(1) // 格式化后应有多行
  })

  test('TC-08 格式化保护CDATA和注释不被破坏', async ({ page }) => {
    const mockData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' }
    ]
    // 包含CDATA和注释的XML
    const sourceXml = '<dmodule><data><![CDATA[<script>alert("xss")</script>]]></data><!-- 这是注释 --><para>test</para></dmodule>'
    const targetXml = '<dmodule><data><![CDATA[<script>alert("xss2")</script>]]></data><!-- 注释2 --><para>test2</para></dmodule>'

    await stubHistoryVersions(page, mockData)
    await stubCompare(page, sourceXml, targetXml)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 选中2行并对比
    await modal.locator('.ant-table-row').nth(0).locator('.ant-checkbox-input').check({ force: true })
    await modal.locator('.ant-table-row').nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)
    await modal.locator('button').filter({ hasText: /对比/ }).click()
    await page.waitForTimeout(1000)

    const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })

    // 点击"格式化双方"
    await drawer.locator('button').filter({ hasText: /格式化双方/ }).click()
    await page.waitForTimeout(500)

    // 验证CDATA和注释完整保留（通过CodeMirror内部文本验证）
    const leftCm = drawer.locator('.CodeMirror-merge-pane-left .CodeMirror')
    const leftText = await leftCm.evaluate(el => el.CodeMirror.getValue())
    expect(leftText).toContain('<![CDATA[')
    expect(leftText).toContain(']]>')
    expect(leftText).toContain('<!-- 这是注释 -->')
  })

  test('TC-09 点击"浏览DM"跳转到编辑器（browse模式）', async ({ page }) => {
    const mockData = [
      { id: '9001', dmcCode: 'DMC-BROWSE-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', checkoutUser: null, issueDate: '2026-08-08', createBy: 'admin' }
    ]
    await stubHistoryVersions(page, mockData)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 点击第1行的"浏览DM"
    const browseBtn = modal.locator('.ant-table-row').first().locator('a').filter({ hasText: /浏览/ })
    await browseBtn.click()
    await page.waitForTimeout(1000)

    // 验证跳转到编辑器页面（URL包含 /dm-content-editor/9001 和 mode=browse）
    await expect(page).toHaveURL(/\/ietm\/dm-content-editor\/9001/)
    await expect(page).toHaveURL(/mode=browse/)
  })

  test('TC-10 本人签出的DM点击"浏览DM"跳转到edit模式', async ({ page }) => {
    const mockData = [
      { id: '9002', dmcCode: 'DMC-EDIT-001', issueNo: '001', inWork: '00', versionType: '0', isLatest: '1', checkoutUser: 'admin', checkoutTime: '2026-08-08 10:00:00', issueDate: null, createBy: 'admin' }
    ]
    await stubHistoryVersions(page, mockData)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 点击本人签出的"浏览DM"
    const browseBtn = modal.locator('.ant-table-row').first().locator('a').filter({ hasText: /浏览/ })
    await browseBtn.click()
    await page.waitForTimeout(1000)

    // 验证跳转到edit模式
    await expect(page).toHaveURL(/\/ietm\/dm-content-editor\/9002/)
    await expect(page).toHaveURL(/mode=edit/)
  })

  test('TC-11 边界：空历史版本列表显示空表格', async ({ page }) => {
    await stubHistoryVersions(page, [])
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 验证表格存在但无数据行
    await expect(modal.locator('.ant-table')).toBeVisible()
    await expect(modal.locator('.ant-table-row')).toHaveCount(0)
    await expect(modal.locator('.ant-empty')).toBeVisible() // antd空状态
  })

  test('TC-12 边界：对比接口返回空内容不报错', async ({ page }) => {
    const mockData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' }
    ]
    await stubHistoryVersions(page, mockData)
    await stubCompare(page, '', '') // 空内容
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 选中2行并对比
    await modal.locator('.ant-table-row').nth(0).locator('.ant-checkbox-input').check({ force: true })
    await modal.locator('.ant-table-row').nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)
    await modal.locator('button').filter({ hasText: /对比/ }).click()
    await page.waitForTimeout(1000)

    // 验证对比抽屉正常打开，无报错
    const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('.CodeMirror-merge')).toBeVisible()
  })

  test('TC-13 边界：格式化非法XML不崩溃', async ({ page }) => {
    const mockData = [
      { id: '1', dmcCode: 'DMC-001', issueNo: '001', inWork: '00', versionType: '1', isLatest: '1', issueDate: '2026-08-08', createBy: 'admin' },
      { id: '2', dmcCode: 'DMC-002', issueNo: '002', inWork: '00', versionType: '1', isLatest: '0', issueDate: '2026-08-07', createBy: 'admin' }
    ]
    // 非法XML：未闭合标签
    const badXml = '<dmodule><title>Unclosed<para>test</dmodule>'

    await stubHistoryVersions(page, mockData)
    await stubCompare(page, badXml, badXml)
    await openHistoryModal(page)
    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })

    // 选中2行并对比
    await modal.locator('.ant-table-row').nth(0).locator('.ant-checkbox-input').check({ force: true })
    await modal.locator('.ant-table-row').nth(1).locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)
    await modal.locator('button').filter({ hasText: /对比/ }).click()
    await page.waitForTimeout(1000)

    const drawer = page.locator('.ant-drawer-content').filter({ has: page.locator('text=/版本对比/') })

    // 点击格式化
    await drawer.locator('button').filter({ hasText: /格式化双方/ }).click()
    await page.waitForTimeout(500)

    // 验证不崩溃，仍显示内容（可能原样显示）
    await expect(drawer.locator('.CodeMirror-merge')).toBeVisible()
    const leftCm = drawer.locator('.CodeMirror-merge-pane-left .CodeMirror')
    const leftText = await leftCm.evaluate(el => el.CodeMirror.getValue())
    expect(leftText.length).toBeGreaterThan(0) // 至少有内容
  })
})
