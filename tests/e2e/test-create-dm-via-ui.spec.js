/**
 * 通过UI界面创建测试DM数据
 * 使用真实的浏览器交互，不调用API
 */

const { test, expect } = require('@playwright/test')

test('通过UI创建测试DM数据', async ({ page }) => {
  console.log('\n=== 步骤1: 登录系统 ===')
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("登 录")')
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 })
  await page.waitForTimeout(2000)

  console.log('✓ 登录成功')

  console.log('\n=== 步骤2: 导航到数据模块管理 ===')
  await page.click('text=项目管理')
  await page.waitForTimeout(500)
  await page.click('text=数据模块管理')
  await page.waitForTimeout(3000)

  console.log('✓ 已进入数据模块管理页面')
  await page.screenshot({ path: 'test-results/before-create-dm.png', fullPage: true })

  console.log('\n=== 步骤3: 点击"新建"按钮 ===')

  // 使用更精确的选择器
  const newButton = page.locator('button:has-text("新建")').first()
  await newButton.waitFor({ state: 'visible', timeout: 5000 })

  const isEnabled = await newButton.isEnabled()
  console.log('新建按钮状态:', isEnabled ? '可用' : '禁用')

  if (!isEnabled) {
    console.log('⚠️  新建按钮被禁用，可能需要先选择项目或配置节点')

    // 检查是否有项目选择器
    const projectSelectors = await page.locator('.ant-select').all()
    console.log(`找到 ${projectSelectors.length} 个下拉选择器`)

    for (let i = 0; i < projectSelectors.length; i++) {
      const selector = projectSelectors[i]
      const text = await selector.textContent().catch(() => '')
      console.log(`  选择器 ${i}: "${text.trim()}"`)
    }

    // 尝试展开左侧树
    const treeNodes = await page.locator('.ant-tree-switcher').all()
    console.log(`找到 ${treeNodes.length} 个树节点展开按钮`)

    if (treeNodes.length > 0) {
      console.log('\n尝试展开左侧树节点...')
      for (let i = 0; i < Math.min(treeNodes.length, 5); i++) {
        try {
          await treeNodes[i].click({ timeout: 1000 })
          await page.waitForTimeout(500)
          console.log(`✓ 展开节点 ${i + 1}`)
        } catch (e) {
          console.log(`  节点 ${i + 1} 无需展开或已展开`)
        }
      }

      await page.screenshot({ path: 'test-results/after-expand-tree.png', fullPage: true })

      // 再次检查新建按钮
      const newButtonAfter = page.locator('button:has-text("新建")').first()
      const isEnabledAfter = await newButtonAfter.isEnabled()
      console.log('\n展开树后，新建按钮状态:', isEnabledAfter ? '可用' : '禁用')

      if (isEnabledAfter) {
        console.log('\n=== 步骤4: 点击新建按钮 ===')
        await newButtonAfter.click()
        await page.waitForTimeout(2000)

        await page.screenshot({ path: 'test-results/create-dm-dialog.png', fullPage: true })

        // 检查弹窗
        const modalVisible = await page.locator('.ant-modal').isVisible()
        console.log('新建对话框可见:', modalVisible)

        if (modalVisible) {
          const modalTitle = await page.locator('.ant-modal-title').textContent()
          console.log('对话框标题:', modalTitle)

          console.log('\n=== 步骤5: 填写DM信息 ===')

          // 查找所有输入框
          const inputs = await page.locator('.ant-modal input[type="text"]').all()
          console.log(`找到 ${inputs.length} 个文本输入框`)

          // 填写必填字段（根据实际表单调整）
          try {
            // 技术名称
            await page.locator('.ant-modal input').first().fill('测试DM-自动创建')
            console.log('✓ 填写技术名称')

            await page.waitForTimeout(500)

            // 点击确定按钮
            const submitButton = page.locator('.ant-modal button:has-text("确定"), .ant-modal button:has-text("确认"), .ant-modal button:has-text("提交")').first()
            await submitButton.click()
            console.log('✓ 点击提交按钮')

            await page.waitForTimeout(3000)

            // 检查是否创建成功
            const rows = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').count()
            console.log(`\n创建后，表格行数: ${rows}`)

            if (rows > 0) {
              console.log('\n✅ DM创建成功！')

              // 打印第一行数据
              const firstRow = await page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)').first().textContent()
              console.log('第一行数据:', firstRow.substring(0, 200))

              await page.screenshot({ path: 'test-results/after-create-dm.png', fullPage: true })
            } else {
              console.log('⚠️  表格仍然为空，可能创建失败或需要刷新')

              // 检查错误提示
              const errorMsg = await page.locator('.ant-message-error, .ant-notification-error').count()
              if (errorMsg > 0) {
                const errorText = await page.locator('.ant-message-error, .ant-notification-error').first().textContent()
                console.log('错误信息:', errorText)
              }
            }
          } catch (error) {
            console.log('填写表单失败:', error.message)
            await page.screenshot({ path: 'test-results/create-dm-error.png', fullPage: true })
          }
        }
      } else {
        console.log('⚠️  展开树后新建按钮仍然禁用')

        // 尝试点击树节点
        console.log('\n尝试点击树节点...')
        const leafNodes = await page.locator('.ant-tree-node-content-wrapper').all()
        console.log(`找到 ${leafNodes.length} 个树节点`)

        if (leafNodes.length > 0) {
          // 点击最后一个节点（通常是叶子节点）
          const lastNode = leafNodes[leafNodes.length - 1]
          const nodeText = await lastNode.textContent()
          console.log(`点击节点: "${nodeText.trim()}"`)

          await lastNode.click()
          await page.waitForTimeout(2000)

          await page.screenshot({ path: 'test-results/after-click-tree-node.png', fullPage: true })

          // 再次检查新建按钮
          const finalButton = page.locator('button:has-text("新建")').first()
          const finalEnabled = await finalButton.isEnabled()
          console.log('点击节点后，新建按钮状态:', finalEnabled ? '可用' : '禁用')

          if (finalEnabled) {
            console.log('\n✅ 找到了启用新建按钮的方法！')
            console.log('需要：1) 展开树节点 2) 点击叶子节点')
          }
        }
      }
    }
  } else {
    // 新建按钮直接可用
    console.log('\n=== 步骤4: 新建按钮直接可用，点击 ===')
    await newButton.click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/create-dm-dialog-direct.png', fullPage: true })
  }
})
