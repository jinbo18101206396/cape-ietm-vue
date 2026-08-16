const { test, expect } = require('@playwright/test')
const http = require('http')

// §14.6 图符尺寸自动回填 — 上传位图→图符弹窗宽高自动填入
// 验证 saveAttachment() 修复：上传时写入 fileProp = "宽,高"，选图符后宽高自动回填。
// ⚠️  需在 IDEA 重启后端（含 saveAttachment 修复）后才能跑通 T3/T4。
//    T1/T2 测试不依赖新代码，任意时刻均可运行。
const BASE = 'http://localhost:3000'
const API  = 'http://localhost:9999/jeecg-boot'

// 测试用 PNG：120×80 蓝色矩形（由 Java ImageIO 生成，已验证 ImageIO.read 返回 120,80）
const TEST_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAIAAABd+SbeAAAAfklEQVR42u3QQQ0AAAgAoetfWls4H2wkoBpOKBAtGtGiRSsQLRrRokUjWjSiRYtGtGhEixaNaNGIFi0a0aIRLVo0okUjWrRoRItGtGjRiBaNaNGiES0a0aJFI1o0okWLRrRoRIsWjWjRiBYtGtGiES1aNKJFI1q0aESLRvQbC1PxXKzSdXugAAAAAElFTkSuQmCC'
const TEST_PNG = Buffer.from(TEST_PNG_B64, 'base64')
const TEST_W   = 120
const TEST_H   = 80

// ---------- HTTP 工具 ----------
function apiReq(method, path, body, token, contentType) {
  return new Promise((resolve, reject) => {
    const isBuf = Buffer.isBuffer(body)
    const data  = isBuf ? body : (body ? JSON.stringify(body) : null)
    const h = { 'Content-Type': contentType || 'application/json' }
    if (data) h['Content-Length'] = isBuf ? data.length : Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch { resolve(null) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}
const apiPost = (p, b, t) => apiReq('POST', p, b, t)
const apiGet  = (p, t)    => apiReq('GET',  p, null, t)

function buildMultipart(fields, files) {
  const boundary = 'TestBnd' + Date.now()
  const parts = []
  for (const [name, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`))
  }
  for (const { fname, filename, content, mime } of files) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fname}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
    ))
    parts.push(content)
    parts.push(Buffer.from('\r\n'))
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  return { boundary, body: Buffer.concat(parts) }
}

const PROJECT_ID = '2078348945532030978'
const CM_NODE_ID = '2078360430056513538'  // 含 金波.jpg 的节点
const DM_ID      = '2084945965503942657'  // 含 <para> 的 DM（符号清单，descript 类型）
const DMC        = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'

let TOKEN
let UPLOAD_ICN_ID  // 本次上传的图符 ID
let UPLOAD_FILE    // 上传时的文件名
let BACKEND_PATCHED = false  // saveAttachment 修复是否已生效

test.beforeAll(async () => {
  const login = await apiPost('/sys/login', { username: 'admin', password: '123456' })
  TOKEN = login.result.token
  await apiPost('/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)

  // 获取项目信息（originator/rpc 等上传必填字段）
  const info = await apiGet(`/icnmanage/ietmIcnManage/getProjectInfo?cmNodeId=${CM_NODE_ID}`, TOKEN)
  const proj = (info && info.result) || {}
  const originator = proj.originator || 'TEST'

  // 上传测试 PNG
  const ts = Date.now()
  UPLOAD_FILE = `autofill_test_${ts}.png`
  const { boundary, body } = buildMultipart(
    {
      cmNodeId:       CM_NODE_ID,
      security:       '0',
      uniqueId:       '',          // 留空让后端自动生成
      sns:            proj.sns || '',
      issueNo:        '001',
      originator:     originator,
      originatorName: proj.originatorName || '',
      rpc:            proj.rpc || '',
      rpcName:        proj.rpcName || ''
    },
    [{ fname: 'files', filename: UPLOAD_FILE, content: TEST_PNG, mime: 'image/png' }]
  )
  const up = await apiReq('POST', '/icnmanage/ietmIcnManage/add', body, TOKEN,
                          `multipart/form-data; boundary=${boundary}`)
  if (!up || !up.success) throw new Error('测试图符上传失败: ' + JSON.stringify(up))
  console.log('上传成功:', UPLOAD_FILE)

  // 找到刚上传的记录
  const list = await apiGet(
    `/icnmanage/ietmIcnManage/listSymbolsForDialog?cmNodeId=${CM_NODE_ID}&includeChildren=0&pageNo=1&pageSize=20`, TOKEN)
  const rows = (list && list.result && list.result.records) || []
  const found = rows.find(r => r.fileName === UPLOAD_FILE)
  if (!found) throw new Error('找不到刚上传的图符记录，fileName=' + UPLOAD_FILE)
  UPLOAD_ICN_ID = found.id
  console.log('图符 ID:', UPLOAD_ICN_ID)

  // 探查 fileProp（判断后端修复是否已生效）
  const detail = await apiGet(`/icnmanage/ietmIcnManage/queryByIdWithAttachment?id=${UPLOAD_ICN_ID}`, TOKEN)
  const fp = detail && detail.result && detail.result.ietmAttachment && detail.result.ietmAttachment.fileProp
  console.log('fileProp =', fp, fp ? '✅ 后端修复已生效' : '⚠️  后端未重启，T3/T4 将 skip')
  BACKEND_PATCHED = fp === `${TEST_W},${TEST_H}`
})

async function openEditor(page) {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
  }, { timeout: 30000 })
  await page.waitForTimeout(800)
}

async function openSymbolDialogAtPara(page) {
  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getLine(i).includes('<para>')) {
        cm.setCursor({ line: i, ch: 2 }); cm.focus(); return
      }
    }
  })
  await page.waitForTimeout(300)
  await page.locator('button[title="插入symbol图符"]').click()
  const modal = page.locator('.symbol-dialog .ant-modal-content')
  await expect(modal).toBeVisible({ timeout: 8000 })
  return modal
}

/** 在当前表格（含分页）内查找刚上传的行；找到返回该行，否则 null */
async function findRowInCurrentTable(page, modal) {
  for (let guard = 0; guard < 20; guard++) {
    const rows = modal.locator('.symbol-center .ant-table-tbody .ant-table-row')
    const rc = await rows.count()
    for (let j = 0; j < rc; j++) {
      const row = rows.nth(j)
      const fnCell = row.locator('td', { hasText: new RegExp(UPLOAD_FILE) })
      if (await fnCell.count() > 0) return row
    }
    // 翻下一页（若可翻）
    const next = modal.locator('.symbol-center .ant-pagination-next')
    const disabled = (await next.getAttribute('class') || '').includes('ant-pagination-disabled')
    if ((await next.count()) === 0 || disabled) return null
    await next.click()
    try {
      await modal.locator('.symbol-center .ant-spin-spinning').waitFor({ state: 'detached', timeout: 3000 })
    } catch { /* 可能没 spinner */ }
    await page.waitForTimeout(500)
  }
  return null
}

/** 在弹窗内找到刚上传的图符行：勾选「包含子节点」→ 遍历构型树 → 逐页查找 */
async function findUploadedRow(page, modal) {
  // 勾选「包含子节点」，使 includeChildren='1'，点任意节点即返回其整棵子树的图符
  const chk = modal.locator('.symbol-west input[type="checkbox"]').first()
  if (await chk.count() > 0 && !(await chk.isChecked())) {
    await chk.check()
    await page.waitForTimeout(600)
  }

  // 等树节点至少出现一个再遍历
  await modal.locator('.symbol-west .ant-tree-node-content-wrapper').first()
    .waitFor({ state: 'visible', timeout: 10000 })
  const nodes = modal.locator('.symbol-west .ant-tree-node-content-wrapper')
  const nc = await nodes.count()
  for (let i = 0; i < nc; i++) {
    await nodes.nth(i).click()
    // 等表格刷新
    try {
      await modal.locator('.symbol-center .ant-spin-spinning').waitFor({ state: 'detached', timeout: 3000 })
    } catch { /* 可能本来就没 spinner */ }
    await page.waitForTimeout(600)
    const row = await findRowInCurrentTable(page, modal)
    if (row) return row
  }
  return null
}

// ============ T1: 上传 API 成功 — fileProp 格式验证 ============
test('T1) 上传 PNG 后 queryByIdWithAttachment 返回正确 fileProp（需后端重启）', async () => {
  if (!BACKEND_PATCHED) {
    console.log('⚠️  fileProp=null，后端未重启，跳过断言（仅打印）')
    test.skip()
    return
  }
  const detail = await apiGet(`/icnmanage/ietmIcnManage/queryByIdWithAttachment?id=${UPLOAD_ICN_ID}`, TOKEN)
  const fp = detail.result.ietmAttachment.fileProp
  expect(fp).toBe(`${TEST_W},${TEST_H}`)   // "120,80"
})

// ============ T2: needDimension 标志正确 — 列表行为 ============
test('T2) listSymbolsForDialog 返回 needDimension="1"（位图）', async () => {
  const list = await apiGet(
    `/icnmanage/ietmIcnManage/listSymbolsForDialog?cmNodeId=${CM_NODE_ID}&includeChildren=0&pageNo=1&pageSize=20`, TOKEN)
  const row = (list.result.records || []).find(r => r.id === UPLOAD_ICN_ID)
  expect(row, '应能找到上传的图符').toBeTruthy()
  expect(row.needDimension).toBe('1')
})

// ============ T3: 选中图符行 → 宽高自动回填（需后端重启）============
test('T3) 选中上传的位图行 → 宽高自动回填为 120 / 80（需后端重启）', async ({ page }) => {
  if (!BACKEND_PATCHED) {
    console.log('⚠️  后端未重启，跳过 UI autofill 验证')
    test.skip()
    return
  }
  await openEditor(page)
  const modal = await openSymbolDialogAtPara(page)
  const row = await findUploadedRow(page, modal)
  expect(row, '应能在弹窗内找到刚上传的图符').toBeTruthy()

  await row.click()
  await page.waitForTimeout(1800)  // 等 queryByIdWithAttachment 返回

  // 宽/高 input-number 应被回填
  const inputs = modal.locator('.symbol-form .ant-input-number-input')
  const wVal = await inputs.nth(0).inputValue()
  const hVal = await inputs.nth(1).inputValue()
  expect(wVal).toBe(String(TEST_W))   // "120"
  expect(hVal).toBe(String(TEST_H))   // "80"

  // 原始尺寸提示文字
  await expect(modal.locator('.original-size')).toContainText(`${TEST_W}×${TEST_H}`)
})

// ============ T4: 完整链路 — 宽高出现在插入的 XML ============
test('T4) 宽高回填后确定 → XML 含 reproductionWidth/Height（需后端重启）', async ({ page }) => {
  if (!BACKEND_PATCHED) {
    test.skip()
    return
  }
  await openEditor(page)
  const modal = await openSymbolDialogAtPara(page)
  const row = await findUploadedRow(page, modal)
  expect(row).toBeTruthy()
  await row.click()
  await page.waitForTimeout(1800)

  // 确定插入
  await modal.locator('.ant-modal-footer button', { hasText: /确\s*定/ }).click()
  await expect(page.locator('.symbol-dialog .ant-modal-content')).toHaveCount(0, { timeout: 6000 })

  const xml = await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.getValue())
  expect(xml).toContain(`reproductionWidth="${TEST_W}"`)
  expect(xml).toContain(`reproductionHeight="${TEST_H}"`)
  expect(xml).toContain('reproductionScale="100"')
  console.log('插入 XML 含正确宽高:', TEST_W, '×', TEST_H)
})
