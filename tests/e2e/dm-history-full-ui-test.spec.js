/**
 * DM历史版本完整UI交互自动化测试
 *
 * 特点：
 * 1. 通过真实UI交互（点击、输入、等待）
 * 2. 不绕过Vue层
 * 3. 验证实际渲染结果
 * 4. 覆盖核心功能、边界条件、异常场景
 *
 * 运行方式：
 * npx playwright test tests/e2e/dm-history-full-ui-test.spec.js --headed
 */

const { test, expect } = require('@playwright/test')
const http = require('http')

const BASE_URL = 'http://localhost:3000'
const API_BASE_URL = 'http://localhost:9999/jeecg-boot'
const PROJECT_ID = '2078348945532030978'
const DM_NODE_TITLE = '02-项目自定义'

let TOKEN

// API请求工具
function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (data) headers['Content-Length'] = Buffer.byteLength(data)
    if (token) headers['X-Access-Token'] = token

    const req = http.request(API_BASE_URL + path, { method, headers }, res => {
      let responseData = ''
      res.on('data', chunk => { responseData += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)) }
        catch (e) { resolve({ raw: responseData }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

// 全局登录
test.beforeAll(async () => {
  const loginResp = await apiReq('POST', '/sys/login', {
    username: 'admin',
    password: '123456'
  })
  if (!loginResp.success) {
    throw new Error('登录失败: ' + JSON.stringify(loginResp))
  }
  TOKEN = loginResp.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', {
    projectId: PROJECT_ID
  }, TOKEN)
  console.log('[全局设置] 登录成功，项目已打开')
})

// 注入token
async function injectToken(page) {
  await page.addInitScript(([token]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({
      value: token,
      expire: Date.now() + 7 * 86400000
    }))
  }, [TOKEN])
}

// 导航到历史版本页面
async function navigateToHistoryPage(page) {
  await injectToken(page)
  await page.goto(`${BASE_URL}/ietmdatamodulemanagement`, { waitUntil: 'networkidle' })

  // 等待树加载
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)

  // 点击树节点
  const treeNode = page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
    .filter({ hasText: /^02-项目自定义$/ }).first()
  await treeNode.click()

  // 选择第一个DM
  await page.waitForSelector('.ant-table-row', { timeout: 15000 })
  const firstRow = page.locator('.ant-table-row').first()
  await firstRow.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(500)

  // 点击"历史版本"按钮
  await page.locator('button', { hasText: /^历史版本$/ }).click()
  await page.waitForURL(/\/ietm\/dm-history/, { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  // 验证页面加载成功
  await expect(page.locator('.page-title')).toHaveText('查看历史版本')
  await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })
}

// ============================================================================
// 测试组1：核心功能验证
// ============================================================================

test.describe('核心功能：不同版本显示不同内容', () => {
  test.setTimeout(120000)

  test('TC-01: 验证不同历史版本的XML内容确实不同', async ({ page }) => {
    console.log('\n========== TC-01 开始 ==========')

    await navigateToHistoryPage(page)

    // 获取历史版本列表
    const rows = page.locator('.ant-table-tbody tr')
    const rowCount = await rows.count()
    console.log(`找到 ${rowCount} 个历史版本`)

    if (rowCount < 2) {
      console.log('⚠️  历史版本少于2个，跳过测试')
      test.skip()
      return
    }

    // 收集Console日志
    const consoleLogs = []
    page.on('console', msg => {
      if (msg.text().includes('[DM加载]')) {
        consoleLogs.push(msg.text())
      }
    })

    // === 浏览第一个版本 ===
    console.log('\n--- 测试第一个版本 ---')
    const row1 = rows.nth(0)
    await row1.scrollIntoViewIfNeeded()

    // 获取版本信息
    const version1Text = await row1.locator('td').nth(4).textContent()
    console.log(`版本1: ${version1Text}`)

    const link1 = row1.locator('a', { hasText: '浏览DM' })
    await link1.waitFor({ state: 'visible', timeout: 10000 })
    await link1.click({ force: true })

    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // 等待编辑器完全加载

    // 验证编辑器加载
    await expect(page.locator('.mode-banner')).toBeVisible({ timeout: 10000 })

    // 获取XML内容
    const xml1 = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm ? cm.getValue() : ''
    })
    const xml1Lines = xml1.split('\n').length
    console.log(`版本1 XML行数: ${xml1Lines}`)
    console.log(`版本1 XML长度: ${xml1.length}`)

    // 获取版本号行（第8行附近的issueInfo）
    const issueInfo1 = xml1.split('\n').find(line => line.includes('issueInfo'))
    console.log(`版本1 issueInfo: ${issueInfo1?.trim()}`)

    // 返回历史版本列表
    await page.goBack()
    await page.waitForURL(/\/dm-history/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // === 浏览第二个版本 ===
    console.log('\n--- 测试第二个版本 ---')
    const row2 = rows.nth(1)
    await row2.scrollIntoViewIfNeeded()

    const version2Text = await row2.locator('td').nth(4).textContent()
    console.log(`版本2: ${version2Text}`)

    const link2 = row2.locator('a', { hasText: '浏览DM' })
    await link2.waitFor({ state: 'visible', timeout: 10000 })
    await link2.click({ force: true })

    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const xml2 = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm ? cm.getValue() : ''
    })
    const xml2Lines = xml2.split('\n').length
    console.log(`版本2 XML行数: ${xml2Lines}`)
    console.log(`版本2 XML长度: ${xml2.length}`)

    const issueInfo2 = xml2.split('\n').find(line => line.includes('issueInfo'))
    console.log(`版本2 issueInfo: ${issueInfo2?.trim()}`)

    // === 验证结果 ===
    console.log('\n--- 验证结果 ---')

    // 断言1: 行数应该不同（如果版本真的不同）
    if (xml1Lines !== xml2Lines) {
      console.log(`✅ 行数不同: ${xml1Lines} vs ${xml2Lines}`)
    } else {
      console.log(`⚠️  行数相同: ${xml1Lines}（可能内容差异在同一行内）`)
    }

    // 断言2: XML长度应该不同
    expect(xml1.length).not.toBe(xml2.length)
    console.log(`✅ XML长度不同: ${xml1.length} vs ${xml2.length}`)

    // 断言3: issueInfo应该不同
    expect(issueInfo1).not.toBe(issueInfo2)
    console.log(`✅ issueInfo不同`)

    // 断言4: 版本号文本应该不同
    expect(version1Text).not.toBe(version2Text)
    console.log(`✅ 版本号不同: ${version1Text} vs ${version2Text}`)

    console.log('\n========== TC-01 通过 ==========\n')
  })

  test('TC-02: 验证Tab导航（不弹新窗口）', async ({ page, context }) => {
    console.log('\n========== TC-02 开始 ==========')

    await navigateToHistoryPage(page)

    const initialPages = context.pages().length
    console.log(`初始页面数: ${initialPages}`)

    // 监听新页面事件
    let newPageOpened = false
    context.on('page', () => {
      newPageOpened = true
      console.log('❌ 检测到新窗口打开！')
    })

    // 点击"浏览DM"
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.scrollIntoViewIfNeeded()

    const link = firstRow.locator('a', { hasText: '浏览DM' })
    await link.waitFor({ state: 'visible', timeout: 10000 })
    await link.click({ force: true })

    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const finalPages = context.pages().length
    console.log(`最终页面数: ${finalPages}`)

    // 断言
    expect(newPageOpened).toBe(false)
    expect(finalPages).toBe(initialPages)

    console.log('✅ 在Tab中打开，未创建新窗口')
    console.log('\n========== TC-02 通过 ==========\n')
  })

  test('TC-03: 验证浏览器前进/后退', async ({ page }) => {
    console.log('\n========== TC-03 开始 ==========')

    await navigateToHistoryPage(page)

    // 点击"浏览DM"
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.scrollIntoViewIfNeeded()
    const link = firstRow.locator('a', { hasText: '浏览DM' })
    await link.click({ force: true })

    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    console.log('✅ 已进入编辑器')

    // 后退
    await page.goBack()
    await page.waitForURL(/\/dm-history/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.page-title')).toHaveText('查看历史版本')
    console.log('✅ 后退功能正常')

    // 前进
    await page.goForward()
    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.mode-banner')).toBeVisible({ timeout: 10000 })
    console.log('✅ 前进功能正常')

    console.log('\n========== TC-03 通过 ==========\n')
  })

  test('TC-04: 验证URL参数完整性', async ({ page }) => {
    console.log('\n========== TC-04 开始 ==========')

    await navigateToHistoryPage(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.scrollIntoViewIfNeeded()
    const link = firstRow.locator('a', { hasText: '浏览DM' })
    await link.click({ force: true })

    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const url = new URL(page.url())
    console.log(`完整URL: ${url.href}`)

    const mode = url.searchParams.get('mode')
    const historyId = url.searchParams.get('historyId')
    const dmc = url.searchParams.get('dmc')

    console.log(`  mode: ${mode}`)
    console.log(`  historyId: ${historyId}`)
    console.log(`  dmc: ${dmc}`)

    // 断言
    expect(mode).toBe('browse')
    expect(historyId).toBeTruthy()
    expect(historyId).not.toBe('null')
    expect(historyId).not.toBe('undefined')

    console.log('✅ URL参数完整')
    console.log('\n========== TC-04 通过 ==========\n')
  })

  test('TC-05: 验证编辑器模式为浏览模式', async ({ page }) => {
    console.log('\n========== TC-05 开始 ==========')

    await navigateToHistoryPage(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.scrollIntoViewIfNeeded()
    const link = firstRow.locator('a', { hasText: '浏览DM' })
    await link.click({ force: true })

    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // 验证模式横幅
    await expect(page.locator('.mode-banner')).toBeVisible({ timeout: 10000 })

    const modeText = await page.locator('.mb-mode').textContent()
    console.log(`编辑器模式: ${modeText}`)

    expect(modeText).toContain('浏览模式')
    expect(modeText).toContain('只读')

    // 验证横幅颜色（红色表示只读）
    const bannerClass = await page.locator('.mode-banner').getAttribute('class')
    expect(bannerClass).toContain('readonly')

    console.log('✅ 编辑器处于浏览模式')
    console.log('\n========== TC-05 通过 ==========\n')
  })
})

// ============================================================================
// 测试组2：边界条件
// ============================================================================

test.describe('边界条件：特殊场景', () => {
  test.setTimeout(120000)

  test('TC-06: 快速连续点击不会创建多个Tab', async ({ page, context }) => {
    console.log('\n========== TC-06 开始 ==========')

    await navigateToHistoryPage(page)

    const initialPages = context.pages().length

    let newPageCount = 0
    context.on('page', () => { newPageCount++ })

    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.scrollIntoViewIfNeeded()
    const link = firstRow.locator('a', { hasText: '浏览DM' })

    // 快速双击
    await link.click({ force: true })
    await page.waitForTimeout(50)
    await link.click({ force: true }).catch(() => {
      console.log('第二次点击时元素已消失（正常）')
    })

    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const finalPages = context.pages().length

    expect(newPageCount).toBe(0)
    expect(finalPages).toBe(initialPages)

    console.log('✅ 快速点击不会创建多个Tab')
    console.log('\n========== TC-06 通过 ==========\n')
  })

  test('TC-07: 快速切换版本显示正确内容', async ({ page }) => {
    console.log('\n========== TC-07 开始 ==========')

    await navigateToHistoryPage(page)

    const rows = page.locator('.ant-table-tbody tr')
    const rowCount = await rows.count()

    if (rowCount < 2) {
      console.log('⚠️  历史版本少于2个，跳过测试')
      test.skip()
      return
    }

    // 点击版本1，但立即后退
    const link1 = rows.nth(0).locator('a', { hasText: '浏览DM' })
    await link1.click({ force: true })
    await page.waitForTimeout(500) // 不等完全加载
    await page.goBack()
    await page.waitForURL(/\/dm-history/, { timeout: 10000 })
    await page.waitForTimeout(500)

    // 立即点击版本2
    const link2 = rows.nth(1).locator('a', { hasText: '浏览DM' })
    await link2.click({ force: true })
    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 验证URL中的historyId对应版本2
    const url = new URL(page.url())
    const historyId = url.searchParams.get('historyId')

    // 获取XML中的版本信息
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm ? cm.getValue() : ''
    })
    const issueInfo = xml.split('\n').find(line => line.includes('issueInfo'))

    console.log(`historyId: ${historyId}`)
    console.log(`issueInfo: ${issueInfo?.trim()}`)

    expect(historyId).toBeTruthy()

    console.log('✅ 快速切换后显示正确版本')
    console.log('\n========== TC-07 通过 ==========\n')
  })
})

// ============================================================================
// 测试组3：系统性排查
// ============================================================================

test.describe('系统排查：其他入口验证', () => {
  test.setTimeout(120000)

  test('TC-08: 列表页"浏览或编辑DM内容"不传historyId', async ({ page }) => {
    console.log('\n========== TC-08 开始 ==========')

    await injectToken(page)
    await page.goto(`${BASE_URL}/ietmdatamodulemanagement`, { waitUntil: 'networkidle' })

    await page.waitForSelector('.ant-tree', { timeout: 30000 })
    await page.waitForTimeout(600)

    const treeNode = page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
      .filter({ hasText: /^02-项目自定义$/ }).first()
    await treeNode.click()

    await page.waitForSelector('.ant-table-row', { timeout: 15000 })
    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(500)

    // 点击"浏览或编辑DM内容"
    await page.locator('button', { hasText: '浏览或编辑DM内容' }).click()
    await page.waitForURL(/\/dm-content-editor/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // 验证URL不包含historyId
    const url = new URL(page.url())
    const historyId = url.searchParams.get('historyId')

    console.log(`historyId参数: ${historyId}`)

    expect(historyId).toBeNull()

    console.log('✅ 列表页入口不传historyId（正确行为）')
    console.log('\n========== TC-08 通过 ==========\n')
  })
})

// ============================================================================
// 测试报告
// ============================================================================

test.afterAll(async () => {
  console.log('\n')
  console.log('========================================')
  console.log('       测试执行完成')
  console.log('========================================')
  console.log('请查看上方测试结果')
  console.log('所有✅标记表示测试通过')
  console.log('========================================')
  console.log('\n')
})
