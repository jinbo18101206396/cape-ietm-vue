/**
 * Para公式按钮状态调试测试（修复版）
 * 使用正确的登录流程
 */
const { test, expect } = require('@playwright/test')

test.describe('Para公式按钮状态调试', () => {
  test('对比第一次和第二次打开公式按钮状态', async ({ page }) => {
    // 登录（使用正确的选择器）
    await page.goto('http://localhost:3000/')
    await page.waitForSelector('input[placeholder*="账号"]', { timeout: 10000 })
    await page.fill('input[placeholder*="账号"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)

    // 导航到数据模块管理
    await page.goto('http://localhost:3000/#/ietm/IetmDataModuleManagement')
    await page.waitForTimeout(2000)

    // 点击第一行的"编辑"按钮
    const editBtn = await page.locator('.ant-table-row').first().locator('button:has-text("编辑")')
    await editBtn.click()
    await page.waitForTimeout(2000)

    // 等待CodeMirror加载
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })

    console.log('\n===== 第一次打开Para设计视图 =====')

    // 找到包含<para的行并触发编辑
    const opened1 = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')?.CodeMirror
      if (!cm) return false

      // 查找第一个<para>标签
      const doc = cm.getDoc()
      for (let i = 0; i < doc.lineCount(); i++) {
        const line = doc.getLine(i)
        if (line.includes('<para')) {
          // 触发行号点击事件
          const lineElement = document.querySelector(`.CodeMirror-linenumber:nth-child(${i + 1})`)
          if (lineElement) {
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            })
            lineElement.dispatchEvent(event)
            return true
          }
        }
      }
      return false
    })

    if (!opened1) {
      console.log('❌ 无法触发Para设计视图（方式1），尝试方式2')

      // 方式2：查找并点击铅笔图标
      await page.click('.CodeMirror-line:has-text("<para")').catch(() => {})
      await page.waitForTimeout(500)

      // 查找edit-icon
      const editIcon = await page.locator('.edit-icon').first()
      if (await editIcon.isVisible()) {
        await editIcon.click()
      }
    }

    // 等待UEditor加载
    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(3000) // 等待ready回调完成

    // ===== 捕获第一次状态 =====
    console.log('\n--- 第一次状态捕获 ---')

    const state1 = await page.evaluate(() => {
      const formulaBtn = document.querySelector('.edui-for-kityformula')
      const allFormulaBtns = document.querySelectorAll('.edui-for-kityformula')
      const toolbar = document.querySelector('.edui-editor-toolbarbox')

      const customButtons = ['deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton', 'kityformula']
      const buttonsInfo = customButtons.map(name => {
        const btn = document.querySelector(`.edui-for-${name}`)
        return {
          name,
          exists: !!btn,
          className: btn?.className,
          position: btn ? btn.getBoundingClientRect() : null
        }
      })

      return {
        formulaBtn: {
          exists: !!formulaBtn,
          count: allFormulaBtns.length,
          className: formulaBtn?.className,
          innerHTML: formulaBtn?.innerHTML.substring(0, 150),
          position: formulaBtn?.getBoundingClientRect()
        },
        toolbarExists: !!toolbar,
        allButtons: buttonsInfo
      }
    })

    console.log('第一次状态:')
    console.log(JSON.stringify(state1, null, 2))

    // 截图
    await page.screenshot({ path: 'C:/Users/86135/para-first-open.png' })

    // ===== 关闭Para设计视图 =====
    console.log('\n--- 关闭Para设计视图 ---')

    // 点击取消按钮
    await page.click('button:has-text("取消")').catch(async () => {
      console.log('未找到取消按钮，尝试切换标签')
      await page.click('.ant-tabs-tab:has-text("源码")')
    })

    await page.waitForTimeout(2000)

    // ===== 第二次打开 =====
    console.log('\n===== 第二次打开Para设计视图 =====')

    // 再次触发
    const opened2 = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror')?.CodeMirror
      if (!cm) return false

      const doc = cm.getDoc()
      for (let i = 0; i < doc.lineCount(); i++) {
        const line = doc.getLine(i)
        if (line.includes('<para')) {
          const lineElement = document.querySelector(`.CodeMirror-linenumber:nth-child(${i + 1})`)
          if (lineElement) {
            lineElement.click()
            return true
          }
        }
      }
      return false
    })

    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(3000)

    // ===== 捕获第二次状态 =====
    console.log('\n--- 第二次状态捕获 ---')

    const state2 = await page.evaluate(() => {
      const formulaBtn = document.querySelector('.edui-for-kityformula')
      const allFormulaBtns = document.querySelectorAll('.edui-for-kityformula')

      const customButtons = ['deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton', 'kityformula']
      const buttonsInfo = customButtons.map(name => {
        const btn = document.querySelector(`.edui-for-${name}`)
        return {
          name,
          exists: !!btn,
          className: btn?.className,
          position: btn ? btn.getBoundingClientRect() : null
        }
      })

      return {
        formulaBtn: {
          exists: !!formulaBtn,
          count: allFormulaBtns.length,
          className: formulaBtn?.className,
          innerHTML: formulaBtn?.innerHTML.substring(0, 150),
          position: formulaBtn?.getBoundingClientRect()
        },
        allButtons: buttonsInfo
      }
    })

    console.log('第二次状态:')
    console.log(JSON.stringify(state2, null, 2))

    // 截图
    await page.screenshot({ path: 'C:/Users/86135/para-second-open.png' })

    // ===== 差异分析 =====
    console.log('\n===== 差异分析 =====')

    if (state1.formulaBtn.count !== state2.formulaBtn.count) {
      console.log(`⚠️ 按钮数量变化: ${state1.formulaBtn.count} -> ${state2.formulaBtn.count}`)
    }

    if (state1.formulaBtn.className !== state2.formulaBtn.className) {
      console.log('⚠️ className不一致:')
      console.log('  第一次:', state1.formulaBtn.className)
      console.log('  第二次:', state2.formulaBtn.className)
    }

    if (state1.formulaBtn.innerHTML !== state2.formulaBtn.innerHTML) {
      console.log('⚠️ innerHTML不一致')
    }

    const pos1 = state1.formulaBtn.position
    const pos2 = state2.formulaBtn.position
    if (pos1 && pos2 && (pos1.x !== pos2.x || pos1.y !== pos2.y)) {
      console.log(`⚠️ 位置变化: (${pos1.x}, ${pos1.y}) -> (${pos2.x}, ${pos2.y})`)
    }

    // 检查所有按钮
    console.log('\n所有自定义按钮对比:')
    state1.allButtons.forEach((btn1, idx) => {
      const btn2 = state2.allButtons[idx]
      if (btn1.className !== btn2.className) {
        console.log(`  ${btn1.name}: className变化`)
      }
      if (btn1.position && btn2.position && btn1.position.x !== btn2.position.x) {
        console.log(`  ${btn1.name}: 位置X变化 ${btn1.position.x} -> ${btn2.position.x}`)
      }
    })

    // 最终断言
    expect(state2.formulaBtn.count).toBe(1)
    expect(state2.formulaBtn.exists).toBeTruthy()
  })
})
