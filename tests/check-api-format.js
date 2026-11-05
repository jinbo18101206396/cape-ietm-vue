const { chromium } = require('playwright');

(async () => {
  console.log('\n=== 🔍 检查后端API返回格式 ===\n');

  const browser = await chromium.launch({ headless: false });
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

    // 获取token
    const token = await page.evaluate(() => {
      return localStorage.getItem('pro__Access-Token') ||
             window.$store?.getters?.token ||
             '';
    });
    console.log('Token:', token ? token.substring(0, 50) + '...' : '未找到');

    // 测试API
    const icnCode = 'ICN-ZB1-A-020000-60101-30101-00017-A-001-01';
    const apiUrl = `http://localhost:9999/jeecg-boot/ietm/icn/view/${icnCode}`;

    console.log(`\n🔵 测试API: ${apiUrl}\n`);

    const result = await page.evaluate(async ({ url, token }) => {
      const response = await fetch(url, {
        headers: { 'X-Access-Token': token }
      });

      const info = {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      };

      // 尝试多种读取方式
      const textData = await response.clone().text();
      const blobData = await response.clone().blob();

      info.textLength = textData.length;
      info.textPreview = textData.substring(0, 100);
      info.blobSize = blobData.size;
      info.blobType = blobData.type;

      // 检查是否是纯base64
      info.isPureBase64 = /^[A-Za-z0-9+/=]+$/.test(textData.substring(0, 100));
      info.startsWithSlash9j = textData.startsWith('/9j/');
      info.startsWithData = textData.startsWith('data:');

      return info;
    }, { url: apiUrl, token });

    console.log('📊 API响应信息:');
    console.log('  Status:', result.status, result.statusText);
    console.log('  Content-Type:', result.contentType);
    console.log('  Content-Length:', result.contentLength);
    console.log('  Text长度:', result.textLength);
    console.log('  Blob大小:', result.blobSize);
    console.log('  Blob类型:', result.blobType);
    console.log('  是否纯base64:', result.isPureBase64);
    console.log('  以/9j/开头:', result.startsWithSlash9j);
    console.log('  以data:开头:', result.startsWithData);
    console.log('  文本预览:', result.textPreview);

    console.log('\n='.repeat(60));
    console.log('🔍 问题分析');
    console.log('='.repeat(60));

    if (result.contentType && result.contentType.includes('image/')) {
      console.log('❌ 后端返回的是二进制图片数据（image/*）');
      console.log('   前端不应该用 response.text() 读取');
      console.log('   应该用 response.blob() 或 response.arrayBuffer()');
    } else if (result.startsWithSlash9j || result.isPureBase64) {
      console.log('✅ 后端返回的是纯base64字符串');
      console.log('   前端可以直接用 response.text() 读取');
    } else if (result.startsWithData) {
      console.log('✅ 后端返回的是完整的data URL');
      console.log('   前端可以直接使用');
    } else {
      console.log('⚠️ 后端返回格式不明确');
      console.log('   需要根据实际情况调整读取方式');
    }

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await browser.close();
  }
})();
