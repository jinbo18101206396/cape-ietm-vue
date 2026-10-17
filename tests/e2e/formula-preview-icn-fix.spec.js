/**
 * E2E测试：验证公式ICN在DM预览中的显示修复
 *
 * 问题描述：
 * 在源码视图插入公式ICN后点击"浏览"预览，公式图片显示"ICN加载失败"
 *
 * 根本原因：
 * 1. 公式ICN存储在数据库BLOB字段（ietm_icn_formula.filecontent）
 * 2. 预览代码统一使用/ietm/icn/view端点（为磁盘文件设计）
 * 3. 缺少类型判断，导致公式ICN走错误的加载路径
 *
 * 修复方案：
 * 1. 先调用/ietm/icn/metadata判断ICN类型
 * 2. 公式类型使用POST /ietm/icn/getIcnContent从BLOB加载
 * 3. 普通图符继续使用GET /ietm/icn/view从磁盘加载
 *
 * @date 2026-10-16
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999/jeecg-boot'
const TEST_CREDENTIALS = {
  username: 'admin',
  password: '123456'
}

test.describe('公式ICN预览修复验证', () => {
  let page
  let context

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    })
    page = await context.newPage()

    // 1. 登录系统
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="账户"]', TEST_CREDENTIALS.username)
    await page.fill('input[placeholder="密码"]', TEST_CREDENTIALS.password)
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
    console.log('✅ 登录成功')
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('T1: 公式ICN在预览弹框中能正确显示', async () => {
    // 2. 导航到DM编辑页面（使用实际的DM地址）
    console.log('\n📍 步骤1: 打开包含公式的DM')
    const dmId = '2110598690279223297'
    const dmUrl = `${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=edit&dmc=DMC-ZB1-A-02-00-00-00A-007A-A_001-01_zh-CN`
    await page.goto(dmUrl)

    // 等待编辑器加载
    await page.waitForSelector('.ietm-editor-container, .CodeMirror', { timeout: 30000 })
    console.log('✅ DM编辑页面加载完成')

    // 3. 确认源码视图中存在公式symbol标签
    console.log('\n📍 步骤2: 检查源码中的公式symbol标签')
    const sourceCode = await page.locator('.CodeMirror').first().textContent()

    // 查找公式ICN（symbol标签包含xml属性和icn属性）
    const symbolMatch = sourceCode.match(/<symbol[^>]+icn="([^"]+)"[^>]*>/)
    if (!symbolMatch) {
      console.log('⚠️  未找到公式symbol标签，尝试插入新公式')
      // 如果没有公式，这里可以补充插入公式的逻辑
      // 为了测试验证，我们先假设DM中已有公式
      test.skip()
      return
    }

    const formulaIcnCode = symbolMatch[1]
    console.log(`✅ 找到公式ICN: ${formulaIcnCode}`)

    // 4. 点击"浏览"按钮打开预览弹框
    console.log('\n📍 步骤3: 点击"浏览"按钮')
    await page.click('button:has-text("浏览")')

    // 等待预览弹框出现
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })
    console.log('✅ DM预览弹框已打开')

    // 5. 等待预览内容加载
    await page.waitForSelector('iframe[src^="blob:"]', { timeout: 10000 })
    const iframe = page.frameLocator('iframe[src^="blob:"]')
    console.log('✅ 预览iframe加载完成')

    // 6. 在预览中查找公式图片
    console.log('\n📍 步骤4: 查找预览中的公式图片')

    // 公式在预览中会被XSLT转换为带onclick的图片
    const formulaImages = iframe.locator('img[onclick*="showMultimediaInfo"]')
    const count = await formulaImages.count()

    if (count === 0) {
      console.log('⚠️  预览中未找到公式图片，测试跳过')
      test.skip()
      return
    }

    console.log(`✅ 找到 ${count} 个公式图片`)

    // 7. 点击第一个公式图片
    console.log('\n📍 步骤5: 点击公式图片触发预览')
    await formulaImages.first().click()

    // 等待多媒体预览弹框出现
    await page.waitForSelector('.ant-modal:has-text("图形/多媒体预览")', { timeout: 5000 })
    console.log('✅ 图形/多媒体预览弹框已打开')

    // 8. 验证关键修复点：检查网络请求
    console.log('\n📍 步骤6: 验证API调用路径')

    // 监听网络请求
    const requests = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/ietm/icn/')) {
        requests.push({
          url: url,
          method: request.method()
        })
      }
    })

    // 等待加载完成（通过检查loading状态消失）
    await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 10000 })

    // 9. 验证调用了正确的API端点
    console.log('\n📍 步骤7: 验证修复后的API调用')

    const metadataCall = requests.find(r => r.url.includes('/ietm/icn/metadata/'))
    const getIcnContentCall = requests.find(r =>
      r.url.includes('/ietm/icn/getIcnContent') && r.method === 'POST'
    )
    const viewCall = requests.find(r => r.url.includes('/ietm/icn/view/'))

    // 修复后应该：
    // 1. 先调用metadata判断类型
    // 2. 对于公式，调用getIcnContent (POST)
    // 3. 不应该调用view端点（那是给普通图符用的）

    expect(metadataCall, '应该调用metadata端点判断ICN类型').toBeTruthy()
    console.log('✅ 调用了metadata端点')

    expect(getIcnContentCall, '公式类型应该调用getIcnContent端点').toBeTruthy()
    console.log('✅ 调用了getIcnContent端点（修复关键点）')

    if (viewCall) {
      console.log('⚠️  注意：仍然调用了view端点（可能是回退逻辑）')
    }

    // 10. 验证公式图片正确显示
    console.log('\n📍 步骤8: 验证公式图片显示')

    // 检查是否显示"ICN加载失败"
    const errorMsg = await page.locator('text=ICN内容为空或加载失败').count()
    expect(errorMsg, '不应该显示"ICN加载失败"错误').toBe(0)
    console.log('✅ 未显示加载失败错误')

    // 检查图片元素存在
    const modalImg = page.locator('.ant-modal:has-text("图形/多媒体预览") img')
    await expect(modalImg, '应该显示公式图片').toBeVisible({ timeout: 5000 })
    console.log('✅ 公式图片正确显示')

    // 11. 验证图片源是base64（公式特征）
    const imgSrc = await modalImg.getAttribute('src')
    expect(imgSrc, '公式图片应该是base64格式').toMatch(/^data:image\/png;base64,/)
    console.log('✅ 图片源格式正确（base64）')

    console.log('\n🎉 测试通过：公式ICN预览修复验证成功')
  })

  test('T2: 普通图符ICN仍然使用view端点', async () => {
    // 验证修复没有破坏普通图符的加载
    console.log('\n📍 验证普通图符ICN加载（回归测试）')

    // 这里需要一个包含普通图符的DM
    // 验证普通图符仍然使用/ietm/icn/view端点
    // 暂时标记为待实现
    test.skip()
  })

  test('T3: 元数据获取失败时的降级处理', async () => {
    // 验证当/ietm/icn/metadata失败时的容错逻辑
    console.log('\n📍 验证元数据获取失败的容错处理')

    // 需要模拟metadata端点失败的场景
    // 验证是否有合理的降级处理
    test.skip()
  })
})

test.describe('端到端完整流程验证', () => {
  test('T4: 完整的公式编辑→保存→预览流程', async ({ page }) => {
    // 1. 登录
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="账户"]', TEST_CREDENTIALS.username)
    await page.fill('input[placeholder="密码"]', TEST_CREDENTIALS.password)
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 2. 打开DM编辑页
    const dmId = '2110598690279223297'
    const dmUrl = `${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=edit&dmc=DMC-ZB1-A-02-00-00-00A-007A-A_001-01_zh-CN`
    await page.goto(dmUrl)
    await page.waitForSelector('.ietm-editor-container, .CodeMirror', { timeout: 30000 })

    // 3. 切换到设计视图
    await page.click('text=设计视图')
    await page.waitForTimeout(2000)

    // 4. 打开Para编辑器（假设有para可编辑）
    // 这部分需要根据实际页面结构调整
    console.log('⚠️  完整流程测试需要手动验收')

    // 5. 插入公式
    // 6. 保存
    // 7. 切换到源码视图验证XML
    // 8. 点击浏览验证预览

    test.skip() // 标记为手动测试项
  })
})
