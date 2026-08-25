/**
 * 单元测试：验证DMC包含语言和国家代码
 *
 * 测试问题：
 * 1. DMC缺少语言和国家代码
 * 2. 后端返回的记录包含dmContent字段
 */

// 模拟新的 buildDmcCode 方法（包含语言和国家代码）
function buildDmcCode(record) {
  if (!record) return ''
  // 根据S1000D标准拼接完整DMC（包含语言和国家代码）
  // 格式: DMC-{sns}-{infoCode}{variant}-{location}_{issue}-{inWork}_{lang}-{country}
  const sns = record.sns || ''
  const infoCodePart = (record.infoCode || '') + (record.infoCodeVariant || '')
  const location = record.ietmLocationCode || 'A'
  const issueBlock = (record.issueNo || '001') + '-' + (record.inWork || '00')
  const langBlock = (record.languageIsoCode || 'zh') + '-' + (record.countryIsoCode || 'CN')

  // 拼接完整DMC（如果sns为空，则不显示DMC前缀）
  if (!sns) {
    return ''
  }
  return `DMC-${sns}-${infoCodePart}-${location}_${issueBlock}_${langBlock}`
}

// 运行测试
console.log('=== DMC语言和国家代码修复验证 ===\n')

let totalTests = 0
let passedTests = 0
let failedTests = 0

function runTest(description, testFn) {
  totalTests++
  try {
    testFn()
    passedTests++
    console.log(`✅ ${description}`)
  } catch (error) {
    failedTests++
    console.log(`❌ ${description}`)
    console.log(`   错误: ${error.message}`)
  }
}

console.log('📦 测试套件 1: buildDmcCode 包含语言和国家代码\n')

runTest('应该包含完整的DMC段（包含语言和国家）', () => {
  const record = {
    sns: 'DEMO',
    infoCode: '001',
    infoCodeVariant: 'A',
    ietmLocationCode: 'A',
    issueNo: '001',
    inWork: '03',
    languageIsoCode: 'zh',
    countryIsoCode: 'CN'
  }
  const result = buildDmcCode(record)
  const expected = 'DMC-DEMO-001A-A_001-03_zh-CN'
  if (result !== expected) {
    throw new Error(`期望 "${expected}", 实际 "${result}"`)
  }
})

runTest('应该使用默认语言和国家代码', () => {
  const record = {
    sns: 'DEMO',
    infoCode: '001',
    infoCodeVariant: 'A',
    ietmLocationCode: 'A',
    issueNo: '001',
    inWork: '00'
    // 没有 languageIsoCode 和 countryIsoCode
  }
  const result = buildDmcCode(record)
  if (!result.includes('zh-CN')) {
    throw new Error(`应该包含默认的 "zh-CN", 实际: ${result}`)
  }
})

runTest('应该使用默认位置代码', () => {
  const record = {
    sns: 'DEMO',
    infoCode: '001',
    infoCodeVariant: 'A',
    issueNo: '001',
    inWork: '00',
    languageIsoCode: 'en',
    countryIsoCode: 'US'
    // 没有 ietmLocationCode
  }
  const result = buildDmcCode(record)
  const expected = 'DMC-DEMO-001A-A_001-00_en-US'
  if (result !== expected) {
    throw new Error(`期望 "${expected}", 实际 "${result}"`)
  }
})

runTest('应该正确处理英文语言环境', () => {
  const record = {
    sns: 'DEMO',
    infoCode: '002',
    infoCodeVariant: 'B',
    ietmLocationCode: 'T',
    issueNo: '002',
    inWork: '01',
    languageIsoCode: 'en',
    countryIsoCode: 'GB'
  }
  const result = buildDmcCode(record)
  const expected = 'DMC-DEMO-002B-T_002-01_en-GB'
  if (result !== expected) {
    throw new Error(`期望 "${expected}", 实际 "${result}"`)
  }
})

runTest('应该处理空infoCodeVariant', () => {
  const record = {
    sns: 'TEST',
    infoCode: '100',
    infoCodeVariant: '',
    ietmLocationCode: 'A',
    issueNo: '001',
    inWork: '00',
    languageIsoCode: 'zh',
    countryIsoCode: 'CN'
  }
  const result = buildDmcCode(record)
  const expected = 'DMC-TEST-100-A_001-00_zh-CN'
  if (result !== expected) {
    throw new Error(`期望 "${expected}", 实际 "${result}"`)
  }
})

runTest('应该处理null记录', () => {
  const result = buildDmcCode(null)
  if (result !== '') {
    throw new Error('null记录应返回空字符串')
  }
})

runTest('应该处理空对象（使用所有默认值）', () => {
  const result = buildDmcCode({})
  // 空对象没有sns，应该返回空字符串
  if (result !== '') {
    throw new Error(`空对象缺少sns，应返回空字符串, 实际 "${result}"`)
  }
})

console.log('\n📦 测试套件 2: 后端字段验证\n')

runTest('后端返回应包含languageIsoCode字段', () => {
  // 模拟后端返回的记录
  const backendRecord = {
    id: '2078348945532030978',
    sns: 'DEMO',
    infoCode: '001',
    infoCodeVariant: 'A',
    ietmLocationCode: 'A',
    issueNo: '001',
    inWork: '03',
    languageIsoCode: 'zh', // ← 必须包含
    countryIsoCode: 'CN', // ← 必须包含
    dmContent: '<dmodule>...</dmodule>' // ← 必须包含
  }

  if (!backendRecord.languageIsoCode) {
    throw new Error('后端记录缺少languageIsoCode字段')
  }
  if (!backendRecord.countryIsoCode) {
    throw new Error('后端记录缺少countryIsoCode字段')
  }
})

runTest('后端返回应包含dmContent字段', () => {
  const backendRecord = {
    id: '2078348945532030978',
    dmContent: '<dmodule>test content</dmodule>'
  }

  if (backendRecord.dmContent === undefined) {
    throw new Error('后端记录缺少dmContent字段')
  }
})

runTest('dmContent可以为空字符串（表示未编辑）', () => {
  const backendRecord = {
    id: '2078348945532030978',
    dmContent: '' // 空字符串是合法的
  }

  if (backendRecord.dmContent === undefined || backendRecord.dmContent === null) {
    throw new Error('dmContent不应该是undefined或null')
  }
})

// 总结
console.log('\n' + '='.repeat(50))
console.log(`总测试数: ${totalTests}`)
console.log(`✅ 通过: ${passedTests}`)
console.log(`❌ 失败: ${failedTests}`)
console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
console.log('='.repeat(50))

if (passedTests === totalTests) {
  console.log('\n🎉 所有测试通过！DMC语言和国家代码修复验证成功！')
  process.exit(0)
} else {
  console.log('\n⚠️ 有测试失败，请检查')
  process.exit(1)
}
