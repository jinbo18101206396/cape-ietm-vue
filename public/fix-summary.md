# 重建 refs 与 DOCTYPE 功能 - 修复总结

## 修复时间
2026-08-10

## 问题汇总

### 问题1：XML中出现两个 `<refs>` 标签

**现象：**
```xml
<content>
    <refs>
<refs xmlns:xlink="http://www.w3.org/1999/xlink">
    <dmRef>...</dmRef>
</refs>
    <description>
```

**根本原因：**
1. `_findRefsEndLine()` 使用复杂的两层查找逻辑：先找兄弟元素，再向上找 `</refs>`
2. 在某些情况下返回的行号不是 `</refs>` 的位置，而是下一个兄弟元素（如 `<description>`）的位置
3. `startLine` 的计算依赖 `nodeList` 的 `lineno` 字段，但该字段不是元素开始标签的位置，导致偏差

**修复方案：**

**文件：** `DmContentEditor.vue` Line 1201-1217

```javascript
_findRefsEndLine(mainelemname, refsline1Relative) {
  const editor = this.$refs.editor.getEditor()
  const linenoOffset = this.$refs.editor.getLinenoOffset()

  // 转换为绝对行号（0-based）
  const refsline1Abs = refsline1Relative + linenoOffset - 1

  // 直接从 <refs> 起始行向下搜索 </refs>
  const closeTag = '</' + this._getLocaleName('refs') + '>'
  for (let i = refsline1Abs + 1; i < editor.lineCount(); i++) {
    const line = editor.getLine(i) || ''
    if (line.includes(closeTag)) {
      console.log('[_findRefsEndLine] 找到 </refs> 在绝对行', i)
      return i  // 返回绝对行号
    }
  }

  console.warn('[_findRefsEndLine] 未找到 refs 闭合标签')
  return -1
}
```

**改动：** 简化查找逻辑，直接搜索 `</refs>` 标签，不再依赖兄弟元素

**文件：** `DmContentEditor.vue` Line 868-887

```javascript
if (refsline1 !== -1) {
  // 替换已有 refs - 通过搜索 <refs> 标签找到准确的起始行
  const refsOpenTag = '<' + this._getLocaleName('refs')
  let startLine = -1

  // 从 content 往下搜索 <refs> 的实际起始位置
  const searchStart = Math.max(0, linenoOffset)
  for (let i = searchStart; i < editor.lineCount(); i++) {
    const line = editor.getLine(i) || ''
    if (line.includes(refsOpenTag)) {
      startLine = i
      break
    }
  }

  if (startLine === -1) {
    console.warn('[_torefs] 未能定位到 <refs> 标签起始行')
    return
  }
  
  // ... 后续替换逻辑
}
```

**改动：** 不再依赖 `nodeList` 的 `lineno`，直接在编辑器中搜索 `<refs>` 标签的实际位置

---

### 问题2：ICN后缀弹窗被"重建refs与DOCTYPE"确认框遮挡

**现象：**
点击"重建 refs 与 DOCTYPE"确认后，"指定 ICN 后缀"弹窗出现但被确认框的遮罩层挡住，无法操作。

**根本原因：**
`doRegenRefs` 的 `onOk` 使用了 `async () => {}`，这会让 Ant Design Vue 的 `$confirm` 立即认为操作完成并开始关闭流程，但实际的异步操作（`_correctIcn()` 中打开 ICN 后缀弹窗）还在执行，导致遮罩层残留。

**修复方案：**

**文件：** `DmContentEditor.vue` Line 742-762

```javascript
doRegenRefs() {
  console.log('[doRegenRefs] 按钮被点击')
  this.$confirm({
    title: '重建 refs 与 DOCTYPE',
    content: '此操作将删除原 content/refs 元素以及 <!DOCTYPE> 并重新生成，是否确认？',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      console.log('[doRegenRefs] 用户确认，开始执行 _torefs')
      // 返回 Promise 让确认框等待异步操作完成后再关闭
      return new Promise(async (resolve, reject) => {
        try {
          await this._torefs()
          await this._correctIcn()
          console.log('[doRegenRefs] 全部执行完成')
          resolve()
        } catch (err) {
          console.error('[doRegenRefs] 执行失败:', err)
          this.$message.error('重建失败：' + (err.message || '未知错误'))
          reject(err)
        }
      })
    }
  })
}
```

**改动：** 将 `onOk: async () => {}` 改为 `onOk: () => { return new Promise(async (resolve, reject) => {}) }`

**关键点：**
- `onOk` 不直接使用 `async`，而是返回显式的 Promise
- 所有异步操作在 Promise 内部完成
- `resolve()` 在所有操作（包括子弹窗关闭）后调用

---

### 问题3：签入确认框存在相同问题

**现象：**
虽然签入流程中没有子弹窗，但使用了异步操作（保存、签入API调用），如果用户在签入完成前再次触发其他操作，可能出现遮罩层干扰。

**根本原因：**
与问题2相同，`doCheckIn` 的 `onOk` 也使用了异步操作但未返回 Promise。

**修复方案：**

**文件：** `DmContentEditor.vue` Line 519-541

```javascript
this.$confirm({
  title: '签入', content: '确定该DM要签入？',
  onOk: () => {
    // 返回 Promise 让确认框等待异步操作完成后再关闭
    return new Promise((resolve, reject) => {
      // 先保存，保存失败（乐观锁冲突/未签出）则中止签入
      this._doSaveSync().then(ok => {
        if (!ok) {
          resolve() // 保存失败也要resolve让确认框关闭
          return
        }
        postAction(`/ietm/datamodule/checkIn?id=${encodeURIComponent(this.id)}`).then(res => {
          if (res.success) {
            this.$message.success('签入成功')
            this.mode = 'browse'
            this.$refs.editor.setReadOnly(true)
            resolve()
          } else {
            this.$message.error(res.message || '签入失败')
            reject(new Error(res.message || '签入失败'))
          }
        }).catch(err => {
          this.$message.error('签入失败：' + (err.message || '网络错误'))
          reject(err)
        })
      }).catch(err => {
        reject(err)
      })
    })
  }
})
```

**改动：** 应用与问题2相同的修复模式

---

### 问题4：`<refs>` 缺少 xlink 命名空间声明

**现象：**
生成的 refs 块格式错误，XML解析报错：
```
Namespace prefix xlink for type on dmRef is not defined
```

**根本原因：**
收集到的 `<dmRef>` 元素包含 `xlink:type`、`xlink:show` 等属性，但生成的 `<refs>` 根元素没有声明 `xmlns:xlink` 命名空间。

**修复方案：**

**文件：** `DmContentEditor.vue` Line 834

**修复前：**
```javascript
let refsXml = '<refs>\n' + refs.join('\n') + '\n</refs>'
```

**修复后：**
```javascript
let refsXml = '<refs xmlns:xlink="http://www.w3.org/1999/xlink">\n' + refs.join('\n') + '\n</refs>'
```

**改动：** 在 `<refs>` 开始标签中添加 xlink 命名空间声明

---

## 全局排查结果

### `$confirm` 使用审计

在 `DmContentEditor.vue` 中共发现 **5处** `$confirm` 调用：

| 位置 | 方法 | 状态 | 说明 |
|------|------|------|------|
| Line 254 | `beforeRouteLeave` | ✅ 无问题 | 简单同步操作（路由跳转） |
| Line 519 | `doCheckIn` | ✅ **已修复** | 异步操作，已改为返回 Promise |
| Line 563 | 版本冲突处理 | ✅ 无问题 | 简单同步操作（重新加载） |
| Line 744 | `doRegenRefs` | ✅ **已修复** | 异步操作+子弹窗，已改为返回 Promise |
| Line 1411 | 删除元素确认 | ✅ 无问题 | 同步操作（DOM删除） |

### 其他弹窗组件

审计了所有 Modal 组件引用，均为正常的弹窗调用，无层级问题。

---

## 测试覆盖

### 自动化测试

创建了完整的测试套件：`test-regen-comprehensive.js`

**测试场景（7个）：**
1. ✅ 场景1: 正常流程（有图形）
2. ✅ 场景2: 无图形元素
3. ✅ 场景3: 取消ICN后缀弹窗
4. ✅ 场景4: 多个图形元素
5. ✅ 边界1: 空infoEntityIdent
6. ✅ 边界2: 已存在refs块
7. ✅ 边界3: 快速双击防重复

**关键验证点：**
- ✅ ICN后缀弹窗不被遮挡（检查 z-index 和 mask 数量）
- ✅ XML中只有一个 `<refs>` 标签
- ✅ `<refs>` 包含 xlink 命名空间
- ✅ DOCTYPE 正确生成 ENTITY
- ✅ 无遗留遮罩层

### 排查工具

创建了弹窗层级排查工具：`test-modal-audit.js`

**功能：**
- 实时检查页面弹窗状态
- 扫描源码中的 `$confirm` 使用模式
- 识别潜在的弹窗层级问题
- 生成修复建议

---

## 修复模式总结

### ❌ 错误写法

```javascript
this.$confirm({
  title: '确认',
  onOk: async () => {
    await someAsyncOperation()
    this.$refs.someModal.show()  // ⚠️ 会被遮挡
  }
})
```

**问题：** `async () => {}` 立即返回 Promise，确认框开始关闭但遮罩层残留

### ✅ 正确写法

```javascript
this.$confirm({
  title: '确认',
  onOk: () => {
    return new Promise(async (resolve, reject) => {
      try {
        await someAsyncOperation()
        await this.$refs.someModal.show()
        resolve()  // 所有操作完成后再resolve
      } catch (err) {
        reject(err)
      }
    })
  }
})
```

**关键：**
1. `onOk` 返回显式 Promise
2. 所有异步操作在 Promise 内完成
3. `resolve()` 在最后调用

---

## 验证清单

- [x] 双 `<refs>` 问题已修复
- [x] ICN后缀弹窗不被遮挡
- [x] 签入确认框不干扰后续操作
- [x] xlink 命名空间正确添加
- [x] 所有 `$confirm` 使用已审计
- [x] 自动化测试套件已创建
- [x] 排查工具已创建
- [x] 测试说明文档已创建

---

## 相关文件

### 修改的文件
- `D:\workspace\IETM\cape-ietm-vue\src\views\ietm\ietmdatamodulemanagement\editor\DmContentEditor.vue`

### 新增的测试文件
- `D:\workspace\IETM\cape-ietm-vue\public\test-regen-comprehensive.js` - 全面测试套件
- `D:\workspace\IETM\cape-ietm-vue\public\test-modal-audit.js` - 弹窗层级排查工具
- `D:\workspace\IETM\cape-ietm-vue\public\test-instructions.md` - 测试说明文档

---

## 后续建议

1. **代码规范：** 将正确的 `$confirm` 使用模式加入编码规范
2. **Code Review：** 在未来的代码审查中重点检查 `$confirm` 的使用
3. **自动检测：** 考虑添加 ESLint 规则检测 `onOk: async` 模式
4. **定期审计：** 定期运行 `test-modal-audit.js` 检查新增代码
5. **用户反馈：** 收集用户使用反馈，发现其他潜在的弹窗层级问题

---

## 修复影响评估

**风险等级：** 低

**影响范围：**
- `doRegenRefs()` - 重建 refs 与 DOCTYPE 功能
- `doCheckIn()` - 签入功能
- `_findRefsEndLine()` - 内部辅助方法
- `_torefs()` - refs 重建逻辑

**向后兼容性：** ✅ 完全兼容
- 功能行为保持一致
- 只修复了 bug，未改变预期行为
- 不影响其他功能

**性能影响：** ✅ 无负面影响
- `_findRefsEndLine()` 简化后性能反而略有提升
- Promise 包装的开销可忽略不计

---

## 测试命令

### 快速验证

```javascript
// 1. 全面测试
fetch('/test-regen-comprehensive.js').then(r=>r.text()).then(eval)

// 2. 弹窗排查
fetch('/test-modal-audit.js').then(r=>r.text()).then(eval)
```

### 预期结果

```
总计: 7 个测试
✅ 通过: 7
❌ 失败: 0
通过率: 100%
```
