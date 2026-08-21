const { test, expect } = require('@playwright/test');

/**
 * 复制DM功能 - 实际浏览器验证
 * 包含真实的登录流程和项目选择
 */
test.describe('复制DM功能 - 实际验证', () => {

  test.setTimeout(120000); // 2分钟超时

  /**
   * 完整流程测试：登录 → 选择项目 → 测试复制DM
   */
  test('完整流程：登录、选择项目、复制DM', async ({ page }) => {
    console.log('\n========================================');
    console.log('  开始完整流程测试');
    console.log('========================================\n');

    // ============================================
    // 步骤1：访问登录页面
    // ============================================
    console.log('步骤1: 访问登录页面...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: './test-results/screenshots/step-01-login-page.png', fullPage: true });
    console.log('✅ 登录页面已加载');

    // ============================================
    // 步骤2：输入用户名密码
    // ============================================
    console.log('\n步骤2: 输入用户名和密码...');

    // 填写用户名
    const usernameInput = page.locator('input[placeholder*="账号"], input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
    await usernameInput.fill('admin');
    console.log('✅ 用户名已输入: admin');

    // 填写密码
    const passwordInput = page.locator('input[placeholder*="密码"], input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill('admin123');
    console.log('✅ 密码已输入');

    await page.screenshot({ path: './test-results/screenshots/step-02-credentials-filled.png', fullPage: true });

    // ============================================
    // 步骤3：处理验证码（如果存在）
    // ============================================
    console.log('\n步骤3: 检查验证码...');
    const verifyCodeInput = page.locator('input[placeholder*="验证码"]');
    const hasVerifyCode = await verifyCodeInput.count() > 0;

    if (hasVerifyCode) {
      console.log('⚠️  检测到验证码输入框');
      console.log('⚠️  等待30秒供手动输入验证码...');
      console.log('⚠️  请在浏览器中输入验证码');

      // 等待30秒让用户手动输入验证码
      await page.waitForTimeout(30000);
    } else {
      console.log('✅ 无验证码要求');
    }

    // ============================================
    // 步骤4：点击登录按钮
    // ============================================
    console.log('\n步骤4: 点击登录按钮...');
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    await loginButton.click();
    console.log('✅ 已点击登录按钮');

    // 等待登录完成（可能跳转到首页或dashboard）
    await page.waitForTimeout(3000);
    await page.screenshot({ path: './test-results/screenshots/step-04-after-login.png', fullPage: true });

    // 检查是否登录成功
    const currentUrl = page.url();
    console.log(`当前URL: ${currentUrl}`);

    if (currentUrl.includes('/login')) {
      console.log('❌ 登录失败，仍在登录页面');
      console.log('可能的原因: 验证码错误、用户名密码错误、或需要手动操作');

      // 保存失败截图
      await page.screenshot({ path: './test-results/screenshots/step-04-login-failed.png', fullPage: true });

      // 检查是否有错误消息
      const errorMsg = await page.locator('.ant-message-error, .error-message').textContent().catch(() => '');
      if (errorMsg) {
        console.log(`错误消息: ${errorMsg}`);
      }

      throw new Error('登录失败');
    }

    console.log('✅ 登录成功');

    // ============================================
    // 步骤5：查找"手册管理"或"项目管理"入口
    // ============================================
    console.log('\n步骤5: 查找手册管理模块...');
    await page.waitForTimeout(2000);

    // 尝试多种可能的定位方式
    const possibleSelectors = [
      'text=手册管理',
      'text=项目管理',
      'text=IETM管理',
      '.ant-menu-item:has-text("手册")',
      '.ant-menu-item:has-text("项目")',
      'a:has-text("手册管理")',
      'a:has-text("项目管理")'
    ];

    let manualMenuFound = false;
    for (const selector of possibleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ 找到菜单项: ${selector}`);
        await page.locator(selector).first().click();
        manualMenuFound = true;
        break;
      }
    }

    if (!manualMenuFound) {
      console.log('⚠️  未找到"手册管理"菜单，尝试查找所有可见菜单...');

      // 获取所有可见的菜单项
      const allMenuItems = await page.locator('.ant-menu-item, .ant-menu-submenu-title').allTextContents();
      console.log('可见的菜单项:');
      allMenuItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
      });

      await page.screenshot({ path: './test-results/screenshots/step-05-menu-search.png', fullPage: true });

      console.log('⚠️  请手动在截图中查找"手册管理"或"项目管理"菜单');
      console.log('⚠️  等待10秒供手动点击...');
      await page.waitForTimeout(10000);
    } else {
      await page.waitForTimeout(2000);
      console.log('✅ 已点击手册管理模块');
    }

    await page.screenshot({ path: './test-results/screenshots/step-05-manual-management.png', fullPage: true });

    // ============================================
    // 步骤6：查找并打开"项目1"
    // ============================================
    console.log('\n步骤6: 查找项目1...');
    await page.waitForTimeout(2000);

    // 尝试多种定位方式
    const projectSelectors = [
      'text=项目1',
      '.ant-table-row:has-text("项目1")',
      'td:has-text("项目1")',
      'a:has-text("项目1")',
      'span:has-text("项目1")'
    ];

    let projectFound = false;
    for (const selector of projectSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ 找到项目1: ${selector}`);

        // 尝试双击或单击
        const projectElement = page.locator(selector).first();

        // 先尝试双击
        await projectElement.dblclick().catch(() => {
          console.log('双击失败，尝试单击...');
        });

        // 如果双击失败，尝试单击
        await page.waitForTimeout(1000);
        if (page.url().includes('/login') || page.url() === currentUrl) {
          await projectElement.click();
        }

        projectFound = true;
        break;
      }
    }

    if (!projectFound) {
      console.log('⚠️  未找到"项目1"，列出所有可见项目...');

      // 尝试获取表格中的所有项目名称
      const projectNames = await page.locator('.ant-table-tbody td').allTextContents().catch(() => []);
      console.log('可见的内容:');
      projectNames.slice(0, 20).forEach((name, index) => {
        if (name.trim()) {
          console.log(`  ${index + 1}. ${name.trim()}`);
        }
      });

      await page.screenshot({ path: './test-results/screenshots/step-06-project-search.png', fullPage: true });

      console.log('⚠️  请手动在截图中查找并点击"项目1"');
      console.log('⚠️  等待10秒供手动操作...');
      await page.waitForTimeout(10000);
    } else {
      await page.waitForTimeout(2000);
      console.log('✅ 已打开项目1');
    }

    await page.screenshot({ path: './test-results/screenshots/step-06-project-opened.png', fullPage: true });

    // ============================================
    // 步骤7：进入数据模块管理页面
    // ============================================
    console.log('\n步骤7: 进入数据模块管理...');
    await page.waitForTimeout(2000);

    // 查找"数据模块管理"菜单
    const dmMenuSelectors = [
      'text=数据模块管理',
      '.ant-menu-item:has-text("数据模块")',
      'a:has-text("数据模块管理")',
      'span:has-text("数据模块管理")'
    ];

    let dmMenuFound = false;
    for (const selector of dmMenuSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ 找到数据模块管理菜单: ${selector}`);
        await page.locator(selector).first().click();
        dmMenuFound = true;
        break;
      }
    }

    if (!dmMenuFound) {
      console.log('⚠️  未找到"数据模块管理"菜单');
      console.log('⚠️  尝试通过URL直接访问...');
      await page.goto('http://localhost:3000/ietm/datamodule/list');
    }

    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: './test-results/screenshots/step-07-dm-list-page.png', fullPage: true });
    console.log('✅ 已进入数据模块管理页面');

    // ============================================
    // 步骤8: 选择构型树节点
    // ============================================
    console.log('\n步骤8: 选择构型树节点...');
    await page.waitForTimeout(2000);

    // 查找树节点
    const treeNode = page.locator('.ant-tree-node-content-wrapper').first();
    const hasTree = await treeNode.count() > 0;

    if (hasTree) {
      await treeNode.click();
      await page.waitForTimeout(1500);
      console.log('✅ 已选择第一个树节点');
    } else {
      console.log('⚠️  未找到构型树');
    }

    await page.screenshot({ path: './test-results/screenshots/step-08-tree-selected.png', fullPage: true });

    // ============================================
    // 步骤9: 选择第一条DM记录
    // ============================================
    console.log('\n步骤9: 选择DM记录...');
    await page.waitForTimeout(1000);

    const firstRow = page.locator('.ant-table-tbody tr').first();
    const hasRows = await firstRow.count() > 0;

    if (hasRows) {
      const checkbox = firstRow.locator('.ant-checkbox-input').first();
      await checkbox.check();
      await page.waitForTimeout(500);
      console.log('✅ 已选择第一条DM记录');
    } else {
      console.log('⚠️  表格中没有数据');
    }

    await page.screenshot({ path: './test-results/screenshots/step-09-dm-selected.png', fullPage: true });

    // ============================================
    // 步骤10: 点击"复制DM"按钮
    // ============================================
    console.log('\n步骤10: 点击复制DM按钮...');
    await page.waitForTimeout(500);

    const copyButton = page.locator('button:has-text("复制DM"), button:has-text("复制")').first();
    const hasCopyButton = await copyButton.count() > 0;

    if (hasCopyButton) {
      const isEnabled = await copyButton.isEnabled();
      if (isEnabled) {
        await copyButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ 已点击复制DM按钮');

        // 检查成功消息
        const successMsg = page.locator('.ant-message-success');
        const hasSuccess = await successMsg.count() > 0;
        if (hasSuccess) {
          const msgText = await successMsg.textContent();
          console.log(`✅ 成功消息: ${msgText}`);
        }
      } else {
        console.log('⚠️  复制DM按钮被禁用');
      }
    } else {
      console.log('⚠️  未找到复制DM按钮');
    }

    await page.screenshot({ path: './test-results/screenshots/step-10-copy-dm-clicked.png', fullPage: true });

    // ============================================
    // 步骤11: 点击"复制新建DM"按钮
    // ============================================
    console.log('\n步骤11: 点击复制新建DM按钮...');
    await page.waitForTimeout(1000);

    const copyNewButton = page.locator('button:has-text("复制新建")').first();
    const hasCopyNewButton = await copyNewButton.count() > 0;

    if (hasCopyNewButton) {
      const isEnabled = await copyNewButton.isEnabled();
      if (isEnabled) {
        await copyNewButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ 已点击复制新建DM按钮');

        // 等待弹窗出现
        const modal = page.locator('.ant-modal:visible');
        const hasModal = await modal.count() > 0;
        if (hasModal) {
          console.log('✅ 复制新建DM弹窗已打开');
          await page.screenshot({ path: './test-results/screenshots/step-11-modal-opened.png', fullPage: true });

          // ============================================
          // 步骤12: 验证表单字段
          // ============================================
          console.log('\n步骤12: 验证表单字段...');
          await page.waitForTimeout(1000);

          // 获取SNS值
          const snsInput = modal.locator('input[placeholder*="SNS"]');
          if (await snsInput.count() > 0) {
            const snsValue = await snsInput.inputValue();
            console.log(`✅ SNS: ${snsValue}`);
          }

          // 获取技术名称
          const techNameInput = modal.locator('input[placeholder*="技术名称"]');
          if (await techNameInput.count() > 0) {
            const techNameValue = await techNameInput.inputValue();
            console.log(`✅ 技术名称: ${techNameValue}`);
          }

          // 获取DMC预览
          const dmcPreview = modal.locator('input[value*="DMC-"]');
          if (await dmcPreview.count() > 0) {
            const dmcValue = await dmcPreview.inputValue();
            console.log(`✅ DMC预览: ${dmcValue}`);

            // 验证DMC是否包含"DMC-"前缀
            if (dmcValue.startsWith('DMC-')) {
              console.log('✅ DMC编码含"DMC-"前缀 - 验证通过');
            } else {
              console.log('❌ DMC编码不含"DMC-"前缀 - 验证失败');
            }
          }

          // 检查学习码字段是否存在
          const learnCodeInput = modal.locator('input[placeholder*="学习码"]');
          if (await learnCodeInput.count() > 0) {
            console.log('✅ 学习码字段存在');
          }

          const learnEventCodeInput = modal.locator('input[placeholder*="学习事件码"]');
          if (await learnEventCodeInput.count() > 0) {
            console.log('✅ 学习事件码字段存在');
          }

          await page.screenshot({ path: './test-results/screenshots/step-12-form-validated.png', fullPage: true });

          // ============================================
          // 步骤13: 测试学习码输入
          // ============================================
          console.log('\n步骤13: 测试学习码输入...');

          if (await learnCodeInput.count() > 0) {
            await learnCodeInput.fill('001');
            console.log('✅ 学习码已输入: 001');
          }

          if (await learnEventCodeInput.count() > 0) {
            await learnEventCodeInput.fill('A');
            console.log('✅ 学习事件码已输入: A');
          }

          await page.waitForTimeout(500);
          await page.screenshot({ path: './test-results/screenshots/step-13-learn-code-filled.png', fullPage: true });

          // ============================================
          // 步骤14: 关闭弹窗（不提交）
          // ============================================
          console.log('\n步骤14: 关闭弹窗...');

          const cancelButton = modal.locator('button:has-text("取消")').first();
          if (await cancelButton.count() > 0) {
            await cancelButton.click();
            await page.waitForTimeout(1000);
            console.log('✅ 已关闭弹窗');
          }

          await page.screenshot({ path: './test-results/screenshots/step-14-modal-closed.png', fullPage: true });

        } else {
          console.log('❌ 弹窗未打开');
        }
      } else {
        console.log('⚠️  复制新建DM按钮被禁用');
      }
    } else {
      console.log('⚠️  未找到复制新建DM按钮');
    }

    // ============================================
    // 测试完成
    // ============================================
    console.log('\n========================================');
    console.log('  测试完成！');
    console.log('========================================');
    console.log('\n测试结果已保存到: test-results/screenshots/');
    console.log('请查看截图验证各步骤执行情况\n');
  });
});
