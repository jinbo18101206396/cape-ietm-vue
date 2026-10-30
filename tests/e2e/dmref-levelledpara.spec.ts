/**
 * E2E 测试：LevelledPara 设计视图中 DM 引用修复验证
 *
 * 测试场景：
 * 1. 进入设计视图（点击第 69 行铅笔图标）
 * 2. 在左侧树中选择"层级1"
 * 3. 在警告 tab 中点击"增加"
 * 4. 在 UEditor 中插入"DM引用"（点击"DM引用"按钮）
 * 5. 保存并返回源码视图
 * 6. 验证：XML 中应该包含 <dmRef> 而不是 <a>
 * 7. 验证：警告列表应该显示"DM引用"而不是标签
 */

import { test, expect, Page } from '@playwright/test'

test.describe('LevelledPara DM 引用格式修复验证', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('应该正确转换 DM 引用为 <dmRef> 标签而不是 <a> 标签', async () => {
    // ========== 步骤1：导航到测试页面 ==========
    await test.step('导航到 IETM 编辑器页面', async () => {
      // 访问应用首页（根据实际环境调整URL）
      await page.goto('http://localhost:8080', { waitUntil: 'networkidle' })

      // 等待页面加载
      await page.waitForLoadState('domcontentloaded')
    })

    // ========== 步骤2：进入设计视图 ==========
    await test.step('点击第69行的铅笔图标进入设计视图', async () => {
      // 找到行号为69的行
      const row69 = await page.locator('[data-line="69"]')

      // 点击该行的编辑按钮（铅笔图标）
      const editButton = row69.locator('button[title="编辑"], [class*="edit"]').first()
      await editButton.click()

      // 等待设计视图加载
      await page.waitForSelector('.levelledpara-designer', { timeout: 5000 })

      console.log('✓ 设计视图已打开')
    })

    // ========== 步骤3：在左侧树中选择"层级1" ==========
    await test.step('在左侧树中选择层级1节点', async () => {
      // 找到树中的"层级1"节点
      const level1Node = await page.locator('.tree-node-title:has-text("层级1")').first()
      await level1Node.click()

      // 等待右侧内容加载
      await page.waitForSelector('.tab-content', { timeout: 3000 })

      console.log('✓ 已选择层级1节点')
    })

    // ========== 步骤4：在警告 tab 中点击"增加" ==========
    await test.step('在警告 tab 中新增一个警告项', async () => {
      // 找到警告tab（可能已自动选中）
      const warningTab = await page.locator('[role="tab"]:has-text("警告")').first()
      await warningTab.click()

      // 等待tab内容切换
      await page.waitForTimeout(300)

      // 点击"增加"按钮
      const addButton = await page.locator('button:has-text("增加")').first()
      await addButton.click()

      // 等待编辑对话框或编辑器打开
      await page.waitForSelector('.edui-editor, .ueditor-container', { timeout: 5000 })

      console.log('✓ 警告编辑器已打开')
    })

    // ========== 步骤5：在 UEditor 中插入"DM引用" ==========
    await test.step('在 UEditor 中插入 DM 引用', async () => {
      // 点击工具栏中的"DM引用"按钮
      const dmRefButton = await page.locator('button[title="DM引用"]')
      await dmRefButton.click()

      // 等待 DM 引用对话框打开
      await page.waitForSelector('.dm-ref-dialog', { timeout: 5000 })

      console.log('✓ DM 引用对话框已打开')

      // -------- 子步骤：在对话框中选择 DM --------
      await test.step('在对话框中选择一个 DM', async () => {
        // 等待表格加载
        await page.waitForSelector('.dm-ref-table tbody tr', { timeout: 5000 })

        // 获取表格中的第一行（或手动选择一个）
        const firstRow = await page.locator('.dm-ref-table tbody tr').first()

        // 点击该行的复选框来选中
        const checkbox = firstRow.locator('input[type="checkbox"]')
        await checkbox.click()

        // 等待选中状态生效
        await page.waitForTimeout(300)

        console.log('✓ 已选择 DM 行')
      })

      // -------- 子步骤：点击确定按钮 --------
      await test.step('点击对话框的确定按钮', async () => {
        const confirmButton = await page.locator('.dm-ref-dialog button:has-text("确定")').first()
        await confirmButton.click()

        // 等待对话框关闭，UEditor 重新获得焦点
        await page.waitForTimeout(500)

        console.log('✓ DM 引用已插入到编辑器')
      })
    })

    // ========== 步骤6：保存警告内容 ==========
    await test.step('保存警告内容', async () => {
      // 找到模态框中的"确定"按钮（不是对话框的确定，而是编辑器的确定）
      const modalConfirmButton = await page.locator('.ant-modal-footer button[type="primary"]').first()

      // 检查是否存在模态框
      const modal = await page.locator('.ant-modal').first()
      if (await modal.isVisible()) {
        await modalConfirmButton.click()
        await page.waitForTimeout(500)
      }

      console.log('✓ 警告内容已保存')
    })

    // ========== 步骤7：保存层级段落 ==========
    await test.step('保存层级段落', async () => {
      // 找到设计器顶部的"保存"按钮
      const saveButton = await page.locator('.levelledpara-toolbar button[type="primary"]')
      await saveButton.click()

      // 等待保存完成和设计视图关闭
      await page.waitForTimeout(1000)

      console.log('✓ 层级段落已保存')
    })

    // ========== 步骤8：返回源码视图并验证 ==========
    await test.step('验证源码视图中的 XML 格式', async () => {
      // 切换回源码视图（如果自动关闭则直接看编辑器）
      const editor = await page.locator('.CodeMirror')
      await editor.click()

      // 获取编辑器中的全部内容
      const editorContent = await page.locator('.CodeMirror-code').textContent()

      console.log('📄 编辑器内容预览（前500字符）：')
      console.log(editorContent?.substring(0, 500) || '无内容')

      // -------- 验证1：XML 应包含 <dmRef> 而不是 <a> --------
      await test.step('验证 XML 包含 <dmRef> 而不是 <a> 标签', async () => {
        // 获取完整内容用于检查
        const fullContent = await page.evaluate(() => {
          const cm = (window as any).CodeMirrorInstance || (window as any).editor
          return cm?.getValue?.() || document.body.innerText
        })

        console.log('\n🔍 XML 验证结果：')

        // 检查是否包含 <dmRef>
        const hasDmRef = fullContent.includes('<dmRef')
        console.log(`  - 包含 <dmRef>：${hasDmRef ? '✅ YES' : '❌ NO'}`)

        // 检查是否包含错误的 <a> 标签
        const hasIncorrectA = fullContent.includes('<a href="javascript:void(0);" xml=') && fullContent.includes('【DM引用】')
        console.log(`  - 包含错误的 <a> 标签：${hasIncorrectA ? '❌ YES（错误）' : '✅ NO'}`)

        expect(hasDmRef).toBe(true)
        expect(hasIncorrectA).toBe(false)

        console.log('\n✓ XML 格式验证通过')
      })
    })

    // ========== 步骤9：验证警告列表显示 ==========
    await test.step('验证警告列表中正确显示 DM 引用内容', async () => {
      // 重新进入设计视图以查看列表
      const row69 = await page.locator('[data-line="69"]')
      const editButton = row69.locator('button[title="编辑"]').first()
      await editButton.click()

      await page.waitForSelector('.levelledpara-designer', { timeout: 5000 })

      // 选择层级1
      const level1Node = await page.locator('.tree-node-title:has-text("层级1")').first()
      await level1Node.click()

      await page.waitForTimeout(300)

      // 找到警告tab
      const warningTab = await page.locator('[role="tab"]:has-text("警告")').first()
      await warningTab.click()

      await page.waitForTimeout(300)

      // 获取表格中的内容单元格
      const contentCell = await page.locator('.ant-table-tbody td').filter({ hasText: 'DM' }).first()

      if (await contentCell.isVisible()) {
        const cellText = await contentCell.textContent()
        console.log(`\n📋 警告列表中的内容：${cellText}`)

        // 验证显示正确的文本
        expect(cellText).toContain('【DM引用】')
        expect(cellText).not.toContain('<a')

        console.log('✓ 警告列表显示正确')
      }
    })

    console.log('\n✅ 所有测试验证通过！')
  })
})
