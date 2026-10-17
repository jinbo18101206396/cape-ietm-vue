import { test } from '@playwright/test'

test('详细诊断: 检查浏览器日志和ICN加载', async ({ browser }) => {
  const page = await browser.newPage()
  const messages = []

  // 捕获console消息
  page.on('console', msg => {
    messages.push(`[${msg.type()}] ${msg.text()}`)
  })

  // 捕获错误
  page.on('pageerror', err => {
    messages.push(`[error] ${err.message}`)
  })

  try {
    await page.setViewportSize({ width: 1920, height: 1080 })

    // 登录
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForTimeout(3000)

    // 打开编辑页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN',
      { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 点击预览
    const previewBtn = page.locator('button:has-text("预览")')
    await previewBtn.click()
    await page.waitForTimeout(3000)

    // 检查iframe中的图片
    const iframes = page.frames()
    console.log(`\n📊 总共 ${iframes.length} 个frame`)

    for (let i = 0; i < iframes.length; i++) {
      const frame = iframes[i]
      try {
        const images = await frame.locator('img').all()
        console.log(`\nFrame ${i}: 共 ${images.length} 张图片`)

        for (let j = 0; j < images.length; j++) {
          const img = images[j]
          const src = await img.getAttribute('src')
          const alt = await img.getAttribute('alt')
          const title = await img.getAttribute('title')
          const complete = await img.evaluate(el => el.complete)
          const naturalWidth = await img.evaluate(el => el.naturalWidth)
          const currentSrc = await img.evaluate(el => el.src)

          console.log(`\n  【图片 ${j + 1}】`)
          console.log(`    alt: ${alt}`)
          console.log(`    title: ${title}`)
          console.log(`    src属性: ${src?.substring(0, 80)}...`)
          console.log(`    currentSrc: ${currentSrc?.substring(0, 80)}...`)
          console.log(`    complete: ${complete}`)
          console.log(`    naturalWidth: ${naturalWidth}`)
        }
      } catch (e) {
        console.log(`Frame ${i}: 无法访问`)
      }
    }

    console.log('\n\n📋 浏览器控制台消息:')
    messages.forEach(msg => console.log('  ' + msg))

    // 截图
    await page.screenshot({ path: '/d/workspace/IETM/cape-ietm-vue/diagnostic-detailed.png' })

  } catch (e) {
    console.error('错误:', e.message)
  } finally {
    await page.close()
  }
})
