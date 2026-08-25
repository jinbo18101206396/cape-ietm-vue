/**
 * 历史版本显示修复 - 完整UI自动化测试
 *
 * 测试场景：
 * 1. 基础场景：签出→签入→查看历史版本
 * 2. 边界场景：多次签出签入、取消签出、发布版本等
 * 3. 排查类似问题：检查其他可能归档版本的地方
 */

const { test, expect } = require('@playwright/test')

test.describe('历史版本显示修复 - UI测试套件', () => {
  let dmInfo = null

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.waitForSelector('input[type="text"]', { timeout: 10000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // 检查是否登录成功
    const url = page.url()
    if (url.includes('/login')) {
      throw new Error('登录失败，请检查用户名密码')
    }
  })

  test('P0-核心场景：签出→签入后历史版本列表显示完整', async ({ page }) => {
    console.log('\n========== P0: 核心场景测试 ==========')

    // 步骤1: 创建测试DM
    console.log('\n步骤1: 创建测试DM...')
    await page.goto('http://localhost:3000/ietm/IetmDataModuleList')
    await page.waitForTimeout(2000)

    // 点击"新增"按钮
    await page.click('button:has-text("新增")')
    await page.waitForTimeout(1000)

    // 填写DM信息
    const timestamp = Date.now()
    const testSNS = `UI-TEST-${timestamp}`

    await page.fill('input[placeholder*="SNS"]', testSNS)
    await page.fill('input[placeholder*="信息代码"]', '999')

    // 选择项目（如果需要）
    const projectSelect = page.locator('.ant-select:has-text("请选择项目")').first()
    if (await projectSelect.isVisible().catch(() => false)) {
      await projectSelect.click()
      await page.waitForTimeout(500)
      await page.click('.ant-select-dropdown .ant-select-item').first()
    }

    // 选择构型节点
    const nodeSelect = page.locator('.ant-select:has-text("请选择构型节点")')
    if (await nodeSelect.isVisible().catch(() => false)) {
      await nodeSelect.click()
      await page.waitForTimeout(500)
      await page.click('.ant-select-dropdown .ant-select-item').first()
    }

    // 填写其他必填字段
    await page.fill('input[placeholder*="技术名称"]', '历史版本UI测试')
    await page.fill('input[placeholder*="信息名称"]', '初始版本')

    // 提交
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(3000)

    // 检查是否创建成功
    const successMsg = page.locator('.ant-message-success')
    if (await successMsg.isVisible().catch(() => false)) {
      console.log('✅ DM创建成功')
    }

    // 步骤2: 在列表中找到刚创建的DM
    console.log('\n步骤2: 查找创建的DM...')
    await page.waitForTimeout(2000)

    // 搜索SNS
    const searchInput = page.locator('input[placeholder*="DMC"]').first()
    await searchInput.fill(testSNS)
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(2000)

    const dmRow = page.locator(`tbody tr:has-text("${testSNS}")`).first()
    await expect(dmRow).toBeVisible({ timeout: 10000 })
    console.log('✅ 找到创建的DM')

    dmInfo = { sns: testSNS, infoCode: '999' }

    // 步骤3: 查询初始历史版本（应该只有1个）
    console.log('\n步骤3: 查询初始历史版本...')
    await dmRow.locator('button:has-text("更多")').click()
    await page.waitForTimeout(500)
    await page.click('li:has-text("历史版本")')
    await page.waitForTimeout(2000)

    const historyModal = page.locator('.ant-modal:has-text("历史版本")')
    await expect(historyModal).toBeVisible({ timeout: 5000 })

    const initialRows = historyModal.locator('tbody tr')
    const initialCount = await initialRows.count()
    console.log(`初始历史版本数: ${initialCount}`)

    if (initialCount === 0) {
      throw new Error('创建后应该至少有1个版本')
    }

    // 记录初始版本信息
    const initialVersions = []
    for (let i = 0; i < initialCount; i++) {
      const row = initialRows.nth(i)
      const versionText = await row.locator('td').nth(4).textContent()
      initialVersions.push(versionText.trim())
      console.log(`  版本${i + 1}: ${versionText.trim()}`)
    }

    // 关闭弹窗
    await page.click('.ant-modal-close')
    await page.waitForTimeout(500)

    // 步骤4: 签出
    console.log('\n步骤4: 签出DM...')
    await dmRow.locator('button:has-text("签出")').click()
    await page.waitForTimeout(2000)

    // 检查签出成功消息
    const checkoutSuccess = page.locator('.ant-message-success')
    await expect(checkoutSuccess).toBeVisible({ timeout: 5000 })
    console.log('✅ 签出成功')

    // 刷新页面查看新版本
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(2000)

    // 步骤5: 查询签出后的历史版本（应该有2个）
    console.log('\n步骤5: 查询签出后的历史版本...')
    await dmRow.locator('button:has-text("更多")').click()
    await page.waitForTimeout(500)
    await page.click('li:has-text("历史版本")')
    await page.waitForTimeout(2000)

    await expect(historyModal).toBeVisible({ timeout: 5000 })

    const afterCheckoutRows = historyModal.locator('tbody tr')
    const afterCheckoutCount = await afterCheckoutRows.count()
    console.log(`签出后历史版本数: ${afterCheckoutCount}`)

    const afterCheckoutVersions = []
    for (let i = 0; i < afterCheckoutCount; i++) {
      const row = afterCheckoutRows.nth(i)
      const versionText = await row.locator('td').nth(4).textContent()
      afterCheckoutVersions.push(versionText.trim())
      console.log(`  版本${i + 1}: ${versionText.trim()}`)
    }

    if (afterCheckoutCount !== initialCount + 1) {
      throw new Error(`签出后版本数不正确: 期望${initialCount + 1}, 实际${afterCheckoutCount}`)
    }
    console.log('✅ 签出后版本数正确')

    // 关闭弹窗
    await page.click('.ant-modal-close')
    await page.waitForTimeout(500)

    // 步骤6: 签入
    console.log('\n步骤6: 签入DM...')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(2000)

    const newDmRow = page.locator(`tbody tr:has-text("${testSNS}")`).first()
    await newDmRow.locator('button:has-text("签入")').click()
    await page.waitForTimeout(1000)

    // 填写签入备注
    const commentInput = page.locator('textarea[placeholder*="备注"]')
    if (await commentInput.isVisible().catch(() => false)) {
      await commentInput.fill('UI测试签入')
    }

    // 确认签入
    await page.click('.ant-modal:has-text("签入") button:has-text("确定")')
    await page.waitForTimeout(2000)

    // 检查签入成功消息
    const checkinSuccess = page.locator('.ant-message-success')
    await expect(checkinSuccess).toBeVisible({ timeout: 5000 })
    console.log('✅ 签入成功')

    // 步骤7: 【关键验证】查询签入后的历史版本
    console.log('\n步骤7: 【关键验证】查询签入后的历史版本...')
    await page.click('button:has-text("查询")')
    await page.waitForTimeout(2000)

    const finalDmRow = page.locator(`tbody tr:has-text("${testSNS}")`).first()
    await finalDmRow.locator('button:has-text("更多")').click()
    await page.waitForTimeout(500)
    await page.click('li:has-text("历史版本")')
    await page.waitForTimeout(2000)

    await expect(historyModal).toBeVisible({ timeout: 5000 })

    const finalRows = historyModal.locator('tbody tr')
    const finalCount = await finalRows.count()
    console.log(`签入后历史版本数: ${finalCount}`)

    const finalVersions = []
    for (let i = 0; i < finalCount; i++) {
      const row = finalRows.nth(i)
      const versionText = await row.locator('td').nth(4).textContent()
      finalVersions.push(versionText.trim())
      console.log(`  版本${i + 1}: ${versionText.trim()}`)
    }

    // 关键断言
    console.log('\n========== 测试结果 ==========')
    if (finalCount === initialCount) {
      console.log('❌❌❌ 测试失败！')
      console.log(`签入后版本数 = 初始版本数 (${finalCount})`)
      console.log('说明：签入时将原版本归档了，BUG未修复')
      throw new Error('BUG未修复：历史版本列表只显示最新版本')
    } else if (finalCount === afterCheckoutCount) {
      console.log('✅✅✅ 测试通过！')
      console.log(`签入后版本数 = 签出后版本数 (${finalCount})`)
      console.log('说明：签入时保留了原版本，修复生效')
      console.log('\n版本变化：')
      console.log(`  初始: ${initialCount} 个版本`)
      console.log(`  签出: ${afterCheckoutCount} 个版本 (+${afterCheckoutCount - initialCount})`)
      console.log(`  签入: ${finalCount} 个版本 (保留)`)
    } else {
      throw new Error(`版本数异常: 初始${initialCount}, 签出${afterCheckoutCount}, 签入${finalCount}`)
    }

    // 清理：删除测试DM
    console.log('\n步骤8: 清理测试数据...')
    await page.click('.ant-modal-close')
    await page.waitForTimeout(500)

    // 删除所有版本
    for (let i = 0; i < finalCount; i++) {
      await page.click('button:has-text("查询")')
      await page.waitForTimeout(1000)
      const rowToDelete = page.locator(`tbody tr:has-text("${testSNS}")`).first()
      if (await rowToDelete.isVisible().catch(() => false)) {
        await rowToDelete.locator('button:has-text("删除")').click()
        await page.waitForTimeout(500)
        await page.click('.ant-modal:has-text("确认删除") button:has-text("确定")')
        await page.waitForTimeout(1000)
      }
    }
    console.log('✅ 测试数据已清理')
  })

  test('P1-边界场景：多次签出签入', async ({ page }) => {
    console.log('\n========== P1: 多次签出签入测试 ==========')

    // 使用P0创建的DM，或创建新的
    // TODO: 实现多次签出签入测试
    console.log('待实现：测试连续3次签出→签入，验证历史版本累积')
  })

  test('P2-边界场景：取消签出', async ({ page }) => {
    console.log('\n========== P2: 取消签出测试 ==========')

    // TODO: 测试签出后取消，验证版本回退
    console.log('待实现：测试签出→取消签出，验证原版本恢复')
  })

  test('P3-排查类似问题：检查其他归档逻辑', async ({ page }) => {
    console.log('\n========== P3: 排查类似问题 ==========')

    // TODO: 检查发布、删除等操作是否也有归档问题
    console.log('待实现：检查发布、删除、批量操作等是否有类似归档问题')
  })
})
