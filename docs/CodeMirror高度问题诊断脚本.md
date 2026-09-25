# CodeMirror高度问题诊断脚本

请在浏览器控制台运行以下脚本，帮助定位问题：

## 步骤1：在初次加载（正常状态）时运行

```javascript
// ===== 正常状态快照 =====
const normalSnapshot = {
  timestamp: new Date().toISOString(),
  containers: {}
};

const selectors = [
  '.dm-editor-page',
  '.editor-body',
  '.region-center',
  '.view-tabs',
  '.ant-tabs-content',
  '.ant-tabs-tabpane-active',
  '.source-pane',
  '.editor-toolbar',
  '.dm-source-view',
  '.CodeMirror',
  '.CodeMirror-scroll'
];

selectors.forEach(sel => {
  const el = document.querySelector(sel);
  if (el) {
    const computed = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    normalSnapshot.containers[sel] = {
      // 计算样式
      height: computed.height,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      flex: computed.flex,
      flexGrow: computed.flexGrow,
      flexShrink: computed.flexShrink,
      flexBasis: computed.flexBasis,
      display: computed.display,
      flexDirection: computed.flexDirection,
      overflow: computed.overflow,
      position: computed.position,
      
      // 实际尺寸
      offsetHeight: el.offsetHeight,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      rectHeight: rect.height,
      
      // 内联样式
      inlineHeight: el.style.height,
      inlineMinHeight: el.style.minHeight,
      inlineMaxHeight: el.style.maxHeight,
      inlineOverflow: el.style.overflow,
      inlinePosition: el.style.position
    };
  }
});

console.log('✅ 正常状态快照已保存');
console.log(normalSnapshot);

// 保存到全局变量
window.normalSnapshot = normalSnapshot;
```

## 步骤2：切换到设计视图，然后点击"源码视图"返回后运行

```javascript
// ===== 异常状态快照 =====
const abnormalSnapshot = {
  timestamp: new Date().toISOString(),
  containers: {}
};

const selectors = [
  '.dm-editor-page',
  '.editor-body',
  '.region-center',
  '.view-tabs',
  '.ant-tabs-content',
  '.ant-tabs-tabpane-active',
  '.source-pane',
  '.editor-toolbar',
  '.dm-source-view',
  '.CodeMirror',
  '.CodeMirror-scroll'
];

selectors.forEach(sel => {
  const el = document.querySelector(sel);
  if (el) {
    const computed = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    abnormalSnapshot.containers[sel] = {
      height: computed.height,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      flex: computed.flex,
      flexGrow: computed.flexGrow,
      flexShrink: computed.flexShrink,
      flexBasis: computed.flexBasis,
      display: computed.display,
      flexDirection: computed.flexDirection,
      overflow: computed.overflow,
      position: computed.position,
      
      offsetHeight: el.offsetHeight,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      rectHeight: rect.height,
      
      inlineHeight: el.style.height,
      inlineMinHeight: el.style.minHeight,
      inlineMaxHeight: el.style.maxHeight,
      inlineOverflow: el.style.overflow,
      inlinePosition: el.style.position
    };
  }
});

console.log('❌ 异常状态快照已保存');
console.log(abnormalSnapshot);

window.abnormalSnapshot = abnormalSnapshot;
```

## 步骤3：对比差异

```javascript
// ===== 对比两次快照的差异 =====
if (!window.normalSnapshot || !window.abnormalSnapshot) {
  console.error('请先运行步骤1和步骤2的脚本');
} else {
  console.log('==== 样式差异分析 ====\n');
  
  const normal = window.normalSnapshot.containers;
  const abnormal = window.abnormalSnapshot.containers;
  
  Object.keys(normal).forEach(sel => {
    const n = normal[sel];
    const a = abnormal[sel];
    
    if (!a) {
      console.warn(`${sel} - 元素不存在于异常状态`);
      return;
    }
    
    let hasDiff = false;
    const diffs = [];
    
    // 检查高度差异
    if (n.offsetHeight !== a.offsetHeight) {
      diffs.push(`offsetHeight: ${n.offsetHeight}px → ${a.offsetHeight}px (差${a.offsetHeight - n.offsetHeight}px)`);
      hasDiff = true;
    }
    
    // 检查内联样式污染
    ['inlineHeight', 'inlineMinHeight', 'inlineMaxHeight', 'inlineOverflow', 'inlinePosition'].forEach(prop => {
      if (n[prop] !== a[prop]) {
        diffs.push(`${prop}: "${n[prop]}" → "${a[prop]}" ⚠️ 内联样式污染`);
        hasDiff = true;
      }
    });
    
    // 检查计算样式变化
    ['height', 'minHeight', 'maxHeight', 'flex', 'display', 'overflow'].forEach(prop => {
      if (n[prop] !== a[prop]) {
        diffs.push(`${prop}: ${n[prop]} → ${a[prop]}`);
        hasDiff = true;
      }
    });
    
    if (hasDiff) {
      console.log(`\n🔴 ${sel}`);
      diffs.forEach(d => console.log(`   ${d}`));
    }
  });
  
  console.log('\n==== 分析完成 ====');
}
```

## 步骤4：检查UEditor残留

```javascript
// ===== 检查UEditor是否有残留DOM或样式 =====
console.log('==== UEditor残留检查 ====\n');

// 检查UEditor容器
const ueditorContainers = document.querySelectorAll('[id^="para_"]');
console.log('UEditor容器数量:', ueditorContainers.length);
ueditorContainers.forEach((el, i) => {
  console.log(`  ${i + 1}. ${el.id}`, el.style.cssText);
});

// 检查.design-view-container
const designContainer = document.querySelector('.design-view-container');
if (designContainer) {
  console.log('\n.design-view-container:');
  console.log('  内联样式:', designContainer.style.cssText);
  console.log('  offsetHeight:', designContainer.offsetHeight);
}

// 检查.view-tabs
const viewTabs = document.querySelector('.view-tabs');
if (viewTabs) {
  console.log('\n.view-tabs:');
  console.log('  内联样式:', viewTabs.style.cssText);
  console.log('  offsetHeight:', viewTabs.offsetHeight);
}

console.log('\n==== 检查完成 ====');
```

---

## 使用说明

1. 打开DM编辑器（初次加载，源码视图正常）
2. 运行**步骤1**脚本，保存正常状态
3. 双击para进入设计视图
4. 点击"源码视图"按钮返回
5. 运行**步骤2**脚本，保存异常状态
6. 运行**步骤3**脚本，查看差异
7. 运行**步骤4**脚本，检查UEditor残留

请将**步骤3的输出结果**发给我，我会根据具体的差异定位问题并修复。
