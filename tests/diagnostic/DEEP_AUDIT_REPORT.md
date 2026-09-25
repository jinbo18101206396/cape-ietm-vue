# CodeMirror 布局问题深度审查报告

## 审查目标
系统性审查代码，找出从设计视图切换回源码视图时，CodeMirror 布局异常的根本原因。

## 审查方法
1. 检查组件渲染条件
2. 分析 Vue 生命周期
3. 检查 Ant Design Tabs 行为
4. 分析 CodeMirror 初始化时机
5. 检查容器尺寸变化

## 审查发现

### 1. 组件结构分析

**DmContentEditor.vue 结构**：
```vue
<a-tabs :active-key="viewMode" :animated="false">
  <a-tab-pane key="design">
    <para-designer v-if="paraDesignerVisible" />
  </a-tab-pane>
  <a-tab-pane key="source">
    <dm-source-view ref="editor" />  <!-- ❗ 没有 v-if -->
  </a-tab-pane>
</a-tabs>
```

**关键发现**：
- ❗ `DmSourceView` **没有** `v-if` 条件
- ❗ 这意味着 `DmSourceView` 在页面加载时就被创建并 mounted
- ❗ `ParaDesigner` 有 `v-if="paraDesignerVisible"`，会被销毁和重建

### 2. 生命周期分析

**场景：用户直接进入编辑器**

```
1. DmContentEditor mounted
   - viewMode = 'source' (初始值)
   - treeVisible = true
   - attrVisible = false
   
2. <a-tab-pane key="source"> 激活
   - 容器可见
   
3. DmSourceView mounted
   - CodeMirror.fromTextArea()
   - cm.setSize('100%', '100%')
   - 此时容器可见，CodeMirror 测量正确 ✅
```

**场景：用户双击 para 进入设计视图**

```
1. 用户双击 para
   
2. _openParaDesigner() 执行
   - viewMode = 'design'
   - treeVisible = false
   - attrVisible = false
   - paraDesignerVisible = true
   
3. Ant Design Tabs 响应
   - <a-tab-pane key="source"> 设置为 display:none
   - <a-tab-pane key="design"> 激活
   
4. ❗ DmSourceView 仍然存在（没有被销毁）
   - CodeMirror 实例仍然存在
   - 但其父容器现在是 display:none
```

**场景：用户点击"源码视图"标签**

```
1. onViewTabChange('source') 执行
   - viewMode = 'source'
   - treeVisible = true
   - attrVisible = true
   - paraDesignerVisible = false
   
2. Ant Design Tabs 响应
   - <a-tab-pane key="source"> 移除 display:none
   - <a-tab-pane key="design"> 设置为 display:none
   
3. ❗ 问题：CodeMirror 没有感知到容器从隐藏变为可见
   - CodeMirror 在 mounted 时已经初始化
   - 容器被隐藏期间，CodeMirror 没有收到任何通知
   - 切换回来时，CodeMirror 仍使用旧的布局
```

### 3. CodeMirror 的 setSize 行为

**代码**：
```javascript
cm.setSize('100%', '100%')
```

**问题**：
- `'100%'` 是相对于**父容器**的尺寸
- 如果父容器 `display:none`，`100%` 会计算为 0
- CodeMirror 内部会缓存这个错误的尺寸

### 4. 用户测试结果分析

用户报告：
- Gutters 宽度: 1px
- 折叠列位置: 0px
- Scroll 高度: 350px

**这些值的含义**：
- `1px` = CodeMirror 的最小宽度（容器宽度为 0 时的 fallback）
- `0px` = 折叠列没有正确布局
- `350px` = CodeMirror 的默认高度

**结论**：CodeMirror 认为容器宽度是 0！

### 5. 真正的根本原因

**问题不在于 Tabs 切换，而在于 CodeMirror 的初始化时机！**

让我检查一个关键问题：**DmSourceView 的 mounted 何时触发？**

根据 Vue 和 Ant Design Tabs 的行为：
1. Ant Design Tabs 在 `animated="false"` 时，会渲染所有 TabPane
2. 但非活动的 TabPane 会被设置为 `display:none`
3. 子组件会在父容器 `display:none` 时 mounted

**验证假设**：
- 如果用户进入编辑器后**立即**双击 para（在 CodeMirror 完全初始化前）
- 此时 TabPane 被设置为 `display:none`
- CodeMirror 的某些初始化逻辑可能在 `display:none` 的容器中执行
- 导致测量错误

### 6. 为什么 refresh() 无效？

CodeMirror 的 `refresh()` 方法：
```javascript
refresh: function() {
  if (this.display.wrapper.offsetHeight == 0) {
    return  // ❗ 如果容器高度为 0，直接返回
  }
  // ... 重新测量
}
```

**问题**：
- 如果容器在初始化时是 `display:none`
- CodeMirror 的某些内部状态已经损坏
- `refresh()` 可能检测到容器高度不为 0，但内部缓存已经错误
- 需要更深层的重置

### 7. 为什么清除缓存也无效？

我们尝试清除：
```javascript
cm.display.cachedCharWidth = null
cm.display.cachedTextHeight = null
cm.display.cachedPaddingH = null
```

但可能还有其他内部状态：
- `cm.display.lineSpace`
- `cm.display.mover`
- `cm.display.sizer`
- Gutters 的内部布局

### 8. 根本原因确认

**真正的问题**：CodeMirror 在初始化时（或某个关键时刻），其父容器是 `display:none`，导致：

1. `setSize('100%', '100%')` 计算出错误的尺寸
2. Gutters 没有正确布局
3. 内部缓存存储了错误的值
4. 后续的 `refresh()` 无法修复这些错误

### 9. 验证方法

需要检查：
1. DmSourceView mounted 时，父容器的 display 状态
2. CodeMirror 初始化的完整时序
3. 是否有异步操作影响了初始化时机

## 下一步行动

我需要：
1. 在 DmSourceView mounted 时打印父容器状态
2. 确认 CodeMirror 初始化时容器是否真的可见
3. 如果容器确实是隐藏的，需要延迟初始化 CodeMirror
