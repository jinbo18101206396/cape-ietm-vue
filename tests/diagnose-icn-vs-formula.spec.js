import { test } from '@playwright/test'

test('诊断: ICN图符vs公式图片显示', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
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
    await page.waitForTimeout(2000)

    // 检查所有frame中的内容和图片
    const iframes = page.frames()
    console.log(`\n📊 总共 ${iframes.length} 个frame\n`)

    for (let i = 0; i < iframes.length; i++) {
      const frame = iframes[i]
      try {
        console.log(`\n【Frame ${i}】`)

        // 获取HTML内容
        const html = await frame.content()

        // 查找所有img标签
        const imgMatches = html.match(/<img[^>]*>/g) || []
        console.log(`  找到 ${imgMatches.length} 个img标签`)

        // 分析每个img标签
        const images = await frame.locator('img').all()
        for (let j = 0; j < images.length; j++) {
          const img = images[j]
          const src = await img.getAttribute('src')
          const alt = await img.getAttribute('alt')
          const title = await img.getAttribute('title')
          const style = await img.getAttribute('style')

          // 判断图片类型
          let type = '未知'
          if (src && src.includes('data:image')) {
            if (src.includes('image/svg')) {
              type = '📈 SVG图片 (可能是公式或图符)'
            } else if (src.includes('image/png') || src.includes('image/jpeg')) {
              type = '🖼️ 栅格图片 (PNG/JPEG)'
            }
          } else if (src) {
            type = '🔗 外部链接'
          }

          console.log(`  \n  [图片 ${j + 1}] ${type}`)
          console.log(`    alt: "${alt || '(空)'}"`)
          console.log(`    title: "${title || '(空)'}"`)
          console.log(`    src长度: ${src?.length || 0}字符`)
          if (src?.length > 200) {
            console.log(`    src预览: ${src.substring(0, 150)}...`)
          } else {
            console.log(`    src: ${src}`)
          }

          // 检查是否可见
          const isVisible = await img.isVisible().catch(() => false)
          console.log(`    可见性: ${isVisible ? '✅ 可见' : '❌ 不可见'}`)

          // 检查尺寸
          const box = await img.boundingBox()
          if (box) {
            console.log(`    尺寸: ${box.width}x${box.height}px`)
          }
        }

        // 查找是否有包含"ICN"或"图符"的文本
        const bodyText = await frame.locator('body').textContent()
        if (bodyText?.includes('图符') || bodyText?.includes('ICN')) {
          console.log(`  \n  ⚠️ 页面包含"图符"或"ICN"文本`)
        }

      } catch (e) {
        console.log(`  ❌ 无法访问此frame: ${e.message}`)
      }
    }

    // 截图
    await page.screenshot({ path: '/d/workspace/IETM/cape-ietm-vue/diagnostic-icn-content.png' })
    console.log('\n✓ 诊断截图已保存')

  } catch (e) {
    console.error('\n❌ 错误:', e.message)
  } finally {
    await page.close()
  }
})
