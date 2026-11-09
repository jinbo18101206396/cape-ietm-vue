/**
 * 上标预览问题诊断脚本
 * 目的：追踪从保存到预览的完整数据流
 */

const fs = require('fs')
const path = require('path')

console.log('========== 上标预览问题诊断 ==========\n')

// 1. 检查修复代码是否存在
console.log('✓ 步骤1：检查修复代码是否存在')
const modalPath = path.join(__dirname, '../src/views/ietm/ietmdatamodulemanagement/editor/components/DmPreviewModal.vue')
const modalContent = fs.readFileSync(modalPath, 'utf-8')

const hasSuperScriptFix = modalContent.includes('.replace(/<superScript>/g, \'<sup>\')')
console.log(`  - 修复代码存在: ${hasSuperScriptFix ? '✅ 是' : '❌ 否'}`)

if (hasSuperScriptFix) {
  // 找到修复代码的行号
  const lines = modalContent.split('\n')
  const fixLineIndex = lines.findIndex(line => line.includes('.replace(/<superScript>/g, \'<sup>\')'))
  console.log(`  - 修复代码位置: 第 ${fixLineIndex + 1} 行`)

  // 检查修复代码在 show() 方法内
  let inShowMethod = false
  let showMethodStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('show(html)')) {
      inShowMethod = true
      showMethodStart = i
    }
    if (inShowMethod && i === fixLineIndex) {
      console.log(`  - 修复代码在 show() 方法内: ✅ 是 (方法从第 ${showMethodStart + 1} 行开始)`)
      break
    }
  }
}

console.log()

// 2. 检查后端API返回的HTML是否包含XML标签
console.log('✓ 步骤2：问题可能的原因')
console.log('  原因A: 前端未重新编译/刷新')
console.log('    - 解决方法: 重启前端开发服务器 (npm run serve)')
console.log('    - 浏览器硬刷新: Ctrl+Shift+R 或 Ctrl+F5')
console.log()
console.log('  原因B: 后端已经转换了标签')
console.log('    - 如果后端XSLT已修复，返回的HTML已经是 <sup> 而非 <superScript>')
console.log('    - 前端的 replace() 就不会匹配到任何内容')
console.log('    - 需要检查后端返回的原始HTML')
console.log()
console.log('  原因C: 标签转换被其他代码覆盖')
console.log('    - 检查 show() 方法后续是否有代码重新赋值 body 变量')
console.log()

// 3. 生成调试补丁
console.log('✓ 步骤3：生成调试补丁')
console.log('  建议在 DmPreviewModal.vue:237 后添加以下调试代码：')
console.log()
console.log('  ```javascript')
console.log('  // 🔍 调试：打印转换前后的HTML')
console.log('  console.log("🔍 [Preview Debug] 后端返回的原始HTML:", html.substring(0, 500))')
console.log('  console.log("🔍 [Preview Debug] 转换后的body:", body.substring(0, 500))')
console.log('  console.log("🔍 [Preview Debug] 是否包含<superScript>:", html.includes("<superScript>"))')
console.log('  console.log("🔍 [Preview Debug] 是否包含<sup>:", body.includes("<sup>"))')
console.log('  ```')
console.log()

// 4. 生成测试HTML
console.log('✓ 步骤4：生成测试用例')
const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>上标转换测试</title>
</head>
<body>
  <h3>测试1: 原始XML标签（应该不显示上标）</h3>
  <p>1<superScript>2</superScript></p>

  <h3>测试2: 标准HTML标签（应该显示上标）</h3>
  <p>1<sup>2</sup></p>

  <h3>测试3: JavaScript转换测试</h3>
  <div id="test3"></div>

  <script>
    const xml = '1<superScript>2</superScript>'
    const converted = xml.replace(/<superScript>/g, '<sup>').replace(/<\\/superScript>/g, '</sup>')
    document.getElementById('test3').innerHTML = 'XML: ' + xml + '<br>转换后: ' + converted
  </script>
</body>
</html>
`

const testPath = path.join(__dirname, '../public/test-superscript-conversion.html')
fs.writeFileSync(testPath, testHtml)
console.log(`  - 测试文件已生成: ${testPath}`)
console.log(`  - 浏览器打开: http://localhost:3000/test-superscript-conversion.html`)
console.log()

// 5. 输出下一步行动
console.log('========== 下一步行动 ==========')
console.log('1. 打开浏览器开发者工具 (F12)')
console.log('2. 访问: http://localhost:3000/ietm/dm-content-editor/...')
console.log('3. 在 para 设计器中插入上标 "1²"')
console.log('4. 点击"预览"按钮')
console.log('5. 在 Console 面板查找 "🔍 [Preview Debug]" 日志')
console.log('6. 检查原始HTML是否包含 <superScript> 还是 <sup>')
console.log()
console.log('如果包含 <superScript>: 说明前端代码未生效，需要重启服务器')
console.log('如果包含 <sup>: 说明后端已转换，但CSS样式可能有问题')
console.log()
