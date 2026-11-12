/**
 * XML 格式化修复验证 - 第二部分
 *
 * 前提：用户已经手动导航到源码视图页面
 *
 * 测试步骤：
 * 4. 点击第 69 行的铅笔图标
 * 5. 点击右上角的"保存"
 * 6. 检查 XML 文件是否为多行格式化
 */

const { test, expect } = require('@playwright/test')

test('XML 格式化验证 - 第二部分', async ({ page }) => {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 XML 格式化修复验证 - 第二部分')
  console.log('='.repeat(70) + '\n')

  // 假设页面已经打开，连接到现有页面
  const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'
  await page.goto(url, { waitUntil: 'networkidle' })

  // 等待 CodeMirror 加载
  await page.waitForSelector('.CodeMirror', { timeout: 15000 })
  await page.waitForTimeout(3000)
  console.log('📍 已连接到编辑器页面\n')

  // 步骤 1: 读取第 69 行初始 XML
  console.log('📍 步骤 1: 读取第 69 行初始 XML')
  const initialXml = await page.evaluate(() => {
    const cmElement = document.querySelector('.CodeMirror')
    if (!cmElement) return null
    const cm = cmElement.CodeMirror || window.cmInstance
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
  console.log(`   - 格式化状态: ${initialLineCount > 5 ? '✅ 多行' : '⚠️ 单行'}`)
  console.log('   ✅ 初始状态读取完成\n')

  // 步骤 2: 点击第 69 行的铅笔图标
  console.log('📍 步骤 2: 点击第 69 行的铅笔图标')

  // 等待页面加载完成
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  await page.waitForTimeout(1000)

  // 查找所有编辑图标
  const allIcons = await page.locator('i, [class*="icon"], button').all()
  console.log(`   - 页面共有 ${allIcons.length} 个图标/按钮`)

  let designerOpened = false

  // 遍历查找编辑图标
  for (let i = 0; i < allIcons.length; i++) {
    try {
      const icon = allIcons[i]
      const classes = await icon.getAttribute('class').catch(() => '')

      if (classes && (classes.includes('edit') || classes.includes('pencil') || classes.includes('design'))) {
        const isVisible = await icon.isVisible({ timeout: 500 })
        if (isVisible) {
          console.log(`   - 尝试点击第 ${i + 1} 个编辑图标`)
          await icon.click()
          await page.waitForTimeout(2000)

          // 检查设计器是否打开
          const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)
          if (saveBtn) {
            designerOpened = true
            console.log(`   ✅ 设计器已打开\n`)
            break
          }
        }
      }
    } catch (e) {
      // 继续尝试下一个
    }
  }

  if (!designerOpened) {
    console.log('   ❌ 无法打开设计器')
    await page.screenshot({ path: 'debug-no-designer.png', fullPage: true })
    console.log('   📸 调试截图: debug-no-designer.png')
    throw new Error('无法打开 para 设计器')
  }

  // 步骤 3: 点击保存按钮
  console.log('📍 步骤 3: 点击右上角的"保存"按钮')

  const saveButtons = await page.locator('button:has-text("保存")').all()
  console.log(`   - 找到 ${saveButtons.length} 个保存按钮`)

  if (saveButtons.length > 0) {
    await saveButtons[0].click()
    console.log('   ✅ 已点击保存按钮')
    await page.waitForTimeout(3000)
    console.log('   ✅ 保存完成\n')
  } else {
    throw new Error('未找到保存按钮')
  }

  // 步骤 4: 检查保存后的 XML 格式
  console.log('📍 步骤 4: 检查 XML 文件是否为多行格式化')

  const savedXml = await page.evaluate(() => {
    const cmElement = document.querySelector('.CodeMirror')
    if (!cmElement) return null
    const cm = cmElement.CodeMirror || window.cmInstance
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
  console.log(`   - 格式化状态: ${isFormatted ? '✅ 多行格式化' : '❌ 单行'}`)

  // 显示 XML 预览
  if (savedXml) {
    const lines = savedXml.split('\n')
    console.log(`\n   📄 XML 预览（前 8 行）:`)
    console.log('   ' + '-'.repeat(66))
    lines.slice(0, 8).forEach((line, idx) => {
      console.log(`   ${String(idx + 1).padStart(2)}: ${line.substring(0, 60)}`)
    })
    console.log('   ' + '-'.repeat(66))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 测试结果对比')
  console.log('='.repeat(70) + '\n')

  console.log(`初始换行数:   ${initialLineCount}`)
  console.log(`保存后换行数: ${savedLineCount}`)
  console.log(`换行数变化:   ${savedLineCount - initialLineCount >= 0 ? '+' : ''}${savedLineCount - initialLineCount}`)
  console.log(`格式化状态:   ${isFormatted ? '✅ 多行格式化（修复成功）' : '❌ 单行（修复失败）'}`)

  console.log('\n' + '='.repeat(70))
  console.log('📋 断言验证')
  console.log('='.repeat(70) + '\n')

  // 断言 1: 保存后应该是多行格式化的
  console.log(`1. XML 应该是多行格式化: ${isFormatted ? '✅ 通过' : '❌ 失败'}`)
  expect(isFormatted, 'XML 应该是多行格式化的').toBe(true)

  // 断言 2: 换行数应该大于 5
  console.log(`2. 换行数应该 > 5: ${savedLineCount > 5 ? '✅ 通过' : '❌ 失败'} (实际: ${savedLineCount})`)
  expect(savedLineCount, '换行数应该大于 5').toBeGreaterThan(5)

  // 断言 3: 格式不应该丢失（换行数不应该显著减少）
  const formatMaintained = savedLineCount >= Math.max(initialLineCount - 2, 5)
  console.log(`3. 格式应该保持: ${formatMaintained ? '✅ 通过' : '❌ 失败'}`)
  expect(formatMaintained, '格式应该保持，换行数不应该显著减少').toBe(true)

  console.log('\n' + '='.repeat(70))
  console.log('✅ 所有断言通过！XML 格式化修复验证成功！')
  console.log('='.repeat(70) + '\n')

  console.log('🎉 修复效果：')
  console.log('   - 保存后 XML 保持多行格式化')
  console.log('   - 换行符未被删除')
  console.log('   - 代码可读性得到保持')
  console.log('   - 版本控制 diff 友好\n')

  // 保存成功截图
  await page.screenshot({ path: 'test-success.png', fullPage: true })
  console.log('📸 成功截图: test-success.png\n')
})
