const { test, expect } = require('@playwright/test')

test('真实CodeMirror元素操作端到端测试', async ({ page }) => {
  test.setTimeout(60000)

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message))

  // 加载测试页面（public下的静态文件由dev server直接提供）
  await page.goto('http://localhost:3000/cm-test.html', { waitUntil: 'networkidle' })

  // 等待测试结果生成
  await page.waitForFunction(() => window.__testResults && window.__testResults.length > 0, { timeout: 15000 })

  const results = await page.evaluate(() => window.__testResults)

  console.log('\n========== 真实浏览器测试结果 ==========')
  results.forEach(r => {
    console.log(`${r.pass ? '✓ PASS' : '✗ FAIL'}  ${r.name}`)
    if (!r.pass) console.log('       detail: ' + r.detail)
  })

  if (consoleErrors.length) {
    console.log('\n----- 控制台错误 -----')
    consoleErrors.forEach(e => console.log('  ' + e))
  }

  const failed = results.filter(r => !r.pass)
  console.log(`\n通过 ${results.length - failed.length}/${results.length}`)

  // 截图
  await page.screenshot({ path: '/tmp/cm-test-result.png', fullPage: true })

  // 断言全部通过
  expect(failed.map(f => f.name + ': ' + f.detail).join('\n')).toBe('')
})
