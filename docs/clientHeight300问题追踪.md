# CodeMirror clientHeight=300 问题追踪

## 📊 **数据分析**

```
lastWrapHeight: 574  ✅ 正确
clientHeight: 300    ❌ 错误
容器高度: 574        ✅ 正确
```

**结论**: `lastWrapHeight` 已经正确，但 `clientHeight` 仍然是 300。

---

## 🔍 **CodeMirror.getScrollInfo() 的计算逻辑**

`getScrollInfo()` 返回的 `clientHeight` 是从 `display.scroller.clientHeight` 计算来的：

```javascript
// CodeMirror 源码
getScrollInfo: function() {
  var scroller = this.display.scroller;
  return {
    left: scroller.scrollLeft,
    top: scroller.scrollTop,
    height: scroller.scrollHeight,
    width: scroller.scrollWidth,
    clientHeight: scroller.clientHeight,  // ← 这里！
    clientWidth: scroller.clientWidth
  };
}
```

**关键**: `clientHeight: 300` 来自 `display.scroller.clientHeight`！

---

## 🎯 **问题定位**

`.CodeMirror-scroll` (即 `display.scroller`) 的 `clientHeight` 是 300px。

**之前的诊断数据证实**：
```
CodeMirror-scroll高度: 350px
clientHeight: 300px
```

`clientHeight = offsetHeight - border - scrollbar`

350px - 滚动条宽度(约10-17px) - border ≈ 300px ✅ 吻合！

**所以真正的问题是**: `.CodeMirror-scroll` 的高度被限制为 350px！

---

## 🔬 **诊断脚本**

```javascript
const cm = document.querySelector('.CodeMirror');
const cmScroll = cm.querySelector('.CodeMirror-scroll');

console.log('==== CodeMirror-scroll 详细状态 ====');
console.log('offsetHeight:', cmScroll.offsetHeight);
console.log('clientHeight:', cmScroll.clientHeight);
console.log('scrollHeight:', cmScroll.scrollHeight);
console.log('内联样式:', cmScroll.style.cssText);

console.log('\n==== 计算样式 ====');
const computed = getComputedStyle(cmScroll);
console.log('height:', computed.height);
console.log('max-height:', computed.maxHeight);
console.log('min-height:', computed.minHeight);
console.log('overflow:', computed.overflow);

console.log('\n==== 父容器 ====');
let parent = cmScroll.parentElement;
while (parent && parent.offsetHeight < 574) {
  console.log(parent.className || parent.tagName, '高度:', parent.offsetHeight);
  parent = parent.parentElement;
}
```

---

## 💡 **可能的原因**

### 原因1：CSS规则设置了 max-height

某个 CSS 规则可能设置了：
```css
.CodeMirror-scroll {
  max-height: 350px !important;
}
```

### 原因2：内联样式被设置

UEditor 可能执行了：
```javascript
document.querySelector('.CodeMirror-scroll').style.maxHeight = '350px';
```

但我们的清理代码应该已经清除了。

### 原因3：父容器高度限制

`.CodeMirror` 的某个父容器高度被限制为 350px，导致子元素无法扩展。

---

## 🛠️ **修复方案**

### 方案1：在刷新前强制清理 .CodeMirror-scroll 的样式

```javascript
onViewTabChange(key) {
  // ...
  
  this.$nextTick(() => {
    // 强制清理 .CodeMirror-scroll
    const cmScroll = this.$el.querySelector('.CodeMirror-scroll');
    if (cmScroll) {
      cmScroll.style.height = '';
      cmScroll.style.maxHeight = '';
      cmScroll.style.minHeight = '';
      
      // 强制重新计算
      cmScroll.offsetHeight;
    }
    
    this.$nextTick(() => {
      // 然后再重置 CodeMirror
      // ...
    });
  });
}
```

### 方案2：移除影响 CodeMirror-scroll 的 CSS 规则

```javascript
// 查找并移除动态添加的 style 标签
document.querySelectorAll('style').forEach(style => {
  const content = style.textContent || style.innerHTML;
  if (content.includes('CodeMirror-scroll') && content.includes('350')) {
    console.warn('移除污染样式:', content);
    style.remove();
  }
});
```

---

## 📝 **请执行诊断脚本**

在切换后立即运行上面的诊断脚本，特别关注：
1. `CodeMirror-scroll` 的 `max-height` 计算样式
2. `CodeMirror-scroll` 的内联样式
3. 是否有父容器高度小于 574px

请将输出结果发给我。
