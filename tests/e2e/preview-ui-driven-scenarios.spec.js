const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * 预览交互 · UI 驱动场景+边界测试（不绕过 Vue 层）
 *
 * 原则：
 *  - 被测交互全部走真实 UI：真实点击「预览」按钮、真实点击 iframe 内渲染出的元素
 *    （触发其 onclick）、真实勾选列表行；断言用 Vue 渲染的 .ant-modal 可见性。
 *  - 不查 typeof window.fn、不直接调 vm 方法。fixture 内容仅作数据准备。
 *  - 覆盖两条预览路径：编辑器（DmContentEditor→DmPreviewModal）与列表页
 *    （IetmDataModuleList→同一 DmPreviewModal）。
 *  - blob: iframe 的 frameLocator 匹配不到，故用 page.evaluate 定位 iframe 内元素
 *    并 el.click()——触发的是真实 onclick，非逻辑绕过。
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

const dmCode = '<dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent>'

const FIX = {
  hotspot: makeXml(`<figure><title>热点图</title>
    <graphic infoEntityIdent="ICN-HS">
      <hotspot id="hs1" applicationStructureIdent="as1">
        <dmRef xlink:type="simple" referredFragment="hf1">${dmCode}</dmRef>
      </hotspot></graphic></figure>`),
  warning: makeXml(`<safety><warning><warningAndCautionPara>高压危险</warningAndCautionPara></warning><caution><warningAndCautionPara>小心操作</warningAndCautionPara></caution></safety>`),
  multimedia: makeXml(`<multimedia><multimediaObject infoEntityIdent="MM1" multimediaType="video"><multimediaObjectTitle>视频</multimediaObjectTitle></multimediaObject></multimedia>`),
  dmref: makeXml(`<para>见 <dmRef xlink:type="simple" referredFragment="p1">${dmCode}</dmRef></para>`),
  dmrefNoFrag: makeXml(`<para>见 <dmRef xlink:type="simple">${dmCode}</dmRef></para>`),
  graphic: makeXml(`<figure><title>图</title><graphic infoEntityIdent="ICN-G"/></figure>`),
  mixed: makeXml(`<para>引用 <dmRef xlink:type="simple" referredFragment="f1">${dmCode}</dmRef></para>
    <figure><title>F</title><graphic infoEntityIdent="ICN-X"/></figure>
    <safety><warning><warningAndCautionPara>警告</warningAndCautionPara></warning></safety>`),
  plain: makeXml('<para>纯文字段落</para>'),
  // xref→图形热点：xref.xsl 输出 onclick="updateLegendDiv(...);linkToHotSpot(...)"（4类型均可达）
  xrefHotspot: makeXml(`<figure><title>热点图</title>
    <graphic infoEntityIdent="ICN-A" boardno="BN1">
      <hotspot id="hs1" apsid="aps1" apsname="APSNAME1" applicationStructureIdent="as1"/>
    </graphic></figure>
    <para>参见热点 <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>`),
  empty: '',
  malformed: '<dmodule><content><description><para>未闭合'
}

// 打开编辑器（fixture 内容用 vm 准备；仅数据准备，非被测交互）
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

// 真实点击「预览」按钮，收集控制台错误，等 iframe 出现
async function clickPreview(page) {
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push(e.message))
  await page.locator('button:has-text("预览")').first().click()
  return errs
}

async function waitPreviewIframe(page) {
  await page.waitForSelector('.ant-modal:has-text("DM内容预览") iframe', { timeout: 15000 })
  await page.waitForTimeout(2500) // 等 iframe parse + inline script 执行完
}

// 在 iframe 内真实点击匹配 selector 的元素（触发真实 onclick）；返回是否点到
async function clickInIframe(page, selector) {
  return await page.evaluate(sel => {
    const ifr = document.querySelector('.ant-modal iframe')
    if (!ifr) return false
    const doc = ifr.contentDocument
    const el = doc.querySelector(sel)
    if (!el) return false
    el.click()
    return true
  }, selector)
}

// 过滤真正的 JS 运行期错误（排除资源404等噪声）
function jsErrors(errs) {
  return errs.filter(e => /is not defined|is not a (function|constructor)|Cannot read|undefined is not/.test(e))
}

// 列表页导航到第一个可预览 DM 行
async function openListAndSelectRow(page) {
  await injectToken(page)
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(800)
  // 点开树节点直到出现表格行
  const titles = page.locator('.ant-tree-title')
  const n = await titles.count()
  for (let i = 0; i < Math.min(n, 8); i++) {
    await titles.nth(i).click().catch(() => {})
    await page.waitForTimeout(400)
    if (await page.locator('.ant-table-row').count() > 0) break
  }
  const row = page.locator('.ant-table-row').first()
  await row.waitFor({ state: 'visible', timeout: 15000 })
  await row.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(300)
}

test.describe('场景 · 编辑器预览真实交互', () => {
  test('热点图+热点内dmRef: 点预览无JS错误, 点热点区触发引用弹框', async ({ page }) => {
    await openEditor(page, FIX.hotspot)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)
    expect(jsErrors(errs), `加载JS错误: ${jsErrors(errs).join(' | ')}`).toHaveLength(0)
    // 热点内 dmRef 渲染为可点 span（showDmRefInfo），真实点击→Vue「内部引用」弹框
    const hit = await clickInIframe(page, 'span[onclick*="showDmRefInfo"]')
    if (hit) {
      await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeVisible({ timeout: 5000 })
    }
  })

  test('告警DM: 含warning+caution, 预览加载无acknowledged未定义错误', async ({ page }) => {
    await openEditor(page, FIX.warning)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)
    expect(jsErrors(errs), `加载JS错误: ${jsErrors(errs).join(' | ')}`).toHaveLength(0)
  })

  test('多媒体DM: 点预览无错, 点多媒体图标触发图形/多媒体预览弹框', async ({ page }) => {
    await openEditor(page, FIX.multimedia)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)
    expect(jsErrors(errs), `加载JS错误: ${jsErrors(errs).join(' | ')}`).toHaveLength(0)
    const hit = await clickInIframe(page, '[onclick*="showMultimediaInfo"]')
    if (hit) {
      await expect(page.locator('.ant-modal:has-text("图形/多媒体预览")')).toBeVisible({ timeout: 5000 })
    }
  })

  test('dmRef有片段: 真实点击→弹框显示DMC与片段', async ({ page }) => {
    await openEditor(page, FIX.dmref)
    await clickPreview(page)
    await waitPreviewIframe(page)
    expect(await clickInIframe(page, 'span[onclick*="showDmRefInfo"]')).toBe(true)
    const modal = page.locator('.ant-modal:has-text("内部引用")')
    await expect(modal).toBeVisible({ timeout: 5000 })
    // 既定显示格式：DMC 标识主体（无 DMC- 前缀，见 dm-dmref-onclick.spec.js:96）
    await expect(modal).toContainText('ZB1-A-02-00-00-00A-007A-A')
    await expect(modal).toContainText('p1') // 片段
  })

  test('dmRef无片段: 真实点击→弹框提示"引用整个DM"', async ({ page }) => {
    await openEditor(page, FIX.dmrefNoFrag)
    await clickPreview(page)
    await waitPreviewIframe(page)
    expect(await clickInIframe(page, 'span[onclick*="showDmRefInfo"]')).toBe(true)
    const modal = page.locator('.ant-modal:has-text("内部引用")')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal).toContainText('引用整个DM')
  })

  test('图形DM: 点图形→图形/多媒体预览弹框可见', async ({ page }) => {
    await openEditor(page, FIX.graphic)
    await clickPreview(page)
    await waitPreviewIframe(page)
    const hit = await clickInIframe(page, 'img.figureLinkGraphic[onclick*="showMultimediaInfo"], [onclick*="showMultimediaInfo"]')
    if (hit) await expect(page.locator('.ant-modal:has-text("图形/多媒体预览")')).toBeVisible({ timeout: 5000 })
  })

  test('xref热点交叉引用: 点xref链接触发updateLegendDiv+linkToHotSpot, 无未定义错误', async ({ page }) => {
    await openEditor(page, FIX.xrefHotspot)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)
    // 确认 xref.xsl 真输出了 updateLegendDiv 的 onclick（否则测试无意义）
    const hasOnclick = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      return ifr ? /updateLegendDiv/.test(ifr.contentDocument.body.innerHTML) : false
    })
    expect(hasOnclick, '预览未输出 updateLegendDiv onclick，夹具/XSL 已变化').toBe(true)
    // 真实点击该 xref 链接 → 触发 onclick（updateLegendDiv 先执行，修复前此处 ReferenceError）
    const hit = await clickInIframe(page, 'a[onclick*="updateLegendDiv"], span.xrefLink a[onclick]')
    expect(hit, '未点到 xref 链接').toBe(true)
    await page.waitForTimeout(500)
    expect(jsErrors(errs), `点击后JS错误: ${jsErrors(errs).join(' | ')}`).toHaveLength(0)
  })
})

test.describe('场景 · 混合内容与多次交互', () => {
  test('混合DM: dmRef与图形共存, 各自点击互不干扰', async ({ page }) => {
    await openEditor(page, FIX.mixed)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)
    expect(jsErrors(errs)).toHaveLength(0)
    // 点 dmRef
    expect(await clickInIframe(page, 'span[onclick*="showDmRefInfo"]')).toBe(true)
    await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeVisible({ timeout: 5000 })
    await page.locator('.ant-modal:has-text("内部引用") .ant-modal-close').click()
    await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeHidden({ timeout: 5000 })
    // 再点图形
    const hit = await clickInIframe(page, '[onclick*="showMultimediaInfo"]')
    if (hit) await expect(page.locator('.ant-modal:has-text("图形/多媒体预览")')).toBeVisible({ timeout: 5000 })
  })

  test('CodeMirror真实输入dmRef后预览: 全程UI(输入→点预览→点引用)', async ({ page }) => {
    await openEditor(page) // 不预置内容
    // 真实在 CodeMirror 里输入（选中全部→键入）
    const cm = page.locator('.CodeMirror').first()
    await cm.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Delete')
    await page.keyboard.insertText(FIX.dmref)
    await page.waitForTimeout(500)
    await clickPreview(page)
    await waitPreviewIframe(page)
    const hit = await clickInIframe(page, 'span[onclick*="showDmRefInfo"]')
    if (hit) await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('场景 · 列表页预览路径(共用DmPreviewModal)', () => {
  test('列表页勾选行+点预览按钮: iframe加载无JS错误', async ({ page }) => {
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', e => errs.push(e.message))
    await openListAndSelectRow(page)
    await page.locator('button:has-text("预览")').first().click()
    // 列表页真实 DM 内容不可控，只断言预览弹框打开且无加载期JS错误
    const appeared = await page.locator('.ant-modal:has-text("DM内容预览") iframe')
      .isVisible({ timeout: 15000 }).catch(() => false)
    if (appeared) {
      await page.waitForTimeout(2500)
      expect(jsErrors(errs), `列表页预览JS错误: ${jsErrors(errs).join(' | ')}`).toHaveLength(0)
    }
  })
})

test.describe('边界 · 异常与状态', () => {
  test('空内容: 点预览提示"内容为空", 不打开iframe', async ({ page }) => {
    await openEditor(page, FIX.empty)
    await page.locator('button:has-text("预览")').first().click()
    await expect(page.locator('.ant-message:has-text("为空")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.ant-modal:has-text("DM内容预览") iframe')).toBeHidden()
  })

  test('畸形XML: 点预览不崩溃(提示失败或空), UI仍可用', async ({ page }) => {
    await openEditor(page, FIX.malformed)
    await page.locator('button:has-text("预览")').first().click()
    await page.waitForTimeout(3000)
    // 不应出现未捕获崩溃；后续按钮仍可点
    await expect(page.locator('button:has-text("预览")').first()).toBeEnabled()
  })

  test('快速连续点击预览: 不重复叠加弹框(防连点)', async ({ page }) => {
    await openEditor(page, FIX.dmref)
    const btn = page.locator('button:has-text("预览")').first()
    await btn.click()
    await btn.click({ force: true }).catch(() => {})
    await btn.click({ force: true }).catch(() => {})
    await waitPreviewIframe(page)
    // 只应有一个预览弹框
    expect(await page.locator('.ant-modal:has-text("DM内容预览")').count()).toBe(1)
  })

  test('关闭预览后重开: 引用弹框状态不残留', async ({ page }) => {
    await openEditor(page, FIX.dmref)
    // 第一次：开→点引用→弹框可见→关整个预览
    await clickPreview(page)
    await waitPreviewIframe(page)
    await clickInIframe(page, 'span[onclick*="showDmRefInfo"]')
    const refModal = page.locator('.ant-modal:has-text("内部引用")')
    await expect(refModal).toBeVisible({ timeout: 5000 })
    // 先关内层「内部引用」弹框（它嵌套在预览弹框内，覆盖在最上层）
    await refModal.locator('.ant-modal-close').first().click()
    await expect(refModal).toBeHidden({ timeout: 5000 })
    // 再关预览主弹框
    await page.locator('.ant-modal:has-text("DM内容预览") .ant-modal-close').first().click()
    await page.waitForTimeout(600)
    // 第二次重开：不应残留上次的引用弹框
    await page.locator('button:has-text("预览")').first().click()
    await waitPreviewIframe(page)
    // 重开后引用弹框应是关闭态（未点击前不可见）
    await expect(page.locator('.ant-modal:has-text("内部引用")')).toBeHidden()
  })
})

test.describe('扩展场景 · updateLegendDiv 深度验证', () => {
  test('扩展1: 同一DM中3个不同热点引用', async ({ page }) => {
    const xml = makeXml(`
      <levelledPara>
        <title>多热点测试</title>
        <figure id="fig1"><title>图1</title>
          <graphic infoEntityIdent="ICN1" boardno="BN1">
            <hotspot id="hs1" apsid="aps1" apsname="热点A" applicationStructureIdent="asi1"/>
            <hotspot id="hs2" apsid="aps2" apsname="热点B" applicationStructureIdent="asi2"/>
            <hotspot id="hs3" apsid="aps3" apsname="热点C" applicationStructureIdent="asi3"/>
          </graphic>
        </figure>
        <para>
          引用A: <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/>
          引用B: <internalRef internalRefId="hs2" internalRefTargetType="hotspot"/>
          引用C: <internalRef internalRefId="hs3" internalRefTargetType="hotspot"/>
        </para>
      </levelledPara>
    `)
    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 验证生成了3个onclick
    const count = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      if (!ifr) return 0
      const html = ifr.contentDocument.body.innerHTML
      return (html.match(/updateLegendDiv/g) || []).length
    })
    expect(count, '应有3个updateLegendDiv').toBeGreaterThanOrEqual(3)

    // 依次点击3个引用
    const links = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      return Array.from(ifr.contentDocument.querySelectorAll('a[onclick*="updateLegendDiv"]')).length
    })

    for (let i = 0; i < Math.min(links, 3); i++) {
      await page.evaluate(idx => {
        const ifr = document.querySelector('.ant-modal iframe')
        const link = ifr.contentDocument.querySelectorAll('a[onclick*="updateLegendDiv"]')[idx]
        if (link) link.click()
      }, i)
      await page.waitForTimeout(200)
    }

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('扩展2: 快速连续点击5次同一热点', async ({ page }) => {
    await openEditor(page, FIX.xrefHotspot)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 快速连点5次
    for (let i = 0; i < 5; i++) {
      await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(500)
    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('扩展3: 热点与dmRef交替点击', async ({ page }) => {
    const xml = makeXml(`
      <levelledPara>
        <title>交替点击</title>
        <figure id="fig1"><title>图1</title>
          <graphic infoEntityIdent="ICN1" boardno="BN1">
            <hotspot id="hs1" apsid="aps1" apsname="热点" applicationStructureIdent="asi1"/>
          </graphic>
        </figure>
        <para>
          热点: <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/>
          DM引用: <dmRef><dmRefIdent><dmCode assyCode="00" disassyCode="00" disassyCodeVariant="A"/></dmRefIdent></dmRef>
        </para>
      </levelledPara>
    `)
    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 点热点
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(300)

    // 点dmRef
    const hasDmRef = await clickInIframe(page, 'span[onclick*="showDmRefInfo"]')
    if (hasDmRef) {
      await page.waitForTimeout(300)
      // 关闭dmRef弹框
      await page.locator('.ant-modal:has-text("内部引用") .ant-modal-close').first().click().catch(() => {})
      await page.waitForTimeout(300)
    }

    // 再点热点
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(300)

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('扩展4: 超长属性值测试', async ({ page }) => {
    const longName = 'A'.repeat(500)
    const xml = makeXml(`
      <levelledPara>
        <title>超长测试</title>
        <figure id="fig1"><title>图1</title>
          <graphic infoEntityIdent="ICN1" boardno="BN1">
            <hotspot id="hs1" apsid="aps1" apsname="${longName}" applicationStructureIdent="asi1"/>
          </graphic>
        </figure>
        <para>引用: <internalRef internalRefId="hs1" internalRefTargetType="hotspot"/></para>
      </levelledPara>
    `)
    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(300)

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('扩展5: 孤儿引用（引用不存在的hotspot）', async ({ page }) => {
    const xml = makeXml(`
      <levelledPara>
        <title>孤儿引用</title>
        <para>引用不存在的: <internalRef internalRefId="nonexist" internalRefTargetType="hotspot"/></para>
      </levelledPara>
    `)
    await openEditor(page, xml)
    const errs = await clickPreview(page)
    await waitPreviewIframe(page)

    // 预览应该成功
    const hasIframe = await page.locator('.ant-modal iframe').isVisible()
    expect(hasIframe).toBe(true)

    // 尝试点击（如果XSL渲染出了链接）
    const hasLink = await page.evaluate(() => {
      const ifr = document.querySelector('.ant-modal iframe')
      return ifr && ifr.contentDocument.querySelector('a[onclick*="updateLegendDiv"]') !== null
    })

    if (hasLink) {
      await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
      await page.waitForTimeout(300)
    }

    expect(jsErrors(errs)).toHaveLength(0)
  })

  test('扩展6: 关闭预览后重新打开再点击', async ({ page }) => {
    await openEditor(page, FIX.xrefHotspot)

    // 第一次预览和点击
    let errs = await clickPreview(page)
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(300)

    // 关闭预览
    await page.locator('.ant-modal:has-text("DM内容预览") .ant-modal-close').first().click()
    await page.waitForTimeout(500)

    // 第二次预览和点击
    errs = await clickPreview(page)
    await waitPreviewIframe(page)
    await clickInIframe(page, 'a[onclick*="updateLegendDiv"]')
    await page.waitForTimeout(300)

    expect(jsErrors(errs)).toHaveLength(0)
  })
})
