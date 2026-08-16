const { test, expect } = require('@playwright/test')
const http = require('http')

// ========================================================================
// 空 infoCodeVariant 一致性修复 —— 真实 UI 交互验证（不绕过 Vue 层）
// 全部通过 点击/输入 + 读取真实 DOM 渲染值 / 拦截真实提交 payload 断言。
// 覆盖本轮修复：
//   UI-1 清空变体 → DMC预览不再补'A'（DataModuleFormModal.dmcPreview 的 || '')
//   UI-2 DMC格式说明文案=新格式，非废弃9段旧格式（DataModuleFormModal:205）
//   UI-3 清空变体提交 → POST /add 请求体 infoCodeVariant === null（optionalFields 归一）
//   UI-4 复制新建清空变体提交 → POST /copyAndCreateDm 请求体 infoCodeVariant === null
// ========================================================================

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT_ZB1 = '2078348945532030978'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve({ raw: d }) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败:' + JSON.stringify(l))
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ZB1 }, TOKEN)
})

async function openListPage(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietmdatamodulemanagement`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForSelector('.ant-tree', { timeout: 45000 })
  await page.waitForTimeout(800)
}

async function dismissOverlay(page) {
  await page.evaluate(() => {
    const el = document.getElementById('webpack-dev-server-client-overlay')
    if (el) el.style.display = 'none'
  })
}

async function clickTreeNode(page, n) {
  await dismissOverlay(page)
  await page.locator('.ant-tree-node-content-wrapper').nth(n).click({ force: true })
  await page.waitForTimeout(1200)
}

// 打开新建表单并等 SNS 回填出 DMC 预览
async function openNewForm(page) {
  await page.locator('.ant-btn:has-text("新建")').first().click()
  await page.waitForSelector('.ant-modal-content', { timeout: 8000 })
  await page.waitForFunction(() => {
    const t = Array.from(document.querySelectorAll('.ant-modal-content'))
      .map(e => e.innerText).find(x => x && x.includes('DMC预览'))
    return t && /DMC预览[：:]\s*DMC-ZB1/.test(t)
  }, { timeout: 15000 })
}

// 经 InfoCodeSelector 真实选择信息码（infoCode 输入框 readonly）
async function pickInfoCode(page) {
  await page.locator('.ant-modal:visible .ant-form-item:has-text("信息码") button.ant-btn').first().click()
  await page.waitForSelector('.info-code-selector-modal', { timeout: 8000 })
  await page.waitForTimeout(1000)
  await page.locator('.info-code-selector-modal .ant-table-tbody tr.ant-table-row').first().dblclick()
  await page.waitForTimeout(1000)
}

async function readDmcPreview(page) {
  return await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.ant-modal-content .ant-alert-message, .ant-modal-content'))
      .map(e => e.innerText).find(t => t && t.includes('DMC预览'))
    if (!el) return ''
    return el.split('\n').find(l => l.includes('DMC预览')) || el
  })
}

// 通过下拉 UI 选择某个必填 a-select（按表单项 label 定位），选第一个可选项
async function selectFirstOption(page, label) {
  await page.locator(`.ant-modal:visible .ant-form-item:has-text("${label}") .ant-select`).first().click()
  await page.waitForTimeout(500)
  const opt = page.locator('.ant-select-dropdown:visible li.ant-select-dropdown-menu-item').first()
  if (await opt.count() > 0) { await opt.click(); await page.waitForTimeout(300); return true }
  await page.keyboard.press('Escape')
  return false
}

// 通过下拉 UI 选择"数据模块类型"（dmType 必填，信息码映射不上时为空会拦截提交）
async function selectDmType(page) {
  const alreadySet = await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('.ant-modal-content .ant-form-item'))
      .find(i => i.innerText.includes('数据模块类型'))
    if (!item) return false
    const sel = item.querySelector('.ant-select-selection-selected-value')
    return !!(sel && sel.innerText.trim())
  })
  if (alreadySet) return
  await page.locator('.ant-modal-content .ant-form-item:has-text("数据模块类型") .ant-select').first().click()
  await page.waitForTimeout(500)
  await page.locator('.ant-select-dropdown:visible li.ant-select-dropdown-menu-item').first().click()
  await page.waitForTimeout(400)
}

test.describe('空变体一致性 —— 真实UI验证', () => {
  test.setTimeout(150000)

  test('UI-1: 清空变体 → DMC预览不补A（{infoCode}- 而非 {infoCode}A-）', async ({ page }) => {
    await openListPage(page)
    await clickTreeNode(page, 0)
    await openNewForm(page)
    await pickInfoCode(page)

    const variantInput = page.locator('.ant-modal-content input[placeholder="A（默认）"]').first()

    // 先验证：填 'B' 时预览含 {infoCode}B
    await variantInput.fill('B')
    await page.waitForTimeout(600)
    let preview = await readDmcPreview(page)
    let m = preview.match(/DMC预览[：:]\s*(DMC-[^\s]+)/)
    expect(m).toBeTruthy()
    const withVariant = m[1]
    console.log('UI-1 变体=B:', withVariant)
    expect(withVariant).toMatch(/-\d{3}B-/) // {infoCode}B

    // 关键：清空变体 → 预览应为 {infoCode}-，绝不出现 {infoCode}A-
    await variantInput.fill('')
    await variantInput.blur()
    await page.waitForTimeout(700)
    preview = await readDmcPreview(page)
    m = preview.match(/DMC预览[：:]\s*(DMC-[^\s]+)/)
    expect(m).toBeTruthy()
    const emptyVariant = m[1]
    console.log('UI-1 变体=空:', emptyVariant)
    // 提取 infoCode（3位数字），断言其后紧跟 '-' 而非字母
    const infoMatch = emptyVariant.match(/-(\d{3})([A-Z]?)-[A-Z]?_/)
    expect(infoMatch).toBeTruthy()
    expect(infoMatch[2]).toBe('') // 变体位为空，无补 'A'
    expect(emptyVariant).toMatch(/-\d{3}-/) // {infoCode}- 直接接位置块

    // 语言/国家块必须大写，与提交前 toUpperCase + 入库DMC一致（防 zh-CN vs ZH-CN 预览分歧）
    const langBlock = emptyVariant.split('_').pop() // 末段 = {lang}-{country}
    console.log('UI-1 语言块:', langBlock)
    expect(langBlock).toBe(langBlock.toUpperCase())
    expect(langBlock).not.toMatch(/[a-z]/)
  })

  test('UI-2: DMC格式说明=新格式，无废弃的{year}/{seq}旧段', async ({ page }) => {
    await openListPage(page)
    await clickTreeNode(page, 0)
    await openNewForm(page)

    const fmtText = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('.ant-modal-content .ant-alert-message'))
        .map(e => e.innerText).find(t => t && t.includes('DMC格式') && !t.includes('预览'))
      return el || ''
    })
    console.log('UI-2 格式说明:', fmtText)
    expect(fmtText).toContain('DMC格式')
    // 新格式关键结构
    expect(fmtText).toContain('{sns}')
    expect(fmtText).toContain('{infoCode}{variant}')
    expect(fmtText).toContain('{loc}_{issue}-{work}_{lang}-{country}')
    // 废弃9段旧格式的独有标记不应出现
    expect(fmtText).not.toContain('{year}')
    expect(fmtText).not.toContain('{seq}')
    expect(fmtText).not.toContain('{orig}')
    expect(fmtText).not.toContain('{lrn}')
    expect(fmtText).not.toContain('{evt}')
  })

  test('UI-3: 清空变体提交 → POST /add 请求体 infoCodeVariant===null', async ({ page }) => {
    await openListPage(page)
    await clickTreeNode(page, 0)
    await openNewForm(page)
    await pickInfoCode(page)
    await selectDmType(page) // 必填：数据模块类型
    await selectFirstOption(page, '创作单位') // 必填：originator
    await selectFirstOption(page, '责任单位') // 必填：rpc

    // 清空变体（默认 'A'）
    const variantInput = page.locator('.ant-modal-content input[placeholder="A（默认）"]').first()
    await variantInput.fill('')
    await variantInput.blur()
    await page.waitForTimeout(500)

    // 拦截真实提交，捕获 payload 后 mock 成功响应（不落库）
    let captured = null
    await page.route('**/ietm/datamodule/add', route => {
      try { captured = route.request().postDataJSON() } catch (e) { captured = { _parseErr: String(e) } }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '（测试mock）保存成功', code: 200 })
      })
    })

    // 点保存（走真实校验 + 归一逻辑）；antd 双字按钮渲染为"保 存"，用正则匹配可见弹框footer
    await page.locator('.ant-modal:visible .ant-modal-footer').getByRole('button', { name: /保\s*存/ }).click()
    await page.waitForTimeout(1500)

    console.log('UI-3 捕获payload.infoCodeVariant:', JSON.stringify(captured && captured.infoCodeVariant))
    expect(captured).toBeTruthy()
    expect(captured.infoCodeVariant).toBeNull() // 关键：空串已归一为 null
    // 同时确认 infoCode 非空（说明选择成功、确实进了提交）
    expect(captured.infoCode).toBeTruthy()
  })

  test('UI-4: 复制新建清空变体提交 → POST /copyAndCreateDm 请求体 infoCodeVariant===null', async ({ page }) => {
    await openListPage(page)

    // 遍历树节点，找到第一个含 DM 数据行的节点（数据稀疏，需逐个探）
    const nodeCount = await page.locator('.ant-tree-node-content-wrapper').count()
    let foundRow = false
    for (let i = 0; i < nodeCount; i++) {
      await clickTreeNode(page, i)
      await page.waitForTimeout(800)
      if (await page.locator('.ant-table-tbody tr.ant-table-row').count() > 0) { foundRow = true; break }
    }
    if (!foundRow) { test.skip(true, '当前项目无任何DM数据行，跳过复制新建'); return }

    // 选中行复选框（fixed-left 固定列，用 force 绕过遮挡）
    await page.locator('.ant-table-tbody tr.ant-table-row .ant-checkbox-wrapper').first().click({ force: true })
    await page.waitForTimeout(400)
    await dismissOverlay(page)
    // 确认行已选中（"复制"按钮从 disabled 变可用）
    const copyBtn = page.locator('.ant-btn').filter({ hasText: '复制' }).filter({ hasNotText: '新建' }).first()
    await expect(copyBtn).toBeEnabled({ timeout: 5000 })
    await copyBtn.click({ force: true })
    await page.waitForTimeout(600)
    await page.locator('.ant-btn').filter({ hasText: '复制新建' }).first().click({ force: true })
    await page.waitForSelector('.ant-modal-content', { timeout: 8000 })
    await page.waitForTimeout(1500)

    // 清空变体输入（复制新建弹框 placeholder="A"）
    const variantInput = page.locator('.ant-modal-content input[placeholder="A"]').first()
    if (await variantInput.count() > 0) {
      await variantInput.fill('')
      await variantInput.blur()
      await page.waitForTimeout(400)
    }

    let captured = null
    await page.route('**/ietm/datamodule/copyAndCreateDm', route => {
      try { captured = route.request().postDataJSON() } catch (e) { captured = { _parseErr: String(e) } }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '（测试mock）复制新建成功', code: 200 })
      })
    })

    // 点保存（复制新建弹框内），正则匹配"保 存"
    await page.locator('.ant-modal:visible .ant-modal-footer').getByRole('button', { name: /保\s*存/ }).click()
    await page.waitForTimeout(1500)

    console.log('UI-4 捕获payload.infoCodeVariant:', JSON.stringify(captured && captured.infoCodeVariant))
    expect(captured).toBeTruthy()
    expect(captured.infoCodeVariant).toBeNull() // 关键：空串已归一为 null
  })
})
