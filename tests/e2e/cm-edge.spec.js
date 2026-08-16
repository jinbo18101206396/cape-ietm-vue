const { test, expect } = require('@playwright/test')

test('真实CodeMirror边界场景测试', async ({ page }) => {
  test.setTimeout(60000)
  const errs = []
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))

  await page.goto('http://localhost:3000/cm-test-edge.html', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__testResults && window.__testResults.length > 0, { timeout: 15000 })
  const results = await page.evaluate(() => window.__testResults)

  console.log('\n========== 边界场景测试结果 ==========')
  results.forEach(r => {
    console.log(`${r.pass ? '✓ PASS' : '✗ FAIL'}  ${r.name}`)
    if (!r.pass) console.log('       ' + r.detail.replace(/\n/g, '\n       '))
  })
  if (errs.length) { console.log('\n控制台错误:'); errs.forEach(e => console.log('  ' + e)) }

  const failed = results.filter(r => !r.pass)
  console.log(`\n通过 ${results.length - failed.length}/${results.length}`)
  await page.screenshot({ path: '/tmp/cm-edge-result.png', fullPage: true })

  expect(failed.map(f => f.name).join(', ')).toBe('')
})
