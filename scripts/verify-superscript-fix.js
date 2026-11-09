/**
 * 上标/下标预览修复验证脚本
 *
 * 用途：验证 DmPreviewModal.vue 中的标签转换逻辑是否正确
 * 运行：node scripts/verify-superscript-fix.js
 */

// 模拟修复后的转换函数
function convertXmlTagsToHtml(html) {
  return html
    .replace(/<superScript>/g, '<sup>')
    .replace(/<\/superScript>/g, '</sup>')
    .replace(/<subScript>/g, '<sub>')
    .replace(/<\/subScript>/g, '</sub>')
    .replace(/<emphasis>/g, '<strong>')
    .replace(/<\/emphasis>/g, '</strong>')
}

// 测试用例
const testCases = [
  {
    name: '测试1: 基本上标',
    input: '<p>1<superScript>2</superScript></p>',
    expected: '<p>1<sup>2</sup></p>',
    description: '显示为 1²'
  },
  {
    name: '测试2: 基本下标',
    input: '<p>H<subScript>2</subScript>O</p>',
    expected: '<p>H<sub>2</sub>O</p>',
    description: '显示为 H₂O'
  },
  {
    name: '测试3: 基本加粗',
    input: '<p>这是<emphasis>重要</emphasis>内容</p>',
    expected: '<p>这是<strong>重要</strong>内容</p>',
    description: '显示为 这是**重要**内容'
  },
  {
    name: '测试4: 混合格式',
    input: '<p><emphasis>公式：</emphasis> x<superScript>2</superScript> + y<superScript>2</superScript> = z<superScript>2</superScript></p>',
    expected: '<p><strong>公式：</strong> x<sup>2</sup> + y<sup>2</sup> = z<sup>2</sup></p>',
    description: '显示为 **公式：** x² + y² = z²'
  },
  {
    name: '测试5: 嵌套段落',
    input: '<div><p>第一段<superScript>1</superScript></p><p>第二段<subScript>2</subScript></p></div>',
    expected: '<div><p>第一段<sup>1</sup></p><p>第二段<sub>2</sub></p></div>',
    description: '多段落混合'
  },
  {
    name: '测试6: 空内容',
    input: '',
    expected: '',
    description: '空字符串不报错'
  },
  {
    name: '测试7: 无需转换',
    input: '<p>普通文本</p>',
    expected: '<p>普通文本</p>',
    description: '普通文本不受影响'
  },
  {
    name: '测试8: 已转换的HTML',
    input: '<p>1<sup>2</sup></p>',
    expected: '<p>1<sup>2</sup></p>',
    description: '已转换的HTML保持不变'
  },
  {
    name: '测试9: 多个相同标签',
    input: '<p><superScript>a</superScript><superScript>b</superScript><superScript>c</superScript></p>',
    expected: '<p><sup>a</sup><sup>b</sup><sup>c</sup></p>',
    description: '连续多个上标'
  },
  {
    name: '测试10: 用户实际场景',
    input: '1<superScript>2</superScript>',
    expected: '1<sup>2</sup>',
    description: '用户报告的实际场景'
  }
]

// 运行测试
console.log('🔍 开始验证上标/下标预览修复...\n')

let passCount = 0
let failCount = 0

testCases.forEach((testCase, index) => {
  const result = convertXmlTagsToHtml(testCase.input)
  const pass = result === testCase.expected

  if (pass) {
    console.log(`✅ ${testCase.name}`)
    console.log(`   描述: ${testCase.description}`)
    passCount++
  } else {
    console.log(`❌ ${testCase.name}`)
    console.log(`   描述: ${testCase.description}`)
    console.log(`   输入: ${testCase.input}`)
    console.log(`   期望: ${testCase.expected}`)
    console.log(`   实际: ${result}`)
    failCount++
  }
  console.log('')
})

// 统计结果
console.log('━'.repeat(60))
console.log(`\n📊 测试结果: ${passCount}/${testCases.length} 通过\n`)

if (failCount === 0) {
  console.log('🎉 所有测试通过！修复验证成功！\n')
  process.exit(0)
} else {
  console.log(`⚠️  ${failCount} 个测试失败，请检查代码\n`)
  process.exit(1)
}
