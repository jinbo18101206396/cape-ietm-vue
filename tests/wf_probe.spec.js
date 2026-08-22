const { test, expect } = require('@playwright/test')

const FE = 'http://127.0.0.1:3000'
const DM_ID = '2089169182489808898' // formid == dm id for this DM

test('workflow panel: buttons + collapse default', async ({ page }) => {
  test.setTimeout(90000)
  const wfErrors = []
  page.on('response', r => {
    const u = r.url()
    if (u.includes('/ietm/workflow/') && r.status() >= 400) wfErrors.push(r.status() + ' ' + u)
  })

  // login
  await page.goto(FE + '/user/login')
  await page.waitForTimeout(1500)
  await page.fill('input[placeholder*="账户"], input[placeholder*="用户名"], #username', 'admin').catch(()=>{})
  await page.fill('input[type="password"]', '123456').catch(()=>{})
  await page.click('button[type="submit"], .login-button, button:has-text("登录")').catch(()=>{})
  await page.waitForTimeout(3500)

  console.log('after-login url:', page.url())
  await page.screenshot({ path: 'tests/wf_shot_login.png' })

  // open DM in BROWSE mode (mode omitted => browse). This is the key regression case.
  await page.goto(FE + `/ietm/dm-content-editor/${DM_ID}?mode=browse`)
  await page.waitForTimeout(7000)
  console.log('editor url:', page.url())
  await page.screenshot({ path: 'tests/wf_shot_editor.png', fullPage: true })

  // south panel title bar present?
  const titleBar = page.locator('.south-title-bar')
  const hasTitle = await titleBar.count()
  console.log('south-title-bar count:', hasTitle)

  // default collapsed => south-body hidden
  const bodyVisibleBefore = await page.locator('.south-body').isVisible().catch(()=>false)
  console.log('south-body visible BEFORE click (expect false=collapsed):', bodyVisibleBefore)

  // expand
  if (hasTitle > 0) { await titleBar.first().click(); await page.waitForTimeout(2500) }

  const bodyVisibleAfter = await page.locator('.south-body').isVisible().catch(()=>false)
  console.log('south-body visible AFTER click (expect true):', bodyVisibleAfter)

  // toolbar text + node rows + exec form (browse mode!)
  const toolbarTxt = await page.locator('.wf-toolbar').innerText().catch(()=> '(none)')
  console.log('toolbar text:', JSON.stringify(toolbarTxt))
  const legend = await page.locator('.wf-legend').innerText().catch(()=> '(none)')
  console.log('legend:', legend)
  const rowCount = await page.locator('.wf-table-wrap table tbody tr').count().catch(()=>0)
  console.log('node rows:', rowCount)
  const hasAddNode = await page.locator('.wf-toolbar >> text=新增节点').count()
  console.log('新增节点 button present (expect >0 for creator):', hasAddNode)
  const hasActionCol = await page.locator('.wf-table-wrap >> text=编辑').count()
  console.log('per-row 编辑 present (expect >0):', hasActionCol)
  const execForm = await page.locator('.south-region').count()
  const submitBtn = await page.locator('text=提交处理').count()
  console.log('exec form region:', execForm, ' 提交处理 button:', submitBtn)

  console.log('WF 4xx/5xx errors:', JSON.stringify(wfErrors))
})
