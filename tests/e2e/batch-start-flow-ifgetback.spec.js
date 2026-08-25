/**
 * 批量启动流程 - 可跳转节点 E2E 测试
 * 对标：旧系统 IncludeInstanceAdd.jsp 真实UI行为
 *
 * 测试环境要求：
 * 1. 前端: http://localhost:3000
 * 2. 后端: http://localhost:9999
 * 3. 数据库: 至少有2个未启动流程的DM
 * 4. 用户: 已登录状态
 */

const { test, expect } = require('@playwright/test')

test.describe('批量启动流程 - 可跳转节点修复验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ietm/**', { timeout: 10000 })

    // 导航到DM管理页面
    await page.goto('http://localhost:3000/ietm/dm-manage')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
  })

  test('E2E-1: 打开批量启动流程弹窗', async ({ page }) => {
    // 勾选2个DM
    const checkboxes = await page.locator('.ant-table-tbody .ant-checkbox-input')
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()

    // 点击"批量启动流程"按钮
    await page.click('button:has-text("批量启动流程"), a:has-text("批量启动流程")')

    // 验证弹窗打开
    await expect(page.locator('.ant-modal-title:has-text("批量启动流程")')).toBeVisible()

    // 选择模板
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')

    // 验证节点配置表格出现
    await expect(page.locator('#nodeConfigTable, .node-config-table')).toBeVisible()
  })

  test('E2E-2: 验证添加第一个节点时的可跳转节点选项', async ({ page }) => {
    // 打开批量启动流程（复用前置步骤）
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程"), a:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')

    // 选择模板并确定
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')

    // 点击"增加节点"
    await page.click('button:has-text("增加节点"), a:has-text("增加节点")')
    await page.waitForTimeout(500)

    // 找到第一个节点行，打开"可跳转节点"下拉
    const firstNodeRow = page.locator('.ant-table-tbody tr').first()
    await firstNodeRow.locator('.ant-select-selector').last().click()

    // 验证选项：应该只有《不限制》、《不可跳转》、《创建》
    const dropdown = page.locator('.ant-select-dropdown:visible')
    const options = dropdown.locator('.ant-select-item-option-content')

    await expect(options).toHaveCount(3)
    await expect(options.nth(0)).toHaveText('《不限制》')
    await expect(options.nth(1)).toHaveText('《不可跳转》')
    await expect(options.nth(2)).toHaveText('《创建》')
  })

  test('E2E-3: 验证添加第二个节点后动态更新选项', async ({ page }) => {
    // 打开批量启动流程并添加2个节点
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')

    // 添加第一个节点并填写节点名称
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)
    const firstRow = page.locator('.ant-table-tbody tr').nth(0)
    await firstRow.locator('input[placeholder*="节点名称"]').fill('DM审核')

    // 添加第二个节点
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)

    // 打开第二个节点的"可跳转节点"下拉
    const secondRow = page.locator('.ant-table-tbody tr').nth(1)
    await secondRow.locator('.ant-select-selector').last().click()

    // 验证选项：应包含《不限制》、《不可跳转》、《创建》、"DM审核"
    const dropdown = page.locator('.ant-select-dropdown:visible')
    const options = dropdown.locator('.ant-select-item-option-content')

    await expect(options).toHaveCount(4)
    await expect(options.nth(0)).toHaveText('《不限制》')
    await expect(options.nth(1)).toHaveText('《不可跳转》')
    await expect(options.nth(2)).toHaveText('《创建》')
    await expect(options.nth(3)).toHaveText('DM审核')
  })

  test('E2E-4: 验证《不限制》互斥性', async ({ page }) => {
    // 打开批量启动流程并添加节点
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)

    // 打开可跳转节点下拉
    const row = page.locator('.ant-table-tbody tr').first()
    const selector = row.locator('.ant-select-selector').last()
    await selector.click()

    // 先选择《创建》
    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("《创建》")')
    await page.waitForTimeout(300)

    // 再次打开下拉，选择《不限制》
    await selector.click()
    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("《不限制》")')

    // 验证警告消息
    await expect(page.locator('.ant-message-notice:has-text("选择《不限制》时，不能再选择其他节点")')).toBeVisible({ timeout: 2000 })

    // 验证最终值只有《不限制》
    await expect(selector).toContainText('《不限制》')
    await expect(selector).not.toContainText('《创建》')
  })

  test('E2E-5: 验证《不可跳转》互斥性', async ({ page }) => {
    // 打开批量启动流程并添加2个节点
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)
    const firstRow = page.locator('.ant-table-tbody tr').nth(0)
    await firstRow.locator('input[placeholder*="节点名称"]').fill('DM审核')
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)

    // 在第二个节点打开可跳转节点下拉
    const secondRow = page.locator('.ant-table-tbody tr').nth(1)
    const selector = secondRow.locator('.ant-select-selector').last()
    await selector.click()

    // 先选择"DM审核"
    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("DM审核")')
    await page.waitForTimeout(300)

    // 再选择《不可跳转》
    await selector.click()
    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("《不可跳转》")')

    // 验证警告消息
    await expect(page.locator('.ant-message-notice:has-text("选择《不可跳转》时，不能再选择其他节点")')).toBeVisible({ timeout: 2000 })

    // 验证最终值只有《不可跳转》
    await expect(selector).toContainText('《不可跳转》')
    await expect(selector).not.toContainText('DM审核')
  })

  test('E2E-6: 验证多选普通节点', async ({ page }) => {
    // 打开批量启动流程并添加3个节点
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')

    // 添加3个节点
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("增加节点")')
      await page.waitForTimeout(300)
      const row = page.locator('.ant-table-tbody tr').nth(i)
      await row.locator('input[placeholder*="节点名称"]').fill(`节点${i + 1}`)
    }

    // 在第三个节点选择前两个节点
    const thirdRow = page.locator('.ant-table-tbody tr').nth(2)
    const selector = thirdRow.locator('.ant-select-selector').last()
    await selector.click()

    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("节点1")')
    await page.waitForTimeout(200)
    await selector.click()
    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("节点2")')

    // 验证选中了两个节点
    await expect(selector).toContainText('节点1')
    await expect(selector).toContainText('节点2')
  })

  test('E2E-7: 验证提交数据格式正确', async ({ page }) => {
    // 监听网络请求
    let requestBody = null
    page.on('request', request => {
      if (request.url().includes('/ietm/workflow/batchStartFlow')) {
        requestBody = request.postDataJSON()
      }
    })

    // 打开批量启动流程并配置节点
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')

    // 添加节点并配置可跳转
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)
    const row = page.locator('.ant-table-tbody tr').first()

    // 配置节点信息
    await row.locator('input[placeholder*="节点名称"]').fill('DM审核')
    await row.locator('.ant-select-selector').first().click() // 处理人
    await page.click('.ant-select-dropdown:visible .ant-select-item:first-child')

    // 配置可跳转节点为《不限制》
    await row.locator('.ant-select-selector').last().click()
    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("《不限制》")')

    // 提交
    await page.click('.ant-modal-footer button:has-text("确定")')

    // 等待请求发送
    await page.waitForTimeout(1000)

    // 验证请求数据格式
    expect(requestBody).not.toBeNull()
    expect(requestBody.nodes).toHaveLength(1)
    expect(requestBody.nodes[0].ifgetback).toBe('') // __UNLIMITED__ → ''
  })

  test('E2E-8: 验证《不可跳转》提交为-1', async ({ page }) => {
    let requestBody = null
    page.on('request', request => {
      if (request.url().includes('/ietm/workflow/batchStartFlow')) {
        requestBody = request.postDataJSON()
      }
    })

    // 打开批量启动流程并添加节点
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)

    const row = page.locator('.ant-table-tbody tr').first()
    await row.locator('input[placeholder*="节点名称"]').fill('DM审核')
    await row.locator('.ant-select-selector').first().click()
    await page.click('.ant-select-dropdown:visible .ant-select-item:first-child')

    // 选择《不可跳转》
    await row.locator('.ant-select-selector').last().click()
    await page.click('.ant-select-dropdown:visible .ant-select-item-option-content:has-text("《不可跳转》")')

    // 提交
    await page.click('.ant-modal-footer button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证提交数据
    expect(requestBody).not.toBeNull()
    expect(requestBody.nodes[0].ifgetback).toBe('-1') // __NO_JUMP__ → '-1'
  })

  test('E2E-9: 验证"处理方式"文本已统一', async ({ page }) => {
    // 打开批量启动流程
    await page.locator('.ant-table-tbody .ant-checkbox-input').nth(0).check()
    await page.click('button:has-text("批量启动流程")')
    await page.waitForSelector('.ant-modal-title:has-text("批量启动流程")')
    await page.click('.ant-select:has-text("选择模板")')
    await page.click('.ant-select-dropdown .ant-select-item:first-child')
    await page.click('button:has-text("确定模板")')
    await page.click('button:has-text("增加节点")')
    await page.waitForTimeout(500)

    // 打开"处理方式"下拉
    const row = page.locator('.ant-table-tbody tr').first()
    const nodetypeSelector = row.locator('.ant-select').nth(1) // 第二个select是处理方式
    await nodetypeSelector.click()

    // 验证选项文本
    const dropdown = page.locator('.ant-select-dropdown:visible')
    const options = dropdown.locator('.ant-select-item-option-content')

    await expect(options.nth(0)).toHaveText('创建节点')
    await expect(options.nth(1)).toHaveText('审核节点')
    await expect(options.nth(2)).toHaveText('签批节点')

    // 验证不再是旧文本
    await expect(options.nth(0)).not.toHaveText('创建/所有人必完成')
    await expect(options.nth(1)).not.toHaveText('审核/只1人完成')
  })
})
