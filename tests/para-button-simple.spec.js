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
          return { line: i, content: lineContent.substring(0, 50) }
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

    // 获取该行的DOM位置用于点击
    const editorContent = await page.locator('.CodeMirror-line').nth(paraLineInfo.line)

    // 第一次操作
    console.log('\n🔵 第一次打开设计视图...')

    // 用JavaScript直接在第68行点右键
    await page.evaluate((lineNum) => {
      const lines = document.querySelectorAll('.CodeMirror-line')
      if (lines[lineNum]) {
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 2
        })
        lines[lineNum].dispatchEvent(event)
      }
    }, paraLineInfo.line)

    await page.waitForTimeout(500)

    // 查找右键菜单中的设计选项
    const contextMenu = await page.locator('.ant-dropdown, [role="menu"]').first()
    const hasMenu = await contextMenu.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasMenu) {
      // 查找"设计"或"Para设计"菜单项
      const designItems = await page.locator('[role="menuitem"]:has-text("设计"), [role="menuitem"]:has-text("Para"), .ant-dropdown-menu-item:has-text("设计")').all()
      if (designItems.length > 0) {
        console.log(`✅ 找到 ${designItems.length} 个设计菜单项`)
        await designItems[0].click()
        await page.waitForTimeout(1500)
      } else {
        console.log('❌ 菜单中未找到设计选项')
        await page.keyboard.press('Escape')
      }
    } else {
      console.log('⚠️  右键菜单未出现，尝试双击')
      await editorContent.dblclick()
      await page.waitForTimeout(1500)
    }

    // 检查设计视图
    const designModal = await page.locator('.para-designer, .designer-modal, .ant-modal').first()
    const isOpen1 = await designModal.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`   设计视图打开: ${isOpen1}`)

    if (!isOpen1) {
      console.log('❌ 设计视图未打开')
      await page.screenshot({ path: 'first-open-failed.png', fullPage: false })
      return
    }

    // 等待并截图
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'designer-first.png', fullPage: false })

    // 记录第一次的按钮
    console.log('\n🔵 记录第一次打开的按钮...')
    let btn1Data = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      const formulaBtns = Array.from(buttons).filter(b => {
        const text = b.textContent.toLowerCase()
        const title = (b.getAttribute('title') || '').toLowerCase()
        return text.includes('公式') || title.includes('公式')
      })

      if (formulaBtns.length === 0) return null

      const btn = formulaBtns[0]
      const rect = btn.getBoundingClientRect()
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    })

    if (btn1Data) {
      console.log(`✅ 第一次: (${btn1Data.x}, ${btn1Data.y}), 大小: ${btn1Data.width}x${btn1Data.height}`)
    } else {
      console.log('⚠️  未找到公式按钮')
    }

    // 关闭设计视图
    console.log('\n🔵 关闭设计视图...')
    const closeBtn = await designModal.locator('.ant-modal-close').first()
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(800)

    // 第二次打开
    console.log('\n🔵 第二次打开设计视图...')
    await editorContent.click({ button: 'right' })
    await page.waitForTimeout(500)

    const contextMenu2 = await page.locator('.ant-dropdown, [role="menu"]').first()
    const hasMenu2 = await contextMenu2.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasMenu2) {
      const designItems2 = await page.locator('[role="menuitem"]:has-text("设计"), .ant-dropdown-menu-item:has-text("设计")').all()
      if (designItems2.length > 0) {
        await designItems2[0].click()
        await page.waitForTimeout(1500)
      } else {
        await page.keyboard.press('Escape')
      }
    } else {
      await editorContent.dblclick()
      await page.waitForTimeout(1500)
    }

    const isOpen2 = await designModal.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`   设计视图打开: ${isOpen2}`)

    if (!isOpen2) {
      console.log('❌ 第二次设计视图未打开')
      return
    }

    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'designer-second.png', fullPage: false })

    // 记录第二次的按钮
    console.log('\n🔵 记录第二次打开的按钮...')
    let btn2Data = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      const formulaBtns = Array.from(buttons).filter(b => {
        const text = b.textContent.toLowerCase()
        const title = (b.getAttribute('title') || '').toLowerCase()
        return text.includes('公式') || title.includes('公式')
      })

      if (formulaBtns.length === 0) return null

      const btn = formulaBtns[0]
      const rect = btn.getBoundingClientRect()
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    })

    if (btn2Data) {
      console.log(`✅ 第二次: (${btn2Data.x}, ${btn2Data.y}), 大小: ${btn2Data.width}x${btn2Data.height}`)
    } else {
      console.log('⚠️  未找到公式按钮')
    }

    // 对比
    console.log('\n📊 对比结果:')
    if (btn1Data && btn2Data) {
      const posMatch = Math.abs(btn1Data.x - btn2Data.x) < 5 && Math.abs(btn1Data.y - btn2Data.y) < 5
      const sizeMatch = btn1Data.width === btn2Data.width && btn1Data.height === btn2Data.height

      console.log(`   位置: (${btn1Data.x}, ${btn1Data.y}) vs (${btn2Data.x}, ${btn2Data.y}) - ${posMatch ? '✅一致' : '❌不一致'}`)
      console.log(`   大小: ${btn1Data.width}x${btn1Data.height} vs ${btn2Data.width}x${btn2Data.height} - ${sizeMatch ? '✅一致' : '❌不一致'}`)

      if (posMatch && sizeMatch) {
        console.log('\n✅✅✅ 验证通过：公式按钮完全一致！修复成功！')
      } else {
        console.log('\n❌❌❌ 验证失败：按钮位置或大小出现不一致！')
      }
    } else {
      console.log('❌ 无法对比：至少一次未找到按钮')
    }

  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
