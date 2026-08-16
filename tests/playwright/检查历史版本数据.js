/**
 * 检查历史版本数据问题：为什么只显示最新版本？
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:9999/jeecg-boot'
let token = ''

async function login() {
  const res = await axios.post(`${BASE_URL}/sys/login`, {
    username: 'admin',
    password: 'Admin@123'
  })
  if (res.data.success) {
    token = res.data.result.token
    console.log('✅ 登录成功')
  } else {
    throw new Error('登录失败: ' + res.data.message)
  }
}

async function checkHistoryData() {
  console.log('\n========== 第1步：查询现有DM列表（随机取一个） ==========')

  const listRes = await axios.get(`${BASE_URL}/ietm/datamodule/list`, {
    headers: { 'X-Access-Token': token },
    params: { pageNo: 1, pageSize: 10 }
  })

  if (!listRes.data.success || !listRes.data.result.records.length) {
    console.log('❌ 没有找到DM数据')
    return
  }

  const firstDm = listRes.data.result.records[0]
  console.log(`\n找到DM：`)
  console.log(`  ID: ${firstDm.id}`)
  console.log(`  DMC: ${firstDm.dmcCode}`)
  console.log(`  SNS: ${firstDm.sns}`)
  console.log(`  InfoCode: ${firstDm.infoCode}`)
  console.log(`  InfoCodeVariant: ${firstDm.infoCodeVariant}`)
  console.log(`  IssueNo: ${firstDm.issueNo}`)
  console.log(`  InWork: ${firstDm.inWork}`)
  console.log(`  IsLatest: ${firstDm.isLatest}`)
  console.log(`  VersionType: ${firstDm.versionType}`)

  console.log('\n========== 第2步：直接查询数据库该DM的所有版本 ==========')

  // 模拟SQL：SELECT * FROM ietm_data_module WHERE status='1' AND sns=? AND info_code=?
  const dbCheckRes = await axios.get(`${BASE_URL}/ietm/datamodule/list`, {
    headers: { 'X-Access-Token': token },
    params: {
      pageNo: 1,
      pageSize: 100
      // 注意：这个list接口默认带 is_latest='1' 过滤，所以只能看到最新版本
    }
  })

  console.log(`\n⚠️  注意：/list接口默认带 is_latest='1' 过滤，只返回最新版本`)
  console.log(`   所以我们需要用 /historyVersions 接口查询所有版本`)

  console.log('\n========== 第3步：调用historyVersions接口 ==========')

  const historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
    headers: { 'X-Access-Token': token },
    params: {
      sns: firstDm.sns,
      infoCode: firstDm.infoCode,
      infoCodeVariant: firstDm.infoCodeVariant || '',
      onlyPublished: false
    }
  })

  if (!historyRes.data.success) {
    console.log('❌ 查询历史版本失败:', historyRes.data.message)
    return
  }

  const versions = historyRes.data.result || []
  console.log(`\n📊 查询参数：`)
  console.log(`   SNS: ${firstDm.sns}`)
  console.log(`   InfoCode: ${firstDm.infoCode}`)
  console.log(`   InfoCodeVariant: ${firstDm.infoCodeVariant || '(null)'}`)
  console.log(`   OnlyPublished: false`)

  console.log(`\n📊 查询结果：共 ${versions.length} 个版本`)

  if (versions.length === 0) {
    console.log('\n⚠️  问题原因：数据库中没有匹配的历史版本数据！')
    console.log('   可能原因：')
    console.log('   1. 该DM确实只有一个版本（从未发布过新版本）')
    console.log('   2. infoCodeVariant匹配问题（数据库是null但查询传了空字符串？）')
    return
  }

  console.log('\n版本列表：')
  versions.forEach((v, idx) => {
    console.log(`\n  版本${idx + 1}:`)
    console.log(`    ID: ${v.id}`)
    console.log(`    IssueNo-InWork: ${v.issueNo}-${v.inWork}`)
    console.log(`    IsLatest: ${v.isLatest}`)
    console.log(`    VersionType: ${v.versionType} (${v.versionType === '1' ? '发布版' : '草稿版'})`)
    console.log(`    DmContent: ${v.dmContent ? '✅ 有值' : '❌ 无值'}`)
    console.log(`    CreateTime: ${v.createTime}`)
  })

  console.log('\n========== 第4步：分析数据问题 ==========')

  const latestCount = versions.filter(v => v.isLatest === '1').length
  const publishedCount = versions.filter(v => v.versionType === '1').length
  const draftCount = versions.filter(v => v.versionType === '0').length

  console.log(`\n统计：`)
  console.log(`  总版本数: ${versions.length}`)
  console.log(`  最新版本(is_latest=1): ${latestCount} 个`)
  console.log(`  发布版本(version_type=1): ${publishedCount} 个`)
  console.log(`  草稿版本(version_type=0): ${draftCount} 个`)

  if (versions.length === 1 && latestCount === 1) {
    console.log('\n❗ 问题原因：')
    console.log('   数据库中该DM确实只有1个版本（最新版本）')
    console.log('   这不是SQL查询的问题，而是数据本身就只有一条记录')
    console.log('\n💡 解决方案：')
    console.log('   需要创建该DM的历史版本（比如通过发布新版本）')
  } else if (versions.length > 1) {
    console.log('\n✅ 数据正常：')
    console.log('   数据库中有多个版本，historyVersions接口返回正常')
    console.log('   如果前端只显示1个，可能是前端渲染问题')
  }
}

async function main() {
  try {
    await login()
    await checkHistoryData()
  } catch (err) {
    console.error('\n❌ 错误:', err.message)
    if (err.response) {
      console.error('响应数据:', err.response.data)
    }
  }
}

main()
