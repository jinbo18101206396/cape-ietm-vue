/**
 * 交互式验证脚本
 * 打开浏览器后保持运行，允许你手动操作
 */

const { chromium } = require('playwright');

(async () => {
  console.log('🚀 启动浏览器...\n')
  console.log('📝 使用说明：')
  console.log('   1. 浏览器将打开并停留在首页')
  console.log('   2. 请手动登录（用户名: admin, 密码: 123456）')
  console.log('   3. 登录后访问DM编辑页面')
  console.log('   4. 点击"预览"按钮')
  console.log('   5. 观察上标"12"是否显示正确（字体变小、位置上移）')
  console.log('   6. 脚本将在5分钟后自动关闭浏览器\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  })

  const page = await browser.newPage()

  try {
    console.log('⏳ 打开首页...')
    await page.goto('http://localhost:3000')

    console.log('\n✅ 浏览器已打开！')
    console.log('\n📋 验证步骤：')
    console.log('   1. 手动登录系统')
    console.log('   2. 访问DM编辑页面：')
    console.log('      http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    console.log('   3. 点击"预览"按钮')
    console.log('   4. 检查上标样式：')
    console.log('      - 上标"12"应该字体更小（约75%）')
    console.log('      - 位置应该向上偏移')
    console.log('      - 右键点击iframe内容 → 检查 → 查看<sup>元素的样式')
    console.log('      - 应该有: vertical-align: super; font-size: 0.75em;\n')

    console.log('⏰ 浏览器将保持打开 5 分钟...\n')
    console.log('💡 提示：')
    console.log('   - 按 F12 打开开发者工具查看控制台日志')
    console.log('   - 控制台应该显示: 🔍 [Preview Debug] 相关日志')
    console.log('   - 如果上标样式不正确，可能需要重启前端服务\n')

    // 监听控制台消息
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Preview Debug') || text.includes('superScript') || text.includes('sup')) {
        console.log(`[浏览器控制台] ${text}`)
      }
    })

    // 保持打开5分钟
    await page.waitForTimeout(300000)
  } catch (error) {
    console.error('\n❌ 发生错误:', error.message)
  } finally {
    console.log('\n⏰ 时间到，关闭浏览器...')
    await browser.close()
    console.log('✓ 浏览器已关闭')
  }
})()
