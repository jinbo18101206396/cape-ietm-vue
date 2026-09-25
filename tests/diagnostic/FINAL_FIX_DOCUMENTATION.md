# CodeMirror 布局问题精确修复方案

## 问题根源（已确认）

### 核心问题
从设计视图切换回源码视图时，侧边栏显示/隐藏导致**中区容器宽度变化**，但 CodeMirror 没有重新测量布局，仍使用旧的缓存尺寸。

### 具体流程

1. **初始状态**（源码视图）
   - `treeVisible = true`（左侧树显示）
   - `attrVisible = true/false`（属性面板状态）
   - CodeMirror 初始化，缓存容器宽度

2. **用户双击 para 进入设计视图**
   ```javascript
   _openParaDesigner(lineno) {
     this.viewMode = 'design'
     this.treeVisible = false  // 隐藏左侧树
     this.attrVisible = false  // 隐藏属性面板
     // → 中区容器变宽
   }
   ```

3. **用户点击"源码视图"标签返回**
   ```javascript
   onViewTabChange('source') {
     this.viewMode = 'source'
     this.treeVisible = true   // 恢复左侧树
     this.attrVisible = true   // 恢复属性面板
     // → 中区容器变窄
     // ❌ CodeMirror 仍使用旧的宽度缓存
   }
   ```

## 修复方案

### 核心思路
不重建 CodeMirror 实例（过度修复），而是在容器尺寸稳定后调用 `refresh()` 让 CodeMirror 重新测量。

### 修改内容

#### 1. DmContentEditor.vue（主要修改）

**文件**：`src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue`

**位置**：`onViewTabChange` 方法（约 line 765）

**修改前**：
```javascript
onViewTabChange(key) {
  this.viewMode = key
  if (key === 'source') {
    this.paraDesignerVisible = false
    this.treeVisible = true
    if (!this.readonly) {
      this.attrVisible = true
    }

    // 旧代码：调用 rebuildEditor() 重建实例
    this.$nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.$refs.editor && this.$refs.editor.rebuildEditor) {
            this.$refs.editor.rebuildEditor();
          }
        });
      });
    });
  }
}
```

**修改后**：
```javascript
onViewTabChange(key) {
  this.viewMode = key
  if (key === 'source') {
    this.paraDesignerVisible = false
    this.treeVisible = true
    if (!this.readonly) {
      this.attrVisible = true
    }

    // ✅ 精确修复：等待 Vue DOM 更新 + 侧边栏布局完成后，刷新 CodeMirror 布局
    this.$nextTick(() => {
      // 第一次 nextTick：等待 Vue 更新 DOM
      this.$nextTick(() => {
        // 第二次 nextTick：等待浏览器完成布局计算
        setTimeout(() => {
          // 延迟 50ms 确保容器宽度稳定
          if (this.$refs.editor && this.$refs.editor.getEditor) {
            const cm = this.$refs.editor.getEditor()
            if (cm) {
              cm.refresh()
              // 双保险：再次刷新确保所有缓存更新
              setTimeout(() => cm.refresh(), 50)
            }
          }
        }, 50)
      })
    })
  }
}
```

**关键改变**：
- ❌ 不再调用 `rebuildEditor()`（删除整个重建逻辑）
- ✅ 改为调用 `cm.refresh()`（轻量级，只重新测量）
- ✅ 使用双重 `$nextTick` + `setTimeout` 确保 DOM 更新完成
- ✅ 双次 `refresh()` 确保缓存完全更新

#### 2. DmSourceView.vue（清理代码）

**文件**：`src/views/ietm/ietmdatamodulemanagement/editor/components/DmSourceView.vue`

**位置**：methods 部分（约 line 226-308）

**修改**：删除整个 `rebuildEditor()` 方法（共 83 行）

**原因**：
- 该方法是过度修复，不需要重建实例
- CodeMirror 初始化本身没有问题
- 只需要在容器尺寸变化后 `refresh()` 即可

## 为什么这样修复？

### 问题分析

1. **CodeMirror 初始化是正常的**
   - DmSourceView 在 mounted 时，父 TabPane 是可见的
   - CodeMirror 在可见容器中初始化，测量正确

2. **问题在于容器尺寸变化**
   - 侧边栏显示/隐藏改变了中区宽度
   - CodeMirror 缓存了旧的尺寸
   - 需要重新测量，但不需要重建实例

3. **`refresh()` vs `rebuildEditor()`**
   - `refresh()`：轻量级，只重新测量布局（正确方案）
   - `rebuildEditor()`：重建实例，性能开销大，状态丢失风险（过度修复）

### 时序保证

```
用户点击"源码视图"
    ↓
Vue: viewMode = 'source'
    ↓
Vue: treeVisible = true, attrVisible = true
    ↓
[第一次 $nextTick] ← Vue 内部 DOM 更新队列
    ↓
[第二次 $nextTick] ← 确保更新完全完成
    ↓
[setTimeout 50ms] ← 等待浏览器布局计算
    ↓
cm.refresh() ← CodeMirror 重新测量
    ↓
[setTimeout 50ms]
    ↓
cm.refresh() ← 二次确认
```

## 测试验证

### 手动测试步骤

1. **刷新浏览器**（Ctrl+F5）加载最新代码

2. **场景A：直接进入**
   - 进入"项目数据模块管理"
   - 点击"浏览或编辑DM内容"
   - 观察源码视图布局

3. **场景B：切换进入**
   - 双击左侧树的 para 节点进入设计视图
   - 点击底部"源码视图"标签
   - 观察源码视图布局

4. **验证脚本**
   在浏览器控制台运行：
   ```javascript
   const cm = document.querySelector('.CodeMirror');
   const gutters = cm.querySelector('.CodeMirror-gutters');
   const foldGutter = cm.querySelector('.CodeMirror-foldgutter');
   const scroll = cm.querySelector('.CodeMirror-scroll');
   
   console.log('Gutters 宽度:', gutters.offsetWidth, '(期望 > 50)');
   console.log('折叠列位置:', foldGutter.offsetLeft, '(期望 = 44)');
   console.log('Scroll 高度:', scroll.offsetHeight, '(期望 > 600)');
   ```

### 预期结果

**场景A 和场景B 的测量结果应该完全一致**：
- Gutters 宽度 > 50px ✅
- 折叠列位置 = 44px ✅
- Scroll 高度 > 600px ✅
- 行高、字符宽度一致 ✅

## 与旧系统对比

旧系统可能没有这个问题的原因：
1. 使用不同的 UI 框架（不是 Ant Design）
2. 没有设计视图/源码视图切换
3. 侧边栏不会动态显示/隐藏
4. 或者在每次切换时都调用了 `refresh()`

## 总结

**问题本质**：容器尺寸变化后 CodeMirror 缓存失效

**修复原理**：在容器尺寸稳定后调用 `refresh()` 重新测量

**代码改动**：
- 修改：`DmContentEditor.vue` 的 `onViewTabChange()` 方法
- 删除：`DmSourceView.vue` 的 `rebuildEditor()` 方法

**优势**：
- ✅ 从根源上解决问题
- ✅ 代码更简洁（删除 83 行复杂的重建逻辑）
- ✅ 性能更好（refresh 比 rebuild 快）
- ✅ 无副作用（不丢失编辑器状态）
