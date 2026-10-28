// @ts-check
const { test, expect } = require('@playwright/test')

test.describe('Figure Designer - 图例和热点字段修复验证', () => {
  test.beforeEach(async ({ page }) => {
    // 访问编辑页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2114332624301260801?mode=edit&dmc=DMC-ZB1-A-04-00-00-00A-007A-A_001-01_zh-CN')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  })

  test('验证图例页面列表和按钮显示', async ({ page }) => {
    // 1. 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })

    // 2. 查找包含 <figure 的行并切换到设计视图
    const figureLineFound = await page.evaluate(() => {
      const editor = window.editor
      if (!editor) return false

      for (let i = 0; i < editor.lineCount(); i++) {
        const line = editor.getLine(i)
        if (line.includes('<figure')) {
          // 点击这一行
          editor.setCursor(i, 0)
          // 模拟点击铅笔图标
          const gutterMarker = document.querySelector('.CodeMirror-linenumber:has-text("' + (i + 1) + '")')
          return true
        }
      }
      return false
    })

    expect(figureLineFound).toBe(true)

    // 3. 点击设计视图铅笔图标（通过行号装订线）
    await page.click('.cm-gutter-elt.cm-designview-marker >> nth=0', { timeout: 5000 })

    // 4. 等待 FigureDesigner 组件加载
    await page.waitForSelector('.figure-designer', { timeout: 10000 })

    // 5. 切换到"图例"标签页
    await page.click('text=图例')
    await page.waitForTimeout(1000)

    // 6. 验证按钮存在
    const addButton = page.locator('text=新建图例')
    await expect(addButton).toBeVisible()

    const upButton = page.locator('text=上移').nth(1) // 第二个上移按钮是图例的
    await expect(upButton).toBeVisible()

    const downButton = page.locator('text=下移').nth(1) // 第二个下移按钮是图例的
    await expect(downButton).toBeVisible()

    // 7. 验证表格列标题
    const table = page.locator('.ant-table').nth(1) // 图例是第二个表格
    const headers = await table.locator('thead th').allTextContents()

    expect(headers).toContain('编号')
    expect(headers).toContain('名称')
    expect(headers).toContain('操作')

    console.log('✅ 图例页面列表和按钮显示正常')
  })

  test('验证图例字段可编辑', async ({ page }) => {
    // 前置步骤：进入设计视图并切换到图例页
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })
    await page.evaluate(() => {
      const editor = window.editor
      for (let i = 0; i < editor.lineCount(); i++) {
        if (editor.getLine(i).includes('<figure')) {
          editor.setCursor(i, 0)
          break
        }
      }
    })
    await page.click('.cm-gutter-elt.cm-designview-marker >> nth=0', { timeout: 5000 })
    await page.waitForSelector('.figure-designer', { timeout: 10000 })
    await page.click('text=图例')
    await page.waitForTimeout(1000)

    // 1. 点击"新建图例"按钮
    await page.click('text=新建图例')
    await page.waitForTimeout(500)

    // 2. 验证新增的行中有输入框
    const table = page.locator('.ant-table').nth(1)
    const noInput = table.locator('input').first()
    const nameInput = table.locator('input').nth(1)

    await expect(noInput).toBeVisible()
    await expect(nameInput).toBeVisible()

    // 3. 输入数据
    await noInput.fill('001')
    await nameInput.fill('测试图例名称')

    // 4. 验证输入成功
    expect(await noInput.inputValue()).toBe('001')
    expect(await nameInput.inputValue()).toBe('测试图例名称')

    console.log('✅ 图例字段可编辑验证通过')
  })

  test('验证热点字段名称与旧系统一致', async ({ page }) => {
    // 前置步骤：进入设计视图
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })
    await page.evaluate(() => {
      const editor = window.editor
      for (let i = 0; i < editor.lineCount(); i++) {
        if (editor.getLine(i).includes('<figure')) {
          editor.setCursor(i, 0)
          break
        }
      }
    })
    await page.click('.cm-gutter-elt.cm-designview-marker >> nth=0', { timeout: 5000 })
    await page.waitForSelector('.figure-designer', { timeout: 10000 })

    // 1. 确保在"图形"标签页
    await page.click('text=图形')
    await page.waitForTimeout(1000)

    // 2. 获取热点表格的列标题
    const hotspotTable = page.locator('.hotspot-section .ant-table')
    const headers = await hotspotTable.locator('thead th').allTextContents()

    // 3. 验证列标题与旧系统一致
    expect(headers).toContain('apsID')
    expect(headers).toContain('aps名称')
    expect(headers).toContain('ID')
    expect(headers).toContain('操作')

    // 4. 验证不包含旧的错误标题
    expect(headers.join(',')).not.toContain('热点ID')
    expect(headers.join(',')).not.toContain('名称') // 应该是"aps名称"而不是"名称"

    console.log('✅ 热点字段名称与旧系统一致')
  })

  test('验证热点字段可编辑', async ({ page }) => {
    // 前置步骤：进入设计视图
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })
    await page.evaluate(() => {
      const editor = window.editor
      for (let i = 0; i < editor.lineCount(); i++) {
        if (editor.getLine(i).includes('<figure')) {
          editor.setCursor(i, 0)
          break
        }
      }
    })
    await page.click('.cm-gutter-elt.cm-designview-marker >> nth=0', { timeout: 5000 })
    await page.waitForSelector('.figure-designer', { timeout: 10000 })
    await page.click('text=图形')
    await page.waitForTimeout(1000)

    // 1. 选择第一个图形（如果存在）
    const graphicRow = page.locator('.graphic-section .ant-table tbody tr').first()
    if (await graphicRow.isVisible()) {
      await graphicRow.click()
      await page.waitForTimeout(500)

      // 2. 点击"新建热点"按钮
      await page.click('text=新建热点')
      await page.waitForTimeout(500)

      // 3. 验证新增的行中有三个输入框（apsID、aps名称、ID）
      const hotspotTable = page.locator('.hotspot-section .ant-table')
      const inputs = hotspotTable.locator('tbody tr:last-child input')

      expect(await inputs.count()).toBe(3)

      // 4. 依次输入数据
      await inputs.nth(0).fill('APS001')
      await inputs.nth(1).fill('测试热点名称')
      await inputs.nth(2).fill('ID001')

      // 5. 验证输入成功
      expect(await inputs.nth(0).inputValue()).toBe('APS001')
      expect(await inputs.nth(1).inputValue()).toBe('测试热点名称')
      expect(await inputs.nth(2).inputValue()).toBe('ID001')

      console.log('✅ 热点字段可编辑验证通过')
    } else {
      console.log('⚠️  没有找到图形，跳过热点可编辑测试')
    }
  })
})
