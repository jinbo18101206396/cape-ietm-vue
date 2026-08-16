// ========================================
//  §16.4 重建 refs 与 DOCTYPE 全面测试
//  包含：场景测试 + 边界测试 + UI交互测试
// ========================================

(function() {
  'use strict'

  const testResults = []
  let passCount = 0
  let failCount = 0

  // 辅助函数：等待
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  // 辅助函数：等待元素出现
  const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const check = () => {
        const el = document.querySelector(selector)
        if (el) {
          resolve(el)
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`元素未出现: ${selector}`))
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }

  // 辅助函数：等待元素消失
  const waitForElementGone = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const check = () => {
        const el = document.querySelector(selector)
        if (!el || el.offsetParent === null) {
          resolve()
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`元素未消失: ${selector}`))
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }

  // 辅助函数：点击确认对话框
  async function confirmDialog() {
    console.log('[confirmDialog] 等待确认框出现...')
    await waitForElement('.ant-modal-confirm')
    await sleep(500) // 等待动画

    const okBtn = document.querySelector('.ant-modal-confirm .ant-btn-primary')
    if (!okBtn) throw new Error('未找到确定按钮')

    console.log('[confirmDialog] 点击确定')
    okBtn.click()

    // 等待确认框开始关闭（不等待完全消失，因为可能有后续弹窗）
    await sleep(300)
  }

  // 辅助函数：关闭 ICN 后缀弹窗
  async function closeIcnSuffixModal(action = 'ok') {
    console.log('[closeIcnSuffixModal] 等待 ICN 后缀弹窗...')

    try {
      // 等待弹窗出现（标题包含"ICN"或"后缀"）
      await waitForElement('.ant-modal:not(.ant-modal-confirm)', 3000)
      await sleep(500)

      const modal = document.querySelector('.ant-modal:not(.ant-modal-confirm)')
      if (!modal) throw new Error('未找到 ICN 后缀弹窗')

      // 检查是否被遮挡
      const computedStyle = window.getComputedStyle(modal)
      const zIndex = parseInt(computedStyle.zIndex)
      console.log(`[closeIcnSuffixModal] 弹窗 z-index: ${zIndex}`)

      // 检查是否有多个遮罩层
      const masks = document.querySelectorAll('.ant-modal-mask')
      console.log(`[closeIcnSuffixModal] 当前遮罩层数量: ${masks.length}`)

      if (masks.length > 1) {
        console.warn('[closeIcnSuffixModal] ⚠️ 检测到多个遮罩层，可能存在弹窗遮挡问题')
      }

      // 点击按钮
      const btn = action === 'ok'
        ? modal.querySelector('.ant-btn-primary')
        : modal.querySelector('.ant-btn:not(.ant-btn-primary)')

      if (!btn) throw new Error(`未找到${action}按钮`)

      console.log(`[closeIcnSuffixModal] 点击${action === 'ok' ? '确定' : '取消'}`)
      btn.click()

      // 等待弹窗关闭
      await waitForElementGone('.ant-modal:not(.ant-modal-confirm)', 2000)
      await sleep(300)

      return { zIndex, maskCount: masks.length }
    } catch (err) {
      console.error('[closeIcnSuffixModal] 错误:', err.message)
      // ICN 后缀弹窗可能不出现（没有图形元素）
      return { skipped: true, reason: err.message }
    }
  }

  // 辅助函数：获取编辑器组件
  function getEditorComponent() {
    const app = document.querySelector('#app').__vue__
    let editorComp = null

    function findEditor(component) {
      if (!component) return
      if (component.$options.name === 'DmContentEditor') {
        editorComp = component
        return
      }
      if (component.$children) {
        for (const child of component.$children) {
          findEditor(child)
          if (editorComp) return
        }
      }
    }

    findEditor(app)
    return editorComp
  }

  // 辅助函数：设置编辑器内容
  async function setEditorContent(xml) {
    const comp = getEditorComponent()
    if (!comp) throw new Error('未找到编辑器组件')

    const editor = comp.$refs.editor.getEditor()
    editor.setValue(xml)
    await sleep(300)
    comp.refreshTree()
    await sleep(300)
  }

  // 辅助函数：点击重建按钮
  async function clickRegenButton() {
    console.log('[clickRegenButton] 查找并点击重建按钮...')

    // 查找"重建Refs"按钮
    const buttons = Array.from(document.querySelectorAll('.ant-btn'))
    const regenBtn = buttons.find(btn =>
      btn.textContent.includes('重建') ||
      btn.title?.includes('重建') ||
      btn.querySelector('[type="sync"]')
    )

    if (!regenBtn) throw new Error('未找到重建Refs按钮')
    if (regenBtn.disabled) throw new Error('重建按钮被禁用')

    console.log('[clickRegenButton] 点击重建按钮')
    regenBtn.click()
    await sleep(200)
  }

  // ============================================
  //  测试用例
  // ============================================

  // 场景1：正常流程 - 有图形元素
  async function testScenario1() {
    console.log('\n--- 场景1: 正常流程（有图形） ---')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <para>测试内容</para>
      <graphic infoEntityIdent="ICN-TEST-001"/>
    </description>
  </content>
</dmodule>`

    try {
      await setEditorContent(xml)
      await clickRegenButton()
      await confirmDialog()

      const icnResult = await closeIcnSuffixModal('ok')

      // 检查结果
      const comp = getEditorComponent()
      const finalXml = comp.$refs.editor.getEditor().getValue()

      const hasRefs = finalXml.includes('<refs')
      const hasDoctype = finalXml.includes('<!DOCTYPE')
      const hasEntity = finalXml.includes('<!ENTITY')
      const modalIssue = icnResult.maskCount > 1

      const passed = hasRefs && hasDoctype && hasEntity && !modalIssue

      if (passed) passCount++
      else failCount++

      testResults.push({
        name: '场景1: 正常流程（有图形）',
        passed,
        details: { hasRefs, hasDoctype, hasEntity, modalIssue, icnResult }
      })

      console.log(passed ? '✅' : '❌', '场景1:', { hasRefs, hasDoctype, hasEntity, modalIssue })

    } catch (err) {
      failCount++
      testResults.push({
        name: '场景1: 正常流程（有图形）',
        passed: false,
        error: err.message
      })
      console.log('❌ 场景1 失败:', err.message)
    }
  }

  // 场景2：无图形元素（不应出现ICN后缀弹窗）
  async function testScenario2() {
    console.log('\n--- 场景2: 无图形元素 ---')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <para>测试内容（无图形）</para>
    </description>
  </content>
</dmodule>`

    try {
      await setEditorContent(xml)
      await clickRegenButton()
      await confirmDialog()

      // 不应该出现 ICN 后缀弹窗，直接完成
      const icnResult = await closeIcnSuffixModal('ok')

      const comp = getEditorComponent()
      const finalXml = comp.$refs.editor.getEditor().getValue()

      const hasEmptyDoctype = finalXml.includes('<!DOCTYPE dmodule[]>')
      const noEntity = !finalXml.includes('<!ENTITY')
      const noIcnModal = icnResult.skipped === true

      const passed = hasEmptyDoctype && noEntity && noIcnModal

      if (passed) passCount++
      else failCount++

      testResults.push({
        name: '场景2: 无图形元素',
        passed,
        details: { hasEmptyDoctype, noEntity, noIcnModal }
      })

      console.log(passed ? '✅' : '❌', '场景2:', { hasEmptyDoctype, noEntity, noIcnModal })

    } catch (err) {
      failCount++
      testResults.push({
        name: '场景2: 无图形元素',
        passed: false,
        error: err.message
      })
      console.log('❌ 场景2 失败:', err.message)
    }
  }

  // 场景3：取消ICN后缀弹窗
  async function testScenario3() {
    console.log('\n--- 场景3: 取消ICN后缀弹窗 ---')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <graphic infoEntityIdent="ICN-CANCEL-TEST"/>
    </description>
  </content>
</dmodule>`

    try {
      await setEditorContent(xml)
      await clickRegenButton()
      await confirmDialog()

      const icnResult = await closeIcnSuffixModal('cancel')

      const modalIssue = icnResult.maskCount > 1
      const passed = !modalIssue

      if (passed) passCount++
      else failCount++

      testResults.push({
        name: '场景3: 取消ICN后缀弹窗',
        passed,
        details: { modalIssue, icnResult }
      })

      console.log(passed ? '✅' : '❌', '场景3:', { modalIssue })

    } catch (err) {
      failCount++
      testResults.push({
        name: '场景3: 取消ICN后缀弹窗',
        passed: false,
        error: err.message
      })
      console.log('❌ 场景3 失败:', err.message)
    }
  }

  // 场景4：多个图形元素
  async function testScenario4() {
    console.log('\n--- 场景4: 多个图形元素 ---')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <graphic infoEntityIdent="ICN-001"/>
      <graphic infoEntityIdent="ICN-002"/>
      <multimediaObject infoEntityIdent="ICN-003"/>
    </description>
  </content>
</dmodule>`

    try {
      await setEditorContent(xml)
      await clickRegenButton()
      await confirmDialog()

      const icnResult = await closeIcnSuffixModal('ok')

      const comp = getEditorComponent()
      const finalXml = comp.$refs.editor.getEditor().getValue()

      const entity1 = finalXml.includes('ICN-001')
      const entity2 = finalXml.includes('ICN-002')
      const entity3 = finalXml.includes('ICN-003')
      const modalIssue = icnResult.maskCount > 1

      const passed = entity1 && entity2 && entity3 && !modalIssue

      if (passed) passCount++
      else failCount++

      testResults.push({
        name: '场景4: 多个图形元素',
        passed,
        details: { entity1, entity2, entity3, modalIssue }
      })

      console.log(passed ? '✅' : '❌', '场景4:', { entity1, entity2, entity3, modalIssue })

    } catch (err) {
      failCount++
      testResults.push({
        name: '场景4: 多个图形元素',
        passed: false,
        error: err.message
      })
      console.log('❌ 场景4 失败:', err.message)
    }
  }

  // 边界测试1：空infoEntityIdent
  async function testBoundary1() {
    console.log('\n--- 边界1: 空infoEntityIdent ---')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <graphic infoEntityIdent=""/>
      <graphic infoEntityIdent="ICN-VALID"/>
    </description>
  </content>
</dmodule>`

    try {
      await setEditorContent(xml)
      await clickRegenButton()
      await confirmDialog()

      const icnResult = await closeIcnSuffixModal('ok')

      const comp = getEditorComponent()
      const finalXml = comp.$refs.editor.getEditor().getValue()

      const hasValidEntity = finalXml.includes('ICN-VALID')
      const noEmptyEntity = !finalXml.match(/<!ENTITY\s+SYSTEM/)
      const modalIssue = icnResult.maskCount > 1

      const passed = hasValidEntity && noEmptyEntity && !modalIssue

      if (passed) passCount++
      else failCount++

      testResults.push({
        name: '边界1: 空infoEntityIdent',
        passed,
        details: { hasValidEntity, noEmptyEntity, modalIssue }
      })

      console.log(passed ? '✅' : '❌', '边界1:', { hasValidEntity, noEmptyEntity, modalIssue })

    } catch (err) {
      failCount++
      testResults.push({
        name: '边界1: 空infoEntityIdent',
        passed: false,
        error: err.message
      })
      console.log('❌ 边界1 失败:', err.message)
    }
  }

  // 边界测试2：已存在refs块（替换）
  async function testBoundary2() {
    console.log('\n--- 边界2: 已存在refs块 ---')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <refs>
      <dmRef>
        <dmRefIdent>
          <dmCode modelIdentCode="OLD" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="999" infoCodeVariant="A" itemLocationCode="A"/>
        </dmRefIdent>
      </dmRef>
    </refs>
    <description>
      <para>测试</para>
      <dmRef>
        <dmRefIdent>
          <dmCode modelIdentCode="NEW" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="111" infoCodeVariant="A" itemLocationCode="A"/>
        </dmRefIdent>
      </dmRef>
    </description>
  </content>
</dmodule>`

    try {
      await setEditorContent(xml)
      await clickRegenButton()
      await confirmDialog()

      const icnResult = await closeIcnSuffixModal('ok')

      const comp = getEditorComponent()
      const finalXml = comp.$refs.editor.getEditor().getValue()

      const oldRemoved = !finalXml.includes('infoCode="999"')
      const newAdded = finalXml.includes('infoCode="111"')
      const singleRefs = (finalXml.match(/<refs/g) || []).length === 1
      const modalIssue = icnResult.maskCount > 1

      const passed = oldRemoved && newAdded && singleRefs && !modalIssue

      if (passed) passCount++
      else failCount++

      testResults.push({
        name: '边界2: 已存在refs块',
        passed,
        details: { oldRemoved, newAdded, singleRefs, modalIssue }
      })

      console.log(passed ? '✅' : '❌', '边界2:', { oldRemoved, newAdded, singleRefs, modalIssue })

    } catch (err) {
      failCount++
      testResults.push({
        name: '边界2: 已存在refs块',
        passed: false,
        error: err.message
      })
      console.log('❌ 边界2 失败:', err.message)
    }
  }

  // 边界测试3：快速双击（防重复）
  async function testBoundary3() {
    console.log('\n--- 边界3: 快速双击防重复 ---')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <graphic infoEntityIdent="ICN-DOUBLE-CLICK"/>
    </description>
  </content>
</dmodule>`

    try {
      await setEditorContent(xml)

      // 快速双击
      await clickRegenButton()
      await sleep(100)
      await clickRegenButton() // 第二次点击应该被忽略或处理正确

      await confirmDialog()
      const icnResult = await closeIcnSuffixModal('ok')

      // 检查是否只有一个确认框、一个ICN弹窗
      const modals = document.querySelectorAll('.ant-modal')
      const passed = modals.length <= 1 && icnResult.maskCount <= 1

      if (passed) passCount++
      else failCount++

      testResults.push({
        name: '边界3: 快速双击防重复',
        passed,
        details: { modalCount: modals.length, maskCount: icnResult.maskCount }
      })

      console.log(passed ? '✅' : '❌', '边界3:', { modalCount: modals.length, maskCount: icnResult.maskCount })

    } catch (err) {
      failCount++
      testResults.push({
        name: '边界3: 快速双击防重复',
        passed: false,
        error: err.message
      })
      console.log('❌ 边界3 失败:', err.message)
    }
  }

  // ============================================
  //  主测试流程
  // ============================================
  async function runAllTests() {
    console.log('========================================')
    console.log(' §16.4 重建 refs 与 DOCTYPE 全面测试')
    console.log('========================================\n')

    const comp = getEditorComponent()
    if (!comp) {
      console.error('❌ 未找到编辑器组件')
      return
    }
    console.log('✅ 找到编辑器组件\n')

    // 运行所有测试
    await testScenario1()
    await sleep(1000)

    await testScenario2()
    await sleep(1000)

    await testScenario3()
    await sleep(1000)

    await testScenario4()
    await sleep(1000)

    await testBoundary1()
    await sleep(1000)

    await testBoundary2()
    await sleep(1000)

    await testBoundary3()
    await sleep(1000)

    // 输出报告
    console.log('\n========================================')
    console.log(' 测试报告')
    console.log('========================================\n')
    console.log(`总计: ${testResults.length} 个测试`)
    console.log(`✅ 通过: ${passCount}`)
    console.log(`❌ 失败: ${failCount}`)
    console.log(`\n通过率: ${Math.round(passCount / testResults.length * 100)}%\n`)

    if (failCount > 0) {
      console.log('失败的测试:')
      testResults.filter(t => !t.passed).forEach(t => {
        console.log(`  - ${t.name}`)
        if (t.error) {
          console.log(`    错误: ${t.error}`)
        }
        if (t.details) {
          console.log(`    详情:`, t.details)
        }
      })
    }

    console.log('\n测试完成！')
    console.log('详细结果已保存在 window.__testResults')

    window.__testResults = testResults
    window.__testSummary = {
      total: testResults.length,
      passed: passCount,
      failed: failCount,
      passRate: `${Math.round(passCount / testResults.length * 100)}%`
    }

    // 快速摘要
    console.log('\n=== 快速摘要 ===')
    console.table(window.__testSummary)
    console.table(testResults)
  }

  // 启动测试
  runAllTests().catch(err => {
    console.error('测试运行失败:', err)
  })

})()
