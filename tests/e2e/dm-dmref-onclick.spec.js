const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 内部引用(dmRef) 预览点击 - E2E 真UI测试
 * 验证方案A：预览里点击内部引用 → 弹出"引用DM代码/引用片段"信息框
 * 覆盖：有referredFragment / 无referredFragment 两种
 */
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2084945965503942657'
const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
const PROJECT_ID = '2078348945532030978'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''
      res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(null) }
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

let TOKEN

const XML_WITH_FRAG = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>内部引用测试</title>
  <para>见 <dmRef xlink:type="simple" referredFragment="para-001"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
  </levelledPara></description></content>
</dmodule>`

const XML_NO_FRAG = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>无片段引用</title>
  <para>见 <dmRef xlink:type="simple"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
  </levelledPara></description></content>
</dmodule>`

test.beforeAll(async () => {
  const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!login || !login.result || !login.result.token) throw new Error('登录失败')
  TOKEN = login.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
})

async function openEditorAndInject(page, xml) {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const el = document.querySelector('.dm-editor-page')
    return !!(el && el.__vue__)
  }, { timeout: 30000 })
  await page.waitForTimeout(2000) // 等DM内容异步加载完，再注入覆盖
  // 直接注入 content（doPreview 读取 this.content）
  await page.evaluate(x => {
    const vm = document.querySelector('.dm-editor-page').__vue__
    vm.content = x
  }, xml)
}

async function openPreviewAndClickRef(page) {
  await page.locator('button:has-text("预览")').first().click()
  await page.waitForSelector('.ant-modal:has-text("DM内容预览") iframe', { timeout: 15000 })
  await page.waitForTimeout(2000) // 等iframe onload注入 showDmRefInfo + 渲染完成
  // frameLocator 匹配不到 blob-URL iframe，改用 evaluate 直接点击 iframe 内的引用
  const clicked = await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument || ifr.contentWindow.document
    const ref = doc.querySelector('span[onclick^="showDmRefInfo"]')
    if (!ref) return false
    ref.click()
    return true
  })
  if (!clicked) throw new Error('未找到 showDmRefInfo 引用元素')
}

test('内部引用-有片段: 点击弹出DMC+片段信息框', async ({ page }) => {
  await openEditorAndInject(page, XML_WITH_FRAG)
  await openPreviewAndClickRef(page)
  // "内部引用" 信息弹框出现
  const info = page.locator('.ant-modal:has-text("内部引用")')
  await expect(info).toBeVisible({ timeout: 8000 })
  await expect(info).toContainText('ZB1-A-02-00-00-00A-007A-A')
  await expect(info).toContainText('para-001')
})

test('内部引用-无片段: 提示引用整个DM', async ({ page }) => {
  await openEditorAndInject(page, XML_NO_FRAG)
  await openPreviewAndClickRef(page)
  const info = page.locator('.ant-modal:has-text("内部引用")')
  await expect(info).toBeVisible({ timeout: 8000 })
  await expect(info).toContainText('ZB1-A-02-00-00-00A-007A-A')
  await expect(info).toContainText('引用整个DM')
})
