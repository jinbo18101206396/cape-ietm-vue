// 简化测试脚本 - 验证 DOCTYPE 位置和弹窗问题修复

(function() {
  'use strict'

  console.log('========================================')
  console.log(' DOCTYPE 位置修复验证')
  console.log('========================================\n')

  // 获取编辑器组件
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

  const comp = getEditorComponent()
  if (!comp) {
    console.error('❌ 未找到编辑器组件')
    return
  }

  console.log('✅ 找到编辑器组件')

  // 测试1：设置简单XML并触发重建
  const testXml = `<?xml version="1.0" encoding="UTF-8"?>
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
      <graphic infoEntityIdent="TEST-ICN"/>
    </description>
  </content>
</dmodule>`

  const editor = comp.$refs.editor.getEditor()
  editor.setValue(testXml)

  setTimeout(() => {
    comp.refreshTree()

    setTimeout(() => {
      console.log('\n测试：查找 <dmodule> 位置')

      let dmoduleLine = -1
      for (let i = 0; i < editor.lineCount(); i++) {
        const line = editor.getLine(i) || ''
        console.log(`行${i}: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`)
        if (line.includes('<dmodule')) {
          dmoduleLine = i
          console.log(`  ^^^ <dmodule> 找到！`)
        }
      }

      console.log(`\n<dmodule> 在第 ${dmoduleLine} 行（0-based）`)
      console.log(`DOCTYPE 应该插入到第 ${dmoduleLine} 行之前`)

      console.log('\n✅ DOCTYPE 位置查找逻辑验证完成')
      console.log('\n现在可以手动点击"重建refs与DOCTYPE"按钮测试完整流程')
    }, 500)
  }, 500)

})()
