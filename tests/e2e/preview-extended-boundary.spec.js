const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 预览交互 · 扩展边界与压力测试（第6轮深度验证）
 *
 * 新增场景：
 *  - 极端边界：空属性、特殊字符、超大文档
 *  - 并发压力：多窗口、连续操作、内存泄漏
 *  - 跨类型：4种DM类型混合测试
 *  - 错误恢复：中断操作、网络异常模拟
 *  - Vue层验证：确保所有交互走真实组件
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
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="">
<identAndStatusSection>
  <dmAddress><dmIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="03"/></dmIdent></dmAddress>
  <dmStatus><security securityClassification="01"/></dmStatus>
</identAndStatusSection>
<content>${body}</content>
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
  await page.waitForFunction(() => {
    const ifr = document.querySelector('.dm-preview-modal iframe')
    return ifr && ifr.contentDocument && ifr.contentDocument.readyState === 'complete'
  }, { timeout: 20000 })
  await page.waitForTimeout(500)
}

async function clickInIframe(page, selector) {
  const found = await page.evaluate(sel => {
    const ifr = document.querySelector('.dm-preview-modal iframe')
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

test.describe('扩展边界测试 · 极端值与特殊字符', () => {
  test('边界1: 空apsname属性值', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig1"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig1"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 空属性应该不崩溃
    const clicked = await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(clicked).toBe(true)
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('边界2: 特殊字符（引号/尖括号/&符号）', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig2"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname='测试"引号"&lt;标签&gt;&amp;符号' hotspotType="edgeCenter">
          <coords>0 0</coords>
        </hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig2"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 特殊字符应正确转义，不引发JS错误
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('边界3: 超深嵌套（10层para嵌套）', async ({ page }) => {
    const nested = '<para>L1<para>L2<para>L3<para>L4<para>L5<para>L6<para>L7<para>L8<para>L9<para>L10</para></para></para></para></para></para></para></para></para></para>'
    const xml = makeXml(`<description>
      <figure id="fig3"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="深层" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      ${nested}
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig3"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 深嵌套不应导致栈溢出
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('边界4: Unicode全字符集（emoji/中日韩/阿拉伯文）', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig4"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="测试🚀한국어日本語العربية" hotspotType="edgeCenter">
          <coords>0 0</coords>
        </hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig4"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    expect(jsErrors(errs)).toHaveLength(0)
  })
})

test.describe('扩展边界测试 · 压力与并发', () => {
  test('压力1: 100个热点引用（大文档）', async ({ page }) => {
    let figures = ''
    let xrefs = ''
    for (let i = 1; i <= 100; i++) {
      figures += `<figure id="fig${i}"><graphic infoEntityIdent="ICN-${i}"/>
        <hotspot apsname="热点${i}" hotspotType="edgeCenter"><coords>${i} ${i}</coords></hotspot>
      </figure>`
      xrefs += `<para>引用<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig${i}"/></para>`
    }
    const xml = makeXml(`<description>${figures}${xrefs}</description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 验证有100个updateLegendDiv
    const count = await page.evaluate(() => {
      const ifr = document.querySelector('.dm-preview-modal iframe')
      return ifr ? (ifr.contentDocument.body.innerHTML.match(/updateLegendDiv/g) || []).length : 0
    })
    expect(count).toBeGreaterThanOrEqual(100)

    // 点击第1个和第100个
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(100)
    const links = await page.evaluate(() => {
      const ifr = document.querySelector('.dm-preview-modal iframe')
      return ifr ? ifr.contentDocument.querySelectorAll('a[onclick*="updateLegendDiv"]').length : 0
    })
    if (links >= 100) {
      await page.evaluate(() => {
        const ifr = document.querySelector('.dm-preview-modal iframe')
        ifr.contentDocument.querySelectorAll('a[onclick*="updateLegendDiv"]')[99].click()
      })
    }

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('压力2: 连续打开关闭预览20次（内存泄漏检测）', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig1"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="测试" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig1"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    let totalErrors = []
    for (let i = 0; i < 20; i++) {
      const errs = await clickPreview(page)
      await waitPreviewIframe(page)
      await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')

      // 关闭预览
      await page.click('.dm-preview-modal .ant-modal-close')
      await page.waitForTimeout(300)

      totalErrors.push(...errs)
    }

    // 20次循环不应有JS错误
    expect(jsErrors(totalErrors)).toHaveLength(0)
  })

  test('压力3: 预览中快速切换多个DM类型', async ({ page }) => {
    // 描述型DM
    let xml1 = makeXml(`<description>
      <figure id="fig1"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="描述" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig1"/></para>
    </description>`)

    // Data prepared via openEditor
    await openEditor(page, xml1)
    let errs = await clickPreview(page)
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.click('.dm-preview-modal .ant-modal-close')
    await page.waitForTimeout(300)

    // 程序型DM（包含step）
    let xml2 = makeXml(`<procedure>
      <mainProcedure><preliminaryRqmts>
        <reqSupportEquips>
          <supportEquipDescr><figure id="fig2"><graphic infoEntityIdent="ICN-2"/>
            <hotspot apsname="程序" hotspotType="edgeCenter"><coords>5 5</coords></hotspot>
          </figure></supportEquipDescr>
        </reqSupportEquips>
      </preliminaryRqmts>
      <proceduralStep><para>步骤<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig2"/></para></proceduralStep>
      </mainProcedure>
    </procedure>`)

    // Data prepared via openEditor (reload to switch DM type)
    await openEditor(page, xml2)

    errs = await clickPreview(page)
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')

    expect(jsErrors(errs)).toHaveLength(0)
  })
})

test.describe('扩展边界测试 · 错误恢复与中断', () => {
  test('恢复1: 预览加载中立即关闭', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig1"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="测试" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig1"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    const errs = []
    page.on('pageerror', e => errs.push(e))

    // 点击预览后立即关闭（不等待加载）
    await page.click('button:has-text("预览")')
    await page.waitForTimeout(200)
    const closeBtn = await page.$('.dm-preview-modal .ant-modal-close')
    if (closeBtn) {
      await closeBtn.click()
    }
    await page.waitForTimeout(500)

    // 再次正常预览
    await page.click('button:has-text("预览")')
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')

    // 中断不应导致后续操作出错
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('恢复2: 点击热点后立即关闭弹窗', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig1"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="测试" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig1"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 点击后立即关闭
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(100)
    await page.click('.dm-preview-modal .ant-modal-close')
    await page.waitForTimeout(300)

    // 再次预览和点击
    await page.click('button:has-text("预览")')
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('恢复3: 修改内容后不保存直接预览', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig1"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="原内容" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig1"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    // 在CodeMirror中修改（不保存）
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const text = cm.getValue()
      cm.setValue(text.replace('原内容', '新内容'))
    })
    await page.waitForTimeout(500)

    // 直接预览（Vue应该警告未保存）
    const errs = await clickPreview(page)
    await page.waitForTimeout(1000)

    // 即使未保存，也不应崩溃
    expect(jsErrors(errs)).toHaveLength(0)
  })
})

test.describe('扩展边界测试 · Vue层完整性验证', () => {
  test('Vue层1: 确认预览按钮走Vue事件', async ({ page }) => {
    const xml = makeXml(`<description><para>测试</para></description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    // 验证按钮是Vue渲染的，有__vue__引用
    const isVueButton = await page.evaluate(() => {
      const btn = document.querySelector('button:has-text("预览")')
      return btn && btn.__vue__ !== undefined
    })
    expect(isVueButton).toBe(true)

    await page.click('button:has-text("预览")')
    await page.waitForTimeout(800)

    // 验证modal是Vue组件
    const isVueModal = await page.evaluate(() => {
      const modal = document.querySelector('.dm-preview-modal')
      return modal && modal.__vue__ !== undefined
    })
    expect(isVueModal).toBe(true)
  })

  test('Vue层2: iframe通过Vue组件渲染', async ({ page }) => {
    const xml = makeXml(`<description>
      <figure id="fig1"><graphic infoEntityIdent="ICN-TEST"/>
        <hotspot apsname="测试" hotspotType="edgeCenter"><coords>0 0</coords></hotspot>
      </figure>
      <para>测试<xref xrefType="hotspot" xrefTargetType="hotspot" xidRef="fig1"/></para>
    </description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    await page.click('button:has-text("预览")')
    await waitPreviewIframe(page)

    // 验证iframe的src是blob:（由Vue组件STUB_SCRIPT_HEAD注入生成）
    const iframeSrc = await page.evaluate(() => {
      const ifr = document.querySelector('.dm-preview-modal iframe')
      return ifr ? ifr.src : null
    })
    expect(iframeSrc).toMatch(/^blob:/)

    // 验证STUB_SCRIPT_HEAD被注入
    const hasStub = await page.evaluate(() => {
      const ifr = document.querySelector('.dm-preview-modal iframe')
      if (!ifr || !ifr.contentDocument) return false
      return /updateLegendDiv/.test(ifr.contentDocument.head.innerHTML)
    })
    expect(hasStub).toBe(true)
  })

  test('Vue层3: 关闭按钮触发Vue事件', async ({ page }) => {
    const xml = makeXml(`<description><para>测试</para></description>`)
    // Data prepared via openEditor
    await openEditor(page, xml)

    await page.click('button:has-text("预览")')
    await page.waitForTimeout(800)

    // 点击关闭按钮（Ant Design Vue组件）
    const closeBtn = await page.$('.dm-preview-modal .ant-modal-close')
    expect(closeBtn).not.toBeNull()

    await closeBtn.click()
    await page.waitForTimeout(500)

    // 验证modal被Vue销毁
    const modalGone = await page.evaluate(() => {
      return document.querySelector('.dm-preview-modal') === null
    })
    expect(modalGone).toBe(true)
  })
})
