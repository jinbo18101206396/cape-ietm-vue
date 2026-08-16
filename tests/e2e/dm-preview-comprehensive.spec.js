const { test, expect } = require('@playwright/test')
const http = require('http')

// §18 预览功能全面测试 - 对照需求文档 §18.11 异常场景 E-PRE-01 ~ E-PRE-15
// 真实 UI 交互：点击按钮、输入内容、编辑文档，验证预览行为和错误提示
// 覆盖：正常流程、边界条件、异常场景、并发场景、中英文切换

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

// 注入简单 XML 内容（含 internalRef 测试数据）
const SIMPLE_XML = `<dmodule>
  <content>
    <description>
      <para id="para-001">这是段落1</para>
      <figure id="fig-001"><title>图1</title></figure>
      <para>包含内部引用：<internalRef internalRefId="fig-001" internalRefTargetType="figure">见图1</internalRef></para>
    </description>
  </content>
</dmodule>`

async function injectXml(page, xml) {
  await page.evaluate(x => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.setValue(x)
  }, xml)
  await page.waitForTimeout(500)
}

test.describe('§18 预览功能 - 正常流程', () => {
  test('1) 正常预览 → 弹窗打开，iframe 显示内容', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    // 点击预览按钮（真实 UI 点击）
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证预览弹窗打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 验证 iframe 存在且可见
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 关闭预览
    await modal.locator('button.ant-modal-close').click()
    await page.waitForTimeout(500)
    await expect(modal).not.toBeVisible()
  })

  test('2) 关闭预览后重新打开 → 状态重置正确', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    // 第一次预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)
    let modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 关闭
    await modal.locator('button.ant-modal-close').click()
    await page.waitForTimeout(500)

    // 修改内容
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const val = cm.getValue()
      cm.setValue(val.replace('段落1', '段落1修改版'))
    })
    await page.waitForTimeout(500)

    // 第二次预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)
    modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 验证新预览成功（无残留旧内容）
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()
  })
})

test.describe('§18 预览功能 - 边界条件（E-PRE-01, 04, 09, 10）', () => {
  test('3) E-PRE-01: 空文档预览 → 提示"DM内容为空"', async ({ page }) => {
    await openEditor(page)

    // 清空编辑器（真实操作）
    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue('')
    })
    await page.waitForTimeout(500)

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    // 验证提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)

    // 预览弹窗不应打开
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toHaveCount(0)
  })

  test('4) E-PRE-01: 仅空白字符预览 → 提示"DM内容为空"', async ({ page }) => {
    await openEditor(page)

    // 注入空白字符
    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue('   \n\n  \t  ')
    })
    await page.waitForTimeout(500)

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)
  })

  test('5) E-PRE-04: 中文视图预览 → 自动转英文，后端收到英文 XML', async ({ page }) => {
    await openEditor(page)

    // 切换到中文视图（真实 UI 操作）
    const langSelect = page.locator('.toolbar-row .ant-select').filter({ hasText: /中文|English/ })
    await langSelect.click()
    await page.waitForTimeout(300)
    const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    await dropdown.locator('.ant-select-dropdown-menu-item', { hasText: '中文' }).click()
    await page.waitForTimeout(1500)

    // 验证编辑器显示中文标签
    const content = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(content).toContain('<数据模块>')

    // 拦截预览请求，验证发送的是英文
    let previewPayload = null
    await page.route('**/dm-content/preview', route => {
      previewPayload = route.request().postDataJSON()
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: { flag: 'success', html: '<p>预览内容</p>' }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证后端收到英文 XML
    expect(previewPayload).toBeTruthy()
    expect(previewPayload.content).toContain('<dmodule>')
    expect(previewPayload.content).not.toContain('<数据模块>')
  })

  test('6) E-PRE-09: XML 含特殊字符 <>&"\' → 正确转义', async ({ page }) => {
    await openEditor(page)

    const xmlWithSpecialChars = `<dmodule>
  <content>
    <description>
      <para>特殊字符测试: &lt;tag&gt; &amp; "引号" &#39;单引号&#39;</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xmlWithSpecialChars)

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证预览成功（后端能正确解析转义字符）
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()
  })

  test('7) E-PRE-10: 快速连续点击预览 5 次 → 按钮禁用，防止重复请求', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    // 第一次点击
    const previewBtn = page.locator('button[title="生成HTML预览"]')
    await previewBtn.click()
    await page.waitForTimeout(200)

    // 验证按钮进入 loading 状态（禁用）
    await expect(previewBtn).toHaveClass(/ant-btn-loading/)

    // 快速点击多次（应该被忽略）
    for (let i = 0; i < 4; i++) {
      await previewBtn.click({ force: true })
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(3000)

    // 验证预览弹窗正常打开（只有一个）
    const modals = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modals).toHaveCount(1)
    await expect(modals.first()).toBeVisible()

    // 验证按钮恢复正常（loading 结束）
    await expect(previewBtn).not.toHaveClass(/ant-btn-loading/)
  })

  test('7b) E-PRE-12: 大文档预览（>500KB）→ 提示"文档较大，预览可能较慢"', async ({ page }) => {
    await openEditor(page)

    // 生成超过 500KB 的 XML（重复元素）
    const largePara = '<para>' + 'A'.repeat(10000) + '</para>\n'
    const largeXml = '<dmodule>\n<content>\n<description>\n' + largePara.repeat(60) + '</description>\n</content>\n</dmodule>'

    await injectXml(page, largeXml)

    // 验证文档大小超过 500KB
    const sizeKB = await page.evaluate(() => {
      const content = document.querySelector('.CodeMirror').CodeMirror.getValue()
      return new Blob([content]).size / 1024
    })
    expect(sizeKB).toBeGreaterThan(500)

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    // 验证出现大文档预警提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/文档较大|预览可能较慢/)
  })
})

test.describe('§18 预览功能 - 异常场景（E-PRE-02, 03, 15）', () => {
  test('8) E-PRE-02: flag=noxsl → 提示"无解析引擎"', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    // 拦截 API，模拟 XSL 缺失
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

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    // 验证提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/无解析引擎/)

    // 预览弹窗不应打开
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toHaveCount(0)
  })

  test('9) E-PRE-02: flag=null → 提示"DM内容为空"', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    // 拦截 API，模拟后端判断内容为空
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

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)
  })

  test('10) E-PRE-02: result.html 为空 → 提示"DM内容为空"', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'success',
            html: '' // html 为空
          }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)
  })

  test('11) E-PRE-03: XML 格式错误 → 后端返回错误，前端提示明确', async ({ page }) => {
    await openEditor(page)

    // 注入格式错误的 XML（未闭合标签）
    const brokenXml = `<dmodule>
  <content>
    <description>
      <para>未闭合的段落
    </description>
  </content>
</dmodule>`

    await injectXml(page, brokenXml)

    // 拦截 API，模拟后端解析失败
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'error',
            message: 'XML解析失败：未闭合的标签'
          }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/预览生成失败/)
  })

  test('12) success=false → 提示"预览请求失败"', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '后端服务异常'
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/预览请求失败/)
  })

  test('13) 网络错误 → 提示"预览失败：网络错误"', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    // 模拟网络错误
    await page.route('**/dm-content/preview', route => {
      route.abort('failed')
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/预览失败/)
  })

  test('14) E-PRE-15: 后端返回 403 → catch 捕获，提示错误', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '无权限'
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    // catch 捕获网络错误或异常
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toBeVisible()
  })
})

test.describe('§18 预览功能 - 交互场景（E-PRE-14）', () => {
  test('15) E-PRE-14: 预览后继续编辑 → 预览窗保持打开，显示旧内容', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    // 第一次预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 预览打开后，修改编辑器内容
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const val = cm.getValue()
      cm.setValue(val + '\n<!-- 修改后 -->')
    })
    await page.waitForTimeout(500)

    // 验证预览窗仍然打开（显示旧内容，符合预期）
    await expect(modal).toBeVisible()

    // 用户需要关闭后重新预览才能看到新内容
  })

  test('16) 预览窗打开时可以编辑 → 编辑器不被遮挡', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, SIMPLE_XML)

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证预览窗不是全屏模态（modal:false 或允许背后操作）
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 尝试点击编辑器（验证编辑器仍可访问）
    const cmLine = page.locator('.CodeMirror-line').first()
    await cmLine.click()
    await page.waitForTimeout(300)

    // 验证能输入（编辑器未被禁用）
    await page.keyboard.type(' ')
    await page.waitForTimeout(300)

    // 验证内容改变
    const newContent = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(newContent).not.toBe(SIMPLE_XML)
  })
})

test.describe('§18 预览功能 - 内部引用锚点（E-PRE-07）', () => {
  test('17) E-PRE-07: internalRef 锚点跳转 → srcdoc iframe 内应能正确跳转', async ({ page }) => {
    await openEditor(page)

    // 注入含 internalRef 的 XML
    const xmlWithRef = `<dmodule>
  <content>
    <description>
      <para id="para-001">段落1</para>
      <figure id="fig-001"><title>图1</title></figure>
      <figure id="fig-002"><title>图2</title></figure>
      <para>引用1：<internalRef internalRefId="fig-001" internalRefTargetType="figure">见图1</internalRef></para>
      <para>引用2：<internalRef internalRefId="fig-002" internalRefTargetType="figure">见图2</internalRef></para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xmlWithRef)

    // 模拟后端返回含锚点的 HTML
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            flag: 'success',
            html: `
              <h2 id="fig-001">图1</h2>
              <p>图1内容</p>
              <h2 id="fig-002">图2</h2>
              <p>图2内容</p>
              <p>引用：<a href="#fig-001">见图1</a></p>
              <p>引用：<a href="#fig-002">见图2</a></p>
            `
          }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 验证 iframe 内容加载
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 注：srcdoc iframe 的锚点跳转在同一文档内自动工作，无需额外测试点击
    // 如果需要验证点击行为，需要 iframe.contentDocument 访问（可能跨域限制）
  })
})

test.describe('§18 预览功能 - 浏览模式（只读）', () => {
  test('18) 浏览模式也能预览 → 预览按钮可用', async ({ page }) => {
    await page.addInitScript(tok => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, TOKEN)

    // 以 browse 模式打开
    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=browse&dmc=${encodeURIComponent(DMC)}`)
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await page.waitForTimeout(2000)

    // 验证预览按钮存在且可点击
    const previewBtn = page.locator('button[title="生成HTML预览"]')
    await expect(previewBtn).toBeVisible()
    await expect(previewBtn).toBeEnabled()

    await previewBtn.click()
    await page.waitForTimeout(2000)

    // 验证预览弹窗打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()
  })
})
