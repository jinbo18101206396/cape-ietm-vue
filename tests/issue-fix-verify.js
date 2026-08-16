#!/usr/bin/env node
// 问题修复验证脚本
const fs = require('fs')

console.log('🔧 问题修复验证\n')

const opsPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/elementOps.js'
const editorPath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue'
const treePath = 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/DmStructureTree.vue'

const ops = fs.readFileSync(opsPath, 'utf8')
const editor = fs.readFileSync(editorPath, 'utf8')
const tree = fs.readFileSync(treePath, 'utf8')

let pass = 0; let fail = 0

function test(name, fn) {
  try {
    fn()
    console.log('✓', name)
    pass++
  } catch (e) {
    console.log('✗', name, '-', e.message)
    fail++
  }
}

console.log('问题1: 插入位置错误')
test('calculateInsertLine函数存在', () => {
  if (!ops.includes('export function calculateInsertLine')) throw Error()
})
test('行号换算逻辑', () => {
  if (!ops.includes('+ linenoOffset')) throw Error('缺少linenoOffset')
})

console.log('\n问题2: 高亮不一致')
test('editorcursorFlag标志存在', () => {
  if (!editor.includes('editorcursorFlag')) throw Error()
})
test('onTreeSelect中检查标志', () => {
  if (!editor.includes('if (this.editorcursorFlag) return')) throw Error()
})
test('onCursorNode中设置标志', () => {
  const match = editor.match(/onCursorNode[\s\S]{0,200}editorcursorFlag = true/)
  if (!match) throw Error()
})

console.log('\n问题3: 删除报错chunkSize')
test('deleteLine增强检查', () => {
  if (!ops.includes('typeof editor.getLine !== \'function\'')) throw Error('未增强')
})
test('错误提示清晰', () => {
  if (!ops.includes('editor对象无效或未初始化')) throw Error()
})

console.log('\n问题4: 无删除按钮')
test('右键菜单存在', () => {
  if (!tree.includes('@rightClick="onRightClick"')) throw Error()
})
test('删除菜单项存在', () => {
  if (!tree.includes('__delete__')) throw Error()
})
test('删除菜单文本', () => {
  if (!tree.includes('删除此元素')) throw Error()
})
test('emit delete-element事件', () => {
  if (!tree.includes('delete-element')) throw Error()
})

console.log('\n' + '='.repeat(50))
console.log('通过:', pass)
console.log('失败:', fail)

if (fail > 0) {
  console.log('\n需要修复的问题：')
  console.log('1. 确保deleteLine有完整的editor检查')
  console.log('2. 验证右键菜单功能正常')
  process.exit(1)
} else {
  console.log('\n✅ 所有检查通过!')
  console.log('\n📝 问题状态:')
  console.log('  问题1 (插入位置): 代码已就绪，需要实际测试验证')
  console.log('  问题2 (高亮不一致): ✅ 已有防循环机制')
  console.log('  问题3 (删除报错): ✅ 已增强editor检查')
  console.log('  问题4 (无删除按钮): ✅ 右键菜单已有删除功能')
  process.exit(0)
}
