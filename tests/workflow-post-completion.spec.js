/**
 * 流程终止/结束后操作 - E2E测试
 * 测试目标：验证对齐旧系统后的业务逻辑
 *
 * 修复内容：
 * 1. 禁止流程终止后发布
 * 2. 重启流程添加3项校验
 * 3. 按钮标题更新
 */

const { test, expect } = require('@playwright/test')

test.describe('流程终止/结束后操作 - 对齐旧系统', () => {
  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto('http://localhost:3000')
    await page.fill('input[placeholder="请输入用户名"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(2000)

    // 进入DM管理页面
    await page.click('text=数据模块管理')
    await page.waitForTimeout(1000)

    // 选择项目节点
    await page.click('.ant-tree-node-content-wrapper')
    await page.waitForTimeout(1000)
  })

  // ========================================
  // 修复1：禁止流程终止后发布
  // ========================================

  test('TC-01: 流程结束后，发布按钮应启用', async ({ page }) => {
    // 1. 选中一个流程已结束的DM
    await page.click('tr:has-text("已结束")')
    await page.waitForTimeout(500)

    // 2. 检查发布按钮状态
    const publishBtn = page.locator('button:has-text("发布")')
    await expect(publishBtn).not.toBeDisabled()

    console.log('✅ TC-01通过：流程结束后，发布按钮启用')
  })

  test('TC-02: 流程终止后，发布按钮应禁用（修复后）', async ({ page }) => {
    // 前置条件：需要有一个流程状态为"已终止"的DM
    // 可通过以下步骤准备：
    // 1. 启动流程 → 2. 在流程信息面板点击"终止流程"

    // 1. 选中一个流程已终止的DM
    const terminatedRow = page.locator('tr').filter({ hasText: '已终止' }).first()
    if (await terminatedRow.count() > 0) {
      await terminatedRow.click()
      await page.waitForTimeout(500)

      // 2. 检查发布按钮状态（修复后应禁用）
      const publishBtn = page.locator('button:has-text("发布")')
      await expect(publishBtn).toBeDisabled()

      console.log('✅ TC-02通过：流程终止后，发布按钮禁用（对齐旧系统）')
    } else {
      console.log('⏭️ TC-02跳过：无"已终止"状态的测试数据')
    }
  })

  test('TC-03: 流程进行中，发布按钮应禁用', async ({ page }) => {
    // 1. 选中一个流程进行中的DM
    const inProgressRow = page.locator('tr').filter({ hasText: '进行中' }).first()
    if (await inProgressRow.count() > 0) {
      await inProgressRow.click()
      await page.waitForTimeout(500)

      // 2. 检查发布按钮状态
      const publishBtn = page.locator('button:has-text("发布")')
      await expect(publishBtn).toBeDisabled()

      console.log('✅ TC-03通过：流程进行中，发布按钮禁用')
    } else {
      console.log('⏭️ TC-03跳过：无"进行中"状态的测试数据')
    }
  })

  // ========================================
  // 修复2：重启流程添加3项校验
  // ========================================

  test('TC-04: 流程进行中，点击重启流程应提示"流程还未结束"', async ({ page }) => {
    // 1. 选中一个流程进行中的DM
    const inProgressRow = page.locator('tr').filter({ hasText: '进行中' }).first()
    if (await inProgressRow.count() > 0) {
      await inProgressRow.click()
      await page.waitForTimeout(500)

      // 2. 点击"发布后重启流程"按钮
      await page.click('button:has-text("发布后重启流程")')
      await page.waitForTimeout(500)

      // 3. 应提示错误
      const message = page.locator('.ant-message-notice-content')
      await expect(message).toContainText('流程还未结束，不能重新启动流程')

      console.log('✅ TC-04通过：校验1 - 流程进行中不能重启')
    } else {
      console.log('⏭️ TC-04跳过：无"进行中"状态的测试数据')
    }
  })

  test('TC-05: 流程已结束但未发布，点击重启流程应提示"不是版本发布状态"', async ({ page }) => {
    // 1. 选中一个流程已结束但未发布的DM（版本号如001-03，inWork!=00）
    const endedNotPublishedRow = page.locator('tr').filter({ hasText: '已结束' }).filter({ hasText: /\d{3}-(?!00)\d{2}/ }).first()
    if (await endedNotPublishedRow.count() > 0) {
      await endedNotPublishedRow.click()
      await page.waitForTimeout(500)

      // 2. 点击"发布后重启流程"按钮
      await page.click('button:has-text("发布后重启流程")')
      await page.waitForTimeout(500)

      // 3. 应提示错误
      const message = page.locator('.ant-message-notice-content')
      await expect(message).toContainText('不是版本发布状态')

      console.log('✅ TC-05通过：校验2 - 未发布状态不能重启')
    } else {
      console.log('⏭️ TC-05跳过：无"已结束未发布"状态的测试数据')
    }
  })

  test('TC-06: 流程已结束已发布，点击重启流程应弹出确认框', async ({ page }) => {
    // 1. 选中一个流程已结束且已发布的DM（版本号如002-00）
    const endedPublishedRow = page.locator('tr').filter({ hasText: '已结束' }).filter({ hasText: /-00$/ }).first()
    if (await endedPublishedRow.count() > 0) {
      await endedPublishedRow.click()
      await page.waitForTimeout(500)

      // 2. 点击"发布后重启流程"按钮
      await page.click('button:has-text("发布后重启流程")')
      await page.waitForTimeout(500)

      // 3. 应弹出确认框，包含版本号和说明
      const confirmModal = page.locator('.ant-modal-confirm')
      await expect(confirmModal).toBeVisible()
      await expect(confirmModal).toContainText('确认重启流程')
      await expect(confirmModal).toContainText('当前版本')
      await expect(confirmModal).toContainText('修订版本的审批流程')

      // 4. 取消操作
      await page.click('.ant-modal-confirm button:has-text("取消")')

      console.log('✅ TC-06通过：已发布状态可以重启流程，弹出确认框')
    } else {
      console.log('⏭️ TC-06跳过：无"已结束已发布"状态的测试数据')
    }
  })

  test('TC-07: 流程已终止已发布，点击重启流程应弹出确认框', async ({ page }) => {
    // 1. 选中一个流程已终止且已发布的DM
    const terminatedPublishedRow = page.locator('tr').filter({ hasText: '已终止' }).filter({ hasText: /-00$/ }).first()
    if (await terminatedPublishedRow.count() > 0) {
      await terminatedPublishedRow.click()
      await page.waitForTimeout(500)

      // 2. 点击"发布后重启流程"按钮
      await page.click('button:has-text("发布后重启流程")')
      await page.waitForTimeout(500)

      // 3. 应弹出确认框
      const confirmModal = page.locator('.ant-modal-confirm')
      await expect(confirmModal).toBeVisible()
      await expect(confirmModal).toContainText('确认重启流程')

      // 4. 取消操作
      await page.click('.ant-modal-confirm button:has-text("取消")')

      console.log('✅ TC-07通过：已终止已发布状态可以重启流程')
    } else {
      console.log('⏭️ TC-07跳过：无"已终止已发布"状态的测试数据')
    }
  })

  // ========================================
  // 修复3：按钮标题验证
  // ========================================

  test('TC-08: 重启流程按钮标题应为"发布后重启流程"', async ({ page }) => {
    // 1. 检查按钮文本
    const restartBtn = page.locator('button:has-text("发布后重启流程")')
    await expect(restartBtn).toBeVisible()

    // 2. 检查按钮title属性
    const title = await restartBtn.getAttribute('title')
    expect(title).toContain('发布后重启流程')
    expect(title).toContain('修订版本审批')

    console.log('✅ TC-08通过：按钮标题已更新，对齐旧系统')
  })

  // ========================================
  // 综合场景测试
  // ========================================

  test('TC-09: 完整流程 - 流程结束→发布→重启流程', async ({ page }) => {
    // 前置条件：准备一个流程已结束但未发布的DM

    // 1. 选中流程已结束的DM
    const endedRow = page.locator('tr').filter({ hasText: '已结束' }).first()
    if (await endedRow.count() === 0) {
      console.log('⏭️ TC-09跳过：无"已结束"状态的测试数据')
      return
    }

    await endedRow.click()
    await page.waitForTimeout(500)

    // 2. 验证发布按钮可用
    const publishBtn = page.locator('button:has-text("发布")')
    if (await publishBtn.isDisabled()) {
      console.log('⏭️ TC-09跳过：该DM已发布或被签出')
      return
    }

    // 3. 点击发布
    await publishBtn.click()
    await page.waitForTimeout(500)

    // 4. 确认发布
    const confirmBtn = page.locator('.ant-modal-confirm button:has-text("确定")')
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click()
      await page.waitForTimeout(2000)
    }

    // 5. 验证发布成功消息
    const successMessage = page.locator('.ant-message-success')
    await expect(successMessage).toContainText('发布成功')

    // 6. 刷新列表
    await page.reload()
    await page.waitForTimeout(2000)

    // 7. 重新选中该DM
    await endedRow.click()
    await page.waitForTimeout(500)

    // 8. 验证重启流程按钮可用
    const restartBtn = page.locator('button:has-text("发布后重启流程")')
    await expect(restartBtn).not.toBeDisabled()

    // 9. 点击重启流程
    await restartBtn.click()
    await page.waitForTimeout(500)

    // 10. 应弹出确认框
    const restartConfirm = page.locator('.ant-modal-confirm')
    await expect(restartConfirm).toBeVisible()
    await expect(restartConfirm).toContainText('修订版本的审批流程')

    console.log('✅ TC-09通过：完整流程验证成功')
  })

  test('TC-10: 完整流程 - 流程终止→不能发布→启动流程', async ({ page }) => {
    // 前置条件：准备一个流程已终止的DM

    // 1. 选中流程已终止的DM
    const terminatedRow = page.locator('tr').filter({ hasText: '已终止' }).first()
    if (await terminatedRow.count() === 0) {
      console.log('⏭️ TC-10跳过：无"已终止"状态的测试数据')
      return
    }

    await terminatedRow.click()
    await page.waitForTimeout(500)

    // 2. 验证发布按钮禁用（修复后）
    const publishBtn = page.locator('button:has-text("发布")')
    await expect(publishBtn).toBeDisabled()

    // 3. 验证启动流程按钮可用
    const startFlowBtn = page.locator('button:has-text("启动流程")')
    await expect(startFlowBtn).not.toBeDisabled()

    console.log('✅ TC-10通过：流程终止后不能发布，只能重新启动流程')
  })
})

// ========================================
// 测试数据准备脚本
// ========================================

test.describe('测试数据准备', () => {
  test.skip('准备测试数据：创建流程已终止的DM', async ({ page }) => {
    // 1. 登录并进入DM管理
    // 2. 新建DM
    // 3. 启动流程
    // 4. 在流程信息面板点击"终止流程"
    // 此脚本仅用于准备测试数据，实际测试时跳过
  })

  test.skip('准备测试数据：创建流程已结束已发布的DM', async ({ page }) => {
    // 1. 登录并进入DM管理
    // 2. 新建DM
    // 3. 启动流程
    // 4. 逐节点"通过"直到流程结束
    // 5. 点击"发布"
    // 此脚本仅用于准备测试数据，实际测试时跳过
  })
})

// ========================================
// 测试执行说明
// ========================================

/*
## 测试环境要求

1. **前端**: http://localhost:3000（Vue开发服务器）
2. **后端**: http://localhost:9999（Spring Boot）
3. **数据库**: DM8，已导入测试数据
4. **浏览器**: Chromium（Playwright默认）

## 执行命令

```bash
# 安装Playwright（首次）
cd /d/workspace/IETM/cape-ietm-vue
npm install --save-dev @playwright/test

# 执行所有测试
npx playwright test tests/workflow-post-completion.spec.js

# 执行单个测试
npx playwright test tests/workflow-post-completion.spec.js -g "TC-02"

# 带UI模式执行
npx playwright test tests/workflow-post-completion.spec.js --ui

# 生成HTML报告
npx playwright test tests/workflow-post-completion.spec.js --reporter=html
npx playwright show-report
```

## 测试数据要求

为确保所有测试用例能执行，需要准备以下测试数据：

| 场景 | 流程状态 | 版本号 | 是否发布 | 创建人 | 用途 |
|------|---------|--------|---------|--------|------|
| 1 | 已结束(0) | 001-03 | 否 | admin | TC-01, TC-05 |
| 2 | 已终止(9) | 001-02 | 否 | admin | TC-02, TC-10 |
| 3 | 进行中(1) | 001-01 | 否 | admin | TC-03, TC-04 |
| 4 | 已结束(0) | 002-00 | 是 | admin | TC-06, TC-09 |
| 5 | 已终止(9) | 002-00 | 是 | admin | TC-07 |

## 预期结果

- ✅ TC-01到TC-08：单项功能测试，验证修复点
- ✅ TC-09到TC-10：端到端场景测试
- ✅ 总计10个测试用例
- ✅ 覆盖2个修复点 + 1个UI更新

## 测试报告

测试完成后生成HTML报告，包含：
- 测试用例执行状态
- 失败截图（如有）
- 执行时间统计
- 覆盖率报告
*/
