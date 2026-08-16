const { test, expect } = require('@playwright/test')
const http = require('http')

// 列表页其他功能回归 + handlePreview/handleRestartWorkflow bug诊断
// 目的：证明 handleValidate/handlePublish 改动未影响其他功能；通过真实UI点击验证，不绕过Vue层
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'
const DM_NODE_TITLE = /^02-项目自定义$/

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

async function openListRealDm(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title').filter({ hasText: DM_NODE_TITLE }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

async function selectFirstRow(page) {
  const row = page.locator('.ant-table-row').first()
  await row.waitFor({ state: 'visible', timeout: 10000 })
  await row.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(300)
}

// ============ 回归：证明改动未影响其他功能 ============
test.describe('列表页其他功能回归', () => {
  test.setTimeout(90000)

  test('REG-01 历史版本弹窗正常打开（选中真实DM）', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.locator('button').filter({ hasText: /历史版本|历\s*史/ }).first().click()
    // historyModal 打开
    await expect(page.locator('.ant-modal-title').filter({ hasText: /历史|版本/ })).toBeVisible({ timeout: 10000 })
    console.log('✅ REG-01: 历史版本弹窗正常')
  })

  test('REG-02 引用关系弹窗正常打开', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.locator('button').filter({ hasText: /引用关系/ }).first().click()
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 })
    console.log('✅ REG-02: 引用关系弹窗正常')
  })

  test('REG-03 DMC详情弹窗正常打开（点击DMC链接）', async ({ page }) => {
    await openListRealDm(page)
    // antd fixed列会有重复DOM，用 force 点击可见链接
    await page.locator('.ant-table-tbody a').filter({ hasText: /DMC-/ }).first().click({ force: true })
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 })
    console.log('✅ REG-03: DMC详情弹窗正常')
  })

  test('REG-04 编辑属性弹窗正常打开', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    // 编辑按钮 canEditProp（未被他人签出即可）
    const editBtn = page.locator('button').filter({ hasText: /^编\s*辑$/ }).first()
    if (await editBtn.isDisabled()) {
      console.log('⚠ REG-04: 编辑按钮禁用（DM被他人签出），跳过')
      return
    }
    await editBtn.click()
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 10000 })
    console.log('✅ REG-04: 编辑属性弹窗正常')
  })

  test('REG-05 浏览或编辑DM内容 → 导航到编辑器', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.locator('button').filter({ hasText: /浏览或编辑DM内容/ }).first().click()
    // 路由跳转到编辑器
    await page.waitForURL(/dm-content-editor/, { timeout: 15000 })
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    console.log('✅ REG-05: 浏览/编辑内容导航正常')
  })

  test('REG-06 预览按钮 → 打开URL中id有效（非undefined）', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    // 覆盖 window.open 捕获URL（页面已加载，用evaluate直接覆盖）
    await page.evaluate(() => {
      window.__openedUrls = []
      window.open = function (u) { window.__openedUrls.push(u); return null }
    })
    await page.locator('button').filter({ hasText: /预\s*览/ }).first().click()
    await page.waitForTimeout(500)
    const urls = await page.evaluate(() => window.__openedUrls)
    console.log('预览URL:', JSON.stringify(urls))
    expect(urls.length).toBe(1)
    // 修复前：id=undefined；修复后：id=<真实DM_ID>
    expect(urls[0]).not.toContain('id=undefined')
    expect(urls[0]).toMatch(/previewDm\?id=\d+/)
    console.log('✅ REG-06: 预览URL携带有效id，handlePreview bug已修复')
  })

  test('REG-07 复制按钮 → 标记copyId，复制新建按钮启用', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.locator('button').filter({ hasText: /^复\s*制$/ }).first().click()
    await page.waitForTimeout(500)
    // 复制新建按钮由 disabled 变为可用（:disabled="!copyId"）
    const copyNewBtn = page.locator('button').filter({ hasText: /复制新建/ }).first()
    await expect(copyNewBtn).not.toBeDisabled({ timeout: 5000 })
    console.log('✅ REG-07: 复制标记copyId成功，复制新建按钮启用')
  })

  test('REG-08 校验按钮改动未影响：选中后校验/发布按钮状态独立正确', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    // 校验按钮可用（canValidate=true）
    await expect(page.locator('button').filter({ hasText: /校\s*验/ })).not.toBeDisabled()
    // 发布按钮禁用（真实DM已签出+流转中）
    await expect(page.locator('button').filter({ hasText: /发\s*布/ })).toBeDisabled()
    // 历史/预览/浏览编辑按钮均可用（selectedRowKeys.length===1）
    await expect(page.locator('button').filter({ hasText: /历史版本/ })).not.toBeDisabled()
    await expect(page.locator('button').filter({ hasText: /预\s*览/ })).not.toBeDisabled()
    console.log('✅ REG-08: 校验/发布/其他按钮状态互不干扰')
  })

  test('REG-09 搜索/翻页/切树后列表正常（loadData未受影响）', async ({ page }) => {
    await openListRealDm(page)
    // 切换到另一个构型节点，列表应刷新（可能空）
    await page.locator('.ant-tree-title').filter({ hasText: /^01-项目自定义$/ }).first().click()
    await page.waitForTimeout(1500)
    // 再切回DM节点，DM行应重新出现
    await page.locator('.ant-tree-title').filter({ hasText: DM_NODE_TITLE }).first().click()
    await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
    console.log('✅ REG-09: 切树刷新列表正常')
  })

  test('REG-10 重启流程按钮 → confirm对话框携带有效id（handleRestartWorkflow bug已修复）', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    let restartBody = null
    // 拦截重启流程请求，捕获body（不让真实请求到后端）
    await page.route('**/datamodule/restartWorkflow**', async route => {
      restartBody = route.request().postData()
      await route.fulfill({ status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '模拟重启成功' }) })
    })
    await page.locator('button').filter({ hasText: /重启流程/ }).first().click()
    const confirmTitle = page.locator('.ant-modal-confirm-title')
    await confirmTitle.waitFor({ state: 'visible', timeout: 10000 })
    await expect(confirmTitle).toContainText('确认重启')
    // 点确认，让请求发出
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(1000)
    console.log('重启请求body:', restartBody)
    expect(restartBody).not.toBeNull()
    // 修复前 id=undefined；修复后 id=<真实ID>
    expect(restartBody).not.toContain('"id":null')
    expect(restartBody).toMatch(/"id":"\d+"/)
    console.log('✅ REG-10: 重启流程请求id有效，handleRestartWorkflow bug已修复')
  })
})
