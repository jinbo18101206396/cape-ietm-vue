/**
 * 调试脚本 - 深度分析编辑按钮点击问题
 */

const { test } = require('@playwright/test')

test('调试illustratedPartsCatalog编辑按钮', async ({ page }) => {
  console.log('\n========== 开始调试 ==========\n')

  // 1. 登录
  await page.goto('http://localhost:3000/')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="text"]').first().fill('admin')
  await page.locator('input[type="password"]').first().fill('123456')
  await page.click('button:has-text("登录"), button:has-text("登 录")')
  await page.waitForTimeout(3000)

  // 2. 访问编辑器
  await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN')
  await page.waitForTimeout(3000)
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })

  console.log('✓ 编辑器已加载\n')

  // 3. 深度分析页面结构
  const analysis = await page.evaluate(() => {
    const results = {
      ipcElements: [],
      editButtons: [],
      gutterElements: [],
      eventListeners: []
    }

    // 查找illustratedPartsCatalog相关元素
    const lines = document.querySelectorAll('.CodeMirror-line')
    lines.forEach((line, index) => {
      if (line.textContent.includes('illustratedPartsCatalog')) {
        results.ipcElements.push({
          index,
          text: line.textContent.substring(0, 100),
          className: line.className,
          parentClass: line.parentElement ? line.parentElement.className : '',
          hasClickHandler: line.onclick !== null
        })
      }
    })

    // 查找所有编辑相关的按钮/图标
    const possibleEditElements = document.querySelectorAll(`
      .anticon-edit,
      [class*="edit-icon"],
      [class*="icon-edit"],
      button[aria-label*="编辑"],
      button[title*="编辑"],
      a[aria-label*="编辑"],
      [role="button"][aria-label*="编辑"]
    `)

    possibleEditElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect()
      results.editButtons.push({
        index,
        tagName: el.tagName,
        className: el.className,
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        position: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        visible: rect.width > 0 && rect.height > 0,
        onclick: el.onclick !== null
      })
    })

    // 查找CodeMirror装订线元素
    const gutters = document.querySelectorAll('.CodeMirror-gutter, .CodeMirror-gutters, .CodeMirror-linenumber')
    gutters.forEach((gutter, index) => {
      results.gutterElements.push({
        index,
        className: gutter.className,
        childCount: gutter.children.length,
        hasMarkers: gutter.querySelectorAll('[class*="marker"], [class*="icon"]').length
      })
    })

    return results
  })

  console.log('=== 页面结构分析 ===\n')
  console.log(`找到 ${analysis.ipcElements.length} 个 illustratedPartsCatalog 元素:`)
  analysis.ipcElements.forEach(el => {
    console.log(`  [${el.index}] ${el.text}`)
    console.log(`      类名: ${el.className}`)
  })

  console.log(`\n找到 ${analysis.editButtons.length} 个编辑按钮/图标:`)
  analysis.editButtons.forEach(btn => {
    if (btn.visible) {
      console.log(`  [${btn.index}] ${btn.tagName}.${btn.className}`)
      console.log(`      位置: top=${Math.round(btn.position.top)}, left=${Math.round(btn.position.left)}`)
      console.log(`      aria-label: ${btn.ariaLabel || 'null'}`)
    }
  })

  console.log(`\n找到 ${analysis.gutterElements.length} 个装订线元素`)

  // 4. 尝试通过Vue事件系统触发
  console.log('\n=== 尝试触发Vue事件 ===\n')

  const vueClick = await page.evaluate(() => {
    try {
      // 查找Vue实例
      const ipcLine = Array.from(document.querySelectorAll('.CodeMirror-line'))
        .find(line => line.textContent.includes('<illustratedPartsCatalog'))

      if (!ipcLine) {
        return { success: false, message: '未找到IPC行' }
      }

      // 尝试查找Vue实例并触发事件
      if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        return { success: false, message: 'Vue Devtools钩子存在但无法直接调用' }
      }

      // 尝试直接查找和点击编辑按钮
      const allClickable = document.querySelectorAll('[onclick], button, a, [role="button"]')
      for (const el of allClickable) {
        const text = el.textContent + (el.getAttribute('aria-label') || '') + (el.getAttribute('title') || '')
        if (text.includes('编辑') || el.className.includes('edit')) {
          // 检查是否与IPC行相关
          const parent = el.closest('.CodeMirror-widget') || el.closest('[class*="editor"]')
          if (parent) {
            el.click()
            return { success: true, message: `点击了: ${el.tagName}.${el.className}` }
          }
        }
      }

      return { success: false, message: '未找到可点击的编辑入口' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  })

  console.log(`Vue点击尝试: ${vueClick.message}`)

  if (vueClick.success) {
    await page.waitForTimeout(3000)
  }

  // 5. 检查是否有弹窗打开
  console.log('\n=== 检查弹窗状态 ===\n')

  const modalCheck = await page.evaluate(() => {
    const modals = {
      antModal: !!document.querySelector('.ant-modal'),
      antDrawer: !!document.querySelector('.ant-drawer'),
      ipcDesigner: !!document.querySelector('[class*="ipc"]'),
      illustratedDesigner: !!document.querySelector('[class*="illustrated"]'),
      anyOverlay: !!document.querySelector('.ant-modal-mask, .ant-drawer-mask')
    }

    return modals
  })

  console.log('弹窗检测结果:')
  Object.entries(modalCheck).forEach(([key, value]) => {
    console.log(`  ${key}: ${value ? '✓ 存在' : '✗ 不存在'}`)
  })

  // 6. 保存截图
  await page.screenshot({
    path: '/d/workspace/IETM/debug-screenshot.png',
    fullPage: true
  })

  console.log('\n✓ 调试截图已保存到: debug-screenshot.png')

  // 7. 尝试手动构造点击事件
  console.log('\n=== 尝试手动触发点击 ===\n')

  const manualClick = await page.evaluate(() => {
    // 查找所有可能的容器
    const containers = document.querySelectorAll('.content-box, .editor-container, #app, .ant-layout-content')

    for (const container of containers) {
      // 查找编辑图标
      const editIcons = container.querySelectorAll('.anticon-edit, [class*="edit"]')

      for (const icon of editIcons) {
        // 创建多种点击事件
        const events = [
          new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
          new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
          new MouseEvent('click', { bubbles: true, cancelable: true })
        ]

        events.forEach(event => icon.dispatchEvent(event))

        return { success: true, element: icon.className }
      }
    }

    return { success: false }
  })

  console.log(`手动点击: ${manualClick.success ? '已触发 - ' + manualClick.element : '未找到目标'}`)

  if (manualClick.success) {
    await page.waitForTimeout(3000)

    // 最终检查
    const finalCheck = await page.evaluate(() => {
      return {
        modal: !!document.querySelector('.ant-modal:not(.ant-modal-hidden)'),
        drawer: !!document.querySelector('.ant-drawer:not(.ant-drawer-hidden)'),
        title: document.querySelector('.toolbar-title, .ant-modal-title')?.textContent || ''
      }
    })

    console.log('\n最终检查:')
    console.log(`  弹窗: ${finalCheck.modal || finalCheck.drawer ? '已打开' : '未打开'}`)
    console.log(`  标题: "${finalCheck.title}"`)
  }

  console.log('\n========== 调试完成 ==========\n')
})
