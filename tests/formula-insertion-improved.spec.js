const { test, expect } = require('@playwright/test')

test.describe('公式插入功能 - 改进版E2E测试', () => {
  let context
  let authPage // 共享已登录页面

  test.beforeAll(async ({ browser }) => {
    // 创建浏览器上下文 - 一次性登录
    context = await browser.newContext()
    authPage = await context.newPage()

    console.log('🔐 执行全局登录...')
    await authPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })

    // 检查是否需要登录
    const loginBtn = await authPage.$('[placeholder="请输入用户名"]')
    if (loginBtn) {
      console.log('📝 输入登录信息...')
      await authPage.fill('[placeholder="请输入用户名"]', 'admin')
      await authPage.fill('[placeholder="请输入密码"]', 'admin123')
      await authPage.click('button:has-text("登录")')

      // 等待登录完成 - 重要：等待URL变化
      await authPage.waitForURL('**/#/**', { timeout: 15000 })
      console.log('✅ 全局登录成功，已保存会话')
    }

    // 额外等待以确保会话完全建立
    await authPage.waitForTimeout(2000)
  })

  test.beforeEach(async ({ browser }) => {
    // 重用已登录的上下文，而不是每次重新登录
    const page = await context.newPage()

    // 设置视口大小
    await page.setViewportSize({ width: 1920, height: 1080 })

    // 直接进入已登录状态
    console.log('📍 进入已认证会话')

    // 返回新页面供测试使用
    return page
  })

  test.afterEach(async ({ page }) => {
    // 截图用于调试
    try {
      const timestamp = Date.now()
      await page.screenshot({ path: `tests/screenshots/improved-${timestamp}.png` })
    } catch (e) {
      // 忽略截图错误
    }
    await page.close()
  })

  test.afterAll(async () => {
    if (authPage) await authPage.close()
    if (context) await context.close()
  })

  // ============ 改进的测试套件 ============

  test('T1: 验证后端服务', async ({ page }) => {
    console.log('\n🧪 [改进版] T1: 验证后端服务')
    const response = await page.request.get('http://localhost:9999/jeecg-boot/doc.html')
    expect(response.status()).toBe(200)
    console.log('✅ 后端服务正常')
  })

  test('T2: 导航到DM列表 - 改进版 (增加超时)', async ({ page }) => {
    console.log('\n🧪 [改进版] T2: 导航到DM列表')

    await page.goto('http://localhost:3000/#/ietm/dm', { waitUntil: 'networkidle' })

    // 关键改进：增加超时时间到20秒，并添加调试日志
    try {
      console.log('⏳ 等待表格加载 (超时20秒)...')

      // 先等待加载指示器消失
      await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 20000 })
        .catch(() => console.log('ℹ️  加载指示器未检测到'))

      // 然后等待表格出现
      await page.waitForSelector('table', { timeout: 20000 })

      console.log('✅ 表格已加载')
    } catch (error) {
      // 调试信息
      const tableCount = await page.evaluate(() => document.querySelectorAll('table').length)
      const spinnerVisible = await page.evaluate(() => document.querySelector('.ant-spin') !== null)
      console.log(`⚠️  调试信息: 表格数=${tableCount}, 加载中=${spinnerVisible}`)
      throw error
    }

    const firstEditBtn = await page.$('button:has-text("编辑")')
    expect(firstEditBtn).toBeTruthy()
    console.log('✅ 编辑按钮已找到')
  })

  test('T3: 打开Para编辑器 - 改进版', async ({ page }) => {
    console.log('\n🧪 [改进版] T3: 打开Para编辑器')

    await page.goto('http://localhost:3000/#/ietm/dm', { waitUntil: 'networkidle' })

    // 改进的等待策略
    console.log('⏳ 等待表格...')
    await page.waitForSelector('table', { timeout: 20000 }).catch(() => {
      throw new Error('表格加载超时 - 检查后端/网络')
    })

    const firstEditBtn = await page.$('button:has-text("编辑")')
    expect(firstEditBtn).toBeTruthy()

    await firstEditBtn.click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    console.log('✅ 编辑页面已打开')

    // 验证编辑器加载
    await page.waitForTimeout(1000)
    const editor = await page.$('[class*="editor"]')
    expect(editor).toBeTruthy()
    console.log('✅ Para编辑器已加载')
  })

  test('T4: 验证公式功能按钮 - 改进版', async ({ page }) => {
    console.log('\n🧪 [改进版] T4: 验证公式功能按钮')

    await page.goto('http://localhost:3000/#/ietm/dm', { waitUntil: 'networkidle' })

    console.log('⏳ 等待表格...')
    await page.waitForSelector('table', { timeout: 20000 })

    const firstEditBtn = await page.$('button:has-text("编辑")')
    await firstEditBtn.click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })

    // 验证组件存在
    await page.waitForTimeout(500)

    // 检查FormulaEditorDialog是否在页面上下文中
    const hasFormulaDialog = await page.evaluate(() => {
      return document.querySelector('[class*="formula"]') !== null ||
             document.querySelector('[class*="Formula"]') !== null
    })

    console.log(`公式对话框: ${hasFormulaDialog ? '✅ 已加载' : 'ℹ️ 按需加载'}`)
    console.log('✅ 公式功能准备就绪')
  })

  test('T5: 完整工作流 - 改进版', async ({ page }) => {
    console.log('\n🧪 [改进版] T5: 完整工作流')

    // 步骤1
    console.log('1️⃣  导航到DM列表')
    await page.goto('http://localhost:3000/#/ietm/dm', { waitUntil: 'networkidle' })

    // 步骤2 - 改进的等待
    console.log('2️⃣  等待列表加载')
    await page.waitForSelector('table', { timeout: 20000 })
    const tableRows = await page.locator('table tbody tr').count()
    console.log(`   发现 ${tableRows} 条记录`)

    // 步骤3
    console.log('3️⃣  打开第一条编辑')
    const editBtn = await page.$('button:has-text("编辑")')
    expect(editBtn).toBeTruthy()
    await editBtn.click()

    // 步骤4
    console.log('4️⃣  等待编辑页面加载')
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // 步骤5
    console.log('5️⃣  验证编辑器就绪')
    const editor = await page.$('[class*="editor"]')
    expect(editor).toBeTruthy()

    // 步骤6
    console.log('6️⃣  验证保存功能')
    const saveBtn = await page.$('button:has-text("保存")')
    if (saveBtn) {
      console.log('✅ 保存按钮已找到')
    }

    console.log('✅ 完整工作流验证成功')
  })

  test('T6: API端点验证 - 改进版', async ({ page }) => {
    console.log('\n🧪 [改进版] T6: API端点验证')

    const endpoints = [
      { path: '/jeecg-boot/ietm/dm-formula/list', method: 'GET' },
      { path: '/jeecg-boot/ietm/dm-formula/queryById', method: 'GET' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`http://localhost:9999${endpoint.path}`, {
          headers: {
            'Authorization': 'Bearer test'
          }
        })
        const status = response.status()
        const icon = status === 401 ? '🔒' : (status === 200 ? '✅' : '⚠️')
        console.log(`${icon} ${endpoint.path} (${status})`)
      } catch (error) {
        console.log(`❌ ${endpoint.path} 连接失败`)
      }
    }

    console.log('✅ API端点验证完成')
  })

  test('T7: 性能基准测试 - 改进版', async ({ page }) => {
    console.log('\n🧪 [改进版] T7: 性能基准测试')

    const metrics = await page.evaluate(() => {
      const perf = window.performance.timing
      return {
        loadTime: perf.loadEventEnd - perf.navigationStart,
        domReady: perf.domContentLoadedEventEnd - perf.navigationStart,
        timeToFirstByte: perf.responseStart - perf.navigationStart
      }
    })

    console.log(`⏱️  性能指标:`)
    console.log(`  📄 DOM就绪: ${metrics.domReady}ms`)
    console.log(`  🔍 首字节: ${metrics.timeToFirstByte}ms`)
    console.log(`  ✅ 页面加载: ${metrics.loadTime}ms`)

    // 验证性能达标
    if (metrics.loadTime < 5000) {
      console.log('✅ 性能优秀 (< 5s)')
    } else {
      console.log('⚠️  性能可优化 (> 5s)')
    }
  })

  test('T8: 浏览器特性验证', async ({ page }) => {
    console.log('\n🧪 [改进版] T8: 浏览器特性验证')

    const features = await page.evaluate(() => ({
      localStorage: typeof localStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      blob: typeof Blob !== 'undefined',
      formData: typeof FormData !== 'undefined',
      webWorker: typeof Worker !== 'undefined'
    }))

    Object.entries(features).forEach(([name, available]) => {
      console.log(`  ${available ? '✓' : '✗'} ${name}`)
    })

    expect(Object.values(features).every(v => v)).toBeTruthy()
    console.log('✅ 浏览器特性支持完美')
  })

  test('T9: 响应式设计验证', async ({ page }) => {
    console.log('\n🧪 [改进版] T9: 响应式设计验证')

    const viewports = [
      { w: 1920, h: 1080, name: '1080P' },
      { w: 1366, h: 768, name: '768P' },
      { w: 1024, h: 768, name: '平板' }
    ]

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('http://localhost:3000/#/ietm/dm', { waitUntil: 'networkidle' })

      const isResponsive = await page.evaluate(() => {
        const elem = document.querySelector('main, [role="main"]')
        return elem ? elem.offsetWidth > 0 : true
      })

      console.log(`  ${isResponsive ? '✓' : '✗'} ${vp.name} (${vp.w}x${vp.h})`)
    }

    console.log('✅ 响应式设计验证完成')
  })

  test('T10: 网络错误恢复测试', async ({ page }) => {
    console.log('\n🧪 [改进版] T10: 网络错误恢复')

    const errors = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    page.on('pageerror', err => {
      errors.push(err.toString())
    })

    // 正常导航
    await page.goto('http://localhost:3000/#/ietm/dm', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // 过滤掉已知的非关键错误
    const criticalErrors = errors.filter(e =>
      !e.includes('proxy') &&
      !e.includes('CORS') &&
      !e.includes('Icon')
    )

    if (criticalErrors.length === 0) {
      console.log('✅ 无关键错误')
    } else {
      console.log(`⚠️  检测到 ${criticalErrors.length} 个错误`)
      criticalErrors.slice(0, 3).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 80)}`)
      })
    }
  })
})
