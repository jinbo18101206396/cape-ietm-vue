# IETM 编辑器代码全面审核计划

## 审核目标

系统性、全面、深度审核 IETM 编辑器模块代码，查找与 P0 布局问题类似的潜在缺陷。

## 审核维度

### 1. CSS 污染和布局问题
- Modal/Dialog 组件对父容器的样式污染
- 组件销毁时的样式清理
- CodeMirror/UEditor 等第三方库的样式副作用
- Tab 切换时的布局刷新

### 2. 生命周期和清理
- beforeDestroy/destroyed 钩子的清理完整性
- 事件监听器的注销
- 定时器/Observer 的清理
- 内存泄漏风险

### 3. 事件处理和通信
- 父子组件事件传递的完整性
- 事件发射后的响应处理
- 事件命名的一致性
- 缺失的事件监听器

### 4. 状态同步
- 组件间状态同步的正确性
- 视图切换时的状态保持
- 数据更新后的 UI 刷新

### 5. 第三方库集成
- CodeMirror 的使用和刷新
- UEditor 的初始化和销毁
- 其他库的正确集成

## 审核范围

编辑器模块的 14 个组件：
1. DmContentEditor.vue (主编辑器)
2. DmSourceView.vue (源码视图)
3. ParaDesigner.vue (已修复)
4. DmStructureTree.vue (结构树)
5. DmAttrPanel.vue (属性面板)
6. DmValidatePanel.vue (校验面板)
7. IetmInterrefDialog.vue (内部引用对话框)
8. IetmDmRefDialog.vue (DM引用对话框)
9. IetmSymbolDialog.vue (图符对话框)
10. DmIdListModal.vue (对象列表)
11. DmNodePreviewModal.vue (节点预览)
12. DmPreviewModal.vue (DM预览)
13. IcnSuffixModal.vue (ICN后缀)
14. IcnPreviewPane.vue (ICN预览面板)

## 审核方法

### 阶段 1: 快速扫描 (识别高风险区域)
- Grep 搜索关键模式
- 识别使用第三方库的组件
- 识别使用 Modal/Dialog 的组件
- 识别有复杂生命周期的组件

### 阶段 2: 深度分析 (逐个组件审查)
- 完整读取每个组件代码
- 检查生命周期钩子
- 检查事件处理
- 检查样式操作
- 检查状态管理

### 阶段 3: 问题分类和优先级
- P0: 严重问题（影响核心功能）
- P1: 重要问题（影响用户体验）
- P2: 一般问题（边界情况）
- P3: 优化建议

### 阶段 4: 输出审核报告
- 问题清单
- 根因分析
- 修复建议
- 风险评估

## 执行计划

1. **阶段 1**: 使用 Grep 快速识别高风险模式 (15分钟)
2. **阶段 2**: 深度审查主编辑器和源码视图 (30分钟)
3. **阶段 3**: 审查所有 Dialog/Modal 组件 (30分钟)
4. **阶段 4**: 审查其他辅助组件 (20分钟)
5. **阶段 5**: 整理问题清单和修复方案 (15分钟)

**预计总时间**: 110 分钟

## 重点关注模式

### 需要查找的代码模式

**样式污染**:
- `.style.cssText =`
- `.style.height =`
- `.style.width =`
- `.closest()`
- `querySelector`

**生命周期**:
- `beforeDestroy`
- `destroyed`
- 没有配对清理的 `addEventListener`
- 没有配对清理的 `setInterval`/`setTimeout`
- 没有配对清理的 `MutationObserver`

**事件处理**:
- `$emit` 发射但没有对应的监听
- `@` 事件监听但没有对应的发射
- 事件监听器没有在销毁时移除

**第三方库**:
- `CodeMirror`
- `UEditor`
- `refresh()` 调用
- `destroy()` 调用

## 预期输出

生成详细的审核报告，包含：
1. 发现的问题数量和分类
2. 每个问题的详细描述
3. 问题优先级
4. 修复建议
5. 测试验证方案
