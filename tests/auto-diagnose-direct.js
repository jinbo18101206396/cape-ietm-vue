const { chromium } = require('playwright');

(async () => {
  console.log('\n=== 🔍 图片预览修复自动化验证（直接URL版本）===\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
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
    // 只打印关键日志
    if (text.includes('🔍') || text.includes('✅') || text.includes('❌') ||
        text.includes('图符') || text.includes('ICN') || text.includes('找到') ||
        text.includes('候选图片') || text.includes('过滤图片')) {
      console.log(`[浏览器] ${text}`)
    }
  })

  try {
    // 步骤1: 登录
    console.log('🔵 步骤1: 登录系统...')
    await page.goto('http://localhost:3000/', { timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.fill('input[placeholder*="账号"], input[type="text"]', 'admin')
    await page.fill('input[placeholder*="密码"], input[type="password"]', '123456')
    await page.click('button:has-text("登")')
    await page.waitForTimeout(5000)
    console.log('✅ 登录完成\n')

    // 步骤2: 直接访问编辑页面
    console.log('🔵 步骤2: 直接访问编辑页面...')
    const editUrl = 'http://localhost:3000/ietm/dm-content-editor/2117143083714949122?mode=edit&dmc=DMC-ZB1-A-07-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(editUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('✅ 编辑页面已打开\n')

    // 步骤3: 切换到源码视图
    console.log('🔵 步骤3: 切换到源码视图...')
    const sourceTab = page.locator('[role="tab"]:has-text("源码"), .ant-tabs-tab:has-text("源码")').first()
    if (await sourceTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sourceTab.click()
      await page.waitForTimeout(2000)
      console.log('✅ 已切换到源码视图\n')
    } else {
      console.log('⚠️ 未找到源码视图标签，可能已经在源码视图\n')
    }

    // 步骤4: 点击预览
    console.log('🔵 步骤4: 点击预览按钮...')
    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.waitFor({ state: 'visible', timeout: 10000 })
    await previewBtn.click()
    console.log('✅ 预览按钮已点击\n')

    // 等待预览弹框和内容加载
    await page.waitForTimeout(3000)
    console.log('⏳ 等待预览内容加载...')
    await page.waitForTimeout(5000)
    console.log('✅ 等待完成\n')

    // 步骤5: 检查iframe中的图片
    console.log('🔵 步骤5: 检查iframe中的图片...\n')

    const diagnosticResult = await page.evaluate(() => {
      const results = {
        iframeCount: 0,
        totalImages: 0,
        images: [],
        selectorMatches: 0,
        matchedImages: [],
        filteredCount: 0,
        icnToLoad: []
      }

      const iframes = document.querySelectorAll('iframe')
      results.iframeCount = iframes.length

      iframes.forEach((iframe, idx) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
          const allImages = iframeDoc.querySelectorAll('img')
          results.totalImages += allImages.length

          allImages.forEach((img, imgIdx) => {
            const imgInfo = {
              frameIndex: idx,
              imageIndex: imgIdx,
              className: img.className,
              src: img.getAttribute('src'),
              dataIcnCode: img.getAttribute('data-icn-code'),
              boardno: img.getAttribute('boardno'),
              id: img.id,
              onclick: img.getAttribute('onclick'),
              actualSrc: img.src.substring(0, 150)
            }
            results.images.push(imgInfo)
          })

          // 测试选择器
          const matched = iframeDoc.querySelectorAll('img[data-icn-code], img.figureLinkGraphic[boardno]')
          results.selectorMatches += matched.length

          matched.forEach((img) => {
            const src = img.getAttribute('src') || ''
            const isPlaceholder = src.includes('.gif') || src.includes('avicit/')
            const shouldLoad = !isPlaceholder
            const icnCode = img.getAttribute('data-icn-code') || img.getAttribute('boardno')

            const matchInfo = {
              src: src,
              dataIcnCode: img.getAttribute('data-icn-code'),
              boardno: img.getAttribute('boardno'),
              className: img.className,
              isPlaceholder: isPlaceholder,
              shouldLoad: shouldLoad,
              icnCode: icnCode
            }
            results.matchedImages.push(matchInfo)

            if (shouldLoad) {
              results.filteredCount++
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
    console.log('='.repeat(70))
    console.log('📊 诊断结果摘要')
    console.log('='.repeat(70))
    console.log(`Iframe数量:      ${diagnosticResult.iframeCount}`)
    console.log(`总图片数:        ${diagnosticResult.totalImages}`)
    console.log(`选择器匹配数:    ${diagnosticResult.selectorMatches}`)
    console.log(`过滤后应加载数:  ${diagnosticResult.filteredCount}`)
    console.log(`ICN代码列表:     ${diagnosticResult.icnToLoad.length > 0 ? diagnosticResult.icnToLoad.join(', ') : '无'}`)
    console.log('='.repeat(70))

    if (diagnosticResult.totalImages > 0) {
      console.log('\n--- 📋 所有图片详情 ---')
      diagnosticResult.images.forEach((img, i) => {
        console.log(`\n图片 #${i}:`)
        console.log(`  class:         ${img.className || '(空)'}`)
        console.log(`  src:           ${img.src || '(空)'}`)
        console.log(`  data-icn-code: ${img.dataIcnCode || '(空)'}`)
        console.log(`  boardno:       ${img.boardno || '(空)'}`)
        console.log(`  id:            ${img.id || '(空)'}`)
        console.log(`  onclick:       ${img.onclick ? '有' : '无'}`)
        console.log(`  实际显示src:   ${img.actualSrc}`)
      })
    }

    if (diagnosticResult.matchedImages.length > 0) {
      console.log('\n--- 📋 选择器匹配的图片 ---')
      diagnosticResult.matchedImages.forEach((img, i) => {
        console.log(`\n匹配图片 #${i}:`)
        console.log(`  src:           ${img.src}`)
        console.log(`  data-icn-code: ${img.dataIcnCode || '(空)'}`)
        console.log(`  boardno:       ${img.boardno || '(空)'}`)
        console.log(`  class:         ${img.className}`)
        console.log(`  ICN代码:       ${img.icnCode || '(空)'}`)
        console.log(`  是占位图标:    ${img.isPlaceholder ? '是' : '否'}`)
        console.log(`  应该加载:      ${img.shouldLoad ? '是' : '否'}`)
      })
    }

    // 浏览器控制台关键日志
    console.log('\n--- 📋 浏览器控制台关键日志 ---')
    const keyLogs = consoleLogs.filter(log =>
      log.includes('🔍') || log.includes('✅') || log.includes('❌') ||
      log.includes('图符') || log.includes('ICN') || log.includes('找到') ||
      log.includes('候选') || log.includes('过滤')
    )

    if (keyLogs.length > 0) {
      keyLogs.forEach(log => console.log(`  ${log}`))
    } else {
      console.log('  ⚠️ 未找到关键日志（可能修改未生效或日志被过滤）')
    }

    // 截图
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/auto-test-final.png',
      fullPage: true
    })
    console.log('\n📸 截图已保存: tests/screenshots/auto-test-final.png')

    // 问题分析
    console.log('\n' + '='.repeat(70))
    console.log('🔍 问题分析')
    console.log('='.repeat(70))

    if (diagnosticResult.totalImages === 0) {
      console.log('❌ 【问题】iframe中没有图片')
      console.log('   【原因】DM内容为空或XSLT转换失败')
      console.log('   【建议】检查XML源码中是否有<graphic>标签')
    } else if (diagnosticResult.selectorMatches === 0) {
      console.log('❌ 【问题】选择器没有匹配到任何图片')
      console.log('   【原因】图片缺少必需的属性：')
      console.log('          - 没有 data-icn-code 属性')
      console.log('          - 或者没有 boardno 属性 + figureLinkGraphic class')
      console.log('   【建议】检查XSLT是否正确生成这些属性')
    } else if (diagnosticResult.filteredCount === 0) {
      console.log('❌ 【问题】图片被过滤逻辑排除了')
      console.log('   【原因】图片的src包含.gif或avicit/')
      console.log(`   【实际src】${diagnosticResult.matchedImages.map(m => m.src).join(', ')}`)
      console.log('   【建议】检查src值是否正确，或调整过滤条件')
    } else if (diagnosticResult.icnToLoad.length === 0) {
      console.log('❌ 【问题】图片没有有效的ICN代码')
      console.log('   【原因】data-icn-code和boardno都为空')
      console.log('   【建议】检查XSLT是否正确提取infoEntityIdent属性')
    } else {
      console.log('✅ 【状态】过滤逻辑正确，找到需要加载的图片')
      console.log(`   【ICN】${diagnosticResult.icnToLoad.join(', ')}`)
      console.log('   【下一步】检查浏览器控制台是否有"图符加载成功"日志')
      console.log('   【如果没有】可能是ICN加载API出错（401/404等）')
    }

    console.log('='.repeat(70))

    // 等待查看
    console.log('\n⏸️  保持浏览器打开30秒供查看...')
    await page.waitForTimeout(30000)
  } catch (error) {
    console.error('\n❌ 测试出错:', error.message)
    console.error('堆栈:', error.stack)
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/auto-test-error.png',
      fullPage: true
    })
  } finally {
    await browser.close()
    console.log('\n✅ 测试完成')
  }
})()
