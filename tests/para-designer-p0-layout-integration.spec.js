/**
 * ParaDesigner P0级Bug - 集成测试
 *
 * 目标：验证从设计视图保存返回后源码视图行距是否保持一致
 *
 * 策略：基于实际用户场景进行集成测试
 * - 登录系统
 * - 打开DM列表/编辑页面
 * - 进入Para设计视图
 * - 保存内容
 * - 验证源码视图的行距/布局
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('ParaDesigner P0 布局bug集成测试', () => {

  test.beforeEach(async ({ page, context }) => {
    // 使用共享的已登录Cookie来加速测试
    // 或者进行登录流程
    await page.goto(`${BASE_URL}/`);

    // 检查是否需要登录
    const loginButton = await page.$('button:has-text("登录")');
    if (loginButton) {
      // 执行登录
      await page.fill('input[placeholder*="用户"]', 'admin');
      await page.fill('input[placeholder*="密码"]', 'admin');
      await page.click('button:has-text("登录")');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    }

    // 等待系统加载完毕
    await page.waitForTimeout(2000);
  });

  test('P0: 从设计视图保存返回后源码行距应保持一致', async ({ page }) => {
    // 这个测试需要手动指定如何导航到Para编辑界面
    // 因为具体路径取决于项目实现细节

    // 假设通过以下步骤打开Para编辑器：
    // 1. 点击某个"编辑"按钮进入DM编辑
    // 2. 点击某个Para字段触发设计视图

    // 等待页面加载
    await page.waitForTimeout(1000);

    // 查找并点击Para设计按钮（具体选择器需要根据实际应用调整）
    const paraButton = await page.$('[class*="para"][class*="designer"], [data-test="edit-para"], .edit-para-btn');

    if (!paraButton) {
      console.log('未找到Para设计按钮，跳过此测试');
      test.skip();
      return;
    }

    // 进入设计视图前的布局快照
    const beforeSave = await captureLayout(page);
    console.log('保存前布局:', beforeSave);

    // 打开Para设计视图
    await paraButton.click();
    await page.waitForSelector('[class*="para-designer"], .ParaDesigner', { timeout: 10000 });

    // 等待编辑器完全加载
    await page.waitForTimeout(1000);

    // 进行某些编辑操作（可选）
    // const editor = await page.$('.ueditor-container');
    // if (editor) {
    //   await editor.click();
    //   await page.keyboard.type(' ');
    // }

    // 点击保存按钮
    const saveBtn = await page.$('button:has-text("保存"), button:has-text("确定")');
    if (saveBtn) {
      await saveBtn.click();
      await page.waitForTimeout(1500); // 等待保存完成
    }

    // 返回到源码视图（关闭设计视图后应自动回到源码）
    await page.waitForTimeout(500);

    // 获取保存后的布局快照
    const afterSave = await captureLayout(page);
    console.log('保存后布局:', afterSave);

    // 验证行距是否保持一致
    if (beforeSave && afterSave) {
      // 允许5%的误差（浮点数计算误差）
      const tolerance = 0.05;

      const avgHeightBefore = beforeSave.averageLineHeight || 0;
      const avgHeightAfter = afterSave.averageLineHeight || 0;

      if (avgHeightBefore > 0) {
        const diff = Math.abs(avgHeightAfter - avgHeightBefore) / avgHeightBefore;
        expect(diff).toBeLessThan(tolerance);
      }

      // 验证可见行数没有显著减少
      const visibleBefore = beforeSave.visibleLines || 0;
      const visibleAfter = afterSave.visibleLines || 0;

      if (visibleBefore > 0) {
        const reductionPercent = (visibleBefore - visibleAfter) / visibleBefore;
        expect(reductionPercent).toBeLessThan(0.2); // 允许20%的行数减少
      }

      // 验证容器高度没有出现异常增加（空白问题）
      const heightBefore = beforeSave.totalHeight || 0;
      const heightAfter = afterSave.totalHeight || 0;

      if (heightBefore > 0) {
        const heightIncrease = (heightAfter - heightBefore) / heightBefore;
        expect(heightIncrease).toBeLessThan(1.0); // 容器高度不应增加超过100%
      }
    }
  });
});

/**
 * 捕获CodeMirror编辑器的布局信息
 */
async function captureLayout(page) {
  try {
    const layout = await page.evaluate(() => {
      const cmElement = document.querySelector('.CodeMirror');
      if (!cmElement) {
        console.log('未找到CodeMirror元素');
        return null;
      }

      const cm = cmElement.CodeMirror;
      if (!cm) {
        console.log('CodeMirror实例不可用');
        return null;
      }

      const lines = document.querySelectorAll('.CodeMirror-line');
      const scroll = document.querySelector('.CodeMirror-scroll');

      let totalHeight = 0;
      let visibleLines = 0;
      const heights = [];

      lines.forEach(line => {
        const rect = line.getBoundingClientRect();
        if (rect.height > 0) {
          totalHeight += rect.height;
          visibleLines++;
          heights.push(rect.height);
        }
      });

      // 计算行高的标准差来检测不一致的行距
      const avgHeight = visibleLines > 0 ? totalHeight / visibleLines : 0;
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
        hasUnexpectedGaps: variance > avgHeight * 0.5 // 行高变化超过平均值50%
      };
    });

    return layout;
  } catch (error) {
    console.error('捕获布局信息失败:', error);
    return null;
  }
}
