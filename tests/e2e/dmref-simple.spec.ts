/**
 * 简化版 E2E 测试：验证 DM 引用修复
 *
 * 快速验证步骤：
 * 1. 打开编辑器
 * 2. 找到包含 levelledPara 的行
 * 3. 进入设计视图
 * 4. 添加警告项并插入 DM 引用
 * 5. 保存并验证 XML
 */

import { test, expect } from '@playwright/test'

test('验证 LevelledPara DM 引用格式修复', async ({ page, context }) => {
  console.log('\n🚀 开始 DM 引用修复验证测试...\n')

  // 设置超时
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(10000)

  try {
    // ========== 步骤1：打开应用 ==========
    console.log('📍 步骤1：打开应用...')
    await page.goto('http://localhost:8080/ietm/datamodule', { waitUntil: 'networkidle' })

    // 等待页面加载完全
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    console.log('✓ 应用已加载')

    // ========== 步骤2：进入设计视图 ==========
    console.log('\n📍 步骤2：进入设计视图...')

    // 查找编辑按钮（铅笔图标）
    const editButtons = await page.locator('button[title*="设计"], button[class*="edit"], a[class*="edit"]').all()

    if (editButtons.length > 0) {
      await editButtons[0].click()
      console.log('✓ 已点击编辑按钮')
    } else {
      console.log('⚠️  未找到编辑按钮，尝试查找设计视图图标...')
      const designIcon = await page.locator('[class*="design"], [title*="设计"]').first()
      await designIcon.click()
    }

    // 等待设计视图加载
    await page.waitForSelector('.levelledpara-designer, .para-designer', { timeout: 5000 })
    await page.waitForTimeout(1000)

    console.log('✓ 设计视图已打开')

    // ========== 步骤3：选择层级节点 ==========
    console.log('\n📍 步骤3：在左侧树中选择节点...')

    // 查找树节点
    const treeNodes = await page.locator('.tree-node-title, .ant-tree-title').all()

    if (treeNodes.length > 0) {
      await treeNodes[0].click()
      console.log('✓ 已选择树节点')
    } else {
      console.log('⚠️  未找到树节点')
    }

    await page.waitForTimeout(500)

    // ========== 步骤4：在警告 tab 中增加项目 ==========
    console.log('\n📍 步骤4：在警告模块中新增...')

    // 找到警告 tab
    const warningTab = await page.locator('text=警告').first()
    if (await warningTab.isVisible()) {
      await warningTab.click()
      console.log('✓ 已点击警告标签页')
    }

    await page.waitForTimeout(300)

    // 点击"增加"按钮
    const addButtons = await page.locator('button:has-text("增加")').all()
    if (addButtons.length > 0) {
      await addButtons[0].click()
      console.log('✓ 已点击增加按钮')
    }

    // 等待编辑器打开
    await page.waitForSelector('.edui-editor, textarea, [class*="editor"]', { timeout: 5000 })
    await page.waitForTimeout(1000)

    console.log('✓ 编辑器已打开')

    // ========== 步骤5：插入 DM 引用 ==========
    console.log('\n📍 步骤5：插入 DM 引用...')

    // 找到 DM 引用按钮
    const dmRefButton = await page.locator('button[title*="DM引用"], button:has-text("DM引用")').first()

    if (await dmRefButton.isVisible()) {
      await dmRefButton.click()
      console.log('✓ 已点击 DM 引用按钮')
    } else {
      console.log('⚠️  未找到 DM 引用按钮')
    }

    // 等待对话框打开
    await page.waitForSelector('.dm-ref-dialog, .ant-modal', { timeout: 5000 })
    await page.waitForTimeout(1000)

    console.log('✓ DM 引用对话框已打开')

    // -------- 选择一个 DM --------
    console.log('\n  选择 DM...')

    // 等待表格数据加载
    await page.waitForTimeout(2000)

    // 点击第一行的复选框
    const checkboxes = await page.locator('input[type="checkbox"]').all()
    if (checkboxes.length > 0) {
      // 通常第一个是全选，选第二个
      const checkbox = checkboxes.length > 1 ? checkboxes[1] : checkboxes[0]
      await checkbox.click()
      console.log('  ✓ 已选择 DM')
    }

    await page.waitForTimeout(500)

    // 点击确定按钮
    const confirmButton = await page.locator('button:has-text("确定")').last()
    await confirmButton.click()
    console.log('  ✓ 已点击确定')

    // 等待对话框关闭
    await page.waitForTimeout(1000)

    console.log('✓ DM 引用已插入编辑器')

    // ========== 步骤6：保存内容 ==========
    console.log('\n📍 步骤6：保存内容...')

    // 在模态框中点击确定
    const modalConfirm = await page.locator('.ant-modal-footer button[type="primary"]')
    if (await modalConfirm.isVisible()) {
      await modalConfirm.click()
      console.log('✓ 已保存编辑内容')
    }

    await page.waitForTimeout(500)

    // 保存层级段落
    const saveButton = await page.locator('button:has-text("保存")')
    if (await saveButton.isVisible()) {
      await saveButton.click()
      console.log('✓ 已保存层级段落')
    }

    await page.waitForTimeout(1500)

    // ========== 步骤7：验证 XML 格式 ==========
    console.log('\n📍 步骤7：验证 XML 格式...')

    // 获取编辑器内容
    const content = await page.evaluate(() => {
      // 尝试从 CodeMirror 获取内容
      const cm = (window as any).editor || (window as any).CodeMirrorInstance
      if (cm && cm.getValue) {
        return cm.getValue()
      }

      // 或从 textarea 获取
      const textarea = document.querySelector('textarea')
      if (textarea) {
        return textarea.value
      }

      // 或从 div 内容获取
      const cmContent = document.querySelector('.CodeMirror-code')
      if (cmContent) {
        return cmContent.innerText
      }

      return document.body.innerText
    })

    console.log('\n📄 XML 内容（前1000字符）：')
    console.log(content.substring(0, 1000))
    console.log('...\n')

    // -------- 验证1：包含 <dmRef> --------
    console.log('🔍 验证1：检查 <dmRef> 标签...')
    const hasDmRef = content.includes('<dmRef')
    console.log(`  结果：${hasDmRef ? '✅ 包含 <dmRef>' : '❌ 不包含 <dmRef>'}`)

    // -------- 验证2：不包含错误的 <a> 标签 --------
    console.log('\n🔍 验证2：检查错误的 <a> 标签...')
    const hasWrongA =
      content.includes('<a href="javascript:void(0);"') && content.includes('【DM引用】') && content.includes('</a>')
    console.log(`  结果：${hasWrongA ? '❌ 包含错误的 <a> 标签' : '✅ 不包含错误的 <a> 标签'}`)

    // -------- 验证3：包含 dmRefIdent --------
    console.log('\n🔍 验证3：检查 dmRefIdent...')
    const hasDmRefIdent = content.includes('dmRefIdent') || content.includes('dmCode')
    console.log(`  结果：${hasDmRefIdent ? '✅ 包含 dmRefIdent' : '⚠️  未找到 dmRefIdent'}`)

    // ========== 结果统计 ==========
    console.log('\n' + '='.repeat(50))

    if (hasDmRef && !hasWrongA) {
      console.log('✅ 测试通过！DM 引用格式正确')
      console.log('   - ✓ 包含 <dmRef> 标签')
      console.log('   - ✓ 不包含错误的 <a> 标签')
    } else {
      console.log('❌ 测试失败！')
      if (!hasDmRef) console.log('   - ✗ 缺少 <dmRef> 标签')
      if (hasWrongA) console.log('   - ✗ 包含错误的 <a> 标签')
    }

    console.log('='.repeat(50) + '\n')

    // 断言
    expect(hasDmRef).toBe(true)
    expect(hasWrongA).toBe(false)
  } catch (error) {
    console.error('\n❌ 测试执行出错：', error)
    throw error
  }
})
