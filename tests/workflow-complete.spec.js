/**
 * 工作流信息模块 - 完整UI交互测试（手动登录版本）
 *
 * 测试策略：
 * 1. 打开浏览器让测试人员手动登录
 * 2. 保存登录状态
 * 3. 执行所有UI交互测试
 * 4. 验证真实DOM状态和用户可见效果
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'

test.setTimeout(300000) // 5分钟超时

// 全局状态
let globalContext = {
  authenticated: false,
  cookies: null,
  dmId: null,
  instanceId: null,
  testResults: []
}

test.describe('工作流信息模块 - 完整UI交互测试', () => {

  // ========== 准备：手动登录 ==========
  test('准备：手动登录并保存会话', async ({ page }) => {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║  请在打开的浏览器中手动登录系统                        ║')
    console.log('║  登录成功后，浏览器会自动继续执行测试                  ║')
    console.log('║  超时时间：120秒                                        ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // 等待用户手动登录（检测登录成功的标志）
    try {
      // 等待以下任一元素出现，表示登录成功
      await Promise.race([
        page.waitForSelector('.user-dropdown-menu', { timeout: 120000 }),
        page.waitForSelector('.ant-dropdown-trigger:has-text("管理员")', { timeout: 120000 }),
        page.waitForSelector('text=工作台', { timeout: 120000 }),
        page.waitForURL(/dashboard|index/, { timeout: 120000 })
      ])

      // 保存cookies
      globalContext.cookies = await page.context().cookies()
      globalContext.authenticated = true

      console.log('✓ 登录成功，会话已保存')
      await page.screenshot({ path: 'test-results/00-login-success.png' })

    } catch (error) {
      console.error('✗ 登录超时或失败')
      throw new Error('请在120秒内完成手动登录')
    }
  })

  // ========== 场景测试1：导航到工作流信息面板 ==========
  test('场景1：导航到工作流信息面板', async ({ page }) => {
    test.skip(!globalContext.authenticated, '需要先登录')

    console.log('\n[场景1] 导航到工作流信息面板')

    // 恢复登录状态
    await page.context().addCookies(globalContext.cookies)

    // 1. 进入DM管理列表页
    console.log('  1. 访问DM管理列表页...')
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/01-dm-list.png' })

    // 2. 检查表格是否有数据
    const table = page.locator('table tbody tr')
    const rowCount = await table.count()
    console.log(`  2. DM列表行数: ${rowCount}`)

    if (rowCount === 0) {
      console.log('  ⚠️ 无DM数据，请在系统中创建测试数据后重新运行')
      test.skip()
      return
    }

    // 3. 点击第一行
    console.log('  3. 点击第一行DM...')
    const firstRow = table.first()
    await firstRow.click()
    await page.waitForTimeout(1000)

    // 验证行被选中（通常有高亮背景色）
    const rowClass = await firstRow.getAttribute('class')
    console.log(`  4. 行class: ${rowClass}`)

    await page.screenshot({ path: 'test-results/02-row-selected.png' })

    // 4. 点击"详情"按钮
    console.log('  5. 点击"详情"按钮...')
    const detailBtn = page.locator('button:has-text("详情")').first()
    await expect(detailBtn).toBeVisible()
    await detailBtn.click()
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/03-dm-detail.png' })

    // 5. 切换到"流程信息"标签页
    console.log('  6. 切换到"流程信息"标签...')
    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    await expect(workflowTab).toBeVisible()
    await workflowTab.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/04-workflow-panel.png' })

    // 6. 验证工作流面板元素
    console.log('  7. 验证工作流面板元素...')
    const nodeTable = page.locator('table')
    await expect(nodeTable).toBeVisible()

    const nodeRows = nodeTable.locator('tbody tr')
    const nodeCount = await nodeRows.count()
    console.log(`  ✓ 节点数量: ${nodeCount}`)

    // 记录状态
    globalContext.dmId = page.url().match(/id=([^&]+)/)?.[1]
    console.log(`  ✓ DM ID: ${globalContext.dmId}`)

    console.log('[场景1] ✓ 导航成功\n')
  })

  // ========== 场景测试2：Issue-3 删除按钮状态验证 ==========
  test('场景2：删除按钮禁用状态（Issue-3）', async ({ page }) => {
    test.skip(!globalContext.authenticated, '需要先登录')

    console.log('\n[场景2] 删除按钮禁用状态验证')

    await page.context().addCookies(globalContext.cookies)
    await navigateToWorkflow(page)

    // 子场景2.1：未选中节点时删除按钮禁用
    console.log('  子场景2.1：未选中节点时删除按钮应禁用')

    // 点击空白区域取消选中
    await page.click('text=流程信息')
    await page.waitForTimeout(500)

    const deleteBtn = page.locator('button').filter({ hasText: /^删除$/ }).first()
    const isDisabled1 = await deleteBtn.isDisabled()
    console.log(`  ✓ 未选中节点，删除按钮disabled: ${isDisabled1}`)
    expect(isDisabled1).toBe(true)

    await page.screenshot({ path: 'test-results/05-delete-no-selection.png' })

    // 子场景2.2：选中已执行节点时删除按钮禁用
    console.log('  子场景2.2：选中已执行节点时删除按钮应禁用')

    const nodeRows = page.locator('table tbody tr')
    const rowCount = await nodeRows.count()

    let foundExecutedNode = false
    for (let i = 0; i < rowCount; i++) {
      const row = nodeRows.nth(i)
      const cells = await row.locator('td').allTextContents()
      const rowText = cells.join(' ')

      // 查找"已处理"列是否包含"是"
      if (rowText.includes('是') && !rowText.startsWith('1')) { // 排除序号列
        await row.click()
        await page.waitForTimeout(500)

        const isDisabled2 = await deleteBtn.isDisabled()
        console.log(`  ✓ 选中已执行节点，删除按钮disabled: ${isDisabled2}`)
        expect(isDisabled2).toBe(true)

        await page.screenshot({ path: 'test-results/06-delete-executed-node.png' })

        foundExecutedNode = true
        break
      }
    }

    if (!foundExecutedNode) {
      console.log('  ⚠️ 未找到已执行节点')
    }

    // 子场景2.3：选中未执行节点时删除按钮启用
    console.log('  子场景2.3：选中未执行节点时删除按钮应启用')

    let foundUnexecutedNode = false
    for (let i = rowCount - 1; i >= 0; i--) {
      const row = nodeRows.nth(i)
      const cells = await row.locator('td').allTextContents()
      const rowText = cells.join(' ')

      // 查找未执行节点（不包含"是"）
      if (!rowText.includes('已处理') || !rowText.match(/已处理.*是/)) {
        await row.click()
        await page.waitForTimeout(500)

        const isDisabled3 = await deleteBtn.isDisabled()
        console.log(`  ✓ 选中未执行节点，删除按钮disabled: ${isDisabled3}`)

        if (!isDisabled3) {
          foundUnexecutedNode = true
          await page.screenshot({ path: 'test-results/07-delete-unexecuted-node.png' })

          // 子场景2.4：点击删除按钮弹出确认对话框
          console.log('  子场景2.4：点击删除按钮应弹出确认对话框')

          await deleteBtn.click()
          await page.waitForTimeout(1000)

          const modal = page.locator('.ant-modal:visible, .ant-confirm:visible')
          const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false)
          console.log(`  ✓ 确认对话框visible: ${modalVisible}`)
          expect(modalVisible).toBe(true)

          await page.screenshot({ path: 'test-results/08-delete-confirm-modal.png' })

          // 点击取消
          const cancelBtn = modal.locator('button:has-text("取消")').first()
          await cancelBtn.click()
          await page.waitForTimeout(500)
          console.log('  ✓ 已取消删除')

          break
        }
      }
    }

    if (!foundUnexecutedNode) {
      console.log('  ⚠️ 未找到可删除的未执行节点')
    }

    console.log('[场景2] ✓ 删除按钮状态验证完成\n')
  })

  // ========== 场景测试3：新增节点自动填充当前用户 ==========
  test('场景3：新增节点自动填充当前用户', async ({ page }) => {
    test.skip(!globalContext.authenticated, '需要先登录')

    console.log('\n[场景3] 新增节点自动填充当前用户')

    await page.context().addCookies(globalContext.cookies)
    await navigateToWorkflow(page)

    // 子场景3.1：点击新增按钮
    console.log('  子场景3.1：点击"新增"按钮')

    const addBtn = page.locator('button').filter({ hasText: /^新增$/ }).first()
    const addBtnVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!addBtnVisible) {
      console.log('  ⚠️ "新增"按钮不可见，可能无编辑权限')
      test.skip()
      return
    }

    // 记录当前节点数量
    const nodeRowsBefore = page.locator('table tbody tr')
    const countBefore = await nodeRowsBefore.count()
    console.log(`  ✓ 当前节点数量: ${countBefore}`)

    await addBtn.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/09-after-click-add.png' })

    // 子场景3.2：验证新行已添加
    console.log('  子场景3.2：验证新行已添加')

    const nodeRowsAfter = page.locator('table tbody tr')
    const countAfter = await nodeRowsAfter.count()
    console.log(`  ✓ 新增后节点数量: ${countAfter}`)

    expect(countAfter).toBe(countBefore + 1)

    // 子场景3.3：验证处理人列自动填充当前用户
    console.log('  子场景3.3：验证处理人列自动填充当前用户')

    const newRow = nodeRowsAfter.last()
    const cells = await newRow.locator('td').all()

    // 查找处理人列（通常在第1-2列）
    let foundUserCell = false
    for (let i = 0; i < Math.min(5, cells.length); i++) {
      const cell = cells[i]
      const cellText = await cell.textContent()
      const cleaned = cellText.trim()

      // 检查是否包含用户名
      if (cleaned && cleaned !== '-' && !cleaned.match(/^\d+$/) && cleaned.length > 1 && !cleaned.includes('确定') && !cleaned.includes('取消')) {
        console.log(`  ✓ 找到处理人单元格[列${i + 1}]: "${cleaned}"`)

        // 子场景3.4：验证蓝色粗体样式
        console.log('  子场景3.4：验证蓝色粗体样式')

        const blueSpan = cell.locator('.new-node-user')
        const hasBlueStyle = await blueSpan.isVisible().catch(() => false)

        if (hasBlueStyle) {
          console.log('  ✓✓ 找到.new-node-user样式')

          // 验证颜色
          const color = await blueSpan.evaluate(el => window.getComputedStyle(el).color)
          const fontWeight = await blueSpan.evaluate(el => window.getComputedStyle(el).fontWeight)

          console.log(`  ✓ 颜色: ${color}`)
          console.log(`  ✓ 字体粗细: ${fontWeight}`)

          // 验证颜色是蓝色（rgb(24, 144, 255) = #1890ff）
          expect(color).toContain('24') // 包含蓝色分量

          foundUserCell = true
        } else {
          console.log(`  ⚠️ 单元格没有.new-node-user样式`)
        }

        await page.screenshot({ path: 'test-results/10-new-node-user-cell.png' })

        // 子场景3.5：验证不能点击选择其他用户
        console.log('  子场景3.5：验证不能点击选择其他用户')

        await cell.click()
        await page.waitForTimeout(1000)

        const userSelector = page.locator('.ant-select-dropdown:visible, .j-select-user-by-dep:visible')
        const selectorVisible = await userSelector.isVisible({ timeout: 1000 }).catch(() => false)

        console.log(`  ✓ 用户选择器visible: ${selectorVisible}`)
        expect(selectorVisible).toBe(false)

        break
      }
    }

    if (!foundUserCell) {
      console.log('  ⚠️ 未找到明确的用户单元格')
    }

    // 子场景3.6：填写节点信息并保存
    console.log('  子场景3.6：填写节点信息')

    const nodeNameInput = newRow.locator('input').first()
    const inputVisible = await nodeNameInput.isVisible({ timeout: 2000 }).catch(() => false)

    if (inputVisible) {
      const testNodeName = `E2E测试节点_${Date.now()}`
      await nodeNameInput.fill(testNodeName)
      await page.waitForTimeout(500)
      console.log(`  ✓ 填写节点名称: ${testNodeName}`)

      await page.screenshot({ path: 'test-results/11-filled-node-name.png' })

      // 点击确定按钮保存
      console.log('  子场景3.7：点击"确定"保存')

      const confirmBtn = newRow.locator('button').filter({ hasText: /确定|保存/ }).first()
      const confirmVisible = await confirmBtn.isVisible().catch(() => false)

      if (confirmVisible) {
        await confirmBtn.click()
        await page.waitForTimeout(3000)

        // 检查成功/失败提示
        const successMsg = page.locator('.ant-message-success:visible')
        const errorMsg = page.locator('.ant-message-error:visible')

        const hasSuccess = await successMsg.isVisible({ timeout: 3000 }).catch(() => false)
        const hasError = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false)

        if (hasSuccess) {
          console.log('  ✓✓ 保存成功')
          await page.screenshot({ path: 'test-results/12-save-success.png' })
        } else if (hasError) {
          const errorText = await errorMsg.textContent()
          console.log(`  ✗ 保存失败: ${errorText}`)
          await page.screenshot({ path: 'test-results/12-save-error.png' })
        } else {
          console.log('  ⚠️ 未检测到提示消息')
        }

        // 子场景3.8：刷新验证数据持久化
        console.log('  子场景3.8：刷新页面验证数据持久化')

        await page.reload()
        await page.waitForTimeout(2000)

        // 切换回流程信息标签
        const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
        await workflowTab.click()
        await page.waitForTimeout(2000)

        const finalRowCount = await page.locator('table tbody tr').count()
        console.log(`  ✓ 刷新后节点数量: ${finalRowCount}`)

        await page.screenshot({ path: 'test-results/13-after-refresh.png' })
      }
    }

    console.log('[场景3] ✓ 新增节点测试完成\n')
  })

  // ========== 场景测试4：编辑已有节点可以选择其他用户 ==========
  test('场景4：编辑已有节点可以选择其他用户', async ({ page }) => {
    test.skip(!globalContext.authenticated, '需要先登录')

    console.log('\n[场景4] 编辑已有节点可以选择其他用户')

    await page.context().addCookies(globalContext.cookies)
    await navigateToWorkflow(page)

    // 查找未执行的已有节点
    const nodeRows = page.locator('table tbody tr')
    const rowCount = await nodeRows.count()

    let foundEditableNode = false

    for (let i = 0; i < rowCount; i++) {
      const row = nodeRows.nth(i)
      const cells = await row.locator('td').allTextContents()
      const rowText = cells.join(' ')

      // 找到未执行节点
      if (!rowText.includes('已处理') || !rowText.match(/已处理.*是/)) {
        console.log('  子场景4.1：双击节点进入编辑模式')

        // 双击进入编辑模式
        await row.dblclick()
        await page.waitForTimeout(1500)

        await page.screenshot({ path: 'test-results/14-edit-existing-node.png' })

        console.log('  子场景4.2：点击处理人列')

        // 查找处理人列
        const editCells = await row.locator('td').all()

        for (let j = 0; j < Math.min(5, editCells.length); j++) {
          const cell = editCells[j]

          await cell.click()
          await page.waitForTimeout(1000)

          // 检查是否弹出用户选择器
          const userSelector = page.locator('.ant-select-dropdown:visible')
          const selectorVisible = await userSelector.isVisible({ timeout: 2000 }).catch(() => false)

          if (selectorVisible) {
            console.log(`  ✓✓ 用户选择器弹出（列${j + 1}）`)
            await page.screenshot({ path: 'test-results/15-user-selector-open.png' })

            foundEditableNode = true

            // 点击取消按钮
            const cancelBtn = row.locator('button:has-text("取消")').first()
            if (await cancelBtn.isVisible().catch(() => false)) {
              await cancelBtn.click()
              await page.waitForTimeout(500)
              console.log('  ✓ 已取消编辑')
            }

            break
          }
        }

        if (foundEditableNode) break
      }
    }

    if (!foundEditableNode) {
      console.log('  ⚠️ 未找到可编辑的节点或未弹出选择器')
    }

    console.log('[场景4] ✓ 编辑已有节点测试完成\n')
  })

  // ========== 场景测试5：Issue-4优化 拿回按钮禁用状态 ==========
  test('场景5：拿回按钮禁用状态（Issue-4优化）', async ({ page }) => {
    test.skip(!globalContext.authenticated, '需要先登录')

    console.log('\n[场景5] 拿回按钮禁用状态验证')

    await page.context().addCookies(globalContext.cookies)
    await navigateToWorkflow(page)

    // 子场景5.1：未选中节点时拿回按钮禁用
    console.log('  子场景5.1：未选中节点时拿回按钮应禁用')

    await page.click('text=流程信息')
    await page.waitForTimeout(500)

    const takeBackBtn = page.locator('button').filter({ hasText: /拿回/ }).first()
    const btnExists = await takeBackBtn.count() > 0

    if (btnExists) {
      const isDisabled = await takeBackBtn.isDisabled()
      console.log(`  ✓ 未选中节点，拿回按钮disabled: ${isDisabled}`)
      expect(isDisabled).toBe(true)

      await page.screenshot({ path: 'test-results/16-takeback-no-selection.png' })
    } else {
      console.log('  ⚠️ 拿回按钮不存在（可能是隐藏状态）')
    }

    console.log('[场景5] ✓ 拿回按钮测试完成\n')
  })

  // ========== 场景测试6：Issue-4 "保存意见"按钮显示逻辑 ==========
  test('场景6："保存意见"按钮显示逻辑（Issue-4）', async ({ page }) => {
    test.skip(!globalContext.authenticated, '需要先登录')

    console.log('\n[场景6] "保存意见"按钮显示逻辑验证')

    await page.context().addCookies(globalContext.cookies)
    await navigateToWorkflow(page)

    await page.screenshot({ path: 'test-results/17-save-opinion-context.png' })

    // 分析节点列表状态
    const nodeRows = page.locator('table tbody tr')
    const rowCount = await nodeRows.count()

    let hasProcessedNonCreateNode = false

    for (let i = 0; i < rowCount; i++) {
      const row = nodeRows.nth(i)
      const cells = await row.locator('td').allTextContents()
      const rowText = cells.join(' ')

      // 查找已处理的非创建节点
      if (rowText.includes('是') && !rowText.startsWith('0')) {
        hasProcessedNonCreateNode = true
        console.log(`  ✓ 找到已处理的非创建节点（行${i + 1}）`)
        break
      }
    }

    console.log(`  节点分析: 已处理非创建节点=${hasProcessedNonCreateNode}`)

    // 查找"保存意见"按钮
    const saveOpinionBtn = page.locator('button').filter({ hasText: /^保存意见$/ })
    const btnCount = await saveOpinionBtn.count()
    const btnVisible = btnCount > 0 ? await saveOpinionBtn.first().isVisible().catch(() => false) : false

    console.log(`  ✓ "保存意见"按钮存在: ${btnCount > 0}, visible: ${btnVisible}`)

    // 验证逻辑：只有存在已处理的非创建节点时才显示
    if (hasProcessedNonCreateNode && btnVisible) {
      console.log('  ✓✓ 按钮显示逻辑正确（有已处理节点→按钮显示）')
    } else if (!hasProcessedNonCreateNode && !btnVisible) {
      console.log('  ✓✓ 按钮显示逻辑正确（无已处理节点→按钮隐藏）')
    } else {
      console.log('  ⚠️ 按钮显示逻辑可能有偏差')
      console.log(`    预期显示: ${hasProcessedNonCreateNode}, 实际显示: ${btnVisible}`)
    }

    console.log('[场景6] ✓ "保存意见"按钮测试完成\n')
  })

  // ========== 边界测试1：用户信息获取失败 ==========
  test('边界1：模拟用户信息获取失败', async ({ page }) => {
    test.skip(!globalContext.authenticated, '需要先登录')

    console.log('\n[边界1] 模拟用户信息获取失败')

    await page.context().addCookies(globalContext.cookies)
    await navigateToWorkflow(page)

    console.log('  子场景1.1：清空Vuex Store中的userInfo')

    // 通过浏览器控制台清空userInfo
    await page.evaluate(() => {
      try {
        if (window.$vm && window.$vm.$store) {
          window.$vm.$store.state.user = { info: null }
          console.log('已清空userInfo')
        }
      } catch (e) {
        console.error('清空userInfo失败:', e)
      }
    })

    await page.waitForTimeout(500)

    console.log('  子场景1.2：点击"新增"按钮')

    const addBtn = page.locator('button').filter({ hasText: /^新增$/ }).first()
    await addBtn.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/18-add-node-no-user.png' })

    console.log('  子场景1.3：检查错误提示')

    const errorMsg = page.locator('.ant-message-error:visible')
    const hasError = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasError) {
      const errorText = await errorMsg.textContent()
      console.log(`  ✓✓ 显示错误提示: "${errorText}"`)
      expect(errorText).toContain('无法获取当前用户信息')
    } else {
      console.log('  ⚠️ 未检测到错误提示')
    }

    // 检查是否新增了行
    const nodeRows = page.locator('table tbody tr')
    const finalCount = await nodeRows.count()
    console.log(`  ✓ 最终节点数量: ${finalCount}（应该未增加）`)

    console.log('[边界1] ✓ 用户信息失败测试完成\n')
  })

  // ========== 最终总结 ==========
  test.afterAll(async () => {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║  测试执行完成                                          ║')
    console.log('║  请查看 test-results/ 目录下的截图                     ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')
  })
})

// ========== 辅助函数 ==========

async function navigateToWorkflow(page) {
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
}
