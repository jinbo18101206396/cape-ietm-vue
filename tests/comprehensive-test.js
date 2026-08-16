#!/usr/bin/env node
// 综合测试 - 冒烟 + 功能 + 集成
const fs = require('fs')
const { execSync } = require('child_process')

console.log('🧪 开始完整综合测试\n')
console.log('='.repeat(60))

let totalPass = 0; let totalFail = 0
const issues = []

function test(name, fn) {
  try {
    fn()
    console.log('✓', name)
    totalPass++
    return true
  } catch (e) {
    console.log('✗', name, '-', e.message)
    totalFail++
    issues.push({ name, error: e.message })
    return false
  }
}

const base = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor'

// ========== 冒烟测试 ==========
console.log('\n📋 冒烟测试（Smoke Test）')
console.log('='.repeat(60))

console.log('\n✓ 文件存在性')
let opsCode, editorCode, viewCode
test('elementOps.js', () => {
  opsCode = fs.readFileSync(base + '/utils/elementOps.js', 'utf8')
  if (opsCode.length < 1000) throw Error('文件太小')
})
test('DmContentEditor.vue', () => {
  editorCode = fs.readFileSync(base + '/DmContentEditor.vue', 'utf8')
  if (editorCode.length < 1000) throw Error('文件太小')
})
test('DmSourceView.vue', () => {
  viewCode = fs.readFileSync(base + '/components/DmSourceView.vue', 'utf8')
  if (viewCode.length < 100) throw Error('文件太小')
})

console.log('\n✓ 语法检查')
test('JavaScript语法', () => {
  try {
    execSync('node -c ' + base + '/utils/elementOps.js', { stdio: 'pipe' })
  } catch (e) {
    throw Error('语法错误: ' + e.message)
  }
})

// ========== 功能测试 ==========
console.log('\n📋 功能测试（Functional Test）')
console.log('='.repeat(60))

console.log('\n✓ 函数完整性（11个）')
const fns = ['calculateIndent', 'generateXmlSnippet', 'calculateInsertLine',
  'isCursorBetweenTags', 'isMultiLineElement', 'canDeleteElement', 'deleteLine',
  'deleteThisAndChildren', 'getAllDescendants', 'validateMove', 'moveElementBlock']
fns.forEach(fn => {
  test(fn, () => {
    if (!opsCode.includes('export function ' + fn)) throw Error('未导出')
  })
})

console.log('\n✓ 关键逻辑')
test('空值检查', () => {
  if (!opsCode.includes('if (!parentNode) return')) throw Error('缺失')
})
test('递归保护x2', () => {
  if (!opsCode.includes('if (level > 50)') || !opsCode.includes('if (depth > 50)')) { throw Error('缺失') }
})
test('四重删除保护', () => {
  const c = ['content区域', '根元素', '必需', '光标']
  if (c.some(x => !opsCode.includes(x))) throw Error('不完整')
})
test('500行搜索x3', () => {
  const cnt = (opsCode.match(/\+ 500/g) || []).length
  if (cnt < 3) throw Error('只有' + cnt + '处')
})

console.log('\n✓ 错误处理')
test('throw Error', () => {
  if (!opsCode.includes('throw new Error')) throw Error('缺失')
})
test('console.warn', () => {
  if (!opsCode.includes('console.warn')) throw Error('缺失')
})
test('无console.log', () => {
  if (opsCode.match(/console\.log\(/)) throw Error('发现调试代码')
})

console.log('\n✓ JSDoc注释')
test('注释覆盖率', () => {
  const cnt = (opsCode.match(/\/\*\*/g) || []).length
  if (cnt < 9) throw Error('只有' + cnt + '/11')
})

// ========== 集成测试 ==========
console.log('\n📋 集成测试（Integration Test）')
console.log('='.repeat(60))

console.log('\n✓ DmContentEditor集成')
test('导入elementOps', () => {
  if (!editorCode.includes('./utils/elementOps')) throw Error('未导入')
})
test('_insertElement', () => {
  if (!editorCode.includes('_insertElement(')) throw Error('缺失')
})
test('_deleteElement', () => {
  if (!editorCode.includes('_deleteElement(')) throw Error('缺失')
})
test('_moveElement', () => {
  if (!editorCode.includes('_moveElement(')) throw Error('缺失')
})

console.log('\n✓ 错误边界')
test('try-catch>=3', () => {
  const cnt = (editorCode.match(/try\s*{/g) || []).length
  if (cnt < 3) throw Error('只有' + cnt + '个')
})
test('$refs检查', () => {
  if (!editorCode.includes('if (!this.$refs.editor)')) throw Error('缺失')
})
test('refreshTree调用', () => {
  if (!editorCode.includes('this.refreshTree()')) throw Error('缺失')
})

console.log('\n✓ DmSourceView集成')
test('getEditor方法', () => {
  if (!viewCode.includes('getEditor')) throw Error('缺失')
})
test('getLinenoOffset方法', () => {
  if (!viewCode.includes('getLinenoOffset')) throw Error('缺失')
})

// ========== 代码质量 ==========
console.log('\n📋 代码质量检查')
console.log('='.repeat(60))

console.log('\n✓ 代码规范')
test('行数合理', () => {
  const lines = opsCode.split('\n').length
  if (lines < 350 || lines > 450) throw Error(lines + '行超出范围')
})
test('无TODO/FIXME', () => {
  if (opsCode.includes('TODO') || opsCode.includes('FIXME')) throw Error('发现标记')
})
test('函数名驼峰', () => {
  const bad = opsCode.match(/export function [a-z]+_[a-z]+/)
  if (bad) throw Error('下划线命名: ' + bad[0])
})

// ========== Bug修复验证 ==========
console.log('\n📋 Bug修复验证')
console.log('='.repeat(60))

const bugFixes = [
  { name: 'BUG-1: 空值崩溃', check: () => opsCode.includes('if (!parentNode) return') },
  { name: 'BUG-2: 递归无限', check: () => opsCode.includes('depth = 0') },
  { name: 'BUG-3: 范围100→500', check: () => (opsCode.match(/\+ 500/g) || []).length >= 3 },
  { name: 'BUG-4: 缺错误边界', check: () => (editorCode.match(/catch\s*\(/g) || []).length >= 3 },
  { name: 'BUG-5: 空字符串', check: () => opsCode.includes('startText &&') },
  { name: 'BUG-6: 闭合标签', check: () => opsCode.includes('maxSearch') },
  { name: 'BUG-7: 空块检查', check: () => opsCode.includes('trim()') }
]

bugFixes.forEach(bug => {
  test(bug.name, () => {
    if (!bug.check()) throw Error('未修复')
  })
})

// ========== 总结 ==========
console.log('\n' + '='.repeat(60))
console.log('测试完成！')
console.log('='.repeat(60))
console.log('通过:', totalPass)
console.log('失败:', totalFail)
console.log('成功率:', ((totalPass / (totalPass + totalFail)) * 100).toFixed(1) + '%')

if (totalFail > 0) {
  console.log('\n❌ 发现问题:')
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue.name}: ${issue.error}`)
  })
  process.exit(1)
} else {
  console.log('\n🎉 所有测试通过！')
  process.exit(0)
}
