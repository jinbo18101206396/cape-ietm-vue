const { chromium } = require('playwright')

async function test() {
  console.log('\n========== LevelledPara DM引用调试 ==========\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 收集所有控制台日志
  const allLogs = []
  page.on('console', msg => {
    const text = msg.text()
    allLogs.push(text)

    // 实时输出关键日志
    if (text.includes('[nodeToXml]') ||
        text.includes('treeToXml') ||
        text.includes('parsererror') ||
        text.includes('添加命名空间') ||
        text.includes('XML解析失败')) {
      console.log(`[关键] ${text}`)
    }
  })

  try {
    console.log('提示：请手动完成以下操作，脚本将监听控制台日志\n')
    console.log('1. 打开 http://localhost:3000')
    console.log('2. 登录系统')
    console.log('3. 进入数据模块管理 > 编辑某个数据模块')
    console.log('4. 切换到 LevelledPara 设计视图')
    console.log('5. 添加警告，并插入 DM 引用')
    console.log('6. 点击保存\n')
    console.log('按 Ctrl+C 退出\n')
    console.log('=========================================\n')

    await page.goto('http://localhost:3000')

    // 保持页面打开，持续监听
    await page.waitForTimeout(300000) // 等待5分钟

  } catch (error) {
    if (error.message.includes('Target closed')) {
      console.log('\n浏览器已关闭')
    } else {
      console.error('错误:', error)
    }
  } finally {
    // 输出完整日志摘要
    console.log('\n========== 日志摘要 ==========')

    const nodeToXmlLogs = allLogs.filter(l => l.includes('[nodeToXml]'))
    const treeToXmlLogs = allLogs.filter(l => l.includes('treeToXml 生成的 XML'))
    const parsererrorLogs = allLogs.filter(l => l.includes('parsererror'))

    if (nodeToXmlLogs.length > 0) {
      console.log('\n--- nodeToXml 日志 ---')
      nodeToXmlLogs.forEach(l => console.log(l))
    }

    if (treeToXmlLogs.length > 0) {
      console.log('\n--- treeToXml 生成的 XML ---')
      treeToXmlLogs.forEach(l => console.log(l))
    }

    if (parsererrorLogs.length > 0) {
      console.log('\n--- parsererror 相关 ---')
      parsererrorLogs.forEach(l => console.log(l))
    }

    console.log('\n========== 测试结束 ==========\n')

    await browser.close()
  }
}

test()
