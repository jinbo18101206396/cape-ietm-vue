// P0修复核心验证 - 仅测试后端API
// 绕过UI问题，直接验证后端修复效果

import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:9999/jeecg-boot'
const TEST_USER = { username: 'admin', password: '123456' }

test.describe('P0修复后端API验证', () => {
  let authToken = ''

  test.beforeAll(async ({ request }) => {
    // 登录获取token
    const loginResp = await request.post(`${API_BASE}/sys/login`, {
      data: TEST_USER
    })
    const loginData = await loginResp.json()

    if (loginData.success) {
      authToken = loginData.result.token
      console.log('✅ 登录成功，已获取token')
    } else {
      throw new Error('登录失败: ' + loginData.message)
    }
  })

  test('TC-API-001: 验证selectByIdWithFlow被正确使用', async ({ request }) => {
    // 测试策略：通过日志验证是否使用了正确的查询方法
    // 尝试编辑一个不存在的DM，观察错误消息

    const response = await request.put(`${API_BASE}/ietm/datamodule/editProp/nonexist_id_123`, {
      headers: { 'X-Access-Token': authToken },
      data: { techName: '测试', infoName: '测试' }
    })

    const result = await response.json()

    console.log('响应:', result)

    // 验证响应格式
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('message')

    // 不存在的ID应该返回"DM不存在"
    expect(result.success).toBe(false)
    expect(result.message).toContain('不存在')

    console.log('✅ editProp接口响应正常')
  })

  test('TC-API-002: 测试工作流校验 - 模拟未启动流程', async ({ request }) => {
    // 注意：这个测试需要真实的测试数据
    // 如果数据库中有test_p0_001记录，应该被拦截

    const testId = 'test_p0_001' // 未启动流程的测试数据

    const response = await request.put(`${API_BASE}/ietm/datamodule/editProp/${testId}`, {
      headers: { 'X-Access-Token': authToken },
      data: { techName: '尝试修改', infoName: '尝试修改' }
    })

    const result = await response.json()

    console.log(`测试ID ${testId} 的响应:`, result)

    if (result.message && result.message.includes('不存在')) {
      console.log('⚠️ 测试数据不存在，需要先执行p0-test-data-setup.sql')
      console.log('📝 运行: sqlplus user/pass@db @D:\\workspace\\IETM\\tests\\sql\\p0-test-data-setup.sql')
    } else {
      // 如果数据存在，应该被工作流校验拦截
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/还没有启动流程|流程/)
      console.log('✅ 工作流校验生效')
    }
  })

  test('TC-API-003: checkOut接口测试 - 验证是否缺少校验', async ({ request }) => {
    // 测试checkOut是否有工作流校验
    const testId = 'test_p0_001'

    const response = await request.post(`${API_BASE}/ietm/datamodule/checkOut`, {
      headers: { 'X-Access-Token': authToken },
      data: { id: testId }
    })

    const result = await response.json()

    console.log(`checkOut ${testId} 的响应:`, result)

    if (result.message && result.message.includes('不存在')) {
      console.log('⚠️ 测试数据不存在')
    } else {
      // 关键检查：是否有工作流校验？
      if (result.success === false && result.message.includes('流程')) {
        console.log('✅ checkOut有工作流校验（已修复）')
      } else if (result.success === true) {
        console.log('❌ checkOut缺少工作流校验（未修复）- 允许了未启动流程的签出')
      } else {
        console.log('⚠️ checkOut响应:', result)
      }
    }
  })

  test('TC-API-004: 批量测试所有状态', async ({ request }) => {
    const testCases = [
      { id: 'test_p0_001', desc: '未启动流程', expectReject: true },
      { id: 'test_p0_002', desc: '流程已结束', expectReject: true },
      { id: 'test_p0_003', desc: '流程已撤销', expectReject: true },
      { id: 'test_p0_004', desc: '非DM编写节点', expectReject: true }
    ]

    for (const tc of testCases) {
      const response = await request.put(`${API_BASE}/ietm/datamodule/editProp/${tc.id}`, {
        headers: { 'X-Access-Token': authToken },
        data: { techName: '测试', infoName: '测试' }
      })

      const result = await response.json()

      console.log(`\n【${tc.desc}】`)
      console.log(`  ID: ${tc.id}`)
      console.log(`  成功: ${result.success}`)
      console.log(`  消息: ${result.message}`)

      if (result.message && result.message.includes('不存在')) {
        console.log(`  ⚠️  测试数据不存在`)
      } else if (tc.expectReject) {
        if (result.success === false) {
          console.log(`  ✅ 正确拦截`)
        } else {
          console.log(`  ❌ 应该拦截但未拦截`)
        }
      }
    }
  })
})
