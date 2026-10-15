import { test } from '@playwright/test'

test('诊断parent.dmCode的实际值', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    // 登录
    console.log('\n🔵 登录...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // 打开DM编辑页面
    console.log('🔵 打开DM编辑页面...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN',
      { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 查找para行
    const paraLineInfo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      for (let i = 0; i < cm.lineCount(); i++) {
        if (cm.getLine(i).includes('<para')) return { line: i }
      }
      return null
    })

    if (!paraLineInfo) {
      console.log('❌ 未找到para')
      return
    }

    console.log(`✅ 找到para行: ${paraLineInfo.line}`)

    // 滚动
    await page.evaluate((lineNum) => {
      document.querySelector('.CodeMirror').CodeMirror.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)
    await page.waitForTimeout(500)

    // 打开Para设计视图
    console.log('🔵 打开Para设计视图...')
    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const coords = cm.charCoords({ line: lineNum, ch: 0 }, 'page')
      const gutterWidth = document.querySelector('.CodeMirror-linenumber').offsetWidth
      const event = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: coords.left - gutterWidth - 10,
        clientY: coords.top + 10
      })
      document.querySelector('.CodeMirror-gutter').dispatchEvent(event)
    }, paraLineInfo.line)

    await page.waitForTimeout(300)

    const pencilBtn = await page.locator('[class*="pencil"]').first()
    if (await pencilBtn.isVisible()) {
      await pencilBtn.click()
      await page.waitForTimeout(2000)
      console.log('✅ Para设计视图已打开')
    }

    // 注入监听 html2para 函数调用
    await page.evaluate(() => {
      // 拦截 console.log
      const originalLog = console.log
      window._capturedLogs = []
      console.log = function(...args) {
        const msg = args.join(' ')
        if (msg.includes('[html2para]')) {
          window._capturedLogs.push(msg)
        }
        originalLog.apply(console, args)
      }
    })

    // 点击公式按钮
    console.log('🔵 点击公式按钮...')
    const formulaBtn = await page.locator('.edui-for-插入kityformula').first()
    if (await formulaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await formulaBtn.click()
      await page.waitForTimeout(1500)

      // 输入公式
      try {
        const formulaIframe = await page.frameLocator('iframe[src*="formula"]').first()
        await formulaIframe.locator('textarea, input[type="text"], .kf-editor-input').first().fill('a+b=c')
        await page.waitForTimeout(1000)

        // 点击确定
        await page.locator('button:has-text("确定"), button:has-text("插入")').first().click({ force: true })
        await page.waitForTimeout(1500)
        console.log('✅ 公式已插入')
      } catch (e) {
        console.log('⚠️  公式编辑器操作跳过')
      }
    }

    // 保存
    console.log('🔵 保存Para...')
    const saveBtn = await page.locator('button:has-text("保存")').first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(4000)  // 等待保存完成
    }

    // 提取日志
    const logs = await page.evaluate(() => window._capturedLogs || [])

    console.log('\n' + '='.repeat(70))
    console.log('📋 捕获的html2para日志:')
    console.log('='.repeat(70))

    let dmCodeValue = null
    let snsValue = null
    let icnValue = null

    logs.forEach(log => {
      console.log(log)

      // 提取关键信息
      if (log.includes('parent.dmCode')) {
        const match = log.match(/parent\.dmCode[:\s]+([^\s,]+)/)
        if (match) dmCodeValue = match[1]
      }
      if (log.includes('dmCode格式错误')) {
        const match = log.match(/dmCode格式错误.*?:\s*([^\s,]+)/)
        if (match) dmCodeValue = match[1]
      }
      if (log.includes('解析并合并SNS完成')) {
        const match = log.match(/解析并合并SNS完成:\s*(.+)/)
        if (match) snsValue = match[1]
      }
      if (log.includes('生成ICN完成')) {
        const match = log.match(/生成ICN完成.*?:\s*(.+)/)
        if (match) icnValue = match[1]
      }
    })

    console.log('\n' + '='.repeat(70))
    console.log('📊 关键信息提取:')
    console.log('='.repeat(70))
    console.log(`dmCode值: ${dmCodeValue || '未捕获'}`)
    console.log(`SNS值: ${snsValue || '未捕获'}`)
    console.log(`ICN值: ${icnValue || '未捕获'}`)

    if (icnValue) {
      const parts = icnValue.split('-')
      console.log(`\nICN分段 (${parts.length}段):`)
      parts.forEach((part, idx) => {
        console.log(`  第${idx + 1}段: ${part}`)
      })
    }

    // 从XML中读取实际生成的symbol
    console.log('\n' + '='.repeat(70))
    console.log('📋 XML中的symbol标签:')
    console.log('='.repeat(70))

    const symbolInfo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const content = cm.getValue()

      const symbolMatches = []
      const regex = /<symbol[^>]*infoEntityIdent="([^"]+)"[^>]*>/g
      let match

      while ((match = regex.exec(content)) !== null) {
        symbolMatches.push(match[1])
      }

      return symbolMatches
    })

    symbolInfo.forEach((icn, idx) => {
      console.log(`\nSymbol #${idx + 1}: ${icn}`)
      const parts = icn.split('-')
      console.log(`  段数: ${parts.length}`)
      parts.forEach((part, i) => {
        console.log(`    第${i + 1}段: ${part}`)
      })
    })

  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
