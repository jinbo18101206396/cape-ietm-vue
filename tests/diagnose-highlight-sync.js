#!/usr/bin/env node
// 诊断高亮不一致问题

console.log('🔍 高亮同步诊断\n')
console.log('='.repeat(70))

// 模拟XML结构
const xmlLines = [
  '<?xml version="1.0"?>', // 编辑器行0, 1-based=1
  '<!DOCTYPE dmodule>', // 编辑器行1, 1-based=2
  '<dmodule>', // 编辑器行2, 1-based=3, lineno=1
  '  <identAndStatusSection>', // 编辑器行3, 1-based=4, lineno=2
  '  </identAndStatusSection>', // 编辑器行4, 1-based=5
  '  <content>', // 编辑器行5, 1-based=6, lineno=3
  '    <description>', // 编辑器行6, 1-based=7, lineno=4
  '    </description>', // 编辑器行7, 1-based=8
  '  </content>', // 编辑器行8, 1-based=9
  '</dmodule>' // 编辑器行9, 1-based=10
]

const linenoOffset = 3 // dmodule在编辑器行2，1-based=3

const nodeList = [
  { id: 0, text: 'dmodule', attributes: { lineno: 1 } },
  { id: 1, text: 'identAndStatusSection', attributes: { lineno: 2 } },
  { id: 2, text: 'content', attributes: { lineno: 3 } },
  { id: 3, text: 'description', attributes: { lineno: 4 } }
]

console.log('📋 XML结构:')
xmlLines.forEach((line, i) => {
  const node = nodeList.find(n => {
    const editorLine0 = n.attributes.lineno + linenoOffset - 2
    return editorLine0 === i
  })
  const nodeInfo = node ? ` [lineno=${node.attributes.lineno}, node=${node.text}]` : ''
  console.log(`  行${i} (1-based=${i + 1}): ${line}${nodeInfo}`)
})

console.log('\n' + '='.repeat(70))
console.log('🧪 测试场景\n')

function testScenario(name, cursorLine0, expectedNode) {
  console.log(`场景: ${name}`)
  console.log(`  光标在编辑器行 ${cursorLine0} (1-based=${cursorLine0 + 1})`)
  console.log(`  XML内容: ${xmlLines[cursorLine0]}`)

  // 模拟getnodeBylineno计算
  const editorLine1 = cursorLine0 + 1
  const target = editorLine1 - linenoOffset + 1

  console.log(`  计算: target = ${editorLine1} - ${linenoOffset} + 1 = ${target}`)

  // 查找精确匹配
  let foundNode = nodeList.find(n => n.attributes.lineno === target)

  if (!foundNode) {
    // 检查是否是闭合标签
    const lineContent = xmlLines[cursorLine0]
    const trimmed = lineContent.trim()
    const closeTagMatch = trimmed.match(/^<\/(\w+)>$/)

    if (closeTagMatch) {
      const tagName = closeTagMatch[1]
      console.log(`  识别为闭合标签: </${tagName}>`)

      // 向上查找开始标签
      for (let i = cursorLine0 - 1; i >= 0; i--) {
        const prevLine = xmlLines[i]
        if (prevLine && prevLine.trim().startsWith('<' + tagName)) {
          console.log(`  找到开始标签在行 ${i} (1-based=${i + 1})`)
          const openTagLine1 = i + 1
          const openTarget = openTagLine1 - linenoOffset + 1
          console.log(`  计算: openTarget = ${openTagLine1} - ${linenoOffset} + 1 = ${openTarget}`)
          foundNode = nodeList.find(n => n.attributes.lineno === openTarget && n.text === tagName)
          break
        }
      }
    }
  }

  if (foundNode) {
    console.log(`  ✅ 找到节点: ${foundNode.text} (lineno=${foundNode.attributes.lineno})`)
    if (foundNode.text === expectedNode) {
      console.log(`  ✅ 匹配期望节点!`)
    } else {
      console.log(`  ❌ 期望 ${expectedNode}，但找到 ${foundNode.text}`)
    }
  } else {
    console.log(`  ❌ 未找到节点! 期望: ${expectedNode}`)
  }
  console.log()
}

// 测试各种场景
testScenario('光标在content开始标签', 5, 'content')
testScenario('光标在content闭合标签', 8, 'content')
testScenario('光标在description开始标签', 6, 'description')
testScenario('光标在description闭合标签', 7, 'description')

console.log('='.repeat(70))
console.log('🔄 反向测试: 树选中节点，定位编辑器\n')

function testLocateNode(nodeName) {
  const node = nodeList.find(n => n.text === nodeName)
  if (!node) {
    console.log(`❌ 未找到节点: ${nodeName}\n`)
    return
  }

  const lineno = node.attributes.lineno
  const editorLine0 = lineno + linenoOffset - 2

  console.log(`节点: ${nodeName} (lineno=${lineno})`)
  console.log(`  计算: line = ${lineno} + ${linenoOffset} - 2 = ${editorLine0}`)
  console.log(`  编辑器行: ${editorLine0} (1-based=${editorLine0 + 1})`)
  console.log(`  XML内容: ${xmlLines[editorLine0]}`)

  if (xmlLines[editorLine0].includes(`<${nodeName}`)) {
    console.log(`  ✅ 定位到开始标签!`)
  } else {
    console.log(`  ❌ 定位位置不包含开始标签!`)
  }
  console.log()
}

testLocateNode('content')
testLocateNode('description')

console.log('='.repeat(70))
console.log('💡 可能的问题点\n')

console.log('如果高亮仍然不一致，可能的原因:')
console.log('  1. editorcursorFlag标志位未正确工作')
console.log('  2. 树的selectNode方法有问题')
console.log('  3. noevent标志未正确重置')
console.log('  4. nodeList数据不正确')
console.log('  5. linenoOffset计算错误')
console.log('  6. 防循环机制过度阻止了同步')
