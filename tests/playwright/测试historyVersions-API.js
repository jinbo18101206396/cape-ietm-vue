/**
 * 直接测试historyVersions API，验证是数据问题还是查询问题
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function testHistoryVersionsAPI() {
  console.log('========== 历史版本API测试 ==========\n')

  // 步骤1: 登录获取token
  console.log('步骤1: 登录...')
  let token
  try {
    const loginRes = await axios.post(`${BASE_URL}/sys/login`, {
      username: 'admin',
      password: 'admin123'
    })
    if (loginRes.data.success) {
      token = loginRes.data.result.token
      console.log('✅ 登录成功\n')
    } else {
      console.log('❌ 登录失败:', loginRes.data.message)
      return
    }
  } catch (err) {
    console.log('❌ 登录异常:', err.message)
    return
  }

  // 步骤2: 获取DM列表（找一个有数据的DM）
  console.log('步骤2: 获取DM列表...')
  let testDm
  try {
    const listRes = await axios.get(`${BASE_URL}/ietm/datamodule/list`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 10 }
    })

    if (listRes.data.success && listRes.data.result.records.length > 0) {
      testDm = listRes.data.result.records[0]
      console.log(`✅ 找到测试DM:`)
      console.log(`   DMC: ${testDm.dmcCode}`)
      console.log(`   SNS: ${testDm.sns}`)
      console.log(`   InfoCode: ${testDm.infoCode}`)
      console.log(`   InfoCodeVariant: ${testDm.infoCodeVariant || '(null)'}`)
      console.log(`   IssueNo-InWork: ${testDm.issueNo}-${testDm.inWork}`)
      console.log(`   IsLatest: ${testDm.isLatest}\n`)
    } else {
      console.log('❌ 没有找到DM数据')
      return
    }
  } catch (err) {
    console.log('❌ 获取DM列表失败:', err.message)
    return
  }

  // 步骤3: 调用historyVersions API（不限制发布版本）
  console.log('步骤3: 调用historyVersions API (onlyPublished=false)...')
  try {
    const historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
      headers: { 'X-Access-Token': token },
      params: {
        sns: testDm.sns,
        infoCode: testDm.infoCode,
        infoCodeVariant: testDm.infoCodeVariant || '',
        onlyPublished: false
      }
    })

    if (historyRes.data.success) {
      const versions = historyRes.data.result || []
      console.log(`✅ API调用成功，返回 ${versions.length} 个版本\n`)

      if (versions.length === 0) {
        console.log('⚠️  返回0个版本！这不应该发生（至少应该有当前版本）')
      } else if (versions.length === 1) {
        console.log('⚠️  只返回1个版本')
        console.log('\n原因分析：')
        console.log('  → 数据库中该DM确实只有1个版本')
        console.log('  → 该DM从未发布过新版本，没有历史版本')
        console.log('  → 这不是BUG，是正常业务场景\n')

        const v = versions[0]
        console.log('唯一版本详情：')
        console.log(`  DMC: ${v.dmcCode}`)
        console.log(`  IssueNo-InWork: ${v.issueNo}-${v.inWork}`)
        console.log(`  IsLatest: ${v.isLatest}`)
        console.log(`  VersionType: ${v.versionType} (${v.versionType === '1' ? '发布版' : '草稿版'})`)
        console.log(`  DmContent: ${v.dmContent ? '有值 (' + v.dmContent.length + '字符)' : '无值'}`)
      } else {
        console.log('✅ 返回多个版本，说明查询逻辑正常！\n')

        console.log('版本列表：')
        versions.forEach((v, idx) => {
          console.log(`\n  版本${idx + 1}:`)
          console.log(`    DMC: ${v.dmcCode}`)
          console.log(`    IssueNo-InWork: ${v.issueNo}-${v.inWork}`)
          console.log(`    IsLatest: ${v.isLatest}`)
          console.log(`    VersionType: ${v.versionType} (${v.versionType === '1' ? '发布版' : '草稿版'})`)
          console.log(`    DmContent: ${v.dmContent ? '有值' : '无值'}`)
          console.log(`    CreateTime: ${v.createTime}`)
        })

        const latestCount = versions.filter(v => v.isLatest === '1').length
        console.log(`\n统计：`)
        console.log(`  最新版本(is_latest=1): ${latestCount} 个`)
        console.log(`  发布版本(version_type=1): ${versions.filter(v => v.versionType === '1').length} 个`)
        console.log(`  草稿版本(version_type=0): ${versions.filter(v => v.versionType === '0').length} 个`)

        if (latestCount > 1) {
          console.log(`\n⚠️  警告：发现多个is_latest=1的版本，数据异常！`)
        }
      }
    } else {
      console.log('❌ API返回失败:', historyRes.data.message)
    }
  } catch (err) {
    console.log('❌ 调用historyVersions失败:', err.message)
    if (err.response) {
      console.log('响应数据:', err.response.data)
    }
  }

  // 步骤4: 测试onlyPublished=true的情况
  console.log('\n========================================')
  console.log('步骤4: 调用historyVersions API (onlyPublished=true)...')
  try {
    const historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
      headers: { 'X-Access-Token': token },
      params: {
        sns: testDm.sns,
        infoCode: testDm.infoCode,
        infoCodeVariant: testDm.infoCodeVariant || '',
        onlyPublished: true
      }
    })

    if (historyRes.data.success) {
      const versions = historyRes.data.result || []
      console.log(`✅ API调用成功，返回 ${versions.length} 个发布版本\n`)

      if (versions.length === 1) {
        console.log('⚠️  只有1个发布版本')
        console.log('   如果前端勾选了"仅显示发布版本"，就会只显示这1条！')
      }
    }
  } catch (err) {
    console.log('❌ 调用失败:', err.message)
  }

  console.log('\n========== 测试完成 ==========')
}

testHistoryVersionsAPI()
