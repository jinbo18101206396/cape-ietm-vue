import { test, expect } from '@playwright/test'

/**
 * 🔧 2026-11-04 图片预览修复验证测试 - 简化版
 * 假设前端服务已在 http://localhost:3000 运行
 */

test.describe('图片预览修复验证 - 简化版', () => {
  test('完整流程：登录→编辑→预览→验证图片', async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(120000)

    // 监听控制台日志
    const consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      if (text.includes('🔍') || text.includes('✅') || text.includes('❌') ||
          text.includes('图符') || text.includes('ICN') || text.includes('找到')) {
        console.log(`[浏览器] ${text}`)
      }
    })

    try {
      // 步骤1：登录
      console.log('\n🔵 步骤1: 登录系统...')
      await page.goto('http://localhost:3000/', { timeout: 30000 })
      await page.waitForTimeout(2000)

      await page.fill('input[placeholder*="账号"], input[type="text"]', 'admin')
      await page.fill('input[placeholder*="密码"], input[type="password"]', '123456')
      await page.click('button:has-text("登")')
      await page.waitForTimeout(5000)
      console.log('✅ 登录完成')

      // 步骤2：直接访问编辑器URL
      console.log('\n🔵 步骤2: 打开编辑器...')
      // 尝试通过数据模块列表
      await page.goto('http://localhost:3000/ietm/ietmdatamodulemanagement', { timeout: 30000 })
      await page.waitForTimeout(3000)

      // 搜索DM
      const searchBox = page.locator('input[placeholder*="搜索"], input[placeholder*="DMC"], input[placeholder*="编号"]').first()
      if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchBox.fill('DMC-ZB1-A-07-00-00-00A-007A-A')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(2000)
      }

      // 点击编辑按钮
      const editBtn = page.locator('button:has-text("编辑"), a:has-text("编辑")').first()
      if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editBtn.click()
        await page.waitForTimeout(5000)
        console.log('✅ 编辑器已打开')
      }

      // 步骤3：切换到源码视图并预览
      console.log('\n🔵 步骤3: 切换到源码视图...')
      const sourceTab = page.locator('[role="tab"]:has-text("源码"), .ant-tabs-tab:has-text("源码")').first()
      if (await sourceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sourceTab.click()
        await page.waitForTimeout(2000)
        console.log('✅ 已切换到源码视图')
      }

      // 步骤4：点击预览
      console.log('\n🔵 步骤4: 点击预览按钮...')
      const previewBtn = page.locator('button:has-text("预览")').first()
      await previewBtn.waitFor({ state: 'visible', timeout: 5000 })
      await previewBtn.click()
      await page.waitForTimeout(3000)
      console.log('✅ 预览按钮已点击')

      // 等待预览弹框
      const modal = page.locator('.ant-modal:visible, [role="dialog"]:visible').first()
      await modal.waitFor({ state: 'visible', timeout: 5000 })
      console.log('✅ 预览弹框已显示')

      // 等待iframe加载
      await page.waitForTimeout(5000)

      // 步骤5：检查图片
      console.log('\n🔵 步骤5: 检查图片加载情况...')

      const frames = page.frames()
      console.log(`📊 页面共有 ${frames.length} 个frame`)

      let results = {
        totalImages: 0,
        graphicImages: 0,
        loadedImages: 0,
        icnCode: null
      }

      // 遍历所有frame
      for (const frame of frames) {
        try {
          const images = await frame.locator('img').all()

          for (const img of images) {
            const src = await img.getAttribute('src').catch(() => '')
            const className = await img.getAttribute('class').catch(() => '')
            const dataIcnCode = await img.getAttribute('data-icn-code').catch(() => '')

            if (src) {
              results.totalImages++

              // 检查是否为graphic图片
              if (className && className.includes('figureLinkGraphic')) {
                results.graphicImages++
                console.log(`\n📋 发现<graphic>图片:`)
                console.log(`   class: ${className}`)
                console.log(`   data-icn-code: ${dataIcnCode}`)
                console.log(`   src: ${src.substring(0, 100)}...`)

                // 检查是否已加载
                if (src.startsWith('data:image')) {
                  results.loadedImages++
                  results.icnCode = dataIcnCode
                  console.log(`   ✅ 图片已成功加载！`)
                } else {
                  console.log(`   ⚠️ 图片未加载 (src=${src})`)
                }
              }
            }
          }
        } catch (e) {
          // 跳过无法访问的frame
        }
      }

      // 输出结果
      console.log('\n' + '='.repeat(60))
      console.log('📊 测试结果')
      console.log('='.repeat(60))
      console.log(`总图片数: ${results.totalImages}`)
      console.log(`<graphic>图片数: ${results.graphicImages}`)
      console.log(`成功加载的图片: ${results.loadedImages}`)
      console.log(`ICN编号: ${results.icnCode || '未检测到'}`)
      console.log('='.repeat(60))

      // 检查控制台日志
      console.log('\n🔍 浏览器控制台日志分析:')
      const foundICNLog = consoleLogs.some(log => log.includes('找到') && log.includes('个需要加载的ICN'))
      const loadSuccessLog = consoleLogs.some(log => log.includes('✅') && log.includes('图符加载成功'))

      console.log(`  - "找到 N 个需要加载的ICN": ${foundICNLog ? '✅ 存在' : '❌ 未找到'}`)
      console.log(`  - "图符加载成功": ${loadSuccessLog ? '✅ 存在' : '❌ 未找到'}`)

      // 断言
      if (results.loadedImages > 0) {
        console.log('\n✅ ✅ ✅ 测试通过！图片预览修复成功！')
      } else {
        console.log('\n❌ 测试失败：图片未成功加载')
      }

      expect(results.graphicImages).toBeGreaterThan(0)
      expect(results.loadedImages).toBeGreaterThan(0)

      // 截图
      await page.screenshot({
        path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/final-preview.png',
        fullPage: true
      })
      console.log('\n📸 最终截图已保存')

    } catch (error) {
      console.error('\n❌ 测试出错:', error.message)
      await page.screenshot({
        path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/error.png',
        fullPage: true
      })
      throw error
    }
  })
})
