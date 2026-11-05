/**
 * 3D模型预览测试
 *
 * 测试场景：
 * 1. 在 multimedia 设计视图插入 .gltf/.stl/.wrl 格式的3D模型
 * 2. 保存后查看生成的 XML
 * 3. 点击预览按钮，弹出 DM 内容预览
 * 4. 点击多媒体图标，验证 3D 模型能否正确预览
 */

const { test, expect } = require('@playwright/test')

test.describe('3D 模型预览功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 登录系统
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="账户"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button:has-text("登录")')

    // 等待登录成功
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  })

  test('测试 .gltf 格式3D模型预览', async ({ page }) => {
    // 2. 导航到 IETM 数据模块管理
    await page.goto('http://localhost:3000/ietm/IetmDatamoduleManagement')

    // 3. 创建新的数据模块（假设已有测试数据模块）
    // 这里需要根据实际情况调整选择器
    await page.click('text=编辑模块设计器') // 或者点击具体的数据模块

    // 4. 切换到设计视图
    await page.click('text=设计视图')

    // 5. 在 multimedia 区域添加 3D 模型
    // 假设页面有 "添加" 按钮
    await page.click('button:has-text("添加")')

    // 6. 上传 .gltf 文件
    // 需要准备测试文件
    const gltfFile = 'tests/fixtures/test-triangle.gltf'
    await page.setInputFiles('input[type="file"]', gltfFile)

    // 7. 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    // 8. 切换到源码视图，验证 XML
    await page.click('text=源码视图')
    const xmlContent = await page.textContent('.xml-editor, .code-editor')
    expect(xmlContent).toContain('multimediaType="3D"')
    expect(xmlContent).toContain('test-triangle.gltf')

    // 9. 点击预览按钮
    await page.click('button:has-text("预览")')

    // 10. 等待 DM 内容预览弹出框出现
    await page.waitForSelector('text=DM内容预览', { timeout: 5000 })

    // 11. 点击多媒体图标（3D 模型图标）
    await page.click('.multimedia-icon, [class*="multimedia"]')

    // 12. 等待 图形/多媒体预览 弹出框出现
    await page.waitForSelector('text=图形/多媒体预览', { timeout: 5000 })

    // 13. 验证 3D 渲染容器存在
    const canvas3d = await page.locator('.three-canvas, canvas').count()
    expect(canvas3d).toBeGreaterThan(0)

    // 14. 验证没有错误消息
    const errorMessage = await page.locator('.ant-message-error').count()
    expect(errorMessage).toBe(0)

    // 15. 验证元数据显示
    await expect(page.locator('text=格式')).toBeVisible()
    await expect(page.locator('text=model/gltf+json')).toBeVisible()

    // 16. 验证文件名显示
    await expect(page.locator('text=test-triangle.gltf')).toBeVisible()

    console.log('✅ .gltf 格式3D模型预览测试通过')
  })

  test('测试 .stl 格式3D模型预览', async ({ page }) => {
    // 类似的测试流程，但使用 .stl 文件
    // ... 省略重复代码 ...

    // 关键验证点
    await expect(page.locator('text=model/stl')).toBeVisible()
    console.log('✅ .stl 格式3D模型预览测试通过')
  })

  test('测试 .wrl 格式3D模型预览', async ({ page }) => {
    // 类似的测试流程，但使用 .wrl 文件
    // ... 省略重复代码 ...

    // 关键验证点
    await expect(page.locator('text=model/vrml')).toBeVisible()
    console.log('✅ .wrl 格式3D模型预览测试通过')
  })

  test('验证3D模型自适应弹窗大小', async ({ page }) => {
    // 打开3D模型预览
    // ... 省略前置步骤 ...

    // 获取弹窗容器尺寸
    const modalBox = await page.locator('.ant-modal-body').boundingBox()

    // 获取3D渲染容器尺寸
    const canvas3dBox = await page.locator('.multimedia-3d-container').boundingBox()

    // 验证3D容器没有超出弹窗
    expect(canvas3dBox.width).toBeLessThanOrEqual(modalBox.width)
    expect(canvas3dBox.height).toBeLessThanOrEqual(modalBox.height)

    // 验证有合适的内边距
    expect(modalBox.width - canvas3dBox.width).toBeGreaterThan(0)

    console.log('✅ 3D模型自适应测试通过')
  })
})
