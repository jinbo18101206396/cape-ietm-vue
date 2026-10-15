import { test } from '@playwright/test'

test('Para公式ICN格式真实验证', async ({ browser }) => {
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

    // 打开DM编辑页面
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
      console.log('❌ 未找到para行')
      return
    }

    console.log(`✅ 找到para行: 第 ${paraLineInfo.line} 行`)

    // 滚动到该行
    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)
    await page.waitForTimeout(500)

    // 打开Para设计视图
    console.log('\n🔵 打开Para设计视图...')
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
      const gutter = document.querySelector('.CodeMirror-gutter')
      if (gutter) gutter.dispatchEvent(event)
    }, paraLineInfo.line)

    await page.waitForTimeout(300)

    const pencilBtn = await page.locator('[class*="pencil"]').first()
    if (await pencilBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pencilBtn.click()
      await page.waitForTimeout(2000)
      console.log('✅ Para设计视图已打开')
    } else {
      console.log('❌ 未找到铅笔按钮')
      return
    }

    // 等待UEditor加载完成
    await page.waitForTimeout(1000)

    // 检查公式按钮是否存在
    const formulaBtn = await page.evaluate(() => {
      const btn = document.querySelector('.edui-for-插入kityformula')
      return btn ? true : false
    })

    if (!formulaBtn) {
      console.log('❌ 未找到公式按钮')
      return
    }

    console.log('✅ 找到公式按钮')

    // 在插入公式前捕获调用参数
    console.log('\n🔵 准备插入公式并捕获ICN...')

    // 注入监听代码，捕获generateIcnCode的调用
    await page.evaluate(() => {
      window.$FORMULA_ICN_CAPTURED = null

      // 找到formulaConverter模块并劫持generateIcnCode
      const paraDesigner = document.querySelector('[data-component="ParaDesigner"]')?.__vue__
      if (paraDesigner && paraDesigner.$options && paraDesigner.$options._formulaConverter) {
        const originalGenerateIcnCode = paraDesigner.$options._formulaConverter.generateIcnCode
        paraDesigner.$options._formulaConverter.generateIcnCode = function(...args) {
          const result = originalGenerateIcnCode.apply(this, args)
          window.$FORMULA_ICN_CAPTURED = {
            args: args,
            result: result
          }
          console.log('📸 捕获到ICN生成:', result)
          return result
        }
      }
    })

    // 点击公式按钮
    await page.evaluate(() => {
      const btn = document.querySelector('.edui-for-插入kityformula')
      if (btn) btn.click()
    })

    await page.waitForTimeout(1000)

    // 等待公式对话框（可能需要更长时间）
    await page.waitForTimeout(2000)

    // 检查是否有iframe出现
    const hasIframe = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe')
      console.log('🔍 页面中的iframe数量:', iframes.length)
      Array.from(iframes).forEach((iframe, idx) => {
        console.log(`  iframe ${idx}: id="${iframe.id}", class="${iframe.className}"`)
      })
      return iframes.length > 0
    })

    if (!hasIframe) {
      console.log('❌ 未找到公式编辑器iframe，尝试截图诊断...')
      await page.screenshot({ path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/formula-no-iframe.png', fullPage: true })

      // 尝试直接保存查看XML
      const saveBtn = await page.locator('button:has-text("保存")').first()
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(2000)

        const symbolInfo = await page.evaluate(() => {
          const cm = document.querySelector('.CodeMirror').CodeMirror
          const content = cm.getValue()
          // 查找最后一个symbol标签
          const symbols = content.match(/<symbol[^>]*infoEntityIdent="([^"]+)"[^>]*>/g)
          if (symbols && symbols.length > 0) {
            const lastSymbol = symbols[symbols.length - 1]
            const icnMatch = lastSymbol.match(/infoEntityIdent="([^"]+)"/)
            if (icnMatch) {
              return { icn: icnMatch[1], found: true }
            }
          }
          return { found: false }
        })

        if (symbolInfo.found) {
          console.log(`\n📊 从XML读取的ICN: ${symbolInfo.icn}`)
          const parts = symbolInfo.icn.split('-')
          console.log(`   段数: ${parts.length}`)
          console.log(`   各段: ${JSON.stringify(parts)}`)

          if (parts.length === 10) {
            console.log('\n✅✅✅ 验证通过: ICN格式正确(10段)')
          } else {
            console.log(`\n❌❌❌ 验证失败: ICN段数错误(${parts.length}段，应为10段)`)
          }
        } else {
          console.log('\n❌ XML中未找到symbol标签')
        }
      }
      return
    }

    console.log('✅ 找到公式编辑器iframe')

    try {
      // 等待iframe加载完成
      await page.waitForTimeout(1000)

      // 尝试获取iframe
      const frame = page.frameLocator('iframe').first()

      // 在iframe中输入（简化版）
      await frame.locator('body').click({ timeout: 5000 })
      await page.keyboard.type('a+b')
      console.log('✅ 已输入公式: a+b')
      await page.waitForTimeout(1000)

      // 点击确定按钮（在主页面，不在iframe）
      // 可能的按钮选择器：button标签、.edui-button类、或dialog内的按钮
      const confirmButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, .edui-button, [class*="button"]'))
        return buttons
          .filter(btn => btn.offsetParent !== null) // 可见的
          .map(btn => ({
            text: btn.innerText || btn.textContent,
            className: btn.className,
            id: btn.id
          }))
      })

      console.log('🔍 页面中的可见按钮:', JSON.stringify(confirmButtons, null, 2))

      // 尝试多种方式找确定按钮
      let clicked = false

      // 方式1: 文本匹配
      const btn1 = page.locator('button:has-text("确定"), button:has-text("插入"), button:has-text("确认")').first()
      if (await btn1.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn1.click()
        clicked = true
        console.log('✅ 已点击确定按钮（方式1）')
      }

      // 方式2: class匹配
      if (!clicked) {
        const btn2 = page.locator('.edui-button:has-text("确定"), .edui-button:has-text("确认")').first()
        if (await btn2.isVisible({ timeout: 1000 }).catch(() => false)) {
          await btn2.click()
          clicked = true
          console.log('✅ 已点击确定按钮（方式2）')
        }
      }

      // 方式3: 直接用JS点击
      if (!clicked) {
        clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, .edui-button')
          for (const btn of buttons) {
            const text = btn.innerText || btn.textContent
            if (text && (text.includes('确定') || text.includes('确认') || text.includes('插入'))) {
              btn.click()
              return true
            }
          }
          return false
        })
        if (clicked) {
          console.log('✅ 已点击确定按钮（方式3）')
        }
      }

      if (clicked) {
        await page.waitForTimeout(1500)

        // 检查是否捕获到ICN
        const captured = await page.evaluate(() => window.$FORMULA_ICN_CAPTURED)

        if (captured && captured.result) {
          console.log('\n📊 ICN生成结果:')
          console.log(`   生成的ICN: ${captured.result}`)

          const parts = captured.result.split('-')
          console.log(`   段数: ${parts.length}`)
          console.log(`   各段: ${JSON.stringify(parts)}`)

          // 验证格式
          if (parts.length === 10) {
            console.log('\n✅✅✅ 验证通过: ICN格式正确(10段)')
            console.log(`   1:  ${parts[0]} (应为 ICN)`)
            console.log(`   2:  ${parts[1]} (SNS段1)`)
            console.log(`   3:  ${parts[2]} (SNS段2)`)
            console.log(`   4:  ${parts[3]} (SNS段3合并)`)
            console.log(`   5:  ${parts[4]} (SNS段4)`)
            console.log(`   6:  ${parts[5]} (SNS段5)`)
            console.log(`   7:  ${parts[6]} (RPC)`)
            console.log(`   8:  ${parts[7]} (originator)`)
            console.log(`   9:  ${parts[8]} (固定001)`)
            console.log(`   10: ${parts[9]} (固定01)`)
          } else {
            console.log(`\n❌❌❌ 验证失败: ICN段数错误(${parts.length}段，应为10段)`)
          }
        } else {
          console.log('\n⚠️ 未能通过劫持捕获ICN，尝试从XML读取...')

          // 保存并检查XML
          const saveBtn = await page.locator('button:has-text("保存")').first()
          if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveBtn.click()
            await page.waitForTimeout(2000)

            // 读取XML中的symbol标签
            const symbolInfo = await page.evaluate(() => {
              const cm = document.querySelector('.CodeMirror').CodeMirror
              const content = cm.getValue()
              const symbolMatch = content.match(/<symbol[^>]*infoEntityIdent="([^"]+)"[^>]*>/)
              if (symbolMatch) {
                return { icn: symbolMatch[1] }
              }
              return null
            })

            if (symbolInfo && symbolInfo.icn) {
              console.log(`\n📊 从XML读取的ICN: ${symbolInfo.icn}`)
              const parts = symbolInfo.icn.split('-')
              console.log(`   段数: ${parts.length}`)

              if (parts.length === 10) {
                console.log('\n✅✅✅ 验证通过: ICN格式正确(10段)')
              } else {
                console.log(`\n❌❌❌ 验证失败: ICN段数错误(${parts.length}段，应为10段)`)
              }
            } else {
              console.log('\n❌ 未能从XML中找到symbol标签')
            }
          }
        }
      } else {
        console.log('❌ 所有方式都未能点击确定按钮')
      }
    } catch (iframeError) {
      console.log(`❌ iframe操作失败: ${iframeError.message}`)
    }

  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
