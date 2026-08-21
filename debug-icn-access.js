const { chromium } = require('@playwright/test');

/**
 * 调试脚本 - 检查项目实体管理页面的访问状态
 */
async function debugICNPage() {
  console.log('='.repeat(60));
  console.log('项目实体管理页面访问调试');
  console.log('='.repeat(60));
  console.log();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // 步骤1：登录
    console.log('步骤1：正在登录...');
    await page.goto('http://localhost:3000/user/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('✅ 登录成功');
    console.log();

    // 步骤1.5：打开项目（关键步骤）
    console.log('步骤1.5：正在打开项目...');
    await page.waitForTimeout(2000);

    // 查找"打开项目"按钮
    const openProjectBtn = page.locator('button:has-text("打开项目"), a:has-text("打开项目")').first();
    if (await openProjectBtn.count() > 0) {
      await openProjectBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ 已点击"打开项目"按钮');

      // 处理可能出现的模态框
      const modal = page.locator('.ant-modal');
      if (await modal.count() > 0) {
        console.log('检测到模态框，尝试关闭...');

        // 尝试点击"确定"或关闭按钮
        const closeButtons = [
          '.ant-modal-footer button:has-text("确定")',
          '.ant-modal-footer button:has-text("确认")',
          '.ant-modal-footer button.ant-btn-primary',
          '.ant-modal-close'
        ];

        for (const selector of closeButtons) {
          const btn = page.locator(selector);
          if (await btn.count() > 0) {
            await btn.click();
            await page.waitForTimeout(1000);
            console.log(`✅ 已关闭模态框（${selector}）`);
            break;
          }
        }
      }
    } else {
      console.log('⚠️ 首页未找到"打开项目"按钮，项目可能已打开');
    }
    console.log();

    // 步骤2：检查菜单
    console.log('步骤2：检查左侧菜单...');
    await page.waitForTimeout(2000);

    // 查找所有一级菜单
    const mainMenus = await page.locator('.ant-menu-submenu-title, .ant-menu-item').allTextContents();
    console.log('找到的主菜单：', mainMenus);
    console.log();

    // 查找"项目管理"菜单
    const projectMenu = page.locator('.ant-menu-submenu-title:has-text("项目管理")');
    if (await projectMenu.count() > 0) {
      console.log('✅ 找到"项目管理"菜单');

      // 展开项目管理菜单
      await projectMenu.click();
      await page.waitForTimeout(1000);

      // 查找子菜单
      const subMenus = await page.locator('.ant-menu-sub .ant-menu-item').allTextContents();
      console.log('项目管理子菜单：', subMenus);

      // 检查是否有"项目实体管理"
      const icnMenu = page.locator('.ant-menu-item:has-text("项目实体管理")');
      if (await icnMenu.count() > 0) {
        console.log('✅ 找到"项目实体管理"菜单');
        console.log();

        // 步骤3：点击菜单
        console.log('步骤3：点击"项目实体管理"菜单...');
        await icnMenu.click();
        await page.waitForTimeout(3000);

        // 检查URL
        const currentURL = page.url();
        console.log('当前URL：', currentURL);

        // 检查页面内容
        const pageTitle = await page.title();
        console.log('页面标题：', pageTitle);

        // 检查是否是404页面
        const is404 = await page.locator('text=404').count() > 0;
        if (is404) {
          console.log('❌ 页面显示404错误');
          const errorText = await page.locator('text=抱歉').textContent();
          console.log('错误信息：', errorText);
        } else {
          console.log('✅ 页面加载成功（非404）');

          // 检查页面元素
          const hasContainer = await page.locator('.icn-manage-container').count() > 0;
          const hasTable = await page.locator('.ant-table').count() > 0;
          const hasTree = await page.locator('.ant-tree').count() > 0;

          console.log('页面元素检查：');
          console.log('  - ICN容器 (.icn-manage-container):', hasContainer ? '✅' : '❌');
          console.log('  - 列表表格 (.ant-table):', hasTable ? '✅' : '❌');
          console.log('  - 构型树 (.ant-tree):', hasTree ? '✅' : '❌');

          // 检查工具栏按钮
          const buttons = await page.locator('button').allTextContents();
          console.log('工具栏按钮：', buttons.filter(b => b.trim()));

          // 保存成功截图
          await page.screenshot({ path: 'icn-page-success.png', fullPage: true });
          console.log('✅ 页面截图已保存：icn-page-success.png');
        }
      } else {
        console.log('❌ 未找到"项目实体管理"菜单');
        console.log('⚠️  需要执行菜单SQL配置');
      }
    } else {
      console.log('❌ 未找到"项目管理"菜单');
    }

    console.log();

    // 步骤4：尝试直接访问
    console.log('步骤4：尝试直接访问页面URL...');
    const testURLs = [
      '/icnmanage/ietmIcnManageList',
      '/ietm/icnmanage/IetmIcnManageList',
      '/icnmanage/IetmIcnManageList'
    ];

    for (const url of testURLs) {
      console.log(`测试URL: ${url}`);
      await page.goto(`http://localhost:3000${url}`);
      await page.waitForTimeout(2000);

      const is404 = await page.locator('text=404').count() > 0;
      if (is404) {
        console.log(`  ❌ 404错误`);
      } else {
        const hasContainer = await page.locator('.icn-manage-container, .ant-table').count() > 0;
        if (hasContainer) {
          console.log(`  ✅ 页面加载成功！正确的URL是：${url}`);
          await page.screenshot({ path: 'icn-page-found.png', fullPage: true });
          break;
        } else {
          console.log(`  ⚠️  页面加载但内容不对`);
        }
      }
    }

  } catch (error) {
    console.error('调试过程出错：', error.message);
    await page.screenshot({ path: 'debug-error.png' });
  }

  console.log();
  console.log('='.repeat(60));
  console.log('调试完成，浏览器将在10秒后关闭...');
  console.log('='.repeat(60));

  await page.waitForTimeout(10000);
  await browser.close();
}

// 运行调试
debugICNPage().catch(console.error);
