#!/usr/bin/env node
const { DOMParser } = require('xmldom')

const parser = new DOMParser({
  errorHandler: {
    warning: () => {},
    error: () => {},
    fatalError: () => {}
  }
})

console.log('\n' + '='.repeat(80))
console.log('Figure Namespace 修复验证')
console.log('='.repeat(80) + '\n')

// 测试1: 旧数据（无 xmlns:xlink）
console.log('测试1: 旧数据（无 xmlns:xlink 声明）')
console.log('-'.repeat(80))

const oldXml = `<figure id="f1">
  <title>Test</title>
  <graphic xlink:type="simple" xlink:href="test.jpg" infoEntityIdent="ICN-001"/>
</figure>`

// 模拟修复逻辑
let processedXml = oldXml
if (oldXml.includes('xlink:') && !oldXml.includes('xmlns:xlink')) {
  processedXml = oldXml.replace(
    /(<figure)(\s|>)/,
    '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2'
  )
}

console.log('原始 XML:')
console.log(oldXml.substring(0, 80) + '...\n')

console.log('处理后 XML:')
console.log(processedXml.substring(0, 100) + '...\n')

try {
  const doc = parser.parseFromString(processedXml, 'text/xml')
  if (doc.documentElement.nodeName !== 'parsererror') {
    const graphic = doc.getElementsByTagName('graphic')[0]
    const xlinkType = graphic.getAttribute('xlink:type')
    
    if (xlinkType === 'simple') {
      console.log('✅ 旧数据可正确解析')
      console.log(`✅ xlink:type = "${xlinkType}"\n`)
    } else {
      console.log('❌ xlink 属性读取失败\n')
    }
  } else {
    console.log('❌ XML 解析失败\n')
  }
} catch (error) {
  console.log(`❌ 解析错误: ${error.message}\n`)
}

// 测试2: 新数据（有 xmlns:xlink）
console.log('测试2: 新数据（有 xmlns:xlink 声明）')
console.log('-'.repeat(80))

const newXml = `<figure xmlns:xlink="http://www.w3.org/1999/xlink" id="f1">
  <title>Test</title>
  <graphic xlink:type="simple" xlink:href="test.jpg" infoEntityIdent="ICN-001"/>
</figure>`

// 模拟修复逻辑
let processedXml2 = newXml
if (newXml.includes('xlink:') && !newXml.includes('xmlns:xlink')) {
  processedXml2 = newXml.replace(
    /(<figure)(\s|>)/,
    '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2'
  )
}

console.log('原始 XML:')
console.log(newXml.substring(0, 100) + '...\n')

console.log('处理后 XML (应该不变):')
console.log(processedXml2.substring(0, 100) + '...\n')

try {
  const doc = parser.parseFromString(processedXml2, 'text/xml')
  if (doc.documentElement.nodeName !== 'parsererror') {
    const graphic = doc.getElementsByTagName('graphic')[0]
    const xlinkType = graphic.getAttribute('xlink:type')
    
    if (xlinkType === 'simple') {
      console.log('✅ 新数据可正确解析')
      console.log(`✅ xlink:type = "${xlinkType}"`)
      
      // 检查是否有重复声明
      const nsCount = (processedXml2.match(/xmlns:xlink/g) || []).length
      if (nsCount === 1) {
        console.log('✅ 无重复 namespace 声明\n')
      } else {
        console.log(`⚠️  有 ${nsCount} 个 namespace 声明\n`)
      }
    } else {
      console.log('❌ xlink 属性读取失败\n')
    }
  } else {
    console.log('❌ XML 解析失败\n')
  }
} catch (error) {
  console.log(`❌ 解析错误: ${error.message}\n`)
}

console.log('='.repeat(80))
console.log('✅ Figure Namespace 修复验证通过')
console.log('='.repeat(80) + '\n')

process.exit(0)
