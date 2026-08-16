const { test, expect } = require('@playwright/test')
const http = require('http')

// 预览弹窗为空白问题排查
// 可能原因：
// 1. 后端返回的 HTML 为空
// 2. sandbox 属性阻止了渲染
// 3. srcdoc 构建有问题
// 4. CSS 样式问题导致内容不可见

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
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    if (!cm || !cm.CodeMirror) return false
    const el = document.querySelector('.dm-editor-page')
    return !!(el && el.__vue__)
  }, { timeout: 30000 })
}

test.describe('预览弹窗空白问题排查', () => {
  test('1) 检查后端返回的 HTML 内容', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 拦截预览请求，记录后端返回
    let backendResponse = null
    await page.route('**/dm-content/preview', async route => {
      const response = await route.fetch()
      const json = await response.json()
      backendResponse = json
      route.fulfill({ response })
    })

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 打印后端返回
    console.log('=== 后端返回 ===')
    console.log('success:', backendResponse?.success)
    console.log('flag:', backendResponse?.result?.flag)
    console.log('html length:', backendResponse?.result?.html?.length || 0)
    console.log('html preview:', backendResponse?.result?.html?.substring(0, 200))

    // 验证后端返回
    expect(backendResponse).toBeTruthy()
    expect(backendResponse.success).toBe(true)
    expect(backendResponse.result.flag).toBe('success')
    expect(backendResponse.result.html).toBeTruthy()
    expect(backendResponse.result.html.length).toBeGreaterThan(0)
  })

  test('2) 检查 iframe srcdoc 内容', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 获取 iframe
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 获取 srcdoc 属性
    const srcdoc = await iframe.getAttribute('srcdoc')
    console.log('=== iframe srcdoc ===')
    console.log('srcdoc length:', srcdoc?.length || 0)
    console.log('srcdoc preview:', srcdoc?.substring(0, 500))

    // 验证 srcdoc 不为空
    expect(srcdoc).toBeTruthy()
    expect(srcdoc.length).toBeGreaterThan(100)
    expect(srcdoc).toContain('<!DOCTYPE html>')
    expect(srcdoc).toContain('<body>')
  })

  test('3) 检查 iframe 渲染后的内容', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 等待 iframe 加载
    await page.waitForTimeout(1000)

    // 尝试访问 iframe 内容（可能受sandbox限制）
    const iframeContent = await page.evaluate(() => {
      const iframe = document.querySelector('.ant-modal iframe')
      if (!iframe) return { error: 'iframe not found' }

      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document
        return {
          hasDocument: !!doc,
          bodyHTML: doc.body?.innerHTML?.substring(0, 500),
          bodyTextContent: doc.body?.textContent?.substring(0, 200),
          childCount: doc.body?.childNodes?.length || 0
        }
      } catch (e) {
        return { error: e.message }
      }
    })

    console.log('=== iframe 内容 ===')
    console.log(JSON.stringify(iframeContent, null, 2))

    // 验证 iframe 有内容
    if (!iframeContent.error) {
      expect(iframeContent.hasDocument).toBe(true)
      expect(iframeContent.childCount).toBeGreaterThan(0)
    }
  })

  test('4) 测试简化版 HTML 预览', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 拦截预览请求，返回简单的测试 HTML
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'success',
            html: '<h1 style="color: red;">测试预览内容</h1><p>这是一个段落</p>'
          }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 检查 srcdoc
    const srcdoc = await iframe.getAttribute('srcdoc')
    console.log('=== 简化版 srcdoc ===')
    console.log(srcdoc)

    expect(srcdoc).toContain('测试预览内容')
    expect(srcdoc).toContain('这是一个段落')
  })

  test('5) 检查 sandbox 属性是否阻止渲染', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 拦截预览请求
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'success',
            html: '<div style="background: yellow; padding: 20px; font-size: 20px;">可见的黄色背景内容</div>'
          }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 获取 sandbox 属性
    const sandbox = await iframe.getAttribute('sandbox')
    console.log('=== sandbox 属性 ===')
    console.log('sandbox:', sandbox)

    // 截图查看实际渲染
    await modal.screenshot({ path: 'preview-modal-screenshot.png' })
    console.log('截图已保存: preview-modal-screenshot.png')
  })

  test('6) 检查 CSS 样式是否导致不可见', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'success',
            html: `
              <div style="width: 100%; height: 100%; background: #f0f0f0; padding: 20px; box-sizing: border-box;">
                <h1 style="color: #333; margin: 0 0 10px 0;">预览标题</h1>
                <p style="color: #666;">预览段落内容，应该清晰可见。</p>
                <div style="background: red; width: 100px; height: 100px; margin-top: 10px;">红色方块</div>
              </div>
            `
          }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 检查 iframe 的样式
    const iframeStyles = await page.evaluate(() => {
      const iframe = document.querySelector('.ant-modal iframe')
      if (!iframe) return null
      const computed = window.getComputedStyle(iframe)
      return {
        width: computed.width,
        height: computed.height,
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity
      }
    })

    console.log('=== iframe 样式 ===')
    console.log(JSON.stringify(iframeStyles, null, 2))

    expect(iframeStyles.display).not.toBe('none')
    expect(iframeStyles.visibility).not.toBe('hidden')
  })

  test('7) 对比不带 sandbox 的渲染', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 注入测试代码：移除 sandbox 属性
    await page.evaluate(() => {
      window.testRemoveSandbox = () => {
        const iframe = document.querySelector('.ant-modal iframe')
        if (iframe) {
          iframe.removeAttribute('sandbox')
          console.log('sandbox 属性已移除')
          return true
        }
        return false
      }
    })

    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'success',
            html: '<h1 style="color: blue; font-size: 30px;">测试内容（无sandbox）</h1>'
          }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    // 移除 sandbox
    const removed = await page.evaluate(() => window.testRemoveSandbox())
    console.log('sandbox 移除:', removed)

    await page.waitForTimeout(1000)

    // 截图对比
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await modal.screenshot({ path: 'preview-no-sandbox.png' })
    console.log('无sandbox截图已保存: preview-no-sandbox.png')
  })
})
