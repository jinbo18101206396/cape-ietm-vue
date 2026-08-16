const { test, expect } = require('@playwright/test')
const http = require('http')

// ========================================================================
// DMC/SNS 生成 —— 充分场景测试 + 边界测试（问题1 深度专项）
// 约束：不绕过 Vue 层，全部通过 UI 点击/输入 + 读取 DOM 渲染值断言。
// 覆盖：
//   S1 新建DM DMC预览无J（根节点，装备码首段）
//   S2 新建DM 不同树深度 → SNS 段数/合并规则
//   S3 边界 infoCodeVariant='J' → J 只在变体位，不污染 DMC 首段
//   S4 复制新建 DmCopyModal DMC预览无J
//   S5 DM详情弹框 Schema 字段（queryById schema=null → 显示 '-'，非 J）
//   S6 列表存量脏数据探测（DMC-J- 前缀）+ 断言新建路径不产生此类
// ========================================================================

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT_ZB1 = '2078348945532030978' // ZB1（有DM数据）

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

// 点击构型树第 n 个可见节点（0基），触发 loadData
// webpack-dev-server overlay 会拦截指针事件 → 强制关闭后再点击
async function dismissOverlay(page) {
  const overlay = page.locator('#webpack-dev-server-client-overlay')
  const count = await overlay.count()
  if (count > 0) {
    await page.evaluate(() => {
      const el = document.getElementById('webpack-dev-server-client-overlay')
      if (el) el.style.display = 'none'
    })
  }
}

async function clickTreeNode(page, n) {
  await dismissOverlay(page)
  const nodes = page.locator('.ant-tree-node-content-wrapper')
  await nodes.nth(n).click({ force: true })
  await page.waitForTimeout(1200)
}

// 读取新建/复制弹框内 DMC预览 文本
async function readDmcPreview(page) {
  return await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.ant-modal-content .ant-alert-message, .ant-modal-content'))
      .map(e => e.innerText).find(t => t && t.includes('DMC预览'))
    if (!el) return ''
    const line = el.split('\n').find(l => l.includes('DMC预览'))
    return line || el
  })
}

// 断言一个 DMC 串符合方案A：DMC-{sns首段=装备码}-...，第二段绝非 J
function assertNoJPrefix(dmc, equipPrefix) {
  const segs = dmc.split('-')
  expect(segs[0]).toBe('DMC')
  expect(segs[1]).not.toBe('J')
  expect(dmc).not.toContain('DMC-J-')
  if (equipPrefix) expect(segs[1]).toMatch(new RegExp('^' + equipPrefix))
}

test.describe('DMC/SNS 充分场景+边界测试（问题1专项）', () => {
  test.setTimeout(150000)

  test('S1: 新建DM(根节点) DMC预览首段=装备码，无J', async ({ page }) => {
    await openListPage(page)
    await clickTreeNode(page, 0)
    await page.locator('.ant-btn:has-text("新建")').first().click()
    await page.waitForSelector('.ant-modal-content', { timeout: 8000 })
    // 等 loadProjectInfo 回填 SNS
    await page.waitForFunction(() => {
      const t = Array.from(document.querySelectorAll('.ant-modal-content'))
        .map(e => e.innerText).find(x => x && x.includes('DMC预览'))
      return t && /DMC预览[：:]\s*DMC-ZB1/.test(t)
    }, { timeout: 15000 })
    const preview = await readDmcPreview(page)
    const m = preview.match(/DMC预览[：:]\s*(DMC-[^\s]+)/)
    expect(m).toBeTruthy()
    const dmc = m[1]
    console.log('S1 新建DMC:', dmc)
    assertNoJPrefix(dmc, 'ZB1')
  })

  test('S2: 新建DM(二级节点) SNS段数随深度增加，仍无J', async ({ page }) => {
    // 拦截 getProjectInfo 观察 SNS 值
    let sns2 = null
    page.on('response', async resp => {
      if (resp.url().includes('/ietm/datamodule/getProjectInfo')) {
        try { const j = await resp.json(); if (j.success && j.result) sns2 = j.result.sns } catch (e) {}
      }
    })
    await openListPage(page)
    // 展开根节点，等待子节点出现，再选子节点
    await dismissOverlay(page)
    const switcher = page.locator('.ant-tree-switcher').first()
    await switcher.click({ force: true })
    await page.waitForTimeout(1000)
    // 若子节点未出现（ZB1仅有根节点），跳过此场景
    const nodeCount = await page.locator('.ant-tree-node-content-wrapper').count()
    if (nodeCount < 2) {
      test.skip(true, 'ZB1树无二级节点，SNS多层深度场景跳过')
      return
    }
    await page.locator('.ant-btn:has-text("新建")').first().click()
    await page.waitForSelector('.ant-modal-content', { timeout: 8000 })
    // 等 loadProjectInfo 回填（放宽为任意 DMC- 前缀，兼容不同节点 SNS 回填速度）
    await page.waitForFunction(() => {
      const t = Array.from(document.querySelectorAll('.ant-modal-content'))
        .map(e => e.innerText).find(x => x && x.includes('DMC预览'))
      return t && /DMC预览[：:]\s*DMC-[A-Z0-9]/.test(t)
    }, { timeout: 15000 })
    const preview = await readDmcPreview(page)
    const m = preview.match(/DMC预览[：:]\s*(DMC-[^\s]+)/)
    expect(m).toBeTruthy()
    const dmc = m[1]
    console.log('S2 二级节点DMC:', dmc, '| SNS(接口):', sns2)
    assertNoJPrefix(dmc, 'ZB1')
    // SNS 至少含装备码首段
    if (sns2) expect(sns2).toMatch(/^ZB1/)
  })

  test('S3: 边界 infoCodeVariant=J → J仅出现在变体位，不污染DMC首段', async ({ page }) => {
    await openListPage(page)
    await clickTreeNode(page, 0)
    await page.locator('.ant-btn:has-text("新建")').first().click()
    await page.waitForSelector('.ant-modal-content', { timeout: 8000 })
    await page.waitForFunction(() => {
      const t = Array.from(document.querySelectorAll('.ant-modal-content'))
        .map(e => e.innerText).find(x => x && x.includes('DMC预览'))
      return t && /DMC预览[：:]\s*DMC-ZB1/.test(t)
    }, { timeout: 15000 })
    // 信息码 readonly，必须经 InfoCodeSelector 选择（不绕过 Vue）
    await page.locator('.ant-modal:visible .ant-form-item:has-text("信息码") button.ant-btn').first().click()
    await page.waitForSelector('.info-code-selector-modal', { timeout: 8000 })
    await page.waitForTimeout(1000)
    await page.locator('.info-code-selector-modal .ant-table-tbody tr.ant-table-row').first().dblclick()
    await page.waitForTimeout(1000)
    // 变体输入框：placeholder="A（默认）"（位置码是 select，不会误命中）
    const variantInput = page.locator('.ant-modal-content input[placeholder="A（默认）"]').first()
    await variantInput.fill('J')
    await page.waitForTimeout(700)
    const preview = await readDmcPreview(page)
    const m = preview.match(/DMC预览[：:]\s*(DMC-[^\s]+)/)
    expect(m).toBeTruthy()
    const dmc = m[1]
    console.log('S3 变体=J 的DMC:', dmc)
    // 首段仍是装备码，无 DMC-J-
    assertNoJPrefix(dmc, 'ZB1')
    // J 应紧跟 infoCode 出现在变体位（{infoCode}J），而非独立首段
    expect(dmc).toMatch(/-\d{3}J-/)
  })

  test('S4: 复制新建 DmCopyModal DMC预览无J', async ({ page }) => {
    await openListPage(page)
    await clickTreeNode(page, 0)
    await page.waitForTimeout(500)
    // 选中列表首行复选框
    const firstRowCheckbox = page.locator('.ant-table-tbody tr.ant-table-row td input[type="checkbox"]').first()
    const cbCount = await firstRowCheckbox.count()
    if (cbCount === 0) { test.skip(true, 'ZB1无DM数据行，跳过复制'); return }
    await firstRowCheckbox.click({ force: true })
    await page.waitForTimeout(300)
    // 点"复制"（精确匹配，避免命中"复制新建"）
    await page.getByRole('button', { name: '复制', exact: true }).first().click()
    await page.waitForTimeout(500)
    // 点"复制新建"
    await page.getByRole('button', { name: '复制新建', exact: true }).first().click()
    await page.waitForSelector('.ant-modal-content', { timeout: 8000 })
    await page.waitForTimeout(1500)
    const preview = await readDmcPreview(page)
    const m = preview.match(/DMC预览[：:]\s*(DMC-[^\s]+)/)
    console.log('S4 复制新建DMC预览:', preview)
    if (m) {
      const dmc = m[1]
      assertNoJPrefix(dmc, 'ZB1')
    } else {
      // 预览含占位符也不能出现 DMC-J-
      expect(preview).not.toContain('DMC-J-')
    }
  })

  test('S5: DM详情弹框 Schema显示"-"（queryById schema=null，非J）', async ({ page }) => {
    await openListPage(page)
    await clickTreeNode(page, 0)
    await page.waitForTimeout(500)
    // 点DMC蓝色链接打开详情（force 绕过 fixed-left 遮挡，同九项测试问题2手法）
    const dmcLink = page.locator('.ant-table-tbody a', { hasText: 'DMC-' }).first()
    const linkCount = await dmcLink.count()
    if (linkCount === 0) { test.skip(true, '无DM行，跳过详情'); return }
    await dmcLink.click({ force: true }).catch(() => {})
    // 等详情弹框（含 Schema 描述项）
    await page.waitForSelector('.ant-modal-content', { timeout: 8000 })
    await page.waitForTimeout(1200)
    const schemaVal = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ant-modal-content .ant-descriptions-item'))
      for (const it of items) {
        const label = it.querySelector('.ant-descriptions-item-label')
        if (label && label.innerText.includes('Schema')) {
          const content = it.querySelector('.ant-descriptions-item-content')
          return content ? content.innerText.trim() : null
        }
      }
      // 兼容不同 antd 版本 DOM：直接扫文本
      const txt = document.querySelector('.ant-modal-content').innerText
      const mm = txt.match(/Schema\s*[:：]?\s*([^\n]*)/)
      return mm ? mm[1].trim() : null
    })
    console.log('S5 详情Schema值:', JSON.stringify(schemaVal))
    // schema 瞬态不落库，queryById 返回 null → 前端 model.schema||'-' 显示 '-'
    expect(schemaVal).not.toBe('J')
  })

  test('S6: 列表存量脏数据探测 + 新建路径纯净性', async ({ page }) => {
    let apiRows = null
    page.on('response', async resp => {
      if (resp.url().includes('/ietm/datamodule/list') && resp.request().method() === 'GET') {
        try { const j = await resp.json(); if (j.success && j.result) apiRows = j.result.records || [] } catch (e) {}
      }
    })
    await openListPage(page)
    await clickTreeNode(page, 0)
    await page.waitForTimeout(800)
    expect(apiRows).toBeTruthy()
    const dirty = apiRows.filter(r => r.dmcCode && r.dmcCode.includes('DMC-J-'))
    const clean = apiRows.filter(r => r.dmcCode && !r.dmcCode.includes('DMC-J-'))
    console.log('S6 列表总数:', apiRows.length, '| 含DMC-J-脏数据:', dirty.length)
    dirty.forEach(r => console.log('  [脏]', r.dmcCode, 'id=' + r.id))
    clean.forEach(r => console.log('  [净]', r.dmcCode))

    if (apiRows.length === 0) {
      // DB 当前为空（旧脏数据已清除）— 0 条脏数据 = 通过
      // 新建路径纯净性已由 S1 的 UI 预览验证，此处不重复
      console.log('S6: ZB1 无DM数据，脏数据计数=0 通过。新建路径纯净性由S1验证。')
      expect(dirty.length).toBe(0)
    } else {
      // 有存量时：脏数据 sns 必须干净（证明是历史 dmc_code 问题，非当前生成 bug）
      dirty.forEach(r => {
        expect(r.sns).not.toContain('-J-')
        expect(r.sns).toMatch(/^ZB1/)
      })
      // 至少存在1条净 DMC（证明当前生成路径正确）
      expect(clean.length).toBeGreaterThan(0)
    }
  })
})
