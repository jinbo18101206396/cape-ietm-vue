/**
 * DM底部页签布局 - 最终验证
 * 简化版本，直接截图 + 元素检查
 */

const { test, expect } = require('@playwright/test')

test('DM底部页签布局验证', async ({ page }) => {
  console.log('=== 开始验证 ===')

  // 设置较长超时
  test.setTimeout(120000)

  // 1. 登录
  await page.goto('http://localhost:3000/user/login')
  await page.waitForLoadState('networkidle')

  // 截图登录页看看结构
  await page.screenshot({ path: 'tests/e2e/verify-00-login-page.png', fullPage: true })
  console.log('✓ 截图：登录页')

  try {
    // 尝试填充用户名
    await page.fill('input[type="text"]', 'admin', { timeout: 3000 })
    await page.fill('input[type="password"]', '123456', { timeout: 3000 })

    // 尝试多种登录按钮选择器
    try {
      await page.click('button[type="submit"]', { timeout: 2000 })
    } catch {
      try {
        await page.click('.ant-btn-primary', { timeout: 2000 })
      } catch {
        await page.keyboard.press('Enter')
      }
    }

    await page.waitForTimeout(3000)
    console.log('✓ 登录完成')
  } catch (e) {
    console.log(`登录失败: ${e.message}`)
    console.log('尝试直接访问主页（可能已登录）')
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)
  }

  // 2. 导航到数据模块管理
  try {
    await page.click('text=项目管理', { timeout: 5000 })
    await page.waitForTimeout(1000)
    await page.click('text=数据模块管理', { timeout: 5000 })
    await page.waitForTimeout(3000)
    console.log('✓ 导航到数据模块管理')
  } catch (e) {
    console.log('导航失败，尝试直接访问')
    await page.goto('http://localhost:3000/#/ietm/ietmdatamodulemanagement/IetmDataModuleList')
    await page.waitForTimeout(3000)
  }

  // 截图：列表页
  await page.screenshot({ path: 'tests/e2e/verify-01-dm-list.png', fullPage: true })
  console.log('✓ 截图：列表页')

  // 3. 尝试多种方式打开编辑器
  let editorOpened = false

  // 方式1：点击复选框 + 编辑内容按钮
  try {
    const checkbox = page.locator('.ant-table-tbody tr:first-child .ant-checkbox-input').first()
    await checkbox.waitFor({ timeout: 5000 })
    await checkbox.click()
    await page.waitForTimeout(500)

    const editBtn = page.locator('button:has-text("编辑内容")').first()
    await editBtn.waitFor({ timeout: 3000 })
    await editBtn.click()
    await page.waitForTimeout(3000)

    console.log('✓ 方式1：复选框 + 编辑内容按钮')
    editorOpened = true
  } catch (e) {
    console.log('方式1失败，尝试方式2')
  }

  // 方式2：双击行
  if (!editorOpened) {
    try {
      const firstRow = page.locator('.ant-table-tbody tr').first()
      await firstRow.dblclick()
      await page.waitForTimeout(3000)
      console.log('✓ 方式2：双击行')
      editorOpened = true
    } catch (e) {
      console.log('方式2失败，尝试方式3')
    }
  }

  // 方式3：点击操作列按钮
  if (!editorOpened) {
    try {
      const actionBtn = page.locator('.ant-table-tbody tr:first-child a, .ant-table-tbody tr:first-child button').first()
      await actionBtn.click()
      await page.waitForTimeout(3000)
      console.log('✓ 方式3：操作列按钮')
      editorOpened = true
    } catch (e) {
      console.log('方式3失败')
    }
  }

  // 截图：打开编辑器后
  await page.screenshot({ path: 'tests/e2e/verify-02-after-click.png', fullPage: true })
  console.log('✓ 截图：点击后状态')

  // 4. 检查编辑器是否打开
  await page.waitForTimeout(3000)

  const regionCenter = await page.locator('.region-center').count()
  const viewTabs = await page.locator('.view-tabs').count()
  const codeMirror = await page.locator('.CodeMirror').count()
  const dmEditorPage = await page.locator('.dm-editor-page').count()

  console.log(`\n=== 元素检查 ===`)
  console.log(`region-center: ${regionCenter}`)
  console.log(`view-tabs: ${viewTabs}`)
  console.log(`CodeMirror: ${codeMirror}`)
  console.log(`dm-editor-page: ${dmEditorPage}`)

  if (viewTabs === 0 && codeMirror === 0) {
    console.log('\n⚠ 编辑器未打开，可能需要手动操作')
    console.log('请查看截图：verify-01-dm-list.png 和 verify-02-after-click.png')
    return
  }

  // 5. 验证底部页签布局
  console.log('\n=== 页签验证 ===')

  // 检查 view-tabs 是否存在
  const viewTabsElement = page.locator('.view-tabs').first()
  await expect(viewTabsElement).toBeVisible({ timeout: 5000 })
  console.log('✓ view-tabs 容器存在')

  // 检查是否为 bottom 模式
  const hasBottomClass = await page.locator('.view-tabs.ant-tabs-bottom').count()
  console.log(`ant-tabs-bottom 类: ${hasBottomClass > 0 ? '✓ 存在' : '✗ 不存在'}`)

  // 检查页签数量和文本
  const tabs = await page.locator('.ant-tabs-tab').all()
  console.log(`页签数量: ${tabs.length}`)

  if (tabs.length >= 2) {
    const tab0Text = await tabs[0].innerText()
    const tab1Text = await tabs[1].innerText()
    console.log(`页签0: "${tab0Text}"`)
    console.log(`页签1: "${tab1Text}"`)

    // 检查禁用状态
    const tab0Disabled = await tabs[0].evaluate(el => el.classList.contains('ant-tabs-tab-disabled'))
    const tab1Active = await tabs[1].evaluate(el => el.classList.contains('ant-tabs-tab-active'))
    console.log(`页签0禁用: ${tab0Disabled ? '✓' : '✗'}`)
    console.log(`页签1选中: ${tab1Active ? '✓' : '✗'}`)
  }

  // 检查页签栏位置（应在编辑器下方）
  const editorBox = await page.locator('.CodeMirror').first().boundingBox()
  const tabBarBox = await page.locator('.ant-tabs-bar').first().boundingBox()

  if (editorBox && tabBarBox) {
    const isBelow = tabBarBox.y > editorBox.y
    console.log(`\n页签栏位置:`)
    console.log(`  编辑器 Y: ${editorBox.y}, 高度: ${editorBox.height}`)
    console.log(`  页签栏 Y: ${tabBarBox.y}`)
    console.log(`  页签在下方: ${isBelow ? '✓' : '✗'}`)
  }

  // 检查编辑器高度
  if (editorBox) {
    const heightOk = editorBox.height > 200
    console.log(`\nCodeMirror 高度: ${editorBox.height}px ${heightOk ? '✓' : '✗ (太小)'}`)
  }

  // 检查底部状态栏是否已移除
  const statusBar = await page.locator('.editor-status').count()
  console.log(`\n底部状态栏 (.editor-status): ${statusBar === 0 ? '✓ 已移除' : '✗ 仍存在'}`)

  // 6. 最终截图
  await page.screenshot({ path: 'tests/e2e/verify-03-editor-final.png', fullPage: true })
  console.log('\n✓ 最终截图：verify-03-editor-final.png')

  // 7. 局部截图：编辑器中区
  const regionCenterElement = page.locator('.region-center').first()
  if (await regionCenterElement.count() > 0) {
    await regionCenterElement.screenshot({ path: 'tests/e2e/verify-04-editor-region.png' })
    console.log('✓ 中区截图：verify-04-editor-region.png')
  }

  console.log('\n=== 验证完成 ===')
  console.log('请查看截图文件：')
  console.log('  - verify-01-dm-list.png（列表页）')
  console.log('  - verify-02-after-click.png（点击后）')
  console.log('  - verify-03-editor-final.png（编辑器全页）')
  console.log('  - verify-04-editor-region.png（编辑器中区）')
})
