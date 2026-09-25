/**
 * CodeMirror 布局修复验证测试
 *
 * 测试场景：从设计视图切换到源码视图时，CodeMirror 布局应该正常
 */

const { test, expect } = require('@playwright/test');

test.describe('CodeMirror 布局修复验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login');
    await page.fill('input[placeholder="账号"]', 'admin');
    await page.fill('input[placeholder="密码"]', 'admin');
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });

    // 进入数据模块列表
    await page.goto('http://localhost:3000/ietm/IetmDataModuleManagementIndex');
    await page.waitForLoadState('networkidle');
  });

  test('从设计视图切换到源码视图，布局应该正常', async ({ page }) => {
    // 1. 找到第一个 DM 并进入编辑
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();

    // 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });

    // 2. 记录直接进入源码视图的布局（对照组）
    const directMeasurements = await page.evaluate(() => {
      const gutters = document.querySelector('.CodeMirror-gutters');
      const foldGutter = document.querySelector('.CodeMirror-foldgutter');
      const cmScroll = document.querySelector('.CodeMirror-scroll');

      return {
        guttersWidth: gutters?.offsetWidth || 0,
        foldGutterLeft: foldGutter?.offsetLeft || 0,
        scrollHeight: cmScroll?.offsetHeight || 0
      };
    });

    console.log('直接进入源码视图的测量:', directMeasurements);

    // 验证直接进入时布局正常
    expect(directMeasurements.guttersWidth).toBeGreaterThan(50);
    expect(directMeasurements.foldGutterLeft).toBe(44);
    expect(directMeasurements.scrollHeight).toBeGreaterThan(600);

    // 3. 双击 para 进入设计视图
    const paraNode = page.locator('.ztree li:has-text("para")').first();
    await paraNode.dblclick();

    // 等待设计视图加载
    await page.waitForSelector('.para-designer', { timeout: 5000 });

    // 确认当前在设计视图
    const designTabActive = await page.locator('.view-tabs .ant-tabs-tab-active:has-text("设计视图")').isVisible();
    expect(designTabActive).toBe(true);

    // 4. 点击"源码视图"标签切换回源码视图
    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")');

    // 等待切换完成和 rebuildEditor 执行
    // 使用多个等待策略确保重建完成
    await page.waitForTimeout(500); // 等待 requestAnimationFrame 完成

    // 等待 rebuildEditor 的日志出现
    await page.waitForFunction(() => {
      return performance.getEntriesByType('measure').length > 0 || true;
    }, { timeout: 2000 }).catch(() => {
      // 超时不影响测试，继续
    });

    // 5. 测量切换后的布局
    const switchedMeasurements = await page.evaluate(() => {
      const gutters = document.querySelector('.CodeMirror-gutters');
      const foldGutter = document.querySelector('.CodeMirror-foldgutter');
      const cmScroll = document.querySelector('.CodeMirror-scroll');
      const tabPane = document.querySelector('.CodeMirror')?.closest('.ant-tabs-tabpane');

      return {
        guttersWidth: gutters?.offsetWidth || 0,
        foldGutterLeft: foldGutter?.offsetLeft || 0,
        scrollHeight: cmScroll?.offsetHeight || 0,
        tabPaneDisplay: tabPane ? window.getComputedStyle(tabPane).display : 'N/A'
      };
    });

    console.log('切换后的测量:', switchedMeasurements);

    // 6. 验证修复效果
    expect(switchedMeasurements.tabPaneDisplay).not.toBe('none');
    expect(switchedMeasurements.guttersWidth).toBeGreaterThan(50);
    expect(switchedMeasurements.foldGutterLeft).toBe(44);
    expect(switchedMeasurements.scrollHeight).toBeGreaterThan(600);

    // 7. 对比两次测量，应该一致
    expect(Math.abs(switchedMeasurements.guttersWidth - directMeasurements.guttersWidth)).toBeLessThan(5);
    expect(switchedMeasurements.foldGutterLeft).toBe(directMeasurements.foldGutterLeft);
    expect(Math.abs(switchedMeasurements.scrollHeight - directMeasurements.scrollHeight)).toBeLessThan(50);

    console.log('✅ 布局修复验证通过！');
  });

  test('多次切换布局保持一致', async ({ page }) => {
    // 1. 进入编辑器
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });

    // 2. 进入设计视图
    const paraNode = page.locator('.ztree li:has-text("para")').first();
    await paraNode.dblclick();
    await page.waitForSelector('.para-designer', { timeout: 5000 });

    // 3. 多次切换测试
    const measurements = [];

    for (let i = 0; i < 3; i++) {
      // 切换到源码视图
      await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")');
      await page.waitForTimeout(500);

      // 测量
      const measurement = await page.evaluate(() => {
        const gutters = document.querySelector('.CodeMirror-gutters');
        const foldGutter = document.querySelector('.CodeMirror-foldgutter');
        const cmScroll = document.querySelector('.CodeMirror-scroll');

        return {
          guttersWidth: gutters?.offsetWidth || 0,
          foldGutterLeft: foldGutter?.offsetLeft || 0,
          scrollHeight: cmScroll?.offsetHeight || 0
        };
      });

      measurements.push(measurement);
      console.log(`第 ${i + 1} 次切换测量:`, measurement);

      // 验证每次都正常
      expect(measurement.guttersWidth).toBeGreaterThan(50);
      expect(measurement.foldGutterLeft).toBe(44);
      expect(measurement.scrollHeight).toBeGreaterThan(600);

      // 如果不是最后一次，切换回设计视图
      if (i < 2) {
        await paraNode.dblclick();
        await page.waitForSelector('.para-designer', { timeout: 5000 });
      }
    }

    // 4. 验证多次测量的一致性
    const firstMeasurement = measurements[0];
    for (let i = 1; i < measurements.length; i++) {
      expect(Math.abs(measurements[i].guttersWidth - firstMeasurement.guttersWidth)).toBeLessThan(5);
      expect(measurements[i].foldGutterLeft).toBe(firstMeasurement.foldGutterLeft);
      expect(Math.abs(measurements[i].scrollHeight - firstMeasurement.scrollHeight)).toBeLessThan(50);
    }

    console.log('✅ 多次切换布局保持一致！');
  });

  test('控制台应该显示正确的重建日志', async ({ page }) => {
    const consoleLogs = [];

    // 监听控制台输出
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('rebuildEditor') || text.includes('CodeMirror')) {
        consoleLogs.push(text);
      }
    });

    // 1. 进入编辑器并切换视图
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });

    const paraNode = page.locator('.ztree li:has-text("para")').first();
    await paraNode.dblclick();
    await page.waitForSelector('.para-designer', { timeout: 5000 });

    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")');
    await page.waitForTimeout(1000);

    // 2. 验证日志
    console.log('捕获的控制台日志:', consoleLogs);

    // 应该看到重建相关的日志
    const hasRebuildLog = consoleLogs.some(log =>
      log.includes('容器已可见，开始重建') ||
      log.includes('CodeMirror已重建')
    );

    // 不应该看到警告日志（说明没有重试）
    const hasWarningLog = consoleLogs.some(log =>
      log.includes('TabPane 仍然隐藏') ||
      log.includes('容器高度为 0')
    );

    expect(hasRebuildLog).toBe(true);
    expect(hasWarningLog).toBe(false);

    console.log('✅ 控制台日志正确！');
  });
});
