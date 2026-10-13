/**
 * CodeMirror scroller 高度修复验证测试
 *
 * 测试场景：从设计视图返回源码视图时，编辑器下方不应该出现空白区域
 * 根因：CodeMirror 的 scroller 高度缓存损坏，导致 scroller.offsetHeight < wrapper.offsetHeight
 */

const { test, expect } = require('@playwright/test');

test.describe('CodeMirror scroller 高度修复验证', () => {
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

  test('初始进入源码视图 - scroller高度应该正常（对照组）', async ({ page }) => {
    // 1. 找到第一个 DM 并进入编辑
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();

    // 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    await page.waitForTimeout(500); // 确保布局稳定

    // 2. 完整布局诊断
    const diagnostics = await page.evaluate(() => {
      const wrapper = document.querySelector('.CodeMirror');
      const scroller = document.querySelector('.CodeMirror-scroll');
      const sizer = document.querySelector('.CodeMirror-sizer');
      const gutters = document.querySelector('.CodeMirror-gutters');

      return {
        wrapper: {
          offsetHeight: wrapper?.offsetHeight || 0,
          clientHeight: wrapper?.clientHeight || 0,
          styleHeight: wrapper?.style.height || 'none'
        },
        scroller: {
          offsetHeight: scroller?.offsetHeight || 0,
          styleHeight: scroller?.style.height || 'none',
          computedHeight: scroller ? getComputedStyle(scroller).height : 'none'
        },
        sizer: {
          offsetHeight: sizer?.offsetHeight || 0
        },
        gutters: {
          offsetWidth: gutters?.offsetWidth || 0
        },
        blank: (wrapper?.offsetHeight || 0) - (scroller?.offsetHeight || 0)
      };
    });

    console.log('【对照组】初始进入源码视图的布局诊断:', diagnostics);

    // 验证：初始状态应该正常
    expect(diagnostics.wrapper.offsetHeight).toBeGreaterThan(500); // wrapper 高度合理
    expect(diagnostics.scroller.offsetHeight).toBeGreaterThan(500); // scroller 高度合理
    expect(diagnostics.blank).toBeLessThan(100); // 空白区域 < 100px（正常）
    expect(diagnostics.gutters.offsetWidth).toBeGreaterThan(50); // gutters 宽度正常

    console.log('✅ 初始状态布局正常');
  });

  test('从设计视图返回源码视图 - scroller高度应该修复（实验组）', async ({ page }) => {
    // 1. 进入编辑器
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });

    // 2. 记录初始状态（基准）
    const baselineDiagnostics = await page.evaluate(() => {
      const wrapper = document.querySelector('.CodeMirror');
      const scroller = document.querySelector('.CodeMirror-scroll');
      return {
        wrapperHeight: wrapper?.offsetHeight || 0,
        scrollerHeight: scroller?.offsetHeight || 0,
        blank: (wrapper?.offsetHeight || 0) - (scroller?.offsetHeight || 0)
      };
    });

    console.log('【实验组】初始基准:', baselineDiagnostics);

    // 3. 双击 para 进入设计视图
    const paraNode = page.locator('.ztree li:has-text("para")').first();
    await paraNode.dblclick();
    await page.waitForSelector('.para-designer', { timeout: 5000 });

    // 确认当前在设计视图
    const designTabActive = await page.locator('.view-tabs .ant-tabs-tab-active:has-text("设计视图")').isVisible();
    expect(designTabActive).toBe(true);

    // 4. 点击"保存"按钮返回源码视图
    await page.click('.para-designer button:has-text("保存")');

    // 等待返回源码视图
    await page.waitForTimeout(800); // 等待 forceFixGuttersLayout() 完成

    // 5. 完整布局诊断（返回后）
    const afterDiagnostics = await page.evaluate(() => {
      const wrapper = document.querySelector('.CodeMirror');
      const scroller = document.querySelector('.CodeMirror-scroll');
      const sizer = document.querySelector('.CodeMirror-sizer');
      const gutters = document.querySelector('.CodeMirror-gutters');

      return {
        wrapper: {
          offsetHeight: wrapper?.offsetHeight || 0,
          clientHeight: wrapper?.clientHeight || 0,
          styleHeight: wrapper?.style.height || 'none'
        },
        scroller: {
          offsetHeight: scroller?.offsetHeight || 0,
          styleHeight: scroller?.style.height || 'none',
          computedHeight: scroller ? getComputedStyle(scroller).height : 'none'
        },
        sizer: {
          offsetHeight: sizer?.offsetHeight || 0
        },
        gutters: {
          offsetWidth: gutters?.offsetWidth || 0
        },
        blank: (wrapper?.offsetHeight || 0) - (scroller?.offsetHeight || 0)
      };
    });

    console.log('【实验组】从设计视图返回后的布局诊断:', afterDiagnostics);

    // 6. 验证修复效果
    expect(afterDiagnostics.wrapper.offsetHeight).toBeGreaterThan(500); // wrapper 高度合理
    expect(afterDiagnostics.scroller.offsetHeight).toBeGreaterThan(500); // scroller 高度合理

    // 🔥 核心验证：空白区域应该 < 100px（如果 >= 100px 说明 scroller 高度异常）
    expect(afterDiagnostics.blank).toBeLessThan(100);

    expect(afterDiagnostics.gutters.offsetWidth).toBeGreaterThan(50); // gutters 宽度正常

    // 7. 对比修复前后，高度应该接近
    const heightDiff = Math.abs(afterDiagnostics.wrapper.offsetHeight - baselineDiagnostics.wrapperHeight);
    expect(heightDiff).toBeLessThan(100); // wrapper 高度变化不大

    console.log('✅ 从设计视图返回后，scroller 高度已修复，无空白区域');
  });

  test('多次进出设计视图 - scroller高度应该始终正常', async ({ page }) => {
    // 1. 进入编辑器
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });

    const paraNode = page.locator('.ztree li:has-text("para")').first();

    // 2. 多次进出设计视图
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- 第 ${i + 1} 次进出设计视图 ---`);

      // 进入设计视图
      await paraNode.dblclick();
      await page.waitForSelector('.para-designer', { timeout: 5000 });

      // 返回源码视图
      await page.click('.para-designer button:has-text("保存")');
      await page.waitForTimeout(800);

      // 测量
      const diagnostics = await page.evaluate(() => {
        const wrapper = document.querySelector('.CodeMirror');
        const scroller = document.querySelector('.CodeMirror-scroll');
        return {
          wrapperHeight: wrapper?.offsetHeight || 0,
          scrollerHeight: scroller?.offsetHeight || 0,
          blank: (wrapper?.offsetHeight || 0) - (scroller?.offsetHeight || 0)
        };
      });

      console.log(`第 ${i + 1} 次返回后:`, diagnostics);

      // 每次都应该正常
      expect(diagnostics.wrapperHeight).toBeGreaterThan(500);
      expect(diagnostics.scrollerHeight).toBeGreaterThan(500);
      expect(diagnostics.blank).toBeLessThan(100); // 🔥 核心验证
    }

    console.log('✅ 多次进出设计视图，scroller 高度始终正常');
  });

  test('验证 setSize() 调用生效', async ({ page }) => {
    // 监听控制台输出（如果有调试日志）
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('forceFixGuttersLayout') || text.includes('scroller')) {
        consoleLogs.push(text);
      }
    });

    // 1. 进入编辑器
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.locator('button:has-text("浏览或编辑DM内容")').click();
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });

    // 2. 进入设计视图
    const paraNode = page.locator('.ztree li:has-text("para")').first();
    await paraNode.dblclick();
    await page.waitForSelector('.para-designer', { timeout: 5000 });

    // 3. 返回源码视图
    await page.click('.para-designer button:has-text("保存")');
    await page.waitForTimeout(800);

    // 4. 验证 CodeMirror 的 size 属性被正确设置
    const sizeCheck = await page.evaluate(() => {
      const wrapper = document.querySelector('.CodeMirror');
      return {
        wrapperStyleHeight: wrapper?.style.height || 'none',
        wrapperStyleWidth: wrapper?.style.width || 'none'
      };
    });

    console.log('CodeMirror size 属性:', sizeCheck);
    console.log('捕获的控制台日志:', consoleLogs);

    // setSize('100%', '100%') 应该设置了这些属性
    expect(sizeCheck.wrapperStyleHeight).toBe('100%');
    expect(sizeCheck.wrapperStyleWidth).toBe('100%');

    console.log('✅ setSize() 调用已生效');
  });
});
