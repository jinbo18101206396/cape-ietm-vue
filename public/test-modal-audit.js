// ========================================
//  弹窗层级问题全面排查
//  检查所有 $confirm 和弹窗的使用模式
// ========================================

(function() {
  'use strict'

  console.log('========================================')
  console.log(' 弹窗层级问题全面排查')
  console.log('========================================\n')

  // 1. 检查当前页面的弹窗状态
  function checkCurrentModals() {
    console.log('--- 1. 当前页面弹窗状态 ---')

    const modals = document.querySelectorAll('.ant-modal')
    const masks = document.querySelectorAll('.ant-modal-mask')
    const confirms = document.querySelectorAll('.ant-modal-confirm')

    console.log(`弹窗总数: ${modals.length}`)
    console.log(`遮罩层总数: ${masks.length}`)
    console.log(`确认框总数: ${confirms.length}`)

    if (modals.length > 0) {
      console.log('\n弹窗详情:')
      modals.forEach((modal, i) => {
        const zIndex = window.getComputedStyle(modal).zIndex
        const visible = modal.offsetParent !== null
        const title = modal.querySelector('.ant-modal-title')?.textContent || '(无标题)'
        console.log(`  ${i + 1}. ${title}`)
        console.log(`     z-index: ${zIndex}, 可见: ${visible}`)
      })
    }

    if (masks.length > 1) {
      console.warn(`⚠️ 检测到多个遮罩层 (${masks.length}个)，可能存在弹窗遮挡问题`)
    }

    console.log('')
  }

  // 2. 读取源码检查 $confirm 的使用模式
  async function auditConfirmUsage() {
    console.log('--- 2. 源码中 $confirm 使用审计 ---\n')

    try {
      const response = await fetch('/src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')
      const code = await response.text()

      // 提取所有 $confirm 调用
      const confirmPattern = /this\.\$confirm\s*\({[\s\S]*?}\s*\)/g
      const matches = code.match(confirmPattern) || []

      console.log(`找到 ${matches.length} 处 $confirm 调用\n`)

      const issues = []

      matches.forEach((match, i) => {
        const lineNumber = code.substring(0, code.indexOf(match)).split('\n').length

        // 检查是否使用了 async onOk
        const hasAsyncOnOk = /onOk\s*:\s*async\s*\(/.test(match)

        // 检查是否返回 Promise
        const hasPromiseReturn = /onOk\s*:\s*\([^)]*\)\s*=>\s*{[\s\S]*?return\s+new\s+Promise/.test(match)

        // 检查是否有嵌套的异步操作（await）
        const hasAwaitInOnOk = /onOk[\s\S]*?await/.test(match)

        // 检查是否可能打开其他弹窗
        const opensModal = /\.(show|open|\$confirm|\$modal)/.test(match)

        const hasIssue = hasAsyncOnOk && !hasPromiseReturn && (hasAwaitInOnOk || opensModal)

        if (hasIssue) {
          issues.push({
            index: i + 1,
            line: lineNumber,
            hasAsyncOnOk,
            hasPromiseReturn,
            hasAwaitInOnOk,
            opensModal
          })
        }

        console.log(`${i + 1}. 第 ${lineNumber} 行`)
        console.log(`   async onOk: ${hasAsyncOnOk ? '是 ⚠️' : '否'}`)
        console.log(`   返回Promise: ${hasPromiseReturn ? '是 ✅' : '否'}`)
        console.log(`   包含await: ${hasAwaitInOnOk ? '是' : '否'}`)
        console.log(`   打开弹窗: ${opensModal ? '是' : '否'}`)

        if (hasIssue) {
          console.log(`   ❌ 潜在问题：async onOk 但未返回 Promise，可能导致弹窗遮挡`)
        }
        console.log('')
      })

      if (issues.length > 0) {
        console.log(`\n❌ 发现 ${issues.length} 处潜在的弹窗层级问题:\n`)
        issues.forEach(issue => {
          console.log(`  - 第 ${issue.line} 行: async onOk 未返回 Promise`)
        })
      } else {
        console.log('\n✅ 未发现明显的弹窗层级问题')
      }

    } catch (err) {
      console.error('源码审计失败:', err.message)
    }

    console.log('')
  }

  // 3. 检查其他可能的弹窗调用
  async function auditOtherModals() {
    console.log('--- 3. 其他弹窗调用审计 ---\n')

    try {
      const response = await fetch('/src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')
      const code = await response.text()

      // 检查 Modal 组件引用
      const modalRefs = code.match(/ref="([^"]*[Mm]odal[^"]*)"/g) || []
      console.log(`找到 ${modalRefs.length} 个 Modal 组件引用:`)
      modalRefs.forEach(ref => {
        const name = ref.match(/ref="([^"]+)"/)[1]
        console.log(`  - ${name}`)
      })

      console.log('')

      // 检查 show/open 调用
      const showPattern = /\$refs\.([^.]+)\.(show|open)\s*\(/g
      const showCalls = code.match(showPattern) || []

      console.log(`找到 ${showCalls.length} 处弹窗打开调用:`)
      showCalls.forEach(call => {
        const match = call.match(/\$refs\.([^.]+)\./)
        if (match) {
          console.log(`  - ${match[1]}`)
        }
      })

      console.log('')

    } catch (err) {
      console.error('弹窗调用审计失败:', err.message)
    }
  }

  // 4. 生成修复建议
  function generateRecommendations() {
    console.log('--- 4. 修复建议 ---\n')

    console.log('对于所有 $confirm 调用，如果 onOk 中有异步操作：\n')
    console.log('❌ 错误写法:')
    console.log(`
    this.$confirm({
      title: '确认',
      onOk: async () => {
        await someAsyncOperation()
        this.$refs.someModal.show()  // 会被遮挡
      }
    })
    `)

    console.log('\n✅ 正确写法:')
    console.log(`
    this.$confirm({
      title: '确认',
      onOk: () => {
        return new Promise(async (resolve, reject) => {
          try {
            await someAsyncOperation()
            await this.$refs.someModal.show()
            resolve()
          } catch (err) {
            reject(err)
          }
        })
      }
    })
    `)

    console.log('\n关键点：')
    console.log('1. onOk 不要直接用 async，而是返回显式的 Promise')
    console.log('2. 所有异步操作都要在 Promise 内部完成')
    console.log('3. 确保 resolve() 在所有操作（包括弹窗关闭）后调用')
    console.log('')
  }

  // 5. 运行测试场景
  async function runModalTests() {
    console.log('--- 5. 实时弹窗测试 ---\n')
    console.log('提示：请手动触发以下操作并观察：\n')
    console.log('1. 点击"重建 refs 与 DOCTYPE" → 确定')
    console.log('   观察：ICN后缀弹窗是否被遮挡')
    console.log('')
    console.log('2. 快速连续点击两次"重建 refs 与 DOCTYPE"')
    console.log('   观察：是否出现多个确认框或异常')
    console.log('')
    console.log('3. 点击其他会触发确认框的操作（如保存、关闭）')
    console.log('   观察：是否有类似的遮挡问题')
    console.log('')
  }

  // 主流程
  async function run() {
    checkCurrentModals()
    await auditConfirmUsage()
    await auditOtherModals()
    generateRecommendations()
    await runModalTests()

    console.log('========================================')
    console.log(' 排查完成')
    console.log('========================================')
    console.log('\n如需运行全面测试，执行：')
    console.log('fetch("/test-regen-comprehensive.js").then(r=>r.text()).then(eval)')
  }

  run().catch(err => {
    console.error('排查失败:', err)
  })

})()
