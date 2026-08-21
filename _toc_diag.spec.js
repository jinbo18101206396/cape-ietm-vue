const { test } = require('@playwright/test')
const http = require('http')
const fs = require('fs')
const API = 'http://localhost:9999/jeecg-boot'
function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => { try { resolve(JSON.parse(d)) } catch(e){ resolve(null) } })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/descript.xsd">
  <identAndStatusSection><dmAddress><dmIdent>
    <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="03" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/>
    <language countryIsoCode="CN" languageIsoCode="zh"/><issueInfo issueNumber="001" inWork="01"/>
  </dmIdent><dmAddressItems><issueDate year="2026" month="08" day="06"/><dmTitle><techName>T</techName><infoName>I</infoName></dmTitle></dmAddressItems></dmAddress>
  <dmStatus issueType="new"><security securityClassification="01"/>
    <responsiblePartnerCompany enterpriseCode="ABCDE"><enterpriseName>C</enterpriseName></responsiblePartnerCompany>
    <originator enterpriseCode="ABCDE"><enterpriseName>C</enterpriseName></originator>
    <applic><displayText><simplePara>all</simplePara></displayText></applic>
    <brexDmRef><dmRef xlink:href=""><dmRefIdent><dmCode modelIdentCode="S1000D" systemDiffCode="F" systemCode="04" subSystemCode="1" subSubSystemCode="0" assyCode="0301" disassyCode="00" disassyCodeVariant="A" infoCode="022" infoCodeVariant="A" itemLocationCode="D"/></dmRefIdent></dmRef></brexDmRef>
    <qualityAssurance><unverified/></qualityAssurance></dmStatus></identAndStatusSection>
  <content>
    <description>
      <levelledPara id="lp1"><title>第一章标题</title><para>正文一</para>
        <levelledPara id="lp11"><title>第一章第一节</title><para>子正文</para></levelledPara>
        <levelledPara id="lp12"><title>第一章第二节</title><para>子正文</para></levelledPara>
      </levelledPara>
      <levelledPara id="lp2"><title>第二章标题</title><para>正文二</para></levelledPara>
    </description>
  </content>
</dmodule>`
test('toc diag', async () => {
  const login = await apiReq('POST', '/sys/login', { username:'admin', password:'123456' })
  const token = login.result.token
  const res = await apiReq('POST', '/ietm/dm-content/preview', { content: XML }, token)
  const html = res.result.html
  fs.writeFileSync('D:/workspace/IETM/cape-ietm-vue/_toc_out.html', html)
  // 提取 正文目录 段
  const m = html.match(/正文目录[\s\S]{0,1400}?<\/table>/)
  console.log('=== 正文目录 HTML 片段 ===')
  console.log(m ? m[0].replace(/\s+/g,' ') : '未找到正文目录')
  console.log('=== toc-table class 出现在 body(<table)次数 ===')
  const bodyStart = html.indexOf('</style>')
  const body = bodyStart>=0 ? html.slice(bodyStart) : html
  console.log('body 内 <table...toc-table 次数:', (body.match(/<table[^>]*toc-table/g)||[]).length)
  console.log('body 内 loclefttd 次数:', (body.match(/loclefttd/g)||[]).length)
})
