// 在浏览器控制台执行此脚本
// 步骤1: 首次进入源码视图时执行一次，记录初始状态
// 步骤2: 从设计视图返回后再执行一次，对比差异

(function() {
  const cm = document.querySelector('.CodeMirror')
  if (!cm) {
    console.log('❌ 未找到 CodeMirror')
    return
  }

  // 收集所有可能影响布局的元素
  const elements = [
    { name: 'body', elem: document.body },
    { name: '.CodeMirror', elem: cm },
    { name: '.CodeMirror-scroll', elem: cm.querySelector('.CodeMirror-scroll') },
    { name: '.CodeMirror-sizer', elem: cm.querySelector('.CodeMirror-sizer') },
    { name: '.CodeMirror-lines', elem: cm.querySelector('.CodeMirror-lines') },
    { name: '.CodeMirror-code', elem: cm.querySelector('.CodeMirror-code') },
    { name: '.CodeMirror-line', elem: cm.querySelector('.CodeMirror-line') },
    { name: '.dm-source-view', elem: cm.closest('.dm-source-view') },
    { name: '.ant-tabs-tabpane', elem: cm.closest('.ant-tabs-tabpane') }
  ]

  const snapshot = {}

  elements.forEach(({ name, elem }) => {
    if (!elem) {
      snapshot[name] = null
      return
    }

    const computed = window.getComputedStyle(elem)
    const rect = elem.getBoundingClientRect()

    snapshot[name] = {
      // CSS 样式
      lineHeight: computed.lineHeight,
      fontSize: computed.fontSize,
      height: computed.height,
      padding: computed.padding,
      margin: computed.margin,
      display: computed.display,

      // Inline 样式
      inlineLineHeight: elem.style.lineHeight || 'none',
      inlineFontSize: elem.style.fontSize || 'none',
      inlineHeight: elem.style.height || 'none',

      // 实际尺寸
      rectHeight: rect.height.toFixed(2) + 'px',
      rectWidth: rect.width.toFixed(2) + 'px'
    }
  })

  // 保存到全局变量
  if (!window.cmSnapshots) {
    window.cmSnapshots = []
  }
  window.cmSnapshots.push({
    timestamp: new Date().toISOString(),
    data: snapshot
  })

  console.log('\n='.repeat(80))
  console.log(`📸 快照 #${window.cmSnapshots.length} 已保存`)
  console.log('='.repeat(80))

  Object.entries(snapshot).forEach(([name, data]) => {
    if (!data) {
      console.log(`\n${name}: [不存在]`)
      return
    }

    console.log(`\n${name}:`)
    console.log(`  line-height: ${data.lineHeight} (inline: ${data.inlineLineHeight})`)
    console.log(`  font-size: ${data.fontSize} (inline: ${data.inlineFontSize})`)
    console.log(`  height: ${data.height} (inline: ${data.inlineHeight})`)
    console.log(`  实际高度: ${data.rectHeight}`)
  })

  // 如果有多个快照，显示差异
  if (window.cmSnapshots.length >= 2) {
    const prev = window.cmSnapshots[window.cmSnapshots.length - 2].data
    const curr = snapshot

    console.log('\n' + '='.repeat(80))
    console.log('🔍 差异对比 (快照 #' + (window.cmSnapshots.length - 1) + ' vs #' + window.cmSnapshots.length + ')')
    console.log('='.repeat(80))

    Object.keys(curr).forEach(name => {
      if (!prev[name] || !curr[name]) return

      const diffs = []

      if (prev[name].lineHeight !== curr[name].lineHeight) {
        diffs.push(`  line-height: ${prev[name].lineHeight} → ${curr[name].lineHeight}`)
      }
      if (prev[name].fontSize !== curr[name].fontSize) {
        diffs.push(`  font-size: ${prev[name].fontSize} → ${curr[name].fontSize}`)
      }
      if (prev[name].rectHeight !== curr[name].rectHeight) {
        diffs.push(`  实际高度: ${prev[name].rectHeight} → ${curr[name].rectHeight}`)
      }
      if (prev[name].inlineLineHeight !== curr[name].inlineLineHeight) {
        diffs.push(`  inline line-height: ${prev[name].inlineLineHeight} → ${curr[name].inlineLineHeight}`)
      }

      if (diffs.length > 0) {
        console.log(`\n${name}:`)
        diffs.forEach(d => console.log(d))
      }
    })
  }

  console.log('\n提示：')
  console.log('  - 首次进入源码视图时运行一次（快照#1）')
  console.log('  - 从设计视图返回后再运行一次（快照#2）')
  console.log('  - 脚本会自动显示差异')
})()
