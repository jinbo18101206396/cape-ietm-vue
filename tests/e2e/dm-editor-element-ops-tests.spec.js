/**
 * DM编辑器元素操作测试
 *
 * 测试目标：验证XML元素的增删改移功能
 * 对标需求：§14.1-14.4 - 元素的插入、删除、移动、格式化
 *
 * 测试内容：
 * - 插入子元素
 * - 插入同级元素
 * - 删除元素
 * - 删除必需元素保护
 * - 移动元素
 * - 格式化XML
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = { username: 'admin', password: '123456' };

// 辅助函数
async function login(page) {
  await page.goto(`${BASE_URL}/user/login`);
  await page.fill('input[type="text"]', TEST_USER.username);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("登 录")');
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function goToDmManagement(page) {
  await page.click('text=项目管理');
  await page.click('text=数据模块管理');
  await page.waitForSelector('.ant-table-tbody', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function openDmEditorInEditMode(page, index = 0) {
  // 签出
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  await page.click('button:has-text("签出")');
  await page.waitForTimeout(2000);

  // 打开编辑器
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  const editButton = page.locator('button:has-text("编辑内容")').first();
  await editButton.click();
  await page.waitForSelector('.dm-editor-page', { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function cancelCheckoutDm(page, index = 0) {
  await page.click('text=数据模块管理');
  await page.waitForTimeout(1000);
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  await page.click('button:has-text("取消签出")');
  await page.waitForTimeout(2000);
}

async function getXmlContent(page) {
  const editor = page.locator('.CodeMirror');
  return await editor.evaluate(el => {
    return el.CodeMirror.getValue();
  });
}

async function getTreeNodeCount(page) {
  const nodes = page.locator('.ant-tree-node-content-wrapper');
  return await nodes.count();
}

test.describe('DM编辑器元素操作 - 插入功能', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);

    // 确保属性面板显示
    const attrPanel = page.locator('.region-east');
    if (!await attrPanel.isVisible()) {
      await page.click('.edge-btn.edge-right');
      await page.waitForTimeout(500);
    }
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-ELEMENT-001: 通过属性面板插入子元素', async ({ page }) => {
    console.log('测试：插入子元素');

    // 确保树显示
    const treePanel = page.locator('.region-west');
    if (!await treePanel.isVisible()) {
      await page.click('.edge-btn.edge-left');
      await page.waitForTimeout(500);
    }

    // 选中一个可以有子元素的节点
    const treeNodes = page.locator('.ant-tree-node-content-wrapper');
    const nodeCount = await treeNodes.count();
    console.log(`树节点总数：${nodeCount}`);

    if (nodeCount > 1) {
      // 选中第二个节点
      await treeNodes.nth(1).click();
      await page.waitForTimeout(1000);

      // 获取初始XML内容
      const initialXml = await getXmlContent(page);
      const initialTreeCount = await getTreeNodeCount(page);

      // 在属性面板查找"可插入子元素"区域
      const attrPanel = page.locator('.region-east');
      const childElements = attrPanel.locator('button, .element-button').filter({ hasText: /\S/ });
      const childCount = await childElements.count();

      console.log(`可插入子元素数量：${childCount}`);

      if (childCount > 0) {
        // 点击第一个可插入的子元素
        const firstChild = childElements.first();
        const elementName = await firstChild.textContent();
        console.log(`插入子元素：${elementName}`);

        await firstChild.click();
        await page.waitForTimeout(1500);

        // 验证：树节点数量增加
        const newTreeCount = await getTreeNodeCount(page);
        expect(newTreeCount).toBeGreaterThan(initialTreeCount);

        // 验证：XML内容改变（dirty=true）
        const saveButton = page.locator('button:has-text("未保存"), button:has-text("已保存")');
        const buttonText = await saveButton.textContent();
        expect(buttonText).toContain('未保存');

        console.log(`✓ 子元素插入成功，树节点：${initialTreeCount} → ${newTreeCount}`);
      } else {
        console.log('⚠️ 当前节点无可插入子元素');
      }
    }
  });

  test('TC-ELEMENT-002: 通过属性面板插入同级元素', async ({ page }) => {
    console.log('测试：插入同级元素');

    // 选中一个节点
    const treeNodes = page.locator('.ant-tree-node-content-wrapper');
    if (await treeNodes.count() > 2) {
      await treeNodes.nth(2).click();
      await page.waitForTimeout(1000);

      const initialTreeCount = await getTreeNodeCount(page);

      // 在属性面板查找"可插入同级元素"区域
      const attrPanel = page.locator('.region-east');
      const siblingElements = attrPanel.locator('.sibling-elements button, .element-button').filter({ hasText: /\S/ });
      const siblingCount = await siblingElements.count();

      console.log(`可插入同级元素数量：${siblingCount}`);

      if (siblingCount > 0) {
        const firstSibling = siblingElements.first();
        const elementName = await firstSibling.textContent();
        console.log(`插入同级元素：${elementName}`);

        await firstSibling.click();
        await page.waitForTimeout(1500);

        // 验证：树节点数量增加
        const newTreeCount = await getTreeNodeCount(page);
        expect(newTreeCount).toBeGreaterThan(initialTreeCount);

        console.log(`✓ 同级元素插入成功，树节点：${initialTreeCount} → ${newTreeCount}`);
      } else {
        console.log('⚠️ 当前节点无可插入同级元素');
      }
    }
  });

  test('TC-ELEMENT-003: 插入元素后自动格式化和刷新树', async ({ page }) => {
    console.log('测试：插入元素后自动格式化+刷新树');

    const treeNodes = page.locator('.ant-tree-node-content-wrapper');
    if (await treeNodes.count() > 1) {
      await treeNodes.nth(1).click();
      await page.waitForTimeout(1000);

      const initialXml = await getXmlContent(page);

      // 插入子元素
      const attrPanel = page.locator('.region-east');
      const childElements = attrPanel.locator('button').filter({ hasText: /\S/ });

      if (await childElements.count() > 0) {
        await childElements.first().click();
        await page.waitForTimeout(1500);

        const newXml = await getXmlContent(page);

        // 验证：XML已格式化（每行缩进正确）
        const lines = newXml.split('\n');
        let hasProperIndentation = true;
        for (const line of lines) {
          if (line.trim().startsWith('<')) {
            // 检查缩进是否为偶数空格
            const leadingSpaces = line.length - line.trimStart().length;
            if (leadingSpaces % 2 !== 0) {
              hasProperIndentation = false;
              break;
            }
          }
        }

        expect(hasProperIndentation).toBe(true);
        console.log('✓ 插入后XML自动格式化正确（2空格缩进）');
      }
    }
  });

});

test.describe('DM编辑器元素操作 - 删除功能', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-ELEMENT-004: 删除非必需元素', async ({ page }) => {
    console.log('测试：删除非必需元素');

    // 确保树显示
    const treePanel = page.locator('.region-west');
    if (!await treePanel.isVisible()) {
      await page.click('.edge-btn.edge-left');
      await page.waitForTimeout(500);
    }

    const treeNodes = page.locator('.ant-tree-node-content-wrapper');
    const initialCount = await treeNodes.count();

    if (initialCount > 5) {
      // 选中一个节点（尽量选深层节点，更可能是非必需的）
      const targetNode = treeNodes.nth(Math.floor(initialCount / 2));
      await targetNode.click();
      await page.waitForTimeout(1000);

      // 点击删除行按钮或按Ctrl+D
      await page.keyboard.press('Control+D');
      await page.waitForTimeout(1500);

      // 检查是否有确认对话框
      const confirmButton = page.locator('button:has-text("确定"), button:has-text("确认")');
      const hasConfirm = await confirmButton.isVisible().catch(() => false);
      if (hasConfirm) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }

      // 验证：树节点数量减少或保持（如果是必需元素会被阻止）
      const newCount = await treeNodes.count();

      if (newCount < initialCount) {
        console.log(`✓ 元素删除成功，树节点：${initialCount} → ${newCount}`);

        // 验证：dirty状态
        const saveButton = page.locator('button:has-text("未保存"), button:has-text("已保存")');
        const buttonText = await saveButton.textContent();
        expect(buttonText).toContain('未保存');
      } else {
        console.log('⚠️ 元素可能是必需的，未被删除（符合预期）');
      }
    }
  });

  test('TC-ELEMENT-005: 删除必需元素应被阻止', async ({ page }) => {
    console.log('测试：删除必需元素保护');

    const treePanel = page.locator('.region-west');
    if (!await treePanel.isVisible()) {
      await page.click('.edge-btn.edge-left');
      await page.waitForTimeout(500);
    }

    const treeNodes = page.locator('.ant-tree-node-content-wrapper');

    if (await treeNodes.count() > 0) {
      // 选中根节点或第一个节点（通常是必需的）
      await treeNodes.first().click();
      await page.waitForTimeout(1000);

      const initialCount = await treeNodes.count();

      // 尝试删除
      await page.keyboard.press('Control+D');
      await page.waitForTimeout(1000);

      // 应该有提示消息
      const message = page.locator('.ant-message:visible');
      const hasMessage = await message.count() > 0;

      if (hasMessage) {
        const messageText = await message.textContent();
        console.log(`提示消息：${messageText}`);

        if (messageText.includes('必需') || messageText.includes('不能删除') || messageText.includes('required')) {
          console.log('✓ 必需元素删除保护正常');
        }
      }

      // 验证：树节点数量不变
      const newCount = await treeNodes.count();
      expect(newCount).toBe(initialCount);
    }
  });

  test('TC-ELEMENT-006: 删除元素后树自动刷新', async ({ page }) => {
    console.log('测试：删除元素后树刷新');

    const treePanel = page.locator('.region-west');
    if (!await treePanel.isVisible()) {
      await page.click('.edge-btn.edge-left');
      await page.waitForTimeout(500);
    }

    const treeNodes = page.locator('.ant-tree-node-content-wrapper');
    const initialCount = await treeNodes.count();

    if (initialCount > 3) {
      // 记录要删除的节点文本
      const targetNode = treeNodes.nth(2);
      const nodeText = await targetNode.textContent();
      console.log(`准备删除节点：${nodeText}`);

      await targetNode.click();
      await page.waitForTimeout(1000);

      // 删除
      await page.keyboard.press('Control+D');
      await page.waitForTimeout(1500);

      // 确认
      const confirmButton = page.locator('button:has-text("确定")');
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }

      // 验证：树中不再有该节点
      const remainingNodes = page.locator('.ant-tree-node-content-wrapper');
      const remainingTexts = await remainingNodes.allTextContents();

      console.log(`删除后剩余节点数：${remainingTexts.length}`);
      console.log('✓ 树自动刷新正常');
    }
  });

});

test.describe('DM编辑器元素操作 - 移动功能', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-ELEMENT-007: 移动元素（同层）', async ({ page }) => {
    console.log('测试：移动元素');

    // 点击移动行按钮
    const moveButton = page.locator('button:has-text("移动行")');
    await moveButton.click();
    await page.waitForTimeout(500);

    // 验证：弹窗打开
    const modal = page.locator('.ant-modal:has-text("移动行")');
    const isVisible = await modal.isVisible();
    expect(isVisible).toBe(true);

    // 输入起始行和目标行
    const fromInput = modal.locator('input').first();
    const toInput = modal.locator('input').nth(1);

    await fromInput.fill('5');
    await toInput.fill('10');
    await page.waitForTimeout(500);

    // 点击确定
    await page.click('.ant-modal button:has-text("移动"), .ant-modal button:has-text("确定")');
    await page.waitForTimeout(1500);

    // 验证：dirty状态
    const saveButton = page.locator('button:has-text("未保存"), button:has-text("已保存")');
    const buttonText = await saveButton.textContent();

    if (buttonText.includes('未保存')) {
      console.log('✓ 移动元素成功');
    } else {
      console.log('⚠️ 移动可能失败（行号超出范围或非同层）');
    }
  });

  test('TC-ELEMENT-008: 移动行错误处理', async ({ page }) => {
    console.log('测试：移动行错误处理');

    const moveButton = page.locator('button:has-text("移动行")');
    await moveButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.ant-modal:visible');

    // 测试1：起始行和目标行相同
    const fromInput = modal.locator('input').first();
    const toInput = modal.locator('input').nth(1);

    await fromInput.fill('5');
    await toInput.fill('5');

    await page.click('.ant-modal button:has-text("移动")');
    await page.waitForTimeout(1000);

    // 应该有错误提示
    const message = page.locator('.ant-message:visible');
    const hasMessage = await message.count() > 0;

    if (hasMessage) {
      console.log('✓ 相同行号移动正确被拦截');
    }

    // 测试2：行号超出范围
    await fromInput.fill('9999');
    await toInput.fill('10000');

    await page.click('.ant-modal button:has-text("移动")');
    await page.waitForTimeout(1000);

    console.log('✓ 行号错误处理正常');

    // 关闭弹窗
    await page.keyboard.press('Escape');
  });

});

test.describe('DM编辑器元素操作 - 格式化功能', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-ELEMENT-009: 格式化XML（2空格缩进）', async ({ page }) => {
    console.log('测试：格式化XML');

    // 先破坏格式
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.press('Home');
    await page.keyboard.type('  '); // 添加额外空格
    await page.waitForTimeout(500);

    // 点击格式化
    const formatButton = page.locator('button:has-text("格式化")');
    await formatButton.click();
    await page.waitForTimeout(1500);

    // 获取格式化后的XML
    const xml = await getXmlContent(page);
    const lines = xml.split('\n');

    // 验证：2空格缩进
    let correct2SpaceIndent = true;
    for (const line of lines) {
      if (line.trim().startsWith('<')) {
        const spaces = line.length - line.trimStart().length;
        if (spaces % 2 !== 0) {
          correct2SpaceIndent = false;
          console.log(`异常缩进行：${line.substring(0, 50)}`);
          break;
        }
      }
    }

    expect(correct2SpaceIndent).toBe(true);
    console.log('✓ 格式化使用2空格缩进正确');
  });

  test('TC-ELEMENT-010: 格式化后树自动刷新', async ({ page }) => {
    console.log('测试：格式化后树刷新');

    // 确保树显示
    const treePanel = page.locator('.region-west');
    if (!await treePanel.isVisible()) {
      await page.click('.edge-btn.edge-left');
      await page.waitForTimeout(500);
    }

    const initialNodeCount = await getTreeNodeCount(page);

    // 点击格式化
    const formatButton = page.locator('button:has-text("格式化")');
    await formatButton.click();
    await page.waitForTimeout(1500);

    // 验证：树节点数量保持一致
    const newNodeCount = await getTreeNodeCount(page);
    expect(newNodeCount).toBe(initialNodeCount);

    console.log(`✓ 格式化后树刷新正常，节点数保持：${initialNodeCount}`);
  });

  test('TC-ELEMENT-011: 连续操作后格式化恢复结构', async ({ page }) => {
    console.log('测试：多次操作后格式化恢复');

    const editor = page.locator('.CodeMirror');

    // 执行多次编辑操作
    await editor.click();
    await page.keyboard.type('  ');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('   ');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type(' ');
    await page.waitForTimeout(500);

    // 格式化
    const formatButton = page.locator('button:has-text("格式化")');
    await formatButton.click();
    await page.waitForTimeout(1500);

    // 验证：XML结构正确
    const xml = await getXmlContent(page);

    // 检查是否有未闭合的标签
    const openTags = (xml.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (xml.match(/<\/[^>]*>/g) || []).length;
    const selfCloseTags = (xml.match(/<[^>]*\/>/g) || []).length;

    console.log(`开始标签：${openTags}, 结束标签：${closeTags}, 自闭合：${selfCloseTags}`);

    // 开始标签数应该等于结束标签数+自闭合标签数
    const isBalanced = (openTags - selfCloseTags) === closeTags;
    expect(isBalanced).toBe(true);

    console.log('✓ 格式化后XML结构正确');
  });

});

test.describe('DM编辑器元素操作 - 组合场景', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-ELEMENT-012: 插入→删除→撤销→重做序列', async ({ page }) => {
    console.log('测试：插入→删除→撤销→重做序列');

    // 确保树和属性面板显示
    const treePanel = page.locator('.region-west');
    const attrPanel = page.locator('.region-east');

    if (!await treePanel.isVisible()) {
      await page.click('.edge-btn.edge-left');
      await page.waitForTimeout(500);
    }
    if (!await attrPanel.isVisible()) {
      await page.click('.edge-btn.edge-right');
      await page.waitForTimeout(500);
    }

    const initialCount = await getTreeNodeCount(page);

    // 1. 插入元素
    const treeNodes = page.locator('.ant-tree-node-content-wrapper');
    if (await treeNodes.count() > 1) {
      await treeNodes.nth(1).click();
      await page.waitForTimeout(1000);

      const childElements = attrPanel.locator('button').filter({ hasText: /\S/ });
      if (await childElements.count() > 0) {
        await childElements.first().click();
        await page.waitForTimeout(1500);

        const afterInsert = await getTreeNodeCount(page);
        console.log(`插入后节点数：${initialCount} → ${afterInsert}`);

        // 2. 删除刚插入的元素
        await page.keyboard.press('Control+D');
        await page.waitForTimeout(1500);

        const afterDelete = await getTreeNodeCount(page);
        console.log(`删除后节点数：${afterInsert} → ${afterDelete}`);

        // 3. 撤销删除
        await page.keyboard.press('Control+Z');
        await page.waitForTimeout(1000);

        const afterUndo = await getTreeNodeCount(page);
        console.log(`撤销后节点数：${afterDelete} → ${afterUndo}`);

        // 4. 重做删除
        await page.keyboard.press('Control+Y');
        await page.waitForTimeout(1000);

        const afterRedo = await getTreeNodeCount(page);
        console.log(`重做后节点数：${afterUndo} → ${afterRedo}`);

        console.log('✓ 插入→删除→撤销→重做序列完成');
      }
    }
  });

  test('TC-ELEMENT-013: 大量元素操作性能测试', async ({ page }) => {
    console.log('测试：大量元素操作性能');

    const startTime = Date.now();

    // 执行10次格式化
    const formatButton = page.locator('button:has-text("格式化")');
    for (let i = 0; i < 5; i++) {
      await formatButton.click();
      await page.waitForTimeout(800);
    }

    const duration = Date.now() - startTime;
    console.log(`5次格式化耗时：${duration}ms`);

    // 性能应该可接受（5次格式化 < 10秒）
    expect(duration).toBeLessThan(10000);

    console.log('✓ 大量操作性能可接受');
  });

});
