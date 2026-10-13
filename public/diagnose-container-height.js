// 完整容器层级诊断
(function() {
  const wrapper = document.querySelector('.CodeMirror');
  if (!wrapper) {
    console.error('❌ CodeMirror 未找到');
    return;
  }

  console.log('=== 完整容器层级高度诊断 ===\n');

  // 向上遍历所有父容器
  let current = wrapper;
  let level = 0;
  const ancestors = [];

  while (current && level < 10) {
    const computed = getComputedStyle(current);
    ancestors.push({
      level,
      tagName: current.tagName,
      className: current.className,
      offsetHeight: current.offsetHeight,
      clientHeight: current.clientHeight,
      styleHeight: current.style.height || 'none',
      computedHeight: computed.height,
      display: computed.display,
      flex: computed.flex,
      flexGrow: computed.flexGrow,
      flexShrink: computed.flexShrink,
      flexBasis: computed.flexBasis,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight
    });
    current = current.parentElement;
    level++;
  }

  // 打印所有层级
  ancestors.forEach(a => {
    console.log(`\n层级 ${a.level}: <${a.tagName}> ${a.className ? '.' + a.className.split(' ').join('.') : ''}`);
    console.log(`  offsetHeight: ${a.offsetHeight}px`);
    console.log(`  clientHeight: ${a.clientHeight}px`);
    console.log(`  style.height: ${a.styleHeight}`);
    console.log(`  computed.height: ${a.computedHeight}`);
    console.log(`  display: ${a.display}`);
    if (a.flex !== 'none' && a.flex !== '0 1 auto') {
      console.log(`  flex: ${a.flex} (flexGrow:${a.flexGrow}, flexShrink:${a.flexShrink}, flexBasis:${a.flexBasis})`);
    }
    if (a.minHeight !== '0px') {
      console.log(`  minHeight: ${a.minHeight}`);
    }
    if (a.maxHeight !== 'none') {
      console.log(`  maxHeight: ${a.maxHeight}`);
    }
  });

  // 检查 scroller
  const scroller = document.querySelector('.CodeMirror-scroll');
  if (scroller) {
    console.log('\n=== Scroller 状态 ===');
    console.log('offsetHeight:', scroller.offsetHeight, 'px');
    console.log('style.height:', scroller.style.height || 'none');
    console.log('computed.height:', getComputedStyle(scroller).height);
  }

  // 关键问题检测
  console.log('\n=== 问题检测 ===');
  const blank = wrapper.offsetHeight - scroller.offsetHeight;
  if (blank < -50) {
    console.error('❌ Scroller 溢出 wrapper ' + Math.abs(blank) + 'px');
    console.error('   Wrapper 太小 或 Scroller 太大');
  } else if (blank > 100) {
    console.error('❌ Wrapper 下方空白 ' + blank + 'px');
    console.error('   Scroller 太小');
  } else {
    console.log('✅ 高度正常（空白 ' + blank + 'px）');
  }

  // 查找可能的高度限制
  const limitedAncestor = ancestors.find(a =>
    a.maxHeight !== 'none' ||
    parseInt(a.computedHeight) < 600 ||
    (a.styleHeight !== 'none' && !a.styleHeight.includes('%') && parseInt(a.styleHeight) < 600)
  );
  if (limitedAncestor) {
    console.warn('⚠️ 发现高度受限的祖先容器:');
    console.warn(`   层级 ${limitedAncestor.level}: ${limitedAncestor.tagName}.${limitedAncestor.className}`);
    console.warn(`   高度: ${limitedAncestor.offsetHeight}px (computed: ${limitedAncestor.computedHeight})`);
  }

  // 返回诊断数据供进一步分析
  window.__containerDiagnostics = ancestors;
  console.log('\n💡 提示: 诊断数据已保存到 window.__containerDiagnostics');
})();
