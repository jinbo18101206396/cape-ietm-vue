// 查询数据库中的真实DM数据
import { test, expect } from '@playwright/test'

const API_BASE = 'http://127.0.0.1:9999/jeecg-boot'
const TEST_USER = { username: 'admin', password: '123456' }

test('查询数据库中的DM数据', async ({ request }) => {
  // 登录
  const loginResp = await request.post(`${API_BASE}/sys/login`, {
    data: TEST_USER
  })
  const loginData = await loginResp.json()
  const token = loginData.result.token
  console.log('✅ 登录成功')

  // 查询项目列表
  const projectResp = await request.get(`${API_BASE}/ietm/project/queryAll`, {
    headers: { 'X-Access-Token': token }
  })

  if (projectResp.status() === 404) {
    console.log('⚠️ 项目查询接口404，尝试其他方式')

    // 尝试直接使用一个通用projectId
    const testProjectIds = ['1', 'test', '*', 'all']

    for (const pid of testProjectIds) {
      console.log(`\n尝试 projectId=${pid}`)
      const dmResp = await request.get(
        `${API_BASE}/ietm/datamodule/list?pageNo=1&pageSize=20&projectId=${pid}`,
        { headers: { 'X-Access-Token': token } }
      )
      const dmData = await dmResp.json()

      if (dmData.success && dmData.result.total > 0) {
        console.log(`✅ 找到 ${dmData.result.total} 条DM数据 (projectId=${pid})`)

        // 显示前5条
        dmData.result.records.slice(0, 5).forEach((dm, i) => {
          console.log(`\n${i+1}. ID: ${dm.id}`)
          console.log(`   DMC: ${dm.dmcCode || dm.dmCode}`)
          console.log(`   技术名称: ${dm.techName}`)
          console.log(`   签出状态: ${dm.checkoutFlag} (${dm.checkoutFlag === '1' ? '已签出' : '未签出'})`)
          console.log(`   工作流ID: ${dm.workflowInstanceId || 'NULL'}`)
          console.log(`   工作流状态: ${dm.workflowStatus || 'NULL'} (${
            !dm.workflowStatus ? '未启动' :
            dm.workflowStatus === '0' ? '已结束' :
            dm.workflowStatus === '1' ? '流转中' :
            dm.workflowStatus === '2' ? '已撤销' : '未知'
          })`)
          console.log(`   工作流步骤: ${dm.workflowStep || 'N/A'}`)
        })

        // 统计各种状态
        const stats = {
          未启动: dmData.result.records.filter(d => !d.workflowStatus).length,
          流转中: dmData.result.records.filter(d => d.workflowStatus === '1').length,
          已结束: dmData.result.records.filter(d => d.workflowStatus === '0').length,
          已撤销: dmData.result.records.filter(d => d.workflowStatus === '2').length,
          已签出: dmData.result.records.filter(d => d.checkoutFlag === '1').length,
          DM编写节点: dmData.result.records.filter(d => d.workflowStep === 'DM编写').length
        }

        console.log('\n📊 数据统计:')
        console.log(`  总数: ${dmData.result.total}`)
        console.log(`  未启动流程: ${stats.未启动}`)
        console.log(`  流转中: ${stats.流转中}`)
        console.log(`  已结束: ${stats.已结束}`)
        console.log(`  已撤销: ${stats.已撤销}`)
        console.log(`  已签出: ${stats.已签出}`)
        console.log(`  DM编写节点: ${stats.DM编写节点}`)

        break
      } else {
        console.log(`  无数据 (total=${dmData.result?.total || 0})`)
      }
    }
  }
})
