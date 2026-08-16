#!/usr/bin/env node
// 最终验证：完整的行号转换

// 模拟完整的XML（包含前面的声明）
const fullXml = `<?xml version="1.0"?>
<!DOCTYPE dmodule>
<dmodule>
  <identAndStatusSection>
  </identAndStatusSection>
  <content>
    <description>
    </description>
  </content>
</dmodule>`

const lines = fullXml.split('\n')

console.log('🎯 最终验证：完整行号转换\n')
console.log('='.repeat(70))
console.log('\nXML结构（0-based编辑器行号）:')
lines.forEach((line, i) => {
  console.log(`  行${i}: ${line}`)
})

// 模拟新的_calcLinenoFromXml逻辑
const nodes = [
  { text: 'dmodule', attributes: { lineno: 0 } },
  { text: 'identAndStatusSection', attributes: { lineno: 0 } },
  { text: 'content', attributes: { lineno: 0 } },
  { text: 'description', attributes: { lineno: 0 } }
]

// 找到dmodule所在行
let dmLineIdx = 0
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().match(/^<dmodule[\s>]/)) {
    dmLineIdx = i
    break
  }
}

console.log(`\ndmodule所在编辑器行: ${dmLineIdx} (1-based=${dmLineIdx + 1})`)
const linenoOffset = dmLineIdx + 1
console.log(`linenoOffset: ${linenoOffset}`)

// 计算相对行号
let nodeIdx = 0
for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const trimmed = lines[lineIdx].trim()
  if (!trimmed || trimmed.startsWith('<!--')) continue

  const openMatch = trimmed.match(/^<(\w+)[\s\/>]/)
  if (openMatch) {
    const tagName = openMatch[1]
    if (nodeIdx < nodes.length && nodes[nodeIdx].text === tagName) {
      nodes[nodeIdx].attributes.lineno = lineIdx - dmLineIdx + 1
      nodeIdx++
    }
  }
}

console.log('\n计算后的lineno (相对于dmodule):')
nodes.forEach(n => {
  console.log(`  ${n.text.padEnd(25)} lineno=${n.attributes.lineno}`)
})

console.log('\n' + '='.repeat(70))
console.log('🧪 测试场景\n')

// 场景1：树选中节点，定位编辑器
function testTreeToEditor(nodeName) {
  const node = nodes.find(n => n.text === nodeName)
  if (!node) return

  const lineno = node.attributes.lineno
  const editorLine0 = lineno + linenoOffset - 2

  console.log(`场景：树选中 ${nodeName}`)
  console.log(`  lineno=${lineno}, linenoOffset=${linenoOffset}`)
  console.log(`  计算: line = ${lineno} + ${linenoOffset} - 2 = ${editorLine0} (0-based)`)
  console.log(`  编辑器行${editorLine0}: ${lines[editorLine0]}`)

  if (lines[editorLine0].includes(`<${nodeName}`)) {
    console.log(`  ✅ 定位正确！`)
  } else {
    console.log(`  ❌ 定位错误！`)
  }
  console.log()
}

// 场景2：光标在编辑器，查找节点
function testEditorToTree(editorLine0) {
  const editorLine1 = editorLine0 + 1
  const target = editorLine1 - linenoOffset + 1

  console.log(`场景：光标在编辑器行${editorLine0}`)
  console.log(`  XML: ${lines[editorLine0]}`)
  console.log(`  计算: target = ${editorLine1} - ${linenoOffset} + 1 = ${target}`)

  const node = nodes.find(n => n.attributes.lineno === target)
  if (node) {
    console.log(`  ✅ 找到节点: ${node.text}`)
  } else {
    console.log(`  ❌ 未找到节点`)
  }
  console.log()
}

testTreeToEditor('dmodule')
testTreeToEditor('identAndStatusSection')
testTreeToEditor('content')
testTreeToEditor('description')

testEditorToTree(2) // <dmodule>
testEditorToTree(3) // <identAndStatusSection>
testEditorToTree(5) // <content>
testEditorToTree(6) // <description>

console.log('='.repeat(70))
console.log('✅ 如果所有场景都正确，则行号转换逻辑完全修复！')
