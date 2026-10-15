import { test } from '@playwright/test'

test('诊断ParaDesigner实例注册时机', async ({ browser }) => {
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

    // 打开DM
    console.log('🔵 打开编辑页面...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN',
      { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 找para
    const paraLineInfo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      for (let i = 0; i < cm.lineCount(); i++) {
        if (cm.getLine(i).includes('<para')) return { line: i }
      }
      return null
    })
    console.log(`✅ 找到para行: ${paraLineInfo.line}`)

    // 滚动
    await page.evaluate((lineNum) => {
      document.querySelector('.CodeMirror').CodeMirror.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)
    await page.waitForTimeout(500)

    // 第一次打开
    console.log('\n🔵 第一次打开...')

    // 检查实例映射（打开前）
    const instances1_before = await page.evaluate(() => {
      return {
        count: window.$PARA_DESIGNER_INSTANCES ? Object.keys(window.$PARA_DESIGNER_INSTANCES).length : 0,
        keys: window.$PARA_DESIGNER_INSTANCES ? Object.keys(window.$PARA_DESIGNER_INSTANCES) : []
      }
    })
    console.log(`   打开前: 全局实例映射有 ${instances1_before.count} 个实例`)

    // 点铅笔打开
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

    const pencil1 = await page.locator('[class*="pencil"]').first()
    if (await pencil1.isVisible()) {
      await pencil1.click()
      await page.waitForTimeout(2000)  // 等待ParaDesigner完全初始化
    }

    // 检查实例映射（打开后）
    const instances1_after = await page.evaluate(() => {
      const instances = window.$PARA_DESIGNER_INSTANCES || {}
      const keys = Object.keys(instances)
      return {
        count: keys.length,
        keys: keys,
        // 检查每个实例是否已注册按钮对话框引用
        details: keys.map(k => {
          const inst = instances[k]
          return {
            key: k,
            hasInterrefDialog: !!(inst.$refs && inst.$refs.interrefDialog),
            hasDmrefDialog: !!(inst.$refs && inst.$refs.dmrefDialog),
            hasSymbolDialog: !!(inst.$refs && inst.$refs.symbolDialog)
          }
        })
      }
    })
    console.log(`   打开后: 全局实例映射有 ${instances1_after.count} 个实例`)
    instances1_after.details.forEach(d => {
      console.log(`     实例 ${d.key}: interref=${d.hasInterrefDialog}, dmref=${d.hasDmrefDialog}, symbol=${d.hasSymbolDialog}`)
    })

    // 检查按钮是否可见
    const buttons1 = await page.evaluate(() => {
      return {
        interrefButton: !!document.querySelector('.edui-for-interrefbutton'),
        dmrefButton: !!document.querySelector('.edui-for-dmrefbutton'),
        symbolButton: !!document.querySelector('.edui-for-symbolbutton')
      }
    })
    console.log(`   按钮可见性: interref=${buttons1.interrefButton}, dmref=${buttons1.dmrefButton}, symbol=${buttons1.symbolButton}`)

    // 点保存关闭
    console.log('\n🔵 保存并关闭...')
    const saveBtn = await page.locator('button:has-text("保存")').first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(2000)
    }

    // 检查实例映射（关闭后）
    const instances_closed = await page.evaluate(() => {
      return {
        count: window.$PARA_DESIGNER_INSTANCES ? Object.keys(window.$PARA_DESIGNER_INSTANCES).length : 0
      }
    })
    console.log(`   关闭后: 全局实例映射有 ${instances_closed.count} 个实例`)

    // 第二次打开
    console.log('\n🔵 第二次打开...')

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

    const pencil2 = await page.locator('[class*="pencil"]').first()
    if (await pencil2.isVisible()) {
      await page.evaluate(() => {
        const pencils = document.querySelectorAll('[class*="pencil"]')
        if (pencils.length > 0) pencils[0].click()
      })
      await page.waitForTimeout(2000)  // 等待ParaDesigner完全初始化
    }

    // 检查实例映射（第二次打开后）
    const instances2_after = await page.evaluate(() => {
      const instances = window.$PARA_DESIGNER_INSTANCES || {}
      const keys = Object.keys(instances)
      return {
        count: keys.length,
        keys: keys,
        details: keys.map(k => {
          const inst = instances[k]
          return {
            key: k,
            hasInterrefDialog: !!(inst.$refs && inst.$refs.interrefDialog),
            hasDmrefDialog: !!(inst.$refs && inst.$refs.dmrefDialog),
            hasSymbolDialog: !!(inst.$refs && inst.$refs.symbolDialog)
          }
        })
      }
    })
    console.log(`   打开后: 全局实例映射有 ${instances2_after.count} 个实例`)
    instances2_after.details.forEach(d => {
      console.log(`     实例 ${d.key}: interref=${d.hasInterrefDialog}, dmref=${d.hasDmrefDialog}, symbol=${d.hasSymbolDialog}`)
    })

    // 检查按钮是否可见
    const buttons2 = await page.evaluate(() => {
      return {
        interrefButton: !!document.querySelector('.edui-for-interrefbutton'),
        dmrefButton: !!document.querySelector('.edui-for-dmrefbutton'),
        symbolButton: !!document.querySelector('.edui-for-symbolbutton')
      }
    })
    console.log(`   按钮可见性: interref=${buttons2.interrefButton}, dmref=${buttons2.dmrefButton}, symbol=${buttons2.symbolButton}`)

    // 对比
    console.log('\n📊 对比分析:')
    console.log(`   第一次: interref=${buttons1.interrefButton}, dmref=${buttons1.dmrefButton}, symbol=${buttons1.symbolButton}`)
    console.log(`   第二次: interref=${buttons2.interrefButton}, dmref=${buttons2.dmrefButton}, symbol=${buttons2.symbolButton}`)

    if (!buttons1.interrefButton && buttons2.interrefButton) {
      console.log('\n✅ 发现问题！第一次打开时按钮不显示，第二次才显示')
      console.log('   疑似原因：第一次打开时 registerCustomButtons() 早于 $refs 对话框组件初始化')
    } else if (buttons1.interrefButton && buttons2.interrefButton) {
      console.log('\n✅ 两次都正常显示，问题已修复')
    }

  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
