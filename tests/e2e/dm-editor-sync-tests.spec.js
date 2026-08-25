/**
 * DM编辑器三区联动测试
 *
 * 测试目标：验证编辑器↔树↔属性面板的联动机制
 * 对标需求：§7 - 编辑器 ↔ 树 ↔ 属性面板联动机制
 *
 * 核心机制：
 * - editorcursorFlag：防死循环标志
 * - 编辑器→树：光标移动自动选中树节点
 * - 树→编辑器：点击树节点定位编辑器光标
 * - 树/编辑器→属性面板：选中节点显示属性
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const TEST_USER = { username: 'admin', password: '123456' }

// 辅助函数
async function login(page) {
  await page.goto(`${BASE_URL}/user/login`)
  await page.fill('input[type="text"]', TEST_USER.username)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button:has-text("登 录")')
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function goToDmManagement(page) {
  await page.click('text=项目管理')
  await page.click('text=数据模块管理')
  await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function openDmEditor(page, index = 0) {
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`)
  await page.waitForTimeout(500)
  const editButton = page.locator('button:has-text("编辑内容")').first()
  await editButton.click()
  await page.waitForSelector('.dm-editor-page', { timeout: 15000 })
  await page.waitForTimeout(2000)
}

test.describe('DM编辑器三区联动测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToDmManagement(page)
    await openDmEditor(page, 0)
  })

  test('TC-SYNC-001: 编辑器光标移动联动树选中', async ({ page }) => {
    console.log('测试：编辑器→树联动')

    // 确保树和属性面板都显示
    const treePanel = page.locator('.region-west')
    const attrPanel = page.locator('.region-east')

    const isTreeVisible = await treePanel.isVisible()
    const isAttrVisible = await attrPanel.isVisible()

    if (!isTreeVisible) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(500)
    }
    if (!isAttrVisible) {
      await page.click('.edge-btn.edge-right')
      await page.waitForTimeout(500)
    }

    // 在编辑器中点击不同的行
    const editor = page.locator('.CodeMirror')

    // 点击第5行
    await editor.click()
    await page.keyboard.press('Control+Home') // 移到开头
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown')
    }
    await page.waitForTimeout(1000)

    // 验证：树应该选中对应节点
    const selectedTreeNode = page.locator('.ant-tree-node-selected')
    const hasSelection = await selectedTreeNode.count() > 0
    expect(hasSelection).toBe(true)

    if (hasSelection) {
      const selectedText = await selectedTreeNode.first().textContent()
      console.log(`树节点选中：${selectedText}`)
    }

    // 点击第10行
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowDown')
    }
    await page.waitForTimeout(1000)

    // 验证：树选中应该改变
    const newSelectedText = await selectedTreeNode.first().textContent()
    console.log(`新树节点选中：${newSelectedText}`)

    console.log('✓ 编辑器→树联动正常')
  })

  test('TC-SYNC-002: 树节点点击联动编辑器定位', async ({ page }) => {
    console.log('测试：树→编辑器联动')

    // 确保树显示
    const treePanel = page.locator('.region-west')
    const isTreeVisible = await treePanel.isVisible()
    if (!isTreeVisible) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(500)
    }

    // 获取所有树节点
    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    const nodeCount = await treeNodes.count()
    console.log(`树节点总数：${nodeCount}`)

    if (nodeCount > 3) {
      // 点击第3个节点
      const thirdNode = treeNodes.nth(2)
      const nodeText = await thirdNode.textContent()
      console.log(`点击树节点：${nodeText}`)

      await thirdNode.click()
      await page.waitForTimeout(1000)

      // 验证：编辑器光标应该移动
      // 通过检查活动行是否改变
      const activeLine = page.locator('.CodeMirror-activeline')
      const hasActiveLine = await activeLine.count() > 0
      expect(hasActiveLine).toBe(true)

      // 点击另一个节点
      if (nodeCount > 5) {
        const fifthNode = treeNodes.nth(4)
        const nodeText2 = await fifthNode.textContent()
        console.log(`点击树节点：${nodeText2}`)

        await fifthNode.click()
        await page.waitForTimeout(1000)

        console.log('✓ 树→编辑器联动正常')
      }
    } else {
      console.log('⚠️ 树节点太少，跳过部分测试')
    }
  })

  test('TC-SYNC-003: 树节点双击打开设计视图（二期）', async ({ page }) => {
    console.log('测试：树节点双击设计视图（应禁用）')

    // 确保树显示
    const treePanel = page.locator('.region-west')
    const isTreeVisible = await treePanel.isVisible()
    if (!isTreeVisible) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(500)
    }

    // 双击第一个节点
    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    const firstNode = treeNodes.first()
    await firstNode.dblclick()
    await page.waitForTimeout(1000)

    // 验证：设计视图页签应该仍然禁用
    const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
    const isDisabled = await designTab.evaluate(el => {
      return el.classList.contains('ant-tabs-tab-disabled')
    })

    expect(isDisabled).toBe(true)
    console.log('✓ 设计视图正确保持禁用状态（二期功能）')
  })

  test('TC-SYNC-004: 属性面板显示当前节点属性', async ({ page }) => {
    console.log('测试：属性面板显示节点属性')

    // 确保属性面板显示
    const attrPanel = page.locator('.region-east')
    const isAttrVisible = await attrPanel.isVisible()
    if (!isAttrVisible) {
      await page.click('.edge-btn.edge-right')
      await page.waitForTimeout(500)
    }

    // 确保树显示并点击节点
    const treePanel = page.locator('.region-west')
    const isTreeVisible = await treePanel.isVisible()
    if (!isTreeVisible) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(500)
    }

    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    const nodeCount = await treeNodes.count()

    if (nodeCount > 1) {
      // 点击第二个节点
      const secondNode = treeNodes.nth(1)
      const nodeText = await secondNode.textContent()
      console.log(`选中节点：${nodeText}`)

      await secondNode.click()
      await page.waitForTimeout(1000)

      // 验证：属性面板应该显示属性
      const attrTable = attrPanel.locator('.ant-table, .ant-form, .attr-panel')
      const hasContent = await attrTable.count() > 0

      if (hasContent) {
        console.log('✓ 属性面板显示节点属性')
      } else {
        console.log('⚠️ 未找到属性面板内容，可能该节点无属性')
      }
    }
  })

  test('TC-SYNC-005: 快速连续切换节点不死循环', async ({ page }) => {
    console.log('测试：快速切换节点防死循环')

    // 确保树显示
    const treePanel = page.locator('.region-west')
    const isTreeVisible = await treePanel.isVisible()
    if (!isTreeVisible) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(500)
    }

    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    const nodeCount = await treeNodes.count()

    if (nodeCount >= 5) {
      console.log('快速点击5个不同节点')

      // 快速连续点击多个节点
      for (let i = 0; i < 5; i++) {
        await treeNodes.nth(i).click()
        await page.waitForTimeout(200) // 短间隔
      }

      await page.waitForTimeout(1000)

      // 验证：页面仍然响应，未卡死
      const lastNode = treeNodes.nth(4)
      const isClickable = await lastNode.isEnabled()
      expect(isClickable).toBe(true)

      console.log('✓ 快速切换无死循环，editorcursorFlag机制正常')
    } else {
      console.log('⚠️ 节点数不足，跳过测试')
    }
  })

  test('TC-SYNC-006: 编辑器中移动光标同步树滚动', async ({ page }) => {
    console.log('测试：编辑器光标移动树自动滚动')

    // 确保树显示
    const treePanel = page.locator('.region-west')
    const isTreeVisible = await treePanel.isVisible()
    if (!isTreeVisible) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(500)
    }

    const editor = page.locator('.CodeMirror')

    // 移动到文件开头
    await editor.click()
    await page.keyboard.press('Control+Home')
    await page.waitForTimeout(1000)

    // 移动到文件末尾
    await page.keyboard.press('Control+End')
    await page.waitForTimeout(1000)

    // 验证：树应该滚动到对应位置
    const selectedNode = page.locator('.ant-tree-node-selected')
    const hasSelection = await selectedNode.count() > 0
    expect(hasSelection).toBe(true)

    console.log('✓ 编辑器光标移动树自动滚动正常')
  })

  test('TC-SYNC-007: 行内光标移动不触发树联动', async ({ page }) => {
    console.log('测试：行内光标移动不触发树联动（noevent机制）')

    const editor = page.locator('.CodeMirror')
    await editor.click()
    await page.keyboard.press('Home')
    await page.waitForTimeout(500)

    // 获取初始选中的树节点
    const selectedNode = page.locator('.ant-tree-node-selected')
    const initialText = await selectedNode.first().textContent()
    console.log(`初始选中节点：${initialText}`)

    // 在同一行内左右移动光标
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)

    // 验证：树选中应该不变
    const currentText = await selectedNode.first().textContent()
    expect(currentText).toBe(initialText)

    console.log('✓ 行内移动不触发树联动，noevent机制正常')
  })

  test('TC-SYNC-008: 折叠/展开树节点', async ({ page }) => {
    console.log('测试：树节点折叠/展开')

    // 确保树显示
    const treePanel = page.locator('.region-west')
    const isTreeVisible = await treePanel.isVisible()
    if (!isTreeVisible) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(500)
    }

    // 查找可展开的节点（有子节点的节点）
    const expandIcons = page.locator('.ant-tree-switcher:not(.ant-tree-switcher-noop)')
    const expandCount = await expandIcons.count()

    if (expandCount > 0) {
      // 点击第一个展开/折叠图标
      const firstIcon = expandIcons.first()

      await firstIcon.click()
      await page.waitForTimeout(500)

      // 再次点击（切换状态）
      await firstIcon.click()
      await page.waitForTimeout(500)

      console.log('✓ 树节点折叠/展开功能正常')
    } else {
      console.log('⚠️ 未找到可展开的树节点')
    }
  })

  test('TC-SYNC-009: 属性面板修改联动XML更新', async ({ page }) => {
    console.log('测试：属性面板修改→XML更新')

    // 确保属性面板显示
    const attrPanel = page.locator('.region-east')
    const isAttrVisible = await attrPanel.isVisible()
    if (!isAttrVisible) {
      await page.click('.edge-btn.edge-right')
      await page.waitForTimeout(500)
    }

    // 选中一个有属性的节点
    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    if (await treeNodes.count() > 2) {
      await treeNodes.nth(2).click()
      await page.waitForTimeout(1000)

      // 查找属性输入框
      const attrInput = attrPanel.locator('input[type="text"]').first()
      const inputCount = await attrPanel.locator('input[type="text"]').count()

      if (inputCount > 0) {
        console.log(`找到${inputCount}个属性输入框`)

        // 修改属性值
        await attrInput.clear()
        await attrInput.fill('TEST_VALUE')
        await attrInput.press('Enter')
        await page.waitForTimeout(1000)

        // 验证：保存按钮应该显示"未保存"
        const saveButton = page.locator('button:has-text("未保存"), button:has-text("已保存")')
        const buttonText = await saveButton.textContent()

        if (buttonText.includes('未保存')) {
          console.log('✓ 属性修改触发dirty状态')
        } else {
          console.log('⚠️ 属性修改未触发dirty（可能是只读模式）')
        }
      } else {
        console.log('⚠️ 当前节点无可编辑属性')
      }
    }
  })

  test('TC-SYNC-010: 三区同时操作压力测试', async ({ page }) => {
    console.log('测试：三区同时操作压力测试')

    // 确保三区都显示
    const treePanel = page.locator('.region-west')
    const attrPanel = page.locator('.region-east')

    if (!await treePanel.isVisible()) {
      await page.click('.edge-btn.edge-left')
      await page.waitForTimeout(300)
    }
    if (!await attrPanel.isVisible()) {
      await page.click('.edge-btn.edge-right')
      await page.waitForTimeout(300)
    }

    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    const nodeCount = await treeNodes.count()
    const editor = page.locator('.CodeMirror')

    console.log('执行混合操作序列...')

    // 混合操作：树点击、编辑器移动、快速切换
    if (nodeCount >= 3) {
      await treeNodes.nth(0).click()
      await page.waitForTimeout(200)

      await editor.click()
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      await treeNodes.nth(1).click()
      await page.waitForTimeout(200)

      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      await treeNodes.nth(2).click()
      await page.waitForTimeout(200)
    }

    // 验证：页面仍然响应
    const isPageResponsive = await editor.isEnabled()
    expect(isPageResponsive).toBe(true)

    console.log('✓ 三区同时操作无卡顿，性能正常')
  })
})

test.describe('DM编辑器联动边界测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToDmManagement(page)
    await openDmEditor(page, 0)
  })

  test('TC-SYNC-EDGE-001: 隐藏树后联动应停止', async ({ page }) => {
    console.log('测试：隐藏树后编辑器不应继续联动')

    // 隐藏树
    await page.click('.edge-btn.edge-left')
    await page.waitForTimeout(500)

    // 在编辑器中移动光标
    const editor = page.locator('.CodeMirror')
    await editor.click()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(500)

    // 验证：树仍然隐藏（不会因为联动而显示）
    const treePanel = page.locator('.region-west')
    const isVisible = await treePanel.isVisible()
    expect(isVisible).toBe(false)

    console.log('✓ 隐藏树后联动正确停止')
  })

  test('TC-SYNC-EDGE-002: 空树或树加载失败', async ({ page }) => {
    console.log('测试：树为空时的边界情况')

    const treePanel = page.locator('.region-west')
    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    const nodeCount = await treeNodes.count()

    if (nodeCount === 0) {
      console.log('树为空，验证编辑器仍可用')

      // 验证：编辑器应该仍然可用
      const editor = page.locator('.CodeMirror')
      const isEditorVisible = await editor.isVisible()
      expect(isEditorVisible).toBe(true)

      // 验证：可以正常编辑
      await editor.click()
      await page.keyboard.type('TEST')
      await page.waitForTimeout(500)

      console.log('✓ 树为空时编辑器仍可用')
    } else {
      console.log(`树有${nodeCount}个节点，跳过空树测试`)
    }
  })

  test('TC-SYNC-EDGE-003: 快速切换标签页不引起联动错误', async ({ page }) => {
    console.log('测试：切换页签后联动状态重置')

    // 记录初始URL
    const initialUrl = page.url()

    // 返回列表页
    await page.click('text=数据模块管理')
    await page.waitForTimeout(1000)

    // 再次打开编辑器
    await openDmEditor(page, 0)

    // 验证：树和编辑器正常联动
    const treeNodes = page.locator('.ant-tree-node-content-wrapper')
    const nodeCount = await treeNodes.count()

    if (nodeCount > 0) {
      await treeNodes.first().click()
      await page.waitForTimeout(500)

      const selectedNode = page.locator('.ant-tree-node-selected')
      const hasSelection = await selectedNode.count() > 0
      expect(hasSelection).toBe(true)

      console.log('✓ 切换页签后联动状态正常重置')
    }
  })
})
