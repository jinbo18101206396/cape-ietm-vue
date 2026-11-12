const { chromium } = require('playwright');

/**
 * 模拟真实用户操作的完整测试
 */

async function runUserSimulation() {
  console.log('=== 启动Playwright测试 ===\n');
  console.log('模拟真实用户操作...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // 放慢操作，模拟真实用户
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null,
    locale: 'zh-CN'
  });

  const page = await context.newPage();

  // 收集所有错误
  const errors = [];
  const logs = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });

    if (msg.type() === 'error') {
      errors.push(text);
      console.log('❌ 控制台错误:', text);
    } else if (msg.type() === 'warning') {
      console.log('⚠️  警告:', text);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ 页面错误:', error.message);
  });

  try {
    // ===== 步骤1: 访问页面并检查登录状态 =====
    console.log('步骤1: 访问DM内容编辑页面...');
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2120391209032593409?mode=edit&dmc=DMC-ZB1-A-01-00-00-00A-007A-A_001-02_zh-CN', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    console.log('等待页面完全加载...');
    await page.waitForTimeout(5000);

    // 检查是否需要登录
    const loginButton = page.locator('button:has-text("登 录"), button:has-text("登录")');
    const hasLoginButton = await loginButton.count() > 0;

    if (hasLoginButton) {
      console.log('检测到登录页面，需要先登录...');
      console.log('⚠️  请提供登录凭据，或者在浏览器中手动登录');
      console.log('提示：您可以在测试开始前先手动登录系统，然后保持登录状态\n');

      // 尝试使用默认凭据登录（如果有的话）
      const usernameInput = page.locator('input[type="text"], input[placeholder*="用户名"], input[placeholder*="账号"]').first();
      const passwordInput = page.locator('input[type="password"], input[placeholder*="密码"]').first();

      if (await usernameInput.count() > 0 && await passwordInput.count() > 0) {
        console.log('尝试使用测试账号登录...');

        // 这里可以填入测试账号（需要根据实际情况修改）
        const testUsername = 'admin'; // 修改为实际的测试账号
        const testPassword = 'admin123'; // 修改为实际的测试密码

        await usernameInput.fill(testUsername);
        await passwordInput.fill(testPassword);
        await loginButton.click();

        console.log('等待登录完成...');
        await page.waitForTimeout(5000);

        // 检查是否登录成功
        const stillHasLogin = await page.locator('button:has-text("登 录"), button:has-text("登录")').count() > 0;
        if (stillHasLogin) {
          console.log('❌ 自动登录失败');
          console.log('请手动登录后重新运行测试，或更新测试脚本中的登录凭据\n');

          // 等待用户手动登录
          console.log('等待60秒供手动登录...');
          await page.waitForTimeout(60000);

          // 登录后跳转到目标页面
          await page.goto('http://localhost:3000/ietm/dm-content-editor/2120391209032593409?mode=edit&dmc=DMC-ZB1-A-01-00-00-00A-007A-A_001-02_zh-CN', {
            waitUntil: 'domcontentloaded',
            timeout: 120000
          });
          await page.waitForTimeout(5000);
        } else {
          console.log('✅ 登录成功');
        }
      } else {
        console.log('❌ 无法找到登录表单，等待手动登录...');
        await page.waitForTimeout(60000);
      }
    }

    console.log('✅ 页面加载完成\n');

    // 截图1
    await page.screenshot({
      path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step1-page-loaded.png',
      fullPage: true
    });

    // ===== 步骤2: 查找包含嵌套列表的行 =====
    console.log('步骤2: 查找包含嵌套列表内容的区域...');

    // 方法1: 通过文本查找
    const textSelectors = [
      'text="一级"',
      'text="二级"',
      'text="三级"',
      ':has-text("sequentialList")',
      ':has-text("listItem")'
    ];

    let foundTextArea = null;
    for (const selector of textSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`找到 ${count} 个匹配"${selector}"的元素`);
        foundTextArea = elements.first();
        break;
      }
    }

    // 方法2: 查找所有编辑按钮
    console.log('\n查找编辑按钮...');
    const editButtonSelectors = [
      'button:has-text("编辑")',
      'a:has-text("编辑")',
      '[title*="编辑"]',
      '[aria-label*="编辑"]',
      'button[class*="edit"]',
      'a[class*="edit"]',
      '.anticon-edit',
      '.el-icon-edit',
      'svg[data-icon="edit"]'
    ];

    let editButtons = null;
    for (const selector of editButtonSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`通过"${selector}"找到 ${count} 个编辑按钮`);
        editButtons = elements;
        break;
      }
    }

    if (!editButtons || await editButtons.count() === 0) {
      console.log('❌ 未找到任何编辑按钮');
      console.log('\n尝试查找页面中的所有按钮...');

      const allButtons = page.locator('button, a[href*="javascript"]');
      const buttonCount = await allButtons.count();
      console.log(`页面中共有 ${buttonCount} 个按钮/链接`);

      // 列出前20个按钮的文本
      for (let i = 0; i < Math.min(20, buttonCount); i++) {
        const btn = allButtons.nth(i);
        const text = await btn.textContent();
        const title = await btn.getAttribute('title');
        console.log(`  ${i+1}. 文本:"${text?.trim()}" 标题:"${title}"`);
      }

      throw new Error('无法找到编辑按钮，请检查页面结构');
    }

    // ===== 步骤3: 智能选择正确的编辑按钮 =====
    console.log('\n步骤3: 选择合适的编辑按钮...');

    const buttonCount = await editButtons.count();
    console.log(`共找到 ${buttonCount} 个编辑按钮\n`);

    // 尝试每个编辑按钮，直到找到能打开Para设计器的
    let successButton = null;
    for (let i = 0; i < Math.min(buttonCount, 10); i++) { // 最多尝试10个
      console.log(`尝试第 ${i+1} 个编辑按钮...`);

      try {
        const btn = editButtons.nth(i);

        // 确保按钮可见
        const isVisible = await btn.isVisible();
        if (!isVisible) {
          console.log('  跳过：按钮不可见');
          continue;
        }

        // 点击按钮
        await btn.click({ timeout: 5000 });
        await page.waitForTimeout(3000);

        // 检查是否打开了Para设计器
        const hasUEditor = await page.locator('iframe[id*="ueditor"], .edui-body-container iframe').count() > 0;
        const hasParaDesigner = await page.locator(':has-text("段落"), :has-text("Para"), :has-text("保存")').count() > 0;

        if (hasUEditor || hasParaDesigner) {
          console.log('✅ 成功打开Para设计器！\n');
          successButton = i + 1;
          break;
        } else {
          console.log('  未打开Para设计器，继续尝试下一个...');

          // 如果打开了其他对话框，尝试关闭
          const closeBtn = page.locator('[class*="close"], [aria-label*="关闭"], button:has-text("取消")').first();
          if (await closeBtn.count() > 0) {
            await closeBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) {
        console.log(`  点击失败: ${e.message}`);
      }
    }

    if (!successButton) {
      console.log('❌ 尝试了多个按钮，都无法打开Para设计器');
      await page.screenshot({
        path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step3-no-designer.png',
        fullPage: true
      });
      throw new Error('无法打开Para设计器');
    }

    // 截图2
    await page.screenshot({
      path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step2-designer-opened.png',
      fullPage: true
    });

    // ===== 步骤4: 检查错误 =====
    console.log('步骤4: 检查是否有错误...\n');

    const targetError = errors.find(err =>
      err.includes("Cannot read properties of undefined") && err.includes("dom")
    );

    if (targetError) {
      console.log('❌❌❌ 发现目标错误！');
      console.log('错误:', targetError);
      console.log('\n修复未生效，问题仍然存在！\n');
    } else {
      console.log('✅ 未发现"Cannot read properties of undefined (reading \'dom\')"错误');
    }

    if (errors.length > 0) {
      console.log(`\n共捕获 ${errors.length} 个错误:`);
      errors.forEach((err, i) => {
        console.log(`  ${i+1}. ${err.substring(0, 100)}`);
      });
    } else {
      console.log('✅ 没有捕获到任何错误\n');
    }

    // ===== 步骤5: 分析UEditor内容 =====
    console.log('步骤5: 分析UEditor中的内容...\n');

    // 查找UEditor iframe
    const ueditorFrame = page.frameLocator('iframe[id*="ueditor"], .edui-body-container iframe').first();

    try {
      const ueditorBody = ueditorFrame.locator('body');
      await ueditorBody.waitFor({ state: 'visible', timeout: 10000 });

      console.log('✅ UEditor已加载\n');

      // 获取内容
      const textContent = await ueditorBody.textContent();
      const htmlContent = await ueditorBody.innerHTML();

      console.log('UEditor文本内容:');
      console.log(textContent.trim());
      console.log('\n');

      // 分析HTML结构
      console.log('HTML结构分析:');

      const olCount = (htmlContent.match(/<ol/gi) || []).length;
      const liCount = (htmlContent.match(/<li/gi) || []).length;
      const hasLiP = /<li[^>]*>\s*<p>/i.test(htmlContent);

      console.log(`  <ol>标签数量: ${olCount}`);
      console.log(`  <li>标签数量: ${liCount}`);
      console.log(`  包含<li><p>结构: ${hasLiP ? '❌ 是（应该移除）' : '✅ 否'}`);

      // 检查内容
      const hasLevel1 = textContent.includes('一级');
      const hasLevel2 = textContent.includes('二级');
      const hasLevel3 = textContent.includes('三级');

      console.log(`\n内容检查:`);
      console.log(`  包含"一级": ${hasLevel1 ? '✅' : '❌'}`);
      console.log(`  包含"二级": ${hasLevel2 ? '✅' : '❌'}`);
      console.log(`  包含"三级": ${hasLevel3 ? '✅' : '❌'}`);

      // 分析嵌套结构
      console.log(`\n嵌套结构分析:`);

      // 提取列表项
      const listItems = await ueditorBody.locator('li').all();
      console.log(`  列表项总数: ${listItems.length}`);

      for (let i = 0; i < listItems.length; i++) {
        const li = listItems[i];
        const text = (await li.textContent()).trim().substring(0, 30);
        const html = await li.innerHTML();
        const hasNested = html.includes('<ol');
        console.log(`    ${i+1}. "${text}" ${hasNested ? '(有嵌套)' : ''}`);
      }

      // 截图3
      await page.screenshot({
        path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step3-ueditor-content.png',
        fullPage: true
      });

      // ===== 最终判断 =====
      console.log('\n' + '='.repeat(60));
      console.log('最终测试结果');
      console.log('='.repeat(60) + '\n');

      const testPassed = !targetError &&
                         !hasLiP &&
                         hasLevel1 && hasLevel2 && hasLevel3 &&
                         olCount >= 3 &&
                         listItems.length >= 3;

      if (testPassed) {
        console.log('✅✅✅ 测试完全通过！✅✅✅\n');
        console.log('✅ 无加载错误');
        console.log('✅ <li>内没有<p>标签（修复已生效）');
        console.log('✅ 包含所有三个层级的内容');
        console.log('✅ 嵌套结构正确（' + olCount + '层<ol>）');
        console.log('\n🎉🎉🎉 问题已完全解决！🎉🎉🎉\n');
      } else {
        console.log('❌ 测试未完全通过\n');

        if (targetError) {
          console.log('❌ 仍然出现目标错误');
        }
        if (hasLiP) {
          console.log('❌ <li>内仍有<p>标签，修复未生效');
        }
        if (!hasLevel1 || !hasLevel2 || !hasLevel3) {
          console.log('❌ 内容缺失或不完整');
        }
        if (olCount < 3) {
          console.log(`❌ <ol>层级不足（预期≥3，实际${olCount}）`);
        }

        console.log('\n需要进一步调查\n');
      }

    } catch (e) {
      console.log('❌ 无法访问UEditor:', e.message);

      // 尝试查找错误提示
      const errorMsg = await page.locator('.ant-message-error, .el-message--error').first();
      if (await errorMsg.count() > 0) {
        const errText = await errorMsg.textContent();
        console.log('页面错误提示:', errText);
      }
    }

  } catch (error) {
    console.log('\n❌ 测试过程中出现异常:');
    console.log(error.message);
    if (error.stack) {
      console.log('\n堆栈:');
      console.log(error.stack);
    }
  } finally {
    console.log('\n=== 测试完成 ===');
    console.log('截图已保存到: D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\');
    console.log('\n15秒后关闭浏览器...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

// 运行测试
runUserSimulation().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
