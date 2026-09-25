// ===== Gutter图标诊断脚本 =====
// 复制整段到控制台执行

// 1. 检查图标数量
console.log('=== 步骤1: 检查图标数量 ===');
const markers = document.querySelectorAll('.gutter-design-marker');
console.log('图标数量:', markers.length);

if (markers.length === 0) {
  console.warn('⚠️ 图标数量为0，可能原因:');
  console.warn('  - XML中没有para元素');
  console.warn('  - para在黑名单父元素下');
  console.warn('  - refreshGutterMarkers未执行');
} else {
  console.log('✅ 找到', markers.length, '个图标');
}

// 2. 检查图标颜色和样式
console.log('\n=== 步骤2: 检查图标样式 ===');
const link = document.querySelector('.gutter-design-link');
if (link) {
  const linkStyle = window.getComputedStyle(link);
  console.log('颜色:', linkStyle.color);
  console.log('字号:', linkStyle.fontSize);
  console.log('显示:', linkStyle.display);
  console.log('可见性:', linkStyle.visibility);
  console.log('透明度:', linkStyle.opacity);

  if (linkStyle.color === 'rgb(255, 0, 0)') {
    console.log('✅ 红色样式已生效！');
  } else {
    console.warn('⚠️ 颜色不是红色，样式可能未生效');
  }
} else {
  console.error('❌ 未找到.gutter-design-link元素');
}

// 3. 检查铅笔图标
console.log('\n=== 步骤3: 检查铅笔图标 ===');
const pencil = document.querySelector('.fa-pencil');
if (pencil) {
  const pencilStyle = window.getComputedStyle(pencil);
  console.log('铅笔字号:', pencilStyle.fontSize);
  console.log('铅笔颜色:', pencilStyle.color);
  console.log('字体:', pencilStyle.fontFamily);

  if (pencilStyle.fontFamily.includes('FontAwesome')) {
    console.log('✅ Font Awesome字体已加载');
  } else {
    console.warn('⚠️ Font Awesome可能未加载');
  }
} else {
  console.error('❌ 未找到.fa-pencil元素');
}

// 4. 检查dmGutter
console.log('\n=== 步骤4: 检查dmGutter ===');
const dmGutter = document.querySelector('.dmGutter');
if (dmGutter) {
  const gutterStyle = window.getComputedStyle(dmGutter);
  console.log('dmGutter宽度:', gutterStyle.width);
  console.log('overflow:', gutterStyle.overflow);
  console.log('背景:', gutterStyle.background);
} else {
  console.error('❌ 未找到.dmGutter元素');
}

// 5. 手动刷新测试
console.log('\n=== 步骤5: 手动刷新 ===');
try {
  const editor = document.querySelector('.dm-source-view').__vue__;
  if (editor && editor.refreshGutterMarkers) {
    console.log('正在刷新gutter标记...');
    editor.refreshGutterMarkers();
    setTimeout(() => {
      const newMarkers = document.querySelectorAll('.gutter-design-marker');
      console.log('刷新后图标数量:', newMarkers.length);
    }, 500);
  } else {
    console.error('❌ 未找到编辑器Vue实例或refreshGutterMarkers方法');
  }
} catch (e) {
  console.error('刷新失败:', e.message);
}

console.log('\n=== 诊断完成 ===');
