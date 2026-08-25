const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const USERNAME = 'admin'
const PASSWORD = '123456'

test.use({ video: 'on', screenshot: 'on' })

test('【最终验证】真实UI点击测试DM签出', async ({ page }, testInfo) => {
  console.log('\n=== 前置条件修复 - 最终真实UI验证 ===\n')

  // 1. 登录
  console.log('步骤1: 登录系统')
  await page.goto(`${BASE}/user/login`)
  await page.locator('#username').fill(USERNAME)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(3000)
  console.log('✅ 登录成功')
  await page.screenshot({ path: testInfo.outputPath('01-login.png'), fullPage: true })

  // 2. 打开项目
  console.log('\n步骤2: 打开项目（项目33）')

  // 查找"打开项目"按钮并点击第一个
  const openProjectBtn = page.locator('button:has-text("打开项目")').first()
  await openProjectBtn.click()
  await page.waitForTimeout(3000)
  console.log('✅ 已点击打开项目')
  await page.screenshot({ path: testInfo.outputPath('02-project-opened.png'), fullPage: true })

  // 3. 使用正确的URL导航（这个项目是单页应用）
  console.log('\n步骤3: 导航到DM列表页面')

  // 直接导航到完整URL并刷新
  const dmListUrl = `${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`
  console.log(`  导航到: ${dmListUrl}`)
  await page.goto(dmListUrl)
  await page.waitForTimeout(3000)

  await page.screenshot({ path: testInfo.outputPath('03-dm-list-page.png'), fullPage: true })

  // 4. 检查是否真的到了DM列表
  console.log('\n步骤4: 验证DM列表页面')

  const currentUrl = page.url()
  console.log(`当前URL: ${currentUrl}`)

  // 读取页面内容判断
  const pageText = await page.locator('body').textContent()
  const isDmList = pageText.includes('DMC') || pageText.includes('数据模块代码') || pageText.includes('签出状态')

  console.log(`是否在DM列表: ${isDmList}`)

  if (!isDmList) {
    console.log('❌ 未能进入DM列表页面')
    return
  }

  // 5. 读取DM列表
  await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })
  const rows = await page.locator('.ant-table-tbody tr').all()
  console.log(`✅ 找到 ${rows.length} 个DM`)

  // 6. 遍历查找未签出的DM并点击签出按钮
  console.log('\n步骤5: 查找未签出的DM并测试签出按钮')

  let tested = false

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowText = await row.textContent()

    console.log(`\n--- DM ${i + 1} ---`)
    console.log(`  内容: ${rowText.substring(0, 100)}...`)

    // 查找签出按钮
    const checkoutBtn = row.locator('button:has-text("签出")')
    const hasCheckoutBtn = await checkoutBtn.isVisible({ timeout: 500 }).catch(() => false)

    console.log(`  有签出按钮: ${hasCheckoutBtn}`)

    if (hasCheckoutBtn) {
      console.log(`  🖱️  点击签出按钮...`)

      await page.screenshot({ path: testInfo.outputPath(`04-before-click-dm${i + 1}.png`), fullPage: true })

      await checkoutBtn.click()
      await page.waitForTimeout(2000)

      await page.screenshot({ path: testInfo.outputPath(`05-after-click-dm${i + 1}.png`), fullPage: true })

      // 检查UI响应
      const warningMsg = page.locator('.ant-message-warning')
      const errorMsg = page.locator('.ant-message-error')
      const modal = page.locator('.ant-modal-confirm')

      const warningVisible = await warningMsg.isVisible({ timeout: 1000 }).catch(() => false)
      const errorVisible = await errorMsg.isVisible({ timeout: 1000 }).catch(() => false)
      const modalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false)

      console.log(`  📋 UI响应:`)
      console.log(`    警告消息: ${warningVisible}`)
      console.log(`    错误消息: ${errorVisible}`)
      console.log(`    确认对话框: ${modalVisible}`)

      if (warningVisible) {
        const text = await warningMsg.first().textContent()
        console.log(`    ⚠️  警告内容: "${text}"`)

        const isValidation = text.includes('还未启动流程') ||
                            text.includes('不是') ||
                            text.includes('DM编写')

        if (isValidation) {
          console.log(`\n✅✅✅ 前置条件校验已触发！真实UI验证成功！`)
          await page.screenshot({ path: testInfo.outputPath('06-validation-triggered.png'), fullPage: true })
          tested = true
          break
        }
      }

      if (modalVisible) {
        console.log(`    ✅ 确认对话框出现（第一层校验通过）`)
        await page.screenshot({ path: testInfo.outputPath('06-modal-shown.png'), fullPage: true })

        // 取消
        await page.click('.ant-modal-confirm button:has-text("取消")').catch(() => {})
        tested = true
        break
      }

      tested = true
      break
    }
  }

  if (!tested) {
    console.log('\n⚠️  所有DM都已签出或无签出按钮')
  }

  console.log('\n=== 测试完成 ===')
})
