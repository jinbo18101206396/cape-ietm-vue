/**
 * 验证流程审批签出状态校验修复
 *
 * 验证点：
 * 1. WorkflowInfoPanel是否添加checkoutUser prop
 * 2. handleSubmit是否添加签出状态校验
 * 3. DmContentEditor是否传递checkoutUser
 * 4. loadData是否获取checkoutUser
 */

const fs = require('fs')
const path = require('path')

function readFile(relativePath) {
  const fullPath = path.resolve(__dirname, '..', relativePath)
  return fs.readFileSync(fullPath, 'utf-8')
}

console.log('='.repeat(80))
console.log('验证：流程审批签出状态校验修复')
console.log('='.repeat(80))
console.log()

let passed = 0
let failed = 0

// ========== 验证1：WorkflowInfoPanel props ==========
console.log('【验证1】WorkflowInfoPanel是否添加checkoutUser prop')
console.log('-'.repeat(80))

const workflowPanel = readFile('src/views/ietm/ietmdatamodulemanagement/components/WorkflowInfoPanel.vue')

// 检查props定义
const propsMatch = workflowPanel.match(/checkoutUser:\s*{[\s\S]*?type:\s*String[\s\S]*?default:\s*null[\s\S]*?}/m)
if (propsMatch) {
  console.log('✅ PASS: checkoutUser prop已添加')
  console.log('  定义：')
  console.log('    checkoutUser: {')
  console.log('      type: String,')
  console.log('      default: null')
  console.log('    }')
  passed++
} else {
  console.log('❌ FAIL: checkoutUser prop未找到')
  failed++
}

console.log()

// ========== 验证2：handleSubmit签出状态校验 ==========
console.log('【验证2】handleSubmit是否添加签出状态校验')
console.log('-'.repeat(80))

// 查找handleSubmit方法
const handleSubmitMatch = workflowPanel.match(/handleSubmit\s*\(\)\s*{([\s\S]*?)(?=\n\s{4}\w+\s*\(|$)/)
if (handleSubmitMatch) {
  const handleSubmitCode = handleSubmitMatch[1]

  // 检查签出状态校验
  const checkoutCheckMatch = handleSubmitCode.match(/if\s*\(\s*this\.checkoutUser\s*\)/)
  if (checkoutCheckMatch) {
    console.log('✅ PASS: 签出状态校验已添加')
    console.log('  代码：')
    console.log('    if (this.checkoutUser) {')
    console.log('      this.$message.warning(\'该DM还是签出状态,请签入后再提交后续流程处理。\')')
    console.log('      return')
    console.log('    }')

    // 检查提示文本
    const messageMatch = handleSubmitCode.match(/该DM还是签出状态,请签入后再提交后续流程处理/)
    if (messageMatch) {
      console.log('  ✅ 提示文本正确（对齐旧系统）')
    } else {
      console.log('  ⚠️  提示文本可能不完全一致')
    }

    // 检查是否在before-submit钩子之前
    const beforeSubmitPos = handleSubmitCode.indexOf('before-submit')
    const checkoutCheckPos = handleSubmitCode.indexOf('this.checkoutUser')
    if (checkoutCheckPos < beforeSubmitPos) {
      console.log('  ✅ 校验顺序正确（签出状态检查在钩子之前）')
    } else {
      console.log('  ⚠️  校验顺序可能不当')
    }

    passed++
  } else {
    console.log('❌ FAIL: 签出状态校验未添加')
    console.log('  handleSubmit方法存在，但缺少 if (this.checkoutUser) 校验')
    failed++
  }
} else {
  console.log('❌ FAIL: 未找到handleSubmit方法')
  failed++
}

console.log()

// ========== 验证3：DmContentEditor传递prop ==========
console.log('【验证3】DmContentEditor是否传递checkoutUser')
console.log('-'.repeat(80))

const editor = readFile('src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')

// 检查模板中是否传递:checkout-user
const templateMatch = editor.match(/<workflow-info-panel[\s\S]*?\/>/m)
if (templateMatch) {
  const templateCode = templateMatch[0]

  if (templateCode.includes(':checkout-user="checkoutUser"')) {
    console.log('✅ PASS: checkoutUser prop已传递')
    console.log('  模板：')
    console.log('    <workflow-info-panel')
    console.log('      :formid="id"')
    console.log('      :readonly="readonly"')
    console.log('      :checkout-user="checkoutUser"')
    console.log('      ...')
    console.log('    />')
    passed++
  } else {
    console.log('❌ FAIL: checkoutUser prop未传递')
    console.log('  找到workflow-info-panel组件，但缺少 :checkout-user 绑定')
    failed++
  }
} else {
  console.log('❌ FAIL: 未找到workflow-info-panel组件')
  failed++
}

console.log()

// ========== 验证4：DmContentEditor data字段 ==========
console.log('【验证4】DmContentEditor是否添加checkoutUser字段')
console.log('-'.repeat(80))

// 检查data中是否定义checkoutUser
const dataMatch = editor.match(/data\s*\(\)\s*{[\s\S]*?return\s*{([\s\S]*?)^\s{4}}/m)
if (dataMatch) {
  const dataCode = dataMatch[1]

  if (dataCode.includes('checkoutUser:')) {
    console.log('✅ PASS: checkoutUser字段已添加到data')
    console.log('  定义：')
    console.log('    checkoutUser: null')
    passed++
  } else {
    console.log('❌ FAIL: checkoutUser字段未添加到data')
    failed++
  }
} else {
  console.log('❌ FAIL: 未找到data方法')
  failed++
}

console.log()

// ========== 验证5：loadData获取checkoutUser ==========
console.log('【验证5】loadData是否获取checkoutUser')
console.log('-'.repeat(80))

// 检查loadData中是否赋值checkoutUser
const loadDataMatch = editor.match(/loadData\s*\(\)\s*{([\s\S]*?)(?=\n\s{4}\w+\s*\()/m)
if (loadDataMatch) {
  const loadDataCode = loadDataMatch[1]

  if (loadDataCode.includes('this.checkoutUser') && loadDataCode.includes('r.checkoutUser')) {
    console.log('✅ PASS: loadData中获取checkoutUser')
    console.log('  代码：')
    console.log('    this.checkoutUser = r.checkoutUser || null')
    passed++
  } else {
    console.log('❌ FAIL: loadData中未获取checkoutUser')
    console.log('  loadData方法存在，但未找到 this.checkoutUser = r.checkoutUser 赋值')
    failed++
  }
} else {
  console.log('❌ FAIL: 未找到loadData方法')
  failed++
}

console.log()

// ========== 总结 ==========
console.log('='.repeat(80))
console.log('验证总结')
console.log('='.repeat(80))
console.log()
console.log(`✅ 通过: ${passed}/5`)
console.log(`❌ 失败: ${failed}/5`)
console.log()

if (failed === 0) {
  console.log('🎉 所有验证通过！前端修复完成。')
  console.log()
  console.log('⚠️  下一步：')
  console.log('  1. 修改后端 DmContentService.load() 返回 checkoutUser')
  console.log('  2. 编写单元测试')
  console.log('  3. 进行E2E真实UI验证')
  console.log()
} else {
  console.log('⚠️  部分验证失败，请检查修复是否完整。')
  console.log()
  process.exit(1)
}

// ========== 后端待办提示 ==========
console.log('='.repeat(80))
console.log('后端待修复项')
console.log('='.repeat(80))
console.log()
console.log('文件: DmContentService.java (或相应的Service/Controller)')
console.log('接口: GET /ietm/dm-content/load/{id}')
console.log()
console.log('需要修改:')
console.log('  当前返回: { xml, xsdSchema, schema, ... version }')
console.log('  需要添加: { ..., checkoutUser: "admin" }  // DM的签出用户')
console.log()
console.log('示例代码:')
console.log('  IetmDataModule dm = ietmDataModuleService.getById(id);')
console.log('  String checkoutUser = dm != null ? dm.getCheckoutUser() : null;')
console.log('  result.put("checkoutUser", checkoutUser);')
console.log()
console.log('='.repeat(80))
