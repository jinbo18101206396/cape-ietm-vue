# CodeMirror 两种进入路径对比诊断

## 🎯 问题描述

**路径A（正常）**：项目数据模块管理 → 点击"浏览或编辑DM内容" → 源码视图 ✅
**路径B（异常）**：路径A → 双击para进入设计视图 → 点击"源码视图"按钮 ❌

**异常表现**：
1. XML内容高度缩小（69行 vs 85行）
2. 行号列的下拉箭头跑到数字左侧
3. 纵向滚动条不起作用

## 📊 诊断数据

### 路径B的异常数据
```
CodeMirror容器: 574px (正常)
CodeMirror-scroll: 350px (异常) ← 应为624px
computed.height: 292.222px (来自固定高度规则)
computed.maxHeight: none
```

## 🔍 需要回答的关键问题

### Q1: CodeMirror 的加载方式是否一样？

**路径A**：
```
DmContentEditor mounted (viewMode='source')
  → DmSourceView mounted
    → CodeMirror.fromTextArea()
    → cm.setSize('100%', '100%')  ← 初始化时设置
  → 显示正常
```

**路径B**：
```
DmContentEditor mounted (viewMode='source')
  → DmSourceView mounted
    → CodeMirror.fromTextArea()
    → cm.setSize('100%', '100%')
  → 显示正常
  ↓
用户双击para，触发 onTreeDblClick
  → paraDesignerVisible = true
  → viewMode = 'design'
  ↓
ParaDesigner mounted
  → UEditor初始化（重点！）
  → 设计视图显示
  ↓
用户点击"源码视图"按钮
  → onViewTabChange('source')
    → paraDesignerVisible = false
    → ParaDesigner beforeDestroy
      → UEditor.destroy()
  → 源码视图显示 ❌ 异常！
```

**关键差异**：路径B经历了 UEditor 的初始化和销毁过程。

### Q2: UEditor 做了什么导致 CodeMirror 异常？

需要检查：
1. UEditor 是否添加了全局 CSS 规则？
2. UEditor 是否修改了 CodeMirror 的全局配置？
3. UEditor 是否污染了 DOM 结构？

## 🧪 诊断脚本

请按顺序执行以下脚本：

### 脚本1：记录路径A的正常状态

**在路径A（直接进入源码视图）时运行**：

```javascript
console.log('=== 路径A：正常状态 ===');

// 记录 CodeMirror-scroll 的状态
const cmScroll = document.querySelector('.CodeMirror-scroll');
const computed = getComputedStyle(cmScroll);

window.pathA_normalState = {
  offsetHeight: cmScroll.offsetHeight,
  clientHeight: cmScroll.clientHeight,
  computedHeight: computed.height,
  computedMaxHeight: computed.maxHeight,
  flex: computed.flex,
  cssText: cmScroll.style.cssText
};

// 记录所有 style 标签的数量和内容
window.pathA_styleCount = document.querySelectorAll('style').length;
window.pathA_styleHashes = Array.from(document.querySelectorAll('style')).map((s, i) => ({
  index: i,
  length: s.textContent.length,
  hasCodeMirror: s.textContent.includes('CodeMirror'),
  hash: s.textContent.substring(0, 100)
}));

console.log('正常状态已记录:', window.pathA_normalState);
console.log('Style标签数量:', window.pathA_styleCount);
console.table(window.pathA_styleHashes);
```

### 脚本2：进入设计视图后检查变化

**双击para进入设计视图后运行**：

```javascript
console.log('=== 进入设计视图 ===');

// 检查 style 标签是否增加
const currentStyleCount = document.querySelectorAll('style').length;
const newStyleCount = currentStyleCount - window.pathA_styleCount;

console.log('当前 style 标签数量:', currentStyleCount);
console.log('新增 style 标签数量:', newStyleCount);

if (newStyleCount > 0) {
  console.log('新增的 style 标签:');
  const newStyles = Array.from(document.querySelectorAll('style')).slice(window.pathA_styleCount);
  newStyles.forEach((style, i) => {
    const content = style.textContent;
    console.log(`\n--- 新增 Style-${i} ---`);
    if (content.includes('CodeMirror') || content.includes('350') || content.includes('300px')) {
      console.log('⚠️ 包含 CodeMirror 或高度相关规则:');
      console.log(content.substring(0, 500));
    } else {
      console.log('长度:', content.length, '字符');
      console.log('前100字符:', content.substring(0, 100));
    }
  });
}

// 检查 CodeMirror-scroll 是否被修改（此时应该是隐藏的）
const cmScroll = document.querySelector('.CodeMirror-scroll');
if (cmScroll) {
  console.log('\nCodeMirror-scroll 当前状态（应该被隐藏）:');
  console.log('display:', getComputedStyle(cmScroll.parentElement.parentElement).display);
}
```

### 脚本3：切换回源码视图后对比

**点击"源码视图"按钮后立即运行**：

```javascript
console.log('=== 路径B：切换回源码视图 ===');

const cmScroll = document.querySelector('.CodeMirror-scroll');
const computed = getComputedStyle(cmScroll);

const pathB_state = {
  offsetHeight: cmScroll.offsetHeight,
  clientHeight: cmScroll.clientHeight,
  computedHeight: computed.height,
  computedMaxHeight: computed.maxHeight,
  flex: computed.flex,
  cssText: cmScroll.style.cssText
};

console.log('\n【对比】路径A vs 路径B:');
console.table({
  '路径A（正常）': window.pathA_normalState,
  '路径B（异常）': pathB_state
});

// 检查 style 标签是否被正确清理
const finalStyleCount = document.querySelectorAll('style').length;
console.log('\n最终 style 标签数量:', finalStyleCount);
console.log('相比路径A增加:', finalStyleCount - window.pathA_styleCount);

// 检查是否有残留的 UEditor 相关 style
const suspiciousStyles = [];
document.querySelectorAll('style').forEach((style, i) => {
  const content = style.textContent;
  if (content.includes('ueditor') || content.includes('edui-') || 
      (content.includes('CodeMirror') && (content.includes('350') || content.includes('300')))) {
    suspiciousStyles.push({
      index: i,
      type: content.includes('ueditor') ? 'UEditor残留' : 'CodeMirror污染',
      preview: content.substring(0, 150)
    });
  }
});

if (suspiciousStyles.length > 0) {
  console.log('\n⚠️ 发现可疑的 style 标签:');
  console.table(suspiciousStyles);
} else {
  console.log('\n✅ 未发现可疑的 style 标签');
}

// 检查 CodeMirror 内部状态
const cm = cmScroll.closest('.CodeMirror').__vue__.cm;
if (cm) {
  console.log('\nCodeMirror 内部状态:');
  console.log('display.lastWrapHeight:', cm.display.lastWrapHeight);
  console.log('display.scroller.style.height:', cm.display.scroller.style.height);
  console.log('getScrollInfo().clientHeight:', cm.getScrollInfo().clientHeight);
}
```

### 脚本4：检查折叠标记位置

**在路径B异常时运行**：

```javascript
console.log('=== 检查行号列和折叠标记 ===');

// 检查 gutter 容器
const gutters = document.querySelector('.CodeMirror-gutters');
const lineNumbers = document.querySelector('.CodeMirror-linenumbers');
const foldGutter = document.querySelector('.CodeMirror-foldgutter');

console.log('Gutters 容器:', {
  width: gutters.offsetWidth,
  left: gutters.offsetLeft,
  display: getComputedStyle(gutters).display,
  position: getComputedStyle(gutters).position
});

console.log('\n行号列:', {
  width: lineNumbers.offsetWidth,
  left: lineNumbers.offsetLeft,
  textAlign: getComputedStyle(lineNumbers).textAlign,
  paddingLeft: getComputedStyle(lineNumbers).paddingLeft
});

console.log('\n折叠标记列:', {
  width: foldGutter.offsetWidth,
  left: foldGutter.offsetLeft,
  textAlign: getComputedStyle(foldGutter).textAlign,
  order: getComputedStyle(foldGutter).order || 'none'
});

// 检查第一个折叠标记的实际位置
const firstMarker = document.querySelector('.CodeMirror-foldmarker');
if (firstMarker) {
  const rect = firstMarker.getBoundingClientRect();
  const lineRect = firstMarker.closest('.CodeMirror-line').getBoundingClientRect();
  
  console.log('\n第一个折叠标记:');
  console.log('标记左边距:', rect.left);
  console.log('行左边距:', lineRect.left);
  console.log('相对位置:', rect.left - lineRect.left);
  console.log('内容:', firstMarker.textContent);
}
```

## 📝 预期发现

根据现有线索，预期会发现：

1. **Style 标签污染**：UEditor 添加了包含 `CodeMirror` 或 `350px`/`300px` 的 CSS 规则
2. **内部状态缓存**：`display.lastWrapHeight` 或其他缓存值不正确
3. **DOM 结构变化**：gutter 的顺序或布局被修改

## 🔧 根据诊断结果的修复方向

### 如果是 Style 标签污染
→ 在 `ParaDesigner.beforeDestroy` 中移除污染的 style

### 如果是内部状态缓存
→ 在 `onViewTabChange` 中重置 CodeMirror 内部状态

### 如果是 DOM 结构变化
→ 在 `onViewTabChange` 中强制重建 CodeMirror 实例

---

**请按顺序执行脚本1-4，并将完整输出发给我。**
