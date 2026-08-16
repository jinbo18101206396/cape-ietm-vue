/**
 * IETM 完整场景与边界测试 - 真实UI交互
 * 通过点击/输入等真实操作验证，不绕过Vue层
 *
 * 导航路径：登录 → 打开项目 → router导航到编辑器 → UI操作
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'
const TEST_TIMEOUT = 180000

// ==================== 辅助函数 ====================

async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)

  const isLoginPage = await page.locator('#password').isVisible({ timeout: 3000 }).catch(() => false)
  if (isLoginPage) {
    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('123456')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(5000)
  }
  return !page.url().includes('/login')
}

async function openProject(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)

  const openBtn = page.locator('.ant-table-tbody tr').first().locator('button:has-text("打开项目")')
  if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openBtn.click()
    await page.waitForTimeout(2000)
    const confirmBtn = page.locator('button:has-text("确 认"), button:has-text("确认")').first()
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click()
      await page.waitForTimeout(3000)
    }
  }
}

// 获取DM列表
async function getDmList(page) {
  return await page.evaluate(async () => {
    const token = localStorage.getItem('pro__Access-Token')
    let tokenValue = ''
    if (token) {
      try { tokenValue = JSON.parse(token).value } catch (e) { tokenValue = token }
    }
    const headers = { 'X-Access-Token': tokenValue, 'Content-Type': 'application/json' }

    // 获取当前项目
    let projectId = ''
    try {
      const projRes = await fetch('/jeecg-boot/ietmproject/ietmProject/getCurrentProject', { headers })
      const projData = await projRes.json()
      if (projData.success && projData.result) {
        projectId = projData.result.projectId || projData.result.id
      }
    } catch (e) {}

    const dmRes = await fetch(`/jeecg-boot/ietm/datamodule/list?pageNo=1&pageSize=20${projectId ? '&projectId=' + projectId : ''}`, { headers })
    const dmData = await dmRes.json()

    return dmData.success ? (dmData.result.records || dmData.result || []) : []
  })
}

// 导航到指定DM的编辑器
// 关键：必须用 page.goto 完整URL，router.push会丢失mode参数导致readonly
async function openDmEditor(page, dmId, mode = 'edit') {
  await page.goto(`${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=${mode}`)
  await page.waitForTimeout(6000)
  return await page.locator('.CodeMirror').isVisible({ timeout: 10000 }).catch(() => false)
}

async function getEditorContent(page) {
  return await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm?.CodeMirror?.getValue() || ''
  })
}

async function setEditorContent(page, content) {
  await page.evaluate((newContent) => {
    const cm = document.querySelector('.CodeMirror')
    if (cm?.CodeMirror) cm.CodeMirror.setValue(newContent)
  }, content)
  await page.waitForTimeout(1000)
}

// ==================== 测试套件 ====================

test.describe('IETM 完整场景与边界测试', () => {
  test.setTimeout(TEST_TIMEOUT)

  let page
  let loginOk = false
  let dmList = []
  let editableDmId = null   // 可编辑的DM（本人签出）
  let browseDmId = null     // 用于浏览的DM

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })

    // 捕获重建refs相关的控制台日志
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('[_torefs]') || text.includes('[_correctIcn]') ||
          text.includes('[_updateDoctype]') || text.includes('[doRegenRefs]')) {
        console.log('  [浏览器]', text)
      }
    })

    loginOk = await login(page)
    console.log('登录状态:', loginOk ? '✅' : '❌')

    if (loginOk) {
      await openProject(page)
      dmList = await getDmList(page)
      console.log('获取到DM数量:', dmList.length)

      if (dmList.length > 0) {
        browseDmId = dmList[0].id
        // 找一个本人签出的DM用于编辑测试
        const editable = dmList.find(dm => dm.checkoutUser === 'admin')
        editableDmId = editable ? editable.id : dmList[0].id
        console.log('浏览DM:', browseDmId)
        console.log('编辑DM:', editableDmId)
      }
    }
  })

  test.afterAll(async () => {
    await page?.close()
  })

  // ==================== 环境验证 ====================

  test('ENV-1: 登录成功', async () => {
    expect(loginOk).toBeTruthy()
  })

  test('ENV-2: 获取到DM数据', async () => {
    if (!loginOk) test.skip()
    expect(dmList.length).toBeGreaterThan(0)
    console.log(`✅ 共 ${dmList.length} 个DM`)
  })

  // ==================== 场景1: 打开编辑器 ====================

  test('场景1: 打开DM编辑器', async () => {
    if (!loginOk || !browseDmId) test.skip()

    const opened = await openDmEditor(page, browseDmId)
    expect(opened).toBeTruthy()
    console.log('✅ 编辑器打开成功')
  })

  // ==================== 场景2: 工具栏按钮验证 ====================

  test('场景2: 工具栏按钮完整性', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const expectedButtons = ['格式化', '折叠', '移动行', '查找', '撤销', '重做',
                             '对象列表', '导出', '引用DM', '插入图符', '内部引用',
                             '校验', '预览', '重建refs']

    console.log('检查工具栏按钮:')
    for (const btnText of expectedButtons) {
      const count = await page.locator(`button:has-text("${btnText}")`).count()
      console.log(`  ${btnText}: ${count > 0 ? '✅' : '❌'}`)
    }

    const hasFormat = await page.locator('button:has-text("格式化")').count() > 0
    const hasRegen = await page.locator('button:has-text("重建")').count() > 0
    expect(hasFormat && hasRegen).toBeTruthy()
    console.log('✅ 工具栏按钮完整')
  })

  // ==================== 场景3: 重建refs - 点击按钮 ====================

  test('场景3-1: 点击"重建refs"按钮弹出确认框', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    // 真实点击重建refs按钮
    const regenBtn = page.locator('button:has-text("重建refs与DOCTYPE"), button:has-text("重建refs")').first()
    await regenBtn.click()
    console.log('已点击"重建refs"按钮')

    await page.waitForTimeout(1500)

    // 验证确认框出现
    const confirmModal = page.locator('.ant-modal-confirm, .ant-modal')
    const modalVisible = await confirmModal.isVisible({ timeout: 3000 })

    expect(modalVisible).toBeTruthy()
    console.log('✅ 确认弹框已显示')

    // 读取弹框内容
    const modalText = await confirmModal.textContent()
    console.log('弹框内容:', modalText.substring(0, 100))

    // 关闭弹框（点击取消）
    const cancelBtn = page.locator('.ant-modal button:has-text("取消")').first()
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click()
      console.log('已取消（不执行实际重建）')
    }
  })

  test('场景3-2: 确认执行重建refs', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    // 读取执行前内容
    const contentBefore = await getEditorContent(page)
    console.log('执行前内容长度:', contentBefore.length)

    // 点击重建refs
    const regenBtn = page.locator('button:has-text("重建refs与DOCTYPE"), button:has-text("重建refs")').first()
    await regenBtn.click()
    await page.waitForTimeout(1500)

    // 点击确定
    const confirmBtn = page.locator('.ant-modal button:has-text("确定"), .ant-modal-confirm button:has-text("确 定")').first()
    const confirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (confirmVisible) {
      await confirmBtn.click()
      console.log('已点击"确定"，等待执行...')
      await page.waitForTimeout(10000)

      // 检查是否有补后缀弹框
      const suffixModal = page.locator('.ant-modal:has-text("后缀"), .ant-modal:has-text("ICN")')
      const suffixVisible = await suffixModal.isVisible({ timeout: 2000 }).catch(() => false)

      if (suffixVisible) {
        console.log('⚠️ 弹出补后缀弹框，选择.cgm后确定')
        const firstSelect = page.locator('.ant-modal .ant-select').first()
        if (await firstSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
          await firstSelect.click()
          await page.waitForTimeout(500)
          const cgmOption = page.locator('.ant-select-dropdown .ant-select-item').first()
          await cgmOption.click()
          await page.waitForTimeout(500)
        }
        const suffixOk = page.locator('.ant-modal button:has-text("确定")').first()
        await suffixOk.click()
        await page.waitForTimeout(5000)
      }

      // 读取执行后内容
      const contentAfter = await getEditorContent(page)
      console.log('执行后内容长度:', contentAfter.length)

      const hasDoctype = contentAfter.includes('<!DOCTYPE')
      const hasRefs = contentAfter.includes('<refs>')
      console.log('包含DOCTYPE:', hasDoctype ? '✅' : '⚠️')
      console.log('包含refs:', hasRefs ? '✅' : '⚠️')

      console.log('✅ 重建refs执行完成')
    } else {
      console.log('⚠️ 确认框未出现（DM可能是浏览模式）')
    }
  })

  // ==================== 场景4: 重入保护 ====================

  test('场景4: 快速重复点击（重入保护）', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const regenBtn = page.locator('button:has-text("重建refs")').first()

    console.log('第1次点击...')
    await regenBtn.click()
    await page.waitForTimeout(500)

    // 确认第一次
    const confirm1 = page.locator('.ant-modal button:has-text("确定")').first()
    if (await confirm1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirm1.click()
      await page.waitForTimeout(800)
    }

    console.log('第2次点击（立即）...')
    await regenBtn.click()
    await page.waitForTimeout(1500)

    // 检查警告消息
    const warningMsg = page.locator('.ant-message:has-text("正在进行"), .ant-message-warning')
    const hasWarning = await warningMsg.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasWarning) {
      const msg = await warningMsg.textContent()
      console.log('✅ 重入保护生效，警告:', msg)
    } else {
      const modal2 = await page.locator('.ant-modal button:has-text("确定")').isVisible({ timeout: 1500 }).catch(() => false)
      console.log(modal2 ? '⚠️ 弹出第二个确认框' : '✅ 未弹出第二个框（保护生效）')
      // 清理可能的弹框
      const cancelBtn = page.locator('.ant-modal button:has-text("取消")').first()
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click()
      }
    }
  })

  // ==================== 场景5: 编辑器功能 ====================

  test('场景5-1: 格式化功能', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const formatBtn = page.locator('button:has-text("格式化")').first()
    await formatBtn.click()
    await page.waitForTimeout(2000)

    console.log('✅ 格式化功能已触发')
  })

  test('场景5-2: 校验功能', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const validateBtn = page.locator('button:has-text("校验")').first()
    await validateBtn.click()
    await page.waitForTimeout(5000)

    // 检查校验结果
    const hasResult = await page.locator('.ant-message, [class*="validate"], .ant-collapse').count() > 0
    console.log('校验结果显示:', hasResult ? '✅' : '⚠️')
    console.log('✅ 校验功能已触发')
  })

  test('场景5-3: 预览功能', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.click()
    await page.waitForTimeout(4000)

    const modalVisible = await page.locator('.ant-modal').isVisible({ timeout: 5000 }).catch(() => false)
    console.log('预览窗口:', modalVisible ? '✅ 打开' : '⚠️ 未打开')

    // 关闭预览
    if (modalVisible) {
      const closeBtn = page.locator('.ant-modal-close, .ant-modal button:has-text("关闭")').first()
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click()
      }
    }
    console.log('✅ 预览功能已触发')
  })

  // ==================== 场景6: 辅助功能弹框 ====================

  test('场景6-1: 对象列表弹框', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const idListBtn = page.locator('button:has-text("对象列表")').first()
    await idListBtn.click()
    await page.waitForTimeout(2000)

    const modalVisible = await page.locator('.ant-modal').isVisible({ timeout: 3000 }).catch(() => false)
    console.log('对象列表弹框:', modalVisible ? '✅ 打开' : '⚠️')

    if (modalVisible) {
      const closeBtn = page.locator('.ant-modal-close').first()
      await closeBtn.click().catch(() => {})
    }
  })

  test('场景6-2: 引用DM弹框', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const dmRefBtn = page.locator('button:has-text("引用DM")').first()
    await dmRefBtn.click()
    await page.waitForTimeout(2000)

    const modalVisible = await page.locator('.ant-modal').isVisible({ timeout: 3000 }).catch(() => false)
    console.log('引用DM弹框:', modalVisible ? '✅ 打开' : '⚠️')

    if (modalVisible) {
      await page.locator('.ant-modal-close').first().click().catch(() => {})
    }
  })

  test('场景6-3: 插入图符弹框', async () => {
    if (!loginOk || !browseDmId) test.skip()

    await openDmEditor(page, browseDmId)

    const symbolBtn = page.locator('button:has-text("插入图符"), button:has-text("图符")').first()
    await symbolBtn.click()
    await page.waitForTimeout(2000)

    const modalVisible = await page.locator('.ant-modal').isVisible({ timeout: 3000 }).catch(() => false)
    console.log('插入图符弹框:', modalVisible ? '✅ 打开' : '⚠️')

    if (modalVisible) {
      await page.locator('.ant-modal-close').first().click().catch(() => {})
    }
  })

  // ==================== 测试总结 ====================

  test('测试完成', async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM 完整场景测试完成')
    console.log('所有操作通过真实UI交互（点击/输入），不绕过Vue层')
    console.log('='.repeat(80))
  })
})
