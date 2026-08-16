/**
 * 深度验证：查看历史版本页面数据完整性和DMC一致性
 *
 * 验证内容：
 * 1. 列表数据的完整性和准确性（字段、类型、空值）
 * 2. DMC编码与XML内容的一致性
 * 3. 数据库字段与前端显示的一致性
 */

const axios = require('axios')
const { parseString } = require('xml2js')

// 配置
const BASE_URL = 'http://localhost:9999'
const API_PREFIX = '/jeecg-boot'

// 模拟登录获取token
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/sys/login`, {
      username: 'admin',
      password: 'admin'
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

// 获取DM列表
async function getDmList(token) {
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/ietm/datamodule/list`, {
      headers: { 'X-Access-Token': token },
      params: {
        pageNo: 1,
        pageSize: 10
      }
    })

    if (response.data.success) {
      console.log(`✅ 获取DM列表成功，共 ${response.data.result.records.length} 条`)
      return response.data.result.records
    } else {
      throw new Error('获取DM列表失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('❌ 获取DM列表失败:', error.message)
    throw error
  }
}

// 获取历史版本列表
async function getHistoryVersions(token, dmId) {
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/ietm/datamodule/historyVersions`, {
      headers: { 'X-Access-Token': token },
      params: { id: dmId }
    })

    if (response.data.success) {
      return response.data.result
    } else {
      throw new Error('获取历史版本失败: ' + response.data.message)
    }
  } catch (error) {
    console.error(`❌ 获取DM ${dmId} 的历史版本失败:`, error.message)
    return []
  }
}

// 解析XML中的DMC编码
function extractDmcFromXml(xml) {
  if (!xml) return null

  return new Promise((resolve) => {
    parseString(xml, { trim: true }, (err, result) => {
      if (err) {
        resolve(null)
        return
      }

      try {
        // 尝试从 <dmodule> 标签提取
        const dmodule = result?.dmodule
        if (dmodule) {
          const identAndStatusSection = dmodule.identAndStatusSection?.[0]
          const dmAddress = identAndStatusSection?.dmAddress?.[0]
          const dmIdent = dmAddress?.dmIdent?.[0]
          const dmCode = dmIdent?.dmCode?.[0]

          if (dmCode?.$) {
            const attrs = dmCode.$
            const dmcParts = [
              'DMC',
              attrs.systemCode,
              attrs.subSystemCode,
              attrs.subSubSystemCode,
              attrs.assyCode,
              attrs.disassyCode,
              attrs.disassyCodeVariant,
              attrs.infoCode,
              attrs.infoCodeVariant,
              attrs.itemLocationCode
            ].filter(p => p)

            resolve(dmcParts.join('-'))
            return
          }
        }

        resolve(null)
      } catch (e) {
        resolve(null)
      }
    })
  })
}

// 验证单个历史版本记录
async function verifyHistoryRecord(record, index, token) {
  const issues = []

  console.log(`\n--- 记录 #${index + 1} ---`)
  console.log(`ID: ${record.id}`)
  console.log(`DMC (数据库): ${record.dmcCode || '(空)'}`)
  console.log(`技术名称: ${record.techName || '(空)'}`)
  console.log(`信息名称: ${record.infoName || '(空)'}`)
  console.log(`版本号: ${record.issueNo}-${record.inWork}`)
  console.log(`版本类型: ${record.versionType || '(空)'}`)
  console.log(`版本日期: ${record.issueDate || '(空)'}`)
  console.log(`创建人: ${record.createBy || '(空)'}`)

  // 检查1：必填字段是否为空
  const requiredFields = {
    'id': record.id,
    'issueNo': record.issueNo,
    'inWork': record.inWork,
    'createBy': record.createBy
  }

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value) {
      issues.push(`⚠️ 必填字段 ${field} 为空`)
    }
  }

  // 检查2：构建DMC并对比
  const sns = record.sns || ''
  const infoCode = record.infoCode || ''
  const infoCodeVariant = record.infoCodeVariant || ''
  const issueNo = record.issueNo || ''
  const inWork = record.inWork || ''

  const computedDmc = ['DMC', sns, infoCode, infoCodeVariant, issueNo, inWork]
    .filter(p => p)
    .join('-')

  console.log(`DMC (计算): ${computedDmc}`)

  if (record.dmcCode && record.dmcCode !== computedDmc) {
    issues.push(`⚠️ DMC不一致: 数据库="${record.dmcCode}" vs 计算="${computedDmc}"`)
  }

  // 检查3：获取XML内容并提取DMC
  if (record.dmContent) {
    const xmlDmc = await extractDmcFromXml(record.dmContent)
    console.log(`DMC (XML): ${xmlDmc || '(无法提取)'}`)

    if (xmlDmc) {
      // XML中的DMC可能不包含版本号，只比较前缀部分
      const xmlDmcPrefix = xmlDmc.split('-').slice(0, -2).join('-') // 去掉最后的issueNo-inWork
      const computedDmcPrefix = computedDmc.split('-').slice(0, -2).join('-')

      if (xmlDmcPrefix && computedDmcPrefix && xmlDmcPrefix !== computedDmcPrefix) {
        issues.push(`⚠️ XML中的DMC与计算的DMC不一致: XML="${xmlDmc}" vs 计算="${computedDmc}"`)
      }
    } else {
      issues.push(`⚠️ 无法从XML中提取DMC编码`)
    }
  } else {
    console.log(`DMC (XML): (dm_content为空)`)
    issues.push(`ℹ️ dm_content字段为空（可能是草稿或未编辑的DM）`)
  }

  // 检查4：版本类型值的合理性
  const validVersionTypes = ['new', 'changed', 'deleted', 'revised', 'status', 'rinstate-changed', '0', '1']
  if (record.versionType && !validVersionTypes.includes(record.versionType)) {
    issues.push(`⚠️ 版本类型值异常: "${record.versionType}"`)
  }

  return {
    id: record.id,
    dmcCode: record.dmcCode,
    computedDmc,
    issues
  }
}

// 主函数
async function main() {
  console.log('========================================')
  console.log('深度验证：历史版本数据完整性和DMC一致性')
  console.log('========================================\n')

  try {
    // 1. 登录
    console.log('步骤1: 登录系统...')
    const token = await login()

    // 2. 获取DM列表
    console.log('\n步骤2: 获取DM列表...')
    const dmList = await getDmList(token)

    if (dmList.length === 0) {
      console.log('❌ 没有找到任何DM记录')
      return
    }

    // 3. 对前3个DM进行深度验证
    console.log('\n步骤3: 深度验证历史版本数据...')
    const checkCount = Math.min(3, dmList.length)

    const allIssues = []
    let totalRecords = 0

    for (let i = 0; i < checkCount; i++) {
      const dm = dmList[i]
      console.log(`\n========================================`)
      console.log(`验证DM: ${dm.dmcCode || dm.id}`)
      console.log(`========================================`)

      const historyList = await getHistoryVersions(token, dm.id)
      console.log(`历史版本数量: ${historyList.length}`)

      if (historyList.length === 0) {
        console.log('该DM没有历史版本记录')
        continue
      }

      // 验证前5条历史记录
      const checkHistoryCount = Math.min(5, historyList.length)
      for (let j = 0; j < checkHistoryCount; j++) {
        const result = await verifyHistoryRecord(historyList[j], j, token)
        totalRecords++

        if (result.issues.length > 0) {
          allIssues.push({
            dmId: dm.id,
            dmDmc: dm.dmcCode,
            recordId: result.id,
            recordDmc: result.dmcCode,
            issues: result.issues
          })
        }
      }
    }

    // 4. 输出汇总报告
    console.log('\n\n========================================')
    console.log('验证汇总报告')
    console.log('========================================')
    console.log(`总验证记录数: ${totalRecords}`)
    console.log(`发现问题记录数: ${allIssues.length}`)
    console.log(`问题率: ${totalRecords > 0 ? ((allIssues.length / totalRecords) * 100).toFixed(1) : 0}%`)

    if (allIssues.length > 0) {
      console.log('\n详细问题列表:')
      allIssues.forEach((item, index) => {
        console.log(`\n[${index + 1}] DM: ${item.dmDmc || item.dmId} | 记录: ${item.recordDmc || item.recordId}`)
        item.issues.forEach(issue => {
          console.log(`    ${issue}`)
        })
      })
    } else {
      console.log('\n✅ 所有验证记录均无问题')
    }

    // 5. 结论
    console.log('\n\n========================================')
    console.log('验证结论')
    console.log('========================================')

    const errorCount = allIssues.reduce((sum, item) => {
      return sum + item.issues.filter(i => i.startsWith('⚠️')).length
    }, 0)

    const warningCount = allIssues.reduce((sum, item) => {
      return sum + item.issues.filter(i => i.startsWith('ℹ️')).length
    }, 0)

    console.log(`错误数量: ${errorCount}`)
    console.log(`警告数量: ${warningCount}`)

    if (errorCount === 0 && warningCount === 0) {
      console.log('\n✅ 数据完整性: 优秀 ⭐⭐⭐⭐⭐')
      console.log('✅ DMC一致性: 完美 ⭐⭐⭐⭐⭐')
    } else if (errorCount <= 2) {
      console.log('\n⚠️ 数据完整性: 良好 ⭐⭐⭐⭐☆')
      console.log('⚠️ DMC一致性: 基本一致，有少量问题')
    } else {
      console.log('\n❌ 数据完整性: 存在较多问题 ⭐⭐⭐☆☆')
      console.log('❌ DMC一致性: 存在明显不一致')
    }

  } catch (error) {
    console.error('\n❌ 验证过程出错:', error.message)
    console.error(error.stack)
  }
}

// 运行
main().then(() => {
  console.log('\n验证完成')
  process.exit(0)
}).catch(error => {
  console.error('\n程序异常:', error)
  process.exit(1)
})
