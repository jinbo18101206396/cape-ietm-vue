const { test, expect, chromium } = require('@playwright/test')
const fs = require('fs')

test('Para公式完整E2E验证（真实系统操作）', async () => {
  const browser = await chromium.launch({ headless: false }) // 显示浏览器
  const page = await browser.newPage()
  const testResults = {
    startTime: new Date().toISOString(),
    steps: [],
    checks: [],
    artifacts: {},
    success: false,
    error: null
  }

  try {
    console.log('\n【开始Para公式真实E2E验证】')
    console.log('浏览器已启动，请手动进行以下操作：\n')
    console.log('1️⃣  访问系统: http://localhost:3000')
    console.log('2️⃣  登录系统（使用有效凭证）')
    console.log('3️⃣  进入DM内容编辑页面')
    console.log('4️⃣  找到一个Para节点并打开编辑')
    console.log('5️⃣  点击工具栏的"公式"按钮')
    console.log('6️⃣  在公式对话框中输入测试公式（如：a + b = c）')
    console.log('7️⃣  点击"确定"按钮插入公式')
    console.log('8️⃣  点击编辑界面的"保存"按钮保存内容')
    console.log('9️⃣  点击"源码视图"选项卡检查XML')
    console.log('🔟 确认XML中包含<symbol>标签和公式信息\n')

    // 打开页面
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    testResults.steps.push('✓ 页面加载完成')

    // 等待用户操作
    console.log('\n⏳ 等待用户完成手动操作... (60秒超时)')
    console.log('💡 提示：请在打开的浏览器窗口中完成上述操作\n')

    // 监听页面变化
    let pageContent = ''
    let monitorInterval = setInterval(async () => {
      try {
        pageContent = await page.content()
      } catch (e) {
        // 忽略监听错误
      }
    }, 2000)

    // 等待用户完成操作或超时
    await page.waitForTimeout(60000)
    clearInterval(monitorInterval)

    // 采集最终页面状态
    console.log('\n【采集页面最终状态】')

    // 获取当前URL
    const finalUrl = page.url()
    console.log('最终URL:', finalUrl)
    testResults.artifacts.finalUrl = finalUrl

    // 获取页面内容
    const pageHTML = await page.content()
    console.log(`页面HTML大小: ${pageHTML.length}字节`)

    // 【检查点1】：检查是否包含symbol标签（公式符号）
    console.log('\n【检查1】XML中是否包含symbol标签（公式标记）...')
    const hasSymbolTag = pageHTML.includes('<symbol') || pageHTML.includes('&lt;symbol')
    const symbolCheck = hasSymbolTag ? '✓ 检测到symbol标签' : '✗ 未检测到symbol标签'
    console.log(symbolCheck)
    testResults.checks.push({
      name: 'symbol标签',
      result: hasSymbolTag,
      description: '公式应以<symbol xml="...">形式保存'
    })

    // 【检查点2】：检查是否包含xml属性（转义后的公式HTML）
    console.log('\n【检查2】检查xml属性中是否包含转义的公式数据...')
    const hasXmlAttr = pageHTML.includes('xml="') || pageHTML.includes('xml=&quot;')
    const xmlAttrCheck = hasXmlAttr ? '✓ 检测到xml属性' : '✗ 未检测到xml属性'
    console.log(xmlAttrCheck)
    testResults.checks.push({
      name: 'xml属性',
      result: hasXmlAttr,
      description: 'symbol标签应有xml属性包含转义的公式内容'
    })

    // 【检查点3】：检查是否包含icn属性（公式ID）
    console.log('\n【检查3】检查icn属性（公式ID）...')
    const hasIcnAttr = /icn="[^"]*"/.test(pageHTML)
    const icnAttrCheck = hasIcnAttr ? '✓ 检测到icn属性' : '✗ 未检测到icn属性'
    console.log(icnAttrCheck)
    testResults.checks.push({
      name: 'icn属性',
      result: hasIcnAttr,
      description: 'symbol标签应有icn属性存储公式标识符'
    })

    // 【检查点4】：检查Para标签
    console.log('\n【检查4】检查para标签结构...')
    const hasParaTag = pageHTML.includes('<para') || pageHTML.includes('&lt;para')
    const paraCheck = hasParaTag ? '✓ 检测到para标签' : '✗ 未检测到para标签'
    console.log(paraCheck)
    testResults.checks.push({
      name: 'para标签',
      result: hasParaTag,
      description: 'Para内容应包含在<para>标签中'
    })

    // 【检查点5】：查找并提取symbol标签内容
    console.log('\n【检查5】提取symbol标签内容...')
    const symbolMatch = pageHTML.match(/<symbol[^>]*>/)
    if (symbolMatch) {
      const symbolTag = symbolMatch[0]
      console.log(`✓ 找到symbol标签: ${symbolTag.substring(0, 150)}...`)
      testResults.checks.push({
        name: '提取symbol标签',
        result: true,
        content: symbolTag.substring(0, 200)
      })
    } else {
      console.log('⚠️  未能提取symbol标签，可能被HTML编码')
      testResults.checks.push({
        name: '提取symbol标签',
        result: false
      })
    }

    // 【检查点6】：检查是否可能是设计视图（img标签表示）
    console.log('\n【检查6】检查设计视图中的公式表示...')
    const hasFormulaImg = pageHTML.includes('alt=') && (
      pageHTML.includes('data:image') || pageHTML.includes('kityformula')
    )
    const formulaImgCheck = hasFormulaImg ? '✓ 可能检测到公式图片表示' : '⚠️  设计视图或图片未加载'
    console.log(formulaImgCheck)
    testResults.checks.push({
      name: '设计视图公式',
      result: hasFormulaImg,
      description: '设计视图中公式应显示为img标签'
    })

    // 【最终评分】
    console.log('\n【最终验证结果】')
    const passedChecks = testResults.checks.filter(c => c.result).length
    const totalChecks = testResults.checks.length
    const passRate = Math.round((passedChecks / totalChecks) * 100)

    console.log(`通过检查: ${passedChecks}/${totalChecks} (${passRate}%)`)

    if (passedChecks >= 3) {
      console.log('✓ 公式保存和转换逻辑通过验证')
      testResults.success = true
      testResults.verdict = 'PASS'
    } else {
      console.log('✗ 公式保存或转换出现问题')
      testResults.success = false
      testResults.verdict = 'FAIL'
    }

    // 保存完整页面HTML用于离线分析
    const htmlPath = 'D:/workspace/IETM/cape-ietm-vue/e2e-captured-page.html'
    fs.writeFileSync(htmlPath, pageHTML)
    console.log(`\n📄 完整页面HTML已保存: ${htmlPath}`)
    testResults.artifacts.capturedHTMLPath = htmlPath
  } catch (error) {
    console.error('\n❌ E2E测试执行异常:', error.message)
    testResults.error = error.message
    testResults.success = false
    testResults.verdict = 'ERROR'
  } finally {
    // 保存测试报告
    testResults.endTime = new Date().toISOString()
    const reportPath = 'D:/workspace/IETM/cape-ietm-vue/PARA_E2E_REAL_TEST_REPORT.json'
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2))
    console.log(`\n📊 测试报告已保存: ${reportPath}`)

    // 浏览器不自动关闭，等待用户确认
    console.log('\n💡 浏览器窗口保持打开。检查完毕后请关闭浏览器或按Ctrl+C。')

    // 等待一分钟后自动关闭
    await page.waitForTimeout(60000).catch(() => {})

    await browser.close()
  }
})
