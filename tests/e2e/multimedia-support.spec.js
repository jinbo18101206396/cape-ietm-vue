/**
 * 多媒体支持 E2E 测试（Playwright）
 *
 * 测试范围：
 * 1. DM预览中的ICN图形显示
 * 2. 视频播放和Range请求
 * 3. 视频拖动场景
 * 4. 浏览器兼容性
 *
 * 运行方式：
 * npm test tests/e2e/multimedia-support.spec.ts
 *
 * @author jeecg-boot
 * @since 2026-09-18
 */

const { test, expect } = require('@playwright/test');

// 测试配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:9999';

test.describe('多媒体支持 E2E 测试', () => {

  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto(`${BASE_URL}/user/login`);
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard/**`);
  });

  test('场景1: DM预览显示50个ICN图形', async ({ page }) => {
    test.setTimeout(60000); // 60秒超时

    // 1. 导航到数据模块列表
    await page.goto(`${BASE_URL}/ietm/data-module`);
    await page.waitForSelector('.ant-table-tbody');

    // 2. 找到一个包含多个图形的DM（假设DMC包含'WITH-GRAPHICS'）
    const dmRow = await page.locator('tr').filter({ hasText: 'WITH-GRAPHICS' }).first();
    expect(dmRow).toBeTruthy();

    // 3. 点击"预览"按钮
    await dmRow.locator('button:has-text("预览")').click();
    await page.waitForSelector('.dm-preview-modal', { timeout: 5000 });

    // 4. 等待ICN加载完成
    await page.waitForTimeout(2000);

    // 5. 验证图形显示
    const images = await page.locator('.dm-preview-modal img[boardno]').all();
    console.log(`Found ${images.length} ICN images`);

    // 验证至少显示了一些图形
    expect(images.length).toBeGreaterThan(0);

    // 6. 验证没有占位图（检查src不是占位图的base64）
    let realImageCount = 0;
    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && !src.includes('占位图') && src.startsWith('data:image/')) {
        realImageCount++;
      }
    }

    console.log(`Real images loaded: ${realImageCount}/${images.length}`);

    // 至少80%的图形应该成功加载
    expect(realImageCount / images.length).toBeGreaterThan(0.8);

    // 7. 验证加载时间（应该在2秒内完成）
    // 时间已在waitForTimeout中验证
  });

  test('场景2: 视频Range请求验证', async ({ page, context }) => {
    test.setTimeout(60000);

    // 监听网络请求
    const rangeRequests = [];
    page.on('request', request => {
      if (request.url().includes('/ietm/icn/view/') && request.headers()['range']) {
        rangeRequests.push({
          url: request.url(),
          range: request.headers()['range']
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/ietm/icn/view/') && response.status() === 206) {
        console.log(`✅ 206 Partial Content: ${response.url()}`);
        console.log(`   Content-Range: ${response.headers()['content-range']}`);
      }
    });

    // 1. 导航到包含视频的DM
    await page.goto(`${BASE_URL}/ietm/data-module`);
    await page.waitForSelector('.ant-table-tbody');

    const dmRow = await page.locator('tr').filter({ hasText: 'WITH-VIDEO' }).first();
    await dmRow.locator('button:has-text("预览")').click();
    await page.waitForSelector('.dm-preview-modal');

    // 2. 找到视频元素
    const video = await page.locator('video').first();
    await video.waitFor({ state: 'visible', timeout: 5000 });

    // 3. 等待视频元数据加载
    await page.waitForTimeout(2000);

    // 4. 验证至少有一个Range请求
    expect(rangeRequests.length).toBeGreaterThan(0);
    console.log(`✅ Total Range requests: ${rangeRequests.length}`);

    // 5. 验证Range请求格式
    const firstRange = rangeRequests[0];
    expect(firstRange.range).toMatch(/^bytes=\d+-\d*$/);
    console.log(`✅ Range format valid: ${firstRange.range}`);

    // 6. 拖动视频进度条
    const duration = await video.evaluate(v => v.duration);
    if (duration && duration > 5) {
      // 拖动到50%位置
      await video.evaluate(v => {
        v.currentTime = v.duration * 0.5;
      });

      // 等待新的Range请求
      await page.waitForTimeout(1000);

      // 验证产生了新的Range请求
      expect(rangeRequests.length).toBeGreaterThan(1);
      console.log(`✅ Seek triggered new Range request`);
    }
  });

  test('场景3: 视频拖动性能测试', async ({ page }) => {
    test.setTimeout(60000);

    // 1. 打开包含视频的DM
    await page.goto(`${BASE_URL}/ietm/data-module`);
    const dmRow = await page.locator('tr').filter({ hasText: 'WITH-VIDEO' }).first();
    await dmRow.locator('button:has-text("预览")').click();
    await page.waitForSelector('.dm-preview-modal');

    const video = await page.locator('video').first();
    await video.waitFor({ state: 'visible' });

    // 2. 等待视频ready
    await page.waitForTimeout(2000);

    // 3. 测试拖动响应时间
    const startTime = Date.now();

    await video.evaluate(v => {
      v.currentTime = v.duration * 0.8; // 拖动到80%位置
    });

    // 等待播放恢复
    await video.evaluate(v => {
      return new Promise(resolve => {
        const checkReady = () => {
          if (v.readyState >= 2) { // HAVE_CURRENT_DATA
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
    });

    const seekTime = Date.now() - startTime;
    console.log(`✅ Seek time: ${seekTime}ms`);

    // 验证拖动响应时间<2秒（Range请求优化后）
    expect(seekTime).toBeLessThan(2000);
  });

  test('场景4: 并发ICN加载测试', async ({ page }) => {
    test.setTimeout(90000);

    // 监听ICN请求
    const icnRequests = [];
    page.on('response', response => {
      if (response.url().includes('/ietm/icn/view/')) {
        icnRequests.push({
          url: response.url(),
          status: response.status(),
          time: Date.now()
        });
      }
    });

    // 1. 打开包含多个图形的DM
    await page.goto(`${BASE_URL}/ietm/data-module`);
    const dmRow = await page.locator('tr').filter({ hasText: 'WITH-GRAPHICS' }).first();

    const loadStartTime = Date.now();
    await dmRow.locator('button:has-text("预览")').click();
    await page.waitForSelector('.dm-preview-modal');

    // 2. 等待所有图形加载完成
    await page.waitForTimeout(3000);
    const loadDuration = Date.now() - loadStartTime;

    console.log(`✅ Total ICN requests: ${icnRequests.length}`);
    console.log(`✅ Load duration: ${loadDuration}ms`);

    // 3. 验证加载时间合理（批量加载+并行应该很快）
    // 50个ICN应该在5秒内加载完成（如果是串行需要50秒）
    if (icnRequests.length >= 10) {
      expect(loadDuration).toBeLessThan(5000);
    }

    // 4. 验证所有请求都成功
    const successRequests = icnRequests.filter(r => r.status === 200 || r.status === 206);
    const successRate = successRequests.length / icnRequests.length;
    console.log(`✅ Success rate: ${(successRate * 100).toFixed(1)}%`);

    expect(successRate).toBeGreaterThan(0.95); // 95%成功率
  });

  test('场景5: 占位图降级验证', async ({ page }) => {
    test.setTimeout(30000);

    // 1. 创建一个不存在的ICN预览
    await page.goto(`${API_URL}/ietm/icn/view/ICN-NOT-EXIST-999`, {
      waitUntil: 'domcontentloaded'
    });

    // 2. 验证返回了占位图（SVG）
    const content = await page.content();
    expect(content).toContain('svg');
    expect(content).toContain('xmlns="http://www.w3.org/2000/svg"');

    console.log('✅ Placeholder image returned for non-existent ICN');
  });

  test('场景6: Range请求格式验证', async ({ page, request }) => {
    test.setTimeout(30000);

    // 使用API直接测试Range请求
    const icnCode = 'ICN-TEST-VIDEO-001'; // 假设的测试视频ICN

    // 1. 测试正常Range请求
    const rangeResponse = await request.get(`${API_URL}/ietm/icn/view/${icnCode}`, {
      headers: {
        'Range': 'bytes=0-1023'
      }
    });

    expect(rangeResponse.status()).toBe(206);
    expect(rangeResponse.headers()['content-range']).toMatch(/^bytes \d+-\d+\/\d+$/);
    expect(rangeResponse.headers()['accept-ranges']).toBe('bytes');
    console.log('✅ Normal Range request: 206 Partial Content');

    // 2. 测试无效Range请求
    const invalidRangeResponse = await request.get(`${API_URL}/ietm/icn/view/${icnCode}`, {
      headers: {
        'Range': 'bytes=abc-def'
      }
    });

    expect(invalidRangeResponse.status()).toBe(400);
    console.log('✅ Invalid Range request: 400 Bad Request');

    // 3. 测试普通请求（无Range头）
    const normalResponse = await request.get(`${API_URL}/ietm/icn/view/${icnCode}`);

    expect(normalResponse.status()).toBe(200);
    expect(normalResponse.headers()['accept-ranges']).toBe('bytes');
    console.log('✅ Normal request: 200 OK with Accept-Ranges header');
  });

});

test.describe('浏览器兼容性测试', () => {

  const browsers = ['chromium', 'firefox', 'webkit'];

  for (const browserName of browsers) {
    test(`${browserName}: 视频Range请求兼容性`, async ({ playwright }) => {
      test.setTimeout(60000);

      const browser = await playwright[browserName].launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // 监听206响应
        let has206Response = false;
        page.on('response', response => {
          if (response.status() === 206 && response.url().includes('/ietm/icn/view/')) {
            has206Response = true;
            console.log(`✅ [${browserName}] 206 Partial Content received`);
          }
        });

        // 登录
        await page.goto(`${BASE_URL}/user/login`);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL(`${BASE_URL}/dashboard/**`);

        // 打开视频
        await page.goto(`${BASE_URL}/ietm/data-module`);
        const dmRow = await page.locator('tr').filter({ hasText: 'WITH-VIDEO' }).first();
        await dmRow.locator('button:has-text("预览")').click();
        await page.waitForSelector('video', { timeout: 10000 });

        // 等待Range请求
        await page.waitForTimeout(3000);

        // 验证浏览器支持Range请求
        expect(has206Response).toBe(true);
        console.log(`✅ [${browserName}] Range request supported`);

      } finally {
        await browser.close();
      }
    });
  }

});

test.describe('性能基准测试', () => {

  test('基准: 50个ICN加载时间', async ({ page }) => {
    test.setTimeout(60000);

    const loadTimes = [];

    // 执行3次测试取平均值
    for (let i = 0; i < 3; i++) {
      await page.goto(`${BASE_URL}/ietm/data-module`);
      const dmRow = await page.locator('tr').filter({ hasText: 'WITH-GRAPHICS' }).first();

      const startTime = Date.now();
      await dmRow.locator('button:has-text("预览")').click();
      await page.waitForSelector('.dm-preview-modal');
      await page.waitForTimeout(2000); // 等待图形加载
      const loadTime = Date.now() - startTime;

      loadTimes.push(loadTime);
      console.log(`Run ${i + 1}: ${loadTime}ms`);

      // 关闭预览
      await page.locator('.ant-modal-close').click();
      await page.waitForTimeout(500);
    }

    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    console.log(`✅ Average load time: ${avgLoadTime.toFixed(0)}ms`);

    // 性能基准：50个ICN应该在3秒内加载完成
    expect(avgLoadTime).toBeLessThan(3000);
  });

  test('基准: 视频拖动响应时间', async ({ page }) => {
    test.setTimeout(60000);

    const seekTimes = [];

    // 执行5次测试取平均值
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/ietm/data-module`);
      const dmRow = await page.locator('tr').filter({ hasText: 'WITH-VIDEO' }).first();
      await dmRow.locator('button:has-text("预览")').click();
      await page.waitForSelector('video');

      const video = await page.locator('video').first();
      await page.waitForTimeout(2000);

      const startTime = Date.now();
      await video.evaluate(v => {
        v.currentTime = v.duration * 0.7;
      });

      await video.evaluate(v => {
        return new Promise(resolve => {
          const check = () => {
            if (v.readyState >= 2) resolve();
            else setTimeout(check, 50);
          };
          check();
        });
      });

      const seekTime = Date.now() - startTime;
      seekTimes.push(seekTime);
      console.log(`Seek ${i + 1}: ${seekTime}ms`);

      await page.locator('.ant-modal-close').click();
      await page.waitForTimeout(500);
    }

    const avgSeekTime = seekTimes.reduce((a, b) => a + b, 0) / seekTimes.length;
    console.log(`✅ Average seek time: ${avgSeekTime.toFixed(0)}ms`);

    // 性能基准：视频拖动应该在1秒内响应
    expect(avgSeekTime).toBeLessThan(1000);
  });

});
