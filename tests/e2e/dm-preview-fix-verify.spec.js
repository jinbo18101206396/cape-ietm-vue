const { test, expect } = require('@playwright/test')
const http = require('http')

// §18 预览功能修复验证 - 对照需求文档检查 flag 判断逻辑
// 验证：noxsl/null/success 三种 flag 的错误提示正确性
// 关联需求：§18.11 异常场景 E-PRE-02

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(null) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
const DM_ID = '2084945965503942657'
const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
const PROJECT_ID = '2078348945532030978'

test.beforeAll(async () => {
  const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  TOKEN = login.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
})

async function openEditor(page) {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
}

test.describe('§18 预览功能修复验证', () => {
  test('1) 空文档预览 → 提示"DM内容为空"（E-PRE-01）', async ({ page }) => {
    await openEditor(page)
    // 清空编辑器
    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue('')
    })
    await page.waitForTimeout(500)

    // 点击预览按钮
    await page.locator('button', { hasText: '预览' }).click()
    await page.waitForTimeout(1000)

    // 验证提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)

    // 预览弹窗不应打开
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toHaveCount(0)
  })

  test('2) flag=success → 预览弹窗打开', async ({ page }) => {
    await openEditor(page)

    // 拦截预览 API，返回成功
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'success',
            html: '<h1>预览内容</h1><p>测试段落</p>'
          }
        })
      })
    })

    await page.locator('button', { hasText: '预览' }).click()
    await page.waitForTimeout(1500)

    // 预览弹窗应打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 验证 iframe 内容
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()
  })

  test('3) flag=noxsl → 提示"无解析引擎"（E-PRE-02 修复）', async ({ page }) => {
    await openEditor(page)

    // 拦截预览 API，返回 noxsl
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'noxsl',
            html: ''
          }
        })
      })
    })

    await page.locator('button', { hasText: '预览' }).click()
    await page.waitForTimeout(1000)

    // 验证提示包含"无解析引擎"
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/无解析引擎/)

    // 预览弹窗不应打开
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toHaveCount(0)
  })

  test('4) flag=null → 提示"DM内容为空"（E-PRE-02 修复）', async ({ page }) => {
    await openEditor(page)

    // 拦截预览 API，返回 null
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'null'
          }
        })
      })
    })

    await page.locator('button', { hasText: '预览' }).click()
    await page.waitForTimeout(1000)

    // 验证提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)

    // 预览弹窗不应打开
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toHaveCount(0)
  })

  test('5) success=false → 提示"预览请求失败"', async ({ page }) => {
    await openEditor(page)

    // 拦截预览 API，返回失败
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '后端错误'
        })
      })
    })

    await page.locator('button', { hasText: '预览' }).click()
    await page.waitForTimeout(1000)

    // 验证提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/预览请求失败/)

    // 预览弹窗不应打开
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toHaveCount(0)
  })

  test('6) 网络错误 → 提示"预览失败：网络错误"', async ({ page }) => {
    await openEditor(page)

    // 拦截预览 API，模拟网络错误
    await page.route('**/dm-content/preview', route => {
      route.abort('failed')
    })

    await page.locator('button', { hasText: '预览' }).click()
    await page.waitForTimeout(1000)

    // 验证提示包含"预览失败"
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/预览失败/)
  })

  test('7) 中文视图预览 → 自动转英文后预览', async ({ page }) => {
    await openEditor(page)

    // 切换到中文视图
    await page.evaluate(() => {
      const vue = document.querySelector('.dm-editor-page').__vue__
      if (vue.locale !== 'cn') {
        vue.onLocaleChange('cn')
      }
    })
    await page.waitForTimeout(1500)

    // 验证编辑器显示中文标签
    const content = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(content).toContain('<数据模块>')

    let previewPayload = null
    await page.route('**/dm-content/preview', route => {
      previewPayload = route.request().postDataJSON()
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: { flag: 'success', html: '<p>预览</p>' }
        })
      })
    })

    await page.locator('button', { hasText: '预览' }).click()
    await page.waitForTimeout(1500)

    // 验证发送给后端的是英文 XML
    expect(previewPayload).toBeTruthy()
    expect(previewPayload.content).toContain('<dmodule>')
    expect(previewPayload.content).not.toContain('<数据模块>')
  })
})
