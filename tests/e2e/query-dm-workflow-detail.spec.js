// 查询详细的DM工作流信息
import { test } from '@playwright/test'

const API_BASE = 'http://127.0.0.1:9999/jeecg-boot'
const TEST_USER = { username: 'admin', password: '123456' }
const PROJECT_ID = '2078348945532030978'

test('查询DM详细信息', async ({ request }) => {
  const loginResp = await request.post(`${API_BASE}/sys/login`, {
    data: TEST_USER
  })
  const loginData = await loginResp.json()
  const token = loginData.result.token

  const dmResp = await request.get(
    `${API_BASE}/ietm/datamodule/list?pageNo=1&pageSize=20&projectId=${PROJECT_ID}`,
    { headers: { 'X-Access-Token': token } }
  )
  const dmData = await dmResp.json()

  console.log('\n所有DM详细信息:\n')
  dmData.result.records.forEach((dm, i) => {
    console.log(`${i+1}. ID: ${dm.id}`)
    console.log(`   DMC: ${dm.dmcCode}`)
    console.log(`   技术名称: ${dm.techName}`)
    console.log(`   签出状态: ${dm.checkoutUser ? '已签出 by ' + dm.checkoutUser : '未签出'}`)
    console.log(`   工作流实例ID: ${dm.workflowInstanceId || 'NULL'}`)
    console.log(`   工作流状态: ${dm.workflowStatus || 'NULL'} (${
      !dm.workflowStatus ? '未启动' :
      dm.workflowStatus === '0' ? '已结束' :
      dm.workflowStatus === '1' ? '流转中' :
      dm.workflowStatus === '2' ? '已撤销' : '未知'
    })`)
    console.log(`   工作流步骤: ${dm.workflowStep || 'NULL'}`)
    console.log(`   工作流处理人: ${dm.workflowHandler || 'NULL'}`)
    console.log('')
  })

  // 分类统计
  const stats = {
    未启动: dmData.result.records.filter(d => !d.workflowStatus),
    流转中: dmData.result.records.filter(d => d.workflowStatus === '1'),
    已结束: dmData.result.records.filter(d => d.workflowStatus === '0'),
    已撤销: dmData.result.records.filter(d => d.workflowStatus === '2'),
    已签出: dmData.result.records.filter(d => d.checkoutUser),
    DM编写节点: dmData.result.records.filter(d => d.workflowStep === 'DM编写'),
    有工作流步骤: dmData.result.records.filter(d => d.workflowStep)
  }

  console.log('='.repeat(60))
  console.log('数据统计:')
  console.log(`  总数: ${dmData.result.records.length}`)
  console.log(`  未启动流程: ${stats.未启动.length}`)
  console.log(`  流转中: ${stats.流转中.length}`)
  console.log(`  已结束: ${stats.已结束.length}`)
  console.log(`  已撤销: ${stats.已撤销.length}`)
  console.log(`  已签出: ${stats.已签出.length}`)
  console.log(`  DM编写节点: ${stats.DM编写节点.length}`)
  console.log(`  有工作流步骤: ${stats.有工作流步骤.length}`)
  console.log('='.repeat(60))

  if (stats.流转中.length > 0 && stats.有工作流步骤.length === 0) {
    console.log('\n⚠️ 发现问题：')
    console.log('  - 有DM的workflowStatus=1（流转中）')
    console.log('  - 但workflowStep为NULL')
    console.log('  - 可能原因：v_wf_instance视图未正确关联或工作流实例数据缺失')
  }
})
