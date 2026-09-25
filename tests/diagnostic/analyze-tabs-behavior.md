# Ant Design Tabs 与 CodeMirror 布局问题分析

## 问题现象

当从设计视图切换到源码视图时：
- Gutters 宽度: 1px (正常应该 > 50)
- 折叠列位置: 0px (正常应该 = 44)
- Scroll 高度: 350px (正常应该 > 600)

刷新浏览器后布局恢复正常。

## 根本原因分析

### Ant Design Tabs 的隐藏机制

Ant Design Vue 的 `<a-tabs>` 组件在 `animated="false"` 时使用 `display: none` 来隐藏非活动标签页：

```html
<!-- 活动标签页 -->
<div class="ant-tabs-tabpane ant-tabs-tabpane-active" style="">
  内容可见
</div>

<!-- 非活动标签页 -->
<div class="ant-tabs-tabpane ant-tabs-tabpane-inactive" style="display: none;">
  内容隐藏
</div>
```

### CodeMirror 的初始化时机

在 DmContentEditor.vue 中：

1. **直接进入源码视图**（浏览模式）
   - 页面加载时 `viewMode = 'source'`
   - `<a-tab-pane key="source">` 是活动标签页
   - CodeMirror 在 mounted 时初始化，此时容器是**可见的**
   - CodeMirror 能正确测量 DOM 尺寸

2. **从设计视图切换**（编辑模式）
   - 页面加载时 `viewMode = 'design'`
   - 源码视图的 `<a-tab-pane key="source">` 被设置为 `display: none`
   - DmSourceView 组件仍然被渲染（`v-if` 没有销毁它）
   - CodeMirror 在 mounted 时初始化，但此时父容器是**隐藏的**
   - CodeMirror 测量 DOM 时获取到错误的尺寸（所有 offsetWidth/offsetHeight 都是 0 或默认值）

### CodeMirror 的缓存机制

CodeMirror 在初始化时会缓存一些关键尺寸：

```javascript
// codemirror.js 内部
display.cachedCharWidth = null;
display.cachedTextHeight = null;
display.cachedPaddingH = null;
```

当容器 `display: none` 时：
- `element.offsetWidth` 返回 0
- `element.offsetHeight` 返回 0
- CodeMirror 使用默认值或错误值进行布局
- 这些错误值被缓存到内部状态

### refresh() 为什么无效

`cm.refresh()` 的实现：

```javascript
CodeMirror.prototype.refresh = function() {
  // 重新测量和布局
  if (this.display.wrapper.offsetHeight) {
    updateDisplayIfNeeded(this, {});
  }
};
```

关键问题：
- `refresh()` **不会清除已缓存的错误尺寸**
- 它只是基于当前状态重新布局
- 如果初始测量时容器隐藏，缓存的基础尺寸就是错误的
- 后续即使容器可见，`refresh()` 也无法修复这些错误的缓存值

## 为什么 rebuild() 也失败了

当前的 `rebuildEditor()` 实现：

```javascript
rebuildEditor() {
  // 1. 销毁旧实例
  this.cm.toTextArea();
  this.cm = null;

  // 2. 等待容器可见
  const rebuild = () => {
    const container = this.$el;
    if (getComputedStyle(container).display === 'none') {
      setTimeout(rebuild, 100);
      return;
    }

    // 3. 重新创建 CodeMirror
    this.cm = CodeMirror.fromTextArea(...);
  };

  this.$nextTick(() => {
    setTimeout(rebuild, 50);
  });
}
```

**问题所在**：

检查的是 `this.$el`（DmSourceView 的根元素），但真正需要可见的是**更上层的 TabPane**！

DOM 结构层级：

```
<div class="ant-tabs-tabpane" style="display: none;">  ← 这个需要检查！
  <div class="dm-source-view">  ← this.$el 在这里
    <div class="CodeMirror">
      ...
    </div>
  </div>
</div>
```

即使 `this.$el` 的 `display` 不是 `none`，但它的**父容器 TabPane** 是 `display: none`，CodeMirror 仍然无法正确测量！

## 正确的解决方案

### 方案 A：检查正确的容器

```javascript
rebuildEditor() {
  const rebuild = () => {
    // ✅ 向上查找 TabPane
    const tabPane = this.$el.closest('.ant-tabs-tabpane');
    if (tabPane && getComputedStyle(tabPane).display === 'none') {
      setTimeout(rebuild, 100);
      return;
    }

    // 确保真正可见
    if (this.$el.offsetHeight === 0) {
      setTimeout(rebuild, 100);
      return;
    }

    // 重新创建 CodeMirror
    this.cm = CodeMirror.fromTextArea(...);
  };

  // ...
}
```

### 方案 B：延迟初始化（推荐）

不在 `mounted` 时初始化 CodeMirror，而是在标签页**首次激活**时：

```javascript
// DmSourceView.vue
data() {
  return {
    cm: null,
    initialized: false
  }
},
watch: {
  // 监听父组件传入的激活状态
  active(isActive) {
    if (isActive && !this.initialized) {
      this.$nextTick(() => {
        this.initCodeMirror();
        this.initialized = true;
      });
    }
  }
}
```

### 方案 C：使用 v-if 而非依赖 Tabs 隐藏

```vue
<!-- DmContentEditor.vue -->
<a-tab-pane key="source">
  <dm-source-view
    v-if="viewMode === 'source'"
    ref="editor"
    ...
  />
</a-tab-pane>
```

这样组件在切换时会被完全销毁和重建，确保每次都在可见状态下初始化。

## 推荐修复路线

**最优方案**：方案 A（修复 rebuildEditor 的检查逻辑）+ 增加更严格的可见性验证

理由：
- 不改变组件生命周期
- 不影响现有的编辑器状态管理
- 最小化代码改动
- 彻底解决 TabPane 隐藏导致的问题

## 下一步行动

1. 修改 `DmSourceView.vue` 的 `rebuildEditor()` 方法
2. 添加 TabPane 和实际高度的双重检查
3. 在父组件调用时增加延迟，确保 Tabs 切换动画完成
4. 编写测试验证修复效果
