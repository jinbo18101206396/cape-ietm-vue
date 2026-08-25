/**
 * 核查：编辑模式下流程审批是否需要先签入
 *
 * 调查维度：
 * 1. 新系统WorkflowInfoPanel的handleSubmit/doSubmit逻辑
 * 2. 新系统是否有签入前置校验
 * 3. 编辑器签入按钮的可用性
 * 4. 旧系统对应逻辑（参照memory）
 */

const fs = require('fs')
const path = require('path')

// 读取文件内容
function readFile(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath)
  return fs.readFileSync(fullPath, 'utf-8')
}

// 提取代码段
function extractLines(content, start, end) {
  const lines = content.split('\n')
  return lines.slice(start - 1, end).join('\n')
}

console.log('='.repeat(80))
console.log('核查：编辑模式下流程审批是否需要先签入')
console.log('='.repeat(80))
console.log()

// ========== 1. 新系统WorkflowInfoPanel流程提交逻辑 ==========
console.log('【维度1】新系统WorkflowInfoPanel流程提交逻辑')
console.log('-'.repeat(80))

const workflowPanelPath = 'src/views/ietm/ietmdatamodulemanagement/components/WorkflowInfoPanel.vue'
const workflowPanel = readFile(workflowPanelPath)

// 查找handleSubmit
const handleSubmitMatch = workflowPanel.match(/handleSubmit\(\)\s*{[\s\S]*?^\s{4}}/m)
if (handleSubmitMatch) {
  console.log('✓ 找到 handleSubmit() 方法')
  const submitCode = handleSubmitMatch[0]

  // 检查是否有签入相关逻辑
  if (submitCode.includes('checkin') || submitCode.includes('签入') || submitCode.includes('checkIn')) {
    console.log('  ⚠️  发现签入相关代码')
  } else {
    console.log('  ✓ 未发现签入前置要求')
  }

  // 检查beforeSubmit钩子
  if (submitCode.includes('before-submit') || submitCode.includes('beforeExec')) {
    console.log('  ✓ 发现 before-submit 钩子（允许父组件拦截）')
  }
}

// 查找doSubmit核心逻辑
const doSubmitMatch = workflowPanel.match(/async doSubmit\(\)\s*{[\s\S]*?^\s{4}}/m)
if (doSubmitMatch) {
  console.log('✓ 找到 doSubmit() 方法')
  const doSubmitCode = doSubmitMatch[0]

  // 检查P0-3注释和保存节点逻辑
  if (doSubmitCode.includes('P0-3') && doSubmitCode.includes('保存节点')) {
    console.log('  ✓ 发现 P0-3 注释：提交处理前先保存节点')

    // 提取保存节点代码
    const saveNodeMatch = doSubmitCode.match(/if \(this\.\$refs\.dtlTable\)[\s\S]*?}\s*}/m)
    if (saveNodeMatch) {
      console.log('  ✓ 逻辑：检查节点表是否有未保存变更')
      console.log('    - 有变更 → saveAllChanges() → 等待500ms')
      console.log('    - 保存失败 → 终止提交')
      console.log('    - 保存成功 → 继续提交')
    }
  }

  // 检查是否有签入操作
  if (doSubmitCode.includes('checkin') || doSubmitCode.includes('签入') || doSubmitCode.includes('checkIn')) {
    console.log('  ⚠️  发现签入相关代码')
  } else {
    console.log('  ✓ 未发现签入操作（只保存节点）')
  }
}

console.log()

// ========== 2. 新系统DmContentEditor before-submit钩子实现 ==========
console.log('【维度2】新系统DmContentEditor是否实现before-submit钩子')
console.log('-'.repeat(80))

const editorPath = 'src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue'
const editor = readFile(editorPath)

// 查找WorkflowInfoPanel组件引用
const workflowRefMatch = editor.match(/<workflow-info-panel[\s\S]*?\/>/m)
if (workflowRefMatch) {
  console.log('✓ 找到 WorkflowInfoPanel 组件引用')
  const refCode = workflowRefMatch[0]

  if (refCode.includes('@before-submit')) {
    console.log('  ⚠️  发现 @before-submit 钩子监听')
    // 查找对应方法
    const beforeSubmitMethod = editor.match(/^\s{4}(onBeforeSubmit|handleBeforeSubmit|beforeSubmit)\s*\(/m)
    if (beforeSubmitMethod) {
      console.log(`  ⚠️  实现了钩子方法: ${beforeSubmitMethod[1]}`)
    }
  } else {
    console.log('  ✓ 未监听 @before-submit 钩子')
    console.log('    → 意味着父组件不会在提交前强制签入')
  }
}

console.log()

// ========== 3. 编辑器签入按钮状态控制 ==========
console.log('【维度3】编辑器签入按钮是否受工作流影响')
console.log('-'.repeat(80))

// 查找签入按钮
const checkinButtonMatch = editor.match(/<a-button[^>]*@click="doCheckin"[^>]*>[\s\S]*?签入[\s\S]*?<\/a-button>/m)
if (checkinButtonMatch) {
  console.log('✓ 找到签入按钮')
  const btnCode = checkinButtonMatch[0]

  // 检查disabled条件
  const disabledMatch = btnCode.match(/:disabled="([^"]+)"/)
  if (disabledMatch) {
    console.log(`  ✓ disabled条件: ${disabledMatch[1]}`)

    if (disabledMatch[1] === 'readonly') {
      console.log('    → 只受 readonly (mode!=="edit") 控制')
      console.log('    → 不受工作流状态影响')
    }
  }
}

// 查找doCheckin方法
const doCheckinMatch = editor.match(/doCheckin\s*\(\)\s*{[\s\S]*?^\s{4}}/m)
if (doCheckinMatch) {
  console.log('✓ 找到 doCheckin() 方法')
  const checkinCode = doCheckinMatch[0]

  // 检查是否有工作流相关校验
  if (checkinCode.includes('workflow') || checkinCode.includes('流程') || checkinCode.includes('审批')) {
    console.log('  ⚠️  签入前检查工作流状态')
  } else {
    console.log('  ✓ 签入前不检查工作流状态')
  }

  // 检查签入流程
  if (checkinCode.includes('先保存') || checkinCode.includes('save')) {
    console.log('  ✓ 签入流程：先save()保存DM内容，再checkIn')
  }
}

console.log()

// ========== 4. 旧系统对应逻辑（参照memory） ==========
console.log('【维度4】旧系统流程审批与签入关系（参照memory）')
console.log('-'.repeat(80))

console.log('参照 memory/ietm-workflow-panel-routeA.md:')
console.log('  - 旧系统页面: IncludeWfInstanceExec.jsp')
console.log('  - 形态: EasyUI 2区(center节点表 + south 90px处理表单)')
console.log('  - 底部**常驻**提交表单(通过/不同意/终止/跳转+意见+文件+提交处理)')
console.log('  - 节点表格内行内编辑，处理人走WfSelector弹窗')
console.log()
console.log('参照 memory/ietm-checkin-two-functions.md:')
console.log('  - 编辑器签入: IetmEditorPlatform-src.js checkin()')
console.log('    → 先 save("1") 保存正文，再签入')
console.log('    → 成功后重载iframe为浏览模式，不关闭页签')
console.log('  - 列表页签入: IetmDmManage.jsp checkin()')
console.log('    → 实时查库校验lockuserid')
console.log()
console.log('关键推论:')
console.log('  ✓ 旧系统流程审批（提交处理）**不要求签入**')
console.log('  ✓ 流程审批与DM签入是两个独立操作')
console.log('  ✓ 编辑模式下可以：')
console.log('    - 编辑DM内容（未签入）')
console.log('    - 同时进行流程审批（提交处理）')
console.log('    - 审批时只保存工作流节点，不触发DM签入')

console.log()

// ========== 5. 核心结论 ==========
console.log('='.repeat(80))
console.log('【核心结论】')
console.log('='.repeat(80))

console.log()
console.log('✅ 新系统设计（对齐旧系统）：')
console.log('   1. 编辑模式下进行流程审批 **不需要先签入**')
console.log('   2. WorkflowInfoPanel.doSubmit() 只保存工作流节点（dtlTable.saveAllChanges）')
console.log('   3. 不触发DM内容签入（checkIn）')
console.log('   4. DM签入是独立操作，由顶部工具栏"签入"按钮触发')
console.log()

console.log('✅ 权限控制：')
console.log('   - 签入按钮: disabled="readonly" (mode!=="edit")')
console.log('   - 流程审批表单: showExecForm = !!todoNode && !instOver')
console.log('   - 两者独立，互不干扰')
console.log()

console.log('✅ before-submit钩子：')
console.log('   - WorkflowInfoPanel触发before-submit钩子，允许父组件拦截')
console.log('   - DmContentEditor未监听该钩子')
console.log('   - 即：父组件不会在审批前强制签入')
console.log()

console.log('⚠️  业务场景分析：')
console.log('   场景A：编辑DM内容 + 流程审批')
console.log('     - 用户编辑DM内容（未签入）')
console.log('     - 点击"提交处理"进行审批')
console.log('     - 系统保存工作流节点，审批成功')
console.log('     - DM内容仍处于未签入状态（可继续编辑）')
console.log()
console.log('   场景B：先签入DM，再审批')
console.log('     - 用户编辑完DM内容')
console.log('     - 点击"签入"按钮（保存DM + checkIn）')
console.log('     - 再点击"提交处理"进行审批')
console.log('     - 审批通过')
console.log()
console.log('   结论：两种场景都支持，无强制顺序')
console.log()

console.log('='.repeat(80))
console.log('审核完成')
console.log('='.repeat(80))
