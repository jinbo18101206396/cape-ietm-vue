const { test, expect } = require('@playwright/test');

/**
 * IllustratedPartsCatalog XML 生成和校验测试
 * 验证 S1000D 4.0 IPD Schema 符合性
 */
test.describe('IllustratedPartsCatalog XML Generation', () => {

  test.beforeEach(async ({ page }) => {
    // 1. 访问登录页面
    await page.goto('http://localhost:3000/');

    // 2. 登录
    await page.fill('input[placeholder*="账户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', '123456');
    await page.click('button:has-text("登 录")');

    // 3. 等待登录成功并跳转
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });

    // 4. 访问目标 DM 编辑页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN');

    // 5. 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('应该生成符合 S1000D Schema 的 catalogSeqNumber XML 结构', async ({ page }) => {
    // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
    await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
    await page.waitForTimeout(2000);

    // 2. 验证设计视图已加载
    await expect(page.locator('text=图解零部件')).toBeVisible();

    // 3. 验证目录表格中有数据
    const tableVisible = await page.locator('table').count();
    expect(tableVisible).toBeGreaterThan(0);

    // 4. 点击保存按钮生成 XML
    await page.click('.ipc-toolbar button:has-text("保存")');
    await page.waitForTimeout(3000);

    // 5. 切换到源码视图查看生成的 XML
    await page.click('div[role="tab"]:has-text("源码视图")');
    await page.waitForTimeout(1000);

    // 6. 获取 XML 内容
    const xmlContent = await page.locator('.CodeMirror').evaluate(el => {
      return el.CodeMirror.getValue();
    });

    console.log('Generated XML:', xmlContent);

    // 7. 验证 XML 结构
    // 7.1 验证包含 catalogSeqNumber
    expect(xmlContent).toContain('<catalogSeqNumber');
    expect(xmlContent).toContain('</catalogSeqNumber>');

    // 7.2 验证包含 itemSequenceNumber
    expect(xmlContent).toContain('<itemSequenceNumber');
    expect(xmlContent).toContain('</itemSequenceNumber>');

    // 7.3 验证包含 partIdentSegment (如果有数据)
    const hasPartIdentSegment = xmlContent.includes('<partIdentSegment>');
    if (hasPartIdentSegment) {
      // 验证 partIdentSegment 不为空
      expect(xmlContent).toMatch(/<partIdentSegment>\s*<descrForPart>[\s\S]*?<\/descrForPart>[\s\S]*?<\/partIdentSegment>/);

      // 验证 manufacturerCode 使用文本内容而非属性
      expect(xmlContent).not.toContain('manufacturerCodeValue=');

      // 验证元素顺序：partIdentSegment 应该在 partRef 之前
      const partIdentSegmentIndex = xmlContent.indexOf('<partIdentSegment>');
      const partRefIndex = xmlContent.indexOf('<partRef');
      if (partRefIndex > 0) {
        expect(partIdentSegmentIndex).toBeLessThan(partRefIndex);
      }
    }

    // 7.4 验证没有重复的 partIdentSegment
    const partIdentSegmentMatches = xmlContent.match(/<partIdentSegment>/g);
    if (partIdentSegmentMatches) {
      // 在同一个 itemSequenceNumber 中应该只有一个 partIdentSegment
      const itemSeqNumberMatches = xmlContent.match(/<itemSequenceNumber[^>]*>[\s\S]*?<\/itemSequenceNumber>/g);
      if (itemSeqNumberMatches) {
        itemSeqNumberMatches.forEach(itemSeq => {
          const segments = itemSeq.match(/<partIdentSegment>/g);
          if (segments) {
            expect(segments.length).toBeLessThanOrEqual(1);
          }
        });
      }
    }
  });

  test('应该通过 S1000D Schema 校验（0 个错误）', async ({ page }) => {
    // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
    await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
    await page.waitForTimeout(2000);

    // 2. 点击保存按钮生成 XML
    await page.click('.ipc-toolbar button:has-text("保存")');
    await page.waitForTimeout(3000);

    // 3. 切换到源码视图
    await page.click('div[role="tab"]:has-text("源码视图")');
    await page.waitForTimeout(1000);

    // 4. 点击校验按钮
    await page.click('button:has-text("校验")');

    // 5. 等待校验完成
    await page.waitForTimeout(3000);

    // 6. 验证校验结果对话框出现
    await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });

    // 7. 验证校验结果文本包含"0 个错误"
    const validationResult = await page.locator('.ant-modal-body').textContent();
    console.log('Validation Result:', validationResult);

    expect(validationResult).toContain('0 个错误');

    // 8. 截图保存校验结果
    await page.screenshot({
      path: 'tests/screenshots/validation-success.png',
      fullPage: true
    });

    // 9. 关闭校验对话框
    await page.keyboard.press('Escape');
  });

  test('应该正确处理 partIdentSegment 的子元素顺序', async ({ page }) => {
    // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
    await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
    await page.waitForTimeout(2000);

    // 2. 点击保存生成 XML
    await page.click('.ipc-toolbar button:has-text("保存")');
    await page.waitForTimeout(3000);

    // 3. 切换到源码视图
    await page.click('div[role="tab"]:has-text("源码视图")');
    await page.waitForTimeout(1000);

    // 4. 获取 XML 内容
    const xmlContent = await page.locator('.CodeMirror').evaluate(el => {
      return el.CodeMirror.getValue();
    });

    // 5. 使用正则表达式验证 itemSequenceNumber 的子元素顺序
    const itemSeqPattern = /<itemSequenceNumber[^>]*>([\s\S]*?)<\/itemSequenceNumber>/g;
    const matches = [...xmlContent.matchAll(itemSeqPattern)];

    expect(matches.length).toBeGreaterThan(0);

    matches.forEach(match => {
      const content = match[1];

      // 获取各元素的位置
      const partIdentSegmentPos = content.indexOf('<partIdentSegment>');
      const partRefPos = content.indexOf('<partRef');
      const quantityPos = content.indexOf('<quantityPerAssembly>');
      const uomPos = content.indexOf('<uom>');

      // 验证顺序：partIdentSegment (如果存在) < partRef < quantityPerAssembly < uom
      if (partIdentSegmentPos >= 0 && partRefPos >= 0) {
        expect(partIdentSegmentPos).toBeLessThan(partRefPos);
      }

      if (partRefPos >= 0 && quantityPos >= 0) {
        expect(partRefPos).toBeLessThan(quantityPos);
      }

      if (quantityPos >= 0 && uomPos >= 0) {
        expect(quantityPos).toBeLessThan(uomPos);
      }
    });
  });

  test('应该正确处理 manufacturerCode 的文本内容格式', async ({ page }) => {
    // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
    await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
    await page.waitForTimeout(2000);

    // 2. 点击保存生成 XML
    await page.click('.ipc-toolbar button:has-text("保存")');
    await page.waitForTimeout(3000);

    // 3. 切换到源码视图
    await page.click('div[role="tab"]:has-text("源码视图")');
    await page.waitForTimeout(1000);

    // 4. 获取 XML 内容
    const xmlContent = await page.locator('.CodeMirror').evaluate(el => {
      return el.CodeMirror.getValue();
    });

    // 5. 验证 manufacturerCode 格式
    if (xmlContent.includes('<manufacturerCode>')) {
      // 应该使用文本内容格式: <manufacturerCode>value</manufacturerCode>
      expect(xmlContent).toMatch(/<manufacturerCode>[^<]+<\/manufacturerCode>/);

      // 不应该使用属性格式: <manufacturerCode manufacturerCodeValue="..."/>
      expect(xmlContent).not.toContain('manufacturerCodeValue=');
    }
  });

  test('应该在 partIdentSegment 为空时不生成该元素', async ({ page }) => {
    // 这个测试验证当没有 descrForPart 和 manufacturerCode 数据时
    // 不应该生成空的 <partIdentSegment></partIdentSegment>

    // 1. 点击 illustratedPartsCatalog 铅笔图标进入设计视图
    await page.click('a[title="设计视图【illustratedPartsCatalog】"]');
    await page.waitForTimeout(2000);

    // 2. 点击保存生成 XML
    await page.click('.ipc-toolbar button:has-text("保存")');
    await page.waitForTimeout(3000);

    // 3. 切换到源码视图
    await page.click('div[role="tab"]:has-text("源码视图")');
    await page.waitForTimeout(1000);

    // 4. 获取 XML 内容
    const xmlContent = await page.locator('.CodeMirror').evaluate(el => {
      return el.CodeMirror.getValue();
    });

    // 5. 验证不存在空的 partIdentSegment
    expect(xmlContent).not.toMatch(/<partIdentSegment>\s*<\/partIdentSegment>/);
    expect(xmlContent).not.toMatch(/<partIdentSegment\/>/);
  });
});
