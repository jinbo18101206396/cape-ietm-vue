const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('📝 简化测试开始...\n');

  try {
    // 步骤1: 登录
    console.log('1. 登录系统...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('input[type="text"]').first().fill('admin');
    await page.locator('input[type="password"]').first().fill('123456');
    await page.locator('button:has-text("登录"), button[type="submit"], .ant-btn-primary').first().click();
    await page.waitForTimeout(3000);
    console.log('   ✅ 登录成功\n');

    // 步骤2: 访问编辑页面
    console.log('2. 访问编辑页面...');
    const editUrl = 'http://localhost:3000/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN';
    await page.goto(editUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('   ✅ 页面加载完成\n');

    // 步骤3: 分析页面结构
    console.log('3. 分析页面结构...');
    const pageInfo = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[class*="tab"]')).map(el => el.textContent.trim()).filter(t => t);
      const buttons = Array.from(document.querySelectorAll('button')).map(el => el.textContent.trim()).filter(t => t);
      const hasMainProcedure = document.body.textContent.includes('mainProcedure');
      return { tabs, buttons: buttons.slice(0, 20), hasMainProcedure };
    });

    console.log('   页面包含的标签页:', pageInfo.tabs.slice(0, 10));
    console.log('   页面包含的按钮:', pageInfo.buttons);
    console.log('   是否包含mainProcedure:', pageInfo.hasMainProcedure);
    console.log('');

    // 步骤4: 点击设计视图（如果存在）
    console.log('4. 尝试进入设计视图...');
    const designViewButton = page.locator('text=设计视图, button:has-text("设计")').first();
    if (await designViewButton.count() > 0) {
      await designViewButton.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ 已切换到设计视图\n');
    } else {
      console.log('   ⚠️ 未找到设计视图按钮，继续...\n');
    }

    // 步骤5: 直接在页面中执行脚本来打开表格对话框
    console.log('5. 尝试通过页面脚本直接打开"添加表格"对话框...');

    await page.waitForTimeout(2000);

    // 查找并点击所有可能触发表格编辑的按钮
    const foundDialog = await page.evaluate(async () => {
      // 查找包含"表格"或"增加"的按钮
      const buttons = Array.from(document.querySelectorAll('button'));
      const tableButtons = buttons.filter(btn =>
        btn.textContent.includes('表格') ||
        btn.textContent.includes('增加') ||
        btn.textContent.includes('添加')
      );

      // 尝试点击看起来像"增加表格"的按钮
      for (const btn of tableButtons) {
        if (btn.textContent.includes('增加')) {
          btn.click();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 检查是否打开了对话框
          const modal = document.querySelector('.ant-modal:not(.ant-modal-hidden)');
          if (modal && modal.textContent.includes('表格')) {
            return true;
          }
        }
      }
      return false;
    });

    if (foundDialog) {
      console.log('   ✅ 成功打开表格对话框\n');
    } else {
      console.log('   ⚠️ 未能通过脚本打开对话框，尝试手动查找...\n');

      // 截图当前页面
      await page.screenshot({ path: 'debug-page-structure.png', fullPage: true });
      console.log('   📸 页面结构截图: debug-page-structure.png\n');
    }

    // 步骤6: 等待并检查工具栏
    console.log('6. 等待表格编辑器加载...');
    await page.waitForTimeout(3000);

    // 检查是否有UEditor工具栏
    const toolbarInfo = await page.evaluate(() => {
      const toolbars = document.querySelectorAll('.edui-toolbar');
      if (toolbars.length === 0) return { found: false };

      const toolbar = toolbars[toolbars.length - 1]; // 获取最后一个（最新的）
      const buttons = Array.from(toolbar.querySelectorAll('.edui-button'));

      return {
        found: true,
        count: buttons.length,
        buttons: buttons.map(btn => ({
          title: btn.getAttribute('title') || btn.textContent.trim(),
          class: btn.className
        }))
      };
    });

    if (toolbarInfo.found) {
      console.log(`   ✅ 找到UEditor工具栏，共 ${toolbarInfo.count} 个按钮\n`);

      // 检查需要隐藏的按钮
      console.log('7. 检查需要隐藏的按钮:\n');

      const checkButtons = [
        { name: '内部引用', keywords: ['内部引用', 'interref'] },
        { name: 'DM引用', keywords: ['DM引用', 'dmref'] },
        { name: '图符', keywords: ['图符', 'symbol'] },
        { name: '公式', keywords: ['公式', 'formula', 'kity'] }
      ];

      let allHidden = true;
      for (const check of checkButtons) {
        const found = toolbarInfo.buttons.some(btn =>
          check.keywords.some(keyword =>
            (btn.title && btn.title.toLowerCase().includes(keyword.toLowerCase())) ||
            (btn.class && btn.class.toLowerCase().includes(keyword.toLowerCase()))
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
        console.log('\n工具栏按钮列表:');
        toolbarInfo.buttons.forEach((btn, i) => {
          console.log(`  ${i + 1}. ${btn.title}`);
        });
      }
      console.log('='.repeat(60) + '\n');

    } else {
      console.log('   ❌ 未找到UEditor工具栏\n');
    }

    // 截图
    await page.screenshot({ path: 'table-toolbar-final.png', fullPage: true });
    console.log('📸 最终截图已保存: table-toolbar-final.png\n');

    // 保持浏览器打开
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:');
    console.error(error.message);
    await page.screenshot({ path: 'table-toolbar-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('🏁 测试完成\n');
  }
})();
