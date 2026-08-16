/**
 * 紧急修复脚本：修复 refs 标签结构错误
 *
 * 问题：<description> 错误地被放在了 <refs> 内部
 * 解决：将 <description> 移到 <refs> 外部
 */

(function fixRefsStructure() {
  console.log('========================================')
  console.log('紧急修复：refs 标签结构')
  console.log('========================================')

  // 获取编辑器实例
  const app = document.querySelector('#app').__vue__
  const editorComponent = app.$children.find(c => c.$refs.editor)

  if (!editorComponent || !editorComponent.$refs.editor) {
    console.error('❌ 无法获取编辑器实例')
    return
  }

  const editor = editorComponent.$refs.editor.getEditor()
  const xml = editor.getValue()

  console.log('当前 XML 长度:', xml.length)

  // 检查问题
  const contentStart = xml.indexOf('<content>')
  const contentEnd = xml.indexOf('</content>')

  if (contentStart === -1 || contentEnd === -1) {
    console.error('❌ 找不到 <content> 标签')
    return
  }

  const contentSection = xml.substring(contentStart, contentEnd + '</content>'.length)
  console.log('\n当前 content 结构:')
  console.log(contentSection.substring(0, 500))

  // 检查是否存在结构错误
  const hasRefsWithDescription = contentSection.includes('<refs>') &&
                                  contentSection.indexOf('<description>') < contentSection.indexOf('</refs>')

  if (!hasRefsWithDescription) {
    console.log('✅ content 结构正常，无需修复')
    return
  }

  console.log('\n❌ 检测到结构错误：<description> 在 <refs> 内部')
  console.log('\n开始修复...')

  // 提取 refs 内部的所有 dmRef（如果有）
  const refsStart = contentSection.indexOf('<refs')
  const refsEnd = contentSection.indexOf('</refs>') + '</refs>'.length
  const refsContent = contentSection.substring(refsStart, refsEnd)

  // 提取所有 dmRef 标签
  const dmRefPattern = /<dmRef[^>]*>[\s\S]*?<\/dmRef>/g
  const dmRefs = refsContent.match(dmRefPattern) || []

  console.log('找到', dmRefs.length, '个 dmRef')

  // 提取 description 及其后续内容
  const descStart = contentSection.indexOf('<description>')
  const descEnd = contentSection.lastIndexOf('</content>')
  const descriptionContent = contentSection.substring(descStart, descEnd).trim()

  // 重建 content 结构
  let newContent = '  <content>\n'

  if (dmRefs.length > 0) {
    newContent += '    <refs>\n'
    dmRefs.forEach(dmRef => {
      newContent += '      ' + dmRef + '\n'
    })
    newContent += '    </refs>\n'
  }

  newContent += '    ' + descriptionContent + '\n'
  newContent += '  </content>'

  console.log('\n修复后的 content 结构:')
  console.log(newContent.substring(0, 500))

  // 替换
  const newXml = xml.substring(0, contentStart) + newContent + xml.substring(contentEnd + '</content>'.length)

  // 验证新 XML
  const parser = new DOMParser()
  const doc = parser.parseFromString(newXml, 'text/xml')
  const errors = doc.getElementsByTagName('parsererror')

  if (errors.length > 0) {
    console.error('❌ 修复后的 XML 仍有错误:')
    console.error(errors[0].textContent)
    console.log('\n建议手动修复')
    return
  }

  console.log('✅ 修复后的 XML 格式正确')

  // 应用修复
  const confirmed = confirm('确认应用修复？这将替换编辑器中的内容。')
  if (confirmed) {
    editor.setValue(newXml)
    console.log('✅ 已应用修复')
    console.log('\n现在可以点击"重建refs与DOCTYPE"按钮了')
  } else {
    console.log('❌ 用户取消')
  }

  console.log('\n========================================')
})()
