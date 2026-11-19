/**
 * IPD DM 预览图片修复回归测试
 *
 * 验收标准：
 *   1. IPD 类型 DM 预览 HTML 中，图片 <img> 必须带有 boardno 和 data-icn-code 属性
 *   2. 不再出现 BinaryResourceStreamer?pub=?? 的 broken URL
 *   3. descript / proced 类型预览不受影响（回归）
 *
 * 测试方式：直接调用后端 /ietm/dm-content/preview 接口，验证返回 HTML 结构
 * （比浏览器UI测试更稳定，直接命中根本原因）
 */

const { test, expect } = require('@playwright/test')

// 测试用 XML 片段 ─────────────────────────────────────────────

const IPD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <illustratedPartsCatalog>
      <figure id="fig-001">
        <title>Test IPD Figure</title>
        <graphic boardno="ICN-ZB1-A-00000-0-A14AL-00001-A-01-1"
                 infoEntityIdent="ICN-ZB1-A-00000-0-A14AL-00001-A-01-1"/>
      </figure>
    </illustratedPartsCatalog>
  </content>
</dmodule>`

const DESCRIPT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <levelledPara id="para-001">
        <title>Test Descript</title>
        <para>Some text.</para>
        <figure>
          <title>Descript Figure</title>
          <graphic boardno="ICN-ZB1-A-00000-0-A14AL-00002-A-01-1"
                   infoEntityIdent="ICN-ZB1-A-00000-0-A14AL-00002-A-01-1"/>
        </figure>
      </levelledPara>
    </description>
  </content>
</dmodule>`

const PROCED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <procedure>
      <mainProcedure>
        <proceduralStep id="step-001">
          <para>Step 1.</para>
          <figure>
            <title>Proced Figure</title>
            <graphic boardno="ICN-ZB1-A-00000-0-A14AL-00003-A-01-1"
                     infoEntityIdent="ICN-ZB1-A-00000-0-A14AL-00003-A-01-1"/>
          </figure>
        </proceduralStep>
      </mainProcedure>
    </procedure>
  </content>
</dmodule>`

// 工具函数 ────────────────────────────────────────────────────

async function getToken(request) {
  const resp = await request.post('http://localhost:9999/jeecg-boot/sys/login', {
    data: { username: 'admin', password: '123456', captcha: '', checkKey: '' }
  })
  const body = await resp.json()
  const token = body?.result?.token
  expect(token, '登录应返回 token').toBeTruthy()
  return token
}

async function callPreview(request, token, xmlContent) {
  const resp = await request.post('http://localhost:9999/jeecg-boot/ietm/dm-content/preview', {
    headers: { 'X-Access-Token': token },
    data: { content: xmlContent }
  })
  const body = await resp.json()
  expect(body?.result?.flag, '预览接口应返回 success').toBe('success')
  return body.result.html
}

// 测试套件 ────────────────────────────────────────────────────

test.describe('DM预览图片修复回归', () => {

  test('【P0】IPD类型 - img必须有boardno/data-icn-code，无BinaryResourceStreamer', async ({ request }) => {
    const token = await getToken(request)
    const html = await callPreview(request, token, IPD_XML)

    // 核心断言
    expect(html, 'img应带boardno属性').toContain('boardno=')
    expect(html, 'img应带data-icn-code属性').toContain('data-icn-code=')
    expect(html, 'img应带figureLinkGraphic class').toContain('figureLinkGraphic')

    // 修复验证：不再有旧式 broken URL
    expect(html, '不应出现BinaryResourceStreamer').not.toContain('BinaryResourceStreamer')
    expect(html, '不应出现pub=??').not.toContain('pub=??')
  })

  test('【回归】descript类型 - img属性未受影响', async ({ request }) => {
    const token = await getToken(request)
    const html = await callPreview(request, token, DESCRIPT_XML)

    expect(html, 'descript: img应带boardno属性').toContain('boardno=')
    expect(html, 'descript: img应带data-icn-code属性').toContain('data-icn-code=')
    expect(html, 'descript: 不应出现BinaryResourceStreamer').not.toContain('BinaryResourceStreamer')
  })

  test('【回归】proced类型 - img属性未受影响', async ({ request }) => {
    const token = await getToken(request)
    const html = await callPreview(request, token, PROCED_XML)

    expect(html, 'proced: img应带boardno属性').toContain('boardno=')
    expect(html, 'proced: img应带data-icn-code属性').toContain('data-icn-code=')
    expect(html, 'proced: 不应出现BinaryResourceStreamer').not.toContain('BinaryResourceStreamer')
  })
})
