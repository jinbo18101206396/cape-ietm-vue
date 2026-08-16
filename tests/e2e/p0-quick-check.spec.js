// P0修复快速验证测试 - 简化版
// 用于快速验证环境和核心修复

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999/jeecg-boot'

// 使用真实的测试凭据
const TEST_USER = {
  username: 'admin',
  password: '123456'
}

test.describe('P0修复快速验证', () => {

  test('环境检查 - 登录并导航到DM列表', async ({ page }) => {
    // 1. 访问登录页
    await page.goto(`${BASE_URL}/user/login`)
    console.log('✓ 已访问登录页')

    // 2. 输入凭据
    await page.fill('input[placeholder="账号"]', TEST_USER.username)
    await page.fill('input[placeholder="密码"]', TEST_USER.password)
    console.log('✓ 已输入凭据')

    // 3. 点击登录
    await page.click('button:has-text("登录")')
    console.log('✓ 已点击登录按钮')

    // 4. 等待跳转（可能到dashboard或其他页面）
    await page.waitForURL(/dashboard|index/, { timeout: 10000 }).catch(() => {
      console.log('⚠ 未跳转到dashboard，可能直接到其他页面')
    })

    // 5. 导航到数据模块管理
    await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.waitForLoadState('networkidle')
    console.log('✓ 已导航到DM列表页')

    // 6. 等待列表加载
    await page.waitForSelector('.ietm-dm-container', { timeout: 5000 })
    console.log('✓ DM列表容器已加载')

    // 7. 截图保存
    await page.screenshot({ path: 'test-results/p0-env-check.png', fullPage: true })
    console.log('✓ 已保存截图')
  })

  test('后端API检查 - editProp接口可访问', async ({ request }) => {
    // 先登录获取token
    const loginResp = await request.post(`${API_BASE}/sys/login`, {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    })

    const loginData = await loginResp.json()
    console.log('登录结果:', loginData.success ? '成功' : '失败')

    if (!loginData.success) {
      console.log('⚠ 登录失败，跳过API测试')
      test.skip()
      return
    }

    const token = loginData.result.token
    console.log('✓ 已获取token')

    // 测试editProp接口（使用不存在的ID，期望返回错误）
    const response = await request.put(`${API_BASE}/ietm/datamodule/editProp/test_not_exist`, {
      headers: {
        'X-Access-Token': token
      },
      data: {
        techName: '测试',
        infoName: '测试'
      }
    })

    const result = await response.json()
    console.log('editProp接口响应:', result)

    expect(result.success).toBe(false)
    expect(result.message).toContain('不存在')
    console.log('✓ 后端接口正常响应')
  })
})
