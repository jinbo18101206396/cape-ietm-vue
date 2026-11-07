const { chromium } = require('playwright');

(async () => {
  console.log('\n=== 🔍 图片预览修复自动化验证 ===\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })

  const page = await context.newPage()

  // 收集控制台日志
  const consoleLogs = []
  page.on('console', msg => {
    const text = msg.text()
    consoleLogs.push(text)
    console.log(`[浏览器] ${text}`)
  })

  try {
    // 步骤1: 登录
    console.log('\n🔵 步骤1: 访问系统并登录...')
    await page.goto('http://localhost:3000/', { timeout: 30000 })
    await page.waitForTimeout(2000)

    // 填写登录信息
    await page.fill('input[placeholder*="账号"], input[type="text"]', 'admin')
    await page.fill('input[placeholder*="密码"], input[type="password"]', '123456')
    await page.click('button:has-text("登")')
    await page.waitForTimeout(5000)
    console.log('✅ 登录完成')

    // 步骤2: 进入数据模块管理
    console.log('\n🔵 步骤2: 进入数据模块管理...')
    await page.goto('http://localhost:3000/ietm/ietmdatamodulemanagement', { timeout: 30000 })
    await page.waitForTimeout(3000)

    // 搜索目标DM
    console.log('🔍 搜索目标DM...')
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="DMC"], input[placeholder*="编号"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('DMC-ZB1-A-07-00-00-00A-007A-A')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
    }

    // 点击编辑
    console.log('🔵 点击编辑按钮...')
    const editBtn = page.locator('button:has-text("编辑"), a:has-text("编辑")').first()
    await editBtn.waitFor({ state: 'visible', timeout: 10000 })
    await editBtn.click()
    await page.waitForTimeout(5000)
    console.log('✅ 编辑器已打开')

    // 步骤3: 切换到源码视图
    console.log('\n🔵 步骤3: 切换到源码视图...')
    const sourceTab = page.locator('[role="tab"]:has-text("源码"), .ant-tabs-tab:has-text("源码")').first()
    if (await sourceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sourceTab.click()
      await page.waitForTimeout(2000)
      console.log('✅ 已切换到源码视图')
    }

    // 步骤4: 点击预览
    console.log('\n🔵 步骤4: 点击预览按钮...')
    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.waitFor({ state: 'visible', timeout: 5000 })
    await previewBtn.click()
    console.log('✅ 预览按钮已点击')

    // 等待预览弹框
    await page.waitForTimeout(3000)
    const modal = page.locator('.ant-modal:visible, [role="dialog"]:visible').first()
    await modal.waitFor({ state: 'visible', timeout: 5000 })
    console.log('✅ 预览弹框已显示')

    // 等待iframe加载
    await page.waitForTimeout(5000)

    // 步骤5: 深度检查iframe中的图片
    console.log('\n🔵 步骤5: 检查iframe中的图片...')

    const diagnosticResult = await page.evaluate(() => {
      const results = {
        iframeCount: 0,
        totalImages: 0,
        images: [],
        selectorMatches: 0,
        matchedImages: [],
        filteredImages: 0,
        icnToLoad: []
      }

      // 查找所有iframe
      const iframes = document.querySelectorAll('iframe')
      results.iframeCount = iframes.length

      iframes.forEach((iframe, idx) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document

          // 所有图片
          const allImages = iframeDoc.querySelectorAll('img')
          results.totalImages += allImages.length

          allImages.forEach((img, imgIdx) => {
            results.images.push({
              frameIndex: idx,
              imageIndex: imgIdx,
              className: img.className,
              src: img.getAttribute('src'),
              dataIcnCode: img.getAttribute('data-icn-code'),
              boardno: img.getAttribute('boardno'),
              id: img.id,
              onclick: img.hasAttribute('onclick'),
              displayedSrc: img.src.substring(0, 100)
            })
          })

          // 测试选择器
          const matched = iframeDoc.querySelectorAll('img[data-icn-code], img.figureLinkGraphic[boardno]')
          results.selectorMatches += matched.length

          matched.forEach((img) => {
            const src = img.getAttribute('src') || ''
            const isPlaceholder = src.includes('.gif') || src.includes('avicit/')
            const shouldLoad = !isPlaceholder

            results.matchedImages.push({
              src: src,
              dataIcnCode: img.getAttribute('data-icn-code'),
              boardno: img.getAttribute('boardno'),
              className: img.className,
              isPlaceholder: isPlaceholder,
              shouldLoad: shouldLoad
            })

            if (shouldLoad) {
              results.filteredImages++
              const icnCode = img.getAttribute('data-icn-code') || img.getAttribute('boardno')
              if (icnCode) {
                results.icnToLoad.push(icnCode)
              }
            }
          })
        } catch (e) {
          // 无法访问iframe
        }
      })

      return results
    })

    // 输出诊断结果
    console.log('\n' + '='.repeat(60))
    console.log('📊 诊断结果')
    console.log('='.repeat(60))
    console.log(`Iframe数量: ${diagnosticResult.iframeCount}`)
    console.log(`总图片数: ${diagnosticResult.totalImages}`)
    console.log(`选择器匹配: ${diagnosticResult.selectorMatches}`)
    console.log(`应加载的图片: ${diagnosticResult.filteredImages}`)
    console.log(`ICN列表: ${diagnosticResult.icnToLoad.join(', ')}`)

    console.log('\n--- 所有图片详情 ---')
    diagnosticResult.images.forEach((img, i) => {
      console.log(`\n图片${i}:`)
      console.log(`  class: ${img.className}`)
      console.log(`  src: ${img.src}`)
      console.log(`  data-icn-code: ${img.dataIcnCode}`)
      console.log(`  boardno: ${img.boardno}`)
      console.log(`  onclick: ${img.onclick ? '有' : '无'}`)
    })

    console.log('\n--- 匹配到的图片详情 ---')
    diagnosticResult.matchedImages.forEach((img, i) => {
      console.log(`\n匹配图片${i}:`)
      console.log(`  src: ${img.src}`)
      console.log(`  data-icn-code: ${img.dataIcnCode}`)
      console.log(`  boardno: ${img.boardno}`)
      console.log(`  class: ${img.className}`)
      console.log(`  isPlaceholder: ${img.isPlaceholder}`)
      console.log(`  shouldLoad: ${img.shouldLoad}`)
    })

    // 检查浏览器控制台日志
    console.log('\n--- 浏览器控制台关键日志 ---')
    const keyLogs = consoleLogs.filter(log =>
      log.includes('🔍') || log.includes('✅') || log.includes('❌') ||
      log.includes('图符') || log.includes('ICN') || log.includes('找到')
    )

    if (keyLogs.length > 0) {
      keyLogs.forEach(log => console.log(log))
    } else {
      console.log('⚠️ 未找到相关日志，可能修改的代码未生效')
    }

    // 截图
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/playwright-test-result.png',
      fullPage: true
    })
    console.log('\n📸 截图已保存: tests/screenshots/playwright-test-result.png')

    // 分析结果
    console.log('\n' + '='.repeat(60))
    console.log('📋 问题分析')
    console.log('='.repeat(60))

    if (diagnosticResult.totalImages === 0) {
      console.log('❌ 问题: iframe中没有图片')
      console.log('   可能原因: XSLT转换失败或DM内容为空')
    } else if (diagnosticResult.selectorMatches === 0) {
      console.log('❌ 问题: 选择器没有匹配到图片')
      console.log('   可能原因:')
      console.log('   1. 图片没有 data-icn-code 属性')
      console.log('   2. 图片没有 boardno 属性')
      console.log('   3. 图片的 class 不是 figureLinkGraphic')
    } else if (diagnosticResult.filteredImages === 0) {
      console.log('❌ 问题: 图片被过滤逻辑排除了')
      console.log('   可能原因: src包含.gif或avicit/')
      console.log('   实际src值:', diagnosticResult.matchedImages.map(m => m.src).join(', '))
    } else if (diagnosticResult.icnToLoad.length === 0) {
      console.log('❌ 问题: 图片没有ICN代码')
      console.log('   可能原因: data-icn-code和boardno都为空')
    } else {
      console.log('✅ 过滤逻辑正确，找到需要加载的图片')
      console.log(`   ICN: ${diagnosticResult.icnToLoad.join(', ')}`)
      console.log('   检查浏览器控制台是否有"图符加载成功"的日志')
    }

    console.log('='.repeat(60))

    // 等待用户查看
    console.log('\n⏸️  等待20秒供查看...')
    await page.waitForTimeout(20000)
  } catch (error) {
    console.error('\n❌ 测试出错:', error.message)
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/playwright-error.png',
      fullPage: true
    })
  } finally {
    await browser.close()
    console.log('\n✅ 测试完成')
  }
})()
