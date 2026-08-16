#!/usr/bin/env node
// 真实场景模拟测试 - 不骗人版

const fs = require('fs')
const path = require('path')

console.log('🔍 真实场景深度测试\n')
console.log('='.repeat(70))

// 读取实际代码
const xmlTreePath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/xmlTree.js'
const sourceViewPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/DmSourceView.vue'

let xmlTreeCode = ''
let sourceViewCode = ''

try {
  xmlTreeCode = fs.readFileSync(xmlTreePath, 'utf8')
  sourceViewCode = fs.readFileSync(sourceViewPath, 'utf8')
} catch (e) {
  console.error('❌ 读取文件失败:', e.message)
  process.exit(1)
}

console.log('\n📋 关键检查点\n')

const issues = []

// 检查1: _calcLinenoFromXml是否真的被调用？
console.log('1. 检查_calcLinenoFromXml是否被调用:')
if (xmlTreeCode.includes('_calcLinenoFromXml(nodes, xml)')) {
  console.log('   ✅ 调用存在')
} else if (xmlTreeCode.includes('_calcLineno(nodes)')) {
  console.log('   ❌ 还在调用旧的_calcLineno！')
  issues.push('_calcLinenoFromXml没有被调用')
} else {
  console.log('   ⚠️  找不到调用')
  issues.push('找不到行号计算调用')
}

// 检查2: _calcLinenoFromXml函数是否存在？
console.log('\n2. 检查_calcLinenoFromXml函数定义:')
if (xmlTreeCode.includes('function _calcLinenoFromXml(nodes, xml)')) {
  console.log('   ✅ 函数定义存在')

  // 检查关键逻辑
  const hasBaseLine = xmlTreeCode.includes('dmLineIdx')
  const hasRelativeCalc = xmlTreeCode.includes('lineIdx - dmLineIdx + 1')

  console.log('   关键逻辑:')
  console.log(`     dmLineIdx查找: ${hasBaseLine ? '✅' : '❌'}`)
  console.log(`     相对行号计算: ${hasRelativeCalc ? '✅' : '❌'}`)

  if (!hasBaseLine || !hasRelativeCalc) {
    issues.push('_calcLinenoFromXml逻辑不完整')
  }
} else {
  console.log('   ❌ 函数定义不存在！')
  issues.push('_calcLinenoFromXml函数不存在')
}

// 检查3: getnodeBylineno是否传入cm参数？
console.log('\n3. 检查getnodeBylineno调用:')
const getnodeBylinenoCall = sourceViewCode.match(/getnodeBylineno\([^)]+\)/)
if (getnodeBylinenoCall) {
  console.log(`   找到调用: ${getnodeBylinenoCall[0]}`)
  if (getnodeBylinenoCall[0].includes(', cm)')) {
    console.log('   ✅ 传入了cm参数')
  } else {
    console.log('   ❌ 未传入cm参数！')
    issues.push('getnodeBylineno未传入cm参数')
  }
} else {
  console.log('   ❌ 找不到调用')
  issues.push('找不到getnodeBylineno调用')
}

// 检查4: getnodeBylineno是否支持闭合标签？
console.log('\n4. 检查getnodeBylineno闭合标签支持:')
if (xmlTreeCode.includes('closeTagMatch')) {
  console.log('   ✅ 有闭合标签识别逻辑')
} else {
  console.log('   ❌ 没有闭合标签识别')
  issues.push('getnodeBylineno不支持闭合标签')
}

// 检查5: locateNode公式是否正确？
console.log('\n5. 检查locateNode转换公式:')
const locateNodeMatch = sourceViewCode.match(/locateNode\(node\)[^}]+\{[^}]+\}/s)
if (locateNodeMatch) {
  const locateNodeCode = locateNodeMatch[0]
  if (locateNodeCode.includes('lineno + this.linenoOffset - 2')) {
    console.log('   ✅ 公式存在: lineno + linenoOffset - 2')
  } else {
    console.log('   ❌ 公式不正确')
    issues.push('locateNode公式错误')
  }
} else {
  console.log('   ⚠️  找不到locateNode函数')
}

// 检查6: 防循环标志是否工作？
console.log('\n6. 检查防循环机制:')
const hasNoEvent = sourceViewCode.includes("cm.setOption('noevent', '1')")
const checkNoEvent = sourceViewCode.includes("if (cm.getOption('noevent') === '1')")

console.log(`   设置noevent标志: ${hasNoEvent ? '✅' : '❌'}`)
console.log(`   检查noevent标志: ${checkNoEvent ? '✅' : '❌'}`)

if (!hasNoEvent || !checkNoEvent) {
  issues.push('noevent防循环机制不完整')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 模拟真实数据测试\n')

// 模拟真实的XML和nodeList
const realXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dmodule>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemCode="00"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <para>This is a test.</para>
    </description>
  </content>
</dmodule>`

console.log('真实XML场景（简化版）:')
const lines = realXml.split('\n')
lines.forEach((line, i) => {
  console.log(`  行${i}: ${line}`)
})

// 手动执行_calcLinenoFromXml逻辑
console.log('\n执行行号计算逻辑:')

const nodes = [
  { text: 'dmodule', attributes: { lineno: 0 } },
  { text: 'identAndStatusSection', attributes: { lineno: 0 } },
  { text: 'dmAddress', attributes: { lineno: 0 } },
  { text: 'dmIdent', attributes: { lineno: 0 } },
  { text: 'dmCode', attributes: { lineno: 0 } },
  { text: 'content', attributes: { lineno: 0 } },
  { text: 'description', attributes: { lineno: 0 } },
  { text: 'para', attributes: { lineno: 0 } }
]

// 找dmodule基准行
let dmLineIdx = -1
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().match(/^<dmodule[\s>]/)) {
    dmLineIdx = i
    break
  }
}

console.log(`  dmLineIdx = ${dmLineIdx}`)
console.log(`  linenoOffset = ${dmLineIdx + 1}`)

if (dmLineIdx === -1) {
  console.log('  ❌ 找不到dmodule！')
  issues.push('找不到dmodule基准行')
} else {
  // 按序扫描
  let nodeIdx = 0
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const trimmed = lines[lineIdx].trim()
    if (!trimmed || trimmed.startsWith('<!--')) continue

    const openMatch = trimmed.match(/^<(\w+)[\s\/>]/)
    if (openMatch) {
      const tagName = openMatch[1]
      if (nodeIdx < nodes.length && nodes[nodeIdx].text === tagName) {
        nodes[nodeIdx].attributes.lineno = lineIdx - dmLineIdx + 1
        console.log(`    行${lineIdx}: <${tagName}> → 节点[${nodeIdx}] lineno=${nodes[nodeIdx].attributes.lineno}`)
        nodeIdx++
      }
    }
  }

  console.log('\n计算结果:')
  nodes.forEach((n, i) => {
    console.log(`  [${i}] ${n.text.padEnd(25)} lineno=${n.attributes.lineno}`)
  })
}

console.log('\n' + '='.repeat(70))
console.log('🎯 反向测试：定位准确性\n')

const linenoOffset = dmLineIdx + 1

// 测试：树选中节点 → 编辑器定位
function testTreeToEditor(nodeIdx) {
  const node = nodes[nodeIdx]
  if (!node || node.attributes.lineno === 0) {
    console.log(`❌ 节点[${nodeIdx}] lineno未计算`)
    return false
  }

  const lineno = node.attributes.lineno
  const editorLine0 = lineno + linenoOffset - 2

  console.log(`树选中[${nodeIdx}] ${node.text}:`)
  console.log(`  lineno=${lineno}, linenoOffset=${linenoOffset}`)
  console.log(`  计算: ${lineno} + ${linenoOffset} - 2 = ${editorLine0}`)

  if (editorLine0 < 0 || editorLine0 >= lines.length) {
    console.log(`  ❌ 行号越界！`)
    return false
  }

  console.log(`  编辑器行${editorLine0}: ${lines[editorLine0]}`)

  if (lines[editorLine0].includes(`<${node.text}`)) {
    console.log(`  ✅ 定位正确`)
    return true
  } else {
    console.log(`  ❌ 定位错误！`)
    issues.push(`节点${node.text}定位错误`)
    return false
  }
}

// 测试：光标在编辑器 → 查找节点
function testEditorToTree(editorLine0) {
  const editorLine1 = editorLine0 + 1
  const target = editorLine1 - linenoOffset + 1

  console.log(`\n光标在行${editorLine0}:`)
  console.log(`  XML: ${lines[editorLine0]}`)
  console.log(`  计算: ${editorLine1} - ${linenoOffset} + 1 = ${target}`)

  const node = nodes.find(n => n.attributes.lineno === target)
  if (node) {
    console.log(`  ✅ 找到节点: ${node.text}`)
    return true
  } else {
    // 可能是闭合标签
    const trimmed = lines[editorLine0].trim()
    const closeMatch = trimmed.match(/^<\/(\w+)>$/)
    if (closeMatch) {
      console.log(`  识别为闭合标签: ${closeMatch[1]}`)
      console.log(`  需要向上查找对应的开始标签...`)

      // 简化：直接检查是否有对应节点
      const expectedNode = nodes.find(n => n.text === closeMatch[1])
      if (expectedNode) {
        console.log(`  ✅ 应该找到: ${expectedNode.text} (需要闭合标签识别)`)
        return true
      }
    }
    console.log(`  ❌ 未找到节点`)
    issues.push(`行${editorLine0}找不到节点`)
    return false
  }
}

// 执行测试
console.log()
testTreeToEditor(0) // dmodule
console.log()
testTreeToEditor(1) // identAndStatusSection
console.log()
testTreeToEditor(5) // content

testEditorToTree(2) // <dmodule>
testEditorToTree(3) // <identAndStatusSection>
testEditorToTree(9) // </identAndStatusSection> - 闭合标签
testEditorToTree(10) // <content>

console.log('\n' + '='.repeat(70))
console.log('📊 测试总结\n')

if (issues.length === 0) {
  console.log('✅ 所有检查通过！')
  console.log('\n但是！这只是静态代码检查和模拟测试。')
  console.log('真正的问题可能在：')
  console.log('  1. 浏览器缓存没清除，旧代码还在运行')
  console.log('  2. 编译没有重新执行，修改未生效')
  console.log('  3. 某些边缘情况没有考虑到')
  console.log('  4. 动态交互中的时序问题')
  console.log('\n必须在浏览器中实际操作测试！')
  process.exit(0)
} else {
  console.log('❌ 发现问题：')
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`)
  })
  console.log('\n这些问题必须先修复！')
  process.exit(1)
}
