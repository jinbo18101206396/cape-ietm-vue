# ifjump/退回次数 相关代码全面排查报告

**排查日期**: 2026-08-27  
**排查范围**: 前端 Vue + 后端 Java  
**排查目标**: 查找类似"[第0次退回]"的显示问题

---

## 一、排查范围

### 前端文件 (6个)
1. ✅ `WfInstanceDtlTable.vue` - **已修复**
2. ✅ `WorkflowInfoPanel.vue` - 已检查
3. ⚠️ `DmContentEditor.vue` - 待检查
4. ⚠️ `DmSourceView.vue` - 待检查
5. ⚠️ `WorkflowInfoPanel.vue.backup-20260821-005404` - 备份文件，忽略
6. ⚠️ `Step2.vue` (examples) - 示例文件，忽略

### 后端文件 (3个核心)
1. ✅ `WfExecuteServiceImpl.java` - 已检查
2. ✅ `WfInstanceDtl.java` (实体) - 已检查
3. ✅ `WfExecute.java` (实体) - 已检查

---

## 二、已修复问题

### ✅ 问题1: WfInstanceDtlTable.vue - getIfpassText方法

**位置**: `WfInstanceDtlTable.vue:1007-1011`

**问题**: `ifjump=0` 时显示 `[第0次退回]`

**修复状态**: ✅ 已修复

**修复代码**:
```javascript
getIfpassText(ifpass, ifjump) {
  const jumpNum = parseInt(ifjump)
  const jump = (!isNaN(jumpNum) && jumpNum > 0) ? '[第' + jumpNum + '次退回]' : ''
  const map = { '1': '通过', '2': '发表不同意见', ... }
  return jump + (map[ifpass] || '')
}
```

---

## 三、无问题代码

### ✅ WfInstanceDtlTable.vue - jumpPrefix方法

**位置**: `WfInstanceDtlTable.vue:952-956`

**代码**:
```javascript
jumpPrefix(ifjump) {
  const n = parseInt(ifjump)
  if (isNaN(n) || n <= 0) return ''  // ✅ 正确：使用 n <= 0 判断
  return '>'.repeat(n)
}
```

**分析**: ✅ **无问题**
- 已使用 `parseInt()` 转换
- 已使用 `n <= 0` 过滤，不会为0时显示前缀
- 逻辑正确

---

### ✅ WorkflowInfoPanel.vue - 跳转前缀生成

**位置**: `WorkflowInfoPanel.vue:916-926`

**代码**:
```javascript
// 计算当前最大退回次数
const maxIfjump = Math.max(0, ...this.nodes.map(n => parseInt(n.ifjump || 0, 10)))
const returnNo = maxIfjump + 1

// 构造意见前缀
const typePrefix = isReturn ? `[第${returnNo}次退回]` : '跳过'
```

**分析**: ✅ **无问题**
- 这是**生成新的退回次数**，不是显示现有的
- `returnNo = maxIfjump + 1` 保证至少为1
- 场景：用户点击"跳转"操作时，自动计算下一个退回序号
- 不存在"第0次退回"的情况

---

### ✅ WfExecuteServiceImpl.java - handleReturn方法

**位置**: `WfExecuteServiceImpl.java:438-441`

**代码**:
```java
// 目标节点标记为退回状态，退回次数+1
String currentIfjump = targetNode.getIfjump();
int ifjumpValue = (currentIfjump == null || currentIfjump.trim().isEmpty()) ? 0 : Integer.parseInt(currentIfjump);
ifjumpValue++;  // 先+1再保存
targetNode.setIfjump(String.valueOf(ifjumpValue));
```

**分析**: ✅ **无问题**
- 这是**后端处理退回操作**，递增退回次数
- `ifjumpValue++` 在保存前执行，保证存储的值至少为1
- 初始值为0或null时，经过++后变为1
- 不会保存0到数据库

---

## 四、需要进一步检查的文件

### ⚠️ DmContentEditor.vue

**位置**: 编辑器主组件

**排查原因**: 文件中包含 `ifjump` 或 `退回` 关键字

**检查重点**:
- 是否有显示退回次数的逻辑
- 是否有类似 `getIfpassText` 的方法
- 是否有拼接 `[第X次退回]` 的字符串操作

---

### ⚠️ DmSourceView.vue

**位置**: 源码视图组件

**排查原因**: 文件中包含 `ifjump` 或 `退回` 关键字

**检查重点**:
- 是否有显示工作流信息的功能
- 是否有处理退回次数的逻辑

---

## 五、排查结论

### 已确认的代码质量

| 代码位置 | 功能 | 状态 | 说明 |
|---------|------|------|------|
| `WfInstanceDtlTable.getIfpassText` | 显示处理结果 | ✅ 已修复 | 本次修复目标 |
| `WfInstanceDtlTable.jumpPrefix` | 显示退回箭头 | ✅ 正确 | 使用 `n <= 0` 判断 |
| `WorkflowInfoPanel` 跳转前缀 | 生成新退回序号 | ✅ 正确 | `returnNo = max + 1` 保证≥1 |
| `WfExecuteServiceImpl.handleReturn` | 后端退回处理 | ✅ 正确 | 存储前先+1 |

### 潜在风险评估

| 风险等级 | 说明 |
|---------|------|
| 🟢 低风险 | 核心显示和处理逻辑已检查，无明显缺陷 |
| 🟡 需确认 | DmContentEditor.vue、DmSourceView.vue 两个文件待深入检查 |

---

## 六、下一步行动

### 立即行动
1. ✅ 检查 `DmContentEditor.vue` 中 `ifjump` 的使用
2. ✅ 检查 `DmSourceView.vue` 中 `ifjump` 的使用

### 验证建议
- 在真实环境测试退回功能，确认：
  - 首次退回显示 `[第1次退回]` ✓
  - 二次退回显示 `[第2次退回]` ✓
  - 跳转前缀正确显示 ✓
  - 退回箭头 `>` 数量正确 ✓

---

## 七、技术模式总结

### ✅ 正确模式

**模式1: 显示逻辑 - 过滤0值**
```javascript
const num = parseInt(value)
if (!isNaN(num) && num > 0) {
  // 只显示大于0的值
}
```

**模式2: 生成逻辑 - 保证最小值**
```javascript
const next = Math.max(current, 0) + 1  // 保证至少为1
```

**模式3: 后端存储 - 先递增再保存**
```java
int value = (current == null || current.isEmpty()) ? 0 : Integer.parseInt(current);
value++;  // 先+1
entity.setValue(String.valueOf(value));  // 再保存
```

### ❌ 错误模式

```javascript
// ❌ 错误：只检查非空，不检查是否>0
const jump = (ifjump != null && ifjump !== '') ? '[第' + ifjump + '次退回]' : ''
```

---

**排查进度**: 60% (3/5 核心文件已完成)  
**下一步**: 检查 DmContentEditor.vue 和 DmSourceView.vue
