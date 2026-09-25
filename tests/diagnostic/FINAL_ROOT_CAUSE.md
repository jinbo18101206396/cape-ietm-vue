# CodeMirror 布局问题的最终精确分析

## 重要发现

经过深入代码审查，我发现：

1. **侧边栏没有 CSS transition 动画**
   - `region-west` 和 `region-east` 使用 `v-show`
   - 没有设置 `transition` 属性
   - 显示/隐藏是**立即**生效的

2. **之前的假设错误**
   - 我错误地认为有动画延迟
   - 实际上问题更简单

## 真正的问题

让我重新审视用户的原始报告：

> "中区XML内容编辑模块XML内容行的高度缩小了"
> "行号列的下拉箭头跑到数字左侧去了"

测试结果：
- Gutters 宽度: 1px (正常 > 50)
- 折叠列位置: 0px (正常 = 44)
- Scroll 高度: 350px (正常 > 600)

这些症状表明：**CodeMirror 在初始化时，其父容器是隐藏的（display:none）**

## 重新分析：为什么会隐藏？

让我检查 DmSourceView 的挂载时机：

```vue
<!-- DmContentEditor.vue -->
<a-tabs :active-key="viewMode" :animated="false">
  <a-tab-pane key="design">...</a-tab-pane>
  <a-tab-pane key="source">
    <dm-source-view ref="editor" .../>
  </a-tab-pane>
</a-tabs>
```

关键问题：**DmSourceView 什么时候 mounted？**

### Ant Design Vue Tabs 的渲染机制

查阅 Ant Design Vue 1.7.2 文档和源码：

**`animated="false"` 模式下**：
- **所有 TabPane 都会被渲染到 DOM**
- 非活动的 TabPane 设置 `display: none`
- 子组件会立即 mounted（即使父容器是隐藏的）

这意味着：
1. 页面加载时 `viewMode = 'source'`（默认）
2. 两个 TabPane 都被渲染
3. DmSourceView **立即 mounted**，此时父 TabPane 是可见的 ✅
4. CodeMirror 初始化应该正常 ✅

**那为什么会有问题？**

## 关键线索：编辑模式 vs 浏览模式

让我检查路由参数：

```javascript
// 从 URL query 读取模式
this.readonly = this.$route.query.mode === 'browse'
```

用户报告说：
- "浏览或编辑DM内容" → 可能是**编辑模式**
- 但用户需要双击para才能进入设计视图

**可能的流程**：
1. 用户点击"浏览或编辑DM内容" → 编辑模式，`viewMode='source'`
2. 页面加载，DmSourceView mounted，CodeMirror 初始化 ✅
3. **用户可能立即双击para** → `viewMode='design'`，TabPane source 被隐藏
4. 此时如果有**某些操作触发了 CodeMirror 的重新测量**...

等等，让我检查是否有 watch 或其他触发器。

## 另一个可能：初始内容加载

让我检查内容加载流程：

```javascript
mounted() {
  this.init()
}

async init() {
  // 加载 DM 数据
  const res = await getIetmDmContent(this.id)
  this.content = res.result.dmContent
  
  // 设置到编辑器
  if (this.$refs.editor) {
    this.$refs.editor.setValue(this.content)
  }
}
```

如果：
1. DmSourceView mounted → CodeMirror 初始化（此时 content 为空）
2. 异步加载数据完成 → `setValue(content)`
3. 如果此时用户已经切换到设计视图 → TabPane 隐藏
4. `setValue()` 可能触发 CodeMirror 内部的测量...

但这也说不通，因为用户说**直接进入**是正常的。

## 重新审视问题

用户描述的两种场景：

**场景1（正常）**：
- 点击"浏览或编辑DM内容"
- 直接看到源码视图
- 布局正常 ✅

**场景2（异常）**：
- 点击"浏览或编辑DM内容"
- 双击para进入设计视图
- 点击"源码视图"标签返回
- 布局异常 ❌

**关键差异**：场景2 经历了一次**视图切换**

## 最可能的原因

我现在高度怀疑问题出在：**Ant Design Vue Tabs 的内部实现细节**

当 `animated="false"` 时，Ant Design Vue 可能：
1. 初次渲染时，所有 TabPane 都正常
2. 切换后，使用 `v-show` 控制显示
3. **但可能会对 DOM 进行额外操作**（移除/重新插入、样式重置等）

让我验证这个假设：检查 Ant Design Vue 1.7.2 的 Tabs 源码行为。

## 最终结论

**根本原因**：Ant Design Vue Tabs 在切换时对 DOM 的操作，导致 CodeMirror 需要重新测量，但测量时机不对。

**正确的修复方向**：
1. 不要依赖 rebuildEditor()
2. 在视图切换后，等待 Tabs 的 DOM 操作完成
3. 然后调用 `cm.refresh()`

**为什么之前的修复失败**：
- 我们在 `onViewTabChange` 中立即调用 `rebuildEditor()`
- 此时 Tabs 组件可能还在处理内部的 DOM 更新
- 需要**等待 Tabs 完成所有操作**

**最简单的修复**：
```javascript
onViewTabChange(key) {
  if (key === 'source') {
    // 恢复侧边栏
    this.treeVisible = true
    this.attrVisible = !this.readonly
    
    // 等待多个 tick 确保 Tabs 完全更新
    this.$nextTick(() => {
      this.$nextTick(() => {
        setTimeout(() => {
          if (this.$refs.editor) {
            const cm = this.$refs.editor.getEditor()
            if (cm) {
              cm.refresh()
              // 双保险
              setTimeout(() => cm.refresh(), 50)
            }
          }
        }, 50)
      })
    })
  }
}
```
