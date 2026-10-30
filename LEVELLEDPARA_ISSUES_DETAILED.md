# LevelledPara 问题详细清单

**总计**: 6 个问题 | 严重 2 | 中等 3 | 低等 1

---

## 问题 #1: CONTENT_TYPES 常量未导出

**严重程度**: 🟠 MEDIUM  
**类别**: 代码重复、可维护性  
**发现位置**: levelledParaConverterV2.js:13 定义 ↔ Vue 文件多处硬编码

### 症状

Vue 文件中有 **9 处**地方硬编码了内容类型列表，且与 Converter 中的定义重复：

```javascript
// LevelledParaDesigner.vue - 硬编码点 1 (第 692 行)
const isStructured = type === 'figure' || type === 'multimedia' || type === 'table' || type === 'foldout' || type === 'caption'

// LevelledParaDesigner.vue - 硬编码点 2 (第 1051 行)
const isStructured = ['figure', 'multimedia', 'table', 'foldout', 'caption'].includes(type)

// LevelledParaDesigner.vue - 硬编码点 3 (第 1109 行)
const isStructured = ['figure', 'multimedia', 'table', 'foldout', 'caption'].includes(type)

// LevelledParaDesigner.vue - 硬编码点 4 (第 931 行)
const isStructured = ['figure', 'multimedia', 'table', 'foldout', 'caption'].includes(type)

// LevelledParaDesigner.vue - 硬编码点 5-9 (第 1307, 1388, 1418, 539, 其他)
const contentTypes = ['para', 'warning', 'caution', 'note', 'figure', 'multimedia', 'foldout', 'table', 'caption']
```

### 根本原因

Converter 中定义的常量未通过 `export` 导出，Vue 文件无法导入使用。

### 风险评估

| 风险项 | 影响 | 严重性 |
|--------|------|--------|
| 维护困难 | 添加新类型时需改 9 处 | MEDIUM |
| 不一致风险 | 9 处可能不同步 | MEDIUM |
| 代码审查难 | 重复逻辑难以审查 | LOW |

### 修复方案

**Step 1**: 在 levelledParaConverterV2.js 中导出常量
```javascript
// 第 13-24 行改为
export const CONTENT_TYPES = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'foldout', 'table', 'caption']
export const S1000D_ORDER = {
  warning: 0,
  caution: 1,
  note: 2,
  para: 3,
  figure: 4,
  multimedia: 5,
  foldout: 6,
  table: 7,
  caption: 8
}
```

**Step 2**: 在 LevelledParaDesigner.vue 中导入
```javascript
// 第 358 行 import 修改为
import { 
  parseXmlToTree, treeToXml, createEmptyNode, getRowhtml, 
  createEmptyHtmlContent, validateTree, CONTENT_TYPES 
} from '../utils/levelledParaConverterV2'
```

**Step 3**: 替换所有硬编码
```javascript
// 原来 (硬编码)
const isStructured = type === 'figure' || type === 'multimedia' || ...

// 改为
const STRUCTURED_TYPES = CONTENT_TYPES.slice(4)  // figure, multimedia, foldout, table, caption
const isStructured = STRUCTURED_TYPES.includes(type)
```

### 修复工作量

- 修改文件: 2 个 (Converter + Vue)
- 代码行数: +2, -30 (净减 28 行)
- 测试用例: 需补充 2 个单元测试
- **预期时间**: 30 分钟

---

## 问题 #2: S1000D_ORDER 排序规则未实施

**严重程度**: 🟠 MEDIUM  
**类别**: 标准符合性、功能不完整  
**发现位置**: levelledParaConverterV2.js:14-24 定义但未使用

### 症状

虽然定义了 `S1000D_ORDER` 常量表示正确的元素顺序，但 **保存 XML 时没有按此顺序排序**。

S1000D 标准要求的顺序是:
1. warning (0)
2. caution (1)
3. note (2)
4. para (3)
5. figure (4)
6. multimedia (5)
7. foldout (6)
8. table (7)
9. caption (8)

但实际保存时，内容按用户在表格中的编辑顺序排列（可能乱序）。

### 根本原因

`syncNodeToContent()` 方法 (1374-1455 行) 虽然遍历了所有类型，但没有按 S1000D_ORDER 排序每个类型内的项，也没有检查不同类型间的顺序。

### 代码现状

```javascript
// syncNodeToContent() - 第 1388 行
const contentTypes = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'table', 'foldout', 'caption']
for (const type of contentTypes) {
  const items = node.html?.[type]
  if (Array.isArray(items) && items.length > 0) {
    items.forEach(item => {  // ⚠️ 这里没有排序
      const content = isStructured ? item.xml : item.content
      if (content) parts.push(content)
    })
  }
}
```

### 风险评估

| 风险项 | 影响 | 严重性 |
|--------|------|--------|
| 标准不符 | 输出 XML 不符合 S1000D | MEDIUM |
| 验证失败 | 第三方工具可能拒绝 | MEDIUM |
| 往返损坏 | 重复加载可能乱序 | LOW |

### 修复方案

**Option A**: 基于编辑顺序（保留现状）
- 不修改，允许用户按任意顺序编辑
- **优点**: 用户自由度高
- **缺点**: 不符合 S1000D 标准

**Option B**: 强制 S1000D 排序（推荐）
- 保存时自动排序
- **优点**: 输出标准兼容
- **缺点**: 改变用户编辑后的顺序

### 实现方案 (Option B)

**Step 1**: 在 levelledParaConverterV2.js 中添加排序函数
```javascript
export function sortContentByS1000D(htmlContent) {
  const sorted = {}
  const order = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'foldout', 'table', 'caption']
  
  order.forEach(type => {
    if (htmlContent[type]) {
      sorted[type] = htmlContent[type]
    }
  })
  
  return sorted
}
```

**Step 2**: 在 syncNodeToContent() 中调用
```javascript
// 排序内容 (确保 S1000D 符合性)
const sortedHtml = sortContentByS1000D(node.html)
for (const type of CONTENT_TYPES) {
  const items = sortedHtml?.[type]
  // ...
}
```

### 修复工作量

- 修改文件: 2 个 (Converter + Vue)
- 代码行数: +10
- 测试用例: 需补充 3 个排序测试
- **预期时间**: 45 分钟

---

## 问题 #3: escapeXml() 方法重复定义（严重）

**严重程度**: 🔴 HIGH  
**类别**: 代码质量、逻辑错误风险  
**发现位置**: LevelledParaDesigner.vue:1543-1612 两个版本

### 症状

Vue 文件中存在两个名字相同的 `escapeXml()` 方法：

**版本 1** (第 1543-1551 行) - 简单版:
```javascript
escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
```

**版本 2** (第 1561-1612 行) - 完整版:
```javascript
escapeXmlContent(content) {
  if (!content) return ''
  
  let result = content
  
  // 步骤 1: 提取 <img xml="..."> 和 <a xml="..."> 的 xml 属性
  result = result.replace(/<(img|a)\s+[^>]*xml="([^"]*)"[^>]*>(?:.*?<\/\1>)?/gi, ...)
  
  // 步骤 2: 还原 HTML 实体 (15种)
  result = result.replace(/&nbsp;/g, ' ').replace(...)
  
  // 步骤 3: 校验 XML 合法性
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<root>${result}</root>`, 'text/xml')
    // ...
  }
  
  return result
}
```

### 使用情况分析

| 位置 | 行号 | 用途 | 现用版本 | 应用版本 |
|------|------|------|---------|---------|
| syncNodeToContent (标题) | 1384 | 转义标题 | v1 简单版 | ⚠️ v2 完整版 |
| syncNodeToContent (标题) | 1423 | 转义标题 | v1 简单版 | ⚠️ v2 完整版 |
| mergeDownPara | 896 | 转义合并内容 | v2 完整版 | ✅ 正确 |
| handleBatchGenerate | 947 | 转义批量内容 | v2 完整版 | ✅ 正确 |
| saveContentEditor | 1130, 1145 | 转义编辑内容 | v2 完整版 | ✅ 正确 |

### 问题分析

使用简单版 (escapeXml) 转义标题时，**不会处理**:
1. ✅ 特殊字符 & < > " '
2. ❌ HTML 实体 (&nbsp;, &mdash; 等)
3. ❌ 特殊元素的 xml 属性提取
4. ❌ XML 合法性校验

**风险**: 标题中包含特殊字符时可能产生无效的 XML

### 测试用例

```javascript
// 标题包含特殊实体
title = "Learn&nbsp;more"

// 用简单版 (现状)
const v1 = escapeXml(title)  // "Learn&nbsp;more" → "Learn&amp;nbsp;more"
// 生成: <title>Learn&amp;nbsp;more</title> ⚠️ 实体被双转义

// 用完整版 (应该)
const v2 = escapeXmlContent(title)  // "Learn&nbsp;more" → "Learn more"
// 生成: <title>Learn more</title> ✅ 正确还原
```

### 修复方案

**Step 1**: 删除简单版 `escapeXml()` (第 1543-1551 行)

**Step 2**: 在调用简单版的位置改用完整版
```javascript
// 第 1384 行改为
parts.push(`<title>${this.escapeXmlContent(node.title)}</title>`)

// 第 1423 行改为
parts.push(`<title>${this.escapeXmlContent(node.title)}</title>`)
```

**Step 3**: 保留完整版 `escapeXmlContent()` (第 1561-1612 行) 不变

### 修复工作量

- 修改文件: 1 个 (Vue)
- 删除代码: 9 行
- 修改调用: 2 处
- **预期时间**: 15 分钟

---

## 问题 #4: 索引边界检查说明不清

**严重程度**: 🟡 LOW  
**类别**: 代码可读性、文档完整性  
**发现位置**: LevelledParaDesigner.vue:1111-1119

### 症状

saveContentEditor() 方法中的索引检查代码逻辑正确，但没有清晰说明什么时候该检查、什么时候不该检查：

```javascript
async saveContentEditor() {
  // ...
  if (index >= 0) {  // ⚠️ 为什么是 >= 0 ？
    // 编辑现有项：更新原始数据中的 content/xml 字段
    
    if (index >= this.selectedNode.html[type].length) {  // ⚠️ 这个检查什么时候会触发 ？
      console.error(`索引越界: index=${index}, length=${this.selectedNode.html[type].length}`)
      this.$message.error('数据索引错误，无法保存')
      return
    }
    
    // ... 保存逻辑
  } else {
    // ⚠️ 为什么 else 是添加新项 ？
    // 添加新项：创建新对象并包装成完整 XML
    // ...
  }
}
```

### 问题

1. **条件不明**: 为什么是 `index >= 0` 而不是 `index >= 0 && index < length`？
2. **边界说明**: 何时会触发 `index >= length` 错误？
3. **流程不清**: 三层 if 嵌套，逻辑流程不够直观

### 修复方案

添加清晰的注释说明：

```javascript
async saveContentEditor() {
  // ...
  if (index >= 0) {
    // 🔑 编辑现有项：index >= 0 表示从表格中选中的行索引（从 0 开始）
    // 新增项时 index = -1，会走 else 分支
    
    // 🔑 边界检查：防止索引越界
    // 场景：用户删除项后，selectedRowKeys 中的索引可能失效
    if (index >= this.selectedNode.html[type].length) {
      console.error(`索引越界: index=${index}, length=${this.selectedNode.html[type].length}`)
      this.$message.error('数据索引错误，无法保存')
      return
    }
    
    // 编辑现有项
    // ...
  } else {
    // 🔑 添加新项：index = -1 时，表示从"增加"按钮创建新项
    // 此时不需要索引检查，直接 push
    
    // 添加新项
    // ...
  }
}
```

### 修复工作量

- 修改文件: 1 个 (Vue)
- 代码改动: 注释 +3 行
- **预期时间**: 10 分钟

---

## 问题 #5: xml 属性提取正则过于宽松

**严重程度**: 🟠 MEDIUM  
**类别**: 数据安全、XML 解析  
**发现位置**: LevelledParaDesigner.vue:1568-1576

### 症状

escapeXmlContent() 中的正则表达式用于提取 `<img xml="...">` 和 `<a xml="...">` 中的 xml 属性，但尾部匹配过于宽松：

```javascript
result = result.replace(/<(img|a)\s+[^>]*xml="([^"]*)"[^>]*>(?:.*?<\/\1>)?/gi, ...)
                                                           ↑↑↑↑↑↑↑↑↑↑
                                                         问题：尾部可选？
```

### 问题分析

| 标记 | 含义 | 风险 |
|------|------|------|
| `(?:...)` | 非捕获组 | ✅ 正确 |
| `.*?` | 最少匹配任意字符 | ✅ 正确 |
| `\/\1` | 回溯引用同一标签 | ✅ 正确 |
| **`?`** | **使整个尾部可选** | ⚠️ 问题 |

### 测试用例

```javascript
// 测试 1: 正常的闭合 <a> 标签 (应该匹配)
const text1 = '<a xml="&quot;ref&quot;">link</a>'
// ✅ 匹配，提取 xml = '&quot;ref&quot;'

// 测试 2: 未闭合的 <a> 标签 (不应该匹配，但会匹配)
const text2 = '<a xml="&quot;ref&quot;">link'  // 缺少 </a>
// ⚠️ 因为尾部 ? 使其可选，仍会匹配
// 提取 xml = '&quot;ref&quot;'

// 测试 3: <img> 标签 (自闭合，正常)
const text3 = '<img src="x" xml="..." />'
// ✅ 匹配，提取 xml
```

### 根本原因

尾部 `(?:.*?<\/\1>)?` 中的 `?` 使整个 `</a>` 闭合标签可选，导致**未闭合标签也会被匹配**。

对于 `<img />` 自闭合标签无所谓，但对于 `<a>...</a>` 这样的容器标签，应该要求必须闭合。

### 修复方案

**方案 1**: 分别处理 img 和 a 标签
```javascript
// 处理 <img /> 自闭合
result = result.replace(/<img\s+[^>]*xml="([^"]*)"[^>]*\/?>/gi, (match, xmlAttr) => {
  return decodeXmlAttr(xmlAttr)
})

// 处理 <a>...</a> 必须闭合
result = result.replace(/<a\s+[^>]*xml="([^"]*)"[^>]*>.*?<\/a>/gi, (match, xmlAttr) => {
  return decodeXmlAttr(xmlAttr)
})
```

**方案 2**: 统一处理但要求 a 标签闭合（推荐）
```javascript
// 使用两个正则：一个 img，一个 a
result = result.replace(/<img\s+[^>]*xml="([^"]*)"[^>]*>/gi, ...)
result = result.replace(/<a\s+[^>]*xml="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi, ...)
```

### 修复工作量

- 修改文件: 1 个 (Vue)
- 代码行数: +2
- **预期时间**: 20 分钟

---

## 问题 #6: 操作数组前缺乏防御检查

**严重程度**: 🟡 LOW  
**类别**: 代码健壮性  
**发现位置**: LevelledParaDesigner.vue:815-848 (moveItemUp/Down 方法)

### 症状

moveItemUp() 和 moveItemDown() 方法在操作数组前，虽然有权限检查 canMoveItemUp/Down()，但缺乏对数组本身的防御检查：

```javascript
moveItemUp(type) {
  if (!this.canMoveItemUp(type)) return  // ✅ 权限检查
  const index = this.selectedRowKeys[type][0]
  
  if (!this.selectedNode.html) {
    this.selectedNode.html = createEmptyHtmlContent()  // ✅ null 检查
  }
  
  const items = this.selectedNode.html[type]
  // ⚠️ 这里未检查 items 是否为空数组或 undefined
  
  const temp = items[index]        // 如果 items 为空，会是 undefined
  items[index] = items[index - 1]   // 如果数组为空，可能 undefined
  items[index - 1] = temp           // 赋值 undefined
  
  this.$set(this.selectedRowKeys, type, [index - 1])
  this.$message.success('上移成功')  // ⚠️ 但可能没有真的移动
}
```

### 问题分析

虽然 `canMoveItemUp()` 方法已经检查了 `selected[0] > 0` 和 `data.length > 0`，但：

1. **权限检查 vs 数据检查**: 权限检查无法保证实际数组状态
   - 权限检查在操作前进行
   - 用户可能在界面操作和执行操作之间 **删除了项**，导致索引失效

2. **防御性编程**: 不应该信任前置条件，应该在操作前再检查一遍

### 修复方案

```javascript
moveItemUp(type) {
  if (!this.canMoveItemUp(type)) return
  const index = this.selectedRowKeys[type][0]
  
  if (!this.selectedNode.html) {
    this.selectedNode.html = createEmptyHtmlContent()
  }
  
  const items = this.selectedNode.html[type]
  
  // 🔑 防御检查：确保数组有效且索引在范围内
  if (!Array.isArray(items) || items.length < 2 || index <= 0 || index >= items.length) {
    console.warn(`Invalid move state: items=${items?.length}, index=${index}`)
    this.$message.warning('移动失败，数据状态异常')
    return
  }
  
  const temp = items[index]
  items[index] = items[index - 1]
  items[index - 1] = temp
  
  this.$set(this.selectedRowKeys, type, [index - 1])
  this.$message.success('上移成功')
}

// moveItemDown 类似改进
moveItemDown(type) {
  if (!this.canMoveItemDown(type)) return
  const index = this.selectedRowKeys[type][0]
  
  if (!this.selectedNode.html) {
    this.selectedNode.html = createEmptyHtmlContent()
  }
  
  const items = this.selectedNode.html[type]
  
  // 🔑 防御检查
  if (!Array.isArray(items) || items.length < 2 || index < 0 || index >= items.length - 1) {
    console.warn(`Invalid move state: items=${items?.length}, index=${index}`)
    this.$message.warning('移动失败，数据状态异常')
    return
  }
  
  const temp = items[index]
  items[index] = items[index + 1]
  items[index + 1] = temp
  
  this.$set(this.selectedRowKeys, type, [index + 1])
  this.$message.success('下移成功')
}
```

### 修复工作量

- 修改文件: 1 个 (Vue)
- 代码行数: +8
- **预期时间**: 25 分钟

---

## 问题汇总表

| # | 标题 | 严重性 | 类别 | 文件位置 | 修复时间 | 优先级 |
|---|------|--------|------|---------|---------|--------|
| 1 | CONTENT_TYPES 未导出 | 🟠 中 | 重复代码 | Converter + Vue | 30 分钟 | P2 |
| 2 | S1000D_ORDER 未实施 | 🟠 中 | 功能缺陷 | Converter + Vue | 45 分钟 | P2 |
| 3 | escapeXml() 重复定义 | 🔴 高 | 代码质量 | Vue:1543-1612 | 15 分钟 | **P1** |
| 4 | 索引检查说明不清 | 🟡 低 | 可读性 | Vue:1111-1119 | 10 分钟 | P3 |
| 5 | xml 属性提取过松 | 🟠 中 | 数据安全 | Vue:1568-1576 | 20 分钟 | P2 |
| 6 | 数组操作防御不足 | 🟡 低 | 健壮性 | Vue:815-848 | 25 分钟 | P3 |

**总修复时间**: 145 分钟 (~2.5 小时)

---

## 按优先级分阶段修复

### 🚨 第一阶段 (CRITICAL - 立即执行)

**问题 #3**: escapeXml() 重复定义 (15 分钟)
- 影响: 标题转义可能出错
- 操作: 删除简单版 + 2 处调用替换

### 📋 第二阶段 (IMPORTANT - 本周内)

**问题 #1**: CONTENT_TYPES 未导出 (30 分钟)  
**问题 #5**: xml 属性提取过松 (20 分钟)  
**问题 #2**: S1000D_ORDER 未实施 (45 分钟)  
小计: 95 分钟

### 🔄 第三阶段 (NICE-TO-HAVE - 后续版本)

**问题 #4**: 索引检查说明不清 (10 分钟)  
**问题 #6**: 数组操作防御不足 (25 分钟)  
小计: 35 分钟

