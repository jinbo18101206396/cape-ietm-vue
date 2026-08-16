const { test, expect } = require('@playwright/test')
const http = require('http')

// #20 Class-B 回归：BatchStartFlowModal 节点表 rowKey 曾用可编辑的 seqno。
// 两个工作节点被改成相同 seqno 时，rowKey="seqno" 会产生重复 key →
// 勾选一行会连带勾中同 key 的另一行、删除错乱。修复：rowKey="_rid"（稳定 UUID）。
// 全程真实 UI：真实工具栏开弹窗 → 真实模板加载出 2 个工作节点 →
// 真实 a-input-number 改 seqno 制造碰撞 → 真实勾选/删除断言身份独立。
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

test.describe('#20 BatchStartFlowModal seqno 碰撞 rowKey 回归', () => {
  test.setTimeout(120000)

  test('两工作节点改成同 seqno → 勾选/删除仍按行独立（rowKey=_rid）', async ({ page }) => {
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    // 1) 列表接口透传后把 workflowStatus 置空，使真实"启动流程"闸门放行（不改真实库）
    await page.route('**/ietm/datamodule/list**', async route => {
      const resp = await route.fetch()
      const json = await resp.json()
      if (json && json.result && Array.isArray(json.result.records)) {
        json.result.records.forEach(r => { r.workflowStatus = null; r.status = '1' })
      }
      await route.fulfill({ response: resp, body: JSON.stringify(json) })
    })

    // 2) 模板列表：返回一个名字含 'DM' 的模板（触发自动匹配 → 自动加载节点）
    await page.route('**/workflow/template/getPubOwnWfTemplates', async route => {
      await route.fulfill({
        status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: true,
code: 200,
result: [
          { id: 'tmpl_dm_test', tmplname: 'DM测试流程模板', stagenames: '' }
        ] })
      })
    })

    // 3) 模板明细：两个工作节点 seqno 1、2（不同），nodename 便于区分
    await page.route('**/workflow/template/getTemplateDtl/**', async route => {
      await route.fulfill({
        status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: true,
code: 200,
result: [
          { seqno: 1, nodename: '节点甲', nodetype: '1', stagename: '', ifgetback: '' },
          { seqno: 2, nodename: '节点乙', nodetype: '2', stagename: '', ifgetback: '' }
        ] })
      })
    })

    // 打开列表并选中真实 DM
    await page.goto(`${BASE}/ietmdatamodulemanagement`)
    await page.waitForSelector('.ant-tree', { timeout: 30000 })
    await page.waitForTimeout(600)
    await page.locator('.ant-tree-title').filter({ hasText: DM_NODE_TITLE }).first().click()
    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.waitFor({ state: 'visible', timeout: 15000 })
    await firstRow.locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)

    // 点"启动流程" → 真实闸门放行 → 弹窗打开
    await page.locator('button').filter({ hasText: /启动流程/ }).first().click()
    const modal = page.locator('.ant-modal').filter({ hasText: '批量启动流程' })
    await modal.waitFor({ state: 'visible', timeout: 10000 })

    // 自动匹配模板 → 自动加载节点：应有 3 行（创建节点 + 甲 + 乙）
    const nodeRows = modal.locator('.nodes-content .ant-table-tbody .ant-table-row')
    await expect(nodeRows).toHaveCount(3, { timeout: 10000 })

    // nodename 渲染在 a-input 的 value 里（非文本），故用行内 nodename 输入框的值判定身份。
    // 模板加载顺序固定：行0=创建节点(seqno0)、行1=节点甲(seqno1)、行2=节点乙(seqno2)
    const nameVal = row => row.locator('input[placeholder="请输入节点名称"]').first().inputValue()
    const jiaRow = nodeRows.nth(1)
    const yiRow = nodeRows.nth(2)
    expect(await nameVal(jiaRow)).toBe('节点甲')
    expect(await nameVal(yiRow)).toBe('节点乙')

    // 把"节点乙"的 seqno 从 2 改成 1（与节点甲碰撞）
    const yiSeqnoInput = yiRow.locator('.ant-input-number-input').first()
    await yiSeqnoInput.click()
    await yiSeqnoInput.fill('1')
    await yiSeqnoInput.press('Enter')
    await page.waitForTimeout(300)

    // 两个工作节点现在 seqno 都是 1；仍应是三行独立数据，且身份未错乱
    await expect(nodeRows).toHaveCount(3)
    expect(await nameVal(nodeRows.nth(1))).toBe('节点甲')
    expect(await nameVal(nodeRows.nth(2))).toBe('节点乙')

    // 勾选"节点甲"行的复选框
    await jiaRow.locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(300)

    // 关键断言 1：tbody 中被勾中的复选框恰好 1 个（旧 rowKey=seqno 会连带勾中同 seqno 的乙 → 2 个）
    const checkedCount = await modal.locator('.nodes-content .ant-table-tbody .ant-checkbox-input:checked').count()
    expect(checkedCount, `应只勾中 1 行，实际 ${checkedCount}（>1 即 rowKey 碰撞）`).toBe(1)

    // 关键断言 2：被勾中的行是"节点甲"（乙的复选框应未选中）
    expect(await jiaRow.locator('.ant-checkbox-input').isChecked()).toBe(true)
    expect(await yiRow.locator('.ant-checkbox-input').isChecked()).toBe(false)

    // 删除选中 → 确认；删除后应只剩 2 行，且"节点乙"仍在（未被误删）
    await modal.locator('button').filter({ hasText: /批量删除/ }).click()
    const confirmOk = page.locator('.ant-modal-confirm .ant-btn-primary')
    await confirmOk.waitFor({ state: 'visible', timeout: 5000 })
    await confirmOk.click()
    await page.waitForTimeout(500)

    // 删除后：创建节点 + 节点乙 = 2 行；剩下的工作节点应是"节点乙"（甲被精确删除）
    await expect(nodeRows).toHaveCount(2)
    expect(await nameVal(nodeRows.nth(1))).toBe('节点乙')
    console.log('✅ #20: 同 seqno 两节点身份独立 — 勾选只中 1 行、删除精确、乙留存')
  })
})
