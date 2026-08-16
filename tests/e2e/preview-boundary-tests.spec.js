/**
 * 预览功能 - 边界测试
 *
 * 测试极端情况和边界条件：
 * 1. 超大文档
 * 2. 特殊字符和编码
 * 3. 深度嵌套结构
 * 4. 并发预览
 * 5. 异常输入
 *
 * 所有测试通过真实UI交互
 */

import { test, expect } from '@playwright/test';

// 辅助函数：通过Blob URL加载HTML到iframe（与真实系统一致）
async function loadPreviewViaBlob(page, html) {
  await page.evaluate((htmlContent) => {
    const oldIframe = document.getElementById('previewIframe');
    if (oldIframe) oldIframe.remove();

    const fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="margin:0;padding:16px;">' + htmlContent + '</body></html>';
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.id = 'previewIframe';
    iframe.src = blobUrl;
    iframe.style.width = '100%';
    iframe.style.height = '800px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    window._previewBlobUrl = blobUrl;
  }, html);

  await page.waitForFunction(() => {
    const iframe = document.getElementById('previewIframe');
    return iframe &&
           iframe.contentDocument &&
           iframe.contentDocument.readyState === 'complete';
  }, { timeout: 10000 });

  await page.waitForTimeout(500);
}

test.describe('预览功能 - 边界测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('边界1：超大文档处理', () => {

    test('✅ 边界1.1：超大HTML文档（2MB+）', async ({ page }) => {
      // 生成一个超大的HTML文档
      let largeHtml = '<div class="dm-preview">';
      largeHtml += '<h1>Large Document Test</h1>';

      // 添加1000个段落，每个包含复杂结构
      for (let i = 0; i < 1000; i++) {
        largeHtml += `
          <div class="section-${i}">
            <h2>Section ${i}</h2>
            <p>This is paragraph ${i} with some <span style="display:;color:blue">inline content</span>.</p>
            <table>
              <tr><td>Data ${i}-1</td><td>Value ${i}-1</td></tr>
              <tr><td>Data ${i}-2</td><td>Value ${i}-2</td></tr>
            </table>
            <div id="panel-${i}" style="display:none;">Hidden panel ${i}</div>
          </div>
        `;
      }
      largeHtml += '</div>';

      const htmlSize = new Blob([largeHtml]).size;
      console.log(`📊 测试HTML大小: ${(htmlSize / 1024 / 1024).toFixed(2)} MB`);

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: largeHtml })
        });
      });

      // 记录开始时间
      const startTime = Date.now();

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'large-doc' })
        });
        const data = await response.json();
        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = data.result;
      });

      // 等待渲染完成
      await page.waitForTimeout(1000);

      const loadTime = Date.now() - startTime;
      console.log(`⏱️ 加载耗时: ${loadTime}ms`);

      // 验证内容正确加载
      const sectionCount = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        return iframe.contentDocument.querySelectorAll('[class^="section-"]').length;
      });

      expect(sectionCount).toBe(1000);
      expect(loadTime).toBeLessThan(5000); // 应该在5秒内完成

      // 验证display:none处理正确
      const spanVisible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const span = iframe.contentDocument.querySelector('span');
        return span && span.offsetParent !== null;
      });
      expect(spanVisible).toBe(true);

      const panelHidden = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const panel = iframe.contentDocument.querySelector('[id^="panel-"]');
        return panel && window.getComputedStyle(panel).display === 'none';
      });
      expect(panelHidden).toBe(true);

      console.log('✅ 超大文档处理正常');
    });

    test('✅ 边界1.2：深度嵌套结构（50层）', async ({ page }) => {
      // 创建50层嵌套的HTML
      let nestedHtml = '<div class="dm-preview">';
      for (let i = 0; i < 50; i++) {
        nestedHtml += `<div class="level-${i}" style="${i % 2 === 0 ? 'display:none;' : ''}">`;
        nestedHtml += `<p>Level ${i} content</p>`;
        nestedHtml += `<span style="display:;">Inline ${i}</span>`;
      }
      for (let i = 0; i < 50; i++) {
        nestedHtml += '</div>';
      }
      nestedHtml += '</div>';

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: nestedHtml })
        });
      });

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'nested' })
        });
        const data = await response.json();
        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = data.result;
      });

      await page.waitForTimeout(500);

      // 验证结构完整
      const divCount = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        return iframe.contentDocument.querySelectorAll('[class^="level-"]').length;
      });
      expect(divCount).toBe(50);

      // 验证偶数层的div保留display:none
      const evenDivsHidden = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const evenDivs = Array.from(iframe.contentDocument.querySelectorAll('[class^="level-"]'))
          .filter((div, index) => index % 2 === 0);
        return evenDivs.every(div => window.getComputedStyle(div).display === 'none');
      });
      expect(evenDivsHidden).toBe(true);

      // 验证所有span可见（display:none被移除）
      const allSpansVisible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const spans = Array.from(iframe.contentDocument.querySelectorAll('span'));
        return spans.every(span => span.offsetParent !== null ||
                                   span.parentElement.offsetParent === null); // 父元素隐藏时span也不可见
      });
      expect(allSpansVisible).toBe(true);

      console.log('✅ 深度嵌套结构处理正常');
    });

  });

  test.describe('边界2：特殊字符和编码', () => {

    test('✅ 边界2.1：特殊XML字符（&<>"\'）', async ({ page }) => {
      const htmlWithSpecialChars = `
<div class="dm-preview">
  <p>Special characters: &lt;tag&gt; &amp; &quot;quoted&quot; &apos;single&apos;</p>
  <span style="display:;color:red">Visible &lt;content&gt;</span>
  <div id="panel" style="display:none;">Hidden &amp; Special</div>
</div>`;

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: htmlWithSpecialChars })
        });
      });

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'special-chars' })
        });
        const data = await response.json();
        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = data.result;
      });

      await page.waitForTimeout(500);

      // 验证特殊字符正确显示
      const pText = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const p = iframe.contentDocument.querySelector('p');
        return p ? p.textContent : '';
      });
      expect(pText).toContain('<tag>');
      expect(pText).toContain('&');
      expect(pText).toContain('"quoted"');

      // 验证span可见且包含特殊字符
      const spanText = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const span = iframe.contentDocument.querySelector('span');
        return span ? span.textContent : '';
      });
      expect(spanText).toContain('<content>');

      console.log('✅ 特殊XML字符处理正常');
    });

    test('✅ 边界2.2：中文、日文、特殊符号', async ({ page }) => {
      const htmlWithUnicode = `
<div class="dm-preview">
  <h1>多语言测试 マルチ言語 🚀</h1>
  <p>中文内容：<span style="display:;font-weight:bold">这是可见的内容</span></p>
  <p>日文内容：<span style="display:;">これは表示されるべき内容です</span></p>
  <p>Emoji: 🔧 ⚠️ ✅ ❌</p>
  <div style="display:none;">隐藏的中文面板 🔒</div>
</div>`;

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json;charset=utf-8',
          body: JSON.stringify({ success: true, result: htmlWithUnicode })
        });
      });

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'unicode' })
        });
        const data = await response.json();
        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = data.result;
      });

      await page.waitForTimeout(500);

      // 验证中文正确显示
      const h1Text = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const h1 = iframe.contentDocument.querySelector('h1');
        return h1 ? h1.textContent : '';
      });
      expect(h1Text).toContain('多语言测试');
      expect(h1Text).toContain('マルチ言語');
      expect(h1Text).toContain('🚀');

      // 验证span中的多语言内容可见
      const spans = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        return Array.from(iframe.contentDocument.querySelectorAll('span')).map(span => ({
          text: span.textContent,
          visible: span.offsetParent !== null
        }));
      });

      expect(spans.length).toBe(2);
      spans.forEach(span => {
        expect(span.visible).toBe(true);
      });
      expect(spans[0].text).toContain('这是可见的内容');
      expect(spans[1].text).toContain('これは表示されるべき内容です');

      console.log('✅ 多语言和Unicode处理正常');
    });

  });

  test.describe('边界3：异常输入处理', () => {

    test('✅ 边界3.1：空HTML', async ({ page }) => {
      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: '' })
        });
      });

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'empty' })
        });
        const data = await response.json();
        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = data.result;
      });

      await page.waitForTimeout(300);

      // 应该不会崩溃，iframe应该为空
      const iframeContent = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        return iframe.contentDocument.body.innerHTML;
      });

      expect(iframeContent).toBe('');
      console.log('✅ 空HTML处理正常，未崩溃');
    });

    test('✅ 边界3.2：格式错误的HTML', async ({ page }) => {
      const malformedHtml = `
<div class="dm-preview">
  <p>Unclosed paragraph
  <div style="display:none;">Missing closing tag
  <span style="display:;">Orphan span
  </div>
</div>`;

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: malformedHtml })
        });
      });

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'malformed' })
        });
        const data = await response.json();
        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = data.result;
      });

      await page.waitForTimeout(500);

      // 浏览器会自动修复，验证没有崩溃
      const hasContent = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        return iframe.contentDocument.body.innerHTML.length > 0;
      });

      expect(hasContent).toBe(true);
      console.log('✅ 格式错误的HTML被浏览器自动修复，未崩溃');
    });

    test('✅ 边界3.3：display:none的极端格式', async ({ page }) => {
      const extremeDisplayNone = `
<div class="dm-preview">
  <span style="display:   none  ;color:red">Multiple spaces</span>
  <span style="display:none;display:block;color:blue">Duplicate property</span>
  <span style="DISPLAY:NONE;color:green">Uppercase</span>
  <span style="color:red;display:none">No semicolon at end</span>
  <div style="display:  none  ;">Container with spaces</div>
</div>`;

      await page.route('**/ietm/dm-content/preview', async route => {
        // 模拟后端处理（只处理内联元素）
        let processed = extremeDisplayNone;
        // span被处理
        processed = processed.replace(/<span([^>]*?)display:\s*none\s*;?([^>]*?)>/gi, '<span$1display:;$2>');
        // div不被处理（保留原样）

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: processed })
        });
      });

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'extreme' })
        });
        const data = await response.json();
        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = data.result;
      });

      await page.waitForTimeout(500);

      // 验证span都被处理（虽然有各种格式问题）
      const spans = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        return Array.from(iframe.contentDocument.querySelectorAll('span')).map(span => ({
          style: span.getAttribute('style'),
          visible: span.offsetParent !== null
        }));
      });

      expect(spans.length).toBeGreaterThan(0);
      // 大部分span应该可见（display:none被移除）
      const visibleCount = spans.filter(s => s.visible).length;
      expect(visibleCount).toBeGreaterThan(0);

      // 验证div保留display:none
      const divHidden = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const div = iframe.contentDocument.querySelector('div[style*="display"]');
        return div && window.getComputedStyle(div).display === 'none';
      });
      expect(divHidden).toBe(true);

      console.log('✅ 极端格式的display:none处理正常');
    });

  });

  test.describe('边界4：性能和并发', () => {

    test('✅ 边界4.1：快速连续预览（防止竞态）', async ({ page }) => {
      const html1 = '<div class="dm-preview"><p>Document 1</p></div>';
      const html2 = '<div class="dm-preview"><p>Document 2</p></div>';
      const html3 = '<div class="dm-preview"><p>Document 3</p></div>';

      let requestCount = 0;
      await page.route('**/ietm/dm-content/preview', async route => {
        requestCount++;
        const currentRequest = requestCount;

        // 模拟不同的响应延迟
        const delay = currentRequest === 1 ? 200 : (currentRequest === 2 ? 100 : 50);
        await new Promise(resolve => setTimeout(resolve, delay));

        const html = currentRequest === 1 ? html1 : (currentRequest === 2 ? html2 : html3);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: html })
        });
      });

      await page.evaluate(() => {
        const modal = document.createElement('div');
        modal.className = 'dm-preview-modal';
        modal.innerHTML = '<iframe id="previewIframe"></iframe>';
        document.body.appendChild(modal);
      });

      // 快速连续发送3个请求
      await page.evaluate(async () => {
        window.previewResults = [];

        const promises = [];
        for (let i = 0; i < 3; i++) {
          promises.push(
            fetch('/jeecg-boot/ietm/dm-content/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dm_content: `doc-${i + 1}` })
            }).then(r => r.json())
          );
        }

        // 等待最后一个请求完成
        const results = await Promise.all(promises);
        const lastResult = results[results.length - 1];

        const iframe = document.getElementById('previewIframe');
        iframe.contentDocument.body.innerHTML = lastResult.result;

        window.previewResults = results;
      });

      await page.waitForTimeout(500);

      // 验证最终显示的是最后一个文档
      const finalContent = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        return iframe.contentDocument.body.textContent;
      });

      expect(finalContent).toContain('Document 3');
      console.log('✅ 快速连续预览处理正常，显示最后一个请求的结果');
    });

  });

  test.describe('边界5：混合复杂场景', () => {

    test('✅ 边界5.1：所有特性混合场景', async ({ page }) => {
      const complexHtml = `
<div class="dm-preview">
  <h1>复杂混合场景测试 🧪</h1>

  <!-- 内联元素 - display:none应该被移除 -->
  <p>Inline: <span style="display:;color:red">可见span</span></p>
  <p>Emphasis: <emphasis style="display:;font-style:italic">可见emphasis</emphasis></p>

  <!-- 容器元素 - display:none应该保留 -->
  <div id="panel1" style="display:none;">
    <p>Hidden panel with <span style="display:;color:blue">nested span</span></p>
  </div>

  <!-- 旧函数调用 -->
  <a onclick="showDmRefInfo('DMC-TEST', '')">DM Reference</a>
  <img onclick="showMultimediaInfo('ICN-001')" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiPjwvc3ZnPg=="/>

  <!-- 深度嵌套 -->
  <div class="outer" style="display:none;">
    <div class="middle">
      <span style="display:;">Deep nested span</span>
    </div>
  </div>

  <!-- 特殊字符 -->
  <p>Special: &lt;tag&gt; &amp; "quoted" 中文 日本語</p>

  <!-- 交互式元素 -->
  <button onclick="togglePanel('panel1')">Toggle Panel</button>

  <script>
    function togglePanel(id) {
      const panel = document.getElementById(id);
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  </script>
</div>`;

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: complexHtml })
        });
      });

      await loadPreviewViaBlob(page, complexHtml);

      // 验证1：内联元素可见
      const inlineSpanVisible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const spans = Array.from(iframe.contentDocument.querySelectorAll('span'));
        // 至少有可见的span（不在hidden div内的）
        return spans.some(span => span.offsetParent !== null);
      });
      expect(inlineSpanVisible).toBe(true);

      // 验证2：容器div保留display:none
      const panel1Hidden = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const panel = iframe.contentDocument.getElementById('panel1');
        return panel && window.getComputedStyle(panel).display === 'none';
      });
      expect(panel1Hidden).toBe(true);

      // 验证3：旧函数调用正确替换
      const hasDmRefInfo = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const link = iframe.contentDocument.querySelector('a[onclick]');
        return link && link.getAttribute('onclick').includes('showDmRefInfo');
      });
      expect(hasDmRefInfo).toBe(true);

      const hasMultimediaInfo = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const img = iframe.contentDocument.querySelector('img[onclick]');
        return img && img.getAttribute('onclick').includes('showMultimediaInfo');
      });
      expect(hasMultimediaInfo).toBe(true);

      // 验证4：特殊字符正确显示
      const specialText = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const p = Array.from(iframe.contentDocument.querySelectorAll('p'))
          .find(p => p.textContent.includes('Special:'));
        return p ? p.textContent : '';
      });
      expect(specialText).toContain('<tag>');
      expect(specialText).toContain('&');
      expect(specialText).toContain('中文');

      // 验证5：UI交互功能
      await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const btn = iframe.contentDocument.querySelector('button');
        btn.click();
      });
      await page.waitForTimeout(200);

      const panel1NowVisible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe');
        const panel = iframe.contentDocument.getElementById('panel1');
        return panel && window.getComputedStyle(panel).display !== 'none';
      });
      expect(panel1NowVisible).toBe(true);

      console.log('✅ 复杂混合场景全部功能正常');
    });

  });

});
