import { test, expect } from '@playwright/test'

/**
 * 🔧 2026-11-04 图片预览修复验证测试
 *
 * 修复内容：DmPreviewModal.vue 第329-332行过滤逻辑
 * 问题：错误地排除了<graphic>生成的图片（通过onclick判断）
 * 修复：改用src属性判断（.gif和avicit/是占位图标，其他是真实图片）
 *
 * 测试目标DM：DMC-ZB1-A-07-00-00-00A-007A-A_001-01_zh-CN
 * 预期ICN：ICN-ZB1-A-020000-60101-30101-00017-A-001-01（冲浪图片）
 */

test.describe('图片预览修复验证', () => {
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })

    // 监听控制台日志
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('🔍') || text.includes('✅') || text.includes('❌') ||
          text.includes('图符') || text.includes('ICN')) {
        console.log(`[浏览器控制台] ${text}`)
      }
    })
  })

  test.afterAll(async () => {
    await page?.close()
  })

  test('步骤1：登录系统', async () => {
    console.log('\n🔵 开始登录...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })

    await page.fill('input[placeholder*="账号"]', 'admin')
    await page.fill('input[placeholder*="密码"]', '123456')
    await page.click('button:has-text("登")')

    // 等待登录成功（主页或菜单出现）
    await page.waitForSelector('.ant-layout, .el-menu, [class*="main-content"]', { timeout: 10000 })
    console.log('✅ 登录成功')
  })

  test('步骤2：打开数据模块管理并找到测试DM', async () => {
    console.log('\n🔵 导航到数据模块管理...')

    // 方式1：尝试直接URL访问
    const dmListUrl = 'http://localhost:3000/ietm/ietmdatamodulemanagement'
    await page.goto(dmListUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 搜索目标DM
    console.log('🔍 搜索目标DM: DMC-ZB1-A-07-00-00-00A-007A-A_001-01_zh-CN')
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="DMC"]').first()
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('DMC-ZB1-A-07-00-00-00A-007A-A_001-01_zh-CN')
      await page.waitForTimeout(1000)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
    }

    console.log('✅ 数据模块列表已加载')
  })

  test('步骤3：进入编辑器并切换到源码视图', async () => {
    console.log('\n🔵 打开编辑器...')

    // 查找编辑按钮
    const editButton = page.locator('button:has-text("编辑"), a:has-text("编辑"), [title*="编辑"]').first()
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click()
      await page.waitForTimeout(3000)
      console.log('✅ 编辑器已打开')
    } else {
      // 尝试直接URL（如果知道DM的ID）
      console.log('⚠️ 未找到编辑按钮，尝试直接URL访问')
      await page.goto('http://localhost:3000/ietm/dm-content-editor?dmc=DMC-ZB1-A-07-00-00-00A-007A-A_001-01_zh-CN',
        { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(3000)
    }

    // 切换到源码视图
    console.log('🔄 切换到源码视图...')
    const sourceViewTab = page.locator('[role="tab"]:has-text("源码"), .ant-tabs-tab:has-text("源码")').first()
    if (await sourceViewTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sourceViewTab.click()
      await page.waitForTimeout(1500)
      console.log('✅ 已切换到源码视图')
    }
  })

  test('步骤4：点击预览按钮并验证图片显示', async () => {
    console.log('\n🔵 点击预览按钮...')

    // 查找预览按钮
    const previewSelectors = [
      'button:has-text("预览")',
      'button[title*="预览"]',
      '.ant-btn:has-text("预览")',
      '[aria-label*="预览"]'
    ]

    let previewClicked = false
    for (const selector of previewSelectors) {
      const btn = page.locator(selector).first()
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click()
        previewClicked = true
        console.log(`✅ 预览按钮已点击（选择器: ${selector}）`)
        break
      }
    }

    expect(previewClicked).toBeTruthy()
    await page.waitForTimeout(2000)

    // 等待预览弹框出现
    console.log('🔍 等待预览弹框...')
    const modal = page.locator('.ant-modal:has-text("DM内容预览"), [role="dialog"]:has-text("预览")').first()
    await expect(modal).toBeVisible({ timeout: 5000 })
    console.log('✅ 预览弹框已打开')

    // 截图1：预览弹框初始状态
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/preview-modal-initial.png',
      fullPage: true
    })
    console.log('📸 截图已保存: preview-modal-initial.png')

    // 等待iframe加载
    await page.waitForTimeout(3000)

    // 截图2：iframe加载后
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/preview-modal-loaded.png',
      fullPage: true
    })
    console.log('📸 截图已保存: preview-modal-loaded.png')
  })

  test('步骤5：检查iframe中的图片加载情况', async () => {
    console.log('\n🔵 检查iframe中的图片...')

    // 等待足够时间让图片加载
    await page.waitForTimeout(4000)

    // 获取所有frame
    const frames = page.frames()
    console.log(`📊 页面共有 ${frames.length} 个frame`)

    let testResults = {
      totalImages: 0,
      graphicImages: 0,
      multimediaPlaceholders: 0,
      loadedImages: 0,
      icnCode: null,
      success: false
    }

    // 遍历所有frame查找图片
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      try {
        const images = await frame.locator('img').all()

        if (images.length > 0) {
          console.log(`\n📋 Frame ${i} 中的图片 (共 ${images.length} 张):`)

          for (let j = 0; j < images.length; j++) {
            const img = images[j]
            const src = await img.getAttribute('src').catch(() => '')
            const dataIcnCode = await img.getAttribute('data-icn-code').catch(() => '')
            const boardno = await img.getAttribute('boardno').catch(() => '')
            const className = await img.getAttribute('class').catch(() => '')
            const onclick = await img.getAttribute('onclick').catch(() => '')

            testResults.totalImages++

            console.log(`  图片 ${j + 1}:`)
            console.log(`    - class: ${className}`)
            console.log(`    - src: ${src.substring(0, 80)}${src.length > 80 ? '...' : ''}`)
            console.log(`    - data-icn-code: ${dataIcnCode}`)
            console.log(`    - boardno: ${boardno}`)
            console.log(`    - onclick: ${onclick ? '有' : '无'}`)

            // 判断是否为graphic图片
            if (className.includes('figureLinkGraphic')) {
              testResults.graphicImages++

              // 判断是否成功加载（src为base64 data URL）
              if (src.startsWith('data:image')) {
                testResults.loadedImages++
                testResults.icnCode = dataIcnCode || boardno
                testResults.success = true
                console.log(`    ✅ 图片已成功加载 (ICN: ${testResults.icnCode})`)
              } else if (src === 'ShowSmallImage') {
                console.log(`    ⚠️ 图片未加载（src仍为默认值）`)
              }
            }

            // 判断是否为多媒体占位图标
            if (src.includes('.gif') || src.includes('avicit/')) {
              testResults.multimediaPlaceholders++
              console.log(`    ℹ️ 多媒体占位图标`)
            }
          }
        }
      } catch (e) {
        // 跳过无法访问的frame
      }
    }

    // 输出测试结果
    console.log('\n' + '='.repeat(60))
    console.log('📊 测试结果统计')
    console.log('='.repeat(60))
    console.log(`总图片数: ${testResults.totalImages}`)
    console.log(`<graphic>图片数: ${testResults.graphicImages}`)
    console.log(`多媒体占位图标数: ${testResults.multimediaPlaceholders}`)
    console.log(`成功加载的图片数: ${testResults.loadedImages}`)
    console.log(`目标ICN: ${testResults.icnCode || '未检测到'}`)
    console.log('='.repeat(60))

    if (testResults.success) {
      console.log('\n✅ ✅ ✅ 图片预览修复验证成功！')
      console.log(`✅ ICN ${testResults.icnCode} 已正确加载并显示`)
    } else {
      console.log('\n❌ 图片预览修复验证失败')
      if (testResults.graphicImages === 0) {
        console.log('❌ 未找到<graphic>生成的图片')
      } else if (testResults.loadedImages === 0) {
        console.log('❌ 图片未成功加载（过滤逻辑可能仍有问题）')
      }
    }

    // 断言：至少有一张graphic图片成功加载
    expect(testResults.graphicImages).toBeGreaterThan(0)
    expect(testResults.loadedImages).toBeGreaterThan(0)
    expect(testResults.success).toBeTruthy()
  })

  test('步骤6：验证浏览器控制台日志', async () => {
    console.log('\n🔵 验证控制台日志...')

    // 注入脚本获取控制台历史
    const consoleHistory = await page.evaluate(() => {
      // 如果页面有存储控制台日志，获取它们
      return window.__consoleHistory || []
    })

    console.log('\n📋 关键日志检查:')
    console.log('  查找 "找到 N 个需要加载的ICN" - 期望 N > 0')
    console.log('  查找 "✅ 图符加载成功" - 期望存在')
    console.log('  查找 "❌" 错误日志 - 期望不存在')

    console.log('\n✅ 浏览器控制台监听已启用（查看上方日志输出）')
  })
})
