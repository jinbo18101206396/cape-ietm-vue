/**
 * Para设计视图公式按钮调试测试
 * 目标：对比第一次和第二次打开时公式按钮的状态差异
 */
const { test, expect } = require('@playwright/test')

test.describe('Para公式按钮状态调试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="请输入账号"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 进入数据模块管理
    await page.goto('http://localhost:3000/ietm/IetmDataModuleManagement')
    await page.waitForSelector('.ant-table-row', { timeout: 10000 })

    // 点击第一行的"编辑"按钮
    await page.click('.ant-table-row:first-child .ant-btn:has-text("编辑")')
    await page.waitForSelector('.codemirror-container', { timeout: 10000 })
  })

  test('对比第一次和第二次打开公式按钮状态', async ({ page }) => {
    console.log('\n===== 第一次打开Para设计视图 =====')

    // 找到一个<para>标签并点击铅笔图标
    await page.waitForSelector('.CodeMirror-line', { timeout: 5000 })

    // 查找包含<para>的行
    const paraLine = await page.locator('.CodeMirror-line').filter({ hasText: '<para' }).first()
    await paraLine.hover()

    // 点击行号左侧的铅笔图标（.edit-icon或gutter）
    await page.click('.CodeMirror-gutter-wrapper .edit-icon', { timeout: 5000 }).catch(async () => {
      // 如果没有edit-icon类，尝试点击gutter
      await page.click('.CodeMirror-linenumber', { timeout: 5000 })
    })

    // 等待Para设计视图出现
    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(2000) // 等待UEditor完全初始化

    // ===== 第一次状态检查 =====
    console.log('\n--- 第一次状态检查 ---')

    // 检查工具栏容器
    const toolbar1 = await page.locator('.edui-editor-toolbarbox').first()
    expect(await toolbar1.isVisible()).toBeTruthy()

    // 检查公式按钮
    const formulaBtn1 = await page.locator('.edui-for-kityformula').first()
    const exists1 = await formulaBtn1.count() > 0
    console.log('公式按钮存在:', exists1)

    let state1 = {}
    if (exists1) {
      state1 = {
        className: await formulaBtn1.getAttribute('class'),
        innerHTML: await formulaBtn1.innerHTML(),
        isVisible: await formulaBtn1.isVisible(),
        boundingBox: await formulaBtn1.boundingBox()
      }
      console.log('第一次状态:', JSON.stringify(state1, null, 2))
    }

    // 检查是否有重复按钮
    const allFormulaBtns1 = await page.locator('.edui-for-kityformula').count()
    console.log('公式按钮总数:', allFormulaBtns1)
    expect(allFormulaBtns1).toBe(1) // 应该只有1个

    // 截图第一次状态
    await page.screenshot({
      path: 'C:/Users/86135/para-button-first-open.png',
      fullPage: false
    })

    // 检查所有自定义按钮的顺序
    const customButtons = ['deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton', 'kityformula']
    console.log('\n第一次自定义按钮位置:')
    for (const btnName of customButtons) {
      const btn = await page.locator(`.edui-for-${btnName}`).first()
      const exists = await btn.count() > 0
      if (exists) {
        const bbox = await btn.boundingBox()
        console.log(`  ${btnName}: x=${bbox.x}, y=${bbox.y}`)
      } else {
        console.log(`  ${btnName}: 未找到`)
      }
    }

    // ===== 关闭Para设计视图 =====
    console.log('\n--- 关闭Para设计视图 ---')

    // 点击"取消"或关闭按钮
    await page.click('button:has-text("取消")').catch(async () => {
      // 如果没有取消按钮，尝试点击"源码视图"标签
      await page.click('.ant-tabs-tab:has-text("源码视图")')
    })

    await page.waitForTimeout(1000) // 等待组件销毁

    // ===== 第二次打开Para设计视图 =====
    console.log('\n===== 第二次打开Para设计视图 =====')

    // 再次点击同一个<para>标签
    await paraLine.hover()
    await page.click('.CodeMirror-gutter-wrapper .edit-icon', { timeout: 5000 }).catch(async () => {
      await page.click('.CodeMirror-linenumber', { timeout: 5000 })
    })

    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // ===== 第二次状态检查 =====
    console.log('\n--- 第二次状态检查 ---')

    const formulaBtn2 = await page.locator('.edui-for-kityformula').first()
    const exists2 = await formulaBtn2.count() > 0
    console.log('公式按钮存在:', exists2)

    let state2 = {}
    if (exists2) {
      state2 = {
        className: await formulaBtn2.getAttribute('class'),
        innerHTML: await formulaBtn2.innerHTML(),
        isVisible: await formulaBtn2.isVisible(),
        boundingBox: await formulaBtn2.boundingBox()
      }
      console.log('第二次状态:', JSON.stringify(state2, null, 2))
    }

    // 检查重复按钮
    const allFormulaBtns2 = await page.locator('.edui-for-kityformula').count()
    console.log('公式按钮总数:', allFormulaBtns2)

    // 截图第二次状态
    await page.screenshot({
      path: 'C:/Users/86135/para-button-second-open.png',
      fullPage: false
    })

    // 检查所有自定义按钮的顺序
    console.log('\n第二次自定义按钮位置:')
    for (const btnName of customButtons) {
      const btn = await page.locator(`.edui-for-${btnName}`).first()
      const exists = await btn.count() > 0
      if (exists) {
        const bbox = await btn.boundingBox()
        console.log(`  ${btnName}: x=${bbox.x}, y=${bbox.y}`)
      } else {
        console.log(`  ${btnName}: 未找到`)
      }
    }

    // ===== 对比分析 =====
    console.log('\n===== 对比分析 =====')

    // 1. 按钮数量对比
    if (allFormulaBtns1 !== allFormulaBtns2) {
      console.log(`⚠️ 按钮数量不一致！第一次: ${allFormulaBtns1}, 第二次: ${allFormulaBtns2}`)
    }

    // 2. className对比
    if (exists1 && exists2 && state1.className !== state2.className) {
      console.log('⚠️ className不一致！')
      console.log('  第一次:', state1.className)
      console.log('  第二次:', state2.className)
    }

    // 3. 位置对比
    if (exists1 && exists2) {
      const pos1 = state1.boundingBox
      const pos2 = state2.boundingBox
      if (pos1.x !== pos2.x || pos1.y !== pos2.y) {
        console.log('⚠️ 位置不一致！')
        console.log('  第一次:', `x=${pos1.x}, y=${pos1.y}`)
        console.log('  第二次:', `x=${pos2.x}, y=${pos2.y}`)
      }
    }

    // 4. innerHTML对比
    if (exists1 && exists2 && state1.innerHTML !== state2.innerHTML) {
      console.log('⚠️ innerHTML不一致！')
      console.log('  第一次长度:', state1.innerHTML.length)
      console.log('  第二次长度:', state2.innerHTML.length)
    }

    // ===== 浏览器Console日志 =====
    console.log('\n===== 浏览器Console日志 =====')

    // 在浏览器中执行调试脚本
    const debugInfo = await page.evaluate(() => {
      const toolbar = document.querySelector('.edui-editor-toolbarbox')
      const formulaBtn = document.querySelector('.edui-for-kityformula')

      return {
        toolbarExists: !!toolbar,
        formulaBtnExists: !!formulaBtn,
        formulaBtnClass: formulaBtn?.className || 'N/A',
        allButtons: Array.from(document.querySelectorAll('.edui-button')).length,
        customButtons: {
          deflist: !!document.querySelector('.edui-for-deflist'),
          insertnextrow: !!document.querySelector('.edui-for-insertnextrow'),
          interrefbutton: !!document.querySelector('.edui-for-interrefbutton'),
          dmrefbutton: !!document.querySelector('.edui-for-dmrefbutton'),
          symbolbutton: !!document.querySelector('.edui-for-symbolbutton'),
          kityformula: !!document.querySelector('.edui-for-kityformula')
        }
      }
    })

    console.log('浏览器调试信息:', JSON.stringify(debugInfo, null, 2))

    // 最终断言：第二次应该和第一次完全一样
    expect(allFormulaBtns2).toBe(1) // 不应该有重复
    if (exists1 && exists2) {
      expect(state2.className).toBe(state1.className) // className应该一致
    }
  })
})
