/**
 * 快速手动验证脚本 - 在浏览器控制台运行
 *
 * 使用方法：
 * 1. 场景A：直接进入源码视图 → 运行此脚本 → 记录结果
 * 2. 场景B：进入设计视图 → 切换回源码视图 → 运行此脚本 → 对比结果
 */

(function quickVerify() {
  console.clear();
  console.log('%c═══════════════════════════════════', 'color: #0066cc; font-weight: bold');
  console.log('%c  CodeMirror 快速验证', 'color: #0066cc; font-weight: bold; font-size: 16px');
  console.log('%c═══════════════════════════════════', 'color: #0066cc; font-weight: bold');
  console.log('');

  const cm = document.querySelector('.CodeMirror');
  if (!cm) {
    console.error('❌ 找不到 CodeMirror 元素');
    return;
  }

  const gutters = cm.querySelector('.CodeMirror-gutters');
  const foldGutter = cm.querySelector('.CodeMirror-foldgutter');
  const scroll = cm.querySelector('.CodeMirror-scroll');
  const firstLine = cm.querySelector('.CodeMirror-line');
  const cmInstance = cm.CodeMirror;

  const data = {
    // 核心布局
    guttersWidth: gutters?.offsetWidth || 0,
    foldGutterLeft: foldGutter?.offsetLeft || 0,
    scrollHeight: scroll?.offsetHeight || 0,

    // 文本测量
    lineHeight: firstLine?.offsetHeight || 0,
    charWidth: cmInstance?.defaultCharWidth() || 0,

    // 内部缓存
    cachedCharWidth: cmInstance?.display.cachedCharWidth || 0,
    cachedTextHeight: cmInstance?.display.cachedTextHeight || 0,

    // 时间戳
    timestamp: new Date().toISOString()
  };

  // 检查
  const checks = {
    guttersOK: data.guttersWidth > 50,
    foldGutterOK: data.foldGutterLeft === 44,
    scrollOK: data.scrollHeight > 600,
    lineHeightOK: data.lineHeight > 15 && data.lineHeight < 30,
    charWidthOK: data.charWidth > 5 && data.charWidth < 15
  };

  const allOK = Object.values(checks).every(v => v);

  // 显示结果
  console.log('📊 测量结果:');
  console.log('─────────────────────────────────────');
  console.log((checks.guttersOK ? '✅' : '❌') + ' Gutters 宽度:', data.guttersWidth, '(期望 > 50)');
  console.log((checks.foldGutterOK ? '✅' : '❌') + ' 折叠列位置:', data.foldGutterLeft, '(期望 = 44)');
  console.log((checks.scrollOK ? '✅' : '❌') + ' Scroll 高度:', data.scrollHeight, '(期望 > 600)');
  console.log((checks.lineHeightOK ? '✅' : '❌') + ' 行高:', data.lineHeight, '(期望 15-30)');
  console.log((checks.charWidthOK ? '✅' : '❌') + ' 字符宽度:', data.charWidth.toFixed(2), '(期望 5-15)');
  console.log('');
  console.log('🔧 内部状态:');
  console.log('   缓存字符宽度:', data.cachedCharWidth?.toFixed(2) || 'N/A');
  console.log('   缓存文本高度:', data.cachedTextHeight?.toFixed(2) || 'N/A');
  console.log('');

  if (allOK) {
    console.log('%c✅ 所有检查通过！', 'color: green; font-weight: bold; font-size: 14px');
  } else {
    console.log('%c❌ 发现问题！', 'color: red; font-weight: bold; font-size: 14px');
  }

  console.log('');
  console.log('─────────────────────────────────────');
  console.log('💾 保存到全局变量: window.__cmData');
  console.log('');

  // 保存数据
  window.__cmData = window.__cmData || { history: [] };
  const label = prompt('场景标识（direct=直接进入, switched=切换进入）:',
    window.__cmData.history.length === 0 ? 'direct' : 'switched');

  window.__cmData[label] = data;
  window.__cmData.history.push({ label, data, timestamp: data.timestamp });

  console.log('已保存为:', label);

  // 如果有两个场景，自动对比
  if (window.__cmData.direct && window.__cmData.switched) {
    console.log('');
    console.log('%c═══════════════════════════════════', 'color: #cc6600; font-weight: bold');
    console.log('%c  对比分析', 'color: #cc6600; font-weight: bold; font-size: 16px');
    console.log('%c═══════════════════════════════════', 'color: #cc6600; font-weight: bold');
    console.log('');

    const d = window.__cmData.direct;
    const s = window.__cmData.switched;

    const diffs = [
      { name: 'Gutters 宽度', d: d.guttersWidth, s: s.guttersWidth, tol: 5 },
      { name: '折叠列位置', d: d.foldGutterLeft, s: s.foldGutterLeft, tol: 2 },
      { name: 'Scroll 高度', d: d.scrollHeight, s: s.scrollHeight, tol: 50 },
      { name: '行高', d: d.lineHeight, s: s.lineHeight, tol: 2 },
      { name: '字符宽度', d: d.charWidth, s: s.charWidth, tol: 1 },
      { name: '缓存字符宽度', d: d.cachedCharWidth, s: s.cachedCharWidth, tol: 1 },
      { name: '缓存文本高度', d: d.cachedTextHeight, s: s.cachedTextHeight, tol: 2 }
    ];

    let allMatch = true;
    diffs.forEach(diff => {
      const delta = Math.abs(diff.d - diff.s);
      const match = delta <= diff.tol;
      const icon = match ? '✅' : '❌';

      console.log(`${icon} ${diff.name}:`);
      console.log(`   直接: ${diff.d.toFixed?.(2) || diff.d}`);
      console.log(`   切换: ${diff.s.toFixed?.(2) || diff.s}`);
      console.log(`   差异: ${delta.toFixed(2)} (容差: ${diff.tol})`);

      if (!match) {
        allMatch = false;
        console.log(`   %c⚠️ 超出容差！`, 'color: orange; font-weight: bold');
      }
      console.log('');
    });

    console.log('─────────────────────────────────────');
    if (allMatch) {
      console.log('%c🎉 完美匹配！两种方式完全一致！', 'color: green; font-weight: bold; font-size: 14px');
    } else {
      console.log('%c⚠️ 发现差异！需要进一步修复。', 'color: orange; font-weight: bold; font-size: 14px');
    }
    console.log('');

    // 导出对比报告
    console.log('📥 导出对比数据:');
    console.log('copy(window.__cmData) 可复制完整数据');
    console.log('');

    return { allMatch, diffs, direct: d, switched: s };
  }

  console.log('提示: 切换到另一个场景后再次运行此脚本进行对比');
  console.log('');

  return data;
})();
