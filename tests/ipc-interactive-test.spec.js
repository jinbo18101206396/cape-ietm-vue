/**
 * 交互式测试 - 在illustratedPartsCatalog行悬停并等待
 * 用于观察编辑按钮的实际位置和行为
 */

const { test } = require('@playwright/test')

test('交互式查找编辑按钮', async ({ page }) => {
  console.log('\n========== 交互式测试 ==========\n')

  // 1. 登录
  console.log('步骤1: 登录...')
  await page.goto('http://localhost:3000/')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="text"]').first().fill('admin')
  await page.locator('input[type="password"]').first().fill('123456')
  await page.click('button:has-text("登录"), button:has-text("登 录")')
  await page.waitForTimeout(3000)
  console.log('✓ 登录成功')

  // 2. 访问编辑器
  console.log('\n步骤2: 访问编辑器...')
  await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN')
  await page.waitForTimeout(3000)
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  console.log('✓ 编辑器已加载')

  // 3. 等待并滚动到illustratedPartsCatalog
  console.log('\n步骤3: 定位到illustratedPartsCatalog行...')
  await page.waitForTimeout(2000)

  // 找到illustratedPartsCatalog行
  const ipcLine = page.locator('.CodeMirror-line').filter({ hasText: '<illustratedPartsCatalog' }).first()
  await ipcLine.scrollIntoViewIfNeeded()

  // 高亮显示这一行
  await ipcLine.evaluate(el => {
    el.style.backgroundColor = 'yellow'
    el.style.border = '2px solid red'
  })

  console.log('✓ illustratedPartsCatalog行已高亮（黄色背景，红色边框）')

  // 4. 悬停在这一行上
  console.log('\n步骤4: 悬停在illustratedPartsCatalog行上...')
  await ipcLine.hover()
  await page.waitForTimeout(3000) // 等待3秒，看是否有编辑按钮出现

  // 5. 截图保存当前状态
  await page.screenshot({
    path: '/d/workspace/IETM/ipc-line-hover.png',
    fullPage: true
  })
  console.log('✓ 悬停状态截图已保存: ipc-line-hover.png')

  // 6. 分析页面上所有可点击元素
  console.log('\n步骤5: 分析页面上的可点击元素...')

  const clickableElements = await page.evaluate(() => {
    const elements = []

    // 查找所有可能的编辑入口
    const selectors = [
      '.CodeMirror-gutter-wrapper',
      '.CodeMirror-linenumber',
      '[class*="gutter"]',
      '[class*="edit"]',
      '[aria-label*="编辑"]',
      '[title*="编辑"]',
      'button',
      '.anticon'
    ]

    selectors.forEach(selector => {
      const els = document.querySelectorAll(selector)
      els.forEach((el, index) => {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          // 检查是否在illustratedPartsCatalog行附近（行号68附近）
          const isNearLine68 = rect.top >= 250 && rect.top <= 300

          if (isNearLine68 || el.textContent.includes('illustratedPartsCatalog')) {
            elements.push({
              selector,
              index,
              tagName: el.tagName,
              className: el.className,
              text: el.textContent.substring(0, 50),
              position: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              ariaLabel: el.getAttribute('aria-label'),
              title: el.getAttribute('title'),
              onclick: el.onclick !== null
            })
          }
        }
      })
    })

    return elements
  })

  console.log(`\n找到 ${clickableElements.length} 个可能的交互元素：\n`)
  clickableElements.forEach((el, idx) => {
    console.log(`[${idx}] ${el.tagName}.${el.className}`)
    console.log(`    位置: (${el.position.left}, ${el.position.top})`)
    console.log(`    文本: ${el.text}`)
    if (el.ariaLabel) console.log(`    aria-label: ${el.ariaLabel}`)
    if (el.title) console.log(`    title: ${el.title}`)
    console.log('')
  })

  // 7. 尝试在第68行行号位置点击
  console.log('步骤6: 尝试点击第68行的行号...')

  const lineNumber68 = await page.evaluate(() => {
    const lineNumbers = document.querySelectorAll('.CodeMirror-linenumber')
    for (const ln of lineNumbers) {
      if (ln.textContent.trim() === '68') {
        const rect = ln.getBoundingClientRect()
        return {
          found: true,
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width / 2
        }
      }
    }
    return { found: false }
  })

  if (lineNumber68.found) {
    console.log(`✓ 找到行号68，位置: (${lineNumber68.left}, ${lineNumber68.top})`)

    // 在行号左侧点击（装订线区域）
    const gutterX = lineNumber68.left - 20
    const gutterY = lineNumber68.top

    console.log(`尝试点击装订线位置: (${gutterX}, ${gutterY})`)
    await page.mouse.click(gutterX, gutterY)
    await page.waitForTimeout(2000)

    // 检查是否打开弹窗
    const modalOpen = await page.locator('.ant-modal:not(.ant-modal-hidden)').isVisible().catch(() => false)
    console.log(`点击后弹窗状态: ${modalOpen ? '✓ 已打开' : '✗ 未打开'}`)
  } else {
    console.log('✗ 未找到行号68')
  }

  // 8. 最终截图
  await page.screenshot({
    path: '/d/workspace/IETM/ipc-after-click.png',
    fullPage: true
  })
  console.log('\n✓ 点击后截图已保存: ipc-after-click.png')

  // 9. 暂停30秒，让您可以手动查看浏览器
  console.log('\n========== 暂停30秒供观察 ==========')
  console.log('您可以在浏览器窗口中手动尝试点击编辑按钮')
  console.log('观察哪个位置能打开设计器弹窗...\n')

  await page.waitForTimeout(30000)

  console.log('测试结束')
})
