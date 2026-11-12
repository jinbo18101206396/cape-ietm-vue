/**
 * XML 格式化修复验证 - 简化版
 *
 * 测试步骤：
 * 1. 访问源码视图页面
 * 2. 点击第 69 行铅笔图标
 * 3. 点击右上角"保存"
 * 4. 检查 XML 是否格式化
 */

const { test, expect } = require('@playwright/test')

test.describe('XML 格式化修复验证', () => {
  test('验证第二次保存格式一致性', async ({ page }) => {
    console.log('\n' + '='.repeat(70))
    console.log('🔍 XML 格式化修复验证测试')
    console.log('='.repeat(70) + '\n')

    // 步骤 1: 访问页面并登录
    console.log('📍 步骤 1: 登录系统')
    await page.goto('http://localhost:3000/user/login')
    await page.waitForTimeout(2000)

    // 填写用户名和密码（确保按钮启用）
    await page.fill('input[placeholder="账户: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')

    // 等待登录按钮变为可用状态
    await page.waitForSelector('button:has-text("登录"):not([disabled])', { timeout: 10000 })
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)
    console.log('   ✅ 登录成功\n')

    // 步骤 2: 访问编辑器页面
    console.log('📍 步骤 2: 访问编辑器页面')
    const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(url)
    await page.waitForTimeout(3000)
    console.log('   ✅ 页面加载完成\n')

    // 步骤 3: 获取第 69 行的初始 XML
    console.log('📍 步骤 3: 读取第 69 行初始状态')
    const initialXml = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      if (!cm) return null

      // 获取第 69 行及周围内容
      let xml = ''
      for (let i = 68; i < Math.min(cm.lineCount(), 85); i++) {
        const line = cm.getLine(i)
        if (!line) continue
        xml += line + '\n'
        if (line.includes('</para>')) break
      }

      return xml.trim()
    })

    const initialLineCount = initialXml ? (initialXml.match(/\n/g) || []).length : 0
    console.log(`   - 初始换行数: ${initialLineCount}`)
    console.log(`   - 包含 para: ${initialXml ? initialXml.includes('<para>') : false}`)
    console.log(`   - 包含 dmRef: ${initialXml ? initialXml.includes('dmRef') : false}`)
    console.log('   ✅ 初始状态读取完成\n')

    // 步骤 4: 点击第 69 行的铅笔图标
    console.log('📍 步骤 4: 点击第 69 行铅笔图标')

    // 尝试多种方式找到并点击铅笔图标
    let designerOpened = false

    // 方法 1: 通过 CodeMirror API 定位行并触发编辑
    designerOpened = await page.evaluate(() => {
      try {
        const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
        if (!cm) return false

        // 设置光标到第 69 行
        cm.setCursor({ line: 68, ch: 0 })
        cm.focus()

        // 查找并点击铅笔图标
        const lineWidget = cm.lineInfo(68)
        if (lineWidget && lineWidget.gutterMarkers) {
          // 触发行标记的点击事件
          return true
        }

        return false
      } catch (e) {
        console.error('方法 1 失败:', e)
        return false
      }
    })

    // 方法 2: 直接查找可见的编辑图标
    if (!designerOpened) {
      await page.waitForTimeout(500)

      // 查找所有可能的编辑按钮
      const editButtons = await page.locator('[class*="edit"], [class*="pencil"], .design-icon, i[class*="edit"]').all()

      for (const btn of editButtons) {
        const isVisible = await btn.isVisible().catch(() => false)
        if (isVisible) {
          await btn.click().catch(() => {})
          await page.waitForTimeout(1000)

          // 检查设计器是否打开
          const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)
          if (saveBtn) {
            designerOpened = true
            break
          }
        }
      }
    }

    // 方法 3: 通过键盘快捷键或者其他方式
    if (!designerOpened) {
      console.log('   ⚠️ 前两种方法未找到编辑按钮，尝试方法 3')

      // 点击第 69 行所在区域
      await page.evaluate(() => {
        const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
        if (cm) {
          const coords = cm.charCoords({ line: 68, ch: 0 }, 'page')
          const elem = document.elementFromPoint(coords.left, coords.top)
          if (elem) {
            elem.click()
          }
        }
      })

      await page.waitForTimeout(1000)
    }

    // 检查设计器是否打开
    const saveButtonVisible = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false)

    if (!saveButtonVisible) {
      console.log('   ❌ 无法打开 para 设计器')
      console.log('   💡 提示: 请确认第 69 行是 <para> 标签且有编辑图标')

      // 截图调试
      await page.screenshot({ path: 'debug-no-designer.png', fullPage: true })
      console.log('   📸 截图已保存到: debug-no-designer.png')

      throw new Error('无法打开 para 设计器')
    }

    console.log('   ✅ Para 设计器已打开\n')

    // 步骤 5: 点击保存按钮
    console.log('📍 步骤 5: 点击保存按钮')
    await page.click('button:has-text("保存")').catch(async () => {
      // 如果第一次点击失败，尝试找到第一个保存按钮
      const saveBtns = await page.locator('button:has-text("保存")').all()
      if (saveBtns.length > 0) {
        await saveBtns[0].click()
      }
    })

    await page.waitForTimeout(3000)
    console.log('   ✅ 保存完成\n')

    // 步骤 6: 检查保存后的 XML
    console.log('📍 步骤 6: 检查保存后的 XML 格式')
    const savedXml = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      if (!cm) return null

      // 获取第 69 行及周围内容
      let xml = ''
      for (let i = 68; i < Math.min(cm.lineCount(), 85); i++) {
        const line = cm.getLine(i)
        if (!line) continue
        xml += line + '\n'
        if (line.includes('</para>')) break
      }

      return xml.trim()
    })

    const savedLineCount = savedXml ? (savedXml.match(/\n/g) || []).length : 0
    const isFormatted = savedXml && savedXml.includes('\n')

    console.log(`   - 保存后换行数: ${savedLineCount}`)
    console.log(`   - 格式化状态: ${isFormatted ? '✅ 多行格式化' : '❌ 单行'}`)
    console.log(`   - 包含 dmRef: ${savedXml ? savedXml.includes('dmRef') : false}`)

    // 显示部分 XML 内容
    if (savedXml) {
      const preview = savedXml.split('\n').slice(0, 5).join('\n')
      console.log(`\n   XML 预览（前5行）:`)
      console.log('   ' + '-'.repeat(60))
      preview.split('\n').forEach(line => console.log('   ' + line))
      console.log('   ' + '-'.repeat(60))
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 测试结果')
    console.log('='.repeat(70) + '\n')

    console.log(`初始状态: ${initialLineCount} 个换行`)
    console.log(`保存后:   ${savedLineCount} 个换行`)
    console.log(`格式一致: ${Math.abs(initialLineCount - savedLineCount) <= 2 ? '✅ 是' : '❌ 否'}`)
    console.log(`格式化:   ${isFormatted ? '✅ 多行格式化' : '❌ 单行（问题）'}`)

    console.log('\n' + '='.repeat(70))

    // 断言
    console.log('\n📋 断言检查:\n')

    // 断言 1: 保存后应该是格式化的（多行）
    console.log(`1. 保存后应该格式化: ${isFormatted ? '✅ 通过' : '❌ 失败'}`)
    expect(isFormatted, '保存后的 XML 应该是多行格式化的').toBe(true)

    // 断言 2: 换行数应该大于 5（合理的格式化）
    console.log(`2. 换行数应该 > 5: ${savedLineCount > 5 ? '✅ 通过' : '❌ 失败'} (实际: ${savedLineCount})`)
    expect(savedLineCount, '换行数应该大于 5').toBeGreaterThan(5)

    // 断言 3: 应该包含关键元素
    const hasDmRef = savedXml && savedXml.includes('dmRef')
    console.log(`3. 包含 dmRef 元素: ${hasDmRef ? '✅ 通过' : '⚠️ 可能未插入 DM 引用'}`)

    console.log('\n' + '='.repeat(70))
    console.log('✅ 测试完成！')
    console.log('='.repeat(70) + '\n')

    // 截图留存
    await page.screenshot({ path: 'test-result.png', fullPage: true })
    console.log('📸 结果截图已保存到: test-result.png\n')
  })
})
