const { test, expect } = require('@playwright/test')
const http = require('http')

// #19 Class-B 回归：DmReferenceModal 循环引用导致 flatten 后 dmId 重复。
// 修复前 rowKey="id" → 重复 key（Vue 告警 + 行状态错乱）；修复后 :rowKey=(r,i)=>i。
// 全程真实 UI：开列表 → 选行 → 点「引用关系」→ 断言全部行渲染且无重复 key 告警。
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'
const DM_NODE_TITLE = /^02-项目自定义$/

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
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
})

async function openListRealDm(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title').filter({ hasText: DM_NODE_TITLE }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

async function selectFirstRow(page) {
  const row = page.locator('.ant-table-row').first()
  await row.waitFor({ state: 'visible', timeout: 10000 })
  await row.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(300)
}

// 构造含循环引用的引用树：C 节点循环回到祖先 A（isCircular=true），
// flatten 后 dmId 'A' 出现两次 → 修复前 rowKey="id" 必产生重复 key。
function circularTree() {
  return [
    {
      dmId: 'A',
dmcCode: 'DMC-A',
techName: '根节点A',
infoName: 'infoA',
      refType: '出引用',
isCircular: false,
      children: [
        {
          dmId: 'B',
dmcCode: 'DMC-B',
techName: '子节点B',
infoName: 'infoB',
          refType: '出引用',
isCircular: false,
          children: [
            // 循环回 A：重复 dmId 'A'
            { dmId: 'A',
dmcCode: 'DMC-A',
techName: '根节点A',
infoName: 'infoA',
              refType: '出引用',
isCircular: true }
          ]
        }
      ]
    }
  ]
}

test.describe('#19 DmReferenceModal 循环引用 rowKey 回归', () => {
  test.setTimeout(90000)

  test('循环引用(重复dmId) → 详情表全部行渲染，无重复 key 告警', async ({ page }) => {
    // 捕获控制台告警（Vue 重复 key 会走 console.warn/error）
    const warnings = []
    page.on('console', msg => {
      const t = msg.text()
      if (/duplicate key|Duplicate keys|重复/i.test(t)) warnings.push(t)
    })

    await openListRealDm(page)
    await selectFirstRow(page)

    // stub 引用树接口，返回含循环引用的树
    await page.route('**/ietm/datamodule/referenceTree**', async route => {
      await route.fulfill({
        status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: true, code: 200, result: circularTree() })
      })
    })

    await page.locator('button').filter({ hasText: /引用关系/ }).first().click()

    // 引用关系弹窗打开
    const modal = page.locator('.ant-modal').filter({ hasText: '引用详情' })
    await modal.waitFor({ state: 'visible', timeout: 10000 })
    await page.waitForTimeout(800)

    // 详情表应渲染 3 行（A、B、A-circular），一行不少
    const rows = modal.locator('.ant-table-tbody .ant-table-row')
    await expect(rows).toHaveCount(3)

    // DMC 列出现两次 DMC-A（循环节点也在），证明重复 dmId 的行都渲染出来了
    // 取每行第一列（DMC 列）单元格文本
    const dmcTexts = await modal.locator('.ant-table-tbody .ant-table-row td:first-child').allInnerTexts()
    const aCount = dmcTexts.filter(t => t.trim() === 'DMC-A').length
    expect(aCount).toBe(2)

    // 关键断言：无重复 key 告警
    expect(warnings, '不应出现重复 key 告警：' + warnings.join(' | ')).toHaveLength(0)
    console.log('✅ #19: 循环引用 3 行全渲染（DMC-A×2），无重复 key 告警')
  })
})
