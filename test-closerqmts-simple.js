const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 捕获所有控制台消息
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    console.log(`[浏览器 ${type}]`, text);
  });

  // 捕获页面错误
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.error('[页面错误]', error.message);
  });

  try {
    console.log('\n=== 开始测试 ===\n');

    // 先登录
    console.log('步骤1: 登录...');
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // 等待登录表单
    await page.waitForSelector('input', { timeout: 10000 });

    // 获取所有输入框
    const inputs = await page.locator('input').all();
    console.log(`找到 ${inputs.length} 个输入框`);

    if (inputs.length >= 2) {
      await inputs[0].fill('admin');
      await inputs[1].fill('123456');
    }

    // 查找并点击登录按钮
    const buttons = await page.locator('button').all();
    console.log(`找到 ${buttons.length} 个按钮`);

    for (const btn of buttons) {
      const text = await btn.textContent();
      console.log(`按钮文本: "${text}"`);
      if (text && (text.includes('登录') || text.includes('login'))) {
        console.log('点击登录按钮...');
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(3000);
    console.log('登录完成\n');

    console.log('步骤2: 访问编辑页面...');
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('页面加载完成\n');

    console.log('步骤3: 点击 closeRqmts 编辑图标...');
    // 查找包含 closeRqmts 的元素
    const closeRqmtsElements = await page.locator('text=closeRqmts').all();
    console.log(`找到 ${closeRqmtsElements.length} 个 closeRqmts 元素`);

    // 查找编辑图标（铅笔图标）
    const editIcons = await page.locator('svg[data-icon="edit"]').all();
    console.log(`找到 ${editIcons.length} 个编辑图标`);

    if (editIcons.length > 0) {
      await editIcons[0].click();
      await page.waitForTimeout(2000);
      console.log('编辑图标点击完成\n');
    }

    console.log('步骤4: 选择"必要条件列表"...');
    await page.locator('text=必要条件列表').click();
    await page.waitForTimeout(1000);

    console.log('步骤5: 点击"增加"按钮...');
    const addButtons = await page.locator('button').all();
    for (const btn of addButtons) {
      const text = await btn.textContent();
      if (text && text.includes('增加')) {
        await btn.click();
        console.log('增加按钮点击完成');
        break;
      }
    }
    await page.waitForTimeout(1000);

    console.log('步骤6: 选择类型为"DM"...');
    // 点击类型下拉框
    const selects = await page.locator('.ant-select').all();
    console.log(`找到 ${selects.length} 个下拉框`);
    if (selects.length > 0) {
      await selects[0].click();
      await page.waitForTimeout(500);

      // 选择第二项（DM）
      const options = await page.locator('.ant-select-dropdown-menu-item').all();
      console.log(`找到 ${options.length} 个选项`);
      if (options.length >= 2) {
        const optionText = await options[1].textContent();
        console.log(`选择选项: ${optionText}`);
        await options[1].click();
      }
    }
    await page.waitForTimeout(1000);

    console.log('\n=== 关键步骤：点击"编辑"按钮 ===\n');

    // 检查点击前的状态
    console.log('【点击前检查】');
    const componentInfo = await page.evaluate(() => {
      const designer = document.querySelector('.closerqmts-designer');
      if (!designer || !designer.__vue__) {
        return { error: '找不到 Vue 实例' };
      }
      const vm = designer.__vue__;
      return {
        paraEditorVisible: vm.paraEditorVisible,
        components: Object.keys(vm.$options.components || {}),
        conditions: vm.conditions ? vm.conditions.length : 0
      };
    });
    console.log('组件状态:', JSON.stringify(componentInfo, null, 2));

    // 点击条件列的"编辑"按钮
    const editButtons = await page.locator('button').all();
    let editButtonClicked = false;
    for (const btn of editButtons) {
      const html = await btn.innerHTML();
      const text = await btn.textContent();
      if (text && text.includes('编辑') && html.includes('icon')) {
        console.log('找到条件编辑按钮，准备点击...');
        await btn.click();
        editButtonClicked = true;
        console.log('编辑按钮已点击！');
        break;
      }
    }

    if (!editButtonClicked) {
      console.log('警告：未找到条件编辑按钮');
    }

    await page.waitForTimeout(2000);

    // 检查点击后的状态
    console.log('\n【点击后检查】');
    const afterClickInfo = await page.evaluate(() => {
      const designer = document.querySelector('.closerqmts-designer');
      if (!designer || !designer.__vue__) {
        return { error: '找不到 Vue 实例' };
      }
      const vm = designer.__vue__;

      // 检查是否有模态框
      const modals = document.querySelectorAll('.ant-modal');
      const visibleModals = Array.from(modals).filter(m =>
        window.getComputedStyle(m).display !== 'none'
      );

      return {
        paraEditorVisible: vm.paraEditorVisible,
        editingIndex: vm.editingIndex,
        editingCondContent: vm.editingCondContent,
        modalCount: modals.length,
        visibleModalCount: visibleModals.length,
        modalTitles: Array.from(modals).map(m =>
          m.querySelector('.ant-modal-title')?.textContent || '无标题'
        )
      };
    });
    console.log('点击后状态:', JSON.stringify(afterClickInfo, null, 2));

    // 检查控制台错误
    console.log('\n【控制台消息汇总】');
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    console.log(`错误消息数量: ${errors.length}`);
    console.log(`警告消息数量: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n错误消息详情:');
      errors.forEach((e, i) => console.log(`${i + 1}. ${e.text}`));
    }

    if (pageErrors.length > 0) {
      console.log('\n页面错误详情:');
      pageErrors.forEach((e, i) => console.log(`${i + 1}. ${e}`));
    }

    console.log('\n等待5秒以便观察页面状态...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n测试过程出错:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    console.log('\n测试完成，关闭浏览器...');
    await browser.close();
  }
})();
