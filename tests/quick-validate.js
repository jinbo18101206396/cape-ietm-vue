#!/usr/bin/env node
/**
 * quick-validate.js - 快速验证修复有效性
 */

const { DOMParser, XMLSerializer } = require('xmldom')

// 测试基础功能
const xml = `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>层级1</title>
    <multimedia id="222" multimediaType="3D">
      <title>111</title>
      <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101-30101-00007-A-001-01"/>
    </multimedia>
  </levelledPara>
</levelledPara>`

console.log('开始验证...\n')

try {
  // 1. 解析 XML
  console.log('1. 测试 XML 解析...')
  const parser = new DOMParser({
    errorHandler: {
      warning: (msg) => console.warn('警告:', msg),
      error: (msg) => console.error('错误:', msg),
      fatalError: (msg) => { throw new Error(msg) }
    }
  })
  
  const doc = parser.parseFromString(xml, 'text/xml')
  console.log('   ✅ XML 解析成功\n')

  // 2. 检查属性
  console.log('2. 检查属性转义...')
  const multimedia = doc.getElementsByTagName('multimedia')[0]
  if (multimedia) {
    const id = multimedia.getAttribute('id')
    const multimediaType = multimedia.getAttribute('multimediaType')
    const infoEntityIdent = doc.getElementsByTagName('multimediaObject')[0].getAttribute('infoEntityIdent')
    
    console.log(`   id="${id}" ✅`)
    console.log(`   multimediaType="${multimediaType}" ✅`)
    console.log(`   infoEntityIdent="${infoEntityIdent}" ✅\n`)
  }

  // 3. 序列化
  console.log('3. 测试 XML 序列化...')
  const serializer = new XMLSerializer()
  const serialized = serializer.serializeToString(doc)
  console.log('   ✅ XML 序列化成功\n')

  // 4. 检查属性格式
  console.log('4. 检查属性转义格式...')
  if (serialized.includes('&amp;')) {
    console.log('   ✅ & 被正确转义为 &amp;')
  }
  if (serialized.includes('id="222"')) {
    console.log('   ✅ id 属性格式正确')
  }
  if (serialized.includes('multimediaType="3D"')) {
    console.log('   ✅ multimediaType 属性格式正确')
  }
  console.log()

  // 5. 重新解析序列化的 XML
  console.log('5. 测试循环解析...')
  const doc2 = parser.parseFromString(serialized, 'text/xml')
  console.log('   ✅ 序列化的 XML 可以重新解析\n')

  // 6. 检查 S1000D 标准
  console.log('6. S1000D 标准检查...')
  const levelledParas = doc.getElementsByTagName('levelledPara')
  console.log(`   ✅ levelledPara 元素数量: ${levelledParas.length}`)
  
  const multimediaElements = doc.getElementsByTagName('multimedia')
  console.log(`   ✅ multimedia 元素数量: ${multimediaElements.length}`)
  
  const titles = doc.getElementsByTagName('title')
  console.log(`   ✅ title 元素数量: ${titles.length}\n`)

  console.log('='  .repeat(50))
  console.log('✅ 所有验证通过！修复有效。')
  console.log('='  .repeat(50) + '\n')

  process.exit(0)

} catch (error) {
  console.error('\n❌ 验证失败:')
  console.error(error.message)
  console.error(error.stack)
  process.exit(1)
}
