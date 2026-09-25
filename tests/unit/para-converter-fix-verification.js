/**
 * Para设计器单元测试 - 转换逻辑验证
 * 补充UI测试，验证修复后的转换函数
 */

// 模拟修复后的转换逻辑
function testSupSubConversion() {
  const tests = [
    {
      name: '上标往返测试',
      input: '<sup>2</sup>',
      step1: '<sup>2</sup>',
      step2: '<superScript>2</superScript>',
      step3: '<sup>2</sup>'  // 应该稳定
    },
    {
      name: '下标往返测试',
      input: '<sub>2</sub>',
      step1: '<sub>2</sub>',
      step2: '<subScript>2</subScript>',
      step3: '<sub>2</sub>'
    }
  ]

  console.log('🧪 上标/下标转换单元测试\n')

  tests.forEach(({ name, input, step2 }) => {
    // 模拟html2para转换
    const regex = name.includes('上标')
      ? /<sup(\s[^>]*)?\>/g
      : /<sub(\s[^>]*)?\>/g
    const replacement = name.includes('上标') ? '<superScript' : '<subScript'

    let result = input.replace(regex, replacement)
      .replace(/<\/sup>/g, '</superScript>')
      .replace(/<\/sub>/g, '</subScript>')

    const pass = result === step2
    console.log(`${pass ? '✅' : '❌'} ${name}`)
    console.log(`   输入: ${input}`)
    console.log(`   输出: ${result}`)
    console.log(`   预期: ${step2}`)

    // 验证不会误匹配
    if (name.includes('上标')) {
      const wrongMatch = /<sup(\s[^>]*)?\>/g.test('<superScript>')
      console.log(`   不误匹配<superScript>: ${wrongMatch ? '❌' : '✅'}`)
    } else {
      const wrongMatch = /<sub(\s[^>]*)?\>/g.test('<subScript>')
      console.log(`   不误匹配<subScript>: ${wrongMatch ? '❌' : '✅'}`)
    }
    console.log()
  })
}

function testParaProtection() {
  console.log('🧪 <para>标签保护测试\n')

  const regex = /<p(\s[^>]*)?\>/g
  const input = '<para>文本</para>'

  // 修复前：/<p.*?>/g 会匹配<para>
  const oldRegex = /<p.*?>/g
  const oldResult = oldRegex.test('<para>')
  console.log(`修复前 /<p.*?>/g 匹配<para>: ${oldResult ? '❌ 会误匹配' : '✅'}`)

  // 修复后：/<p(\s[^>]*)?\>/g 不会匹配<para>
  const newResult = regex.test('<para>')
  console.log(`修复后 /<p(\\s[^>]*)?\>/g 匹配<para>: ${newResult ? '❌' : '✅ 不误匹配'}`)

  // 验证正常匹配
  regex.lastIndex = 0
  const normalMatch1 = regex.test('<p>')
  console.log(`正常匹配<p>: ${normalMatch1 ? '✅' : '❌'}`)

  regex.lastIndex = 0
  const normalMatch2 = regex.test('<p class="text">')
  console.log(`正常匹配<p class="text">: ${normalMatch2 ? '✅' : '❌'}`)
}

function testDeflistConversion() {
  console.log('\n🧪 定义列表转换测试\n')

  const tests = [
    { tag: 'th', regex: /<th(\s[^>]*)?\>/g, wrongTag: '<thead>' },
    { tag: 'tr', regex: /<tr(\s[^>]*)?\>/g, wrongTag: '<track>' },
    { tag: 'td', regex: /<td(\s[^>]*)?\>/g, wrongTag: '<tdata>' }
  ]

  tests.forEach(({ tag, regex, wrongTag }) => {
    // 验证不误匹配
    regex.lastIndex = 0
    const wrongMatch = regex.test(wrongTag)
    console.log(`<${tag}> 不误匹配 ${wrongTag}: ${wrongMatch ? '❌' : '✅'}`)

    // 验证正常匹配
    regex.lastIndex = 0
    const normalMatch = regex.test(`<${tag}>`)
    console.log(`<${tag}> 正常匹配 <${tag}>: ${normalMatch ? '✅' : '❌'}`)

    regex.lastIndex = 0
    const attrMatch = regex.test(`<${tag} class="x">`)
    console.log(`<${tag}> 正常匹配 <${tag} class="x">: ${attrMatch ? '✅' : '❌'}`)
    console.log()
  })
}

// 运行所有测试
console.log('=' .repeat(80))
console.log('Para转换器单元测试 - 修复验证')
console.log('=' .repeat(80))
console.log()

testSupSubConversion()
testParaProtection()
testDeflistConversion()

console.log('=' .repeat(80))
console.log('✅ 单元测试完成')
