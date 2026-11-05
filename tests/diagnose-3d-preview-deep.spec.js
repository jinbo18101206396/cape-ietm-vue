/**
 * 深度诊断3D模型预览问题
 *
 * 目标：找出为什么修复后仍然无法预览
 */

import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('深度诊断3D模型预览失败原因', async ({ page }) => {

  // 监听所有控制台消息
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // 监听所有错误
  const errors = [];
  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      stack: error.stack
    });
  });

  // 监听网络请求
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/ietm/icn/')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });

  // 监听网络响应
  const responses = [];
  page.on('response', async response => {
    if (response.url().includes('/ietm/icn/')) {
      const contentType = response.headers()['content-type'];
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: contentType,
        headers: response.headers()
      });
    }
  });

  console.log('\n====== 步骤1: 登录 ======');
  await page.goto(`${BASE_URL}/user/login`);

  await page.waitForSelector('input[placeholder*="账户名"], input[placeholder*="户名"]', { timeout: 10000 });

  const usernameInputs = await page.$$('input[placeholder*="账户名"], input[placeholder*="户名"], input[name="username"]');
  const passwordInputs = await page.$$('input[placeholder*="密码"], input[type="password"]');

  if (usernameInputs.length > 0 && passwordInputs.length > 0) {
    await usernameInputs[0].fill('admin');
    await passwordInputs[0].fill('admin');
    await page.click('button:has-text("登")');

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      console.log('导航等待超时，继续执行');
    }
  }

  await page.waitForTimeout(2000);
  console.log('✅ 登录完成');

  console.log('\n====== 步骤2: 导航到数据模块管理 ======');
  await page.goto(`${BASE_URL}/ietm/IetmDatamoduleManagement`);
  await page.waitForTimeout(3000);

  console.log('\n====== 步骤3: 查找并打开数据模块编辑器 ======');

  // 查找编辑按钮
  const editButtons = await page.$$('button:has-text("编辑"), a:has-text("编辑"), [title="编辑"]');
  console.log(`找到 ${editButtons.length} 个编辑按钮`);

  if (editButtons.length > 0) {
    // 点击第一个编辑按钮
    await editButtons[0].click();
    await page.waitForTimeout(3000);

    console.log('✅ 已打开数据模块编辑器');

    console.log('\n====== 步骤4: 查找并点击预览按钮 ======');

    // 查找预览按钮
    const previewButtons = await page.$$('button:has-text("预览")');
    console.log(`找到 ${previewButtons.length} 个预览按钮`);

    if (previewButtons.length > 0) {
      await previewButtons[0].click();
      await page.waitForTimeout(3000);

      console.log('✅ 已点击预览按钮');

      // 截图当前状态
      await page.screenshot({ path: 'debug-dm-preview.png', fullPage: true });

      console.log('\n====== 步骤5: 检查 DM内容预览 弹窗 ======');

      // 检查弹窗是否存在
      const modalTitle = await page.$('text=DM内容预览');
      if (modalTitle) {
        console.log('✅ "DM内容预览" 弹窗已打开');

        // 查找弹窗内的所有内容
        const modalContent = await page.evaluate(() => {
          const modal = document.querySelector('.ant-modal:not(.ant-modal-hidden)');
          if (!modal) return null;

          return {
            html: modal.innerHTML.substring(0, 2000),
            // 查找所有可点击元素
            clickableElements: Array.from(modal.querySelectorAll('img, svg, [class*="icon"], [class*="multimedia"], button'))
              .map(el => ({
                tag: el.tagName,
                class: el.className,
                src: el.getAttribute('src'),
                onclick: el.hasAttribute('onclick') || el.onclick !== null
              }))
          };
        });

        console.log('\n弹窗内的可点击元素:');
        console.log(JSON.stringify(modalContent.clickableElements, null, 2));

        console.log('\n====== 步骤6: 查找并点击多媒体图标 ======');

        // 尝试多种选择器查找多媒体图标
        const selectors = [
          'img[src*="multimedia"]',
          'img[src*="3d"]',
          'svg[class*="multimedia"]',
          '[class*="multimedia-icon"]',
          '.ant-modal img',
          'img[onclick*="showMultimedia"]',
          'img[onclick*="Multimedia"]'
        ];

        let multimediaElement = null;
        let usedSelector = '';

        for (const selector of selectors) {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`✓ 找到 ${elements.length} 个元素: ${selector}`);
            multimediaElement = elements[0];
            usedSelector = selector;
            break;
          }
        }

        if (multimediaElement) {
          console.log(`\n使用选择器: ${usedSelector}`);

          // 获取元素详细信息
          const elementInfo = await multimediaElement.evaluate(el => ({
            tag: el.tagName,
            class: el.className,
            src: el.getAttribute('src'),
            onclick: el.getAttribute('onclick'),
            datIcnCode: el.getAttribute('data-icn-code')
          }));

          console.log('多媒体元素信息:', elementInfo);

          // 点击元素
          await multimediaElement.click();
          await page.waitForTimeout(3000);

          console.log('✅ 已点击多媒体图标');

          // 截图
          await page.screenshot({ path: 'debug-after-click-multimedia.png', fullPage: true });

          console.log('\n====== 步骤7: 检查 图形/多媒体预览 弹窗 ======');

          // 检查第二个弹窗
          const multimediaModalTitle = await page.$('text=图形/多媒体预览');

          if (multimediaModalTitle) {
            console.log('✅ "图形/多媒体预览" 弹窗已打开');

            // 检查弹窗内容
            const previewContent = await page.evaluate(() => {
              const modals = document.querySelectorAll('.ant-modal:not(.ant-modal-hidden)');
              const lastModal = modals[modals.length - 1];

              if (!lastModal) return null;

              return {
                hasCanvas: !!lastModal.querySelector('canvas'),
                hasThreeCanvas: !!lastModal.querySelector('.three-canvas'),
                has3DContainer: !!lastModal.querySelector('.multimedia-3d-container'),
                hasLoadingSpinner: !!lastModal.querySelector('.ant-spin'),
                hasEmptyState: !!lastModal.querySelector('.ant-empty'),
                modalBody: lastModal.querySelector('.ant-modal-body')?.innerHTML.substring(0, 1000)
              };
            });

            console.log('\n弹窗内容检查:');
            console.log('  - Canvas元素:', previewContent.hasCanvas);
            console.log('  - Three Canvas:', previewContent.hasThreeCanvas);
            console.log('  - 3D Container:', previewContent.has3DContainer);
            console.log('  - 加载动画:', previewContent.hasLoadingSpinner);
            console.log('  - 空状态:', previewContent.hasEmptyState);

            // 等待一段时间让3D模型加载
            await page.waitForTimeout(5000);

            // 再次检查
            const afterWait = await page.evaluate(() => {
              const modals = document.querySelectorAll('.ant-modal:not(.ant-modal-hidden)');
              const lastModal = modals[modals.length - 1];

              if (!lastModal) return null;

              const canvas = lastModal.querySelector('canvas');

              return {
                hasCanvas: !!canvas,
                canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
                hasLoadingSpinner: !!lastModal.querySelector('.ant-spin'),
                hasEmptyState: !!lastModal.querySelector('.ant-empty')
              };
            });

            console.log('\n等待5秒后的状态:');
            console.log('  - Canvas元素:', afterWait.hasCanvas);
            if (afterWait.canvasSize) {
              console.log('  - Canvas尺寸:', afterWait.canvasSize);
            }
            console.log('  - 加载动画:', afterWait.hasLoadingSpinner);
            console.log('  - 空状态:', afterWait.hasEmptyState);

            // 最终截图
            await page.screenshot({ path: 'debug-multimedia-preview-final.png', fullPage: true });

          } else {
            console.log('❌ "图形/多媒体预览" 弹窗未打开');
          }

        } else {
          console.log('❌ 未找到多媒体图标');

          // 打印整个弹窗的HTML结构
          const fullModalHtml = await page.evaluate(() => {
            const modal = document.querySelector('.ant-modal:not(.ant-modal-hidden)');
            return modal ? modal.innerHTML : '未找到弹窗';
          });

          console.log('\n完整弹窗HTML (前2000字符):');
          console.log(fullModalHtml.substring(0, 2000));
        }

      } else {
        console.log('❌ "DM内容预览" 弹窗未打开');
      }

    } else {
      console.log('❌ 未找到预览按钮');
    }

  } else {
    console.log('❌ 未找到编辑按钮');
  }

  console.log('\n====== 网络请求分析 ======');
  console.log(`捕获到 ${requests.length} 个 ICN 相关请求`);
  console.log(`捕获到 ${responses.length} 个 ICN 相关响应`);

  responses.forEach((resp, i) => {
    console.log(`\n响应 ${i + 1}:`);
    console.log(`  URL: ${resp.url}`);
    console.log(`  状态: ${resp.status}`);
    console.log(`  Content-Type: ${resp.contentType}`);
  });

  console.log('\n====== 控制台消息分析 ======');

  // 过滤错误和警告
  const errorMessages = consoleMessages.filter(m => m.type === 'error');
  const warningMessages = consoleMessages.filter(m => m.type === 'warning');
  const logMessages = consoleMessages.filter(m => m.type === 'log' && (
    m.text.includes('3D') ||
    m.text.includes('模型') ||
    m.text.includes('multimedia') ||
    m.text.includes('加载')
  ));

  console.log(`\n错误消息 (${errorMessages.length} 条):`);
  errorMessages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg.text}`);
  });

  console.log(`\n警告消息 (${warningMessages.length} 条):`);
  warningMessages.slice(0, 5).forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg.text}`);
  });

  console.log(`\n相关日志消息 (${logMessages.length} 条):`);
  logMessages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg.text}`);
  });

  console.log('\n====== 页面错误分析 ======');
  if (errors.length > 0) {
    console.log(`捕获到 ${errors.length} 个页面错误:`);
    errors.forEach((err, i) => {
      console.log(`\n错误 ${i + 1}:`);
      console.log(`  消息: ${err.message}`);
      console.log(`  堆栈: ${err.stack?.substring(0, 200)}`);
    });
  } else {
    console.log('无页面错误');
  }

  console.log('\n====== 诊断完成 ======');
});
