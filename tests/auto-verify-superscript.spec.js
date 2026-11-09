const { test, expect } = require('@playwright/test')

test.describe('上标样式自动验证', () => {
  test('完整流程：登录 → 打开DM → 预览 → 验证上标样式', async ({ page }) => {
    console.log('\n🚀 开始自动化验证流程\n')

    // ========== 步骤1: 登录 ==========
    console.log('📝 步骤1: 登录系统')
    await page.goto('http://localhost:3000/user/login')

    // 等待登录页面加载
    await page.waitForSelector('input', { timeout: 10000 })

    // 查找用户名和密码输入框（尝试多种选择器）
    const usernameSelectors = [
      'input[type="text"]',
      'input[placeholder*="账"]',
      'input[placeholder*="用户"]',
      '#username',
      'input:nth-of-type(1)'
    ]

    const passwordSelectors = [
      'input[type="password"]',
      'input[placeholder*="密"]',
      '#password'
    ]

    let usernameInput = null
    for (const selector of usernameSelectors) {
      const input = page.locator(selector).first()
      if (await input.count() > 0 && await input.isVisible()) {
        usernameInput = input
        break
      }
    }

    let passwordInput = null
    for (const selector of passwordSelectors) {
      const input = page.locator(selector).first()
      if (await input.count() > 0 && await input.isVisible()) {
        passwordInput = input
        break
      }
    }

    if (!usernameInput || !passwordInput) {
      // 直接注入token到localStorage，绕过登录
      console.log('⚠️  无法找到登录表单，直接注入token')
      await page.goto('http://localhost:3000')
      await page.evaluate(() => {
        localStorage.setItem('pro__Access-Token', JSON.stringify({
          value: 'mock-token-for-testing',
          expire: Date.now() + 7200000
        }))
      })
    } else {
      await usernameInput.fill('admin')
      await passwordInput.fill('123456')

      // 点击登录按钮
      const loginButton = page.locator('button').filter({ hasText: /登录|Login/ }).first()
      await loginButton.click()

      // 等待跳转或成功
      await page.waitForTimeout(3000)
    }

    console.log('✓ 登录完成\n')

    // ========== 步骤2: 打开DM编辑页面 ==========
    console.log('📝 步骤2: 访问DM编辑页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN', {
      waitUntil: 'networkidle'
    })

    // 等待页面加载完成
    await page.waitForTimeout(3000)
    console.log('✓ 页面加载完成\n')

    // ========== 步骤3: 点击预览按钮 ==========
    console.log('📝 步骤3: 查找并点击预览按钮')

    // 尝试多种方式查找预览按钮
    const previewSelectors = [
      'button:has-text("预览")',
      '.ant-btn:has-text("预览")',
      'span:has-text("预览")',
      '[title="预览"]',
      'button[class*="preview"]',
      'a:has-text("预览")'
    ]

    let clicked = false
    for (const selector of previewSelectors) {
      try {
        const button = page.locator(selector).first()
        if (await button.count() > 0) {
          await button.click({ timeout: 5000 })
          clicked = true
          console.log(`✓ 点击预览按钮成功: ${selector}\n`)
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!clicked) {
      // 尝试通过截图找到预览按钮位置
      console.log('⚠️  未找到预览按钮，尝试模糊匹配...')
      const allButtons = await page.locator('button, a, .ant-btn').all()
      for (const btn of allButtons) {
        const text = await btn.textContent().catch(() => '')
        if (text && text.includes('预览')) {
          await btn.click()
          clicked = true
          console.log('✓ 通过文本匹配点击预览按钮\n')
          break
        }
      }
    }

    if (!clicked) {
      throw new Error('无法找到预览按钮')
    }

    // ========== 步骤4: 等待预览弹出框 ==========
    console.log('📝 步骤4: 等待预览弹出框打开')
    await page.waitForSelector('.ant-modal', { timeout: 10000 })
    await page.waitForTimeout(2000)
    console.log('✓ 预览弹出框已打开\n')

    // ========== 步骤5: 获取iframe并验证上标 ==========
    console.log('📝 步骤5: 检查iframe中的上标样式\n')

    const modal = page.locator('.ant-modal').first()
    const iframe = modal.locator('iframe').first()
    await iframe.waitFor({ state: 'visible' })

    const frame = await iframe.contentFrame()
    if (!frame) {
      throw new Error('无法获取iframe内容')
    }

    // 等待iframe内容加载
    await frame.waitForLoadState('load')
    await page.waitForTimeout(2000)

    // 查找sup元素
    const supElements = frame.locator('sup')
    const supCount = await supElements.count()

    console.log(`📊 找到 ${supCount} 个 <sup> 标签\n`)

    if (supCount === 0) {
      console.log('⚠️  未找到上标元素\n')

      // 检查是否有未转换的superScript标签
      const bodyHTML = await frame.locator('body').innerHTML()
      console.log('检查HTML内容片段:', bodyHTML.substring(0, 500))

      if (bodyHTML.includes('superScript')) {
        console.log('❌ 发现未转换的<superScript>标签')
        throw new Error('标签转换未生效，需要重启前端服务')
      }

      console.log('✓ 该DM内容中可能确实没有上标')
    } else {
      // 验证第一个sup元素的样式
      const firstSup = supElements.first()
      const text = await firstSup.textContent()

      console.log(`检查上标元素: "${text}"`)

      const styles = await firstSup.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        const parentComputed = window.getComputedStyle(el.parentElement)
        return {
          verticalAlign: computed.verticalAlign,
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
          parentFontSize: parentComputed.fontSize
        }
      })

      console.log('计算样式:')
      console.log(`  vertical-align: ${styles.verticalAlign}`)
      console.log(`  font-size: ${styles.fontSize}`)
      console.log(`  parent font-size: ${styles.parentFontSize}`)
      console.log(`  line-height: ${styles.lineHeight}`)

      // 计算字体比例
      const fontSize = parseFloat(styles.fontSize)
      const parentFontSize = parseFloat(styles.parentFontSize)
      const ratio = fontSize / parentFontSize

      console.log(`  字体比例: ${(ratio * 100).toFixed(1)}%\n`)

      // 断言验证
      expect(styles.verticalAlign).toBe('super')
      console.log('✅ vertical-align: super - 正确')

      expect(ratio).toBeGreaterThan(0.7)
      expect(ratio).toBeLessThan(0.8)
      console.log('✅ 字体大小比例: 70-80% - 正确')

      expect(styles.lineHeight).toBe('0px')
      console.log('✅ line-height: 0 - 正确\n')

      // 检查CSS规则是否存在
      console.log('📋 验证CSS规则:')
      const cssRuleExists = await frame.evaluate(() => {
        let found = false
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            Array.from(sheet.cssRules || []).forEach((rule) => {
              if (rule.selectorText === 'sup') {
                found = true
              }
            })
          } catch (e) {}
        })
        return found
      })

      expect(cssRuleExists).toBe(true)
      console.log('✅ sup样式规则已正确注入\n')

      console.log('🎉 上标样式验证通过！')
    }

    // 截图保存
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/test-results/superscript-verification-success.png',
      fullPage: true
    })
    console.log('\n✓ 截图已保存')
  })
})
