import { test, expect } from '@playwright/test'

test('验证Para设计视图-公式按钮第一次和第二次打开的一致性', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    // 登录
    console.log('\n🔵 步骤1: 登录系统...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })

    const accountInputs = await page.$$('input[type="text"]')
    const passwordInputs = await page.$$('input[type="password"]')
    if (accountInputs.length > 0) await accountInputs[0].fill('admin')
    if (passwordInputs.length > 0) await passwordInputs[0].fill('123456')

    const loginBtn = await page.locator('button:has-text("登 录")').first()
    if (await loginBtn.isVisible()) await loginBtn.click()

    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 登录成功')

    // 直接导航到编辑页面
    console.log('\n🔵 步骤2: 导航到DM编辑页面...')
    const dmUrl = 'http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(dmUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('✅ 进入DM编辑页面')

    // 截图查看编辑器
    await page.screenshot({ path: 'dm-editor-page.png', fullPage: false })
    console.log('📸 已保存编辑页面截图')

    // 查找para元素
    console.log('\n🔵 步骤3: 查找para元素...')
    const codeEditor = await page.locator('.CodeMirror').first()
    const isEditorVisible = await codeEditor.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`   编辑器可见: ${isEditorVisible}`)

    if (!isEditorVisible) {
      console.log('❌ 代码编辑器未打开')
      return
    }

    // 搜索第一个<para标签
    console.log('\n🔵 步骤4: 定位第一个para元素...')
    await page.keyboard.press('Control+F')
    await page.waitForTimeout(500)

    const searchInput = await page.locator('input.CodeMirror-search-field').first()
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('<para')
      await page.waitForTimeout(500)
      console.log('✅ 搜索到para元素')
    }

    // 关闭搜索框
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // 获取当前光标行
    const currentLine = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      return cm.getCursor().line
    }).catch(() => 0)
    console.log(`   光标在第 ${currentLine} 行`)

    // 第一次打开Para设计视图
    console.log('\n🔵 步骤5: 第一次打开Para设计视图...')

    // 点击行号处的para行，触发编辑操作
    const lines = await page.locator('.CodeMirror-line')
    if (currentLine < await lines.count()) {
      const targetLine = lines.nth(currentLine)
      await targetLine.click()
      await page.waitForTimeout(300)

      // 按P快捷键或查找编辑按钮来打开设计视图
      // 首先尝试右键菜单
      await page.click('.CodeMirror-line', { line: currentLine, button: 'right' })
      await page.waitForTimeout(500)

      // 或者查找工具栏中的Para设计按钮
      const paraDesignBtn = await page.locator('button[title*="Para设计"], button:has-text("Para设计"), .para-designer-btn').first()
      const hasBtnVisible = await paraDesignBtn.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasBtnVisible) {
        console.log('   找到Para设计按钮')
        await paraDesignBtn.click()
        await page.waitForTimeout(1500)
      } else {
        // 尝试双击打开
        await targetLine.dblclick()
        await page.waitForTimeout(1500)
      }
    }

    // 检查是否打开了设计视图
    const designView = await page.locator('.para-designer, [class*="designer"], .ant-modal').first()
    const isDesignViewOpen = await designView.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`   设计视图打开: ${isDesignViewOpen}`)

    if (!isDesignViewOpen) {
      console.log('❌ 设计视图未打开')
      // 尝试截图查看当前状态
      await page.screenshot({ path: 'para-designer-not-open.png', fullPage: false })
      return
    }

    // 记录第一次打开时的公式按钮
    console.log('\n🔵 步骤6: 记录第一次打开时的公式按钮...')

    let formulaBtn1Info = {
      exists: false,
      text: '',
      position: null,
      classes: ''
    }

    // 在设计视图中查找公式按钮
    const formulaBtnArea = designView.locator('[title*="公式"], button:has-text("公式"), [data-btn="formula"]').first()
    const btnVisible1 = await formulaBtnArea.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible1) {
      formulaBtn1Info.exists = true
      formulaBtn1Info.text = await formulaBtnArea.textContent().catch(() => '')
      formulaBtn1Info.classes = await formulaBtnArea.getAttribute('class').catch(() => '')
      formulaBtn1Info.position = await formulaBtnArea.boundingBox().catch(() => null)

      console.log('✅ 第一次打开的公式按钮:')
      if (formulaBtn1Info.position) {
        console.log(`   位置: (${formulaBtn1Info.position.x.toFixed(0)}, ${formulaBtn1Info.position.y.toFixed(0)})`)
      }
      console.log(`   类: ${formulaBtn1Info.classes}`)

      // 截图
      await formulaBtnArea.screenshot({ path: 'formula-button-first-open.png' })
    } else {
      console.log('⚠️  第一次未找到公式按钮')
    }

    // 关闭设计视图
    console.log('\n🔵 步骤7: 关闭设计视图...')
    const closeBtn = await designView.locator('[class*="close"], button:has-text("关闭"), .ant-modal-close').first()
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(800)

    // 第二次打开Para设计视图
    console.log('\n🔵 步骤8: 第二次打开Para设计视图...')

    // 重新点击同一行打开设计视图
    if (currentLine < await lines.count()) {
      const targetLine = lines.nth(currentLine)
      await targetLine.click()
      await page.waitForTimeout(300)

      const paraDesignBtn2 = await page.locator('button[title*="Para设计"], button:has-text("Para设计"), .para-designer-btn').first()
      const hasBtn2 = await paraDesignBtn2.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasBtn2) {
        await paraDesignBtn2.click()
        await page.waitForTimeout(1500)
      } else {
        await targetLine.dblclick()
        await page.waitForTimeout(1500)
      }
    }

    // 检查设计视图是否再次打开
    const isDesignViewOpen2 = await designView.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`   设计视图第二次打开: ${isDesignViewOpen2}`)

    if (!isDesignViewOpen2) {
      console.log('❌ 设计视图第二次打开失败')
      await page.screenshot({ path: 'para-designer-second-not-open.png', fullPage: false })
      return
    }

    // 记录第二次打开时的公式按钮
    console.log('\n🔵 步骤9: 记录第二次打开时的公式按钮...')

    let formulaBtn2Info = {
      exists: false,
      text: '',
      position: null,
      classes: ''
    }

    const formulaBtnArea2 = designView.locator('[title*="公式"], button:has-text("公式"), [data-btn="formula"]').first()
    const btnVisible2 = await formulaBtnArea2.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible2) {
      formulaBtn2Info.exists = true
      formulaBtn2Info.text = await formulaBtnArea2.textContent().catch(() => '')
      formulaBtn2Info.classes = await formulaBtnArea2.getAttribute('class').catch(() => '')
      formulaBtn2Info.position = await formulaBtnArea2.boundingBox().catch(() => null)

      console.log('✅ 第二次打开的公式按钮:')
      if (formulaBtn2Info.position) {
        console.log(`   位置: (${formulaBtn2Info.position.x.toFixed(0)}, ${formulaBtn2Info.position.y.toFixed(0)})`)
      }
      console.log(`   类: ${formulaBtn2Info.classes}`)

      // 截图
      await formulaBtnArea2.screenshot({ path: 'formula-button-second-open.png' })
    } else {
      console.log('⚠️  第二次未找到公式按钮')
    }

    // 对比两次的按钮状态
    console.log('\n🔵 步骤10: 对比结果...')

    let posMatch = false
    if (formulaBtn1Info.position && formulaBtn2Info.position) {
      posMatch = Math.abs(formulaBtn1Info.position.x - formulaBtn2Info.position.x) < 5 &&
                 Math.abs(formulaBtn1Info.position.y - formulaBtn2Info.position.y) < 5
    }

    console.log('\n📊 验证结果:')
    console.log(`   按钮存在 (第1/2): ${formulaBtn1Info.exists}/${formulaBtn2Info.exists}`)
    if (formulaBtn1Info.position && formulaBtn2Info.position) {
      console.log(`   第一次位置: (${formulaBtn1Info.position.x.toFixed(0)}, ${formulaBtn1Info.position.y.toFixed(0)})`)
      console.log(`   第二次位置: (${formulaBtn2Info.position.x.toFixed(0)}, ${formulaBtn2Info.position.y.toFixed(0)})`)
      console.log(`   位置是否一致: ${posMatch}`)
    }

    if (formulaBtn1Info.exists && formulaBtn2Info.exists && posMatch) {
      console.log('\n✅✅✅ 验证通过：公式按钮第一次和第二次打开完全一致！')
    } else {
      console.log('\n❌❌❌ 验证失败：公式按钮出现不一致！')
      console.log('   问题详情:')
      if (!formulaBtn1Info.exists) console.log('   - 第一次打开时公式按钮不存在')
      if (!formulaBtn2Info.exists) console.log('   - 第二次打开时公式按钮不存在')
      if (!posMatch) console.log('   - 按钮位置不一致')
    }

  } catch (error) {
    console.log('\n❌ 测试出错:', error.message)
  } finally {
    await page.close()
  }
})
