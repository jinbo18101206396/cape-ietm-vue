// 通过API创建测试DM数据
import { test } from '@playwright/test'

const API_BASE = 'http://127.0.0.1:9999/jeecg-boot'
const TEST_USER = { username: 'admin', password: '123456' }

test('创建测试DM数据', async ({ request }) => {
  // 登录
  const loginResp = await request.post(`${API_BASE}/sys/login`, {
    data: TEST_USER
  })
  const loginData = await loginResp.json()
  const token = loginData.result.token
  console.log('✅ 登录成功')

  // 测试数据配置
  const testDMs = [
    {
      name: 'TC-01: 未启动流程',
      data: {
        modelIdentCode: 'TEST',
        systemDiffCode: 'A',
        systemCode: '00',
        subsystemCode: '00',
        subSubsystemCode: '00',
        assyCode: '00',
        disassyCode: 'A',
        disassyCodeVariant: '001',
        infoCode: 'A',
        infoCodeVariant: 'A',
        itemLocationCode: 'A',
        techName: '未启动流程测试DM',
        infoName: '测试信息',
        dmType: 'description',
        issueNo: '001',
        inWork: '00',
        languageIsoCode: 'zh',
        countryIsoCode: 'CN',
        securityClassification: 'unclassified',
        responsiblePartnerCompany: 'TEST',
        dmContent: '<?xml version="1.0"?><dmodule><content/></dmodule>'
      }
    },
    {
      name: 'TC-02: 正常流程',
      data: {
        modelIdentCode: 'TEST',
        systemDiffCode: 'A',
        systemCode: '00',
        subsystemCode: '00',
        subSubsystemCode: '00',
        assyCode: '00',
        disassyCode: 'A',
        disassyCodeVariant: '002',
        infoCode: 'A',
        infoCodeVariant: 'A',
        itemLocationCode: 'A',
        techName: '正常流程测试DM',
        infoName: '测试信息',
        dmType: 'description',
        issueNo: '001',
        inWork: '00',
        languageIsoCode: 'zh',
        countryIsoCode: 'CN',
        securityClassification: 'unclassified',
        responsiblePartnerCompany: 'TEST',
        dmContent: '<?xml version="1.0"?><dmodule><content/></dmodule>'
      }
    }
  ]

  const createdDMs = []

  for (const testDM of testDMs) {
    console.log(`\n创建: ${testDM.name}`)

    const createResp = await request.post(`${API_BASE}/ietm/datamodule/add`, {
      headers: {
        'X-Access-Token': token,
        'Content-Type': 'application/json'
      },
      data: testDM.data
    })

    const result = await createResp.json()

    if (result.success) {
      console.log(`  ✅ 创建成功 ID=${result.result?.id || 'N/A'}`)
      createdDMs.push({
        name: testDM.name,
        id: result.result?.id,
        data: result.result
      })
    } else {
      console.log(`  ❌ 创建失败: ${result.message}`)
    }
  }

  console.log(`\n✅ 成功创建 ${createdDMs.length}/${testDMs.length} 条测试数据`)

  // 显示创建的DM
  if (createdDMs.length > 0) {
    console.log('\n创建的DM列表:')
    createdDMs.forEach((dm, i) => {
      console.log(`${i+1}. ${dm.name}`)
      console.log(`   ID: ${dm.id}`)
      console.log(`   DMC: ${dm.data?.dmCode || 'N/A'}`)
    })
  }
})
