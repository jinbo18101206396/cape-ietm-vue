/**
 * 测试DM编辑器3D模型预览 - 修复版
 */

import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const DM_URL = `${BASE_URL}/ietm/dm-content-editor/2117141579532677122?mode=edit&dmc=DMC-ZB1-A-06-00-00-00A-007A-A_001-01_zh-CN`;

test('测试3D模型预览功能', async ({ page }) => {

  // 监听控制台
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('3D') || text.includes('模型') || text.includes('multimedia') || text.includes('ICN') || text.includes('加载')) {
      logs.push({ type: msg.type(), text });
    }
  });

  // 监听错误
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // 监听ICN请求
  const icnRequests = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/ietm/icn/')) {
      const contentType = response.headers()['content-type'] || '';
      icnRequests.push({
        url: url.split('/').pop(),
        status: response.status(),
        contentType
      });
    }
  });

  console.log('\n====== 步骤1: 登录 ======');
  await page.goto(`${BASE_URL}/user/login`);
  await page.waitForTimeout(2000);

  // 填写登录信息
  await page.fill('input[placeholder*="账户"], input[name="username"]', 'admin');
  await page.fill('input[placeholder*="密码"], input[type="password"]', 'admin');

  // 点击登录按钮
  await page.click('button:has-text("登")');

  // 等待登录完成 - 等待URL变化或token出现
  try {
    await page.waitForFunction(() => {
      return localStorage.getItem('access_token') !== null;
    }, { timeout: 10000 });
    console.log('✅ 登录成功');
  } catch (e) {
    console.log('⚠️ 登录状态不确定');
  }

  await page.waitForTimeout(2000);

  console.log('\n====== 步骤2: 访问DM内容编辑器 ======');
  await page.goto(DM_URL);
  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log('当前URL:', currentUrl);

  // 检查是否在正确的页面
  if (currentUrl.includes('login')) {
    console.log('❌ 仍在登录页，登录失败');
    await page.screenshot({ path: 'error-still-at-login.png' });
    return;
  }

  await page.screenshot({ path: 'step1-dm-editor.png', fullPage: false });

  console.log('\n====== 步骤3: 查找页面元素 ======');

  // 等待页面加载
  await page.waitForSelector('body', { timeout: 10000 });

  // 查找所有按钮
  const allButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, .ant-btn'))
      .map(btn => btn.textContent?.trim())
      .filter(text => text && text.length > 0 && text.length < 20);
  });

  console.log('页面按钮:', allButtons.slice(0, 20));

  // 查找预览按钮
  const previewBtn = await page.$('button:has-text("预览"), .ant-btn:has-text("预览")');

  if (!previewBtn) {
    console.log('❌ 未找到预览按钮');
    console.log('可能页面结构不同，检查页面内容...');

    // 打印页面主要内容
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent,
        mainContent: document.querySelector('.ant-layout-content, main')?.textContent?.substring(0, 200)
      };
    });

    console.log('页面信息:', pageInfo);
    return;
  }

  console.log('✅ 找到预览按钮');

  console.log('\n====== 步骤4: 点击预览 ======');
  await previewBtn.click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'step2-after-preview-click.png', fullPage: false });

  console.log('\n====== 步骤5: 检查DM内容预览弹窗 ======');

  // 查找弹窗
  const modalVisible = await page.evaluate(() => {
    const modals = document.querySelectorAll('.ant-modal');
    return Array.from(modals).some(m => {
      const title = m.querySelector('.ant-modal-title');
      return title && title.textContent.includes('DM内容预览');
    });
  });

  if (!modalVisible) {
    console.log('❌ DM内容预览弹窗未出现');
    return;
  }

  console.log('✅ DM内容预览弹窗已打开');

  // 查找多媒体元素
  const multimediaInfo = await page.evaluate(() => {
    const modal = Array.from(document.querySelectorAll('.ant-modal'))
      .find(m => m.querySelector('.ant-modal-title')?.textContent?.includes('DM内容预览'));

    if (!modal) return null;

    const modalBody = modal.querySelector('.ant-modal-body');
    const images = Array.from(modalBody.querySelectorAll('img'));

    return images.map((img, idx) => ({
      index: idx,
      src: img.src?.substring(0, 80),
      className: img.className,
      dataIcnCode: img.getAttribute('data-icn-code'),
      onclick: img.onclick !== null || img.getAttribute('onclick') !== null
    }));
  });

  console.log(`\n找到 ${multimediaInfo?.length || 0} 个图片元素:`);
  multimediaInfo?.forEach(info => {
    console.log(`  ${info.index}. ${info.dataIcnCode || '无ICN'} - 可点击: ${info.onclick}`);
  });

  console.log('\n====== 步骤6: 点击多媒体图标 ======');

  // 点击第一个有data-icn-code或onclick的图片
  const clicked = await page.evaluate(() => {
    const modal = Array.from(document.querySelectorAll('.ant-modal'))
      .find(m => m.querySelector('.ant-modal-title')?.textContent?.includes('DM内容预览'));

    if (!modal) return { success: false, reason: '未找到弹窗' };

    const images = Array.from(modal.querySelectorAll('img'));

    for (const img of images) {
      const icnCode = img.getAttribute('data-icn-code');
      const src = img.src || '';

      // 跳过占位图标
      if (src.includes('.gif') || src.includes('avicit')) continue;

      if (icnCode || img.onclick) {
        img.click();
        return { success: true, icnCode, src: src.substring(0, 100) };
      }
    }

    return { success: false, reason: '未找到可点击的多媒体元素' };
  });

  console.log('点击结果:', clicked);

  if (!clicked.success) {
    console.log('❌ 无法点击多媒体元素:', clicked.reason);
    return;
  }

  console.log('✅ 已点击多媒体图标');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'step3-after-multimedia-click.png', fullPage: false });

  console.log('\n====== 步骤7: 检查图形/多媒体预览弹窗 ======');

  const multimediaModalInfo = await page.evaluate(() => {
    const modals = Array.from(document.querySelectorAll('.ant-modal'));
    const multimediaModal = modals.find(m => {
      const title = m.querySelector('.ant-modal-title');
      return title && title.textContent.includes('图形/多媒体预览');
    });

    if (!multimediaModal) return { found: false };

    const modalBody = multimediaModal.querySelector('.ant-modal-body');

    return {
      found: true,
      hasCanvas: !!modalBody.querySelector('canvas'),
      hasThreeCanvas: !!modalBody.querySelector('.three-canvas'),
      has3DContainer: !!modalBody.querySelector('.multimedia-3d-container'),
      hasVideo: !!modalBody.querySelector('video'),
      hasImage: !!modalBody.querySelector('img'),
      hasLoading: !!modalBody.querySelector('.ant-spin'),
      hasEmpty: !!modalBody.querySelector('.ant-empty'),
      bodyText: modalBody.textContent?.substring(0, 200)
    };
  });

  if (!multimediaModalInfo.found) {
    console.log('❌ 图形/多媒体预览弹窗未打开');
    return;
  }

  console.log('✅ 图形/多媒体预览弹窗已打开');
  console.log('\n弹窗内容:');
  console.log('  - Canvas:', multimediaModalInfo.hasCanvas);
  console.log('  - Three Canvas:', multimediaModalInfo.hasThreeCanvas);
  console.log('  - 3D Container:', multimediaModalInfo.has3DContainer);
  console.log('  - Video:', multimediaModalInfo.hasVideo);
  console.log('  - Image:', multimediaModalInfo.hasImage);
  console.log('  - Loading:', multimediaModalInfo.hasLoading);
  console.log('  - Empty:', multimediaModalInfo.hasEmpty);

  // 等待模型加载
  console.log('\n等待5秒...');
  await page.waitForTimeout(5000);

  const afterWait = await page.evaluate(() => {
    const modals = Array.from(document.querySelectorAll('.ant-modal'));
    const multimediaModal = modals.find(m => {
      const title = m.querySelector('.ant-modal-title');
      return title && title.textContent.includes('图形/多媒体预览');
    });

    if (!multimediaModal) return null;

    const modalBody = multimediaModal.querySelector('.ant-modal-body');
    const canvas = modalBody.querySelector('canvas');

    return {
      hasCanvas: !!canvas,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      hasLoading: !!modalBody.querySelector('.ant-spin'),
      hasEmpty: !!modalBody.querySelector('.ant-empty')
    };
  });

  console.log('\n5秒后:');
  console.log('  - Canvas:', afterWait?.hasCanvas);
  if (afterWait?.canvasWidth) {
    console.log(`  - Canvas尺寸: ${afterWait.canvasWidth}x${afterWait.canvasHeight}`);
  }
  console.log('  - Loading:', afterWait?.hasLoading);
  console.log('  - Empty:', afterWait?.hasEmpty);

  await page.screenshot({ path: 'step4-multimedia-preview-final.png', fullPage: false });

  console.log('\n====== ICN请求 ======');
  console.log(`共 ${icnRequests.length} 个请求:`);
  icnRequests.forEach((req, i) => {
    console.log(`  ${i + 1}. ${req.url} - ${req.status} - ${req.contentType}`);
  });

  console.log('\n====== 相关日志 ======');
  logs.forEach(log => {
    console.log(`[${log.type}] ${log.text}`);
  });

  if (errors.length > 0) {
    console.log('\n====== 错误 ======');
    errors.forEach(err => console.log('  -', err));
  }

  console.log('\n====== 测试完成 ======');
});
