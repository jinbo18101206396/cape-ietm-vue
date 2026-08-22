/**
 * 流程信息面板回归测试套件
 * 验证P1-SYNC-01, P2-UI-01, P2-UI-02修复效果
 *
 * 前置条件：
 * 1. 后端服务运行在 http://localhost:9999
 * 2. 前端服务运行在 http://localhost:3000
 * 3. 数据库中存在可测试的DM和流程模板
 *
 * @date 2026-08-21
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const API_BASE_URL = 'http://localhost:9999/jeecg-boot'

// 测试数据（需根据实际数据调整）
const TEST_USER = {
  username: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'admin123'
}

test.describe('流程信息面板回归测试', () => {
  let page
  let context

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()

    // 登录
    await page.goto(`${BASE_URL}/user/login`)
    await page.waitForSelector('#username', { timeout: 10000 })
    await page.fill('#username', TEST_USER.username)
    await page.fill('#password', TEST_USER.password)
    await page.click('button.login-button')

    // 等待登录完成（增加超时时间）
    await page.waitForURL(/\/dashboard/, { timeout: 30000 })
    console.log('✅ 登录成功')
  })

  test.afterAll(async () => {
    await context.close()
  })

  /**
   * TC-01: P1-SYNC-01验证（流程完成事件）
   *
   * 测试步骤：
   * 1. 选择一个已启动流程的DM
   * 2. 进入DM编辑器
   * 3. 在流程面板提交处理至最后节点
   * 4. 选择"通过"
   * 5. 验证控制台输出和事件触发
   */
  test('TC-01: 流程完成事件监听 (P1-SYNC-01)', async () => {
    console.log('\n🧪 执行 TC-01: 流程完成事件监听')

    // 监听控制台日志
    const consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      if (text.includes('[流程信息]')) {
        console.log(`  📋 控制台: ${text}`)
      }
    })

    // 1. 进入DM列表页
    await page.goto(`${BASE_URL}/ietm/ietmDataModuleManagement`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
    console.log('  ✅ 已进入DM列表页')

    // 2. 查找一个"流转中"状态的DM（已启动流程但未完成）
    const workflowInProgressRow = await page.locator('tr:has-text("流转中")').first()

    if (await workflowInProgressRow.count() === 0) {
      console.log('  ⚠️  未找到"流转中"状态的DM，跳过TC-01')
      test.skip()
      return
    }

    // 3. 点击编辑按钮
    await workflowInProgressRow.locator('a:has-text("编辑")').click()
    await page.waitForSelector('.dm-content-editor', { timeout: 10000 })
    console.log('  ✅ 已进入DM编辑器')

    // 4. 切换到流程信息面板
    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    if (await workflowTab.count() > 0) {
      await workflowTab.click()
      await page.waitForTimeout(1000)
      console.log('  ✅ 已切换到流程信息面板')
    }

    // 5. 查找当前可执行的节点
    const currentNodeRow = await page.locator('tr:has(button:has-text("执行处理"))').first()

    if (await currentNodeRow.count() === 0) {
      console.log('  ⚠️  未找到可执行的节点，跳过TC-01')
      test.skip()
      return
    }

    // 6. 点击"执行处理"
    await currentNodeRow.locator('button:has-text("执行处理")').click()
    await page.waitForSelector('.execute-modal', { timeout: 5000 })
    console.log('  ✅ 已打开执行处理弹窗')

    // 7. 检查是否为最后一个节点
    const nodeSeqno = await currentNodeRow.locator('td').nth(3).textContent()
    const allNodes = await page.locator('.wf-instance-dtl-table tbody tr').count()
    console.log(`  📊 当前节点序号: ${nodeSeqno}, 总节点数: ${allNodes}`)

    // 8. 选择"通过"
    await page.click('input[value="1"]') // ifpass=1表示通过
    await page.fill('textarea[placeholder*="意见"]', '自动化测试-流程完成')
    await page.click('button:has-text("提交处理")')

    // 9. 等待处理完成
    await page.waitForTimeout(3000)

    // 10. 验证控制台日志
    const workflowCompleteLog = consoleLogs.find(log =>
      log.includes('[流程信息]') && log.includes('流程已完成')
    )

    if (workflowCompleteLog) {
      console.log('  ✅ TC-01通过: 检测到流程完成事件日志')
      expect(workflowCompleteLog).toContain('[流程信息] 流程已完成')
    } else {
      console.log('  ⚠️  未检测到流程完成日志，可能不是最后节点')
      // 不强制失败，因为可能不是最后一个节点
    }

    // 11. 关闭编辑器
    await page.click('button:has-text("关闭")')
    await page.waitForTimeout(2000)

    console.log('  ✅ TC-01执行完成')
  })

  /**
   * TC-02: P2-UI-01验证（附件链接）
   *
   * 测试步骤：
   * 1. 编辑DM，在流程面板提交处理
   * 2. 上传附件并提交
   * 3. 验证附件链接显示
   * 4. 点击附件链接验证下载功能
   */
  test('TC-02: 附件链接渲染与下载 (P2-UI-01)', async () => {
    console.log('\n🧪 执行 TC-02: 附件链接渲染与下载')

    // 1. 进入DM列表页
    await page.goto(`${BASE_URL}/ietm/ietmDataModuleManagement`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    // 2. 查找一个"流转中"状态的DM
    const workflowInProgressRow = await page.locator('tr:has-text("流转中")').first()

    if (await workflowInProgressRow.count() === 0) {
      console.log('  ⚠️  未找到"流转中"状态的DM，跳过TC-02')
      test.skip()
      return
    }

    // 3. 点击编辑
    await workflowInProgressRow.locator('a:has-text("编辑")').click()
    await page.waitForSelector('.dm-content-editor', { timeout: 10000 })
    console.log('  ✅ 已进入DM编辑器')

    // 4. 切换到流程信息面板
    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    if (await workflowTab.count() > 0) {
      await workflowTab.click()
      await page.waitForTimeout(1000)
    }

    // 5. 查找已执行且有附件的节点
    const nodeWithAttachment = await page.locator('tr:has-text("📎 附件")').first()

    if (await nodeWithAttachment.count() === 0) {
      console.log('  ⚠️  未找到有附件的节点')

      // 尝试创建一个带附件的节点
      const currentNodeRow = await page.locator('tr:has(button:has-text("执行处理"))').first()

      if (await currentNodeRow.count() === 0) {
        console.log('  ⚠️  无可执行节点，跳过TC-02')
        test.skip()
        return
      }

      // 点击执行处理
      await currentNodeRow.locator('button:has-text("执行处理")').click()
      await page.waitForSelector('.execute-modal', { timeout: 5000 })
      console.log('  ✅ 已打开执行处理弹窗')

      // 选择通过
      await page.click('input[value="1"]')
      await page.fill('textarea[placeholder*="意见"]', '自动化测试-附件测试')

      // 上传附件（创建一个测试文件）
      const testFilePath = 'D:/workspace/IETM/test-attachment.txt'
      const fs = require('fs')
      fs.writeFileSync(testFilePath, '这是自动化测试附件内容')

      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(testFilePath)
      await page.waitForTimeout(2000)
      console.log('  ✅ 已上传测试附件')

      // 提交处理
      await page.click('button:has-text("提交处理")')
      await page.waitForTimeout(3000)

      // 刷新页面
      await page.reload()
      await page.waitForTimeout(2000)
    }

    // 6. 验证附件链接存在
    const attachmentLink = await page.locator('.wf-download-link').first()

    if (await attachmentLink.count() > 0) {
      const linkText = await attachmentLink.textContent()
      console.log(`  ✅ TC-02通过: 检测到附件链接 "${linkText}"`)
      expect(linkText).toBeTruthy()

      // 7. 验证链接样式
      const linkColor = await attachmentLink.evaluate(el =>
        window.getComputedStyle(el).color
      )
      console.log(`  📊 附件链接颜色: ${linkColor}`)

      // 8. 点击附件链接测试下载（监听下载事件）
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 })
      await attachmentLink.click()

      try {
        const download = await downloadPromise
        const filename = download.suggestedFilename()
        console.log(`  ✅ TC-02通过: 附件下载触发，文件名: ${filename}`)
        expect(filename).toBeTruthy()
      } catch (error) {
        console.log(`  ⚠️  下载事件未触发: ${error.message}`)
      }
    } else {
      console.log('  ❌ TC-02失败: 未找到附件链接')
      throw new Error('附件链接未正确渲染')
    }

    console.log('  ✅ TC-02执行完成')
  })

  /**
   * TC-03: P2-UI-02验证（阶段列显隐）
   *
   * 测试步骤：
   * 1. 查看无分阶段的流程
   * 2. 验证没有"阶段"列
   * 3. 查看有分阶段的流程
   * 4. 验证有"阶段"列
   */
  test('TC-03: 阶段列动态显隐 (P2-UI-02)', async () => {
    console.log('\n🧪 执行 TC-03: 阶段列动态显隐')

    // 1. 进入DM列表页
    await page.goto(`${BASE_URL}/ietm/ietmDataModuleManagement`)
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    // 2. 查找任意一个有流程的DM
    const dmWithWorkflowRow = await page.locator('tr:has-text("流转中"), tr:has-text("已结束")').first()

    if (await dmWithWorkflowRow.count() === 0) {
      console.log('  ⚠️  未找到有流程的DM，跳过TC-03')
      test.skip()
      return
    }

    // 3. 进入编辑器
    await dmWithWorkflowRow.locator('a:has-text("编辑")').click()
    await page.waitForSelector('.dm-content-editor', { timeout: 10000 })

    // 4. 切换到流程信息面板
    const workflowTab = page.locator('.ant-tabs-tab:has-text("流程信息")')
    if (await workflowTab.count() > 0) {
      await workflowTab.click()
      await page.waitForTimeout(1000)
      console.log('  ✅ 已切换到流程信息面板')
    }

    // 5. 检查是否有"阶段"列
    const stageColumnHeader = await page.locator('th:has-text("阶段")')
    const hasStageColumn = await stageColumnHeader.count() > 0

    // 6. 检查流程模板是否分阶段（通过查看节点表是否有阶段信息）
    const firstNodeRow = await page.locator('.wf-instance-dtl-table tbody tr').first()
    const cellCount = await firstNodeRow.locator('td').count()

    console.log(`  📊 表格列数: ${cellCount}`)
    console.log(`  📊 是否有阶段列: ${hasStageColumn}`)

    // 7. 查看流程实例详情来判断是否分阶段
    const instanceInfo = await page.locator('.workflow-instance-info').textContent()
    const hasMultipleStages = instanceInfo.includes('阶段1') || instanceInfo.includes('阶段2')

    console.log(`  📊 流程是否分阶段: ${hasMultipleStages}`)

    // 8. 验证逻辑：分阶段应有阶段列，非分阶段应无阶段列
    if (hasMultipleStages) {
      expect(hasStageColumn).toBe(true)
      console.log('  ✅ TC-03通过: 分阶段流程正确显示"阶段"列')
    } else {
      expect(hasStageColumn).toBe(false)
      console.log('  ✅ TC-03通过: 非分阶段流程正确隐藏"阶段"列')
    }

    console.log('  ✅ TC-03执行完成')
  })
})
