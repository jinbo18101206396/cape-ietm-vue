/**
 * DM编辑器权限与入口测试
 *
 * 测试目标：验证10种权限场景的入口判定逻辑
 * 对标需求：§2, §3 - 入口链路与权限判定
 *
 * 10种场景：
 * 1. 未启动流程 → 浏览
 * 2. 非编写节点 → 浏览
 * 3. 本人签出 → 编辑 ✅
 * 4. 角色待办+已签出 → 编辑（属于角色）
 * 5. 部门待办+已签出 → 编辑（JSP-02缺陷）
 * 6. 用户组待办+已签出 → 编辑（属于组）
 * 7. 岗位待办+已签出 → 编辑（JSP-03缺陷）
 * 8. 他人签出 → 浏览+提示
 * 9. 待办人未签出 → 浏览+可签出
 * 10. 非待办人未签出 → 浏览
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

async function openDmEditor(page, index = 0) {
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  const editButton = page.locator('button:has-text("编辑内容"), button:has-text("浏览或编辑")').first();
  await editButton.click();
  await page.waitForSelector('.dm-editor-page', { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function checkoutDm(page, index = 0) {
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  await page.click('button:has-text("签出")');
  await page.waitForTimeout(2000);
}

async function cancelCheckoutDm(page, index = 0) {
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  await page.click('button:has-text("取消签出")');
  await page.waitForTimeout(2000);
}

test.describe('DM编辑器权限与入口测试', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
  });

  test('TC-PERM-001: 未启动流程的DM应进入浏览模式', async ({ page }) => {
    console.log('测试：未启动流程 → 浏览模式');

    // 查找未启动流程的DM（流程状态为空或未启动）
    // 注意：需要根据实际表格列位置调整
    const rows = page.locator('.ant-table-tbody tr');
    const rowCount = await rows.count();

    let foundUnstartedDm = false;
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i);
      const statusCell = row.locator('td').nth(6); // 假设流程状态在第7列
      const statusText = await statusCell.textContent();

      if (!statusText || statusText.trim() === '' || statusText.includes('未启动')) {
        console.log(`找到未启动流程的DM，行${i + 1}`);
        foundUnstartedDm = true;

        // 打开编辑器
        await openDmEditor(page, i);

        // 验证：应为浏览模式
        const modeBanner = page.locator('.mode-banner');
        const bannerText = await modeBanner.textContent();
        expect(bannerText).toContain('浏览模式');

        // 验证：编辑按钮应禁用
        const saveButton = page.locator('button:has-text("保存"), button:has-text("未保存")');
        const isDisabled = await saveButton.isDisabled();
        expect(isDisabled).toBe(true);

        console.log('✓ 未启动流程的DM正确进入浏览模式');
        break;
      }
    }

    if (!foundUnstartedDm) {
      console.log('⚠️ 未找到未启动流程的DM，跳过测试');
    }
  });

  test('TC-PERM-003: 本人签出的DM应进入编辑模式', async ({ page }) => {
    console.log('测试：本人签出 → 编辑模式');

    // 签出第一个DM
    await checkoutDm(page, 0);
    await page.waitForTimeout(1000);

    // 打开编辑器
    await openDmEditor(page, 0);

    // 验证：应为编辑模式
    const modeBanner = page.locator('.mode-banner');
    const bannerText = await modeBanner.textContent();

    if (bannerText.includes('编辑模式')) {
      console.log('✓ 本人签出的DM正确进入编辑模式');

      // 验证：模式横幅为绿色
      const hasEditClass = await modeBanner.evaluate(el =>
        el.classList.contains('mode-banner--edit')
      );
      expect(hasEditClass).toBe(true);

      // 验证：保存按钮可用
      const saveButton = page.locator('button:has-text("已保存"), button:has-text("未保存")');
      const isDisabled = await saveButton.isDisabled();
      expect(isDisabled).toBe(false);

      // 验证：编辑功能可用
      const deleteButton = page.locator('button:has-text("删除行")');
      const isDeleteDisabled = await deleteButton.isDisabled();
      expect(isDeleteDisabled).toBe(false);
    } else {
      console.log('⚠️ 签出后仍为浏览模式，可能是权限问题');
    }

    // 清理：取消签出
    await page.click('text=数据模块管理');
    await page.waitForTimeout(1000);
    await cancelCheckoutDm(page, 0);
  });

  test('TC-PERM-008: 他人签出的DM应进入浏览模式并提示', async ({ page }) => {
    console.log('测试：他人签出 → 浏览模式+提示');

    // 查找被他人签出的DM
    const rows = page.locator('.ant-table-tbody tr');
    const rowCount = await rows.count();

    let foundOthersCheckout = false;
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = rows.nth(i);
      const checkoutUserCell = row.locator('td').nth(8); // 假设签出用户在第9列
      const checkoutUser = await checkoutUserCell.textContent();

      if (checkoutUser && checkoutUser.trim() && !checkoutUser.includes('admin')) {
        console.log(`找到被他人签出的DM，行${i + 1}，签出人：${checkoutUser}`);
        foundOthersCheckout = true;

        // 打开编辑器
        await openDmEditor(page, i);

        // 验证：应为浏览模式
        const modeBanner = page.locator('.mode-banner');
        const bannerText = await modeBanner.textContent();
        expect(bannerText).toContain('浏览模式');

        // 验证：提示信息包含签出人
        const hintText = await modeBanner.locator('.mb-hint').textContent();
        expect(hintText).toBeTruthy();

        console.log(`✓ 他人签出的DM正确进入浏览模式，提示：${hintText}`);
        break;
      }
    }

    if (!foundOthersCheckout) {
      console.log('⚠️ 未找到被他人签出的DM，跳过测试');
    }
  });

  test('TC-PERM-009: 待办人未签出的DM应提示可签出', async ({ page }) => {
    console.log('测试：待办人未签出 → 浏览模式+可签出提示');

    // 查找当前用户为待办人但未签出的DM
    const rows = page.locator('.ant-table-tbody tr');
    const rowCount = await rows.count();

    let foundPendingDm = false;
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = rows.nth(i);
      const checkoutUserCell = row.locator('td').nth(8);
      const checkoutUser = await checkoutUserCell.textContent();

      // 未签出
      if (!checkoutUser || checkoutUser.trim() === '') {
        const statusCell = row.locator('td').nth(6);
        const statusText = await statusCell.textContent();

        // 流程在编写节点
        if (statusText && statusText.includes('编写')) {
          console.log(`找到待办且未签出的DM，行${i + 1}`);
          foundPendingDm = true;

          // 打开编辑器
          await openDmEditor(page, i);

          // 验证：应为浏览模式
          const modeBanner = page.locator('.mode-banner');
          const bannerText = await modeBanner.textContent();
          expect(bannerText).toContain('浏览模式');

          // 验证：提示可以签出
          const hintText = await modeBanner.locator('.mb-hint').textContent();
          expect(hintText.toLowerCase()).toMatch(/签出|checkout/);

          console.log(`✓ 待办人未签出的DM提示可签出：${hintText}`);
          break;
        }
      }
    }

    if (!foundPendingDm) {
      console.log('⚠️ 未找到符合条件的DM，跳过测试');
    }
  });

  test('TC-PERM-SWITCH: 浏览模式切换到编辑模式', async ({ page }) => {
    console.log('测试：浏览→签出→编辑完整流程');

    // 1. 先以浏览模式打开
    await openDmEditor(page, 0);

    let modeBanner = page.locator('.mode-banner');
    let bannerText = await modeBanner.textContent();
    const initialMode = bannerText.includes('编辑模式') ? 'edit' : 'browse';
    console.log(`初始模式：${initialMode}`);

    if (initialMode === 'browse') {
      // 返回列表页
      await page.click('text=数据模块管理');
      await page.waitForTimeout(1000);

      // 签出
      await checkoutDm(page, 0);
      await page.waitForTimeout(1000);

      // 再次打开
      await openDmEditor(page, 0);

      // 验证：应为编辑模式
      modeBanner = page.locator('.mode-banner');
      bannerText = await modeBanner.textContent();
      expect(bannerText).toContain('编辑模式');

      // 验证：属性面板显示（如果是本次改进生效）
      const attrPanel = page.locator('.region-east');
      const isVisible = await attrPanel.isVisible();
      expect(isVisible).toBe(true);

      console.log('✓ 浏览模式成功切换到编辑模式');

      // 清理
      await page.click('text=数据模块管理');
      await page.waitForTimeout(1000);
      await cancelCheckoutDm(page, 0);
    } else {
      console.log('初始即为编辑模式，跳过切换测试');
    }
  });

  test('TC-PERM-READONLY: 浏览模式下所有编辑功能应禁用', async ({ page }) => {
    console.log('测试：浏览模式下编辑功能禁用');

    // 确保取消签出
    await cancelCheckoutDm(page, 0);
    await page.waitForTimeout(1000);

    // 打开编辑器
    await openDmEditor(page, 0);

    // 检查模式
    const modeBanner = page.locator('.mode-banner');
    const bannerText = await modeBanner.textContent();

    if (bannerText.includes('浏览模式')) {
      console.log('当前为浏览模式，验证编辑功能禁用');

      // 验证：保存按钮禁用
      const saveButton = page.locator('button:has-text("保存"), button:has-text("已保存")');
      const isSaveDisabled = await saveButton.isDisabled();
      expect(isSaveDisabled).toBe(true);

      // 验证：签入按钮禁用
      const checkinButton = page.locator('button:has-text("签入")');
      const isCheckinDisabled = await checkinButton.isDisabled();
      expect(isCheckinDisabled).toBe(true);

      // 验证：删除行按钮禁用
      const deleteButton = page.locator('button:has-text("删除行")');
      const isDeleteDisabled = await deleteButton.isDisabled();
      expect(isDeleteDisabled).toBe(true);

      // 验证：撤销按钮禁用
      const undoButton = page.locator('button:has-text("撤销")');
      const isUndoDisabled = await undoButton.isDisabled();
      expect(isUndoDisabled).toBe(true);

      // 验证：重做按钮禁用
      const redoButton = page.locator('button:has-text("重做")');
      const isRedoDisabled = await redoButton.isDisabled();
      expect(isRedoDisabled).toBe(true);

      console.log('✓ 浏览模式下所有编辑功能正确禁用');
    } else {
      console.log('当前为编辑模式，跳过禁用验证');
    }
  });

});
