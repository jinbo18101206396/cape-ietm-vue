/**
 * 前置条件修复 - 真实UI验证（创建测试数据版）
 *
 * 策略：
 * 1. 通过API创建/修改测试数据，构造边界条件
 * 2. 通过真实浏览器UI操作验证拦截效果
 * 3. 验证所有3个前置条件的实际拦截行为
 */

const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999/jeecg-boot'
const USERNAME = 'admin'
const PASSWORD = '123456'

let TOKEN = ''
let TEST_PROJECT_ID = ''
let TEST_DM_ID_NO_WORKFLOW = '' // 用于测试：无工作流
let TEST_DM_ID_WRONG_STEP = '' // 用于测试：错误工作流步骤
let TEST_DM_ID_VALID = '' // 用于测试：正常DM

test.describe('前置条件修复 - 真实数据+真实UI验证', () => {
  test.beforeAll(async ({ request }) => {
    // 登录获取token
    const loginResp = await request.post(`${API_BASE}/sys/login`, {
      data: { username: USERNAME, password: PASSWORD }
    })
    const loginData = await loginResp.json()
    TOKEN = loginData.result.token

    // 打开项目
    const projectListResp = await request.get(`${API_BASE}/ietmproject/ietmProject/list`, {
      headers: { 'X-Access-Token': TOKEN }
    })
    const projects = await projectListResp.json()
    if (projects.result.records.length > 0) {
      TEST_PROJECT_ID = projects.result.records[0].id
      await request.post(`${API_BASE}/ietmproject/ietmProject/openProject`, {
        headers: { 'X-Access-Token': TOKEN },
        data: { projectId: TEST_PROJECT_ID }
      })
      console.log('✅ 已打开测试项目:', TEST_PROJECT_ID)
    }

    // 查询现有DM列表
    const dmListResp = await request.get(`${API_BASE}/ietm/datamodule/list`, {
      headers: { 'X-Access-Token': TOKEN },
      params: { pageNo: 1, pageSize: 100 }
    })
    const dmList = await dmListResp.json()

    if (dmList.success && dmList.result.records.length > 0) {
      const dms = dmList.result.records

      // 方案A：修改现有DM创建测试条件
      // 找一个已签出的DM，先签入它
      const checkedOutDm = dms.find(dm => dm.checkoutStatus === '1')
      if (checkedOutDm) {
        TEST_DM_ID_NO_WORKFLOW = checkedOutDm.id

        // 尝试签入
        try {
          await request.put(`${API_BASE}/ietm/datamodule/checkin`, {
            headers: { 'X-Access-Token': TOKEN },
            data: { id: checkedOutDm.id }
          })
        } catch (e) {
          console.log('签入失败（预期可能）')
        }

        // 修改DM状态：清空工作流字段
        await request.put(`${API_BASE}/ietm/datamodule/edit`, {
          headers: { 'X-Access-Token': TOKEN },
          data: {
            id: TEST_DM_ID_NO_WORKFLOW,
            workflowInstanceId: null,
            workflowStep: null,
            checkoutStatus: '0'
          }
        })
        console.log('✅ 已创建无工作流测试DM:', TEST_DM_ID_NO_WORKFLOW)
      }

      // 找第二个DM用于错误工作流步骤测试
      const secondDm = dms.find(dm => dm.id !== TEST_DM_ID_NO_WORKFLOW)
      if (secondDm) {
        TEST_DM_ID_WRONG_STEP = secondDm.id

        // 修改为错误的工作流步骤
        await request.put(`${API_BASE}/ietm/datamodule/edit`, {
          headers: { 'X-Access-Token': TOKEN },
          data: {
            id: TEST_DM_ID_WRONG_STEP,
            workflowInstanceId: 'test-workflow-123',
            workflowStep: '技术审核', // 不是"DM编写"
            checkoutStatus: '0'
          }
        })
        console.log('✅ 已创建错误工作流步骤测试DM:', TEST_DM_ID_WRONG_STEP)
      }

      // 找第三个DM用于正常流程测试
      const thirdDm = dms.find(dm =>
        dm.id !== TEST_DM_ID_NO_WORKFLOW &&
        dm.id !== TEST_DM_ID_WRONG_STEP
      )
      if (thirdDm) {
        TEST_DM_ID_VALID = thirdDm.id

        // 确保是正常状态
        await request.put(`${API_BASE}/ietm/datamodule/edit`, {
          headers: { 'X-Access-Token': TOKEN },
          data: {
            id: TEST_DM_ID_VALID,
            workflowInstanceId: 'valid-workflow-456',
            workflowStep: 'DM编写',
            checkoutStatus: '0'
          }
        })
        console.log('✅ 已创建正常状态测试DM:', TEST_DM_ID_VALID)
      }
    }
  })

  // 登录辅助函数
  async function login(page) {
    await page.goto(`${BASE}/user/login`)
    await page.locator('#username').fill(USERNAME)
    await page.locator('#password').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(2000)
  }

  test('场景1: 工作流未启动 - UI点击验证拦截', async ({ page }) => {
    if (!TEST_DM_ID_NO_WORKFLOW) {
      console.log('⚠️  跳过：无测试数据')
      return
    }

    await login(page)
    await page.goto(`${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    // 找到目标DM行
    const rows = await page.$$('.ant-table-tbody tr')
    let found = false

    for (let row of rows) {
      const dmId = await row.getAttribute('data-row-key') || ''
      if (dmId.includes(TEST_DM_ID_NO_WORKFLOW)) {
        console.log('✅ 找到无工作流测试DM')

        // 点击签出按钮
        const checkoutBtn = row.locator('button:has-text("签出")')
        await checkoutBtn.click()
        await page.waitForTimeout(1000)

        // 验证警告消息
        const warningMsg = await page.locator('.ant-message-warning').textContent()
        console.log('📋 拦截消息:', warningMsg)

        expect(warningMsg).toContain('还未启动流程')
        found = true
        break
      }
    }

    expect(found).toBeTruthy()
  })

  test('场景2: 非DM编写节点 - UI点击验证拦截', async ({ page }) => {
    if (!TEST_DM_ID_WRONG_STEP) {
      console.log('⚠️  跳过：无测试数据')
      return
    }

    await login(page)
    await page.goto(`${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const rows = await page.$$('.ant-table-tbody tr')
    let found = false

    for (let row of rows) {
      const dmId = await row.getAttribute('data-row-key') || ''
      if (dmId.includes(TEST_DM_ID_WRONG_STEP)) {
        console.log('✅ 找到错误工作流步骤测试DM')

        const checkoutBtn = row.locator('button:has-text("签出")')
        await checkoutBtn.click()
        await page.waitForTimeout(1000)

        const warningMsg = await page.locator('.ant-message-warning').textContent()
        console.log('📋 拦截消息:', warningMsg)

        expect(warningMsg).toContain('不是')
        expect(warningMsg).toContain('DM编写')
        found = true
        break
      }
    }

    expect(found).toBeTruthy()
  })

  test('场景3: 正常流程 - UI点击进入确认对话框', async ({ page }) => {
    if (!TEST_DM_ID_VALID) {
      console.log('⚠️  跳过：无测试数据')
      return
    }

    await login(page)
    await page.goto(`${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForTimeout(3000)

    const rows = await page.$$('.ant-table-tbody tr')
    let found = false

    for (let row of rows) {
      const dmId = await row.getAttribute('data-row-key') || ''
      if (dmId.includes(TEST_DM_ID_VALID)) {
        console.log('✅ 找到正常状态测试DM')

        const checkoutBtn = row.locator('button:has-text("签出")')
        await checkoutBtn.click()
        await page.waitForTimeout(2000)

        // 应该出现确认对话框（说明前端第一层校验通过）
        const modalVisible = await page.locator('.ant-modal-confirm').isVisible()
        console.log('📋 确认对话框出现:', modalVisible)

        expect(modalVisible).toBeTruthy()

        // 取消操作，不实际签出
        await page.click('.ant-modal-confirm button:has-text("取消")')
        found = true
        break
      }
    }

    expect(found).toBeTruthy()
  })

  test('场景4: 项目参数格式校验 - 输入非法值验证拦截', async ({ page }) => {
    await login(page)

    // 进入项目管理
    await page.goto(`${BASE}/#/ietm/projectmanagement/IetmProjectList`)
    await page.waitForTimeout(2000)

    // 找到第一个项目的"编辑"按钮
    const editBtn = page.locator('.ant-table-tbody tr:first-child button:has-text("编辑")').first()
    const exists = await editBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (!exists) {
      console.log('⚠️  跳过：未找到项目编辑按钮')
      return
    }

    await editBtn.click()
    await page.waitForTimeout(2000)

    // 切换到"项目参数"标签页
    const paramTab = page.locator('.ant-tabs-tab:has-text("项目参数")')
    const tabExists = await paramTab.isVisible({ timeout: 3000 }).catch(() => false)

    if (!tabExists) {
      console.log('⚠️  跳过：未找到项目参数标签页')
      return
    }

    await paramTab.click()
    await page.waitForTimeout(1000)

    // 查找cageCode输入框
    const inputs = await page.$$('input[type="text"]')
    let cageCodeInput = null

    for (let input of inputs) {
      const placeholder = await input.getAttribute('placeholder') || ''
      if (placeholder.includes('cageCode') || placeholder.includes('企业代码')) {
        cageCodeInput = input
        break
      }
    }

    if (!cageCodeInput) {
      // 尝试按顺序查找
      if (inputs.length >= 4) {
        cageCodeInput = inputs[0] // 通常cageCode是第一个
      }
    }

    if (cageCodeInput) {
      console.log('✅ 找到cageCode输入框')

      // 清空并输入非法值（3位，应该是5位）
      await cageCodeInput.fill('')
      await cageCodeInput.fill('ABC')
      await page.waitForTimeout(500)

      // 点击保存
      await page.click('button:has-text("保存"), button:has-text("确定")')
      await page.waitForTimeout(1500)

      // 验证错误消息
      const errorMsg = await page.locator('.ant-message-error, .ant-message-warning').textContent()
      console.log('📋 校验消息:', errorMsg)

      expect(errorMsg).toContain('5位')
    } else {
      console.log('⚠️  未找到cageCode输入框')
    }
  })

  test('边界5: 后端API直接调用 - 绕过前端验证', async ({ request }) => {
    if (!TEST_DM_ID_NO_WORKFLOW) {
      console.log('⚠️  跳过：无测试数据')
      return
    }

    console.log('✅ 尝试直接调用后端API签出（工作流未启动）')

    // 直接调用后端签出API，绕过前端
    const checkoutResp = await request.post(`${API_BASE}/ietm/datamodule/checkout`, {
      headers: { 'X-Access-Token': TOKEN },
      data: { id: TEST_DM_ID_NO_WORKFLOW }
    })

    const result = await checkoutResp.json()
    console.log('📋 后端响应:', result)

    // 后端应该拦截
    expect(result.success).toBeFalsy()
    expect(result.message).toContain('工作流')
  })
})
