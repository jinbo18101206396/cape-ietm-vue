const { chromium } = require('@playwright/test');

/**
 * 专门调试构型树加载问题
 */
async function debugConfigTree() {
  console.log('='.repeat(60));
  console.log('构型树加载调试');
  console.log('='.repeat(60));
  console.log();

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // 步骤1：登录
    console.log('步骤1：登录...');
    await page.goto('http://localhost:3000/user/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('✅ 登录成功');
    console.log();

    // 步骤2：查看首页状态
    console.log('步骤2：检查首页...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug-01-homepage.png', fullPage: true });
    console.log('✅ 首页截图保存：debug-01-homepage.png');

    // 查找所有包含"项目"文字的元素
    const projectElements = await page.locator('text=项目').all TextContents();
    console.log('找到的"项目"相关文字：', projectElements.slice(0, 10));
    console.log();

    // 步骤3：点击"打开项目"
    console.log('步骤3：点击"打开项目"按钮...');
    const openBtn = page.locator('button:has-text("打开项目"), a:has-text("打开项目")').first();

    if (await openBtn.count() > 0) {
      console.log('✅ 找到"打开项目"按钮');
      await openBtn.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'debug-02-after-open.png', fullPage: true });
      console.log('✅ 点击后截图：debug-02-after-open.png');

      // 检查是否有模态框
      const modal = page.locator('.ant-modal').first();
      if (await modal.count() > 0) {
        console.log('✅ 检测到模态框');

        // 获取模态框内容
        const modalText = await modal.textContent();
        console.log('模态框内容：', modalText.substring(0, 200));

        // 尝试关闭
        const closeBtn = page.locator('.ant-modal-footer button').first();
        if (await closeBtn.count() > 0) {
          console.log('点击模态框按钮...');
          await closeBtn.click();
          await page.waitForTimeout(2000);
          console.log('✅ 已关闭模态框');
        }
      } else {
        console.log('⚠️ 未检测到模态框');
      }
    } else {
      console.log('❌ 未找到"打开项目"按钮');
    }
    console.log();

    // 步骤4：进入项目实体管理
    console.log('步骤4：进入项目实体管理...');

    // 点击项目管理菜单
    const projectMenu = page.locator('.ant-menu-submenu-title:has-text("项目管理")');
    if (await projectMenu.count() > 0) {
      await projectMenu.click();
      await page.waitForTimeout(1000);
      console.log('✅ 展开项目管理菜单');
    }

    // 点击项目实体管理
    const icnMenu = page.locator('.ant-menu-item:has-text("项目实体管理")');
    if (await icnMenu.count() > 0) {
      await icnMenu.click();
      await page.waitForTimeout(3000);
      console.log('✅ 进入项目实体管理页面');
    }

    await page.screenshot({ path: 'debug-03-icn-page.png', fullPage: true });
    console.log('✅ ICN页面截图：debug-03-icn-page.png');
    console.log();

    // 步骤5：检查构型树
    console.log('步骤5：检查构型树...');

    const treeContainer = page.locator('.ant-tree, [class*="tree"]').first();
    if (await treeContainer.count() > 0) {
      console.log('✅ 找到构型树容器');

      // 检查树节点
      const treeNodes = page.locator('.ant-tree-treenode');
      const nodeCount = await treeNodes.count();
      console.log(`构型树节点数: ${nodeCount}`);

      if (nodeCount > 0) {
        console.log('✅ 构型树有节点！');

        // 获取前几个节点的文本
        for (let i = 0; i < Math.min(5, nodeCount); i++) {
          const nodeText = await treeNodes.nth(i).textContent();
          console.log(`  节点${i + 1}: ${nodeText?.trim()}`);
        }
      } else {
        console.log('❌ 构型树没有节点');

        // 获取树容器的HTML
        const treeHTML = await treeContainer.innerHTML();
        console.log('构型树HTML（前500字符）：');
        console.log(treeHTML.substring(0, 500));
      }
    } else {
      console.log('❌ 未找到构型树容器');
    }
    console.log();

    // 步骤6：等待观察
    console.log('步骤6：等待30秒观察...');
    console.log('请手动检查：');
    console.log('  1. 页面左侧是否有构型树');
    console.log('  2. 构型树是否有节点');
    console.log('  3. 是否需要其他操作才能加载构型树');
    console.log();

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('调试过程出错：', error.message);
    await page.screenshot({ path: 'debug-error.png' });
  }

  console.log();
  console.log('='.repeat(60));
  console.log('调试完成');
  console.log('请查看保存的截图：');
  console.log('  - debug-01-homepage.png');
  console.log('  - debug-02-after-open.png');
  console.log('  - debug-03-icn-page.png');
  console.log('='.repeat(60));

  await browser.close();
}

// 运行调试
debugConfigTree().catch(console.error);
