# 🧪 浏览器 Console 测试 - 使用指南

## 📖 快速开始

### 第 1 步：打开测试页面
1. 启动前端服务 (localhost:3000)
2. 启动后端服务 (localhost:9999)
3. 登录系统 (admin/123456)
4. 打开任意 DM 编辑器页面，例如：
   ```
   http://localhost:3000/#/ietm/dm-management/editor/2086452253387866113?mode=edit
   ```
5. 等待编辑器完全加载（看到 CodeMirror 编辑器和左侧树）

### 第 2 步：打开开发者工具
- **Windows/Linux**: 按 `F12` 或 `Ctrl+Shift+I`
- **Mac**: 按 `Cmd+Option+I`
- 切换到 **Console** 标签

### 第 3 步：运行测试脚本
1. 打开文件：`browser-console-test-regen-refs.js`
2. 全选复制 (`Ctrl+A` → `Ctrl+C`)
3. 粘贴到 Console (`Ctrl+V`)
4. 按 `Enter` 执行

### 第 4 步：查看测试结果
测试会自动运行 6-7 个测试用例，并在 Console 输出：
- ✅ 绿色：测试通过
- ❌ 红色：测试失败
- 最后显示汇总表格

---

## 📊 测试覆盖范围

### ✅ 场景测试（4个）
- **TC-01**: 无 DOCTYPE、无图形元素 → 生成空 DOCTYPE
- **TC-02**: 有 DOCTYPE、有图形元素 → 替换并生成 ENTITY/NOTATION
- **TC-03**: 已有 refs 块 → 正确替换不误删后续内容
- **TC-04**: brexDmRef 排除 → 不被收集到 refs

### ✅ 边界测试（2个）
- **TE-01**: 多个重复 DMC → 去重
- **TE-02**: 空 infoEntityIdent → 跳过

---

## 🔍 测试验证点

每个测试都会验证以下**关键点**：

### 1. XML 结构完整性
- ✅ XML 声明存在：`<?xml version="1.0" encoding="UTF-8"?>`
- ✅ DOCTYPE 声明存在：`<!DOCTYPE dmodule[...]>`
- ✅ `<dmodule>` 根元素存在
- ✅ 所有 xmlns 属性完整（dc, rdf, xlink, xsi）
- ✅ 顺序正确：XML声明 → DOCTYPE → `<dmodule>`

### 2. 功能正确性
- ✅ refs 块正确生成/替换
- ✅ ENTITY 和 NOTATION 正确生成
- ✅ DMC 去重
- ✅ brexDmRef 被排除
- ✅ description 内容不被误删

### 3. 真实 UI 交互
- ✅ 点击"重建Refs"按钮
- ✅ 确认对话框
- ✅ Vue 组件状态变化
- ✅ CodeMirror 编辑器内容更新

---

## 🐛 如果测试失败

### 常见问题

#### 1. "未找到编辑器组件"
**原因**: 页面未完全加载或不在编辑器页面
**解决**:
- 确认 URL 包含 `/editor/` 路径
- 等待页面完全加载（看到编辑器）
- 刷新页面重试

#### 2. "未找到重建Refs按钮"
**原因**: 按钮未渲染或 DOM 结构变化
**解决**:
- 检查工具栏是否有"重建Refs"按钮
- 查看按钮的实际 title 属性：
  ```javascript
  document.querySelectorAll('button[title]').forEach(b => console.log(b.title))
  ```

#### 3. 某个测试失败
**原因**: 功能 Bug 或测试数据问题
**操作**:
1. 查看 Console 输出的详细错误信息
2. 查看 `window.__testResults` 获取完整结果：
   ```javascript
   console.table(window.__testResults)
   ```
3. 手动验证该场景

---

## 📝 查看详细结果

### 方法 1：查看 Console 输出
测试过程中会实时输出每个测试的结果

### 方法 2：查看结果对象
```javascript
// 查看所有结果
window.__testResults

// 查看失败的测试
window.__testResults.filter(r => !r.passed)

// 查看某个测试的详情
window.__testResults.find(r => r.testId === 'TC-01')
```

### 方法 3：导出结果
```javascript
// 复制结果到剪贴板
copy(JSON.stringify(window.__testResults, null, 2))

// 然后粘贴到文本编辑器保存
```

---

## 🔄 重复运行测试

如果需要重新运行测试：

1. **刷新页面** (F5)
2. **重新执行脚本**（复制粘贴到 Console）

或者创建一个书签：
```javascript
javascript:(function(){fetch('http://localhost:3000/browser-console-test-regen-refs.js').then(r=>r.text()).then(eval)})()
```

---

## 📌 注意事项

### ⚠️ 测试会修改当前 DM 的内容
- 测试脚本会临时修改编辑器中的 XML 内容
- 建议使用测试 DM 或在测试前保存当前工作
- 测试完成后可以刷新页面恢复原始内容（如未保存）

### ⚠️ 测试需要网络和后端
- 需要后端 API 正常运行
- 需要正确的登录 token

### ⚠️ 浏览器兼容性
- 推荐使用 Chrome/Edge (最新版本)
- Firefox 和 Safari 也支持，但未充分测试

---

## 🎯 期望的测试结果

**理想情况**（所有 Bug 已修复）：
```
总计: 6 个测试
✅ 通过: 6
❌ 失败: 0

通过率: 100%
```

**如果有失败**：
- 查看失败详情
- 参考 `CODE_AUDIT_REGEN_REFS_COMPREHENSIVE.md` 了解已知问题
- 手动验证确认是否为真实 Bug

---

## 📞 获取帮助

如果遇到问题：

1. 检查 Console 的完整错误信息
2. 查看 `window.__testEditor` 确认组件已找到：
   ```javascript
   window.__testEditor
   window.__testEditor.$refs.editor.getLinenoOffset()
   ```
3. 查看审计文档：`CODE_AUDIT_REGEN_REFS_COMPREHENSIVE.md`
4. 参考手动测试清单：`MANUAL_TEST_CHECKLIST_REGEN_REFS.md`

---

**测试愉快！** 🚀
