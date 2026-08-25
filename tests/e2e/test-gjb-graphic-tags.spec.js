/**
 * 测试各种GJB图形元素标签名
 */

const { test } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'

async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)
  await page.locator('#username').fill('admin')
  await page.locator('#password').fill('123456')
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(5000)
}

async function openProject(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)
  const openBtn = page.locator('.ant-table-tbody tr').first().locator('button:has-text("打开项目")')
  if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openBtn.click()
    await page.waitForTimeout(2000)
    const c = page.locator('button:has-text("确 认")').first()
    if (await c.isVisible({ timeout: 2000 }).catch(() => false)) { await c.click(); await page.waitForTimeout(3000) }
  }
}

test('测试GJB图形标签名', async ({ page }) => {
  test.setTimeout(120000)

  page.on('console', msg => {
    const t = msg.text()
    if (t.includes('[_correctIcn]') || t.includes('图形元素')) console.log('  [浏览器]', t)
  })

  await login(page)
  await openProject(page)

  const dmId = await page.evaluate(async () => {
    const token = localStorage.getItem('pro__Access-Token')
    let tv = ''
    if (token) { try { tv = JSON.parse(token).value } catch (e) { tv = token } }
    const headers = { 'X-Access-Token': tv, 'Content-Type': 'application/json' }
    const p = await fetch('/jeecg-boot/ietmproject/ietmProject/getCurrentProject', { headers })
    const pd = await p.json()
    const pid = pd.result.projectId || pd.result.id
    const r = await fetch(`/jeecg-boot/ietm/datamodule/list?pageNo=1&pageSize=5&projectId=${pid}`, { headers })
    const d = await r.json()
    return d.result.records[0].id
  })

  await page.goto(`${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=edit`)
  await page.waitForTimeout(6000)

  const testCases = [
    { name: '英文graphic', xml: '<graphic infoEntityIdent="ICN-001.cgm"/>' },
    { name: '中文"图"', xml: '<图 infoEntityIdent="ICN-001.cgm"/>' },
    { name: '中文"图形"', xml: '<图形 infoEntityIdent="ICN-001.cgm"/>' }
  ]

  for (const tc of testCases) {
    console.log(`\n测试: ${tc.name}`)

    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
  <内容>
    <描述>
      ${tc.xml}
    </描述>
  </内容>
</数据模块>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(xml)
    }, fullXml)
    await page.waitForTimeout(1500)

    // 触发重建refs
    const regenBtn = page.locator('button:has-text("重建refs")').first()
    await regenBtn.click()
    await page.waitForTimeout(1500)

    const confirmBtn = page.locator('.ant-modal-confirm button.ant-btn-primary').first()
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click()
      await page.waitForTimeout(5000)
    }

    // 检查结果
    const content = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })

    const hasEntity = content.includes('<!ENTITY')
    console.log(`  生成ENTITY: ${hasEntity ? '✅' : '❌'}`)
  }

  console.log('='.repeat(80))
})
