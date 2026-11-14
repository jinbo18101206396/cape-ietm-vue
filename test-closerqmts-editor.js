const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 捕获所有控制台消息
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[浏览器 ${type}]`, text);
  });

  // 捕获页面错误
  page.on('pageerror', error => {
    console.error('[页面错误]', error.message);
  });

  try {
    console.log('步骤1: 访问登录页面...');
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    console.log('步骤2: 输入用户名和密码...');
    // 等待输入框出现
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', '123456');

    console.log('步骤3: 点击登录按钮...');
    // 尝试多种选择器
    const loginButton = await page.locator('button').filter({ hasText: '登录' }).or(page.locator('.ant-btn-primary')).first();
    await loginButton.click();
    await page.waitForTimeout(3000);

    console.log('步骤4: 访问编辑页面...');
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN');
    await page.waitForTimeout(3000);

    console.log('步骤5: 点击 closeRqmts 铅笔图标...');
    // 等待页面加载完成
    await page.waitForSelector('text=closeRqmts', { timeout: 10000 });

    // 查找 closeRqmts 行的铅笔图标
    const editIcon = await page.locator('text=closeRqmts').locator('..').locator('svg[data-icon="edit"]').first();
    await editIcon.click();
    await page.waitForTimeout(2000);

    console.log('步骤6: 选中"必要条件列表"...');
    await page.click('text=必要条件列表');
    await page.waitForTimeout(1000);

    console.log('步骤7: 点击"增加"按钮...');
    await page.click('button:has-text("增加")');
    await page.waitForTimeout(1000);

    console.log('步骤8: 选择类型为"DM"...');
    // 点击下拉框
    const selectDropdown = await page.locator('.ant-select').first();
    await selectDropdown.click();
    await page.waitForTimeout(500);

    // 选择第二项（DM）
    await page.click('.ant-select-dropdown li:nth-child(2)');
    await page.waitForTimeout(1000);

    console.log('步骤9: 点击"编辑"按钮...');
    console.log('=== 点击前状态检查 ===');

    // 检查组件是否已注册
    const hasComponent = await page.evaluate(() => {
      const vm = document.querySelector('.closerqmts-designer').__vue__;
      console.log('Vue实例:', vm);
      console.log('组件选项:', vm.$options);
      console.log('注册的组件:', vm.$options.components);
      return vm.$options.components && Object.keys(vm.$options.components);
    });
    console.log('已注册的组件:', hasComponent);

    // 点击编辑按钮
    await page.click('button:has-text("编辑")');
    await page.waitForTimeout(2000);

    console.log('=== 点击后状态检查 ===');

    // 检查 paraEditorVisible 状态
    const paraEditorVisible = await page.evaluate(() => {
      const vm = document.querySelector('.closerqmts-designer').__vue__;
      return vm.paraEditorVisible;
    });
    console.log('paraEditorVisible:', paraEditorVisible);

    // 检查是否有对话框出现
    const modalVisible = await page.locator('.ant-modal').count();
    console.log('模态对话框数量:', modalVisible);

    // 检查是否有错误信息
    const errorElements = await page.locator('.ant-message-error').count();
    console.log('错误消息数量:', errorElements);

    console.log('等待5秒以便观察...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('测试过程出错:', error);
  } finally {
    console.log('测试完成，关闭浏览器...');
    await browser.close();
  }
})();
