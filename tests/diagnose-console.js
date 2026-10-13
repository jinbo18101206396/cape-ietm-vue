// 复制此代码到浏览器控制台（F12 → Console）中执行
// 在行距崩溃的状态下运行

console.clear()
console.log('='.repeat(80))
console.log('CodeMirror 行距诊断工具')
console.log('='.repeat(80))

const cm = document.querySelector('.CodeMirror')
if (!cm) {
  console.error('❌ 未找到 CodeMirror 元素')
} else {
  const getStyles = (elem, name) => {
    if (!elem) {
      console.log(`\n${name}: [不存在]`)
      return
    }

    const computed = window.getComputedStyle(elem)
    const inline = elem.style

    console.log(`\n${name}:`)
    console.log(`  computed line-height: ${computed.lineHeight}`)
    console.log(`  computed font-size: ${computed.fontSize}`)
    console.log(`  computed height: ${computed.height}`)
    console.log(`  inline line-height: ${inline.lineHeight || '(无)'}`)
    console.log(`  inline font-size: ${inline.fontSize || '(无)'}`)
    console.log(`  inline height: ${inline.height || '(无)'}`)

    // 如果 line-height 是相对值，计算实际像素值
    if (computed.lineHeight && computed.lineHeight !== 'normal') {
      const lh = parseFloat(computed.lineHeight)
      const fs = parseFloat(computed.fontSize)
      if (!isNaN(lh) && !isNaN(fs)) {
        console.log(`  实际行高: ${lh}px (font-size: ${fs}px, 比例: ${(lh/fs).toFixed(2)})`)
      }
    }
  }

  // 检查各层元素
  getStyles(cm, '📦 .CodeMirror (最外层容器)')
  getStyles(cm.querySelector('.CodeMirror-scroll'), '📦 .CodeMirror-scroll')
  getStyles(cm.querySelector('.CodeMirror-sizer'), '📦 .CodeMirror-sizer')
  getStyles(cm.querySelector('.CodeMirror-lines'), '📦 .CodeMirror-lines')
  getStyles(cm.querySelector('.CodeMirror-code'), '📦 .CodeMirror-code')

  const firstLine = cm.querySelector('.CodeMirror-line')
  getStyles(firstLine, '📝 .CodeMirror-line (第一行)')

  // 检查外层容器
  const dmSourceView = cm.closest('.dm-source-view')
  getStyles(dmSourceView, '📦 .dm-source-view (外层)')

  const tabPane = cm.closest('.ant-tabs-tabpane')
  getStyles(tabPane, '📦 .ant-tabs-tabpane (标签页)')

  // 检查是否有异常的全局样式
  console.log('\n' + '='.repeat(80))
  console.log('🔍 检查潜在问题:')
  console.log('='.repeat(80))

  // 检查 body 的 line-height
  const bodyLH = window.getComputedStyle(document.body).lineHeight
  console.log(`\nbody line-height: ${bodyLH}`)

  // 检查第一行的实际高度
  if (firstLine) {
    const rect = firstLine.getBoundingClientRect()
    console.log(`\n第一行实际高度: ${rect.height}px`)
    console.log(`第一行实际宽度: ${rect.width}px`)
  }

  // 尝试找出异常的样式来源
  if (firstLine) {
    const lh = window.getComputedStyle(firstLine).lineHeight
    console.log(`\n第一行 line-height 来源:`)

    // 遍历所有匹配的 CSS 规则
    const sheets = Array.from(document.styleSheets)
    let found = false

    sheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || [])
        rules.forEach(rule => {
          if (rule.style && rule.style.lineHeight && firstLine.matches(rule.selectorText)) {
            console.log(`  规则: ${rule.selectorText}`)
            console.log(`    line-height: ${rule.style.lineHeight}`)
            console.log(`    来自: ${sheet.href || '(inline style)'}`)
            found = true
          }
        })
      } catch (e) {
        // 跨域样式表无法访问，忽略
      }
    })

    if (!found) {
      console.log('  (未找到明确的 CSS 规则，可能继承自父元素)')
    }
  }
}

console.log('\n' + '='.repeat(80))
console.log('✅ 诊断完成！请将以上输出截图或复制给我。')
console.log('='.repeat(80))
