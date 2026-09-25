/**
 * CodeMirror 布局问题诊断脚本
 *
 * 使用方法：
 * 1. 打开浏览器开发者工具
 * 2. 进入"项目数据模块管理"→点击"浏览或编辑DM内容"→双击para进入设计视图
 * 3. 点击"源码视图"标签切换回源码视图
 * 4. 在控制台粘贴并运行此脚本
 */

(function() {
  console.log('=== CodeMirror 布局诊断开始 ===\n');

  // 1. 检查 CodeMirror 实例
  const cmElement = document.querySelector('.CodeMirror');
  if (!cmElement) {
    console.error('❌ 找不到 CodeMirror 元素');
    return;
  }

  const cm = cmElement.CodeMirror;
  if (!cm) {
    console.error('❌ CodeMirror 实例不存在');
    return;
  }

  console.log('✓ CodeMirror 实例存在');

  // 2. 检查容器层级的可见性
  console.log('\n--- 容器可见性检查 ---');
  let element = cmElement;
  let level = 0;
  const hierarchy = [];

  while (element && level < 10) {
    const computed = getComputedStyle(element);
    const info = {
      level,
      tag: element.tagName,
      class: element.className,
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      width: element.offsetWidth,
      height: element.offsetHeight
    };
    hierarchy.push(info);

    console.log(`L${level}: <${info.tag}> .${info.class.split(' ')[0]}`);
    console.log(`  display:${info.display} visibility:${info.visibility} opacity:${info.opacity}`);
    console.log(`  size: ${info.width}×${info.height}`);

    if (computed.display === 'none') {
      console.warn(`  ⚠️ 发现隐藏容器！`);
    }

    element = element.parentElement;
    level++;
  }

  // 3. 检查 Gutters 布局
  console.log('\n--- Gutters 布局检查 ---');
  const gutters = document.querySelector('.CodeMirror-gutters');
  const lineNumbers = document.querySelector('.CodeMirror-linenumbers');
  const foldGutter = document.querySelector('.CodeMirror-foldgutter');

  if (gutters) {
    console.log('Gutters 容器:');
    console.log(`  宽度: ${gutters.offsetWidth}px (正常应该 > 50)`);
    console.log(`  高度: ${gutters.offsetHeight}px`);
    console.log(`  display: ${getComputedStyle(gutters).display}`);
  }

  if (lineNumbers) {
    console.log('行号列:');
    console.log(`  宽度: ${lineNumbers.offsetWidth}px`);
    console.log(`  left: ${lineNumbers.offsetLeft}px`);
  }

  if (foldGutter) {
    console.log('折叠列:');
    console.log(`  宽度: ${foldGutter.offsetWidth}px`);
    console.log(`  left: ${foldGutter.offsetLeft}px (正常应该 = 44)`);
  }

  // 4. 检查 CodeMirror 内部状态
  console.log('\n--- CodeMirror 内部状态 ---');
  const display = cm.display;
  console.log('display.wrapper:', display.wrapper);
  console.log('display.lineDiv:', display.lineDiv);
  console.log('display.heightForcer:', display.heightForcer);
  console.log('display.gutters:', display.gutters);
  console.log('display.lineGutter:', display.lineGutter);

  if (display.wrapper) {
    console.log('wrapper size:', display.wrapper.offsetWidth, '×', display.wrapper.offsetHeight);
  }

  // 5. 检查 CodeMirror-scroll 高度
  console.log('\n--- Scroll 容器检查 ---');
  const cmScroll = document.querySelector('.CodeMirror-scroll');
  if (cmScroll) {
    console.log(`高度: ${cmScroll.offsetHeight}px (正常应该 > 600)`);
    console.log(`scrollHeight: ${cmScroll.scrollHeight}px`);
    const scrollStyle = getComputedStyle(cmScroll);
    console.log(`height CSS: ${scrollStyle.height}`);
    console.log(`min-height CSS: ${scrollStyle.minHeight}`);
  }

  // 6. 检查 Ant Design Tabs 状态
  console.log('\n--- Tabs 状态检查 ---');
  const tabPane = cmElement.closest('.ant-tabs-tabpane');
  if (tabPane) {
    const paneStyle = getComputedStyle(tabPane);
    console.log('TabPane:');
    console.log(`  display: ${paneStyle.display}`);
    console.log(`  visibility: ${paneStyle.visibility}`);
    console.log(`  aria-hidden: ${tabPane.getAttribute('aria-hidden')}`);
    console.log(`  class: ${tabPane.className}`);
  }

  // 7. 尝试测量操作
  console.log('\n--- 尝试修复操作 ---');
  console.log('执行 cm.refresh()...');
  cm.refresh();

  setTimeout(() => {
    console.log('\n刷新后的测量结果:');
    if (gutters) console.log(`  Gutters 宽度: ${gutters.offsetWidth}px`);
    if (foldGutter) console.log(`  折叠列 left: ${foldGutter.offsetLeft}px`);
    if (cmScroll) console.log(`  Scroll 高度: ${cmScroll.offsetHeight}px`);

    const isFixed =
      gutters.offsetWidth > 50 &&
      foldGutter.offsetLeft === 44 &&
      cmScroll.offsetHeight > 600;

    if (isFixed) {
      console.log('\n✅ refresh() 成功修复问题！');
    } else {
      console.log('\n❌ refresh() 无法修复，需要 rebuild');

      // 记录当前 CodeMirror 的缓存状态
      console.log('\n--- CodeMirror 缓存状态 ---');
      const displayMeasure = display.measure;
      if (displayMeasure) {
        console.log('display.measure:', displayMeasure);
      }
      console.log('display.cachedCharWidth:', display.cachedCharWidth);
      console.log('display.cachedTextHeight:', display.cachedTextHeight);
      console.log('display.cachedPaddingH:', display.cachedPaddingH);
    }
  }, 100);

  console.log('\n=== 诊断完成 ===');
})();
