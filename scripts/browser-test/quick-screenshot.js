const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 900 }
  });
  const page = await browser.newPage();

  // 登录
  await page.goto('http://localhost:3000');
  await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 10000 });
  await page.type('input[placeholder*="用户名"]', 'admin');
  await page.type('input[placeholder*="密码"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 10000 });

  // 打开DM编辑页面
  await page.goto('http://localhost:3000/#/ietm/dm-content-editor?id=2083556266365288450');
  await page.waitForTimeout(5000);

  // 截图
  await page.screenshot({ path: './dm-editor-screenshot.png', fullPage: true });
  console.log('截图已保存: dm-editor-screenshot.png');

  // 保持浏览器打开60秒供观察
  await page.waitForTimeout(60000);
  await browser.close();
})();
