/**
 * CodeMirror布局修复验证测试
 * 测试从设计视图切换回源码视图后，CodeMirror的gutters布局是否正常
 */

describe('CodeMirror视图切换布局修复', () => {
  it('从设计视图切换回源码视图后gutters布局正常', async () => {
    // 1. 登录
    await page.goto('http://localhost:3000/#/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button:has-text("登录")')

    // 等待登录完成
    await page.waitForTimeout(2000)

    // 2. 进入DM编辑器（需要替换为实际的DM ID）
    const dmId = '1790229071983' // 替换为测试DM的ID
    await page.goto(`http://localhost:3000/#/ietm/dm-editor?id=${dmId}`)

    // 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // 3. 记录首次进入源码视图的gutters布局（基准值）
    const initialLayout = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const gutters = cm.display.gutters
      const foldGutter = gutters.querySelector('.CodeMirror-foldgutter')
      const scroll = cm.display.wrapper.querySelector('.CodeMirror-scroll')

      return {
        guttersWidth: gutters.offsetWidth,
        foldGutterLeft: foldGutter.offsetLeft,
        scrollHeight: scroll.offsetHeight
      }
    })

    console.log('首次进入源码视图布局:', initialLayout)

    // 4. 双击para进入设计视图
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      // 找到第一个para元素的行号
      const doc = cm.getDoc()
      const content = doc.getValue()
      const paraLineMatch = content.match(/<para[^>]*>/i)
      if (paraLineMatch) {
        const paraLine = content.substring(0, paraLineMatch.index).split('\n').length - 1
        // 触发gutter双击事件
        const gutterElement = cm.display.gutters.querySelector('.dmGutter')
        const lineElement = gutterElement.querySelector(`[data-line="${paraLine}"]`)
        if (lineElement) {
          lineElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        }
      }
    })

    // 等待设计视图打开
    await page.waitForSelector('.para-designer', { timeout: 5000 })
    await page.waitForTimeout(1000)

    // 5. 点击"源码视图"标签切换回源码视图
    await page.click('.ant-tabs-tab:has-text("源码视图")')
    await page.waitForTimeout(500)

    // 6. 检查切换后的gutters布局
    const afterSwitchLayout = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const gutters = cm.display.gutters
      const foldGutter = gutters.querySelector('.CodeMirror-foldgutter')
      const scroll = cm.display.wrapper.querySelector('.CodeMirror-scroll')

      return {
        guttersWidth: gutters.offsetWidth,
        foldGutterLeft: foldGutter.offsetLeft,
        scrollHeight: scroll.offsetHeight
      }
    })

    console.log('切换后布局:', afterSwitchLayout)

    // 7. 验证布局是否一致
    expect(afterSwitchLayout.guttersWidth).toBeGreaterThan(50)
    expect(afterSwitchLayout.foldGutterLeft).toBeGreaterThan(40)
    expect(afterSwitchLayout.scrollHeight).toBeGreaterThan(600)

    // 更严格的验证：与首次进入时的布局对比（允许±5px误差）
    expect(Math.abs(afterSwitchLayout.guttersWidth - initialLayout.guttersWidth)).toBeLessThan(5)
    expect(Math.abs(afterSwitchLayout.foldGutterLeft - initialLayout.foldGutterLeft)).toBeLessThan(5)
    expect(Math.abs(afterSwitchLayout.scrollHeight - initialLayout.scrollHeight)).toBeLessThan(5)

    console.log('✅ 布局修复验证通过！')
  })
})
