/**
 * 🔍 图片预览问题诊断脚本
 *
 * 使用方法：
 * 1. 打开编辑器，进入源码视图
 * 2. 点击预览按钮
 * 3. 打开浏览器控制台（F12）
 * 4. 将此脚本粘贴到控制台执行
 */

(function diagnose() {
  console.log('\n=== 🔍 图片预览诊断开始 ===\n')

  // 查找预览弹框的iframe
  const iframes = Array.from(document.querySelectorAll('iframe'))
  console.log(`📊 页面共有 ${iframes.length} 个iframe`)

  iframes.forEach((iframe, idx) => {
    console.log(`\n--- Iframe ${idx} ---`)
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document

      // 1. 查找所有图片
      const allImages = iframeDoc.querySelectorAll('img')
      console.log(`  总图片数: ${allImages.length}`)

      allImages.forEach((img, imgIdx) => {
        console.log(`\n  图片 ${imgIdx}:`)
        console.log(`    class: ${img.className}`)
        console.log(`    id: ${img.id}`)
        console.log(`    src: ${img.getAttribute('src')}`)
        console.log(`    data-icn-code: ${img.getAttribute('data-icn-code')}`)
        console.log(`    boardno: ${img.getAttribute('boardno')}`)
        console.log(`    onclick: ${img.getAttribute('onclick')}`)
        console.log(`    实际显示的src: ${img.src.substring(0, 100)}${img.src.length > 100 ? '...' : ''}`)
      })

      // 2. 测试选择器
      console.log(`\n  === 选择器测试 ===`)
      const byDataIcnCode = iframeDoc.querySelectorAll('img[data-icn-code]')
      const byBoardno = iframeDoc.querySelectorAll('img.figureLinkGraphic[boardno]')
      const combined = iframeDoc.querySelectorAll('img[data-icn-code], img.figureLinkGraphic[boardno]')

      console.log(`    img[data-icn-code]: ${byDataIcnCode.length}`)
      console.log(`    img.figureLinkGraphic[boardno]: ${byBoardno.length}`)
      console.log(`    合并选择器: ${combined.length}`)

      // 3. 模拟过滤逻辑
      console.log(`\n  === 过滤逻辑测试 ===`)
      let passCount = 0
      combined.forEach((img, i) => {
        const src = img.getAttribute('src') || ''
        const isPlaceholder = src.includes('.gif') || src.includes('avicit/')
        const shouldLoad = !isPlaceholder

        console.log(`    图片${i}: src="${src}"`)
        console.log(`      → isPlaceholder: ${isPlaceholder}`)
        console.log(`      → shouldLoad: ${shouldLoad}`)

        if (shouldLoad) passCount++
      })

      console.log(`\n  ✅ 应加载的图片数: ${passCount}`)

      // 4. 检查ICN代码
      console.log(`\n  === ICN代码检查 ===`)
      combined.forEach((img, i) => {
        const dataIcnCode = img.getAttribute('data-icn-code')
        const boardno = img.getAttribute('boardno')
        const icnCode = dataIcnCode || boardno

        console.log(`    图片${i}: ICN = ${icnCode || '无'}`)
      })

    } catch (e) {
      console.log(`  ⚠️ 无法访问iframe内容: ${e.message}`)
    }
  })

  console.log('\n=== 🔍 诊断结束 ===\n')
  console.log('📋 请检查上述输出，确认:')
  console.log('  1. 是否找到了图片元素？')
  console.log('  2. 图片是否有 data-icn-code 或 boardno 属性？')
  console.log('  3. 过滤逻辑是否正确（shouldLoad=true）？')
  console.log('  4. ICN代码是否正确？')
})()
