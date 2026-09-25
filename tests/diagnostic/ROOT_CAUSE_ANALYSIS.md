# CodeMirror 布局问题根源分析

## 问题本质

**核心发现**：问题不在于"从设计视图切换回源码视图"时 CodeMirror 的重建，而在于 **DmSourceView 组件在编辑模式下的初始化时机**。

## 场景对比分析

### 场景A：浏览模式（直接进入源码视图）
```javascript
// URL: ?mode=browse
data() {
  return {
    viewMode: 'source',  // 初始就是源码视图
    paraDesignerVisible: false
  }
}

mounted() {
  // 1. DmContentEditor mounted
  // 2. <a-tabs active-key="source"> 激活源码标签页
  // 3. <a-tab-pane key="source"> 可见
  // 4. DmSourceView mounted
  // 5. CodeMirror.fromTextArea() 在可见容器中初始化 ✅ 正常
}
```

### 场景B：编辑模式（需要切换到源码视图）
```javascript
// URL: ?mode=edit
data() {
  return {
    viewMode: 'source',  // 初始也是源码视图
    paraDesignerVisible: false
  }
}

mounted() {
  // 1. DmContentEditor mounted
  // 2. <a-tabs active-key="source"> 激活源码标签页
  // 3. <a-tab-pane key="source"> 可见
  // 4. DmSourceView mounted
  // 5. CodeMirror.fromTextArea() 在可见容器中初始化 ✅ 应该正常
}

// 用户双击 para 节点
onTreeDblClick(node) {
  if (node.text === 'para') {
    this.viewMode = 'design'  // 切换到设计视图
    this.paraDesignerVisible = true
    // ⚠️ 源码视图的 <a-tab-pane key="source"> 被设置为 display:none
    // ⚠️ 但 DmSourceView 和 CodeMirror 实例仍然存在（没有被销毁）
  }
}

// 用户点击"源码视图"标签
onViewTabChange('source') {
  this.viewMode = 'source'
  this.paraDesignerVisible = false
  
  // 🔥 问题：此时 CodeMirror 已经在 mounted 时初始化过了
  // 🔥 它是在可见状态下初始化的，理论上应该正常
  // 🔥 为什么还会出现布局问题？
}
```

## 真正的问题

**关键洞察**：如果 CodeMirror 在 mounted 时就是可见的，为什么切换回来会有问题？

让我检查是否有其他因素：

### 可能原因1：CSS 样式变化
切换过程中，父容器的尺寸可能发生了变化：
- 进入设计视图时：`treeVisible = false`, `attrVisible = false`（隐藏左右侧栏）
- 返回源码视图时：`treeVisible = true`, `attrVisible = true`（恢复侧栏）
- **容器宽度变化导致 CodeMirror 需要重新计算布局**

### 可能原因2：Ant Design Tabs 的内部机制
Ant Design Vue 1.7.2 的 Tabs 组件在 `animated="false"` 模式下：
- 使用 `display: none` 隐藏非活动标签页
- **可能在切换时对 DOM 进行了额外的操作**（重新插入、调整）

### 可能原因3：CodeMirror 的 refresh 时机
CodeMirror 需要在容器尺寸变化后调用 `refresh()` 才能正确更新布局，但是：
- 我们的代码只在切换时调用了 `rebuildEditor()`
- **没有处理父容器尺寸变化的情况**

## 验证假设

让我检查用户的实际报告：

> "在"项目数据模块管理"页面点击"浏览或编辑DM内容"按钮进入源码视图页面，与在设计视图页面点击"源码视图"按钮进入源码视图页面有何区别？"

这说明：
1. **直接进入**：打开编辑器 → 直接显示源码视图 → 布局正常 ✅
2. **切换进入**：打开编辑器 → 双击para进入设计视图 → 点击"源码视图"标签 → 布局异常 ❌

## 根本原因推断

经过分析，我认为真正的原因是：

**当用户切换视图时，父容器的尺寸发生了变化（侧边栏显示/隐藏），但 CodeMirror 没有正确响应这个变化。**

具体流程：
1. 初始加载：源码视图，侧边栏显示，CodeMirror 按当前容器尺寸初始化 ✅
2. 双击para：切换到设计视图，侧边栏隐藏，容器变宽
3. 点击"源码视图"：切换回源码视图，侧边栏恢复显示，**容器变窄**
4. **问题**：CodeMirror 仍然使用步骤1时的缓存尺寸，没有感知到容器尺寸变化

## 正确的修复方案

**不应该重建 CodeMirror 实例，而应该在视图切换时正确调用 `refresh()`**。

但是，简单的 `refresh()` 不够，因为：
- 容器尺寸变化是异步的（CSS transition、侧边栏动画）
- 需要等待 DOM 更新完成后再调用

**根本修复**：
1. 监听容器尺寸变化
2. 在侧边栏切换完成后调用 `refresh()`
3. 确保 `refresh()` 在正确的时机执行
