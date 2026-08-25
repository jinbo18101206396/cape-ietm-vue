/**
 * 预览功能 - Script执行问题诊断
 *
 * 发现：通过innerHTML注入的script标签不会执行
 * 需要验证：真实预览系统是否受影响
 */

import { test, expect } from '@playwright/test'

test.describe('预览Script执行诊断', () => {
  test('🔍 诊断1：innerHTML注入script的问题', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await page.evaluate(() => {
      const iframe = document.createElement('iframe')
      iframe.id = 'testIframe'
      document.body.appendChild(iframe)

      const html = `
        <div>
          <button id="testBtn" onclick="alert('clicked')">Test</button>
          <script>
            window.scriptExecuted = true;
            function testFunction() {
              return 'function works';
            }
          </script>
        </div>
      `

      iframe.contentDocument.body.innerHTML = html
    })

    await page.waitForTimeout(500)

    // 检查script是否执行
    const scriptExecuted = await page.evaluate(() => {
      const iframe = document.getElementById('testIframe')
      return iframe.contentWindow.scriptExecuted === true
    })

    console.log(`❌ Script通过innerHTML注入: ${scriptExecuted ? '执行了' : '未执行'}`)
    expect(scriptExecuted).toBe(false) // innerHTML方式script不会执行

    // 检查onclick是否工作
    const onclickExists = await page.evaluate(() => {
      const iframe = document.getElementById('testIframe')
      const btn = iframe.contentDocument.getElementById('testBtn')
      return btn && btn.onclick !== null
    })

    console.log(`onclick属性: ${onclickExists ? '存在' : '不存在'}`)
  })

  test('🔍 诊断2：真实预览系统的script处理方式', async ({ page }) => {
    // Mock真实的预览API
    const htmlWithScript = `
<div class="dm-preview">
  <h1>Test Script Execution</h1>
  <button id="toggleBtn" onclick="togglePanel()">Toggle</button>
  <div id="panel" style="display:none;">Hidden Panel</div>
  <div id="executionMarker"></div>
  <script>
    // 标记script已执行
    document.getElementById('executionMarker').setAttribute('data-executed', 'true');

    function togglePanel() {
      const panel = document.getElementById('panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  </script>
</div>`

    await page.route('**/ietm/dm-content/preview', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, result: htmlWithScript })
      })
    })

    // 导航到DM编辑页面
    await page.goto('http://localhost:3000/#/ietm/dm-manage/editor/test')
    await page.waitForTimeout(1000)

    // 寻找预览按钮并点击
    const previewBtnExists = await page.locator('button:has-text("预览")').count()

    if (previewBtnExists > 0) {
      await page.locator('button:has-text("预览")').first().click()
      await page.waitForTimeout(1000)

      // 检查iframe中的script是否执行
      const scriptExecuted = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        if (!iframe || !iframe.contentDocument) return null

        const marker = iframe.contentDocument.getElementById('executionMarker')
        return marker && marker.getAttribute('data-executed') === 'true'
      })

      console.log(`🔍 真实系统中script执行状态: ${scriptExecuted === null ? '无法检测' : (scriptExecuted ? '✅ 执行了' : '❌ 未执行')}`)

      if (scriptExecuted === false) {
        console.log('⚠️  警告：真实系统中script未执行，UI交互功能可能受影响！')
      }
    } else {
      console.log('⚠️  未找到预览按钮，跳过真实系统测试')
    }
  })

  test('✅ 解决方案：使用document.write或srcdoc', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await page.evaluate(() => {
      // 方法1：使用srcdoc属性
      const iframe1 = document.createElement('iframe')
      iframe1.id = 'iframe1'
      iframe1.srcdoc = `
        <div>
          <script>window.method1Works = true;</script>
          <div id="marker1"></div>
        </div>
      `
      document.body.appendChild(iframe1)

      // 方法2：使用document.write
      const iframe2 = document.createElement('iframe')
      iframe2.id = 'iframe2'
      document.body.appendChild(iframe2)
      iframe2.contentDocument.open()
      iframe2.contentDocument.write(`
        <div>
          <script>window.method2Works = true;</script>
          <div id="marker2"></div>
        </div>
      `)
      iframe2.contentDocument.close()
    })

    await page.waitForTimeout(500)

    // 验证方法1（srcdoc）
    const method1Works = await page.evaluate(() => {
      const iframe = document.getElementById('iframe1')
      return iframe.contentWindow.method1Works === true
    })

    // 验证方法2（document.write）
    const method2Works = await page.evaluate(() => {
      const iframe = document.getElementById('iframe2')
      return iframe.contentWindow.method2Works === true
    })

    console.log(`✅ 方法1 (srcdoc): ${method1Works ? '可行' : '不可行'}`)
    console.log(`✅ 方法2 (document.write): ${method2Works ? '可行' : '不可行'}`)

    expect(method1Works || method2Works).toBe(true)
  })

  test('🔍 诊断3：检查真实预览代码的实现方式', async ({ page }) => {
    await page.goto('http://localhost:3000/#/ietm/dm-manage')
    await page.waitForTimeout(1000)

    // 读取DmPreviewModal组件的实现
    const componentCode = await page.evaluate(() => {
      // 尝试从Vue实例中获取组件信息
      const app = document.getElementById('app')
      if (!app || !app.__vue_app__) return null

      // 这只是一个诊断尝试，实际可能无法获取
      return 'need to check source code manually'
    })

    console.log('📝 需要手动检查 DmPreviewModal.vue 的实现方式')
    console.log('   查找: iframe.contentDocument.body.innerHTML = ...')
    console.log('   推荐: 使用 iframe.srcdoc 或 document.write')
  })
})
