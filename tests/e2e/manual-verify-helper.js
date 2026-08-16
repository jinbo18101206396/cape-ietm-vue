/**
 * 手动辅助验证 - 连接到已打开的浏览器
 *
 * 使用方法：
 * 1. 先在命令行运行：npx playwright open --headed http://localhost:3000
 * 2. 手动登录并打开编辑器页面
 * 3. 保持浏览器打开，运行此脚本
 */

const { chromium } = require('playwright')

async function verify() {
  console.log('=== 连接到已打开的浏览器 ===')
  console.log('请确保你已经：')
  console.log('1. 登录系统')
  console.log('2. 打开了DM内容编辑器')
  console.log('')

  // 启动可调试的浏览器实例
  const browser = await chromium.launch({
    headless: false,
    args: ['--remote-debugging-port=9222']
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  // 导航到localhost
  await page.goto('http://localhost:3000')
  await page.waitForTimeout(2000)

  console.log('\n请在打开的浏览器中：')
  console.log('1. 登录（admin / 123456）')
  console.log('2. 导航：项目管理 → 数据模块管理')
  console.log('3. 勾选第一个DM → 点击"编辑内容"')
  console.log('\n完成后按 Enter 继续...')

  // 等待用户操作（暂停60秒）
  await page.waitForTimeout(60000)

  console.log('\n=== 开始验证 ===')

  // 检查元素
  const regionCenter = await page.locator('.region-center').count()
  const viewTabs = await page.locator('.view-tabs').count()
  const codeMirror = await page.locator('.CodeMirror').count()

  console.log(`region-center: ${regionCenter}`)
  console.log(`view-tabs: ${viewTabs}`)
  console.log(`CodeMirror: ${codeMirror}`)

  if (viewTabs > 0) {
    console.log('\n✓ 找到页签容器，开始详细验证...')

    // 页签验证
    const hasBottomClass = await page.locator('.view-tabs.ant-tabs-bottom').count()
    console.log(`底部页签模式: ${hasBottomClass > 0 ? '✓' : '✗'}`)

    const tabs = await page.locator('.ant-tabs-tab').all()
    console.log(`页签数量: ${tabs.length}`)

    if (tabs.length >= 2) {
      const tab0Text = await tabs[0].innerText()
      const tab1Text = await tabs[1].innerText()
      const tab0Disabled = await tabs[0].evaluate(el => el.classList.contains('ant-tabs-tab-disabled'))
      const tab1Active = await tabs[1].evaluate(el => el.classList.contains('ant-tabs-tab-active'))

      console.log(`\n页签0: "${tab0Text}" ${tab0Disabled ? '(禁用 ✓)' : '(未禁用 ✗)'}`)
      console.log(`页签1: "${tab1Text}" ${tab1Active ? '(选中 ✓)' : '(未选中 ✗)'}`)
    }

    // 位置验证
    const editorBox = await page.locator('.CodeMirror').first().boundingBox()
    const tabBarBox = await page.locator('.ant-tabs-bar').first().boundingBox()

    if (editorBox && tabBarBox) {
      const isBelow = tabBarBox.y > editorBox.y
      console.log(`\n页签栏位置: ${isBelow ? '✓ 在编辑器下方' : '✗ 在编辑器上方'}`)
      console.log(`  编辑器: y=${Math.round(editorBox.y)}, h=${Math.round(editorBox.height)}`)
      console.log(`  页签栏: y=${Math.round(tabBarBox.y)}`)
    }

    // 高度验证
    if (editorBox) {
      const heightOk = editorBox.height > 200
      console.log(`\nCodeMirror高度: ${Math.round(editorBox.height)}px ${heightOk ? '✓' : '✗ (太小)'}`)
    }

    // 状态栏验证
    const statusBar = await page.locator('.editor-status').count()
    console.log(`底部状态栏: ${statusBar === 0 ? '✓ 已移除' : '✗ 仍存在'}`)

    // 截图
    await page.screenshot({ path: 'tests/e2e/verify-manual-full.png', fullPage: true })
    const regionCenterElement = page.locator('.region-center').first()
    await regionCenterElement.screenshot({ path: 'tests/e2e/verify-manual-region.png' })

    console.log('\n✓ 截图已保存：')
    console.log('  - verify-manual-full.png')
    console.log('  - verify-manual-region.png')
  } else {
    console.log('\n✗ 未找到编辑器页签容器')
    await page.screenshot({ path: 'tests/e2e/verify-manual-notfound.png', fullPage: true })
    console.log('截图已保存：verify-manual-notfound.png')
  }

  console.log('\n=== 验证完成 ===')
  await browser.close()
}

verify().catch(console.error)
