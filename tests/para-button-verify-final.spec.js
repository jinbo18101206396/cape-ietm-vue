import { test } from '@playwright/test'

test('验证Para设计视图按钮一致性', async ({ browser }) => {
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

    // 在编辑器中找第一个<para>
    console.log('\n🔵 在编辑器中搜索para...')

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

    // 在编辑器中滚动到该行
    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)

    await page.waitForTimeout(500)

    // 第一次操作：悬停在gutter上显示铅笔
    console.log('\n🔵 第一次操作...')
    console.log('   悬停在gutter区域以显示铅笔图标...')

    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const coords = cm.charCoords({ line: lineNum, ch: 0 }, 'page')

      // 获取gutter区域的x坐标（大约在行号左侧）
      const gutterWidth = document.querySelector('.CodeMirror-linenumber').offsetWidth
      const gutterX = coords.left - gutterWidth - 10
      const gutterY = coords.top + 10

      // 模拟鼠标进入gutter
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

    // 截图查看gutter区域
    await page.screenshot({ path: 'gutter-with-pencil-first.png', fullPage: false })
    console.log('   📸 已保存gutter区域截图')

    // 查找铅笔图标
    const pencilBtn1 = await page.locator('[class*="pencil"], [title*="编辑"], .CodeMirror-gutter svg, .CodeMirror-gutter button').first()
    const hasPencil1 = await pencilBtn1.isVisible({ timeout: 2000 }).catch(() => false)
    console.log(`   找到铅笔图标: ${hasPencil1}`)

    if (!hasPencil1) {
      console.log('❌ 未找到铅笔图标')
      return
    }

    // 点击铅笔打开设计视图
    console.log('   点击铅笔图标打开设计视图...')
    await pencilBtn1.click()
    await page.waitForTimeout(1500)

    // 检查设计视图
    const designModal = await page.locator('.para-designer, .designer-modal, .ant-modal').first()
    const isOpen1 = await designModal.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`   设计视图打开: ${isOpen1}`)

    if (!isOpen1) {
      console.log('❌ 设计视图未打开')
      await page.screenshot({ path: 'first-open-failed.png', fullPage: false })
      return
    }

    await page.waitForTimeout(1000)

    // 记录第一次的按钮
    console.log('\n🔵 记录第一次打开的公式按钮...')

    // 等待UEditor完全加载，包括iframe
    await page.waitForTimeout(2000)

    // 先输出调试信息
    const debugInfo = await page.evaluate(() => {
      // 查找所有button
      const allButtons = document.querySelectorAll('button')
      const buttonDetails = Array.from(allButtons).map(b => ({
        text: b.textContent.substring(0, 15),
        title: b.getAttribute('title') || '',
        class: b.getAttribute('class') || '',
        id: b.getAttribute('id') || '',
        dataBtnName: b.getAttribute('data-btn-name') || ''
      }))

      // 查找所有iframe
      const iframes = document.querySelectorAll('iframe')
      const iframeCount = iframes.length

      // 查找UEditor实例
      const ueBtn = document.querySelector('[class*="kityformula"]')
      const kitybtnDetails = ueBtn ? {
        text: ueBtn.textContent,
        title: ueBtn.getAttribute('title'),
        class: ueBtn.getAttribute('class'),
        id: ueBtn.getAttribute('id'),
        tagName: ueBtn.tagName
      } : null

      return {
        totalButtons: allButtons.length,
        buttonDetails: buttonDetails,
        iframeCount: iframeCount,
        kitybtnDetails: kitybtnDetails,
        windowUECustomizeUI: window.UE && window.UE._customizeUI ? Object.keys(window.UE._customizeUI) : []
      }
    })

    console.log(`   页面信息: ${debugInfo.totalButtons}个button, ${debugInfo.iframeCount}个iframe`)
    console.log(`   window.UE._customizeUI已注册: ${debugInfo.windowUECustomizeUI.join(', ')}`)
    if (debugInfo.kitybtnDetails) {
      console.log(`   kityformula按钮详情:`)
      console.log(`     - 标签: ${debugInfo.kitybtnDetails.tagName}`)
      console.log(`     - 类: ${debugInfo.kitybtnDetails.class}`)
      console.log(`     - ID: ${debugInfo.kitybtnDetails.id}`)
      console.log(`     - Title: ${debugInfo.kitybtnDetails.title}`)
      console.log(`     - 文本: ${debugInfo.kitybtnDetails.text}`)
    }
    // 输出所有按钮样本（包括kityformula）
    const kityIdx = debugInfo.buttonDetails.findIndex(b => b.class.includes('kityformula') || b.title.includes('公式'))
    if (kityIdx >= 0) {
      console.log(`   第${kityIdx}个按钮: text="${debugInfo.buttonDetails[kityIdx].text}", title="${debugInfo.buttonDetails[kityIdx].title}"`)
    }

    let btn1Data = await page.evaluate(() => {
      // kityformula按钮是DIV，类名包含 edui-for-插入kityformula
      const btn = document.querySelector('.edui-for-插入kityformula, [class*="edui-for-插入kityformula"]')

      if (btn) {
        const rect = btn.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            id: btn.getAttribute('id'),
            class: btn.getAttribute('class')
          }
        }
      }

      return null
    })

    if (btn1Data) {
      console.log(`✅ 第一次: 位置(${btn1Data.x}, ${btn1Data.y}), 大小${btn1Data.width}x${btn1Data.height}`)

      // 获取instanceId用于对比
      const info1 = await page.evaluate(() => {
        const btns = document.querySelectorAll('[id^="edui"]')
        return {
          kityBtnId: Array.from(btns).find(b => b.className.includes('kityformula'))?.id,
          totalEdui: btns.length
        }
      })
      console.log(`   instanceId相关: ${JSON.stringify(info1)}`)

      await page.screenshot({ path: 'formula-button-first-open.png', fullPage: false })
    } else {
      console.log('⚠️  未找到公式按钮')
    }

    // 关闭设计视图（点击右上角保存按钮）
    console.log('\n🔵 关闭设计视图...')
    const saveBtn = await designModal.locator('button:has-text("保存"), [title*="保存"]').first()
    if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveBtn.click()
    } else {
      const closeBtn = await designModal.locator('.ant-modal-close').first()
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
    }
    await page.waitForTimeout(800)

    // 第二次操作：再次打开设计视图
    console.log('\n🔵 第二次操作...')
    console.log('   悬停在gutter区域以显示铅笔图标...')

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

    await page.screenshot({ path: 'gutter-with-pencil-second.png', fullPage: false })
    console.log('   📸 已保存gutter区域截图')

    // 查找铅笔图标
    const pencilBtn2 = await page.locator('[class*="pencil"], [title*="编辑"], .CodeMirror-gutter svg, .CodeMirror-gutter button').first()
    const hasPencil2 = await pencilBtn2.isVisible({ timeout: 2000 }).catch(() => false)
    console.log(`   找到铅笔图标: ${hasPencil2}`)

    if (!hasPencil2) {
      console.log('❌ 未找到铅笔图标')
      return
    }

    console.log('   点击铅笔图标打开设计视图...')
    // 用JavaScript直接点击，避免被其他元素阻挡
    await page.evaluate(() => {
      const pencils = document.querySelectorAll('[class*="pencil"], [title*="编辑"], .gutter-pencil-icon')
      if (pencils.length > 0) {
        pencils[0].click()
      }
    })
    await page.waitForTimeout(1500)

    const isOpen2 = await designModal.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`   设计视图打开: ${isOpen2}`)

    if (!isOpen2) {
      console.log('❌ 设计视图未打开')
      return
    }

    await page.waitForTimeout(1000)

    // 记录第二次的按钮
    console.log('\n🔵 记录第二次打开的公式按钮...')
    let btn2Data = await page.evaluate(() => {
      // kityformula按钮是DIV，类名包含 edui-for-插入kityformula
      const btn = document.querySelector('.edui-for-插入kityformula, [class*="edui-for-插入kityformula"]')

      if (btn) {
        const rect = btn.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            id: btn.getAttribute('id'),
            class: btn.getAttribute('class')
          }
        }
      }

      return null
    })

    if (btn2Data) {
      console.log(`✅ 第二次: 位置(${btn2Data.x}, ${btn2Data.y}), 大小${btn2Data.width}x${btn2Data.height}`)
      await page.screenshot({ path: 'formula-button-second-open.png', fullPage: false })
    } else {
      console.log('⚠️  未找到公式按钮')
    }

    // 对比结果
    console.log('\n📊 对比结果:')
    if (btn1Data && btn2Data) {
      const posMatch = Math.abs(btn1Data.x - btn2Data.x) < 5 && Math.abs(btn1Data.y - btn2Data.y) < 5
      const sizeMatch = btn1Data.width === btn2Data.width && btn1Data.height === btn2Data.height

      console.log(`   按钮存在: ✅/✅`)
      console.log(`   第一次位置: (${btn1Data.x}, ${btn1Data.y})`)
      console.log(`   第二次位置: (${btn2Data.x}, ${btn2Data.y})`)
      console.log(`   位置是否一致: ${posMatch ? '✅ 是' : '❌ 不一致'}`)
      console.log(`   大小是否一致: ${sizeMatch ? '✅ 是' : '❌ 不一致'}`)

      if (posMatch && sizeMatch) {
        console.log('\n✅✅✅ 验证通过：公式按钮第一次和第二次打开完全一致！修复成功！')
      } else {
        console.log('\n❌❌❌ 验证失败：公式按钮出现不一致！')
      }
    } else {
      console.log(`❌ 无法对比：${btn1Data ? '' : '第一次'}${!btn1Data && !btn2Data ? '和' : ''}${btn2Data ? '' : '第二次'}未找到按钮`)
    }

  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
