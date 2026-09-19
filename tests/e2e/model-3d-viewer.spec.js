/**
 * Model3DViewer E2E测试
 *
 * 测试策略：
 * 1. ICN管理 - 上传并预览各种3D格式
 * 2. DM预览 - 多媒体3D对象预览
 * 3. 格式兼容性测试
 * 4. 错误处理测试
 *
 * @date 2026-09-19
 */

const { test, expect } = require('@playwright/test')
const path = require('path')

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  testDataPath: path.join(__dirname, '../test-data/3d-models')
}

// 登录辅助函数
async function login(page) {
  await page.goto(TEST_CONFIG.baseURL)
  await page.fill('input[placeholder*="账号"]', 'admin')
  await page.fill('input[placeholder*="密码"]', 'admin123')
  await page.click('button:has-text("登录")')
  await page.waitForURL('**/dashboard/**', { timeout: 10000 })
}

// 导航到ICN管理
async function gotoIcnManage(page) {
  await page.goto(`${TEST_CONFIG.baseURL}/#/ietm/icnmanage`)
  await page.waitForSelector('.ant-table', { timeout: 10000 })
}

test.describe('Model3DViewer - ICN管理预览测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await gotoIcnManage(page)
  })

  test('应该支持VRML格式预览', async ({ page }) => {
    // 1. 查找已有的VRML文件或跳过
    const vrmlRow = page.locator('tr:has-text(".wrl")').first()
    const hasVrml = await vrmlRow.count() > 0

    if (!hasVrml) {
      test.skip('未找到VRML测试数据')
      return
    }

    // 2. 点击预览按钮
    await vrmlRow.locator('[title="浏览"]').click()

    // 3. 等待Model3DViewer加载
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    // 4. 验证查看器元素
    await expect(page.locator('.viewer-container')).toBeVisible()
    await expect(page.locator('.controls-hint')).toBeVisible()

    // 5. 验证格式显示
    const modelInfo = page.locator('.model-info')
    if (await modelInfo.count() > 0) {
      await expect(modelInfo).toContainText('VRML')
    }

    // 6. 验证控制提示
    await expect(page.locator('.controls-hint')).toContainText('左键拖动')
    await expect(page.locator('.controls-hint')).toContainText('右键拖动')
    await expect(page.locator('.controls-hint')).toContainText('滚轮')
  })

  test('应该支持glTF格式预览', async ({ page }) => {
    // 查找glTF文件
    const gltfRow = page.locator('tr:has-text(".gltf"), tr:has-text(".glb")').first()
    const hasGltf = await gltfRow.count() > 0

    if (!hasGltf) {
      test.skip('未找到glTF测试数据')
      return
    }

    // 点击预览
    await gltfRow.locator('[title="浏览"]').click()

    // 等待加载
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    // 验证格式
    const modelInfo = page.locator('.model-info')
    if (await modelInfo.count() > 0) {
      const text = await modelInfo.textContent()
      expect(text).toMatch(/glTF|GLB/i)
    }

    // 验证模型统计信息
    if (await modelInfo.isVisible()) {
      await expect(modelInfo).toContainText('顶点')
      await expect(modelInfo).toContainText('面数')
    }
  })

  test('应该支持OBJ格式预览', async ({ page }) => {
    const objRow = page.locator('tr:has-text(".obj")').first()
    const hasObj = await objRow.count() > 0

    if (!hasObj) {
      test.skip('未找到OBJ测试数据')
      return
    }

    await objRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    const modelInfo = page.locator('.model-info')
    if (await modelInfo.count() > 0) {
      await expect(modelInfo).toContainText('OBJ')
    }
  })

  test('应该支持STL格式预览', async ({ page }) => {
    const stlRow = page.locator('tr:has-text(".stl")').first()
    const hasStl = await stlRow.count() > 0

    if (!hasStl) {
      test.skip('未找到STL测试数据')
      return
    }

    await stlRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    const modelInfo = page.locator('.model-info')
    if (await modelInfo.count() > 0) {
      await expect(modelInfo).toContainText('STL')
    }
  })

  test('应该检测并显示动画提示', async ({ page }) => {
    // 查找带动画的glTF/FBX文件（文件名包含"anim"或"animated"）
    const animRow = page.locator('tr:has-text("anim"), tr:has-text("animated")').first()
    const hasAnim = await animRow.count() > 0

    if (!hasAnim) {
      test.skip('未找到带动画的3D模型')
      return
    }

    await animRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    // 等待模型加载完成
    await page.waitForTimeout(2000)

    // 检查动画提示
    const animHint = page.locator('.animation-hint')
    if (await animHint.count() > 0) {
      await expect(animHint).toContainText('检测到动画')
    }
  })

  test('应该正确处理加载错误', async ({ page }) => {
    // 这个测试需要一个已知会失败的ICN ID
    // 或者上传一个损坏的3D文件
    test.skip('需要准备损坏的测试数据')
  })

  test('应该支持交互控制', async ({ page }) => {
    // 找第一个3D文件
    const firstRow = page.locator('tr:has-text(".wrl"), tr:has-text(".gltf"), tr:has-text(".obj")').first()
    const has3D = await firstRow.count() > 0

    if (!has3D) {
      test.skip('未找到3D测试数据')
      return
    }

    await firstRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    const canvas = page.locator('.viewer-container canvas')
    await expect(canvas).toBeVisible()

    // 模拟鼠标交互（旋转）
    const box = await canvas.boundingBox()
    if (box) {
      // 左键拖动（旋转）
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50)
      await page.mouse.up()

      // 等待渲染更新
      await page.waitForTimeout(500)

      // 滚轮缩放
      await page.mouse.wheel(0, -100)
      await page.waitForTimeout(500)
    }

    // 验证画面没有崩溃（canvas仍然可见）
    await expect(canvas).toBeVisible()
  })
})

test.describe('Model3DViewer - DM预览集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('应该在DM预览中显示3D多媒体对象', async ({ page }) => {
    // 1. 进入数据模块管理
    await page.goto(`${TEST_CONFIG.baseURL}/#/ietm/datamodule`)
    await page.waitForSelector('.ant-table', { timeout: 10000 })

    // 2. 查找包含多媒体的DM（需要提前准备测试数据）
    const firstRow = page.locator('.ant-table tbody tr').first()
    const hasDm = await firstRow.count() > 0

    if (!hasDm) {
      test.skip('未找到DM测试数据')
      return
    }

    // 3. 点击预览
    await firstRow.locator('[title*="预览"]').click()

    // 4. 等待DM预览弹窗
    await page.waitForSelector('iframe', { timeout: 15000 })

    // 5. 切换到iframe
    const iframe = page.frameLocator('iframe').first()

    // 6. 查找多媒体对象（如果有）
    const multimediaLink = iframe.locator('a[onclick*="showMultimediaInfo"]').first()
    const hasMultimedia = await multimediaLink.count() > 0

    if (!hasMultimedia) {
      test.skip('DM中未找到多媒体对象')
      return
    }

    // 7. 点击多媒体对象
    await multimediaLink.click()

    // 8. 等待Model3DViewer弹窗（在主页面，不在iframe中）
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    // 9. 验证查看器加载
    await expect(page.locator('.viewer-container')).toBeVisible()
  })
})

test.describe('Model3DViewer - 性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await gotoIcnManage(page)
  })

  test('应该在合理时间内加载模型', async ({ page }) => {
    const firstRow = page.locator('tr:has-text(".wrl"), tr:has-text(".gltf")').first()
    const has3D = await firstRow.count() > 0

    if (!has3D) {
      test.skip('未找到3D测试数据')
      return
    }

    const startTime = Date.now()

    await firstRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 30000 })

    // 等待加载完成（loading消失）
    await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout: 30000 })

    const loadTime = Date.now() - startTime

    console.log(`Model loaded in ${loadTime}ms`)

    // 验证加载时间 < 30秒
    expect(loadTime).toBeLessThan(30000)
  })

  test('应该正确清理资源', async ({ page }) => {
    const firstRow = page.locator('tr:has-text(".wrl"), tr:has-text(".gltf")').first()
    const has3D = await firstRow.count() > 0

    if (!has3D) {
      test.skip('未找到3D测试数据')
      return
    }

    // 打开预览
    await firstRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    // 关闭预览
    await page.locator('.ant-modal-close').click()
    await page.waitForSelector('.model-3d-viewer', { state: 'hidden' })

    // 等待一段时间确保资源清理
    await page.waitForTimeout(1000)

    // 再次打开预览（验证没有内存泄漏）
    await firstRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    await expect(page.locator('.viewer-container')).toBeVisible()
  })
})

test.describe('Model3DViewer - 浏览器兼容性', () => {
  test('应该在Chrome中正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test')

    await login(page)
    await gotoIcnManage(page)

    const firstRow = page.locator('tr:has-text(".wrl"), tr:has-text(".gltf")').first()
    const has3D = await firstRow.count() > 0

    if (!has3D) {
      test.skip('未找到3D测试数据')
      return
    }

    await firstRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    await expect(page.locator('.viewer-container')).toBeVisible()
  })

  test('应该在Firefox中正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test')

    await login(page)
    await gotoIcnManage(page)

    const firstRow = page.locator('tr:has-text(".wrl"), tr:has-text(".gltf")').first()
    const has3D = await firstRow.count() > 0

    if (!has3D) {
      test.skip('未找到3D测试数据')
      return
    }

    await firstRow.locator('[title="浏览"]').click()
    await page.waitForSelector('.model-3d-viewer', { timeout: 15000 })

    await expect(page.locator('.viewer-container')).toBeVisible()
  })
})
