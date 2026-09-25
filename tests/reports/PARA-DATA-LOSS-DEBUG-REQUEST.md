# Para设计器数据丢失 - 深度审核请求

## 🔴 **问题描述**
保存后，原来的 `<para>` 对应的 `</para>` 丢失了

## 📋 **需要的关键信息**

为了精确诊断，请提供以下信息：

### 1. 完整的控制台日志（最重要！）
从点击铅笔图标到保存完成的**所有日志**，特别是：

```javascript
[ParaDesigner] 🔍 setcontent开始: {...}
[ParaDesigner] 🔍 判断单行/多行para: {...}
[ParaDesigner] ✓ 单行para: endline = X 或 ✓ 找到结束标签: {...}

// 保存时
[ParaDesigner] 🔍 Step 2 - html2para结果: "..."
[ParaDesigner] 🔍 Step 4 - formateXml后: "..."
[ParaDesigner] 🔍 保存前状态: {...}
[ParaDesigner] 🔍 replaceRange参数: {...}
[ParaDesigner] 🔍 替换前第 X 行: "..."
[ParaDesigner] 🔍 替换后第 X 行: "..."
[ParaDesigner] 🔍 变化的行: [...]
```

### 2. 保存前的XML结构（至少10-15行）
```xml
Line 60: ...
Line 61: ...
...
Line 75: ...
```

请标注：
- 哪一行是您点击铅笔的para
- 哪一行是"原来的 <para>"
- 哪一行是"对应的 </para>"（丢失的那个）

### 3. 保存后的XML结构
```xml
Line 60: ...
Line 61: ...
...
Line 75: ...
```

请标注哪里丢失了。

---

## 🤔 **可能的原因（需要日志确认）**

### 假设A：setcontent搜索到了错误的endline
```javascript
// 如果日志显示
[ParaDesigner] ✓ 找到结束标签: {endline: 77, line: "</para>"}
// 但实际上Line 77的</para>是另一个para的
```

### 假设B：replaceRange替换了错误的范围
```javascript
// 如果日志显示
[ParaDesigner] 🔍 replaceRange参数: {
  from: {line: 69, ch: 0},
  to: {line: 77, ch: X}
}
// 但Line 69-77包含了其他para
```

### 假设C：formatXml破坏了XML结构
```javascript
// 如果日志显示
[ParaDesigner] 🔍 Step 4 - formateXml后: "异常的XML结构"
```

---

## 🔍 **我的排查计划**

一旦您提供日志，我将：

1. **分析setcontent的逻辑**
   - 验证endline搜索算法是否正确
   - 检查是否找到了正确的结束标签

2. **分析replaceRange的范围**
   - 验证替换范围是否正确
   - 检查是否误删了其他行

3. **分析XML生成逻辑**
   - 验证html2para和formatXml的输出
   - 检查是否产生了格式错误的XML

4. **提供精确的修复方案**

---

请提供上述信息，我将立即进行深度分析！
