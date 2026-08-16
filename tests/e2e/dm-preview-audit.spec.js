const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * DM预览 - 系统性样式审查（浏览器级 getComputedStyle 验证）
 *
 * 用户报告：目录无序号+有边框、数据限制表套表、表格标题错乱、整体越来越难看。
 * 本套件用真实浏览器渲染 + getComputedStyle，权威回答"用户实际看到什么"。
 */

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

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
const DM_ID = '2084945965503942657'
const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
const PROJECT_ID = '2078348945532030978'

// 含多个 levelledPara(带title,嵌套) + table(带title) + dataRestrictions 的完整 dmodule
const TEST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/descript.xsd">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="03" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/>
        <language countryIsoCode="CN" languageIsoCode="zh"/>
        <issueInfo issueNumber="001" inWork="01"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="08" day="06"/>
        <dmTitle><techName>测试技术名称</techName><infoName>测试信息名称</infoName></dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus issueType="new">
      <security securityClassification="01"/>
      <dataRestrictions>
        <restrictionInstructions>
          <dataDistribution>分发说明文本DIST</dataDistribution>
          <dataHandling>处理说明文本HND</dataHandling>
          <dataDestruction>销毁说明文本DES</dataDestruction>
        </restrictionInstructions>
        <restrictionInfo>
          <policyStatement>政策声明POLTEXT</policyStatement>
          <dataConds>条件说明CONDTEXT</dataConds>
        </restrictionInfo>
      </dataRestrictions>
      <responsiblePartnerCompany enterpriseCode="ABCDE"><enterpriseName>测试公司</enterpriseName></responsiblePartnerCompany>
      <originator enterpriseCode="ABCDE"><enterpriseName>测试公司</enterpriseName></originator>
      <applic><displayText><simplePara>全部</simplePara></displayText></applic>
      <brexDmRef>
        <dmRef xlink:type="simple" xlink:href="">
          <dmRefIdent>
            <dmCode modelIdentCode="S1000D" systemDiffCode="F" systemCode="04" subSystemCode="1" subSubSystemCode="0" assyCode="0301" disassyCode="00" disassyCodeVariant="A" infoCode="022" infoCodeVariant="A" itemLocationCode="D"/>
          </dmRefIdent>
        </dmRef>
      </brexDmRef>
      <qualityAssurance><unverified/></qualityAssurance>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>第一章标题</title>
        <para>第一章正文内容。</para>
      </levelledPara>
      <levelledPara>
        <title>第二章标题</title>
        <para>第二章正文内容。</para>
        <levelledPara>
          <title>第二章第一节</title>
          <para>嵌套小节正文。下面是表格。</para>
          <table>
            <title>设备参数表</title>
            <tgroup cols="2">
              <colspec colname="c1"/>
              <colspec colname="c2"/>
              <thead>
                <row><entry>参数名</entry><entry>参数值</entry></row>
              </thead>
              <tbody>
                <row><entry>电压</entry><entry>220V</entry></row>
                <row><entry>电流</entry><entry>10A</entry></row>
              </tbody>
            </tgroup>
          </table>
        </levelledPara>
      </levelledPara>
      <levelledPara>
        <title>第三章标题</title>
        <para>第三章正文内容。</para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

test.beforeAll(async () => {
  const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!login || !login.result || !login.result.token) throw new Error('登录失败')
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
  // 等原始内容异步加载完成（否则注入被覆盖）
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    const v = cm.getValue()
    return v && v.includes('identAndStatusSection') && v.length > 500
  }, { timeout: 30000 })
}

async function injectXml(page, xml) {
  await page.evaluate(x => {
    document.querySelector('.CodeMirror').CodeMirror.setValue(x)
  }, xml)
  await page.waitForFunction(() => {
    return document.querySelector('.CodeMirror').CodeMirror.getValue().includes('设备参数表')
  }, { timeout: 5000 })
  await page.waitForTimeout(300)
}

async function openPreview(page) {
  await page.locator('button:has-text("预览")').click()
  await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })
  await page.waitForFunction(() => {
    const iframe = document.querySelector('.ant-modal iframe')
    return iframe && iframe.contentDocument && iframe.contentDocument.body &&
           iframe.contentDocument.body.innerHTML.length > 500
  }, { timeout: 10000 })
  await page.waitForTimeout(600)
}

test.describe('预览样式系统审查', () => {
  test('A) 目录TOC: 序号可见 + 无边框（用户报告"没序号+有边框"）', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await openPreview(page)

    const r = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const win = doc.defaultView
      const tocTable = doc.querySelector('table.toc-table')
      if (!tocTable) return { tocFound: false }

      // 序号单元格
      const leftCells = Array.from(tocTable.querySelectorAll('td.loclefttd'))
      const seqTexts = leftCells.map(td => td.textContent.trim()).filter(t => t.length > 0)

      // 边框计算值（取第一个数据行的 td）
      const sampleTd = leftCells[0]
      const tdStyle = sampleTd ? win.getComputedStyle(sampleTd) : null
      const tableStyle = win.getComputedStyle(tocTable)

      return {
        tocFound: true,
        seqTexts,
        seqCount: seqTexts.length,
        tdBorderTopWidth: tdStyle ? tdStyle.borderTopWidth : null,
        tdBorderStyle: tdStyle ? tdStyle.borderTopStyle : null,
        tableBorderTopWidth: tableStyle.borderTopWidth,
        tableBorderStyle: tableStyle.borderTopStyle
      }
    })

    console.log('A) TOC 审查:', JSON.stringify(r))
    expect(r.tocFound).toBe(true)
    // 序号应可见（1,2,2.1,3）
    expect(r.seqCount).toBeGreaterThanOrEqual(4)
    expect(r.seqTexts.join(',')).toContain('2.1')
    // 无边框：border 计算值应为 none 或 0px
    const tdNoBorder = r.tdBorderStyle === 'none' || r.tdBorderTopWidth === '0px'
    const tableNoBorder = r.tableBorderStyle === 'none' || r.tableBorderTopWidth === '0px'
    expect(tdNoBorder).toBe(true)
    expect(tableNoBorder).toBe(true)
  })

  test('B) 数据限制: 无嵌套表格，子行平铺（用户报告"表格套表格"）', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await openPreview(page)

    const r = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const body = doc.body
      const idStatusCells = Array.from(body.querySelectorAll('td.idStatus'))
      const cellsWithNestedTable = idStatusCells.filter(td => td.querySelector('table')).length
      // 非法嵌套：td 内直接有 tr
      const tdWithTr = idStatusCells.filter(td => td.querySelector(':scope > tr, tr')).length
      const text = body.textContent
      return {
        cellsWithNestedTable,
        tdWithTr,
        hasDist: text.includes('分发说明文本DIST'),
        hasPolicy: text.includes('政策声明POLTEXT'),
        hasCond: text.includes('条件说明CONDTEXT')
      }
    })

    console.log('B) 数据限制审查:', JSON.stringify(r))
    expect(r.cellsWithNestedTable).toBe(0)
    expect(r.tdWithTr).toBe(0)
    expect(r.hasDist).toBe(true)
    expect(r.hasPolicy).toBe(true)
    expect(r.hasCond).toBe(true)
  })

  test('C) 表格标题: 纯文本居中斜体，无嵌套table.tabletitle（用户报告"标题显示不对"）', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await openPreview(page)

    const r = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const win = doc.defaultView
      const tt = doc.querySelector('.TableTitle')
      if (!tt) return { found: false }
      const s = win.getComputedStyle(tt)
      return {
        found: true,
        text: tt.textContent.trim(),
        nestedTable: tt.querySelectorAll('table').length,
        tabletitleClassInBody: doc.body.querySelectorAll('table.tabletitle').length,
        textAlign: s.textAlign,
        fontStyle: s.fontStyle
      }
    })

    console.log('C) 表格标题审查:', JSON.stringify(r))
    expect(r.found).toBe(true)
    expect(r.text).toContain('设备参数表')
    expect(r.nestedTable).toBe(0)
    expect(r.tabletitleClassInBody).toBe(0)
    expect(r.textAlign).toBe('center')
    expect(r.fontStyle).toBe('italic')
  })

  test('D) 前端CSS: body字体来自后端(非sans-serif覆盖)', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await openPreview(page)

    const font = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      return doc.defaultView.getComputedStyle(doc.body).fontFamily
    })

    console.log('D) body字体:', font)
    // 后端CSS的宋体/Arial，而非前端注入的纯sans-serif
    const ok = font.includes('SimSun') || font.includes('宋体') || font.includes('Arial')
    expect(ok).toBe(true)
  })

  test('E) 数据表格本体: 有边框保留(与TOC区分)', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await openPreview(page)

    const r = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const win = doc.defaultView
      const dataTable = doc.querySelector('table.tableBorders')
      if (!dataTable) return { found: false }
      const td = dataTable.querySelector('td')
      const s = td ? win.getComputedStyle(td) : null
      return {
        found: true,
        rowCount: dataTable.querySelectorAll('tr').length,
        tdBorderWidth: s ? s.borderTopWidth : null,
        tdBorderStyle: s ? s.borderTopStyle : null
      }
    })

    console.log('E) 数据表格审查:', JSON.stringify(r))
    expect(r.found).toBe(true)
    expect(r.rowCount).toBeGreaterThanOrEqual(3)
    // 数据表格应保留边框
    expect(r.tdBorderStyle).toBe('solid')
  })
})
