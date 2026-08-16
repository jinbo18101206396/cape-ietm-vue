#!/usr/bin/env node
// 测试新的_calcLinenoFromXml逻辑

const xml = `<dmodule>
  <identAndStatusSection>
  </identAndStatusSection>
  <content>
    <description>
    </description>
  </content>
</dmodule>`

const lines = xml.split('\n')

const nodes = [
  { text: 'dmodule', attributes: { lineno: 0 } },
  { text: 'identAndStatusSection', attributes: { lineno: 0 } },
  { text: 'content', attributes: { lineno: 0 } },
  { text: 'description', attributes: { lineno: 0 } }
]

console.log('🧪 测试新的_calcLinenoFromXml逻辑\n')

let nodeIdx = 0
const stack = []

console.log('XML行:')
for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx]
  const trimmed = line.trim()

  console.log(`  行${lineIdx} (1-based=${lineIdx + 1}): ${line}`)

  if (!trimmed || trimmed.startsWith('<!--')) continue

  const openMatch = trimmed.match(/^<(\w+)[\s\/>]/)
  if (openMatch) {
    const tagName = openMatch[1]

    if (nodeIdx < nodes.length && nodes[nodeIdx].text === tagName) {
      nodes[nodeIdx].attributes.lineno = lineIdx + 1
      console.log(`    ✅ 匹配节点[${nodeIdx}]: ${tagName} → lineno=${lineIdx + 1}`)
      nodeIdx++
    }

    if (!trimmed.endsWith('/>')) {
      stack.push(tagName)
    }
    continue
  }

  const closeMatch = trimmed.match(/^<\/(\w+)>/)
  if (closeMatch) {
    const tagName = closeMatch[1]
    if (stack.length > 0 && stack[stack.length - 1] === tagName) {
      stack.pop()
    }
  }
}

console.log('\n结果:')
nodes.forEach((n, i) => {
  console.log(`  节点[${i}]: ${n.text.padEnd(25)} lineno=${n.attributes.lineno}`)
})

console.log('\n期望:')
console.log('  节点[0]: dmodule                   lineno=1  (行0)')
console.log('  节点[1]: identAndStatusSection     lineno=2  (行1)')
console.log('  节点[2]: content                   lineno=4  (行3)')
console.log('  节点[3]: description               lineno=5  (行4)')

const correct =
  nodes[0].attributes.lineno === 1 &&
  nodes[1].attributes.lineno === 2 &&
  nodes[2].attributes.lineno === 4 &&
  nodes[3].attributes.lineno === 5

console.log('\n' + (correct ? '✅ 逻辑正确！' : '❌ 逻辑有误！'))
