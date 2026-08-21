/**
 * 前置校验恢复验证测试
 * 验证工作流校验是否正确拦截非法签出操作
 *
 * 测试范围：
 * 1. 未启动工作流的DM → 拒绝签出
 * 2. 非"DM编写"节点的DM → 拒绝签出
 * 3. 已启动工作流且在"DM编写"节点 → 允许签出
 *
 * @author Claude (Kiro)
 * @date 2026-08-21
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const LOGIN = {
  username: 'admin',
  password: '123456'
}

/**
 * 登录系统（处理租户选择弹窗）
 */
async function login(page) {
  await page.goto(`${BASE_URL}/user/login`)

  // 填写登录信息
  await page.fill('input[placeholder*="请输入账户名"]', LOGIN.username)
  await page.fill('input[placeholder*="请输入密码"]', LOGIN.password)
  await page.click('button.login-button')

  // 等待登录响应
  await page.waitForTimeout(2000)

  // 处理租户选择弹窗（如果存在）
  const tenantModal = page.locator('.ant-modal:has-text("租户")')
  const isVisible = await tenantModal.isVisible({ timeout: 1000 }).catch(() => false)
  if (isVisible) {
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)
  }

  // 等待跳转到仪表盘
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

/**
 * 导航到DM列表页
 */
async function navigateToDmList(page) {
  // 点击菜单：IETM → 数据模块管理
  await page.click('a[href="#/ietm"]')
  await page.waitForTimeout(500)
  await page.click('a[href="#/ietm/ietmdatamodulemanagement/IetmDataModuleList"]')
  await page.waitForURL(/\/ietm\/ietmdatamodulemanagement\/IetmDataModuleList/, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

test.describe('工作流前置校验恢复验证', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToDmList(page)
  })

  /**
   * 测试1: 未启动工作流的DM签出应被拒绝
   */
  test('应拒绝未启动工作流的DM签出', async ({ page }) => {
    // 模拟返回一个未启动工作流的DM
    await page.route('**/ietm/dm-basic/list*', async route => {
      const response = await route.fetch()
      const json = await response.json()

      // 修改第一条数据：清空 workflowInstanceId
      if (json.success && json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = null
        json.result.records[0].workflowStep = null
        json.result.records[0].checkoutUser = null // 确保未签出
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      })
    })

    // 刷新列表
    await page.reload()
    await page.waitForTimeout(1500)

    // 选中第一条记录
    const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 点击签出按钮
    const checkOutButton = page.locator('button:has-text("签出")')
    await checkOutButton.click()

    // 验证错误提示
    const errorMessage = page.locator('.ant-message-warning:has-text("该DM还未启动流程，不能签出")')
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })

  /**
   * 测试2: 非"DM编写"节点的DM签出应被拒绝
   */
  test('应拒绝非"DM编写"节点的DM签出', async ({ page }) => {
    // 模拟返回一个在"审核"节点的DM
    await page.route('**/ietm/dm-basic/list*', async route => {
      const response = await route.fetch()
      const json = await response.json()

      // 修改第一条数据：设置为审核节点
      if (json.success && json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = 'mock-workflow-id-123'
        json.result.records[0].workflowStep = 'DM审核' // 非"DM编写"节点
        json.result.records[0].checkoutUser = null
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      })
    })

    // 刷新列表
    await page.reload()
    await page.waitForTimeout(1500)

    // 选中第一条记录
    const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 点击签出按钮
    const checkOutButton = page.locator('button:has-text("签出")')
    await checkOutButton.click()

    // 验证错误提示
    const errorMessage = page.locator('.ant-message-warning:has-text("当前流程节点不是\\"DM编写\\"，不能签出")')
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })

  /**
   * 测试3: 已启动工作流且在"DM编写"节点应允许签出（弹出确认框）
   */
  test('已启动工作流且在"DM编写"节点应允许签出', async ({ page }) => {
    // 模拟返回一个正常可签出的DM
    await page.route('**/ietm/dm-basic/list*', async route => {
      const response = await route.fetch()
      const json = await response.json()

      // 修改第一条数据：设置为可签出状态
      if (json.success && json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = 'mock-workflow-id-456'
        json.result.records[0].workflowStep = 'DM编写' // 正确的节点
        json.result.records[0].checkoutUser = null
        json.result.records[0].issueNo = '001'
        json.result.records[0].inWork = '00'
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      })
    })

    // 刷新列表
    await page.reload()
    await page.waitForTimeout(1500)

    // 选中第一条记录
    const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 点击签出按钮
    const checkOutButton = page.locator('button:has-text("签出")')
    await checkOutButton.click()

    // 验证应弹出签出确认框（而不是错误提示）
    const confirmModal = page.locator('.ant-modal:has-text("签出确认")')
    await expect(confirmModal).toBeVisible({ timeout: 3000 })

    // 验证确认框内容包含版本信息
    await expect(confirmModal).toContainText('当前版本：')
    await expect(confirmModal).toContainText('签出后版本：')

    // 取消操作（不真正执行签出）
    const cancelButton = confirmModal.locator('button:has-text("取消")')
    await cancelButton.click()
  })

  /**
   * 测试4: 最新状态校验 - 未启动工作流
   */
  test('应在查询最新状态后拒绝未启动工作流的DM', async ({ page }) => {
    // 列表页显示已启动，但最新状态未启动
    await page.route('**/ietm/dm-basic/list*', async route => {
      const response = await route.fetch()
      const json = await response.json()

      if (json.success && json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = 'mock-old-id'
        json.result.records[0].workflowStep = 'DM编写'
        json.result.records[0].checkoutUser = null
        json.result.records[0].id = 'test-dm-id-001'
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      })
    })

    // 查询最新状态时返回未启动工作流
    await page.route('**/ietm/dm-basic/queryById?id=test-dm-id-001*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            id: 'test-dm-id-001',
            workflowInstanceId: null, // 最新状态：未启动
            workflowStep: null,
            checkoutUser: null
          }
        })
      })
    })

    // 刷新列表
    await page.reload()
    await page.waitForTimeout(1500)

    // 选中第一条
    const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 点击签出
    const checkOutButton = page.locator('button:has-text("签出")')
    await checkOutButton.click()

    // 弹出确认框
    const confirmModal = page.locator('.ant-modal:has-text("签出确认")')
    await expect(confirmModal).toBeVisible({ timeout: 3000 })

    // 点击确定
    const okButton = confirmModal.locator('button:has-text("确定")').first()
    await okButton.click()

    // 验证错误提示（来自最新状态校验）
    const errorMessage = page.locator('.ant-message-error:has-text("该DM还未启动流程")')
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })

  /**
   * 测试5: 最新状态校验 - 非"DM编写"节点
   */
  test('应在查询最新状态后拒绝非"DM编写"节点的DM', async ({ page }) => {
    // 列表页显示"DM编写"，但最新状态已变为"DM审核"
    await page.route('**/ietm/dm-basic/list*', async route => {
      const response = await route.fetch()
      const json = await response.json()

      if (json.success && json.result && json.result.records && json.result.records.length > 0) {
        json.result.records[0].workflowInstanceId = 'mock-wf-id'
        json.result.records[0].workflowStep = 'DM编写'
        json.result.records[0].checkoutUser = null
        json.result.records[0].id = 'test-dm-id-002'
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      })
    })

    // 查询最新状态时返回已变为审核节点
    await page.route('**/ietm/dm-basic/queryById?id=test-dm-id-002*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            id: 'test-dm-id-002',
            workflowInstanceId: 'mock-wf-id',
            workflowStep: 'DM审核', // 最新状态：已进入审核
            checkoutUser: null
          }
        })
      })
    })

    // 刷新列表
    await page.reload()
    await page.waitForTimeout(1500)

    // 选中第一条
    const firstCheckbox = page.locator('.ant-table-tbody .ant-checkbox-input').first()
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 点击签出
    const checkOutButton = page.locator('button:has-text("签出")')
    await checkOutButton.click()

    // 弹出确认框
    const confirmModal = page.locator('.ant-modal:has-text("签出确认")')
    await expect(confirmModal).toBeVisible({ timeout: 3000 })

    // 点击确定
    const okButton = confirmModal.locator('button:has-text("确定")').first()
    await okButton.click()

    // 验证错误提示（来自最新状态校验）
    const errorMessage = page.locator('.ant-message-error:has-text("当前流程节点不是\\"DM编写\\"")')
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
  })
})
