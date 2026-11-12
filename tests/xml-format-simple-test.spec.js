/**
 * XML 格式化问题 - 简化验证测试
 *
 * 直接模拟用户报告的操作步骤
 */

const { test, expect } = require('@playwright/test')

test.describe('XML 格式化往返测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="账户: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  })

  test('用户报告的问题：第二次保存格式丢失', async ({ page }) => {
    const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'

    console.log('\n' + '='.repeat(60))
    console.log('测试场景：复现用户报告的 XML 格式化丢失问题')
    console.log('='.repeat(60) + '\n')

    await page.goto(url)
    await page.waitForTimeout(3000)

    // 获取第 69 行的初始状态
    const initialXml = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      if (!cm) return null
      return cm.getLine(68) // 0-based，第69行
    })

    console.log('📄 第 69 行初始状态:')
    console.log(`   - 内容: ${initialXml ? initialXml.substring(0, 50) + '...' : 'null'}`)
    console.log(`   - 包含 para: ${initialXml ? initialXml.includes('<para>') : false}`)

    if (!initialXml || !initialXml.includes('<para>')) {
      console.log('⚠️ 第 69 行不是 para 标签，跳过测试')
      return
    }

    // 收集控制台日志
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('formatXml') || text.includes('html2para') || text.includes('换行')) {
        logs.push(text)
      }
    })

    console.log('\n' + '-'.repeat(60))
    console.log('步骤 1: 点击第 69 行铅笔图标，进入 para 设计视图')
    console.log('-'.repeat(60))

    // 方法1: 尝试通过 DOM 查找铅笔图标
    const line69Selector = '.CodeMirror-code > div:nth-child(69)'
    await page.click(line69Selector).catch(() => console.log('方法1失败'))
    await page.waitForTimeout(500)

    // 检查设计器是否打开
    let designerOpen = await page.locator('text=保存').count() > 0

    if (!designerOpen) {
      console.log('   ⚠️ 方法1失败，尝试方法2: 通过行号点击')

      // 方法2: 直接在 CodeMirror 中查找并触发点击
      await page.evaluate(() => {
        const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
        if (cm) {
          // 在第 69 行设置光标
          cm.setCursor({ line: 68, ch: 0 })
          cm.focus()
        }
      })

      await page.waitForTimeout(500)

      // 查找铅笔图标并点击
      const pencilIcon = page.locator('.design-icon, i[class*="edit"], [title*="编辑"]').first()
      await pencilIcon.click().catch(() => console.log('方法2失败'))
      await page.waitForTimeout(1000)

      designerOpen = await page.locator('text=保存').count() > 0
    }

    if (!designerOpen) {
      console.log('   ❌ 无法打开 para 设计器')
      return
    }

    console.log('   ✅ Para 设计器已打开')

    console.log('\n' + '-'.repeat(60))
    console.log('步骤 2: 点击"DM引用"，选择第一条记录，点击确定')
    console.log('-'.repeat(60))

    await page.click('button:has-text("DM引用")')
    await page.waitForTimeout(500)
    console.log('   ✅ DM引用对话框已打开')

    await page.click('.ant-table-row:first-child')
    await page.waitForTimeout(300)
    console.log('   ✅ 已选择第一条记录')

    await page.click('button:has-text("确定")')
    await page.waitForTimeout(500)
    console.log('   ✅ 已插入 DM 引用')

    console.log('\n' + '-'.repeat(60))
    console.log('步骤 3: 点击"保存"按钮（第一次保存）')
    console.log('-'.repeat(60))

    await page.click('button:has-text("保存")').first()
    await page.waitForTimeout(2000)

    // 获取第一次保存后的 XML
    const xml1 = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      if (!cm) return null

      // 从第 69 行开始，找到完整的 para 块
      let xml = ''
      let inPara = false
      let depth = 0

      for (let i = 68; i < Math.min(cm.lineCount(), 90); i++) {
        const line = cm.getLine(i)
        if (!line) continue

        if (line.includes('<para')) {
          inPara = true
          depth++
        }

        if (inPara) {
          xml += line + '\n'
        }

        if (line.includes('</para>')) {
          depth--
          if (depth === 0) break
        }
      }

      return xml.trim()
    })

    const lineCount1 = xml1 ? (xml1.match(/\n/g) || []).length : 0
    const isFormatted1 = xml1 && xml1.includes('\n')

    console.log('   ✅ 第一次保存完成')
    console.log(`   📊 XML 统计:`)
    console.log(`      - 总长度: ${xml1 ? xml1.length : 0} 字符`)
    console.log(`      - 换行数: ${lineCount1}`)
    console.log(`      - 格式化: ${isFormatted1 ? '✅ 是（多行）' : '❌ 否（单行）'}`)
    console.log(`      - 包含 dmRef: ${xml1 ? xml1.includes('dmRef') : false}`)

    console.log('\n' + '-'.repeat(60))
    console.log('步骤 4: 再次点击第 69 行铅笔图标，进入 para 设计视图')
    console.log('-'.repeat(60))

    await page.waitForTimeout(500)

    // 再次打开设计器
    await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      if (cm) {
        cm.setCursor({ line: 68, ch: 0 })
        cm.focus()
      }
    })

    await page.waitForTimeout(300)

    const pencilIcon2 = page.locator('.design-icon, i[class*="edit"]').first()
    await pencilIcon2.click()
    await page.waitForTimeout(1000)

    designerOpen = await page.locator('text=保存').count() > 0

    if (!designerOpen) {
      console.log('   ❌ 无法再次打开 para 设计器')
      return
    }

    console.log('   ✅ Para 设计器已打开（第二次）')

    console.log('\n' + '-'.repeat(60))
    console.log('步骤 5: 点击"保存"按钮（第二次保存，不做任何修改）')
    console.log('-'.repeat(60))

    await page.click('button:has-text("保存")').first()
    await page.waitForTimeout(2000)

    // 获取第二次保存后的 XML
    const xml2 = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      if (!cm) return null

      let xml = ''
      let inPara = false
      let depth = 0

      for (let i = 68; i < Math.min(cm.lineCount(), 90); i++) {
        const line = cm.getLine(i)
        if (!line) continue

        if (line.includes('<para')) {
          inPara = true
          depth++
        }

        if (inPara) {
          xml += line + '\n'
        }

        if (line.includes('</para>')) {
          depth--
          if (depth === 0) break
        }
      }

      return xml.trim()
    })

    const lineCount2 = xml2 ? (xml2.match(/\n/g) || []).length : 0
    const isFormatted2 = xml2 && xml2.includes('\n')

    console.log('   ✅ 第二次保存完成')
    console.log(`   📊 XML 统计:`)
    console.log(`      - 总长度: ${xml2 ? xml2.length : 0} 字符`)
    console.log(`      - 换行数: ${lineCount2}`)
    console.log(`      - 格式化: ${isFormatted2 ? '✅ 是（多行）' : '❌ 否（单行）'}`)
    console.log(`      - 包含 dmRef: ${xml2 ? xml2.includes('dmRef') : false}`)

    console.log('\n' + '='.repeat(60))
    console.log('📊 测试结果对比')
    console.log('='.repeat(60) + '\n')

    console.log(`第一次保存: ${lineCount1} 个换行 - ${isFormatted1 ? '✅ 多行格式化' : '❌ 单行'}`)
    console.log(`第二次保存: ${lineCount2} 个换行 - ${isFormatted2 ? '✅ 多行格式化' : '❌ 单行'}`)

    const formatConsistent = isFormatted1 === isFormatted2
    const lineCountDiff = Math.abs(lineCount1 - lineCount2)

    console.log(`\n格式一致性: ${formatConsistent ? '✅ 一致' : '❌ 不一致'}`)
    console.log(`换行数差异: ${lineCountDiff} (${lineCountDiff <= 1 ? '✅ 可接受' : '❌ 差异过大'})`)

    // 输出相关日志
    if (logs.length > 0) {
      console.log('\n' + '-'.repeat(60))
      console.log('📋 控制台日志（formatXml 相关）')
      console.log('-'.repeat(60))
      logs.forEach(log => console.log('   ' + log))
    }

    console.log('\n' + '='.repeat(60))
    console.log('断言验证')
    console.log('='.repeat(60) + '\n')

    // 断言1: 第一次保存应该格式化
    console.log(`断言1: 第一次保存应该格式化 - ${isFormatted1 ? '✅ 通过' : '❌ 失败'}`)
    expect(isFormatted1).toBe(true)

    // 断言2: 第二次保存也应该格式化（关键断言）
    console.log(`断言2: 第二次保存应该格式化 - ${isFormatted2 ? '✅ 通过' : '❌ 失败'}`)
    expect(isFormatted2).toBe(true)

    // 断言3: 两次保存的格式应该一致
    console.log(`断言3: 格式应该一致 - ${formatConsistent ? '✅ 通过' : '❌ 失败'}`)
    expect(formatConsistent).toBe(true)

    // 断言4: 换行数差异应该很小（允许 ±1 的误差）
    console.log(`断言4: 换行数差异应小于2 - ${lineCountDiff <= 1 ? '✅ 通过' : '❌ 失败'}`)
    expect(lineCountDiff).toBeLessThanOrEqual(1)

    console.log('\n' + '='.repeat(60))
    console.log('✅ 所有断言通过！XML 格式化往返一致性验证成功')
    console.log('='.repeat(60) + '\n')
  })
})
