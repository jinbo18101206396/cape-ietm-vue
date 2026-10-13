/**
 * UEditor完整工具栏按钮验证测试
 */
import { test, expect } from '@playwright/test';

test('验证UEditor完整工具栏包含所有必需按钮', async ({ page }) => {
  // 访问测试页面
  await page.goto('http://localhost:3000/test-ueditor-full-toolbar.html');

  // 等待UEditor初始化完成
  await page.waitForSelector('#result', { timeout: 10000 });

  // 等待结果显示
  await page.waitForTimeout(2000);

  // 截图保存结果
  await page.screenshot({ path: 'test-toolbar-result.png', fullPage: true });

  // 获取测试结果
  const resultHtml = await page.locator('#result').innerHTML();
  console.log('测试结果HTML:', resultHtml);

  // 检查是否有错误（红色背景）
  const hasError = await page.locator('#result.error').count() > 0;

  // 提取按钮检查结果
  const checkResult = await page.evaluate(() => {
    const resultDiv = document.getElementById('result');
    return {
      html: resultDiv.innerHTML,
      className: resultDiv.className
    };
  });

  console.log('检查结果:', JSON.stringify(checkResult, null, 2));

  // 断言：不应该有错误
  expect(hasError).toBe(false);

  console.log('✅ 所有必需按钮都已包含在工具栏中');
});
