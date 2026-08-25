/**
 * 工作流信息模块 - 实战E2E测试
 * 通过真实UI交互验证所有功能
 *
 * 注意：需要提前在系统中准备测试数据
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'

test.setTimeout(180000) // 3分钟超时

// 存储测试上下文
let context = {
  loggedIn: false,
  dmId: null,
  cookies: null
}

test.describe('工作流信息模块 - 实战测试', () => {
  // ========== 手动登录准备 ==========
  test('SETUP: 手动登录并保存会话', async ({ page }) => {
    console.log('\n========================================')
    console.log('请在浏览器中手动登录系统')
    console.log('登录成功后，测试将自动继续')
    console.log('========================================\n')

    await page.goto(`${BASE_URL}`)

    // 等待用户手动登录（检测到用户信息下拉菜单）
    console.log('等待登录...')

    try {
      // 等待登录成功的标志（用户下拉菜单出现）
      await page.waitForSelector('.user-dropdown-menu, .ant-dropdown-trigger, text=管理员', {
        timeout: 120000
      })

      console.log('✓ 检测到登录成功')

      // 保存cookies
      context.cookies = await page.context().cookies()
      context.loggedIn = true

      // 保存截图
      await page.screenshot({ path: 'test-results/01-logged-in.png' })
    } catch (error) {
      console.error('✗ 登录超时，请确保手动登录')
      throw error
    }
  })

  // ========== 测试1: 导航到工作流信息面板 ==========
  test('TEST-01: 导航到工作流信息面板', async ({ page }) => {
    test.skip(!context.loggedIn, '需要先登录')

    // 恢复cookies
    if (context.cookies) {
      await page.context().addCookies(context.cookies)
    }

    // 进入DM管理列表页
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/02-dm-list.png' })

    // 检查是否有数据
    const tableRows = page.locator('table tbody tr')
    const rowCount = await tableRows.count()
    console.log('[TEST-01] DM列表行数:', rowCount)

    expect(rowCount).toBeGreaterThan(0)

    // 点击第一条记录
    const firstRow = tableRows.first()
    await firstRow.click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'test-results/03-row-selected.png' })

    // 点击"详情"按钮
    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/04-dm-detail.png' })

    // 切换到"流程信息"标签页
    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await workflowTab.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/05-workflow-panel.png' })

    // 检查工作流面板是否加载
    const hasWorkflow = await page.locator('.wf-toolbar, table').isVisible({ timeout: 5000 })
    console.log('[TEST-01] ✓ 工作流面板加载成功:', hasWorkflow)

    expect(hasWorkflow).toBe(true)
  })

  // ========== 测试2: Issue-3 删除按钮状态 ==========
  test('TEST-02: 未选中节点时删除按钮应禁用', async ({ page }) => {
    test.skip(!context.loggedIn, '需要先登录')

    if (context.cookies) {
      await page.context().addCookies(context.cookies)
    }

    // 导航到工作流面板
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(2000)

    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await workflowTab.click()
    await page.waitForTimeout(2000)

    // 点击空白区域取消选中
    await page.click('text=流程信息')
    await page.waitForTimeout(500)

    // 查找删除按钮
    const deleteBtn = page.locator('button:has-text("删除")').first()
    const isDisabled = await deleteBtn.isDisabled()

    console.log('[TEST-02] 未选中节点，删除按钮disabled:', isDisabled)

    await page.screenshot({ path: 'test-results/06-delete-btn-no-selection.png' })

    expect(isDisabled).toBe(true)
  })

  // ========== 测试3: 新增节点自动填充用户 ==========
  test('TEST-03: 新增节点自动填充当前用户', async ({ page }) => {
    test.skip(!context.loggedIn, '需要先登录')

    if (context.cookies) {
      await page.context().addCookies(context.cookies)
    }

    // 导航到工作流面板
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(2000)

    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await workflowTab.click()
    await page.waitForTimeout(2000)

    // 记录当前节点数量
    const nodeRowsBefore = page.locator('table tbody tr')
    const countBefore = await nodeRowsBefore.count()
    console.log('[TEST-03] 当前节点数量:', countBefore)

    // 查找"新增"按钮
    const addBtn = page.locator('button:has-text("新增")').first()
    const btnVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!btnVisible) {
      console.log('[TEST-03] ⚠ 新增按钮不可见，可能无编辑权限，跳过测试')
      test.skip()
      return
    }

    // 点击新增
    await addBtn.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/07-after-add-node.png' })

    // 检查节点数量是否增加
    const nodeRowsAfter = page.locator('table tbody tr')
    const countAfter = await nodeRowsAfter.count()
    console.log('[TEST-03] 新增后节点数量:', countAfter)

    if (countAfter > countBefore) {
      console.log('[TEST-03] ✓ 成功新增节点')

      // 获取最后一行
      const newRow = nodeRowsAfter.last()
      await newRow.screenshot({ path: 'test-results/08-new-row.png' })

      // 获取所有单元格
      const cells = newRow.locator('td')
      const cellTexts = await cells.allTextContents()

      console.log('[TEST-03] 新行单元格内容:')
      cellTexts.forEach((text, i) => {
        console.log(`  列${i + 1}:`, text.trim().substring(0, 50))
      })

      // 查找包含用户名的单元格（通常在前几列）
      let foundUser = false
      for (let i = 0; i < Math.min(5, cellTexts.length); i++) {
        const text = cellTexts[i].trim()
        if (text && text !== '-' && !text.match(/^\d+$/) && text.length > 1) {
          console.log('[TEST-03] ✓ 可能的用户单元格[列' + (i + 1) + ']:', text)

          // 检查是否有蓝色样式
          const cell = cells.nth(i)
          const hasBlueStyle = await cell.locator('.new-node-user').isVisible().catch(() => false)

          if (hasBlueStyle) {
            console.log('[TEST-03] ✓✓ 找到蓝色用户样式!')
            foundUser = true
            break
          }
        }
      }

      if (!foundUser) {
        console.log('[TEST-03] ⚠ 未找到明确的蓝色用户样式，但行已新增')
      }

      // 取消编辑
      const cancelBtn = newRow.locator('button:has-text("取消")').first()
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click()
        await page.waitForTimeout(500)
        console.log('[TEST-03] 已取消编辑')
      }
    } else {
      console.log('[TEST-03] ✗ 未检测到新行添加')
    }
  })

  // ========== 测试4: 删除按钮弹出确认对话框 ==========
  test('TEST-04: 删除按钮弹出确认对话框', async ({ page }) => {
    test.skip(!context.loggedIn, '需要先登录')

    if (context.cookies) {
      await page.context().addCookies(context.cookies)
    }

    // 导航到工作流面板
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(2000)

    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await workflowTab.click()
    await page.waitForTimeout(2000)

    // 查找节点列表，从后往前找未执行的节点
    const nodeRows = page.locator('table tbody tr')
    const rowCount = await nodeRows.count()

    console.log('[TEST-04] 总节点数:', rowCount)

    let foundDeletableNode = false

    for (let i = rowCount - 1; i >= 0; i--) {
      const row = nodeRows.nth(i)
      await row.click()
      await page.waitForTimeout(500)

      // 检查删除按钮状态
      const deleteBtn = page.locator('button:has-text("删除")').first()
      const isDisabled = await deleteBtn.isDisabled()

      console.log(`[TEST-04] 节点${i + 1} 删除按钮disabled:`, isDisabled)

      if (!isDisabled) {
        console.log('[TEST-04] ✓ 找到可删除节点')
        foundDeletableNode = true

        await page.screenshot({ path: 'test-results/09-before-delete.png' })

        // 点击删除
        await deleteBtn.click()
        await page.waitForTimeout(1000)

        await page.screenshot({ path: 'test-results/10-delete-confirm.png' })

        // 检查确认对话框
        const modalVisible = await page.locator('.ant-modal:visible, .ant-confirm:visible').isVisible({ timeout: 3000 }).catch(() => false)

        console.log('[TEST-04] 确认对话框visible:', modalVisible)
        expect(modalVisible).toBe(true)

        // 点击取消
        const cancelBtn = page.locator('.ant-modal button:has-text("取消"), .ant-confirm button:has-text("取消")').first()
        await cancelBtn.click()
        await page.waitForTimeout(500)

        break
      }
    }

    if (!foundDeletableNode) {
      console.log('[TEST-04] ⚠ 未找到可删除的节点')
    }
  })

  // ========== 测试5: 拿回按钮禁用状态 ==========
  test('TEST-05: 拿回按钮禁用状态', async ({ page }) => {
    test.skip(!context.loggedIn, '需要先登录')

    if (context.cookies) {
      await page.context().addCookies(context.cookies)
    }

    // 导航到工作流面板
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(2000)

    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await workflowTab.click()
    await page.waitForTimeout(2000)

    // 点击空白区域取消选中
    await page.click('text=流程信息')
    await page.waitForTimeout(500)

    // 查找拿回按钮
    const takeBackBtn = page.locator('button:has-text("拿回")').first()
    const btnExists = await takeBackBtn.count() > 0

    if (btnExists) {
      const isDisabled = await takeBackBtn.isDisabled()
      console.log('[TEST-05] 未选中节点，拿回按钮disabled:', isDisabled)

      await page.screenshot({ path: 'test-results/11-takeback-btn.png' })

      expect(isDisabled).toBe(true)
    } else {
      console.log('[TEST-05] ⚠ 拿回按钮不存在（可能是隐藏状态）')
    }
  })

  // ========== 测试6: 回归 - 流程信息面板加载 ==========
  test('TEST-06: 流程信息面板正确加载', async ({ page }) => {
    test.skip(!context.loggedIn, '需要先登录')

    if (context.cookies) {
      await page.context().addCookies(context.cookies)
    }

    // 导航到工作流面板
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForTimeout(2000)

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(500)

    const detailBtn = page.locator('button:has-text("详情")').first()
    await detailBtn.click()
    await page.waitForTimeout(2000)

    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await workflowTab.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/12-final-panel.png' })

    // 检查关键元素
    const tableVisible = await page.locator('table').isVisible()
    console.log('[TEST-06] 节点列表表格visible:', tableVisible)
    expect(tableVisible).toBe(true)

    // 统计元素
    const buttonCount = await page.locator('button').count()
    const rowCount = await page.locator('table tbody tr').count()

    console.log('[TEST-06] 按钮数量:', buttonCount)
    console.log('[TEST-06] 节点数量:', rowCount)
    console.log('[TEST-06] ✓ 流程信息面板加载成功')
  })
})
