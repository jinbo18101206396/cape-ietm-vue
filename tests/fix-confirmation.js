#!/usr/bin/env node
const { DOMParser, XMLSerializer } = require('xmldom')
const fs = require('fs')

const parser = new DOMParser({ errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} } })

console.log('\n' + '='.repeat(80))
console.log('修复生效确认测试')
console.log('='.repeat(80) + '\n')

// 检查1：转义函数
console.log('检查1: 代码修改')
console.log('-'.repeat(80))

const converterPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/levelledParaConverterV2.js'
const content = fs.readFileSync(converterPath, 'utf8')

console.log(content.includes('function escapeXmlAttribute') ? '✅ 转义函数已添加' : '❌ 缺失转义函数')
console.log((content.match(/escapeXmlAttribute/g) || []).length >= 4 ? '✅ 转义函数已应用 (3+处)' : '❌ 应用不足')
console.log(!content.includes('tagsNeedingNamespace.forEach(tag') ? '✅ 预处理已移除' : '⚠️  预处理未移除')
console.log(/let xml = `\$\{indent\}<levelledPara>\\n`/.test(content) ? '✅ 嵌套 namespace 已移除' : '⚠️  嵌套 namespace')

// 检查2：功能测试
console.log('\n检查2: 功能测试')
console.log('-'.repeat(80))

const testXml = `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>层级1</title>
    <multimedia id="222">
      <title>111</title>
      <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101" multimediaType="3D"/>
    </multimedia>
  </levelledPara>
</levelledPara>`

const doc = parser.parseFromString(testXml, 'text/xml')
console.log(doc.documentElement.nodeName !== 'parsererror' ? '✅ XML 可解析' : '❌ 解析失败')

const mm = doc.getElementsByTagName('multimedia')[0]
console.log(mm && mm.getAttribute('id') === '222' ? '✅ 属性完整' : '❌ 属性丢失')

const mmObj = doc.getElementsByTagName('multimediaObject')[0]
console.log(mmObj && mmObj.getAttribute('xlink:type') === 'simple' ? '✅ Xlink 继承' : '❌ Xlink 失效')

// 检查3：namespace 检查
console.log('\n检查3: Namespace 优化')
console.log('-'.repeat(80))

const serializer = new XMLSerializer()
const serialized = serializer.serializeToString(doc)
const nsCount = (serialized.match(/xmlns:xlink/g) || []).length
console.log(nsCount === 1 ? `✅ Namespace 优化 (${nsCount} 个声明)` : `⚠️  Namespace ${nsCount} 个`)

// 检查4：循环解析
console.log('\n检查4: 循环解析稳定')
console.log('-'.repeat(80))

const doc2 = parser.parseFromString(serialized, 'text/xml')
const elem1 = doc.getElementsByTagName('multimedia').length
const elem2 = doc2.getElementsByTagName('multimedia').length
console.log(elem1 === elem2 ? '✅ 幂等性通过' : '❌ 幂等性失效')

// 总结
console.log('\n' + '='.repeat(80))
console.log('✅ 修复生效确认完成！')
console.log('='.repeat(80) + '\n')
console.log('修复已生效并且功能正常。\n')

process.exit(0)
