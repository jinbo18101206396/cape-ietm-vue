/**
 * 完整的UI端到端测试
 * 包括：创建DM → 签出 → 签入 → 验证历史版本
 *
 * 注意：此测试需要系统中已配置好项目和构型节点
 */

const { chromium } = require('playwright')

async function runCompleteTest() {
  console.log('========================================')
  console.log('历史版本显示修复 - 完整UI测试')
  console.log('========================================\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // 放慢操作以便观察
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })

  const page = await context.newPage()

  try {
    // 步骤1: 登录
    console.log('步骤1: 登录系统...')
    await page.goto('http://localhost:3000/user/login')
    await page.waitForTimeout(2000)

    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    console.log('✅ 登录成功\n')

    // 步骤2: 导航到DM管理页面
    console.log('步骤2: 导航到DM管理页面...')
    await page.goto('http://localhost:3000/ietm/IetmDataModuleList')
    await page.waitForTimeout(3000)

    // 步骤3: 检查页面状态并尝试创建DM
    console.log('步骤3: 尝试创建测试DM...')

    // 等待页面加载
    await page.waitForSelector('body', { timeout: 10000 })

    // 截图当前页面状态
    await page.screenshot({ path: '/d/tmp/dm-list-page.png', fullPage: true })
    console.log('📸 已截图保存到: /d/tmp/dm-list-page.png')

    // 检查是否需要选择项目
    const projectSelect = await page.$('.ant-select:has-text("请选择项目")')
    if (projectSelect) {
      console.log('⚠️  需要先选择项目')

      // 点击项目选择框
      await projectSelect.click()
      await page.waitForTimeout(1000)

      // 选择第一个项目
      const firstProject = await page.$('.ant-select-dropdown .ant-select-item')
      if (firstProject) {
        await firstProject.click()
        await page.waitForTimeout(2000)
        console.log('✅ 已选择项目')
      } else {
        console.log('❌ 没有可用的项目')
        throw new Error('系统中没有项目，请先创建项目')
      }
    }

    // 检查是否需要选择构型节点
    const nodeSelect = await page.$('.ant-select:has-text("构型节点"), .ant-select:has-text("请选择节点")')
    if (nodeSelect) {
      console.log('⚠️  需要先选择构型节点')

      await nodeSelect.click()
      await page.waitForTimeout(1000)

      const firstNode = await page.$('.ant-select-dropdown .ant-select-item')
      if (firstNode) {
        await firstNode.click()
        await page.waitForTimeout(2000)
        console.log('✅ 已选择构型节点')
      } else {
        console.log('❌ 没有可用的构型节点')
        throw new Error('系统中没有构型节点，请先创建构型节点')
      }
    }

    // 再次截图，看选择项目后的状态
    await page.screenshot({ path: '/d/tmp/dm-list-after-select.png', fullPage: true })
    console.log('📸 已截图保存到: /d/tmp/dm-list-after-select.png')

    // 检查是否有数据
    const hasData = await page.$('tbody tr')
    if (hasData) {
      const rowCount = await page.$$eval('tbody tr', rows => rows.length)
      console.log(`\n✅ 发现 ${rowCount} 条DM数据！`)

      if (rowCount > 0) {
        console.log('\n========================================')
        console.log('使用现有数据进行测试')
        console.log('========================================\n')

        // 获取第一行数据
        const firstRow = page.locator('tbody tr').first()

        // 获取DMC信息
        const dmcText = await firstRow.locator('td').nth(1).textContent()
        console.log(`测试DM: ${dmcText}`)

        // 检查是否可以签出
        const checkoutBtn = firstRow.locator('button:has-text("签出")')
        const isCheckoutVisible = await checkoutBtn.isVisible().catch(() => false)

        if (!isCheckoutVisible) {
          console.log('❌ 此DM不能签出（可能已签出或已发布）')
          console.log('请手动在UI中找一个可以签出的草稿DM进行测试')
          return
        }

        // 步骤4: 查询初始历史版本
        console.log('\n步骤4: 查询初始历史版本...')
        const moreBtn = firstRow.locator('button:has-text("更多")')
        await moreBtn.click()
        await page.waitForTimeout(500)

        await page.click('li:has-text("历史版本")')
        await page.waitForTimeout(2000)

        const modal = page.locator('.ant-modal:has-text("历史版本")')
        await modal.waitFor({ state: 'visible', timeout: 5000 })

        const initialRows = modal.locator('tbody tr')
        const initialCount = await initialRows.count()
        console.log(`初始历史版本数: ${initialCount}`)

        // 截图初始历史版本
        await page.screenshot({ path: '/d/tmp/history-before.png' })
        console.log('📸 已截图: /d/tmp/history-before.png')

        // 关闭弹窗
        await page.click('.ant-modal-close')
        await page.waitForTimeout(500)

        // 步骤5: 签出
        console.log('\n步骤5: 签出DM...')
        await checkoutBtn.click()
        await page.waitForTimeout(2000)

        // 等待成功提示
        const successMsg = page.locator('.ant-message-success')
        await successMsg.waitFor({ state: 'visible', timeout: 5000 })
        console.log('✅ 签出成功')

        // 刷新页面
        await page.reload()
        await page.waitForTimeout(3000)

        // 步骤6: 签入
        console.log('\n步骤6: 签入DM...')
        const newRow = page.locator(`tbody tr:has-text("${dmcText.trim()}")`).first()
        const checkinBtn = newRow.locator('button:has-text("签入")')
        await checkinBtn.click()
        await page.waitForTimeout(1000)

        // 填写备注（如果有）
        const commentInput = page.locator('textarea')
        if (await commentInput.isVisible().catch(() => false)) {
          await commentInput.fill('自动化测试签入')
        }

        await page.click('button:has-text("确定")')
        await page.waitForTimeout(2000)

        await successMsg.waitFor({ state: 'visible', timeout: 5000 })
        console.log('✅ 签入成功')

        // 刷新页面
        await page.reload()
        await page.waitForTimeout(3000)

        // 步骤7: 【关键验证】查询签入后的历史版本
        console.log('\n步骤7: 【关键验证】查询签入后的历史版本...')
        const finalRow = page.locator(`tbody tr:has-text("${dmcText.trim()}")`).first()
        const finalMoreBtn = finalRow.locator('button:has-text("更多")')
        await finalMoreBtn.click()
        await page.waitForTimeout(500)

        await page.click('li:has-text("历史版本")')
        await page.waitForTimeout(2000)

        await modal.waitFor({ state: 'visible', timeout: 5000 })

        const finalRows = modal.locator('tbody tr')
        const finalCount = await finalRows.count()
        console.log(`签入后历史版本数: ${finalCount}`)

        // 截图最终结果
        await page.screenshot({ path: '/d/tmp/history-after.png' })
        console.log('📸 已截图: /d/tmp/history-after.png')

        // 验证结果
        console.log('\n========================================')
        console.log('测试结果')
        console.log('========================================\n')

        if (finalCount === initialCount) {
          console.log('❌❌❌ 测试失败！')
          console.log(`签入后版本数 = 初始版本数 (${finalCount})`)
          console.log('说明: 签入时将原版本归档了，BUG未修复')
        } else if (finalCount === initialCount + 1) {
          console.log('✅✅✅ 测试成功！')
          console.log(`签入后版本数 = 初始版本数 + 1 (${finalCount})`)
          console.log('说明: 签入时保留了原版本，修复生效')
        } else {
          console.log(`⚠️  版本数异常: ${initialCount} → ${finalCount}`)
        }
      }
    } else {
      console.log('\n❌ 页面上没有显示任何DM数据')
      console.log('\n可能的原因:')
      console.log('  1. 需要选择正确的项目和构型节点')
      console.log('  2. 数据库确实为空')
      console.log('  3. 页面加载有问题')

      console.log('\n请查看截图: /d/tmp/dm-list-after-select.png')
    }

    // 保持浏览器打开以便查看
    console.log('\n浏览器将保持打开30秒，请查看页面状态...')
    await page.waitForTimeout(30000)
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)

    // 截图错误状态
    await page.screenshot({ path: '/d/tmp/error.png' })
    console.log('📸 错误截图: /d/tmp/error.png')

    throw error
  } finally {
    await browser.close()
  }
}

runCompleteTest().catch(err => {
  console.error('测试异常:', err)
  process.exit(1)
})
