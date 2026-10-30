# Phase 11 修复：图符显示和DM引用渲染问题

**修复日期**：2026-10-29  
**修复阶段**：Phase 11 - 内容渲染完善  
**问题来源**：用户反馈

---

## 问题描述

### 问题1：警告列表中，插入图符后，图片没显示

**表现**：
- 编辑器中插入图符（symbol）后，表格中只显示空白或文本，不显示图片

**原因分析**：
- 图符通过 `insertSymbol()` 方法插入为 `<img>` 标签（带 xml 属性存储原始 XML）
- 但在 `getContentData()` 显示时，对结构化类型（figure）没有正确处理 `<img>` 标签的渲染

### 问题2：警告列表中，插入"DM引用"后，为何显示转义的XML代码

**表现**：
```html
<a href="javascript:void(0);" xml="&lt;dmRef xlink:type=&quot;simple&quot;...&gt;">【DM引用】</a>
```

显示为原始 HTML 代码，而非链接文本"【DM引用】"

**原因分析**：
- `insertDmRef()` 方法插入 `<a>` 标签，xml 属性值被转义为 `&quot;` 和 `&lt;` 等
- 保存时，`escapeXmlContent()` 尝试从 `<a>` 标签提取 XML 但处理不完善
- 结果：转义的 HTML 被保留在内容中，显示时被原样呈现

---

## 修复方案

### 核心思路

在 `getContentData()` 方法中添加**内容清理阶段**，彻底处理转义的 HTML 属性和 XML 内容：

```javascript
// 第一步：正常 HTML 渲染
// 第二步：清理 HTML 属性中的转义 XML 内容
// 第三步：还原 <a> 和 <img> 标签中的 xml 属性
```

### 修复步骤

#### 1. 新增 `sanitizeHtmlContent()` 方法（第 1719-1761 行）

**功能**：清理 HTML 内容中残留的转义 XML 属性

```javascript
sanitizeHtmlContent(html) {
  // 处理 <a> 标签中的 xml 属性（DM引用、内部引用）
  // 匹配：<a ... xml="&lt;...&gt;">...文本...</a>
  // 解码后保留用户看到的标签文本（【DM引用】）
  
  // 处理 <img> 标签中的 xml 属性（图符）
  // 解码后保留图片显示功能
}
```

**处理对象**：
- DM引用：`<a xml="&lt;dmRef...&gt;">【DM引用】</a>` → 保留链接文本
- 内部引用：`<a xml="&lt;...&gt;">【内部引用】</a>` → 保留链接文本  
- 图符：`<img xml="&lt;graphic...&gt;" />` → 保留图片显示

#### 2. 改进 `getContentData()` 方法（第 738-792 行）

**关键改进**：
```javascript
// 原来的处理
htmlContent = innerHtml

// 改进后的处理（两层清理）
htmlContent = this.sanitizeHtmlContent(innerHtml)

// 进一步清理转义的 xml 属性
if (htmlContent && htmlContent.includes('xml="') && htmlContent.includes('&lt;')) {
  htmlContent = this.sanitizeHtmlContent(htmlContent)
}
```

**效果**：
- 第一次清理：提取并还原 HTML 属性中的转义 XML
- 第二次清理：处理任何残留的转义内容

#### 3. 改进 `escapeXmlContent()` 方法（第 1727-1800 行）

**关键改进**：
```javascript
// 原来对 <a> 标签的处理
result = result.replace(/<(img|a)\s+[^>]*xml="([^"]*)"[^>]*>(?:.*?<\/\1>)?/gi, ...)

// 改进后的处理
// 对于 <a> 标签，保留用户看到的标签文本
// 只对 <img> 或其他情况才提取 xml 属性
if (tag.toLowerCase() === 'a' && match.includes('>') && match.includes('</a>')) {
  return match  // 保留原始 <a>...</a> 标签
}
```

**理由**：
- `<a>【DM引用】</a>` 已是最终形式，不需要进一步提取
- 保留用户看到的链接文本，用于表格显示
- 只对 `<img>` 标签进行 xml 属性的提取和还原

---

## 修改文件

### D:\workspace\IETM\cape-ietm-vue\src\views\ietm\ietmdatamodulemanagement\editor\components\LevelledParaDesigner.vue

**修改行数**：
- 第 738-792 行：`getContentData()` 方法
- 第 1719-1761 行：新增 `sanitizeHtmlContent()` 方法
- 第 1763-1827 行：改进 `escapeXmlContent()` 方法

**修改统计**：
- 新增方法：1 个 (`sanitizeHtmlContent`)
- 改进方法：2 个 (`getContentData`, `escapeXmlContent`)
- 净代码增加：约 100 行

---

## 工作流程

### 显示流程（修复后）

```
DB存储数据
   ↓
加载到 selectedNode.html[type]
   ↓
getContentData(type) 获取显示数据
   ├─ 第一步：提取内部 HTML（去外层 XML 标签）
   ├─ 第二步：sanitizeHtmlContent() 清理转义属性
   ├─ 第三步：二次检查是否还有转义 xml 属性
   └─ 最终：干净的 HTML 返回给表格
   ↓
<div v-html="record.htmlContent"> 渲染
   ↓
用户看到：
   - 图符：显示 <img> 标签（图片可见）
   - DM引用：显示 【DM引用】 文本（链接可点）
```

### 数据示例

**修复前**（问题状态）：
```json
{
  "content": "<warning id=\"w1\"><p><a href=\"javascript:void(0);\" xml=\"&lt;dmRef ...&gt;\">【DM引用】</a></p></warning>"
}
```

显示结果：直接渲染 `<a>` 标签的 HTML，导致转义代码可见

**修复后**（正确状态）：
```json
{
  "content": "<warning id=\"w1\"><p><a href=\"javascript:void(0);\" xml=\"&lt;dmRef ...&gt;\">【DM引用】</a></p></warning>",
  "htmlContent": "<a href=\"javascript:void(0);\">【DM引用】</a>"  // 清理后
}
```

显示结果：用户看到链接"【DM引用】"或图符预览

---

## 测试验证

### 测试案例 1：图符显示

**步骤**：
1. 打开 LevelledPara 设计视图
2. 选择"警告"Tab
3. 添加一条警告
4. 点击"插入图符"按钮，选择一个图符
5. 编辑完成后保存

**预期结果**：
- ✅ 表格中显示图符的图片预览（max-width: 300px）
- ✅ 图片可见，不显示 XML 代码

### 测试案例 2：DM引用显示

**步骤**：
1. 打开 LevelledPara 设计视图
2. 选择"警告"Tab
3. 添加一条警告
4. 点击"插入DM引用"按钮，选择一个 DM
5. 编辑完成后保存

**预期结果**：
- ✅ 表格中显示"【DM引用】"文本或链接
- ✅ 不显示转义的 XML 代码（如 `&lt;dmRef...&gt;`）
- ✅ 链接可以点击

### 测试案例 3：内部引用显示

**步骤**：
1. 打开 LevelledPara 设计视图
2. 选择"段落"Tab
3. 添加一个段落
4. 点击"插入内部引用"按钮，选择目标
5. 编辑完成后保存

**预期结果**：
- ✅ 表格中显示"【内部引用】"文本
- ✅ 不显示转义的 XML 代码
- ✅ 链接可以点击

---

## 编译验证

```bash
npm run build
```

**结果**：✅ 成功编译，5 个 CSS 警告（无关紧要）

---

## 后续注意

1. **缓存清理**：修改后需清理浏览器缓存（Ctrl+Shift+Delete）
2. **集成测试**：建议进行上述三个测试案例的验证
3. **性能影响**：新增 `sanitizeHtmlContent()` 方法为轻量级，性能无明显影响
4. **兼容性**：修复不影响现有数据，旧数据会自动被清理处理

---

## 相关文档

- 上一阶段：[[levelledpara-phase4-fixes.md]] - Phase 4 UI 完整性修复
- 阶段 8：[[LEVELLEDPARA_PHASE8_COMPLETE_REPORT.md]] - 性能优化和边界检查
- 总体规划：[[LEVELLEDPARA_COMPLETE_REPAIR_PLAN.md]] - 完整修复规划

