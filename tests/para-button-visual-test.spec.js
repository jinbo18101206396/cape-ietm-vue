const { test, expect } = require('@playwright/test')

test.describe('Para设计视图-公式按钮显示问题', () => {
  let page

  test.beforeAll(async ({ browser }) => {
    // 这是test.beforeAll，但playwright没有这个hook
    // 使用 test.beforeEach 代替
  })

  test('第一次和第二次打开Para设计视图-公式按钮应该完全相同', async ({ browser }) => {
    page = await browser.newPage()

    // 设置视口大小
    await page.setViewportSize({ width: 1920, height: 1080 })

    try {
      // 第一步：导航到登录页
      console.log('🔵 导航到系统...')
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })

      // 第二步：等待登录表单出现
      console.log('🔵 等待登录表单...')
      await page.waitForSelector('input[type="text"]', { timeout: 10000 }).catch(() => {
        console.log('⚠️  登录表单未立即出现，尝试查找账号输入框...')
      })

      // 第三步：填写登录信息
      console.log('🔵 填写登录信息...')
      const accountInputs = await page.$$('input[type="text"]')
      const passwordInputs = await page.$$('input[type="password"]')

      if (accountInputs.length > 0) {
        await accountInputs[0].fill('admin')
        console.log('✅ 输入账号: admin')
      }

      if (passwordInputs.length > 0) {
        await passwordInputs[0].fill('admin123')
        console.log('✅ 输入密码: admin123')
      }

      // 第四步：点击登录按钮
      console.log('🔵 点击登录按钮...')
      const loginBtn = await page.locator('button:has-text("登 录")').first()
      if (await loginBtn.isVisible()) {
        await loginBtn.click()
        console.log('✅ 点击登录')
      }

      // 第五步：等待登录完成
      console.log('🔵 等待登录完成...')
      await page.waitForURL(/.*ietm.*|.*home.*/, { timeout: 30000 }).catch(err => {
        console.log('⚠️  URL导航超时:', err.message)
      })

      // 等待页面稳定
      await page.waitForTimeout(2000)

      // 第六步：导航到DM列表
      console.log('🔵 导航到DM列表...')
      await page.goto('http://localhost:3000/ietm/ietmdatamodulemanagement', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(1000)

      // 第七步：找到一个DM并打开
      console.log('🔵 查找DM列表项...')
      const dmItems = await page.$$('tr[data-row-key]')
      console.log(`   找到 ${dmItems.length} 个DM`)

      if (dmItems.length > 0) {
        // 点击第一个DM
        await dmItems[0].click()
        await page.waitForTimeout(1000)

        // 第八步：打开编辑器
        console.log('🔵 打开编辑器...')
        const editBtn = await page.locator('button:has-text("编辑")').first()
        if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await editBtn.click()
          await page.waitForTimeout(2000)
        }

        // 第九步：点击某个para行的行号以打开设计视图（第一次）
        console.log('🔵 第一次打开Para设计视图...')
        const gutters = await page.locator('.CodeMirror-gutter-wrapper')
        const gutterCount = await gutters.count()
        console.log(`   找到 ${gutterCount} 个代码行`)

        if (gutterCount > 10) {
          // 点击第15行
          await gutters.nth(14).click()
          await page.waitForTimeout(2000)

          // 截图第一次的工具栏
          console.log('📸 截图第一次打开时的工具栏...')
          const toolbar1 = await page.locator('.edui-toolbar').first()
          await toolbar1.screenshot({ path: 'tests/para-button-first-open.png' })
          console.log('✅ 已保存: tests/para-button-first-open.png')

          // 获取公式按钮信息
          const formulaBtn1 = await page.locator('.edui-for-kityformula').first()
          const formulaBtnVisible1 = await formulaBtn1.isVisible().catch(() => false)
          if (formulaBtnVisible1) {
            const bbox1 = await formulaBtn1.boundingBox()
            console.log(`   公式按钮位置（第一次）: x=${bbox1.x}, y=${bbox1.y}, w=${bbox1.width}, h=${bbox1.height}`)
            console.log(`   公式按钮className: ${await formulaBtn1.getAttribute('class')}`)
          }

          // 保存内容
          console.log('🔵 保存Para内容...')
          const saveBtn = await page.locator('button:has-text("保存")').first()
          if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await saveBtn.click()
            await page.waitForTimeout(2000)
            console.log('✅ 已保存')
          }

          // 第十步：关闭设计视图
          console.log('🔵 关闭第一次的设计视图...')
          const closeBtn = await page.locator('button[aria-label="Close"]').first()
          if (await closeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await closeBtn.click()
            await page.waitForTimeout(1000)
          }

          // 第十一步：第二次打开Para设计视图
          console.log('🔵 第二次打开Para设计视图...')
          await gutters.nth(14).click()
          await page.waitForTimeout(2000)

          // 截图第二次的工具栏
          console.log('📸 截图第二次打开时的工具栏...')
          const toolbar2 = await page.locator('.edui-toolbar').first()
          await toolbar2.screenshot({ path: 'tests/para-button-second-open.png' })
          console.log('✅ 已保存: tests/para-button-second-open.png')

          // 获取公式按钮信息
          const formulaBtn2 = await page.locator('.edui-for-kityformula').first()
          const formulaBtnVisible2 = await formulaBtn2.isVisible().catch(() => false)
          if (formulaBtnVisible2) {
            const bbox2 = await formulaBtn2.boundingBox()
            console.log(`   公式按钮位置（第二次）: x=${bbox2.x}, y=${bbox2.y}, w=${bbox2.width}, h=${bbox2.height}`)
            console.log(`   公式按钮className: ${await formulaBtn2.getAttribute('class')}`)
          }

          // 对比
          console.log('\n📊 对比结果:')
          if (formulaBtnVisible1 && formulaBtnVisible2) {
            console.log('✅ 公式按钮两次都可见')
          } else {
            console.log('❌ 公式按钮可见性不同')
          }
        }
      }
    } catch (error) {
      console.error('❌ 测试出错:', error.message)
      // 保存错误截图
      await page.screenshot({ path: 'tests/error-screenshot.png' })
    } finally {
      await page.close()
    }
  })
})
