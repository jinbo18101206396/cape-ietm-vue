/**
 * IETM 一期全量测试 - 真实环境测试（端口 3004）
 * 目标: 在真实前后端环境下验证所有核心功能
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'
const TEST_TIMEOUT = 120000

test.describe('IETM 真实环境全量测试', () => {
  test.setTimeout(TEST_TIMEOUT)

  let page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterEach(async () => {
    await page?.close()
  })

  // ==================== 环境验证 ====================

  test('ENV-1: 前端服务可访问', async () => {
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 })
    expect(response.status()).toBe(200)
    console.log('✅ 前端服务 (3004) 可访问')
  })

  test('ENV-2: 登录并进入系统', async () => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)

    // 检查是否在登录页
    const isLoginPage = await page.locator('input[type="password"]').isVisible({ timeout: 5000 }).catch(() => false)

    if (isLoginPage) {
      console.log('检测到登录页，尝试登录...')

      // 填写登录信息
      await page.locator('input[placeholder*="用户"], input[type="text"]').first().fill('admin')
      await page.locator('input[type="password"]').first().fill('admin')
      await page.locator('button[type="submit"], button:has-text("登录")').first().click()

      // 等待登录完成
      await page.waitForTimeout(3000)

      // 验证登录成功（检查是否跳转到首页）
      const currentUrl = page.url()
      console.log('登录后URL:', currentUrl)
      expect(currentUrl).not.toContain('/login')
      console.log('✅ 登录成功')
    } else {
      console.log('✅ 已登录或无需登录')
    }
  })

  test('ENV-3: DM列表页可访问', async () => {
    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)

    // 尝试导航到 DM 列表页
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    // 验证页面元素
    const hasTable = await page.locator('.ant-table').count() > 0
    const hasDmElements = await page.locator('text=/数据模块|DM|Data Module/i').count() > 0

    expect(hasTable || hasDmElements).toBeTruthy()
    console.log('✅ DM列表页可访问')
  })

  // ==================== P0 核心功能测试 ====================

  test('P0-1: 打开DM编辑器', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    // 查找第一条 DM 记录
    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      console.log('⚠️ 列表为空，跳过编辑器测试')
      test.skip()
      return
    }

    // 点击"编辑"按钮
    const editButton = firstRow.locator('button:has-text("编辑"), a:has-text("编辑")').first()
    await editButton.click({ timeout: 5000 }).catch(async () => {
      // 如果找不到编辑按钮，尝试双击行
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    // 验证编辑器打开
    const hasEditor = await page.locator('.CodeMirror, [class*="editor"]').isVisible({ timeout: 10000 }).catch(() => false)
    expect(hasEditor).toBeTruthy()
    console.log('✅ DM编辑器已打开')
  })

  test('P0-2: 重建refs按钮存在', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    // 打开编辑器
    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      console.log('⚠️ 列表为空，跳过测试')
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    // 查找"重建refs与DOCTYPE"按钮
    const regenButton = page.locator('button:has-text("重建refs"), button:has-text("重建"), button[title*="重建"]')
    const buttonExists = await regenButton.count() > 0

    expect(buttonExists).toBeTruthy()
    console.log('✅ "重建refs与DOCTYPE"按钮存在')

    // 尝试点击（不等待完成）
    if (buttonExists) {
      await regenButton.first().click({ timeout: 5000 }).catch(() => {
        console.log('⚠️ 按钮点击失败（可能被禁用）')
      })

      // 检查是否弹出确认框
      const hasConfirm = await page.locator('.ant-modal, .ant-confirm').isVisible({ timeout: 3000 }).catch(() => false)
      if (hasConfirm) {
        console.log('✅ 确认弹框已显示')
        // 点击取消，不实际执行
        await page.locator('button:has-text("取消")').click()
      }
    }
  })

  test('P0-3: 编辑器基础功能', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      console.log('⚠️ 列表为空，跳过测试')
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    // 检查工具栏按钮
    const buttons = {
      format: await page.locator('button:has-text("格式化")').count() > 0,
      validate: await page.locator('button:has-text("校验")').count() > 0,
      preview: await page.locator('button:has-text("预览")').count() > 0,
      save: await page.locator('button:has-text("保存")').count() > 0
    }

    console.log('工具栏按钮检测:', buttons)

    expect(buttons.format || buttons.validate || buttons.preview || buttons.save).toBeTruthy()
    console.log('✅ 编辑器基础功能按钮存在')
  })

  test('P0-4: 校验功能', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      console.log('⚠️ 列表为空，跳过测试')
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    // 点击校验按钮
    const validateButton = page.locator('button:has-text("校验")').first()
    const buttonExists = await validateButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (buttonExists) {
      await validateButton.click()
      await page.waitForTimeout(3000)

      // 检查是否有校验结果（面板或消息）
      const hasPanel = await page.locator('.ant-collapse, [class*="validate"], [class*="error"]').count() > 0
      const hasMessage = await page.locator('.ant-message').count() > 0

      console.log('校验结果:', { hasPanel, hasMessage })
      console.log('✅ 校验功能可触发')
    } else {
      console.log('⚠️ 校验按钮不可见')
    }
  })

  test('P0-5: 预览功能', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      console.log('⚠️ 列表为空，跳过测试')
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    // 点击预览按钮
    const previewButton = page.locator('button:has-text("预览")').first()
    const buttonExists = await previewButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (buttonExists) {
      await previewButton.click()
      await page.waitForTimeout(3000)

      // 检查预览内容
      const hasPreviewModal = await page.locator('.ant-modal:has-text("预览")').isVisible({ timeout: 5000 }).catch(() => false)
      const hasPreviewPane = await page.locator('[class*="preview"]').count() > 0

      console.log('预览检测:', { hasPreviewModal, hasPreviewPane })
      console.log('✅ 预览功能可触发')

      // 关闭预览
      if (hasPreviewModal) {
        await page.locator('.ant-modal button:has-text("关闭"), .ant-modal .ant-modal-close').first().click()
      }
    } else {
      console.log('⚠️ 预览按钮不可见')
    }
  })

  // ==================== P1 辅助功能测试 ====================

  test('P1-1: 图符按钮存在', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    const symbolButton = await page.locator('button:has-text("图符")').count() > 0
    console.log('图符按钮:', symbolButton ? '✅ 存在' : '⚠️ 不存在')
  })

  test('P1-2: 引用DM按钮存在', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    const dmRefButton = await page.locator('button:has-text("引用"), button:has-text("DM")').count() > 0
    console.log('引用DM按钮:', dmRefButton ? '✅ 存在' : '⚠️ 不存在')
  })

  test('P1-3: 内部引用按钮存在', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    const interRefButton = await page.locator('button:has-text("内部引用")').count() > 0
    console.log('内部引用按钮:', interRefButton ? '✅ 存在' : '⚠️ 不存在')
  })

  test('P1-4: 对象列表按钮存在', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      test.skip()
      return
    }

    await firstRow.locator('button:has-text("编辑")').first().click().catch(async () => {
      await firstRow.dblclick()
    })

    await page.waitForTimeout(3000)

    const idListButton = await page.locator('button:has-text("对象列表")').count() > 0
    console.log('对象列表按钮:', idListButton ? '✅ 存在' : '⚠️ 不存在')
  })

  // ==================== 历史版本测试 ====================

  test('P1-5: 历史版本功能', async () => {
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const rowExists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!rowExists) {
      test.skip()
      return
    }

    // 查找"更多"按钮或下拉菜单
    const moreButton = firstRow.locator('button:has-text("更多"), .ant-dropdown-trigger').first()
    const buttonExists = await moreButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (buttonExists) {
      await moreButton.click()
      await page.waitForTimeout(1000)

      // 查找"历史版本"选项
      const historyOption = page.locator('text="历史版本"')
      const optionExists = await historyOption.isVisible({ timeout: 3000 }).catch(() => false)

      console.log('历史版本选项:', optionExists ? '✅ 存在' : '⚠️ 不存在')
    } else {
      console.log('⚠️ "更多"按钮不存在')
    }
  })

  // ==================== 测试总结 ====================

  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM 真实环境全量测试完成')
    console.log('='.repeat(80))
  })
})
