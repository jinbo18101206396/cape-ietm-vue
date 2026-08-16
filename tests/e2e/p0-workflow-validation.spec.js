// P0修复全面E2E测试套件
// 文件位置: D:\workspace\IETM\cape-ietm-vue\tests\e2e\p0-workflow-validation.spec.js

import { test, expect } from '@playwright/test'

/**
 * P0修复验证测试套件
 * 目标：通过真实UI交互验证工作流校验逻辑
 * 范围：editProp + checkOut + 类似问题
 */

// 测试配置
const BASE_URL = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999'
const TEST_USER = {
  username: 'admin',
  password: '123456'
}

// 测试数据ID（需提前在数据库准备）
const TEST_DATA = {
  NOT_STARTED: 'test_p0_001',      // workflow_status = NULL
  ENDED: 'test_p0_002',             // workflow_status = '0'
  CANCELLED: 'test_p0_003',         // workflow_status = '2'
  WRONG_STEP: 'test_p0_004',        // workflow_step = '技术审核'
  CHECKED_BY_OTHER: 'test_p0_005',  // checkout_user = 'user_other'
  CHECKED_BY_ME: 'test_p0_006',     // checkout_user = 'admin'
  NORMAL: 'test_p0_007',            // workflow_status='1', step='DM编写', 未签出
  NULL_STEP: 'test_p0_008'          // workflow_step = NULL
}

test.describe('P0修复验证 - editProp工作流校验', () => {

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
    await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
    await page.click('button:has-text("登录")')

    // 等待跳转到主页
    await page.waitForURL('**/dashboard/**', { timeout: 5000 })

    // 导航到数据模块管理页面
    await page.goto(`${BASE_URL}/ietm/datamodule/list`)
    await page.waitForLoadState('networkidle')

    // 选择构型树节点（等待树加载）
    await page.waitForSelector('.config-tree', { timeout: 5000 })
    // 点击第一个项目节点
    await page.click('.ant-tree-node-content-wrapper')
    await page.waitForLoadState('networkidle')
  })

  test('TC-P0-001: 未启动流程 - 应拒绝编辑', async ({ page }) => {
    // 1. 查找并选中测试DM
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.NOT_STARTED}"]`)
    await expect(row).toBeVisible({ timeout: 5000 })

    // 2. 勾选checkbox
    await row.locator('.ant-checkbox-input').check()

    // 3. 验证前端按钮状态
    const editBtn = page.locator('button:has-text("编辑")')
    // 前端校验应该禁用按钮（1195行校验）
    await expect(editBtn).toBeDisabled()

    // 4. 绕过前端直接调用后端API（模拟恶意绕过）
    const response = await page.request.put(`${API_BASE}/ietm/datamodule/editProp/${TEST_DATA.NOT_STARTED}`, {
      data: {
        techName: '尝试修改技术名称',
        infoName: '尝试修改信息名称'
      }
    })

    const result = await response.json()

    // 5. 验证后端拦截
    expect(result.success).toBe(false)
    expect(result.message).toContain('还没有启动流程')

    // 6. 验证数据未被修改
    const checkResponse = await page.request.get(`${API_BASE}/ietm/datamodule/queryById?id=${TEST_DATA.NOT_STARTED}`)
    const dmData = await checkResponse.json()
    expect(dmData.result.techName).not.toBe('尝试修改技术名称')
  })

  test('TC-P0-002: 流程已结束 - 应拒绝编辑', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.ENDED}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    // 前端应禁用编辑按钮
    const editBtn = page.locator('button:has-text("编辑")')
    await expect(editBtn).toBeDisabled()

    // 后端API测试
    const response = await page.request.put(`${API_BASE}/ietm/datamodule/editProp/${TEST_DATA.ENDED}`, {
      data: { techName: '测试', infoName: '测试' }
    })
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toContain('还没有启动流程')
  })

  test('TC-P0-003: 流程已撤销 - 应拒绝编辑', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.CANCELLED}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    const editBtn = page.locator('button:has-text("编辑")')
    await expect(editBtn).toBeDisabled()

    const response = await page.request.put(`${API_BASE}/ietm/datamodule/editProp/${TEST_DATA.CANCELLED}`, {
      data: { techName: '测试', infoName: '测试' }
    })
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toContain('流程已撤销')
  })

  test('TC-P0-004: 非DM编写节点 - 应拒绝编辑', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.WRONG_STEP}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    const editBtn = page.locator('button:has-text("编辑")')
    await expect(editBtn).toBeDisabled()

    const response = await page.request.put(`${API_BASE}/ietm/datamodule/editProp/${TEST_DATA.WRONG_STEP}`, {
      data: { techName: '测试', infoName: '测试' }
    })
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toContain('流程状态不是DM编写状态')
    expect(result.message).toContain('技术审核')  // 应包含当前状态
  })

  test('TC-P0-005: 被他人签出 - 应拒绝编辑', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.CHECKED_BY_OTHER}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    const editBtn = page.locator('button:has-text("编辑")')
    await expect(editBtn).toBeDisabled()

    const response = await page.request.put(`${API_BASE}/ietm/datamodule/editProp/${TEST_DATA.CHECKED_BY_OTHER}`, {
      data: { techName: '测试', infoName: '测试' }
    })
    const result = await response.json()

    expect(result.success).toBe(false)
    expect(result.message).toContain('已由【user_other】签出')
  })

  test('TC-P0-006: 正常编辑 - 已签出且本人', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.CHECKED_BY_ME}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    // 前端应启用编辑按钮
    const editBtn = page.locator('button:has-text("编辑")')
    await expect(editBtn).toBeEnabled()

    // 点击编辑按钮
    await editBtn.click()

    // 等待弹窗出现
    await page.waitForSelector('.ant-modal:has-text("编辑DM属性")', { timeout: 3000 })

    // 修改技术名称
    const techNameInput = page.locator('input[placeholder*="技术名称"]')
    await techNameInput.clear()
    await techNameInput.fill('测试技术名称V2')

    // 修改信息名称
    const infoNameInput = page.locator('input[placeholder*="信息名称"]')
    await infoNameInput.clear()
    await infoNameInput.fill('测试信息名称V2')

    // 点击确定
    await page.click('.ant-modal-footer button.ant-btn-primary')

    // 等待成功提示
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('.ant-message-success')).toContainText('编辑成功')

    // 验证数据已更新
    const checkResponse = await page.request.get(`${API_BASE}/ietm/datamodule/queryById?id=${TEST_DATA.CHECKED_BY_ME}`)
    const dmData = await checkResponse.json()
    expect(dmData.result.techName).toBe('测试技术名称V2')
    expect(dmData.result.infoName).toBe('测试信息名称V2')
  })

  test('TC-P0-007: 正常编辑 - 未签出自动签出', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.NORMAL}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    const editBtn = page.locator('button:has-text("编辑")')
    await expect(editBtn).toBeEnabled()

    await editBtn.click()
    await page.waitForSelector('.ant-modal:has-text("编辑DM属性")')

    await page.locator('input[placeholder*="技术名称"]').fill('自动签出测试')
    await page.click('.ant-modal-footer button.ant-btn-primary')

    await expect(page.locator('.ant-message-success')).toBeVisible()

    // 验证已自动签出
    const checkResponse = await page.request.get(`${API_BASE}/ietm/datamodule/queryById?id=${TEST_DATA.NORMAL}`)
    const dmData = await checkResponse.json()
    expect(dmData.result.checkoutUser).toBe(TEST_USER.username)
    expect(dmData.result.techName).toBe('自动签出测试')
  })

  test('TC-P0-008: 边界测试 - workflowStep为NULL', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.NULL_STEP}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    // 当workflow_step=NULL时，应该允许编辑（代码2117行逻辑）
    const editBtn = page.locator('button:has-text("编辑")')
    // 注意：前端1206行也是 if (record.workflowStep && ...)，NULL时跳过校验
    await expect(editBtn).toBeEnabled()

    // 后端API应允许
    const response = await page.request.put(`${API_BASE}/ietm/datamodule/editProp/${TEST_DATA.NULL_STEP}`, {
      data: { techName: 'NULL节点测试', infoName: '测试' }
    })
    const result = await response.json()

    expect(result.success).toBe(true)
  })
})

test.describe('类似问题验证 - checkOut工作流校验', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
    await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**')
    await page.goto(`${BASE_URL}/ietm/datamodule/list`)
    await page.waitForLoadState('networkidle')
    await page.click('.ant-tree-node-content-wrapper')
    await page.waitForLoadState('networkidle')
  })

  test('TC-SIMILAR-001: checkOut未启动流程 - 应拒绝', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.NOT_STARTED}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    // 前端应禁用签出按钮（或点击后提示错误）
    const checkOutBtn = page.locator('button:has-text("签出")')

    // 前端IetmDataModuleList.vue:847有校验，应该禁用或警告
    if (await checkOutBtn.isEnabled()) {
      await checkOutBtn.click()
      // 应显示警告消息
      await expect(page.locator('.ant-message-warning')).toBeVisible()
      await expect(page.locator('.ant-message-warning')).toContainText('未启动流程')
    } else {
      await expect(checkOutBtn).toBeDisabled()
    }

    // 绕过前端直接调用后端API
    const response = await page.request.post(`${API_BASE}/ietm/datamodule/checkOut`, {
      data: { id: TEST_DATA.NOT_STARTED }
    })
    const result = await response.json()

    // 【修复后】后端应拦截
    expect(result.success).toBe(false)
    expect(result.message).toContain('还没有启动流程')
  })

  test('TC-SIMILAR-002: checkOut非DM编写节点 - 应拒绝', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.WRONG_STEP}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    const checkOutBtn = page.locator('button:has-text("签出")')

    if (await checkOutBtn.isEnabled()) {
      await checkOutBtn.click()
      await expect(page.locator('.ant-message-warning')).toBeVisible()
      await expect(page.locator('.ant-message-warning')).toContainText('流程状态不是DM编写')
    }

    // 后端API测试
    const response = await page.request.post(`${API_BASE}/ietm/datamodule/checkOut`, {
      data: { id: TEST_DATA.WRONG_STEP }
    })
    const result = await response.json()

    // 【修复后】应拦截
    expect(result.success).toBe(false)
    expect(result.message).toContain('流程状态不是DM编写')
  })

  test('TC-SIMILAR-003: checkOut正常 - 应成功', async ({ page }) => {
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.NORMAL}"]`)
    await expect(row).toBeVisible()
    await row.locator('.ant-checkbox-input').check()

    const checkOutBtn = page.locator('button:has-text("签出")')
    await expect(checkOutBtn).toBeEnabled()

    await checkOutBtn.click()

    // 等待成功提示
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 3000 })

    // 验证签出状态
    await page.reload()
    await page.waitForLoadState('networkidle')
    const updatedRow = await page.locator(`tr[data-row-key="${TEST_DATA.NORMAL}"]`)

    // 应显示签出图标或标记
    await expect(updatedRow.locator('.checkout-indicator')).toBeVisible()
  })
})

test.describe('前后端一致性验证', () => {

  test('TC-P0-009: 前后端校验对齐验证', async ({ page, context }) => {
    // 测试策略：
    // 1. 正常情况：前端先拦截，不发请求
    // 2. 绕过前端：后端独立拦截成功

    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
    await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**')
    await page.goto(`${BASE_URL}/ietm/datamodule/list`)
    await page.waitForLoadState('networkidle')
    await page.click('.ant-tree-node-content-wrapper')
    await page.waitForLoadState('networkidle')

    // 监听网络请求
    const requests = []
    page.on('request', request => {
      if (request.url().includes('/editProp')) {
        requests.push(request)
      }
    })

    // 选中未启动流程的DM
    const row = await page.locator(`tr[data-row-key="${TEST_DATA.NOT_STARTED}"]`)
    await row.locator('.ant-checkbox-input').check()

    // 点击编辑（前端应拦截）
    const editBtn = page.locator('button:has-text("编辑")')

    // 前端应禁用按钮
    const isDisabled = await editBtn.isDisabled()
    expect(isDisabled).toBe(true)

    // 验证没有发送API请求（前端提前拦截）
    expect(requests.length).toBe(0)

    // 模拟绕过前端（直接API调用）
    const response = await page.request.put(`${API_BASE}/ietm/datamodule/editProp/${TEST_DATA.NOT_STARTED}`, {
      data: { techName: '绕过测试', infoName: '绕过测试' }
    })
    const result = await response.json()

    // 后端作为最终防线，应拦截
    expect(result.success).toBe(false)
    expect(result.message).toContain('还没有启动流程')
  })
})

test.describe('并发场景测试', () => {

  test('TC-P0-010: 同时编辑冲突', async ({ browser }) => {
    // 创建两个浏览器上下文（模拟两个用户）
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // 两个用户都登录
    for (const page of [page1, page2]) {
      await page.goto(`${BASE_URL}/user/login`)
      await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
      await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
      await page.click('button:has-text("登录")')
      await page.waitForURL('**/dashboard/**')
      await page.goto(`${BASE_URL}/ietm/datamodule/list`)
      await page.waitForLoadState('networkidle')
      await page.click('.ant-tree-node-content-wrapper')
      await page.waitForLoadState('networkidle')
    }

    // User1 先编辑（自动签出）
    await page1.locator(`tr[data-row-key="${TEST_DATA.NORMAL}"] .ant-checkbox-input`).check()
    await page1.click('button:has-text("编辑")')
    await page1.waitForSelector('.ant-modal')
    await page1.fill('input[placeholder*="技术名称"]', 'User1修改')
    await page1.click('.ant-modal-footer button.ant-btn-primary')
    await expect(page1.locator('.ant-message-success')).toBeVisible()

    // User2 尝试编辑同一条（应被拒绝）
    await page2.reload()
    await page2.waitForLoadState('networkidle')
    await page2.locator(`tr[data-row-key="${TEST_DATA.NORMAL}"] .ant-checkbox-input`).check()

    // 编辑按钮应禁用（已被User1签出）
    const editBtn = page2.locator('button:has-text("编辑")')
    await expect(editBtn).toBeDisabled()

    // 清理
    await context1.close()
    await context2.close()
  })
})
