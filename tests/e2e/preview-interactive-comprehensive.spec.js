const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 预览交互全面测试 - 内部引用 + 图形/多媒体
 * 覆盖 dmRef (referredFragment) 和 ShowMultimedia 两个 window.external 同类修复
 * 全部通过真实浏览器 UI 交互验证
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

const XML_DMREF_WITH_FRAG = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>内部引用-有片段</title>
  <para>见 <dmRef xlink:type="simple" referredFragment="para-001"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
  </levelledPara></description></content>
</dmodule>`

const XML_DMREF_NO_FRAG = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>内部引用-无片段</title>
  <para>见 <dmRef xlink:type="simple"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
  </levelledPara></description></content>
</dmodule>`

const XML_FIGURE = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>图形测试</title>
  <figure><title>测试图</title><graphic infoEntityIdent="ICN-TEST-FIG-001"/></figure>
  </levelledPara></description></content>
</dmodule>`

const XML_MULTIMEDIA_VIDEO = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>多媒体视频</title>
  <multimedia><multimediaObject infoEntityIdent="ICN-VID-001" multimediaType="video"/></multimedia>
  </levelledPara></description></content>
</dmodule>`

const XML_MULTI_DMREF = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>多个引用</title>
  <para>引用A: <dmRef xlink:type="simple" referredFragment="fA"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
  <para>引用B: <dmRef xlink:type="simple" referredFragment="fB"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
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
  await page.waitForTimeout(2000)
  await page.evaluate(x => {
    const vm = document.querySelector('.dm-editor-page').__vue__
    vm.content = x
  }, xml)
}

async function openPreview(page) {
  await page.locator('button:has-text("预览")').first().click()
  await page.waitForSelector('.ant-modal:has-text("DM内容预览") iframe', { timeout: 15000 })
  await page.waitForTimeout(2000)
}

async function clickRefInIframe(page, selector) {
  const clicked = await page.evaluate(sel => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument || ifr.contentWindow.document
    const ref = doc.querySelector(sel)
    if (!ref) return false
    ref.click()
    return true
  }, selector)
  if (!clicked) throw new Error(`未找到元素: ${selector}`)
}

// ========== dmRef 测试 ==========
test('dmRef-有片段: 点击弹出DMC+片段信息框', async ({ page }) => {
  await openEditorAndInject(page, XML_DMREF_WITH_FRAG)
  await openPreview(page)
  await clickRefInIframe(page, 'span[onclick^="showDmRefInfo"]')
  const info = page.locator('.ant-modal:has-text("内部引用")')
  await expect(info).toBeVisible({ timeout: 8000 })
  await expect(info).toContainText('ZB1-A-02-00-00-00A-007A-A')
  await expect(info).toContainText('para-001')
})

test('dmRef-无片段: 提示引用整个DM', async ({ page }) => {
  await openEditorAndInject(page, XML_DMREF_NO_FRAG)
  await openPreview(page)
  await clickRefInIframe(page, 'span[onclick^="showDmRefInfo"]')
  const info = page.locator('.ant-modal:has-text("内部引用")')
  await expect(info).toBeVisible({ timeout: 8000 })
  await expect(info).toContainText('ZB1-A-02-00-00-00A-007A-A')
  await expect(info).toContainText('引用整个DM')
})

test('dmRef-多个引用: 各自片段独立', async ({ page }) => {
  await openEditorAndInject(page, XML_MULTI_DMREF)
  await openPreview(page)
  // 点第一个引用
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument || ifr.contentWindow.document
    const refs = doc.querySelectorAll('span[onclick^="showDmRefInfo"]')
    if (refs[0]) refs[0].click()
  })
  let info = page.locator('.ant-modal:has-text("内部引用")').first()
  await expect(info).toBeVisible({ timeout: 5000 })
  await expect(info).toContainText('fA')
  await info.locator('.ant-modal-close').click()
  // 点第二个引用
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument || ifr.contentWindow.document
    const refs = doc.querySelectorAll('span[onclick^="showDmRefInfo"]')
    if (refs[1]) refs[1].click()
  })
  info = page.locator('.ant-modal:has-text("内部引用")').first()
  await expect(info).toBeVisible({ timeout: 5000 })
  await expect(info).toContainText('fB')
})

// ========== 图形/多媒体测试 ==========
test('图形: 点击显示ICN预览弹框', async ({ page }) => {
  await openEditorAndInject(page, XML_FIGURE)
  await openPreview(page)
  await clickRefInIframe(page, 'img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
  const mm = page.locator('.ant-modal:has-text("图形/多媒体预览")')
  await expect(mm).toBeVisible({ timeout: 8000 })
  // ICN不存在会显示空状态或加载失败,不强求图片真实存在
  await expect(mm).toBeVisible()
})

test('多媒体视频: 点击显示预览弹框', async ({ page }) => {
  await openEditorAndInject(page, XML_MULTIMEDIA_VIDEO)
  await openPreview(page)
  await clickRefInIframe(page, 'img[onclick^="showMultimediaInfo"]')
  const mm = page.locator('.ant-modal:has-text("图形/多媒体预览")')
  await expect(mm).toBeVisible({ timeout: 8000 })
})

// ========== 边界测试 ==========
test('边界-空片段: referredFragment="" 显示引用整个DM', async ({ page }) => {
  const xml = XML_DMREF_WITH_FRAG.replace('referredFragment="para-001"', 'referredFragment=""')
  await openEditorAndInject(page, xml)
  await openPreview(page)
  await clickRefInIframe(page, 'span[onclick^="showDmRefInfo"]')
  const info = page.locator('.ant-modal:has-text("内部引用")')
  await expect(info).toBeVisible({ timeout: 5000 })
  await expect(info).toContainText('引用整个DM')
})
