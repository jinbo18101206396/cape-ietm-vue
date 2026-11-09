/**
 * 简化版验证脚本 - 直接使用Playwright库
 * 不依赖配置文件，不启动webServer
 */

const { chromium } = require('playwright');

(async () => {
  console.log('🚀 启动验证...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // 每步操作延迟500ms，便于观察
  });
  const page = await browser.newPage();

  try {
    // 先登录
    console.log('📝 步骤1: 登录系统...');
    await page.goto('http://localhost:3000/user/login');
    await page.waitForTimeout(2000);

    // 填写登录表单
    const usernameInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await usernameInput.count() > 0) {
      await usernameInput.fill('admin');
      await passwordInput.fill('123456');

      // 点击登录按钮
      await page.locator('button').filter({ hasText: /登录|Login/ }).first().click();
      await page.waitForTimeout(3000);
      console.log('✓ 登录完成\n');
    }

    // 直接访问编辑页面
    console.log('📝 步骤2: 访问DM编辑页面...');
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);
    console.log('✓ 页面加载完成\n');

    // 查找所有可能的预览按钮
    console.log('📝 查找预览按钮...');

    // 获取页面上所有button和链接
    const clickableElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, .ant-btn, span[role="button"]'));
      return elements.map((el, idx) => ({
        index: idx,
        text: el.textContent?.trim() || '',
        tagName: el.tagName,
        className: el.className,
        id: el.id
      })).filter(el => el.text.includes('预览'));
    });

    console.log('找到包含"预览"的元素：', clickableElements);

    if (clickableElements.length === 0) {
      console.error('❌ 未找到预览按钮');
      console.log('\n尝试查找所有按钮...');
      const allButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, .ant-btn')).map(el => el.textContent?.trim());
      });
      console.log('页面上的所有按钮：', allButtons.slice(0, 20));
      throw new Error('找不到预览按钮');
    }

    // 点击第一个预览按钮
    console.log(`\n📝 点击预览按钮（找到${clickableElements.length}个匹配项）...`);
    await page.click('button:has-text("预览"), .ant-btn:has-text("预览")');

    // 等待模态框
    console.log('📝 等待预览弹出框...');
    await page.waitForSelector('.ant-modal', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✓ 预览弹出框已打开\n');

    // 获取iframe
    const iframe = await page.frameLocator('.ant-modal iframe').first();

    // 等待iframe加载
    await page.waitForTimeout(2000);

    console.log('📝 检查iframe中的上标元素...\n');

    // 检查sup元素
    const supCount = await page.evaluate(() => {
      const modal = document.querySelector('.ant-modal');
      if (!modal) return 0;
      const iframe = modal.querySelector('iframe');
      if (!iframe || !iframe.contentDocument) return 0;
      return iframe.contentDocument.querySelectorAll('sup').length;
    });

    console.log(`📊 找到 ${supCount} 个 <sup> 标签`);

    if (supCount === 0) {
      console.log('⚠️  未找到上标元素（可能该DM中没有上标）');
    } else {
      // 检查样式
      const styleInfo = await page.evaluate(() => {
        const modal = document.querySelector('.ant-modal');
        const iframe = modal.querySelector('iframe');
        const doc = iframe.contentDocument;
        const sup = doc.querySelector('sup');

        if (!sup) return null;

        const computed = window.getComputedStyle(sup);
        const parentComputed = window.getComputedStyle(sup.parentElement);

        return {
          text: sup.textContent,
          verticalAlign: computed.verticalAlign,
          fontSize: computed.fontSize,
          parentFontSize: parentComputed.fontSize,
          lineHeight: computed.lineHeight
        };
      });

      if (styleInfo) {
        console.log(`\n上标内容: "${styleInfo.text}"`);
        console.log(`vertical-align: ${styleInfo.verticalAlign}`);
        console.log(`font-size: ${styleInfo.fontSize} (父元素: ${styleInfo.parentFontSize})`);
        console.log(`line-height: ${styleInfo.lineHeight}`);

        const fontSize = parseFloat(styleInfo.fontSize);
        const parentSize = parseFloat(styleInfo.parentFontSize);
        const ratio = (fontSize / parentSize * 100).toFixed(1);

        console.log(`字体比例: ${ratio}%`);

        if (styleInfo.verticalAlign === 'super' && ratio >= 70 && ratio <= 80) {
          console.log('\n🎉 ✅ 上标样式验证通过！');
        } else {
          console.log('\n❌ 上标样式不正确');
          console.log('期望: vertical-align=super, 字体比例70-80%');
          console.log(`实际: vertical-align=${styleInfo.verticalAlign}, 字体比例=${ratio}%`);
        }
      }
    }

    console.log('\n⏳ 保持浏览器打开60秒供您观察...');
    console.log('   您可以手动操作浏览器验证上标效果');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    await page.screenshot({ path: 'D:/workspace/IETM/cape-ietm-vue/error-screenshot.png' });
    console.log('错误截图已保存');
    console.log('\n⏳ 保持浏览器打开30秒供检查...');
    await page.waitForTimeout(30000);
  } finally {
    await browser.close();
    console.log('\n✓ 浏览器已关闭');
  }
})();
