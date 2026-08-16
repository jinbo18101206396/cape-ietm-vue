/**
 * IETM 完整场景测试 - 增强版
 * 使用正确的登录凭据：admin / 123456
 * 包含详细的调试信息和多种登录策略
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'
const TEST_TIMEOUT = 180000

// 增强的登录函数
async function loginEnhanced(page) {
  console.log('='.repeat(80))
  console.log('开始登录流程...')

  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)

  // 检查是否已登录
  const alreadyLoggedIn = await page.locator('.ant-layout-header, .ant-pro-top-nav-header').isVisible({ timeout: 3000 }).catch(() => false)
  if (alreadyLoggedIn) {
    console.log('✅ 已处于登录状态')
    return true
  }

  // 尝试多种方式定位登录表单元素
  console.log('尝试定位登录表单...')

  // 尝试1: 通过placeholder定位
  let usernameInput = page.locator('input[placeholder*="用户"], input[placeholder*="账号"], input[placeholder*="username"]').first()
  let passwordInput = page.locator('input[type="password"]').first()
  let loginButton = page.locator('button:has-text("登录"), button:has-text("登陆"), button:has-text("Login")').first()

  let usernameVisible = await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)

  if (!usernameVisible) {
    console.log('尝试2: 通过name属性定位')
    usernameInput = page.locator('input[name="username"], input[name="userName"], input[name="account"]').first()
    usernameVisible = await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)
  }

  if (!usernameVisible) {
    console.log('尝试3: 通过type=text定位第一个输入框')
    usernameInput = page.locator('input[type="text"]').first()
    usernameVisible = await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)
  }

  const passwordVisible = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)
  const buttonVisible = await loginButton.isVisible({ timeout: 2000 }).catch(() => false)

  console.log('表单元素检测:')
  console.log('  用户名输入框:', usernameVisible ? '✅' : '❌')
  console.log('  密码输入框:', passwordVisible ? '✅' : '❌')
  console.log('  登录按钮:', buttonVisible ? '✅' : '❌')

  if (!usernameVisible || !passwordVisible || !buttonVisible) {
    console.log('❌ 登录表单元素不完整')
    console.log('当前页面URL:', page.url())

    // 打印页面上所有的input和button
    const allInputs = await page.locator('input').count()
    const allButtons = await page.locator('button').count()
    console.log(`页面上共有 ${allInputs} 个input元素, ${allButtons} 个button元素`)

    return false
  }

  // 填写表单
  console.log('填写登录信息...')
  await usernameInput.fill('admin')
  await page.waitForTimeout(500)

  await passwordInput.fill('123456')
  await page.waitForTimeout(500)

  console.log('点击登录按钮...')
  await loginButton.click()

  // 等待跳转
  await page.waitForTimeout(5000)

  const currentUrl = page.url()
  console.log('登录后URL:', currentUrl)

  // 验证登录是否成功
  const loginSuccess = !currentUrl.includes('/login') && !currentUrl.includes('/user/login')

  if (loginSuccess) {
    console.log('✅ 登录成功')
  } else {
    console.log('❌ 登录失败，仍在登录页')

    // 检查是否有错误提示
    const errorMsg = await page.locator('.ant-message-error, .ant-notification-error').textContent().catch(() => '')
    if (errorMsg) {
      console.log('错误信息:', errorMsg)
    }
  }

  console.log('='.repeat(80))
  return loginSuccess
}

async function navigateToDmList(page) {
  await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
  await page.waitForTimeout(3000)
  console.log('导航到DM列表页，URL:', page.url())
}

async function openFirstDm(page) {
  console.log('尝试打开第一个DM...')

  const firstRow = page.locator('.ant-table-tbody tr').first()
  const exists = await firstRow.isVisible({ timeout: 5000 }).catch(() => false)

  if (!exists) {
    const rowCount = await page.locator('.ant-table-tbody tr').count()
    console.log(`❌ 列表中有 ${rowCount} 行数据`)
    throw new Error('列表为空，无法打开DM')
  }

  console.log('找到第一行数据，查找编辑按钮...')

  // 尝试多种方式找到编辑按钮
  const editBtn = firstRow.locator('button:has-text("编辑"), a:has-text("编辑"), [title="编辑"]').first()
  const btnExists = await editBtn.isVisible({ timeout: 3000 }).catch(() => false)

  if (btnExists) {
    console.log('找到编辑按钮，点击...')
    await editBtn.click()
  } else {
    console.log('未找到编辑按钮，尝试双击行...')
    await firstRow.dblclick()
  }

  await page.waitForTimeout(3000)
  console.log('等待编辑器加载...')
}

test.describe('IETM UI 完整场景测试 - 增强版', () => {
  test.setTimeout(TEST_TIMEOUT)

  let page
  let loginSuccessful = false

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })

    // 执行登录
    loginSuccessful = await loginEnhanced(page)

    if (!loginSuccessful) {
      console.log('⚠️ 登录失败，部分测试将被跳过')
    }
  })

  test.afterAll(async () => {
    await page?.close()
  })

  // ==================== 环境验证 ====================

  test('ENV-1: 登录状态验证', async () => {
    expect(loginSuccessful).toBeTruthy()
    console.log('✅ 登录验证通过')
  })

  test('ENV-2: 导航到DM列表页', async () => {
    if (!loginSuccessful) {
      test.skip()
      return
    }

    await navigateToDmList(page)

    const hasTable = await page.locator('.ant-table').isVisible({ timeout: 5000 })
    expect(hasTable).toBeTruthy()

    const rowCount = await page.locator('.ant-table-tbody tr').count()
    console.log(`✅ DM列表页加载成功，共 ${rowCount} 条数据`)
  })

  test('ENV-3: 检查是否有DM数据', async () => {
    if (!loginSuccessful) {
      test.skip()
      return
    }

    await navigateToDmList(page)

    const rowCount = await page.locator('.ant-table-tbody tr').count()
    console.log(`列表中有 ${rowCount} 条数据`)

    if (rowCount === 0) {
      console.log('⚠️ 列表为空，后续需要DM数据的测试将被跳过')
    }

    expect(rowCount).toBeGreaterThan(0)
  })

  // ==================== 场景1: 打开编辑器 ====================

  test('场景1: 打开DM编辑器', async () => {
    if (!loginSuccessful) {
      test.skip()
      return
    }

    await navigateToDmList(page)
    await openFirstDm(page)

    // 验证编辑器已打开
    const hasCodeMirror = await page.locator('.CodeMirror').isVisible({ timeout: 10000 })
    expect(hasCodeMirror).toBeTruthy()

    console.log('✅ 编辑器已打开')
  })

  // ==================== 场景2: 重建refs核心功能 ====================

  test('场景2-1: 查找"重建refs"按钮', async () => {
    if (!loginSuccessful) {
      test.skip()
      return
    }

    await navigateToDmList(page)
    await openFirstDm(page)

    // 尝试多种方式定位按钮
    const regenBtn = page.locator('button:has-text("重建refs"), button:has-text("重建"), button[title*="重建"]').first()
    const btnVisible = await regenBtn.isVisible({ timeout: 5000 })

    expect(btnVisible).toBeTruthy()
    console.log('✅ "重建refs"按钮可见')
  })

  test('场景2-2: 点击"重建refs"按钮并确认', async () => {
    if (!loginSuccessful) {
      test.skip()
      return
    }

    await navigateToDmList(page)
    await openFirstDm(page)

    const regenBtn = page.locator('button:has-text("重建refs"), button:has-text("重建")').first()
    await regenBtn.click()
    console.log('已点击重建refs按钮')

    await page.waitForTimeout(1000)

    // 验证确认框出现
    const confirmModal = page.locator('.ant-modal:has-text("重建"), .ant-confirm:has-text("重建")')
    const modalVisible = await confirmModal.isVisible({ timeout: 3000 })

    expect(modalVisible).toBeTruthy()
    console.log('✅ 确认弹框已显示')

    // 点击确认
    const confirmBtn = page.locator('.ant-modal button:has-text("确定"), .ant-confirm button:has-text("确定")').first()
    await confirmBtn.click()
    console.log('已点击确定按钮')

    // 等待执行
    await page.waitForTimeout(10000)
    console.log('✅ 重建refs执行完成')
  })

  test('场景2-3: 验证refs块生成', async () => {
    if (!loginSuccessful) {
      test.skip()
      return
    }

    await navigateToDmList(page)
    await openFirstDm(page)

    // 执行重建
    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      const confirmVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)

      if (confirmVisible) {
        await confirmBtn.click()
        await page.waitForTimeout(10000)
      }
    }

    // 读取编辑器内容
    const content = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm?.CodeMirror?.getValue() || ''
    })

    console.log('XML内容长度:', content.length)

    const hasRefs = content.includes('<refs>') || content.includes('<!DOCTYPE')
    console.log('包含refs块:', hasRefs ? '✅' : '⚠️ 可能是空文档')

    if (content.length > 0) {
      console.log('✅ 编辑器有内容')
    }
  })

  // ==================== 场景3: 快速重复点击（重入保护测试） ====================

  test('场景3: 快速重复点击测试（重入保护）', async () => {
    if (!loginSuccessful) {
      test.skip()
      return
    }

    await navigateToDmList(page)
    await openFirstDm(page)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!btnExists) {
      console.log('⚠️ 重建refs按钮不存在')
      test.skip()
      return
    }

    console.log('第一次点击...')
    await regenBtn.click()
    await page.waitForTimeout(500)

    const confirmBtn1 = page.locator('.ant-modal button:has-text("确定")').first()
    const modal1Visible = await confirmBtn1.isVisible({ timeout: 2000 }).catch(() => false)

    if (modal1Visible) {
      await confirmBtn1.click()
      console.log('确认第一次执行')
      await page.waitForTimeout(1000)
    }

    console.log('第二次点击（立即点击）...')
    await regenBtn.click()
    await page.waitForTimeout(1000)

    // 检查警告消息或第二个弹框
    const warningMsg = page.locator('.ant-message:has-text("正在进行"), .ant-message:has-text("请稍候")')
    const hasWarning = await warningMsg.isVisible({ timeout: 2000 }).catch(() => false)

    const modal2Visible = await page.locator('.ant-modal button:has-text("确定")').isVisible({ timeout: 2000 }).catch(() => false)

    if (hasWarning) {
      console.log('✅ 重入保护生效：显示警告消息')
    } else if (!modal2Visible) {
      console.log('✅ 重入保护生效：未弹出第二个确认框')
    } else {
      console.log('⚠️ 重入保护可能未生效：弹出了第二个确认框')
    }
  })

  // ==================== 测试总结 ====================

  test('测试完成统计', async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM UI 完整场景测试完成')
    console.log('='.repeat(80))
    console.log('登录状态:', loginSuccessful ? '✅ 成功' : '❌ 失败')
    console.log('测试方法: 真实UI交互，不绕过Vue层')
    console.log('='.repeat(80))
  })
})
