const { test, expect } = require('@playwright/test')
const http = require('http')

// 错误处理专项测试
// 验证所有 API 调用都有 catch 错误处理
// 覆盖：网络错误、后端异常、权限问题、数据错误

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

test.describe('API 错误处理 - 编辑器主组件', () => {
  test('1) 加载 API 网络错误 → 提示明确，不崩溃', async ({ page }) => {
    await page.addInitScript(tok => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, TOKEN)

    await page.route(`**/dm-content/load/${DM_ID}`, route => route.abort('failed'))

    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
    await page.waitForTimeout(3000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/加载失败|网络错误/)
  })

  test('2) 保存 API 网络错误 → catch 捕获，提示明确', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue(
        document.querySelector('.CodeMirror').CodeMirror.getValue() + '\n<!-- test -->'
      )
    })
    await page.waitForTimeout(500)

    await page.route(`**/dm-content/save/${DM_ID}`, route => route.abort('failed'))

    await page.locator('button', { hasText: '保存' }).click()
    await page.waitForTimeout(2000)

    // 验证 catch 捕获，显示错误提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toBeVisible()
  })

  test('3) 校验 API 网络错误 → catch 捕获，validating 恢复', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.route('**/dm-content/validate', route => route.abort('failed'))

    await page.locator('button[title="XSD校验"]').click()
    await page.waitForTimeout(2000)

    // 验证 validating 状态恢复为 false
    const validating = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.validating
    })
    expect(validating).toBe(false)
  })

  test('4) 签入 API 网络错误 → catch 捕获，提示"签入失败：网络错误"', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue(
        document.querySelector('.CodeMirror').CodeMirror.getValue() + '\n<!-- test -->'
      )
    })
    await page.waitForTimeout(500)

    await page.route(`**/datamodule/checkIn*`, route => route.abort('failed'))

    await page.locator('button', { hasText: '签入' }).click()
    await page.waitForTimeout(500)
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(3000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/签入失败|网络错误/)
  })

  test('5) 预览 API 网络错误 → catch 捕获，previewing 恢复', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.route('**/dm-content/preview', route => route.abort('failed'))

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证 previewing 状态恢复
    const previewing = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.previewing
    })
    expect(previewing).toBe(false)

    // 验证错误提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/预览失败/)
  })
})

test.describe('API 错误处理 - 引用 DM 弹窗', () => {
  test('6) DM 列表查询网络错误 → catch 捕获，loading 恢复', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 打开引用 DM 弹窗
    await page.locator('button[title="引用DM"]').click()
    await page.waitForTimeout(1000)

    // 拦截查询请求
    await page.route('**/datamodule/listForDialog', route => route.abort('failed'))

    // 选择树节点触发查询
    const treeNode = page.locator('.dm-ref-tree .ant-tree-treenode').first()
    await treeNode.click()
    await page.waitForTimeout(2000)

    // 验证错误提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/查询失败|网络错误/)
  })

  test('7) 片段查询网络错误 → catch 捕获，提示明确', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.locator('button[title="引用DM"]').click()
    await page.waitForTimeout(1000)

    // 选择树节点
    const treeNode = page.locator('.dm-ref-tree .ant-tree-treenode').first()
    await treeNode.click()
    await page.waitForTimeout(2000)

    // 拦截片段查询
    await page.route('**/dm-content/getRef/**', route => route.abort('failed'))

    // 点击第一行（触发片段查询）
    const firstRow = page.locator('.ant-table-row').first()
    if (await firstRow.isVisible()) {
      await firstRow.click()
      await page.waitForTimeout(2000)

      const toast = page.locator('.ant-message-notice-content')
      await expect(toast).toContainText(/加载片段失败|网络错误/)
    }
  })

  test('8) 生成 dmRef 网络错误 → catch 捕获，confirming 恢复', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.locator('button[title="引用DM"]').click()
    await page.waitForTimeout(1000)

    const treeNode = page.locator('.dm-ref-tree .ant-tree-treenode').first()
    await treeNode.click()
    await page.waitForTimeout(2000)

    // 选择第一个 DM
    const checkbox = page.locator('.ant-table-row .ant-checkbox-input').first()
    if (await checkbox.isVisible()) {
      await checkbox.check()
      await page.waitForTimeout(500)

      // 拦截生成请求
      await page.route('**/dm-content/buildDmRef', route => route.abort('failed'))

      await page.locator('.ant-modal-footer button[type="button"]').filter({ hasText: '确定' }).click()
      await page.waitForTimeout(2000)

      const toast = page.locator('.ant-message-notice-content')
      await expect(toast).toContainText(/生成dmRef失败|网络错误/)
    }
  })
})

test.describe('API 错误处理 - HTTP 状态码', () => {
  test('9) 401 未授权 → 提示权限错误', async ({ page }) => {
    await page.addInitScript(tok => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, TOKEN)

    await page.route(`**/dm-content/load/${DM_ID}`, route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: '未授权' })
      })
    })

    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
    await page.waitForTimeout(3000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toBeVisible()
  })

  test('10) 403 禁止访问 → catch 捕获', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue(
        document.querySelector('.CodeMirror').CodeMirror.getValue() + '\n<!-- test -->'
      )
    })
    await page.waitForTimeout(500)

    await page.route(`**/dm-content/save/${DM_ID}`, route => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: '无权限' })
      })
    })

    await page.locator('button', { hasText: '保存' }).click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toBeVisible()
  })

  test('11) 500 服务器错误 → catch 捕获', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: '服务器内部错误' })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toBeVisible()
  })

  test('12) 504 网关超时 → catch 捕获', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.route('**/dm-content/validate', route => {
      route.fulfill({ status: 504, body: 'Gateway Timeout' })
    })

    await page.locator('button[title="XSD校验"]').click()
    await page.waitForTimeout(2000)

    const validating = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.validating
    })
    expect(validating).toBe(false)
  })
})

test.describe('错误恢复机制', () => {
  test('13) API 失败后重试成功 → 功能正常', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue(
        document.querySelector('.CodeMirror').CodeMirror.getValue() + '\n<!-- test -->'
      )
    })
    await page.waitForTimeout(500)

    let callCount = 0
    await page.route(`**/dm-content/save/${DM_ID}`, route => {
      callCount++
      if (callCount === 1) {
        // 第一次失败
        route.abort('failed')
      } else {
        // 第二次成功
        route.continue()
      }
    })

    // 第一次保存（失败）
    await page.locator('button', { hasText: '保存' }).click()
    await page.waitForTimeout(2000)

    // 第二次保存（成功）
    await page.locator('button', { hasText: '保存' }).click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/保存成功/)
  })

  test('14) 多次网络错误不累积状态 → loading 状态正确', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.route('**/dm-content/preview', route => route.abort('failed'))

    // 连续点击预览 3 次
    for (let i = 0; i < 3; i++) {
      await page.locator('button[title="生成HTML预览"]').click()
      await page.waitForTimeout(1500)
    }

    // 验证 previewing 状态最终恢复为 false
    const previewing = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.previewing
    })
    expect(previewing).toBe(false)
  })
})
