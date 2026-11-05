/**
 * 直接测试DM内容编辑器中的3D模型预览
 */

import { test } from '@playwright/test';

const DM_URL = 'http://localhost:3000/ietm/dm-content-editor/2117141579532677122?mode=edit&dmc=DMC-ZB1-A-06-00-00-00A-007A-A_001-01_zh-CN';

test('测试DM内容编辑器的3D模型预览', async ({ page }) => {

  // 监听控制台
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('3D') || text.includes('模型') || text.includes('multimedia') || text.includes('ICN') || text.includes('MIME')) {
      logs.push({ type: msg.type(), text });
    }
  });

  // 监听错误
  page.on('pageerror', error => {
    console.log('❌ 页面错误:', error.message);
  });

  // 监听网络
  const icnRequests = [];
  page.on('response', async response => {
    if (response.url().includes('/ietm/icn/')) {
      const contentType = response.headers()['content-type'];
      icnRequests.push({
        url: response.url(),
        status: response.status(),
        contentType
      });
    }
  });

  console.log('\n====== 步骤1: 登录 ======');
  await page.goto('http://localhost:3000/user/login');

  await page.waitForSelector('input[placeholder*="账户"], input[name="username"]', { timeout: 10000 });

  const username = await page.$('input[placeholder*="账户"], input[name="username"]');
  const password = await page.$('input[placeholder*="密码"], input[type="password"]');

  if (username && password) {
    await username.fill('admin');
    await password.fill('admin');
    await page.click('button:has-text("登")');
    await page.waitForTimeout(3000);
  }

  console.log('✅ 登录完成');

  console.log('\n====== 步骤2: 访问DM内容编辑器 ======');
  await page.goto(DM_URL);
  await page.waitForTimeout(5000);

  console.log('当前URL:', page.url());
  await page.screenshot({ path: 'dm-editor-page.png', fullPage: true });

  console.log('\n====== 步骤3: 查找预览按钮 ======');

  // 查找所有按钮
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button'))
      .map(btn => ({
        text: btn.textContent?.trim(),
        class: btn.className,
        visible: btn.offsetParent !== null
      }))
      .filter(b => b.text && b.visible);
  });

  console.log('页面上的按钮:');
  buttons.forEach((btn, i) => {
    console.log(`  ${i + 1}. ${btn.text}`);
  });

  // 点击预览按钮
  const previewBtn = await page.$('button:has-text("预览")');
  if (previewBtn) {
    console.log('✅ 找到预览按钮，点击...');
    await previewBtn.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('❌ 未找到预览按钮');
    return;
  }

  console.log('\n====== 步骤4: 检查DM内容预览弹窗 ======');

  const dmPreviewModal = await page.$('.ant-modal:has-text("DM内容预览")');
  if (dmPreviewModal) {
    console.log('✅ DM内容预览弹窗已打开');
    await page.screenshot({ path: 'dm-preview-modal.png', fullPage: true });

    // 查找弹窗内的所有图片和多媒体元素
    const mediaElements = await page.evaluate(() => {
      const modal = document.querySelector('.ant-modal:has-text("DM内容预览")');
      if (!modal) return [];

      return Array.from(modal.querySelectorAll('img, svg, canvas, [class*="multimedia"], [class*="icon"]'))
        .map((el, idx) => ({
          index: idx,
          tag: el.tagName,
          class: el.className,
          src: el.getAttribute('src'),
          dataIcnCode: el.getAttribute('data-icn-code'),
          onclick: el.getAttribute('onclick'),
          hasClickEvent: el.onclick !== null
        }));
    });

    console.log(`\n找到 ${mediaElements.length} 个媒体元素:`);
    mediaElements.forEach(el => {
      console.log(`  ${el.index}. <${el.tag}> class="${el.class}" src="${el.src?.substring(0, 50)}..."`);
      if (el.dataIcnCode) console.log(`     data-icn-code="${el.dataIcnCode}"`);
      if (el.onclick) console.log(`     onclick="${el.onclick}"`);
    });

    console.log('\n====== 步骤5: 点击多媒体图标 ======');

    // 尝试点击第一个看起来像多媒体的元素
    const multimediaClicked = await page.evaluate(() => {
      const modal = document.querySelector('.ant-modal:has-text("DM内容预览")');
      if (!modal) return false;

      // 查找所有img元素
      const imgs = Array.from(modal.querySelectorAll('img'));

      for (const img of imgs) {
        const src = img.getAttribute('src') || '';
        const icnCode = img.getAttribute('data-icn-code');

        // 跳过占位图标
        if (src.includes('.gif') || src.includes('avicit/')) {
          continue;
        }

        // 找到实际的多媒体图标，点击
        if (icnCode || img.onclick) {
          img.click();
          return { clicked: true, icnCode, src: src.substring(0, 100) };
        }
      }

      return { clicked: false };
    });

    if (multimediaClicked.clicked) {
      console.log('✅ 已点击多媒体元素');
      console.log('   ICN Code:', multimediaClicked.icnCode);
      console.log('   Src:', multimediaClicked.src);

      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'after-click-multimedia.png', fullPage: true });

      console.log('\n====== 步骤6: 检查图形/多媒体预览弹窗 ======');

      const multimediaModal = await page.$('.ant-modal:has-text("图形/多媒体预览")');

      if (multimediaModal) {
        console.log('✅ 图形/多媒体预览弹窗已打开');

        // 检查弹窗内容
        const modalInfo = await page.evaluate(() => {
          const modals = Array.from(document.querySelectorAll('.ant-modal'));
          const multimediaModal = modals.find(m => m.textContent.includes('图形/多媒体预览'));

          if (!multimediaModal) return null;

          const modalBody = multimediaModal.querySelector('.ant-modal-body');

          return {
            hasCanvas: !!modalBody.querySelector('canvas'),
            hasThreeCanvas: !!modalBody.querySelector('.three-canvas'),
            has3DContainer: !!modalBody.querySelector('.multimedia-3d-container'),
            hasVideo: !!modalBody.querySelector('video'),
            hasAudio: !!modalBody.querySelector('audio'),
            hasImg: !!modalBody.querySelector('img'),
            hasLoading: !!modalBody.querySelector('.ant-spin'),
            hasEmpty: !!modalBody.querySelector('.ant-empty'),
            bodyHTML: modalBody.innerHTML.substring(0, 1000)
          };
        });

        console.log('\n弹窗内容分析:');
        console.log('  - Canvas:', modalInfo.hasCanvas);
        console.log('  - Three Canvas:', modalInfo.hasThreeCanvas);
        console.log('  - 3D Container:', modalInfo.has3DContainer);
        console.log('  - Video:', modalInfo.hasVideo);
        console.log('  - Audio:', modalInfo.hasAudio);
        console.log('  - Image:', modalInfo.hasImg);
        console.log('  - Loading:', modalInfo.hasLoading);
        console.log('  - Empty State:', modalInfo.hasEmpty);

        // 等待5秒后再检查
        console.log('\n等待5秒让模型加载...');
        await page.waitForTimeout(5000);

        const afterWait = await page.evaluate(() => {
          const modals = Array.from(document.querySelectorAll('.ant-modal'));
          const multimediaModal = modals.find(m => m.textContent.includes('图形/多媒体预览'));

          if (!multimediaModal) return null;

          const modalBody = multimediaModal.querySelector('.ant-modal-body');
          const canvas = modalBody.querySelector('canvas');

          return {
            hasCanvas: !!canvas,
            canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
            hasLoading: !!modalBody.querySelector('.ant-spin'),
            hasEmpty: !!modalBody.querySelector('.ant-empty')
          };
        });

        console.log('\n5秒后的状态:');
        console.log('  - Canvas:', afterWait.hasCanvas);
        if (afterWait.canvasSize) {
          console.log('  - Canvas尺寸:', afterWait.canvasSize);
        }
        console.log('  - Loading:', afterWait.hasLoading);
        console.log('  - Empty State:', afterWait.hasEmpty);

        await page.screenshot({ path: 'multimedia-preview-final.png', fullPage: true });

      } else {
        console.log('❌ 图形/多媒体预览弹窗未打开');
      }

    } else {
      console.log('❌ 未能点击多媒体元素');
    }

  } else {
    console.log('❌ DM内容预览弹窗未打开');
  }

  console.log('\n====== ICN请求分析 ======');
  console.log(`共 ${icnRequests.length} 个ICN请求:`);
  icnRequests.forEach((req, i) => {
    console.log(`\n  ${i + 1}. ${req.url.split('/').pop()}`);
    console.log(`     状态: ${req.status}`);
    console.log(`     Content-Type: ${req.contentType}`);
  });

  console.log('\n====== 相关日志 ======');
  logs.forEach(log => {
    console.log(`[${log.type}] ${log.text}`);
  });

  console.log('\n====== 测试完成 ======');
});
