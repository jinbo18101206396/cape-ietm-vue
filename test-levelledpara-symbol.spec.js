const { test, expect } = require('@playwright/test');

test.describe('LevelledPara 设计器 - 图符显示测试', () => {
  test('应该在警告列表中正确显示图符而不是空标签', async ({ page }) => {
    // 1. 导航到 DM 内容编辑器
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2115071394537517057?mode=edit&dmc=DMC-ZB1-A-05-00-00-00A-007A-A_001-01_zh-CN');
    await page.waitForTimeout(3000);

    // 2. 等待设计视图加载，点击铅笔图标进入设计视图
    const pencilIcons = await page.$$('a[href="javascript:void(0);"]');
    let foundPencil = false;
    for (const icon of pencilIcons) {
      const text = await icon.textContent();
      if (text.includes('✎')) {
        await icon.click();
        foundPencil = true;
        break;
      }
    }
    expect(foundPencil).toBe(true);
    console.log('✓ 点击设计视图按钮');

    await page.waitForTimeout(3000);

    // 3. 在警告 tab 中点击增加按钮
    const warningTabPanes = await page.$$('.ant-tabs-tabpane');
    let warningTab = null;
    for (const pane of warningTabPanes) {
      const text = await pane.textContent();
      if (text.includes('警告')) {
        warningTab = pane;
        break;
      }
    }
    expect(warningTab).not.toBeNull();

    const buttons = await warningTab.$$('button');
    let addBtnClicked = false;
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text.includes('增加')) {
        await btn.click();
        addBtnClicked = true;
        break;
      }
    }
    expect(addBtnClicked).toBe(true);
    console.log('✓ 点击增加警告按钮');

    await page.waitForTimeout(2000);

    // 4. 点击图符按钮插入图符
    const ueditorWindow = await page.locator('.a-modal button').filter({ hasText: '图符' }).first();
    await ueditorWindow.click();
    console.log('✓ 点击图符按钮');

    await page.waitForTimeout(2000);

    // 5. 选择一个图符并插入
    const tableRows = await page.$$('tr[data-row-key]');
    if (tableRows.length > 0) {
      await tableRows[0].click();
      await page.waitForTimeout(1000);
    }

    // 查找确定按钮并点击
    const confirmBtns = await page.$$('button');
    for (const btn of confirmBtns) {
      const text = await btn.textContent();
      if (text === '确定' || text === '确认') {
        await btn.click();
        break;
      }
    }
    console.log('✓ 选择并确认图符');

    await page.waitForTimeout(2000);

    // 6. 点击内容编辑框的确定按钮保存
    const saveConfirmBtns = await page.$$('.a-modal button');
    for (const btn of saveConfirmBtns) {
      const text = await btn.textContent();
      if (text === '确定') {
        await btn.click();
        break;
      }
    }
    console.log('✓ 保存警告内容');

    await page.waitForTimeout(3000);

    // 7. 收集所有日志验证修复
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[添加项]') || text.includes('html2para')) {
        logs.push(text);
      }
    });

    // 8. 检查警告列表中的内容
    const warningCell = await page.locator('.ant-table-cell').first();
    const cellContent = await warningCell.textContent();

    console.log('警告列表单元格内容:', cellContent);

    // 验证：应该显示图片或 symbol 标签，而不是 <warning id="..."/>
    expect(cellContent).not.toMatch(/<warning\s+id="[^"]*"\s*\/>/);
    expect(cellContent).not.toMatch(/<warning\s+id="[^"]*"><\/warning>/);
    console.log('✓ 验证通过：警告列表中没有显示空标签');

    // 9. 检查源码视图中的 XML 结构
    const sourceViewBtn = await page.locator('.ant-tabs-tab').filter({ hasText: '源码视图' }).first();
    if (sourceViewBtn) {
      await sourceViewBtn.click();
      await page.waitForTimeout(1000);

      const xmlContent = await page.locator('.CodeMirror-line').first().textContent();
      console.log('源码视图第一行内容:', xmlContent);

      // 验证：应该包含 <symbol> 标签而不是空的 <warning />
      const fullXml = await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror');
        return cm ? cm.CodeMirror.getValue() : '';
      });

      expect(fullXml).toMatch(/<symbol/);
      console.log('✓ 验证通过：XML 中包含 <symbol> 标签');
    }

    console.log('✅ 所有测试通过！');
  });
});
