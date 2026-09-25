# Para设计器Bug测试指南

## ✅ 部署状态

**部署时间**: 2026-09-24  
**前端服务**: ✅ 已启动（端口3000，PID 24600）  
**后端服务**: ✅ 运行中（端口9999，PID 12440）  
**调试日志**: ✅ 已添加

---

## 🧪 测试步骤

### 步骤1：准备测试DM

1. 打开浏览器访问：**http://localhost:3000**
2. 登录系统
3. 进入"数据模块管理"
4. 创建或打开一个测试DM

### 步骤2：准备测试XML

在DM的源码视图中，创建以下XML结构：

```xml
<para>
<para></para>
```

**重要**：
- 确保第一行是 `<para>`（可能是未闭合的标签）
- 确保第二行是 `<para></para>`（完整的空标签）
- 如果您的实际场景不同，请使用您实际遇到问题的XML结构

### 步骤3：打开浏览器控制台

1. 按 **F12** 打开开发者工具
2. 切换到 **"Console"（控制台）** 标签
3. 清空之前的日志（点击🚫图标）

### 步骤4：复现Bug

1. 在源码视图中，找到 `<para></para>` 行
2. 点击该行的 **铅笔图标** 🖊️
3. **观察控制台输出** - 应该看到：
   ```javascript
   [ParaDesigner] 🔍 setcontent开始: {...}
   [ParaDesigner] 🔍 判断单行/多行para: {...}
   ```
4. 在设计视图中，**不做任何修改**
5. 直接点击 **"保存"** 按钮
6. **立即观察控制台** - 应该看到大量的 🔍 日志

### 步骤5：收集调试信息

#### A. 复制完整的控制台日志

在控制台中：
1. 右键点击日志区域
2. 选择 "Save as..." 或全选复制
3. 保存为文本文件或直接粘贴

**特别关注以下日志**：

```javascript
// 关键日志1：html2para的结果
[ParaDesigner] 🔍 Step 2 - html2para结果: "..."

// 关键日志2：formateXml的结果（最重要！）
[ParaDesigner] 🔍 Step 4 - formateXml后: "..."
[ParaDesigner] 🔍 XML长度: X 字符
[ParaDesigner] 🔍 XML末尾字符码: X  // ← 如果是10，说明有\n换行符

// 关键日志3：replaceRange参数
[ParaDesigner] 🔍 replaceRange参数: {
  from: {...},
  to: {...},
  xmlToInsert: "...",
  currentLineContent: "..."
}

// 关键日志4：替换前后对比
[ParaDesigner] 🔍 替换前第 X 行: "..."
[ParaDesigner] 🔍 替换后第 X 行: "..."
[ParaDesigner] 🔍 变化的行: [...]
```

#### B. 提供完整的XML上下文

在源码视图中：
1. 找到问题para的位置
2. 复制**前后至少5-10行**的XML
3. 标注行号

示例：
```xml
Line 8:  <levelledPara>
Line 9:    <title>标题</title>
Line 10:   <para>
Line 11:   <para></para>  ← 点击这一行的铅笔
Line 12:   <para>正常内容</para>
Line 13: </levelledPara>
```

#### C. 验证Bug是否复现

保存后，检查：
1. ✅ 是否在 `<para></para>` 下方生成了新行？
2. ✅ 原来的 `<para>` 是否失去了 `</para>`？
3. ✅ XML结构是否被破坏？

---

## 📊 预期的调试日志示例

### 正常情况（无Bug）

```javascript
[ParaDesigner] 🔍 Step 4 - formateXml后: "<para></para>"
[ParaDesigner] 🔍 XML长度: 13 字符
[ParaDesigner] 🔍 XML末尾字符码: 62  // ">" 的ASCII码
[ParaDesigner] 🔍 变化的行: [
  {lineNo: 11, before: "<para></para>", after: "<para></para>"}
]
```

### 异常情况A（formateXml添加了换行符）

```javascript
[ParaDesigner] 🔍 Step 4 - formateXml后: "<para></para>\n"
[ParaDesigner] 🔍 XML长度: 14 字符  // ← 多了1个字符
[ParaDesigner] 🔍 XML末尾字符码: 10  // ← \n的ASCII码是10！
[ParaDesigner] 🔍 变化的行: [
  {lineNo: 11, before: "<para></para>", after: "<para></para>"},
  {lineNo: 12, before: "...", after: ""}  // ← 新生成了空行！
]
```

### 异常情况B（html2para生成了多个para）

```javascript
[ParaDesigner] 🔍 Step 2 - html2para结果: "<para></para>\n<para></para>"
[ParaDesigner] 🔍 XML长度: 27 字符  // ← 太长了！
[ParaDesigner] 🔍 变化的行: [
  {lineNo: 11, before: "<para></para>", after: "<para></para>"},
  {lineNo: 12, before: "...", after: "<para></para>"}  // ← 多了一个para！
]
```

---

## 🎯 分析目标

收集到日志后，我将能够：

1. **确定根因**
   - 是formateXml的问题？
   - 是html2para的问题？
   - 还是其他原因？

2. **实施精确修复**
   - 如果XML末尾字符码=10 → 修复formateXml，移除换行符
   - 如果html2para返回多个para → 修复html2para逻辑
   - 如果是其他原因 → 针对性修复

3. **编写测试用例**
   - 覆盖您的真实场景
   - 防止回归

---

## 📞 提交调试信息

请提供以下内容：

### ✅ 必须提供
1. **完整的控制台日志**（所有🔍标记的输出）
2. **完整的XML上下文**（问题para前后5-10行，带行号）
3. **Bug是否复现**（是/否）

### 📝 可选提供
1. 屏幕录像（操作过程）
2. 保存前后的完整DM XML对比
3. 您对问题的额外观察

---

## 🚀 后续流程

```
您提供调试日志
    ↓
我分析根因（30分钟）
    ↓
我实施修复（1-2小时）
    ↓
我编写测试（1小时）
    ↓
我部署修复版本（30分钟）
    ↓
您验证修复效果
```

**预计总时间**: 收到日志后3-4小时内完成修复

---

## 📋 检查清单

在开始测试前，请确认：

- [ ] 浏览器已打开 http://localhost:3000
- [ ] F12开发者工具已打开
- [ ] 控制台标签已清空
- [ ] 准备好测试DM和问题XML
- [ ] 准备好记录日志和截图

---

**部署完成时间**: 2026-09-24  
**前端地址**: http://localhost:3000  
**后端地址**: http://localhost:9999/jeecg-boot  
**优先级**: 🔴 P0

准备就绪，等待您的测试结果！
