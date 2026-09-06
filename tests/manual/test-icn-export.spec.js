const { test, expect } = require('@playwright/test')

/**
 * ICN导出功能 - 手工功能测试
 *
 * 目标：验证"选择实体"弹窗的核心功能
 */

test.describe('ICN导出 - 手工功能测试', () => {
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()

    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 10000 })
    await page.fill('input[placeholder*="账户名"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // 打开项目
    try {
      const openProjectBtn = page.locator('button:has-text("打开项目")').first()
      if (await openProjectBtn.isVisible({ timeout: 3000 })) {
        await openProjectBtn.click()
        await page.waitForTimeout(1000)

        const firstProject = page.locator('.ant-table-row').first()
        if (await firstProject.isVisible({ timeout: 2000 })) {
          await firstProject.click()
          await page.click('button:has-text("确定")')
          await page.waitForTimeout(2000)
        }
      }
    } catch (e) {
      console.log('项目可能已打开')
    }
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('【核心】A2: 打开"选择实体"弹窗', async () => {
    console.log('\n========== 测试A2: 选择实体弹窗 ==========')

    // 导航到ICN导出页面
    await page.goto('http://localhost:3000/#/ietm/ietmicn-export')
    await page.waitForTimeout(2000)

    // 检查页面是否加载
    const pageExists = await page.locator('body').isVisible()
    console.log(`页面加载: ${pageExists ? '✅' : '❌'}`)

    // 查找"添加"按钮
    const addButton = page.locator('button:has-text("添加")')
    const addBtnExists = await addButton.isVisible({ timeout: 5000 })
    console.log(`"添加"按钮存在: ${addBtnExists ? '✅' : '❌'}`)

    if (addBtnExists) {
      // 点击"添加"按钮
      await addButton.click()
      await page.waitForTimeout(1500)

      // 检查弹窗标题
      const modalTitle = await page.locator('.ant-modal-title').textContent({ timeout: 5000 }).catch(() => '未找到')
      console.log(`弹窗标题: "${modalTitle}"`)

      // 核心验证
      const isCorrectTitle = modalTitle === '选择实体'
      console.log(`标题正确: ${isCorrectTitle ? '✅' : '❌'}`)

      if (isCorrectTitle) {
        console.log('\n✅ 测试通过：弹窗标题为"选择实体"')
      } else {
        console.log(`\n❌ 测试失败：期望"选择实体"，实际"${modalTitle}"`)
      }

      // 检查弹窗布局
      const treeExists = await page.locator('.ant-tree').isVisible({ timeout: 2000 }).catch(() => false)
      const tableExists = await page.locator('.ant-table').isVisible({ timeout: 2000 }).catch(() => false)
      const searchExists = await page.locator('input[placeholder*="ICN"]').isVisible({ timeout: 2000 }).catch(() => false)

      console.log(`\n弹窗布局检查:`)
      console.log(`  构型树: ${treeExists ? '✅' : '❌'}`)
      console.log(`  ICN表格: ${tableExists ? '✅' : '❌'}`)
      console.log(`  搜索框: ${searchExists ? '✅' : '❌'}`)

      expect(isCorrectTitle).toBeTruthy()
      expect(treeExists).toBeTruthy()
      expect(tableExists).toBeTruthy()
    } else {
      console.log('\n❌ 页面可能未正确加载或路由配置有问题')
      throw new Error('未找到"添加"按钮')
    }
  })

  test('【兼容性】D1: DM编辑器"插入图符"不受影响', async () => {
    console.log('\n========== 测试D1: DM编辑器兼容性 ==========')

    // 导航到数据模块列表
    await page.goto('http://localhost:3000/#/ietm/ietmdatamodule-list')
    await page.waitForTimeout(2000)

    // 查找第一个DM
    const firstDm = page.locator('.ant-table-tbody tr').first()
    const dmExists = await firstDm.isVisible({ timeout: 5000 })

    if (dmExists) {
      // 点击"浏览或编辑"
      const editBtn = firstDm.locator('a:has-text("浏览或编辑")')
      if (await editBtn.isVisible({ timeout: 2000 })) {
        await editBtn.click()
        await page.waitForTimeout(3000)

        // 查找"插入图符"按钮
        const insertSymbolBtn = page.locator('button:has-text("插入图符")')
        const btnExists = await insertSymbolBtn.isVisible({ timeout: 5000 })
        console.log(`"插入图符"按钮存在: ${btnExists ? '✅' : '❌'}`)

        if (btnExists) {
          // 点击按钮
          await insertSymbolBtn.click()
          await page.waitForTimeout(1500)

          // 检查弹窗标题
          const modalTitle = await page.locator('.ant-modal-title').textContent({ timeout: 5000 }).catch(() => '未找到')
          console.log(`弹窗标题: "${modalTitle}"`)

          // 核心验证：必须是"插入图符"，不能是"选择实体"
          const isCorrectTitle = modalTitle === '插入图符'
          console.log(`标题正确: ${isCorrectTitle ? '✅' : '❌'}`)

          if (isCorrectTitle) {
            console.log('\n✅ 兼容性测试通过：DM编辑器弹窗标题仍为"插入图符"')
          } else {
            console.log(`\n❌ 兼容性测试失败：标题被改为"${modalTitle}"，影响了DM编辑器`)
          }

          expect(isCorrectTitle).toBeTruthy()

          // 检查底部表单（插入图符特有的）
          const widthInput = await page.locator('label:has-text("宽")').isVisible({ timeout: 2000 }).catch(() => false)
          const heightInput = await page.locator('label:has-text("高")').isVisible({ timeout: 2000 }).catch(() => false)
          const scaleInput = await page.locator('label:has-text("比例")').isVisible({ timeout: 2000 }).catch(() => false)

          console.log(`\n底部表单检查（插入图符特有）:`)
          console.log(`  宽度输入框: ${widthInput ? '✅' : '❌'}`)
          console.log(`  高度输入框: ${heightInput ? '✅' : '❌'}`)
          console.log(`  比例输入框: ${scaleInput ? '✅' : '❌'}`)

          expect(widthInput).toBeTruthy()
          expect(heightInput).toBeTruthy()
          expect(scaleInput).toBeTruthy()
        } else {
          console.log('\n⚠️ 未找到"插入图符"按钮，可能页面结构已变化')
        }
      }
    } else {
      console.log('\n⚠️ 未找到DM数据，跳过兼容性测试')
    }
  })

  test('【基础流程】A7: 选择ICN并添加到列表', async () => {
    console.log('\n========== 测试A7: 添加ICN流程 ==========')

    // 导航到ICN导出页面
    await page.goto('http://localhost:3000/#/ietm/ietmicn-export')
    await page.waitForTimeout(2000)

    // 点击"添加"按钮
    const addButton = page.locator('button:has-text("添加")')
    await addButton.click()
    await page.waitForTimeout(1500)

    // 等待构型树加载
    await page.waitForSelector('.ant-tree', { timeout: 5000 })

    // 点击构型树第一个节点
    const firstTreeNode = page.locator('.ant-tree-node-content-wrapper').first()
    if (await firstTreeNode.isVisible({ timeout: 3000 })) {
      await firstTreeNode.click()
      await page.waitForTimeout(2000)

      // 检查ICN列表是否加载
      const tableRows = page.locator('.ant-modal .ant-table-tbody tr')
      const rowCount = await tableRows.count()
      console.log(`ICN列表行数: ${rowCount}`)

      if (rowCount > 0) {
        // 点击第一行
        const firstRow = tableRows.first()
        await firstRow.click()
        await page.waitForTimeout(500)

        // 点击"确定"按钮
        const okButton = page.locator('.ant-modal button:has-text("确定")')
        await okButton.click()
        await page.waitForTimeout(2000)

        // 检查主页面列表
        const mainTableRows = page.locator('.ant-table-tbody tr')
        const mainRowCount = await mainTableRows.count()
        console.log(`主页面ICN列表行数: ${mainRowCount}`)

        const success = mainRowCount > 0
        console.log(`ICN添加成功: ${success ? '✅' : '❌'}`)

        if (success) {
          // 检查7列是否完整
          const columns = await page.locator('.ant-table-thead th').allTextContents()
          console.log(`\n列标题:`, columns)

          const expectedColumns = ['序号', 'ICN', '版本号', '安全等级', '文件名称', '创建日期', '创建人']
          const hasAllColumns = expectedColumns.every(col =>
            columns.some(c => c.includes(col))
          )

          console.log(`7列完整: ${hasAllColumns ? '✅' : '❌'}`)
          expect(hasAllColumns).toBeTruthy()
        }

        expect(success).toBeTruthy()
      } else {
        console.log('\n⚠️ 该构型节点下无ICN数据')
      }
    }
  })
})
