/**
 * ParaDesigner P0级Bug - 源码视图行距样式变化测试
 *
 * 严重问题：从设计视图保存返回后，源码视图行距和样式完全改变
 *
 * 症状：
 * - 首次进入：正常行距、代码高亮、折叠标记
 * - 保存返回：行距过窄、所有行挤在一起、大量空白
 *
 * 日期：2026-10-11
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const TEST_DM_ID = 'DM-001'
const TEST_USERNAME = 'admin'
const TEST_PASSWORD = 'admin'

test.describe('P0-SOURCE-VIEW-LAYOUT: 源码视图布局一致性测试', () => {
  test.beforeEach(async ({ page }) => {
    // 第一步：导航到登录页面
    await page.goto(`${BASE_URL}/user/login`)

    // 第二步：登录
    await page.fill('input[placeholder="请输入账户名"]', TEST_USERNAME)
    await page.fill('input[placeholder="请输入密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')

    // 等待登录完成并导航到DM编辑页面
    await page.waitForNavigation({ waitUntil: 'networkidle' })

    // 第三步：导航到DM编辑页面
    await page.goto(`${BASE_URL}/ietm/dm-manage/dmManage`)
    await page.waitForTimeout(1000)

    // 第四步：搜索并打开指定的DM编辑页面
    // 这里假设有搜索框或列表，根据实际情况修改
    await page.goto(`${BASE_URL}/ietm/dm-manage/dmManage?id=${TEST_DM_ID}`)
    await page.waitForTimeout(2000)

    // 等待CodeMirror编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await page.waitForTimeout(1000) // 等待编辑器完全初始化
  })

  // ============ 核心测试：行距一致性 ============
  test('P0-CRITICAL: 设计视图保存前后行距应该保持一致', async ({ page }) => {
    // 步骤1: 获取初始状态的行高和行距
    const initialLayout = await captureSourceViewLayout(page)

    console.log('初始布局:', initialLayout)

    // 步骤2: 进入设计视图
    await page.click('text=编辑段落') // 打开para设计视图
    await page.waitForSelector('.para-designer')

    // 步骤3: 修改内容并保存
    const uEditorFrame = page.frameLocator('.ueditor-frame')
    await uEditorFrame.locator('body').click()
    await uEditorFrame.locator('body').type(' [测试修改]')

    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000) // 等待保存完成

    // 步骤4: 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    // 步骤5: 获取保存后的行高和行距
    const afterLayout = await captureSourceViewLayout(page)

    console.log('保存后布局:', afterLayout)

    // ✅ 核心断言：行高应该一致
    expect(Math.abs(afterLayout.averageLineHeight - initialLayout.averageLineHeight))
      .toBeLessThan(2) // 允许1-2px的误差

    // ✅ 核心断言：总高度应该相近（允许新增内容的高度）
    const heightDiff = Math.abs(afterLayout.totalHeight - initialLayout.totalHeight)
    expect(heightDiff).toBeLessThan(100) // 不应该有巨大的空白区域

    // ✅ 核心断言：可见行数应该一致
    expect(afterLayout.visibleLines).toBeGreaterThanOrEqual(initialLayout.visibleLines - 2)

    console.log('✅ P0-CRITICAL测试通过：行距保持一致')
  })

  // ============ 测试1：行高计算 ============
  test('行高应该在保存前后保持一致', async ({ page }) => {
    // 获取第一行的高度
    const firstLineInitial = await page.locator('.CodeMirror-line').first().boundingBox()

    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    // 再次获取第一行的高度
    const firstLineAfter = await page.locator('.CodeMirror-line').first().boundingBox()

    // 断言：行高应该一致
    expect(firstLineAfter.height).toBe(firstLineInitial.height)
  })

  // ============ 测试2：总高度验证 ============
  test('CodeMirror容器总高度应该合理', async ({ page }) => {
    const initialHeight = await getCodeMirrorTotalHeight(page)

    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    const afterHeight = await getCodeMirrorTotalHeight(page)

    // 断言：总高度不应该有巨大变化（除非新增了很多内容）
    const heightRatio = afterHeight / initialHeight
    expect(heightRatio).toBeGreaterThan(0.8) // 不应该突然缩小超过20%
    expect(heightRatio).toBeLessThan(1.5) // 不应该突然增大超过50%

    console.log(`总高度变化: ${initialHeight}px → ${afterHeight}px (${(heightRatio * 100).toFixed(1)}%)`)
  })

  // ============ 测试3：可见行数 ============
  test('可见行数应该在保存前后保持一致', async ({ page }) => {
    const initialVisibleLines = await getVisibleLineCount(page)

    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    const afterVisibleLines = await getVisibleLineCount(page)

    // 断言：可见行数应该接近（允许±2行的误差）
    expect(Math.abs(afterVisibleLines - initialVisibleLines)).toBeLessThan(3)

    console.log(`可见行数: ${initialVisibleLines} → ${afterVisibleLines}`)
  })

  // ============ 测试4：行间距验证 ============
  test('相邻行之间的间距应该一致', async ({ page }) => {
    // 测试第10-15行的间距
    const initialGaps = await measureLineGaps(page, 10, 15)

    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    const afterGaps = await measureLineGaps(page, 10, 15)

    // 断言：平均间距应该一致
    const initialAvg = average(initialGaps)
    const afterAvg = average(afterGaps)

    expect(Math.abs(afterAvg - initialAvg)).toBeLessThan(2)

    console.log(`平均行间距: ${initialAvg.toFixed(1)}px → ${afterAvg.toFixed(1)}px`)
  })

  // ============ 测试5：滚动位置保持 ============
  test('保存后应该保持滚动位置', async ({ page }) => {
    // 滚动到中间位置
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.scrollTo(0, 500)
    })

    await page.waitForTimeout(200)
    const initialScrollTop = await getScrollTop(page)

    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    const afterScrollTop = await getScrollTop(page)

    // 断言：滚动位置应该接近
    expect(Math.abs(afterScrollTop - initialScrollTop)).toBeLessThan(100)
  })

  // ============ 测试6：折叠标记可见性 ============
  test('折叠标记应该在保存后依然可见', async ({ page }) => {
    // 获取初始折叠标记数量
    const initialFoldMarkers = await page.locator('.CodeMirror-foldgutter').count()

    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    const afterFoldMarkers = await page.locator('.CodeMirror-foldgutter').count()

    // 断言：折叠标记应该存在
    expect(afterFoldMarkers).toBeGreaterThan(0)
    expect(afterFoldMarkers).toBe(initialFoldMarkers)
  })

  // ============ 测试7：代码高亮保持 ============
  test('代码高亮应该在保存后保持正常', async ({ page }) => {
    // 检查初始高亮
    const initialHighlights = await page.locator('.cm-tag, .cm-attribute, .cm-string').count()

    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    const afterHighlights = await page.locator('.cm-tag, .cm-attribute, .cm-string').count()

    // 断言：高亮元素应该存在
    expect(afterHighlights).toBeGreaterThan(0)
    expect(afterHighlights).toBeGreaterThanOrEqual(initialHighlights * 0.9) // 允许10%的变化
  })

  // ============ 测试8：空白区域检测 ============
  test('不应该出现大量不必要的空白区域', async ({ page }) => {
    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    // 获取最后一行的位置
    const lastLine = await page.locator('.CodeMirror-line').last().boundingBox()
    const containerHeight = await page.locator('.CodeMirror-scroll').boundingBox()

    // 计算空白区域
    const emptySpace = containerHeight.height - (lastLine.y + lastLine.height)

    // 断言：空白区域不应该超过容器高度的30%
    expect(emptySpace).toBeLessThan(containerHeight.height * 0.3)

    console.log(`空白区域: ${emptySpace}px (${(emptySpace / containerHeight.height * 100).toFixed(1)}%)`)
  })

  // ============ 测试9：行号对齐验证 ============
  test('行号应该与代码行正确对齐', async ({ page }) => {
    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    // 检查前10行的对齐情况
    for (let i = 0; i < 10; i++) {
      const lineNum = await page.locator(`.CodeMirror-linenumber`).nth(i).boundingBox()
      const codeLine = await page.locator(`.CodeMirror-line`).nth(i).boundingBox()

      // 断言：行号和代码行应该在同一水平线上（允许1px误差）
      expect(Math.abs(lineNum.y - codeLine.y)).toBeLessThan(2)
    }
  })

  // ============ 测试10：CSS样式检查 ============
  test('CodeMirror的CSS样式应该保持正确', async ({ page }) => {
    // 进入设计视图并保存
    await enterParaDesignerAndSave(page)

    // 返回源码视图
    await page.click('text=源码视图')
    await page.waitForTimeout(500)

    // 检查关键CSS属性
    const lineHeight = await page.evaluate(() => {
      const line = document.querySelector('.CodeMirror-line')
      return window.getComputedStyle(line).lineHeight
    })

    const fontSize = await page.evaluate(() => {
      const line = document.querySelector('.CodeMirror-line')
      return window.getComputedStyle(line).fontSize
    })

    // 断言：样式应该合理
    expect(parseFloat(lineHeight)).toBeGreaterThan(10) // 行高应该>10px
    expect(parseFloat(fontSize)).toBeGreaterThan(10) // 字号应该>10px

    console.log(`CSS: lineHeight=${lineHeight}, fontSize=${fontSize}`)
  })
})

// ============ 辅助函数 ============

/**
 * 捕获源码视图的布局信息
 */
async function captureSourceViewLayout(page) {
  return await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    const lines = document.querySelectorAll('.CodeMirror-line')
    const scroll = document.querySelector('.CodeMirror-scroll')

    // 计算平均行高
    let totalHeight = 0
    let visibleLines = 0

    lines.forEach(line => {
      const rect = line.getBoundingClientRect()
      if (rect.height > 0) {
        totalHeight += rect.height
        visibleLines++
      }
    })

    return {
      averageLineHeight: visibleLines > 0 ? totalHeight / visibleLines : 0,
      totalHeight: scroll.scrollHeight,
      visibleLines: visibleLines,
      lineCount: cm.lineCount(),
      scrollTop: scroll.scrollTop
    }
  })
}

/**
 * 进入Para设计视图并保存
 */
async function enterParaDesignerAndSave(page) {
  await page.click('text=编辑段落')
  await page.waitForSelector('.para-designer')

  const uEditorFrame = page.frameLocator('.ueditor-frame')
  await uEditorFrame.locator('body').click()
  await uEditorFrame.locator('body').type(' [修改]')

  await page.click('button:has-text("保存")')
  await page.waitForTimeout(1000)
}

/**
 * 获取CodeMirror总高度
 */
async function getCodeMirrorTotalHeight(page) {
  return await page.evaluate(() => {
    return document.querySelector('.CodeMirror-scroll').scrollHeight
  })
}

/**
 * 获取可见行数
 */
async function getVisibleLineCount(page) {
  return await page.evaluate(() => {
    const lines = document.querySelectorAll('.CodeMirror-line')
    let count = 0
    lines.forEach(line => {
      if (line.getBoundingClientRect().height > 0) {
        count++
      }
    })
    return count
  })
}

/**
 * 测量指定范围内相邻行的间距
 */
async function measureLineGaps(page, startLine, endLine) {
  return await page.evaluate((start, end) => {
    const lines = document.querySelectorAll('.CodeMirror-line')
    const gaps = []

    for (let i = start; i < end && i < lines.length - 1; i++) {
      const current = lines[i].getBoundingClientRect()
      const next = lines[i + 1].getBoundingClientRect()
      const gap = next.top - (current.top + current.height)
      gaps.push(gap)
    }

    return gaps
  }, startLine, endLine)
}

/**
 * 获取滚动位置
 */
async function getScrollTop(page) {
  return await page.evaluate(() => {
    return document.querySelector('.CodeMirror-scroll').scrollTop
  })
}

/**
 * 计算平均值
 */
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
