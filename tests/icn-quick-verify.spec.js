import { test } from '@playwright/test'

test('快速诊断: ICN显示验证', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    // 登录
    console.log('\n🔵 登录系统...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForTimeout(3000)
    console.log('✅ 登录成功')

    // 直接导航到项目数据模块管理
    console.log('\n🔵 导航到项目数据模块管理...')
    await page.goto('http://localhost:3000/#/ietm/ietmproject/ietmDataModuleManagement', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 导航完成')

    // 检查页面是否加载
    const content = await page.content()
    console.log('页面包含表格:', content.includes('<table'))
    console.log('页面包含DMC:', content.includes('DMC'))

    // 尝试找到表格
    const tableExists = await page.locator('table').isVisible().catch(() => false)
    console.log('✓ 表格存在:', tableExists)

    // 截图用于诊断
    await page.screenshot({ path: '/d/workspace/IETM/cape-ietm-vue/diagnostic-dm-page.png' })
    console.log('✓ 截图已保存')

    // 尝试找到第一行并点击浏览
    const firstRow = await page.locator('table tbody tr').first().isVisible().catch(() => false)
    console.log('✓ 表格第一行存在:', firstRow)

    if (firstRow) {
      await page.locator('table tbody tr').first().click()
      await page.waitForTimeout(1000)

      // 找浏览按钮
      const browseBtn = await page.locator('button').filter({ hasText: /浏览|编辑|预览/ }).first().isVisible().catch(() => false)
      console.log('✓ 浏览按钮存在:', browseBtn)

      if (browseBtn) {
        await page.locator('button').filter({ hasText: /浏览|编辑|预览/ }).first().click()
        await page.waitForTimeout(2000)

        // 截图
        await page.screenshot({ path: '/d/workspace/IETM/cape-ietm-vue/diagnostic-after-browse.png' })

        // 找预览按钮
        const previewBtn = await page.locator('button').filter({ hasText: /预览/ }).isVisible().catch(() => false)
        console.log('✓ 预览按钮存在:', previewBtn)

        if (previewBtn) {
          await page.locator('button').filter({ hasText: /预览/ }).click()
          await page.waitForTimeout(2000)

          // 检查iframe中的图片
          const iframes = page.frames()
          console.log(`\n📊 发现 ${iframes.length} 个frame`)

          let totalImages = 0
          let icnImages = 0

          for (let i = 0; i < iframes.length; i++) {
            const frame = iframes[i]
            try {
              const images = await frame.locator('img').count()
              totalImages += images
              console.log(`  Frame ${i}: ${images} 张图片`)

              // 检查是否有base64图片
              const imageElements = await frame.locator('img').all()
              for (const img of imageElements) {
                const src = await img.getAttribute('src')
                if (src && src.includes('data:image')) {
                  icnImages++
                }
              }
            } catch (e) {
              // 跳过不可访问的frame
            }
          }

          console.log(`\n✅ 总计: ${totalImages} 张图片, ${icnImages} 张base64图片`)
        }
      }
    }
  } catch (e) {
    console.error('❌ 错误:', e.message)
  }
})
