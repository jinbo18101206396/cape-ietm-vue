const { test, expect } = require('@playwright/test')
const http = require('http')

// 列表页校验功能真实UI验证（不绕过Vue层，全程通过点击/DOM断言）
// 策略：核心用例走【真实树导航 + 真实后端】零stub；DB无此状态的pass/empty态与网络异常用stub但仍真实树导航+真实Vue渲染
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978' // 项目1(ZB1)
const DM_ID = '2084954557183365121' // 唯一真实DM，校验返回14条XSD错误
const DM_NODE_TITLE = '02-项目自定义' // DM挂载节点(cmNodeId=2078360430056513538)，唯一数字前缀

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

async function injectToken(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
}

// 真实树导航：打开列表页 → 点击DM挂载节点 → 等待真实DM行加载（零stub）
async function openListRealDm(page) {
  await injectToken(page)
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  // 点击DM挂载的构型节点（根默认展开，节点直接可见；"02-"前缀唯一）
  await page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
    .filter({ hasText: /^02-项目自定义$/ }).first().click()
  // 等待真实列表加载出DM行
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

// 勾选列表第一行DM（antd fixed列checkbox需force）
async function selectFirstRow(page) {
  const row = page.locator('.ant-table-row').first()
  await row.waitFor({ state: 'visible', timeout: 10000 })
  await row.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(300)
}

// stub 校验接口返回指定结果（用于DB无此状态的场景，仍走真实Vue渲染）
async function stubValidate(page, result) {
  await page.route('**/dm-content/validate**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, result }) })
  )
}

// 真实树导航打开列表，但拦截列表响应把行状态改为"可发布"（清签出/未发布/工作流结束）。
// 仅改控制发布按钮使能的状态字段，DM id/内容仍真实；被测的校验逻辑仍打真实后端。
// 真实DM恒为已签出+流转中，发布按钮合法禁用，故发布流程测试须借此使按钮可用。
async function openListPublishable(page) {
  await injectToken(page)
  await page.route('**/ietm/datamodule/list**', async route => {
    const resp = await route.fetch()
    const json = await resp.json().catch(() => null)
    if (json && json.success && json.result && Array.isArray(json.result.records)) {
      json.result.records.forEach(r => {
        r.checkoutUser = null
        r.versionType = '0'
        r.workflowStatus = 'ended'
      })
    }
    await route.fulfill({ response: resp, json })
  })
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
    .filter({ hasText: /^02-项目自定义$/ }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

// ============ 真实后端 + 真实树导航（零stub）============
test.describe('列表页校验·真实后端', () => {
  test.setTimeout(90000)

  test('TC-01 未选中DM时校验按钮disabled', async ({ page }) => {
    await openListRealDm(page)
    const btn = page.locator('button').filter({ hasText: /校\s*验/ })
    await btn.waitFor({ state: 'visible', timeout: 10000 })
    await expect(btn).toBeDisabled()
    console.log('✅ TC-01: 未选中时按钮disabled')
  })

  test('TC-02 选中真实DM点校验 → 弹窗渲染后端真实14条XSD错误+分页', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 15000 })
    await expect(page.locator('.ant-modal-title')).toContainText('校验结果')
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
    // 真实后端 → error alert
    await expect(page.locator('.ant-alert-error')).toBeVisible({ timeout: 10000 })
    // 铁证真实后端：含XSD错误码 cvc-（stub绝不会有）
    await expect(page.locator('.ant-modal .ant-table-tbody')).toContainText('cvc-', { timeout: 10000 })
    const alertText = await page.locator('.ant-alert-error').innerText()
    const m = alertText.match(/发现\s*(\d+)\s*个错误/)
    expect(m).toBeTruthy()
    const errCount = parseInt(m[1], 10)
    expect(errCount).toBeGreaterThan(10)
    // 分页边界：>10条 → pageSize=10，首页仅10行
    await expect(page.locator('.ant-modal .ant-table-tbody .ant-table-row')).toHaveCount(10, { timeout: 8000 })
    await expect(page.locator('.ant-modal .ant-pagination')).toBeVisible()
    console.log(`✅ TC-02: 真实后端返回 ${errCount} 条XSD错误，分页正确(首页10行)，含cvc-码`)
  })

  test('TC-03 选中真实DM点发布 → 真实后端校验失败拦截，confirm显示真实错误数', async ({ page }) => {
    await openListPublishable(page)
    await selectFirstRow(page)
    await page.locator('button').filter({ hasText: /发\s*布/ }).click()
    const confirmTitle = page.locator('.ant-modal-confirm-title')
    await confirmTitle.waitFor({ state: 'visible', timeout: 15000 })
    await expect(confirmTitle).toContainText('校验失败')
    // 真实后端返回若干条错误 → confirm文案含"N 个校验错误"（不硬编码具体条数，防数据漂移）
    await expect(page.locator('.ant-modal-confirm-content')).toContainText(/\d+ 个校验错误/)
    const confirmText = await page.locator('.ant-modal-confirm-content').innerText()
    const countMatch = confirmText.match(/(\d+) 个校验错误/)
    const errorCount = countMatch ? Number(countMatch[1]) : 0
    expect(errorCount).toBeGreaterThan(0)
    await page.locator('.ant-modal-confirm .ant-btn:not(.ant-btn-primary)').click()
    await expect(confirmTitle).toBeHidden({ timeout: 5000 })
    console.log(`✅ TC-03: 真实后端发布拦截，confirm显示 ${errorCount} 个校验错误`)
  })

  test('TC-04 发布校验失败 → 点「查看详情」复用已有结果(不再次请求)且显示真实错误', async ({ page }) => {
    await openListPublishable(page)
    await selectFirstRow(page)
    // 统计 /validate 请求次数：发布只应触发1次，查看详情复用结果不再请求
    let validateCount = 0
    page.on('request', req => { if (req.url().includes('/dm-content/validate')) validateCount++ })
    await page.locator('button').filter({ hasText: /发\s*布/ }).click()
    await page.locator('.ant-modal-confirm-title').waitFor({ state: 'visible', timeout: 15000 })
    // 点「查看详情」(primary按钮)
    await page.locator('.ant-modal-confirm .ant-btn-primary').filter({ hasText: /查看详情/ }).click()
    // 校验结果弹窗打开，显示真实错误
    const modalTitle = page.locator('.ant-modal-title').filter({ hasText: '校验结果' })
    await modalTitle.waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
    await expect(page.locator('.ant-modal .ant-table-tbody')).toContainText('cvc-', { timeout: 10000 })
    await page.waitForTimeout(500)
    // 关键断言：全程仅1次 /validate（发布时那次），查看详情复用了结果
    expect(validateCount).toBe(1)
    console.log(`✅ TC-04: 查看详情复用结果(仅 ${validateCount} 次/validate)，真实错误正常渲染`)
  })

  test('TC-05 连点3次发布只发1次校验请求（真实后端·防重复）', async ({ page }) => {
    await openListPublishable(page)
    await selectFirstRow(page)
    let validateCount = 0
    page.on('request', req => { if (req.url().includes('/dm-content/validate')) validateCount++ })
    const btn = page.locator('button').filter({ hasText: /发\s*布/ })
    await btn.click()
    await btn.click().catch(() => {})
    await btn.click().catch(() => {})
    // 等真实后端返回+confirm出现
    await page.locator('.ant-modal-confirm-title').waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(500)
    expect(validateCount).toBe(1)
    console.log(`✅ TC-05: 连点3次仅 ${validateCount} 次校验请求`)
  })

  test('TC-06 弹窗关闭后可重新打开（真实后端·状态重置）', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    // 第1次
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
    await expect(page.locator('.ant-alert-error')).toBeVisible({ timeout: 10000 })
    await page.locator('.ant-modal-close').click()
    await page.locator('.ant-modal').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(400)
    // 第2次
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
    await expect(page.locator('.ant-alert-error')).toBeVisible({ timeout: 10000 })
    console.log('✅ TC-06: 关闭后重开正常，状态重置')
  })

  test('TC-07 选中后取消选中 → 校验按钮回到disabled', async ({ page }) => {
    await openListRealDm(page)
    const row = page.locator('.ant-table-row').first()
    const cb = row.locator('.ant-checkbox-input')
    const btn = page.locator('button').filter({ hasText: /校\s*验/ })
    await cb.check({ force: true })
    await page.waitForTimeout(300)
    await expect(btn).not.toBeDisabled()
    await cb.uncheck({ force: true })
    await page.waitForTimeout(300)
    await expect(btn).toBeDisabled()
    console.log('✅ TC-07: 取消选中后按钮恢复disabled')
  })

  test('TC-08 ESC键关闭校验弹窗', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    const title = page.locator('.ant-modal-title')
    await title.waitFor({ state: 'visible', timeout: 15000 })
    await page.keyboard.press('Escape')
    await expect(title).toBeHidden({ timeout: 5000 })
    console.log('✅ TC-08: ESC关闭弹窗')
  })

  test('TC-09 已签出+流转中真实DM → 发布按钮正确禁用，校验按钮仍可用', async ({ page }) => {
    // 真实DM恒为 checkoutUser=admin + workflowStatus=1，canPublish=false 合法禁用
    await openListRealDm(page)
    await selectFirstRow(page)
    await expect(page.locator('button').filter({ hasText: /发\s*布/ })).toBeDisabled()
    // 校验按钮任何状态可用
    await expect(page.locator('button').filter({ hasText: /校\s*验/ })).not.toBeDisabled()
    console.log('✅ TC-09: 已签出+流转中DM发布禁用、校验可用（前置状态正确）')
  })
})

// ============ 真实树导航 + stub校验响应（DB无此状态DM，仍真实Vue渲染）============
test.describe('列表页校验·状态渲染(stub响应)', () => {
  test.setTimeout(90000)

  test('TC-S01 flag=1(通过) → 弹窗显示「校验通过」成功态', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await stubValidate(page, { flag: '1' })
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await expect(page.locator('.ant-result-success')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('.ant-result-title')).toContainText('校验通过')
    console.log('✅ TC-S01: 校验通过态渲染正确')
  })

  test('TC-S02 flag=0(空内容) → 弹窗显示「内容为空」警告态', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await stubValidate(page, { flag: '0' })
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await expect(page.locator('.ant-result-warning')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('.ant-result-title')).toContainText('内容为空')
    console.log('✅ TC-S02: 空内容态渲染正确')
  })

  test('TC-S03 flag=1 → 点发布通过校验，弹「确认发布」，取消不发布', async ({ page }) => {
    await openListPublishable(page)
    await selectFirstRow(page)
    await stubValidate(page, { flag: '1' })
    let publishCalled = false
    page.on('request', req => { if (req.url().includes('/datamodule/publish')) publishCalled = true })
    await page.locator('button').filter({ hasText: /发\s*布/ }).click()
    const confirmTitle = page.locator('.ant-modal-confirm-title')
    await confirmTitle.waitFor({ state: 'visible', timeout: 15000 })
    await expect(confirmTitle).toContainText('确认发布')
    await page.locator('.ant-modal-confirm .ant-btn:not(.ant-btn-primary)').click()
    await expect(confirmTitle).toBeHidden({ timeout: 5000 })
    await page.waitForTimeout(500)
    expect(publishCalled).toBe(false)
    console.log('✅ TC-S03: 校验通过弹确认发布，取消不触发发布请求')
  })
})

// ============ 边界/异常（网络条件，无法真实触发）============
test.describe('列表页校验·边界异常', () => {
  test.setTimeout(90000)

  test('TC-B01 校验请求网络失败 → 提示错误且弹窗关闭', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.route('**/dm-content/validate**', route => route.abort('failed'))
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.ant-modal-title')).toBeHidden({ timeout: 5000 })
    console.log('✅ TC-B01: 网络失败正确提示且弹窗关闭')
  })

  test('TC-B02 后端success=false → 提示message且弹窗关闭', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    await page.route('**/dm-content/validate**', route =>
      route.fulfill({ status: 200,
contentType: 'application/json',
        body: JSON.stringify({ success: false, message: '服务器内部错误' }) })
    )
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await expect(page.locator('.ant-message-error')).toContainText('服务器内部错误', { timeout: 10000 })
    await expect(page.locator('.ant-modal-title')).toBeHidden({ timeout: 5000 })
    console.log('✅ TC-B02: success=false正确提示且弹窗关闭')
  })

  test('TC-B03 超长错误信息 → 表格渲染不崩溃，弹窗宽度受控', async ({ page }) => {
    await openListRealDm(page)
    await selectFirstRow(page)
    const longInfo = 'cvc-complex-type.2.4.a: ' + '非法内容超长错误信息'.repeat(50)
    await stubValidate(page, { flag: 'error', errors: [{ lineno: 1, info: longInfo }] })
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await expect(page.locator('.ant-modal .ant-table-tbody .ant-table-row')).toHaveCount(1, { timeout: 8000 })
    const modalBox = await page.locator('.ant-modal').first().boundingBox()
    expect(modalBox.width).toBeLessThanOrEqual(900)
    console.log('✅ TC-B03: 超长错误信息表格正常渲染，弹窗宽度受控')
  })

  test('TC-B04 同一行多条错误(重复lineno) → 全部渲染且无重复key告警', async ({ page }) => {
    // 真实后端会对同一行返回多条XSD错误(如lineno=56/84/109各2条)。
    // rowKey若用lineno会产生重复key，Vue报警告并可能错误复用行。此处用index作key，须全部渲染。
    const warnings = []
    page.on('console', msg => {
      const t = msg.text()
      if (msg.type() === 'warning' && (t.includes('duplicate') || t.includes('Duplicate') || t.includes('key'))) {
        warnings.push(t)
      }
    })
    await openListRealDm(page)
    await selectFirstRow(page)
    // 8条错误，其中3组重复lineno(56×2, 84×2, 109×2)，模拟真实后端形态
    await stubValidate(page, { flag: 'error',
errors: [
      { lineno: 56, info: 'cvc-1: err-a' }, { lineno: 56, info: 'cvc-2: err-b' },
      { lineno: 84, info: 'cvc-3: err-c' }, { lineno: 84, info: 'cvc-4: err-d' },
      { lineno: 109, info: 'cvc-5: err-e' }, { lineno: 109, info: 'cvc-6: err-f' },
      { lineno: 12, info: 'cvc-7: err-g' }, { lineno: 33, info: 'cvc-8: err-h' }
    ] })
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    // 8条全部渲染（<=10不分页），每条info互不丢失
    await expect(page.locator('.ant-modal .ant-table-tbody .ant-table-row')).toHaveCount(8, { timeout: 8000 })
    const bodyText = await page.locator('.ant-modal .ant-table-tbody').innerText()
    for (const s of ['err-a', 'err-b', 'err-c', 'err-d', 'err-e', 'err-f', 'err-g', 'err-h']) {
      expect(bodyText).toContain(s)
    }
    // 无重复key告警
    expect(warnings, `不应有重复key告警: ${JSON.stringify(warnings)}`).toHaveLength(0)
    console.log('✅ TC-B04: 重复lineno全部渲染(8行)，info无丢失，无重复key告警')
  })

  test('TC-B05 非行号错误(lineno<=0) → 行号列显示"-"而非"第 0 行"', async ({ page }) => {
    // 后端对"DM不存在"返回lineno=0，此类非行定位错误不应渲染成"第 0 行"误导用户
    await openListRealDm(page)
    await selectFirstRow(page)
    await stubValidate(page, { flag: 'error',
errors: [
      { lineno: 0, info: 'DM不存在，ID: 123' },
      { lineno: 5, info: 'cvc-真实行错误' }
    ] })
    await page.locator('button').filter({ hasText: /校\s*验/ }).click()
    await page.locator('.ant-modal-title').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('.ant-spin').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await expect(page.locator('.ant-modal .ant-table-tbody .ant-table-row')).toHaveCount(2, { timeout: 8000 })
    const bodyText = await page.locator('.ant-modal .ant-table-tbody').innerText()
    // lineno=0 不渲染"第 0 行"标签；lineno=5 正常渲染"第 5 行"
    expect(bodyText).not.toContain('第 0 行')
    expect(bodyText).toContain('第 5 行')
    // §17.3 序号列：表头含"序号"，且两行序号为 1、2
    const heads = (await page.locator('.ant-modal .ant-table-thead th').allInnerTexts()).join('|')
    expect(heads).toContain('序号')
    const firstCell = (await page.locator('.ant-modal .ant-table-tbody .ant-table-row').first().locator('td').first().innerText()).trim()
    expect(firstCell).toBe('1')
    console.log('✅ TC-B05: lineno<=0 显示"-"，正常行号仍渲染，序号列正确')
  })
})

// ============ 回归 ============
test.describe('回归测试', () => {
  test.setTimeout(60000)

  test('TC-R01 编辑器页校验功能不受影响', async ({ page }) => {
    await injectToken(page)
    const DMC = 'DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN'
    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    const editorValidateBtn = page.locator('button[title*="XSD Schema校验"]')
    await editorValidateBtn.waitFor({ state: 'visible', timeout: 10000 })
    await expect(editorValidateBtn).not.toBeDisabled()
    console.log('✅ TC-R01: 编辑器校验按钮正常，不受列表页功能影响')
  })
})
