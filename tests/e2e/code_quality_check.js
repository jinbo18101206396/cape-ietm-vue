// 检查潜在的竞态条件和状态管理问题
const fs = require('fs')
const path = require('path')

console.log('=== 代码质量检查：竞态条件、状态管理 ===\n')

const editorFile = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')
const content = fs.readFileSync(editorFile, 'utf-8')

const issues = []
const warnings = []

// 1. 检查并发保存
console.log('【1】检查并发保存控制...')
const saveMatches = content.match(/doSave.*\{[\s\S]*?\}/g) || []
console.log(`  找到 ${saveMatches.length} 个保存方法`)

if (content.includes('saving') && content.includes('this.saving = true')) {
  console.log('  ✓ 有saving标志位防止并发保存')
} else {
  warnings.push('缺少saving标志位，可能导致并发保存')
}
console.log()

// 2. 检查状态同步
console.log('【2】检查状态同步...')
const dirtyRefs = (content.match(/this\.dirty\s*=/g) || []).length
console.log(`  dirty赋值: ${dirtyRefs} 处`)

if (dirtyRefs > 5) {
  console.log('  ⚠️ dirty赋值较多，需确保状态一致性')
}
console.log()

// 3. 检查定时器清理
console.log('【3】检查定时器清理...')
const setIntervalCount = (content.match(/setInterval/g) || []).length
const clearIntervalCount = (content.match(/clearInterval/g) || []).length
console.log(`  setInterval: ${setIntervalCount}`)
console.log(`  clearInterval: ${clearIntervalCount}`)

if (setIntervalCount > clearIntervalCount) {
  warnings.push(`定时器可能未清理（set:${setIntervalCount} vs clear:${clearIntervalCount}）`)
} else {
  console.log('  ✓ 定时器清理正常')
}
console.log()

// 4. 检查ref访问安全性
console.log('【4】检查$refs访问安全性...')
const unsafeRefs = content.match(/this\.\$refs\.\w+\.\w+/g) || []
const safeRefs = content.match(/this\.\$refs\.\w+\s*&&\s*this\.\$refs\.\w+\.\w+/g) || []
console.log(`  不安全访问: ${unsafeRefs.length}`)
console.log(`  安全访问: ${safeRefs.length}`)

if (unsafeRefs.length > 50) {
  warnings.push(`$refs访问较多(${unsafeRefs.length})，建议检查是否都在$nextTick中`)
}
console.log()

// 5. 检查异步错误处理
console.log('【5】检查异步错误处理...')
const thenCount = (content.match(/\.then\(/g) || []).length
const catchCount = (content.match(/\.catch\(/g) || []).length
const finallyCount = (content.match(/\.finally\(/g) || []).length
console.log(`  .then(): ${thenCount}`)
console.log(`  .catch(): ${catchCount}`)
console.log(`  .finally(): ${finallyCount}`)

if (thenCount > catchCount + finallyCount) {
  warnings.push(`部分Promise可能缺少错误处理（then:${thenCount} vs catch/finally:${catchCount + finallyCount}）`)
} else {
  console.log('  ✓ Promise错误处理覆盖较好')
}
console.log()

// 6. 检查v-model双向绑定风险
console.log('【6】检查v-model使用...')
const vModelCount = (content.match(/v-model/g) || []).length
console.log(`  v-model使用: ${vModelCount} 处`)
if (vModelCount > 20) {
  console.log('  ⚠️ v-model较多，需确保不与手动赋值冲突')
}
console.log()

// 7. 检查watch性能
console.log('【7】检查watch配置...')
const watchMatches = content.match(/watch:\s*\{[\s\S]*?\n\s{2}\}/g) || []
if (watchMatches.length > 0) {
  const watchContent = watchMatches[0]
  const deepWatches = (watchContent.match(/deep:\s*true/g) || []).length
  console.log(`  watch数量: ${(watchContent.match(/\w+\s*[:(/]/g) || []).length}`)
  console.log(`  deep watch: ${deepWatches}`)
  if (deepWatches > 3) {
    warnings.push(`deep watch较多(${deepWatches})，可能影响性能`)
  }
}
console.log()

// 8. 检查大数据渲染
console.log('【8】检查大数据渲染风险...')
if (content.includes('v-for') && content.includes('nodeList')) {
  console.log('  nodeList用于v-for渲染')
  if (content.includes(':key="node.id"')) {
    console.log('  ✓ 使用key优化')
  } else {
    warnings.push('v-for可能缺少key')
  }
}
console.log()

// 9. 检查内存泄漏风险
console.log('【9】检查内存泄漏风险...')
const hasBeforeDestroy = content.includes('beforeDestroy')
const hasRemoveListener = content.includes('removeEventListener')
const hasClearInterval = content.includes('clearInterval')

if (hasBeforeDestroy && hasRemoveListener && hasClearInterval) {
  console.log('  ✓ 有完整的清理逻辑')
} else {
  warnings.push('可能缺少部分清理逻辑')
}
console.log()

// 10. 检查跨组件通信
console.log('【10】检查跨组件通信...')
const emitCount = (content.match(/\$emit/g) || []).length
const busCount = (content.match(/\$bus/g) || []).length
console.log(`  $emit: ${emitCount}`)
console.log(`  $bus: ${busCount}`)

if (busCount > 5) {
  warnings.push(`使用$bus较多(${busCount})，建议改为props/emit或Vuex`)
}
console.log()

// 总结
console.log('='.repeat(80))
console.log('【代码质量检查总结】\n')

if (issues.length === 0 && warnings.length === 0) {
  console.log('✓ 代码质量良好，未发现明显问题')
} else {
  if (issues.length > 0) {
    console.log(`❌ 严重问题 (${issues.length}):`)
    issues.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
    console.log()
  }
  if (warnings.length > 0) {
    console.log(`⚠️ 建议优化 (${warnings.length}):`)
    warnings.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
  }
}

console.log('\n' + '='.repeat(80))
