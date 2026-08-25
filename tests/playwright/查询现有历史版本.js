/**
 * 最简化版本：直接用已知的SNS和InfoCode测试历史版本查询
 */

const axios = require('axios')
const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function test() {
  // 登录
  const loginRes = await axios.post(`${BASE_URL}/sys/login`, {
    username: 'admin',
    password: '123456'
  })
  const token = loginRes.data.result.token
  console.log('✅ 登录成功\n')

  // 测试用例：使用之前测试中创建的DM
  const testCases = [
    { sns: 'VERIFY-MAP-1786248824957', infoCode: '070', name: '之前的测试DM' },
    { sns: 'TEST-001', infoCode: '001', name: '假设的测试DM' }
  ]

  for (const testCase of testCases) {
    console.log(`========================================`)
    console.log(`测试: ${testCase.name}`)
    console.log(`SNS: ${testCase.sns}, InfoCode: ${testCase.infoCode}`)
    console.log(`========================================\n`)

    try {
      const historyRes = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
        headers: { 'X-Access-Token': token },
        params: {
          sns: testCase.sns,
          infoCode: testCase.infoCode,
          infoCodeVariant: '',
          onlyPublished: false
        }
      })

      if (historyRes.data.success) {
        const versions = historyRes.data.result || []
        console.log(`✅ 查询成功，返回 ${versions.length} 个版本\n`)

        if (versions.length > 0) {
          console.log('版本列表:')
          versions.forEach((v, idx) => {
            console.log(`  ${idx + 1}. DMC: ${v.dmcCode}`)
            console.log(`     版本: ${v.issueNo}-${v.inWork}`)
            console.log(`     IsLatest: ${v.isLatest}`)
            console.log(`     Status: ${v.status || 'N/A'}`)
            console.log(`     VersionType: ${v.versionType} (${v.versionType === '1' ? '发布' : '草稿'})`)
            console.log(`     DmContent: ${v.dmContent ? '有值' : '无值'}`)
            console.log()
          })

          // 分析数据
          const latestCount = versions.filter(v => v.isLatest === '1').length
          const status1Count = versions.filter(v => v.status === '1').length
          const status0Count = versions.filter(v => v.status === '0').length

          console.log('统计:')
          console.log(`  总版本数: ${versions.length}`)
          console.log(`  最新版本(isLatest=1): ${latestCount}`)
          console.log(`  有效版本(status=1): ${status1Count}`)
          console.log(`  归档版本(status=0): ${status0Count}`)

          if (status0Count > 0) {
            console.log(`\n⚠️  发现 ${status0Count} 个归档版本(status=0)`)
            console.log('   这些版本被归档后，在前端"历史版本"列表中不可见')
            console.log('   这是导致"只显示最新版本"的根本原因！')
          }

          // 找到可以测试的DM
          const draftVersion = versions.find(v => v.versionType === '0' && v.isLatest === '1' && !v.checkoutUser)
          if (draftVersion) {
            console.log(`\n✅ 找到可测试的草稿版本: ${draftVersion.dmcCode}`)
            console.log(`   ID: ${draftVersion.id}`)
            console.log(`   可以用这个DM测试签出→签入功能`)
            return { token, dm: draftVersion }
          }
        } else {
          console.log('⚠️  该DM没有任何版本\n')
        }
      } else {
        console.log(`❌ 查询失败: ${historyRes.data.message}\n`)
      }
    } catch (err) {
      console.log(`❌ 查询异常: ${err.message}\n`)
    }
  }

  console.log('\n========================================')
  console.log('总结')
  console.log('========================================')
  console.log('如果上面所有测试DM都没有找到，说明需要手动创建或提供一个真实的DM')
}

test().catch(err => {
  console.error('错误:', err.message)
})
