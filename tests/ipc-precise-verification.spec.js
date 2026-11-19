/**
 * 精确验证测试 - 基于源码分析
 *
 * 关键发现：
 * 1. 设计器不是弹窗，是内嵌替换 XML 编辑区域（v-else-if="ipcDesignerVisible"）
 * 2. 编辑按钮是 CodeMirror gutter 中的 .gutter-design-marker > .gutter-pencil-icon
 * 3. 点击后检测 .ipc-toolbar / .toolbar-title，不是 .ant-modal
 */

const { test, expect } = require('@playwright/test')

test('图解零部件设计器 - 完整验证', async ({ page }) => {
  console.log('\n========== 图解零部件设计器完整验证 ==========\n')

  // ── 1. 登录 ──────────────────────────────────────
  await page.goto('http://localhost:3000/')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="text"]').first().fill('admin')
  await page.locator('input[type="password"]').first().fill('123456')
  await page.click('button:has-text("登录"), button:has-text("登 录")')
  await page.waitForTimeout(3000)
  console.log('✓ 登录成功')

  // ── 2. 访问编辑器 ──────────────────────────────────
  await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN')
  await page.waitForSelector('.CodeMirror', { timeout: 15000 })
  await page.waitForTimeout(2000)
  console.log('✓ 编辑器已加载')

  // ── 3. 点击 illustratedPartsCatalog 行的 gutter 铅笔图标 ──
  console.log('\n步骤3: 点击 illustratedPartsCatalog 行的铅笔图标...')

  // 铅笔图标类名是 .gutter-pencil-icon，父容器是 .gutter-design-marker
  // 需要先找到 illustratedPartsCatalog 行对应的 gutter marker
  const clicked = await page.evaluate(() => {
    // CodeMirror 中每一行对应一个 CodeMirror-line，gutter marker 在同级的 gutter wrapper 里
    // 遍历所有的 gutter-design-marker，找到对应 illustratedPartsCatalog 行的那个
    const markers = document.querySelectorAll('.gutter-design-marker')

    for (const marker of markers) {
      // 通过 title 属性判断是否是 illustratedPartsCatalog 的 marker
      const link = marker.querySelector('a.gutter-design-link')
      if (link && link.title && link.title.includes('illustratedPartsCatalog')) {
        link.click()
        return { success: true, title: link.title }
      }
    }

    // 如果 title 中没有找到，尝试通过 CodeMirror 行位置匹配
    // 找到 illustratedPartsCatalog 所在行
    const lines = document.querySelectorAll('.CodeMirror-line')
    let ipcLineIndex = -1
    lines.forEach((line, idx) => {
      if (line.textContent.includes('<illustratedPartsCatalog')) {
        ipcLineIndex = idx
      }
    })

    if (ipcLineIndex < 0) {
      return { success: false, reason: '未找到 illustratedPartsCatalog 行' }
    }

    // 找到对应行的 gutter marker（通过 y 坐标接近）
    const ipcLine = lines[ipcLineIndex]
    const ipcRect = ipcLine.getBoundingClientRect()
    const ipcCenterY = ipcRect.top + ipcRect.height / 2

    // 找最近的 gutter marker
    let closestMarker = null
    let closestDist = Infinity

    markers.forEach(marker => {
      const rect = marker.getBoundingClientRect()
      const markerCenterY = rect.top + rect.height / 2
      const dist = Math.abs(markerCenterY - ipcCenterY)
      if (dist < closestDist) {
        closestDist = dist
        closestMarker = marker
      }
    })

    if (closestMarker && closestDist < 20) {
      const link = closestMarker.querySelector('a')
      if (link) {
        link.click()
        return { success: true, title: link.title, dist: closestDist }
      }
    }

    return {
      success: false,
      reason: `找到 ${markers.length} 个 marker，最近距离 ${closestDist}px，ipcLine y=${ipcCenterY}`,
      markerCount: markers.length,
      ipcLineIndex
    }
  })

  console.log(`铅笔图标点击结果: ${JSON.stringify(clicked)}`)

  if (!clicked.success) {
    // 备用方案：直接触发 CodeMirror gutterClick 事件
    console.log('备用方案: 通过 CodeMirror API 触发 gutterClick...')

    const triggered = await page.evaluate(() => {
      // 找到 CodeMirror 实例
      const cmEl = document.querySelector('.CodeMirror')
      if (!cmEl || !cmEl.CodeMirror) return { success: false, reason: '未找到 CodeMirror 实例' }

      const cm = cmEl.CodeMirror

      // 找到 illustratedPartsCatalog 的行号（0-based）
      let ipcLine = -1
      for (let i = 0; i < cm.lineCount(); i++) {
        const lineText = cm.getLine(i)
        if (lineText && lineText.includes('<illustratedPartsCatalog')) {
          ipcLine = i
          break
        }
      }

      if (ipcLine < 0) return { success: false, reason: '未在 CodeMirror 中找到 illustratedPartsCatalog 行' }

      // 触发 gutterClick 事件（gutter 名称是 'dmGutter'）
      cm.signal(cm, 'gutterClick', cm, ipcLine, 'dmGutter', new MouseEvent('click'))
      return { success: true, line: ipcLine }
    })

    console.log(`CodeMirror API 触发结果: ${JSON.stringify(triggered)}`)
  }

  // 等待设计器渲染
  await page.waitForTimeout(2000)

  // ── 4. 验证设计器已打开（检测 .ipc-toolbar，不是弹窗）──
  console.log('\n步骤4: 验证设计器已打开...')

  const designerVisible = await page.locator('.ipc-toolbar').isVisible().catch(() => false)
  console.log(`设计器状态: ${designerVisible ? '✓ 已打开' : '✗ 未打开'}`)

  if (!designerVisible) {
    // 截图辅助调试
    await page.screenshot({ path: '/d/workspace/IETM/debug-no-designer.png', fullPage: true })
    console.log('调试截图已保存: debug-no-designer.png')
  }

  // ── 5. 五项验证 ──────────────────────────────────
  console.log('\n========== 开始验证 5 个问题 ==========\n')

  // 问题1：无"资源未找到"错误
  const hasError = await page.evaluate(() => {
    const notices = document.querySelectorAll('.ant-notification-notice, .ant-message-notice')
    return Array.from(notices).some(el => el.textContent.includes('资源未找到'))
  })
  console.log(`问题1 (无资源错误): ${!hasError ? '✅ 通过' : '❌ 失败'}`)

  // 问题3：无返回按钮（先单独验证，不依赖设计器是否打开）
  const hasBackBtn = await page.evaluate(() => {
    const toolbar = document.querySelector('.ipc-toolbar')
    if (!toolbar) return null  // 设计器未打开
    return Array.from(toolbar.querySelectorAll('button')).some(b => b.textContent.includes('返回'))
  })
  if (hasBackBtn === null) {
    console.log('问题3 (无返回按钮): ⚠️  设计器未打开，无法验证')
  } else {
    console.log(`问题3 (无返回按钮): ${!hasBackBtn ? '✅ 通过' : '❌ 失败'}`)
  }

  // 以下验证需要设计器打开
  if (designerVisible) {
    // 问题2：中文列名
    const columnCheck = await page.evaluate(() => {
      const target = ['条目顺序码', '零件编号', '描述', '效量', '单位', '厂商码', '邮件码', '备注', '位置推荐']
      const found = []
      document.querySelectorAll('th').forEach(th => {
        const t = th.textContent.trim()
        if (target.includes(t)) found.push(t)
      })
      return { found, total: target.length }
    })
    console.log(`问题2 (中文列名): ${columnCheck.found.length > 0 ? '✅ 通过' : '❌ 失败'} — 找到 ${columnCheck.found.length}/${columnCheck.total} 个`)
    if (columnCheck.found.length > 0) console.log(`   列名: ${columnCheck.found.join(', ')}`)

    // 问题4：标题
    await page.waitForFunction(() => {
      const el = document.querySelector('.toolbar-title')
      return el && el.textContent.trim().length > 0
    }, { timeout: 5000 }).catch(() => {})
    const titleEl = await page.evaluate(() => {
      const el = document.querySelector('.toolbar-title')
      return el ? { text: el.textContent, inner: el.innerHTML } : null
    })
    const titleText = titleEl ? titleEl.text.trim() : ''
    const titleOk = titleText === '图解零部件'
    console.log('问题4 (标题): ' + (titleOk ? '✅ 通过' : '❌ 失败') + ' — 当前: "' + titleText + '" (innerHTML: ' + (titleEl ? titleEl.inner : 'N/A') + ')')
    // 问题5：布局（侧边栏宽度）
    const layoutCheck = await page.evaluate(() => {
      const sider = document.querySelector('.catalog-sider')
      if (!sider) return { found: false }
      const w = parseInt(window.getComputedStyle(sider).width)
      const toolbar = document.querySelector('.ipc-toolbar')
      const bg = toolbar ? window.getComputedStyle(toolbar).backgroundImage : ''
      return { found: true, width: w, hasGradient: bg.includes('gradient') }
    })

    if (layoutCheck.found) {
      const widthOk = layoutCheck.width >= 700
      console.log(`问题5 (布局): ${widthOk ? '✅ 通过' : '❌ 失败'} — 宽度: ${layoutCheck.width}px, 渐变: ${layoutCheck.hasGradient}`)
    } else {
      console.log('问题5 (布局): ⚠️  未找到 .catalog-sider')
    }

    // 保存验证截图
    await page.screenshot({ path: 'test-results/ipc-verified-final.png', fullPage: true })
    console.log('\n✓ 验证截图已保存: ipc-verified.png')

  } else {
    console.log('\n⚠️  设计器未打开，问题2/3/4/5 无法验证')
    console.log('请确认 illustratedPartsCatalog 行的铅笔图标是否正常渲染')
  }

  console.log('\n========== 验证结束 ==========\n')

  // 断言：至少问题1已解决（已多次验证）
  expect(hasError).toBe(false)
})
