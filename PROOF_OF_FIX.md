# DM 引用问题修复有效性证明

## 问题1：警告列表显示原始 XML

### 修复前的数据流
```
[数据库] 
  <dmRef>...</dmRef>
       ↓
[加载到组件] 
  text = "<dmRef>..."
       ↓
[模板渲染 - 旧代码]
  <div v-html="text">  ← 直接显示 XML
       ↓
[浏览器显示]
  <dmRef xlink:type="simple"...>  ❌ 错误
```

### 修复后的数据流
```
[数据库] 
  <dmRef>...</dmRef>
       ↓
[加载到组件] 
  text = "<dmRef>..."
       ↓
[模板渲染 - 新代码]
  <ConvertedContent :content="text" :parent="Parent" />
       ↓
[ConvertedContent.convert()]
  wrapped = "<para><dmRef>...</dmRef></para>"
  html = await para2html(parent, wrapped)
       ↓
[para2html 转换 - paraConverter.js:154]
  html = await getDmrefHtml(parent, html)
       ↓
[getDmrefHtml - paraConverter.js:689]
  const dmjson = getDmcByText(m)
  const displayText = `【引用${safeDmc}: ${safeTitle}】`
  return `<a xml="...">【引用DMC-...: 标题】</a>`
       ↓
[浏览器显示]
  【引用DMC-ZB1-A-00-00-00-00A-007A-A_zh-CN: 说明（总论） 符号清单】 ✅ 正确
```

### 证明逻辑
**前提1**：`para2html` 函数已在系统中正常工作多年
- 证据：在其他地方（如源码视图→设计视图切换）已成功使用
- 位置：`paraConverter.js:68`

**前提2**：`getDmrefHtml` 函数能正确转换 dmRef
- 证据：代码中有完整的实现（paraConverter.js:689-761）
- 转换逻辑：
  ```javascript
  const dmjson = getDmcByText(m)  // 解析 XML
  if (dmjson && dmjson.dmc) {
    const displayText = `【引用${safeDmc}: ${safeTitle}】`
    const a_html = `<a href="javascript:void(0);" xml="${escapedXml}">${displayText}</a>`
    html = html.replace(originalXml, a_html)
  }
  ```

**前提3**：ConvertedContent 组件正确调用 para2html
- 证据：代码实现（LevelledParaDesigner.vue:405-409）
  ```javascript
  const { para2html } = await import('../utils/paraConverter')
  const wrapped = `<para>${this.content}</para>`
  const html = await para2html(this.parent, wrapped)
  this.convertedHtml = html.replace(/<\/?para>/g, '')
  ```

**结论**：问题1的修复**在逻辑上是正确的**。

---

## 问题2：XML 中 dmRef 被转义

### 修复前的代码流程
```javascript
// 1. UEditor 返回
processedContent = '<a xml="<dmRef>...">【DM引用】</a>'

// 2. html2para 转换
finalContent = await html2para(...)
// 返回: <dmRef>...</dmRef>

// 3. 错误转义 ❌
const escapedContent = this.escapeXmlContent(finalContent)
// 执行: 
//   - DOMParser 尝试解析 <root><dmRef>...</dmRef></root>
//   - 解析失败（可能是 xlink 命名空间问题）
//   - 进入 else 分支
//   - 执行: .replace(/</g, '&lt;').replace(/>/g, '&gt;')
// 返回: &lt;dmRef&gt;...&lt;/dmRef&gt;

// 4. 保存到 XML
originalItem.content = `<warning>${escapedContent}</warning>`
// 结果: <warning>&lt;dmRef&gt;...&lt;/dmRef&gt;</warning> ❌
```

### 修复后的代码流程
```javascript
// 1. UEditor 返回
processedContent = '<a xml="<dmRef>...">【DM引用】</a>'

// 2. html2para 转换
finalContent = await html2para(...)
// 返回: <dmRef>...</dmRef>

// 3. 条件判断 ✅
const escapedContent = (hasImage || hasDmOrInternalRef)
  ? finalContent  // 直接使用，不转义
  : this.escapeXmlContent(finalContent)

// 因为 hasDmOrInternalRef = true，所以：
// escapedContent = finalContent = <dmRef>...</dmRef>

// 4. 保存到 XML
originalItem.content = `<warning>${escapedContent}</warning>`
// 结果: <warning><dmRef>...</dmRef></warning> ✅
```

### 证明逻辑

**前提1**：`hasDmOrInternalRef` 检测逻辑正确
- 代码位置：LevelledParaDesigner.vue:1477-1481（添加项）、1411-1419（编辑项）
- 检测条件：
  ```javascript
  const hasDmOrInternalRef = processedContent && (
    processedContent.includes('【引用') ||
    processedContent.includes('【内部引用') ||
    (processedContent.includes('<a') && processedContent.includes('xml='))
  )
  ```
- 当 UEditor 返回的内容包含 `<a xml="...">【引用】</a>` 时，此条件**必定为 true**

**前提2**：`html2para` 返回的是有效 XML
- 证据：`html2para` 的 §9.2.5 逻辑（paraConverter.js:536-545）
  ```javascript
  let anchors = para.match(/<a[\s\S]*?<\/a>/g)
  anchors.forEach(m => {
    const match = m.match(/xml="([^"]+)"/)
    if (match) {
      const anchorxml = unescapeXmlAttribute(match[1])
      para = para.replace(m, anchorxml)  // 将 <a> 替换为原始 XML
    }
  })
  ```
- 这个逻辑会将 `<a xml="<dmRef>...">【引用】</a>` 还原为 `<dmRef>...</dmRef>`

**前提3**：修复后的代码不会对 html2para 的输出进行转义
- 代码逻辑：
  ```javascript
  const escapedContent = (hasImage || hasDmOrInternalRef)
    ? finalContent  // 条件为 true 时，直接使用
    : this.escapeXmlContent(finalContent)
  ```
- 由于 `hasDmOrInternalRef = true`，所以 `escapedContent = finalContent`
- **不会执行** `escapeXmlContent`

**结论**：问题2的修复**在逻辑上是正确的**。

---

## 🔍 潜在风险分析

### 风险1：escapeXmlContent 的 DOMParser 可能成功解析

**假设**：如果 `escapeXmlContent` 的 DOMParser 能成功解析 `<dmRef>`，那么即使调用它也不会转义。

**验证**：让我检查为什么之前会转义
