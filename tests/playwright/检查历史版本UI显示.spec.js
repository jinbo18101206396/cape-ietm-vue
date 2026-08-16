/**
 * 检查历史版本列表为何只显示最新版本
 * 通过真实UI测试排查问题
 */

const { test, expect } = require('@playwright/test')

test('排查历史版本列表只显示最新版本问题', async ({ page }) => {
  // 登录
  await page.goto('http://localhost:3000/user/login')
  await page.waitForTimeout(1000)

  // 等待登录表单加载
  await page.waitForSelector('input[type="text"]', { timeout: 10000 })

  // 填写用户名和密码
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)

  console.log('\n========== 步骤1：导航到DM管理页面 ==========')
  await page.goto('http://localhost:3000/ietm/IetmDataModuleList')
  await page.waitForTimeout(2000)

  // 获取第一个DM
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible({ timeout: 10000 })

  // 获取DMC信息
  const dmcText = await firstRow.locator('td').nth(1).textContent()
  console.log(`\n找到DM: ${dmcText}`)

  console.log('\n========== 步骤2：点击"更多"按钮 ==========')
  const moreButton = firstRow.locator('button:has-text("更多")')
  await moreButton.click()
  await page.waitForTimeout(500)

  console.log('\n========== 步骤3：点击"历史版本"菜单 ==========')
  await page.click('li:has-text("历史版本")')
  await page.waitForTimeout(2000)

  // 等待历史版本弹窗出现
  const modal = page.locator('.ant-modal:has-text("历史版本")')
  await expect(modal).toBeVisible({ timeout: 5000 })

  console.log('\n========== 步骤4：检查历史版本列表数据 ==========')

  // 检查是否有"仅显示发布版本"复选框
  const onlyPublishedCheckbox = modal.locator('input[type="checkbox"]').first()
  const isChecked = await onlyPublishedCheckbox.isChecked()
  console.log(`\n"仅显示发布版本"复选框状态: ${isChecked ? '已勾选' : '未勾选'}`)

  // 获取表格行数
  const rows = modal.locator('tbody tr')
  const rowCount = await rows.count()
  console.log(`\n历史版本列表显示: ${rowCount} 行`)

  if (rowCount === 0) {
    console.log('\n⚠️  表格为空')
    // 检查是否有空状态提示
    const emptyText = await modal.locator('.ant-empty-description').textContent().catch(() => null)
    if (emptyText) {
      console.log(`空状态提示: ${emptyText}`)
    }
  } else {
    console.log('\n表格内容：')
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const cols = row.locator('td')
      const colCount = await cols.count()

      const dmc = await cols.nth(1).textContent().catch(() => 'N/A')
      const version = await cols.nth(4).textContent().catch(() => 'N/A')
      const versionType = await cols.nth(5).textContent().catch(() => 'N/A')

      console.log(`  行${i + 1}: DMC=${dmc.trim()}, 版本=${version.trim()}, 类型=${versionType.trim()}`)
    }
  }

  console.log('\n========== 步骤5：检查API请求 ==========')

  // 监听网络请求
  page.on('response', async (response) => {
    const url = response.url()
    if (url.includes('/historyVersions')) {
      console.log(`\n捕获到API请求: ${url}`)
      const status = response.status()
      console.log(`响应状态: ${status}`)

      if (status === 200) {
        const data = await response.json().catch(() => null)
        if (data) {
          console.log(`\nAPI返回数据:`)
          console.log(`  success: ${data.success}`)
          console.log(`  message: ${data.message || 'N/A'}`)
          if (data.result) {
            console.log(`  result长度: ${Array.isArray(data.result) ? data.result.length : 'N/A'}`)
            if (Array.isArray(data.result) && data.result.length > 0) {
              console.log(`\n  前3条数据:`)
              data.result.slice(0, 3).forEach((item, idx) => {
                console.log(`    ${idx + 1}. issueNo=${item.issueNo}, inWork=${item.inWork}, isLatest=${item.isLatest}, versionType=${item.versionType}`)
              })
            }
          }
        }
      }
    }
  })

  // 重新加载数据
  console.log('\n========== 步骤6：取消"仅显示发布版本"并重新加载 ==========')
  if (isChecked) {
    await onlyPublishedCheckbox.click()
    await page.waitForTimeout(2000)

    const newRowCount = await rows.count()
    console.log(`\n取消勾选后，列表显示: ${newRowCount} 行`)

    if (newRowCount === rowCount) {
      console.log('\n⚠️  行数没有变化，可能数据本身就只有这么多')
    } else {
      console.log('\n✅ 行数有变化，说明onlyPublished参数生效')
    }
  }

  console.log('\n========== 步骤7：直接查询API验证数据 ==========')

  // 获取页面的localStorage token
  const token = await page.evaluate(() => localStorage.getItem('pro__Access-Token'))
  console.log(`\nToken: ${token ? '已获取' : '未找到'}`)

  if (token) {
    // 从UI获取查询参数
    const params = await page.evaluate(() => {
      // 尝试从Vue实例获取queryParam
      const modal = document.querySelector('.ant-modal-body')
      return window.__VUE_DEVTOOLS_GLOBAL_HOOK__ ? 'DevTools可用' : '无法获取Vue实例'
    })
    console.log(`Vue实例状态: ${params}`)
  }

  await page.waitForTimeout(2000)
})
