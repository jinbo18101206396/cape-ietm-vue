/**
 * 深度验证：查看历史版本页面数据完整性和DMC一致性（简化版）
 *
 * 验证内容：
 * 1. 列表数据的完整性和准确性（字段、类型、空值）
 * 2. DMC编码与数据库字段的一致性
 * 3. XML内容是否存在
 */

const axios = require('axios')

// 配置
const BASE_URL = 'http://localhost:9999'
const API_PREFIX = '/jeecg-boot'

// 模拟登录获取token
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

// 打开项目
async function openProject(token, projectId) {
  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/ietmproject/ietmProject/openProject`, {
      projectId: projectId
    }, {
      headers: { 'X-Access-Token': token }
    })

    if (response.data.success) {
      console.log(`✅ 打开项目成功: ${projectId}`)
      return true
    } else {
      throw new Error('打开项目失败: ' + response.data.message)
    }
  } catch (error) {
    console.error('❌ 打开项目失败:', error.message)
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
      return response.data.result || []
    } else {
      throw new Error('获取历史版本失败: ' + response.data.message)
    }
  } catch (error) {
    console.error(`❌ 获取DM ${dmId} 的历史版本失败:`, error.message)
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

  const systemCode = extractAttr('systemCode')
  const subSystemCode = extractAttr('subSystemCode')
  const subSubSystemCode = extractAttr('subSubSystemCode')
  const assyCode = extractAttr('assyCode')
  const disassyCode = extractAttr('disassyCode')
  const disassyCodeVariant = extractAttr('disassyCodeVariant')
  const infoCode = extractAttr('infoCode')
  const infoCodeVariant = extractAttr('infoCodeVariant')
  const itemLocationCode = extractAttr('itemLocationCode')

  const parts = [
    'DMC',
    systemCode,
    subSystemCode,
    subSubSystemCode,
    assyCode,
    disassyCode,
    disassyCodeVariant,
    infoCode,
    infoCodeVariant,
    itemLocationCode
  ].filter(p => p)

  return parts.length > 1 ? parts.join('-') : null
}

// 验证单个历史版本记录
function verifyHistoryRecord(record, index) {
  const issues = []

  console.log(`\n--- 记录 #${index + 1} ---`)
  console.log(`ID: ${record.id}`)
  console.log(`DMC (数据库): ${record.dmcCode || '(空)'}`)
  console.log(`SNS: ${record.sns || '(空)'}`)
  console.log(`InfoCode: ${record.infoCode || '(空)'}`)
  console.log(`InfoCodeVariant: ${record.infoCodeVariant || '(空)'}`)
  console.log(`技术名称: ${record.techName || '(空)'}`)
  console.log(`信息名称: ${record.infoName || '(空)'}`)
  console.log(`版本号: ${record.issueNo}-${record.inWork}`)
  console.log(`版本类型: ${record.versionType || '(空)'}`)
  console.log(`版本日期: ${record.issueDate || '(空)'}`)
  console.log(`创建人: ${record.createBy || '(空)'}`)
  console.log(`创建时间: ${record.createTime || '(空)'}`)
  console.log(`签出用户: ${record.checkoutUser || '(无)'}`)
  console.log(`dm_content长度: ${record.dmContent ? record.dmContent.length : 0} 字符`)

  // 检查1：必填字段是否为空
  const requiredFields = {
    'id': record.id,
    'issueNo': record.issueNo,
    'inWork': record.inWork
  }

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value && value !== 0) {
      issues.push(`⚠️ 必填字段 ${field} 为空`)
    }
  }

  // 检查2：构建DMC并对比
  const sns = record.sns || ''
  const infoCode = record.infoCode || ''
  const infoCodeVariant = record.infoCodeVariant || ''

  // 动态DMC（前端显示的）
  const computedDmcWithVersion = ['DMC', sns, infoCode, infoCodeVariant, record.issueNo, record.inWork]
    .filter(p => p)
    .join('-')

  // 静态DMC（数据库存储的，不含版本号）
  const computedDmcBase = ['DMC', sns, infoCode, infoCodeVariant]
    .filter(p => p)
    .join('-')

  console.log(`DMC (计算-含版本): ${computedDmcWithVersion}`)
  console.log(`DMC (计算-不含版本): ${computedDmcBase}`)

  // 数据库中的dmcCode可能包含或不包含版本号
  if (record.dmcCode) {
    const dbDmcMatchesWithVersion = record.dmcCode === computedDmcWithVersion
    const dbDmcMatchesBase = record.dmcCode === computedDmcBase
    const dbDmcStartsWithBase = record.dmcCode.startsWith(computedDmcBase)

    if (!dbDmcMatchesWithVersion && !dbDmcMatchesBase && !dbDmcStartsWithBase) {
      issues.push(`⚠️ DMC不一致: 数据库="${record.dmcCode}" vs 计算="${computedDmcWithVersion}"`)
    }
  }

  // 检查3：XML内容检查
  if (record.dmContent) {
    const xmlDmc = extractDmcFromXml(record.dmContent)
    console.log(`DMC (XML提取): ${xmlDmc || '(无法提取)'}`)

    if (xmlDmc) {
      // 只比较基础部分（不含版本号），因为XML中通常不含issueNo-inWork
      if (!xmlDmc.startsWith(computedDmcBase.replace('DMC-', ''))) {
        issues.push(`⚠️ XML中的DMC与计算的DMC不一致: XML="${xmlDmc}" vs 计算="${computedDmcBase}"`)
      }
    } else {
      // 尝试在XML中搜索DMC字符串
      const dmcInXml = record.dmContent.includes(sns) && record.dmContent.includes(infoCode)
      if (!dmcInXml && sns && infoCode) {
        issues.push(`⚠️ XML内容中未找到DMC组成部分（sns=${sns}, infoCode=${infoCode}）`)
      }
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

  // 检查5：字段类型验证
  if (record.issueNo && isNaN(Number(record.issueNo))) {
    issues.push(`⚠️ issueNo应为数字: "${record.issueNo}"`)
  }
  if (record.inWork && isNaN(Number(record.inWork))) {
    issues.push(`⚠️ inWork应为数字: "${record.inWork}"`)
  }

  return {
    id: record.id,
    dmcCode: record.dmcCode,
    computedDmc: computedDmcWithVersion,
    hasXml: !!record.dmContent,
    xmlLength: record.dmContent ? record.dmContent.length : 0,
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

    // 2. 打开项目
    console.log('\n步骤2: 打开项目...')
    const PROJECT_ID = '2078348945532030978' // 测试项目ID (项目1-ZB1)
    await openProject(token, PROJECT_ID)

    // 3. 获取DM列表
    console.log('\n步骤3: 获取DM列表...')
    const dmList = await getDmList(token)

    if (dmList.length === 0) {
      console.log('❌ 没有找到任何DM记录')
      return
    }

    // 3. 对前5个DM进行深度验证
    console.log('\n步骤4: 深度验证历史版本数据...')
    const checkCount = Math.min(5, dmList.length)

    const allIssues = []
    let totalRecords = 0
    let recordsWithXml = 0
    let recordsWithoutXml = 0

    for (let i = 0; i < checkCount; i++) {
      const dm = dmList[i]
      console.log(`\n========================================`)
      console.log(`验证DM [${i + 1}/${checkCount}]: ${dm.dmcCode || dm.id}`)
      console.log(`========================================`)

      const historyList = await getHistoryVersions(token, dm.id)
      console.log(`历史版本数量: ${historyList.length}`)

      if (historyList.length === 0) {
        console.log('该DM没有历史版本记录')
        continue
      }

      // 验证前10条历史记录
      const checkHistoryCount = Math.min(10, historyList.length)
      for (let j = 0; j < checkHistoryCount; j++) {
        const result = verifyHistoryRecord(historyList[j], j)
        totalRecords++

        if (result.hasXml) {
          recordsWithXml++
        } else {
          recordsWithoutXml++
        }

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
    console.log(`总验证DM数: ${checkCount}`)
    console.log(`总验证历史记录数: ${totalRecords}`)
    console.log(`有XML内容的记录: ${recordsWithXml} (${(recordsWithXml/totalRecords*100).toFixed(1)}%)`)
    console.log(`无XML内容的记录: ${recordsWithoutXml} (${(recordsWithoutXml/totalRecords*100).toFixed(1)}%)`)
    console.log(`发现问题记录数: ${allIssues.length}`)
    console.log(`问题率: ${totalRecords > 0 ? ((allIssues.length / totalRecords) * 100).toFixed(1) : 0}%`)

    if (allIssues.length > 0) {
      console.log('\n详细问题列表:')
      allIssues.forEach((item, index) => {
        console.log(`\n[${index + 1}] DM: ${item.dmDmc || item.dmId} | 记录ID: ${item.recordId}`)
        console.log(`    记录DMC: ${item.recordDmc || '(空)'}`)
        item.issues.forEach(issue => {
          console.log(`    ${issue}`)
        })
      })
    } else {
      console.log('\n✅ 所有验证记录均无问题')
    }

    // 5. 统计问题类型
    console.log('\n\n========================================')
    console.log('问题类型统计')
    console.log('========================================')

    const errorCount = allIssues.reduce((sum, item) => {
      return sum + item.issues.filter(i => i.startsWith('⚠️')).length
    }, 0)

    const warningCount = allIssues.reduce((sum, item) => {
      return sum + item.issues.filter(i => i.startsWith('ℹ️')).length
    }, 0)

    console.log(`错误数量: ${errorCount}`)
    console.log(`警告数量: ${warningCount}`)

    // 统计各类错误
    const issueTypes = {}
    allIssues.forEach(item => {
      item.issues.forEach(issue => {
        const type = issue.split(':')[0]
        issueTypes[type] = (issueTypes[type] || 0) + 1
      })
    })

    console.log('\n问题分类:')
    Object.entries(issueTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}次`)
    })

    // 6. 结论
    console.log('\n\n========================================')
    console.log('验证结论')
    console.log('========================================')

    if (errorCount === 0 && warningCount === 0) {
      console.log('\n✅ 数据完整性: 优秀 ⭐⭐⭐⭐⭐')
      console.log('✅ DMC一致性: 完美 ⭐⭐⭐⭐⭐')
      console.log('✅ 所有字段完整，DMC编码与XML内容一致')
    } else if (errorCount === 0 && warningCount > 0) {
      console.log('\n✅ 数据完整性: 良好 ⭐⭐⭐⭐☆')
      console.log('✅ DMC一致性: 良好 ⭐⭐⭐⭐☆')
      console.log(`ℹ️ 有${warningCount}个警告项（主要是空XML内容）`)
    } else if (errorCount <= 3) {
      console.log('\n⚠️ 数据完整性: 基本合格 ⭐⭐⭐☆☆')
      console.log('⚠️ DMC一致性: 基本一致，有少量问题')
      console.log(`⚠️ 发现${errorCount}个错误，建议修复`)
    } else {
      console.log('\n❌ 数据完整性: 存在较多问题 ⭐⭐☆☆☆')
      console.log('❌ DMC一致性: 存在明显不一致')
      console.log(`❌ 发现${errorCount}个错误，需要尽快修复`)
    }

  } catch (error) {
    console.error('\n❌ 验证过程出错:', error.message)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2))
    }
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
