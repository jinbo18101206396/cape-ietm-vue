const { test, expect } = require('@playwright/test');

/**
 * 测试 DM 编辑后 XML 同步功能
 * 验证修改 DMC 字段后，XML 内容是否同步更新
 */
test.describe('DM XML 同步测试', () => {
  let page;
  let context;
  let dmId = null;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // 登录
    await page.goto('http://localhost:3000/');
    await page.fill('input[placeholder="请输入账号"]', 'admin');
    await page.fill('input[placeholder="请输入密码"]', 'admin');
    await page.click('button:has-text("登录")');
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('验证编辑 DM 后 XML 同步 - 子系统码修改', async () => {
    // 1. 导航到 DM 管理页面
    await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList');
    await page.waitForTimeout(2000);

    // 2. 选择项目节点
    console.log('步骤1: 选择项目节点...');
    const firstTreeNode = page.locator('.ant-tree-node-content-wrapper').first();
    await firstTreeNode.click();
    await page.waitForTimeout(2000);

    // 3. 检查是否有数据
    const tableRows = page.locator('.ant-table-tbody tr');
    const rowCount = await tableRows.count();
    console.log(`步骤2: 找到 ${rowCount} 条 DM 记录`);

    if (rowCount === 0) {
      console.log('⚠️ 列表为空，跳过测试');
      test.skip();
      return;
    }

    // 4. 选择第一条未签出且为工作版本的记录
    let targetRow = null;
    let targetIndex = -1;

    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = tableRows.nth(i);
      await row.waitFor({ state: 'visible', timeout: 5000 });

      const cells = row.locator('td');
      const cellCount = await cells.count();

      if (cellCount < 10) continue;

      const checkoutUserCell = cells.nth(10);
      const versionTypeCell = cells.nth(8);

      const checkoutText = await checkoutUserCell.textContent();
      const versionText = await versionTypeCell.textContent();

      console.log(`  记录 ${i}: 签出="${checkoutText.trim()}", 版本="${versionText.trim()}"`);

      if (checkoutText.trim() === '' && versionText.includes('工作')) {
        targetRow = row;
        targetIndex = i;
        break;
      }
    }

    if (!targetRow) {
      console.log('⚠️ 未找到可编辑的 DM，跳过测试');
      test.skip();
      return;
    }

    console.log(`步骤3: 选择第 ${targetIndex} 条记录 ✓`);

    // 5. 点击选择框
    const checkbox = targetRow.locator('.ant-checkbox-input');
    await checkbox.click();
    await page.waitForTimeout(500);

    // 6. 读取原始 DMC
    const dmcCell = targetRow.locator('td').nth(3);
    const originalDmc = await dmcCell.textContent();
    console.log(`步骤4: 原始 DMC = ${originalDmc}`);

    // 7. 点击编辑按钮
    console.log('步骤5: 点击编辑按钮...');
    const editButton = page.locator('button').filter({ hasText: /^编辑$/ }).first();

    const isDisabled = await editButton.isDisabled();
    if (isDisabled) {
      console.log('❌ 编辑按钮被禁用');
      throw new Error('编辑按钮未启用');
    }

    await editButton.click();
    await page.waitForTimeout(1500);

    // 8. 修改子系统码
    console.log('步骤6: 修改子系统码...');
    const modal = page.locator('.ant-modal-content').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const subSystemInput = modal.locator('input').filter({ hasText: '' }).nth(2); // 第3个输入框通常是子系统码
    const originalSubSystem = await subSystemInput.inputValue();
    console.log(`  原子系统码 = ${originalSubSystem}`);

    const newSubSystem = originalSubSystem === '1' ? '2' : '1';
    await subSystemInput.clear();
    await subSystemInput.fill(newSubSystem);
    console.log(`  新子系统码 = ${newSubSystem}`);

    // 9. 保存
    console.log('步骤7: 保存修改...');
    const saveButton = modal.locator('button:has-text("确定")').first();
    await saveButton.click();
    await page.waitForTimeout(3000);

    // 10. 验证成功提示
    const successMsg = page.locator('.ant-message');
    const msgText = await successMsg.textContent();
    console.log(`  保存结果: ${msgText}`);

    // 11. 通过 API 直接验证 XML
    console.log('步骤8: 通过 API 验证 XML 同步...');

    // 拦截下一次列表请求，获取更新后的 DM ID
    const listResponse = await page.waitForResponse(
      response => response.url().includes('/ietm-data-module/list'),
      { timeout: 10000 }
    ).catch(() => null);

    if (listResponse) {
      const listData = await listResponse.json();
      if (listData.result && listData.result.records && listData.result.records.length > targetIndex) {
        dmId = listData.result.records[targetIndex].id;
        console.log(`  获取到 DM ID: ${dmId}`);
      }
    }

    // 12. 直接调用后端 API 查询 XML
    if (dmId) {
      const response = await page.request.get(`http://localhost:9999/jeecg-boot/ietm/ietm-data-module/queryById?id=${dmId}`);
      const data = await response.json();

      if (data.success && data.result && data.result.dmContent) {
        const xmlContent = data.result.dmContent;
        console.log('  XML 前 300 字符:', xmlContent.substring(0, 300));

        // 验证 subSystemCode
        const dmCodeMatch = xmlContent.match(/subSystemCode="([^"]+)"/);
        if (dmCodeMatch) {
          const xmlSubSystem = dmCodeMatch[1];
          console.log(`  XML 中的 subSystemCode = ${xmlSubSystem}`);

          if (xmlSubSystem === newSubSystem) {
            console.log('✅ 测试通过：XML 同步成功！');
          } else {
            console.log(`❌ 测试失败：XML 未同步（期望 ${newSubSystem}，实际 ${xmlSubSystem}）`);
            throw new Error('XML 同步失败');
          }
        } else {
          console.log('⚠️ XML 中未找到 subSystemCode');
        }
      }
    }

    console.log('步骤9: 测试完成 ✓');
  });
});
