/**
 * 完整验证：通过API创建→签出→签入→查询历史版本
 * 直接验证修复效果，无需依赖现有数据
 */

const axios = require('axios')
const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function login() {
  const res = await axios.post(`${BASE_URL}/sys/login`, {
    username: 'admin',
    password: '123456'
  })
  if (!res.data.success) {
    throw new Error('登录失败: ' + res.data.message)
  }
  return res.data.result.token
}

async function createDmDirect(token) {
  console.log('步骤1: 通过API创建测试DM...')

  // 先获取项目和构型节点
  const projectRes = await axios.get(`${BASE_URL}/ietm/project/list`, {
    headers: { 'X-Access-Token': token },
    params: { pageNo: 1, pageSize: 1 }
  })

  if (!projectRes.data.success || !projectRes.data.result || projectRes.data.result.length === 0) {
    throw new Error('没有找到项目，请先创建项目')
  }

  const projectId = projectRes.data.result[0].id
  console.log(`  找到项目ID: ${projectId}`)

  // 获取构型节点
  const nodeRes = await axios.get(`${BASE_URL}/ietm/cmnode/queryByProject`, {
    headers: { 'X-Access-Token': token },
    params: { projectId }
  })

  if (!nodeRes.data.success || !nodeRes.data.result || nodeRes.data.result.length === 0) {
    throw new Error('没有找到构型节点')
  }

  const cmNodeId = nodeRes.data.result[0].id
  console.log(`  找到构型节点ID: ${cmNodeId}`)

  // 创建DM
  const timestamp = Date.now()
  const createRes = await axios.post(`${BASE_URL}/ietm/datamodule/add`, {
    projectId: projectId,
    sns: `HIST-TEST-${timestamp}`,
    infoCode: '999',
    infoCodeVariant: null,
    ietmLocationCode: 'D',
    languageIsoCode: 'zh',
    countryIsoCode: 'CN',
    dmType: 'descript',
    techName: '历史版本测试DM',
    infoName: '初始版本',
    originator: 'S1000D',
    cmNodeId: cmNodeId
  }, {
    headers: { 'X-Access-Token': token }
  })

  if (!createRes.data.success) {
    throw new Error('创建DM失败: ' + createRes.data.message)
  }

  // 从返回消息中无法获取ID，需要通过查询获取
  const sns = `HIST-TEST-${timestamp}`
  const infoCode = '999'

  // 通过historyVersions查询刚创建的DM
  await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒确保数据已写入

  const historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  if (!historyRes.data.success || !historyRes.data.result || historyRes.data.result.length === 0) {
    throw new Error('创建后无法查询到DM')
  }

  const dm = historyRes.data.result[0]
  console.log(`✅ 创建成功:`)
  console.log(`   ID: ${dm.id}`)
  console.log(`   DMC: ${dm.dmcCode}`)
  console.log(`   版本: ${dm.issueNo}-${dm.inWork}\n`)

  return { dm, sns, infoCode }
}

async function testCheckoutCheckin(token, dm, sns, infoCode) {
  console.log('步骤2: 查询初始历史版本...')
  let historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  const beforeVersions = historyRes.data.result || []
  console.log(`  初始版本数: ${beforeVersions.length}`)
  beforeVersions.forEach(v => {
    console.log(`    - ${v.issueNo}-${v.inWork} (isLatest=${v.isLatest})`)
  })
  console.log()

  // 签出
  console.log('步骤3: 签出DM...')
  const checkoutRes = await axios.post(
    `${BASE_URL}/ietm/datamodule/checkOut?id=${dm.id}`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkoutRes.data.success) {
    throw new Error('签出失败: ' + checkoutRes.data.message)
  }
  console.log('✅ 签出成功\n')

  // 查询签出后的版本
  console.log('步骤4: 查询签出后的历史版本...')
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  const afterCheckoutVersions = historyRes.data.result || []
  console.log(`  签出后版本数: ${afterCheckoutVersions.length}`)
  afterCheckoutVersions.forEach(v => {
    console.log(`    - ${v.issueNo}-${v.inWork} (isLatest=${v.isLatest})`)
  })
  console.log()

  if (afterCheckoutVersions.length !== beforeVersions.length + 1) {
    throw new Error(`签出后版本数不正确: 期望 ${beforeVersions.length + 1}, 实际 ${afterCheckoutVersions.length}`)
  }

  // 找到新版本
  const newVersion = afterCheckoutVersions.find(v => v.isLatest === '1')
  if (!newVersion) {
    throw new Error('未找到签出后的新版本')
  }

  // 签入
  console.log('步骤5: 签入DM...')
  const checkinRes = await axios.post(
    `${BASE_URL}/ietm/datamodule/checkIn?id=${newVersion.id}&comment=测试签入`,
    {},
    { headers: { 'X-Access-Token': token } }
  )

  if (!checkinRes.data.success) {
    throw new Error('签入失败: ' + checkinRes.data.message)
  }
  console.log('✅ 签入成功\n')

  // 关键验证：签入后的历史版本数
  console.log('步骤6: 【关键验证】查询签入后的历史版本...')
  historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  const afterCheckinVersions = historyRes.data.result || []
  console.log(`  签入后版本数: ${afterCheckinVersions.length}`)
  afterCheckinVersions.forEach(v => {
    console.log(`    - ${v.issueNo}-${v.inWork} (isLatest=${v.isLatest})`)
  })
  console.log()

  return {
    beforeCount: beforeVersions.length,
    afterCheckoutCount: afterCheckoutVersions.length,
    afterCheckinCount: afterCheckinVersions.length
  }
}

async function cleanup(token, sns, infoCode) {
  console.log('步骤7: 清理测试数据...')
  const historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: { sns, infoCode, infoCodeVariant: '', onlyPublished: false }
  })

  const versions = historyRes.data.result || []
  for (const v of versions) {
    await axios.delete(`${BASE_URL}/ietm/datamodule/delete?id=${v.id}`, {
      headers: { 'X-Access-Token': token }
    }).catch(() => {})
  }
  console.log(`✅ 已清理 ${versions.length} 个版本\n`)
}

async function main() {
  console.log('========================================')
  console.log('历史版本显示修复 - 完整验证')
  console.log('========================================\n')

  try {
    const token = await login()
    console.log('✅ 登录成功\n')

    const { dm, sns, infoCode } = await createDmDirect(token)

    const result = await testCheckoutCheckin(token, dm, sns, infoCode)

    await cleanup(token, sns, infoCode)

    // 最终判断
    console.log('========================================')
    console.log('测试结果')
    console.log('========================================\n')

    console.log('版本数变化:')
    console.log(`  创建后: ${result.beforeCount} 个版本`)
    console.log(`  签出后: ${result.afterCheckoutCount} 个版本 (+${result.afterCheckoutCount - result.beforeCount})`)
    console.log(`  签入后: ${result.afterCheckinCount} 个版本`)
    console.log()

    if (result.afterCheckinCount === result.beforeCount) {
      console.log('❌❌❌ 修复失败！')
      console.log('现象: 签入后版本数 = 创建后版本数（签出前的版本被归档了）')
      console.log('原因: 签入时将原版本 status 改为 \'0\'，查询时查不到')
      console.log('结论: BUG未修复，历史版本列表只显示最新版本\n')
      process.exit(1)
    } else if (result.afterCheckinCount === result.afterCheckoutCount) {
      console.log('✅✅✅ 修复成功！')
      console.log('现象: 签入后版本数 = 签出后版本数（原版本被保留了）')
      console.log('原因: 签入时保留原版本 status=\'1\'，可以被正常查询')
      console.log('结论: 历史版本列表可以正常显示所有版本\n')

      console.log('验证通过：')
      console.log(`  ✅ 签出时创建了新版本 (${result.afterCheckoutCount - result.beforeCount} 个)`)
      console.log(`  ✅ 签入时保留了原版本 (共 ${result.afterCheckinCount} 个)`)
      console.log(`  ✅ 历史版本查询返回完整列表`)
      console.log()
    } else {
      console.log('⚠️  版本数变化异常')
      console.log(`  期望: ${result.afterCheckoutCount}`)
      console.log(`  实际: ${result.afterCheckinCount}`)
      console.log()
    }

  } catch (err) {
    console.error('\n❌ 测试失败:', err.message)
    if (err.response?.data) {
      console.error('响应:', JSON.stringify(err.response.data, null, 2))
    }
    process.exit(1)
  }
}

main()
