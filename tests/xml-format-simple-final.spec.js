/**
 * XML 格式化修复验证 - 最简化版本
 *
 * 简化策略：
 * 1. 更长的等待时间
 * 2. 更宽松的选择器
 * 3. 更多的调试信息
 */

const { test, expect } = require('@playwright/test')

test('XML 格式化修复验证', async ({ page }) => {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 XML 格式化修复验证测试')
  console.log('='.repeat(70) + '\n')

  try {
    // 步骤 1: 登录
    console.log('📍 步骤 1: 访问登录页面')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('   ✅ 页面加载完成')

    // 截图调试
    await page.screenshot({ path: 'debug-login-page.png', fullPage: true })
    console.log('   📸 登录页面截图: debug-login-page.png')

    // 查找输入框
    console.log('\n📍 步骤 2: 填写登录信息')

    // 尝试多种选择器
    const usernameSelectors = [
      'input[placeholder*="账户"]',
      'input[placeholder*="admin"]',
      'input[name="username"]',
      'input[type="text"]'
    ]

    let usernameInput = null
    for (const selector of usernameSelectors) {
      try {
        usernameInput = await page.locator(selector).first()
        const isVisible = await usernameInput.isVisible({ timeout: 2000 })
        if (isVisible) {
          console.log(`   ✅ 找到用户名输入框: ${selector}`)
          break
        }
      } catch (e) {
        console.log(`   ⚠️ 选择器失败: ${selector}`)
      }
    }

    if (!usernameInput) {
      throw new Error('无法找到用户名输入框')
    }

    await usernameInput.fill('admin')
    console.log('   ✅ 已填写用户名: admin')

    // 查找密码框
    const passwordSelectors = [
      'input[placeholder*="密码"]',
      'input[name="password"]',
      'input[type="password"]'
    ]

    let passwordInput = null
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.locator(selector).first()
        const isVisible = await passwordInput.isVisible({ timeout: 2000 })
        if (isVisible) {
          console.log(`   ✅ 找到密码输入框: ${selector}`)
          break
        }
      } catch (e) {
        console.log(`   ⚠️ 选择器失败: ${selector}`)
      }
    }

    if (!passwordInput) {
      throw new Error('无法找到密码输入框')
    }

    await passwordInput.fill('123456')
    console.log('   ✅ 已填写密码: 123456')

    // 点击登录
    await page.waitForTimeout(1000)
    await page.click('button:has-text("登录")')
    console.log('   ✅ 已点击登录按钮')

    await page.waitForTimeout(5000)
    console.log('   ✅ 登录完成\n')

    // 步骤 2: 访问编辑器
    console.log('📍 步骤 3: 访问编辑器页面')
    const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(5000)
    console.log('   ✅ 编辑器页面加载完成')

    // 截图
    await page.screenshot({ path: 'debug-editor-page.png', fullPage: true })
    console.log('   📸 编辑器页面截图: debug-editor-page.png\n')

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
    console.log(`   - 格式化状态: ${initialLineCount > 5 ? '✅ 多行' : '⚠️ 单行'}`)
    console.log('   ✅ 初始状态读取完成\n')

    // 步骤 4: 点击编辑图标
    console.log('📍 步骤 5: 查找并点击第 69 行编辑图标')

    // 查找所有可能的编辑图标
    const allIcons = await page.locator('i, [class*="icon"], button').all()
    console.log(`   - 页面共有 ${allIcons.length} 个图标/按钮元素`)

    let designerOpened = false
    let clickedIndex = -1

    for (let i = 0; i < Math.min(allIcons.length, 50); i++) {
      try {
        const icon = allIcons[i]
        const classes = await icon.getAttribute('class').catch(() => '')

        if (classes.includes('edit') || classes.includes('pencil') || classes.includes('design')) {
          const isVisible = await icon.isVisible({ timeout: 500 })
          if (isVisible) {
            await icon.click()
            await page.waitForTimeout(2000)

            // 检查设计器是否打开
            const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)
            if (saveBtn) {
              designerOpened = true
              clickedIndex = i
              break
            }
          }
        }
      } catch (e) {
        // 继续下一个
      }
    }

    if (designerOpened) {
      console.log(`   ✅ 设计器已打开（第 ${clickedIndex + 1} 个图标）\n`)
    } else {
      console.log('   ❌ 无法打开设计器')
      await page.screenshot({ path: 'debug-no-designer.png', fullPage: true })
      console.log('   📸 调试截图: debug-no-designer.png')
      throw new Error('无法打开 para 设计器')
    }

    // 步骤 5: 点击保存
    console.log('📍 步骤 6: 点击保存按钮')
    await page.click('button:has-text("保存")')
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
    console.log(`   - 格式化状态: ${isFormatted ? '✅ 多行格式化' : '❌ 单行'}`)

    // XML 预览
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

    await page.screenshot({ path: 'test-success.png', fullPage: true })
    console.log('📸 成功截图: test-success.png\n')

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    await page.screenshot({ path: 'test-error.png', fullPage: true })
    console.log('📸 错误截图: test-error.png\n')
    throw error
  }
})
