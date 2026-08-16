#!/usr/bin/env node
// 测试_calcLineno逻辑

// 模拟节点列表
const nodes = [
  { text: 'dmodule', attributes: { path: '/dmodule', lineno: 0 } },
  { text: 'identAndStatusSection', attributes: { path: '/dmodule/identAndStatusSection', lineno: 0 } },
  { text: 'content', attributes: { path: '/dmodule/content', lineno: 0 } },
  { text: 'description', attributes: { path: '/dmodule/content/description', lineno: 0 } }
]

console.log('🔍 测试_calcLineno逻辑\n')

// 原始逻辑
function _calcLineno_original(nodes) {
  let lineno = 1
  nodes[0] && (nodes[0].attributes.lineno = lineno)
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i]
    const depth = (n.attributes.path.match(/\//g) || []).length - 1
    const prevDepth = (nodes[i - 1].attributes.path.match(/\//g) || []).length - 1
    if (depth < prevDepth) lineno += (prevDepth - depth)
    lineno++
    n.attributes.lineno = lineno
  }
}

console.log('原始逻辑:')
_calcLineno_original(nodes)
nodes.forEach(n => {
  console.log(`  ${n.text.padEnd(25)} depth=${(n.attributes.path.match(/\//g) || []).length - 1}  lineno=${n.attributes.lineno}`)
})

console.log('\n期望的lineno (基于真实XML):')
console.log(`  <?xml?>                                           (行0, 不在nodeList中)`)
console.log(`  <!DOCTYPE>                                        (行1, 不在nodeList中)`)
console.log(`  <dmodule>                    depth=0  lineno=1    (行2)`)
console.log(`    <identAndStatusSection>    depth=1  lineno=2    (行3)`)
console.log(`    </identAndStatusSection>                        (行4, 闭合标签)`)
console.log(`    <content>                  depth=1  lineno=?    (行5)`)
console.log(`      <description>            depth=2  lineno=?    (行6)`)
console.log(`      </description>                                (行7, 闭合标签)`)
console.log(`    </content>                                      (行8, 闭合标签)`)
console.log(`  </dmodule>                                        (行9, 闭合标签)`)

console.log('\n❌ 问题: _calcLineno通过深度推算行号，无法准确反映实际XML！')
console.log('\n💡 解决方案有两种:')
console.log('  1. 修改_calcLineno，使其正确计算（复杂，因为要考虑所有子元素）')
console.log('  2. 在解析XML时直接记录真实行号（需要重写_loopNode）')
console.log('\n推荐方案2，因为它最准确！')
