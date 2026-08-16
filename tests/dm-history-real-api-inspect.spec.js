const { test } = require('@playwright/test')
const http = require('http')

// 真实后端API检查 - 不用stub，直接看真实返回
const API = 'http://localhost:9999/jeecg-boot'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => { d += c }); res.on('end', () => {
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
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: '2078348945532030978' }, TOKEN)
})

test('检查真实historyVersions API返回结构', async ({ page }) => {
  // 注入token并导航到列表页
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])

  await page.goto('http://localhost:3000/ietmdatamodulemanagement')
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)

  // 点击DM挂载节点
  await page.locator('.ant-tree-title', { hasText: '02-项目自定义' })
    .filter({ hasText: /^02-项目自定义$/ }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })

  // 获取第一条DM的数据
  const firstDmData = await page.locator('.ant-table-row').first().evaluate(row => {
    return {
      text: row.textContent,
      html: row.innerHTML.substring(0, 500)
    }
  })
  console.log('\n第一条DM行内容:', firstDmData.text)

  // 点击历史版本按钮前先选中
  await page.locator('.ant-table-row').first().locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(500)

  // 点击顶部"历史版本"按钮
  const historyBtn = page.locator('button').filter({ hasText: /^历史版本$/ })
  await historyBtn.click()
  await page.waitForTimeout(1000)

  // 等待弹窗出现
  const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })
  await modal.waitFor({ state: 'visible', timeout: 10000 })

  // 检查表头
  const headers = await modal.locator('thead th').allTextContents()
  console.log('\n实际表头:', headers)

  // 检查第一行数据
  const firstRow = modal.locator('.ant-table-row').first()
  const rowText = await firstRow.textContent()
  console.log('\n第一行内容:', rowText)

  // 检查是否有"只显示发布版本"checkbox
  const checkbox = modal.locator('text=/只.*发布/')
  const checkboxExists = await checkbox.count()
  console.log('\n"只显示发布版本"checkbox存在:', checkboxExists > 0)

  // 截图保存
  await page.screenshot({ path: 'test-results/history-modal-real.png', fullPage: true })
  console.log('\n截图已保存: test-results/history-modal-real.png')
})
