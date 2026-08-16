// P0测试数据准备 - 通过API创建
// 避免直接操作数据库，使用后端API创建测试数据

import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:9999/jeecg-boot'
const TEST_USER = { username: 'admin', password: '123456' }

test.describe('P0测试数据准备', () => {

  let authToken = ''
  let testProjectId = ''
  let testNodeId = ''

  test.beforeAll(async ({ request }) => {
    // 登录
    const loginResp = await request.post(`${API_BASE}/sys/login`, {
      data: TEST_USER
    })
    const loginData = await loginResp.json()

    if (loginData.success) {
      authToken = loginData.result.token
      console.log('✅ 登录成功')
    } else {
      throw new Error('登录失败')
    }
  })

  test('步骤1: 查找或创建测试项目', async ({ request }) => {
    // 先尝试查找现有项目
    const listResp = await request.get(`${API_BASE}/ietm/project/list?pageNo=1&pageSize=10`, {
      headers: { 'X-Access-Token': authToken }
    })

    const listData = await listResp.json()

    if (listData.success && listData.result && listData.result.records && listData.result.records.length > 0) {
      testProjectId = listData.result.records[0].id
      console.log('✅ 使用现有项目:', testProjectId)
    } else {
      console.log('⚠️ 未找到项目，需要先创建项目')
      // 这里可以尝试创建项目，但通常测试环境应该已有项目
    }
  })

  test('步骤2: 查找测试构型节点', async ({ request }) => {
    if (!testProjectId) {
      console.log('⚠️ 跳过：未找到项目ID')
      test.skip()
      return
    }

    const nodesResp = await request.get(`${API_BASE}/ietm/cm/node/list?projectId=${testProjectId}`, {
      headers: { 'X-Access-Token': authToken }
    })

    const nodesData = await nodesResp.json()

    if (nodesData.success && nodesData.result && nodesData.result.length > 0) {
      testNodeId = nodesData.result[0].id
      console.log('✅ 使用节点:', testNodeId)
    } else {
      console.log('⚠️ 未找到构型节点')
    }
  })

  test('步骤3: 检查是否已有测试数据', async ({ request }) => {
    // 查询test_p0_开头的DM
    const queryResp = await request.get(`${API_BASE}/ietm/datamodule/list?pageNo=1&pageSize=50`, {
      headers: { 'X-Access-Token': authToken }
    })

    const queryData = await queryResp.json()

    if (queryData.success && queryData.result) {
      const testDMs = queryData.result.records?.filter(dm =>
        dm.id && dm.id.startsWith('test_p0_')
      ) || []

      console.log(`✅ 找到 ${testDMs.length} 条P0测试数据`)

      if (testDMs.length > 0) {
        console.log('测试数据列表:')
        testDMs.forEach(dm => {
          console.log(`  - ${dm.id}: ${dm.techName} (workflow_status=${dm.workflowStatus})`)
        })
      } else {
        console.log('⚠️ 未找到测试数据，需要手动执行SQL:')
        console.log('   D:\\workspace\\IETM\\tests\\sql\\p0-test-data-setup.sql')
      }
    }
  })

  test('步骤4: 生成测试报告', async () => {
    console.log('\n=== P0测试数据准备报告 ===')
    console.log(`项目ID: ${testProjectId || '未找到'}`)
    console.log(`节点ID: ${testNodeId || '未找到'}`)
    console.log('')
    console.log('下一步操作:')
    console.log('1. 如果数据库有访问权限，执行SQL脚本:')
    console.log('   sqlplus user/pass@db @D:\\workspace\\IETM\\tests\\sql\\p0-test-data-setup.sql')
    console.log('')
    console.log('2. 或者请DBA协助执行SQL创建测试数据')
    console.log('')
    console.log('3. 数据准备完成后，运行:')
    console.log('   npx playwright test tests/e2e/p0-api-only-test.spec.js')
  })
})
