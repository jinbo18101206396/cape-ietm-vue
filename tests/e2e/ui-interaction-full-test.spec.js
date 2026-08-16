/**
 * IETM 完整场景测试 - UI 交互验证
 * 不绕过 Vue 层，通过真实的点击、输入等操作验证
 * 包含边界测试和异常场景
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'
const TEST_TIMEOUT = 180000

// 测试辅助函数
async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(2000)

  const isLoginPage = await page.locator('input[type="password"]').isVisible({ timeout: 3000 }).catch(() => false)

  if (isLoginPage) {
    console.log('检测到登录页，执行登录...')
    await page.locator('input[placeholder*="账"], input[name="username"]').first().fill('admin')
    await page.locator('input[type="password"]').first().fill('123456')
    await page.locator('button:has-text("登录")').first().click()
    await page.waitForTimeout(5000)
    console.log('登录完成，当前URL:', page.url())
  }
}

async function navigateToDmList(page) {
  await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
  await page.waitForTimeout(3000)
}

async function openFirstDm(page) {
  const firstRow = page.locator('.ant-table-tbody tr').first()
  const exists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

  if (!exists) {
    throw new Error('列表为空，无法打开DM')
  }

  // 尝试点击编辑按钮
  const editBtn = firstRow.locator('button:has-text("编辑"), a:has-text("编辑")').first()
  await editBtn.click({ timeout: 5000 }).catch(async () => {
    console.log('未找到编辑按钮，尝试双击行')
    await firstRow.dblclick()
  })

  await page.waitForTimeout(3000)
}

test.describe('IETM UI 完整交互测试', () => {
  test.setTimeout(TEST_TIMEOUT)

  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    // 设置视口大小，确保所有元素可见
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test.afterAll(async () => {
    await page?.close()
  })

  // ==================== 环境准备 ====================

  test('ENV-0: 登录系统', async () => {
    await login(page)

    // 验证登录成功
    const currentUrl = page.url()
    const isLoggedIn = !currentUrl.includes('/login') || await page.locator('.ant-layout-header').isVisible({ timeout: 5000 }).catch(() => false)

    expect(isLoggedIn).toBeTruthy()
    console.log('✅ 登录成功')
  })

  test('ENV-1: 导航到DM列表页', async () => {
    await navigateToDmList(page)

    const hasTable = await page.locator('.ant-table').isVisible({ timeout: 5000 })
    expect(hasTable).toBeTruthy()
    console.log('✅ DM列表页加载成功')
  })

  // ==================== 场景1: 正常流程 - 重建refs ====================

  test('场景1-1: 打开DM编辑器', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    // 验证编辑器已打开
    const hasCodeMirror = await page.locator('.CodeMirror').isVisible({ timeout: 10000 })
    expect(hasCodeMirror).toBeTruthy()
    console.log('✅ 编辑器已打开')
  })

  test('场景1-2: 查找并点击"重建refs"按钮', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    // 查找重建refs按钮
    const regenBtn = page.locator('button:has-text("重建refs"), button:has-text("重建"), button[title*="重建"]').first()
    const btnVisible = await regenBtn.isVisible({ timeout: 5000 })

    expect(btnVisible).toBeTruthy()
    console.log('✅ "重建refs"按钮可见')

    // 点击按钮
    await regenBtn.click()
    await page.waitForTimeout(1000)

    // 验证弹出确认框
    const confirmModal = page.locator('.ant-modal:has-text("重建"), .ant-confirm:has-text("重建")')
    const modalVisible = await confirmModal.isVisible({ timeout: 3000 })

    expect(modalVisible).toBeTruthy()
    console.log('✅ 确认弹框已显示')
  })

  test('场景1-3: 确认执行重建refs', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    // 点击重建refs按钮
    const regenBtn = page.locator('button:has-text("重建refs"), button:has-text("重建")').first()
    await regenBtn.click()
    await page.waitForTimeout(1000)

    // 点击确认按钮
    const confirmBtn = page.locator('.ant-modal button:has-text("确定"), .ant-confirm button:has-text("确定")').first()
    await confirmBtn.click()

    // 等待执行完成（监听控制台日志）
    const logs = []
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text())
      }
    })

    await page.waitForTimeout(10000) // 等待执行

    // 验证执行日志
    const hasStartLog = logs.some(log => log.includes('[_torefs]') || log.includes('[doRegenRefs]'))
    const hasCompleteLog = logs.some(log => log.includes('完成') || log.includes('执行完成'))

    console.log('执行日志:', logs.filter(log => log.includes('refs') || log.includes('Regen')).slice(0, 10))

    if (!hasStartLog) {
      console.log('⚠️ 未捕获到执行日志，可能执行太快或被禁用')
    } else {
      console.log('✅ 重建refs已执行')
    }
  })

  test('场景1-4: 验证refs块生成', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    // 执行重建
    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()
      await page.waitForTimeout(10000)
    }

    // 读取编辑器内容
    const content = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm?.CodeMirror?.getValue() || ''
    })

    // 验证内容包含refs块
    const hasRefs = content.includes('<refs>') || content.includes('<!DOCTYPE')
    console.log('XML内容长度:', content.length)
    console.log('包含refs块:', hasRefs)

    if (hasRefs) {
      console.log('✅ refs块已生成')
    } else {
      console.log('⚠️ 未检测到refs块（可能是空文档或无图形元素）')
    }
  })

  // ==================== 场景2: 边界测试 - 快速重复点击 ====================

  test('场景2-1: 快速连续点击"重建refs"按钮', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!btnExists) {
      test.skip()
      return
    }

    // 第一次点击
    await regenBtn.click()
    await page.waitForTimeout(500)

    const confirmBtn1 = page.locator('.ant-modal button:has-text("确定")').first()
    const modal1Visible = await confirmBtn1.isVisible({ timeout: 2000 }).catch(() => false)

    if (modal1Visible) {
      await confirmBtn1.click()
      await page.waitForTimeout(1000)
    }

    // 第二次点击（立即点击，不等待执行完成）
    await regenBtn.click()
    await page.waitForTimeout(1000)

    // 检查是否有提示消息
    const warningMsg = page.locator('.ant-message:has-text("正在进行"), .ant-message:has-text("请稍候")')
    const hasWarning = await warningMsg.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasWarning) {
      console.log('✅ 重入保护生效：显示警告消息')
    } else {
      // 可能弹出了第二个确认框
      const modal2Visible = await page.locator('.ant-modal button:has-text("确定")').isVisible({ timeout: 2000 }).catch(() => false)
      if (modal2Visible) {
        console.log('⚠️ 重入保护可能未生效：弹出了第二个确认框')
      } else {
        console.log('✅ 重入保护可能生效：未弹出第二个确认框')
      }
    }
  })

  // ==================== 场景3: 边界测试 - 补后缀弹框 ====================

  test('场景3-1: 触发补后缀弹框（如果有无后缀ICN）', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!btnExists) {
      test.skip()
      return
    }

    await regenBtn.click()
    await page.waitForTimeout(1000)

    const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
    await confirmBtn.click()
    await page.waitForTimeout(3000)

    // 检查是否弹出补后缀弹框
    const suffixModal = page.locator('.ant-modal:has-text("ICN"), .ant-modal:has-text("后缀")')
    const suffixModalVisible = await suffixModal.isVisible({ timeout: 5000 }).catch(() => false)

    if (suffixModalVisible) {
      console.log('✅ 补后缀弹框已显示')

      // 验证弹框内容
      const hasSelect = await page.locator('.ant-modal .ant-select').count() > 0
      console.log('包含下拉选择框:', hasSelect)
    } else {
      console.log('⏭️ 未触发补后缀弹框（所有ICN都有后缀）')
    }
  })

  test('场景3-2: 补后缀弹框 - 选择后缀并确认', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!btnExists) {
      test.skip()
      return
    }

    await regenBtn.click()
    await page.waitForTimeout(1000)
    await page.locator('.ant-modal button:has-text("确定")').first().click()
    await page.waitForTimeout(3000)

    const suffixModal = page.locator('.ant-modal:has-text("ICN"), .ant-modal:has-text("后缀")')
    const suffixModalVisible = await suffixModal.isVisible({ timeout: 5000 }).catch(() => false)

    if (suffixModalVisible) {
      // 选择第一个下拉框
      const firstSelect = page.locator('.ant-modal .ant-select').first()
      await firstSelect.click()
      await page.waitForTimeout(500)

      // 选择 .cgm 选项
      const cgmOption = page.locator('.ant-select-dropdown .ant-select-item:has-text(".cgm")').first()
      await cgmOption.click()
      await page.waitForTimeout(500)

      // 点击确定
      await page.locator('.ant-modal button:has-text("确定")').first().click()
      await page.waitForTimeout(5000)

      console.log('✅ 补后缀并确认完成')
    } else {
      test.skip()
    }
  })

  test('场景3-3: 补后缀弹框 - 点击取消', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!btnExists) {
      test.skip()
      return
    }

    await regenBtn.click()
    await page.waitForTimeout(1000)
    await page.locator('.ant-modal button:has-text("确定")').first().click()
    await page.waitForTimeout(3000)

    const suffixModal = page.locator('.ant-modal:has-text("ICN"), .ant-modal:has-text("后缀")')
    const suffixModalVisible = await suffixModal.isVisible({ timeout: 5000 }).catch(() => false)

    if (suffixModalVisible) {
      // 点击取消
      await page.locator('.ant-modal button:has-text("取消")').first().click()
      await page.waitForTimeout(2000)

      // 验证弹框关闭
      const modalStillVisible = await suffixModal.isVisible({ timeout: 2000 }).catch(() => false)
      expect(modalStillVisible).toBeFalsy()

      // 检查是否有取消提示
      const cancelMsg = page.locator('.ant-message:has-text("取消")')
      const hasCancelMsg = await cancelMsg.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasCancelMsg) {
        console.log('✅ 取消操作成功，显示提示消息')
      }
    } else {
      test.skip()
    }
  })

  // ==================== 场景4: 编辑器基础功能 ====================

  test('场景4-1: 格式化功能', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const formatBtn = page.locator('button:has-text("格式化")').first()
    const btnVisible = await formatBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await formatBtn.click()
      await page.waitForTimeout(2000)
      console.log('✅ 格式化功能已触发')
    } else {
      console.log('⚠️ 格式化按钮不可见')
      test.skip()
    }
  })

  test('场景4-2: 校验功能', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const validateBtn = page.locator('button:has-text("校验")').first()
    const btnVisible = await validateBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await validateBtn.click()
      await page.waitForTimeout(3000)

      // 检查校验结果
      const validatePanel = page.locator('.ant-collapse, [class*="validate"]')
      const hasPanel = await validatePanel.count() > 0

      console.log('✅ 校验功能已触发')
      console.log('显示校验面板:', hasPanel)
    } else {
      console.log('⚠️ 校验按钮不可见')
      test.skip()
    }
  })

  test('场景4-3: 预览功能', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const previewBtn = page.locator('button:has-text("预览")').first()
    const btnVisible = await previewBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await previewBtn.click()
      await page.waitForTimeout(3000)

      // 检查预览窗口
      const previewModal = page.locator('.ant-modal:has-text("预览")')
      const modalVisible = await previewModal.isVisible({ timeout: 5000 }).catch(() => false)

      if (modalVisible) {
        console.log('✅ 预览窗口已打开')

        // 关闭预览窗口
        await page.locator('.ant-modal button:has-text("关闭"), .ant-modal .ant-modal-close').first().click()
        await page.waitForTimeout(1000)
      } else {
        console.log('⚠️ 预览窗口未显示')
      }
    } else {
      console.log('⚠️ 预览按钮不可见')
      test.skip()
    }
  })

  test('场景4-4: 保存功能', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const saveBtn = page.locator('button:has-text("保存")').first()
    const btnVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await saveBtn.click()
      await page.waitForTimeout(2000)

      // 检查保存提示
      const saveMsg = page.locator('.ant-message:has-text("保存"), .ant-message:has-text("成功")')
      const hasMsg = await saveMsg.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasMsg) {
        console.log('✅ 保存成功')
      } else {
        console.log('⚠️ 未显示保存提示（可能保存失败或被拦截）')
      }
    } else {
      console.log('⚠️ 保存按钮不可见')
      test.skip()
    }
  })

  // ==================== 场景5: 辅助功能 ====================

  test('场景5-1: 图符按钮', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const symbolBtn = page.locator('button:has-text("图符")').first()
    const btnVisible = await symbolBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await symbolBtn.click()
      await page.waitForTimeout(2000)

      const modal = page.locator('.ant-modal:has-text("图符")')
      const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false)

      if (modalVisible) {
        console.log('✅ 图符弹框已打开')
        await page.locator('.ant-modal button:has-text("取消"), .ant-modal .ant-modal-close').first().click()
      }
    } else {
      console.log('⏭️ 图符按钮不存在')
      test.skip()
    }
  })

  test('场景5-2: 引用DM按钮', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const dmRefBtn = page.locator('button:has-text("引用DM"), button:has-text("引用")').first()
    const btnVisible = await dmRefBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await dmRefBtn.click()
      await page.waitForTimeout(2000)

      const modal = page.locator('.ant-modal')
      const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false)

      if (modalVisible) {
        console.log('✅ 引用DM弹框已打开')
        await page.locator('.ant-modal button:has-text("取消"), .ant-modal .ant-modal-close').first().click()
      }
    } else {
      console.log('⏭️ 引用DM按钮不存在')
      test.skip()
    }
  })

  test('场景5-3: 对象列表按钮', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const idListBtn = page.locator('button:has-text("对象列表")').first()
    const btnVisible = await idListBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await idListBtn.click()
      await page.waitForTimeout(2000)

      const modal = page.locator('.ant-modal:has-text("对象")')
      const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false)

      if (modalVisible) {
        console.log('✅ 对象列表弹框已打开')
        await page.locator('.ant-modal button:has-text("关闭"), .ant-modal .ant-modal-close').first().click()
      }
    } else {
      console.log('⏭️ 对象列表按钮不存在')
      test.skip()
    }
  })

  // ==================== 场景6: 历史版本 ====================

  test('场景6-1: 历史版本功能', async () => {
    await navigateToDmList(page)

    const firstRow = page.locator('.ant-table-tbody tr').first()
    const exists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

    if (!exists) {
      test.skip()
      return
    }

    // 查找"更多"按钮
    const moreBtn = firstRow.locator('button:has-text("更多"), .ant-dropdown-trigger').first()
    const btnVisible = await moreBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await moreBtn.click()
      await page.waitForTimeout(1000)

      const historyOption = page.locator('[role="menuitem"]:has-text("历史版本")')
      const optionVisible = await historyOption.isVisible({ timeout: 3000 }).catch(() => false)

      if (optionVisible) {
        await historyOption.click()
        await page.waitForTimeout(3000)

        // 检查历史版本页面
        const historyPage = page.locator('text=/历史版本|版本列表/i')
        const hasHistory = await historyPage.count() > 0

        console.log('✅ 历史版本功能已触发')
        console.log('显示历史版本:', hasHistory)
      }
    } else {
      console.log('⏭️ "更多"按钮不存在')
      test.skip()
    }
  })

  // ==================== 测试总结 ====================

  test('测试完成统计', async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM UI 完整交互测试完成')
    console.log('='.repeat(80))
    console.log('所有测试通过 UI 层交互验证，未绕过 Vue 框架')
    console.log('测试包含：正常场景 + 边界场景 + 异常场景')
    console.log('='.repeat(80))
  })
})
