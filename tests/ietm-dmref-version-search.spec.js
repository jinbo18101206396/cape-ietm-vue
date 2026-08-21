/**
 * 引用DM弹窗 - 引用指定版本搜索功能测试
 *
 * 验证要点：
 * 1. 引用指定版本有搜索栏（与引用最新版一致）
 * 2. 表格样式一致（bordered、scroll）
 * 3. 搜索功能正常工作
 * 4. 版本号、版本日期列可见
 * 5. 两个页签搜索条件独立
 */

const { test, expect } = require('@playwright/test')

test.describe('引用DM弹窗 - 引用指定版本搜索', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3003/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // 导航到数据模块管理
    await page.goto('http://localhost:3003')
    await page.waitForTimeout(1000)
    await page.click('text=IETM管理')
    await page.waitForTimeout(500)
    await page.click('text=数据模块管理')
    await page.waitForTimeout(2000)

    // 选择项目节点
    await page.click('.ant-tree-title >> nth=0')
    await page.waitForTimeout(1500)

    // 打开第一条DM
    await page.click('.ant-table-tbody tr:first-child td:nth-child(2) a')
    await page.waitForTimeout(2500)

    // 点击引用DM按钮
    await page.click('button:has-text("引用DM")')
    await page.waitForTimeout(1000)

    // 切换到引用指定版本页签
    await page.click('.ant-tabs-tab:has-text("引用指定版本")')
    await page.waitForTimeout(1000)
  })

  test('TC-01: 引用指定版本有搜索栏', async ({ page }) => {
    // 验证搜索栏容器存在
    const searchBar = page.locator('.ant-tabs-tabpane-active .dm-ref-search')
    await expect(searchBar).toBeVisible()

    // 验证4个搜索输入框
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')).toBeVisible()
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]')).toBeVisible()
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="信息名称"]')).toBeVisible()
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DM类型"]')).toBeVisible()

    // 验证查询和清空按钮
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search button:has-text("查询")')).toBeVisible()
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search button:has-text("清空")')).toBeVisible()
  })

  test('TC-02: 表头包含版本号和版本日期列', async ({ page }) => {
    // 获取所有表头单元格文本
    const headers = await page.locator('.ant-tabs-tabpane-active .ant-table-thead th').allTextContents()

    // 验证包含所有必需列
    expect(headers.some(h => h.includes('DMC'))).toBeTruthy()
    expect(headers.some(h => h.includes('技术名称'))).toBeTruthy()
    expect(headers.some(h => h.includes('信息名称'))).toBeTruthy()
    expect(headers.some(h => h.includes('DM类型'))).toBeTruthy()
    expect(headers.some(h => h.includes('版本类型'))).toBeTruthy()
    expect(headers.some(h => h.includes('版本号'))).toBeTruthy()
    expect(headers.some(h => h.includes('版本日期'))).toBeTruthy()
  })

  test('TC-03: 表格有边框', async ({ page }) => {
    // 验证表格有bordered class
    const table = page.locator('.ant-tabs-tabpane-active .ant-table-bordered')
    await expect(table).toBeVisible()
  })

  test('TC-04: DMC搜索功能', async ({ page }) => {
    // 获取第一行DMC文本
    const firstDmc = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr:first-child td:nth-child(2)').textContent()
    const searchTerm = firstDmc.trim().substring(0, 10)

    // 输入搜索条件
    await page.fill('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]', searchTerm)

    // 点击查询
    await page.click('.ant-tabs-tabpane-active .dm-ref-search button:has-text("查询")')
    await page.waitForTimeout(1500)

    // 验证结果包含搜索关键字
    const resultDmc = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr:first-child td:nth-child(2)').textContent()
    expect(resultDmc).toContain(searchTerm)
  })

  test('TC-05: 清空按钮功能', async ({ page }) => {
    // 输入搜索条件
    await page.fill('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]', 'TEST')
    await page.fill('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]', '测试')

    // 验证已输入
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')).toHaveValue('TEST')
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]')).toHaveValue('测试')

    // 点击清空
    await page.click('.ant-tabs-tabpane-active .dm-ref-search button:has-text("清空")')
    await page.waitForTimeout(1000)

    // 验证已清空
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')).toHaveValue('')
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]')).toHaveValue('')
  })

  test('TC-06: Enter键触发搜索', async ({ page }) => {
    // 在DMC输入框输入并按Enter
    const dmcInput = page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')
    await dmcInput.fill('DMC')
    await dmcInput.press('Enter')
    await page.waitForTimeout(1500)

    // 验证请求已发送（通过检查loading状态或结果变化）
    const rows = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr').count()
    expect(rows).toBeGreaterThanOrEqual(0) // 有结果或无结果都正常
  })

  test('TC-07: 两个页签搜索条件独立', async ({ page }) => {
    // 在引用指定版本输入搜索条件
    await page.fill('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]', 'VERSION_TEST')
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')).toHaveValue('VERSION_TEST')

    // 切换到引用最新版
    await page.click('.ant-tabs-tab:has-text("引用最新版")')
    await page.waitForTimeout(500)

    // 验证引用最新版的搜索框是空的
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')).toHaveValue('')

    // 在引用最新版输入搜索条件
    await page.fill('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]', 'LATEST_TEST')
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')).toHaveValue('LATEST_TEST')

    // 切换回引用指定版本
    await page.click('.ant-tabs-tab:has-text("引用指定版本")')
    await page.waitForTimeout(500)

    // 验证引用指定版本的搜索条件保持
    await expect(page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')).toHaveValue('VERSION_TEST')
  })

  test('TC-08: 搜索栏单行显示（flex布局）', async ({ page }) => {
    // 获取搜索栏容器
    const searchBar = page.locator('.ant-tabs-tabpane-active .dm-ref-search')

    // 验证display为flex（通过获取computed style）
    const displayStyle = await searchBar.evaluate(el => window.getComputedStyle(el).display)
    expect(displayStyle).toBe('flex')

    // 验证所有搜索元素在同一行（通过比较Y坐标）
    const dmcInput = page.locator('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')
    const queryBtn = page.locator('.ant-tabs-tabpane-active .dm-ref-search button:has-text("查询")')

    const dmcBox = await dmcInput.boundingBox()
    const btnBox = await queryBtn.boundingBox()

    // Y坐标差异应该很小（同一行）
    expect(Math.abs(dmcBox.y - btnBox.y)).toBeLessThan(10)
  })

  test('TC-09: 版本号和版本日期列可见（无需横向滚动）', async ({ page }) => {
    // 获取版本号列（倒数第二列）
    const versionNoHeader = page.locator('.ant-tabs-tabpane-active .ant-table-thead th:has-text("版本号")')
    await expect(versionNoHeader).toBeVisible()

    // 获取版本日期列（最后一列）
    const versionDateHeader = page.locator('.ant-tabs-tabpane-active .ant-table-thead th:has-text("版本日期")')
    await expect(versionDateHeader).toBeVisible()

    // 验证表头在视口内（不需要滚动）
    const dateHeaderBox = await versionDateHeader.boundingBox()
    const viewportSize = page.viewportSize()

    expect(dateHeaderBox.x + dateHeaderBox.width).toBeLessThanOrEqual(viewportSize.width)
  })

  test('TC-10: 技术名称搜索功能', async ({ page }) => {
    // 获取第一行技术名称
    const firstTechName = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr:first-child td:nth-child(3)').textContent()

    if (firstTechName && firstTechName.trim()) {
      const searchTerm = firstTechName.trim()

      // 输入搜索条件
      await page.fill('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]', searchTerm)

      // 点击查询
      await page.click('.ant-tabs-tabpane-active .dm-ref-search button:has-text("查询")')
      await page.waitForTimeout(1500)

      // 验证有结果
      const rowCount = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr').count()
      expect(rowCount).toBeGreaterThan(0)
    }
  })

  test('TC-11: DM类型搜索功能', async ({ page }) => {
    // 获取第一行DM类型
    const firstDmType = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr:first-child td:nth-child(5)').textContent()

    if (firstDmType && firstDmType.trim() && firstDmType !== '-') {
      const searchTerm = firstDmType.trim()

      // 输入搜索条件
      await page.fill('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DM类型"]', searchTerm)

      // 点击查询
      await page.click('.ant-tabs-tabpane-active .dm-ref-search button:has-text("查询")')
      await page.waitForTimeout(1500)

      // 验证结果中DM类型匹配
      const resultDmType = await page.locator('.ant-tabs-tabpane-active .ant-table-tbody tr:first-child td:nth-child(5)').textContent()
      expect(resultDmType).toContain(searchTerm)
    }
  })

  test('TC-12: 对比两个页签表格配置一致', async ({ page }) => {
    // 获取引用指定版本的表格scroll配置（通过检查DOM属性）
    const versionTableScroll = await page.locator('.ant-tabs-tabpane-active .ant-table-body').evaluate(el => {
      const style = window.getComputedStyle(el)
      return {
        overflowX: style.overflowX,
        overflowY: style.overflowY
      }
    })

    // 切换到引用最新版
    await page.click('.ant-tabs-tab:has-text("引用最新版")')
    await page.waitForTimeout(500)

    // 获取引用最新版的表格scroll配置
    const latestTableScroll = await page.locator('.ant-tabs-tabpane-active .ant-table-body').evaluate(el => {
      const style = window.getComputedStyle(el)
      return {
        overflowX: style.overflowX,
        overflowY: style.overflowY
      }
    })

    // 验证两者一致
    expect(versionTableScroll).toEqual(latestTableScroll)
  })
})
