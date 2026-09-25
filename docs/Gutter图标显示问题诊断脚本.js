/**
 * Gutter图标显示问题诊断脚本
 * 在浏览器控制台执行，诊断图标显示不全的原因
 */

(function diagnoseGutterIcons() {
  console.log('=== Gutter图标显示诊断 ===\n');

  // 1. 检查CodeMirror实例
  const cmElement = document.querySelector('.CodeMirror');
  if (!cmElement) {
    console.error('❌ 未找到CodeMirror实例');
    return;
  }
  const cm = cmElement.CodeMirror;
  console.log('✅ CodeMirror实例:', cm);

  // 2. 检查gutter配置
  const gutters = cm.getOption('gutters');
  console.log('\n📋 Gutter配置:', gutters);

  // 3. 检查dmGutter DOM
  const dmGutter = document.querySelector('.dmGutter');
  if (!dmGutter) {
    console.error('❌ 未找到dmGutter元素');
    return;
  }
  console.log('✅ dmGutter元素:', dmGutter);

  // 4. 检查dmGutter样式
  const dmGutterStyle = window.getComputedStyle(dmGutter);
  console.log('\n🎨 dmGutter计算样式:');
  console.log('  - width:', dmGutterStyle.width);
  console.log('  - display:', dmGutterStyle.display);
  console.log('  - overflow:', dmGutterStyle.overflow);
  console.log('  - background:', dmGutterStyle.background);

  // 5. 检查行号gutter宽度
  const lineNumberGutter = document.querySelector('.CodeMirror-linenumbers');
  if (lineNumberGutter) {
    const lineNumberStyle = window.getComputedStyle(lineNumberGutter);
    console.log('\n📏 行号gutter宽度:', lineNumberStyle.width);
  }

  // 6. 检查折叠gutter宽度
  const foldGutter = document.querySelector('.CodeMirror-foldgutter');
  if (foldGutter) {
    const foldStyle = window.getComputedStyle(foldGutter);
    console.log('📏 折叠gutter宽度:', foldStyle.width);
  }

  // 7. 检查图标标记
  const markers = document.querySelectorAll('.gutter-design-marker');
  console.log('\n🎯 设计图标数量:', markers.length);

  if (markers.length === 0) {
    console.warn('⚠️ 没有找到设计图标，可能原因:');
    console.warn('  1. XML中没有para元素');
    console.warn('  2. para在黑名单父元素下(title/warning/caution/note/legend)');
    console.warn('  3. refreshGutterMarkers未执行');
    return;
  }

  // 8. 检查第一个图标的样式
  const firstMarker = markers[0];
  const markerStyle = window.getComputedStyle(firstMarker);
  console.log('\n🔍 第一个图标标记样式:');
  console.log('  - display:', markerStyle.display);
  console.log('  - width:', markerStyle.width);
  console.log('  - height:', markerStyle.height);
  console.log('  - padding:', markerStyle.padding);
  console.log('  - overflow:', markerStyle.overflow);

  // 9. 检查图标链接样式
  const firstLink = firstMarker.querySelector('.gutter-design-link');
  if (firstLink) {
    const linkStyle = window.getComputedStyle(firstLink);
    console.log('\n🔗 图标链接样式:');
    console.log('  - display:', linkStyle.display);
    console.log('  - width:', linkStyle.width);
    console.log('  - height:', linkStyle.height);
    console.log('  - font-size:', linkStyle.fontSize);
  }

  // 10. 检查铅笔图标样式
  const firstIcon = firstMarker.querySelector('.fa-pencil');
  if (firstIcon) {
    const iconStyle = window.getComputedStyle(firstIcon);
    console.log('\n✏️ 铅笔图标样式:');
    console.log('  - font-size:', iconStyle.fontSize);
    console.log('  - line-height:', iconStyle.lineHeight);
    console.log('  - display:', iconStyle.display);
    console.log('  - color:', iconStyle.color);
  }

  // 11. 检查图标是否被裁剪
  const markerRect = firstMarker.getBoundingClientRect();
  const linkRect = firstLink ? firstLink.getBoundingClientRect() : null;
  console.log('\n📐 图标位置信息:');
  console.log('  marker:', {
    width: markerRect.width,
    height: markerRect.height,
    visible: markerRect.width > 0 && markerRect.height > 0
  });
  if (linkRect) {
    console.log('  link:', {
      width: linkRect.width,
      height: linkRect.height,
      visible: linkRect.width > 0 && linkRect.height > 0
    });
  }

  // 12. 检查是否溢出
  if (linkRect && markerRect) {
    const isOverflow = linkRect.width > markerRect.width || linkRect.height > markerRect.height;
    if (isOverflow) {
      console.error('\n❌ 图标溢出容器！');
      console.error('  容器宽度:', markerRect.width, '图标宽度:', linkRect.width);
      console.error('  建议: 减小图标尺寸或增加dmGutter宽度');
    } else {
      console.log('\n✅ 图标未溢出');
    }
  }

  // 13. 生成修复建议
  console.log('\n💡 修复建议:');
  const dmGutterWidth = parseFloat(dmGutterStyle.width);
  const linkWidth = linkRect ? linkRect.width : 0;

  if (linkWidth > dmGutterWidth) {
    console.log('1. 增加dmGutter宽度:');
    console.log(`   /deep/ .dmGutter { width: ${Math.ceil(linkWidth + 4)}px; }`);
  }

  if (linkWidth > 16) {
    console.log('2. 或减小图标尺寸:');
    console.log('   /deep/ .gutter-design-link { width: 12px; height: 12px; }');
    console.log('   /deep/ .gutter-design-link .fa-pencil { font-size: 9px; }');
  }

  // 14. 手动刷新测试
  console.log('\n🔄 手动刷新测试命令:');
  console.log('const editor = document.querySelector(".dm-source-view").__vue__;');
  console.log('editor.refreshGutterMarkers();');

  console.log('\n=== 诊断完成 ===');
})();
