/**
 * ParaDesigner诊断脚本
 *
 * 目的：探测真实UI结构，找到Para设计器的正确入口点
 */

import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('诊断: 探测IETM真实UI结构', async ({ page, context }) => {
  // 第一步：访问首页
  console.log('\n====== 第一步：访问首页 ======');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  // 截图当前页面
  await page.screenshot({ path: 'screenshot-1-home.png' });
  console.log('首页截图已保存: screenshot-1-home.png');

  // 输出页面标题和URL
  console.log('当前URL:', page.url());
  console.log('页面标题:', await page.title());

  // 列出所有可点击的链接和按钮
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button, [role="button"]'))
      .map(el => ({
        text: el.textContent?.trim().substring(0, 50),
        href: el.getAttribute('href'),
        class: el.className,
        tag: el.tagName,
        dataTest: el.getAttribute('data-test')
      }))
      .filter(el => el.text && el.text.length > 0)
      .slice(0, 20); // 前20个
  });

  console.log('页面上的链接/按钮:');
  links.forEach((link, idx) => {
    console.log(`  ${idx + 1}. ${link.text} (${link.tag})`);
    if (link.href) console.log(`     href: ${link.href}`);
    if (link.dataTest) console.log(`     data-test: ${link.dataTest}`);
  });

  // 第二步：尝试登录
  console.log('\n====== 第二步：检测登录状态 ======');
  const isLoggedIn = await page.evaluate(() => {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || false;
  });

  console.log('登录状态:', isLoggedIn ? '已登录' : '未登录');

  if (!isLoggedIn) {
    console.log('尝试登录...');
    const usernameInput = await page.$('input[placeholder*="户名"], input[name="username"]');
    const passwordInput = await page.$('input[placeholder*="密码"], input[name="password"], input[type="password"]');

    if (usernameInput && passwordInput) {
      await usernameInput.fill('admin');
      await passwordInput.fill('admin');

      const loginBtn = await page.$('button:has-text("登录"), button[type="submit"]');
      if (loginBtn) {
        await loginBtn.click();
        try {
          await page.waitForNavigation({ timeout: 10000 });
        } catch (e) {
          console.log('导航等待超时，继续');
        }
        await page.waitForTimeout(2000);
      }
    }
  }

  // 第三步：查找DM管理相关的入口
  console.log('\n====== 第三步：查找DM管理入口 ======');

  // 输出所有菜单项
  const menuItems = await page.evaluate(() => {
    const items = [];
    // 查找所有可能的菜单项
    document.querySelectorAll('[class*="menu"], [class*="nav"], .sidebar a, .layout-sider a').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 100) {
        items.push({
          text: text,
          href: el.getAttribute('href'),
          class: el.className
        });
      }
    });
    return items.slice(0, 30);
  });

  console.log('菜单项:');
  menuItems.forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.text}`);
    if (item.href) console.log(`     href: ${item.href}`);
  });

  // 第四步：尝试导航到常见的DM管理页面
  console.log('\n====== 第四步：尝试导航到DM管理页面 ======');

  const possiblePaths = [
    '/ietm/dm-manage',
    '/ietm/dm-manage/dmManage',
    '/ietm/dmManage',
    '/ietm/dmdatamodule',
    '/ietm/dm',
    '/ietm/manage/dm'
  ];

  for (const path of possiblePaths) {
    const url = `${BASE_URL}${path}`;
    console.log(`尝试: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      const title = await page.title();
      const content = await page.evaluate(() => document.body.textContent.substring(0, 100));
      console.log(`  ✓ 成功加载 (标题: ${title})`);

      // 查找Para相关的按钮
      const paraButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, [role="button"], a'))
          .filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            const classes = el.className?.toLowerCase() || '';
            return text.includes('para') || text.includes('edit') || text.includes('设计') ||
                   classes.includes('para') || classes.includes('designer');
          })
          .map(el => ({
            text: el.textContent?.trim(),
            class: el.className,
            tag: el.tagName
          }));
      });

      if (paraButtons.length > 0) {
        console.log(`  找到 ${paraButtons.length} 个Para相关按钮:`);
        paraButtons.forEach(btn => {
          console.log(`    - ${btn.text} (${btn.tag})`);
        });
      }

      // 保存截图
      await page.screenshot({ path: `screenshot-dm-${path.split('/').pop()}.png` });
      break; // 找到页面后退出循环
    } catch (e) {
      console.log(`  ✗ 失败: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n====== 诊断完成 ======');
  console.log('已生成截图文件用于人工审查');
});
