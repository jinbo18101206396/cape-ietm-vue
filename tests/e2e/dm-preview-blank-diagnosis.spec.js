const { test, expect } = require('@playwright/test')
const http = require('http')

// 预览弹窗空白问题 - 彻底诊断
// 逐步验证每个环节

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

test.describe('预览弹窗空白 - 彻底诊断', () => {
  test('诊断1: 检查完整的预览流程', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(2000)

    console.log('========== 步骤1: 检查编辑器内容 ==========')
    const editorContent = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      if (!cm || !cm.CodeMirror) return { error: 'CodeMirror未初始化' }
      const content = cm.CodeMirror.getValue()
      return {
        length: content.length,
        hasContent: content.length > 0,
        preview: content.substring(0, 300),
        containsDmodule: content.includes('<dmodule'),
        containsDescription: content.includes('<description'),
        containsPara: content.includes('<para')
      }
    })
    console.log('编辑器内容:', JSON.stringify(editorContent, null, 2))

    console.log('\n========== 步骤2: 拦截预览API请求 ==========')
    let requestSent = false
    let requestBody = null
    let responseReceived = false
    let responseData = null

    await page.route('**/dm-content/preview', async route => {
      requestSent = true
      requestBody = route.request().postDataJSON()
      console.log('📤 请求发送:')
      console.log('  - content长度:', requestBody?.content?.length)
      console.log('  - content前200字符:', requestBody?.content?.substring(0, 200))

      const response = await route.fetch()
      const json = await response.json()
      responseReceived = true
      responseData = json

      console.log('📥 响应接收:')
      console.log('  - success:', json.success)
      console.log('  - flag:', json.result?.flag)
      console.log('  - html长度:', json.result?.html?.length)
      console.log('  - html内容:', json.result?.html)

      await route.fulfill({ response })
    })

    console.log('\n========== 步骤3: 点击预览按钮 ==========')
    const previewBtn = page.locator('button[title="生成HTML预览"]')
    const btnExists = await previewBtn.count()
    console.log('预览按钮存在:', btnExists > 0)

    if (btnExists > 0) {
      await previewBtn.click()
      console.log('✓ 已点击预览按钮')
    } else {
      console.error('✗ 预览按钮不存在！')
      return
    }

    await page.waitForTimeout(3000)

    console.log('\n========== 步骤4: 检查API调用 ==========')
    console.log('请求是否发送:', requestSent)
    console.log('响应是否接收:', responseReceived)

    if (!requestSent) {
      console.error('✗ API请求未发送！检查前端doPreview方法')

      // 检查前端状态
      const frontendState = await page.evaluate(() => {
        const vue = document.querySelector('.dm-editor-page')?.__vue__
        return {
          vueExists: !!vue,
          previewing: vue?.previewing,
          previewModalExists: !!vue?.$refs?.previewModal
        }
      })
      console.log('前端状态:', frontendState)
      return
    }

    console.log('\n========== 步骤5: 检查弹窗状态 ==========')
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    const modalVisible = await modal.isVisible().catch(() => false)
    console.log('弹窗可见:', modalVisible)

    if (!modalVisible) {
      console.error('✗ 弹窗未打开！')

      // 检查是否有错误提示
      const toast = page.locator('.ant-message-notice-content')
      const toastVisible = await toast.isVisible().catch(() => false)
      if (toastVisible) {
        const toastText = await toast.textContent()
        console.log('错误提示:', toastText)
      }
      return
    }

    console.log('\n========== 步骤6: 检查iframe ==========')
    const iframe = modal.locator('iframe')
    const iframeVisible = await iframe.isVisible().catch(() => false)
    console.log('iframe可见:', iframeVisible)

    if (iframeVisible) {
      const iframeAttrs = await page.evaluate(() => {
        const iframe = document.querySelector('.ant-modal iframe')
        return {
          srcdoc: iframe?.srcdoc?.substring(0, 500),
          srcdocLength: iframe?.srcdoc?.length,
          sandbox: iframe?.getAttribute('sandbox'),
          width: iframe?.style?.width,
          height: iframe?.style?.height,
          display: window.getComputedStyle(iframe)?.display
        }
      })
      console.log('iframe属性:', JSON.stringify(iframeAttrs, null, 2))

      // 尝试读取iframe内容
      const iframeContent = await page.evaluate(() => {
        const iframe = document.querySelector('.ant-modal iframe')
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document
          return {
            hasDocument: !!doc,
            bodyHTML: doc.body?.innerHTML,
            bodyText: doc.body?.textContent,
            bodyChildCount: doc.body?.childNodes?.length
          }
        } catch (e) {
          return { error: e.message }
        }
      })
      console.log('iframe内容:', JSON.stringify(iframeContent, null, 2))
    }

    console.log('\n========== 步骤7: 截图保存 ==========')
    await page.screenshot({ path: 'debug-preview-full-page.png', fullPage: true })
    console.log('✓ 全页面截图: debug-preview-full-page.png')

    await modal.screenshot({ path: 'debug-preview-modal.png' })
    console.log('✓ 弹窗截图: debug-preview-modal.png')

    console.log('\n========== 诊断总结 ==========')
    console.log('1. 编辑器有内容:', editorContent.hasContent)
    console.log('2. API请求发送:', requestSent)
    console.log('3. API响应接收:', responseReceived)
    console.log('4. 响应flag:', responseData?.result?.flag)
    console.log('5. 响应html长度:', responseData?.result?.html?.length)
    console.log('6. 弹窗打开:', modalVisible)
    console.log('7. iframe可见:', iframeVisible)
  })

  test('诊断2: 使用简单测试内容', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(2000)

    console.log('========== 注入简单测试XML ==========')
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <title>这是测试标题</title>
      <para>这是测试段落，应该能看到这些文字。</para>
    </description>
  </content>
</dmodule>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(xml)
    }, testXml)

    console.log('✓ 已注入测试XML')
    await page.waitForTimeout(1000)

    // 验证注入成功
    const injected = await page.evaluate(() => {
      const content = document.querySelector('.CodeMirror').CodeMirror.getValue()
      return {
        success: content.includes('这是测试标题'),
        length: content.length
      }
    })
    console.log('注入验证:', injected)

    // 拦截并记录
    let apiResponse = null
    await page.route('**/dm-content/preview', async route => {
      const response = await route.fetch()
      apiResponse = await response.json()
      console.log('API响应:', JSON.stringify(apiResponse, null, 2))
      await route.fulfill({ response })
    })

    console.log('\n========== 点击预览 ==========')
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(3000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    const visible = await modal.isVisible().catch(() => false)
    console.log('弹窗打开:', visible)

    if (visible) {
      const iframe = modal.locator('iframe')
      const srcdoc = await iframe.getAttribute('srcdoc')
      console.log('srcdoc长度:', srcdoc?.length)
      console.log('srcdoc内容:', srcdoc)

      console.log('\n检查srcdoc中的文本:')
      console.log('  - 包含"测试标题":', srcdoc?.includes('这是测试标题'))
      console.log('  - 包含"测试段落":', srcdoc?.includes('这是测试段落'))

      await modal.screenshot({ path: 'debug-simple-test-modal.png' })
      console.log('✓ 简单测试截图: debug-simple-test-modal.png')
    }
  })

  test('诊断3: 检查Vue组件状态', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(2000)

    console.log('========== 检查Vue组件 ==========')
    const vueState = await page.evaluate(() => {
      const editorVue = document.querySelector('.dm-editor-page')?.__vue__
      if (!editorVue) return { error: 'editor Vue实例不存在' }

      const modalRef = editorVue.$refs?.previewModal
      if (!modalRef) return { error: 'previewModal ref不存在' }

      return {
        editorExists: true,
        modalRefExists: true,
        modalVisible: modalRef.visible,
        modalSrcdoc: modalRef.srcdoc?.substring(0, 200),
        modalSrcdocLength: modalRef.srcdoc?.length,
        previewing: editorVue.previewing,
        editorContent: editorVue.$refs?.editor?.getValue()?.substring(0, 200)
      }
    })

    console.log('Vue状态:', JSON.stringify(vueState, null, 2))

    console.log('\n========== 手动调用show方法 ==========')
    const manualShowResult = await page.evaluate(() => {
      const editorVue = document.querySelector('.dm-editor-page').__vue__
      const modal = editorVue.$refs.previewModal

      const testHtml = '<h1 style="color: red; font-size: 30px;">手动测试内容</h1><p>如果能看到这段红色文字，说明show方法正常工作。</p>'

      modal.show(testHtml)

      return {
        called: true,
        visibleAfter: modal.visible,
        srcdocAfter: modal.srcdoc?.substring(0, 200)
      }
    })

    console.log('手动调用结果:', JSON.stringify(manualShowResult, null, 2))
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    const visible = await modal.isVisible()
    console.log('弹窗显示:', visible)

    if (visible) {
      await modal.screenshot({ path: 'debug-manual-show.png' })
      console.log('✓ 手动调用截图: debug-manual-show.png')
    }
  })
})
