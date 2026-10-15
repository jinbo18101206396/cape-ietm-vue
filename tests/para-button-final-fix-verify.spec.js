import { test } from '@playwright/test'

test('Para公式按钮修复验证-完整流程', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    // 登录
    console.log('\n🔵 登录系统...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 登录成功')

    // 打开编辑页面
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

    // 声明btn1Data在更大的作用域
    let btn1Data = null

    // 第一次打开
    console.log('\n🔵 第一次打开Para设计视图...')

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

      // 检查按钮
      btn1Data = await page.evaluate(() => {
        const btn = document.querySelector('.edui-for-插入kityformula')
        if (btn) {
          const rect = btn.getBoundingClientRect()
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        }
        return null
      })

      if (btn1Data) {
        console.log(`✅ 第一次: 位置(${btn1Data.x}, ${btn1Data.y})`)
      } else {
        console.log('❌ 第一次未找到公式按钮')
      }

      // 关闭设计视图（点击保存按钮）
      console.log('\n🔵 保存并关闭设计视图...')
      const saveBtn = await page.locator('button:has-text("保存")').first()
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   点击保存按钮...')
        await saveBtn.click()
        await page.waitForTimeout(2000)
        console.log('   ✅ 已点击保存')
      } else {
        console.log('❌ 未找到保存按钮')
        return
      }
    } else {
      console.log('❌ 未找到第一次的铅笔按钮')
      return
    }

    // 第二次打开
    console.log('\n🔵 第二次打开Para设计视图...')

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

      // 检查按钮
      let btn2Data = await page.evaluate(() => {
        const btn = document.querySelector('.edui-for-插入kityformula')
        if (btn) {
          const rect = btn.getBoundingClientRect()
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        }
        return null
      })

      if (btn2Data) {
        console.log(`✅ 第二次: 位置(${btn2Data.x}, ${btn2Data.y})`)
      } else {
        console.log('❌ 第二次未找到公式按钮')
      }

      // 对比
      console.log('\n📊 对比结果...')
      if (btn1Data && btn2Data) {
        const posMatch = Math.abs(btn1Data.x - btn2Data.x) < 10 && Math.abs(btn1Data.y - btn2Data.y) < 10

        console.log(`   第一次: (${btn1Data.x}, ${btn1Data.y})`)
        console.log(`   第二次: (${btn2Data.x}, ${btn2Data.y})`)
        console.log(`   位置一致: ${posMatch ? '✅ 是' : '❌ 不一致'}`)

        if (posMatch) {
          console.log('\n✅✅✅ 验证通过：公式按钮在两次打开时完全一致！修复成功！')
        } else {
          console.log('\n❌❌❌ 验证失败：公式按钮位置不一致！')
        }
      } else {
        console.log(`❌ 无法对比：第一次=${btn1Data ? '✅' : '❌'}, 第二次=${btn2Data ? '✅' : '❌'}`)
      }
    }

  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
