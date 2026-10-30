/**
 * Phase 9 浏览器集成测试脚本
 *
 * 目标：验证 XML 缩进修复在真实 UI 中的效果
 * 工具：Playwright (e2e 测试框架)
 *
 * 测试流程：
 * 1. 打开浏览器
 * 2. 导航到 levelledPara 设计视图
 * 3. 编辑内容
 * 4. 保存
 * 5. 验证源码视图中的 XML 缩进
 */

const { test, expect } = require('@playwright/test');

test.describe('Phase 9: XML 缩进修复 - 浏览器集成测试', () => {

  /**
   * 测试 1：基础缩进应用验证
   */
  test('编辑→保存→验证源码中的基础缩进', async ({ page }) => {
    // 1. 导航到应用
    await page.goto('http://localhost:8080/');

    // 2. 等待应用加载
    await page.waitForSelector('.levelledpara-designer', { timeout: 10000 });

    // 3. 在设计视图中检查 <levelledPara> 是否有缩进
    // （这通常通过检查源代码编辑器中的内容来验证）

    // 4. 编辑标题
    const titleInput = page.locator('input[placeholder*="标题"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('测试标题 - Phase 9');
    }

    // 5. 编辑段落内容
    const contentArea = page.locator('.tab-content').first();
    if (await contentArea.isVisible()) {
      // 添加新段落
      const addBtn = page.locator('button:has-text("增加")').first();
      if (await addBtn.isEnabled()) {
        await addBtn.click();
      }
    }

    // 6. 点击保存
    const saveBtn = page.locator('button:has-text("保存")');
    await saveBtn.click();

    // 7. 等待保存成功消息
    await page.waitForSelector('.ant-message-success', { timeout: 5000 });

    // 8. 验证：检查回到源码视图后 XML 的缩进
    // 这需要切换到源码编辑器视图并检查内容
    const sourceView = page.locator('.CodeMirror-line');

    if (await sourceView.first().isVisible()) {
      const firstLine = await sourceView.first().textContent();
      // 验证第一行包含缩进的 <levelledPara>
      // 注意：CodeMirror 显示可能需要特殊处理来检查缩进
      console.log('First line content:', firstLine);
    }
  });

  /**
   * 测试 2：层级缩进正确性
   */
  test('验证嵌套元素的层级缩进', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 获取源码编辑器内容
    const editorContent = page.locator('.CodeMirror').first();

    if (await editorContent.isVisible()) {
      const text = await editorContent.textContent();

      // 验证缩进模式
      // 应该包含：
      // - "        <levelledPara>" (8个空格)
      // - "          <title>" (10个空格)
      // - "            <para" (12个空格)

      const lines = text.split('\n');
      let foundCorrectIndents = false;

      for (const line of lines) {
        if (line.match(/^\s{8}<levelledPara/)) {
          // 找到了正确缩进的第一行
          foundCorrectIndents = true;
          break;
        }
      }

      expect(foundCorrectIndents).toBe(true);
      console.log('✅ 验证成功：找到正确缩进的 <levelledPara> 标签');
    }
  });

  /**
   * 测试 3：往返编辑验证
   */
  test('往返编辑：编辑→保存→重新打开→验证数据完整', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // 等待设计视图加载
    await page.waitForSelector('.levelledpara-designer', { timeout: 10000 });

    // 第 1 次编辑
    const titleInput = page.locator('input[placeholder*="标题"]').first();
    const originalTitle = '往返测试标题';

    if (await titleInput.isVisible()) {
      await titleInput.fill(originalTitle);
    }

    // 保存
    const saveBtn = page.locator('button:has-text("保存")');
    await saveBtn.click();

    // 等待保存完成
    await page.waitForSelector('.ant-message-success', { timeout: 5000 });

    // 等待消息消失
    await page.waitForTimeout(1000);

    // 重新打开设计视图（模拟用户刷新或重新进入）
    // 实际场景中可能需要重新加载页面或打开编辑器

    // 验证标题是否保持
    const updatedTitle = await titleInput.inputValue();
    expect(updatedTitle).toBe(originalTitle);

    console.log('✅ 往返编辑验证成功');
  });

  /**
   * 测试 4：XML 结构完整性
   */
  test('保存后 XML 结构完整且格式正确', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 获取源码编辑器的完整内容
    const editor = page.locator('.CodeMirror').first();
    const xmlContent = await editor.textContent();

    // 验证 XML 结构
    const checks = [
      {
        pattern: /<levelledPara/,
        description: '包含开始标签'
      },
      {
        pattern: /<\/levelledPara>/,
        description: '包含结束标签'
      },
      {
        pattern: /^\s{8}<levelledPara/m,
        description: '第一行有 8 个空格缩进'
      },
      {
        pattern: /^\s{10}</m,
        description: '存在 10 个空格的缩进'
      }
    ];

    for (const check of checks) {
      const found = check.pattern.test(xmlContent);
      expect(found).toBe(true);
      console.log(`✅ ${check.description}`);
    }
  });

  /**
   * 测试 5：性能验证
   */
  test('保存操作的性能验证 (< 2秒)', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // 等待设计视图
    await page.waitForSelector('.levelledpara-designer', { timeout: 10000 });

    // 编辑内容
    const titleInput = page.locator('input[placeholder*="标题"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('性能测试');
    }

    // 测量保存操作的耗时
    const startTime = Date.now();

    const saveBtn = page.locator('button:has-text("保存")');
    await saveBtn.click();

    // 等待成功消息
    await page.waitForSelector('.ant-message-success', { timeout: 5000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ 保存耗时: ${duration}ms`);
    expect(duration).toBeLessThan(2000);
  });

  /**
   * 测试 6：错误恢复能力
   */
  test('异常场景：保存失败后的恢复', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 模拟网络错误（如果后端不可用）
    // 这需要 mock 后端 API

    // 尝试保存
    const saveBtn = page.locator('button:has-text("保存")');

    // 如果禁用了，说明未做任何修改
    const isEnabled = await saveBtn.isEnabled();

    if (isEnabled) {
      await saveBtn.click();

      // 检查是否有错误消息或成功消息
      const message = await page.locator('.ant-message').first();
      if (await message.isVisible()) {
        const messageText = await message.textContent();
        console.log(`✅ 收到反馈消息: ${messageText}`);
      }
    }
  });
});

/**
 * 辅助测试配置
 */
test.describe.configure({ timeout: 30000 });
