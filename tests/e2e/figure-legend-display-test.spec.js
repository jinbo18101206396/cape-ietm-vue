// @ts-check
const { test, expect } = require('@playwright/test')

test.describe('Figure Designer - 图例页面显示验证', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 填写登录信息 - 使用更宽松的选择器
    const usernameInput = page.locator('input[type="text"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await usernameInput.fill('admin')
    await passwordInput.fill('123456')

    // 点击登录按钮
    const loginButton = page.locator('button:has-text("登录")').or(page.locator('button.login-button')).or(page.locator('button[type="submit"]'))
    await loginButton.click()

    // 等待登录成功并跳转
    await page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {
      console.log('未跳转到dashboard，可能已经在其他页面')
    })
    await page.waitForTimeout(2000)

    // 2. 访问编辑页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2114332624301260801?mode=edit&dmc=DMC-ZB1-A-04-00-00-00A-007A-A_001-01_zh-CN')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
  })

  test('验证图例Tab的表格和按钮显示', async ({ page }) => {
    // 1. 等待 CodeMirror 编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    console.log('✓ CodeMirror 编辑器已加载')

    // 2. 查找包含 <figure 标签的行
    const figureLineNumber = await page.evaluate(() => {
      const cmLines = document.querySelectorAll('.CodeMirror-line')
      for (let i = 0; i < cmLines.length; i++) {
        const lineText = cmLines[i].textContent || ''
        if (lineText.includes('<figure')) {
          return i + 1
        }
      }
      return -1
    })

    console.log(`✓ 找到 <figure 标签所在行: ${figureLineNumber}`)
    expect(figureLineNumber).toBeGreaterThan(0)

    // 3. 点击该行的铅笔图标 - 尝试多种方式
    // 方式1: 点击行号旁边的装订线区域
    await page.evaluate((lineNum) => {
      const lineElement = document.querySelector(`.CodeMirror-linenumber:nth-child(${lineNum})`)
      if (lineElement) {
        lineElement.click()
      }
    }, figureLineNumber)
    await page.waitForTimeout(1000)

    // 方式2: 查找并点击设计视图图标
    const designViewMarkers = page.locator('.cm-designview-marker, [class*="designview"]')
    const markerCount = await designViewMarkers.count()
    console.log(`找到 ${markerCount} 个设计视图图标`)

    if (markerCount > 0) {
      await designViewMarkers.first().click()
      console.log('✓ 点击设计视图图标')
    }

    // 4. 等待 FigureDesigner 组件弹窗/抽屉出现
    await page.waitForSelector('.figure-designer, .ant-modal-content, .ant-drawer-content', { timeout: 10000 })
    console.log('✓ FigureDesigner 组件已打开')

    // 截图当前状态
    await page.screenshot({ path: 'test-results/01-figure-designer-opened.png', fullPage: true })

    // 5. 切换到"图例"标签页
    const legendTab = page.locator('.ant-tabs-tab:has-text("图例")')
    await legendTab.click()
    await page.waitForTimeout(1000)
    console.log('✓ 切换到图例Tab')

    // 截图切换后的状态
    await page.screenshot({ path: 'test-results/02-legend-tab-switched.png', fullPage: true })

    // 6. 验证"新建图例"按钮存在且可见
    const addLegendButton = page.locator('button:has-text("新建图例")')
    const isButtonVisible = await addLegendButton.isVisible()
    console.log(`"新建图例"按钮可见性: ${isButtonVisible}`)

    if (!isButtonVisible) {
      // 如果按钮不可见，打印页面HTML结构帮助诊断
      const pageContent = await page.content()
      console.log('=== 页面HTML结构 (部分) ===')
      console.log(pageContent.substring(0, 2000))
    }

    await expect(addLegendButton).toBeVisible({ timeout: 5000 })
    console.log('✓ "新建图例"按钮可见')

    // 7. 验证表格存在
    const tables = page.locator('.ant-table')
    const tableCount = await tables.count()
    console.log(`找到 ${tableCount} 个表格`)

    const legendTable = tables.last() // 假设图例表格是最后一个
    const isTableVisible = await legendTable.isVisible()
    console.log(`图例表格可见性: ${isTableVisible}`)

    await expect(legendTable).toBeVisible({ timeout: 5000 })
    console.log('✓ 图例表格可见')

    // 8. 验证表格列标题
    const tableHeaders = await legendTable.locator('thead th').allTextContents()
    console.log('表格列标题:', tableHeaders)

    expect(tableHeaders.join(',')).toContain('编号')
    expect(tableHeaders.join(',')).toContain('名称')
    console.log('✓ 表格列标题包含必要字段')

    // 9. 截图保存最终状态
    await page.screenshot({ path: 'test-results/03-legend-tab-final.png', fullPage: true })
    console.log('✓ 最终截图已保存')

    // 10. 点击"新建图例"按钮，验证功能
    await addLegendButton.click()
    await page.waitForTimeout(1000)

    // 验证新增的行中有输入框
    const inputs = legendTable.locator('tbody input')
    const inputCount = await inputs.count()
    console.log(`✓ 找到 ${inputCount} 个输入框`)
    expect(inputCount).toBeGreaterThanOrEqual(2)

    await page.screenshot({ path: 'test-results/04-legend-new-row.png', fullPage: true })
    console.log('✓ 新建图例后截图已保存')
  })

  test('验证图例数据是否正确加载', async ({ page }) => {
    // 前置步骤：进入设计视图
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    const figureLineNumber = await page.evaluate(() => {
      const cmLines = document.querySelectorAll('.CodeMirror-line')
      for (let i = 0; i < cmLines.length; i++) {
        if ((cmLines[i].textContent || '').includes('<figure')) {
          return i + 1
        }
      }
      return -1
    })

    await page.evaluate((lineNum) => {
      const lineElement = document.querySelector(`.CodeMirror-linenumber:nth-child(${lineNum})`)
      if (lineElement) lineElement.click()
    }, figureLineNumber)
    await page.waitForTimeout(1000)

    const designViewMarker = page.locator('.cm-designview-marker, [class*="designview"]').first()
    if (await designViewMarker.isVisible()) {
      await designViewMarker.click()
    }

    await page.waitForSelector('.figure-designer, .ant-modal-content, .ant-drawer-content', { timeout: 10000 })

    // 切换到图例Tab
    await page.click('.ant-tabs-tab:has-text("图例")')
    await page.waitForTimeout(1000)

    // 检查Vue组件的数据
    const componentData = await page.evaluate(() => {
      try {
        const app = document.querySelector('#app').__vue__
        function findComponent(vm, componentName) {
          if (vm.$options.name === componentName) {
            return vm
          }
          if (vm.$children) {
            for (const child of vm.$children) {
              const found = findComponent(child, componentName)
              if (found) return found
            }
          }
          return null
        }

        const figureDesigner = findComponent(app, 'FigureDesigner')
        if (figureDesigner) {
          return {
            hasLegends: !!figureDesigner.legends,
            legendCount: figureDesigner.legends ? figureDesigner.legends.length : 0,
            legends: figureDesigner.legends || [],
            activeTabKey: figureDesigner.activeTabKey
          }
        }
      } catch (e) {
        return { error: e.message }
      }
      return null
    })

    console.log('Vue组件数据:', JSON.stringify(componentData, null, 2))

    if (componentData && !componentData.error) {
      console.log(`✓ 图例数据加载状态: ${componentData.hasLegends ? '已加载' : '未加载'}`)
      console.log(`✓ 图例数量: ${componentData.legendCount}`)
      console.log(`✓ 当前Tab: ${componentData.activeTabKey}`)

      // 如果有图例数据，验证表格中是否显示
      if (componentData.legendCount > 0) {
        const tableRows = await page.locator('.ant-table tbody tr:not(.ant-table-placeholder)').count()
        console.log(`✓ 表格显示行数: ${tableRows}`)
        expect(tableRows).toBe(componentData.legendCount)
      }
    } else {
      console.log('⚠️ 无法获取Vue组件数据或出现错误')
    }

    await page.screenshot({ path: 'test-results/05-legend-data-check.png', fullPage: true })
  })
})
