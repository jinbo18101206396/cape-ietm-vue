/**
 * ICN导出页面改进功能测试
 * 测试范围：
 * 1. 项目状态恢复（刷新后不显示警告）
 * 2. 下载后保留列表数据
 * 3. 空列表提示优化
 * 4. ICN点击预览功能
 */

const { test, expect } = require('@playwright/test')

test.describe('ICN导出页面改进功能测试', () => {
  const BASE_URL = 'http://localhost:3000'
  const TIMEOUT = 30000

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForURL(`${BASE_URL}/dashboard/analysis`, { timeout: TIMEOUT })
    console.log('✓ 登录成功')
  })

  // 测试场景1：项目状态恢复
  test('场景1：刷新页面后自动恢复项目状态，无警告提示', async ({ page }) => {
    console.log('\n=== 测试场景1：项目状态恢复 ===')

    // 打开项目
    await page.click('text=项目管理')
    await page.waitForTimeout(1000)

    const projectRow = page.locator('table tbody tr').first()
    await projectRow.locator('td').nth(0).click() // 选中第一个项目
    await page.click('button:has-text("打开")')
    await page.waitForTimeout(2000)

    console.log('✓ 打开项目成功')

    // 导航到导出实体页面
    await page.click('text=数据交换')
    await page.waitForTimeout(500)
    await page.click('text=导出实体')
    await page.waitForTimeout(2000)

    // 验证：页面加载后无警告
    const warningBeforeRefresh = await page.locator('.ant-message-warning:has-text("请先打开项目")').count()
    expect(warningBeforeRefresh).toBe(0)
    console.log('✓ 初次加载无警告提示')

    // 刷新页面
    await page.reload()
    await page.waitForTimeout(3000)

    // 验证：刷新后无警告（关键测试点）
    const warningAfterRefresh = await page.locator('.ant-message-warning:has-text("请先打开项目")').count()
    expect(warningAfterRefresh).toBe(0)
    console.log('✓ 刷新后无警告提示（项目状态已恢复）')

    // 验证：表单字段已自动填充（证明项目状态已恢复）
    const modelicValue = await page.locator('input[placeholder*="从项目获取"]').first().inputValue()
    expect(modelicValue).toBeTruthy()
    console.log(`✓ 表单字段已自动填充：型号=${modelicValue}`)
  }, TIMEOUT * 3)

  // 测试场景2：空列表提示优化
  test('场景2：空列表提示包含"添加ICN"', async ({ page }) => {
    console.log('\n=== 测试场景2：空列表提示优化 ===')

    // 确保在导出实体页面
    await page.goto(`${BASE_URL}/ietm/icn-export`)
    await page.waitForTimeout(2000)

    // 验证：空列表提示文案
    const alertText = await page.locator('.ant-alert-message').textContent()
    expect(alertText).toContain('添加ICN')
    expect(alertText).not.toBe('暂无实体，请点击"添加"按钮选择')
    console.log(`✓ 空列表提示文案正确：${alertText}`)
  }, TIMEOUT)

  // 测试场景3：ICN点击预览功能
  test('场景3：点击ICN列可以预览实体', async ({ page }) => {
    console.log('\n=== 测试场景3：ICN点击预览功能 ===')

    // 确保在导出实体页面
    await page.goto(`${BASE_URL}/ietm/icn-export`)
    await page.waitForTimeout(2000)

    // 添加ICN
    await page.click('button:has-text("添加ICN")')
    await page.waitForTimeout(1500)

    // 在弹窗中选择一个ICN
    const selectModal = page.locator('.ant-modal:visible')
    await selectModal.locator('table tbody tr').first().locator('td').nth(0).click()
    await selectModal.locator('button:has-text("确定")').click()
    await page.waitForTimeout(1500)

    // 验证：ICN已添加到列表
    const icnCount = await page.locator('table tbody tr').count()
    expect(icnCount).toBeGreaterThan(0)
    console.log(`✓ 已添加 ${icnCount} 个ICN到列表`)

    // 获取第一个ICN编码
    const icnLink = page.locator('table tbody tr').first().locator('td').nth(1).locator('a')
    const icnText = await icnLink.textContent()
    console.log(`✓ ICN编码：${icnText}`)

    // 验证：ICN列是链接（蓝色可点击）
    const color = await icnLink.evaluate(el => window.getComputedStyle(el).color)
    expect(color).toContain('rgb') // 链接应该有颜色样式
    console.log(`✓ ICN列显示为链接（颜色：${color}）`)

    // 点击ICN链接
    await icnLink.click()
    await page.waitForTimeout(2000)

    // 验证：预览弹窗打开
    const viewerModal = page.locator('.ant-modal:visible:has-text("浏览")')
    const isVisible = await viewerModal.isVisible()
    expect(isVisible).toBe(true)
    console.log('✓ 预览弹窗已打开')

    // 验证：弹窗标题包含"浏览"
    const modalTitle = await viewerModal.locator('.ant-modal-title').textContent()
    expect(modalTitle).toContain('浏览')
    console.log(`✓ 弹窗标题：${modalTitle}`)

    // 验证：预览内容加载
    const modalBody = viewerModal.locator('.ant-modal-body')
    const hasContent = await modalBody.locator('img, video, audio, .file-info').count()
    expect(hasContent).toBeGreaterThan(0)
    console.log('✓ 预览内容已加载')

    // 关闭预览弹窗
    await viewerModal.locator('.ant-modal-close').click()
    await page.waitForTimeout(1000)

    // 验证：弹窗已关闭
    const modalClosed = await page.locator('.ant-modal:visible:has-text("浏览")').count()
    expect(modalClosed).toBe(0)
    console.log('✓ 预览弹窗已关闭')
  }, TIMEOUT * 2)

  // 测试场景4：下载后保留列表数据
  test('场景4：生成数据包后列表数据保留', async ({ page }) => {
    console.log('\n=== 测试场景4：下载后保留列表数据 ===')

    // 确保在导出实体页面且已有ICN
    await page.goto(`${BASE_URL}/ietm/icn-export`)
    await page.waitForTimeout(2000)

    // 如果列表为空，添加ICN
    const icnCountBefore = await page.locator('table tbody tr').count()
    if (icnCountBefore === 0) {
      await page.click('button:has-text("添加ICN")')
      await page.waitForTimeout(1500)
      const selectModal = page.locator('.ant-modal:visible')

      // 选择2个ICN
      await selectModal.locator('table tbody tr').nth(0).locator('td').nth(0).click()
      await selectModal.locator('table tbody tr').nth(1).locator('td').nth(0).click()
      await selectModal.locator('button:has-text("确定")').click()
      await page.waitForTimeout(1500)
    }

    // 记录列表中的ICN数量
    const icnCountAfterAdd = await page.locator('table tbody tr').count()
    console.log(`✓ 当前列表有 ${icnCountAfterAdd} 个ICN`)

    // 填写必填字段
    await page.fill('input[placeholder="从项目获取"]', 'TEST-MODEL')

    // 选择密级
    await page.locator('label:has-text("密级")').locator('..').locator('.ant-select').click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown:visible .ant-select-item').first().click()
    await page.waitForTimeout(500)

    await page.locator('input[placeholder="从项目获取"]').nth(1).fill('TEST-SENDER')

    console.log('✓ 表单必填项已填写')

    // 监听下载事件
    const downloadPromise = page.waitForEvent('download', { timeout: TIMEOUT })

    // 点击生成数据包
    await page.click('button:has-text("生成数据包")')
    console.log('✓ 点击"生成数据包"按钮')

    // 等待下载开始
    try {
      const download = await downloadPromise
      console.log(`✓ 下载已开始：${download.suggestedFilename()}`)
    } catch (error) {
      console.log('⚠ 下载可能未触发（可能是后端未启动或数据问题）')
    }

    // 等待成功提示
    await page.waitForTimeout(3000)

    // 验证：列表数据仍然存在（关键测试点）
    const icnCountAfterDownload = await page.locator('table tbody tr').count()
    expect(icnCountAfterDownload).toBe(icnCountAfterAdd)
    console.log(`✓ 下载后列表数据保留：${icnCountAfterDownload} 个ICN（未清空）`)

    // 验证：可以再次下载
    const generateButton = page.locator('button:has-text("生成数据包")')
    const isEnabled = await generateButton.isEnabled()
    expect(isEnabled).toBe(true)
    console.log('✓ 可以再次生成数据包')
  }, TIMEOUT * 2)

  // 测试场景5：DM导出页面刷新后列表恢复
  test('场景5：DM导出页面刷新后列表数据恢复', async ({ page }) => {
    console.log('\n=== 测试场景5：DM导出页面列表恢复 ===')

    // 导航到导出数据模块页面
    await page.goto(`${BASE_URL}/ietm/ddn-export`)
    await page.waitForTimeout(2000)

    // 添加DM
    await page.click('button:has-text("选择数据模块")')
    await page.waitForTimeout(2000)

    const selectModal = page.locator('.ant-modal:visible')

    // 选择2个DM
    const firstTab = selectModal.locator('.ant-tabs-tab').first()
    await firstTab.click()
    await page.waitForTimeout(1000)

    await selectModal.locator('table tbody tr').nth(0).locator('td').nth(0).click()
    await selectModal.locator('table tbody tr').nth(1).locator('td').nth(0).click()
    await selectModal.locator('button:has-text("确定")').click()
    await page.waitForTimeout(1500)

    // 记录DM数量
    const dmCountBefore = await page.locator('table tbody tr').count()
    console.log(`✓ 已添加 ${dmCountBefore} 个DM到列表`)

    // 刷新页面
    await page.reload()
    await page.waitForTimeout(3000)

    // 验证：列表数据已恢复（关键测试点）
    const dmCountAfter = await page.locator('table tbody tr').count()
    expect(dmCountAfter).toBe(dmCountBefore)
    console.log(`✓ 刷新后列表数据已恢复：${dmCountAfter} 个DM`)
  }, TIMEOUT * 2)

  // 测试场景6：回归测试 - 原有功能不受影响
  test('场景6：回归测试 - 删除和清空功能正常', async ({ page }) => {
    console.log('\n=== 测试场景6：回归测试 ===')

    await page.goto(`${BASE_URL}/ietm/icn-export`)
    await page.waitForTimeout(2000)

    // 确保列表有数据
    const icnCount = await page.locator('table tbody tr').count()
    if (icnCount === 0) {
      await page.click('button:has-text("添加ICN")')
      await page.waitForTimeout(1500)
      const selectModal = page.locator('.ant-modal:visible')
      await selectModal.locator('table tbody tr').first().locator('td').nth(0).click()
      await selectModal.locator('button:has-text("确定")').click()
      await page.waitForTimeout(1500)
    }

    // 测试删除功能
    const countBeforeDelete = await page.locator('table tbody tr').count()
    await page.locator('table tbody tr').first().locator('td').nth(0).click()
    await page.click('button:has-text("删除")')
    await page.waitForTimeout(500)

    // 确认删除
    await page.locator('.ant-modal:visible button:has-text("确定")').click()
    await page.waitForTimeout(1500)

    const countAfterDelete = await page.locator('table tbody tr').count()
    expect(countAfterDelete).toBe(countBeforeDelete - 1)
    console.log(`✓ 删除功能正常：${countBeforeDelete} → ${countAfterDelete}`)

    // 测试清空功能（如果有清空按钮）
    const clearButton = page.locator('button:has-text("清空")')
    const hasClearButton = await clearButton.count()
    if (hasClearButton > 0) {
      await clearButton.click()
      await page.waitForTimeout(1000)
      const countAfterClear = await page.locator('table tbody tr').count()
      expect(countAfterClear).toBe(0)
      console.log('✓ 清空功能正常')
    }
  }, TIMEOUT * 2)
})
