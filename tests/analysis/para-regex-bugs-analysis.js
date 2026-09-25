/**
 * Para设计器正则表达式Bug修复
 * 修复8个误匹配问题，确保双向转换的正确性
 */

// 问题分析报告
const REGEX_BUGS = [
  {
    id: 'BUG-002',
    severity: 'P0',
    location: 'paraConverter.js:146',
    pattern: '/<sup/g',
    problem: '误匹配 <superScript>, <support>, <supply>',
    impact: '循环替换死锁：<sup> → <superScript> → <superScriptcript>',
    testCase: '<sup>2</sup> 往返3次应保持稳定',
    fix: '/<sup(\\s[^>]*)?>/ 或 /<sup>/ (仅匹配开始标签)'
  },
  {
    id: 'BUG-003',
    severity: 'P0',
    location: 'paraConverter.js:148',
    pattern: '/<sub/g',
    problem: '误匹配 <subScript>, <subject>, <submit>',
    impact: '循环替换死锁',
    testCase: '<sub>2</sub> 往返3次应保持稳定',
    fix: '/<sub(\\s[^>]*)?>/ 或 /<sub>/'
  },
  {
    id: 'BUG-004',
    severity: 'P0',
    location: 'paraConverter.js:141',
    pattern: '/<p.*?>/g',
    problem: '误匹配 <para>, <pre>',
    impact: 'XML结构破坏：<para>文本</para> → <p>文本</para>',
    testCase: 'XML中含<para>标签时不应被转换',
    fix: '/<p(\\s[^>]*)?>/'
  },
  {
    id: 'BUG-005',
    severity: 'P0',
    location: 'paraConverter.js:183 (deflist)',
    pattern: '/<th.*?>/g',
    problem: '误匹配 <thead>, <thread>',
    impact: 'deflist转换错误',
    testCase: 'deflist中的术语不应受thead影响',
    fix: '/<th(\\s[^>]*)?>/'
  },
  {
    id: 'BUG-006',
    severity: 'P1',
    location: 'paraConverter.js:138',
    pattern: '/<li.*?>/g',
    problem: '误匹配 <list>, <link>',
    impact: '特殊场景可能出错',
    testCase: '含<list>或<link>的内容',
    fix: '/<li(\\s[^>]*)?>/'
  },
  {
    id: 'BUG-007',
    severity: 'P1',
    location: 'paraConverter.js:181',
    pattern: '/<tr.*?>/g',
    problem: '误匹配 <track>, <tree>',
    impact: 'deflist转换特殊场景错误',
    testCase: '含<track>或<tree>的内容',
    fix: '/<tr(\\s[^>]*)?>/'
  },
  {
    id: 'BUG-008',
    severity: 'P1',
    location: 'paraConverter.js:186',
    pattern: '/<td.*?>/g',
    problem: '误匹配 <tdata>',
    impact: 'deflist转换特殊场景错误',
    testCase: '含<tdata>标签的内容',
    fix: '/<td(\\s[^>]*)?>/'
  },
  {
    id: 'BUG-001',
    severity: 'P0',
    location: 'paraConverter.js:540',
    pattern: '/<th[^>]*>/g',
    problem: '误匹配 <thead>',
    impact: '带表头的表格转换失败',
    testCase: '带thead的表格',
    fix: '✅ 已修复为 /<th(\\s[^>]*)?>/g'
  }
]

console.log('📋 Para转换器正则表达式Bug清单\n')
console.log('=' .repeat(80))

REGEX_BUGS.forEach((bug, idx) => {
  const statusSymbol = bug.fix.startsWith('✅') ? '✅' : '❌'
  console.log(`\n${idx + 1}. ${bug.id} [${bug.severity}] ${statusSymbol}`)
  console.log(`   位置: ${bug.location}`)
  console.log(`   模式: ${bug.pattern}`)
  console.log(`   问题: ${bug.problem}`)
  console.log(`   影响: ${bug.impact}`)
  console.log(`   测试: ${bug.testCase}`)
  console.log(`   修复: ${bug.fix}`)
})

console.log('\n' + '='.repeat(80))
console.log('\n📊 统计:')
const p0Count = REGEX_BUGS.filter(b => b.severity === 'P0').length
const p1Count = REGEX_BUGS.filter(b => b.severity === 'P1').length
const fixedCount = REGEX_BUGS.filter(b => b.fix.startsWith('✅')).length
const pendingCount = REGEX_BUGS.length - fixedCount

console.log(`   总计: ${REGEX_BUGS.length} 个bug`)
console.log(`   P0严重: ${p0Count} 个`)
console.log(`   P1次要: ${p1Count} 个`)
console.log(`   ✅ 已修复: ${fixedCount} 个`)
console.log(`   ❌ 待修复: ${pendingCount} 个`)
console.log(`\n⚠️  建议: 立即修复所有P0级bug后再进行全面测试`)
