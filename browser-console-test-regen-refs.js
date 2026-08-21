/**
 * §16.4 重建 refs 与 DOCTYPE - 浏览器 Console 测试脚本
 *
 * 使用方法：
 * 1. 打开测试 DM 编辑器页面
 * 2. 打开浏览器开发者工具 Console
 * 3. 复制粘贴此脚本并回车执行
 * 4. 查看测试报告
 *
 * 此脚本会：
 * - 自动查找 Vue 编辑器组件
 * - 模拟点击"重建Refs"按钮
 * - 验证 XML 结构完整性
 * - 输出详细的测试报告
 */

(async function runRegenRefsTests() {
  console.log('%c========================================', 'color: blue; font-weight: bold')
  console.log('%c §16.4 重建 refs 与 DOCTYPE 测试套件', 'color: blue; font-weight: bold')
  console.log('%c========================================\n', 'color: blue; font-weight: bold')

  const results = []
  let passCount = 0
  let failCount = 0

  // 工具函数：查找编辑器组件
  function findEditorComponent() {
    const app = document.querySelector('#app').__vue__

    function findEditor(vm) {
      if (vm.$refs && vm.$refs.editor && vm.$refs.editor.getLinenoOffset) {
        return vm
      }
      if (vm.$children) {
        for (let child of vm.$children) {
          let result = findEditor(child)
          if (result) return result
        }
      }
      return null
    }

    return findEditor(app)
  }

  // 工具函数：等待
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 工具函数：点击按钮
  function clickRegenRefsButton() {
    const button = document.querySelector('button[title*="重建"]')
    if (!button) {
      throw new Error('未找到"重建Refs"按钮')
    }
    button.click()
  }

  // 工具函数：确认弹窗
  async function confirmDialog() {
    await sleep(300)
    const confirmBtn = document.querySelector('.ant-modal-confirm .ant-btn-primary')
    if (!confirmBtn) {
      throw new Error('未找到确认按钮')
    }
    confirmBtn.click()
  }

  // 工具函数：验证 XML 结构
  function validateXmlStructure(xml, testName) {
    const errors = []

    // 1. XML 声明
    if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
      errors.push('缺少 XML 声明')
    }

    // 2. DOCTYPE
    if (!xml.includes('<!DOCTYPE dmodule')) {
      errors.push('缺少 DOCTYPE 声明')
    }

    // 3. <dmodule> 根元素
    if (!xml.includes('<dmodule xmlns:dc=')) {
      errors.push('缺少 <dmodule> 根元素或 xmlns:dc 属性')
    }

    if (!xml.includes('xmlns:xlink=')) {
      errors.push('缺少 xmlns:xlink 属性')
    }

    if (!xml.includes('xsi:noNamespaceSchemaLocation=')) {
      errors.push('缺少 xsi:noNamespaceSchemaLocation 属性')
    }

    // 4. 顺序验证
    const xmlDeclIndex = xml.indexOf('<?xml')
    const doctypeIndex = xml.indexOf('<!DOCTYPE')
    const dmoduleIndex = xml.indexOf('<dmodule')

    if (xmlDeclIndex === -1 || doctypeIndex === -1 || dmoduleIndex === -1) {
      errors.push('缺少关键元素')
    } else {
      if (xmlDeclIndex > doctypeIndex) {
        errors.push('XML 声明应在 DOCTYPE 之前')
      }
      if (doctypeIndex > dmoduleIndex) {
        errors.push('DOCTYPE 应在 <dmodule> 之前')
      }
    }

    return errors
  }

  // 记录测试结果
  function recordResult(testId, testName, passed, details) {
    results.push({ testId, testName, passed, details })
    if (passed) {
      passCount++
      console.log(`%c✅ ${testId}: ${testName}`, 'color: green; font-weight: bold')
    } else {
      failCount++
      console.log(`%c❌ ${testId}: ${testName}`, 'color: red; font-weight: bold')
    }
    if (details) {
      console.log('   详情:', details)
    }
    console.log('')
  }

  try {
    // 查找编辑器组件
    console.log('🔍 正在查找编辑器组件...')
    const editor = findEditorComponent()

    if (!editor) {
      console.error('❌ 未找到编辑器组件，请确保：')
      console.error('   1. 已打开 DM 编辑器页面')
      console.error('   2. 编辑器已完全加载')
      return
    }

    console.log('✅ 找到编辑器组件\n')
    window.__testEditor = editor

    // ========================================
    // TC-01: 基础功能测试 - 无 DOCTYPE 无图形
    // ========================================
    console.log('%c--- TC-01: 无DOCTYPE无图形 ---', 'color: cyan; font-weight: bold')

    try {
      // 准备：清除 DOCTYPE 和 graphic
      let content = editor.content
      content = content.replace(/<!DOCTYPE[^>]*\[[^\]]*\]>/g, '')
      content = content.replace(/<graphic[^>]*\/>/g, '')
      content = content.replace(/<multimediaObject[^>]*>[\s\S]*?<\/multimediaObject>/g, '')

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      await sleep(500)

      const beforeXml = editor.$refs.editor.getEditor().getValue()
      console.log('   操作前 XML 前 150 字符:', beforeXml.substring(0, 150))

      // 执行
      clickRegenRefsButton()
      await confirmDialog()
      await sleep(1500)

      // 验证
      const afterXml = editor.$refs.editor.getEditor().getValue()
      const errors = validateXmlStructure(afterXml, 'TC-01')

      // 特定检查：应该生成空 DOCTYPE
      const hasEmptyDoctype = afterXml.match(/<!DOCTYPE dmodule\[\s*\]>/)

      if (errors.length === 0 && hasEmptyDoctype) {
        recordResult('TC-01', '无DOCTYPE无图形 - 应生成空DOCTYPE并保留结构', true, '生成了空 DOCTYPE: <!DOCTYPE dmodule[]>')
      } else {
        recordResult('TC-01', '无DOCTYPE无图形 - 应生成空DOCTYPE并保留结构', false, {
          errors,
          hasEmptyDoctype: !!hasEmptyDoctype,
          xmlPreview: afterXml.substring(0, 300)
        })
      }

    } catch (err) {
      recordResult('TC-01', '无DOCTYPE无图形 - 应生成空DOCTYPE并保留结构', false, err.message)
    }

    // ========================================
    // TC-02: 有 DOCTYPE 有图形元素
    // ========================================
    console.log('%c--- TC-02: 有DOCTYPE有图形 ---', 'color: cyan; font-weight: bold')

    try {
      // 准备：添加 DOCTYPE 和 graphic
      let content = editor.content

      // 确保有 DOCTYPE
      if (!content.includes('<!DOCTYPE')) {
        const dmoduleIndex = content.indexOf('<dmodule')
        const before = content.substring(0, dmoduleIndex)
        const after = content.substring(dmoduleIndex)
        content = before + '<!DOCTYPE dmodule[\n<!NOTATION cgm PUBLIC "image/cgm">\n<!ENTITY ICN-TEST SYSTEM "ICN-TEST.cgm" NDATA cgm>\n]>\n' + after
      }

      // 添加 graphic
      if (!content.includes('infoEntityIdent="ICN-TEST"')) {
        content = content.replace(
          /(<description>)/,
          '<graphic infoEntityIdent="ICN-TEST"/>\n    $1'
        )
      }

      // 更新 icnlist
      editor.icnlist = ['ICN-TEST.cgm']

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      editor.$refs.editor.formateDM()
      editor.refreshTree()  // ✅ 格式化后刷新 nodeList
      await sleep(500)

      // 执行
      clickRegenRefsButton()
      await confirmDialog()
      await sleep(1500)

      // 验证
      const afterXml = editor.$refs.editor.getEditor().getValue()
      const errors = validateXmlStructure(afterXml, 'TC-02')

      const hasNotation = afterXml.includes('<!NOTATION cgm PUBLIC')
      const hasEntity = afterXml.match(/<!ENTITY ICN-TEST SYSTEM "ICN-TEST\.cgm" NDATA cgm>/)

      if (errors.length === 0 && hasNotation && hasEntity) {
        recordResult('TC-02', '有DOCTYPE有图形 - 应替换DOCTYPE并生成ENTITY', true, {
          hasNotation,
          hasEntity: !!hasEntity
        })
      } else {
        recordResult('TC-02', '有DOCTYPE有图形 - 应替换DOCTYPE并生成ENTITY', false, {
          errors,
          hasNotation,
          hasEntity: !!hasEntity,
          doctypeContent: afterXml.substring(afterXml.indexOf('<!DOCTYPE'), afterXml.indexOf('<dmodule'))
        })
      }

    } catch (err) {
      recordResult('TC-02', '有DOCTYPE有图形 - 应替换DOCTYPE并生成ENTITY', false, err.message)
    }

    // ========================================
    // TC-03: 已有 refs 块 - 测试替换
    // ========================================
    console.log('%c--- TC-03: 已有refs块替换 ---', 'color: cyan; font-weight: bold')

    try {
      // 准备：添加旧 refs 和新 dmRef
      let content = editor.content

      // 移除已有的 refs（如果有）
      content = content.replace(/<refs>[\s\S]*?<\/refs>/g, '')

      // 添加旧 refs 块
      content = content.replace(
        /<content>/,
        '<content>\n    <refs>\n      <dmRef><dmRefIdent><dmCode modelIdentCode="OLD" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>\n    </refs>'
      )

      // 在 description 中添加新 dmRef
      content = content.replace(
        /(<description>[\s\S]*?)(<\/description>)/,
        '$1<dmRef><dmRefIdent><dmCode modelIdentCode="NEW" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>$2'
      )

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      editor.$refs.editor.formateDM()
      editor.refreshTree()  // ✅ 格式化后刷新 nodeList
      await sleep(500)

      // 记录 description 位置
      const beforeXml = editor.$refs.editor.getEditor().getValue()
      const descMatch = beforeXml.match(/<description>([\s\S]{0,100})/)
      const descPreview = descMatch ? descMatch[0] : ''

      // 执行
      clickRegenRefsButton()
      await confirmDialog()
      await sleep(1500)

      // 验证
      const afterXml = editor.$refs.editor.getEditor().getValue()
      const errors = validateXmlStructure(afterXml, 'TC-03')

      const hasOld = afterXml.includes('modelIdentCode="OLD"')
      const hasNew = afterXml.includes('modelIdentCode="NEW"')
      const hasDescription = afterXml.includes('<description>')
      const descriptionPreserved = afterXml.includes(descPreview)

      if (errors.length === 0 && !hasOld && hasNew && hasDescription && descriptionPreserved) {
        recordResult('TC-03', '已有refs块 - 应正确替换不误删后续内容', true, {
          旧refs已删除: !hasOld,
          新refs已添加: hasNew,
          description保留: descriptionPreserved
        })
      } else {
        recordResult('TC-03', '已有refs块 - 应正确替换不误删后续内容', false, {
          errors,
          旧refs已删除: !hasOld,
          新refs已添加: hasNew,
          description保留: descriptionPreserved,
          refsContent: afterXml.match(/<refs>[\s\S]*?<\/refs>/) ? afterXml.match(/<refs>[\s\S]*?<\/refs>/)[0] : 'no refs'
        })
      }

    } catch (err) {
      recordResult('TC-03', '已有refs块 - 应正确替换不误删后续内容', false, err.message)
    }

    // ========================================
    // TC-04: brexDmRef 排除测试
    // ========================================
    console.log('%c--- TC-04: brexDmRef排除 ---', 'color: cyan; font-weight: bold')

    try {
      const beforeXml = editor.$refs.editor.getEditor().getValue()
      const hasBrex = beforeXml.includes('brexDmRef')

      console.log('   brexDmRef 存在:', hasBrex)

      // 执行
      clickRegenRefsButton()
      await confirmDialog()
      await sleep(1500)

      // 验证
      const afterXml = editor.$refs.editor.getEditor().getValue()
      const refsMatch = afterXml.match(/<refs>([\s\S]*?)<\/refs>/)
      const refsContent = refsMatch ? refsMatch[1] : ''

      const brexInRefs = refsContent.toLowerCase().includes('brex')

      if (hasBrex && !brexInRefs) {
        recordResult('TC-04', 'brexDmRef排除 - 不应被收集到refs', true, {
          原文档有brexDmRef: hasBrex,
          refs中有brex: brexInRefs,
          refs内容长度: refsContent.length
        })
      } else if (!hasBrex) {
        recordResult('TC-04', 'brexDmRef排除 - 不应被收集到refs', true, '当前 DM 无 brexDmRef（跳过）')
      } else {
        recordResult('TC-04', 'brexDmRef排除 - 不应被收集到refs', false, {
          原文档有brexDmRef: hasBrex,
          refs中有brex: brexInRefs,
          refsContent: refsContent.substring(0, 500)
        })
      }

    } catch (err) {
      recordResult('TC-04', 'brexDmRef排除 - 不应被收集到refs', false, err.message)
    }

    // ========================================
    // TE-01: 边界测试 - 多个重复 DMC 去重
    // ========================================
    console.log('%c--- TE-01: 多个重复DMC去重 ---', 'color: cyan; font-weight: bold')

    try {
      let content = editor.content

      // 移除已有 refs
      content = content.replace(/<refs>[\s\S]*?<\/refs>/g, '')

      // 在 description 中添加 3 个相同的 dmRef
      const dmRefXml = '<dmRef><dmRefIdent><dmCode modelIdentCode="DUP" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>'

      content = content.replace(
        /(<description>[\s\S]*?)(<\/description>)/,
        `$1${dmRefXml}${dmRefXml}${dmRefXml}$2`
      )

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      editor.$refs.editor.formateDM()
      editor.refreshTree()  // ✅ 格式化后刷新 nodeList
      await sleep(500)

      // 执行
      clickRegenRefsButton()
      await confirmDialog()
      await sleep(1500)

      // 验证
      const afterXml = editor.$refs.editor.getEditor().getValue()
      const dupMatches = afterXml.match(/modelIdentCode="DUP"/g)
      const dupCount = dupMatches ? dupMatches.length : 0

      // 应该只有 1 个在 refs 中
      const refsMatch = afterXml.match(/<refs>([\s\S]*?)<\/refs>/)
      const refsContent = refsMatch ? refsMatch[1] : ''
      const dupInRefsMatches = refsContent.match(/modelIdentCode="DUP"/g)
      const dupInRefsCount = dupInRefsMatches ? dupInRefsMatches.length : 0

      if (dupInRefsCount === 1) {
        recordResult('TE-01', '多个重复DMC去重', true, {
          原文档中DUP出现次数: 3,
          refs中DUP出现次数: dupInRefsCount
        })
      } else {
        recordResult('TE-01', '多个重复DMC去重', false, {
          期望refs中出现: 1,
          实际refs中出现: dupInRefsCount,
          全文档中出现: dupCount
        })
      }

    } catch (err) {
      recordResult('TE-01', '多个重复DMC去重', false, err.message)
    }

    // ========================================
    // TE-02: 边界测试 - 空 infoEntityIdent
    // ========================================
    console.log('%c--- TE-02: 空infoEntityIdent ---', 'color: cyan; font-weight: bold')

    try {
      let content = editor.content

      // 清空 icnlist
      editor.icnlist = []

      // 添加空 ident 的 graphic
      content = content.replace(
        /(<description>)/,
        '<graphic infoEntityIdent=""/>\n    $1'
      )

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      editor.$refs.editor.formateDM()
      editor.refreshTree()  // ✅ 格式化后刷新 nodeList
      await sleep(500)

      // 执行
      clickRegenRefsButton()
      await confirmDialog()
      await sleep(1500)

      // 验证：不应该弹出后缀选择框，也不应该生成空 ENTITY
      const afterXml = editor.$refs.editor.getEditor().getValue()
      const hasEmptyEntity = afterXml.match(/<!ENTITY\s+SYSTEM/)

      if (!hasEmptyEntity) {
        recordResult('TE-02', '空infoEntityIdent - 应跳过', true, '未生成空 ENTITY')
      } else {
        recordResult('TE-02', '空infoEntityIdent - 应跳过', false, {
          发现空ENTITY: hasEmptyEntity[0]
        })
      }

    } catch (err) {
      recordResult('TE-02', '空infoEntityIdent - 应跳过', false, err.message)
    }

  } catch (err) {
    console.error('❌ 测试执行失败:', err)
    console.error(err.stack)
  }

  // ========================================
  // 测试报告
  // ========================================
  console.log('\n%c========================================', 'color: blue; font-weight: bold')
  console.log('%c 测试报告', 'color: blue; font-weight: bold')
  console.log('%c========================================', 'color: blue; font-weight: bold')

  console.log(`\n总计: ${results.length} 个测试`)
  console.log(`%c✅ 通过: ${passCount}`, 'color: green; font-weight: bold')
  console.log(`%c❌ 失败: ${failCount}`, 'color: red; font-weight: bold')

  const passRate = Math.round((passCount / results.length) * 100)
  console.log(`\n通过率: ${passRate}%`)

  if (failCount > 0) {
    console.log('\n%c失败的测试:', 'color: red; font-weight: bold')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testId}: ${r.testName}`)
      if (r.details) {
        console.log('    详情:', r.details)
      }
    })
  }

  console.log('\n%c测试完成！', 'color: green; font-weight: bold; font-size: 16px')
  console.log('详细结果已保存在 window.__testResults')

  window.__testResults = results

  return {
    total: results.length,
    passed: passCount,
    failed: failCount,
    passRate: `${passRate}%`,
    results
  }

})().then(report => {
  console.log('\n%c=== 快速摘要 ===', 'color: blue; font-weight: bold')
  console.table(report)
}).catch(err => {
  console.error('测试套件执行失败:', err)
})
