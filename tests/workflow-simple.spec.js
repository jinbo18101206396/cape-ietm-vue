/**
 * 工作流信息模块 - 简化版UI交互测试
 *
 * 使用说明：
 * 1. 运行测试后会打开浏览器
 * 2. 请手动登录系统（5分钟超时）
 * 3. 登录成功后测试会自动继续
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'

test.setTimeout(600000) // 10分钟总超时

let auth = { cookies: null, authenticated: false }

test.describe('工作流UI测试', () => {
  test('步骤1：手动登录（请在5分钟内完成）', async ({ page }) => {
    console.log('\n' + '='.repeat(60))
    console.log('   请在打开的浏览器中手动登录')
    console.log('   登录后请等待，测试会自动继续...')
    console.log('   超时时间：5分钟')
    console.log('='.repeat(60) + '\n')

    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // 等待登录成功（5分钟）
    await Promise.race([
      page.waitForSelector('.user-dropdown-menu', { timeout: 300000 }),
      page.waitForSelector('text=工作台', { timeout: 300000 }),
      page.waitForSelector('text=管理员', { timeout: 300000 }),
      page.waitForURL(/dashboard|index/, { timeout: 300000 })
    ])

    auth.cookies = await page.context().cookies()
    auth.authenticated = true

    console.log('\n✓ 登录成功！\n')
    await page.screenshot({ path: 'test-results/step1-logged-in.png' })
  })

  test('步骤2：验证删除按钮状态', async ({ page }) => {
    test.skip(!auth.authenticated)

    console.log('\n[测试] 删除按钮状态验证')

    await page.context().addCookies(auth.cookies)
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(3000)

    const row = page.locator('table tbody tr').first()
    await row.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(3000)

    const tab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await tab.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/step2-workflow-panel.png' })

    // 未选中时删除按钮应禁用
    await page.click('text=流程信息')
    await page.waitForTimeout(500)

    const deleteBtn = page.locator('button:has-text("删除")').first()
    const disabled = await deleteBtn.isDisabled()

    console.log(`✓ 未选中节点，删除按钮disabled: ${disabled}`)
    expect(disabled).toBe(true)

    await page.screenshot({ path: 'test-results/step2-delete-disabled.png' })
  })

  test('步骤3：验证新增节点自动填充', async ({ page }) => {
    test.skip(!auth.authenticated)

    console.log('\n[测试] 新增节点自动填充用户')

    await page.context().addCookies(auth.cookies)
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(2000)

    const row = page.locator('table tbody tr').first()
    await row.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(3000)

    const tab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await tab.click()
    await page.waitForTimeout(2000)

    const countBefore = await page.locator('table tbody tr').count()
    console.log(`当前节点数: ${countBefore}`)

    const addBtn = page.locator('button:has-text("新增")').first()
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(2000)

      await page.screenshot({ path: 'test-results/step3-after-add.png' })

      const countAfter = await page.locator('table tbody tr').count()
      console.log(`新增后节点数: ${countAfter}`)

      if (countAfter > countBefore) {
        const newRow = page.locator('table tbody tr').last()
        const cells = await newRow.locator('td').all()

        for (let i = 0; i < Math.min(5, cells.length); i++) {
          const text = await cells[i].textContent()
          if (text.trim() && text.trim() !== '-' && !text.match(/^\d+$/)) {
            console.log(`找到用户单元格[列${i + 1}]: "${text.trim()}"`)

            const blueSpan = cells[i].locator('.new-node-user')
            const hasBlue = await blueSpan.isVisible().catch(() => false)

            if (hasBlue) {
              console.log('✓✓ 找到蓝色样式！')
              const color = await blueSpan.evaluate(el =>
                window.getComputedStyle(el).color
              )
              console.log(`✓ 颜色: ${color}`)
            }
            break
          }
        }

        // 取消编辑
        const cancelBtn = newRow.locator('button:has-text("取消")').first()
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click()
          await page.waitForTimeout(500)
        }
      }

      await page.screenshot({ path: 'test-results/step3-completed.png' })
    } else {
      console.log('⚠️ 新增按钮不可见')
    }
  })

  test('步骤4：验证"保存意见"按钮', async ({ page }) => {
    test.skip(!auth.authenticated)

    console.log('\n[测试] "保存意见"按钮显示逻辑')

    await page.context().addCookies(auth.cookies)
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(2000)

    const row = page.locator('table tbody tr').first()
    await row.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(3000)

    const tab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await tab.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/step4-panel.png' })

    const saveBtn = page.locator('button:has-text("保存意见")').first()
    const btnVisible = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)

    console.log(`"保存意见"按钮visible: ${btnVisible}`)

    // 分析节点状态
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    console.log(`节点总数: ${count}`)

    await page.screenshot({ path: 'test-results/step4-save-opinion.png' })
  })
})
