/**
 * 快速调试脚本 - 查看登录页面实际结构
 */

const { chromium } = require('@playwright/test')

async function debug() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 })
  const page = await browser.newPage()

  try {
    console.log('正在访问登录页...')
    await page.goto('http://localhost:3000/#/user/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // 截图
    await page.screenshot({ path: 'login-page.png' })
    console.log('✓ 截图已保存: login-page.png')

    // 获取页面HTML结构
    const bodyHtml = await page.locator('body').innerHTML()
    console.log('\n页面HTML长度:', bodyHtml.length)

    // 查找输入框
    console.log('\n查找输入框...')
    const inputs = await page.locator('input').all()
    console.log('找到输入框数量:', inputs.length)

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      const type = await input.getAttribute('type').catch(() => null)
      const placeholder = await input.getAttribute('placeholder').catch(() => null)
      const id = await input.getAttribute('id').catch(() => null)
      const name = await input.getAttribute('name').catch(() => null)

      console.log(`  输入框 ${i + 1}:`, { type, placeholder, id, name })
    }

    // 查找按钮
    console.log('\n查找按钮...')
    const buttons = await page.locator('button').all()
    console.log('找到按钮数量:', buttons.length)

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i]
      const text = await button.textContent().catch(() => null)
      const type = await button.getAttribute('type').catch(() => null)
      const className = await button.getAttribute('class').catch(() => null)

      console.log(`  按钮 ${i + 1}:`, { text: text?.trim(), type, className })
    }

    console.log('\n按任意键继续...')
    await page.waitForTimeout(30000)

  } catch (error) {
    console.error('错误:', error.message)
  } finally {
    await browser.close()
  }
}

debug()
