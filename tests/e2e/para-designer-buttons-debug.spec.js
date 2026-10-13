/**
 * Para设计器按钮加载问题诊断测试
 *
 * 目的：诊断为何首次进入para设计视图时5个自定义按钮不显示
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计器按钮加载诊断', () => {
  test.beforeEach(async ({ page }) => {
    // 监听控制台输出
    page.on('console', msg => {
      if (msg.text().includes('[ParaDesigner]')) {
        console.log('浏览器控制台:', msg.text())
      }
    })

    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="请输入账户"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'admin123')
    await page.click('button:has-text("登录")')

    // 等待登录成功
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 导航到数据模块列表
    await page.goto('http://localhost:3000/ietm/IetmDataModuleList')
    await page.waitForLoadState('networkidle')
  })

  test('诊断首次进入时的按钮注册状态', async ({ page }) => {
    console.log('\n🔍 开始诊断测试...\n')

    // 点击第一个para元素打开设计器
    const paraGutter = page.locator('.CodeMirror-linenumber').filter({ hasText: /para/ }).first()
    await paraGutter.click()

    // 等待ParaDesigner组件加载
    await page.waitForSelector('.edui-editor', { timeout: 10000 })

    // 等待UEditor初始化完成
    await page.waitForTimeout(2000)

    // ===== 诊断1: 检查UE._customizeUI =====
    const customizeUI = await page.evaluate(() => {
      return {
        keys: Object.keys(window.UE._customizeUI),
        deflist: window.UE._customizeUI.deflist ? {
          hasExecFn: typeof window.UE._customizeUI.deflist.execFn === 'function',
          execFnType: typeof window.UE._customizeUI.deflist.execFn,
          index: window.UE._customizeUI.deflist.index,
          id: window.UE._customizeUI.deflist.id
        } : null,
        insertnextrow: window.UE._customizeUI.insertnextrow ? {
          hasExecFn: typeof window.UE._customizeUI.insertnextrow.execFn === 'function',
          index: window.UE._customizeUI.insertnextrow.index
        } : null,
        interrefbutton: window.UE._customizeUI.interrefbutton ? {
          hasExecFn: typeof window.UE._customizeUI.interrefbutton.execFn === 'function',
          index: window.UE._customizeUI.interrefbutton.index
        } : null,
        dmrefbutton: window.UE._customizeUI.dmrefbutton ? {
          hasExecFn: typeof window.UE._customizeUI.dmrefbutton.execFn === 'function',
          index: window.UE._customizeUI.dmrefbutton.index
        } : null,
        symbolbutton: window.UE._customizeUI.symbolbutton ? {
          hasExecFn: typeof window.UE._customizeUI.symbolbutton.execFn === 'function',
          index: window.UE._customizeUI.symbolbutton.index
        } : null
      }
    })

    console.log('\n📊 UE._customizeUI状态:')
    console.log('  注册的按钮:', customizeUI.keys)
    console.log('  deflist:', JSON.stringify(customizeUI.deflist, null, 2))
    console.log('  insertnextrow:', JSON.stringify(customizeUI.insertnextrow, null, 2))
    console.log('  interrefbutton:', JSON.stringify(customizeUI.interrefbutton, null, 2))
    console.log('  dmrefbutton:', JSON.stringify(customizeUI.dmrefbutton, null, 2))
    console.log('  symbolbutton:', JSON.stringify(customizeUI.symbolbutton, null, 2))

    // ===== 诊断2: 检查工具栏实际渲染的按钮 =====
    const toolbarButtons = await page.evaluate(() => {
      const editor = window.UE.getEditor('ueditorParaDesigner')
      if (!editor || !editor.ui || !editor.ui.toolbars || !editor.ui.toolbars[0]) {
        return { error: '找不到工具栏对象' }
      }

      const toolbar = editor.ui.toolbars[0]
      const buttons = toolbar.items.map(item => ({
        uiName: item.uiName,
        className: item.className,
        title: item.title
      }))

      return {
        totalButtons: toolbar.items.length,
        buttons: buttons,
        hasDeflist: buttons.some(b => b.uiName === 'deflist' || b.title === '列表定义'),
        hasInsertnextrow: buttons.some(b => b.uiName === 'insertnextrow' || b.title === '后插入行'),
        hasInterrefbutton: buttons.some(b => b.uiName === 'interrefbutton' || b.title === '内部引用'),
        hasDmrefbutton: buttons.some(b => b.uiName === 'dmrefbutton' || b.title === 'DM引用'),
        hasSymbolbutton: buttons.some(b => b.uiName === 'symbolbutton' || b.title === '图符')
      }
    })

    console.log('\n🔧 工具栏实际渲染状态:')
    console.log('  总按钮数:', toolbarButtons.totalButtons)
    console.log('  包含deflist?', toolbarButtons.hasDeflist)
    console.log('  包含insertnextrow?', toolbarButtons.hasInsertnextrow)
    console.log('  包含interrefbutton?', toolbarButtons.hasInterrefbutton)
    console.log('  包含dmrefbutton?', toolbarButtons.hasDmrefbutton)
    console.log('  包含symbolbutton?', toolbarButtons.hasSymbolbutton)
    console.log('\n  前10个按钮:')
    toolbarButtons.buttons.slice(0, 10).forEach((btn, i) => {
      console.log(`    ${i + 1}. ${btn.uiName || 'unknown'} - ${btn.title || 'no title'}`)
    })

    // ===== 诊断3: 检查DOM中是否有按钮元素 =====
    const domButtons = {
      deflist: await page.locator('.edui-for-deflist').count(),
      insertnextrow: await page.locator('.edui-for-insertnextrow').count(),
      interrefbutton: await page.locator('.edui-for-interrefbutton').count(),
      dmrefbutton: await page.locator('.edui-for-dmrefbutton').count(),
      symbolbutton: await page.locator('.edui-for-symbolbutton').count()
    }

    console.log('\n🎨 DOM中的按钮元素:')
    console.log('  .edui-for-deflist:', domButtons.deflist)
    console.log('  .edui-for-insertnextrow:', domButtons.insertnextrow)
    console.log('  .edui-for-interrefbutton:', domButtons.interrefbutton)
    console.log('  .edui-for-dmrefbutton:', domButtons.dmrefbutton)
    console.log('  .edui-for-symbolbutton:', domButtons.symbolbutton)

    // ===== 断言 =====
    expect(customizeUI.deflist).not.toBeNull()
    expect(customizeUI.deflist.hasExecFn).toBe(true)

    // 截图
    await page.screenshot({ path: 'para-designer-buttons-debug.png', fullPage: true })

    console.log('\n✅ 诊断完成，截图已保存')
  })

  test('对比二次进入时的状态', async ({ page }) => {
    console.log('\n🔍 第一次进入...\n')

    // 第一次进入
    const paraGutter1 = page.locator('.CodeMirror-linenumber').filter({ hasText: /para/ }).first()
    await paraGutter1.click()
    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(2000)

    const firstEntry = await page.evaluate(() => {
      const editor = window.UE.getEditor('ueditorParaDesigner')
      return {
        toolbarButtonCount: editor.ui.toolbars[0].items.length,
        hasDeflist: editor.ui.toolbars[0].items.some(item => item.uiName === 'deflist')
      }
    })

    console.log('第一次进入 - 按钮数:', firstEntry.toolbarButtonCount, '包含deflist?', firstEntry.hasDeflist)

    // 关闭Para设计器
    await page.click('button:has-text("取消")').catch(() => {})
    await page.waitForTimeout(1000)

    console.log('\n🔍 第二次进入...\n')

    // 第二次进入
    const paraGutter2 = page.locator('.CodeMirror-linenumber').filter({ hasText: /para/ }).first()
    await paraGutter2.click()
    await page.waitForSelector('.edui-editor', { timeout: 10000 })
    await page.waitForTimeout(2000)

    const secondEntry = await page.evaluate(() => {
      const editor = window.UE.getEditor('ueditorParaDesigner')
      return {
        toolbarButtonCount: editor.ui.toolbars[0].items.length,
        hasDeflist: editor.ui.toolbars[0].items.some(item => item.uiName === 'deflist')
      }
    })

    console.log('第二次进入 - 按钮数:', secondEntry.toolbarButtonCount, '包含deflist?', secondEntry.hasDeflist)

    console.log('\n📊 对比结果:')
    console.log('  第一次按钮数:', firstEntry.toolbarButtonCount)
    console.log('  第二次按钮数:', secondEntry.toolbarButtonCount)
    console.log('  差异:', secondEntry.toolbarButtonCount - firstEntry.toolbarButtonCount, '个按钮')
  })
})
