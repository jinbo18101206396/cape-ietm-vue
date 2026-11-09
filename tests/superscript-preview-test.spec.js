/**
 * 上标/下标预览显示测试
 *
 * 测试场景：
 * 1. 设计视图中插入上标（如 1²）
 * 2. 保存后XML应为 <para>1<superScript>2</superScript></para>
 * 3. 预览弹出框应正确显示上标效果
 *
 * 问题根因：
 * - 后端XSLT未处理 <superScript>/<subScript>/<emphasis> 标签
 * - 前端DmPreviewModal需要将这些XML标签转换为HTML标签
 *
 * 修复方案：
 * - 在 DmPreviewModal.show() 中添加标签转换逻辑
 */

const { test, expect } = require('@playwright/test')

test.describe('上标/下标/加粗预览显示测试', () => {
  test.beforeEach(async ({ page }) => {
    // 假设已登录并进入DM编辑页面
    await page.goto('http://localhost:8080/dm-editor')
  })

  test('上标在预览中正确显示', async ({ page }) => {
    // 1. 在para设计器中插入上标
    await page.click('[data-testid="para-designer"]')
    await page.type('.ueditor-container', '1')
    await page.click('[title="上标"]')
    await page.type('.ueditor-container', '2')

    // 2. 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(500)

    // 3. 验证XML源码
    const xmlContent = await page.textContent('.CodeMirror')
    expect(xmlContent).toContain('<superScript>2</superScript>')

    // 4. 点击预览按钮
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.a-modal:has-text("DM内容预览")')

    // 5. 验证预览中的上标显示
    const iframe = page.frameLocator('iframe')
    const supText = await iframe.locator('sup').textContent()
    expect(supText).toBe('2')

    // 6. 验证完整文本渲染
    const paraText = await iframe.locator('p, div').first().textContent()
    expect(paraText).toContain('1')
    expect(paraText).toContain('2')

    console.log('✅ 上标预览显示正确')
  })

  test('下标在预览中正确显示', async ({ page }) => {
    // 1. 在para设计器中插入下标
    await page.click('[data-testid="para-designer"]')
    await page.type('.ueditor-container', 'H')
    await page.click('[title="下标"]')
    await page.type('.ueditor-container', '2')
    await page.click('[title="下标"]') // 取消下标
    await page.type('.ueditor-container', 'O')

    // 2. 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(500)

    // 3. 验证XML源码
    const xmlContent = await page.textContent('.CodeMirror')
    expect(xmlContent).toContain('<subScript>2</subScript>')

    // 4. 点击预览
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.a-modal:has-text("DM内容预览")')

    // 5. 验证预览中的下标显示
    const iframe = page.frameLocator('iframe')
    const subText = await iframe.locator('sub').textContent()
    expect(subText).toBe('2')

    console.log('✅ 下标预览显示正确')
  })

  test('加粗在预览中正确显示', async ({ page }) => {
    // 1. 在para设计器中插入加粗文本
    await page.click('[data-testid="para-designer"]')
    await page.type('.ueditor-container', '这是')
    await page.click('[title="加粗"]')
    await page.type('.ueditor-container', '重要')
    await page.click('[title="加粗"]') // 取消加粗
    await page.type('.ueditor-container', '内容')

    // 2. 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(500)

    // 3. 验证XML源码
    const xmlContent = await page.textContent('.CodeMirror')
    expect(xmlContent).toContain('<emphasis>重要</emphasis>')

    // 4. 点击预览
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.a-modal:has-text("DM内容预览")')

    // 5. 验证预览中的加粗显示
    const iframe = page.frameLocator('iframe')
    const strongText = await iframe.locator('strong').textContent()
    expect(strongText).toBe('重要')

    console.log('✅ 加粗预览显示正确')
  })

  test('混合格式在预览中正确显示', async ({ page }) => {
    // 测试场景：x²+y²=z² 其中2都是上标
    await page.click('[data-testid="para-designer"]')

    // 输入 x²
    await page.type('.ueditor-container', 'x')
    await page.click('[title="上标"]')
    await page.type('.ueditor-container', '2')
    await page.click('[title="上标"]')

    // 输入 +y²
    await page.type('.ueditor-container', '+y')
    await page.click('[title="上标"]')
    await page.type('.ueditor-container', '2')
    await page.click('[title="上标"]')

    // 输入 =z²
    await page.type('.ueditor-container', '=z')
    await page.click('[title="上标"]')
    await page.type('.ueditor-container', '2')

    // 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(500)

    // 点击预览
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.a-modal:has-text("DM内容预览")')

    // 验证预览
    const iframe = page.frameLocator('iframe')
    const supElements = await iframe.locator('sup').all()
    expect(supElements.length).toBe(3)

    for (const sup of supElements) {
      const text = await sup.textContent()
      expect(text).toBe('2')
    }

    console.log('✅ 混合格式预览显示正确')
  })
})
