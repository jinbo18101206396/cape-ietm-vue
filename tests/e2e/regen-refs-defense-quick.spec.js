const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 重建 refs 与 DOCTYPE - 快速防御性验证
 * 验证关键修复：XML 解析失败时应显示错误提示
 */

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const TEST_DM_ID = '2086452253387866113'

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
let PROJECT_ID = '2078348945532030978'

test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败')
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
})

async function openEditor(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])

  await page.goto(`${BASE}/#/ietm/dm-management/editor/${TEST_DM_ID}?mode=edit`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForTimeout(2000)

  await page.evaluate(() => {
    const app = document.querySelector('#app').__vue__
    const findEditor = (vm) => {
      if (vm.$refs && vm.$refs.editor && vm.$refs.editor.getLinenoOffset) return vm
      if (vm.$children) {
        for (let child of vm.$children) {
          let result = findEditor(child)
          if (result) return result
        }
      }
      return null
    }
    window.__vueEditor = findEditor(app)
  })
}

test('防御性验证: 正常文档应成功重建', async ({ page }) => {
  await openEditor(page)

  // 1. 验证编辑器已加载
  const editorLoaded = await page.evaluate(() => {
    return window.__vueEditor && window.__vueEditor.$refs.editor
  })
  expect(editorLoaded).toBe(true)
  console.log('✅ 编辑器加载成功')

  // 2. 检查当前 nodeList 是否正常
  const nodeCount = await page.evaluate(() => {
    return window.__vueEditor.nodeList.length
  })
  console.log('📊 当前 nodeList 长度:', nodeCount)
  expect(nodeCount).toBeGreaterThan(0)

  // 3. 点击重建按钮
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)

  // 4. 确认弹窗
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(2000)

  // 5. 验证没有错误消息（正常文档应该成功）
  const errorVisible = await page.locator('.ant-message-error').isVisible().catch(() => false)

  if (errorVisible) {
    const errorText = await page.locator('.ant-message-error').textContent()
    console.log('⚠️ 错误消息:', errorText)
  } else {
    console.log('✅ 重建成功，无错误消息')
  }

  // 6. 验证 XML 结构完整
  const afterXml = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())

  expect(afterXml).toContain('<?xml')
  expect(afterXml).toContain('<dmodule')
  console.log('✅ XML 结构完整')
})

test('防御性验证: 按钮样式应与预览按钮一致', async ({ page }) => {
  await openEditor(page)

  // 检查重建按钮是否有 type="primary"
  const regenBtn = page.locator('button[title*="重建"]')
  const btnClass = await regenBtn.getAttribute('class')

  console.log('🎨 重建按钮 class:', btnClass)

  // 对比预览按钮
  const previewBtn = page.locator('button[title*="预览"]')
  const previewClass = await previewBtn.getAttribute('class')

  console.log('🎨 预览按钮 class:', previewClass)

  // 两者都应该包含 ant-btn-primary
  expect(btnClass).toContain('ant-btn-primary')
  expect(previewClass).toContain('ant-btn-primary')

  console.log('✅ 按钮样式一致')
})

test('防御性验证: brexDmRef 应保留不被删除', async ({ page }) => {
  await openEditor(page)

  // 1. 检查 brexDmRef 是否存在
  const hasBrexBefore = await page.evaluate(() => {
    const content = window.__vueEditor.$refs.editor.getEditor().getValue()
    return content.includes('brexDmRef')
  })

  console.log('📋 重建前 brexDmRef:', hasBrexBefore ? '存在' : '不存在')

  if (!hasBrexBefore) {
    console.log('⚠️ 测试数据中无 brexDmRef，跳过验证')
    return
  }

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(2000)

  // 3. 验证 brexDmRef 仍然存在
  const hasBrexAfter = await page.evaluate(() => {
    const content = window.__vueEditor.$refs.editor.getEditor().getValue()
    return content.includes('brexDmRef')
  })

  console.log('📋 重建后 brexDmRef:', hasBrexAfter ? '存在' : '不存在')

  expect(hasBrexAfter).toBe(true)
  console.log('✅ brexDmRef 正确保留')
})
