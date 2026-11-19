/**
 * 图解零部件设计器 - 最终验证测试
 * 使用多种策略确保能打开设计器弹窗
 */

const { test, expect } = require('@playwright/test')

test('图解零部件设计器完整验证', async ({ page }) => {
  console.log('\n========== 开始完整验证 ==========\n')

  // 1. 登录
  console.log('步骤1: 登录系统...')
  await page.goto('http://localhost:3000/')
  await page.waitForLoadState('networkidle')

  const usernameInput = page.locator('input[type="text"]').first()
  await usernameInput.fill('admin')

  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.fill('123456')

  await page.click('button:has-text("登录"), button:has-text("登 录")')
  await page.waitForTimeout(3000)
  console.log('✓ 登录成功')

  // 2. 访问编辑器页面
  console.log('\n步骤2: 访问编辑器页面...')
  await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN')
  await page.waitForTimeout(3000)
  console.log('✓ 编辑器页面已加载')

  // 3. 等待CodeMirror加载
  console.log('\n步骤3: 等待XML编辑器加载...')
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  console.log('✓ XML编辑器已加载')

  // 4. 查找illustratedPartsCatalog元素
  console.log('\n步骤4: 查找 illustratedPartsCatalog 元素...')
  await page.waitForTimeout(2000) // 等待内容渲染

  // 使用JavaScript在页面中查找并点击编辑按钮
  const openDesigner = await page.evaluate(() => {
    // 查找包含illustratedPartsCatalog的行
    const lines = document.querySelectorAll('.CodeMirror-line')
    let targetLine = null

    for (const line of lines) {
      if (line.textContent.includes('illustratedPartsCatalog') &&
          line.textContent.includes('<illustratedPartsCatalog')) {
        targetLine = line
        break
      }
    }

    if (!targetLine) {
      return { success: false, message: '未找到illustratedPartsCatalog元素' }
    }

    // 尝试多种方式找到编辑按钮

    // 方式1: 查找行号对应的编辑按钮
    const lineElement = targetLine.closest('.CodeMirror-line')
    if (lineElement) {
      const lineWidget = lineElement.parentElement

      // 查找装订线中的编辑图标
      const gutterMarkers = document.querySelectorAll('.CodeMirror-gutter-elt')
      for (const marker of gutterMarkers) {
        const editIcon = marker.querySelector('.anticon-edit, [class*="edit"]')
        if (editIcon) {
          editIcon.click()
          return { success: true, message: '通过装订线标记点击' }
        }
      }

      // 查找行内的编辑按钮
      const editButtons = document.querySelectorAll('.anticon-edit, [aria-label*="edit"], [title*="编辑"]')
      for (const btn of editButtons) {
        // 检查按钮是否在illustratedPartsCatalog行附近
        const btnLine = btn.closest('.CodeMirror-line')
        if (btnLine === targetLine || (btn.offsetTop >= targetLine.offsetTop - 20 && btn.offsetTop <= targetLine.offsetTop + 20)) {
          btn.click()
          return { success: true, message: '通过行内按钮点击' }
        }
      }
    }

    // 方式2: 触发悬停事件
    const mouseoverEvent = new MouseEvent('mouseover', { bubbles: true })
    targetLine.dispatchEvent(mouseoverEvent)

    return { success: false, message: '已触发悬停，等待编辑按钮出现' }
  })

  console.log(`编辑按钮定位: ${openDesigner.message}`)

  // 如果通过JavaScript没有成功，尝试Playwright方式
  if (!openDesigner.success) {
    console.log('\n尝试通过Playwright点击编辑按钮...')

    // 找到包含illustratedPartsCatalog的行并悬停
    const ipcLine = page.locator('.CodeMirror-line').filter({ hasText: 'illustratedPartsCatalog' }).first()
    await ipcLine.scrollIntoViewIfNeeded()
    await ipcLine.hover()
    await page.waitForTimeout(1000)

    // 查找所有可能的编辑图标
    const editIcons = page.locator('.anticon-edit, .icon-edit, [aria-label*="edit"], [title*="编辑"]')
    const count = await editIcons.count()
    console.log(`找到 ${count} 个编辑图标`)

    if (count > 0) {
      // 点击最接近illustratedPartsCatalog行的编辑图标
      await editIcons.first().click()
      console.log('✓ 点击编辑图标')
    }
  }

  // 等待设计器打开
  await page.waitForTimeout(3000)

  // 5. 验证设计器是否打开
  console.log('\n步骤5: 检查设计器弹窗状态...')

  const modalVisible = await page.locator('.ant-modal, .ipc-designer-modal').isVisible().catch(() => false)
  const drawerVisible = await page.locator('.ant-drawer, .ipc-designer-drawer').isVisible().catch(() => false)
  const designerVisible = modalVisible || drawerVisible

  console.log(`设计器弹窗状态: ${designerVisible ? '✓ 已打开' : '✗ 未打开'}`)

  // 保存当前状态截图
  await page.screenshot({
    path: '/d/workspace/IETM/designer-state.png',
    fullPage: true
  })
  console.log('✓ 当前状态截图已保存')

  // 如果设计器没打开，尝试注入验证脚本
  if (!designerVisible) {
    console.log('\n设计器未打开，尝试通过页面注入验证...')

    // 注入验证脚本
    const pageValidation = await page.evaluate(() => {
      const results = {
        hasError: false,
        titleText: '',
        hasBackButton: false,
        chineseColumns: [],
        siderWidth: 0,
        designerFound: false
      }

      // 检查是否有"资源未找到"错误
      const errorElements = document.querySelectorAll('.ant-message-error, .ant-notification-notice-error')
      results.hasError = Array.from(errorElements).some(el => el.textContent.includes('资源未找到'))

      // 查找设计器容器（可能是全屏模式）
      const possibleContainers = document.querySelectorAll('.ipc-designer, [class*="illustrated"], .ant-modal-content, .ant-drawer-content')
      results.designerFound = possibleContainers.length > 0

      // 如果找到设计器，验证其内容
      if (results.designerFound) {
        // 查找标题
        const titleSelectors = ['.toolbar-title', '.ant-modal-title', '.ipc-toolbar span']
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector)
          if (el) {
            results.titleText = el.textContent.trim()
            break
          }
        }

        // 查找返回按钮
        const backButtons = document.querySelectorAll('button')
        results.hasBackButton = Array.from(backButtons).some(btn => btn.textContent.includes('返回'))

        // 查找中文列名
        const targetColumns = ['条目顺序码', '零件编号', '描述', '效量', '单位', '厂商码', '邮件码', '备注', '位置推荐']
        const headers = document.querySelectorAll('th, .ant-table-thead th')
        headers.forEach(th => {
          const text = th.textContent.trim()
          if (targetColumns.includes(text)) {
            results.chineseColumns.push(text)
          }
        })

        // 获取侧边栏宽度
        const sider = document.querySelector('.catalog-sider, .ant-layout-sider')
        if (sider) {
          results.siderWidth = parseInt(window.getComputedStyle(sider).width)
        }
      }

      return results
    })

    console.log('\n页面验证结果:')
    console.log(`- 设计器容器: ${pageValidation.designerFound ? '找到' : '未找到'}`)
    console.log(`- 资源错误: ${pageValidation.hasError ? '存在' : '不存在'}`)

    if (pageValidation.designerFound) {
      console.log(`- 标题: "${pageValidation.titleText}"`)
      console.log(`- 返回按钮: ${pageValidation.hasBackButton ? '存在' : '不存在'}`)
      console.log(`- 中文列名: 找到 ${pageValidation.chineseColumns.length} 个`)
      console.log(`- 侧边栏宽度: ${pageValidation.siderWidth}px`)
    }

    // 如果还是没找到，尝试点击页面上所有的编辑图标
    if (!pageValidation.designerFound) {
      console.log('\n尝试点击所有可能的编辑入口...')

      const clicked = await page.evaluate(() => {
        // 查找所有编辑相关的按钮
        const allButtons = document.querySelectorAll('button, a, [role="button"], .anticon-edit, [class*="edit"]')

        for (const btn of allButtons) {
          const text = btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || ''

          // 如果是与illustratedPartsCatalog相关的编辑按钮
          if (text.includes('编辑') || btn.className.includes('edit')) {
            // 检查是否在illustratedPartsCatalog附近
            const nearby = btn.closest('[class*="illustrated"]') ||
                          btn.closest('.CodeMirror-line')

            if (nearby && nearby.textContent.includes('illustratedPartsCatalog')) {
              btn.click()
              return true
            }
          }
        }

        return false
      })

      if (clicked) {
        console.log('✓ 找到并点击了编辑入口')
        await page.waitForTimeout(3000)
      }
    }
  }

  // 6. 最终验证
  console.log('\n========== 最终验证 ==========\n')

  const finalCheck = await page.evaluate(() => {
    const results = {}

    // 问题1: 无资源错误
    const errorElements = document.querySelectorAll('.ant-message-error, .ant-notification-notice-error')
    results.problem1 = !Array.from(errorElements).some(el => el.textContent.includes('资源未找到'))

    // 问题2: 中文列名
    const targetColumns = ['条目顺序码', '零件编号', '描述', '效量', '单位', '厂商码', '邮件码', '备注', '位置推荐']
    const foundColumns = []
    const headers = document.querySelectorAll('th')
    headers.forEach(th => {
      const text = th.textContent.trim()
      if (targetColumns.includes(text)) {
        foundColumns.push(text)
      }
    })
    results.problem2 = foundColumns.length
    results.problem2Columns = foundColumns

    // 问题3: 无返回按钮
    const backButtons = document.querySelectorAll('button')
    results.problem3 = !Array.from(backButtons).some(btn => btn.textContent.includes('返回'))

    // 问题4: 标题
    const titleSelectors = ['.toolbar-title', '.ant-modal-title', '.ipc-toolbar span']
    results.problem4Title = ''
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector)
      if (el && el.textContent.trim()) {
        results.problem4Title = el.textContent.trim()
        break
      }
    }
    results.problem4 = results.problem4Title === '图解零部件'

    // 问题5: 布局
    const sider = document.querySelector('.catalog-sider, .ant-layout-sider')
    results.problem5Width = sider ? parseInt(window.getComputedStyle(sider).width) : 0
    results.problem5 = results.problem5Width >= 700

    return results
  })

  // 输出验证结果
  console.log('✅ 问题1 (无资源错误):', finalCheck.problem1 ? '通过' : '失败')
  console.log(`✅ 问题2 (中文列名): ${finalCheck.problem2 > 0 ? '通过' : '失败'} - 找到 ${finalCheck.problem2} 个列名`)
  if (finalCheck.problem2 > 0) {
    console.log(`   列名: ${finalCheck.problem2Columns.join(', ')}`)
  }
  console.log('✅ 问题3 (无返回按钮):', finalCheck.problem3 ? '通过' : '失败')
  console.log(`✅ 问题4 (标题): ${finalCheck.problem4 ? '通过' : '失败'} - 当前标题: "${finalCheck.problem4Title}"`)
  console.log(`✅ 问题5 (布局): ${finalCheck.problem5 ? '通过' : '失败'} - 宽度: ${finalCheck.problem5Width}px`)

  // 保存最终截图
  await page.screenshot({
    path: '/d/workspace/IETM/final-verification.png',
    fullPage: true
  })
  console.log('\n✓ 最终验证截图已保存')

  console.log('\n========== 验证完成 ==========\n')

  // 计算通过率
  const passed = [
    finalCheck.problem1,
    finalCheck.problem2 > 0,
    finalCheck.problem3,
    finalCheck.problem4,
    finalCheck.problem5
  ].filter(Boolean).length

  console.log(`总计: 5 个问题`)
  console.log(`通过: ${passed} 个`)
  console.log(`失败: ${5 - passed} 个`)

  if (passed === 5) {
    console.log('\n🎉 所有问题均已解决！')
  } else {
    console.log('\n⚠️  仍有问题需要检查')
  }
})
