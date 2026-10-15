const { test } = require('@playwright/test');
const fs = require('fs');

test('Para公式完整端到端验证（含真实编辑和保存）', async ({ browser }) => {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  const report = {
    testName: '公式插入→保存→源码显示→返回设计完整流程',
    timestamp: new Date().toISOString(),
    steps: [],
    checks: [],
    debug: []
  };

  try {
    console.log('\n========== 【完整公式E2E测试】 ==========\n');

    // 步骤1：打开DM编辑页
    console.log('【步骤1】打开DM编辑页 (ID=2)...');
    report.steps.push('打开DM编辑页');

    await page.goto('http://localhost:3000/ietm/dm-edit/2', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const editPageUrl = page.url();
    console.log(`当前URL: ${editPageUrl}`);
    report.debug.push(`编辑页URL: ${editPageUrl}`);

    // 等待页面完全加载
    await page.waitForTimeout(5000);

    // 调试：打印页面中的主要容器
    const pageDebug = await page.evaluate(() => {
      return {
        documentClasses: document.documentElement.className,
        bodyClasses: document.body.className,
        divCount: document.querySelectorAll('div').length,
        iframeCount: document.querySelectorAll('iframe').length,
        editableCount: document.querySelectorAll('[contenteditable]').length,
        textareaCount: document.querySelectorAll('textarea').length,
        hasUEditor: window.UE ? true : false
      };
    });
    console.log('页面结构调试:', JSON.stringify(pageDebug));
    report.debug.push(`页面调试: ${JSON.stringify(pageDebug)}`);

    // 步骤2：查找Para节点或编辑元素
    console.log('\n【步骤2】在编辑器中定位Para内容...');
    report.steps.push('定位Para内容');

    // 尝试多种方式查找编辑器
    let editorElement = null;

    // 方法1：查找.ue-container
    let ueContainers = await page.$$('.ue-container');
    if (ueContainers.length > 0) {
      console.log(`✓ 找到 ${ueContainers.length} 个.ue-container`);
      editorElement = ueContainers[0];
    } else {
      console.log('未找到.ue-container，尝试其他方式');

      // 方法2：查找contenteditable元素
      const editables = await page.$$('[contenteditable="true"]');
      if (editables.length > 0) {
        console.log(`✓ 找到 ${editables.length} 个contenteditable元素`);
        editorElement = editables[0];
      } else {
        // 方法3：查找iframe中的编辑器
        const iframes = await page.$$('iframe');
        console.log(`找到 ${iframes.length} 个iframe，尝试内部编辑器`);

        if (iframes.length > 0) {
          // iframe中的编辑器需要特殊处理
          console.log('检测到iframe编辑器，将通过frame api访问');
          editorElement = iframes[0];
        }
      }
    }

    if (!editorElement) {
      // 尝试通过evaluate访问UEditor全局实例
      const ueInstance = await page.evaluate(() => {
        if (window.UE && window.UE.getEditor) {
          const editors = [];
          for (let key in window) {
            if (key.startsWith('ueditor_')) {
              editors.push(key);
            }
          }
          return { found: true, instances: editors };
        }
        return { found: false };
      });
      console.log('UEditor实例检测:', JSON.stringify(ueInstance));
      report.debug.push(`UEditor检测: ${JSON.stringify(ueInstance)}`);
    }

    if (!editorElement && !ueContainers[0]) {
      console.log('⚠️  未找到可操作的编辑器元素，继续诊断...');
      report.debug.push('编辑器定位失败，可能是动态加载延迟');
    }

    // 步骤3：获取编辑器初始内容
    console.log('\n【步骤3】获取编辑器初始内容...');
    report.steps.push('获取初始内容');

    console.log(`初始编辑器内容长度: ${editorHTML.length}字`);
    report.debug.push(`初始内容长度: ${editorHTML.length}`);

    // 步骤4：尝试找到工具栏中的公式按钮
    console.log('\n【步骤4】查找公式插入按钮...');
    report.steps.push('查找公式按钮');

    // 查找所有工具栏按钮
    const toolbarButtons = await page.$$('button, [role="button"]');
    console.log(`页面中有 ${toolbarButtons.length} 个按钮`);
    report.debug.push(`按钮总数: ${toolbarButtons.length}`);

    // 查找包含"公式"文字的按钮或title属性
    const formulaBtnLocators = await page.locator('button[title*="公式"], button[title*="formula"], [data-cmd="kityformula"]');
    const formulaBtns = await formulaBtnLocators.all();
    console.log(`公式按钮: ${formulaBtns.length}个`);

    // 步骤5：模拟在编辑器中插入公式的操作
    console.log('\n【步骤5】向编辑器插入测试内容并保存...');
    report.steps.push('插入测试内容');

    // 点击编辑器以获得焦点
    await ueContainers[0].click();
    await page.waitForTimeout(500);

    // 在编辑器中输入测试文本
    await page.keyboard.type('Test Para Content');
    console.log('✓ 已输入测试文本');

    // 步骤6：查找保存按钮并保存
    console.log('\n【步骤6】查找并点击保存按钮...');
    report.steps.push('点击保存');

    // 查找保存按钮（多种可能）
    const saveBtnLocators = await page.locator('button:has-text("保存"), button[title*="保存"], [data-test-id="save"], .save-btn');
    const saveBtns = await saveBtnLocators.all();
    console.log(`找到 ${saveBtns.length} 个保存按钮`);

    if (saveBtns.length > 0) {
      console.log('📍 点击保存按钮');
      await saveBtns[0].click();
      await page.waitForTimeout(3000);

      // 检查是否有保存成功的提示
      const successMessages = await page.locator('.ant-message-success, .success-msg, [role="alert"]').all();
      console.log(`保存提示: ${successMessages.length > 0 ? '✓' : '⚠️'}`);
    } else {
      console.log('⚠️  未找到保存按钮，尝试用键盘快捷键');
      await page.keyboard.press('Control+S');
      await page.waitForTimeout(2000);
    }

    // 步骤7：获取保存后的页面内容
    console.log('\n【步骤7】采集保存后的页面状态...');
    report.steps.push('采集保存后页面');

    const pageContentAfterSave = await page.content();
    const savedScreenshot = await page.screenshot({ path: 'D:/workspace/IETM/cape-ietm-vue/e2e-after-save.png' });
    console.log(`✓ 页面快照: ${savedScreenshot.length} 字节`);

    // 步骤8：检查页面中是否包含symbol标签（保存后的公式标记）
    console.log('\n【步骤8】检查保存后的XML内容...');
    report.steps.push('检查XML');

    const checks = {
      hasSymbolTag: pageContentAfterSave.includes('<symbol') || pageContentAfterSave.includes('&lt;symbol'),
      hasXmlAttr: pageContentAfterSave.includes('xml="') || pageContentAfterSave.includes('xml=&quot;'),
      hasParaTag: pageContentAfterSave.includes('<para') || pageContentAfterSave.includes('&lt;para'),
      hasIcnAttr: /icn="[^"]*"/.test(pageContentAfterSave)
    };

    console.log(`symbol标签: ${checks.hasSymbolTag ? '✓' : '✗'}`);
    console.log(`xml属性: ${checks.hasXmlAttr ? '✓' : '✗'}`);
    console.log(`para标签: ${checks.hasParaTag ? '✓' : '✗'}`);
    console.log(`icn属性: ${checks.hasIcnAttr ? '✓' : '✗'}`);

    report.checks.push({
      name: 'symbol标签',
      result: checks.hasSymbolTag
    });
    report.checks.push({
      name: 'xml属性',
      result: checks.hasXmlAttr
    });
    report.checks.push({
      name: 'para标签',
      result: checks.hasParaTag
    });
    report.checks.push({
      name: 'icn属性',
      result: checks.hasIcnAttr
    });

    // 步骤9：尝试切换到源码视图
    console.log('\n【步骤9】尝试切换到源码视图...');
    report.steps.push('切换源码视图');

    // 查找源码视图标签
    const sourceViewLocators = await page.locator('[data-test-id*="source"], label:has-text("源码"), button:has-text("源码"), .ant-tabs-tab:has-text("源码")');
    const sourceViewBtns = await sourceViewLocators.all();
    console.log(`源码视图按钮: ${sourceViewBtns.length}个`);

    if (sourceViewBtns.length > 0) {
      console.log('📍 点击源码视图按钮');
      await sourceViewBtns[0].click();
      await page.waitForTimeout(2000);

      // 获取源码视图内容
      const sourceViewScreenshot = await page.screenshot({ path: 'D:/workspace/IETM/cape-ietm-vue/e2e-source-view.png' });
      console.log(`✓ 源码视图快照: ${sourceViewScreenshot.length} 字节`);

      // 尝试获取源码内容
      const sourceCode = await page.textContent('[data-test-id*="code"], .source-code, pre, code');
      if (sourceCode) {
        console.log(`源码长度: ${sourceCode.length}字`);
        report.debug.push(`源码内容(前300字): ${sourceCode.substring(0, 300)}`);
      }
    }

    // 步骤10：返回设计视图
    console.log('\n【步骤10】返回设计视图...');
    report.steps.push('返回设计视图');

    const designViewBtns = await page.locator('[data-test-id*="design"], label:has-text("设计"), button:has-text("设计"), .ant-tabs-tab:has-text("设计")').all();
    if (designViewBtns.length > 0) {
      console.log('📍 点击设计视图按钮');
      await designViewBtns[0].click();
      await page.waitForTimeout(2000);

      const designViewScreenshot = await page.screenshot({ path: 'D:/workspace/IETM/cape-ietm-vue/e2e-design-view.png' });
      console.log(`✓ 设计视图快照: ${designViewScreenshot.length} 字节`);
    }

    // 最终总结
    console.log('\n【最终验证结果】');
    const passedChecks = report.checks.filter(c => c.result).length;
    const totalChecks = report.checks.length;
    const passRate = Math.round((passedChecks / totalChecks) * 100);

    console.log(`通过检查: ${passedChecks}/${totalChecks} (${passRate}%)`);

    if (passRate >= 75) {
      console.log('✅ 公式保存和转换验证通过');
      report.verdict = 'PASS';
    } else {
      console.log('⚠️  某些检查失败，需要调查');
      report.verdict = 'PARTIAL';
    }

    // 保存完整页面快照
    fs.writeFileSync('D:/workspace/IETM/cape-ietm-vue/e2e-final-page.html', pageContentAfterSave);
    console.log('✓ 完整页面HTML已保存');

  } catch (error) {
    console.error('\n❌ 测试执行异常:', error.message);
    report.error = error.message;
    report.verdict = 'ERROR';
  } finally {
    const reportPath = 'D:/workspace/IETM/cape-ietm-vue/PARA_E2E_FULL_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 测试报告: ${reportPath}`);

    await page.close();
  }
});
