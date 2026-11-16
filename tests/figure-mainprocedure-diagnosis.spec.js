/**
 * 诊断验证：MainProcedure 插图列表图符不显示 + XML S1000D 合规性
 *
 * 基于截图确认的页面结构：
 * - 底部 tab: "设计视图" / "源码视图"
 * - 源码视图下 XML 中已有完整 <figure> 元素
 * - 进入设计视图需点底部 tab，非铅笔图标
 */

const { test, expect } = require('@playwright/test')

const BASE_URL  = 'http://localhost:3000'
const API_URL   = 'http://localhost:9999'
const DM_URL    = `${BASE_URL}/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN`

// ── 登录：通过 API 获取 token 注入 localStorage ───────────────────────────
async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForLoadState('domcontentloaded')

  // Node 层直接请求后端（9999），不经过前端代理
  const http = require('http')
  const token = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'admin', password: '123456' })
    const req = http.request({
      hostname: 'localhost', port: 9999,
      path: '/jeecg-boot/sys/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { const d = JSON.parse(data); d.success ? resolve(d.result.token) : reject(new Error(d.message)) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body); req.end()
  })

  await page.evaluate((t) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: t, expire: Date.now() + 86400000 }))
  }, token)
  console.log('✓ 登录成功，token 已注入')
}

async function ss(page, name) {
  await page.screenshot({ path: `tests/screenshots/fig-diag-${name}.png` })
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('MainProcedure 插图诊断', () => {
  test.setTimeout(180_000)

  // ══════════════════════════════════════════════════════════════════════════
  // 诊断1：从源码视图直接分析已保存的 XML S1000D 合规性
  // ══════════════════════════════════════════════════════════════════════════
  test('诊断1：源码视图 XML S1000D 合规性全面验证', async ({ page }) => {
    await login(page)
    await page.goto(DM_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await ss(page, 'D1-01-opened')

    // 确认在源码视图（底部 tab）
    const srcTabActive = await page.locator('.ant-tabs-tab-active:has-text("源码视图"), ' +
      '[class*="active"]:has-text("源码视图")').isVisible().catch(() => false)
    console.log('当前是否在源码视图:', srcTabActive)

    // 若在设计视图则切到源码视图
    if (!srcTabActive) {
      const srcTab = page.locator('.ant-tabs-tab:has-text("源码视图")').last()
      if (await srcTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await srcTab.click()
        await page.waitForTimeout(1000)
      }
    }
    await ss(page, 'D1-02-source-view')

    // 读取 CodeMirror XML 内容
    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      if (cm && cm.CodeMirror) return cm.CodeMirror.getValue()
      return [...document.querySelectorAll('.CodeMirror-line')].map(l => l.textContent).join('\n')
    })
    console.log('XML 总字符数:', xml.length)
    console.log('XML 片段 (前 300):', xml.substring(0, 300))

    // ── S1000D 4.0 合规性逐项检查 ──────────────────────────────────────
    console.log('\n════════ S1000D XML 合规性分析 ════════')

    // 1. 文档根元素
    const hasProcd = /xsi:noNamespaceSchemaLocation=.*proced\.xsd/.test(xml)
    console.log(`1. schema 声明 proced.xsd:    ${hasProcd ? '✓' : '✗'}`)

    // 2. xlink 命名空间声明
    const xlinkNsOnDmodule = /dmodule[^>]*xmlns:xlink=/.test(xml.substring(0, 500))
    const xlinkNsOnFigure  = /<figure[^>]*xmlns:xlink=/.test(xml)
    console.log(`2. xmlns:xlink 在 dmodule:     ${xlinkNsOnDmodule ? '✓' : '✗'}`)
    console.log(`   xmlns:xlink 在 figure:      ${xlinkNsOnFigure  ? '✓（冗余但合法）' : '无（若 dmodule 有则无需重复）'}`)

    // 3. figure 元素提取
    const figMatches = []
    const figRe = /<figure[\s\S]*?<\/figure>/g
    let m
    while ((m = figRe.exec(xml)) !== null) figMatches.push(m[0])

    // 也匹配自闭合
    const selfClose = [...xml.matchAll(/<figure[^>]*\/>/g)].map(m => m[0])
    console.log(`\n3. <figure> 元素数量: ${figMatches.length}  (自闭合: ${selfClose.length})`)

    let allCompliant = true
    for (let i = 0; i < figMatches.length; i++) {
      const fig = figMatches[i]
      console.log(`\n── figure[${i}] ──`)
      console.log('   内容:', fig.replace(/\s+/g, ' ').substring(0, 400))

      const hasId        = /\bid=["'][^"']+["']/.test(fig)
      const hasTitle     = /<title[^>]*>[^<]+<\/title>/.test(fig)
      const hasGraphic   = /<graphic\b/.test(fig)
      const hasICN       = /\binfoEntityIdent=["'][^"']+["']/.test(fig)
      const xlinkType    = /xlink:type=/.test(fig)
      const xlinkShow    = /xlink:show=/.test(fig)
      const xlinkActuate = /xlink:actuate=/.test(fig)
      const figXlinkNs   = /xmlns:xlink=/.test(fig)

      console.log(`   id 属性:              ${hasId        ? '✓ ' + (fig.match(/id="([^"]+)"/)||[])[1] : '✗ 缺失（非必填，推荐）'}`)
      console.log(`   <title> 子元素:       ${hasTitle     ? '✓ "' + (fig.match(/<title[^>]*>([^<]+)<\/title>/)||[])[1] + '"' : '✗ 缺失（S1000D 必填）'}`)
      console.log(`   <graphic> 子元素:     ${hasGraphic   ? '✓' : '✗ 缺失（S1000D 必填，至少1个）'}`)
      console.log(`   infoEntityIdent:      ${hasICN       ? '✓ ' + (fig.match(/infoEntityIdent="([^"]+)"/)||[])[1] : '✗ 缺失（graphic 必填属性）'}`)
      console.log(`   xlink:type:           ${xlinkType    ? '✓' : '✗'}`)
      console.log(`   xlink:show:           ${xlinkShow    ? '✓' : '✗'}`)
      console.log(`   xlink:actuate:        ${xlinkActuate ? '✓' : '✗'}`)
      console.log(`   figure 层 xmlns:xlink: ${figXlinkNs ? '✓（已声明）' : '无（由祖先继承）'}`)

      const compliant = hasTitle && hasGraphic && hasICN
      console.log(`   ★ S1000D 4.0 合规:    ${compliant ? '✓ 合规' : '✗ 不合规'}`)
      if (!compliant) allCompliant = false
    }

    if (selfClose.length > 0) {
      console.log(`\n── 自闭合 figure（不合规）──`)
      selfClose.forEach((f, i) => {
        console.log(`   selfClose[${i}]: ${f}`)
        console.log(`   ✗ 空元素：缺少 <title> 和 <graphic>，不符合 S1000D 4.0`)
        allCompliant = false
      })
    }

    // 4. xlink 属性一致性
    const xlinkRefs  = (xml.match(/xlink:/g)  || []).length
    const xlinkUnder = (xml.match(/xlink_/g)  || []).length
    console.log(`\n4. xlink: 引用总数: ${xlinkRefs}，未恢复 xlink_ 数量: ${xlinkUnder}`)
    if (xlinkUnder > 0) console.log('   ✗ 存在未恢复的 xlink_ 属性名 → XML 命名空间错误')

    console.log(`\n════════ 总结: XML ${allCompliant ? '✓ 完全符合' : '✗ 不符合'} S1000D 4.0 ════════\n`)

    // 断言：至少存在一个 figure（从截图已知有）
    expect(figMatches.length + selfClose.length).toBeGreaterThan(0)
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 诊断2：设计视图 — 插图列表图符预览
  // ══════════════════════════════════════════════════════════════════════════
  test('诊断2：设计视图插图列表图符预览验证', async ({ page }) => {
    await login(page)
    await page.goto(DM_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await ss(page, 'D2-01-opened')

    // ── 切换到设计视图（底部 tab）────────────────────────────────────────
    const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")').last()
    await designTab.waitFor({ state: 'visible', timeout: 10000 })
    await designTab.click()
    await page.waitForTimeout(2000)
    await ss(page, 'D2-02-design-view')

    // 确认设计视图已加载 — 找到操作步骤区域
    // 截图显示：设计视图有多个可折叠面板（准备工作、操作步骤等）
    const hasMainProc = await page.locator('text=操作步骤').first().isVisible().catch(() => false)
    console.log('设计视图是否显示"操作步骤":', hasMainProc)

    if (!hasMainProc) {
      // 尝试展开操作步骤区域
      const expandBtn = page.locator('[class*="collapse"] .ant-collapse-header:has-text("操作步骤"), ' +
        '.section:has-text("操作步骤") .expand-btn').first()
      await expandBtn.click().catch(() => {})
      await page.waitForTimeout(1000)
    }
    await ss(page, 'D2-03-main-proc-visible')

    // ── 找到 mainProcedure 的设计器区域 ─────────────────────────────────
    // 在设计视图里点击"mainProcedure"区域的铅笔/编辑图标，或直接点该区域
    // 页面底部的"设计视图" tab 实际上打开的是 DM 整体设计视图（包含 preliminaryRqmts、mainProcedure 等）
    // 点击"操作步骤"旁的铅笔图标进入 MainProcedureDesigner
    const procPencil = page.locator(
      ':text("操作步骤") ~ button, ' +
      ':text("操作步骤") + span button, ' +
      '[class*="main-procedure"] [class*="edit"], ' +
      '[class*="mainProcedure"] button'
    ).first()

    if (await procPencil.isVisible({ timeout: 3000 }).catch(() => false)) {
      await procPencil.click()
      await page.waitForTimeout(1500)
      await ss(page, 'D2-04-after-pencil')
    } else {
      // 尝试直接点"操作步骤"文本
      await page.locator('text=操作步骤').first().click().catch(() => {})
      await page.waitForTimeout(1000)
      await ss(page, 'D2-04-after-click')
    }

    // ── 识别是否进入了 MainProcedureDesigner ─────────────────────────────
    const inDesigner = await page.locator(
      '.ant-tree-node-content-wrapper, ' +
      '[class*="procedure-tree"], ' +
      '[class*="step-tree"]'
    ).first().isVisible({ timeout: 5000 }).catch(() => false)
    console.log('是否进入 MainProcedureDesigner:', inDesigner)

    // ── 点击步骤节点 ──────────────────────────────────────────────────────
    const stepNode = page.locator('.ant-tree-node-content-wrapper').filter({ hasText: '步骤' }).first()
    if (await stepNode.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stepNode.click()
      await page.waitForTimeout(500)
      console.log('✓ 步骤1 已选中')
    } else {
      console.log('⚠ 未找到步骤树节点，当前 URL:', page.url())
      await ss(page, 'D2-04-no-step-tree')
    }

    // ── 切换到插图 tab ────────────────────────────────────────────────────
    const figTab = page.locator('.ant-tabs-tab').filter({ hasText: '插图' }).first()
    if (await figTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await figTab.click()
      await page.waitForTimeout(500)
      await ss(page, 'D2-05-figure-tab')

      // ── 核心检查：插图列表列定义 & 图符预览 ──────────────────────────
      const colHeaders = await page.locator('.ant-table-thead th').allTextContents()
      console.log('\n★ 插图表格列头:', JSON.stringify(colHeaders))

      const rows = await page.locator('.ant-table-tbody tr').count()
      console.log('★ 插图列表行数:', rows)

      for (let i = 0; i < rows; i++) {
        const rowText = await page.locator('.ant-table-tbody tr').nth(i).textContent()
        const rowHtml = await page.locator('.ant-table-tbody tr').nth(i).innerHTML()
        const hasImg  = /<img/.test(rowHtml)
        console.log(`  行${i + 1}: text="${rowText.trim()}" | 有img=${hasImg}`)
        if (hasImg) {
          const imgSrc = await page.locator('.ant-table-tbody tr').nth(i).locator('img').first().getAttribute('src').catch(() => '')
          console.log(`         img.src="${imgSrc}"`)
        }
      }

      const totalImg = await page.locator('.ant-table-tbody img').count()
      console.log('\n★ 插图列 img 总数:', totalImg)

      console.log('\n════════ 问题1根因确认 ════════')
      if (totalImg === 0) {
        console.log('✗ 插图列【无图符预览】')
        console.log('  代码根因：')
        console.log('  1. getContentColumns("figure") → dataIndex:"title", slot:xmlTitle')
        console.log('  2. xmlTitle slot → <span>{{ text }}</span>  (纯文字，无 img)')
        console.log('  3. getContentData("figure") → 未提取 ICN 编码字段')
        console.log('  4. 对比 LevelledParaDesigner 有 _loadFigureImage() 渲染预览')
      } else {
        console.log('✓ 存在图符预览, img 数量:', totalImg)
      }
      console.log('══════════════════════════════\n')

      // 断言列头存在（无论有无图符，列头必须有）
      expect(colHeaders.length).toBeGreaterThan(0)
    } else {
      console.log('⚠ 未找到插图 tab，记录当前页面')
      await ss(page, 'D2-05-no-figure-tab')
    }

    await ss(page, 'D2-06-final')
  })

  // ══════════════════════════════════════════════════════════════════════════
  // 诊断3：完整添加插图流程 → 验证新建 figure 的 XML 合规性
  // ══════════════════════════════════════════════════════════════════════════
  test('诊断3：新增插图完整流程 + 生成 XML 验证', async ({ page }) => {
    await login(page)
    await page.goto(DM_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // ── 进入设计视图 → 操作步骤 → 步骤1 → 插图 tab ──────────────────────
    const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")').last()
    await designTab.waitFor({ state: 'visible', timeout: 10000 })
    await designTab.click()
    await page.waitForTimeout(2000)
    await ss(page, 'D3-01-design-view')

    // 操作步骤区域 — 找铅笔图标打开 MainProcedureDesigner
    // 根据截图：页面标题旁有铅笔图标 ◄操作步骤►
    const mainProcPencil = page.locator(
      '[class*="pencil"], [class*="edit-icon"], ' +
      'button[title*="编辑"], button[title*="设计"]'
    ).filter({ hasText: '' }).first()

    // 更精确：找包含"操作步骤"的区域内的编辑按钮
    const opStepArea = page.locator(':text("操作步骤")').first()
    await opStepArea.waitFor({ state: 'visible', timeout: 10000 })
    console.log('✓ 找到操作步骤区域')
    await ss(page, 'D3-02-found-main-proc')

    // 获取操作步骤区域的 bounding box，定位铅笔按钮
    const bbox = await opStepArea.boundingBox()
    if (bbox) {
      // 铅笔图标通常在标题行右侧或左侧
      await page.mouse.move(bbox.x + bbox.width + 20, bbox.y + bbox.height / 2)
      await page.waitForTimeout(300)
    }

    // 尝试多种选择器找到 mainProcedure 的编辑入口
    let openedDesigner = false

    // 方式1：点击操作步骤文字（某些实现点击标题直接展开设计器）
    await opStepArea.click().catch(() => {})
    await page.waitForTimeout(1000)
    openedDesigner = await page.locator('.ant-tree-node-content-wrapper').isVisible().catch(() => false)
    console.log('方式1（点击标题）是否打开设计器:', openedDesigner)
    await ss(page, 'D3-03-after-title-click')

    if (!openedDesigner) {
      // 方式2：点操作步骤文字旁边的 icon（取其 parent element 的 icon 子元素）
      const parentEl = page.locator(':text("操作步骤")').first().locator('..')
      const iconBtn = parentEl.locator('.anticon, svg, [class*="btn"], button').first()
      if (await iconBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await iconBtn.click()
        await page.waitForTimeout(1000)
        openedDesigner = await page.locator('.ant-tree-node-content-wrapper').isVisible().catch(() => false)
        console.log('方式2（icon 按钮）是否打开设计器:', openedDesigner)
        await ss(page, 'D3-04-after-icon-click')
      }
    }

    // ── 若设计器打开，执行添加插图流程 ──────────────────────────────────
    if (openedDesigner) {
      // 选步骤1
      const step1 = page.locator('.ant-tree-node-content-wrapper').filter({ hasText: '步骤' }).first()
      await step1.click().catch(() => {})
      await page.waitForTimeout(300)

      // 插图 tab
      await page.locator('.ant-tabs-tab').filter({ hasText: '插图' }).first().click()
      await page.waitForTimeout(500)
      const beforeRows = await page.locator('.ant-table-tbody tr').count()
      console.log('添加前插图行数:', beforeRows)

      // 点增加
      await page.locator('button').filter({ hasText: '增加' }).first().click()
      await page.waitForTimeout(1500)
      await ss(page, 'D3-05-add-dialog')

      // 填标题
      const titleInput = page.locator('.ant-modal-body input').first()
      await titleInput.fill('Playwright测试插图').catch(() => {})

      // 添加图形
      const addGraphicBtn = page.locator('.ant-modal-body button').filter({ hasText: '增加' }).first()
      if (await addGraphicBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addGraphicBtn.click()
        await page.waitForTimeout(2000)
        await ss(page, 'D3-06-symbol-dialog')

        // 选第一行
        await page.locator('.ant-modal .ant-table-tbody tr').first()
          .waitFor({ state: 'visible', timeout: 15000 })
        await page.locator('.ant-modal .ant-table-tbody tr').first().click()
        await page.waitForTimeout(500)

        // 确认图符
        await page.locator('.ant-modal-footer button').filter({ hasText: '确定' }).last().click()
        await page.waitForTimeout(1000)
        await ss(page, 'D3-07-after-symbol')
      }

      // 确认 figure
      await page.locator('.ant-modal-footer button').filter({ hasText: '确定' }).last().click()
      await page.waitForTimeout(1000)
      await ss(page, 'D3-08-after-figure-confirm')

      const afterRows = await page.locator('.ant-table-tbody tr').count()
      console.log('添加后插图行数:', afterRows)
      console.log('新增了 figure:', afterRows > beforeRows)

      // 保存
      await page.locator('button:has-text("保存")').last().click()
      await page.waitForTimeout(2000)
      await ss(page, 'D3-09-after-save')

    } else {
      console.log('⚠ 设计器未打开，跳过添加流程，仅验证现有 XML')
    }

    // ── 切源码视图，验证生成 XML ─────────────────────────────────────────
    const srcTab = page.locator('.ant-tabs-tab:has-text("源码视图")').last()
    if (await srcTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await srcTab.click()
      await page.waitForTimeout(1000)
    }
    await ss(page, 'D3-10-source-after-save')

    const xml = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      if (cm && cm.CodeMirror) return cm.CodeMirror.getValue()
      return [...document.querySelectorAll('.CodeMirror-line')].map(l => l.textContent).join('\n')
    })

    // 提取所有 figure
    const figs = [...xml.matchAll(/<figure[\s\S]*?<\/figure>/g)].map(m => m[0])
    const selfClose = [...xml.matchAll(/<figure[^>]*\/>/g)].map(m => m[0])
    console.log(`\n★ 保存后 figure 总数: ${figs.length}（自闭合: ${selfClose.length}）`)

    figs.forEach((fig, i) => {
      const ok = /<title/.test(fig) && /<graphic/.test(fig) && /infoEntityIdent/.test(fig)
      console.log(`figure[${i}]: S1000D=${ok ? '✓合规' : '✗不合规'} | ${fig.replace(/\s+/g,' ').substring(0,150)}`)
    })
    selfClose.forEach((f, i) => {
      console.log(`selfClose[${i}]: ✗ 自闭合空元素 | ${f}`)
    })

    await ss(page, 'D3-11-final')
  })
})
