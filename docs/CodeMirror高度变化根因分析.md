# CodeMirror高度动态变化问题根因分析

**问题**: 从设计视图切换回源码视图时，CodeMirror高度缩小约16行（85行→69行）

---

## 🔍 **根本原因：DOM结构分析**

### 完整的DOM层级结构

```
.dm-editor-page (height: calc(100vh - 135px)) ← 固定高度
  │
  ├─ <a-spin> (.editor-body-spin) (flex: 1)
  │   │
  │   └─ .editor-body (height: 100%)
  │       ├─ .region-west (左侧树, v-show)
  │       ├─ .region-center (中区, flex: 1)
  │       │   ├─ .mode-banner (30px)
  │       │   └─ .view-tabs (flex: 1)
  │       │       ├─ .ant-tabs-content (flex: 1)
  │       │       │   ├─ .ant-tabs-tabpane[key=design]
  │       │       │   │   └─ .design-view-container
  │       │       │   │       └─ <para-designer>
  │       │       │   │           └─ <UEditor>
  │       │       │   └─ .ant-tabs-tabpane-active[key=source]
  │       │       │       └─ .source-pane (flex: 1)
  │       │       │           ├─ .editor-toolbar (固定高度)
  │       │       │           └─ .dm-source-view (flex: 1)
  │       │       │               └─ .CodeMirror (height: 100%)
  │       │       └─ .ant-tabs-bar (底部tab按钮)
  │       └─ .region-east (右侧属性面板, v-show)
  │
  └─ .region-south (工作流面板, v-if, flex-shrink: 0)  ← ⚠️ 关键！
      ├─ .south-resize-bar (5px)
      ├─ .south-title-bar (32px)
      └─ .south-body (height: workflowHeight, 默认350px)
```

### 关键发现

**.dm-editor-page 的布局模式**：

```less
.dm-editor-page {
  height: calc(100vh - 135px);  // ← 固定高度
  display: flex;
  flex-direction: column;
}

.editor-body-spin {
  flex: 1;  // ← 占据剩余空间
  overflow: hidden;
}

.region-south {
  flex-shrink: 0;  // ← 不收缩，固定占用空间
}
```

**计算公式**：
```
editor-body可用高度 = dm-editor-page高度 - region-south高度

如果region-south存在且展开：
  editor-body高度 = (100vh - 135px) - (5px + 32px + 350px) = (100vh - 522px)

如果region-south不存在或折叠：
  editor-body高度 = (100vh - 135px)
```

---

## 🐛 **问题场景重现**

### 场景A：初次加载（正常 - 85行）

```
1. 用户点击"浏览或编辑DM内容"
2. DmContentEditor.vue mount
3. 调用loadData() → 加载工作流信息
4. showWorkflowPanel = false（假设没有工作流）
5. .region-south不渲染（v-if="showWorkflowPanel"）
6. editor-body高度 = (100vh - 135px) ← 完整高度
7. CodeMirror占满editor-body → ✅ 显示85行
```

### 场景B：从设计视图切换（异常 - 69行）

```
1. 用户双击para进入设计视图
2. <para-designer> mount
3. UEditor初始化
4. ⚠️ UEditor可能修改了某些容器的高度
5. 或者：showWorkflowPanel状态改变了
6. 或者：.region-south突然出现/高度变化
7. 用户点击"源码视图"返回
8. editor-body可用高度变小
9. CodeMirror高度缩小 → ❌ 显示69行
```

### 高度差异计算

```
正常状态：85行
异常状态：69行
差异：16行

假设每行高度约20px（含行距）：
16行 × 20px = 320px

推测：某个容器突然占用了约320px的空间
```

---

## 🔬 **可能的原因**

### 原因1：.region-south在切换时突然出现 ⭐⭐⭐⭐⭐

**最可能！**

```javascript
// loadData()中的逻辑 (1844-1847行)
if (res.success) {
  this.showWorkflowPanel = res.success && res.result != null
} else {
  this.showWorkflowPanel = false
}
```

**问题**：
- 初次加载时，`showWorkflowPanel`可能是`false`
- 从设计视图切换回来时，可能触发了某个操作使其变为`true`
- `.region-south`突然出现，占用了`32px + 350px = 382px`
- 挤压了`.editor-body`的可用高度

### 原因2：workflowHeight动态变化

```javascript
// data()中的默认值
workflowHeight: 350  // 350px
```

**问题**：
- 初次加载时，`workflowHeight`可能是350
- 切换时，可能被改为其他值（如500）
- 导致`.south-body`高度变化

### 原因3：UEditor修改了.dm-editor-page的高度

UEditor可能在初始化时：
```javascript
// UEditor可能执行了类似的操作
document.querySelector('.dm-editor-page').style.height = 'XXXpx'
```

导致原来的 `calc(100vh - 135px)` 被覆盖。

### 原因4：ParaDesigner未完全销毁

ParaDesigner组件销毁时：
- UEditor虽然destroy了
- 但某些DOM残留或事件监听器未清理
- 继续占用空间或影响布局

---

## 🧪 **诊断脚本（精确定位）**

### 脚本1：检查.region-south状态

```javascript
// ===== 检查region-south状态 =====

console.log('==== Region South 状态检查 ====\n');

// 检查是否存在
const regionSouth = document.querySelector('.region-south');
console.log('region-south存在:', !!regionSouth);

if (regionSouth) {
  console.log('  offsetHeight:', regionSouth.offsetHeight, 'px');
  console.log('  是否折叠:', regionSouth.classList.contains('region-south--collapsed'));
  
  const resizeBar = regionSouth.querySelector('.south-resize-bar');
  const titleBar = regionSouth.querySelector('.south-title-bar');
  const body = regionSouth.querySelector('.south-body');
  
  console.log('  resize-bar高度:', resizeBar ? resizeBar.offsetHeight : 'N/A', 'px');
  console.log('  title-bar高度:', titleBar ? titleBar.offsetHeight : 'N/A', 'px');
  console.log('  south-body高度:', body ? body.offsetHeight : 'N/A', 'px');
  console.log('  south-body style.height:', body ? body.style.height : 'N/A');
}

// 检查Vue实例的showWorkflowPanel状态
const vm = document.querySelector('.dm-editor-page').__vue__;
console.log('\nVue状态:');
console.log('  showWorkflowPanel:', vm.showWorkflowPanel);
console.log('  workflowHeight:', vm.workflowHeight);
console.log('  workflowCollapsed:', vm.workflowCollapsed);
```

### 脚本2：对比两次的.dm-editor-page和.editor-body高度

```javascript
// ===== 对比容器高度 =====

const dmEditorPage = document.querySelector('.dm-editor-page');
const editorBody = document.querySelector('.editor-body');
const regionCenter = document.querySelector('.region-center');
const viewTabs = document.querySelector('.view-tabs');
const codeMirror = document.querySelector('.CodeMirror');

console.log('==== 容器高度对比 ====\n');

const containers = [
  { name: '.dm-editor-page', el: dmEditorPage },
  { name: '.editor-body', el: editorBody },
  { name: '.region-center', el: regionCenter },
  { name: '.view-tabs', el: viewTabs },
  { name: '.CodeMirror', el: codeMirror }
];

containers.forEach(({ name, el }) => {
  if (el) {
    console.log(`${name}:`);
    console.log(`  计算高度: ${getComputedStyle(el).height}`);
    console.log(`  offsetHeight: ${el.offsetHeight}px`);
    console.log(`  clientHeight: ${el.clientHeight}px`);
    console.log(`  内联样式: ${el.style.height || '无'}`);
    console.log('');
  }
});

// 计算CodeMirror应该有的高度
console.log('==== 理论高度计算 ====');
const dmPageHeight = dmEditorPage.offsetHeight;
const regionSouth = document.querySelector('.region-south');
const regionSouthHeight = regionSouth ? regionSouth.offsetHeight : 0;
const availableHeight = dmPageHeight - regionSouthHeight;
console.log(`dm-editor-page高度: ${dmPageHeight}px`);
console.log(`region-south高度: ${regionSouthHeight}px`);
console.log(`editor-body可用高度: ${availableHeight}px`);
console.log(`实际editor-body高度: ${editorBody.offsetHeight}px`);
console.log(`差异: ${editorBody.offsetHeight - availableHeight}px`);
```

---

## 🎯 **请运行诊断**

请按以下步骤运行诊断：

### 步骤1：初次加载（正常状态）

1. 刷新页面，直接进入源码视图（正常显示85行）
2. 打开浏览器控制台
3. 运行**脚本1**和**脚本2**
4. 复制输出结果（标记为"正常状态"）

### 步骤2：切换后（异常状态）

1. 双击para进入设计视图
2. 点击"源码视图"返回（异常显示69行）
3. 打开浏览器控制台
4. 运行**脚本1**和**脚本2**
5. 复制输出结果（标记为"异常状态"）

### 步骤3：对比分析

将两次的输出结果发给我，我会精确定位问题根源。

---

## 💡 **预判**

根据16行（约320px）的差异，我预判：

1. **.region-south在切换时突然出现**（占用382px）
2. 或者**workflowHeight从350变为其他值**
3. 或者**UEditor修改了.dm-editor-page的height**

诊断脚本的输出将给出确切答案。
