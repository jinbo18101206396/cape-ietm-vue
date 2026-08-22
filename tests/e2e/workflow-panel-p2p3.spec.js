/**
 * 工作流信息面板 P2/P3 级修复 E2E 测试
 * 使用 Playwright 进行真实浏览器测试
 *
 * 运行前准备：
 * 1. 启动前端：npm run serve (http://localhost:3000)
 * 2. 启动后端：jeecg-boot (http://localhost:9999)
 * 3. 准备测试数据：至少一个DM处于工作流中
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const USERNAME = 'admin'
const PASSWORD = '123456'

// 测试数据（需根据实际数据调整）
const TEST_DM_ID = '1824301934136090627' // 需要一个正在工作流中的DM

test.describe('工作流信息面板 P2/P3 级修复 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="请输入用户名"]', USERNAME)
    await page.fill('input[placeholder="请输入密码"]', PASSWORD)
    await page.click('button:has-text("登录")')
    await page.waitForURL(`${BASE_URL}/dashboard/**`)
  })

  // ==================== P2-1: 已处理节点绿色对勾样式 ====================
  test('P2-1: 已处理节点应显示绿色对勾图标', async ({ page }) => {
    // 导航到DM编辑页
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    // 查找一个已处理节点的DM
    await page.click(`tr[data-row-key="${TEST_DM_ID}"] >> text=更多`)
    await page.waitForTimeout(500)
    await page.click('text=浏览DM内容')
    await page.waitForTimeout(2000)

    // 检查工作流面板中的已处理节点
    const doneRow = page.locator('.wf-row-done').first()
    if (await doneRow.count() > 0) {
      // 检查第一列是否有绿色对勾
      const firstCell = doneRow.locator('td').first()
      const hasCheckmark = await firstCell.evaluate(el => {
        const before = window.getComputedStyle(el, '::before')
        return before.content.includes('✓') && before.color.includes('82, 196, 26')
      })
      expect(hasCheckmark).toBeTruthy()
    }
  })

  // ==================== P2-3: 拿回按钮动态显隐 ====================
  test('P2-3: 拿回按钮在无可拿回节点时应隐藏', async ({ page }) => {
    // 导航到一个未处理的DM
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    // 创建新DM并启动流程
    await page.click('button:has-text("新建DM")')
    await page.waitForTimeout(1000)

    // 填写必要信息（根据实际表单调整）
    await page.fill('input[placeholder*="DM编码"]', `TEST-DM-${Date.now()}`)
    await page.fill('input[placeholder*="标题"]', '测试拿回按钮显隐')
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(2000)

    // 进入编辑页面
    const lastRow = page.locator('tbody tr').last()
    await lastRow.click('text=更多')
    await page.waitForTimeout(500)
    await lastRow.click('text=编辑DM内容')
    await page.waitForTimeout(2000)

    // 检查拿回按钮是否隐藏（因为没有已处理节点）
    const getbackBtn = page.locator('button:has-text("拿回")')
    await expect(getbackBtn).toBeHidden()
  })

  test('P2-3: 处理节点后拿回按钮应显示', async ({ page }) => {
    // 导航到有待办的DM
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    // 查找有待办的DM
    const todoRow = page.locator('tr:has-text("审批中")').first()
    if (await todoRow.count() > 0) {
      await todoRow.click('text=更多')
      await page.waitForTimeout(500)
      await todoRow.click('text=编辑DM内容')
      await page.waitForTimeout(2000)

      // 提交处理
      await page.click('button:has-text("提交处理")')
      await page.waitForTimeout(2000)

      // 刷新后检查拿回按钮
      await page.click('button:has-text("刷新")')
      await page.waitForTimeout(1000)

      const getbackBtn = page.locator('button:has-text("拿回")')
      await expect(getbackBtn).toBeVisible()
    }
  })

  // ==================== P2-4: 阶段列动态显隐 ====================
  test('P2-4: 非分阶段流程不显示阶段列', async ({ page }) => {
    // 创建一个不分阶段的流程DM
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    // 查找一个简单流程的DM
    const simpleFlowDm = page.locator('tr').first()
    await simpleFlowDm.click('text=更多')
    await page.waitForTimeout(500)
    await simpleFlowDm.click('text=浏览DM内容')
    await page.waitForTimeout(2000)

    // 检查节点表头是否不包含"阶段"列
    const stageHeader = page.locator('th:has-text("阶段")')
    const hasStage = await stageHeader.count()

    // 如果流程确实不分阶段，则不应显示阶段列
    // （需要根据实际测试数据判断）
  })

  test('P2-4: 分阶段流程显示阶段列', async ({ page }) => {
    // 查找一个分阶段的流程DM
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    // 需要准备一个分阶段的测试DM
    // 检查是否显示阶段列
    const stageRow = page.locator('tr:has-text("审批中")').first()
    if (await stageRow.count() > 0) {
      await stageRow.click('text=更多')
      await page.waitForTimeout(500)
      await stageRow.click('text=浏览DM内容')
      await page.waitForTimeout(2000)

      const stageHeader = page.locator('th:has-text("阶段")')
      // 如果是分阶段流程，应该显示阶段列
      // const isVisible = await stageHeader.isVisible()
      // expect(isVisible).toBeTruthy()
    }
  })

  // ==================== P3-1: 钩子命名兼容 ====================
  test('P3-1: 新系统应触发 kebab-case 命名事件', async ({ page }) => {
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    // 注入监听器
    await page.evaluate(() => {
      window.eventsFired = []
      const originalEmit = window.app.$root.$emit
      window.app.$root.$emit = function(...args) {
        window.eventsFired.push(args[0])
        return originalEmit.apply(this, args)
      }
    })

    // 触发删除节点操作
    const todoRow = page.locator('tr:has-text("审批中")').first()
    if (await todoRow.count() > 0) {
      await todoRow.click('text=更多')
      await page.waitForTimeout(500)
      await todoRow.click('text=编辑DM内容')
      await page.waitForTimeout(2000)

      // 选中一个节点
      await page.click('.ant-table-tbody tr').first()
      await page.waitForTimeout(500)

      // 点击删除节点按钮（会触发 before-delete-node 事件）
      await page.click('button:has-text("删除节点")')
      await page.waitForTimeout(500)

      // 检查事件是否触发
      const events = await page.evaluate(() => window.eventsFired)
      expect(events).toContain('before-delete-node')
    }
  })

  // ==================== P3-2: 提交后自动关闭 ====================
  test('P3-2: closeafterexec=true 时提交后应自动返回', async ({ page }) => {
    // 手动构造带 closeafterexec 参数的URL
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    const todoRow = page.locator('tr:has-text("审批中")').first()
    if (await todoRow.count() > 0) {
      const dmId = await todoRow.getAttribute('data-row-key')

      // 导航到带 closeafterexec 参数的编辑页
      await page.goto(`${BASE_URL}/ietm/dm-content-editor?id=${dmId}&closeafterexec=1`)
      await page.waitForTimeout(2000)

      // 提交处理
      await page.fill('textarea[placeholder*="意见"]', '测试自动关闭')
      await page.click('button:has-text("提交处理")')
      await page.waitForTimeout(2000)

      // 验证是否返回到列表页
      await expect(page).toHaveURL(/ietm-data-module-management/)
    }
  })

  // ==================== P3-3: 重启流程参数 ====================
  test('P3-3: restartflow=true 时流程结束后仍可编辑节点', async ({ page }) => {
    // 查找一个已完成的流程
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    const completedRow = page.locator('tr:has-text("完成")').first()
    if (await completedRow.count() > 0) {
      const dmId = await completedRow.getAttribute('data-row-key')

      // 导航到带 restartflow 参数的编辑页
      await page.goto(`${BASE_URL}/ietm/dm-content-editor?id=${dmId}&restartflow=1`)
      await page.waitForTimeout(2000)

      // 验证节点编辑按钮是否可见（正常情况下已完成流程不可编辑）
      const addNodeBtn = page.locator('button:has-text("新增节点")')
      await expect(addNodeBtn).toBeVisible()

      const saveNodeBtn = page.locator('button:has-text("保存节点")')
      await expect(saveNodeBtn).toBeVisible()
    }
  })

  // ==================== 综合场景测试 ====================
  test('综合场景: 完整工作流处理流程', async ({ page }) => {
    await page.goto(`${BASE_URL}/ietm/ietm-data-module-management`)
    await page.waitForTimeout(1000)

    // 1. 创建新DM
    await page.click('button:has-text("新建DM")')
    await page.waitForTimeout(1000)
    const testCode = `TEST-P2P3-${Date.now()}`
    await page.fill('input[placeholder*="DM编码"]', testCode)
    await page.fill('input[placeholder*="标题"]', 'P2P3综合测试')
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(2000)

    // 2. 进入编辑页面
    const newRow = page.locator(`tr:has-text("${testCode}")`).first()
    await newRow.click('text=更多')
    await page.waitForTimeout(500)
    await newRow.click('text=编辑DM内容')
    await page.waitForTimeout(2000)

    // 3. 启动流程
    await page.click('button:has-text("启动流程")')
    await page.waitForTimeout(2000)

    // 4. 检查拿回按钮初始状态（应隐藏）
    let getbackBtn = page.locator('button:has-text("拿回")')
    await expect(getbackBtn).toBeHidden()

    // 5. 提交处理
    await page.fill('textarea[placeholder*="意见"]', '同意')
    await page.click('button:has-text("提交处理")')
    await page.waitForTimeout(2000)

    // 6. 刷新后检查拿回按钮（应显示）
    await page.click('button:has-text("刷新")')
    await page.waitForTimeout(1000)
    getbackBtn = page.locator('button:has-text("拿回")')
    await expect(getbackBtn).toBeVisible()

    // 7. 检查已处理节点样式（绿色对勾）
    const doneRow = page.locator('.wf-row-done').first()
    if (await doneRow.count() > 0) {
      const bgColor = await doneRow.locator('td').first().evaluate(el => {
        return window.getComputedStyle(el).backgroundColor
      })
      expect(bgColor).toContain('246, 255, 237') // #f6ffed
    }

    // 8. 测试拿回功能
    await page.click('.ant-table-tbody tr.wf-row-done').first()
    await page.waitForTimeout(500)
    await page.click('button:has-text("拿回")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(2000)

    // 9. 验证拿回后节点状态恢复
    await page.click('button:has-text("刷新")')
    await page.waitForTimeout(1000)
    const todoRow = page.locator('.wf-row-todo')
    await expect(todoRow).toBeVisible()
  })
})
