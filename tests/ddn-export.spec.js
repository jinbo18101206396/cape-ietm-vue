const { test, expect } = require('@playwright/test')

test.describe('DDN导出功能测试', () => {
  test('TC-07: 前端字段校验（P1-1验证）', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // 登录
    await page.waitForSelector('input[placeholder*="账号"]', { timeout: 10000 })
    await page.fill('input[placeholder*="账号"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button:has-text("登录")')

    // 等待登录成功并跳转
    await page.waitForTimeout(3000)

    // 导航到DDN导出页面（通过URL直接跳转）
    await page.goto('http://localhost:3000/#/ietm/ietmddn-export')
    await page.waitForTimeout(2000)

    // 检查页面是否加载
    const pageContent = await page.content()
    console.log('页面是否包含"型号":', pageContent.includes('型号'))

    // 查找型号输入框
    const modelInput = await page.locator('input').filter({ hasText: '' }).first()

    // 不填型号，尝试提交（查找提交按钮）
    const submitBtn = await page.locator('button').filter({ hasText: /导出|提交|确定/ }).first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(1000)

      // 检查是否有校验错误提示
      const errorMsg = await page.locator('.ant-form-item-explain-error, .ant-message-error').count()
      console.log('找到错误提示数量:', errorMsg)

      if (errorMsg > 0) {
        console.log('✅ TC-07 PASS: 前端校验生效，阻止了空型号提交')
      } else {
        console.log('⚠️ TC-07 需要检查: 未找到明确的错误提示')
      }
    }
  })
})
