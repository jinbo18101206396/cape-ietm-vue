# §16.4 重建 refs 与 DOCTYPE - 测试说明

## 测试准备

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 确保已经打开一个 DM 编辑页面（编辑模式）

## 快速测试

### 1. 运行全面测试套件

```javascript
fetch('/test-regen-comprehensive.js').then(r=>r.text()).then(eval)
```

**测试内容：**
- 场景1: 正常流程（有图形）
- 场景2: 无图形元素
- 场景3: 取消ICN后缀弹窗
- 场景4: 多个图形元素
- 边界1: 空infoEntityIdent
- 边界2: 已存在refs块
- 边界3: 快速双击防重复

**预期结果：** 所有测试通过，无弹窗遮挡问题

### 2. 运行弹窗层级排查

```javascript
fetch('/test-modal-audit.js').then(r=>r.text()).then(eval)
```

**排查内容：**
- 当前页面弹窗状态
- 源码中 $confirm 使用模式
- 其他弹窗调用审计
- 修复建议

**预期结果：** 无弹窗层级问题警告

## 手动测试场景

### 场景A：正常的重建流程（有图形）

**步骤：**
1. 在编辑器中输入包含 `<graphic infoEntityIdent="ICN-TEST"/>` 的XML
2. 点击工具栏的"重建Refs"按钮
3. 确认对话框点击"确定"
4. 观察：ICN后缀弹窗是否正常显示（不被遮挡）
5. 在ICN后缀弹窗中选择后缀，点击"确定"
6. 检查生成的XML是否包含：
   - `<refs xmlns:xlink="...">`（只有一个）
   - `<!DOCTYPE dmodule[...<!ENTITY ICN-TEST...>]>`

**判断标准：**
- ✅ ICN后缀弹窗完全可见，不被遮挡
- ✅ 只有一个 `<refs>` 标签
- ✅ DOCTYPE 包含正确的 ENTITY 声明

### 场景B：无图形元素

**步骤：**
1. 在编辑器中输入不包含任何图形元素的XML
2. 点击"重建Refs"按钮
3. 确认对话框点击"确定"
4. 观察：不应该出现ICN后缀弹窗

**判断标准：**
- ✅ 直接完成，不弹出ICN后缀窗口
- ✅ 生成空 DOCTYPE：`<!DOCTYPE dmodule[]>`

### 场景C：取消ICN后缀弹窗

**步骤：**
1. 输入包含图形的XML
2. 点击"重建Refs"并确认
3. 在ICN后缀弹窗中点击"取消"
4. 观察：弹窗正常关闭，无残留遮罩层

**判断标准：**
- ✅ 弹窗正常关闭
- ✅ 无遮罩层残留（页面可正常操作）

### 场景D：已存在refs块（替换）

**步骤：**
1. 输入包含旧 `<refs>` 块的XML
2. 点击"重建Refs"并确认
3. 检查结果

**判断标准：**
- ✅ 旧的 `<refs>` 被完全删除
- ✅ 新的 `<refs>` 正确生成
- ✅ 只有一个 `<refs>` 标签

### 场景E：签入功能（测试修复的 doCheckIn）

**步骤：**
1. 确保 DM 处于签出状态
2. 修改内容
3. 点击"签入"按钮
4. 确认对话框点击"确定"
5. 观察：签入过程是否正常，无弹窗遮挡

**判断标准：**
- ✅ 确认框正常关闭
- ✅ 签入成功消息正常显示
- ✅ 编辑器变为只读模式

## 边界测试

### 边界1：空 infoEntityIdent

**XML 示例：**
```xml
<graphic infoEntityIdent=""/>
<graphic infoEntityIdent="ICN-VALID"/>
```

**预期：** 空的被跳过，只生成有效的 ENTITY

### 边界2：快速双击

**步骤：**
1. 快速连续点击两次"重建Refs"按钮
2. 观察是否出现多个确认框

**预期：** 不应该出现异常，最多只有一个确认框

### 边界3：多个重复图形

**XML 示例：**
```xml
<graphic infoEntityIdent="ICN-001"/>
<graphic infoEntityIdent="ICN-001"/>
<graphic infoEntityIdent="ICN-001"/>
```

**预期：** ENTITY 去重，只生成一个 `<!ENTITY ICN-001 ...>`

## 检查清单

在所有测试完成后，验证以下几点：

- [ ] ICN后缀弹窗始终可见，不被遮挡
- [ ] 确认框在异步操作完成后才关闭
- [ ] 没有多个遮罩层同时存在
- [ ] XML 中只有一个 `<refs>` 标签
- [ ] `<refs>` 包含 `xmlns:xlink` 命名空间声明
- [ ] DOCTYPE 正确生成 ENTITY 声明
- [ ] 签入功能正常工作
- [ ] 没有控制台错误

## 已修复的问题

### 问题1：双 `<refs>` 标签

**原因：** `_findRefsEndLine()` 使用间接方式查找结束行，且 startLine 计算依赖不准确的 nodeList lineno

**修复：** 直接在编辑器中搜索 `<refs>` 标签的实际位置

### 问题2：ICN后缀弹窗被遮挡

**原因：** `doRegenRefs` 的 `onOk` 使用 `async () => {}`，导致确认框立即关闭但遮罩层残留

**修复：** 改为返回显式 Promise，让确认框等待所有异步操作完成

### 问题3：签入确认框类似问题

**原因：** `doCheckIn` 的 `onOk` 也存在相同问题

**修复：** 应用相同的 Promise 返回模式

## 调试命令

### 查看当前弹窗状态

```javascript
console.log('弹窗:', document.querySelectorAll('.ant-modal').length)
console.log('遮罩:', document.querySelectorAll('.ant-modal-mask').length)
```

### 查看编辑器当前XML

```javascript
const comp = document.querySelector('#app').__vue__.$children[0]
function findEditor(c) {
  if (c.$options.name === 'DmContentEditor') return c
  for (const child of c.$children) {
    const result = findEditor(child)
    if (result) return result
  }
}
const editor = findEditor(comp)
console.log(editor.$refs.editor.getEditor().getValue())
```

### 手动触发重建

```javascript
const comp = document.querySelector('#app').__vue__.$children[0]
function findEditor(c) {
  if (c.$options.name === 'DmContentEditor') return c
  for (const child of c.$children) {
    const result = findEditor(child)
    if (result) return result
  }
}
const editor = findEditor(comp)
editor.doRegenRefs()
```

## 预期测试结果

运行 `test-regen-comprehensive.js` 后：

```
总计: 7 个测试
✅ 通过: 7
❌ 失败: 0

通过率: 100%
```

运行 `test-modal-audit.js` 后：

```
弹窗总数: 0
遮罩层总数: 0
确认框总数: 0

✅ 未发现明显的弹窗层级问题
```

## 如有问题

如果测试失败，请：

1. 截图控制台输出
2. 记录失败的测试用例名称
3. 描述实际现象与预期的差异
4. 检查是否正确刷新了页面（Ctrl+Shift+R）
