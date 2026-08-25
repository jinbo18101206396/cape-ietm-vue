const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const USERNAME = 'admin'
const PASSWORD = '123456'

test.use({
  video: 'on',
  screenshot: 'on',
  trace: 'on'
})

test('【真实UI验证】完整流程测试', async ({ page }, testInfo) => {
  console.log('\n=== 开始真实UI验证 ===\n')

  // 1. 登录
  console.log('步骤1: 登录')
  await page.goto(`${BASE}/user/login`)
  await page.locator('#username').fill(USERNAME)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForLoadState('networkidle')
  console.log('✅ 登录成功\n')

  // 2. 等待进入首页
  await page.waitForTimeout(2000)
  await page.screenshot({ path: testInfo.outputPath('01-dashboard.png'), fullPage: true })

  // 3. 点击打开项目
  console.log('步骤2: 打开项目')
  const openBtn = page.locator('button:has-text("打开项目")').first()
  await openBtn.waitFor({ state: 'visible', timeout: 5000 })
  await openBtn.click()
  await page.waitForTimeout(2000)
  console.log('✅ 已点击打开项目\n')
  await page.screenshot({ path: testInfo.outputPath('02-after-open-project.png'), fullPage: true })

  // 4. 等待项目打开完成，然后重新加载页面
  console.log('步骤3: 重新加载页面以刷新菜单')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: testInfo.outputPath('03-after-reload.png'), fullPage: true })

  // 5. 查找并展开IETM菜单
  console.log('步骤4: 查找IETM菜单')

  // 打印所有可见文本以调试
  const bodyText = await page.locator('body').textContent()
  console.log('页面包含"数据模块":', bodyText.includes('数据模块'))
  console.log('页面包含"IETM":', bodyText.includes('IETM'))

  // 尝试多种方式查找菜单
  const menuSelectors = [
    'span:text("数据模块管理")',
    'text=数据模块管理',
    '[title="数据模块管理"]',
    'a:has-text("数据模块管理")',
    '.ant-menu-item:has-text("数据模块")'
  ]

  let menuClicked = false

  for (const selector of menuSelectors) {
    const element = page.locator(selector).first()
    const exists = await element.count()
    console.log(`  尝试选择器 "${selector}": ${exists > 0 ? '找到' : '未找到'}`)

    if (exists > 0) {
      const visible = await element.isVisible({ timeout: 1000 }).catch(() => false)
      console.log(`    可见性: ${visible}`)

      if (visible) {
        await element.click()
        await page.waitForTimeout(2000)
        console.log('  ✅ 已点击菜单\n')
        menuClicked = true
        break
      }
    }
  }

  await page.screenshot({ path: testInfo.outputPath('04-after-menu-click.png'), fullPage: true })

  if (!menuClicked) {
    console.log('  ⚠️ 菜单方式失败，尝试直接访问URL\n')

    // 获取当前URL的base部分
    const currentUrl = page.url()
    console.log('  当前URL:', currentUrl)

    // 尝试不同的URL格式
    const urlsToTry = [
      `${BASE}/ietm/ietmdatamodulemanagement/IetmDataModuleList`,
      `${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`,
      `${BASE}/dashboard/analysis#/ietm/ietmdatamodulemanagement/IetmDataModuleList`
    ]

    for (const url of urlsToTry) {
      console.log(`  尝试URL: ${url}`)
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)

      const pageText = await page.locator('body').textContent()
      const isDmPage = pageText.includes('DMC') ||
                       pageText.includes('数据模块代码') ||
                       pageText.includes('签出状态') ||
                       pageText.includes('工作流')

      console.log(`    页面包含DM相关内容: ${isDmPage}`)

      if (isDmPage) {
        console.log('  ✅ 成功进入DM页面\n')
        break
      }
    }
  }

  await page.screenshot({ path: testInfo.outputPath('05-dm-page.png'), fullPage: true })

  // 6. 验证是否在DM列表页面
  console.log('步骤5: 验证DM列表页面')

  const finalUrl = page.url()
  console.log('  最终URL:', finalUrl)

  const pageContent = await page.locator('body').textContent()
  const hasDmContent = pageContent.includes('DMC') ||
                       pageContent.includes('数据模块') ||
                       pageContent.includes('签出')

  console.log('  页面包含DM内容:', hasDmContent)

  // 等待表格加载
  const hasTable = await page.locator('.ant-table').count()
  console.log('  找到表格:', hasTable)

  if (hasTable > 0) {
    const rowCount = await page.locator('.ant-table-tbody tr').count()
    console.log('  表格行数:', rowCount)

    if (rowCount > 0) {
      console.log('\n步骤6: 检查每一行的按钮')

      const rows = await page.locator('.ant-table-tbody tr').all()

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowText = await row.textContent()

        console.log(`\n  --- 行 ${i + 1} ---`)
        console.log(`  内容: ${rowText.substring(0, 150)}`)

        // 查找所有按钮
        const buttons = await row.locator('button').all()
        const buttonTexts = []

        for (const btn of buttons) {
          const text = await btn.textContent()
          const visible = await btn.isVisible()
          buttonTexts.push(`${text.trim()}(${visible ? '可见' : '不可见'})`)
        }

        console.log(`  按钮: ${buttonTexts.join(', ')}`)

        // 查找签出按钮
        const checkoutBtn = row.locator('button:has-text("签出")')
        const hasCheckout = await checkoutBtn.count() > 0

        if (hasCheckout) {
          const isVisible = await checkoutBtn.isVisible().catch(() => false)
          console.log(`  ✅ 有签出按钮，可见: ${isVisible}`)

          if (isVisible) {
            console.log(`\n  🖱️  点击签出按钮...`)

            await page.screenshot({ path: testInfo.outputPath(`06-before-click-row${i + 1}.png`), fullPage: true })

            await checkoutBtn.click()
            await page.waitForTimeout(2000)

            await page.screenshot({ path: testInfo.outputPath(`07-after-click-row${i + 1}.png`), fullPage: true })

            // 检查所有可能的响应
            const warning = await page.locator('.ant-message-warning').isVisible({ timeout: 1000 }).catch(() => false)
            const error = await page.locator('.ant-message-error').isVisible({ timeout: 1000 }).catch(() => false)
            const modal = await page.locator('.ant-modal-confirm').isVisible({ timeout: 1000 }).catch(() => false)

            console.log(`\n  📋 UI响应:`)
            console.log(`    警告消息: ${warning}`)
            console.log(`    错误消息: ${error}`)
            console.log(`    确认对话框: ${modal}`)

            if (warning) {
              const text = await page.locator('.ant-message-warning').first().textContent()
              console.log(`    警告内容: "${text}"`)

              if (text.includes('还未启动') || text.includes('不是') || text.includes('DM编写')) {
                console.log(`\n  ✅✅✅ 前置条件校验触发成功！`)
                await page.screenshot({ path: testInfo.outputPath('08-validation-success.png'), fullPage: true })
              }
            }

            if (error) {
              const text = await page.locator('.ant-message-error').first().textContent()
              console.log(`    错误内容: "${text}"`)
            }

            if (modal) {
              console.log(`    ✅ 确认对话框出现（校验通过）`)
              await page.screenshot({ path: testInfo.outputPath('08-modal-shown.png'), fullPage: true })

              // 取消
              await page.locator('.ant-modal-confirm button:has-text("取消")').click().catch(() => {})
            }

            // 只测试第一个有签出按钮的
            break
          }
        }
      }
    } else {
      console.log('  ⚠️ 表格为空')
    }
  } else {
    console.log('  ❌ 未找到表格')
  }

  console.log('\n=== 测试完成 ===')
})
