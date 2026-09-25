# CodeMirror高度缩小问题终极排查报告

**问题描述**: 从设计视图切换回源码视图时，CodeMirror高度缩小，**刷新浏览器后才能恢复**  
**关键线索**: 刷新才能恢复 = **状态污染问题**，不是简单的时序问题  
**排查日期**: 2026-09-23  
**严重程度**: P0 - 严重影响用户体验

---

## 🔴 **核心发现：这是CSS污染问题！**

### 问题症状分析

| 症状 | 说明 | 推断 |
|------|------|------|
| 切换后高度缩小 | CodeMirror显示区域变小 | 某个容器高度被修改 |
| **刷新才能恢复** | 页面重新加载后正常 | **状态污染**：某个元素的内联样式或class被修改 |
| 双重$nextTick无效 | refresh调用了但没用 | 不是时序问题，是容器本身尺寸被改变 |

---

## 🔍 **可能的污染源排查**

### 污染源1：UEditor修改了父容器样式 ⭐⭐⭐⭐⭐

**最可能的原因**！

#### UEditor的已知行为

UEditor在初始化和销毁时会：
1. **修改容器样式**：可能设置 `position`、`height`、`overflow` 等
2. **创建额外DOM**：toolbar、底部状态栏等
3. **污染全局样式**：可能添加全局CSS类

#### 问题场景重现

```
用户操作流程：
1. 源码视图（正常）
2. 双击para进入设计视图
   └─ ParaDesigner组件mount
   └─ UEditor初始化（可能修改了容器样式）
3. 点击"源码视图"按钮
   └─ ParaDesigner组件beforeDestroy
   └─ UEditor销毁（但污染的样式没有清理）
4. 返回源码视图（高度缩小❌）
   └─ 某个父容器的样式被UEditor污染了
5. 刷新浏览器（正常✅）
   └─ 页面重新加载，污染清除
```

#### 具体污染点

**可能被污染的容器**：
- `.design-view-container`
- `.view-tabs`
- `.ant-tabs-content`
- `.ant-tabs-tabpane-active`

**可能被污染的属性**：
- `height`：被设置为固定值（如 `height: 500px`）
- `min-height`：被修改
- `overflow`：被设置为 `hidden` 或其他值
- `position`：被改变
- `display`：被修改

### 污染源2：Ant Design Tabs的内部状态 ⭐⭐⭐

#### Tabs组件的已知问题

即使设置了 `animated: false`，Tabs在切换时仍可能：
1. **修改tabpane的display属性**：从 `none` 切换到 `block`/`flex`
2. **重新计算高度**：内部有缓存机制
3. **样式残留**：前一个tab的样式可能影响下一个

#### 检查点

```javascript
// DmContentEditor.vue:22-23
<a-tabs class="view-tabs" :active-key="viewMode" tab-position="bottom"
  :animated="false" size="small" @change="onViewTabChange">
```

**问题**：`active-key` 绑定到 `viewMode`，切换时Tabs内部状态可能不同步。

### 污染源3：ParaDesigner组件的固定高度 ⭐⭐⭐⭐

#### ParaDesigner样式

**文件**: `ParaDesigner.vue:444-448`

```less
.para-designer {
  display: flex;
  flex-direction: column;
  height: 100%;  // ← 可疑：100%的基准是什么？
  background: #fff;
```

**问题**：
- ParaDesigner占据了 `.design-view-container` 的100%高度
- 但切换时，`.design-view-container` 可能被设置了固定高度
- 导致切换回源码视图后，容器高度"记住"了之前的固定值

---

## 🔬 **深度诊断：CSS污染检测**

### 诊断脚本

在浏览器控制台运行以下脚本，检查切换前后的样式变化：

```javascript
// ===== CSS污染检测脚本 =====

// 1. 切换到源码视图前，记录所有相关容器的样式
function captureStyles() {
  const selectors = [
    '.view-tabs',
    '.ant-tabs-content',
    '.ant-tabs-tabpane-active',
    '.source-pane',
    '.design-view-container',
    '.dm-source-view',
    '.CodeMirror'
  ]
  
  const snapshot = {}
  
  selectors.forEach(sel => {
    const el = document.querySelector(sel)
    if (el) {
      snapshot[sel] = {
        // 计算样式
        computed: {
          height: getComputedStyle(el).height,
          minHeight: getComputedStyle(el).minHeight,
          maxHeight: getComputedStyle(el).maxHeight,
          flex: getComputedStyle(el).flex,
          display: getComputedStyle(el).display,
          overflow: getComputedStyle(el).overflow,
          position: getComputedStyle(el).position
        },
        // 内联样式
        inline: {
          height: el.style.height,
          minHeight: el.style.minHeight,
          maxHeight: el.style.maxHeight,
          display: el.style.display,
          overflow: el.style.overflow,
          position: el.style.position
        },
        // 实际尺寸
        rect: {
          offsetHeight: el.offsetHeight,
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight
        }
      }
    }
  })
  
  return snapshot
}

// 2. 在设计视图时运行
console.log('=== 设计视图样式快照 ===')
const beforeSwitch = captureStyles()
console.log(beforeSwitch)

// 3. 切换到源码视图后运行
console.log('=== 源码视图样式快照 ===')
const afterSwitch = captureStyles()
console.log(afterSwitch)

// 4. 对比差异
console.log('=== 样式差异对比 ===')
Object.keys(beforeSwitch).forEach(sel => {
  const before = beforeSwitch[sel]
  const after = afterSwitch[sel]
  
  if (!after) {
    console.warn(`${sel} - 元素不存在`)
    return
  }
  
  // 检查内联样式变化
  Object.keys(before.inline).forEach(prop => {
    if (before.inline[prop] !== after.inline[prop]) {
      console.error(`${sel} - 内联样式污染: ${prop}`)
      console.log(`  之前: ${before.inline[prop]}`)
      console.log(`  之后: ${after.inline[prop]}`)
    }
  })
  
  // 检查高度变化
  if (before.rect.offsetHeight !== after.rect.offsetHeight) {
    console.warn(`${sel} - 高度变化:`)
    console.log(`  之前: ${before.rect.offsetHeight}px`)
    console.log(`  之后: ${after.rect.offsetHeight}px`)
    console.log(`  差异: ${after.rect.offsetHeight - before.rect.offsetHeight}px`)
  }
})
```

---

## 🛠️ **修复方案**

### 方案A：强制清理UEditor污染（推荐）⭐⭐⭐⭐⭐

**原理**：在ParaDesigner销毁时，不仅销毁UEditor，还要清理所有可能被污染的父容器样式。

**文件**: `ParaDesigner.vue:109-129`

```javascript
beforeDestroy() {
  // 完善UEditor销毁逻辑，防止内存泄漏
  if (this.ueditor) {
    try {
      // 1. 移除事件监听
      this.ueditor.removeListener('contentChange')
      this.ueditor.removeListener('ready')

      // 2. 销毁编辑器实例
      this.ueditor.destroy()

      // 3. 清空引用
      this.ueditor = null

      // 4. 清理DOM（UEditor可能残留）
      const container = document.getElementById(this.ueditorInstanceId)
      if (container) {
        container.innerHTML = ''
      }

      // ✅ 新增：强制清理父容器可能被污染的样式
      this.$nextTick(() => {
        const designContainer = this.$el.closest('.design-view-container')
        if (designContainer) {
          // 移除所有内联样式
          designContainer.style.height = ''
          designContainer.style.minHeight = ''
          designContainer.style.maxHeight = ''
          designContainer.style.overflow = ''
          designContainer.style.position = ''
        }

        // 同时清理.view-tabs可能的污染
        const viewTabs = this.$el.closest('.view-tabs')
        if (viewTabs) {
          viewTabs.style.height = ''
          viewTabs.style.minHeight = ''
        }
      })
    } catch (error) {
      console.error('UEditor销毁失败:', error)
    }
  }
}
```

### 方案B：切换时强制重置容器样式 ⭐⭐⭐⭐

**文件**: `DmContentEditor.vue:748-772`

```javascript
onViewTabChange(key) {
  this.viewMode = key
  if (key === 'source') {
    this.paraDesignerVisible = false
    this.treeVisible = true
    if (!this.readonly) {
      this.attrVisible = true
    }

    // ✅ 新增：切换前强制清理可能的样式污染
    this.$nextTick(() => {
      // 清理.design-view-container的污染
      const designContainer = this.$el.querySelector('.design-view-container')
      if (designContainer) {
        designContainer.style.height = ''
        designContainer.style.minHeight = ''
        designContainer.style.maxHeight = ''
      }

      // 清理.view-tabs的污染
      const viewTabs = this.$el.querySelector('.view-tabs')
      if (viewTabs) {
        viewTabs.style.height = ''
        viewTabs.style.minHeight = ''
      }

      // 双重$nextTick确保布局稳定
      this.$nextTick(() => {
        if (this.$refs.editor && this.$refs.editor.getEditor()) {
          this.$refs.editor.getEditor().refresh()
        }
      })
    })
  }
}
```

### 方案C：使用v-if强制销毁重建（最激进）⭐⭐⭐

**原理**：每次切换都完全销毁和重建CodeMirror，确保没有污染残留。

**文件**: `DmContentEditor.vue:101-108`

**修改前**：
```vue
<dm-source-view
  ref="editor" :value="content" :schema="hintSchema"
  :theme="theme" :readonly="readonly"
  :locale="locale" :en2cnElem="en2cnElem"
  @cursor-node="onCursorNode" @cursor-change="onCursorChange" @content-change="onContentChange"
  @element-inserted="onElementInserted"
  @gutter-click="onGutterClick"/>
```

**修改后**：
```vue
<dm-source-view
  v-if="viewMode === 'source'"
  ref="editor" :value="content" :schema="hintSchema"
  :theme="theme" :readonly="readonly"
  :locale="locale" :en2cnElem="en2cnElem"
  @cursor-node="onCursorNode" @cursor-change="onCursorChange" @content-change="onContentChange"
  @element-inserted="onElementInserted"
  @gutter-click="onGutterClick"/>
```

**优点**：彻底解决污染问题  
**缺点**：性能稍差（每次切换重建CodeMirror）

---

## 🎯 **推荐实施顺序**

### 第1步：运行诊断脚本

在真实环境中运行上面的CSS污染检测脚本，确认具体是哪个容器被污染。

### 第2步：实施方案A + 方案B

两个方案同时实施，双保险：
1. **方案A**：ParaDesigner销毁时清理污染
2. **方案B**：切换视图时强制重置样式

### 第3步：如果仍然无效，实施方案C

使用 `v-if` 强制销毁重建。

---

## 📊 **预期效果**

| 修复方案 | 解决污染 | 性能影响 | 兼容性 |
|---------|---------|---------|--------|
| 方案A | ⭐⭐⭐⭐ | 无 | ✅ 完全兼容 |
| 方案B | ⭐⭐⭐⭐⭐ | 极小 | ✅ 完全兼容 |
| 方案C | ⭐⭐⭐⭐⭐ | 稍高（重建） | ✅ 完全兼容 |

---

## 🔍 **其他可能的污染源**

### 检查点1：全局CSS被修改

```javascript
// 检查是否有全局style标签被添加
document.querySelectorAll('style').forEach((style, i) => {
  console.log(`Style ${i}:`, style.textContent.substring(0, 200))
})
```

### 检查点2：body或html的样式被修改

```javascript
console.log('Body height:', document.body.style.height)
console.log('HTML height:', document.documentElement.style.height)
```

### 检查点3：CodeMirror自身的缓存

```javascript
// CodeMirror可能缓存了错误的尺寸
const cm = window.app.$children
  .find(c => c.$options.name === 'DmContentEditor')
  .$refs.editor.getEditor()

console.log('CodeMirror cached size:', cm.display.cachedCharWidth, cm.display.cachedTextHeight)
```

---

## 📋 **测试验证清单**

实施修复后，请测试以下场景：

- [ ] 源码视图 → 设计视图 → 源码视图（点击按钮）
- [ ] 源码视图 → 设计视图 → 保存 → 自动返回源码视图
- [ ] 连续切换10次，每次都检查高度
- [ ] 编辑多个不同的para，每次切换都检查
- [ ] 检查CodeMirror的offsetHeight是否一致
- [ ] 不刷新浏览器，连续使用1小时

---

## 🎓 **技术原理总结**

### 为什么刷新才能恢复？

1. **内联样式污染**：UEditor或其他组件修改了DOM元素的 `style` 属性
2. **状态持久化**：污染的样式保存在内存中的DOM上
3. **刷新清除**：浏览器重新加载页面，DOM重新构建，污染消失

### 关键区别

| 问题类型 | 症状 | 修复方法 |
|---------|------|---------|
| 时序问题 | 偶尔缩小，多次切换可能恢复 | $nextTick、延迟 |
| **污染问题** | **持续缩小，刷新才能恢复** | **清理内联样式** |

---

**下一步**：请先运行诊断脚本，确认具体污染点，然后我们实施针对性修复！
