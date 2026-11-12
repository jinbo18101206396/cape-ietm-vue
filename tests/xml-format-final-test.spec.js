/**
 * XML 格式化修复验证 - 最终版
 *
 * 测试步骤：
 * 1. 访问登录页面，输入用户名 admin，密码 123456
 * 2. 访问源码视图页面
 * 3. 点击第 69 行铅笔图标
 * 4. 点击右上角"保存"
 * 5. 检查 XML 是否为多行格式化
 */

const { test, expect } = require('@playwright/test')

test('XML 格式化修复验证', async ({ page }) => {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 XML 格式化修复验证测试')
  console.log('='.repeat(70) + '\n')

  // 步骤 1: 登录
  console.log('📍 步骤 1: 登录系统')
  await page.goto('http://localhost:3000/')
  await page.waitForTimeout(2000)

  // 输入用户名和密码
  await page.fill('input[placeholder="账户: admin"]', 'admin')
  await page.fill('input[placeholder="密码: admin"]', '123456')

  // 等待登录按钮可用并点击
  await page.waitForSelector('button:has-text("登录"):not([disabled])', { timeout: 10000 })
  await page.click('button:has-text("登录")')
  await page.waitForTimeout(4000)
  console.log('   ✅ 登录成功\n')

  // 步骤 2: 访问编辑器页面
  console.log('📍 步骤 2: 访问源码视图页面')
  const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'
  await page.goto(url)
  await page.waitForTimeout(4000)
  console.log('   ✅ 页面加载完成\n')

  // 步骤 3: 读取第 69 行初始状态
  console.log('📍 步骤 3: 读取第 69 行初始 XML')
  const initialXml = await page.evaluate(() => {
    const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
    if (!cm) return null

    let xml = ''
    let foundPara = false
    for (let i = 68; i < Math.min(cm.lineCount(), 90); i++) {
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
  console.log(`   - 包含 para: ${initialXml ? initialXml.includes('<para') : false}`)
  console.log(`   - 包含 dmRef: ${initialXml ? initialXml.includes('dmRef') : false}`)
  console.log('   ✅ 初始状态读取完成\n')

  // 步骤 4: 点击第 69 行的铅笔图标
  console.log('📍 步骤 4: 点击第 69 行铅笔图标')

  // 等待 CodeMirror 加载完成
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  await page.waitForTimeout(1000)

  // 尝试查找并点击编辑图标
  let designerOpened = false

  // 方法: 查找所有可见的编辑图标
  const editIcons = await page.locator('.design-icon, i.anticon-edit, [class*="edit-icon"]').all()
  console.log(`   - 找到 ${editIcons.length} 个编辑图标`)

  for (let i = 0; i < editIcons.length; i++) {
    try {
      const isVisible = await editIcons[i].isVisible({ timeout: 1000 })
      if (isVisible) {
        console.log(`   - 尝试点击第 ${i + 1} 个编辑图标`)
        await editIcons[i].click()
        await page.waitForTimeout(2000)

        // 检查设计器是否打开
        const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)
        if (saveBtn) {
          designerOpened = true
          console.log(`   ✅ 设计器已打开（通过第 ${i + 1} 个图标）`)
          break
        }
      }
    } catch (e) {
      // 继续尝试下一个
    }
  }

  if (!designerOpened) {
    console.log('   ⚠️ 未找到可用的编辑图标，尝试备用方案')

    // 备用方案：通过 CodeMirror 定位
    await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      if (cm) {
        cm.setCursor({ line: 68, ch: 0 })
        cm.focus()
      }
    })
    await page.waitForTimeout(500)

    // 再次尝试查找编辑按钮
    const allButtons = await page.locator('button, i, [role="button"]').all()
    for (const btn of allButtons) {
      const text = await btn.textContent().catch(() => '')
      const classes = await btn.getAttribute('class').catch(() => '')
      if (text.includes('编辑') || classes.includes('edit') || classes.includes('pencil')) {
        await btn.click().catch(() => {})
        await page.waitForTimeout(1000)
        const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)
        if (saveBtn) {
          designerOpened = true
          break
        }
      }
    }
  }

  if (!designerOpened) {
    console.log('   ❌ 无法打开 para 设计器')
    await page.screenshot({ path: 'debug-no-designer.png', fullPage: true })
    console.log('   📸 调试截图: debug-no-designer.png')
    throw new Error('无法打开 para 设计器')
  }

  console.log('\n')

  // 步骤 5: 点击保存按钮
  console.log('📍 步骤 5: 点击保存按钮')

  // 查找保存按钮
  const saveButtons = await page.locator('button:has-text("保存")').all()
  console.log(`   - 找到 ${saveButtons.length} 个保存按钮`)

  if (saveButtons.length > 0) {
    await saveButtons[0].click()
    console.log('   - 已点击保存按钮')
    await page.waitForTimeout(3000)
    console.log('   ✅ 保存完成\n')
  } else {
    throw new Error('未找到保存按钮')
  }

  // 步骤 6: 检查保存后的 XML
  console.log('📍 步骤 6: 检查保存后的 XML 格式')
  const savedXml = await page.evaluate(() => {
    const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
    if (!cm) return null

    let xml = ''
    let foundPara = false
    for (let i = 68; i < Math.min(cm.lineCount(), 90); i++) {
      const line = cm.getLine(i)
      if (!line) continue

      if (line.includes('<para')) foundPara = true
      if (foundPara) xml += line + '\n'
      if (foundPara && line.includes('</para>')) break
    }

    return xml.trim()
  })

  const savedLineCount = savedXml ? (savedXml.match(/\n/g) || []).length : 0
  const isFormatted = savedXml && savedXml.includes('\n') && savedLineCount > 5

  console.log(`   - 保存后换行数: ${savedLineCount}`)
  console.log(`   - 格式化状态: ${isFormatted ? '✅ 多行格式化' : '❌ 单行'}`)

  // 显示 XML 预览
  if (savedXml) {
    const lines = savedXml.split('\n')
    const preview = lines.slice(0, Math.min(8, lines.length)).join('\n')
    console.log(`\n   📄 XML 预览（前 ${Math.min(8, lines.length)} 行）:`)
    console.log('   ' + '-'.repeat(66))
    preview.split('\n').forEach(line => console.log('   ' + line.substring(0, 66)))
    console.log('   ' + '-'.repeat(66))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 测试结果对比')
  console.log('='.repeat(70) + '\n')

  console.log(`初始换行数: ${initialLineCount}`)
  console.log(`保存后换行数: ${savedLineCount}`)
  console.log(`换行数变化: ${savedLineCount - initialLineCount} (${savedLineCount >= initialLineCount ? '✅' : '⚠️'})`)
  console.log(`格式化状态: ${isFormatted ? '✅ 多行格式化（修复成功）' : '❌ 单行（修复失败）'}`)

  console.log('\n' + '='.repeat(70))
  console.log('📋 断言检查')
  console.log('='.repeat(70) + '\n')

  // 断言 1: 保存后应该是多行格式化的
  console.log(`1. XML 应该是多行格式化: ${isFormatted ? '✅ 通过' : '❌ 失败'}`)
  expect(isFormatted, '保存后的 XML 应该是多行格式化的').toBe(true)

  // 断言 2: 换行数应该大于 5
  console.log(`2. 换行数应该 > 5: ${savedLineCount > 5 ? '✅ 通过' : '❌ 失败'} (实际: ${savedLineCount})`)
  expect(savedLineCount, '换行数应该大于 5').toBeGreaterThan(5)

  // 断言 3: 换行数不应该减少（格式不应该丢失）
  const formatMaintained = savedLineCount >= Math.max(5, initialLineCount - 2)
  console.log(`3. 格式应该保持: ${formatMaintained ? '✅ 通过' : '❌ 失败'}`)
  expect(formatMaintained, '格式应该保持，换行数不应该显著减少').toBe(true)

  console.log('\n' + '='.repeat(70))
  console.log('✅ 所有断言通过！XML 格式化修复验证成功！')
  console.log('='.repeat(70) + '\n')

  // 保存截图
  await page.screenshot({ path: 'test-result-success.png', fullPage: true })
  console.log('📸 成功截图: test-result-success.png\n')
})
