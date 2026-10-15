const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // 访问前端
    console.log('正在访问 http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 截图
    await page.screenshot({ path: 'para-screenshot-01.png' });
    console.log('✓ 前端首页截图已保存');
    
    // 查看页面内容
    const content = await page.content();
    console.log('\n页面内容长度:', content.length);
    console.log('包含 Para:', content.includes('Para'));
    console.log('包含 Editor:', content.includes('Editor'));
    console.log('包含 ietm:', content.includes('ietm'));
    console.log('包含 formula:', content.includes('formula'));
    console.log('包含 UEditor:', content.includes('UEditor'));
    
    // 查找编辑器元素
    const editorDiv = await page.locator('[class*="editor"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log('编辑器div 可见:', editorDiv);
    
  } catch (e) {
    console.error('❌ 错误:', e.message);
  } finally {
    await browser.close();
  }
})();
