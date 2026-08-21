const { test, expect } = require('@playwright/test')

const FE = 'http://127.0.0.1:3000'
const BE = 'http://127.0.0.1:9999/jeecg-boot'

test('workflow panel field rendering', async ({ page, request }) => {
  test.setTimeout(60000)

  // login via API
  const loginRes = await request.post(BE + '/sys/login', {
    data: { username: 'admin', password: '123456' }
  })
  const loginData = await loginRes.json()
  const token = loginData.result?.token
  if (!token) throw new Error('Login failed')

  // set token cookie for frontend
  await page.goto(FE)
  await page.evaluate((t) => {
    window.localStorage.setItem('Access-Token', t)
  }, token)

  // navigate to list
  await page.goto(FE + '/#/ietm/dm-list')
  await page.waitForTimeout(5000)

  // click first row "编辑DM内容" (opens in browse mode if not checked out)
  await page.click('table tbody tr:first-child .ant-table-row-cell-break-word a[title*="编辑"]').catch(()=>{})
  await page.waitForTimeout(7000)

  // expand workflow panel
  const titleBar = page.locator('.south-title-bar')
  if (await titleBar.count() > 0) {
    await titleBar.first().click()
    await page.waitForTimeout(3000)
  }

  // capture node table cells
  const rows = await page.locator('.wf-instance-dtl-table table tbody tr').count()
  console.log('node rows:', rows)

  if (rows > 0) {
    const firstRow = page.locator('.wf-instance-dtl-table table tbody tr').first()
    const cells = await firstRow.locator('td').allInnerTexts()
    console.log('first row cells:', JSON.stringify(cells))

    // check "处理情况" column (exec) — should show display name, not username
    const execCell = await page.locator('.exec-cell').first().innerHTML()
    console.log('exec cell HTML:', execCell.substring(0, 200))
  }

  await page.screenshot({ path: 'tests/wf_fields_shot.png', fullPage: true })
})
