# 工作流钩子接口文档

## P0-19: 外部钩子接口（对齐旧系统 6 个扩展点）

为了让父页面（DM管理页面）能够在流程操作前后进行扩展处理，新系统提供了 6 个钩子事件，对齐旧系统 JSP 的 `parent.beforeXxx()` / `parent.afterXxx()` 调用。

---

## 使用方式

在父组件中监听 `WorkflowInfoPanel` 的事件：

```vue
<workflow-info-panel
  :formid="dmId"
  @before-insert-node="handleBeforeInsertNode"
  @before-delete-node="handleBeforeDeleteNode"
  @before-save-node="handleBeforeSaveNode"
  @before-submit="handleBeforeSubmit"
  @after-submit-success="handleAfterSubmitSuccess"
  @after-get-back="handleAfterGetBack"
/>
```

---

## 事件清单

### 1. `before-insert-node` — 新增节点前

**触发时机**: 用户点击"新增节点"按钮，在创建临时行之前

**事件参数**: 无

**返回值**: 
- 若钩子函数返回 `false`，阻止新增操作
- 若返回 `true` 或无返回值，允许继续

**使用场景**: 
- 检查 DM 状态是否允许编辑流程
- 验证流程配置是否完整

**示例**:
```javascript
handleBeforeInsertNode() {
  if (this.dm.status === 'archived') {
    this.$message.error('已归档的 DM 不能新增节点')
    return false
  }
  return true
}
```

---

### 2. `before-delete-node` — 删除节点前

**触发时机**: 用户点击"删除"按钮，在调用删除接口之前

**事件参数**: 
- `record` (Object): 待删除的节点对象

**返回值**: 同 `before-insert-node`

**使用场景**:
- 检查节点是否为系统保留节点
- 验证删除权限

**示例**:
```javascript
handleBeforeDeleteNode(node) {
  if (node.nodename === '初审') {
    this.$message.error('初审节点不能删除')
    return false
  }
  return true
}
```

---

### 3. `before-save-node` — 保存节点前

**触发时机**: 用户点击"确定"按钮保存节点，在调用保存接口之前

**事件参数**: 
- `record` (Object): 待保存的节点对象

**返回值**: 同 `before-insert-node`

**使用场景**:
- 校验节点配置完整性
- 验证处理人权限范围

**示例**:
```javascript
handleBeforeSaveNode(node) {
  if (!node.stagename && this.hasStages) {
    this.$message.error('分阶段流程必须指定阶段名称')
    return false
  }
  return true
}
```

---

### 4. `before-submit` — 提交处理前

**触发时机**: 用户点击"提交"按钮，在前端校验通过后、调用提交接口之前

**事件参数**: 无

**返回值**: 同 `before-insert-node`

**使用场景**:
- 检查 DM 内容是否保存
- 验证附件上传状态
- 校验业务规则

**示例**:
```javascript
handleBeforeSubmit() {
  if (this.dmContentModified) {
    this.$message.error('DM 内容未保存，请先保存再提交')
    return false
  }
  if (this.requiredAttachmentMissing) {
    this.$message.error('必填附件未上传')
    return false
  }
  return true
}
```

---

### 5. `after-submit-success` — 提交成功后

**触发时机**: 提交接口返回成功后，在刷新流程数据之后

**事件参数**: 
- `data` (Object): 提交结果数据
  - `instid` (String): 流程实例 ID
  - `formid` (String): 业务表单 ID (DM ID)
  - `ifpass` (String): 处理结果 (1=通过, 2=不同意, 3=跳转, 9=终止)

**返回值**: 无

**使用场景**:
- 刷新父页面列表
- 关闭当前 tab
- 更新 DM 状态显示

**示例**:
```javascript
handleAfterSubmitSuccess(data) {
  // 刷新 DM 列表
  this.refreshDmList()
  
  // 如果流程结束，关闭编辑 tab
  if (data.ifpass === '9' || this.isFlowEnded) {
    this.closeCurrentTab()
  }
  
  // 弹出提示
  this.$notification.success({
    message: '流程处理成功',
    description: `流程 ${data.instid} 已更新`
  })
}
```

---

### 6. `after-get-back` — 拿回成功后

**触发时机**: 拿回接口返回成功后，在刷新流程数据之后

**事件参数**: 
- `data` (Object): 拿回结果数据
  - `instdtlid` (String): 节点明细 ID
  - `instid` (String): 流程实例 ID

**返回值**: 无

**使用场景**:
- 刷新父页面状态
- 更新待办列表

**示例**:
```javascript
handleAfterGetBack(data) {
  // 刷新待办列表
  this.refreshTodoList()
  
  // 提示用户
  this.$message.success('已拿回，可重新处理')
}
```

---

## 完整示例

```vue
<template>
  <dm-content-editor
    :dm-id="currentDmId"
  >
    <workflow-info-panel
      :formid="currentDmId"
      @before-insert-node="checkBeforeInsert"
      @before-delete-node="checkBeforeDelete"
      @before-save-node="checkBeforeSave"
      @before-submit="checkBeforeSubmit"
      @after-submit-success="handleSubmitSuccess"
      @after-get-back="handleGetBack"
    />
  </dm-content-editor>
</template>

<script>
export default {
  data() {
    return {
      currentDmId: null,
      dmContentModified: false,
      dmStatus: null
    }
  },
  methods: {
    checkBeforeInsert() {
      if (this.dmStatus === 'locked') {
        this.$message.error('DM 已锁定，不能编辑流程')
        return false
      }
      return true
    },
    
    checkBeforeDelete(node) {
      if (node.seqno === 0) {
        this.$message.error('创建节点不能删除')
        return false
      }
      return true
    },
    
    checkBeforeSave(node) {
      // 自定义校验
      if (node.userid && !this.isUserAuthorized(node.userid)) {
        this.$message.error('选择的用户无权限处理此 DM')
        return false
      }
      return true
    },
    
    checkBeforeSubmit() {
      if (this.dmContentModified) {
        this.$message.error('DM 内容未保存，请先保存再提交')
        return false
      }
      return true
    },
    
    handleSubmitSuccess(data) {
      console.log('流程提交成功', data)
      
      // 刷新列表
      this.refreshDmList()
      
      // 如果是终止流程，关闭 tab
      if (data.ifpass === '9') {
        this.closeTab(this.currentDmId)
      }
    },
    
    handleGetBack(data) {
      console.log('节点拿回成功', data)
      this.refreshTodoCount()
    },
    
    isUserAuthorized(userid) {
      // 检查用户是否在项目授权范围内
      return true
    },
    
    refreshDmList() {
      // 刷新列表逻辑
    },
    
    closeTab(dmId) {
      // 关闭 tab 逻辑
    },
    
    refreshTodoCount() {
      // 刷新待办数量
    }
  }
}
</script>
```

---

## 对标旧系统

| 旧系统钩子 | 新系统事件 | 调用位置 |
|-----------|----------|---------|
| `parent.beforeInsertnode()` | `@before-insert-node` | WfInstanceDtlTable.vue:285 |
| `parent.beforeDelnode()` | `@before-delete-node` | WfInstanceDtlTable.vue:390 |
| `parent.beforeSavenode()` | `@before-save-node` | WfInstanceDtlTable.vue:342 |
| `parent.beforeSubmit()` | `@before-submit` | WorkflowInfoPanel.vue:377 |
| `parent.afterSubmitSuccess()` | `@after-submit-success` | WorkflowInfoPanel.vue:424 |
| `parent.afterGetBack()` | `@after-get-back` | WorkflowInfoPanel.vue:347 |

---

## 注意事项

1. **`before-*` 事件的返回值**  
   必须显式返回 `false` 才能阻止操作，返回 `undefined` / `true` 均视为允许。

2. **异步钩子**  
   当前实现为同步钩子，如需异步校验（如调用后端接口），建议：
   - 在钩子函数内先返回 `false` 阻止默认操作
   - 异步校验成功后，手动调用组件的公开方法继续操作

3. **事件冒泡**  
   钩子事件从子组件 `WfInstanceDtlTable` → `WorkflowInfoPanel` → 父页面，确保在最外层父组件监听。

4. **钩子不触发的情况**  
   - 后端直接操作数据库绕过前端
   - 用户手动修改浏览器网络请求
   - 开发模式下禁用钩子（`skipHooks` 配置）

---

## 修复清单

**P0-19 修复内容**：
- ✅ WfInstanceDtlTable.vue:285 — `insertNode` 增加 `before-insert-node` 钩子
- ✅ WfInstanceDtlTable.vue:390 — `deleteRow` 增加 `before-delete-node` 钩子  
- ✅ WfInstanceDtlTable.vue:342 — `commitRow` 增加 `before-save-node` 钩子
- ✅ WorkflowInfoPanel.vue:377 — `handleSubmit` 增加 `before-submit` 钩子
- ✅ WorkflowInfoPanel.vue:424 — `doSubmit` 增加 `after-submit-success` 钩子
- ✅ WorkflowInfoPanel.vue:347 — `handleTakeBack` 增加 `after-get-back` 钩子

**对齐状态**: 6/6 钩子已实现 ✅

---

## 版本历史

- **v2.7** (2026-08-20): P0-19 修复完成，6个钩子全部实现
