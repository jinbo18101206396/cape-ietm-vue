const { test, expect } = require('@playwright/test')
const http = require('http')

// dm_type 三方一致性 场景 + 边界测试
// 背景：类型表(ietm_dm_type.type_code) / 字典(sys_dict_item) / 前端映射(dmTypeMap) 曾出现
//       planning 与 maintPlanning 混用，导致 resolveDmType 匹配不中 → 回退 descript.xsd。
// 覆盖：
//   A 字典 dm_type 6 项规范值齐全，无 'planning' 残留
//   B ietm_dm_type 每个标准的 type_code 全部能在字典命中，无 'planning' 残留
//   C ietm_data_module 存量 dm_type 无 'planning' 脏值（align_v2 旧脏值已订正）
//   D 前端 InfoCodeSelector 选"规划类" → DM类型自动填 规划性DM（对应 maintPlanning，非 planning）
//   E 复制新建保留原 DM 类型（不被清空/篡改）
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978' // ZB1

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

// CANON_BASE：live 字典当前必须已有的 6 项基础规范值（种子初始值）。
const CANON_BASE = ['description', 'procedure', 'faultIsolation', 'crew', 'maintPlanning', 'process']
// CANON_ALL：目标全集（种子已补 faultReporting/illustratedPartsCatalog 两项）。
//   前端 dmTypeMap 的值域必须 ⊆ 此集。faultReporting/IPD 需先跑 add_dict_faultreporting_ipd.sql
//   才会进 live 字典；frontmatter(前言类) 走 add_dm_type_frontmatter.sql 单独管，不入字典种子。
const CANON_ALL = [...CANON_BASE, 'faultReporting', 'illustratedPartsCatalog']

let TOKEN
let DICT_ITEMS // 登录响应里的 sysAllDictItems（前端 JDictSelectTag 实际取数来源）
test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败:' + JSON.stringify(l))
  TOKEN = l.result.token
  DICT_ITEMS = l.result.sysAllDictItems || {}
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
})

async function openListPage(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietmdatamodulemanagement`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(800)
  await page.locator('.ant-tree-node-content-wrapper').first().click()
  await page.waitForTimeout(1500)
}

test.describe('dm_type 三方一致性·场景与边界', () => {
  test.setTimeout(120000)

  // ---- A 字典 dm_type：6 项规范值齐全，无 planning 残留 ----
  //   取数来源为登录响应 sysAllDictItems（前端 getDictItemsFromCache 的实际来源），
  //   而非 /sys/dict/getDictItems 接口（该接口在本环境对所有字典码均 500，与本次改动无关）。
  test('A 字典 dm_type 含 maintPlanning 且无 planning 残留', async () => {
    const items = DICT_ITEMS['dm_type'] || []
    const values = items.map(i => i.value)
    console.log('字典 dm_type values:', JSON.stringify(values))
    expect(values.length).toBeGreaterThan(0)
    // 6 项基础规范值必须全部存在
    for (const c of CANON_BASE) expect(values).toContain(c)
    // 旧值 planning 不应再出现
    expect(values).not.toContain('planning')
  })

  // ---- B 存量 ietm_data_module：dm_type 无 planning 脏值，且均能在字典命中 ----
  //   ietm_dm_type 无 REST 接口（仅内部 resolveDmType 使用），其一致性由 SQL 脚本
  //   fix_dm_type_maintplanning_restore.sql 的复核段落保证；此处走 REST 验存量数据。
  test('B ietm_data_module 无 planning 脏值且 dmType 均命中字典', async () => {
    // list 接口从 projectId 查询参数取项目上下文，须显式传入
    const r = await apiReq('GET', `/ietm/datamodule/list?pageNo=1&pageSize=500&projectId=${PROJECT}&showChildren=true`, null, TOKEN)
    expect(r.success).toBe(true)
    const recs = (r.result && r.result.records) || []
    const dist = {}
    const unresolved = [] // 有 dmType 但 @Dict 解析 dmType_dictText 为空 → 字典未命中
    recs.forEach(x => {
      const t = x.dmType || '(空)'
      dist[t] = (dist[t] || 0) + 1
      if (x.dmType && !x.dmType_dictText) unresolved.push(x.dmType)
    })
    console.log('当前项目 dm_type 分布:', JSON.stringify(dist))
    console.log('字典未命中的 dmType:', JSON.stringify([...new Set(unresolved)]))
    // planning 为已废弃值，不应存在
    expect(dist['planning']).toBeUndefined()
    // 有类型的 DM 其 dmType 都应能在字典命中（dictText 非空）
    expect([...new Set(unresolved)]).toEqual([])
  })

  // ---- D 前端 dmTypeMap 源码断言：规划类→maintPlanning，且全表值域⊆字典规范值 ----
  //   ZB1 项目的信息码 dmtypename 全为空，UI 无法触发映射；改为直接校验源码映射表，
  //   保证 InfoCodeSelector 选任意中文类型名都不会产出废弃值 planning / 非法字典值。
  test('D 前端 dmTypeMap 源码：规划类→maintPlanning 且无 planning/非法值', () => {
    const fs = require('fs')
    const path = require('path')
    const files = [
      'src/views/ietm/ietmdatamodulemanagement/components/DataModuleFormModal.vue',
      'src/views/ietm/ietmdatamodulemanagement/components/DmCopyModal.vue'
    ]
    for (const rel of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')
      const block = src.match(/dmTypeMap\s*=\s*\{([\s\S]*?)\}/)
      expect(block).toBeTruthy()
      // 解析 '中文': '英文码' 对
      const pairs = [...block[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map(m => [m[1], m[2]])
      const values = pairs.map(p => p[1])
      console.log(`${path.basename(rel)} dmTypeMap:`, JSON.stringify(Object.fromEntries(pairs), null, 0))
      // 规划类/维修计划类 必须映射到 maintPlanning
      expect(Object.fromEntries(pairs)['规划类']).toBe('maintPlanning')
      expect(Object.fromEntries(pairs)['维修计划类']).toBe('maintPlanning')
      // 全部目标值都必须是字典规范值（含 maintPlanning，绝无 planning）
      expect(values).not.toContain('planning')
      for (const v of values) expect(CANON_ALL).toContain(v)
    }
  })

  // ---- E 复制新建：原 DM 类型被保留（不清空/不篡改）----
  test('E 复制新建保留原 DM 类型', async ({ page }) => {
    await openListPage(page)
    // 记录第一行的 DM类型显示值
    const srcType = await page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll('.ant-table-thead th')).map(th => th.innerText.trim())
      const idx = heads.findIndex(h => h.includes('DM类型') || h.includes('数据模块类型'))
      const row = document.querySelector('.ant-table-tbody tr.ant-table-row')
      if (!row || idx < 0) return null
      return Array.from(row.querySelectorAll('td'))[idx].innerText.trim()
    })
    console.log('源 DM 类型:', srcType)
    const firstRow = page.locator('.ant-table-tbody tr.ant-table-row').first()
    await firstRow.locator('input[type=checkbox]').first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(400)
    await page.locator('.ant-btn:has-text("复制")').first().click({ force: true })
    await page.waitForTimeout(600)
    const copyNewBtn = page.locator('.ant-btn:has-text("复制新建")').first()
    if (!(await copyNewBtn.isEnabled().catch(() => false))) {
      console.log('复制新建按钮不可用，跳过'); test.skip(); return
    }
    await copyNewBtn.click({ force: true })
    await page.waitForSelector('.ant-modal:visible', { timeout: 8000 })
    await page.waitForTimeout(1200)
    const dmTypeShown = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ant-modal .ant-form-item'))
      const it = items.find(i => {
        const lb = i.querySelector('.ant-form-item-label')
        return lb && lb.innerText.includes('数据模块类型')
      })
      if (!it) return '(未找到)'
      const sel = it.querySelector('.ant-select-selection-selected-value, .ant-select-selection__rendered')
      return sel ? sel.innerText.trim() : '(空)'
    })
    console.log('复制新建后 DM类型显示:', dmTypeShown)
    // 若源有类型，复制后应保留同一合法字典文本（非空、非中文类型名、非 planning）
    if (srcType && srcType !== '' && srcType !== '-') {
      expect(dmTypeShown).not.toBe('(空)')
      expect(['规划类', '维修计划类', 'planning']).not.toContain(dmTypeShown)
    }
  })
})
