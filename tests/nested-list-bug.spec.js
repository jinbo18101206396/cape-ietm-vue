/**
 * 三级嵌套列表bug测试
 *
 * 问题描述：
 * 1. 在para设计视图中插入三级有序列表
 * 2. 保存后生成的XML将嵌套列表直接放在para内部
 * 3. 再次点击铅笔图标加载内容时，报错"Cannot read properties of undefined (reading 'dom')"
 *
 * 预期行为：
 * - 能够正常加载和编辑包含嵌套列表的para内容
 * - XML结构符合S1000D标准
 */

const { test, expect } = require('@playwright/test');

test.describe('三级嵌套列表问题排查', () => {
  test.beforeEach(async ({ page }) => {
    // 设置更长的超时时间
    test.setTimeout(120000);

    // 访问DM内容编辑页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2120391209032593409?mode=edit&dmc=DMC-ZB1-A-01-00-00-00A-007A-A_001-02_zh-CN');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

  test('步骤1-4：创建三级嵌套列表并保存', async ({ page }) => {
    console.log('步骤1: 等待页面加载...');

    // 等待编辑器加载（可能需要等待CodeMirror初始化）
    await page.waitForTimeout(3000);

    console.log('步骤2: 查找第69行的铅笔图标...');

    // 方法1: 通过行号定位（如果有行号显示）
    // 方法2: 通过文本内容定位
    // 方法3: 通过索引定位（第69个编辑按钮）

    // 尝试定位铅笔图标（编辑按钮）
    const editButtons = page.locator('button[title*="编辑"], a[title*="编辑"], .edit-icon, [class*="pencil"]');
    const count = await editButtons.count();
    console.log(`找到 ${count} 个编辑按钮`);

    if (count === 0) {
      // 尝试截图帮助诊断
      await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step1-no-edit-buttons.png', fullPage: true });
      throw new Error('未找到编辑按钮，请检查页面是否正确加载');
    }

    // 点击第69行的编辑按钮（这里假设是第69个，需要根据实际情况调整）
    // 由于我们不确定具体是哪个，让我们先截图看看页面结构
    await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step1-page-loaded.png', fullPage: true });

    // 尝试点击第一个编辑按钮进行测试
    await editButtons.first().click();

    console.log('步骤3: 等待Para设计器打开...');
    await page.waitForTimeout(2000);

    // 截图Para设计器
    await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step2-para-designer-opened.png', fullPage: true });

    // 查找UEditor工具栏中的有序列表按钮
    console.log('步骤4: 查找有序列表按钮...');
    const orderedListButton = page.locator('.edui-for-insertorderedlist, button[title*="有序列表"], [class*="ordered-list"]');
    const olButtonCount = await orderedListButton.count();
    console.log(`找到 ${olButtonCount} 个有序列表按钮`);

    if (olButtonCount > 0) {
      // 点击有序列表按钮3次创建三级列表
      for (let i = 0; i < 3; i++) {
        await orderedListButton.first().click();
        await page.waitForTimeout(500);
      }

      // 在编辑器中输入文本
      const editor = page.locator('.edui-body-container iframe').contentFrame();
      if (editor) {
        await editor.locator('body').click();
        await page.keyboard.type('一级');
        await page.keyboard.press('Enter');
        await page.keyboard.type('二级');
        await page.keyboard.press('Enter');
        await page.keyboard.type('三级');
      }

      await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step3-text-entered.png', fullPage: true });
    }

    console.log('步骤5: 点击保存按钮...');
    const saveButton = page.locator('button:has-text("保存"), .save-button, [class*="save"]').first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step4-after-save.png', fullPage: true });
  });

  test('步骤5-7：重新加载para内容触发错误', async ({ page }) => {
    console.log('测试：重新点击铅笔图标加载嵌套列表内容');

    // 等待页面加载
    await page.waitForTimeout(3000);

    // 查找包含嵌套列表的para行（这里需要根据实际情况定位）
    // 方法1: 通过内容搜索
    // 方法2: 通过XML结构搜索

    // 尝试定位编辑按钮
    const editButtons = page.locator('button[title*="编辑"], a[title*="编辑"], .edit-icon, [class*="pencil"]');

    // 监听控制台错误
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('控制台错误:', msg.text());
      }
    });

    // 监听页面错误
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.error('页面错误:', error.message);
    });

    // 点击编辑按钮
    await editButtons.first().click();
    await page.waitForTimeout(3000);

    // 截图当前状态
    await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step5-reload-attempt.png', fullPage: true });

    // 检查是否有错误
    console.log('捕获到的控制台错误:', consoleErrors);
    console.log('捕获到的页面错误:', pageErrors);

    // 查找错误消息
    const hasTargetError = [...consoleErrors, ...pageErrors].some(err =>
      err.includes("Cannot read properties of undefined") && err.includes("dom")
    );

    if (hasTargetError) {
      console.log('✅ 成功重现了目标错误');
    } else {
      console.log('❌ 未能重现错误，可能已被修复或条件不满足');
    }

    // 检查是否显示了错误提示
    const errorMessage = page.locator('.ant-message-error, .el-message--error, [class*="error-message"]');
    const hasErrorUI = await errorMessage.count() > 0;

    if (hasErrorUI) {
      const errorText = await errorMessage.first().textContent();
      console.log('界面错误提示:', errorText);
    }

    // 即使有错误，也记录当前状态供分析
    await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\step6-final-state.png', fullPage: true });
  });

  test('诊断：检查XML结构', async ({ page }) => {
    console.log('诊断测试：检查生成的XML结构');

    await page.waitForTimeout(3000);

    // 切换到XML视图模式（如果有的话）
    const xmlViewButton = page.locator('button:has-text("格式化"), button:has-text("XML"), [class*="xml-view"]');
    const hasXmlView = await xmlViewButton.count() > 0;

    if (hasXmlView) {
      await xmlViewButton.first().click();
      await page.waitForTimeout(1000);

      // 截图XML视图
      await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\diagnostic-xml-view.png', fullPage: true });

      // 尝试提取XML内容
      const xmlContent = page.locator('.CodeMirror-code, pre, [class*="xml-content"]');
      if (await xmlContent.count() > 0) {
        const xmlText = await xmlContent.first().textContent();
        console.log('XML内容（前500字符）:', xmlText.substring(0, 500));

        // 检查是否包含嵌套的sequentialList
        if (xmlText.includes('<sequentialList>')) {
          console.log('✅ 找到了sequentialList标签');

          // 分析嵌套层级
          const matches = xmlText.match(/<sequentialList>/g);
          if (matches) {
            console.log(`找到 ${matches.length} 个<sequentialList>标签`);
          }
        }
      }
    }
  });
});

test.describe('修复验证：嵌套列表处理', () => {
  test('验证paraConverter能正确处理嵌套列表', async ({ page }) => {
    // 创建一个测试页面来验证转换逻辑
    await page.goto('file:///' + 'D:/workspace/IETM/cape-ietm-vue/test_nested_list_issue.html'.replace(/\\/g, '/'));

    await page.waitForTimeout(2000);

    // 截图测试结果
    await page.screenshot({ path: 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\screenshots\\converter-test.png', fullPage: true });

    // 检查控制台输出
    const logs = [];
    page.on('console', msg => {
      logs.push(msg.text());
      console.log('测试页面输出:', msg.text());
    });

    await page.waitForTimeout(1000);

    // 检查是否成功
    const isConsistent = logs.some(log => log.includes('✅ 一致'));

    if (isConsistent) {
      console.log('✅ 往返转换一致，转换逻辑正常');
    } else {
      console.log('❌ 往返转换不一致，需要修复转换逻辑');
    }
  });
});
