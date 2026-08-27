// 诊断：遍历所有项目，定位哪个项目+树节点下有"可重启"的合格DM
const { test } = require('@playwright/test')
const BASE_URL = 'http://localhost:3000'

function eligInfo(page) {
  return page.evaluate(() => {
    const root = document.getElementById('app').__vue__
    let vm = null
    const walk = (c) => { if (!c) return; if (c.$options && c.$options.name === 'IetmDataModuleList') { vm = c; return } ;(c.$children || []).forEach(walk) }
    walk(root)
    if (!vm) return { ds: -1, elig: 0 }
    const cur = vm.currentUser
    const ds = (vm.dataSource || [])
    const elig = ds.filter(r => (r.workflowStatus === '0' || r.workflowStatus === '9') && parseInt(r.issueNo || '0') > 0 && r.inWork === '00' && (!r.createBy || r.createBy === cur))
    return { ds: ds.length, elig: elig.length, eligId: elig[0] ? elig[0].id : null }
  })
}

async function gotoDmList(page) {
  await page.locator('.ant-menu-submenu-title:has-text("项目管理"), .ant-menu-item:has-text("项目管理")').first().click()
  await page.waitForTimeout(500)
  await page.locator('.ant-menu-item:has-text("项目数据模块管理")').first().click()
  await page.waitForURL(u => u.toString().includes('ietmdatamodulemanagement'), { timeout: 15000 })
  await page.waitForTimeout(2500)
}

async function goHome(page) {
  await page.locator('.ant-menu-item:has-text("首页"), .ant-menu-submenu-title:has-text("首页")').first().click().catch(() => {})
  await page.waitForTimeout(1500)
}

test('probe: locate eligible project', async ({ page }) => {
  test.setTimeout(300000)
  await page.goto(`${BASE_URL}/user/login`, { waitUntil: 'networkidle' })
  await page.fill('#username', 'admin'); await page.fill('#password', '123456')
  await page.click('button:has-text("登")')
  await page.waitForURL(u => !u.toString().includes('/user/login'), { timeout: 15000 })
  await page.waitForTimeout(2000)

  const projNames = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a')).filter(b => b.innerText.trim() === '打开项目').length)
  console.log('PROJECTS=' + projNames)

  for (let p = 0; p < projNames; p++) {
    // 回首页
    if (p > 0) await goHome(page)
    const openBtns = page.locator('button:visible:has-text("打开项目"), a:visible:has-text("打开项目")')
    if (await openBtns.count() <= p) { console.log(`P${p} no button`); continue }
    await openBtns.nth(p).click()
    await page.waitForTimeout(700)
    await page.locator('.ant-modal .ant-btn-primary').first().click()
    await page.waitForTimeout(2500)

    await gotoDmList(page)
    // 展开全树
    for (let pass = 0; pass < 6; pass++) {
      const c = await page.locator('.ant-tree-switcher_close').count()
      if (c === 0) break
      for (let i = 0; i < c; i++) {
        const sw = page.locator('.ant-tree-switcher_close').first()
        if (await sw.count() === 0) break
        await sw.click().catch(() => {}); await page.waitForTimeout(350)
      }
    }
    const nodes = page.locator('.ant-tree-node-content-wrapper')
    const n = await nodes.count()
    let found = null
    for (let i = 0; i < Math.min(n, 30); i++) {
      await nodes.nth(i).click(); await page.waitForTimeout(1300)
      const info = await eligInfo(page)
      if (info.elig > 0) { found = { node: i, ...info }; break }
    }
    console.log(`PROJECT[${p}] nodes=${n} found=${JSON.stringify(found)}`)
    if (found) { console.log('WINNER_PROJECT_INDEX=' + p + ' NODE=' + found.node + ' ELIG_ID=' + found.eligId); break }
  }
})
