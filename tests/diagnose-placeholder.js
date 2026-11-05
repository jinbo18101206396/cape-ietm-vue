const { chromium } = require('playwright');

(async () => {
  console.log('\n=== 🔍 占位图标显示诊断 ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  try {
    // 登录
    console.log('🔵 登录...');
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', '123456');
    await page.click('button:has-text("登")');
    await page.waitForTimeout(5000);

    // 访问编辑页面
    console.log('🔵 访问编辑页面...');
    const editUrl = 'http://localhost:3000/ietm/dm-content-editor/2117143083714949122?mode=edit&dmc=DMC-ZB1-A-07-00-00-00A-007A-A_001-01_zh-CN';
    await page.goto(editUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 切换到源码视图
    const sourceTab = page.locator('[role="tab"]:has-text("源码")').first();
    if (await sourceTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sourceTab.click();
      await page.waitForTimeout(2000);
    }

    // 点击预览
    console.log('🔵 点击预览...');
    const previewBtn = page.locator('button:has-text("预览")').first();
    await previewBtn.click();
    await page.waitForTimeout(5000);

    // 检查iframe中的占位图标
    console.log('\n📊 检查iframe中的图片...\n');

    const result = await page.evaluate(() => {
      const results = {
        totalImages: 0,
        images: [],
        placeholders: []
      };

      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe, idx) => {
        try {
          const doc = iframe.contentDocument;
          const images = doc.querySelectorAll('img');
          results.totalImages += images.length;

          images.forEach((img, imgIdx) => {
            const src = img.getAttribute('src') || '';
            const actualSrc = img.src;
            const computedStyle = window.getComputedStyle(img);

            const imgInfo = {
              frameIndex: idx,
              imageIndex: imgIdx,
              id: img.id,
              className: img.className,
              srcAttribute: src,
              actualSrc: actualSrc.substring(0, 100),
              width: img.width,
              height: img.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              opacity: computedStyle.opacity,
              onclick: img.getAttribute('onclick') ? '有' : '无'
            };

            results.images.push(imgInfo);

            // 检查是否为多媒体占位图标
            if (src.includes('avicit/') || src.includes('.gif') ||
                actualSrc.includes('data:image/svg+xml')) {
              results.placeholders.push(imgInfo);
            }
          });
        } catch (e) {
          // 跨域或无法访问
        }
      });

      return results;
    });

    console.log('='.repeat(70));
    console.log(`总图片数: ${result.totalImages}`);
    console.log(`占位图标数: ${result.placeholders.length}`);
    console.log('='.repeat(70));

    console.log('\n--- 所有图片详情 ---\n');
    result.images.forEach((img, i) => {
      console.log(`图片 #${i}:`);
      console.log(`  ID: ${img.id}`);
      console.log(`  Class: ${img.className || '(空)'}`);
      console.log(`  src属性: ${img.srcAttribute}`);
      console.log(`  实际src: ${img.actualSrc}...`);
      console.log(`  尺寸: ${img.width}x${img.height} (自然尺寸: ${img.naturalWidth}x${img.naturalHeight})`);
      console.log(`  CSS显示: display=${img.display}, visibility=${img.visibility}, opacity=${img.opacity}`);
      console.log(`  onclick: ${img.onclick}`);
      console.log('');
    });

    if (result.placeholders.length > 0) {
      console.log('\n--- 占位图标详情 ---\n');
      result.placeholders.forEach((img, i) => {
        console.log(`占位图标 #${i}:`);
        console.log(`  ID: ${img.id}`);
        console.log(`  src属性: ${img.srcAttribute}`);
        console.log(`  实际src: ${img.actualSrc}...`);
        console.log(`  尺寸: ${img.width}x${img.height}`);
        console.log(`  显示状态: display=${img.display}, visibility=${img.visibility}`);

        if (img.display === 'none' || img.visibility === 'hidden' || img.opacity === '0') {
          console.log(`  ⚠️ 警告：图标被CSS隐藏了！`);
        } else if (img.width === 0 || img.height === 0) {
          console.log(`  ⚠️ 警告：图标尺寸为0！`);
        } else if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          console.log(`  ⚠️ 警告：图标加载失败（naturalWidth/Height为0）！`);
        } else {
          console.log(`  ✅ 图标应该正常显示`);
        }
        console.log('');
      });
    }

    // 截图
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/placeholder-diagnosis.png',
      fullPage: true
    });
    console.log('📸 截图已保存: placeholder-diagnosis.png');

    console.log('\n⏸️  保持浏览器打开30秒供检查...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await browser.close();
  }
})();
