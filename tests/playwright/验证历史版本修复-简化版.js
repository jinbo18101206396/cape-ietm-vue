/**
 * 简化版：验证历史版本显示修复
 * 使用现有DM进行测试，避免创建DM的复杂性
 */

const axios = require('axios')
const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function login() {
  const res = await axios.post(`${BASE_URL}/sys/login`, {
    username: 'admin',
    password: '123456'
  })
  if (res.data.success) {
    console.log('✅ 登录成功\n')
    return res.data.result.token
  }
  throw new Error('登录失败')
}

async function testHistoryVersionsFix(token) {
  console.log('========================================')
  console.log('测试：验证历史版本显示修复')
  console.log('========================================\n')

  // 步骤1: 获取第一个草稿版本DM（可以签出的）
  console.log('步骤1: 查找可签出的DM...')
  const listRes = await axios.get(`${BASE_URL}/ietm/datamodule/list`, {
    headers: { 'X-Access-Token': token },
    params: { pageNo: 1, pageSize: 100 }
  })

  const draftDm = listRes.data.result.records.find(dm =>
    dm.versionType === '0' && !dm.checkoutUser
  )

  if (!draftDm) {
    console.log('⚠️  没有找到可签出的草稿DM，跳过测试')
    return
  }

  console.log(`✅ 找到DM: ${draftDm.dmcCode}`)
  console.log(`   ID: ${draftDm.id}`)
  console.log(`   版本: ${draftDm.issueNo}-${draftDm.inWork}`)
  console.log(`   SNS: ${draftDm.sns}`)
  console.log(`   InfoCode: ${draftDm.infoCode}\n`)

  // 步骤2: 查询签出前的历史版本
  console.log('步骤2: 查询签出前的历史版本...')
  let historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: {
      sns: draftDm.sns,
      infoCode: draftDm.infoCode,
      infoCodeVariant: draftDm.infoCodeVariant || '',
      onlyPublished: false
    }
  })

  const beforeVersions = historyRes.data.result || []
  console.log(`签出前历史版本数: ${beforeVersions.length}`)
  beforeVersions.forEach((v, idx) => {
    console.log(`  ${idx + 1}. ${v.issueNo}-${v.inWork} (isLatest=${v.isLatest}, status=${v.status || '?'})`)
  })
  console.log()

  // 步骤3: 签出
  console.log('步骤3: 签出...')
  const checkoutRes = await axios.post(
    `${BASE_URL}/ietm/datamodule/checkOut?id=${draftDm.id}`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkoutRes.data.success) {
    console.log('❌ 签出失败:', checkoutRes.data.message)
    return
  }
  console.log('✅ 签出成功\n')

  // 步骤4: 查询签出后的历史版本
  console.log('步骤4: 查询签出后的历史版本...')
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: {
      sns: draftDm.sns,
      infoCode: draftDm.infoCode,
      infoCodeVariant: draftDm.infoCodeVariant || '',
      onlyPublished: false
    }
  })

  const afterCheckoutVersions = historyRes.data.result || []
  console.log(`签出后历史版本数: ${afterCheckoutVersions.length}`)
  afterCheckoutVersions.forEach((v, idx) => {
    console.log(`  ${idx + 1}. ${v.issueNo}-${v.inWork} (isLatest=${v.isLatest}, status=${v.status || '?'})`)
  })
  console.log()

  // 步骤5: 找到新版本ID并签入
  const newVersion = afterCheckoutVersions.find(v => v.isLatest === '1')
  if (!newVersion) {
    console.log('❌ 未找到签出后的新版本')
    return
  }

  console.log('步骤5: 签入...')
  const checkinRes = await axios.post(
    `${BASE_URL}/ietm/datamodule/checkIn?id=${newVersion.id}&comment=测试签入`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkinRes.data.success) {
    console.log('❌ 签入失败:', checkinRes.data.message)
    return
  }
  console.log('✅ 签入成功\n')

  // 步骤6: 查询签入后的历史版本（关键验证）
  console.log('步骤6: 查询签入后的历史版本（关键验证）...')
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: {
      sns: draftDm.sns,
      infoCode: draftDm.infoCode,
      infoCodeVariant: draftDm.infoCodeVariant || '',
      onlyPublished: false
    }
  })

  const afterCheckinVersions = historyRes.data.result || []
  console.log(`签入后历史版本数: ${afterCheckinVersions.length}`)
  afterCheckinVersions.forEach((v, idx) => {
    console.log(`  ${idx + 1}. ${v.issueNo}-${v.inWork} (isLatest=${v.isLatest}, status=${v.status || '?'})`)
  })

  // 结果判断
  console.log('\n========================================')
  console.log('测试结果')
  console.log('========================================')

  if (afterCheckinVersions.length === beforeVersions.length) {
    console.log('❌ BUG未修复！签入后历史版本数没有增加')
    console.log(`   签出前: ${beforeVersions.length} 个版本`)
    console.log(`   签入后: ${afterCheckinVersions.length} 个版本`)
    console.log('   原因：签入时将原版本归档为 status=\'0\'')
  } else if (afterCheckinVersions.length === beforeVersions.length + 1) {
    console.log('✅✅✅ 修复成功！')
    console.log(`   签出前: ${beforeVersions.length} 个版本`)
    console.log(`   签出后: ${afterCheckoutVersions.length} 个版本 (+1个工作副本)`)
    console.log(`   签入后: ${afterCheckinVersions.length} 个版本 (保留了原版本作为历史版本)`)
    console.log('\n   说明：签入时正确保留原版本为 status=\'1\'，历史版本列表可以正常显示')
  } else {
    console.log(`⚠️  版本数变化异常`)
    console.log(`   签出前: ${beforeVersions.length}`)
    console.log(`   签入后: ${afterCheckinVersions.length}`)
  }
}

async function main() {
  try {
    const token = await login()
    await testHistoryVersionsFix(token)
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message)
    if (err.response?.data) {
      console.error('响应:', err.response.data)
    }
  }
}

main()
