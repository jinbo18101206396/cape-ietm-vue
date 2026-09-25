/**
 * Gutter铅笔图标不可见问题诊断脚本
 * 在浏览器控制台执行
 */

(function diagnoseGutterIconVisibility() {
  console.log('=== Gutter铅笔图标可见性诊断 ===\n');

  // 1. 检查dmGutter
  const dmGutter = document.querySelector('.dmGutter');
  if (!dmGutter) {
    console.error('❌ 未找到dmGutter元素');
    return;
  }
  console.log('✅ dmGutter元素存在');

  const dmGutterStyle = window.getComputedStyle(dmGutter);
  console.log('\n📐 dmGutter尺寸:');
  console.log('  - width:', dmGutterStyle.width);
  console.log('  - height:', dmGutterStyle.height);
  console.log('  - display:', dmGutterStyle.display);
  console.log('  - overflow:', dmGutterStyle.overflow);
  console.log('  - position:', dmGutterStyle.position);

  // 2. 检查图标标记
  const markers = document.querySelectorAll('.gutter-design-marker');
  console.log('\n🎯 图标标记数量:', markers.length);

  if (markers.length === 0) {
    console.warn('⚠️ 没有图标标记，可能原因:');
    console.warn('  1. XML中没有para元素');
    console.warn('  2. para在黑名单父元素下');
    console.warn('  3. refreshGutterMarkers未执行');

    // 手动刷新试试
    console.log('\n🔄 尝试手动刷新...');
    try {
      const vueInstance = document.querySelector('.dm-source-view').__vue__;
      if (vueInstance && vueInstance.refreshGutterMarkers) {
        vueInstance.refreshGutterMarkers();
        setTimeout(() => {
          const newMarkers = document.querySelectorAll('.gutter-design-marker');
          console.log('刷新后图标数量:', newMarkers.length);
        }, 500);
      }
    } catch (e) {
      console.error('手动刷新失败:', e);
    }
    return;
  }

  // 3. 检查第一个图标
  const firstMarker = markers[0];
  console.log('\n📍 第一个图标标记:');

  const markerRect = firstMarker.getBoundingClientRect();
  console.log('  位置信息:');
  console.log('    - left:', markerRect.left);
  console.log('    - top:', markerRect.top);
  console.log('    - width:', markerRect.width);
  console.log('    - height:', markerRect.height);
  console.log('    - 是否可见:', markerRect.width > 0 && markerRect.height > 0);

  const markerStyle = window.getComputedStyle(firstMarker);
  console.log('  样式:');
  console.log('    - display:', markerStyle.display);
  console.log('    - visibility:', markerStyle.visibility);
  console.log('    - opacity:', markerStyle.opacity);
  console.log('    - z-index:', markerStyle.zIndex);

  // 4. 检查链接元素
  const link = firstMarker.querySelector('.gutter-design-link');
  if (!link) {
    console.error('❌ 未找到.gutter-design-link元素');
    return;
  }
  console.log('\n🔗 链接元素:');

  const linkRect = link.getBoundingClientRect();
  console.log('  位置信息:');
  console.log('    - left:', linkRect.left);
  console.log('    - top:', linkRect.top);
  console.log('    - width:', linkRect.width);
  console.log('    - height:', linkRect.height);
  console.log('    - 是否可见:', linkRect.width > 0 && linkRect.height > 0);

  const linkStyle = window.getComputedStyle(link);
  console.log('  样式:');
  console.log('    - display:', linkStyle.display);
  console.log('    - color:', linkStyle.color);
  console.log('    - visibility:', linkStyle.visibility);
  console.log('    - opacity:', linkStyle.opacity);

  // 5. 检查铅笔图标
  const pencil = link.querySelector('.fa-pencil');
  if (!pencil) {
    console.error('❌ 未找到.fa-pencil元素');
    return;
  }
  console.log('\n✏️ 铅笔图标:');

  const pencilRect = pencil.getBoundingClientRect();
  console.log('  位置信息:');
  console.log('    - left:', pencilRect.left);
  console.log('    - top:', pencilRect.top);
  console.log('    - width:', pencilRect.width);
  console.log('    - height:', pencilRect.height);
  console.log('    - 是否可见:', pencilRect.width > 0 && pencilRect.height > 0);

  const pencilStyle = window.getComputedStyle(pencil);
  console.log('  样式:');
  console.log('    - font-size:', pencilStyle.fontSize);
  console.log('    - color:', pencilStyle.color);
  console.log('    - visibility:', pencilStyle.visibility);
  console.log('    - opacity:', pencilStyle.opacity);
  console.log('    - font-family:', pencilStyle.fontFamily);

  // 6. 检查是否被遮挡
  console.log('\n🔍 遮挡检测:');

  // 检查dmGutter是否被其他元素覆盖
  const dmGutterRect = dmGutter.getBoundingClientRect();
  const centerX = dmGutterRect.left + dmGutterRect.width / 2;
  const centerY = dmGutterRect.top + dmGutterRect.height / 2;
  const elementAtCenter = document.elementFromPoint(centerX, centerY);

  console.log('  dmGutter中心点的元素:', elementAtCenter);
  console.log('  是否在dmGutter内:', dmGutter.contains(elementAtCenter));

  if (!dmGutter.contains(elementAtCenter)) {
    console.warn('⚠️ dmGutter被其他元素遮挡！');
    console.warn('  遮挡元素:', elementAtCenter);
  }

  // 7. 检查dmGutter相对于其他gutter的位置
  console.log('\n📏 Gutter顺序检查:');
  const lineNumbers = document.querySelector('.CodeMirror-linenumbers');
  const foldGutter = document.querySelector('.CodeMirror-foldgutter');

  if (lineNumbers) {
    const lnRect = lineNumbers.getBoundingClientRect();
    console.log('  行号gutter:', {
      left: lnRect.left,
      width: lnRect.width,
      right: lnRect.right
    });
  }

  if (foldGutter) {
    const fgRect = foldGutter.getBoundingClientRect();
    console.log('  折叠gutter:', {
      left: fgRect.left,
      width: fgRect.width,
      right: fgRect.right
    });
  }

  console.log('  dmGutter:', {
    left: dmGutterRect.left,
    width: dmGutterRect.width,
    right: dmGutterRect.right
  });

  // 8. 检查是否溢出
  console.log('\n📦 溢出检测:');
  const isOverflowing = linkRect.right > dmGutterRect.right;
  if (isOverflowing) {
    console.error('❌ 图标溢出dmGutter右边界！');
    console.error('  链接右边界:', linkRect.right);
    console.error('  gutter右边界:', dmGutterRect.right);
    console.error('  溢出距离:', linkRect.right - dmGutterRect.right, 'px');
  } else {
    console.log('✅ 图标未溢出');
  }

  // 9. 检查Font Awesome是否加载
  console.log('\n🔤 Font Awesome检测:');
  const fontFamily = pencilStyle.fontFamily;
  if (fontFamily.includes('FontAwesome')) {
    console.log('✅ Font Awesome字体已加载');
  } else {
    console.warn('⚠️ Font Awesome字体可能未加载');
    console.warn('  当前字体:', fontFamily);
  }

  // 10. 生成修复建议
  console.log('\n💡 修复建议:');

  if (markerRect.width === 0 || markerRect.height === 0) {
    console.log('1. 图标标记尺寸为0，检查CSS display/visibility/opacity');
  }

  if (linkRect.width === 0 || linkRect.height === 0) {
    console.log('2. 链接元素尺寸为0，检查inline-block是否生效');
  }

  if (pencilRect.width === 0 || pencilRect.height === 0) {
    console.log('3. 铅笔图标尺寸为0，检查font-size和FontAwesome字体');
  }

  if (isOverflowing) {
    console.log('4. 图标溢出，增加dmGutter宽度:');
    const requiredWidth = Math.ceil(linkRect.width + 4);
    console.log(`   /deep/ .dmGutter { width: ${requiredWidth}px; }`);
  }

  if (dmGutterRect.left > 1000) {
    console.log('5. dmGutter位置太靠右，检查gutter顺序配置');
  }

  console.log('\n=== 诊断完成 ===');
})();
