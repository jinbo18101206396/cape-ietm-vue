import { test } from '@playwright/test'

test('Para按钮调试-捕获console日志', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  const consoleLogs = []
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`
    consoleLogs.push(logEntry)
    if (msg.text().includes('ParaDesigner')) {
      console.log(logEntry)
    }
  })

  try {
    console.log('\n🔵 登录系统...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 登录成功')

    console.log('\n🔵 打开DM编辑页面...')
    const dmUrl = 'http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(dmUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('✅ 进入编辑页面')

    // 查找para行
    const paraLineInfo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const lines = cm.lineCount()

      for (let i = 0; i < lines; i++) {
        const lineContent = cm.getLine(i)
        if (lineContent && lineContent.includes('<para')) {
          return { line: i }
        }
      }
      return null
    })

    if (!paraLineInfo) {
      console.log('❌ 编辑器中未找到para')
      return
    }

    console.log(`✅ 找到para行: 第 ${paraLineInfo.line} 行`)

    // 滚动到该行
    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)

    await page.waitForTimeout(500)

    // 第一次打开
    console.log('\n🔵 第一次打开Para设计视图...')
    consoleLogs.length = 0 // 清空日志

    // 先检查paraDesignerVisible是否为false
    const before1 = await page.evaluate(() => {
      // 访问Vue实例（通过__vue__)
      const app = document.querySelector('[class*="app"]').__vue__
      return app && app.paraDesignerVisible
    }).catch(() => 'unknown')

    console.log(`   打开前paraDesignerVisible=${before1}`)

    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const coords = cm.charCoords({ line: lineNum, ch: 0 }, 'page')

      const gutterWidth = document.querySelector('.CodeMirror-linenumber').offsetWidth
      const gutterX = coords.left - gutterWidth - 10
      const gutterY = coords.top + 10

      const event = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: gutterX,
        clientY: gutterY
      })

      const gutterLine = document.querySelector('.CodeMirror-gutter')
      if (gutterLine) gutterLine.dispatchEvent(event)
    }, paraLineInfo.line)

    await page.waitForTimeout(300)

    const pencilBtn1 = await page.locator('[class*="pencil"]').first()
    if (await pencilBtn1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pencilBtn1.click()
      await page.waitForTimeout(1500)

      console.log('   第一次打开console日志:')
      consoleLogs.filter(l => l.includes('ParaDesigner')).forEach(l => console.log(`     ${l}`))
    }

    // 关闭设计视图
    const designModal = await page.locator('.ant-modal, [class*="designer"]').first()
    const closeBtn = await designModal.locator('.ant-modal-close').first()
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(800)

    // 读取onParaSave是否被调用
    let debugAfterClose = await page.evaluate(() => window.$DEBUG_LOG || [])
    console.log(`\n   onParaSave调用情况:`)
    debugAfterClose.slice(-3).forEach(log => {
      console.log(`     ${log}`)
    })

    // 第二次打开前检查paraDesignerVisible
    const beforeSecondOpen = await page.evaluate(() => {
      const logs = window.$DEBUG_LOG || []
      // 查找最后一条 paraDesignerVisible 的日志
      for (let i = logs.length - 1; i >= 0; i--) {
        if (logs[i].includes('after.close')) {
          return logs[i]
        }
      }
      return '未找到'
    })
    console.log(`   关闭后状态: ${beforeSecondOpen}`)

    // 第二次打开
    console.log('\n🔵 第二次打开Para设计视图...')
    consoleLogs.length = 0 // 清空日志

    // 先读取DEBUG_LOG看_openParaDesigner是否真的被执行了
    let debugLogBefore = await page.evaluate(() => window.$DEBUG_LOG || [])
    console.log(`   第二次打开前debug_log长度: ${debugLogBefore.length}`)

    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const coords = cm.charCoords({ line: lineNum, ch: 0 }, 'page')

      const gutterWidth = document.querySelector('.CodeMirror-linenumber').offsetWidth
      const gutterX = coords.left - gutterWidth - 10
      const gutterY = coords.top + 10

      const event = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: gutterX,
        clientY: gutterY
      })

      const gutterLine = document.querySelector('.CodeMirror-gutter')
      if (gutterLine) gutterLine.dispatchEvent(event)
    }, paraLineInfo.line)

    await page.waitForTimeout(300)

    const pencilBtn2 = await page.locator('[class*="pencil"]').first()
    if (await pencilBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.evaluate(() => {
        const pencils = document.querySelectorAll('[class*="pencil"], .gutter-pencil-icon')
        if (pencils.length > 0) {
          pencils[0].click()
        }
      })
      await page.waitForTimeout(1500)

      // 读取第二次的DEBUG_LOG
      let debugLogAfter = await page.evaluate(() => window.$DEBUG_LOG || [])
      console.log(`   第二次打开后debug_log长度: ${debugLogAfter.length}`)
      debugLogAfter.slice(Math.max(0, debugLogBefore.length)).forEach(log => {
        console.log(`     ${log}`)
      })

      console.log('   第二次打开console日志:')
      const paraDesignerLogs = consoleLogs.filter(l => l.includes('ParaDesigner'))
      if (paraDesignerLogs.length === 0) {
        console.log('     <无ParaDesigner日志>')
      } else {
        paraDesignerLogs.forEach(l => console.log(`     ${l}`))
      }
    }
  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
