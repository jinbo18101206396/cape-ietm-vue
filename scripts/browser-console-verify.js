/**
 * GJB6600 DM 浏览器控制台验证脚本
 *
 * 使用方法：
 * 1. 在浏览器中打开 DM 编辑页面
 * 2. 按 F12 打开开发者工具
 * 3. 切换到 Console 标签
 * 4. 复制并粘贴此脚本，按回车执行
 */

(function() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     GJB6600 数据模块验证工具                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. 检查当前 URL
  const dmId = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
  console.log('1️⃣ 当前 DM ID:', dmId || '❌ 未找到');

  if (dmId !== '2083556266365288450') {
    console.warn('⚠️  当前不是目标 DM，请访问正确的页面：');
    console.log('   http://localhost:3000/#/ietm/dm-content-editor?id=2083556266365288450\n');
  }

  // 2. 检查 API 请求
  console.log('\n2️⃣ 检查最近的 API 请求...');

  // 拦截 fetch 请求
  const originalFetch = window.fetch;
  let loadApiCalled = false;

  window.fetch = async function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('/dm-content/load/')) {
      loadApiCalled = true;
      console.log('   ✓ 捕获到 load 请求:', url);

      const response = await originalFetch.apply(this, args);
      const clone = response.clone();

      clone.json().then(data => {
        if (data.result && data.result.xml) {
          const lines = data.result.xml.split('\n').length;
          console.log('\n3️⃣ API 响应分析:');
          console.log('   - 成功:', data.success ? '✅' : '❌');
          console.log('   - XML 行数:', lines);
          console.log('   - XML 长度:', data.result.xml.length, '字符');
          console.log('   - IETM 标准:', data.result.ietmStandard);
          console.log('   - 版本号:', data.result.version);
          console.log('   - XSD Schema:', data.result.xsdSchema);

          if (lines <= 5) {
            console.error('\n   ❌ 模板加载失败！只有', lines, '行');
            console.log('   XML 内容:');
            console.log('   ' + data.result.xml);
          } else {
            console.log('\n   ✅ 模板加载成功！');
            console.log('   前 300 字符:');
            console.log('   ' + data.result.xml.substring(0, 300));
          }
        }
      }).catch(e => console.error('解析响应失败:', e));

      return response;
    }
    return originalFetch.apply(this, args);
  };

  // 3. 检查页面元素
  console.log('\n4️⃣ 检查页面元素...');

  setTimeout(() => {
    // 查找编辑器
    const textarea = document.querySelector('textarea');
    const codeEditor = document.querySelector('.CodeMirror');
    const xmlEditor = document.querySelector('[class*="xml"]');

    console.log('   - Textarea:', textarea ? '✓ 找到' : '✗ 未找到');
    console.log('   - CodeMirror:', codeEditor ? '✓ 找到' : '✗ 未找到');
    console.log('   - XML 编辑器:', xmlEditor ? '✓ 找到' : '✗ 未找到');

    // 尝试获取内容
    let content = null;
    if (codeEditor && codeEditor.CodeMirror) {
      content = codeEditor.CodeMirror.getValue();
    } else if (textarea) {
      content = textarea.value;
    }

    if (content) {
      const lines = content.split('\n').length;
      console.log('\n5️⃣ 编辑器内容分析:');
      console.log('   - 行数:', lines);
      console.log('   - 长度:', content.length, '字符');
      console.log('   - 包含 <标识和状态>:', content.includes('<标识和状态>') ? '✓' : '✗');
      console.log('   - 包含 <数据模块代码>:', content.includes('<数据模块代码>') ? '✓' : '✗');

      if (lines <= 5) {
        console.error('\n   ❌ 编辑器显示空骨架！');
        console.log('   内容:');
        console.log(content);
      } else {
        console.log('\n   ✅ 编辑器显示正常！');
      }
    } else {
      console.warn('\n   ⚠️  无法从编辑器获取内容');
      console.log('   可能编辑器尚未完全加载，请稍后重试');
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('验证完成！\n');
    console.log('如果看到 ❌，说明存在问题，请：');
    console.log('1. 确认后端正在运行（http://localhost:9999）');
    console.log('2. 确认数据库修复已完成（dm_type = "description"）');
    console.log('3. 按 Ctrl+Shift+R 强制刷新页面清除缓存');
    console.log('4. 查看 Network 标签中的 dm-content/load 请求响应');
    console.log('════════════════════════════════════════════════════════════\n');

    if (!loadApiCalled) {
      console.log('💡 提示：如果 load 请求未被捕获，请刷新页面重新执行此脚本');
    }
  }, 2000);

  return '✅ 验证脚本已启动，正在监控...';
})();
