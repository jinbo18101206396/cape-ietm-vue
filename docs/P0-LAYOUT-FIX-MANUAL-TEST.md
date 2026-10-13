# P0 布局修复 - 手动测试指南

**测试日期**: 2026-10-10  
**问题**: 从 Para 设计视图返回源码视图后，CodeMirror 行距崩溃  
**修复**: 添加 `refreshLayout` 事件机制

---

## ✅ 前提条件

### 1. 编译环境
- ✅ **已修复 Babel 8.0 兼容性问题**
  - 降级：`@babel/core` 8.0.7 → 7.23.0
  - 降级：`@babel/preset-env` 8.0.7 → 7.23.0
  - 状态：编译成功 ✅

### 2. 服务状态
- ✅ 前端服务：`http://localhost:3004/` 
- ✅ 编译时间：34.5 秒
- ✅ 编译状态：`Compiled successfully`

---

## 🧪 测试步骤

### 步骤 1：打开 DM 编辑器
1. 浏览器访问：`http://localhost:3004/`
2. 登录系统（如需要）
3. 进入 **数据模块管理** → **编辑 DM**
4. 确保打开一个包含 `<para>` 元素的 DM

### 步骤 2：进入设计视图
1. 在源码视图中，定位到任意 `<para>` 元素
2. 点击该行的 **设计视图图标**（📝）
3. 验证：Para 设计器弹窗正常打开

### 步骤 3：在设计视图中编辑
1. 在 UEditor 中随意编辑一些文本
2. 点击 **保存** 按钮
3. 验证：弹窗关闭，返回源码视图

### 步骤 4：验证行距是否正常 ⭐ **关键测试**
**预期结果**：
- ✅ CodeMirror 的 **行号区域** 宽度正常
- ✅ 代码行之间的 **行距** 正常（不会压缩成一团）
- ✅ **光标位置** 与文本对齐
- ✅ 可以正常 **滚动** 和 **编辑**

**如果失败**（修复前的行为）：
- ❌ 行号区域宽度变窄或消失
- ❌ 代码行挤在一起，几乎看不清
- ❌ 光标位置错乱
- ❌ 编辑器几乎不可用

### 步骤 5：重复测试（多次验证）
1. 再次打开同一个或不同的 `<para>` 设计视图
2. 编辑并保存
3. 验证行距是否仍然正常
4. **建议重复 3-5 次**，确保稳定性

### 步骤 6：不保存直接关闭（边界测试）
1. 打开 Para 设计视图
2. 编辑一些文本
3. **不保存**，直接点击 **取消** 按钮关闭
4. 验证：CodeMirror 布局仍然正常

---

## 🔍 技术验证点

### 1. 查看浏览器控制台
打开浏览器开发者工具（F12），查看 Console 输出：

**预期日志**（保存时）：
```
[ParaDesigner] 🔧 保存完成，发送refreshLayout事件
[DmContentEditor] 🔧 收到refreshLayout事件，准备刷新CodeMirror布局
[DmContentEditor] 🔄 源码视图中，调用forceFixGuttersLayout
```

**预期日志**（取消时）：
```
[ParaDesigner] 🔧 组件销毁，发送refreshLayout事件
[DmContentEditor] 🔧 收到refreshLayout事件，准备刷新CodeMirror布局
[DmContentEditor] 🔄 源码视图中，调用forceFixGuttersLayout
```

### 2. 代码修改点
**ParaDesigner.vue**:
- Line 862-865: `handleSave()` 中添加 `this.$emit('refreshLayout')`
- Line 176: `beforeDestroy()` 中添加 `this.$emit('refreshLayout')`

**DmContentEditor.vue**:
- Line 44: 添加 `@refreshLayout="onParaRefreshLayout"` 事件监听
- Lines 595+: 新增 `onParaRefreshLayout()` 方法

---

## 📊 测试矩阵

| 测试场景 | 操作 | 预期结果 | 状态 |
|---------|------|---------|------|
| 1. 保存后返回 | 编辑 Para → 保存 | 行距正常 ✅ | ⬜ 待测 |
| 2. 取消后返回 | 编辑 Para → 取消 | 行距正常 ✅ | ⬜ 待测 |
| 3. 连续打开关闭 | 重复 5 次 | 行距始终正常 ✅ | ⬜ 待测 |
| 4. 不同 Para | 测试不同的 Para 元素 | 行距正常 ✅ | ⬜ 待测 |
| 5. 长文档 | 在大型 DM 中测试 | 行距正常 ✅ | ⬜ 待测 |

---

## 🐛 已知问题

### 修复前的问题（应该已解决）
- ❌ **P0-布局崩溃**: 从设计视图返回后，CodeMirror 行距压缩，几乎不可用
  - **根因**: Modal 的 CSS 污染残留，`display:none` 样式影响背景 CodeMirror
  - **修复**: 添加 `refreshLayout` 事件，父组件接收后调用 `editor.refresh()`

### 其他已知问题（非本次修复范围）
- **P1-内存泄漏**: DmPreviewModal 的 blob URL 未清理（已在前一轮修复）
- **P2-A**: 其他组件可能缺少 iframe 清理（低优先级）
- **P2-B**: 部分组件缺少 destroyOnClose 属性（低优先级）

---

## ✅ 通过标准

测试通过需满足：
1. ✅ **所有 5 个测试场景** 都通过
2. ✅ **控制台日志** 正确输出
3. ✅ **无 JavaScript 错误**
4. ✅ **用户体验** 流畅，无感知延迟

---

## 📝 测试报告模板

**测试人员**: _______________  
**测试日期**: 2026-10-10  
**浏览器**: Chrome / Firefox / Edge (请选择)  
**前端版本**: cape-ietm-vue (git commit: _____________)

| 场景 | 结果 | 备注 |
|-----|------|------|
| 1. 保存后返回 | ⬜ 通过 / ⬜ 失败 | |
| 2. 取消后返回 | ⬜ 通过 / ⬜ 失败 | |
| 3. 连续打开关闭 | ⬜ 通过 / ⬜ 失败 | |
| 4. 不同 Para | ⬜ 通过 / ⬜ 失败 | |
| 5. 长文档 | ⬜ 通过 / ⬜ 失败 | |

**控制台日志截图**: （请附上）  
**问题截图**: （如有失败，请附上）

**最终结论**: ⬜ 通过 / ⬜ 需要修复

---

## 🔗 相关文档

- **P0 修复详细文档**: `docs/P0-LAYOUT-FIX-IMPLEMENTATION.md`
- **代码审计报告**: `docs/COMPREHENSIVE-CODE-AUDIT-REPORT.md`
- **P1 内存泄漏修复**: `docs/P1-MEMORY-LEAK-FIX-REPORT.md`
- **单元测试报告**: `docs/TEST-EXECUTION-REPORT.md`

---

**生成时间**: 2026-10-10  
**文档版本**: v1.0  
**状态**: ✅ 编译成功，待手动测试
