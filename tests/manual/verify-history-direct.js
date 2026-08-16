/**
 * 深度验证：直接通过数据库查询验证历史版本数据
 * 不依赖项目/构型节点选择
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:9999'
const API_PREFIX = '/jeecg-boot'

// 登录
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/sys/login`, {
      username: 'admin',
      password: '123456'
    })

    if (response.data.success) {
      console.log('✅ 登录成功')
      return response.data.result.token
    } else {
      throw new Error('登录失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.message)
    throw error
  }
}

// 直接通过SQL查询获取DM（绕过项目/构型限制）
async function queryDmIds(token) {
  try {
    // 直接查询ietm_data_module表获取前10个DM的ID
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/ietm/datamodule/queryAll`, {
      headers: { 'X-Access-Token': token }
    })

    if (response.data.success && response.data.result) {
      console.log(`✅ 查询到 ${response.data.result.length} 个DM`)
      return response.data.result.slice(0, 10)
    } else {
      throw new Error('查询DM失败')
    }
  } catch (error) {
    console.log('尝试方法1失败，使用方法2...')
    // 如果上面的API不存在，直接构造一些已知的DM ID进行测试
    return []
  }
}

// 获取单个DM的历史版本
async function getHistoryVersions(token, dmId) {
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/ietm/datamodule/historyVersions`, {
      headers: { 'X-Access-Token': token },
      params: { id: dmId }
    })

    if (response.data.success) {
      return response.data.result || []
    } else {
      return []
    }
  } catch (error) {
    console.error(`获取DM ${dmId} 的历史版本失败:`, error.message)
    return []
  }
}

// 简单提取XML中的DMC编码（使用正则）
function extractDmcFromXml(xml) {
  if (!xml) return null

  // 尝试匹配 <dmCode> 标签的属性
  const dmCodeMatch = xml.match(/<dmCode\s+([^>]+)>/)
  if (!dmCodeMatch) return null

  const attrs = dmCodeMatch[1]

  // 提取各个属性
  const extractAttr = (name) => {
    const match = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))
    return match ? match[1] : ''
  }

  const parts = [
    'DMC',
    extractAttr('systemCode'),
    extractAttr('subSystemCode'),
    extractAttr('subSubSystemCode'),
    extractAttr('assyCode'),
    extractAttr('disassyCode'),
    extractAttr('disassyCodeVariant'),
    extractAttr('infoCode'),
    extractAttr('infoCodeVariant'),
    extractAttr('itemLocationCode')
  ].filter(p => p)

  return parts.length > 1 ? parts.join('-') : null
}

// 验证单个历史版本记录
function verifyRecord(record, index) {
  const issues = []

  console.log(`\n  [${index + 1}] ID: ${record.id}`)
  console.log(`      DMC(数据库): ${record.dmcCode || '(空)'}`)
  console.log(`      版本: ${record.issueNo}-${record.inWork}`)
  console.log(`      类型: ${record.versionType || '(空)'}`)
  console.log(`      创建人: ${record.createBy || '(空)'}`)
  console.log(`      XML长度: ${record.dmContent ? record.dmContent.length : 0}字符`)

  // 检查必填字段
  if (!record.issueNo && record.issueNo !== 0) {
    issues.push('⚠️ issueNo为空')
  }
  if (!record.inWork && record.inWork !== 0) {
    issues.push('⚠️ inWork为空')
  }

  // 构建DMC
  const parts = ['DMC', record.sns, record.infoCode, record.infoCodeVariant, record.issueNo, record.inWork]
    .filter(p => p || p === 0)
  const computedDmc = parts.join('-')

  console.log(`      DMC(计算): ${computedDmc}`)

  // 对比数据库DMC
  if (record.dmcCode && record.dmcCode !== computedDmc && !record.dmcCode.startsWith(parts.slice(0, 4).join('-'))) {
    issues.push(`⚠️ DMC不一致: DB="${record.dmcCode}" vs 计算="${computedDmc}"`)
  }

  // 检查XML中的DMC
  if (record.dmContent) {
    const xmlDmc = extractDmcFromXml(record.dmContent)
    console.log(`      DMC(XML): ${xmlDmc || '(无法提取)'}`)

    if (xmlDmc && record.sns && !xmlDmc.includes(record.sns)) {
      issues.push(`⚠️ XML中的DMC与SNS不匹配`)
    }
  } else {
    console.log(`      DMC(XML): (内容为空)`)
    issues.push(`ℹ️ dm_content为空`)
  }

  return { id: record.id, issues }
}

// 主函数
async function main() {
  console.log('========================================')
  console.log('历史版本数据完整性和DMC一致性深度验证')
  console.log('========================================\n')

  try {
    // 登录
    const token = await login()

    // 尝试直接查询DM
    console.log('\n正在查询DM...')
    let dmList = await queryDmIds(token)

    // 如果查询不到，使用手动输入的ID
    if (dmList.length === 0) {
      console.log('⚠️ 无法通过API查询DM列表')
      console.log('请手动提供一个DM的ID进行验证')
      console.log('示例：在浏览器中打开DM管理页面，从URL或表格中获取DM的ID\n')

      // 尝试一些常见的雪花ID范围
      const testIds = [
        '2078348945532030978',
        '2077227771595018242',
        '2016415088223285250'
      ]

      console.log('尝试使用测试ID验证...')
      for (const testId of testIds) {
        console.log(`\n尝试DM ID: ${testId}`)
        const history = await getHistoryVersions(token, testId)

        if (history.length > 0) {
          console.log(`✅ 找到 ${history.length} 条历史版本`)
          dmList = [{ id: testId }]
          break
        }
      }
    }

    if (dmList.length === 0) {
      console.log('\n❌ 无法找到任何可验证的DM')
      console.log('请确保：')
      console.log('  1. 数据库中有DM数据')
      console.log('  2. 后端服务正常运行')
      console.log('  3. API权限配置正确')
      return
    }

    // 验证历史版本
    console.log(`\n开始验证 ${dmList.length} 个DM的历史版本...\n`)

    let totalRecords = 0
    let recordsWithXml = 0
    let recordsWithoutXml = 0
    const allIssues = []

    for (let i = 0; i < Math.min(5, dmList.length); i++) {
      const dm = dmList[i]
      console.log(`\n========== DM #${i + 1}: ${dm.id} ==========`)

      const historyList = await getHistoryVersions(token, dm.id)
      console.log(`历史版本数: ${historyList.length}`)

      if (historyList.length === 0) {
        console.log('  (无历史版本)')
        continue
      }

      // 验证前10条
      for (let j = 0; j < Math.min(10, historyList.length); j++) {
        const result = verifyRecord(historyList[j], j)
        totalRecords++

        if (historyList[j].dmContent) {
          recordsWithXml++
        } else {
          recordsWithoutXml++
        }

        if (result.issues.length > 0) {
          allIssues.push({
            dmId: dm.id,
            recordId: result.id,
            issues: result.issues
          })
        }
      }
    }

    // 汇总报告
    console.log('\n\n========================================')
    console.log('验证汇总')
    console.log('========================================')
    console.log(`验证记录数: ${totalRecords}`)
    console.log(`有XML内容: ${recordsWithXml} (${(recordsWithXml/totalRecords*100).toFixed(1)}%)`)
    console.log(`无XML内容: ${recordsWithoutXml} (${(recordsWithoutXml/totalRecords*100).toFixed(1)}%)`)
    console.log(`发现问题: ${allIssues.length}条 (${(allIssues.length/totalRecords*100).toFixed(1)}%)`)

    if (allIssues.length > 0) {
      console.log('\n问题详情:')
      allIssues.forEach((item, i) => {
        console.log(`\n[${i+1}] DM: ${item.dmId} | 记录: ${item.recordId}`)
        item.issues.forEach(issue => console.log(`    ${issue}`))
      })
    }

    // 结论
    const errorCount = allIssues.reduce((sum, item) => {
      return sum + item.issues.filter(i => i.startsWith('⚠️')).length
    }, 0)

    console.log('\n\n========================================')
    console.log('验证结论')
    console.log('========================================')
    console.log(`错误数: ${errorCount}`)
    console.log(`警告数: ${allIssues.reduce((sum, item) => sum + item.issues.filter(i => i.startsWith('ℹ️')).length, 0)}`)

    if (errorCount === 0) {
      console.log('\n✅ 数据完整性: 优秀 ⭐⭐⭐⭐⭐')
      console.log('✅ DMC一致性: 完美 ⭐⭐⭐⭐⭐')
    } else if (errorCount <= 3) {
      console.log('\n⚠️ 数据完整性: 良好 ⭐⭐⭐⭐☆')
      console.log('⚠️ DMC一致性: 基本一致，有少量问题')
    } else {
      console.log('\n❌ 数据完整性: 需要改进 ⭐⭐⭐☆☆')
      console.log('❌ DMC一致性: 存在较多不一致')
    }

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message)
    if (error.response) {
      console.error('HTTP状态:', error.response.status)
    }
  }
}

main().then(() => {
  console.log('\n验证完成')
  process.exit(0)
}).catch(error => {
  console.error('程序异常:', error)
  process.exit(1)
})
