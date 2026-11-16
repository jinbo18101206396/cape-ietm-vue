const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // 放慢操作以便观察
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('📝 测试步骤开始...\n');

  try {
    // 步骤1: 访问登录页面
    console.log('1. 访问登录页面: http://localhost:3000/');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // 步骤2: 输入用户名和密码
    console.log('2. 输入用户名: admin');
    const usernameInput = await page.locator('input[type="text"], input[placeholder*="用户"], input[id*="user"]').first();
    await usernameInput.fill('admin');

    console.log('3. 输入密码: 123456');
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill('123456');

    // 步骤3: 点击登录按钮
    console.log('4. 点击登录按钮');
    // 尝试多种可能的登录按钮选择器
    const loginButton = await page.locator('button:has-text("登录"), button:has-text("登 录"), button[type="submit"], .ant-btn-primary').first();
    await loginButton.click();
    await page.waitForTimeout(3000);

    // 步骤4: 访问编辑页面
    console.log('5. 访问编辑页面');
    const editUrl = 'http://localhost:3000/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN';
    await page.goto(editUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 步骤5: 查找并点击 mainProcedure 的编辑按钮（铅笔图标）
    console.log('6. 查找并点击 <mainProcedure> 左侧的铅笔图标');
    await page.waitForTimeout(2000);

    // 查找包含 mainProcedure 的行，然后找到该行的编辑图标
    const mainProcedureRow = await page.locator('text=mainProcedure').first();
    await mainProcedureRow.waitFor({ timeout: 10000 });

    // 点击 mainProcedure 旁边的铅笔图标
    const pencilIcon = await page.locator('.anticon-edit, [class*="edit"]').first();
    if (await pencilIcon.count() > 0) {
      await pencilIcon.click();
      console.log('   ✅ 已点击编辑按钮');
      await page.waitForTimeout(3000);
    } else {
      console.log('   ⚠️ 未找到编辑按钮，继续...');
    }

    // 步骤6: 选中"步骤1"或第一个步骤
    console.log('7. 在左侧导航树中查找并选中"步骤1"');

    // 等待树形结构加载
    await page.waitForTimeout(2000);

    // 尝试多种方式查找步骤1
    const step1Selectors = [
      'text=步骤1',
      '.tree-node-title:has-text("步骤1")',
      '.ant-tree-title:has-text("步骤1")',
      'span:has-text("步骤1")',
      '[class*="step"]:has-text("1")'
    ];

    let clicked = false;
    for (const selector of step1Selectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        await element.click();
        console.log(`   ✅ 已点击步骤1 (使用选择器: ${selector})`);
        clicked = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (!clicked) {
      console.log('   ⚠️ 未找到步骤1，尝试点击任意步骤节点...');
      const anyStep = page.locator('.ant-tree-node-content-wrapper, .tree-node-title').first();
      await anyStep.click();
    }

    // 步骤7: 切换到"表格"标签
    console.log('8. 切换到"表格"标签');
    await page.waitForTimeout(2000);

    // 保存当前页面截图用于调试
    await page.screenshot({ path: 'debug-before-table-tab.png', fullPage: true });
    console.log('   📸 调试截图已保存: debug-before-table-tab.png');

    // 尝试多种表格标签选择器
    const tableTabSelectors = [
      '.ant-tabs-tab:has-text("表格")',
      'div[role="tab"]:has-text("表格")',
      '.ant-tabs-tab >> text=表格',
      'text=表格()',
      '[class*="tab"]:has-text("表格")'
    ];

    let tabClicked = false;
    for (const selector of tableTabSelectors) {
      const tab = page.locator(selector).first();
      if (await tab.count() > 0) {
        await tab.click();
        console.log(`   ✅ 已切换到表格标签 (使用选择器: ${selector})`);
        tabClicked = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (!tabClicked) {
      console.log('   ⚠️ 未找到表格标签，可能页面结构不同');
      await page.screenshot({ path: 'debug-no-table-tab.png', fullPage: true });
      console.log('   📸 截图已保存: debug-no-table-tab.png');
      throw new Error('无法找到表格标签');
    }

    // 步骤8: 点击"增加"按钮
    console.log('9. 点击"增加"按钮');
    await page.click('button:has-text("增加")');
    await page.waitForTimeout(2000);

    // 步骤9: 验证"添加表格"对话框已打开
    console.log('10. 验证"添加表格"对话框已打开');
    await page.waitForSelector('.ant-modal:has-text("添加表格"), .ant-modal:has-text("表格")', { timeout: 5000 });
    console.log('    ✅ 对话框已打开\n');

    // 步骤10: 检查工具栏中的按钮
    console.log('11. 检查UEditor工具栏中的按钮...\n');

    // 等待UEditor iframe加载
    await page.waitForTimeout(2000);

    // 获取所有iframe
    const frames = page.frames();
    console.log(`    找到 ${frames.length} 个 iframe`);

    // 查找UEditor的iframe
    let ueditorFrame = null;
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('ueditor') || await frame.$('.edui-toolbar') !== null) {
        ueditorFrame = frame;
        break;
      }
    }

    // 在主页面查找工具栏
    const toolbarButtons = await page.$$eval('.edui-toolbar .edui-button', buttons => {
      return buttons.map(btn => ({
        title: btn.getAttribute('title') || btn.textContent,
        class: btn.className
      }));
    }).catch(() => []);

    console.log(`\n    工具栏按钮数量: ${toolbarButtons.length}`);
    console.log('    工具栏按钮列表:');
    toolbarButtons.forEach((btn, index) => {
      console.log(`      ${index + 1}. ${btn.title}`);
    });

    // 检查是否存在那4个按钮
    console.log('\n📋 检查需要隐藏的按钮:');

    const checkButtons = [
      { name: '内部引用', keywords: ['内部引用', 'interref'] },
      { name: 'DM引用', keywords: ['DM引用', 'dmref'] },
      { name: '图符', keywords: ['图符', 'symbol'] },
      { name: '公式', keywords: ['公式', 'formula', 'kity'] }
    ];

    let allHidden = true;
    for (const check of checkButtons) {
      const found = toolbarButtons.some(btn =>
        check.keywords.some(keyword =>
          btn.title.toLowerCase().includes(keyword.toLowerCase()) ||
          btn.class.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      if (found) {
        console.log(`    ❌ "${check.name}" 按钮仍然存在`);
        allHidden = false;
      } else {
        console.log(`    ✅ "${check.name}" 按钮已隐藏`);
      }
    }

    console.log('\n' + '='.repeat(60));
    if (allHidden) {
      console.log('✅ 测试通过：所有4个按钮均已成功隐藏！');
    } else {
      console.log('❌ 测试失败：部分按钮仍然可见');
    }
    console.log('='.repeat(60) + '\n');

    // 截图保存
    await page.screenshot({ path: 'table-toolbar-test.png', fullPage: true });
    console.log('📸 截图已保存至: table-toolbar-test.png\n');

    // 保持浏览器打开5秒以便观察
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:');
    console.error(error.message);

    // 出错时也截图
    await page.screenshot({ path: 'table-toolbar-error.png', fullPage: true });
    console.log('📸 错误截图已保存至: table-toolbar-error.png\n');
  } finally {
    await browser.close();
    console.log('🏁 测试完成\n');
  }
})();
