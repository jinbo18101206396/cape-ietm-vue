/**
 * 验证历史版本显示修复
 * 问题：签入时归档原版本导致历史版本列表只显示最新版本
 * 修复：删除签入时的归档逻辑，保留原版本为 status='1'
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function login() {
  console.log('🔐 登录中...')
  const res = await axios.post(`${BASE_URL}/sys/login`, {
    username: 'admin',
    password: '123456'
  })
  if (res.data.success) {
    console.log('✅ 登录成功\n')
    return res.data.result.token
  }
  throw new Error('登录失败: ' + res.data.message)
}

async function testHistoryVersionsFix(token) {
  console.log('========================================')
  console.log('测试场景：签出→编辑→签入后，检查历史版本列表')
  console.log('========================================\n')

  // 步骤1: 创建测试DM
  console.log('步骤1: 创建测试DM...')
  const timestamp = Date.now()
  const createRes = await axios.post(`${BASE_URL}/ietm/datamodule/add`, {
    projectId: '1',
    sns: `TEST-HIS-${timestamp}`,
    infoCode: '001',
    infoCodeVariant: null,
    ietmLocationCode: 'D',
    languageIsoCode: 'zh',
    countryIsoCode: 'CN',
    dmType: 'descript',
    techName: '测试历史版本显示',
    infoName: '初始版本',
    originator: 'S1000D',
    cmNodeId: '1'
  }, {
    headers: { 'X-Access-Token': token }
  })

  if (!createRes.data.success) {
    console.log('❌ 创建DM失败:', createRes.data.message)
    return
  }

  // result直接是ID字符串
  const dmId = createRes.data.result
  console.log(`✅ 创建成功，ID=${dmId}\n`)

  // 查询DM详情获取完整信息
  const detailRes = await axios.get(`${BASE_URL}/ietm/datamodule/queryById?id=${dmId}`, {
    headers: { 'X-Access-Token': token }
  })
  const sns = detailRes.data.result.sns
  const infoCode = detailRes.data.result.infoCode

  // 步骤2: 检查初始历史版本（应该只有1个）
  console.log('步骤2: 检查初始历史版本...')
  let historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  let versions = historyRes.data.result || []
  console.log(`当前历史版本数: ${versions.length}`)
  console.log(`版本列表: ${versions.map(v => `${v.issueNo}-${v.inWork}`).join(', ')}\n`)

  // 步骤3: 第1次签出
  console.log('步骤3: 第1次签出...')
  const checkout1Res = await axios.post(`${BASE_URL}/ietm/datamodule/checkOut?id=${dmId}`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkout1Res.data.success) {
    console.log('❌ 签出失败:', checkout1Res.data.message)
    return
  }
  console.log(`✅ 签出成功\n`)

  // 步骤4: 获取新版本ID
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  versions = historyRes.data.result || []
  const newVersionId = versions.find(v => v.isLatest === '1')?.id

  // 步骤5: 第1次签入
  console.log('步骤4: 第1次签入...')
  const checkin1Res = await axios.post(`${BASE_URL}/ietm/datamodule/checkIn?id=${newVersionId}&comment=第1次签入`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkin1Res.data.success) {
    console.log('❌ 签入失败:', checkin1Res.data.message)
    return
  }
  console.log(`✅ 签入成功\n`)

  // 步骤6: 检查历史版本（应该有2个：001-00 和 001-01）
  console.log('步骤5: 检查第1次签入后的历史版本...')
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  versions = historyRes.data.result || []
  console.log(`✅ 历史版本数: ${versions.length}`)

  versions.forEach((v, idx) => {
    console.log(`  版本${idx + 1}: ${v.issueNo}-${v.inWork}, isLatest=${v.isLatest}, status=${v.status}`)
  })

  if (versions.length === 1) {
    console.log('\n❌ BUG未修复！只显示1个版本（最新版本）')
    console.log('   原因：签入时将原版本归档为 status=\'0\'，导致查询不到')
    return
  } else if (versions.length === 2) {
    console.log('\n✅ 修复成功！显示2个版本（包含历史版本）')
  }

  // 步骤7: 第2次签出→签入，再次验证
  console.log('\n步骤6: 第2次签出...')
  const latestId = versions.find(v => v.isLatest === '1')?.id
  const checkout2Res = await axios.post(`${BASE_URL}/ietm/datamodule/checkOut?id=${latestId}`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkout2Res.data.success) {
    console.log('❌ 签出失败:', checkout2Res.data.message)
    return
  }
  console.log(`✅ 签出成功\n`)

  // 获取新版本ID
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })
  versions = historyRes.data.result || []
  const newVersion2Id = versions.find(v => v.isLatest === '1')?.id

  console.log('步骤7: 第2次签入...')
  const checkin2Res = await axios.post(`${BASE_URL}/ietm/datamodule/checkIn?id=${newVersion2Id}&comment=第2次签入`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkin2Res.data.success) {
    console.log('❌ 签入失败:', checkin2Res.data.message)
    return
  }
  console.log(`✅ 签入成功\n`)

  // 步骤8: 最终检查（应该有3个版本：001-00, 001-01, 001-02）
  console.log('步骤8: 检查第2次签入后的历史版本...')
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  versions = historyRes.data.result || []
  console.log(`✅ 历史版本数: ${versions.length}`)

  versions.forEach((v, idx) => {
    console.log(`  版本${idx + 1}: ${v.issueNo}-${v.inWork}, isLatest=${v.isLatest}, status=${v.status}`)
  })

  console.log('\n========================================')
  console.log('测试总结')
  console.log('========================================')

  if (versions.length === 1) {
    console.log('❌ BUG未修复！历史版本列表只显示最新版本')
    console.log('   说明：签入时仍在归档原版本')
  } else if (versions.length === 3) {
    console.log('✅✅✅ 修复完全成功！')
    console.log('   - 创建初始版本: 001-00')
    console.log('   - 第1次签出→签入: 001-01（保留 001-00 为历史版本）')
    console.log('   - 第2次签出→签入: 001-02（保留 001-00, 001-01 为历史版本）')
    console.log('   - 历史版本列表正确显示所有3个版本')
  } else {
    console.log(`⚠️  版本数不符合预期: ${versions.length}`)
  }

  // 清理测试数据
  console.log('\n清理测试数据...')
  for (const v of versions) {
    await axios.delete(`${BASE_URL}/ietm/datamodule/delete?id=${v.id}`, {
      headers: { 'X-Access-Token': token }
    }).catch(() => {})
  }
  console.log('✅ 测试数据已清理')
}

async function main() {
  try {
    const token = await login()
    await testHistoryVersionsFix(token)
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message)
    if (err.response) {
      console.error('响应:', err.response.data)
    }
  }
}

main()
