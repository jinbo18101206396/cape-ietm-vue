const { chromium } = require('playwright')

async function simpleTest() {
  console.log('\n========== 简化测试 - 查看页面结构 ==========\n')

  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log('访问登录页...')
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)

    // 查看页面标题
    const title = await page.title()
    console.log(`页面标题: ${title}`)

    // 查看页面内容
    const bodyText = await page.locator('body').textContent()
    console.log(`页面内容前200字符: ${bodyText.substring(0, 200)}`)

    // 截图
    await page.screenshot({ path: '/tmp/page-state.png', fullPage: true })
    console.log('截图已保存: /tmp/page-state.png')

    console.log('\n测试完成。浏览器将保持打开60秒供手动查看。')
    console.log('请手动完成以下操作：')
    console.log('1. 登录（admin/admin）')
    console.log('2. 打开数据模块编辑器')
    console.log('3. 切换到设计视图')
    console.log('4. 添加警告并插入DM引用')
    console.log('5. 点击保存')
    console.log('\n观察控制台日志，特别是：')
    console.log('- [syncNodeToContent]')
    console.log('- [nodeToXml]')
    console.log('- 最终content字段')
    console.log('- treeToXml 生成的 XML')

    await page.waitForTimeout(60000)

  } catch (error) {
    console.error('错误:', error.message)
  } finally {
    await browser.close()
  }
}

simpleTest()
