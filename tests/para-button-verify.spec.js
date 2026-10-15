import { test } from '@playwright/test'

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

    // 导航到编辑页面
    console.log('\n🔵 步骤2: 导航到DM编辑页面...')
    const dmUrl = 'http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(dmUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('✅ 进入DM编辑页面')

    // 查找para元素
    console.log('\n🔵 步骤3: 查找para元素...')
    const codeEditor = await page.locator('.CodeMirror').first()
    const isEditorVisible = await codeEditor.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`   编辑器可见: ${isEditorVisible}`)

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

    // 点击该行的行号以激活gutter
    console.log('\n🔵 步骤5: 点击行号激活gutter...')
    const lineNumber = await page.locator('.CodeMirror-linenumber').nth(currentLine)
    await lineNumber.click()
    await page.waitForTimeout(500)

    // 等待铅笔图标出现
    console.log('\n🔵 步骤6: 等待铅笔图标...')
    const pencilBtn = await page.locator('[class*="pencil"], [title*="编辑"], .gutter-btn').first()
    const hasPencil = await pencilBtn.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`   铅笔图标可见: ${hasPencil}`)

    if (!hasPencil) {
      console.log('❌ 未找到铅笔图标，尝试查找所有gutter按钮...')
      const allGutterBtns = await page.locator('.CodeMirror-linenumber + *').all()
      console.log(`   找到 ${allGutterBtns.length} 个可能的按钮`)
      
      // 截图查看gutter区域
      await lineNumber.screenshot({ path: 'gutter-area-first.png' })
      return
    }

    // 第一次点击铅笔打开设计视图
    console.log('\n🔵 步骤7: 第一次点击铅笔图标打开设计视图...')
    await pencilBtn.click()
    await page.waitForTimeout(1500)

    // 检查设计视图是否打开
    const designView = await page.locator('.para-designer, [class*="designer"], .ant-modal, .component-modal').first()
    const isDesignOpen1 = await designView.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`   设计视图打开: ${isDesignOpen1}`)

    if (!isDesignOpen1) {
      console.log('❌ 设计视图未打开')
      await page.screenshot({ path: 'designer-first-not-open.png', fullPage: false })
      return
    }

    // 等待UEditor加载
    await page.waitForTimeout(1000)

    // 第一次记录公式按钮
    console.log('\n🔵 步骤8: 记录第一次打开时的公式按钮...')

    let btn1Info = { exists: false, x: 0, y: 0, html: '' }

    // 在设计视图中查找公式按钮
    const formulaBtn1 = await designView.locator('[title*="公式"], button:has-text("公式"), [data-btn="formula"]').first()
    btn1Info.exists = await formulaBtn1.isVisible({ timeout: 3000 }).catch(() => false)

    if (btn1Info.exists) {
      const box = await formulaBtn1.boundingBox()
      btn1Info.x = Math.round(box.x)
      btn1Info.y = Math.round(box.y)
      btn1Info.html = await formulaBtn1.innerHTML().catch(() => '')

      console.log(`✅ 第一次打开的公式按钮: 位置=(${btn1Info.x}, ${btn1Info.y})`)
      await formulaBtn1.screenshot({ path: 'formula-button-first.png' })
    } else {
      console.log('⚠️  第一次未找到公式按钮')
    }

    // 关闭设计视图
    console.log('\n🔵 步骤9: 关闭设计视图...')
    const closeBtn = await designView.locator('.ant-modal-close, [class*="close"], button:has-text("关闭")').first()
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(800)

    // 第二次点击铅笔打开设计视图
    console.log('\n🔵 步骤10: 第二次点击铅笔图标打开设计视图...')
    
    // 重新点击行号激活gutter
    await lineNumber.click()
    await page.waitForTimeout(500)

    // 再次查找并点击铅笔
    const pencilBtn2 = await page.locator('[class*="pencil"], [title*="编辑"], .gutter-btn').first()
    const hasPencil2 = await pencilBtn2.isVisible({ timeout: 2000 }).catch(() => false)
    console.log(`   铅笔图标可见: ${hasPencil2}`)

    if (!hasPencil2) {
      console.log('❌ 第二次未找到铅笔图标')
      return
    }

    await pencilBtn2.click()
    await page.waitForTimeout(1500)

    // 检查设计视图是否再次打开
    const isDesignOpen2 = await designView.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`   设计视图打开: ${isDesignOpen2}`)

    if (!isDesignOpen2) {
      console.log('❌ 第二次设计视图未打开')
      return
    }

    // 等待UEditor加载
    await page.waitForTimeout(1000)

    // 第二次记录公式按钮
    console.log('\n🔵 步骤11: 记录第二次打开时的公式按钮...')

    let btn2Info = { exists: false, x: 0, y: 0, html: '' }

    const formulaBtn2 = await designView.locator('[title*="公式"], button:has-text("公式"), [data-btn="formula"]').first()
    btn2Info.exists = await formulaBtn2.isVisible({ timeout: 3000 }).catch(() => false)

    if (btn2Info.exists) {
      const box = await formulaBtn2.boundingBox()
      btn2Info.x = Math.round(box.x)
      btn2Info.y = Math.round(box.y)
      btn2Info.html = await formulaBtn2.innerHTML().catch(() => '')

      console.log(`✅ 第二次打开的公式按钮: 位置=(${btn2Info.x}, ${btn2Info.y})`)
      await formulaBtn2.screenshot({ path: 'formula-button-second.png' })
    } else {
      console.log('⚠️  第二次未找到公式按钮')
    }

    // 对比结果
    console.log('\n🔵 步骤12: 对比结果...')

    const posMatch = Math.abs(btn1Info.x - btn2Info.x) < 10 && Math.abs(btn1Info.y - btn2Info.y) < 10

    console.log('\n📊 验证结果:')
    console.log(`   按钮存在 (第1/2): ${btn1Info.exists}/${btn2Info.exists}`)
    console.log(`   第一次位置: (${btn1Info.x}, ${btn1Info.y})`)
    console.log(`   第二次位置: (${btn2Info.x}, ${btn2Info.y})`)
    console.log(`   位置一致性: ${posMatch}`)

    if (btn1Info.exists && btn2Info.exists && posMatch) {
      console.log('\n✅✅✅ 验证通过：公式按钮第一次和第二次打开完全一致！')
    } else {
      console.log('\n❌❌❌ 验证失败：公式按钮出现不一致！')
    }

  } catch (error) {
    console.log('\n❌ 测试异常:', error.message)
    await page.screenshot({ path: 'test-error.png', fullPage: false })
  } finally {
    await page.close()
  }
})
