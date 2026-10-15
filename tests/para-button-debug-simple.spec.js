/**
 * Para设计视图公式按钮调试测试（简化版）
 * 前提：手动登录后运行
 */
const { test, expect } = require('@playwright/test')

test.describe('Para公式按钮状态调试', () => {
  test('对比第一次和第二次打开公式按钮状态', async ({ page }) => {
    // 直接访问数据模块管理页面（假设已登录）
    await page.goto('http://localhost:3000/ietm/IetmDataModuleManagement')

    // 等待表格加载
    await page.waitForSelector('.ant-table-row', { timeout: 15000 })

    // 点击第一行的"编辑"按钮
    await page.click('.ant-table-row:first-child button:has-text("编辑")')
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })

    console.log('\n===== 第一次打开Para设计视图 =====')

    // 找到包含<para的行并点击（触发Para设计视图）
    const codeMirror = await page.locator('.CodeMirror').first()

    // 在CodeMirror中查找<para标签
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const doc = cm.getDoc()

      // 找到第一个包含<para的行
      for (let i = 0; i < doc.lineCount(); i++) {
        const line = doc.getLine(i)
        if (line.includes('<para')) {
          // 模拟点击这一行的gutter（触发编辑）
          const lineHandle = doc.getLineHandle(i)
          cm.setCursor(i, 0)

          // 触发自定义的编辑事件（如果有的话）
          const event = new MouseEvent('click', { bubbles: true })
          const gutterElement = document.querySelector('.CodeMirror-linenumber')
          if (gutterElement) {
            gutterElement.dispatchEvent(event)
          }
          break
        }
      }
    })

    // 或者直接找到铅笔图标并点击
    await page.waitForTimeout(1000)

    // 尝试多种方式触发Para设计视图
    const triggered = await page.evaluate(() => {
      // 方式1：查找edit-icon
      const editIcon = document.querySelector('.edit-icon')
      if (editIcon) {
        editIcon.click()
        return 'edit-icon'
      }

      // 方式2：查找gutter上的可点击元素
      const gutter = document.querySelector('.CodeMirror-gutter-wrapper')
      if (gutter) {
        gutter.click()
        return 'gutter'
      }

      // 方式3：尝试直接调用Vue组件方法
      const app = document.querySelector('#app').__vue__
      if (app && app.$children) {
        // 递归查找ParaDesigner组件
        const findParaDesigner = (component) => {
          if (component.$options.name === 'ParaDesigner' || component.initUEditor) {
            return component
          }
          for (const child of component.$children || []) {
            const found = findParaDesigner(child)
            if (found) return found
          }
          return null
        }

        const paraDesigner = findParaDesigner(app)
        if (paraDesigner && paraDesigner.initUEditor) {
          paraDesigner.initUEditor()
          return 'vue-method'
        }
      }

      return null
    })

    console.log('触发方式:', triggered)

    if (!triggered) {
      console.log('❌ 无法触发Para设计视图，跳过测试')
      return
    }

    // 等待UEditor出现
    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(2000) // 等待UEditor完全初始化

    // ===== 第一次状态检查 =====
    console.log('\n--- 第一次状态检查 ---')

    const state1 = await page.evaluate(() => {
      const formulaBtn = document.querySelector('.edui-for-kityformula')
      const allFormulaBtns = document.querySelectorAll('.edui-for-kityformula')

      return {
        exists: !!formulaBtn,
        count: allFormulaBtns.length,
        className: formulaBtn ? formulaBtn.className : null,
        innerHTML: formulaBtn ? formulaBtn.innerHTML : null,
        position: formulaBtn ? formulaBtn.getBoundingClientRect() : null
      }
    })

    console.log('第一次状态:', JSON.stringify(state1, null, 2))

    // 截图
    await page.screenshot({ path: 'C:/Users/86135/para-button-first.png' })

    // ===== 关闭Para设计视图 =====
    console.log('\n--- 关闭Para设计视图 ---')

    await page.click('button:has-text("取消")').catch(() => {
      console.log('没有找到取消按钮，尝试切换标签页')
    })

    await page.waitForTimeout(1000)

    // ===== 第二次打开 =====
    console.log('\n===== 第二次打开Para设计视图 =====')

    // 再次触发
    const triggered2 = await page.evaluate(() => {
      const editIcon = document.querySelector('.edit-icon')
      if (editIcon) {
        editIcon.click()
        return true
      }
      const gutter = document.querySelector('.CodeMirror-gutter-wrapper')
      if (gutter) {
        gutter.click()
        return true
      }
      return false
    })

    if (!triggered2) {
      console.log('❌ 无法再次触发Para设计视图')
      return
    }

    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // ===== 第二次状态检查 =====
    console.log('\n--- 第二次状态检查 ---')

    const state2 = await page.evaluate(() => {
      const formulaBtn = document.querySelector('.edui-for-kityformula')
      const allFormulaBtns = document.querySelectorAll('.edui-for-kityformula')

      return {
        exists: !!formulaBtn,
        count: allFormulaBtns.length,
        className: formulaBtn ? formulaBtn.className : null,
        innerHTML: formulaBtn ? formulaBtn.innerHTML : null,
        position: formulaBtn ? formulaBtn.getBoundingClientRect() : null
      }
    })

    console.log('第二次状态:', JSON.stringify(state2, null, 2))

    // 截图
    await page.screenshot({ path: 'C:/Users/86135/para-button-second.png' })

    // ===== 对比分析 =====
    console.log('\n===== 对比分析 =====')

    if (state1.count !== state2.count) {
      console.log(`⚠️ 按钮数量变化: ${state1.count} -> ${state2.count}`)
    }

    if (state1.className !== state2.className) {
      console.log('⚠️ className不一致')
      console.log('  第一次:', state1.className)
      console.log('  第二次:', state2.className)
    }

    if (state1.innerHTML !== state2.innerHTML) {
      console.log('⚠️ innerHTML不一致')
      console.log('  第一次长度:', state1.innerHTML ? state1.innerHTML.length : 0)
      console.log('  第二次长度:', state2.innerHTML ? state2.innerHTML.length : 0)
    }

    if (state1.position && state2.position) {
      if (state1.position.x !== state2.position.x || state1.position.y !== state2.position.y) {
        console.log('⚠️ 位置不一致')
        console.log('  第一次:', state1.position)
        console.log('  第二次:', state2.position)
      }
    }

    // 读取浏览器Console日志
    console.log('\n===== 浏览器Console日志 =====')
    const logs = await page.evaluate(() => {
      return window.__PARA_CONSOLE_LOGS || []
    })

    if (logs.length > 0) {
      logs.forEach(log => console.log(log))
    } else {
      console.log('(无日志捕获)')
    }
  })
})
