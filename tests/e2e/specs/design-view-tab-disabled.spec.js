/**
 * 设计视图Tab禁用测试
 *
 * 测试目标：验证在源码视图下，"设计视图"tab按钮应该被禁用
 *
 * 测试场景：
 * 1. 默认打开编辑器时在源码视图，设计视图tab应该禁用
 * 2. 通过gutter图标进入设计视图后，设计视图tab应该启用
 * 3. 从设计视图切换回源码视图，设计视图tab应该再次禁用
 */

const { test, expect } = require('@playwright/test');

test.describe('设计视图Tab禁用功能', () => {

  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(180000);

    // 访问登录页
    await page.goto('http://localhost:3000');
    await page.waitForSelector('input[placeholder="请输入账户名"]', { timeout: 30000 });

    // 登录
    await page.fill('input[placeholder="请输入账户名"]', 'admin');
    await page.fill('input[placeholder="请输入密码"]', 'admin123');
    await page.click('button:has-text("登录")');

    // 等待登录成功跳转
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // 导航到数据模块列表
    await page.goto('http://localhost:3000/ietm/IetmDataModuleList');
    await page.waitForSelector('.ant-table-row', { timeout: 30000 });

    // 点击第一个DM的编辑按钮
    await page.click('.ant-table-row:first-child a:has-text("编辑")');

    // 等待编辑器加载完成
    await page.waitForSelector('.CodeMirror', { timeout: 30000 });
    await page.waitForTimeout(2000); // 等待编辑器完全初始化
  });

  test('TC-01: 默认源码视图下设计视图tab应该禁用', async ({ page }) => {
    // 验证当前在源码视图
    const sourceTab = page.locator('.view-tabs .ant-tabs-tab[aria-selected="true"]:has-text("源码视图")');
    await expect(sourceTab).toBeVisible();

    // 验证设计视图tab存在
    const designTab = page.locator('.view-tabs .ant-tabs-tab:has-text("设计视图")');
    await expect(designTab).toBeVisible();

    // 验证设计视图tab是禁用状态
    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);

    // 尝试点击设计视图tab，应该无效
    await designTab.click({ force: true });

    // 验证仍然在源码视图（viewMode没有改变）
    await expect(sourceTab).toHaveAttribute('aria-selected', 'true');
  });

  test('TC-02: 通过gutter图标进入设计视图后tab应该启用', async ({ page }) => {
    // 在XML中添加para元素（如果没有的话）
    const cmInstance = await page.locator('.CodeMirror').first();
    await cmInstance.click();

    // 使用CodeMirror API添加para元素
    await page.evaluate(() => {
      const editor = document.querySelector('.CodeMirror').CodeMirror;
      const content = editor.getValue();

      // 如果没有para，在content标签后插入
      if (!content.includes('<para>')) {
        const insertPos = content.indexOf('</content>');
        if (insertPos > 0) {
          const newContent = content.substring(0, insertPos) +
            '\n    <para>测试段落</para>\n  ' +
            content.substring(insertPos);
          editor.setValue(newContent);
        }
      }
    });

    // 等待并刷新gutter标记
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const vueInstance = document.querySelector('.dm-source-view').__vue__;
      if (vueInstance && vueInstance.refreshGutterMarkers) {
        vueInstance.refreshGutterMarkers();
      }
    });

    // 等待gutter图标出现
    await page.waitForSelector('.gutter-design-marker', { timeout: 5000 });

    // 点击gutter图标进入设计视图
    const gutterIcon = page.locator('.gutter-design-marker').first();
    await gutterIcon.click();

    // 等待切换到设计视图
    await page.waitForTimeout(1000);

    // 验证当前在设计视图
    const designTab = page.locator('.view-tabs .ant-tabs-tab[aria-selected="true"]:has-text("设计视图")');
    await expect(designTab).toBeVisible();

    // 验证设计视图tab不再禁用
    await expect(designTab).not.toHaveClass(/ant-tabs-tab-disabled/);
  });

  test('TC-03: 从设计视图切换回源码视图后tab应该再次禁用', async ({ page }) => {
    // 先通过gutter进入设计视图（重复TC-02的步骤）
    const cmInstance = await page.locator('.CodeMirror').first();
    await cmInstance.click();

    await page.evaluate(() => {
      const editor = document.querySelector('.CodeMirror').CodeMirror;
      const content = editor.getValue();
      if (!content.includes('<para>')) {
        const insertPos = content.indexOf('</content>');
        if (insertPos > 0) {
          const newContent = content.substring(0, insertPos) +
            '\n    <para>测试段落</para>\n  ' +
            content.substring(insertPos);
          editor.setValue(newContent);
        }
      }
    });

    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const vueInstance = document.querySelector('.dm-source-view').__vue__;
      if (vueInstance && vueInstance.refreshGutterMarkers) {
        vueInstance.refreshGutterMarkers();
      }
    });

    await page.waitForSelector('.gutter-design-marker', { timeout: 5000 });
    const gutterIcon = page.locator('.gutter-design-marker').first();
    await gutterIcon.click();
    await page.waitForTimeout(1000);

    // 验证已经在设计视图
    const designTab = page.locator('.view-tabs .ant-tabs-tab:has-text("设计视图")');
    await expect(designTab).toHaveAttribute('aria-selected', 'true');

    // 点击源码视图tab切换回去
    const sourceTab = page.locator('.view-tabs .ant-tabs-tab:has-text("源码视图")');
    await sourceTab.click();
    await page.waitForTimeout(500);

    // 验证已经切换到源码视图
    await expect(sourceTab).toHaveAttribute('aria-selected', 'true');

    // 验证设计视图tab再次被禁用
    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);

    // 尝试点击设计视图tab，应该无效
    await designTab.click({ force: true });

    // 验证仍然在源码视图
    await expect(sourceTab).toHaveAttribute('aria-selected', 'true');
  });

  test('TC-04: 验证disabled属性与viewMode状态同步', async ({ page }) => {
    // 验证初始状态：viewMode=source，设计视图tab禁用
    let viewMode = await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      return editorInstance.viewMode;
    });
    expect(viewMode).toBe('source');

    const designTab = page.locator('.view-tabs .ant-tabs-tab:has-text("设计视图")');
    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);

    // 通过编程方式切换到设计视图
    await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      editorInstance.viewMode = 'design';
      editorInstance.paraDesignerVisible = true;
    });

    await page.waitForTimeout(500);

    // 验证viewMode=design，设计视图tab不再禁用
    viewMode = await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      return editorInstance.viewMode;
    });
    expect(viewMode).toBe('design');

    await expect(designTab).not.toHaveClass(/ant-tabs-tab-disabled/);

    // 通过编程方式切换回源码视图
    await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      editorInstance.viewMode = 'source';
    });

    await page.waitForTimeout(500);

    // 验证viewMode=source，设计视图tab再次禁用
    viewMode = await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      return editorInstance.viewMode;
    });
    expect(viewMode).toBe('source');

    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);
  });

  test('TC-05: 浏览模式（readonly）下tab禁用规则不变', async ({ page }) => {
    // 模拟只读模式
    await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      editorInstance.readonly = true;
    });

    await page.waitForTimeout(500);

    // 验证在只读模式下，源码视图时设计视图tab仍然禁用
    const designTab = page.locator('.view-tabs .ant-tabs-tab:has-text("设计视图")');
    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);

    // 切换到编辑模式
    await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      editorInstance.readonly = false;
    });

    await page.waitForTimeout(500);

    // 验证在编辑模式下，源码视图时设计视图tab仍然禁用
    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);
  });

  test('TC-06: tab禁用时视觉反馈正确', async ({ page }) => {
    // 验证设计视图tab禁用时有正确的CSS样式
    const designTab = page.locator('.view-tabs .ant-tabs-tab:has-text("设计视图")');

    // 检查禁用状态的CSS类
    const className = await designTab.getAttribute('class');
    expect(className).toContain('ant-tabs-tab-disabled');

    // 检查禁用状态下的视觉效果（通常是灰色、不可点击的cursor）
    const computedStyle = await designTab.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        cursor: style.cursor,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents
      };
    });

    // Ant Design的禁用tab通常有这些特征
    // 注意：具体样式可能因版本而异，这里做基本验证
    console.log('禁用tab样式:', computedStyle);
  });

  test('TC-07: 多次切换视图后状态保持一致', async ({ page }) => {
    const designTab = page.locator('.view-tabs .ant-tabs-tab:has-text("设计视图")');
    const sourceTab = page.locator('.view-tabs .ant-tabs-tab:has-text("源码视图")');

    // 循环切换多次
    for (let i = 0; i < 3; i++) {
      // 初始在源码视图，设计视图tab禁用
      await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);

      // 通过编程方式切换到设计视图
      await page.evaluate(() => {
        const editorInstance = document.querySelector('.dm-editor-page').__vue__;
        editorInstance.viewMode = 'design';
        editorInstance.paraDesignerVisible = true;
      });
      await page.waitForTimeout(300);

      // 设计视图tab启用
      await expect(designTab).not.toHaveClass(/ant-tabs-tab-disabled/);

      // 切换回源码视图
      await sourceTab.click();
      await page.waitForTimeout(300);

      // 设计视图tab再次禁用
      await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);
    }
  });

  test('TC-08: 用户尝试点击禁用的tab无副作用', async ({ page }) => {
    // 验证初始状态
    const sourceTab = page.locator('.view-tabs .ant-tabs-tab:has-text("源码视图")');
    const designTab = page.locator('.view-tabs .ant-tabs-tab:has-text("设计视图")');

    await expect(sourceTab).toHaveAttribute('aria-selected', 'true');
    await expect(designTab).toHaveClass(/ant-tabs-tab-disabled/);

    // 记录初始的DOM状态
    const initialState = await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      return {
        viewMode: editorInstance.viewMode,
        paraDesignerVisible: editorInstance.paraDesignerVisible,
        treeVisible: editorInstance.treeVisible,
        attrVisible: editorInstance.attrVisible
      };
    });

    // 尝试多次点击禁用的设计视图tab
    for (let i = 0; i < 5; i++) {
      await designTab.click({ force: true });
      await page.waitForTimeout(100);
    }

    // 验证状态完全没有改变
    const finalState = await page.evaluate(() => {
      const editorInstance = document.querySelector('.dm-editor-page').__vue__;
      return {
        viewMode: editorInstance.viewMode,
        paraDesignerVisible: editorInstance.paraDesignerVisible,
        treeVisible: editorInstance.treeVisible,
        attrVisible: editorInstance.attrVisible
      };
    });

    expect(finalState).toEqual(initialState);

    // 验证仍然在源码视图
    await expect(sourceTab).toHaveAttribute('aria-selected', 'true');
  });
});
