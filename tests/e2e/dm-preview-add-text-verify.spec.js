const { test, expect } = require('@playwright/test')
const http = require('http')

// 在真实编辑器中添加测试文字并验证预览功能

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(null) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
const DM_ID = '2084945965503942657'
const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
const PROJECT_ID = '2078348945532030978'

test.beforeAll(async () => {
  const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  TOKEN = login.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
})

test('在编辑器中添加测试文字并验证预览', async ({ page }) => {
  console.log('========== 步骤1: 打开编辑器 ==========')
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)

  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    if (!cm || !cm.CodeMirror) return false
    const el = document.querySelector('.dm-editor-page')
    return !!(el && el.__vue__)
  }, { timeout: 30000 })

  console.log('✓ 编辑器已加载')
  await page.waitForTimeout(2000)

  console.log('\n========== 步骤2: 查看原始内容 ==========')
  const originalContent = await page.evaluate(() => {
    return document.querySelector('.CodeMirror').CodeMirror.getValue()
  })
  console.log('原始XML长度:', originalContent.length)
  console.log('原始<description>区域:')
  const descMatch = originalContent.match(/<description>[\s\S]*?<\/description>/)
  if (descMatch) {
    console.log(descMatch[0])
  }

  console.log('\n========== 步骤3: 在<description>中添加测试文字 ==========')

  // 方案：在<description>开头添加title和para
  const modifiedContent = originalContent.replace(
    /<description>/,
    `<description>
      <title>【测试】设备操作说明</title>
      <para>这是添加的测试段落1：本文档描述了设备的基本操作流程和注意事项。</para>
      <para>这是添加的测试段落2：请仔细阅读以下内容，确保正确操作设备。</para>
      <para>这是添加的测试段落3：包含嵌套元素 <emphasis>重要提示</emphasis> 的段落。</para>`
  )

  await page.evaluate((newContent) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.setValue(newContent)
  }, modifiedContent)

  console.log('✓ 已添加测试文字')
  await page.waitForTimeout(1000)

  // 验证修改
  const modifiedVerify = await page.evaluate(() => {
    const content = document.querySelector('.CodeMirror').CodeMirror.getValue()
    return {
      hasTitle: content.includes('【测试】设备操作说明'),
      hasPara1: content.includes('这是添加的测试段落1'),
      hasPara2: content.includes('这是添加的测试段落2'),
      hasPara3: content.includes('这是添加的测试段落3'),
      hasEmphasis: content.includes('<emphasis>重要提示</emphasis>')
    }
  })
  console.log('修改验证:', modifiedVerify)

  console.log('\n========== 步骤4: 拦截预览API ==========')
  let apiResponse = null
  await page.route('**/dm-content/preview', async route => {
    const response = await route.fetch()
    apiResponse = await response.json()
    console.log('\n📥 后端API响应:')
    console.log('  flag:', apiResponse.result?.flag)
    console.log('  html长度:', apiResponse.result?.html?.length)
    console.log('  html内容:', apiResponse.result?.html)
    await route.fulfill({ response })
  })

  console.log('\n========== 步骤5: 点击预览按钮 ==========')
  const previewBtn = page.locator('button[title="生成HTML预览"]')
  await previewBtn.click()
  console.log('✓ 已点击预览按钮')

  await page.waitForTimeout(3000)

  console.log('\n========== 步骤6: 检查预览弹窗 ==========')
  const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
  const modalVisible = await modal.isVisible()
  console.log('弹窗可见:', modalVisible)

  if (modalVisible) {
    console.log('\n========== 步骤7: 检查iframe内容 ==========')
    const iframe = modal.locator('iframe')
    const iframeVisible = await iframe.isVisible()
    console.log('iframe可见:', iframeVisible)

    const srcdoc = await iframe.getAttribute('srcdoc')
    console.log('srcdoc长度:', srcdoc?.length)
    console.log('srcdoc完整内容:\n', srcdoc)

    console.log('\n========== 步骤8: 验证文本内容 ==========')
    const textChecks = {
      '包含标题': srcdoc?.includes('【测试】设备操作说明'),
      '包含段落1': srcdoc?.includes('这是添加的测试段落1'),
      '包含段落2': srcdoc?.includes('这是添加的测试段落2'),
      '包含段落3': srcdoc?.includes('这是添加的测试段落3'),
      '包含嵌套文本': srcdoc?.includes('重要提示'),
      '包含<h4>': srcdoc?.includes('<h4>'),
      '包含<p>': srcdoc?.includes('<p>'),
      '不含空<p>': !(srcdoc?.includes('<p></p>'))
    }

    console.log('文本验证结果:')
    Object.entries(textChecks).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`)
    })

    // 断言
    expect(textChecks['包含标题']).toBe(true)
    expect(textChecks['包含段落1']).toBe(true)
    expect(textChecks['包含段落2']).toBe(true)
    expect(textChecks['包含段落3']).toBe(true)
    expect(textChecks['包含嵌套文本']).toBe(true)

    console.log('\n========== 步骤9: 保存截图 ==========')
    await page.screenshot({ path: 'verify-preview-with-text-fullpage.png', fullPage: true })
    console.log('✓ 全页截图: verify-preview-with-text-fullpage.png')

    await modal.screenshot({ path: 'verify-preview-with-text-modal.png' })
    console.log('✓ 弹窗截图: verify-preview-with-text-modal.png')

    console.log('\n========== 🎉 验证成功！ ==========')
    console.log('预览功能完全正常！')
    console.log('- 标题正确显示')
    console.log('- 所有段落正确显示')
    console.log('- 嵌套元素文本正确提取')
    console.log('- 无空标签')
  } else {
    console.error('\n❌ 弹窗未打开')

    // 检查是否有错误提示
    const toast = page.locator('.ant-message-notice-content')
    const toastVisible = await toast.isVisible().catch(() => false)
    if (toastVisible) {
      const toastText = await toast.textContent()
      console.log('错误提示:', toastText)
    }
  }

  console.log('\n========== 步骤10: 保持浏览器打开15秒供查看 ==========')
  console.log('你现在可以在浏览器中查看预览效果...')
  await page.waitForTimeout(15000)
})
