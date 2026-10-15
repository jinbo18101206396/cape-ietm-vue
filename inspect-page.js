const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('访问DM编辑页...');
    await page.goto('http://localhost:3000/#/ietm/dm-detail', {
      waitUntil: 'networkidle',
      timeout: 20000,
    });
    await page.waitForTimeout(3000);

    console.log('\n===== 页面结构分析 =====\n');

    // 列出所有按钮
    const buttons = await page.locator('button').all();
    console.log(`找到 ${buttons.length} 个按钮`);
    console.log('\n按钮列表:');
    for (let i = 0; i < Math.min(20, buttons.length); i++) {
      const btn = buttons[i];
      const text = await btn.textContent();
      const title = await btn.getAttribute('title');
      console.log(`  [${i}] text="${text}" title="${title}"`);
    }

    // 列出所有可见的工具栏相关元素
    console.log('\n===== 工具栏元素 =====\n');
    const toolbars = await page.locator('[class*="toolbar"], [class*="tool"], .edittoolbar').all();
    console.log(`找到 ${toolbars.length} 个工具栏相关元素`);

    // 查找编辑器容器
    console.log('\n===== 编辑器容器 =====\n');
    const editors = await page.locator('[class*="editor"], #ueditor, [id*="editor"]').all();
    console.log(`找到 ${editors.length} 个编辑器相关容器`);

    // 查找iframe
    console.log('\n===== IFrame =====\n');
    const iframes = await page.locator('iframe').all();
    console.log(`找到 ${iframes.length} 个iframe`);
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];
      const title = await iframe.getAttribute('title');
      const src = await iframe.getAttribute('src');
      console.log(`  [${i}] title="${title}" src="${src}"`);
    }

    // 检查页面是否加载了UEditor
    const pageContent = await page.content();
    console.log('\n===== 关键标记 =====\n');
    console.log(`包含 UEditor: ${pageContent.includes('UEditor') ? '是' : '否'}`);
    console.log(`包含 para: ${pageContent.includes('para') ? '是' : '否'}`);
    console.log(`包含 formula: ${pageContent.includes('formula') ? '是' : '否'}`);
    console.log(`包含 kityformula: ${pageContent.includes('kityformula') ? '是' : '否'}`);

    // 查找Para设计器组件
    console.log('\n===== Vue组件 =====\n');
    const vueElements = await page.locator('[data-v-*], [v-*]').count();
    console.log(`找到 ${vueElements} 个Vue相关元素`);

    // 检查页面标题和路由
    console.log('\n===== 页面信息 =====\n');
    const title = await page.title();
    const url = page.url();
    console.log(`标题: ${title}`);
    console.log(`URL: ${url}`);

    // 保存完整页面截图
    await page.screenshot({ path: './page-structure.png', fullPage: true });
    console.log('\n✓ 完整页面截图已保存: page-structure.png');

    // 获取整个页面的HTML (只保存前10000字符)
    const html = await page.content();
    const htmlPath = './page-structure.html';
    const sampleHtml = html.substring(0, 10000);
    require('fs').writeFileSync(htmlPath, sampleHtml);
    console.log(`✓ 页面HTML样本已保存: ${htmlPath}`);

  } finally {
    await browser.close();
  }
})();
