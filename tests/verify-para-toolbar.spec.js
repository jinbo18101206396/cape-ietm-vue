/**
 * Para设计器工具栏验证 - 检查simple="0"修改是否生效
 *
 * 验证目标：
 * 1. ParaDesigner组件的simple参数是否为"0"
 * 2. UEditor工具栏是否包含完整按钮（date/time/spechars等）
 * 3. 工具栏实际显示的按钮数量
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// 登录辅助函数
async function login(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  const isLoggedIn = await page.evaluate(() => {
    return !!localStorage.getItem('Pro__Access-Token');
  });

  if (!isLoggedIn) {
    console.log('执行登录...');

    // 等待登录表单加载
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // 使用更简单直接的方法填充表单
    await page.fill('input[type="text"]', 'admin');
    await page.waitForTimeout(500);

    await page.fill('input[type="password"]', '123456');
    await page.waitForTimeout(500);

    // 尝试多种方式点击登录按钮
    try {
      // 方式1: 通过文本内容
      await page.click('button:has-text("登录")');
    } catch (e) {
      try {
        // 方式2: 通过button标签
        await page.click('button[type="submit"]');
      } catch (e2) {
        // 方式3: 通过class或其他属性
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[buttons.length - 1].click();
        }
      }
    }

    // 等待登录完成
    await page.waitForTimeout(5000);

    // 验证登录是否成功
    const loginSuccess = await page.evaluate(() => {
      return !!localStorage.getItem('Pro__Access-Token');
    });

    if (!loginSuccess) {
      throw new Error('登录失败，请检查用户名和密码');
    }

    console.log('登录成功');
  }
}

// 导航到DM编辑器
async function navigateToDmEditor(page) {
  console.log('导航到DM管理页面...');
  await page.goto(`${BASE_URL}/#/ietm/dm-manage`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 先截图诊断
  await page.screenshot({ path: 'screenshot-dm-list.png', fullPage: true });
  console.log('✓ 已保存DM列表页截图: screenshot-dm-list.png');

  // 诊断页面上的按钮
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a'))
      .filter(el => el.textContent?.trim())
      .map(el => ({
        text: el.textContent.trim().substring(0, 30),
        class: el.className,
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      }))
      .slice(0, 30);
  });
  console.log('页面上的按钮:', JSON.stringify(buttons, null, 2));

  // 尝试多种选择器
  const editSelectors = [
    'button:has-text("编辑")',
    'a:has-text("编辑")',
    'button[title="编辑"]',
    'a[title="编辑"]',
    '.ant-btn:has-text("编辑")',
    '[class*="edit"]'
  ];

  let editBtn = null;
  for (const selector of editSelectors) {
    console.log(`尝试选择器: ${selector}`);
    const btn = page.locator(selector).first();
    const count = await btn.count();
    console.log(`  找到 ${count} 个元素`);
    if (count > 0 && await btn.isVisible()) {
      editBtn = btn;
      console.log(`  ✓ 使用选择器: ${selector}`);
      break;
    }
  }

  if (editBtn) {
    await editBtn.click();
    await page.waitForTimeout(3000);
    console.log('✓ 点击编辑按钮成功');
  } else {
    throw new Error('找不到编辑按钮，请查看screenshot-dm-list.png');
  }
}

// 打开Para设计器
async function openParaDesigner(page) {
  console.log('等待左侧树加载...');
  await page.waitForSelector('.el-tree, [class*="tree"]', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 查找并双击第一个<para>节点
  console.log('查找<para>节点...');
  const paraNode = await page.locator('.el-tree-node__content:has-text("para")').first();

  if (await paraNode.isVisible()) {
    console.log('双击<para>节点...');
    await paraNode.dblclick();
    await page.waitForTimeout(2000);
  } else {
    // 尝试展开节点找到para
    console.log('尝试展开节点查找para...');
    const expandIcons = await page.locator('.el-tree-node__expand-icon').all();
    for (const icon of expandIcons.slice(0, 3)) {
      await icon.click();
      await page.waitForTimeout(500);
    }

    const paraNodeRetry = await page.locator('.el-tree-node__content:has-text("para")').first();
    if (await paraNodeRetry.isVisible()) {
      await paraNodeRetry.dblclick();
      await page.waitForTimeout(2000);
    }
  }

  // 切换到设计视图
  console.log('切换到设计视图...');
  const designTab = await page.locator('text="设计视图"').first();
  if (await designTab.isVisible()) {
    await designTab.click();
    await page.waitForTimeout(2000);
  }
}

test('验证Para设计器工具栏 - simple="0"完整模式', async ({ page }) => {
  // 步骤1：登录
  await login(page);
  console.log('✓ 登录成功');

  // 步骤2：导航到DM编辑器
  await navigateToDmEditor(page);
  console.log('✓ 进入DM编辑器');

  // 步骤3：打开Para设计器
  await openParaDesigner(page);
  console.log('✓ 打开Para设计器');

  // 截图：Para设计器界面
  await page.screenshot({ path: 'screenshot-para-designer.png', fullPage: true });
  console.log('✓ 已保存截图: screenshot-para-designer.png');

  // 验证1：检查ParaDesigner组件的simple属性
  console.log('\n====== 验证1：检查simple属性 ======');
  const simpleValue = await page.evaluate(() => {
    const paraDesigner = document.querySelector('[class*="para-designer"]');
    if (!paraDesigner) return null;

    // 尝试获取Vue实例（Ant Design Vue 1.7.x）
    if (paraDesigner.__vue__) {
      return paraDesigner.__vue__.simple;
    }

    // 尝试从属性中读取
    return paraDesigner.getAttribute('simple');
  });

  console.log('simple属性值:', simpleValue);
  expect(simpleValue).toBe('0');
  console.log('✓ simple="0" 验证通过');

  // 验证2：检查UEditor实例的工具栏配置
  console.log('\n====== 验证2：检查UEditor工具栏配置 ======');
  const toolbarInfo = await page.evaluate(() => {
    const iframe = document.querySelector('iframe.edui-default');
    if (!iframe) return { error: '找不到UEditor iframe' };

    // 尝试从window对象获取UEditor实例
    const editorKeys = Object.keys(window).filter(key => key.startsWith('UE_EDITOR_'));
    if (editorKeys.length === 0) return { error: '找不到UEditor实例' };

    const editorId = editorKeys[0];
    const editor = window[editorId];

    if (!editor || !editor.options) {
      return { error: 'UEditor实例无options' };
    }

    const toolbar = editor.options.toolbars[0];

    // 检查目标按钮
    const targetButtons = ['date', 'time', 'spechars', 'searchreplace', 'removeformat', 'selectall'];
    const found = targetButtons.filter(btn => toolbar.includes(btn));
    const missing = targetButtons.filter(btn => !toolbar.includes(btn));

    return {
      totalButtons: toolbar.length,
      toolbar: toolbar,
      targetButtons: {
        found: found,
        missing: missing
      }
    };
  });

  console.log('工具栏信息:', JSON.stringify(toolbarInfo, null, 2));

  if (toolbarInfo.error) {
    console.error('❌ 错误:', toolbarInfo.error);

    // 尝试诊断
    console.log('\n====== 诊断：查找UEditor相关元素 ======');
    const diagnosis = await page.evaluate(() => {
      return {
        iframes: document.querySelectorAll('iframe').length,
        iframeClasses: Array.from(document.querySelectorAll('iframe')).map(f => f.className),
        windowKeys: Object.keys(window).filter(k => k.includes('UE') || k.includes('UEDITOR')),
        toolbarDivs: Array.from(document.querySelectorAll('[class*="edui-toolbar"]')).length
      };
    });
    console.log('诊断信息:', JSON.stringify(diagnosis, null, 2));

    throw new Error(toolbarInfo.error);
  }

  // 断言：工具栏总按钮数应该 > 50（完整模式）
  console.log(`\n工具栏总按钮数: ${toolbarInfo.totalButtons}`);
  expect(toolbarInfo.totalButtons).toBeGreaterThan(50);
  console.log('✓ 工具栏按钮数量符合完整模式（>50）');

  // 断言：所有目标按钮都应存在
  console.log('\n✅ 已包含的按钮:', toolbarInfo.targetButtons.found.join(', '));
  console.log('❌ 缺失的按钮:', toolbarInfo.targetButtons.missing.join(', ') || '无');

  expect(toolbarInfo.targetButtons.missing.length).toBe(0);
  console.log('✓ 所有目标按钮都已包含');

  // 验证3：检查工具栏实际DOM元素
  console.log('\n====== 验证3：检查工具栏实际DOM ======');
  const toolbarButtons = await page.evaluate(() => {
    const toolbar = document.querySelector('[class*="edui-toolbar"]');
    if (!toolbar) return { error: '找不到工具栏DOM' };

    const buttons = Array.from(toolbar.querySelectorAll('[class*="edui-button"], [class*="edui-menubutton"]'));

    return {
      totalButtonsInDom: buttons.length,
      visibleButtons: buttons.filter(btn => btn.offsetWidth > 0 && btn.offsetHeight > 0).length,
      buttonTitles: buttons.map(btn => btn.getAttribute('title') || btn.textContent?.trim()).filter(Boolean).slice(0, 20)
    };
  });

  console.log('DOM中的按钮信息:', JSON.stringify(toolbarButtons, null, 2));

  if (!toolbarButtons.error) {
    expect(toolbarButtons.totalButtonsInDom).toBeGreaterThan(30);
    console.log('✓ DOM中的按钮数量符合预期');
  }

  // 最终截图
  await page.screenshot({ path: 'screenshot-para-toolbar-final.png', fullPage: true });
  console.log('\n✓ 已保存最终截图: screenshot-para-toolbar-final.png');

  console.log('\n====== ✅ 所有验证通过 ======');
  console.log('结论：simple="0"修改已生效，工具栏显示完整模式');
});
