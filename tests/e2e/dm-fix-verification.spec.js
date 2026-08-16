/**
 * IETM DM内容编辑器 - 核心修复验证测试
 *
 * 测试目标：验证关闭页面时不再出现"DM不存在"错误
 *
 * 运行方式：
 *   npx playwright test tests/e2e/dm-fix-verification.spec.js --headed
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('DM编辑器修复验证 - 核心测试', () => {

  // 跳过登录，假设已登录或使用Cookie
  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间
    page.setDefaultTimeout(30000)

    console.log('🔧 测试准备：访问应用...')
  })

  /**
   * 核心测试：验证关闭页面不会触发 /load/undefined 请求
   */
  test('验证关闭页面不触发undefined请求', async ({ page }) => {
    console.log('\n🧪 开始核心测试：验证关闭页面不触发undefined请求')

    // 监听所有请求
    const requests = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/ietm/dm-content/load/')) {
        requests.push({
          url: url,
          method: request.method()
        })
        console.log('📡 捕获到加载请求:', url)
      }
    })

    // 监听所有失败的响应
    const failedRequests = []
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/ietm')) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        })
        console.log('❌ 捕获到失败请求:', response.url(), response.status())
      }
    })

    // 监听控制台错误
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
        console.log('🔴 控制台错误:', msg.text())
      }
    })

    try {
      // 步骤1: 访问首页
      console.log('📍 步骤1: 访问首页')
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      console.log('✅ 首页加载完成')

      // 步骤2: 尝试导航到DM管理（如果有权限）
      console.log('📍 步骤2: 尝试访问DM管理页面')

      // 检查是否需要登录
      const loginVisible = await page.locator('input[placeholder*="账号"],input[placeholder*="用户名"]').isVisible().catch(() => false)

      if (loginVisible) {
        console.log('⚠️  需要登录，尝试登录...')
        await page.fill('input[placeholder*="账号"],input[placeholder*="用户名"]', 'admin')
        await page.fill('input[placeholder*="密码"]', 'admin123')
        await page.click('button:has-text("登录")')
        await page.waitForTimeout(3000)
        console.log('✅ 登录完成')
      }

      // 步骤3: 直接访问DM编辑器URL（模拟已打开的场景）
      console.log('📍 步骤3: 直接访问DM编辑器URL')

      // 场景A: 访问有效ID的编辑器
      const validDmId = '1234567890' // 假设的ID
      await page.goto(`${BASE_URL}/#/ietm/dm-editor/${validDmId}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      }).catch(e => {
        console.log('⚠️  访问DM编辑器URL失败（可能是权限问题）:', e.message)
      })

      await page.waitForTimeout(2000)
      console.log('✅ DM编辑器页面已访问')

      // 步骤4: 模拟关闭页面（刷新或返回）
      console.log('📍 步骤4: 模拟关闭页面操作')

      // 清空之前的请求记录
      requests.length = 0
      failedRequests.length = 0

      // 触发页面关闭（通过导航回首页）
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })

      // 等待可能的异步请求
      await page.waitForTimeout(3000)

      console.log('✅ 页面关闭操作完成')

      // 验证结果
      console.log('\n📊 测试结果验证:')
      console.log(`  捕获的加载请求数: ${requests.length}`)
      console.log(`  失败的请求数: ${failedRequests.length}`)
      console.log(`  控制台错误数: ${consoleErrors.length}`)

      // 关键验证：不应该有 /load/undefined 请求
      const undefinedRequests = requests.filter(req => req.url.includes('undefined'))
      console.log(`  包含undefined的请求数: ${undefinedRequests.length}`)

      if (undefinedRequests.length > 0) {
        console.log('❌ 发现undefined请求:')
        undefinedRequests.forEach(req => console.log('   -', req.url))
      }

      // 断言：不应该有undefined请求
      expect(undefinedRequests.length).toBe(0)

      // 断言：不应该有"DM不存在"的错误
      const dmNotExistErrors = consoleErrors.filter(err =>
        err.includes('DM不存在') || err.includes('DM ID无效')
      )
      expect(dmNotExistErrors.length).toBe(0)

      console.log('\n✅ 核心测试通过！未发现 /load/undefined 请求')

    } catch (error) {
      console.error('❌ 测试执行出错:', error.message)

      // 打印详细信息
      console.log('\n📋 请求记录:')
      requests.forEach(req => console.log('  -', req.url))

      console.log('\n📋 失败请求:')
      failedRequests.forEach(req => console.log('  -', req.url, req.status))

      console.log('\n📋 控制台错误:')
      consoleErrors.forEach(err => console.log('  -', err))

      throw error
    }
  })

  /**
   * 边界测试：直接访问undefined ID的URL
   */
  test('验证访问undefined ID不发起请求', async ({ page }) => {
    console.log('\n🧪 开始边界测试：验证访问undefined ID不发起请求')

    const requests = []
    page.on('request', request => {
      if (request.url().includes('/ietm/dm-content/load/')) {
        requests.push(request.url())
        console.log('📡 捕获到请求:', request.url())
      }
    })

    const consoleWarnings = []
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'log') {
        const text = msg.text()
        if (text.includes('ID无效') || text.includes('页面正在关闭')) {
          consoleWarnings.push(text)
          console.log('⚠️  控制台输出:', text)
        }
      }
    })

    try {
      // 直接访问undefined ID的URL
      console.log('📍 访问 /ietm/dm-editor/undefined')
      await page.goto(`${BASE_URL}/#/ietm/dm-editor/undefined`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      }).catch(e => {
        console.log('⚠️  访问URL失败（预期行为）:', e.message)
      })

      // 等待可能的请求
      await page.waitForTimeout(3000)

      // 验证：不应该有真实的API请求
      const undefinedRequests = requests.filter(url => url.includes('undefined'))

      console.log('\n📊 验证结果:')
      console.log(`  捕获的undefined请求: ${undefinedRequests.length}`)
      console.log(`  警告日志数: ${consoleWarnings.length}`)

      // 断言：不应该有请求
      expect(undefinedRequests.length).toBe(0)

      // 可选：应该有警告日志
      if (consoleWarnings.length > 0) {
        console.log('✅ 检测到预期的警告日志（ID无效）')
      }

      console.log('\n✅ 边界测试通过！undefined ID未触发请求')

    } catch (error) {
      console.error('❌ 边界测试失败:', error.message)
      console.log('📋 请求记录:', requests)
      throw error
    }
  })
})

// 生成测试报告
test.afterAll(async () => {
  console.log('\n' + '='.repeat(60))
  console.log('  DM编辑器修复验证 - 测试完成')
  console.log('='.repeat(60))
})
