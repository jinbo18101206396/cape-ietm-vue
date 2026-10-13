/**
 * 登录后的详细诊断
 */

import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('诊断: 登录后的DM管理页面结构', async ({ page, context }) => {
  console.log('\n====== 步骤1: 登录 ======');
  await page.goto(`${BASE_URL}/user/login`);

  await page.waitForSelector('input[placeholder*="账户名"], input[placeholder*="户名"]', { timeout: 10000 });

  const usernameInputs = await page.$$('input[placeholder*="账户名"], input[placeholder*="户名"], input[name="username"]');
  const passwordInputs = await page.$$('input[placeholder*="密码"], input[type="password"]');

  if (usernameInputs.length > 0 && passwordInputs.length > 0) {
    await usernameInputs[0].fill('admin');
    await passwordInputs[0].fill('admin');

    await page.click('button:has-text("登")');

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      console.log('导航等待超时');
    }
  }

  await page.waitForTimeout(2000);

  console.log('当前URL:', page.url());

  // 检查是否成功登录
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  console.log('Token存在:', !!token);

  await page.screenshot({ path: 'screenshot-after-login-home.png' });

  console.log('\n====== 步骤2: 导航到/ietm/dm-manage ======');
  await page.goto(`${BASE_URL}/ietm/dm-manage`, { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  // 获取页面的完整DOM结构（前1000个字符）
  const html = await page.content();
  const lines = html.split('\n');
  console.log('页面长度:', html.length);
  console.log('行数:', lines.length);

  // 查找所有表格相关元素
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table, [role="table"], [class*="table"], [class*="grid"]'))
      .map(el => ({
        tag: el.tagName,
        class: el.className,
        id: el.id,
        rowCount: el.querySelectorAll('tbody tr, [role="row"]').length,
        text: el.textContent?.substring(0, 50)
      }))
      .slice(0, 10);
  });

  console.log('\n找到的表格/网格元素:');
  tables.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.tag} (${t.class}) - 行数: ${t.rowCount}`);
  });

  // 查找所有按钮
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .map(b => b.textContent?.trim())
      .filter((t, i, arr) => t && t.length > 0 && t.length < 30 && arr.indexOf(t) === i)
      .slice(0, 20);
  });

  console.log('\n找到的按钮:');
  buttons.forEach(b => console.log(`  - ${b}`));

  // 检查页面主要结构
  const pageStructure = await page.evaluate(() => {
    const result = {
      title: document.title,
      url: window.location.href,
      hasAntTable: !!document.querySelector('.ant-table'),
      hasAntGrid: !!document.querySelector('[class*="ant-grid"]'),
      hasDataTable: !!document.querySelector('[class*="data-table"]'),
      hasJeecgTable: !!document.querySelector('[class*="jeecg"]'),
      visibleText: document.body.textContent?.substring(0, 200)
    };

    // 计算可见元素
    const elements = document.querySelectorAll('*');
    let visibleCount = 0;
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        visibleCount++;
      }
    });

    result.visibleElementCount = visibleCount;
    return result;
  });

  console.log('\n页面结构分析:');
  console.log('  标题:', pageStructure.title);
  console.log('  URL:', pageStructure.url);
  console.log('  Ant Table:', pageStructure.hasAntTable);
  console.log('  Jeecg相关:', pageStructure.hasJeecgTable);
  console.log('  可见元素:', pageStructure.visibleElementCount);

  await page.screenshot({ path: 'screenshot-after-login-dm-manage.png' });

  console.log('\n====== 尝试点击各个菜单项 ======');

  // 尝试找到左侧菜单并点击
  const sidebarItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="sider"] a, [class*="menu"] a, .ant-menu-item'))
      .map(el => ({
        text: el.textContent?.trim(),
        href: el.getAttribute('href'),
        class: el.className
      }))
      .slice(0, 15);
  });

  console.log('左侧菜单项:');
  sidebarItems.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.text}`);
    if (item.href) console.log(`     href: ${item.href}`);
  });

  console.log('\n====== 诊断完成 ======');
});
