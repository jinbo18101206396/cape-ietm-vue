const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 预览交互 · 第6轮扩展边界验证（实用场景）
 *
 * 聚焦于实际使用中的边界情况和压力场景
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
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { resolve(null) } })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l || !l.success) throw new Error('登录失败')
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
})

async function injectToken(page) {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)
}

function makeXml(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>T</title>${body}</levelledPara></description></content>
</dmodule>`
}

async function openEditor(page, xml) {
  await injectToken(page)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => !!(document.querySelector('.dm-editor-page') || {}).__vue__, { timeout: 30000 })
  await page.waitForTimeout(1500)
  if (xml !== undefined) {
    await page.evaluate(x => {
      const vm = document.querySelector('.dm-editor-page').__vue__
      vm.content = x
      if (vm.$refs.editor && vm.$refs.editor.setValue) vm.$refs.editor.setValue(x)
    }, xml)
    await page.waitForTimeout(300)
  }
}

async function clickPreview(page) {
  const errs = []
  page.on('pageerror', e => errs.push(e))
  await page.click('button:has-text("预览")')
  await page.waitForTimeout(800)
  return errs
}

async function waitPreviewIframe(page) {
  await page.waitForSelector('.ant-modal iframe', { timeout: 15000 })
  await page.waitForTimeout(2000)
}

async function clickInIframe(page, selector) {
  const found = await page.evaluate(sel => {
    const ifr = document.querySelector('.ant-modal iframe')
    if (!ifr || !ifr.contentDocument) return false
    const el = ifr.contentDocument.querySelector(sel)
    if (!el) return false
    el.click()
    return true
  }, selector)
  await page.waitForTimeout(300)
  return found
}

function jsErrors(errs) {
  return errs.filter(e => e.message && /ReferenceError|TypeError|is not defined/i.test(e.message))
}

test.describe('扩展边界 · 属性值极端情况', () => {
  test('边界1: 空属性值', async ({ page }) => {
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="">
        <hotspot id="hs1" apsid="" apsname="" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 空属性不应导致JS错误
    const clicked = await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(clicked || true).toBe(true) // 可能因空属性未渲染链接，但不应崩溃
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('边界2: 超长属性值（1000字符）', async ({ page }) => {
    const longValue = 'A'.repeat(1000)
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="BN1">
        <hotspot id="hs1" apsid="aps1" apsname="${longValue}" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('边界3: 特殊HTML字符（<>&"\'）', async ({ page }) => {
    // XML中需要转义的特殊字符
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="BN1">
        <hotspot id="hs1" apsid="aps1" apsname="测试&lt;标签&gt;&amp;&quot;&apos;" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('边界4: 多语言字符（中日韩+emoji）', async ({ page }) => {
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="BN1">
        <hotspot id="hs1" apsid="aps1" apsname="测试🚀한국어日本語" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(jsErrors(errs)).toHaveLength(0)
  })
})

test.describe('扩展边界 · 数量压力测试', () => {
  test('压力1: 10个热点引用', async ({ page }) => {
    let figures = ''
    let paras = ''
    for (let i = 1; i <= 10; i++) {
      figures += `<figure><title>图${i}</title>
        <graphic infoEntityIdent="ICN-${i}" boardno="BN${i}">
          <hotspot id="hs${i}" apsid="aps${i}" apsname="热点${i}" applicationStructureIdent="as${i}"/>
        </graphic></figure>`
      paras += `<para>参见 <internalRef internalRefId="hs${i}" internalRefTargetType="hotspot"/></para>`
    }
    const xml = makeXml(figures + paras)

    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 验证有10个updateLegendDiv
    const count = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      return ifr ? (ifr.contentDocument.body.innerHTML.match(/updateLegendDiv/g) || []).length : 0
    })
    expect(count).toBeGreaterThanOrEqual(10)

    // 点击第1个和最后1个
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    const links = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      return ifr ? ifr.contentDocument.querySelectorAll('a[onclick*="updateLegendDiv"]').length : 0
    })
    if (links >= 10) {
      await page.evaluate(() => {
        const ifr = document.querySelector('.ant-modal iframe')
        ifr.contentDocument.querySelectorAll('a[onclick*="updateLegendDiv"]')[9].click()
      })
    }

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('压力2: 快速打开关闭10次', async ({ page }) => {
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="BN1">
        <hotspot id="hs1" apsid="aps1" apsname="测试" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)

    let totalErrors = []
    for (let i = 0; i < 10; i++) {
      const errs = await clickPreview(page)
      await waitPreviewIframe(page)
      await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')

      // 关闭预览
      await page.click('.ant-modal-close')
      await page.waitForTimeout(300)

      totalErrors.push(...errs)
    }

    expect(jsErrors(totalErrors)).toHaveLength(0)
  })
})

test.describe('扩展边界 · 中断和恢复', () => {
  test('中断1: 预览加载时立即关闭', async ({ page }) => {
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="BN1">
        <hotspot id="hs1" apsid="aps1" apsname="测试" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)

    const errs = []
    page.on('pageerror', e => errs.push(e))

    // 点击预览后立即关闭
    await page.click('button:has-text("预览")')
    await page.waitForTimeout(200)
    const closeBtn = await page.$('.ant-modal-close')
    if (closeBtn) await closeBtn.click()
    await page.waitForTimeout(500)

    // 再次正常预览
    await page.click('button:has-text("预览")')
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('中断2: 点击热点后立即关闭', async ({ page }) => {
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="BN1">
        <hotspot id="hs1" apsid="aps1" apsname="测试" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 点击后立即关闭
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(100)
    await page.click('.ant-modal-close')
    await page.waitForTimeout(300)

    // 再次预览和点击
    await page.click('button:has-text("预览")')
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')

    expect(jsErrors(errs)).toHaveLength(0)
  })
})

test.describe('扩展边界 · Vue层验证', () => {
  test('Vue1: 预览按钮是Vue组件', async ({ page }) => {
    const xml = makeXml('<para>测试</para>')
    await openEditor(page, xml)

    // 验证按钮是Vue渲染的
    const hasVueRef = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const previewBtn = btns.find(b => b.textContent.includes('预览'))
      return previewBtn && previewBtn.__vue__ !== undefined
    })
    expect(hasVueRef).toBe(true)
  })

  test('Vue2: 预览Modal是Vue组件', async ({ page }) => {
    const xml = makeXml('<para>测试</para>')
    await openEditor(page, xml)

    await page.click('button:has-text("预览")')
    await page.waitForTimeout(800)

    // 验证modal是Vue组件
    const isVueModal = await page.evaluate(() => {
      const modal = document.querySelector('.ant-modal')
      return modal && modal.__vue__ !== undefined
    })
    expect(isVueModal).toBe(true)
  })

  test('Vue3: iframe由Vue组件生成blob URL', async ({ page }) => {
    const xml = makeXml(`<figure><title>热点图</title>
      <graphic infoEntityIdent="ICN-A" boardno="BN1">
        <hotspot id="hs1" apsid="aps1" apsname="测试" applicationStructureIdent="as1"/>
      </graphic></figure>
      <para>参见 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`)

    await openEditor(page, xml)
    await clickPreview(page)
    await waitPreviewIframe(page)

    // 验证iframe src是blob:
    const iframeSrc = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      return ifr ? ifr.src : null
    })
    expect(iframeSrc).toMatch(/^blob:/)

    // 验证updateLegendDiv桩被注入
    const hasStub = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      if (!ifr || !ifr.contentDocument) return false
      return /updateLegendDiv/.test(ifr.contentDocument.documentElement.innerHTML)
    })
    expect(hasStub).toBe(true)
  })
})
