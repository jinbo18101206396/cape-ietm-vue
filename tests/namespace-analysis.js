/**
 * 分析冗余 namespace 声明问题
 */

const { DOMParser, XMLSerializer } = require('xmldom')

const parser = new DOMParser()
const serializer = new XMLSerializer()

// 测试1：XML 中的 namespace 继承
console.log('='.repeat(60))
console.log('测试1: Namespace 继承分析')
console.log('='.repeat(60) + '\n')

const xml1 = `<?xml version="1.0"?>
<root xmlns:xlink="http://www.w3.org/1999/xlink">
  <child1 xlink:href="link1"/>
  <child2 xlink:href="link2"/>
</root>`

const doc1 = parser.parseFromString(xml1, 'text/xml')
console.log('输入 XML（namespace 在根元素）:')
console.log(xml1)
console.log('\n序列化后:')
console.log(serializer.serializeToString(doc1))

// 测试2：多层 namespace 声明
console.log('\n' + '='.repeat(60))
console.log('测试2: 多层 namespace 声明问题')
console.log('='.repeat(60) + '\n')

const xml2 = `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
    <multimedia xmlns:xlink="http://www.w3.org/1999/xlink" id="m1">
      <multimediaObject xlink:type="simple"/>
    </multimedia>
  </levelledPara>
</levelledPara>`

console.log('当前生成的 XML（三层 namespace 声明）:')
console.log(xml2)

const lines = xml2.split('\n')
const nsCount = lines.filter(l => l.includes('xmlns:xlink')).length
console.log(`\nNamespace 声明数: ${nsCount}`)
console.log('问题: 冗余的 namespace 声明')

// 测试3：验证 namespace 继承是否有效
console.log('\n' + '='.repeat(60))
console.log('测试3: Namespace 继承验证')
console.log('='.repeat(60) + '\n')

const xml3_onlyRoot = `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <multimedia id="m1">
      <multimediaObject xlink:type="simple"/>
    </multimedia>
  </levelledPara>
</levelledPara>`

console.log('优化版 XML（只在根元素声明）:')
console.log(xml3_onlyRoot)

try {
  const doc3 = parser.parseFromString(xml3_onlyRoot, 'text/xml')
  const mmObjs = doc3.getElementsByTagName('multimediaObject')
  if (mmObjs.length > 0) {
    const xlinkType = mmObjs[0].getAttribute('xlink:type')
    console.log(`\n✅ xlink:type 属性能被正确读取: "${xlinkType}"`)
    console.log('✅ Namespace 继承有效，不需要在子元素重复声明')
  }
} catch (e) {
  console.log(`❌ 解析失败: ${e.message}`)
}

// 测试4：XML 大小对比
console.log('\n' + '='.repeat(60))
console.log('测试4: XML 大小对比')
console.log('='.repeat(60) + '\n')

const xml4_current = xml2  // 冗余声明版本
const xml4_optimized = xml3_onlyRoot  // 优化版本

console.log(`当前版本大小: ${xml4_current.length} 字节`)
console.log(`优化版本大小: ${xml4_optimized.length} 字节`)
console.log(`节省空间: ${xml4_current.length - xml4_optimized.length} 字节 (${((xml4_current.length - xml4_optimized.length) / xml4_current.length * 100).toFixed(1)}%)`)

// 测试5：S1000D 最佳实践
console.log('\n' + '='.repeat(60))
console.log('测试5: S1000D 最佳实践检查')
console.log('='.repeat(60) + '\n')

console.log('S1000D XML 最佳实践:')
console.log('  ✅ 只在根元素声明 namespace')
console.log('  ✅ 子元素继承命名空间声明')
console.log('  ✅ 避免冗余的 xmlns 声明')
console.log('  ✅ 减少文件大小和复杂度')

console.log('\n当前代码的问题:')
console.log('  ❌ parseXmlToTree 在解析时添加 xmlns:xlink 到所有元素')
console.log('  ❌ nodeToXml 在生成时又在 levelledPara 和 multimedia 上添加')
console.log('  ❌ 导致冗余声明')

console.log('\n建议改进:')
console.log('  1. 只在根 levelledPara 元素上声明 xmlns:xlink')
console.log('  2. 移除 parseXmlToTree 中的预处理逻辑')
console.log('  3. 移除 nodeToXml 中对嵌套 levelledPara 的 namespace 声明')
console.log('  4. 移除第二次解析时的 namespace 修复')

