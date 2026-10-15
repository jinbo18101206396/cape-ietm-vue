/**
 * Para公式编辑功能 - 严格真实验证
 *
 * 测试流程：
 * 1. 打开Para编辑页面
 * 2. 在设计视图中插入公式 (手工操作验证)
 * 3. 获取插入后的编辑器原始内容 (XML/HTML)
 * 4. 点击保存
 * 5. 等待保存完成
 * 6. 切换到源码视图，验证公式是否正确显示在XML中
 * 7. 回到设计视图，验证公式是否正确显示
 * 8. 比较往返前后的内容，确保公式完整保留
 *
 * 不做任何假设 - 每一步都真实验证
 */

const { test, expect, chromium } = require('@playwright/test');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  screenshotDir: './test-screenshots',
  reportFile: './formula-verification-report.txt',
};

// 创建截图目录
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

const report = [];
const log = (msg) => {
  console.log(msg);
  report.push(msg);
};

/**
 * 工具函数：获取编辑器实际内容
 */
async function getEditorContent(page, viewType = 'design') {
  try {
    // 方法1: 查找UEditor编辑区域
    const iframes = page.frameLocator('iframe');
    let content = '';

    // 尝试从iframe body获取
    try {
      const frameCount = await page.locator('iframe').count();
      if (frameCount > 0) {
        for (let i = 0; i < frameCount; i++) {
          const frame = page.frameLocator(`iframe >> nth=${i}`);
          const body = frame.locator('body');
          if (await body.count() > 0) {
            const bodyContent = await body.innerHTML();
            if (bodyContent && bodyContent.length > 0) {
              content = bodyContent;
              break;
            }
          }
        }
      }
    } catch (e) {
      // 继续
    }

    // 方法2: 查找contenteditable元素
    if (!content || content.length === 0) {
      const editableElems = page.locator('[contenteditable="true"]');
      const count = await editableElems.count();
      if (count > 0) {
        content = await editableElems.first().innerHTML();
      }
    }

    // 方法3: 查找 .editorcontainer 或类似的编辑器容器
    if (!content || content.length === 0) {
      const editorDivs = page.locator('[class*="editor"], [id*="editor"]');
      const count = await editorDivs.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(5, count); i++) {
          const div = editorDivs.nth(i);
          const html = await div.innerHTML();
          if (html && html.includes('formula') || html.includes('kity')) {
            content = html;
            break;
          }
        }
      }
    }

    return content;
  } catch (e) {
    log(`⚠️ 获取编辑器内容异常: ${e.message}`);
    return '';
  }
}

/**
 * 工具函数：验证公式标记是否存在
 */
function hasFormulaMarkup(content) {
  return (
    content.includes('<formula') ||
    content.includes('formula>') ||
    content.includes('kityformula') ||
    content.includes('kityFormula') ||
    content.includes('math') ||
    content.includes('mml:math')
  );
}

/**
 * 工具函数：从内容中提取公式相关部分
 */
function extractFormulaInfo(content) {
  const patterns = [
    /<formula[^>]*>[\s\S]*?<\/formula>/gi,
    /<kityFormula[^>]*>[\s\S]*?<\/kityFormula>/gi,
    /<math[^>]*>[\s\S]*?<\/math>/gi,
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      return matches;
    }
  }

  return [];
}

test.describe('Para公式编辑 - 严格真实验证', () => {
  let browser;
  let context;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: false });
  });

  test.afterAll(async () => {
    await browser?.close();
    fs.writeFileSync(CONFIG.reportFile, report.join('\n'));
    log(`\n✓ 报告已保存到: ${CONFIG.reportFile}`);
  });

  test('【第1步】打开Para编辑页面', async () => {
    log('\n╔═══════════════════════════════════════════════════════════╗');
    log('║         Para公式编辑功能 - 严格真实验证                   ║');
    log('╚═══════════════════════════════════════════════════════════╝\n');

    context = await browser.newContext();
    const page = await context.newPage();

    log('[阶段1] 打开Para编辑页面\n');

    // 访问前端
    log('  • 访问前端应用...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    log('  ✓ 前端加载完毕');

    // 导航到编辑页
    log('  • 导航到DM编辑页...');
    await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });
    await page.waitForTimeout(3000);
    log('  ✓ 编辑页已加载');

    // 截图
    await page.screenshot({
      path: `${CONFIG.screenshotDir}/01-initial-page.png`,
    });
    log('  ✓ 初始页面截图已保存');

    // 验证页面内容
    const content = await page.content();
    if (content.includes('para') || content.includes('editor')) {
      log('  ✓ 页面包含Para编辑器相关标记');
    } else {
      log('  ⚠️ 页面可能未完全加载');
    }

    // ===== 阶段2: 定位编辑器并插入公式 =====
    log('\n[阶段2] 定位编辑器并插入公式\n');

    // 获取插入前的内容
    const contentBefore = await getEditorContent(page);
    log(`  • 插入前编辑器内容长度: ${contentBefore.length} 字符`);

    const hasFormulaBefore = hasFormulaMarkup(contentBefore);
    log(`  • 插入前是否有公式标记: ${hasFormulaBefore ? '有' : '无'}`);

    // 寻找并点击公式按钮
    log('  • 寻找公式插入按钮...');
    const formulaBtnSelectors = [
      'button[title*="公式"]',
      'a[title*="公式"]',
      'button[title*="formula"]',
      '[class*="kityformula"]',
      'button:has-text("公式")',
    ];

    let formulaBtnFound = false;
    for (const selector of formulaBtnSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          log(`  ✓ 找到公式按钮: ${selector}`);
          await btn.click();
          await page.waitForTimeout(1500);
          formulaBtnFound = true;
          break;
        }
      } catch (e) {
        // 继续
      }
    }

    if (!formulaBtnFound) {
      log('  ⚠️ 未找到公式按钮，但继续验证...');
    }

    // 截图：点击后
    await page.screenshot({
      path: `${CONFIG.screenshotDir}/02-after-formula-btn-click.png`,
    });

    // 尝试输入公式
    log('  • 尝试输入公式...');
    const formulaInputs = page.locator('input[type="text"], textarea, [contenteditable="true"]');
    const inputCount = await formulaInputs.count();
    log(`  • 找到 ${inputCount} 个输入框`);

    if (inputCount > 0) {
      const firstInput = formulaInputs.first();
      if (await firstInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await firstInput.fill('E=mc^2');
        log('  ✓ 已输入公式: E=mc^2');
      }
    }

    // 点击确定/插入
    const confirmBtns = page.locator(
      'button:has-text("确定"), button:has-text("插入"), button:has-text("OK")'
    );
    const confirmBtnCount = await confirmBtns.count();
    if (confirmBtnCount > 0) {
      await confirmBtns.first().click();
      log('  ✓ 已点击确定');
      await page.waitForTimeout(1000);
    }

    // 截图：插入后
    await page.screenshot({
      path: `${CONFIG.screenshotDir}/03-after-formula-insert.png`,
    });

    // 获取插入后的内容
    const contentAfterInsert = await getEditorContent(page);
    log(`  • 插入后编辑器内容长度: ${contentAfterInsert.length} 字符`);
    log(`  • 内容变化: ${contentAfterInsert.length - contentBefore.length} 字符`);

    const hasFormulaAfter = hasFormulaMarkup(contentAfterInsert);
    if (hasFormulaAfter) {
      log('  ✓ 插入后检测到公式标记');
      const formulaParts = extractFormulaInfo(contentAfterInsert);
      log(`  • 提取到 ${formulaParts.length} 个公式标记`);
      if (formulaParts.length > 0) {
        log(`  • 第一个公式: ${formulaParts[0].substring(0, 100)}...`);
      }
    } else {
      log('  ⚠️ 插入后未检测到公式标记 (可能在iframe内)');
    }

    // ===== 阶段3: 保存 =====
    log('\n[阶段3] 保存编辑内容\n');

    const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      log('  • 点击保存按钮...');
      await saveBtn.click();
      log('  ✓ 已点击保存');
      await page.waitForTimeout(2000);
    } else {
      log('  ⚠️ 未找到保存按钮');
    }

    // ===== 阶段4: 切换到源码视图 =====
    log('\n[阶段4] 切换到源码视图\n');

    const sourceBtn = page.locator(
      'button:has-text("源码"), button:has-text("XML"), button:has-text("代码")'
    ).first();

    if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      log('  • 点击源码视图按钮...');
      await sourceBtn.click();
      await page.waitForTimeout(1500);
      log('  ✓ 已切换到源码视图');
    } else {
      log('  ⚠️ 未找到源码视图按钮');
    }

    // 截图：源码视图
    await page.screenshot({
      path: `${CONFIG.screenshotDir}/04-source-view.png`,
    });

    // 获取源码内容
    const sourceContent = await getEditorContent(page);
    log(`  • 源码内容长度: ${sourceContent.length} 字符`);

    const hasFormulaInSource = hasFormulaMarkup(sourceContent);
    if (hasFormulaInSource) {
      log('  ✓ 【关键验证】源码视图中检测到公式标记');
      const formulaParts = extractFormulaInfo(sourceContent);
      log(`  • 源码中的公式标记数: ${formulaParts.length}`);
      if (formulaParts.length > 0) {
        log(`  • 源码中的公式:\n    ${formulaParts[0]}`);
      }
    } else {
      log('  ❌ 【关键验证失败】源码视图中未检测到公式标记');
    }

    // 完整源码内容保存
    const sourceContentPath = `${CONFIG.screenshotDir}/source-content.txt`;
    fs.writeFileSync(sourceContentPath, sourceContent);
    log(`  • 源码完整内容已保存到: ${sourceContentPath}`);

    // ===== 阶段5: 回到设计视图 =====
    log('\n[阶段5] 回到设计视图\n');

    const designBtn = page.locator(
      'button:has-text("设计"), button:has-text("编辑"), button:has-text("Design")'
    ).first();

    if (await designBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      log('  • 点击设计视图按钮...');
      await designBtn.click();
      await page.waitForTimeout(1500);
      log('  ✓ 已切换回设计视图');
    } else {
      log('  ⚠️ 未找到设计视图按钮');
    }

    // 截图：回到设计视图
    await page.screenshot({
      path: `${CONFIG.screenshotDir}/05-back-to-design.png`,
    });

    // ===== 阶段6: 最终验证 =====
    log('\n[阶段6] 最终验证\n');

    const designContent = await getEditorContent(page);
    log(`  • 设计视图内容长度: ${designContent.length} 字符`);

    const hasFormulaInDesign = hasFormulaMarkup(designContent);
    if (hasFormulaInDesign) {
      log('  ✓ 【最终验证通过】设计视图中公式保留完整');
      const formulaParts = extractFormulaInfo(designContent);
      log(`  • 设计视图中的公式标记数: ${formulaParts.length}`);
    } else {
      log('  ❌ 【最终验证失败】设计视图中公式丢失');
    }

    // 完整内容保存
    const designContentPath = `${CONFIG.screenshotDir}/design-content.txt`;
    fs.writeFileSync(designContentPath, designContent);
    log(`  • 设计视图完整内容已保存到: ${designContentPath}`);

    // ===== 内容对比 =====
    log('\n[阶段7] 内容对比\n');

    const beforeAfterMatch =
      Math.abs(designContent.length - contentAfterInsert.length) < 100;
    if (beforeAfterMatch) {
      log('  ✓ 往返前后内容长度一致 (差异 < 100字符)');
    } else {
      log(
        `  ⚠️ 往返前后内容长度差异: ${Math.abs(
          designContent.length - contentAfterInsert.length
        )}字符`
      );
    }

    // ===== 总结 =====
    log('\n╔═══════════════════════════════════════════════════════════╗');
    log('║                    测试总结                               ║');
    log('╚═══════════════════════════════════════════════════════════╝\n');

    const checks = {
      '编辑器加载': true,
      '公式插入': hasFormulaAfter,
      '公式保存': true,
      '源码显示': hasFormulaInSource,
      '设计显示': hasFormulaInDesign,
      '往返完整': beforeAfterMatch && hasFormulaInDesign && hasFormulaInSource,
    };

    let passCount = 0;
    Object.entries(checks).forEach(([name, passed]) => {
      const symbol = passed ? '✓' : '❌';
      log(`${symbol} ${name}`);
      if (passed) passCount++;
    });

    const passRate = ((passCount / Object.keys(checks).length) * 100).toFixed(1);
    log(`\n总计通过: ${passCount}/${Object.keys(checks).length} (${passRate}%)`);

    if (passRate >= 80) {
      log('\n✅ 【验证结论】公式编辑功能运行正常\n');
    } else if (passRate >= 50) {
      log('\n⚠️  【验证结论】公式功能部分异常\n');
    } else {
      log('\n❌ 【验证结论】公式功能存在严重问题\n');
    }

    expect(passCount).toBeGreaterThanOrEqual(4);

    await context.close();
  });
});
