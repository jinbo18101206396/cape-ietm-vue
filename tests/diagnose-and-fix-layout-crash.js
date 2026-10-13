/**
 * ParaDesigner 行距崩溃 - 诊断和修复工具
 *
 * 使用方法：
 * 1. 打开浏览器 Developer Tools (F12)
 * 2. 进入 Console 标签
 * 3. 复制粘贴此整个文件的内容
 * 4. 按 Enter 执行
 */

console.log('%c=== ParaDesigner 行距崩溃诊断工具 ===', 'font-size: 14px; font-weight: bold; color: #ff6b6b;');

// ============ 诊断函数 ============

function diagnoseCodeMirrorCrash() {
  const cm = document.querySelector('.CodeMirror')?.CodeMirror;
  if (!cm) {
    console.error('❌ CodeMirror 实例不存在');
    return null;
  }

  console.log('\n📊 布局诊断中...\n');

  const result = {
    exists: true,
    lineCount: cm.lineCount(),
    visibleLines: 0,
    lineHeights: [],
    gutterWidth: 0,
    crashed: false
  };

  // 测量所有行的高度
  const lines = document.querySelectorAll('.CodeMirror-line');
  let totalHeight = 0;
  let minHeight = Infinity;
  let maxHeight = 0;

  lines.forEach((line, idx) => {
    const rect = line.getBoundingClientRect();
    if (rect.height > 0) {
      result.visibleLines++;
      result.lineHeights.push(rect.height);
      totalHeight += rect.height;
      minHeight = Math.min(minHeight, rect.height);
      maxHeight = Math.max(maxHeight, rect.height);
    }
  });

  result.avgHeight = result.visibleLines > 0 ? totalHeight / result.visibleLines : 0;
  result.minHeight = minHeight === Infinity ? 0 : minHeight;
  result.maxHeight = maxHeight;
  result.heightVariance = result.maxHeight - result.minHeight;

  // 检查 Gutter
  const gutter = document.querySelector('.CodeMirror-gutter');
  if (gutter) {
    const gutterRect = gutter.getBoundingClientRect();
    result.gutterWidth = gutterRect.width;
  }

  // 判定是否崩溃
  result.crashed = result.heightVariance > 5 || result.minHeight < 12;

  // 输出诊断结果
  console.log('📈 行高信息:');
  console.log(`  总行数: ${result.lineCount}`);
  console.log(`  可见行: ${result.visibleLines}`);
  console.log(`  平均高: ${result.avgHeight.toFixed(2)}px`);
  console.log(`  最小高: ${result.minHeight.toFixed(2)}px`);
  console.log(`  最大高: ${result.maxHeight.toFixed(2)}px`);
  console.log(`  高度差: ${result.heightVariance.toFixed(2)}px`);

  console.log('\n🔍 状态检查:');
  console.log(`  Gutter 宽度: ${result.gutterWidth.toFixed(2)}px (${result.gutterWidth > 0 ? '✅' : '❌'})`);

  if (result.crashed) {
    console.log(`  %c❌ 检测到布局崩溃！`, 'color: red; font-weight: bold;');
    console.log(`  原因: ${result.heightVariance > 5 ? '行高不一致' : '行高过小'}`);
  } else {
    console.log(`  %c✅ 布局正常`, 'color: green; font-weight: bold;');
  }

  return result;
}

// ============ 修复函数 ============

function fixCodeMirrorLayoutCrash() {
  const cm = document.querySelector('.CodeMirror')?.CodeMirror;
  if (!cm) {
    console.error('❌ CodeMirror 实例不存在');
    return false;
  }

  console.log('\n🔧 开始修复...\n');

  try {
    // 第1步：刷新编辑器
    console.log('步骤1: 调用 cm.refresh()...');
    cm.refresh();
    console.log('✅ 完成');

    // 第2步：重新设置尺寸
    console.log('步骤2: 调用 cm.setSize(null, null)...');
    cm.setSize(null, null);
    console.log('✅ 完成');

    // 第3步：强制重排
    console.log('步骤3: 触发 reflow...');
    void cm.getWrapperElement().offsetHeight;
    console.log('✅ 完成');

    // 第4步：再次刷新
    console.log('步骤4: 再次调用 cm.refresh()...');
    cm.refresh();
    console.log('✅ 完成');

    // 第5步：修复行高样式
    console.log('步骤5: 修复行高样式...');
    const lines = document.querySelectorAll('.CodeMirror-line');
    let fixed = 0;
    lines.forEach(line => {
      const rect = line.getBoundingClientRect();
      if (rect.height < 15) {
        line.style.lineHeight = 'normal';
        line.style.height = 'auto';
        line.style.minHeight = '18px';
        fixed++;
      }
    });
    console.log(`✅ 已修复 ${fixed} 行`);

    // 最后再次刷新
    console.log('步骤6: 最终刷新...');
    cm.refresh();
    console.log('✅ 完成');

    console.log('\n%c🎉 修复完成！', 'color: green; font-weight: bold; font-size: 14px;');
    return true;

  } catch (error) {
    console.error('❌ 修复失败:', error);
    return false;
  }
}

// ============ 对比函数 ============

function compareLayoutBefore() {
  const result = diagnoseCodeMirrorCrash();
  window._layoutBefore = result;
  console.log('\n📸 已记录当前布局状态（修复前）');
  console.log('执行修复后，运行 compareLayoutAfter() 进行对比\n');
}

function compareLayoutAfter() {
  if (!window._layoutBefore) {
    console.error('❌ 需要先运行 compareLayoutBefore()');
    return;
  }

  const result = diagnoseCodeMirrorCrash();
  window._layoutAfter = result;

  console.log('\n📊 修复前后对比:\n');
  console.log('指标'.padEnd(20) + '修复前'.padEnd(15) + '修复后'.padEnd(15) + '变化');
  console.log('-'.repeat(60));

  const metrics = [
    { label: '平均行高', key: 'avgHeight', unit: 'px' },
    { label: '最小行高', key: 'minHeight', unit: 'px' },
    { label: '最大行高', key: 'maxHeight', unit: 'px' },
    { label: '高度差异', key: 'heightVariance', unit: 'px' },
    { label: 'Gutter宽', key: 'gutterWidth', unit: 'px' }
  ];

  metrics.forEach(m => {
    const before = window._layoutBefore[m.key];
    const after = window._layoutAfter[m.key];
    const change = after - before;
    const changeStr = change > 0 ? `↑ ${change.toFixed(2)}` : `↓ ${Math.abs(change).toFixed(2)}`;

    console.log(
      m.label.padEnd(20) +
      `${before.toFixed(2)}${m.unit}`.padEnd(15) +
      `${after.toFixed(2)}${m.unit}`.padEnd(15) +
      changeStr
    );
  });

  const improved = window._layoutAfter.heightVariance < window._layoutBefore.heightVariance;
  console.log('\n' + (improved ? '✅ 布局已改善' : '❌ 布局未改善'));
}

// ============ 监控函数 ============

function startMonitoringLayout() {
  console.log('\n🔔 启动布局监控...');

  let lastState = diagnoseCodeMirrorCrash();

  window._layoutMonitor = setInterval(() => {
    const currentState = diagnoseCodeMirrorCrash();

    if (currentState.crashed !== lastState.crashed) {
      console.log(`%c⚠️  布局状态变化: ${lastState.crashed ? '正常' : '崩溃'} → ${currentState.crashed ? '崩溃' : '正常'}`,
        currentState.crashed ? 'color: red;' : 'color: green;'
      );
    }

    lastState = currentState;
  }, 1000); // 每秒检查一次

  console.log('✅ 监控已启动（按 stopMonitoringLayout() 停止）\n');
}

function stopMonitoringLayout() {
  if (window._layoutMonitor) {
    clearInterval(window._layoutMonitor);
    console.log('⏹️  监控已停止');
  }
}

// ============ 自动诊断和修复 ============

function autoFix() {
  console.log('\n🚀 自动诊断和修复流程\n');

  console.log('=== 第1步：诊断 ===');
  const before = diagnoseCodeMirrorCrash();

  console.log('\n=== 第2步：修复 ===');
  fixCodeMirrorLayoutCrash();

  console.log('\n=== 第3步：验证 ===');
  setTimeout(() => {
    const after = diagnoseCodeMirrorCrash();

    const improved = after.heightVariance < before.heightVariance;
    console.log('\n' + (improved ?
      '%c✅ 修复成功！布局已恢复。' :
      '%c⚠️  修复后仍有异常，请检查代码。'
    ), improved ? 'color: green; font-weight: bold;' : 'color: orange; font-weight: bold;');
  }, 500);
}

// ============ 帮助信息 ============

function showHelp() {
  console.log(`
%c🛠️  ParaDesigner 行距崩溃修复工具 - 使用说明

%c📊 诊断函数：
  diagnoseCodeMirrorCrash()    // 诊断当前布局状态
  compareLayoutBefore()         // 记录修复前状态
  compareLayoutAfter()          // 对比修复效果

%c🔧 修复函数：
  fixCodeMirrorLayoutCrash()   // 执行修复
  autoFix()                     // 自动诊断和修复

%c📡 监控函数：
  startMonitoringLayout()       // 启动实时监控
  stopMonitoringLayout()        // 停止监控

%c💡 推荐使用流程：
  1. diagnoseCodeMirrorCrash()           // 查看当前状态
  2. fixCodeMirrorLayoutCrash()          // 执行修复
  3. diagnoseCodeMirrorCrash()           // 验证修复结果

%c🎯 或者一键修复：
  autoFix()                             // 自动诊断→修复→验证

%c输入 showHelp() 再次查看此信息
`,
    'font-size: 12px; font-weight: bold; color: #ff6b6b;',
    'color: #4ecdc4; font-weight: bold;',
    'color: #45b7d1; font-weight: bold;',
    'color: #96ceb4; font-weight: bold;',
    'color: #ffeaa7; font-weight: bold;',
    'color: #dfe6e9; font-weight: bold;'
  );
}

// ============ 启动 ============

showHelp();
console.log('\n%c✅ 工具已加载，准备就绪！', 'font-size: 14px; font-weight: bold; color: green;');
