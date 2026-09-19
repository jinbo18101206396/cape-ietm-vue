/**
 * 热点图形交互功能简化E2E测试
 * 使用独立HTML页面验证核心渲染逻辑
 */

const { test, expect } = require('@playwright/test')
const path = require('path')

test.describe('热点图形交互功能 - 简化验证', () => {
  test('手工测试页面应该正确渲染所有热点类型', async ({ page }) => {
    // 打开手工测试页面
    const testPagePath = path.join(__dirname, '../manual/hotspot-manual-test.html')
    await page.goto(`file://${testPagePath}`)

    // 等待页面加载
    await page.waitForTimeout(1000)

    // 测试1: 矩形热点
    const test1Result = await page.locator('#test1-result').textContent()
    expect(test1Result).toContain('✅')
    expect(test1Result).toContain('矩形热点渲染成功')

    // 测试2: 圆形热点
    const test2Result = await page.locator('#test2-result').textContent()
    expect(test2Result).toContain('✅')
    expect(test2Result).toContain('圆形热点渲染成功')

    // 测试3: 多边形热点
    const test3Result = await page.locator('#test3-result').textContent()
    expect(test3Result).toContain('✅')
    expect(test3Result).toContain('多边形热点渲染成功')

    // 测试4: 多个热点
    const test4Result = await page.locator('#test4-result').textContent()
    expect(test4Result).toContain('✅')
    expect(test4Result).toContain('多热点渲染成功')

    console.log('✅ 所有基础渲染测试通过')
  })

  test('热点点击应该显示详情弹框', async ({ page }) => {
    const testPagePath = path.join(__dirname, '../manual/hotspot-manual-test.html')
    await page.goto(`file://${testPagePath}`)
    await page.waitForTimeout(1000)

    // 点击第一个矩形热点
    const svgRect = page.locator('#test1-wrapper svg rect').first()
    await svgRect.click()
    await page.waitForTimeout(300)

    // 验证弹框显示
    const modal = page.locator('#hotspot-modal')
    await expect(modal).toBeVisible()

    // 验证弹框内容
    const modalId = await page.locator('#modal-id').textContent()
    expect(modalId).toContain('hs-rect-001')

    const modalDescription = await page.locator('#modal-description').textContent()
    expect(modalDescription).toContain('矩形热点测试')

    console.log('✅ 热点点击弹框测试通过')

    // 关闭弹框
    await page.locator('.modal-close').click()
    await page.waitForTimeout(200)
    await expect(modal).not.toBeVisible()
  })

  test('热点悬停应该改变样式', async ({ page }) => {
    const testPagePath = path.join(__dirname, '../manual/hotspot-manual-test.html')
    await page.goto(`file://${testPagePath}`)
    await page.waitForTimeout(1000)

    // 获取矩形热点
    const svgRect = page.locator('#test1-wrapper svg rect').first()

    // 获取初始fill属性
    const initialFill = await svgRect.getAttribute('fill')
    expect(initialFill).toBe('rgba(255, 87, 34, 0.2)')

    // 鼠标悬停
    await svgRect.hover()
    await page.waitForTimeout(100)

    // 获取悬停后fill属性
    const hoverFill = await svgRect.getAttribute('fill')
    expect(hoverFill).toBe('rgba(255, 87, 34, 0.35)')

    // 获取悬停后stroke-width
    const hoverStrokeWidth = await svgRect.getAttribute('stroke-width')
    expect(hoverStrokeWidth).toBe('3')

    console.log('✅ 热点悬停高亮测试通过')
  })

  test('SVG叠加层应该正确定位', async ({ page }) => {
    const testPagePath = path.join(__dirname, '../manual/hotspot-manual-test.html')
    await page.goto(`file://${testPagePath}`)
    await page.waitForTimeout(1000)

    // 检查SVG容器
    const svg = page.locator('#test1-wrapper svg').first()
    await expect(svg).toBeVisible()

    // 验证SVG样式
    const position = await svg.evaluate(el => window.getComputedStyle(el).position)
    expect(position).toBe('absolute')

    const zIndex = await svg.evaluate(el => window.getComputedStyle(el).zIndex)
    expect(zIndex).toBe('10')

    console.log('✅ SVG叠加层定位测试通过')
  })

  test('多个热点应该独立响应点击', async ({ page }) => {
    const testPagePath = path.join(__dirname, '../manual/hotspot-manual-test.html')
    await page.goto(`file://${testPagePath}`)
    await page.waitForTimeout(1000)

    // 点击第一个热点（矩形）
    const rect = page.locator('#test4-wrapper svg rect').first()
    await rect.click()
    await page.waitForTimeout(300)

    let modalId = await page.locator('#modal-id').textContent()
    expect(modalId).toContain('hs-multi-001')
    await page.locator('.modal-close').click()
    await page.waitForTimeout(200)

    // 点击第二个热点（圆形）
    const circle = page.locator('#test4-wrapper svg circle').first()
    await circle.click()
    await page.waitForTimeout(300)

    modalId = await page.locator('#modal-id').textContent()
    expect(modalId).toContain('hs-multi-002')
    await page.locator('.modal-close').click()
    await page.waitForTimeout(200)

    // 点击第三个热点（多边形）
    const polygon = page.locator('#test4-wrapper svg polygon').first()
    await polygon.click()
    await page.waitForTimeout(300)

    modalId = await page.locator('#modal-id').textContent()
    expect(modalId).toContain('hs-multi-003')

    console.log('✅ 多热点独立交互测试通过')
  })

  test('热点形状属性应该正确', async ({ page }) => {
    const testPagePath = path.join(__dirname, '../manual/hotspot-manual-test.html')
    await page.goto(`file://${testPagePath}`)
    await page.waitForTimeout(1000)

    // 验证矩形属性
    const rect = page.locator('#test1-wrapper svg rect').first()
    expect(await rect.getAttribute('x')).toBe('50')
    expect(await rect.getAttribute('y')).toBe('50')
    expect(await rect.getAttribute('width')).toBe('150')
    expect(await rect.getAttribute('height')).toBe('100')

    // 验证圆形属性
    const circle = page.locator('#test2-wrapper svg circle').first()
    expect(await circle.getAttribute('cx')).toBe('200')
    expect(await circle.getAttribute('cy')).toBe('150')
    expect(await circle.getAttribute('r')).toBe('60')

    // 验证多边形属性
    const polygon = page.locator('#test3-wrapper svg polygon').first()
    expect(await polygon.getAttribute('points')).toBe('50,50 150,50 200,150 100,200')

    console.log('✅ 热点形状属性测试通过')
  })

  test('热点样式应该符合设计规范', async ({ page }) => {
    const testPagePath = path.join(__dirname, '../manual/hotspot-manual-test.html')
    await page.goto(`file://${testPagePath}`)
    await page.waitForTimeout(1000)

    const rect = page.locator('#test1-wrapper svg rect').first()

    // 验证填充色
    const fill = await rect.getAttribute('fill')
    expect(fill).toBe('rgba(255, 87, 34, 0.2)')

    // 验证边框色
    const stroke = await rect.getAttribute('stroke')
    expect(stroke).toBe('rgba(255, 87, 34, 0.8)')

    // 验证边框宽度
    const strokeWidth = await rect.getAttribute('stroke-width')
    expect(strokeWidth).toBe('2')

    // 验证光标样式
    const cursor = await rect.evaluate(el => window.getComputedStyle(el).cursor)
    expect(cursor).toBe('pointer')

    console.log('✅ 热点样式规范测试通过')
  })
})
