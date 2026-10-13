/**
 * 调试工具：检查 CodeMirror 行距崩溃的根本原因
 *
 * 这个脚本会：
 * 1. 打开 DM 编辑器
 * 2. 进入 Para 设计视图并保存
 * 3. 返回源码视图后，检查所有相关元素的 line-height
 * 4. 找出哪个元素的样式是异常的
 */

const { chromium } = require('playwright')

async function debugLineHeight() {
  console.log('🔍 启动浏览器进行行距诊断...\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // 慢速执行，方便观察
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })

  const page = await context.newPage()

  try {
    // 1. 登录
    console.log('📝 步骤 1: 登录系统...')
    await page.goto('http://localhost:3004/')
    await page.waitForTimeout(2000)

    // 检查是否已登录
    const isLoggedIn = await page.locator('text=数据模块管理').isVisible().catch(() => false)

    if (!isLoggedIn) {
      console.log('需要登录，请手动登录后按回车继续...')
      await page.pause()
    }

    // 2. 打开任意 DM
    console.log('\n📝 步骤 2: 导航到数据模块管理...')
    await page.goto('http://localhost:3004/ietm/ietmDataModuleManagementList')
    await page.waitForTimeout(3000)

    // 3. 点击第一个 DM 的编辑按钮
    console.log('\n📝 步骤 3: 打开第一个 DM...')
    const firstEditButton = page.locator('button:has-text("编辑")').first()
    await firstEditButton.click()
    await page.waitForTimeout(3000)

    // 4. 获取初始状态的行距
    console.log('\n📊 步骤 4: 记录初始状态的行距...')
    const initialStyles = await page.evaluate(() => {
      const wrapper = document.querySelector('.CodeMirror')
      const lines = document.querySelector('.CodeMirror-lines')
      const code = document.querySelector('.CodeMirror-code')
      const firstLine = document.querySelector('.CodeMirror-line')

      const getComputedStyles = (elem, props) => {
        if (!elem) return null
        const computed = window.getComputedStyle(elem)
        const result = {}
        props.forEach(prop => {
          result[prop] = computed.getPropertyValue(prop)
        })
        return result
      }

      return {
        wrapper: getComputedStyles(wrapper, ['line-height', 'font-size', 'height']),
        lines: getComputedStyles(lines, ['line-height', 'font-size', 'padding']),
        code: getComputedStyles(code, ['line-height', 'font-size']),
        firstLine: getComputedStyles(firstLine, ['line-height', 'height', 'font-size'])
      }
    })

    console.log('✅ 初始状态（正常）:')
    console.log(JSON.stringify(initialStyles, null, 2))

    // 5. 找到并点击第一个 para 的设计视图图标
    console.log('\n📝 步骤 5: 查找 <para> 元素...')
    await page.waitForTimeout(2000)

    // 在 CodeMirror 中搜索 "para"
    const paraLineHandle = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      if (!cm) return null

      // 查找包含 <para> 的行号
      for (let i = 0; i < cm.lineCount(); i++) {
        const lineText = cm.getLine(i)
        if (lineText.includes('<para>')) {
          return i
        }
      }
      return null
    })

    if (paraLineHandle === null) {
      console.log('❌ 未找到 <para> 元素，无法继续测试')
      await browser.close()
      return
    }

    console.log(`✅ 找到 <para> 在第 ${paraLineHandle + 1} 行`)

    // 6. 点击该行的 gutter 图标（设计视图）
    console.log('\n📝 步骤 6: 点击设计视图图标...')
    await page.evaluate((lineNo) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const gutters = document.querySelector('.CodeMirror-gutters')
      const lineElement = cm.getLineHandle(lineNo)

      // 模拟点击 gutter
      const lineHeight = cm.defaultTextHeight()
      const top = cm.heightAtLine(lineNo, 'local')

      // 找到 dmGutter 并点击
      const dmGutter = gutters.querySelector('.dmGutter')
      if (dmGutter) {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: dmGutter.getBoundingClientRect().left + 9,
          clientY: top + lineHeight / 2
        })
        dmGutter.dispatchEvent(event)
      }
    }, paraLineHandle)

    await page.waitForTimeout(1000)

    // 如果没有弹窗，手动点击
    const modalVisible = await page.locator('.ant-modal:has-text("Para 设计")').isVisible().catch(() => false)
    if (!modalVisible) {
      console.log('⚠️ 自动点击失败，请手动点击设计视图图标（第一个 para 行的铅笔图标）')
      console.log('然后在弹窗中点击保存按钮...')
      await page.pause()
    } else {
      console.log('✅ Para 设计器已打开')
    }

    // 7. 等待 Modal 弹出并保存
    console.log('\n📝 步骤 7: 等待 Para 设计器弹窗...')
    await page.waitForSelector('.ant-modal:has-text("Para 设计")', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // 点击保存按钮
    console.log('\n📝 步骤 8: 点击保存按钮...')
    const saveButton = page.locator('.ant-modal:has-text("Para 设计") button:has-text("保存")')
    await saveButton.click()
    await page.waitForTimeout(2000)

    // 8. 检查崩溃后的行距
    console.log('\n📊 步骤 9: 检查崩溃后的行距...')
    const afterStyles = await page.evaluate(() => {
      const wrapper = document.querySelector('.CodeMirror')
      const lines = document.querySelector('.CodeMirror-lines')
      const code = document.querySelector('.CodeMirror-code')
      const firstLine = document.querySelector('.CodeMirror-line')
      const dmSourceView = document.querySelector('.dm-source-view')
      const tabPane = document.querySelector('.ant-tabs-tabpane')

      const getComputedStyles = (elem, props) => {
        if (!elem) return null
        const computed = window.getComputedStyle(elem)
        const result = {}
        props.forEach(prop => {
          result[prop] = computed.getPropertyValue(prop)
        })
        return result
      }

      // 还要检查 inline style
      const getInlineStyles = (elem) => {
        if (!elem || !elem.style) return null
        return {
          lineHeight: elem.style.lineHeight || 'none',
          fontSize: elem.style.fontSize || 'none',
          height: elem.style.height || 'none',
          padding: elem.style.padding || 'none'
        }
      }

      return {
        wrapper: {
          computed: getComputedStyles(wrapper, ['line-height', 'font-size', 'height']),
          inline: getInlineStyles(wrapper)
        },
        lines: {
          computed: getComputedStyles(lines, ['line-height', 'font-size', 'padding']),
          inline: getInlineStyles(lines)
        },
        code: {
          computed: getComputedStyles(code, ['line-height', 'font-size']),
          inline: getInlineStyles(code)
        },
        firstLine: {
          computed: getComputedStyles(firstLine, ['line-height', 'height', 'font-size']),
          inline: getInlineStyles(firstLine)
        },
        dmSourceView: {
          computed: getComputedStyles(dmSourceView, ['line-height', 'font-size', 'height']),
          inline: getInlineStyles(dmSourceView)
        },
        tabPane: {
          computed: getComputedStyles(tabPane, ['line-height', 'font-size', 'height']),
          inline: getInlineStyles(tabPane)
        }
      }
    })

    console.log('\n❌ 崩溃后状态:')
    console.log(JSON.stringify(afterStyles, null, 2))

    // 9. 对比差异
    console.log('\n\n🔍 ===== 诊断结果 =====\n')

    console.log('📊 初始状态 vs 崩溃状态对比:\n')

    const compareStyles = (name, initial, after) => {
      console.log(`\n${name}:`)
      console.log(`  初始 line-height: ${initial?.['line-height']}`)
      console.log(`  崩溃 line-height: ${after?.computed?.['line-height']}`)
      console.log(`  inline style: ${after?.inline?.lineHeight}`)

      if (initial?.['line-height'] !== after?.computed?.['line-height']) {
        console.log(`  ⚠️ 【异常】line-height 被改变！`)
      }
    }

    compareStyles('.CodeMirror', initialStyles.wrapper, afterStyles.wrapper)
    compareStyles('.CodeMirror-lines', initialStyles.lines, afterStyles.lines)
    compareStyles('.CodeMirror-code', initialStyles.code, afterStyles.code)
    compareStyles('.CodeMirror-line', initialStyles.firstLine, afterStyles.firstLine)

    console.log('\n\n✅ 诊断完成！保持浏览器打开以便进一步检查...')
    await page.pause()

  } catch (error) {
    console.error('❌ 诊断过程出错:', error.message)
    console.error(error.stack)
  } finally {
    await browser.close()
  }
}

debugLineHeight().catch(console.error)
