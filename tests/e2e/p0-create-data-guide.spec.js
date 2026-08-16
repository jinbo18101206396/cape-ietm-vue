// 通过后端API创建P0测试数据
// 避免直接操作数据库

import { test } from '@playwright/test'

const API_BASE = 'http://localhost:9999/jeecg-boot'
const TEST_USER = { username: 'admin', password: '123456' }

test.describe('通过API创建P0测试数据', () => {

  let authToken = ''

  test.beforeAll(async ({ request }) => {
    const loginResp = await request.post(`${API_BASE}/sys/login`, {
      data: TEST_USER
    })
    const loginData = await loginResp.json()
    authToken = loginData.result.token
    console.log('✅ 已登录')
  })

  test('创建测试数据', async ({ request }) => {
    console.log('\n=== 开始创建P0测试数据 ===\n')

    // 测试数据配置
    const testCases = [
      {
        id: 'test_p0_001',
        techName: '测试-未启动流程',
        workflowStatus: null,
        workflowStep: null,
        checkoutUser: null
      },
      {
        id: 'test_p0_002',
        techName: '测试-流程已结束',
        workflowStatus: '0',
        workflowStep: null,
        checkoutUser: null
      },
      {
        id: 'test_p0_003',
        techName: '测试-流程已撤销',
        workflowStatus: '2',
        workflowStep: '技术审核',
        checkoutUser: null
      },
      {
        id: 'test_p0_004',
        techName: '测试-技术审核中',
        workflowStatus: '1',
        workflowStep: '技术审核',
        checkoutUser: null
      },
      {
        id: 'test_p0_007',
        techName: '测试-正常未签出',
        workflowStatus: '1',
        workflowStep: 'DM编写',
        checkoutUser: null
      }
    ]

    // 注意：通过API创建DM时，部分字段（如workflow_status）可能无法直接设置
    // 因为这些字段由后端业务逻辑控制
    // 这里仅作演示，真实测试数据仍需SQL脚本创建

    console.log('⚠️ 警告：通过API无法直接设置workflow_status等字段')
    console.log('⚠️ 这些字段由工作流引擎管理，不能通过add接口设置')
    console.log('')
    console.log('✅ 推荐方案：手动执行SQL脚本')
    console.log('   文件位置: D:\\workspace\\IETM\\tests\\sql\\p0-test-data-setup.sql')
    console.log('')
    console.log('📝 执行方式：')
    console.log('   1. 打开DM数据管理工具（Manager工具）')
    console.log('   2. 连接到: 127.0.0.1:5236')
    console.log('   3. 用户: IETM / AvicCape301')
    console.log('   4. 打开SQL文件并执行')
    console.log('')
    console.log('或者使用命令行：')
    console.log('   disql IETM/AvicCape301@127.0.0.1:5236')
    console.log('   SQL> @D:\\workspace\\IETM\\tests\\sql\\p0-test-data-setup.sql')
  })
})
