const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * DM预览 - XSLT样式修复验证（表格标题 + 数据限制嵌套表）
 *
 * 验证两个根因修复：
 *  Fix#3 commonTitles.xsl: table/title 不再生成嵌套 <table class="tabletitle">，
 *        改为纯文本，由父级 div.TableTitle 负责居中+斜体样式。
 *  Fix#4 datarest.xsl: dataRestrictions 不再把子元素包在嵌套 <table> 里，
 *        改为输出一个段标题行 + 子元素各自的 <tr> 直接落到外层状态表中。
 *
 * 所有验证通过真实UI交互：注入XML→点击预览按钮→检查iframe渲染结果，不绕过Vue层。
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

// 构造一个含 <table>（带title）与 <dataRestrictions> 的完整 dmodule
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
          <dataDistribution>本文档仅供内部分发测试文本</dataDistribution>
          <dataHandling>数据处理测试文本</dataHandling>
          <dataDestruction>数据销毁测试文本</dataDestruction>
        </restrictionInstructions>
        <restrictionInfo>
          <policyStatement>政策声明测试文本</policyStatement>
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
        <title>测试段落标题</title>
        <para>下面是一个测试表格。</para>
        <table>
          <title>测试表格标题文本</title>
          <tgroup cols="2">
            <colspec colname="c1"/>
            <colspec colname="c2"/>
            <thead>
              <row><entry>列标题A</entry><entry>列标题B</entry></row>
            </thead>
            <tbody>
              <row><entry>单元格A1</entry><entry>单元格B1</entry></row>
              <row><entry>单元格A2</entry><entry>单元格B2</entry></row>
            </tbody>
          </tgroup>
        </table>
      </levelledPara>
    </description>
  </content>
</dmodule>`

test.beforeAll(async () => {
  const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!login || !login.result || !login.result.token) {
    throw new Error('登录失败，请检查后端服务是否运行在 9999')
  }
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
  // 关键：等原始DM内容异步加载完成后再注入，否则注入会被随后加载的原始内容覆盖
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    if (!cm || !cm.CodeMirror) return false
    const v = cm.CodeMirror.getValue()
    return v.includes('identAndStatusSection') && v.length > 500
  }, { timeout: 30000 })
}

// 注入测试XML到编辑器（通过CodeMirror真实API，触发change→content-change→content绑定）
async function injectXml(page, xml) {
  await page.evaluate(x => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.setValue(x)
  }, xml)
  // 等待Vue的content-change传播
  await page.waitForTimeout(300)
  // 读回确认注入生效（防止被异步加载覆盖导致静默失败）
  const ok = await page.evaluate(() => {
    return document.querySelector('.CodeMirror').CodeMirror.getValue().includes('测试表格标题文本')
  })
  expect(ok).toBe(true)
}

async function clickPreviewAndWait(page) {
  const previewBtn = page.locator('button:has-text("预览")')
  await expect(previewBtn).toBeVisible()
  await previewBtn.click()
  await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })
  // 等待iframe blob加载
  await page.waitForFunction(() => {
    const iframe = document.querySelector('.ant-modal iframe')
    return iframe && iframe.contentDocument && iframe.contentDocument.body &&
           iframe.contentDocument.body.innerHTML.length > 100
  }, { timeout: 10000 })
  await page.waitForTimeout(500)
}

test.describe('XSLT样式修复 - 表格标题与数据限制', () => {
  test('Fix#3: 表格标题渲染为纯文本，不生成嵌套 table.tabletitle', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await clickPreviewAndWait(page)

    const result = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const tableTitle = doc.querySelector('.TableTitle')
      return {
        tableTitleExists: !!tableTitle,
        tableTitleText: tableTitle ? tableTitle.textContent.trim() : null,
        // 关键：TableTitle 内不应再有嵌套 table（旧的 table.tabletitle）
        nestedTableInTitle: tableTitle ? tableTitle.querySelectorAll('table').length : -1,
        // 全文档不应再出现 class="tabletitle" 的旧结构
        tabletitleClassCount: doc.querySelectorAll('table.tabletitle, .tabletitle').length
      }
    })

    console.log('Fix#3 结果:', JSON.stringify(result))
    expect(result.tableTitleExists).toBe(true)
    // 标题文本应包含"表"和编号+标题正文
    expect(result.tableTitleText).toContain('表')
    expect(result.tableTitleText).toContain('测试表格标题文本')
    // 核心断言：无嵌套表格
    expect(result.nestedTableInTitle).toBe(0)
    expect(result.tabletitleClassCount).toBe(0)
  })

  test('Fix#3: 表格标题继承 .TableTitle 样式（居中+斜体）', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await clickPreviewAndWait(page)

    const style = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const el = doc.querySelector('.TableTitle')
      if (!el) return null
      const s = doc.defaultView.getComputedStyle(el)
      return { textAlign: s.textAlign, fontStyle: s.fontStyle }
    })

    console.log('Fix#3 样式:', JSON.stringify(style))
    expect(style).not.toBeNull()
    expect(style.textAlign).toBe('center')
    expect(style.fontStyle).toBe('italic')
  })

  test('Fix#4: dataRestrictions 不生成嵌套表格，子行落入外层状态表', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await clickPreviewAndWait(page)

    const result = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const body = doc.body

      // 核心：任何 td.idStatus 内部都不应再直接包含 <table>（旧的嵌套表结构）
      const idStatusCells = Array.from(body.querySelectorAll('td.idStatus'))
      const cellsWithNestedTable = idStatusCells.filter(td => td.querySelector('table')).length

      // 数据限制的子字段文本应出现在预览中（说明子行被正常渲染）
      const text = body.textContent
      return {
        idStatusCellCount: idStatusCells.length,
        cellsWithNestedTable,
        hasDistribText: text.includes('本文档仅供内部分发测试文本'),
        hasHandlingText: text.includes('数据处理测试文本'),
        hasDestructText: text.includes('数据销毁测试文本')
      }
    })

    console.log('Fix#4 结果:', JSON.stringify(result))
    expect(result.idStatusCellCount).toBeGreaterThan(0)
    // 核心断言：没有任何 idStatus 单元格包含嵌套表格
    expect(result.cellsWithNestedTable).toBe(0)
    // 子字段内容正常渲染
    expect(result.hasDistribText).toBe(true)
    expect(result.hasHandlingText).toBe(true)
    expect(result.hasDestructText).toBe(true)
  })

  test('回归: 表格本体正常渲染（表头+数据行，边框保留）', async ({ page }) => {
    await openEditor(page)
    await injectXml(page, TEST_XML)
    await clickPreviewAndWait(page)

    const result = await page.evaluate(() => {
      const doc = document.querySelector('.ant-modal iframe').contentDocument
      const dataTable = doc.querySelector('table.tableBorders')
      if (!dataTable) return { found: false }
      const text = dataTable.textContent
      return {
        found: true,
        rowCount: dataTable.querySelectorAll('tr').length,
        cellCount: dataTable.querySelectorAll('td, th').length,
        hasHeaderA: text.includes('列标题A'),
        hasCellA1: text.includes('单元格A1')
      }
    })

    console.log('回归 结果:', JSON.stringify(result))
    expect(result.found).toBe(true)
    expect(result.rowCount).toBeGreaterThanOrEqual(3) // 1表头 + 2数据行
    expect(result.hasHeaderA).toBe(true)
    expect(result.hasCellA1).toBe(true)
  })
})
