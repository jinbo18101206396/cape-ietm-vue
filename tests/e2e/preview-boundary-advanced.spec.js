const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 预览交互边界与异常场景全面测试
 * 补充：混合内容、嵌套、错误处理、连续操作、关闭重开等
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

// 混合内容：dmRef + 图形 在同一文档
const XML_MIXED = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description>
    <levelledPara><title>混合内容测试</title>
      <para>引用: <dmRef xlink:type="simple" referredFragment="sec-1"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
      <figure><title>图1</title><graphic infoEntityIdent="ICN-MIX-001"/></figure>
      <para>再引用: <dmRef xlink:type="simple"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="03" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="010" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
    </levelledPara>
  </description></content>
</dmodule>`

// 嵌套 para 中的 dmRef
const XML_NESTED = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description>
    <levelledPara><title>L1</title>
      <para>外层引用: <dmRef xlink:type="simple" referredFragment="outer"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
      <levelledPara><title>L2</title>
        <para>内层引用: <dmRef xlink:type="simple" referredFragment="inner"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="03" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="010" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
      </levelledPara>
    </levelledPara>
  </description></content>
</dmodule>`

// 多个图形
const XML_MULTI_GRAPHICS = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>多图形</title>
    <figure><title>图A</title><graphic infoEntityIdent="ICN-A"/></figure>
    <figure><title>图B</title><graphic infoEntityIdent="ICN-B"/></figure>
    <figure><title>图C</title><graphic infoEntityIdent="ICN-C"/></figure>
  </levelledPara></description></content>
</dmodule>`

test.beforeAll(async () => {
  const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
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

test('场景-混合内容: dmRef和图形共存，各自点击正常', async ({ page }) => {
  await openEditorAndInject(page, XML_MIXED)
  await openPreview(page)

  // 点第一个 dmRef
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const refs = doc.querySelectorAll('span[onclick*="showDmRefInfo"]')
    if (refs[0]) refs[0].click()
  })
  let modal = page.locator('.ant-modal:has-text("内部引用")').first()
  await expect(modal).toBeVisible({ timeout: 5000 })
  await expect(modal).toContainText('sec-1')
  await modal.locator('.ant-modal-close').click()

  // 点图形
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const img = doc.querySelector('img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
    if (img) img.click()
  })
  modal = page.locator('.ant-modal:has-text("图形/多媒体预览")').first()
  await expect(modal).toBeVisible({ timeout: 5000 })
  await modal.locator('.ant-modal-close').click()

  // 点第二个 dmRef（无片段）
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const refs = doc.querySelectorAll('span[onclick*="showDmRefInfo"]')
    if (refs[1]) refs[1].click()
  })
  modal = page.locator('.ant-modal:has-text("内部引用")').first()
  await expect(modal).toBeVisible({ timeout: 5000 })
  await expect(modal).toContainText('引用整个DM')
})

test('场景-嵌套层级: 内外层dmRef各自独立', async ({ page }) => {
  await openEditorAndInject(page, XML_NESTED)
  await openPreview(page)

  // 外层引用
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const refs = doc.querySelectorAll('span[onclick*="showDmRefInfo"]')
    if (refs[0]) refs[0].click()
  })
  let modal = page.locator('.ant-modal:has-text("内部引用")').first()
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('outer')
  await modal.locator('.ant-modal-close').click()

  // 内层引用
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const refs = doc.querySelectorAll('span[onclick*="showDmRefInfo"]')
    if (refs[1]) refs[1].click()
  })
  modal = page.locator('.ant-modal:has-text("内部引用")').first()
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('inner')
})

test('场景-多个图形: 连续点击不同图形', async ({ page }) => {
  await openEditorAndInject(page, XML_MULTI_GRAPHICS)
  await openPreview(page)

  const imgs = await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    return doc.querySelectorAll('img.figureLinkGraphic[onclick*="showMultimediaInfo"]').length
  })
  expect(imgs).toBe(3)

  // 点第一个
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const imgs = doc.querySelectorAll('img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
    if (imgs[0]) imgs[0].click()
  })
  let modal = page.locator('.ant-modal:has-text("图形/多媒体预览")').first()
  await expect(modal).toBeVisible()
  await modal.locator('.ant-modal-close').click()

  // 点第三个
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const imgs = doc.querySelectorAll('img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
    if (imgs[2]) imgs[2].click()
  })
  modal = page.locator('.ant-modal:has-text("图形/多媒体预览")').first()
  await expect(modal).toBeVisible()
})

test('边界-关闭预览重开: 状态不残留', async ({ page }) => {
  await openEditorAndInject(page, XML_MIXED)
  await openPreview(page)

  // 点一个 dmRef
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const ref = doc.querySelector('span[onclick*="showDmRefInfo"]')
    if (ref) ref.click()
  })
  await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeVisible()

  // 关闭所有弹窗
  await page.locator('.ant-modal:has-text("内部引用") .ant-modal-close').click()
  await page.locator('.ant-modal:has-text("DM内容预览") .ant-modal-close').click()
  await page.waitForTimeout(500)

  // 重新预览
  await openPreview(page)

  // 验证信息框不自动弹出
  await expect(page.locator('.ant-modal:has-text("内部引用")')).not.toBeVisible()

  // 再次点击应正常
  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const ref = doc.querySelector('span[onclick*="showDmRefInfo"]')
    if (ref) ref.click()
  })
  await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeVisible()
})

test('边界-快速连续点击: 不应崩溃', async ({ page }) => {
  await openEditorAndInject(page, XML_MULTI_GRAPHICS)
  await openPreview(page)

  // 快速点击多次
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      const doc = ifr.contentDocument
      const img = doc.querySelector('img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
      if (img) img.click()
    })
    await page.waitForTimeout(100)
  }

  // 最后应有一个弹框可见
  await expect(page.locator('.ant-modal:has-text("图形/多媒体预览")')).toBeVisible()
})

test('边界-ICN不存在: 显示空状态不报错', async ({ page }) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>T</title>
    <figure><title>不存在的ICN</title><graphic infoEntityIdent="NOT-EXIST-999"/></figure>
  </levelledPara></description></content>
</dmodule>`
  await openEditorAndInject(page, xml)
  await openPreview(page)

  await page.evaluate(() => {
    const ifr = document.querySelector('.ant-modal iframe')
    const doc = ifr.contentDocument
    const img = doc.querySelector('img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
    if (img) img.click()
  })

  const modal = page.locator('.ant-modal:has-text("图形/多媒体预览")')
  await expect(modal).toBeVisible()
  // 应显示空状态或加载失败,不应有 JS 错误
  await expect(modal.locator('.ant-empty, .ant-spin')).toBeVisible({ timeout: 5000 })
})
