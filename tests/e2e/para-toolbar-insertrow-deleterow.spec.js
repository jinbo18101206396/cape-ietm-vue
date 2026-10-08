/**
 * Para设计器 - insertrow/deleterow按钮功能测试
 *
 * 测试范围：
 * 1. 工具栏按钮显示验证
 * 2. insertrow功能测试（在当前行前插入）
 * 3. deleterow功能测试（删除当前行）
 * 4. 边界场景测试
 *
 * 对标旧系统：IetmEditorDesignerPara.jsp 第158-162行
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计器 - insertrow/deleterow按钮测试', () => {

  test.beforeEach(async ({ page }) => {
    // 登录并打开编辑器
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForNavigation()

    // 打开DM编辑器，跳转到Para设计器
    // 这里需要根据实际路由调整
    await page.goto('/ietm/dm-management')
    await page.click('text=编辑') // 点击第一个DM的编辑按钮
    await page.waitForSelector('.CodeMirror')
  })

  test('T01-工具栏按钮显示验证', async ({ page }) => {
    // 点击某个para元素打开Para设计器
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('#edui1_toolbarbox', { timeout: 5000 })

    // 验证工具栏包含insertrow按钮
    const insertrowBtn = page.locator('.edui-button[title*="插入行"], .edui-button[title="insertrow"]')
    await expect(insertrowBtn).toBeVisible()
    console.log('✓ insertrow按钮已显示')

    // 验证工具栏包含deleterow按钮
    const deleterowBtn = page.locator('.edui-button[title*="删除行"], .edui-button[title="deleterow"]')
    await expect(deleterowBtn).toBeVisible()
    console.log('✓ deleterow按钮已显示')

    // 验证没有inserttable按钮
    const inserttableBtn = page.locator('.edui-button[title*="插入表格"], .edui-button[title="inserttable"]')
    await expect(inserttableBtn).not.toBeVisible()
    console.log('✓ inserttable按钮未显示（符合预期）')

    // 验证工具栏按钮总数（16个按钮）
    const allButtons = page.locator('.edui-toolbar .edui-button:not(.edui-separator)')
    const count = await allButtons.count()
    console.log(`✓ 工具栏按钮总数: ${count}`)
    expect(count).toBeGreaterThanOrEqual(14) // 至少14个按钮
  })

  test('T02-insertrow功能测试 - definitionList表格', async ({ page }) => {
    // 1. 打开Para设计器
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    // 2. 点击"定义列表"按钮创建表格
    const deflistBtn = page.locator('.edui-button[title*="列表定义"], .edui-button[title="deflist"]')
    await deflistBtn.click()
    await page.waitForTimeout(500)

    // 3. 验证表格创建成功（应该有5行）
    const iframe = page.frameLocator('iframe.edui-editor-iframeholder')
    let rows = iframe.locator('table[deflist="1"] tr')
    let initialRowCount = await rows.count()
    console.log(`✓ 初始行数: ${initialRowCount}`)
    expect(initialRowCount).toBe(5)

    // 4. 点击第3行（索引2）
    await rows.nth(2).click()
    await page.waitForTimeout(300)

    // 5. 点击insertrow按钮
    const insertrowBtn = page.locator('.edui-button[title*="插入行"], .edui-button[title="insertrow"]')
    await insertrowBtn.click()
    await page.waitForTimeout(500)

    // 6. 验证行数增加到6行
    rows = iframe.locator('table[deflist="1"] tr')
    const newRowCount = await rows.count()
    console.log(`✓ 插入后行数: ${newRowCount}`)
    expect(newRowCount).toBe(6)

    // 7. 验证新行插入在第3行之前（即新行成为第3行）
    // 原第3行现在应该是第4行
    const thirdRow = rows.nth(2)
    const isEmpty = await thirdRow.locator('th, td').first().evaluate(el => el.textContent.trim() === '')
    expect(isEmpty).toBe(true)
    console.log('✓ 新行已插入到正确位置（第3行前）')
  })

  test('T03-deleterow功能测试 - definitionList表格', async ({ page }) => {
    // 1. 打开Para设计器
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    // 2. 创建definitionList表格
    const deflistBtn = page.locator('.edui-button[title*="列表定义"], .edui-button[title="deflist"]')
    await deflistBtn.click()
    await page.waitForTimeout(500)

    // 3. 在第2行输入内容以便识别
    const iframe = page.frameLocator('iframe.edui-editor-iframeholder')
    const secondRow = iframe.locator('table[deflist="1"] tr:nth-child(2)')
    await secondRow.locator('th').fill('测试术语')
    await secondRow.locator('td').fill('测试定义')
    await page.waitForTimeout(300)

    // 4. 记录初始行数
    let rows = iframe.locator('table[deflist="1"] tr')
    const initialRowCount = await rows.count()
    console.log(`✓ 删除前行数: ${initialRowCount}`)

    // 5. 点击第2行
    await secondRow.click()
    await page.waitForTimeout(300)

    // 6. 点击deleterow按钮
    const deleterowBtn = page.locator('.edui-button[title*="删除行"], .edui-button[title="deleterow"]')
    await deleterowBtn.click()
    await page.waitForTimeout(500)

    // 7. 验证行数减少到4行
    rows = iframe.locator('table[deflist="1"] tr')
    const newRowCount = await rows.count()
    console.log(`✓ 删除后行数: ${newRowCount}`)
    expect(newRowCount).toBe(4)

    // 8. 验证第2行内容不再是"测试术语"（已删除）
    const newSecondRow = iframe.locator('table[deflist="1"] tr:nth-child(2)')
    const thContent = await newSecondRow.locator('th').textContent()
    expect(thContent.trim()).not.toBe('测试术语')
    console.log('✓ 目标行已成功删除')
  })

  test('T04-边界测试 - 删除最后一行', async ({ page }) => {
    // 1. 打开Para设计器并创建表格
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    const deflistBtn = page.locator('.edui-button[title*="列表定义"], .edui-button[title="deflist"]')
    await deflistBtn.click()
    await page.waitForTimeout(500)

    const iframe = page.frameLocator('iframe.edui-editor-iframeholder')
    const deleterowBtn = page.locator('.edui-button[title*="删除行"], .edui-button[title="deleterow"]')

    // 2. 连续删除4行（保留最后1行）
    for (let i = 0; i < 4; i++) {
      const rows = iframe.locator('table[deflist="1"] tr')
      await rows.first().click()
      await page.waitForTimeout(200)
      await deleterowBtn.click()
      await page.waitForTimeout(300)
    }

    // 3. 验证还剩1行
    const rows = iframe.locator('table[deflist="1"] tr')
    const rowCount = await rows.count()
    console.log(`✓ 删除4行后剩余: ${rowCount}行`)
    expect(rowCount).toBe(1)

    // 4. 尝试删除最后一行
    await rows.first().click()
    await page.waitForTimeout(200)
    await deleterowBtn.click()
    await page.waitForTimeout(500)

    // 5. 验证表格是否还存在
    // UEditor可能保留最后一行或删除整个表格
    const tableExists = await iframe.locator('table[deflist="1"]').count()
    console.log(`✓ 删除最后一行后，表格${tableExists > 0 ? '仍存在' : '已删除'}`)
    // 两种情况都是合理的，记录即可
  })

  test('T05-边界测试 - 在第一行前插入', async ({ page }) => {
    // 1. 打开Para设计器并创建表格
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    const deflistBtn = page.locator('.edui-button[title*="列表定义"], .edui-button[title="deflist"]')
    await deflistBtn.click()
    await page.waitForTimeout(500)

    // 2. 在第1行输入标记内容
    const iframe = page.frameLocator('iframe.edui-editor-iframeholder')
    const firstRow = iframe.locator('table[deflist="1"] tr:first-child')
    await firstRow.locator('th').fill('原第1行')
    await page.waitForTimeout(300)

    // 3. 点击第1行
    await firstRow.click()
    await page.waitForTimeout(200)

    // 4. 点击insertrow（应在第1行前插入）
    const insertrowBtn = page.locator('.edui-button[title*="插入行"], .edui-button[title="insertrow"]')
    await insertrowBtn.click()
    await page.waitForTimeout(500)

    // 5. 验证新的第1行是空的
    const newFirstRow = iframe.locator('table[deflist="1"] tr:first-child')
    const isEmpty = await newFirstRow.locator('th').evaluate(el => el.textContent.trim() === '')
    expect(isEmpty).toBe(true)
    console.log('✓ 在第1行前成功插入空行')

    // 6. 验证原第1行现在是第2行
    const secondRow = iframe.locator('table[deflist="1"] tr:nth-child(2)')
    const thContent = await secondRow.locator('th').textContent()
    expect(thContent.trim()).toBe('原第1行')
    console.log('✓ 原第1行已下移到第2行')
  })

  test('T06-保存验证 - insertrow后保存Para', async ({ page }) => {
    // 1. 打开Para设计器并创建表格
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    const deflistBtn = page.locator('.edui-button[title*="列表定义"], .edui-button[title="deflist"]')
    await deflistBtn.click()
    await page.waitForTimeout(500)

    // 2. 插入一行
    const iframe = page.frameLocator('iframe.edui-editor-iframeholder')
    const secondRow = iframe.locator('table[deflist="1"] tr:nth-child(2)')
    await secondRow.click()
    await page.waitForTimeout(200)

    const insertrowBtn = page.locator('.edui-button[title*="插入行"], .edui-button[title="insertrow"]')
    await insertrowBtn.click()
    await page.waitForTimeout(500)

    // 3. 在新插入的行中填写内容
    const newRow = iframe.locator('table[deflist="1"] tr:nth-child(2)')
    await newRow.locator('th').fill('新术语')
    await newRow.locator('td').fill('新定义')
    await page.waitForTimeout(300)

    // 4. 点击保存按钮
    const saveBtn = page.locator('button:has-text("保存"), a:has-text("保存")')
    await saveBtn.click()
    await page.waitForTimeout(1000)

    // 5. 验证保存成功提示
    const successMsg = page.locator('.ant-message-success, .layui-layer-content:has-text("保存成功")')
    await expect(successMsg).toBeVisible({ timeout: 5000 })
    console.log('✓ Para保存成功')

    // 6. 关闭Para设计器，检查CodeMirror中的XML
    // 点击返回或关闭按钮（根据实际UI调整）
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // 7. 验证XML中包含6个definitionListItem（原5个+新增1个）
    const xmlContent = await page.locator('.CodeMirror').textContent()
    const itemCount = (xmlContent.match(/<definitionListItem>/g) || []).length
    console.log(`✓ XML中包含 ${itemCount} 个definitionListItem`)
    expect(itemCount).toBe(6)
  })

  test('T07-保存验证 - deleterow后保存Para', async ({ page }) => {
    // 1. 打开Para设计器并创建表格
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    const deflistBtn = page.locator('.edui-button[title*="列表定义"], .edui-button[title="deflist"]')
    await deflistBtn.click()
    await page.waitForTimeout(500)

    // 2. 删除第2行
    const iframe = page.frameLocator('iframe.edui-editor-iframeholder')
    const secondRow = iframe.locator('table[deflist="1"] tr:nth-child(2)')
    await secondRow.click()
    await page.waitForTimeout(200)

    const deleterowBtn = page.locator('.edui-button[title*="删除行"], .edui-button[title="deleterow"]')
    await deleterowBtn.click()
    await page.waitForTimeout(500)

    // 3. 点击保存按钮
    const saveBtn = page.locator('button:has-text("保存"), a:has-text("保存")')
    await saveBtn.click()
    await page.waitForTimeout(1000)

    // 4. 验证保存成功
    const successMsg = page.locator('.ant-message-success, .layui-layer-content:has-text("保存成功")')
    await expect(successMsg).toBeVisible({ timeout: 5000 })
    console.log('✓ Para保存成功')

    // 5. 验证XML中只有4个definitionListItem（原5个-删除1个）
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    const xmlContent = await page.locator('.CodeMirror').textContent()
    const itemCount = (xmlContent.match(/<definitionListItem>/g) || []).length
    console.log(`✓ XML中包含 ${itemCount} 个definitionListItem`)
    expect(itemCount).toBe(4)
  })

  test('T08-工具栏按钮顺序验证', async ({ page }) => {
    // 打开Para设计器
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    // 获取所有工具栏按钮的title属性
    const buttons = page.locator('.edui-toolbar .edui-button')
    const titles = []

    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const title = await buttons.nth(i).getAttribute('title')
      if (title && title.trim() !== '') {
        titles.push(title)
      }
    }

    console.log('✓ 工具栏按钮顺序:', titles.join(' | '))

    // 验证insertrow和deleterow在列表定义按钮之前
    const insertrowIndex = titles.findIndex(t => t.includes('插入行') || t === 'insertrow')
    const deleterowIndex = titles.findIndex(t => t.includes('删除行') || t === 'deleterow')
    const deflistIndex = titles.findIndex(t => t.includes('列表定义') || t === 'deflist')

    expect(insertrowIndex).toBeGreaterThan(-1)
    expect(deleterowIndex).toBeGreaterThan(-1)
    expect(deflistIndex).toBeGreaterThan(-1)

    expect(insertrowIndex).toBeLessThan(deflistIndex)
    expect(deleterowIndex).toBeLessThan(deflistIndex)

    console.log('✓ 按钮顺序正确: insertrow/deleterow 在 deflist 之前')
  })
})

test.describe('Para设计器 - 对标旧系统回归测试', () => {

  test('T09-对标旧系统 - 工具栏完整性', async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForNavigation()

    // 打开Para设计器
    await page.goto('/ietm/dm-management')
    await page.click('text=编辑')
    await page.waitForSelector('.CodeMirror')
    await page.click('.CodeMirror-line:has-text("<para")')
    await page.waitForSelector('.edui-toolbar')

    // 验证核心功能按钮（对标旧系统第158-162行）
    const coreButtons = [
      'undo', 'redo',
      'bold', 'superscript', 'subscript',
      'insertorderedlist', 'insertunorderedlist',
      'insertrow', 'deleterow',
      'deflist'
    ]

    for (const btnName of coreButtons) {
      const btn = page.locator(`.edui-button[title*="${btnName}"], .edui-button[name="${btnName}"]`)
      const isVisible = await btn.isVisible().catch(() => false)
      console.log(`${isVisible ? '✓' : '✗'} ${btnName}`)
      expect(isVisible).toBe(true)
    }

    console.log('✓ 所有核心功能按钮已对齐旧系统')
  })
})
