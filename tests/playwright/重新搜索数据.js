/**
 * 重新搜索系统中的所有DM数据
 * 使用更广泛的搜索策略
 */

const axios = require('axios')
const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function login() {
  const res = await axios.post(`${BASE_URL}/sys/login`, {
    username: 'admin',
    password: '123456'
  })
  return res.data.result.token
}

async function searchAllData(token) {
  console.log('========================================')
  console.log('重新搜索系统中的DM数据')
  console.log('========================================\n')

  // 策略1: 尝试空参数查询（获取所有数据）
  console.log('策略1: 尝试查询所有可能的SNS前缀...')

  const prefixes = [
    '', // 空前缀
    'DMC', 'SNS', 'TEST', 'DEMO',
    'A', 'B', 'C', 'D', 'E',
    '0', '1', '2', '3', '4', '5',
    'AIRCRAFT', 'ENGINE', 'SYSTEM',
    'S1000D', 'IETM', 'DM',
    'HIST', 'VERIFY', 'UI'
  ]

  const infoCodes = ['', '001', '010', '020', '030', '040', '050', '070', '100', '200', '999']

  let foundData = []

  for (const prefix of prefixes) {
    for (const code of infoCodes) {
      try {
        const res = await axios.get(`${BASE_URL}/ietm/datamodule/historyVersions`, {
          headers: { 'X-Access-Token': token },
          params: {
            sns: prefix,
            infoCode: code,
            infoCodeVariant: '',
            onlyPublished: false
          },
          timeout: 3000
        })

        if (res.data.success && res.data.result && res.data.result.length > 0) {
          console.log(`\n✅ 找到数据！`)
          console.log(`   SNS: "${prefix}", InfoCode: "${code}"`)
          console.log(`   数量: ${res.data.result.length} 个版本`)

          foundData.push({
            sns: prefix,
            infoCode: code,
            versions: res.data.result
          })

          // 显示前3个
          res.data.result.slice(0, 3).forEach((v, idx) => {
            console.log(`     ${idx + 1}. ${v.dmcCode} (${v.issueNo}-${v.inWork})`)
          })
        }
      } catch (err) {
        // 继续下一个
      }
    }
  }

  if (foundData.length === 0) {
    console.log('\n❌ 确实没有找到任何DM数据')
    console.log('\n可能的原因:')
    console.log('  1. 数据库为空（初始安装）')
    console.log('  2. 需要通过UI先创建项目和构型节点')
    console.log('  3. historyVersions接口需要精确的SNS和InfoCode匹配')
  } else {
    console.log(`\n========================================`)
    console.log(`✅ 共找到 ${foundData.length} 组DM数据`)
    console.log(`========================================\n`)

    return foundData
  }

  return null
}

async function main() {
  try {
    const token = await login()
    console.log('✅ 登录成功\n')

    const data = await searchAllData(token)

    if (data && data.length > 0) {
      console.log('找到的数据可以用于验证！')
      console.log('\n下一步: 选择其中一个DM进行签出签入测试')
    }

  } catch (err) {
    console.error('\n❌ 错误:', err.message)
  }
}

main()
