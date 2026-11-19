/**
 * 快速验证脚本 - 连接到已运行的开发服务器
 */

const { test, expect } = require('@playwright/test')

test.describe('图解零部件设计器快速验证', () => {
  test('综合验证所有5个问题', async ({ page }) => {
    console.log('\n========== 开始验证 ==========\n')

    // 1. 访问登录页面
    console.log('步骤1: 访问登录页面...')
    await page.goto('http://localhost:3000/')
    await page.waitForTimeout(1000)

    // 2. 登录
    console.log('步骤2: 登录系统...')
    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 填写用户名（实际字段可能是"账户名"）
    const usernameInput = page.locator('input[type="text"]').first()
    await usernameInput.fill('admin')

    // 填写密码
    const passwordInput = page.locator('input[type="password"]').first()
    await passwordInput.fill('123456')

    // 点击登录按钮
    await page.click('button:has-text("登录"), button:has-text("登 录")')
    await page.waitForTimeout(3000)

    // 3. 访问编辑器页面
    console.log('步骤3: 访问编辑器页面...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN')
    await page.waitForTimeout(3000)

    // 4. 等待XML编辑器加载
    console.log('步骤4: 等待XML编辑器加载...')
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })

    // 等待 illustratedPartsCatalog 元素出现
    console.log('步骤5: 等待 illustratedPartsCatalog 元素...')
    await page.waitForSelector('text=illustratedPartsCatalog', { timeout: 5000 })

    // 点击编辑按钮 - 定位第68行左侧的铅笔图标
    console.log('步骤6: 查找并点击编辑按钮...')

    // 方式1: 在CodeMirror中找到illustratedPartsCatalog所在的行，然后点击左侧的装订线区域
    const illustratedLine = page.locator('.CodeMirror-line').filter({ hasText: 'illustratedPartsCatalog' }).first()
    await illustratedLine.scrollIntoViewIfNeeded()

    // 获取该行的行号元素，点击它旁边的编辑图标
    const lineNumber = await illustratedLine.evaluate((el) => {
      // 找到包含这一行的行号
      const lineDiv = el.closest('.CodeMirror-line')
      if (lineDiv) {
        const lineNumberEl = lineDiv.parentElement.querySelector('.CodeMirror-linenumber')
        return lineNumberEl ? lineNumberEl.textContent : null
      }
      return null
    })

    console.log(`illustratedPartsCatalog 在第 ${lineNumber} 行`)

    // 尝试点击行号左侧的编辑图标
    let clicked = false

    // 方式A: 通过行号定位编辑按钮
    try {
      const gutterMarker = page.locator(`.CodeMirror-linenumber:has-text("${lineNumber}")`).locator('..').locator('.edit-gutter, .gutter-marker, [class*="edit"]').first()
      if (await gutterMarker.isVisible({ timeout: 1000 })) {
        await gutterMarker.click()
        clicked = true
        console.log('✓ 通过行号找到编辑按钮')
      }
    } catch (e) {}

    // 方式B: 悬停在行上触发编辑按钮
    if (!clicked) {
      await illustratedLine.hover()
      await page.waitForTimeout(500)

      const editIcon = page.locator('.anticon-edit, .icon-edit, [class*="edit-icon"]').first()
      if (await editIcon.isVisible({ timeout: 2000 })) {
        await editIcon.click()
        clicked = true
        console.log('✓ 通过悬停找到编辑按钮')
      }
    }

    // 方式C: 查找编辑器左侧装订线中的所有图标
    if (!clicked) {
      const gutterIcons = page.locator('.CodeMirror-gutter .anticon, .CodeMirror-gutter [class*="icon"]')
      const count = await gutterIcons.count()
      console.log(`在装订线中找到 ${count} 个图标`)

      // 尝试点击illustratedPartsCatalog行对应的图标
      for (let i = 0; i < count; i++) {
        const icon = gutterIcons.nth(i)
        const iconLine = await icon.evaluate((el) => {
          const lineEl = el.closest('.CodeMirror-line')
          return lineEl ? lineEl.textContent : ''
        })
        if (iconLine.includes('illustratedPartsCatalog')) {
          await icon.click()
          clicked = true
          console.log('✓ 在装订线中找到对应的编辑图标')
          break
        }
      }
    }

    if (clicked) {
      console.log('成功点击编辑按钮，等待设计器打开...')
      await page.waitForTimeout(3000)
    } else {
      console.log('⚠️  未能自动点击编辑按钮，尝试其他方式...')
    }

    console.log('\n========== 开始验证5个问题 ==========\n')

    // 先保存当前页面截图，看看实际打开了什么
    await page.screenshot({
      path: '/d/workspace/IETM/ipc-designer-current-state.png',
      fullPage: true
    })
    console.log('✓ 当前状态截图已保存')

    // 检查是否有设计器弹窗
    const hasModal = await page.locator('.ant-modal, .ipc-designer, [class*="designer"]').isVisible().catch(() => false)
    console.log(`设计器弹窗状态: ${hasModal ? '已打开' : '未找到'}`)

    // 验证1: 无错误提示
    console.log('\n验证1: 检查"资源未找到"错误...')
    const errorMessage = page.locator('text=很抱歉，资源未找到!')
    const hasError = await errorMessage.isVisible().catch(() => false)
    console.log(`错误提示状态: ${hasError ? '存在（问题未解决）' : '不存在（已解决）'}`)

    // 验证2: 标题
    console.log('\n验证4: 检查标题文本...')
    const possibleTitles = [
      '.toolbar-title',
      '.ant-modal-title',
      '[class*="title"]',
      '.ipc-toolbar span'
    ]

    let foundTitle = null
    for (const selector of possibleTitles) {
      const titleEl = page.locator(selector).first()
      if (await titleEl.isVisible({ timeout: 500 }).catch(() => false)) {
        const text = await titleEl.textContent()
        console.log(`   找到标题 (${selector}): "${text.trim()}"`)
        if (text.trim().includes('图解零部件')) {
          foundTitle = text.trim()
          break
        }
      }
    }

    if (foundTitle) {
      console.log(`✅ 问题4已解决: 标题为"${foundTitle}"`)
    } else {
      console.log('⚠️  未找到标题或标题不匹配')
    }

    // 验证3: 无返回按钮
    console.log('\n验证3: 检查"返回"按钮...')
    const backButton = page.locator('button:has-text("返回"), [type="arrow-left"]')
    const hasBackButton = await backButton.isVisible().catch(() => false)
    console.log(`返回按钮状态: ${hasBackButton ? '存在（问题未解决）' : '不存在（已解决）'}`)

    // 验证4: 中文列名
    console.log('\n验证2: 检查列名语言...')
    const chineseColumns = ['条目顺序码', '零件编号', '描述', '效量', '单位', '厂商码', '邮件码', '备注']
    let chineseFound = 0

    for (const col of chineseColumns) {
      const selectors = [
        `th:has-text("${col}")`,
        `[class*="header"]:has-text("${col}")`,
        `.ant-table-thead th:has-text("${col}")`
      ]

      for (const selector of selectors) {
        if (await page.locator(selector).isVisible({ timeout: 500 }).catch(() => false)) {
          chineseFound++
          console.log(`   ✓ 找到中文列名: ${col}`)
          break
        }
      }
    }

    console.log(`中文列名统计: ${chineseFound} / ${chineseColumns.length}`)

    // 验证5: 布局优化
    console.log('\n验证5: 检查布局优化...')
    const siderSelectors = ['.catalog-sider', '[class*="sider"]', '.ant-layout-sider']

    for (const selector of siderSelectors) {
      const sider = page.locator(selector).first()
      if (await sider.isVisible({ timeout: 500 }).catch(() => false)) {
        const width = await sider.evaluate((el) => window.getComputedStyle(el).width)
        console.log(`   右侧宽度 (${selector}): ${width}`)
        const widthNum = parseInt(width)
        if (widthNum >= 700) {
          console.log('✅ 问题5部分验证: 宽度较大')
        }
        break
      }
    }

    // 保存最终截图
    console.log('\n保存最终验证截图...')
    await page.screenshot({
      path: '/d/workspace/IETM/ipc-designer-verification.png',
      fullPage: true
    })
    console.log('✓ 截图已保存到: D:\\workspace\\IETM\\ipc-designer-verification.png')

    console.log('\n========== 验证完成 ==========\n')
    console.log('总结:')
    console.log(`- 错误提示: ${hasError ? '❌ 仍存在' : '✅ 已解决'}`)
    console.log(`- 标题: ${foundTitle ? '✅ 已修改' : '⚠️  需要检查'}`)
    console.log(`- 返回按钮: ${hasBackButton ? '❌ 仍存在' : '✅ 已移除'}`)
    console.log(`- 中文列名: ${chineseFound > 0 ? `✅ 找到${chineseFound}个` : '⚠️  需要检查'}`)
    console.log(`- 设计器弹窗: ${hasModal ? '✅ 已打开' : '⚠️  未打开'}`)
  })
})
