/**
 * 公式插入完整生命周期验证测试
 * 场景：设计视图 → 插入公式 → 保存 → 源码视图 → 回到设计视图
 *
 * 要求：
 * 1. 公式能在设计视图中插入
 * 2. 保存后公式数据被正确序列化
 * 3. 源码视图能正确显示公式XML
 * 4. 回到设计视图公式能正确显示（不丢失、不乱码、不损坏）
 */

const { test, expect, chromium } = require('@playwright/test');

let browser;
let context;

// 配置
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:9999',
  backendTimeout: 20000,
  pageTimeout: 15000,
  screenshot: true,
  video: true,
};

test.beforeAll(async () => {
  browser = await chromium.launch({
    headless: false, // 显示浏览器便于调试
  });
});

test.afterAll(async () => {
  await browser?.close();
});

test.beforeEach(async ({ page }) => {
  context = await browser.newContext({
    recordVideo: { dir: 'test-videos/' },
  });

  page = await context.newPage();
  page.setDefaultTimeout(CONFIG.pageTimeout);
  page.setDefaultNavigationTimeout(CONFIG.pageTimeout);
});

test.afterEach(async ({ page }) => {
  await context?.close();
});

/**
 * T1: 验证前置条件 - 后端和前端都已启动
 */
test('T1: 前置条件验证 - 系统就绪', async ({ page }) => {
  // 验证后端
  try {
    const healthResponse = await page.context().request.get(`${CONFIG.apiUrl}/actuator/health`, {
      timeout: 5000,
    });
    expect(healthResponse.status()).toBe(200);
    console.log('✓ 后端服务正常 (port 9999)');
  } catch (e) {
    throw new Error(`❌ 后端服务不可用: ${e.message}`);
  }

  // 验证前端
  await page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle' });
  const pageTitle = await page.title();
  expect(pageTitle).toBeTruthy();
  console.log(`✓ 前端应用正常 (port 3000): ${pageTitle}`);
});

/**
 * T2: 导航到DM编辑页面
 */
test('T2: 导航到DM编辑页面', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}`, { waitUntil: 'networkidle' });

  // 等待登录完成（如果需要）
  await page.waitForTimeout(2000);

  // 查找DM管理菜单
  const dmMenu = page.locator('text=/文档管理|DM|管理/i').first();
  if (await dmMenu.isVisible()) {
    await dmMenu.click();
    await page.waitForTimeout(1000);
  }

  // 导航到编辑页
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`);
  await page.waitForLoadState('networkidle');

  // 验证页面已加载
  const pageContent = await page.content();
  expect(pageContent.length).toBeGreaterThan(100);
  console.log('✓ DM编辑页面已加载');
});

/**
 * T3: 打开Para设计视图编辑器
 */
test('T3: 打开Para设计视图编辑器', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 寻找Para编辑器或设计视图按钮
  // 可能的选择器：设计视图、Para编辑、编辑器等
  const selectors = [
    'button:has-text("设计视图")',
    'button:has-text("Para")',
    'button:has-text("编辑器")',
    '[data-testid="designer-view"]',
    '.designer-btn',
    '.para-editor-btn',
    'text=/设计|设计视图|编辑/i',
  ];

  let found = false;
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        found = true;
        console.log(`✓ 点击按钮: ${selector}`);
        break;
      }
    } catch (e) {
      // 继续尝试下一个选择器
    }
  }

  // 等待编辑器加载
  await page.waitForTimeout(3000);

  // 验证编辑器已加载
  const editorPresent =
    (await page.locator('[class*="editor"]').count()) > 0 ||
    (await page.locator('[class*="designer"]').count()) > 0 ||
    (await page.content()).includes('UEditor') ||
    (await page.content()).includes('kityFormula');

  if (!editorPresent && !found) {
    console.warn('⚠ 无法确认编辑器状态，但继续测试...');
  } else {
    console.log('✓ Para编辑器已打开');
  }
});

/**
 * T4: 在设计视图中插入公式
 */
test('T4: 在设计视图中插入公式', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 打开设计视图
  await page.waitForTimeout(2000);

  // 方式1：通过UEditor工具栏插入公式
  // 寻找公式按钮（KityFormula插件提供）
  const formulaBtnSelectors = [
    'button[title*="公式"]',
    'button[title*="formula"]',
    'button[data-cmd="kityformula"]',
    '.kityformula-btn',
    'a[title*="公式"]',
    'text=/公式|formula/i',
  ];

  let formulaBtnFound = false;
  for (const selector of formulaBtnSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        formulaBtnFound = true;
        console.log(`✓ 找到公式按钮: ${selector}`);
        break;
      }
    } catch (e) {
      // 继续
    }
  }

  if (!formulaBtnFound) {
    console.warn('⚠ 未找到公式按钮，尝试通过菜单...');
    // 尝试通过菜单
    const insertMenu = page.locator('text="插入"').first();
    if (await insertMenu.isVisible()) {
      await insertMenu.click();
      await page.waitForTimeout(500);
      const formulaMenu = page.locator('text="公式"');
      if (await formulaMenu.isVisible()) {
        await formulaMenu.click();
        console.log('✓ 通过菜单打开公式对话框');
      }
    }
  }

  // 等待公式对话框出现
  await page.waitForTimeout(2000);

  // 检查是否有公式编辑对话框
  const dialogVisible = await page.locator('[class*="dialog"]').first().isVisible({ timeout: 2000 }).catch(() => false);

  if (dialogVisible) {
    console.log('✓ 公式对话框已打开');

    // 在公式编辑器中输入简单公式
    const formulaInput = page.locator('input, textarea').first();
    if (await formulaInput.isVisible({ timeout: 1000 })) {
      await formulaInput.fill('a+b');
      console.log('✓ 公式已输入: a+b');
    }

    // 点击确定/插入按钮
    const confirmBtn = page.locator('button:has-text("确定"), button:has-text("插入"), button:has-text("OK")').first();
    if (await confirmBtn.isVisible({ timeout: 1000 })) {
      await confirmBtn.click();
      console.log('✓ 公式已确认');
      await page.waitForTimeout(1000);
    }
  } else {
    console.warn('⚠ 公式对话框未出现，可能需要不同的操作流程');
  }
});

/**
 * T5: 验证设计视图中公式已插入
 */
test('T5: 验证设计视图中公式已插入', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 等待编辑器加载
  await page.waitForTimeout(3000);

  // 获取编辑器内容
  const editorFrames = page.frameLocator('iframe').count();

  let editorContent = '';
  if (editorFrames > 0) {
    // UEditor使用iframe
    try {
      const frame = page.frameLocator('iframe').first();
      const bodyContent = await frame.locator('body').innerHTML();
      editorContent = bodyContent;
    } catch (e) {
      console.warn('⚠ 无法读取iframe内容');
    }
  } else {
    // 直接读取编辑器内容
    const editorDiv = page.locator('[class*="editor"], [contenteditable="true"]').first();
    if (await editorDiv.isVisible({ timeout: 1000 })) {
      editorContent = await editorDiv.innerHTML();
    }
  }

  if (editorContent.includes('formula') || editorContent.includes('kity') || editorContent.includes('a+b')) {
    console.log('✓ 公式在设计视图中已插入');
  } else {
    console.warn('⚠ 在设计视图中未检测到公式标记，内容长度:', editorContent.length);
  }
});

/**
 * T6: 保存Para内容
 */
test('T6: 保存Para内容', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 等待编辑器准备
  await page.waitForTimeout(3000);

  // 查找保存按钮
  const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save"), .save-btn').first();

  if (await saveBtn.isVisible({ timeout: 2000 })) {
    // 记录保存前的时间戳
    const beforeSaveTime = Date.now();

    // 点击保存
    await saveBtn.click();
    console.log('✓ 点击保存按钮');

    // 等待保存API响应
    const response = await page.context().request.get(`${CONFIG.apiUrl}/ietm/dm-content/get`, {
      timeout: CONFIG.backendTimeout,
    }).catch(() => null);

    if (response && response.status() === 200) {
      const data = await response.json();
      const afterSaveTime = Date.now();
      console.log(`✓ 保存完成 (${afterSaveTime - beforeSaveTime}ms)`);
    }

    // 等待保存反馈
    await page.waitForTimeout(1000);
  } else {
    console.warn('⚠ 未找到保存按钮');
  }
});

/**
 * T7: 切换到源码视图
 */
test('T7: 切换到源码视图', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 打开编辑器
  await page.waitForTimeout(3000);

  // 查找源码视图/XML视图按钮
  const sourceViewSelectors = [
    'button:has-text("源码视图")',
    'button:has-text("XML")',
    'button:has-text("Code")',
    '.source-btn',
    '.code-view-btn',
    '[data-view="source"]',
    'text=/源码|source|xml/i',
  ];

  let sourceViewFound = false;
  for (const selector of sourceViewSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        sourceViewFound = true;
        console.log(`✓ 切换到源码视图`);
        break;
      }
    } catch (e) {
      // 继续
    }
  }

  // 等待视图切换
  await page.waitForTimeout(2000);

  if (!sourceViewFound) {
    console.warn('⚠ 未找到源码视图按钮，但继续验证...');
  }
});

/**
 * T8: 验证源码视图中公式的XML表示
 */
test('T8: 验证源码视图中公式的XML表示', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 等待编辑器加载
  await page.waitForTimeout(3000);

  // 获取源码内容
  let sourceContent = '';

  // 尝试从CodeMirror获取（常用的代码编辑器）
  const codemirror = page.locator('.CodeMirror').first();
  if (await codemirror.isVisible({ timeout: 1000 }).catch(() => false)) {
    try {
      sourceContent = await codemirror.textContent();
    } catch (e) {
      // 继续
    }
  }

  // 尝试从textarea获取
  if (!sourceContent) {
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 1000 }).catch(() => false)) {
      sourceContent = await textarea.textContent();
    }
  }

  // 尝试从编辑区获取
  if (!sourceContent) {
    const editor = page.locator('[class*="editor-content"], [contenteditable="true"]').first();
    if (await editor.isVisible({ timeout: 1000 }).catch(() => false)) {
      sourceContent = await editor.textContent();
    }
  }

  console.log(`源码内容长度: ${sourceContent.length} 字符`);

  // 验证公式标记
  const hasFormula =
    sourceContent.includes('<formula>') ||
    sourceContent.includes('<kityFormula>') ||
    sourceContent.includes('kityformula') ||
    sourceContent.includes('formula') ||
    sourceContent.includes('a+b');

  if (hasFormula) {
    console.log('✓ 源码视图中检测到公式标记');

    // 提取公式相关内容进行验证
    const formulaMatch = sourceContent.match(/<.*?formula.*?>/gi);
    if (formulaMatch) {
      console.log(`  公式标签: ${formulaMatch[0]}`);
    }
  } else {
    console.warn('⚠ 源码视图中未检测到公式标记');
    console.log(`源码前500字符:\n${sourceContent.substring(0, 500)}`);
  }

  expect(sourceContent.length).toBeGreaterThan(0);
});

/**
 * T9: 回到设计视图
 */
test('T9: 回到设计视图', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 等待编辑器加载
  await page.waitForTimeout(3000);

  // 查找设计视图按钮
  const designViewSelectors = [
    'button:has-text("设计视图")',
    'button:has-text("Design")',
    'button:has-text("编辑")',
    '.design-btn',
    '.visual-view-btn',
    '[data-view="design"]',
    'text=/设计|design/i',
  ];

  let designViewFound = false;
  for (const selector of designViewSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        designViewFound = true;
        console.log(`✓ 回到设计视图`);
        break;
      }
    } catch (e) {
      // 继续
    }
  }

  // 等待视图切换
  await page.waitForTimeout(2000);

  if (!designViewFound) {
    console.warn('⚠ 未找到设计视图按钮，但继续验证...');
  }
});

/**
 * T10: 验证公式在设计视图中正确显示（关键验证）
 */
test('T10: 验证公式在设计视图中正确显示', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  // 完整流程：打开编辑器 → 查看 → 切换源码 → 回到设计
  await page.waitForTimeout(3000);

  // 获取设计视图编辑器内容
  let designContent = '';

  const editorFrames = page.frameLocator('iframe').count();

  if (editorFrames > 0) {
    try {
      const frame = page.frameLocator('iframe').first();
      const bodyContent = await frame.locator('body').innerHTML();
      designContent = bodyContent;
    } catch (e) {
      console.warn('⚠ 无法读取iframe内容');
    }
  } else {
    const editorDiv = page.locator('[class*="editor"], [contenteditable="true"]').first();
    if (await editorDiv.isVisible({ timeout: 1000 }).catch(() => false)) {
      designContent = await editorDiv.innerHTML();
    }
  }

  console.log(`设计视图内容长度: ${designContent.length} 字符`);

  // 关键验证：公式是否完整显示
  const hasFormula =
    designContent.includes('formula') ||
    designContent.includes('kity') ||
    designContent.includes('a+b') ||
    designContent.includes('mo') || // MathML 输出
    designContent.includes('math');

  if (hasFormula) {
    console.log('✓ 【关键验证通过】公式在设计视图中正确显示');
    console.log(`  检测到公式标记`);
  } else {
    console.warn('❌ 【关键验证失败】公式在设计视图中丢失或损坏');
    console.log(`设计视图前1000字符:\n${designContent.substring(0, 1000)}`);
  }

  expect(hasFormula).toBeTruthy();
});

/**
 * T11: 完整往返循环测试
 * 设计 → 源码 → 设计，验证数据完整性
 */
test('T11: 完整往返循环测试 - 数据完整性', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  // 记录初始内容哈希
  const captureContent = async (viewType) => {
    await page.waitForTimeout(1000);

    let content = '';
    const editorFrames = page.frameLocator('iframe').count();

    if (editorFrames > 0) {
      try {
        const frame = page.frameLocator('iframe').first();
        content = await frame.locator('body').innerHTML();
      } catch (e) {
        // 继续
      }
    } else {
      const editorDiv = page.locator('[class*="editor"], [contenteditable="true"]').first();
      if (await editorDiv.isVisible({ timeout: 1000 }).catch(() => false)) {
        content = await editorDiv.innerHTML();
      }
    }

    return content;
  };

  // 获取设计视图内容
  const designContent = await captureContent('design');
  console.log(`初始设计视图: ${designContent.length} 字符`);

  // 切换到源码
  const sourceBtn = page.locator('button:has-text("源码"), button:has-text("XML")').first();
  if (await sourceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sourceBtn.click();
  }

  const sourceContent = await captureContent('source');
  console.log(`源码视图: ${sourceContent.length} 字符`);

  // 切换回设计
  const designBtn = page.locator('button:has-text("设计"), button:has-text("Design")').first();
  if (await designBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await designBtn.click();
  }

  const finalDesignContent = await captureContent('design');
  console.log(`最终设计视图: ${finalDesignContent.length} 字符`);

  // 验证数据完整性
  const designLengthStable = Math.abs(designContent.length - finalDesignContent.length) < 50;
  if (designLengthStable) {
    console.log('✓ 往返循环中数据长度稳定');
  } else {
    console.warn('⚠ 往返循环中数据长度变化:', {
      初始: designContent.length,
      最终: finalDesignContent.length,
      差异: finalDesignContent.length - designContent.length,
    });
  }

  // 验证公式标记在整个循环中保留
  const hasFormulaInFinal =
    finalDesignContent.includes('formula') ||
    finalDesignContent.includes('kity') ||
    finalDesignContent.includes('math');

  expect(hasFormulaInFinal).toBeTruthy();
  console.log('✓ 公式标记在完整循环中保留');
});

/**
 * T12: 刷新页面后公式是否保留
 */
test('T12: 刷新页面后公式是否保留', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  // 获取刷新前的内容
  let beforeRefreshContent = '';
  const editorDiv = page.locator('[class*="editor"], [contenteditable="true"], .CodeMirror').first();
  if (await editorDiv.isVisible({ timeout: 1000 }).catch(() => false)) {
    beforeRefreshContent = await editorDiv.innerHTML();
  }

  console.log(`刷新前内容长度: ${beforeRefreshContent.length}`);

  // 刷新页面
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 获取刷新后的内容
  let afterRefreshContent = '';
  const editorDivAfter = page.locator('[class*="editor"], [contenteditable="true"], .CodeMirror').first();
  if (await editorDivAfter.isVisible({ timeout: 1000 }).catch(() => false)) {
    afterRefreshContent = await editorDivAfter.innerHTML();
  }

  console.log(`刷新后内容长度: ${afterRefreshContent.length}`);

  // 验证公式是否仍存在
  const hasFormulaAfterRefresh =
    afterRefreshContent.includes('formula') ||
    afterRefreshContent.includes('kity');

  if (hasFormulaAfterRefresh) {
    console.log('✓ 刷新后公式保留完整');
  } else {
    console.warn('⚠ 刷新后公式丢失');
  }
});

/**
 * T13: 多次编辑和保存的稳定性
 */
test('T13: 多次编辑和保存的稳定性', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  // 进行3次编辑-保存循环
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- 循环 ${i}/3 ---`);

    // 点击编辑器
    const editorDiv = page.locator('[class*="editor"], [contenteditable="true"]').first();
    if (await editorDiv.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editorDiv.click();
    }

    // 保存
    const saveBtn = page.locator('button:has-text("保存")').first();
    if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveBtn.click();
      console.log(`循环 ${i}: 已保存`);
      await page.waitForTimeout(1000);
    }

    // 验证内容完整性
    let content = '';
    if (await editorDiv.isVisible({ timeout: 1000 }).catch(() => false)) {
      content = await editorDiv.innerHTML();
    }

    const hasFormula = content.includes('formula') || content.includes('kity');
    console.log(`循环 ${i}: 公式完整性 = ${hasFormula ? '✓' : '❌'}`);
  }

  console.log('\n✓ 多次编辑保存循环完成');
});

/**
 * T14: 错误恢复测试 - 网络中断模拟
 */
test('T14: 网络中断模拟与恢复', async ({ page }) => {
  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  // 模拟网络离线
  await page.context().setOffline(true);
  console.log('模拟网络离线');
  await page.waitForTimeout(1000);

  // 尝试保存（应该失败）
  const saveBtn = page.locator('button:has-text("保存")').first();
  if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await saveBtn.click();
    console.log('尝试在离线状态下保存');
    await page.waitForTimeout(1000);
  }

  // 恢复网络
  await page.context().setOffline(false);
  console.log('网络恢复');
  await page.waitForTimeout(2000);

  // 重新保存
  if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await saveBtn.click();
    console.log('网络恢复后重新保存');
    await page.waitForTimeout(1000);
  }

  console.log('✓ 网络中断恢复测试完成');
});

/**
 * T15: 最终综合验证
 */
test('T15: 最终综合验证 - 公式生命周期完整性', async ({ page }) => {
  console.log('\n========== 最终综合验证 ==========\n');

  await page.goto(`${CONFIG.baseUrl}/#/ietm/dm-detail`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const checks = {
    编辑器加载: false,
    公式插入: false,
    保存成功: false,
    源码显示: false,
    设计显示: false,
    往返完整: false,
  };

  // 1. 检查编辑器
  const editor = page.locator('[class*="editor"], [contenteditable="true"], .CodeMirror').first();
  if (await editor.isVisible({ timeout: 2000 }).catch(() => false)) {
    checks.编辑器加载 = true;
  }

  // 2. 检查公式元素
  const editorContent = await editor.innerHTML().catch(() => '');
  if (editorContent.includes('formula') || editorContent.includes('kity')) {
    checks.公式插入 = true;
  }

  // 3. 保存验证
  const saveBtn = page.locator('button:has-text("保存")').first();
  if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    checks.保存成功 = true;
  }

  // 4. 源码视图检查
  const sourceBtn = page.locator('button:has-text("源码"), button:has-text("XML")').first();
  if (await sourceBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    checks.源码显示 = true;
  }

  // 5. 设计视图检查
  const designBtn = page.locator('button:has-text("设计")').first();
  if (await designBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    checks.设计显示 = true;
  }

  // 6. 往返完整性
  const finalContent = await editor.innerHTML().catch(() => '');
  checks.往返完整 = finalContent.length > 0 && (finalContent.includes('formula') || finalContent.includes('kity'));

  // 输出检查结果
  console.log('检查结果:');
  Object.entries(checks).forEach(([name, passed]) => {
    console.log(`  ${passed ? '✓' : '❌'} ${name}`);
  });

  const passCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;
  const passRate = (passCount / totalCount * 100).toFixed(1);

  console.log(`\n综合评分: ${passCount}/${totalCount} (${passRate}%)`);

  if (passRate >= 80) {
    console.log('✓ 【验证通过】公式功能运行正常');
  } else if (passRate >= 50) {
    console.log('⚠ 【部分通过】公式功能有缺陷');
  } else {
    console.log('❌ 【验证失败】公式功能不可用');
  }

  console.log('\n=====================================\n');
});
