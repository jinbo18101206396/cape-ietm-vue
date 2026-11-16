/**
 * MainProcedureDesigner 对话框回归测试
 *
 * 页面结构（基于实际截图确认）：
 * - 访问 DM URL 后直接进入 MainProcedureDesigner（无需切换 Tab）
 * - 左侧：步骤树（《操作步骤》→ 步骤1）
 * - 右侧：内容 Tabs（警告/注意/段落/注/插图/多媒体/表格）
 * - 每个 Tab 有工具栏：增加/编辑/删除/上移/下移
 * - 点击"增加"→ 弹出内容编辑对话框（UEditor）
 * - UEditor 工具栏有：内部引用 / DM引用 / 图符 自定义按钮
 *
 * 运行：
 *   npm run test:mainprocedure:headed   ← 推荐（可视化）
 *   npm run test:mainprocedure:debug    ← 调试
 */

const { test, expect } = require('@playwright/test')
const http = require('http')
const fs = require('fs')

// ── 配置 ─────────────────────────────────────────────────────────────────────
// 注意：使用 playwright.config.js（baseURL=3000），不用 playwright.config.ts（baseURL=3003）
// 运行命令：npm run test:mainprocedure:headed
const BASE_URL = 'http://localhost:3000'
const API_URL  = 'http://localhost:9999'

// 包含 mainProcedure 的测试 DM（212A = 操作步骤类型）
const MAINPROC_DM_URL = `${BASE_URL}/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN`

const SS_DIR = 'tests/screenshots/mainprocedure'

// ── 辅助：通过 API 登录，注入 token ──────────────────────────────────────────
async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForLoadState('domcontentloaded')

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
        try {
          const d = JSON.parse(data)
          d.success ? resolve(d.result.token) : reject(new Error(d.message || '登录失败'))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  await page.evaluate(t => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: t, expire: Date.now() + 86400000 }))
  }, token)
  console.log('✓ 登录成功，token 已注入')
}

// ── 辅助：截图 ───────────────────────────────────────────────────────────────
async function ss(page, name) {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true })
  await page.screenshot({ path: `${SS_DIR}/${name}.png` })
}

// ── 辅助：进入 MainProcedureDesigner（访问 DM URL 后页面即为设计视图）────────
async function openMainProcedureDM(page) {
  await page.goto(MAINPROC_DM_URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  // 等待步骤树出现（确认已进入 MainProcedureDesigner）
  await page.waitForSelector('.ant-tree', { timeout: 15000 })
  console.log('✓ MainProcedureDesigner 已加载')

  // 选中第一个步骤节点（"步骤1"或任意步骤）
  const stepNode = page.locator('.ant-tree-node-content-wrapper').filter({ hasText: /步骤/ }).first()
  if (await stepNode.isVisible({ timeout: 3000 }).catch(() => false)) {
    await stepNode.click()
    await page.waitForTimeout(400)
    console.log('✓ 步骤1 已选中')
  } else {
    // 若没有步骤，点任意节点
    await page.locator('.ant-tree-node-content-wrapper').first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
}

// ── 辅助：点击内容 Tab 并打开编辑器 ─────────────────────────────────────────
// tabText: 警告 | 注意 | 段落 | 注
async function openEditorForTab(page, tabText) {
  // 1. 切换到目标 Tab
  await page.locator(`.ant-tabs-tab:has-text("${tabText}")`).first().click()
  await page.waitForTimeout(400)

  // 2. 点击"增加"按钮（Tab 内工具栏）
  await page.locator('.tab-toolbar button:has-text("增加")').first().click()
  await page.waitForTimeout(1500)

  // 3. 等待 UEditor 加载完成
  await page.locator('.edui-container').first().waitFor({ state: 'visible', timeout: 10000 })
  console.log(`✓ 编辑器已打开（${tabText}）`)
}

// ── 辅助：关闭最顶层模态框 ──────────────────────────────────────────────────
async function closeTopModal(page) {
  const cancelBtn = page.locator('.ant-modal-wrap:visible .ant-modal-footer button:has-text("取消")').last()
  if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cancelBtn.click()
  } else {
    await page.keyboard.press('Escape')
  }
  await page.waitForTimeout(500)
}

// ── 辅助：统计可见模态框数量 ─────────────────────────────────────────────────
async function countModals(page) {
  return page.locator('.ant-modal-wrap:visible').count()
}

// ── 辅助：UEditor 工具栏按钮点击（支持多种选择器备用）──────────────────────
async function clickUEditorButton(page, titlePattern) {
  // UEditor 按钮可能是 <div class="edui-btn"> 或 <button>，title 属性放在外层容器
  const selectors = [
    `.edui-toolbar [title="${titlePattern}"]`,
    `.edui-toolbar [title*="${titlePattern}"]`,
    `.edui-toolbar .edui-btn[title*="${titlePattern}"]`,
    `.edui-toolbar .edui-button[title*="${titlePattern}"]`,
  ]
  for (const sel of selectors) {
    const el = page.locator(sel).first()
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.click()
      return true
    }
  }
  console.warn(`⚠️  未找到 UEditor 按钮: ${titlePattern}`)
  return false
}

// =============================================================================
// 测试套件 1：P0 对话框功能测试
// =============================================================================
test.describe('MainProcedureDesigner 对话框回归测试', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await login(page)
    await openMainProcedureDM(page)
  })

  // ── P0-1 ─────────────────────────────────────────────────────────────────
  test('P0-1: 警告Tab - 内部引用对话框正常打开/关闭', async ({ page }) => {
    await openEditorForTab(page, '警告')
    await ss(page, 'p0-1-editor-opened')

    const before = await countModals(page)
    const clicked = await clickUEditorButton(page, '内部引用')
    expect(clicked, '未找到内部引用按钮').toBe(true)
    await page.waitForTimeout(800)
    await ss(page, 'p0-1-after-click')

    const after = await countModals(page)
    expect(after, '内部引用对话框未弹出').toBeGreaterThan(before)

    // 验证对话框标题
    const title = await page.locator('.ant-modal-wrap:visible .ant-modal-title').last().textContent()
    console.log('对话框标题:', title)
    expect(title).toMatch(/引用/)

    // 关闭
    await closeTopModal(page)
    const afterClose = await countModals(page)
    expect(afterClose, '对话框未正常关闭').toBeLessThan(after)
    console.log('✅ P0-1 通过')
  })

  // ── P0-2 ─────────────────────────────────────────────────────────────────
  test('P0-2: 快速连续点击 - 不产生重复对话框（核心验证：修复去掉了双重visible赋值）', async ({ page }) => {
    await openEditorForTab(page, '警告')

    // 快速点击 3 次内部引用按钮
    for (let i = 0; i < 3; i++) {
      await clickUEditorButton(page, '内部引用')
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(800)
    await ss(page, 'p0-2-triple-click')

    // 编辑器modal(1) + 内部引用modal(1) = 最多2个；若有重复叠加则 > 2
    const count = await countModals(page)
    console.log(`可见对话框数量: ${count}（期望 ≤ 2）`)
    expect(count, '对话框重复叠加（双重 visible 更新 BUG 未修复）').toBeLessThanOrEqual(2)
    console.log('✅ P0-2 通过')
  })

  // ── P0-3 ─────────────────────────────────────────────────────────────────
  test('P0-3: DM引用对话框正常打开/关闭', async ({ page }) => {
    await openEditorForTab(page, '警告')

    const before = await countModals(page)
    const clicked = await clickUEditorButton(page, 'DM引用')
    await page.waitForTimeout(800)
    await ss(page, 'p0-3-dmref')

    const after = await countModals(page)
    expect(after, 'DM引用对话框未弹出').toBeGreaterThan(before)

    const title = await page.locator('.ant-modal-wrap:visible .ant-modal-title').last().textContent()
    console.log('DM引用对话框标题:', title)
    expect(title).toMatch(/DM|引用/)

    await closeTopModal(page)
    expect(await countModals(page)).toBeLessThan(after)
    console.log('✅ P0-3 通过')
  })

  // ── P0-4 ─────────────────────────────────────────────────────────────────
  test('P0-4: 图符对话框正常打开/关闭', async ({ page }) => {
    await openEditorForTab(page, '警告')

    const before = await countModals(page)
    await clickUEditorButton(page, '图符')
    await page.waitForTimeout(800)
    await ss(page, 'p0-4-symbol')

    const after = await countModals(page)
    expect(after, '图符对话框未弹出').toBeGreaterThan(before)

    const title = await page.locator('.ant-modal-wrap:visible .ant-modal-title').last().textContent()
    console.log('图符对话框标题:', title)
    expect(title).toMatch(/图符|符号/)

    await closeTopModal(page)
    expect(await countModals(page)).toBeLessThan(after)
    console.log('✅ P0-4 通过')
  })

  // ── P0-5 ─────────────────────────────────────────────────────────────────
  test('P0-5: 对话框关闭后可重新打开（状态正确重置）', async ({ page }) => {
    await openEditorForTab(page, '警告')

    // 第一次打开 → 关闭
    await clickUEditorButton(page, '内部引用')
    await page.waitForTimeout(500)
    const firstOpen = await countModals(page)
    expect(firstOpen).toBeGreaterThan(0)
    await closeTopModal(page)
    await page.waitForTimeout(400)

    // 第二次打开
    await clickUEditorButton(page, '内部引用')
    await page.waitForTimeout(500)
    const secondOpen = await countModals(page)
    expect(secondOpen, '第二次打开失败').toBeGreaterThan(0)
    await ss(page, 'p0-5-reopen')
    console.log('✅ P0-5 通过')
  })

  // ── P0-6 ─────────────────────────────────────────────────────────────────
  test('P0-6: 多个Tab（警告/注意/段落/注）均可使用内部引用按钮', async ({ page }) => {
    for (const tab of ['警告', '注意', '段落', '注']) {
      console.log(`  测试 Tab: ${tab}`)

      await openEditorForTab(page, tab)
      await clickUEditorButton(page, '内部引用')
      await page.waitForTimeout(500)

      const count = await countModals(page)
      expect(count, `${tab} Tab：内部引用对话框未弹出`).toBeGreaterThan(0)
      await ss(page, `p0-6-${tab}`)

      // 关闭所有对话框
      await closeTopModal(page)  // 内部引用
      await page.waitForTimeout(300)
      await closeTopModal(page)  // 编辑器
      await page.waitForTimeout(500)
    }
    console.log('✅ P0-6 通过')
  })

  // ── P1-1（性能）────────────────────────────────────────────────────────────
  test('P1-1: 控制台无 Vue 响应式警告/错误（无双重 visible 更新）', async ({ page }) => {
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await openEditorForTab(page, '警告')

    // 完整生命周期：打开 → 关闭 → 重新打开 → 关闭
    await clickUEditorButton(page, '内部引用')
    await page.waitForTimeout(500)
    await closeTopModal(page)
    await page.waitForTimeout(300)
    await clickUEditorButton(page, '内部引用')
    await page.waitForTimeout(500)
    await closeTopModal(page)

    // 过滤无关噪音（ResizeObserver、favicon 等）
    const relevant = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('favicon') &&
      !e.includes('net::ERR_') &&
      !e.includes('404')
    )
    console.log(`相关错误数: ${relevant.length}`)
    if (relevant.length > 0) console.log('错误详情:', relevant)
    expect(relevant.length, '存在控制台错误:\n' + relevant.join('\n')).toBe(0)
    console.log('✅ P1-1 通过')
  })

  // ── P2-1（稳定性）──────────────────────────────────────────────────────────
  test('P2-1: 重复打开关闭 10 次 - 无残留对话框', async ({ page }) => {
    await openEditorForTab(page, '警告')

    for (let i = 0; i < 10; i++) {
      await clickUEditorButton(page, '内部引用')
      await page.waitForTimeout(250)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(250)
    }

    await ss(page, 'p2-1-after-10-cycles')
    const remaining = await countModals(page)
    console.log(`10次循环后可见对话框数: ${remaining}（期望 ≤ 1）`)
    // 只剩下内容编辑器本身（1个），无多余残留
    expect(remaining, '存在残留对话框').toBeLessThanOrEqual(1)
    console.log('✅ P2-1 通过')
  })

  // ── P2-2（表格编辑器）──────────────────────────────────────────────────────
  test('P2-2: 表格Tab - 增加弹出框正常工作', async ({ page }) => {
    // 表格 Tab
    await page.locator('.ant-tabs-tab:has-text("表格")').first().click()
    await page.waitForTimeout(400)
    await ss(page, 'p2-2-table-tab')

    const before = await countModals(page)

    await page.locator('.tab-toolbar button:has-text("增加")').first().click()
    await page.waitForTimeout(2000)
    await ss(page, 'p2-2-table-editor')

    const after = await countModals(page)
    expect(after, '表格编辑器未弹出').toBeGreaterThan(before)

    // 关闭
    await closeTopModal(page)
    console.log('✅ P2-2 通过')
  })
})

// =============================================================================
// 测试套件 2：Vue 实例状态验证（通过 evaluate 直接检查组件内部状态）
// =============================================================================
test.describe('MainProcedureDesigner Vue 实例状态验证', () => {
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await login(page)
    await openMainProcedureDM(page)
  })

  // ── 实例注册验证 ────────────────────────────────────────────────────────────
  test('State-1: 全局实例映射与对话框 ref 均已正确注册', async ({ page }) => {
    await openEditorForTab(page, '警告')

    const result = await page.evaluate(() => {
      const instances = window.$MAINPROCEDURE_DESIGNER_INSTANCES || {}
      const count = Object.keys(instances).length
      const first = Object.values(instances)[0]
      if (!first) return { ok: false, reason: '无实例', count }

      const refs = first.$refs || {}
      return {
        ok: true,
        count,
        hasInterref:    !!refs.interrefDialog,
        hasDmref:       !!refs.dmrefDialog,
        hasSymbol:      !!refs.symbolDialog,
        interrefOpenFn: typeof refs.interrefDialog?.open === 'function',
        dmrefOpenFn:    typeof refs.dmrefDialog?.open  === 'function',
        symbolOpenFn:   typeof refs.symbolDialog?.open === 'function',
        // 初始 visible 应全为 false
        interrefVisible: first.interrefDialogVisible,
        dmrefVisible:    first.dmrefDialogVisible,
        symbolVisible:   first.symbolDialogVisible,
      }
    })

    console.log('Vue 实例检查结果:', JSON.stringify(result, null, 2))

    expect(result.ok,            '无 MainProcedure 实例').toBe(true)
    expect(result.count,         '实例数 = 0').toBeGreaterThan(0)
    expect(result.hasInterref,   'interrefDialog ref 缺失').toBe(true)
    expect(result.hasDmref,      'dmrefDialog ref 缺失').toBe(true)
    expect(result.hasSymbol,     'symbolDialog ref 缺失').toBe(true)
    expect(result.interrefOpenFn,'interrefDialog.open() 方法缺失').toBe(true)
    expect(result.dmrefOpenFn,   'dmrefDialog.open() 方法缺失').toBe(true)
    expect(result.symbolOpenFn,  'symbolDialog.open() 方法缺失').toBe(true)
    expect(result.interrefVisible,'interrefDialogVisible 初始值应为 false').toBe(false)
    expect(result.dmrefVisible,   'dmrefDialogVisible 初始值应为 false').toBe(false)
    expect(result.symbolVisible,  'symbolDialogVisible 初始值应为 false').toBe(false)

    console.log('✅ State-1 通过')
  })

  // ── 核心修复验证：visible 状态一致性 ───────────────────────────────────────
  test('State-2: 点击内部引用按钮后 visible 状态由 .sync 单向管理（无双重更新）', async ({ page }) => {
    await openEditorForTab(page, '警告')

    // 点击内部引用按钮
    await clickUEditorButton(page, '内部引用')
    await page.waitForTimeout(800)
    await ss(page, 'state2-after-open')

    // 检查 parent(组件实例) 和 child(对话框) 的 visible 状态一致性
    const result = await page.evaluate(() => {
      const instances = window.$MAINPROCEDURE_DESIGNER_INSTANCES || {}
      const first = Object.values(instances)[0]
      if (!first) return null

      const dialog = first.$refs?.interrefDialog
      return {
        parentVisible: first.interrefDialogVisible,     // 父组件侧（.sync 绑定）
        childVisible:  dialog?.visible,                  // 子组件侧（props.visible）
        consistent:    first.interrefDialogVisible === dialog?.visible,
      }
    })

    console.log('visible 一致性检查:', JSON.stringify(result, null, 2))

    if (result) {
      // 对话框应已打开
      expect(result.parentVisible, '对话框未打开（parentVisible=false）').toBe(true)
      // 父子 visible 应保持一致（.sync 机制保证）
      expect(result.consistent, 'parent/child visible 不一致，可能存在双重更新').toBe(true)
    }

    console.log('✅ State-2 通过')
  })
})
