const { test, expect } = require('@playwright/test')

/**
 * 上标样式修复验证测试
 *
 * 问题：DM内容预览弹出框中的上标显示为正常大小文本
 * 修复：在 DmPreviewModal.vue 中添加 sup/sub 的CSS样式
 *
 * 测试目标：
 * 1. 打开包含上标的DM编辑页面
 * 2. 点击"预览"按钮
 * 3. 验证上标元素存在且样式正确
 */

test.describe('上标样式修复验证', () => {
  test.beforeEach(async ({ page }) => {
    // 通过页面登录
    await page.goto('http://localhost:3000/user/login')
    await page.waitForLoadState('networkidle')

    // 填写登录表单
    await page.fill('input[placeholder="账户: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', '123456')

    // 点击登录按钮
    await page.click('button:has-text("登录")')

    // 等待登录成功跳转
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // 打开项目上下文
    await page.evaluate(() => {
      return fetch('http://localhost:3000/jeecg-boot/ietmproject/ietmProject/openProject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': JSON.parse(localStorage.getItem('pro__Access-Token')).value
        },
        body: JSON.stringify({ projectId: '2078348945532030978' })
      })
    })

    await page.waitForTimeout(500)
  })

  test('验证预览弹出框中的上标样式正确', async ({ page }) => {
    console.log('📝 步骤1: 访问DM编辑页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    console.log('📝 步骤2: 查找并点击"预览"按钮')
    // 查找预览按钮（可能在工具栏中）
    const previewButton = page.locator('button:has-text("预览"), a-button:has-text("预览"), .ant-btn:has-text("预览")')
    await previewButton.first().click()

    console.log('📝 步骤3: 等待预览弹出框出现')
    // 等待预览模态框出现
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toBeVisible({ timeout: 10000 })

    console.log('📝 步骤4: 等待iframe加载完成')
    // 获取iframe
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 等待iframe内容加载
    await page.waitForTimeout(2000)

    console.log('📝 步骤5: 检查iframe中是否存在上标元素')
    // 获取iframe的frame对象
    const frameElement = await iframe.elementHandle()
    const frame = await frameElement.contentFrame()

    if (!frame) {
      throw new Error('无法获取iframe的contentFrame')
    }

    // 查找上标元素
    const supElements = await frame.locator('sup')
    const supCount = await supElements.count()

    console.log(`✅ 找到 ${supCount} 个上标元素`)

    if (supCount === 0) {
      console.log('⚠️  未找到上标元素，可能该DM中不包含上标')
      console.log('📝 打印iframe的HTML内容片段进行调试...')
      const bodyText = await frame.locator('body').textContent()
      console.log('Body内容预览:', bodyText?.substring(0, 500))
    } else {
      console.log('📝 步骤6: 验证第一个上标元素的CSS样式')
      const firstSup = supElements.first()

      // 获取计算后的样式
      const styles = await firstSup.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          verticalAlign: computed.verticalAlign,
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
          parentFontSize: window.getComputedStyle(el.parentElement).fontSize
        }
      })

      console.log('上标元素的计算样式:', styles)

      // 验证样式
      expect(styles.verticalAlign).toBe('super')
      console.log('✅ vertical-align: super - 正确')

      // 验证字体大小是否小于父元素（约75%）
      const fontSize = parseFloat(styles.fontSize)
      const parentFontSize = parseFloat(styles.parentFontSize)
      const ratio = fontSize / parentFontSize

      console.log(`字体大小比例: ${(ratio * 100).toFixed(1)}% (期望约75%)`)
      expect(ratio).toBeGreaterThan(0.7)
      expect(ratio).toBeLessThan(0.8)
      console.log('✅ font-size: 0.75em - 正确')

      // 验证行高
      expect(styles.lineHeight).toBe('0px')
      console.log('✅ line-height: 0 - 正确')

      console.log('🎉 上标样式验证通过！')
    }

    console.log('📝 步骤7: 截图保存预览效果')
    await page.screenshot({
      path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\test-results\\superscript-preview-after-fix.png',
      fullPage: true
    })
    console.log('✅ 截图已保存')
  })

  test('对比修复前后的上标显示差异', async ({ page }) => {
    console.log('📝 此测试展示修复效果对比')

    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 点击预览按钮
    const previewButton = page.locator('button:has-text("预览"), a-button:has-text("预览"), .ant-btn:has-text("预览")')
    await previewButton.first().click()

    // 等待预览模态框
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await expect(modal).toBeVisible({ timeout: 10000 })

    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()
    await page.waitForTimeout(2000)

    // 获取iframe的frame对象
    const frameElement = await iframe.elementHandle()
    const frame = await frameElement.contentFrame()

    if (!frame) {
      throw new Error('无法获取iframe的contentFrame')
    }

    console.log('📝 检查样式定义是否存在...')

    // 检查CSS样式是否已注入
    const hasSupStyle = await frame.evaluate(() => {
      const styles = Array.from(document.styleSheets)
      for (const sheet of styles) {
        try {
          const rules = Array.from(sheet.cssRules || [])
          for (const rule of rules) {
            if (rule.selectorText === 'sup') {
              return {
                exists: true,
                verticalAlign: rule.style.verticalAlign,
                fontSize: rule.style.fontSize,
                lineHeight: rule.style.lineHeight
              }
            }
          }
        } catch (e) {
          // CORS或其他问题，跳过
        }
      }
      return { exists: false }
    })

    console.log('sup样式规则:', hasSupStyle)

    if (hasSupStyle.exists) {
      expect(hasSupStyle.verticalAlign).toBe('super')
      expect(hasSupStyle.fontSize).toBe('0.75em')
      expect(hasSupStyle.lineHeight).toBe('0')
      console.log('✅ CSS样式规则已正确注入')
    } else {
      console.log('❌ 未找到sup样式规则')
      throw new Error('sup样式规则不存在，修复未生效')
    }
  })
})
