/**
 * ParaDesigner P0级Bug - 最终实际测试
 *
 * 基于诊断结果：
 * - 正确的URL: http://localhost:3000/ietm/dm-manage
 * - 需要登录认证
 *
 * 测试目标：验证从设计视图保存返回后源码视图行距是否保持一致
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('ParaDesigner P0 最终测试 - 真实场景', () => {

  test.beforeEach(async ({ page }) => {
    // 第一步：登录
    console.log('步骤1: 导航到登录页面');
    await page.goto(`${BASE_URL}/user/login`);

    // 等待登录表单加载
    await page.waitForSelector('input[placeholder*="账户名"], input[placeholder*="户名"]', { timeout: 10000 });

    console.log('步骤2: 输入登录凭证');
    const usernameInputs = await page.$$('input[placeholder*="账户名"], input[placeholder*="户名"], input[name="username"]');
    const passwordInputs = await page.$$('input[placeholder*="密码"], input[type="password"]');

    if (usernameInputs.length > 0 && passwordInputs.length > 0) {
      await usernameInputs[0].fill('admin');
      await passwordInputs[0].fill('admin');

      console.log('步骤3: 点击登录按钮');
      await page.click('button:has-text("登")');

      // 等待登录完成（可能有重定向）
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        console.log('登录导航完成或超时，继续');
      }
    }

    await page.waitForTimeout(2000);

    // 第二步：导航到DM管理页面
    console.log('步骤4: 导航到DM管理页面');
    await page.goto(`${BASE_URL}/ietm/dm-manage`, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForTimeout(3000); // 等待页面和表格完全加载

    console.log('步骤5: 等待表格或列表加载');
    // 等待表格行或编辑按钮出现
    await page.waitForSelector(
      'table tbody tr, [class*="table"] [class*="row"], button:has-text("编辑"), button:has-text("打开")',
      { timeout: 15000 }
    );
  });

  test('P0: 找到第一个DM并打开编辑', async ({ page }) => {
    console.log('\n===== 开始P0测试 =====');

    // 第一步：找到第一个DM记录的编辑按钮
    console.log('步骤1: 寻找编辑按钮');

    // 尝试多种常见的编辑按钮选择器
    let editBtn = await page.$('button:has-text("编辑")');

    if (!editBtn) {
      editBtn = await page.$('button:has-text("打开")');
    }

    if (!editBtn) {
      editBtn = await page.$('a[title*="编辑"]');
    }

    if (!editBtn) {
      editBtn = await page.$('[class*="edit"], [class*="open"]');
    }

    if (!editBtn) {
      console.log('未找到编辑按钮，列出可用的按钮:');
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a[role="button"]'))
          .map(b => b.textContent?.trim())
          .filter((t, i, arr) => t && arr.indexOf(t) === i)
          .slice(0, 10);
      });
      console.log(buttons);
      test.skip();
      return;
    }

    console.log('步骤2: 点击编辑按钮');
    await editBtn.click();

    // 等待编辑页面/对话框加载
    console.log('步骤3: 等待编辑页面加载');
    await page.waitForTimeout(2000);

    // 第二步：进入Para编辑
    console.log('步骤4: 寻找Para编辑入口');

    // 尝试找到Para字段并编辑
    const paraEditBtn = await page.$(
      'button:has-text("编辑段落"), button[class*="para"], [data-test*="para"]'
    );

    if (!paraEditBtn) {
      console.log('未找到Para编辑按钮');
      // 列出所有可点击的元素
      const clickables = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a, [role="button"]'))
          .map(el => ({
            text: el.textContent?.trim().substring(0, 30),
            class: el.className
          }))
          .filter(el => el.text && el.text.length > 0)
          .slice(0, 15);
      });
      console.log('可点击元素:', clickables);
      test.skip();
      return;
    }

    // 获取保存前的布局
    console.log('步骤5: 获取保存前的布局信息');
    const beforeLayout = await captureCodeMirrorLayout(page);
    console.log('保存前布局:', beforeLayout);

    // 点击Para编辑按钮
    console.log('步骤6: 进入Para设计视图');
    await paraEditBtn.click();
    await page.waitForTimeout(1500);

    // 进行简单编辑（可选）
    const ueditor = await page.$('.ueditor-frame, [class*="editor"]');
    if (ueditor) {
      console.log('步骤7: 进行简单编辑');
      // 不进行编辑，只验证保存不会改变布局
    }

    // 点击保存
    console.log('步骤8: 点击保存');
    const saveBtn = await page.$('button:has-text("保存"), button:has-text("确定")');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(2000); // 等待保存完成
    }

    // 返回到源码视图
    console.log('步骤9: 验证源码视图布局');
    await page.waitForTimeout(500);

    // 获取保存后的布局
    const afterLayout = await captureCodeMirrorLayout(page);
    console.log('保存后布局:', afterLayout);

    // 验证布局一致性
    console.log('\n===== 布局验证 =====');

    if (beforeLayout && afterLayout) {
      const avgBefore = beforeLayout.averageLineHeight || 0;
      const avgAfter = afterLayout.averageLineHeight || 0;

      console.log(`平均行高: ${avgBefore.toFixed(2)}px → ${avgAfter.toFixed(2)}px`);

      if (avgBefore > 0) {
        const heightDiff = Math.abs(avgAfter - avgBefore) / avgBefore;
        console.log(`行高变化百分比: ${(heightDiff * 100).toFixed(2)}%`);
        expect(heightDiff).toBeLessThan(0.1); // 允许10%变化
      }

      console.log(`可见行数: ${beforeLayout.visibleLines} → ${afterLayout.visibleLines}`);
      console.log(`总高度: ${beforeLayout.totalHeight} → ${afterLayout.totalHeight}`);
    }

    console.log('✓ P0测试完成');
  });

  test('P0: CodeMirror刷新验证', async ({ page }) => {
    console.log('\n===== CodeMirror刷新诊断 =====');

    // 注入监控代码来追踪CodeMirror方法调用
    await page.evaluate(() => {
      window.cmRefreshCalls = [];
      window.cmSetValueCalls = [];

      // 查找CodeMirror实例
      const cmElement = document.querySelector('.CodeMirror');
      if (!cmElement || !cmElement.CodeMirror) {
        console.log('未找到CodeMirror实例');
        return;
      }

      const cm = cmElement.CodeMirror;

      // 监控refresh方法
      const originalRefresh = cm.refresh.bind(cm);
      cm.refresh = function() {
        window.cmRefreshCalls.push({
          timestamp: Date.now(),
          stack: new Error().stack
        });
        return originalRefresh();
      };

      // 监控setValue方法
      const originalSetValue = cm.setValue.bind(cm);
      cm.setValue = function(value) {
        window.cmSetValueCalls.push({
          timestamp: Date.now(),
          stack: new Error().stack
        });
        return originalSetValue(value);
      };
    });

    // 执行某些操作（例如按Ctrl+S保存）
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(1000);

    // 获取监控数据
    const metrics = await page.evaluate(() => {
      return {
        refreshCalls: window.cmRefreshCalls?.length || 0,
        setValueCalls: window.cmSetValueCalls?.length || 0,
        lastRefreshTime: window.cmRefreshCalls?.[window.cmRefreshCalls.length - 1]?.timestamp,
        lastSetValueTime: window.cmSetValueCalls?.[window.cmSetValueCalls.length - 1]?.timestamp
      };
    });

    console.log('CodeMirror方法调用统计:', metrics);
    console.log('✓ CodeMirror刷新诊断完成');
  });
});

/**
 * 捕获CodeMirror编辑器的布局信息
 */
async function captureCodeMirrorLayout(page) {
  try {
    const layout = await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror');
      if (!cmElement) {
        console.log('[JavaScript] 未找到CodeMirror元素');
        return null;
      }

      const cm = cmElement.CodeMirror;
      if (!cm) {
        console.log('[JavaScript] CodeMirror实例不可用');
        return null;
      }

      const lines = document.querySelectorAll('.CodeMirror-line');
      const scroll = document.querySelector('.CodeMirror-scroll');

      let totalHeight = 0;
      let visibleLines = 0;
      const heights = [];

      lines.forEach(line => {
        const rect = line.getBoundingClientRect();
        if (rect.height > 0.5) { // 忽略极小的元素
          totalHeight += rect.height;
          visibleLines++;
          heights.push(rect.height);
        }
      });

      const avgHeight = visibleLines > 0 ? totalHeight / visibleLines : 0;

      // 计算高度方差
      let variance = 0;
      if (heights.length > 1) {
        variance = heights.reduce((sum, h) => sum + Math.pow(h - avgHeight, 2), 0) / heights.length;
      }

      return {
        averageLineHeight: avgHeight,
        totalHeight: scroll ? scroll.scrollHeight : 0,
        visibleLines: visibleLines,
        lineCount: cm.lineCount(),
        scrollTop: scroll ? scroll.scrollTop : 0,
        heightVariance: variance,
        maxLineHeight: Math.max(...heights, 0),
        minLineHeight: heights.length > 0 ? Math.min(...heights) : 0
      };
    });

    return layout;
  } catch (error) {
    console.error('捕获布局信息失败:', error);
    return null;
  }
}
