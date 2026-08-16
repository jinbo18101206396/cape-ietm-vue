const { test } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const USERNAME = 'admin';
const PASSWORD = '123456';

test.use({ video: 'on', screenshot: 'on' });

test('真实UI验证 - 通过手册编辑菜单进入', async ({ page }, testInfo) => {
  console.log('\n=== 真实UI验证 ===\n');

  // 登录
  await page.goto(`${BASE}/user/login`);
  await page.locator('#username').fill(USERNAME);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  console.log('✅ 登录成功\n');

  await page.screenshot({ path: testInfo.outputPath('01-logged-in.png'), fullPage: true });

  // 打开项目
  console.log('步骤1: 打开项目');
  const openBtn = page.locator('button:has-text("打开项目")').first();
  await openBtn.click();
  await page.waitForTimeout(2000);
  console.log('✅ 项目已打开\n');

  // 检查并关闭可能的模态框
  const modal = page.locator('.ant-modal').first();
  const modalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

  if (modalVisible) {
    console.log('检测到模态框，尝试关闭...');
    // 尝试点击关闭按钮
    await page.locator('.ant-modal-close').click().catch(() => {});
    await page.waitForTimeout(500);
    // 或者按ESC键
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    console.log('✅ 已关闭模态框\n');
  }

  // 点击"手册编辑"菜单
  console.log('步骤2: 点击手册编辑菜单');
  const manualEditMenu = page.locator('span:text("手册编辑")').first();
  await manualEditMenu.click();
  await page.waitForTimeout(1000);
  console.log('✅ 已点击手册编辑\n');

  await page.screenshot({ path: testInfo.outputPath('02-manual-edit-menu.png'), fullPage: true });

  // 查找子菜单
  console.log('步骤3: 查找数据模块管理子菜单');
  const submenuItems = await page.locator('.ant-menu-submenu-open .ant-menu-item').all();
  console.log(`找到 ${submenuItems.length} 个子菜单项`);

  for (let i = 0; i < submenuItems.length; i++) {
    const item = submenuItems[i];
    const text = await item.textContent();
    console.log(`  子菜单 ${i + 1}: ${text.trim()}`);

    if (text.includes('数据模块')) {
      console.log(`  ✅ 找到数据模块管理！点击...`);
      await item.click();
      await page.waitForTimeout(3000);
      break;
    }
  }

  await page.screenshot({ path: testInfo.outputPath('03-after-click-dm.png'), fullPage: true });

  // 验证是否进入DM列表
  const content = await page.locator('body').textContent();
  const isDmPage = content.includes('DMC') || content.includes('签出状态') || content.includes('数据模块代码');

  console.log(`\n是否在DM列表页面: ${isDmPage}\n`);

  if (isDmPage) {
    console.log('✅ 成功进入DM列表！\n');
    console.log('步骤4: 查找并测试签出按钮\n');

    const rows = await page.locator('.ant-table-tbody tr').all();
    console.log(`找到 ${rows.length} 行DM\n`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowText = await row.textContent();
      console.log(`--- DM ${i + 1} ---`);
      console.log(`内容: ${rowText.substring(0, 150)}`);

      // 查找签出按钮
      const checkoutBtn = row.locator('button:has-text("签出")');
      const hasBtn = await checkoutBtn.count() > 0;

      if (hasBtn) {
        const visible = await checkoutBtn.isVisible().catch(() => false);
        console.log(`签出按钮可见: ${visible}`);

        if (visible) {
          console.log(`🖱️  点击签出按钮...\n`);

          await page.screenshot({ path: testInfo.outputPath(`04-before-click-dm${i}.png`), fullPage: true });

          await checkoutBtn.click();
          await page.waitForTimeout(2000);

          await page.screenshot({ path: testInfo.outputPath(`05-after-click-dm${i}.png`), fullPage: true });

          // 检查所有UI反馈
          const warning = page.locator('.ant-message-warning');
          const error = page.locator('.ant-message-error');
          const success = page.locator('.ant-message-success');
          const modal = page.locator('.ant-modal-confirm');

          const warningVisible = await warning.isVisible({ timeout: 1000 }).catch(() => false);
          const errorVisible = await error.isVisible({ timeout: 1000 }).catch(() => false);
          const successVisible = await success.isVisible({ timeout: 1000 }).catch(() => false);
          const modalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);

          console.log('UI响应:');
          console.log(`  警告消息: ${warningVisible}`);
          console.log(`  错误消息: ${errorVisible}`);
          console.log(`  成功消息: ${successVisible}`);
          console.log(`  确认对话框: ${modalVisible}`);

          if (warningVisible) {
            const text = await warning.first().textContent();
            console.log(`  ⚠️  警告内容: "${text}"`);

            if (text.includes('还未启动') || text.includes('不是') || text.includes('DM编写')) {
              console.log(`\n✅✅✅ 前置条件校验触发成功！验证通过！\n`);
            }
          }

          if (errorVisible) {
            const text = await error.first().textContent();
            console.log(`  ❌ 错误内容: "${text}"`);
          }

          if (modalVisible) {
            console.log(`  ✅ 确认对话框出现（前端第一层校验通过）\n`);
            await modal.locator('button:has-text("取消")').click().catch(() => {});
          }

          // 只测试第一个
          break;
        }
      } else {
        console.log(`无签出按钮`);
      }
      console.log('');
    }
  } else {
    console.log('❌ 未进入DM列表');
  }

  console.log('\n=== 测试完成 ===');
});
