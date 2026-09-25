# CodeMirror 布局问题的精确根源与修复方案

## 问题根源（已确认）

### 关键发现

**问题不是 TabPane 的 display:none，而是容器宽度的变化！**

具体流程：

1. **初始状态**（源码视图）
   - `treeVisible = true` （左侧树显示）
   - `attrVisible = false/true` （属性面板状态）
   - 中区容器宽度 = 总宽度 - 左侧树宽度 - 属性面板宽度
   - CodeMirror 初始化，测量并缓存容器宽度

2. **用户双击 para 进入设计视图**
   ```javascript
   _openParaDesigner(lineno) {
     this.viewMode = 'design'
     this.treeVisible = false  // ⚠️ 隐藏左侧树
     this.attrVisible = false  // ⚠️ 隐藏属性面板
     // 中区容器变宽！
   }
   ```

3. **用户点击"源码视图"标签返回**
   ```javascript
   onViewTabChange('source') {
     this.viewMode = 'source'
     this.treeVisible = true   // ⚠️ 恢复左侧树
     this.attrVisible = true   // ⚠️ 恢复属性面板（编辑模式）
     // 中区容器变窄！
     
     // 问题：rebuildEditor() 执行时，treeVisible/attrVisible 刚设置
     // 但 Vue 的 DOM 更新是异步的，侧边栏动画还没完成
     // CodeMirror 测量的仍然是"宽容器"的尺寸
   }
   ```

## 为什么 rebuildEditor() 失败？

当前的 rebuildEditor() 检查：
```javascript
const tabPane = this.$el.closest('.ant-tabs-tabpane');
if (tabPane && getComputedStyle(tabPane).display === 'none') {
  // 延迟重试
}
```

**问题**：
- TabPane 的 display 不是 'none'（它确实是可见的）✅
- 但是容器的**宽度还没有调整到最终尺寸** ❌
- 侧边栏的显示/隐藏有 CSS transition 动画
- CodeMirror 在动画未完成时初始化，测量到中间态的尺寸

## 正确的修复方案

### 方案1：等待侧边栏动画完成（推荐）

不要重建 CodeMirror，而是：
1. 等待侧边栏动画完成
2. 调用 `cm.refresh()` 让 CodeMirror 重新测量

```javascript
onViewTabChange(key) {
  this.viewMode = key
  if (key === 'source') {
    this.paraDesignerVisible = false
    this.treeVisible = true
    if (!this.readonly) {
      this.attrVisible = true
    }

    // ✅ 等待侧边栏动画完成后刷新 CodeMirror
    this.$nextTick(() => {
      // 等待 Vue DOM 更新
      setTimeout(() => {
        // 再等待 CSS transition 完成（通常 300ms）
        if (this.$refs.editor && this.$refs.editor.getEditor()) {
          this.$refs.editor.getEditor().refresh();
        }
      }, 350);
    });
  }
}
```

### 方案2：取消侧边栏的变化（不推荐）

保持侧边栏状态不变：
```javascript
// 进入设计视图时不隐藏侧边栏
_openParaDesigner(lineno) {
  this.viewMode = 'design'
  // ❌ 删除这两行
  // this.treeVisible = false
  // this.attrVisible = false
}
```

问题：违反了产品设计意图（设计视图应该全屏显示）

### 方案3：使用 v-if 代替 v-show（彻底但影响性能）

```vue
<div class="region-west" v-if="treeVisible">
  <!-- 每次切换都销毁/重建 -->
</div>
```

问题：性能开销大，树状态丢失

## 真正的问题：CSS Transition

让我检查 CSS：

```css
.region-west {
  transition: width 0.3s ease;  /* ← 这里！*/
}
```

CodeMirror 在 transition 动画中间测量，得到错误尺寸。

## 最终修复方案（精确）

**核心思路**：不要在动画过程中初始化/刷新 CodeMirror，而是等待动画完全结束。

### 修改1：DmContentEditor.vue

```javascript
onViewTabChange(key) {
  this.viewMode = key
  if (key === 'source') {
    this.paraDesignerVisible = false
    this.treeVisible = true
    if (!this.readonly) {
      this.attrVisible = true
    }

    // ✅ 精确修复：等待侧边栏 transition 完成
    this.$nextTick(() => {
      // 等待 Vue 更新 DOM + CSS transition (300ms) + buffer (50ms)
      setTimeout(() => {
        if (this.$refs.editor && this.$refs.editor.getEditor()) {
          const cm = this.$refs.editor.getEditor();
          // 强制清除缓存的尺寸
          cm.refresh();
          // 如果还有问题，再次刷新
          setTimeout(() => cm.refresh(), 100);
        }
      }, 350);
    });
  }
}
```

### 修改2：DmSourceView.vue

**删除 rebuildEditor() 方法**，因为：
- CodeMirror 初始化本身没问题（在可见容器中）
- 问题是容器尺寸变化后没有 refresh
- 重建实例是过度修复，只需要 refresh

```javascript
// ❌ 删除整个 rebuildEditor() 方法

// ✅ 暴露 refresh 方法供父组件调用
refreshLayout() {
  if (this.cm) {
    this.cm.refresh();
  }
}
```

### 修改3：确保 CSS transition 时长一致

检查样式文件：
```css
.region-west,
.region-east {
  transition: all 0.3s ease;  /* 确保统一 */
}
```

## 验证方法

1. 直接进入源码视图 → 测量
2. 双击para进入设计视图 → 等待
3. 点击"源码视图"标签 → 等待 400ms
4. 测量 → 应该与步骤1完全一致

## 为什么之前的方案都失败了？

- `refresh()` 调用太早（在 transition 中）
- `rebuildEditor()` 也在 transition 中执行
- 检查 TabPane display 是对的，但不够
- 需要**等待容器尺寸稳定**

## 总结

**根本原因**：侧边栏显示/隐藏的 CSS transition 动画期间，容器宽度在变化，CodeMirror 在中间态测量导致布局错误。

**正确修复**：等待 transition 完成（350ms）后调用 `refresh()`，而不是重建实例。
