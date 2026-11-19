/**
 * IPD DM 预览完整回归测试套件
 *
 * 覆盖范围：
 *  A. 本次5项新修复（API层验证）
 *  B. IPD 预览 UI 端对端（真实浏览器）
 *  C. 描述类/程序类回归（不受本次修改影响）
 *  D. 预览弹框生命周期（内存泄漏防御）
 *  E. 多媒体点击交互
 */

const { test, expect } = require('@playwright/test')

const API = 'http://localhost:9999/jeecg-boot'
const APP = 'http://localhost:3000'

const ICN_GRAPHIC = 'ICN-ZB1-A-000000-60101-30101-00004-A-001-01'
const ICN_VIDEO   = 'ICN-ZB1-A-000000-60101-30101-00007-A-001-01'

// ─── 测试 XML ─────────────────────────────────────────────────

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
          <partIdentSegment><descrForPart>测试零件</descrForPart></partIdentSegment>
        </itemSequenceNumber>
      </catalogSeqNumber>
    </illustratedPartsCatalog>
  </content>
</dmodule>`

const DESCRIPT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <levelledPara id="para-001">
        <title>测试描述</title>
        <para>正文段落。</para>
        <figure>
          <title>描述类图形</title>
          <graphic boardno="${ICN_GRAPHIC}" infoEntityIdent="${ICN_GRAPHIC}"/>
        </figure>
        <figure>
          <title>描述类多媒体</title>
          <multimedia>
            <multimediaObject multimediaType="video"
              boardno="${ICN_VIDEO}" infoEntityIdent="${ICN_VIDEO}"/>
          </multimedia>
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
          <para>步骤正文。</para>
          <figure>
            <title>程序类图形</title>
            <graphic boardno="${ICN_GRAPHIC}" infoEntityIdent="${ICN_GRAPHIC}"/>
          </figure>
        </proceduralStep>
      </mainProcedure>
    </procedure>
  </content>
</dmodule>`

// ─── 工具函数 ─────────────────────────────────────────────────

async function getToken(request) {
  const r = await request.post(`${API}/sys/login`, {
    data: { username: 'admin', password: '123456', captcha: '', checkKey: '' }
  })
  const b = await r.json()
  const tok = b?.result?.token
  expect(tok, '应获取到 token').toBeTruthy()
  return tok
}

async function clearCache(request, token) {
  const r = await request.post(`${API}/ietm/dm-content/clearCache`, {
    headers: { 'X-Access-Token': token }
  })
  expect((await r.json()).success, 'clearCache 应成功').toBe(true)
}

async function preview(request, token, xml) {
  const r = await request.post(`${API}/ietm/dm-content/preview`, {
    headers: { 'X-Access-Token': token },
    data: { content: xml }
  })
  expect(r.status()).toBe(200)
  const b = await r.json()
  expect(b?.result?.flag, '预览应返回 success').toBe('success')
  const html = b.result.html
  expect(typeof html).toBe('string')
  expect(html.length).toBeGreaterThan(100)
  return html
}

async function login(page) {
  await page.goto(`${APP}/`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1000)

  // 检查是否已登录（主布局存在则跳过）
  const alreadyLoggedIn = await page.locator('.ant-layout-sider, .ant-menu-root').first().isVisible().catch(() => false)
  if (alreadyLoggedIn) return

  // 未登录：登录页使用 placeholder "请输入账户名" / "请输入密码"
  await page.locator('input[placeholder*="账户名"], input[placeholder*="账号"], input[placeholder*="用户名"]').first().fill('admin')
  await page.locator('input[placeholder*="密码"], input[type="password"]').first().fill('123456')
  await page.locator('button:has-text("登 录"), button:has-text("登录"), button[type="submit"]').first().click()
  // 等待主应用布局出现
  await page.locator('.ant-layout-sider, .ant-menu-root, .basicLayout').first().waitFor({ state: 'visible', timeout: 20000 })
}

async function openPreviewModal(page, dmUrl) {
  await page.goto(dmUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  const btn = page.locator('button[title*="预览"], button:has-text("预览")').first()
  await btn.waitFor({ state: 'visible', timeout: 15000 })
  await btn.click()
  await page.waitForTimeout(4000)
  await expect(page.locator('.ant-modal-title:has-text("DM内容预览")')).toBeVisible({ timeout: 10000 })
  return page.frameLocator('.ant-modal iframe')
}

// ═══════════════════════════════════════════════════════════════
// A. 新修复验证（API层）
// ═══════════════════════════════════════════════════════════════

test.describe('A. 新修复验证 — API层（XSLT输出）', () => {
  let token

  test.beforeAll(async ({ request }) => {
    token = await getToken(request)
    await clearCache(request, token)
  })

  test('A1: 无蓝色ICN超链接（graphicHyperLink已删除）', async ({ request }) => {
    const html = await preview(request, token, IPD_XML)
    expect(html, '不应有 color:blue span').not.toContain('cursor:hand; color:blue')
    expect(html, '不应有 stray -->').not.toMatch(
      new RegExp(ICN_GRAPHIC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^<]*-->')
    )
  })

  test('A2: 图片无固定 100px 尺寸', async ({ request }) => {
    const html = await preview(request, token, IPD_XML)
    expect(html, '不应有 width="100px"').not.toContain('width="100px"')
    expect(html, '不应有 height="100px"').not.toContain('height="100px"')
    expect(html, '应有 max-width:100%').toContain('max-width:100%')
  })

  test('A3: 多媒体占位符输出内联SVG（无旧系统路径）', async ({ request }) => {
    const html = await preview(request, token, IPD_XML)
    expect(html, '不应有 avicit/ 路径').not.toContain('avicit/ietm/viewer/images/')
    expect(html, '不应有 .gif 旧图标').not.toMatch(/avicit\/.*\.gif/)
    expect(html, '应有 multimedia-placeholder class').toContain('multimedia-placeholder')
    expect(html, '应有 data-multimedia-type').toContain('data-multimedia-type')
    expect(html, '应有 showMultimediaInfo').toContain(`showMultimediaInfo('${ICN_VIDEO}')`)
  })

  test('A4: ipcTable 表头简化中文名', async ({ request }) => {
    const html = await preview(request, token, IPD_XML)
    expect(html).toContain('数量')
    expect(html).toContain('厂商码')
    expect(html).toContain('部件码')
    expect(html).toContain('名称')
    expect(html, '不应有旧表头').not.toContain('装配单元发行单元')
    expect(html, '不应有旧表头').not.toContain('零件号北约存储号')
    expect(html, '不应有旧表头').not.toContain('材料名')
  })

  test('A5: 多媒体模板已触发（multimedia.xsl include生效）', async ({ request }) => {
    const html = await preview(request, token, IPD_XML)
    // multimedia.xsl 的模板给每类媒体打上了 data-multimedia-type
    expect(html).toContain('data-multimedia-type="video"')
    // class="multimedia-placeholder" 确认是新模板输出的
    expect(html).toContain('class="multimedia-placeholder"')
  })
})

// ═══════════════════════════════════════════════════════════════
// B. IPD 预览 UI 端对端
// ═══════════════════════════════════════════════════════════════

test.describe('B. IPD 预览 UI 端对端', () => {
  const IPD_DM_URL = `${APP}/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN`

  test('B1: 预览弹框可正常打开', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    const iframe = await openPreviewModal(page, IPD_DM_URL)
    // 弹框内应有内容
    const body = iframe.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('B2: 无蓝色ICN超链接（UI验证）', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    const iframe = await openPreviewModal(page, IPD_DM_URL)
    const blueSpans = iframe.locator('span[style*="color:blue"]')
    expect(await blueSpans.count(), '不应有蓝色ICN span').toBe(0)
  })

  test('B3: 图片尺寸正常（非100px固定缩略）', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    const iframe = await openPreviewModal(page, IPD_DM_URL)
    const imgs = iframe.locator('img.figureLinkGraphic')
    if (await imgs.count() > 0) {
      const img = imgs.first()
      const w = await img.getAttribute('width')
      const h = await img.getAttribute('height')
      expect(w, 'img.width 不应为 100px').not.toBe('100px')
      expect(h, 'img.height 不应为 100px').not.toBe('100px')
    }
  })

  test('B4: 图注表格无末尾空列', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    const iframe = await openPreviewModal(page, IPD_DM_URL)
    const legendRows = iframe.locator('table.tableBorders tr')
    const rowCount = await legendRows.count()
    if (rowCount > 0) {
      // 取第一行，检查是否有超出实际条目数的空td
      const firstRow = legendRows.first()
      const tds = firstRow.locator('td')
      const tdCount = await tds.count()
      // 验证每行td数量为偶数（成对），且没有全空的末尾对
      if (tdCount >= 2) {
        const lastTd = tds.nth(tdCount - 1)
        const secondLastTd = tds.nth(tdCount - 2)
        const lastEmpty = !(await lastTd.textContent()).trim()
        const secLastEmpty = !(await secondLastTd.textContent()).trim()
        expect(lastEmpty && secLastEmpty, '末尾不应有空列对').toBe(false)
      }
    }
  })

  test('B5: ipcTable 表头正确（中文简化名）', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    const iframe = await openPreviewModal(page, IPD_DM_URL)
    const table = iframe.locator('table.ipcTable')
    if (await table.count() > 0) {
      const headers = await table.locator('th').allTextContents()
      const headerText = headers.join(' ')
      expect(headerText).toContain('数量')
      expect(headerText).toContain('厂商码')
      expect(headerText).toContain('部件码')
      expect(headerText).toContain('名称')
    }
  })

  test('B6: 截图留档', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    await openPreviewModal(page, IPD_DM_URL)
    await page.screenshot({
      path: 'tests/screenshots/ipd-preview-regression-B6.png',
      fullPage: false
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// C. 描述类/程序类回归（不受本次修改影响）
// ═══════════════════════════════════════════════════════════════

test.describe('C. 描述类/程序类回归 — API层', () => {
  let token

  test.beforeAll(async ({ request }) => {
    token = await getToken(request)
  })

  test('C1: 描述类 — 图片仍有 boardno/data-icn-code', async ({ request }) => {
    const html = await preview(request, token, DESCRIPT_XML)
    expect(html, 'descript: 应有 boardno').toContain('boardno=')
    expect(html, 'descript: 应有 data-icn-code').toContain('data-icn-code=')
    expect(html, 'descript: 不应有 BinaryResourceStreamer').not.toContain('BinaryResourceStreamer')
  })

  test('C2: 描述类 — 多媒体无旧系统路径', async ({ request }) => {
    const html = await preview(request, token, DESCRIPT_XML)
    expect(html, 'descript: 不应有 avicit/ 路径').not.toContain('avicit/ietm/viewer/images/')
  })

  test('C3: 程序类 — 图片仍有 boardno/data-icn-code', async ({ request }) => {
    const html = await preview(request, token, PROCED_XML)
    expect(html, 'proced: 应有 boardno').toContain('boardno=')
    expect(html, 'proced: 应有 data-icn-code').toContain('data-icn-code=')
    expect(html, 'proced: 不应有 BinaryResourceStreamer').not.toContain('BinaryResourceStreamer')
  })

  test('C4: 程序类 — 无蓝色ICN超链接（非IPD类型本不应有）', async ({ request }) => {
    const html = await preview(request, token, PROCED_XML)
    // 程序类从未有 graphicHyperLink，确认回归无误
    expect(html).not.toContain('cursor:hand; color:blue')
  })
})

// ═══════════════════════════════════════════════════════════════
// D. 预览弹框生命周期（内存泄漏防御）
// ═══════════════════════════════════════════════════════════════

test.describe('D. 预览弹框生命周期', () => {
  const IPD_DM_URL = `${APP}/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN`

  test('D1: 弹框可正常关闭', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    await openPreviewModal(page, IPD_DM_URL)

    // 关闭弹框
    const closeBtn = page.locator('.ant-modal-close, .ant-modal-close-x').first()
    await closeBtn.click()
    await page.waitForTimeout(1000)

    // 弹框应已消失
    await expect(page.locator('.ant-modal-title:has-text("DM内容预览")')).not.toBeVisible()
  })

  test('D2: 弹框关闭后可重新打开（无残留状态）', async ({ page }) => {
    test.setTimeout(120000)
    await login(page)

    // 第一次打开
    const iframe1 = await openPreviewModal(page, IPD_DM_URL)
    await expect(page.locator('.ant-modal-title:has-text("DM内容预览")')).toBeVisible()

    // 关闭
    await page.locator('.ant-modal-close, .ant-modal-close-x').first().click()
    await page.waitForTimeout(1500)
    await expect(page.locator('.ant-modal-title:has-text("DM内容预览")')).not.toBeVisible()

    // 第二次打开
    const previewBtn = page.locator('button[title*="预览"], button:has-text("预览")').first()
    await previewBtn.click()
    await page.waitForTimeout(4000)

    // 应正常显示，无残留问题
    await expect(page.locator('.ant-modal-title:has-text("DM内容预览")')).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════
// E. 多媒体点击交互
// ═══════════════════════════════════════════════════════════════

test.describe('E. 多媒体点击交互', () => {
  const IPD_DM_URL = `${APP}/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN`

  test('E1: 多媒体占位图标可见（非破损图片）', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    const iframe = await openPreviewModal(page, IPD_DM_URL)

    // 新方案：XSLT直接输出内联SVG，不再依赖avicit/路径
    // 占位图应有 class="multimedia-placeholder"
    const placeholders = iframe.locator('img.multimedia-placeholder')
    const count = await placeholders.count()
    if (count > 0) {
      // 确认图片可见（内联SVG data URI可正常加载，不会是破损图标）
      const firstPlaceholder = placeholders.first()
      await expect(firstPlaceholder).toBeVisible()

      // 确认有 onclick 指向 showMultimediaInfo
      const onclick = await firstPlaceholder.getAttribute('onclick')
      expect(onclick, '占位图应有 showMultimediaInfo onclick').toContain('showMultimediaInfo')
    }
  })

  test('E2: 点击多媒体占位图标 → 弹出多媒体预览弹框', async ({ page }) => {
    test.setTimeout(90000)
    await login(page)
    const iframe = await openPreviewModal(page, IPD_DM_URL)

    const placeholders = iframe.locator('img.multimedia-placeholder')
    if (await placeholders.count() === 0) {
      console.log('⚠️ 当前IPD DM无多媒体占位图，跳过交互测试')
      return
    }

    // 点击第一个多媒体占位图
    await placeholders.first().click()
    await page.waitForTimeout(3000)

    // 应弹出"图形/多媒体预览"弹框
    const mediaModal = page.locator('.ant-modal-title:has-text("图形/多媒体预览")')
    await expect(mediaModal).toBeVisible({ timeout: 10000 })

    // 关闭多媒体弹框
    await page.locator('.ant-modal-close, .ant-modal-close-x').last().click()
    await page.waitForTimeout(1000)
  })
})
