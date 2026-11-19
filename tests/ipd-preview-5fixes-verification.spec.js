/**
 * IPD DM 预览 5 项修复验证测试
 *
 * 验收标准：
 *  Fix1 - 图片下方蓝色 ICN 超链接已移除（graphicHyperLink 不再输出）
 *  Fix2 - 图片无固定 width/height="100px"，改用 max-width:100%;height:auto
 *  Fix3 - 多媒体占位符 img.src 包含 avicit/ietm/viewer/images/（触发了 multimedia.xsl）
 *  Fix4 - 图注表格末尾空 td 对已被前端 JS 删除
 *  Fix5 - ipcTable 表头使用简化中文名：数量/厂商码/部件码/名称
 */

const { test, expect } = require('@playwright/test')

const API_BASE = 'http://localhost:9999/jeecg-boot'
const ICN_GRAPHIC = 'ICN-ZB1-A-000000-60101-30101-00004-A-001-01'
const ICN_VIDEO   = 'ICN-ZB1-A-000000-60101-30101-00007-A-001-01'

// ─── 测试用 IPD XML ─────────────────────────────────────────────
const IPD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <illustratedPartsCatalog>
      <figure count="1">
        <title>测试图形</title>
        <graphic boardno="${ICN_GRAPHIC}" infoEntityIdent="${ICN_GRAPHIC}"/>
        <legend>
          <definitionList>
            <definitionListItem>
              <listItemTerm>TL01</listItemTerm>
              <listItemDefinition>高娜</listItemDefinition>
            </definitionListItem>
          </definitionList>
        </legend>
      </figure>
      <multimedia>
        <multimediaObject multimediaType="video"
          boardno="${ICN_VIDEO}" infoEntityIdent="${ICN_VIDEO}"/>
      </multimedia>
      <catalogSeqNumber catalogItemNumber="001" indenture="1">
        <itemSequenceNumber itemSeqNumberValue="001">
          <quantityPerNextHigherAssy>3</quantityPerNextHigherAssy>
          <manufacturerCode>csm01</manufacturerCode>
          <partNumber>bjm01</partNumber>
        </itemSequenceNumber>
      </catalogSeqNumber>
    </illustratedPartsCatalog>
  </content>
</dmodule>`

// ─── 工具 ─────────────────────────────────────────────────────

async function getToken(request) {
  const resp = await request.post(`${API_BASE}/sys/login`, {
    data: { username: 'admin', password: '123456', captcha: '', checkKey: '' }
  })
  const body = await resp.json()
  const token = body?.result?.token
  expect(token, '登录应返回 token').toBeTruthy()
  return token
}

async function clearXsltCache(request, token) {
  const resp = await request.post(`${API_BASE}/ietm/dm-content/clearCache`, {
    headers: { 'X-Access-Token': token }
  })
  expect(resp.status(), 'clearCache 应返回 200').toBe(200)
}

async function getPreviewHtml(request, token) {
  const resp = await request.post(`${API_BASE}/ietm/dm-content/preview`, {
    headers: { 'X-Access-Token': token },
    data: { content: IPD_XML }
  })
  expect(resp.status(), '预览接口应返回 200').toBe(200)
  const body = await resp.json()
  expect(body?.result?.flag, '预览应返回 success').toBe('success')
  const html = body.result.html
  expect(html?.length, 'HTML 不应为空').toBeGreaterThan(100)
  return html
}

// ─── XSLT 层面（直接检查后端 HTML）────────────────────────────

test.describe('XSLT 层面验证（后端 API）', () => {

  let token

  test.beforeAll(async ({ request }) => {
    token = await getToken(request)
    // 清除 XSLT 模板缓存，确保使用修改后的 XSL 文件
    await clearXsltCache(request, token)
  })

  test('Fix1: 蓝色 ICN 超链接已从 HTML 中消失', async ({ request }) => {
    const html = await getPreviewHtml(request, token)
    // graphicHyperLink 模板生成的 span 有 style="cursor:hand; color:blue"
    expect(html, '不应有 color:blue 的 span').not.toContain('cursor:hand; color:blue')
    // stray '-->' 文本（原 </xsl:call-template>--> 遗留）不应出现在 ICN 后面
    expect(html).not.toMatch(new RegExp(ICN_GRAPHIC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^<]*-->'))
  })

  test('Fix2: 图片不再有固定 width/height="100px"', async ({ request }) => {
    const html = await getPreviewHtml(request, token)
    expect(html, '不应有 width="100px"').not.toContain('width="100px"')
    expect(html, '不应有 height="100px"').not.toContain('height="100px"')
    expect(html, '应有 max-width:100%').toContain('max-width:100%')
  })

  test('Fix3: 多媒体占位符输出内联SVG（无旧系统路径）', async ({ request }) => {
    const html = await getPreviewHtml(request, token)
    // 新方案：XSLT直接输出内联SVG data URI，不再使用 avicit/ 旧路径
    expect(html, '不应包含旧系统 avicit/ 路径').not.toContain('avicit/ietm/viewer/images/')
    // 占位图有 class="multimedia-placeholder" 和 data-multimedia-type
    expect(html, '应包含 multimedia-placeholder class').toContain('multimedia-placeholder')
    expect(html, '应包含 data-multimedia-type').toContain('data-multimedia-type')
    // 多媒体占位图应有 onclick 指向 showMultimediaInfo
    expect(html, '应包含 showMultimediaInfo').toContain(`showMultimediaInfo('${ICN_VIDEO}')`)
  })

  test('Fix5: ipcTable 表头使用简化中文名', async ({ request }) => {
    const html = await getPreviewHtml(request, token)
    expect(html, '应包含"数量"').toContain('数量')
    expect(html, '应包含"厂商码"').toContain('厂商码')
    expect(html, '应包含"部件码"').toContain('部件码')
    expect(html, '应包含"名称"').toContain('名称')
    // 旧 S1000D 变量名不应再出现在表头
    expect(html, '不应出现旧表头"装配单元发行单元"').not.toContain('装配单元发行单元')
    expect(html, '不应出现旧表头"零件号北约存储号"').not.toContain('零件号北约存储号')
    expect(html, '不应出现旧表头"材料名"').not.toContain('材料名')
  })
})

// ─── 前端层面（浏览器 UI）─────────────────────────────────────

async function loginAndOpenIpdPreview(page) {
  // 1. 登录
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)
  await page.fill('input[placeholder*="账号"], input[placeholder*="用户名"], input[type="text"]:visible', 'admin')
  await page.fill('input[placeholder*="密码"], input[type="password"]:visible', '123456')
  await page.locator('button:has-text("登"), button[type="submit"]').first().click()
  await page.waitForTimeout(4000)

  // 2. 直接打开 IPD DM 编辑器
  await page.goto(
    'http://localhost:3000/ietm/dm-content-editor/2122695633541234689' +
    '?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN',
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(3000)

  // 3. 点击预览按钮（title="生成HTML预览" 是 DmContentEditor 里的精确 title）
  const previewBtn = page.locator(
    'button[title*="预览"], button:has-text("预览")'
  ).first()
  await previewBtn.waitFor({ state: 'visible', timeout: 15000 })
  await previewBtn.click()
  await page.waitForTimeout(4000) // 等待 iframe onload 和 ICN 加载
}

test('Fix4+Fix1 (UI): 预览弹框内图注无空列，不显示蓝色 ICN', async ({ page }) => {
  test.setTimeout(90000)

  await loginAndOpenIpdPreview(page)

  // 预览弹框可见
  await expect(page.locator('.ant-modal-title:has-text("DM内容预览")')).toBeVisible({ timeout: 10000 })

  const iframe = page.frameLocator('.ant-modal iframe')

  // Fix1: 不存在蓝色 ICN span
  const blueSpanCount = await iframe.locator('span[style*="color:blue"]').count()
  expect(blueSpanCount, '不应存在蓝色 ICN 超链接').toBe(0)

  // Fix4: 图注表格第一行 td 数量 ≤ 2（只有 TL01+高娜 一对，空对已删除）
  const firstRowTdCount = await iframe.locator('table.tableBorders tr:first-child td').count()
  expect(firstRowTdCount, '图注表格行应只剩实际条目（≤2个td）').toBeLessThanOrEqual(2)
  expect(firstRowTdCount, '图注表格行至少有1个td').toBeGreaterThanOrEqual(1)

  // Fix2: 图片无固定 100px 尺寸
  const img = iframe.locator('img.figureLinkGraphic').first()
  if (await img.count() > 0) {
    const width  = await img.getAttribute('width')
    const height = await img.getAttribute('height')
    expect(width,  'img.width 不应为 100px').not.toBe('100px')
    expect(height, 'img.height 不应为 100px').not.toBe('100px')
  }

  await page.screenshot({ path: 'tests/screenshots/ipd-preview-5fixes.png' })
})
