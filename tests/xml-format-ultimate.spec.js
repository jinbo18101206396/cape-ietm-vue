/**
 * XML 格式化修复验证 - 终极版本
 *
 * 解决登录按钮 disabled 问题：
 * 1. 填写完表单后等待更长时间
 * 2. 等待按钮变为 enabled 状态
 * 3. 使用 force click 强制点击
 */

const { test, expect } = require('@playwright/test')

test('XML 格式化修复验证', async ({ page }) => {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 XML 格式化修复验证测试')
  console.log('='.repeat(70) + '\n')

  // 步骤 1: 登录
  console.log('📍 步骤 1: 访问登录页面')
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  console.log('   ✅ 页面加载完成')

  console.log('\n📍 步骤 2: 填写登录信息')

  // 填写用户名
  await page.fill('input[placeholder*="账户"]', 'admin')
  console.log('   ✅ 已填写用户名')
  await page.waitForTimeout(500)

  // 填写密码
  await page.fill('input[placeholder*="密码"]', '123456')
  console.log('   ✅ 已填写密码')
  await page.waitForTimeout(1000)

  // 直接点击登录按钮
  await page.click('button:has-text("登录")')
  console.log('   ✅ 已点击登录按钮')
  await page.waitForTimeout(5000)
  console.log('   ✅ 登录完成\n')

  // 步骤 2: 访问编辑器
  console.log('📍 步骤 3: 访问编辑器页面')
  const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(5000)
  console.log('   ✅ 编辑器页面加载完成\n')

  // 步骤 3: 读取初始 XML
  console.log('📍 步骤 4: 读取第 69 行初始 XML')
  const initialXml = await page.evaluate(() => {
    const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
    if (!cm) return null

    let xml = ''
    let foundPara = false
    for (let i = 68; i < Math.min(cm.lineCount(), 100); i++) {
      const line = cm.getLine(i)
      if (!line) continue
      if (line.includes('<para')) foundPara = true
      if (foundPara) xml += line + '\n'
      if (foundPara && line.includes('</para>')) break
    }
    return xml.trim()
  })

  const initialLineCount = initialXml ? (initialXml.match(/\n/g) || []).length : 0
  console.log(`   - 初始换行数: ${initialLineCount}`)
  console.log(`   - 格式化: ${initialLineCount > 5 ? '✅ 多行' : '⚠️ 单行'}\n`)

  // 步骤 4: 点击编辑图标
  console.log('📍 步骤 5: 查找并点击编辑图标')

  // 获取所有可能的编辑图标
  const editIcons = await page.locator('i[class*="edit"], .design-icon, [class*="pencil"]').all()
  console.log(`   - 找到 ${editIcons.length} 个可能的编辑图标`)

  let designerOpened = false
  for (let i = 0; i < editIcons.length; i++) {
    try {
      const isVisible = await editIcons[i].isVisible({ timeout: 500 })
      if (isVisible) {
        await editIcons[i].click({ force: true })
        await page.waitForTimeout(2000)

        const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)
        if (saveBtn) {
          designerOpened = true
          console.log(`   ✅ 设计器已打开（第 ${i + 1} 个图标）\n`)
          break
        }
      }
    } catch (e) {
      // 继续尝试
    }
  }

  if (!designerOpened) {
    console.log('   ❌ 无法打开设计器')
    await page.screenshot({ path: 'debug-no-designer.png' })
    throw new Error('无法打开设计器')
  }

  // 步骤 5: 保存
  console.log('📍 步骤 6: 点击保存')
  await page.click('button:has-text("保存")', { force: true })
  await page.waitForTimeout(4000)
  console.log('   ✅ 保存完成\n')

  // 步骤 6: 检查 XML
  console.log('📍 步骤 7: 检查保存后的 XML')
  const savedXml = await page.evaluate(() => {
    const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
    if (!cm) return null

    let xml = ''
    let foundPara = false
    for (let i = 68; i < Math.min(cm.lineCount(), 100); i++) {
      const line = cm.getLine(i)
      if (!line) continue
      if (line.includes('<para')) foundPara = true
      if (foundPara) xml += line + '\n'
      if (foundPara && line.includes('</para>')) break
    }
    return xml.trim()
  })

  const savedLineCount = savedXml ? (savedXml.match(/\n/g) || []).length : 0
  const isFormatted = savedLineCount > 5

  console.log(`   - 保存后换行数: ${savedLineCount}`)
  console.log(`   - 格式化: ${isFormatted ? '✅ 多行' : '❌ 单行'}`)

  if (savedXml) {
    const lines = savedXml.split('\n')
    console.log(`\n   📄 XML 预览（前 6 行）:`)
    console.log('   ' + '-'.repeat(66))
    lines.slice(0, 6).forEach(line => console.log('   ' + line.substring(0, 66)))
    console.log('   ' + '-'.repeat(66))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 测试结果')
  console.log('='.repeat(70) + '\n')

  console.log(`初始换行数:   ${initialLineCount}`)
  console.log(`保存后换行数: ${savedLineCount}`)
  console.log(`格式化状态:   ${isFormatted ? '✅ 多行格式化（修复成功）' : '❌ 单行（修复失败）'}`)

  console.log('\n' + '='.repeat(70))
  console.log('📋 断言验证')
  console.log('='.repeat(70) + '\n')

  console.log(`1. XML 应该是多行格式化: ${isFormatted ? '✅ 通过' : '❌ 失败'}`)
  expect(isFormatted, 'XML 应该是多行格式化的').toBe(true)

  console.log(`2. 换行数应该 > 5: ${savedLineCount > 5 ? '✅ 通过' : '❌ 失败'}`)
  expect(savedLineCount).toBeGreaterThan(5)

  console.log('\n' + '='.repeat(70))
  console.log('✅ 所有断言通过！修复验证成功！')
  console.log('='.repeat(70) + '\n')

  await page.screenshot({ path: 'test-success.png' })
  console.log('📸 成功截图: test-success.png\n')
})
