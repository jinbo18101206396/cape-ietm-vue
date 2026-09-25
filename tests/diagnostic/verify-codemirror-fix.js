/**
 * CodeMirror 布局修复验证脚本
 *
 * 测试步骤：
 * 1. 进入"项目数据模块管理"
 * 2. 点击某个 DM 的"浏览或编辑DM内容"
 * 3. 双击左侧树的 para 节点进入设计视图
 * 4. 点击底部"源码视图"标签
 * 5. 在控制台运行此脚本
 *
 * 预期结果：
 * - Gutters 宽度 > 50px
 * - 折叠列位置 = 44px
 * - Scroll 高度 > 600px
 * - 所有检查通过显示 ✅✅✅
 */

(function verifyCodeMirrorFix() {
  console.log('\n=== CodeMirror 布局修复验证 ===\n');

  // 1. 查找 CodeMirror 元素
  const cmElement = document.querySelector('.CodeMirror');
  if (!cmElement) {
    console.error('❌ 错误：找不到 CodeMirror 元素');
    console.log('请确保：');
    console.log('  1. 已进入 DM 内容编辑器');
    console.log('  2. 当前在源码视图（不是设计视图）');
    return;
  }

  const cm = cmElement.CodeMirror;
  if (!cm) {
    console.error('❌ 错误：CodeMirror 实例不存在');
    return;
  }

  console.log('✓ CodeMirror 实例已找到\n');

  // 2. 获取关键元素
  const gutters = cmElement.querySelector('.CodeMirror-gutters');
  const lineNumbers = cmElement.querySelector('.CodeMirror-linenumbers');
  const foldGutter = cmElement.querySelector('.CodeMirror-foldgutter');
  const cmScroll = cmElement.querySelector('.CodeMirror-scroll');

  if (!gutters || !lineNumbers || !foldGutter || !cmScroll) {
    console.error('❌ 错误：CodeMirror 关键元素缺失');
    return;
  }

  // 3. 测量尺寸
  const measurements = {
    guttersWidth: gutters.offsetWidth,
    guttersHeight: gutters.offsetHeight,
    lineNumbersWidth: lineNumbers.offsetWidth,
    lineNumbersLeft: lineNumbers.offsetLeft,
    foldGutterWidth: foldGutter.offsetWidth,
    foldGutterLeft: foldGutter.offsetLeft,
    scrollHeight: cmScroll.offsetHeight,
    scrollWidth: cmScroll.offsetWidth
  };

  console.log('--- 测量结果 ---');
  console.log('Gutters 容器:');
  console.log(`  宽度: ${measurements.guttersWidth}px (期望 > 50)`);
  console.log(`  高度: ${measurements.guttersHeight}px`);

  console.log('\n行号列:');
  console.log(`  宽度: ${measurements.lineNumbersWidth}px`);
  console.log(`  位置: ${measurements.lineNumbersLeft}px (应该 = 0)`);

  console.log('\n折叠列:');
  console.log(`  宽度: ${measurements.foldGutterWidth}px`);
  console.log(`  位置: ${measurements.foldGutterLeft}px (期望 = 44)`);

  console.log('\nScroll 容器:');
  console.log(`  高度: ${measurements.scrollHeight}px (期望 > 600)`);
  console.log(`  宽度: ${measurements.scrollWidth}px`);

  // 4. 检查容器可见性
  console.log('\n--- 容器可见性 ---');
  const tabPane = cmElement.closest('.ant-tabs-tabpane');
  if (tabPane) {
    const tabPaneStyle = getComputedStyle(tabPane);
    console.log('TabPane:');
    console.log(`  display: ${tabPaneStyle.display} (应该不是 none)`);
    console.log(`  visibility: ${tabPaneStyle.visibility}`);
    console.log(`  aria-hidden: ${tabPane.getAttribute('aria-hidden')}`);
  } else {
    console.warn('⚠️ 未找到 TabPane 容器');
  }

  const sourceView = cmElement.closest('.dm-source-view');
  if (sourceView) {
    console.log('DmSourceView:');
    console.log(`  offsetHeight: ${sourceView.offsetHeight}px`);
  }

  // 5. 验证结果
  console.log('\n--- 验证结果 ---');

  const checks = [
    {
      name: 'Gutters 宽度',
      pass: measurements.guttersWidth > 50,
      actual: measurements.guttersWidth,
      expected: '> 50'
    },
    {
      name: '折叠列位置',
      pass: measurements.foldGutterLeft === 44,
      actual: measurements.foldGutterLeft,
      expected: '44'
    },
    {
      name: 'Scroll 高度',
      pass: measurements.scrollHeight > 600,
      actual: measurements.scrollHeight,
      expected: '> 600'
    },
    {
      name: 'TabPane 可见',
      pass: tabPane && getComputedStyle(tabPane).display !== 'none',
      actual: tabPane ? getComputedStyle(tabPane).display : 'N/A',
      expected: '!= none'
    }
  ];

  let allPassed = true;
  checks.forEach(check => {
    const icon = check.pass ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.actual} (期望 ${check.expected})`);
    if (!check.pass) allPassed = false;
  });

  // 6. 总结
  console.log('\n--- 总结 ---');
  if (allPassed) {
    console.log('✅✅✅ 所有检查通过！布局正常！');
    console.log('修复成功：从设计视图切换到源码视图的布局问题已解决。');
  } else {
    console.log('❌❌❌ 检查失败！布局仍有问题！');
    console.log('\n可能的原因：');
    console.log('1. rebuildEditor() 未被调用');
    console.log('2. TabPane 在重建时仍然隐藏');
    console.log('3. 时序问题：重建发生在 DOM 完全可见之前');
    console.log('\n调试建议：');
    console.log('- 打开控制台查看 [rebuildEditor] 相关日志');
    console.log('- 检查是否看到 "TabPane 仍然隐藏" 或 "容器高度为 0" 警告');
    console.log('- 手动调用 vm.$refs.editor.rebuildEditor() 看是否能修复');
  }

  // 7. 返回详细数据供进一步分析
  return {
    passed: allPassed,
    measurements,
    checks,
    cm
  };
})();
