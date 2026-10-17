import { test } from '@playwright/test'

test('ICN图符在DM预览中显示验证', async ({ browser }) => {
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

    // 直接打开编辑页面
    console.log('\n🔵 打开DM编辑页面...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN',
      { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 编辑页面已打开')

    // 寻找预览按钮（可能在工具栏或页面顶部）
    console.log('\n🔵 查找预览按钮...')

    // 尝试多种选择器找预览按钮
    const previewSelectors = [
      'button:has-text("预览")',
      'button[title*="预览"]',
      '.preview-btn',
      '[aria-label*="预览"]'
    ]

    let previewBtn = null
    for (const selector of previewSelectors) {
      try {
        const btn = page.locator(selector)
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          previewBtn = btn
          console.log(`✅ 通过选择器 "${selector}" 找到预览按钮`)
          break
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    if (previewBtn) {
      // 点击预览按钮
      await previewBtn.click()
      await page.waitForTimeout(2000)
      console.log('✅ 预览按钮已点击')

      // 截图查看预览内容
      await page.screenshot({ path: '/d/workspace/IETM/cape-ietm-vue/dm-preview.png' })
      console.log('✓ 预览截图已保存')

      // 等待对话框出现
      const dialog = await page.locator('[role="dialog"], .el-dialog, .ant-modal').isVisible({ timeout: 5000 }).catch(() => false)
      if (dialog) {
        console.log('✅ 预览对话框已打开')
        await page.waitForTimeout(1000)

        // 再次截图
        await page.screenshot({ path: '/d/workspace/IETM/cape-ietm-vue/dm-preview-dialog.png' })
      }

      // 检查iframe中的图片
      const iframes = page.frames()
      console.log(`\n📊 发现 ${iframes.length} 个frame`)

      let totalImages = 0
      let icnImages = 0
      let icnImageDetails = []

      for (let i = 0; i < iframes.length; i++) {
        const frame = iframes[i]
        try {
          const images = await frame.locator('img').count()
          if (images > 0) {
            console.log(`  Frame ${i}: ${images} 张图片`)
            totalImages += images

            const imageElements = await frame.locator('img').all()
            for (let j = 0; j < imageElements.length; j++) {
              const img = imageElements[j]
              const src = await img.getAttribute('src')
              const alt = await img.getAttribute('alt')

              if (src && src.includes('data:image')) {
                icnImages++
                icnImageDetails.push({
                  frameIndex: i,
                  imageIndex: j,
                  alt: alt,
                  srcPreview: src.substring(0, 100) + '...'
                })
              }
            }
          }
        } catch (e) {
          // 跳过不可访问的frame
        }
      }

      console.log(`\n✅ 统计结果:`)
      console.log(`  - 总计: ${totalImages} 张图片`)
      console.log(`  - ICN图符 (base64): ${icnImages} 张`)

      if (icnImages > 0) {
        console.log(`\n📋 ICN图符详情:`)
        icnImageDetails.forEach((detail, idx) => {
          console.log(`  ${idx + 1}. Frame${detail.frameIndex}-Img${detail.imageIndex} (alt: ${detail.alt})`)
        })
        console.log('\n✅ ✅ ✅ ICN图符已成功显示！')
      } else {
        console.log('\n❌ 未检测到ICN图符')
      }
    } else {
      console.log('❌ 未找到预览按钮')

      // 打印页面中所有的按钮供诊断
      const buttons = await page.locator('button').all()
      console.log(`\n📋 页面中的按钮 (总计 ${buttons.length} 个):`)
      for (let i = 0; i < Math.min(buttons.length, 20); i++) {
        const text = await buttons[i].textContent()
        console.log(`  ${i + 1}. "${text?.trim()}"`)
      }
    }

  } catch (e) {
    console.error('❌ 错误:', e.message)
    await page.screenshot({ path: '/d/workspace/IETM/cape-ietm-vue/error-screenshot.png' })
  } finally {
    await page.close()
  }
})
