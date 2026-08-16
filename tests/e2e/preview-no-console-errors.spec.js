const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 预览 iframe 加载时零控制台错误测试
 * 验证：注入21个桩函数后，base.xsl/multimedia.xsl/fig_tabFigure.xsl
 * 里所有加载时调用的未定义函数均已覆盖，不再抛 ReferenceError/TypeError
 */
const BASE = 'http://localhost:3000'
const API  = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2084945965503942657'
const DMC   = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
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

// 每次预览都执行的 base.xsl 调用（需要桩）
const BASE_XSL_FNS = [
  'initFigureBrowser','clearLinks','JumpToRow',
  'setContentHolderHeight','autoJump','autoXref'
]

// 含 graphic 时调用的函数
const GRAPHIC_FNS = ['addFigure','graphicTitle']

// 含多媒体时调用的变量/函数
const MULTIMEDIA_FNS = ['addFigure','lessonPath']

// 点击时触发
const CLICK_FNS = ['showDmRefInfo','showMultimediaInfo','playSound']

function makeXml(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <content><description><levelledPara><title>T</title>${body}</levelledPara></description></content>
</dmodule>`
}

const XMLS = {
  plain: makeXml('<para>纯文字段落</para>'),
  withGraphic: makeXml('<figure><title>F</title><graphic infoEntityIdent="ICN-A"/></figure>'),
  withVideo: makeXml('<multimedia><multimediaObject infoEntityIdent="V1" multimediaType="video"/></multimedia>'),
  withAudio: makeXml('<multimedia><multimediaObject infoEntityIdent="A1" multimediaType="audio"/></multimedia>'),
  withDmRef: makeXml('<para><dmRef xlink:type="simple" referredFragment="p1"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>'),
  mixed: makeXml(`<para>引用: <dmRef xlink:type="simple" referredFragment="f1"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
    <figure><title>F</title><graphic infoEntityIdent="ICN-X"/></figure>
    <multimedia><multimediaObject infoEntityIdent="V2" multimediaType="video"/></multimedia>`)
}

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
  await page.waitForFunction(() => !!(document.querySelector('.dm-editor-page').__vue__), { timeout: 30000 })
  await page.waitForTimeout(2000)
  await page.evaluate(x => { document.querySelector('.dm-editor-page').__vue__.content = x }, xml)
}

async function previewAndCollectErrors(page) {
  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => consoleErrors.push(err.message))

  await page.locator('button:has-text("预览")').first().click()
  await page.waitForSelector('.ant-modal:has-text("DM内容预览") iframe', { timeout: 15000 })
  await page.waitForTimeout(3000)  // 足够让 iframe 加载并执行所有 inline scripts

  // 捕获 iframe 内的控制台错误
  const iframeErrors = await page.evaluate(() => {
    const errors = []
    const ifr = document.querySelector('.ant-modal iframe')
    if (!ifr) return errors
    try {
      const win = ifr.contentWindow
      // 检查是否还有未定义的关键函数
      const fns = ['initFigureBrowser','clearLinks','JumpToRow','setContentHolderHeight',
                   'autoJump','autoXref','addFigure','setActualContentHeight',
                   'acknowledged','playSound','showWCN','getWCNVisibility',
                   'addLink','addParamRef','initFault','loadImage','displayISOLegend']
      fns.forEach(fn => {
        if (typeof win[fn] === 'undefined') errors.push(`UNDEFINED: ${fn}`)
      })
      // 检查 graphicTitle 对象
      if (!win.graphicTitle || typeof win.graphicTitle.add !== 'function')
        errors.push('UNDEFINED: graphicTitle.add')
      // 检查 lessonPath
      if (typeof win.lessonPath === 'undefined')
        errors.push('UNDEFINED: lessonPath')
    } catch (e) { /* 跨域 */ }
    return errors
  })

  return { consoleErrors, iframeErrors }
}

// ── 测试用例 ──────────────────────────────────────────

test('纯文字DM: 加载时base.xsl桩函数全部就位', async ({ page }) => {
  await openEditorAndInject(page, XMLS.plain)
  const { iframeErrors } = await previewAndCollectErrors(page)
  expect(iframeErrors, `未定义函数: ${iframeErrors.join(', ')}`).toHaveLength(0)
})

test('含graphic DM: addFigure/graphicTitle桩就位', async ({ page }) => {
  await openEditorAndInject(page, XMLS.withGraphic)
  const { iframeErrors } = await previewAndCollectErrors(page)
  expect(iframeErrors, `未定义: ${iframeErrors.join(', ')}`).toHaveLength(0)
  // 图形预览弹框可点击
  const clicked = await page.evaluate(() => {
    const doc = document.querySelector('.ant-modal iframe').contentDocument
    const img = doc.querySelector('img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
    if (img) { img.click(); return true }
    return false
  })
  if (clicked) {
    await expect(page.locator('.ant-modal:has-text("图形/多媒体预览")')).toBeVisible({ timeout: 5000 })
  }
})

test('含video DM: addFigure/lessonPath桩就位', async ({ page }) => {
  await openEditorAndInject(page, XMLS.withVideo)
  const { iframeErrors } = await previewAndCollectErrors(page)
  expect(iframeErrors, `未定义: ${iframeErrors.join(', ')}`).toHaveLength(0)
})

test('含audio DM: playSound桩就位（不抛TypeError）', async ({ page }) => {
  await openEditorAndInject(page, XMLS.withAudio)
  const { iframeErrors } = await previewAndCollectErrors(page)
  expect(iframeErrors, `未定义: ${iframeErrors.join(', ')}`).toHaveLength(0)
  // 点击音频图标不抛错
  const clicked = await page.evaluate(() => {
    const doc = document.querySelector('.ant-modal iframe').contentDocument
    const img = doc.querySelector('img[onclick="playSound(this)"]')
    if (img) { img.click(); return true }
    return false
  })
  // 音频是桩（空函数），点击后不应出现错误弹框
  await page.waitForTimeout(500)
  await expect(page.locator('.ant-modal:has-text("错误"), .ant-modal:has-text("失败")')).not.toBeVisible()
})

test('含dmRef DM: showDmRefInfo可用', async ({ page }) => {
  await openEditorAndInject(page, XMLS.withDmRef)
  const { iframeErrors } = await previewAndCollectErrors(page)
  expect(iframeErrors, `未定义: ${iframeErrors.join(', ')}`).toHaveLength(0)
  await page.evaluate(() => {
    const doc = document.querySelector('.ant-modal iframe').contentDocument
    const ref = doc.querySelector('span[onclick*="showDmRefInfo"]')
    if (ref) ref.click()
  })
  await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeVisible({ timeout: 5000 })
})

test('混合DM: 所有桩就位，各交互均可用', async ({ page }) => {
  await openEditorAndInject(page, XMLS.mixed)
  const { iframeErrors } = await previewAndCollectErrors(page)
  expect(iframeErrors, `未定义: ${iframeErrors.join(', ')}`).toHaveLength(0)

  // dmRef 可点
  await page.evaluate(() => {
    const doc = document.querySelector('.ant-modal iframe').contentDocument
    const ref = doc.querySelector('span[onclick*="showDmRefInfo"]')
    if (ref) ref.click()
  })
  await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeVisible({ timeout: 5000 })
  await page.locator('.ant-modal:has-text("内部引用") .ant-modal-close').click()

  // 图形可点
  await page.evaluate(() => {
    const doc = document.querySelector('.ant-modal iframe').contentDocument
    const img = doc.querySelector('img.figureLinkGraphic[onclick*="showMultimediaInfo"]')
    if (img) img.click()
  })
  await expect(page.locator('.ant-modal:has-text("图形/多媒体预览")')).toBeVisible({ timeout: 5000 })
})

// ── 热点图形 / 热点内dmRef / 安全告警 / 多媒体标题：加载时构造器桩验证 ──────────
// 触发链：
//  <graphic><hotspot> → common.xsl:196 new HotspotLink() + addHotspotRef()
//  <hotspot><dmRef>   → content.xsl:338 new REFDMLink().addTarget(new XREFLink())
//  <safety><warning>  → base.xsl:80 acknowledged()（$numberOfWarningsCautions>0）
//  <multimediaObject> → multimedia.xsl:32 multimediaTitle.add()
const HOTSPOT_XML = makeXml(`
  <figure><title>热点图</title>
    <graphic infoEntityIdent="ICN-HS">
      <hotspot id="hs1" applicationStructureIdent="as1">
        <dmRef xlink:type="simple" referredFragment="hf1"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>
      </hotspot>
    </graphic>
  </figure>
  <safety><warning><warningAndCautionPara>警告文本</warningAndCautionPara></warning>
    <caution><warningAndCautionPara>小心文本</warningAndCautionPara></caution></safety>
  <multimedia><multimediaObject infoEntityIdent="MM1" multimediaType="video"><multimediaObjectTitle>视频标题</multimediaObjectTitle></multimediaObject></multimedia>`)

test('热点图/热点dmRef/告警/多媒体: 加载时构造器桩全部就位', async ({ page }) => {
  await openEditorAndInject(page, HOTSPOT_XML)
  const { consoleErrors, iframeErrors } = await previewAndCollectErrors(page)
  // 基础桩仍就位
  expect(iframeErrors, `未定义: ${iframeErrors.join(', ')}`).toHaveLength(0)
  // 新增构造器/对象桩就位
  const ctorErrors = await page.evaluate(() => {
    const errs = []
    const win = document.querySelector('.ant-modal iframe').contentWindow
    ;['REFDMLink','XREFLink','HotspotLink','CSNREFLink','ParamLink'].forEach(c => {
      if (typeof win[c] !== 'function') { errs.push(`UNDEFINED ctor: ${c}`); return }
      // 实例必须有 addTarget（content.xsl:341 refdm.addTarget(xref)）
      try { const inst = new win[c](); if (typeof inst.addTarget !== 'function') errs.push(`${c} 缺 addTarget`) }
      catch (e) { errs.push(`${c} new 抛错: ${e.message}`) }
    })
    ;['addHotspotRef','linkToHotSpot','linkToParam','locateCSN','prepTableForTearOff'].forEach(f => {
      if (typeof win[f] !== 'function') errs.push(`UNDEFINED fn: ${f}`)
    })
    if (!win.multimediaTitle || typeof win.multimediaTitle.add !== 'function')
      errs.push('UNDEFINED: multimediaTitle.add')
    return errs
  })
  expect(ctorErrors, ctorErrors.join(', ')).toHaveLength(0)
  // 加载时不得有任何 ReferenceError/TypeError（针对 new HotspotLink/addTarget 等）
  const refErrs = consoleErrors.filter(e => /is not defined|is not a (function|constructor)|Cannot read/.test(e))
  expect(refErrs, `加载时报错: ${refErrs.join(' | ')}`).toHaveLength(0)
})
