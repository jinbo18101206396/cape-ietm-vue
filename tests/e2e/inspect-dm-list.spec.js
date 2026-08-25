const { test } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const USERNAME = 'admin'
const PASSWORD = '123456'

test('检查DM列表实际内容', async ({ page }) => {
  // 登录
  await page.goto(`${BASE}/user/login`)
  await page.locator('#username').fill(USERNAME)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(3000)

  console.log('\n当前URL:', page.url())

  // 导航到DM列表
  console.log('导航到DM列表页面...')
  await page.goto(`${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
  await page.waitForTimeout(3000)

  console.log('等待后的URL:', page.url())

  // 检查页面标题
  const title = await page.title()
  console.log('页面标题:', title)

  // 检查是否有表格
  const tableExists = await page.locator('.ant-table-tbody tr').count()
  console.log(`找到 ${tableExists} 行\n`)

  if (tableExists === 0) {
    console.log('⚠️ 没有找到表格行')
    return
  }

  // 读取所有行的详细信息
  const rows = await page.locator('.ant-table-tbody tr').all()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    console.log(`=== 行 ${i + 1} ===`)

    // 读取整行文本
    const rowText = await row.textContent()
    console.log(`  完整文本: ${rowText}`)

    // 检查按钮
    const buttons = await row.locator('button').all()
    const buttonTexts = []
    for (const btn of buttons) {
      const text = await btn.textContent()
      buttonTexts.push(text.trim())
    }
    console.log(`  按钮: ${buttonTexts.join(', ')}`)
    console.log('')
  }
})
