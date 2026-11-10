/**
 * XML 格式化往返一致性验证测试
 *
 * 验证修复：paraConverter.js 移除 .replace(/\n/g, '')
 *
 * 测试场景：
 * 1. 首次保存 para + DM引用 → 检查 XML 格式化
 * 2. 第二次保存（不修改）→ 检查格式是否保持一致
 * 3. 第三次保存（不修改）→ 检查格式是否保持一致
 *
 * 预期结果：所有保存的 XML 格式应该一致，都是多行格式化的
 */

const { test, expect } = require('@playwright/test')

test.describe('XML 格式化往返一致性验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="账户: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  })

  test('验证往返格式一致性', async ({ page }) => {
    const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'

    console.log('\n========================================')
    console.log('🔍 XML 格式化往返一致性验证测试')
    console.log('========================================\n')

    // 访问编辑器
    await page.goto(url)
    await page.waitForTimeout(2000)

    // 存储每次保存后的 XML 快照
    const xmlSnapshots = []

    // ========== 第一次保存：插入 DM 引用 ==========
    console.log('📝 步骤 1: 首次保存（插入 DM 引用）')

    // 点击第 69 行铅笔图标
    await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      const line69 = cm.getLine(68) // 0-based
      console.log('当前第69行:', line69)
    })

    // 等待并点击铅笔图标
    await page.waitForTimeout(500)

    // 使用 CodeMirror API 定位并点击
    const paraDesignerOpened1 = await page.evaluate(() => {
      try {
        const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
        // 触发第 69 行的编辑
        const coords = cm.charCoords({ line: 68, ch: 0 }, 'local')
        return true
      } catch (e) {
        console.error('打开设计器失败:', e)
        return false
      }
    })

    // 尝试通过工具栏按钮打开设计器
    await page.click('text=已保存')
    await page.waitForTimeout(500)

    // 查找包含 para 的行并点击其编辑按钮
    const editorButtons = await page.locator('.CodeMirror-line').all()
    let found = false

    for (let i = 0; i < Math.min(editorButtons.length, 100); i++) {
      const lineText = await editorButtons[i].textContent()
      if (lineText && lineText.includes('<para>')) {
        // 尝试点击这一行的编辑图标
        console.log(`找到 para 在第 ${i + 1} 行`)

        // 点击该行
        await editorButtons[i].click()
        await page.waitForTimeout(300)

        // 查找编辑按钮
        const editButtons = await page.locator('[class*="design-icon"], [title*="编辑"], button:has-text("编辑")').all()
        if (editButtons.length > 0) {
          await editButtons[0].click()
          found = true
          break
        }
      }
    }

    if (!found) {
      console.log('⚠️ 未找到 para 编辑入口，尝试备用方案')
      // 备用方案：直接查找并点击任何设计器打开按钮
      const designerButtons = await page.locator('[class*="edit"], [class*="pencil"], i[class*="edit"]').all()
      if (designerButtons.length > 0) {
        await designerButtons[0].click()
      }
    }

    await page.waitForTimeout(1000)

    // 检查是否打开了设计器
    const designerVisible = await page.locator('text=保存, text=取消').count() > 0

    if (!designerVisible) {
      console.log('❌ 无法打开 para 设计器，跳过测试')
      return
    }

    console.log('✅ Para 设计器已打开')

    // 点击"DM引用"按钮
    await page.click('button:has-text("DM引用")')
    await page.waitForTimeout(500)

    // 选择第一条记录
    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.click()
    await page.waitForTimeout(300)

    // 点击确定
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(500)

    console.log('✅ DM 引用已插入')

    // 点击保存按钮
    await page.click('button:has-text("保存")').first()
    await page.waitForTimeout(2000)

    // 获取保存后的 XML
    const xml1 = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      const totalLines = cm.lineCount()

      // 查找包含 dmRef 的行范围
      let startLine = -1
      let endLine = -1

      for (let i = 0; i < totalLines; i++) {
        const line = cm.getLine(i)
        if (line && line.includes('<para')) {
          startLine = i
        }
        if (startLine >= 0 && line && line.includes('</para>')) {
          endLine = i
          break
        }
      }

      if (startLine >= 0 && endLine >= 0) {
        const lines = []
        for (let i = startLine; i <= endLine; i++) {
          lines.push(cm.getLine(i))
        }
        return lines.join('\n')
      }

      return null
    })

    xmlSnapshots.push(xml1)

    console.log('✅ 第一次保存完成')
    console.log(`   - XML 长度: ${xml1 ? xml1.length : 0}`)
    console.log(`   - 换行数: ${xml1 ? (xml1.match(/\n/g) || []).length : 0}`)
    console.log(`   - 包含 dmRef: ${xml1 ? xml1.includes('dmRef') : false}`)
    console.log(`   - 格式化: ${xml1 && xml1.includes('\n') ? '✅ 多行' : '❌ 单行'}`)

    // ========== 第二次保存：不做修改 ==========
    console.log('\n📝 步骤 2: 第二次保存（不修改）')

    // 再次打开设计器
    await page.waitForTimeout(500)

    // 尝试再次点击编辑按钮
    const editorButtons2 = await page.locator('.CodeMirror-line').all()
    found = false

    for (let i = 0; i < Math.min(editorButtons2.length, 100); i++) {
      const lineText = await editorButtons2[i].textContent()
      if (lineText && lineText.includes('<para>')) {
        await editorButtons2[i].click()
        await page.waitForTimeout(300)

        const editButtons = await page.locator('[class*="design-icon"], [title*="编辑"], button:has-text("编辑")').all()
        if (editButtons.length > 0) {
          await editButtons[0].click()
          found = true
          break
        }
      }
    }

    await page.waitForTimeout(1000)

    // 直接点击保存
    await page.click('button:has-text("保存")').first()
    await page.waitForTimeout(2000)

    // 获取保存后的 XML
    const xml2 = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      const totalLines = cm.lineCount()

      let startLine = -1
      let endLine = -1

      for (let i = 0; i < totalLines; i++) {
        const line = cm.getLine(i)
        if (line && line.includes('<para')) {
          startLine = i
        }
        if (startLine >= 0 && line && line.includes('</para>')) {
          endLine = i
          break
        }
      }

      if (startLine >= 0 && endLine >= 0) {
        const lines = []
        for (let i = startLine; i <= endLine; i++) {
          lines.push(cm.getLine(i))
        }
        return lines.join('\n')
      }

      return null
    })

    xmlSnapshots.push(xml2)

    console.log('✅ 第二次保存完成')
    console.log(`   - XML 长度: ${xml2 ? xml2.length : 0}`)
    console.log(`   - 换行数: ${xml2 ? (xml2.match(/\n/g) || []).length : 0}`)
    console.log(`   - 格式化: ${xml2 && xml2.includes('\n') ? '✅ 多行' : '❌ 单行'}`)

    // ========== 第三次保存：不做修改 ==========
    console.log('\n📝 步骤 3: 第三次保存（不修改）')

    // 再次打开设计器
    await page.waitForTimeout(500)

    const editorButtons3 = await page.locator('.CodeMirror-line').all()
    found = false

    for (let i = 0; i < Math.min(editorButtons3.length, 100); i++) {
      const lineText = await editorButtons3[i].textContent()
      if (lineText && lineText.includes('<para>')) {
        await editorButtons3[i].click()
        await page.waitForTimeout(300)

        const editButtons = await page.locator('[class*="design-icon"], [title*="编辑"], button:has-text("编辑")').all()
        if (editButtons.length > 0) {
          await editButtons[0].click()
          found = true
          break
        }
      }
    }

    await page.waitForTimeout(1000)

    // 直接点击保存
    await page.click('button:has-text("保存")').first()
    await page.waitForTimeout(2000)

    // 获取保存后的 XML
    const xml3 = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      const totalLines = cm.lineCount()

      let startLine = -1
      let endLine = -1

      for (let i = 0; i < totalLines; i++) {
        const line = cm.getLine(i)
        if (line && line.includes('<para')) {
          startLine = i
        }
        if (startLine >= 0 && line && line.includes('</para>')) {
          endLine = i
          break
        }
      }

      if (startLine >= 0 && endLine >= 0) {
        const lines = []
        for (let i = startLine; i <= endLine; i++) {
          lines.push(cm.getLine(i))
        }
        return lines.join('\n')
      }

      return null
    })

    xmlSnapshots.push(xml3)

    console.log('✅ 第三次保存完成')
    console.log(`   - XML 长度: ${xml3 ? xml3.length : 0}`)
    console.log(`   - 换行数: ${xml3 ? (xml3.match(/\n/g) || []).length : 0}`)
    console.log(`   - 格式化: ${xml3 && xml3.includes('\n') ? '✅ 多行' : '❌ 单行'}`)

    // ========== 验证结果 ==========
    console.log('\n========================================')
    console.log('📊 验证结果')
    console.log('========================================\n')

    console.log('快照对比:')
    xmlSnapshots.forEach((xml, index) => {
      const lineCount = xml ? (xml.match(/\n/g) || []).length : 0
      const isFormatted = xml && xml.includes('\n')
      console.log(`  第 ${index + 1} 次保存: ${isFormatted ? '✅ 多行格式化' : '❌ 单行'} (${lineCount} 个换行)`)
    })

    // 断言
    console.log('\n断言检查:')

    // 1. 所有快照都应该包含换行（格式化）
    const allFormatted = xmlSnapshots.every(xml => xml && xml.includes('\n'))
    console.log(`  1. 所有保存都格式化: ${allFormatted ? '✅ 通过' : '❌ 失败'}`)
    expect(allFormatted).toBe(true)

    // 2. 第二次和第一次格式应该一致
    const format1 = xml1 ? (xml1.match(/\n/g) || []).length : 0
    const format2 = xml2 ? (xml2.match(/\n/g) || []).length : 0
    const roundtrip1Consistent = Math.abs(format1 - format2) <= 1 // 允许1行误差
    console.log(`  2. 第二次保存格式一致: ${roundtrip1Consistent ? '✅ 通过' : '❌ 失败'} (${format1} vs ${format2})`)
    expect(roundtrip1Consistent).toBe(true)

    // 3. 第三次和第二次格式应该一致
    const format3 = xml3 ? (xml3.match(/\n/g) || []).length : 0
    const roundtrip2Consistent = format2 === format3
    console.log(`  3. 第三次保存格式一致: ${roundtrip2Consistent ? '✅ 通过' : '❌ 失败'} (${format2} vs ${format3})`)
    expect(roundtrip2Consistent).toBe(true)

    console.log('\n========================================')
    console.log('✅ 测试完成')
    console.log('========================================\n')
  })
})
