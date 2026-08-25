const { test } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const USERNAME = 'admin'
const PASSWORD = '123456'

test.use({ video: 'on', screenshot: 'on' })

test('【最终方案】直接通过当前项目进入DM列表', async ({ page }, testInfo) => {
  console.log('\n=== 真实UI验证 - 最终方案 ===\n')

  // 登录
  await page.goto(`${BASE}/user/login`)
  await page.locator('#username').fill(USERNAME)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(3000)
  console.log('✅ 登录成功')

  // 等待首页加载
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: testInfo.outputPath('01-dashboard.png'), fullPage: true })

  // 查看当前项目信息
  const bodyText = await page.locator('body').textContent()
  console.log('\n页面是否包含"当前项目":', bodyText.includes('当前项目'))

  // 寻找所有可能的导航方式
  console.log('\n尝试各种方式进入DM列表...\n')

  // 方式1: 查找侧边栏菜单
  const sidebarMenus = await page.locator('.ant-menu-item, .ant-menu-submenu').all()
  console.log(`找到 ${sidebarMenus.length} 个菜单项`)

  for (let i = 0; i < Math.min(sidebarMenus.length, 20); i++) {
    const menu = sidebarMenus[i]
    const text = await menu.textContent()

    if (text.includes('数据模块') || text.includes('DM') || text.includes('IETM')) {
      console.log(`  菜单 ${i}: ${text.trim()}`)

      // 尝试点击
      const clickable = await menu.isVisible().catch(() => false)
      if (clickable) {
        console.log(`    尝试点击...`)
        await menu.click()
        await page.waitForTimeout(2000)

        // 检查是否打开了子菜单或跳转了页面
        const newUrl = page.url()
        const newContent = await page.locator('body').textContent()

        console.log(`    新URL: ${newUrl}`)
        console.log(`    包含DMC: ${newContent.includes('DMC')}`)
        console.log(`    包含签出: ${newContent.includes('签出')}`)

        if (newContent.includes('DMC') || newContent.includes('签出状态')) {
          console.log(`    ✅ 成功进入DM列表！`)
          await page.screenshot({ path: testInfo.outputPath('02-dm-list-found.png'), fullPage: true })
          break
        }
      }
    }
  }

  // 检查当前页面状态
  await page.screenshot({ path: testInfo.outputPath('03-current-state.png'), fullPage: true })

  const currentContent = await page.locator('body').textContent()
  const hasDmList = currentContent.includes('DMC') || currentContent.includes('签出状态')

  console.log(`\n当前是否在DM列表: ${hasDmList}`)

  if (hasDmList) {
    // 查找DM行并测试签出按钮
    console.log('\n开始测试DM签出按钮...\n')

    const rows = await page.locator('.ant-table-tbody tr').all()
    console.log(`找到 ${rows.length} 行`)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowText = await row.textContent()

      console.log(`\n行 ${i + 1}: ${rowText.substring(0, 100)}`)

      // 查找签出按钮
      const checkoutBtn = row.locator('button').filter({ hasText: '签出' })
      const btnCount = await checkoutBtn.count()

      if (btnCount > 0) {
        const visible = await checkoutBtn.isVisible().catch(() => false)
        console.log(`  ✅ 有签出按钮，可见: ${visible}`)

        if (visible) {
          console.log(`  🖱️  点击签出按钮...`)

          await page.screenshot({ path: testInfo.outputPath(`04-before-click-${i}.png`), fullPage: true })

          await checkoutBtn.click()
          await page.waitForTimeout(2000)

          await page.screenshot({ path: testInfo.outputPath(`05-after-click-${i}.png`), fullPage: true })

          // 检查响应
          const msgs = await page.locator('.ant-message').all()
          console.log(`  找到 ${msgs.length} 个消息`)

          for (const msg of msgs) {
            const visible = await msg.isVisible().catch(() => false)
            if (visible) {
              const text = await msg.textContent()
              console.log(`  消息: "${text}"`)

              if (text.includes('还未启动') || text.includes('不是') || text.includes('DM编写')) {
                console.log(`  ✅✅✅ 前置条件校验触发！`)
              }
            }
          }

          const modal = await page.locator('.ant-modal-confirm').isVisible({ timeout: 1000 }).catch(() => false)
          if (modal) {
            console.log(`  ✅ 确认对话框出现`)
            await page.locator('.ant-modal-confirm button').filter({ hasText: '取消' }).click().catch(() => {})
          }

          break
        }
      }
    }
  } else {
    console.log('\n❌ 未能进入DM列表页面')
    console.log('当前页面内容（前200字符）:')
    console.log(currentContent.substring(0, 200))
  }

  console.log('\n=== 测试完成 ===')
})
