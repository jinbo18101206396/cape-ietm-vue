/**
 * CodeMirror 完全一致性验证脚本
 *
 * 对比"直接进入"vs"切换进入"两种方式下的所有样式、布局、排版
 */

(function comprehensiveVerification() {
  console.log('\n========================================');
  console.log('CodeMirror 完全一致性验证');
  console.log('========================================\n');

  const cmElement = document.querySelector('.CodeMirror');
  if (!cmElement) {
    console.error('❌ 找不到 CodeMirror 元素');
    return null;
  }

  const cm = cmElement.CodeMirror;
  if (!cm) {
    console.error('❌ CodeMirror 实例不存在');
    return null;
  }

  // ============================================
  // 1. 布局尺寸测量
  // ============================================
  console.log('📏 1. 布局尺寸测量');
  console.log('─────────────────────────────────────');

  const wrapper = cmElement.querySelector('.CodeMirror-wrapper') || cmElement;
  const gutters = cmElement.querySelector('.CodeMirror-gutters');
  const lineNumbers = cmElement.querySelector('.CodeMirror-linenumbers');
  const foldGutter = cmElement.querySelector('.CodeMirror-foldgutter');
  const dmGutter = cmElement.querySelector('.dmGutter');
  const sizer = cmElement.querySelector('.CodeMirror-sizer');
  const lines = cmElement.querySelector('.CodeMirror-lines');
  const scroll = cmElement.querySelector('.CodeMirror-scroll');
  const vScrollbar = cmElement.querySelector('.CodeMirror-vscrollbar');
  const hScrollbar = cmElement.querySelector('.CodeMirror-hscrollbar');

  const layout = {
    wrapper: {
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight,
      clientWidth: wrapper.clientWidth,
      clientHeight: wrapper.clientHeight
    },
    gutters: {
      width: gutters?.offsetWidth || 0,
      height: gutters?.offsetHeight || 0,
      left: gutters?.offsetLeft || 0,
      top: gutters?.offsetTop || 0
    },
    lineNumbers: {
      width: lineNumbers?.offsetWidth || 0,
      left: lineNumbers?.offsetLeft || 0
    },
    foldGutter: {
      width: foldGutter?.offsetWidth || 0,
      left: foldGutter?.offsetLeft || 0
    },
    dmGutter: {
      width: dmGutter?.offsetWidth || 0,
      left: dmGutter?.offsetLeft || 0
    },
    sizer: {
      width: sizer?.offsetWidth || 0,
      height: sizer?.offsetHeight || 0,
      left: sizer?.offsetLeft || 0
    },
    lines: {
      paddingLeft: lines ? parseInt(getComputedStyle(lines).paddingLeft) : 0,
      paddingTop: lines ? parseInt(getComputedStyle(lines).paddingTop) : 0
    },
    scroll: {
      width: scroll?.offsetWidth || 0,
      height: scroll?.offsetHeight || 0,
      scrollWidth: scroll?.scrollWidth || 0,
      scrollHeight: scroll?.scrollHeight || 0
    },
    scrollbars: {
      vScrollbar: vScrollbar?.offsetWidth || 0,
      hScrollbar: hScrollbar?.offsetHeight || 0
    }
  };

  console.log('Wrapper:', layout.wrapper.width, '×', layout.wrapper.height);
  console.log('Gutters:', layout.gutters.width, '×', layout.gutters.height, '@', layout.gutters.left);
  console.log('  ├─ LineNumbers:', layout.lineNumbers.width, '@', layout.lineNumbers.left);
  console.log('  ├─ FoldGutter:', layout.foldGutter.width, '@', layout.foldGutter.left);
  console.log('  └─ DmGutter:', layout.dmGutter.width, '@', layout.dmGutter.left);
  console.log('Sizer:', layout.sizer.width, '×', layout.sizer.height, '@', layout.sizer.left);
  console.log('Scroll:', layout.scroll.width, '×', layout.scroll.height);
  console.log('  内容尺寸:', layout.scroll.scrollWidth, '×', layout.scroll.scrollHeight);

  // ============================================
  // 2. 样式检查
  // ============================================
  console.log('\n🎨 2. 样式检查');
  console.log('─────────────────────────────────────');

  const cmStyle = getComputedStyle(cmElement);
  const guttersStyle = gutters ? getComputedStyle(gutters) : null;
  const scrollStyle = scroll ? getComputedStyle(scroll) : null;
  const linesStyle = lines ? getComputedStyle(lines) : null;

  const styles = {
    cm: {
      position: cmStyle.position,
      overflow: cmStyle.overflow,
      fontSize: cmStyle.fontSize,
      fontFamily: cmStyle.fontFamily,
      lineHeight: cmStyle.lineHeight,
      color: cmStyle.color,
      backgroundColor: cmStyle.backgroundColor
    },
    gutters: guttersStyle ? {
      backgroundColor: guttersStyle.backgroundColor,
      borderRight: guttersStyle.borderRight,
      boxSizing: guttersStyle.boxSizing,
      position: guttersStyle.position,
      zIndex: guttersStyle.zIndex
    } : null,
    scroll: scrollStyle ? {
      overflow: scrollStyle.overflow,
      position: scrollStyle.position,
      height: scrollStyle.height,
      minHeight: scrollStyle.minHeight
    } : null,
    lines: linesStyle ? {
      paddingLeft: linesStyle.paddingLeft,
      paddingTop: linesStyle.paddingTop,
      paddingBottom: linesStyle.paddingBottom,
      cursor: linesStyle.cursor
    } : null
  };

  console.log('CodeMirror:');
  console.log('  font:', styles.cm.fontSize, styles.cm.fontFamily);
  console.log('  line-height:', styles.cm.lineHeight);
  console.log('  color:', styles.cm.color);
  console.log('  background:', styles.cm.backgroundColor);

  if (guttersStyle) {
    console.log('Gutters:');
    console.log('  background:', styles.gutters.backgroundColor);
    console.log('  border-right:', styles.gutters.borderRight);
    console.log('  z-index:', styles.gutters.zIndex);
  }

  if (scrollStyle) {
    console.log('Scroll:');
    console.log('  overflow:', styles.scroll.overflow);
    console.log('  height:', styles.scroll.height);
    console.log('  min-height:', styles.scroll.minHeight);
  }

  // ============================================
  // 3. 行高和文本测量
  // ============================================
  console.log('\n📐 3. 行高和文本测量');
  console.log('─────────────────────────────────────');

  const firstLine = cmElement.querySelector('.CodeMirror-line');
  const lineHeight = firstLine ? firstLine.offsetHeight : 0;
  const lineStyle = firstLine ? getComputedStyle(firstLine) : null;

  const textMetrics = {
    lineHeight: lineHeight,
    lineStyle: lineStyle ? {
      height: lineStyle.height,
      lineHeight: lineStyle.lineHeight,
      paddingTop: lineStyle.paddingTop,
      paddingBottom: lineStyle.paddingBottom
    } : null,
    charWidth: cm.defaultCharWidth(),
    lineCount: cm.lineCount()
  };

  console.log('行高:', textMetrics.lineHeight, 'px');
  if (lineStyle) {
    console.log('  CSS height:', textMetrics.lineStyle.height);
    console.log('  CSS line-height:', textMetrics.lineStyle.lineHeight);
  }
  console.log('字符宽度:', textMetrics.charWidth, 'px');
  console.log('总行数:', textMetrics.lineCount);

  // ============================================
  // 4. Gutter 内容检查
  // ============================================
  console.log('\n🔢 4. Gutter 内容检查');
  console.log('─────────────────────────────────────');

  const lineNumberElements = cmElement.querySelectorAll('.CodeMirror-linenumber');
  const foldMarkers = cmElement.querySelectorAll('.CodeMirror-foldgutter-open, .CodeMirror-foldgutter-folded');
  const dmGutterMarkers = cmElement.querySelectorAll('.dmGutter .gutter-marker');

  const gutterContent = {
    lineNumbers: {
      count: lineNumberElements.length,
      first: lineNumberElements[0]?.textContent || '',
      last: lineNumberElements[lineNumberElements.length - 1]?.textContent || ''
    },
    foldMarkers: {
      count: foldMarkers.length,
      open: cmElement.querySelectorAll('.CodeMirror-foldgutter-open').length,
      folded: cmElement.querySelectorAll('.CodeMirror-foldgutter-folded').length
    },
    dmGutterMarkers: {
      count: dmGutterMarkers.length
    }
  };

  console.log('行号:');
  console.log('  数量:', gutterContent.lineNumbers.count);
  console.log('  首行:', gutterContent.lineNumbers.first);
  console.log('  末行:', gutterContent.lineNumbers.last);
  console.log('折叠标记:');
  console.log('  总数:', gutterContent.foldMarkers.count);
  console.log('  展开:', gutterContent.foldMarkers.open);
  console.log('  折叠:', gutterContent.foldMarkers.folded);
  console.log('DM标记:', gutterContent.dmGutterMarkers.count);

  // ============================================
  // 5. CodeMirror 内部状态
  // ============================================
  console.log('\n⚙️  5. CodeMirror 内部状态');
  console.log('─────────────────────────────────────');

  const display = cm.display;
  const internalState = {
    cachedCharWidth: display.cachedCharWidth,
    cachedTextHeight: display.cachedTextHeight,
    cachedPaddingH: display.cachedPaddingH,
    scroller: {
      clientWidth: display.scroller?.clientWidth || 0,
      clientHeight: display.scroller?.clientHeight || 0
    },
    lineDiv: {
      offsetHeight: display.lineDiv?.offsetHeight || 0,
      childNodes: display.lineDiv?.childNodes.length || 0
    }
  };

  console.log('缓存的字符宽度:', internalState.cachedCharWidth);
  console.log('缓存的文本高度:', internalState.cachedTextHeight);
  console.log('缓存的水平内边距:', internalState.cachedPaddingH);
  console.log('Scroller 客户端尺寸:', internalState.scroller.clientWidth, '×', internalState.scroller.clientHeight);
  console.log('LineDiv 高度:', internalState.lineDiv.offsetHeight);
  console.log('LineDiv 子节点数:', internalState.lineDiv.childNodes);

  // ============================================
  // 6. 容器可见性
  // ============================================
  console.log('\n👁️  6. 容器可见性');
  console.log('─────────────────────────────────────');

  const tabPane = cmElement.closest('.ant-tabs-tabpane');
  const sourceView = cmElement.closest('.dm-source-view');

  const visibility = {
    tabPane: tabPane ? {
      display: getComputedStyle(tabPane).display,
      visibility: getComputedStyle(tabPane).visibility,
      ariaHidden: tabPane.getAttribute('aria-hidden'),
      className: tabPane.className
    } : null,
    sourceView: sourceView ? {
      display: getComputedStyle(sourceView).display,
      offsetHeight: sourceView.offsetHeight
    } : null
  };

  if (tabPane) {
    console.log('TabPane:');
    console.log('  display:', visibility.tabPane.display);
    console.log('  visibility:', visibility.tabPane.visibility);
    console.log('  aria-hidden:', visibility.tabPane.ariaHidden);
    console.log('  active:', visibility.tabPane.className.includes('active'));
  }

  if (sourceView) {
    console.log('SourceView:');
    console.log('  display:', visibility.sourceView.display);
    console.log('  height:', visibility.sourceView.offsetHeight);
  }

  // ============================================
  // 7. 滚动位置
  // ============================================
  console.log('\n📜 7. 滚动位置');
  console.log('─────────────────────────────────────');

  const scrollInfo = cm.getScrollInfo();
  const scrollPosition = {
    left: scrollInfo.left,
    top: scrollInfo.top,
    width: scrollInfo.width,
    height: scrollInfo.height,
    clientWidth: scrollInfo.clientWidth,
    clientHeight: scrollInfo.clientHeight
  };

  console.log('滚动位置:', scrollPosition.left, ',', scrollPosition.top);
  console.log('可见区域:', scrollPosition.clientWidth, '×', scrollPosition.clientHeight);
  console.log('内容尺寸:', scrollPosition.width, '×', scrollPosition.height);

  // ============================================
  // 8. 光标和选区
  // ============================================
  console.log('\n✏️  8. 光标和选区');
  console.log('─────────────────────────────────────');

  const cursor = cm.getCursor();
  const selection = cm.getSelection();

  const cursorInfo = {
    line: cursor.line,
    ch: cursor.ch,
    hasSelection: selection.length > 0,
    selectionLength: selection.length
  };

  console.log('光标位置:', cursorInfo.line + 1, ':', cursorInfo.ch + 1);
  console.log('选中文本:', cursorInfo.hasSelection ? cursorInfo.selectionLength + ' 个字符' : '无');

  // ============================================
  // 9. 综合评分
  // ============================================
  console.log('\n✅ 9. 综合评分');
  console.log('─────────────────────────────────────');

  const checks = [
    {
      name: 'Gutters 宽度',
      pass: layout.gutters.width > 50,
      value: layout.gutters.width,
      expected: '> 50'
    },
    {
      name: '行号列位置',
      pass: layout.lineNumbers.left === 0,
      value: layout.lineNumbers.left,
      expected: '0'
    },
    {
      name: '折叠列位置',
      pass: layout.foldGutter.left === 44,
      value: layout.foldGutter.left,
      expected: '44'
    },
    {
      name: 'Scroll 高度',
      pass: layout.scroll.height > 600,
      value: layout.scroll.height,
      expected: '> 600'
    },
    {
      name: '行高正常',
      pass: textMetrics.lineHeight > 15 && textMetrics.lineHeight < 30,
      value: textMetrics.lineHeight,
      expected: '15-30'
    },
    {
      name: '字符宽度正常',
      pass: textMetrics.charWidth > 5 && textMetrics.charWidth < 15,
      value: textMetrics.charWidth,
      expected: '5-15'
    },
    {
      name: '行号数量正确',
      pass: gutterContent.lineNumbers.count === textMetrics.lineCount,
      value: gutterContent.lineNumbers.count,
      expected: textMetrics.lineCount
    },
    {
      name: 'TabPane 可见',
      pass: visibility.tabPane && visibility.tabPane.display !== 'none',
      value: visibility.tabPane?.display || 'N/A',
      expected: '!= none'
    },
    {
      name: '缓存字符宽度有效',
      pass: internalState.cachedCharWidth && internalState.cachedCharWidth > 5,
      value: internalState.cachedCharWidth,
      expected: '> 5'
    },
    {
      name: '缓存文本高度有效',
      pass: internalState.cachedTextHeight && internalState.cachedTextHeight > 15,
      value: internalState.cachedTextHeight,
      expected: '> 15'
    }
  ];

  let passCount = 0;
  checks.forEach(check => {
    const icon = check.pass ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.value} (期望: ${check.expected})`);
    if (check.pass) passCount++;
  });

  const score = Math.round((passCount / checks.length) * 100);
  console.log('\n综合得分:', score, '/ 100');

  // ============================================
  // 10. 返回完整数据
  // ============================================
  const result = {
    timestamp: new Date().toISOString(),
    score,
    passCount,
    totalChecks: checks.length,
    layout,
    styles,
    textMetrics,
    gutterContent,
    internalState,
    visibility,
    scrollPosition,
    cursorInfo,
    checks
  };

  console.log('\n========================================');
  if (score === 100) {
    console.log('🎉 完美！所有检查通过！');
  } else if (score >= 80) {
    console.log('⚠️  基本正常，但有', checks.length - passCount, '项需要注意');
  } else {
    console.log('❌ 发现', checks.length - passCount, '项问题，需要修复');
  }
  console.log('========================================\n');

  // 保存到全局变量供对比
  window.__cmVerification = window.__cmVerification || {};
  const mode = prompt('请输入当前场景标识（direct=直接进入，switched=切换进入）:', 'direct');
  window.__cmVerification[mode] = result;

  if (mode === 'switched' && window.__cmVerification.direct) {
    console.log('\n📊 对比分析：直接进入 vs 切换进入');
    console.log('========================================');
    compareResults(window.__cmVerification.direct, window.__cmVerification.switched);
  }

  return result;
})();

// 对比两次测量结果
function compareResults(direct, switched) {
  const tolerance = {
    width: 5,
    height: 50,
    position: 2,
    charWidth: 1,
    lineHeight: 2
  };

  console.log('\n布局差异:');
  compareMeasurement('Gutters 宽度', direct.layout.gutters.width, switched.layout.gutters.width, tolerance.width);
  compareMeasurement('Gutters 高度', direct.layout.gutters.height, switched.layout.gutters.height, tolerance.height);
  compareMeasurement('折叠列位置', direct.layout.foldGutter.left, switched.layout.foldGutter.left, tolerance.position);
  compareMeasurement('Scroll 高度', direct.layout.scroll.height, switched.layout.scroll.height, tolerance.height);

  console.log('\n文本测量差异:');
  compareMeasurement('行高', direct.textMetrics.lineHeight, switched.textMetrics.lineHeight, tolerance.lineHeight);
  compareMeasurement('字符宽度', direct.textMetrics.charWidth, switched.textMetrics.charWidth, tolerance.charWidth);

  console.log('\n内部状态差异:');
  compareMeasurement('缓存字符宽度', direct.internalState.cachedCharWidth, switched.internalState.cachedCharWidth, tolerance.charWidth);
  compareMeasurement('缓存文本高度', direct.internalState.cachedTextHeight, switched.internalState.cachedTextHeight, tolerance.lineHeight);

  console.log('\n综合评分差异:', switched.score - direct.score, '分');
}

function compareMeasurement(name, directValue, switchedValue, tolerance) {
  const diff = Math.abs(directValue - switchedValue);
  const pass = diff <= tolerance;
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${name}: ${directValue} → ${switchedValue} (差异: ${diff.toFixed(2)}, 容差: ${tolerance})`);
}
