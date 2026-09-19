const { test, expect } = require('@playwright/test');

/**
 * E2E 测试：视频/音频多媒体预览功能
 *
 * 测试范围：
 * 1. 视频播放器渲染
 * 2. 音频播放器渲染
 * 3. 元数据显示
 * 4. 播放控制
 * 5. 错误处理
 */

test.describe('多媒体预览功能 E2E 测试', () => {

  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto('http://localhost:3000/user/login');
    await page.fill('input[placeholder="账号: admin"]', 'admin');
    await page.fill('input[placeholder="密码: admin123"]', 'admin123');
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });

    // 导航到数据模块管理
    await page.goto('http://localhost:3000/ietm/IetmDataModuleManagementList');
    await page.waitForLoadState('networkidle');
  });

  /**
   * TC-01: 测试视频预览 - 基本渲染
   */
  test('TC-01: 应该正确渲染视频播放器', async ({ page }) => {
    // 打开包含视频的DM
    await page.click('tr:has-text("视频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    // 点击视频多媒体对象
    const videoElement = await page.locator('text=/video|视频/i').first();
    await videoElement.click();

    // 等待预览模态框显示
    await page.waitForSelector('.dm-preview-modal', { timeout: 3000 });

    // 验证视频播放器存在
    const videoPlayer = await page.locator('video');
    await expect(videoPlayer).toBeVisible();

    // 验证视频控件存在
    await expect(videoPlayer).toHaveAttribute('controls', '');

    // 验证元数据显示
    await expect(page.locator('text=/视频|Video/i')).toBeVisible();
    await expect(page.locator('text=/格式|Format/i')).toBeVisible();
    await expect(page.locator('text=/大小|Size/i')).toBeVisible();
  });

  /**
   * TC-02: 测试音频预览 - 基本渲染
   */
  test('TC-02: 应该正确渲染音频播放器', async ({ page }) => {
    // 打开包含音频的DM
    await page.click('tr:has-text("音频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    // 点击音频多媒体对象
    const audioElement = await page.locator('text=/audio|音频/i').first();
    await audioElement.click();

    // 等待预览模态框显示
    await page.waitForSelector('.dm-preview-modal', { timeout: 3000 });

    // 验证音频播放器存在
    const audioPlayer = await page.locator('audio');
    await expect(audioPlayer).toBeVisible();

    // 验证音频控件存在
    await expect(audioPlayer).toHaveAttribute('controls', '');

    // 验证元数据显示
    await expect(page.locator('text=/音频|Audio/i')).toBeVisible();
  });

  /**
   * TC-03: 测试元数据显示 - MP4视频
   */
  test('TC-03: 应该正确显示MP4视频元数据', async ({ page }) => {
    await page.click('tr:has-text("MP4测试") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('.dm-preview-modal', { timeout: 3000 });

    // 验证MIME类型
    await expect(page.locator('text=/video\/mp4/i')).toBeVisible();

    // 验证文件大小格式化
    const sizeText = await page.locator('.file-size').textContent();
    expect(sizeText).toMatch(/\d+\.\d+\s+(KB|MB|GB)/);
  });

  /**
   * TC-04: 测试元数据显示 - MP3音频
   */
  test('TC-04: 应该正确显示MP3音频元数据', async ({ page }) => {
    await page.click('tr:has-text("MP3测试") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/audio/i').first().click();
    await page.waitForSelector('.dm-preview-modal', { timeout: 3000 });

    // 验证MIME类型
    await expect(page.locator('text=/audio\/mpeg/i')).toBeVisible();
  });

  /**
   * TC-05: 测试视频播放控制
   */
  test('TC-05: 应该能够播放和暂停视频', async ({ page }) => {
    await page.click('tr:has-text("视频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('video', { timeout: 3000 });

    const video = await page.locator('video');

    // 播放视频
    await video.evaluate(el => el.play());
    await page.waitForTimeout(1000);

    // 验证视频正在播放
    const isPaused = await video.evaluate(el => el.paused);
    expect(isPaused).toBe(false);

    // 暂停视频
    await video.evaluate(el => el.pause());

    // 验证视频已暂停
    const isPausedAfter = await video.evaluate(el => el.paused);
    expect(isPausedAfter).toBe(true);
  });

  /**
   * TC-06: 测试音频播放控制
   */
  test('TC-06: 应该能够播放和暂停音频', async ({ page }) => {
    await page.click('tr:has-text("音频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/audio/i').first().click();
    await page.waitForSelector('audio', { timeout: 3000 });

    const audio = await page.locator('audio');

    // 播放音频
    await audio.evaluate(el => el.play());
    await page.waitForTimeout(1000);

    // 验证音频正在播放
    const isPaused = await audio.evaluate(el => el.paused);
    expect(isPaused).toBe(false);

    // 暂停音频
    await audio.evaluate(el => el.pause());

    // 验证音频已暂停
    const isPausedAfter = await audio.evaluate(el => el.paused);
    expect(isPausedAfter).toBe(true);
  });

  /**
   * TC-07: 测试视频时长显示
   */
  test('TC-07: 应该在元数据加载后显示视频时长', async ({ page }) => {
    await page.click('tr:has-text("视频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('video', { timeout: 3000 });

    // 等待元数据加载
    await page.waitForTimeout(2000);

    // 验证时长显示（格式：mm:ss 或 h:mm:ss）
    const durationText = await page.locator('.media-duration').textContent();
    expect(durationText).toMatch(/\d+:\d{2}(:\d{2})?/);
  });

  /**
   * TC-08: 测试音频时长显示
   */
  test('TC-08: 应该在元数据加载后显示音频时长', async ({ page }) => {
    await page.click('tr:has-text("音频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/audio/i').first().click();
    await page.waitForSelector('audio', { timeout: 3000 });

    // 等待元数据加载
    await page.waitForTimeout(2000);

    // 验证时长显示
    const durationText = await page.locator('.media-duration').textContent();
    expect(durationText).toMatch(/\d+:\d{2}/);
  });

  /**
   * TC-09: 测试模态框关闭时停止播放
   */
  test('TC-09: 关闭模态框应该停止媒体播放', async ({ page }) => {
    await page.click('tr:has-text("视频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('video', { timeout: 3000 });

    const video = await page.locator('video');

    // 播放视频
    await video.evaluate(el => el.play());
    await page.waitForTimeout(1000);

    // 关闭模态框
    await page.click('.ant-modal-close');

    // 重新打开模态框
    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('video', { timeout: 3000 });

    const videoAfter = await page.locator('video');

    // 验证视频已重置（currentTime = 0）
    const currentTime = await videoAfter.evaluate(el => el.currentTime);
    expect(currentTime).toBe(0);
  });

  /**
   * TC-10: 测试错误处理 - 文件不存在
   */
  test('TC-10: 应该正确处理文件不存在的情况', async ({ page }) => {
    // 监听控制台错误
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.click('tr:has-text("损坏DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('.dm-preview-modal', { timeout: 3000 });

    // 等待错误触发
    await page.waitForTimeout(2000);

    // 验证错误被记录
    expect(consoleMessages.some(msg => msg.includes('媒体加载失败'))).toBe(true);
  });

  /**
   * TC-11: 测试多个媒体切换
   */
  test('TC-11: 应该能够在多个媒体之间切换', async ({ page }) => {
    await page.click('tr:has-text("混合媒体DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    // 点击第一个视频
    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('video', { timeout: 3000 });
    await expect(page.locator('video')).toBeVisible();

    // 关闭模态框
    await page.click('.ant-modal-close');

    // 点击音频
    await page.locator('text=/audio/i').first().click();
    await page.waitForSelector('audio', { timeout: 3000 });
    await expect(page.locator('audio')).toBeVisible();

    // 验证视频播放器已消失
    await expect(page.locator('video')).not.toBeVisible();
  });

  /**
   * TC-12: 测试Range请求支持（视频跳转）
   */
  test('TC-12: 应该支持视频拖动跳转（Range请求）', async ({ page }) => {
    await page.click('tr:has-text("视频测试DM") .ant-btn:has-text("编辑")');
    await page.waitForSelector('.dm-editor', { timeout: 5000 });

    await page.locator('text=/video/i').first().click();
    await page.waitForSelector('video', { timeout: 3000 });

    const video = await page.locator('video');

    // 等待元数据加载
    await page.waitForTimeout(2000);

    // 跳转到视频中间位置
    await video.evaluate(el => {
      el.currentTime = el.duration / 2;
    });

    await page.waitForTimeout(1000);

    // 验证跳转成功
    const currentTime = await video.evaluate(el => el.currentTime);
    const duration = await video.evaluate(el => el.duration);

    expect(currentTime).toBeGreaterThan(0);
    expect(currentTime).toBeLessThan(duration);
  });
});
