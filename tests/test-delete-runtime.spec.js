/**
 * 直接测试转换函数 - 注入测试代码到页面
 */

const { test, expect } = require('@playwright/test')

test.describe('删除线转换实时测试', () => {
  test.setTimeout(120000)

  test('直接注入并测试转换函数', async ({ page }) => {
    console.log('🔹 步骤 1: 访问页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await page.waitForTimeout(5000)

    console.log('🔹 步骤 2: 在页面中直接测试转换逻辑')

    const testResult = await page.evaluate(() => {
      // 测试 HTML → XML 转换
      let testHtml = '<s>123</s>'

      // 模拟 html2para 中的转换逻辑
      let result = testHtml
        .replace(/<s(\s[^>]*)?\>/g, '<delete>')
        .replace(/<\/s>/g, '</delete>')

      return {
        input: testHtml,
        output: result,
        expectedOutput: '<delete>123</delete>',
        success: result === '<delete>123</delete>'
      }
    })

    console.log('📋 转换测试结果:')
    console.log('  输入:', testResult.input)
    console.log('  输出:', testResult.output)
    console.log('  期望:', testResult.expectedOutput)
    console.log('  成功:', testResult.success ? '✅' : '❌')

    expect(testResult.success).toBe(true)

    console.log('\n🔹 步骤 3: 检查实际加载的 paraConverter 模块')

    const moduleCheck = await page.evaluate(() => {
      // 尝试读取已加载的模块
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      const paraConverterScript = scripts.find(s => s.src.includes('paraConverter'))

      // 检查是否有 webpack 缓存
      const hasWebpackCache = typeof __webpack_require__ !== 'undefined'

      return {
        scriptsCount: scripts.length,
        hasParaConverterScript: !!paraConverterScript,
        hasWebpackCache: hasWebpackCache,
        timestamp: new Date().toISOString()
      }
    })

    console.log('📦 模块加载信息:')
    console.log('  脚本总数:', moduleCheck.scriptsCount)
    console.log('  找到 paraConverter:', moduleCheck.hasParaConverterScript)
    console.log('  Webpack 缓存:', moduleCheck.hasWebpackCache)
    console.log('  检查时间:', moduleCheck.timestamp)

    console.log('\n🔹 步骤 4: 检查浏览器控制台错误')

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ 浏览器错误:', msg.text())
      }
    })

    await page.waitForTimeout(2000)
  })

  test('检查实际保存流程', async ({ page }) => {
    console.log('🔹 步骤 1: 访问页面并等待加载')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await page.waitForTimeout(8000)

    console.log('🔹 步骤 2: 切换到设计视图')
    const designTab = page.locator('.ant-tabs-tab').filter({ hasText: '设计视图' })
    if (await designTab.count() > 0) {
      await designTab.click()
      await page.waitForTimeout(3000)
    }

    console.log('🔹 步骤 3: 检查是否能访问 UEditor')
    const hasEditor = await page.evaluate(() => {
      return typeof window.UE !== 'undefined'
    })
    console.log('  UEditor 已加载:', hasEditor ? '✅' : '❌')

    console.log('🔹 步骤 4: 拦截保存请求')
    let saveRequestBody = null

    page.on('request', request => {
      if (request.url().includes('/save') || request.url().includes('para')) {
        console.log('📡 拦截到请求:', request.url())
        try {
          const postData = request.postData()
          if (postData) {
            saveRequestBody = postData
            console.log('📄 请求体前 200 字符:', postData.substring(0, 200))
          }
        } catch (e) {
          console.log('无法读取请求体:', e.message)
        }
      }
    })

    console.log('\n💡 提示: 请手动执行以下操作来测试:')
    console.log('1. 在设计视图中输入文本 "123"')
    console.log('2. 全选文本并点击删除线按钮')
    console.log('3. 点击保存')
    console.log('4. 观察控制台输出')

    // 等待 60 秒让用户手动操作
    await page.waitForTimeout(60000)

    if (saveRequestBody) {
      console.log('\n📊 捕获到保存数据:')
      console.log(saveRequestBody.substring(0, 500))
    }
  })
})
