/**
 * Para设计器全面UI交互测试套件
 * 所有测试通过真实UI操作（点击/输入），不绕过Vue层
 *
 * 测试覆盖：
 * - Phase 1: 正则bug修复验证（往返测试）
 * - Phase 2: 功能场景测试
 * - Phase 3: 边界条件测试
 * - Phase 4: 兼容性测试
 */

const { test, expect } = require('@playwright/test')
const path = require('path')

const BASE_URL = 'http://localhost:3000'
const TEST_TIMEOUT = 180000

// 测试用DM ID（需要在测试环境中存在）
const TEST_DM_ID = process.env.TEST_DM_ID || '1744279876155641856'

test.describe('Para设计器全面UI交互测试', () => {
  test.setTimeout(TEST_TIMEOUT)

  // 登录前置
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // 登录
    const loginVisible = await page.locator('input[placeholder*="用户名"], input[placeholder*="账号"]').first().isVisible({ timeout: 2000 }).catch(() => false)
    if (loginVisible) {
      await page.fill('input[placeholder*="用户名"], input[placeholder*="账号"]', 'admin')
      await page.fill('input[type="password"]', 'admin123')
      await page.click('button[type="submit"], button:has-text("登录")')
      await page.waitForLoadState('networkidle', { timeout: 30000 })
    }

    // 导航到DM编辑器
    await page.goto(`${BASE_URL}/ietm/datamodule/editor?id=${TEST_DM_ID}`)
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    await page.waitForTimeout(2000)
  })

  // ========================================
  // Phase 1: 正则Bug修复验证（往返测试）
  // ========================================

  test.describe('Phase 1: 正则Bug修复验证', () => {

    test('TC-R01: 上标往返测试 - BUG-002修复验证', async ({ page }) => {
      console.log('🧪 测试上标往返转换（验证不会变成<superScriptcript>）')

      // 1. 找到一个para行，进入设计视图
      await page.click('.CodeMirror-line:has-text("<para>")')
      await page.waitForTimeout(500)

      // 切换到设计视图
      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      if (await designTab.isVisible({ timeout: 2000 })) {
        await designTab.click()
        await page.waitForTimeout(1000)
      }

      // 2. 在UEditor中输入上标
      const editorFrame = page.frameLocator('iframe.edui-default')
      await editorFrame.locator('body.view').click()
      await editorFrame.locator('body.view').fill('测试上标x²')

      // 选中"²"设置为上标
      await editorFrame.locator('body.view').press('Shift+ArrowLeft')
      await page.click('button[title="上标"]')
      await page.waitForTimeout(500)

      // 3. 保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      // 4. 验证XML正确
      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<superScript>')
      expect(sourceView).not.toContain('<superScriptcript>') // 确保没有循环替换
      console.log('  ✅ 第1次转换正确')

      // 5. 往返测试：重新打开设计视图
      const sourceTab = page.locator('.ant-tabs-tab:has-text("源码视图")')
      if (await sourceTab.isVisible()) {
        await sourceTab.click()
        await page.waitForTimeout(500)
      }

      await designTab.click()
      await page.waitForTimeout(1000)

      // 6. 再次保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      // 7. 验证第2次往返仍然正确
      const sourceView2 = await page.locator('.CodeMirror').textContent()
      expect(sourceView2).toContain('<superScript>')
      expect(sourceView2).not.toContain('<superScriptcript>')
      console.log('  ✅ 第2次往返正确')

      // 8. 第3次往返
      await sourceTab.click()
      await page.waitForTimeout(500)
      await designTab.click()
      await page.waitForTimeout(1000)
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      const sourceView3 = await page.locator('.CodeMirror').textContent()
      expect(sourceView3).toContain('<superScript>')
      expect(sourceView3).not.toContain('<superScriptcript>')
      console.log('  ✅ 第3次往返正确，标签稳定')
    })

    test('TC-R02: 下标往返测试 - BUG-003修复验证', async ({ page }) => {
      console.log('🧪 测试下标往返转换')

      // 进入设计视图
      await page.click('.CodeMirror-line:has-text("<para>")')
      await page.waitForTimeout(500)

      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      if (await designTab.isVisible({ timeout: 2000 })) {
        await designTab.click()
        await page.waitForTimeout(1000)
      }

      // 输入下标H₂O
      const editorFrame = page.frameLocator('iframe.edui-default')
      await editorFrame.locator('body.view').click()
      await editorFrame.locator('body.view').fill('H2O')

      // 选中"2"设置为下标
      await editorFrame.locator('body.view').press('Home')
      await editorFrame.locator('body.view').press('ArrowRight')
      await editorFrame.locator('body.view').press('Shift+ArrowRight')
      await page.click('button[title="下标"]')
      await page.waitForTimeout(500)

      // 保存并验证3次往返
      for (let i = 1; i <= 3; i++) {
        await page.click('button:has-text("保存")')
        await page.waitForTimeout(1000)

        const sourceView = await page.locator('.CodeMirror').textContent()
        expect(sourceView).toContain('<subScript>')
        expect(sourceView).not.toContain('<subScriptcript>')
        console.log(`  ✅ 第${i}次往返正确`)

        if (i < 3) {
          const sourceTab = page.locator('.ant-tabs-tab:has-text("源码视图")')
          await sourceTab.click()
          await page.waitForTimeout(500)
          await designTab.click()
          await page.waitForTimeout(1000)
        }
      }
    })

    test('TC-R03: 段落标签保护测试 - BUG-004修复验证', async ({ page }) => {
      console.log('🧪 测试<para>标签不被误转换为<p>')

      // 1. 在源码视图直接输入包含<para>的XML
      await page.click('.CodeMirror')
      await page.keyboard.press('Control+End')
      await page.keyboard.press('Enter')
      await page.keyboard.type('<para>这是测试段落</para>')
      await page.waitForTimeout(500)

      // 2. 切换到设计视图（触发para2html转换）
      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      // 3. 切换回源码视图
      const sourceTab = page.locator('.ant-tabs-tab:has-text("源码视图")')
      await sourceTab.click()
      await page.waitForTimeout(500)

      // 4. 验证<para>标签没有被破坏
      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<para>这是测试段落</para>')
      expect(sourceView).not.toContain('<p>这是测试段落</para>') // 确保不是不匹配的标签
      console.log('  ✅ <para>标签保护正确')
    })

    test('TC-R04: 定义列表往返测试 - BUG-005/007/008修复验证', async ({ page }) => {
      console.log('🧪 测试定义列表（deflist）往返转换')

      // 进入设计视图
      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      // 点击"列表定义"按钮插入deflist
      await page.click('button[title="列表定义"], .edui-button[title="列表定义"]')
      await page.waitForTimeout(1000)

      // 填写第一行：术语和定义
      const editorFrame = page.frameLocator('iframe.edui-default')
      const table = editorFrame.locator('table[deflist="1"]')
      await table.locator('th').first().click()
      await page.keyboard.type('术语1')
      await page.keyboard.press('Tab')
      await page.keyboard.type('定义1')
      await page.waitForTimeout(500)

      // 保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      // 验证转换为<definitionList>
      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<definitionList>')
      expect(sourceView).toContain('<listItemTerm>')
      expect(sourceView).toContain('<listItemDefinition>')
      expect(sourceView).not.toContain('<entry>') // 确保不是误转换为entry
      console.log('  ✅ deflist转换正确')

      // 往返测试
      const sourceTab = page.locator('.ant-tabs-tab:has-text("源码视图")')
      await sourceTab.click()
      await page.waitForTimeout(500)
      await designTab.click()
      await page.waitForTimeout(1000)
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      const sourceView2 = await page.locator('.CodeMirror').textContent()
      expect(sourceView2).toContain('<definitionList>')
      expect(sourceView2).toContain('<listItemTerm>')
      console.log('  ✅ deflist往返稳定')
    })

    test('TC-R05: 列表标签保护测试 - BUG-006修复验证', async ({ page }) => {
      console.log('🧪 测试<li>不误匹配<list>和<link>')

      // 进入设计视图
      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      // 插入无序列表
      await page.click('button[title="无序列表"]')
      await page.waitForTimeout(500)

      const editorFrame = page.frameLocator('iframe.edui-default')
      await editorFrame.locator('body.view li').first().fill('列表项1')
      await page.keyboard.press('Enter')
      await page.keyboard.type('列表项2')
      await page.waitForTimeout(500)

      // 保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      // 验证
      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<randomList>')
      expect(sourceView).toContain('<listItem>')
      console.log('  ✅ 列表转换正确')
    })
  })

  // ========================================
  // Phase 2: 功能场景测试
  // ========================================

  test.describe('Phase 2: 功能场景测试', () => {

    test('TC-F01: 基础文本编辑', async ({ page }) => {
      console.log('🧪 测试基础文本编辑和强调标签')

      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      const editorFrame = page.frameLocator('iframe.edui-default')
      await editorFrame.locator('body.view').click()
      await editorFrame.locator('body.view').fill('这是普通文本，这是加粗文本')

      // 选中"加粗文本"并加粗
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Shift+ArrowLeft')
      }
      await page.click('button[title="加粗"], button[title="强调"]')
      await page.waitForTimeout(500)

      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<emphasis>')
      console.log('  ✅ 强调标签正确')
    })

    test('TC-T01: 普通表格插入', async ({ page }) => {
      console.log('🧪 测试插入普通表格')

      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      // 点击插入表格按钮
      await page.click('button[title="插入表格"]')
      await page.waitForTimeout(1000)

      // 在弹出的对话框中设置表格大小（2行3列）
      const rowInput = page.locator('input[name="row"], input#tableRows')
      if (await rowInput.isVisible({ timeout: 2000 })) {
        await rowInput.fill('2')
      }
      const colInput = page.locator('input[name="col"], input#tableCols')
      if (await colInput.isVisible({ timeout: 2000 })) {
        await colInput.fill('3')
      }

      // 确认插入
      await page.click('button:has-text("确定")')
      await page.waitForTimeout(1000)

      // 保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      // 验证S1000D格式
      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<table>')
      expect(sourceView).toContain('<tgroup cols="3">')
      expect(sourceView).toContain('<tbody>')
      expect(sourceView).toContain('<row>')
      expect(sourceView).toContain('<entry>')
      console.log('  ✅ 表格转换为S1000D格式正确')
    })

    test('TC-T02: 带表头表格插入', async ({ page }) => {
      console.log('🧪 测试插入带表头的表格（验证BUG-001修复）')

      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      // 插入表格并勾选"表头"
      await page.click('button[title="插入表格"]')
      await page.waitForTimeout(1000)

      const rowInput = page.locator('input[name="row"], input#tableRows')
      if (await rowInput.isVisible({ timeout: 2000 })) {
        await rowInput.fill('2')
      }
      const colInput = page.locator('input[name="col"], input#tableCols')
      if (await colInput.isVisible({ timeout: 2000 })) {
        await colInput.fill('2')
      }

      // 勾选"表头"复选框
      const headerCheckbox = page.locator('input[type="checkbox"]#tableHeader, input[name="hasHeader"]')
      if (await headerCheckbox.isVisible({ timeout: 2000 })) {
        await headerCheckbox.check()
      }

      await page.click('button:has-text("确定")')
      await page.waitForTimeout(1000)

      // 保存
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      // 验证thead和tbody正确分离
      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<thead>')
      expect(sourceView).toContain('<tbody>')
      expect(sourceView).toContain('<tgroup cols="2">')

      // 验证thead在tbody之前
      const theadIndex = sourceView.indexOf('<thead>')
      const tbodyIndex = sourceView.indexOf('<tbody>')
      expect(theadIndex).toBeLessThan(tbodyIndex)

      console.log('  ✅ 带表头的表格正确分离thead/tbody')
    })
  })

  // ========================================
  // Phase 3: 边界条件测试
  // ========================================

  test.describe('Phase 3: 边界条件测试', () => {

    test('TC-E01: 空内容保存', async ({ page }) => {
      console.log('🧪 测试空内容保存')

      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      const editorFrame = page.frameLocator('iframe.edui-default')
      await editorFrame.locator('body.view').click()
      await page.keyboard.press('Control+A')
      await page.keyboard.press('Delete')
      await page.waitForTimeout(500)

      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      const sourceView = await page.locator('.CodeMirror').textContent()
      expect(sourceView).toContain('<para>')
      console.log('  ✅ 空内容生成空para标签')
    })

    test('TC-E02: 特殊字符处理', async ({ page }) => {
      console.log('🧪 测试特殊字符转义')

      const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
      await designTab.click()
      await page.waitForTimeout(1000)

      const editorFrame = page.frameLocator('iframe.edui-default')
      await editorFrame.locator('body.view').click()
      await editorFrame.locator('body.view').fill('测试特殊字符: <>&"\'')
      await page.waitForTimeout(500)

      await page.click('button:has-text("保存")')
      await page.waitForTimeout(1000)

      const sourceView = await page.locator('.CodeMirror').textContent()
      // XML应该正确转义特殊字符
      expect(sourceView).toMatch(/&lt;|&gt;|&amp;/)
      console.log('  ✅ 特殊字符正确转义')
    })
  })
})
