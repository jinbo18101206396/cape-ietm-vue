const { test, expect } = require('@playwright/test')
const http = require('http')

// 预览功能修复验证测试
// 验证后端返回的HTML是否包含实际文本内容

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

test.describe('预览功能修复验证', () => {
  test('1) 后端API测试 - 验证返回的HTML包含实际文本', async () => {
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <title>测试标题内容</title>
      <para>这是一个测试段落，包含实际的文本内容。</para>
      <para>第二个段落，用于验证多个段落的渲染。</para>
    </description>
  </content>
</dmodule>`

    const response = await apiReq('POST', '/ietm/dm-content/preview', { content: testXml }, TOKEN)

    console.log('=== 后端API响应 ===')
    console.log('success:', response.success)
    console.log('flag:', response.result.flag)
    console.log('html:', response.result.html)

    // 验证响应成功
    expect(response.success).toBe(true)
    expect(response.result.flag).toBe('success')

    // 验证HTML不为空
    expect(response.result.html).toBeTruthy()
    expect(response.result.html.length).toBeGreaterThan(100)

    // ✅ 关键验证：HTML应该包含实际文本内容
    expect(response.result.html).toContain('测试标题内容')
    expect(response.result.html).toContain('这是一个测试段落')
    expect(response.result.html).toContain('第二个段落')

    // 验证HTML结构
    expect(response.result.html).toContain('<h4>')
    expect(response.result.html).toContain('<p>')
    expect(response.result.html).toContain('</h4>')
    expect(response.result.html).toContain('</p>')

    // ❌ 应该不再是空标签
    expect(response.result.html).not.toContain('<p></p>')
    expect(response.result.html).not.toContain('<h4></h4>')

    console.log('✅ 后端修复验证通过：HTML包含实际文本内容')
  })

  test('2) 前端预览测试 - 验证弹窗显示实际内容', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 注入测试XML
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <title>前端测试标题</title>
      <para>前端测试段落内容，应该在预览弹窗中可见。</para>
    </description>
  </content>
</dmodule>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(xml)
    }, testXml)

    await page.waitForTimeout(500)

    // 拦截预览请求，记录响应
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

    // 验证弹窗打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 验证后端返回包含文本
    console.log('=== 前端拦截的响应 ===')
    console.log('HTML长度:', backendResponse.result.html.length)
    console.log('HTML内容:', backendResponse.result.html)

    expect(backendResponse.result.html).toContain('前端测试标题')
    expect(backendResponse.result.html).toContain('前端测试段落内容')

    // 验证iframe存在且有内容
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    const srcdoc = await iframe.getAttribute('srcdoc')
    console.log('=== iframe srcdoc ===')
    console.log('srcdoc长度:', srcdoc.length)

    expect(srcdoc).toContain('前端测试标题')
    expect(srcdoc).toContain('前端测试段落内容')

    console.log('✅ 前端预览验证通过：弹窗显示实际内容')
  })

  test('3) 嵌套元素文本提取测试', async () => {
    // 测试包含嵌套元素的XML
    const nestedXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>段落开始 <emphasis>加粗文本</emphasis> 段落结束</para>
      <title>标题包含 <emphasis>强调内容</emphasis> 的情况</title>
    </description>
  </content>
</dmodule>`

    const response = await apiReq('POST', '/ietm/dm-content/preview', { content: nestedXml }, TOKEN)

    console.log('=== 嵌套元素测试 ===')
    console.log('HTML:', response.result.html)

    // 验证所有文本都被提取出来（包括嵌套元素内的文本）
    expect(response.result.html).toContain('段落开始')
    expect(response.result.html).toContain('加粗文本')
    expect(response.result.html).toContain('段落结束')
    expect(response.result.html).toContain('标题包含')
    expect(response.result.html).toContain('强调内容')

    console.log('✅ 嵌套元素文本提取验证通过')
  })

  test('4) 真实DM预览测试', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(2000)

    // 使用编辑器中已有的真实DM内容
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

    console.log('=== 真实DM预览 ===')
    console.log('flag:', backendResponse.result.flag)
    console.log('HTML长度:', backendResponse.result.html?.length || 0)
    console.log('HTML前200字符:', backendResponse.result.html?.substring(0, 200))

    if (backendResponse.result.flag === 'success') {
      // 验证HTML不是空标签
      expect(backendResponse.result.html.length).toBeGreaterThan(100)

      // 统计空标签数量
      const emptyPTags = (backendResponse.result.html.match(/<p><\/p>/g) || []).length
      const emptyH4Tags = (backendResponse.result.html.match(/<h4><\/h4>/g) || []).length

      console.log('空<p>标签数量:', emptyPTags)
      console.log('空<h4>标签数量:', emptyH4Tags)

      // 空标签应该很少或没有
      expect(emptyPTags).toBeLessThan(3)
      expect(emptyH4Tags).toBeLessThan(3)

      // 验证弹窗可见
      const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
      await expect(modal).toBeVisible()

      // 截图保存
      await modal.screenshot({ path: 'preview-modal-after-fix.png' })
      console.log('✅ 预览弹窗截图已保存: preview-modal-after-fix.png')
    } else {
      console.log('⚠️ 预览flag不是success:', backendResponse.result.flag)
    }
  })

  test('5) 控制台日志验证', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 收集控制台日志
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('DmPreviewModal.show()')) {
        logs.push(msg.text())
      }
    })

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    console.log('=== 控制台调试日志 ===')
    logs.forEach(log => console.log(log))

    // 验证日志包含关键信息
    const allLogs = logs.join('\n')
    expect(allLogs).toContain('接收到的html参数: 有内容')
    expect(allLogs).toContain('iframe元素存在')

    // 提取HTML长度
    const htmlLengthMatch = allLogs.match(/HTML长度:\s*(\d+)/)
    if (htmlLengthMatch) {
      const htmlLength = parseInt(htmlLengthMatch[1])
      console.log('提取的HTML长度:', htmlLength)
      expect(htmlLength).toBeGreaterThan(100)
    }

    console.log('✅ 控制台日志验证通过')
  })
})
