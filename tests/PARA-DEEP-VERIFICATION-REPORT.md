/**
 * Para设计器 P0+P1 修复深度验证报告
 * 代码级别审查 + 逻辑验证
 */

# Para设计器修复深度验证报告

## 验证方法论

本次验证采用**白盒测试**方法：
1. 阅读修复代码，理解修复逻辑
2. 构造边界测试用例
3. 模拟执行流程，验证正确性
4. 识别潜在遗漏

---

## P0-1: para标签丢失修复（第242-251行）

### 修复代码审查

```javascript
// 第242-251行
// 🔧 修复P0-1: listItem内para重复问题
// 策略: 先处理已有<para>的情况（保持不变），再处理无<para>的情况（添加<para>）

// 处理已有<para>的<li>（不添加para）
para = para.replace(/<li>(\s*<para>[\s\S]*?<\/para>\s*)<\/li>/g, '<listItem>$1</listItem>')

// 处理无<para>的<li>（添加para）
para = para.replace(/<li>([\s\S]*?)<\/li>/g, '<listItem><para>$1</para></listItem>')
```

### ✅ 验证1: 已有para的情况

**输入**:
```html
<li><para>项目A</para></li>
```

**执行第247行后**:
```xml
<listItem><para>项目A</para></listItem>
```

**执行第251行后**: 不匹配（已转为listItem），保持不变

**结果**: ✅ **正确**，没有重复para

---

### ✅ 验证2: 无para的情况

**输入**:
```html
<li>项目B</li>
```

**执行第247行后**: 不匹配（无<para>），保持不变

**执行第251行后**:
```xml
<listItem><para>项目B</para></listItem>
```

**结果**: ✅ **正确**，添加了para

---

### ⚠️ 验证3: 嵌套列表边界情况

**输入**:
```html
<li>外层<ul><li>内层</li></ul></li>
```

**执行第247行**: 不匹配（外层li无para）

**执行第251行**:
```xml
<listItem><para>外层<ul><li>内层</li></ul></para></listItem>
```

**继续匹配内层li**:
```xml
<listItem><para>外层<ul><listItem><para>内层</para></listItem></ul></para></listItem>
```

**潜在问题**: ❌ **嵌套ul在para内部，可能不符合S1000D schema**

**建议**: 需要在文档中明确嵌套列表的支持情况

---

### ⚠️ 验证4: 空白字符处理

**输入**:
```html
<li>
  <para>有换行</para>
</li>
```

**执行第247行**（正则：`<li>(\s*<para>[\s\S]*?<\/para>\s*)<\/li>`）:
```xml
<listItem>
  <para>有换行</para>
</listItem>
```

**结果**: ✅ **正确**，`\s*`匹配了换行

---

## P0-2: definitionList内para重复（第268-276行）

### 修复代码审查

```javascript
// 第268-276行
// 🔧 修复P0-2: definitionList内para重复问题

// 处理已有<para>的<td>（不添加para）
table_ = table_.replace(/<td(\s[^>]*)?>(\s*<para>[\s\S]*?<\/para>\s*)<\/td>/g, '<listItemDefinition>$2</listItemDefinition>')

// 处理无<para>的<td>（添加para）
table_ = table_.replace(/<td(\s[^>]*)>([\s\S]*?)<\/td>/g, '<listItemDefinition><para>$2</para></listItemDefinition>')
```

### ✅ 验证1: 已有para的td

**输入**:
```html
<td><para>定义A</para></td>
```

**执行第273行后**:
```xml
<listItemDefinition><para>定义A</para></listItemDefinition>
```

**执行第276行**: 不匹配（已转为listItemDefinition）

**结果**: ✅ **正确**

---

### ✅ 验证2: 无para的td

**输入**:
```html
<td>定义B</td>
```

**执行第273行**: 不匹配（无para）

**执行第276行**:
```xml
<listItemDefinition><para>定义B</para></listItemDefinition>
```

**结果**: ✅ **正确**

---

### ⚠️ 验证3: td带属性

**输入**:
```html
<td colspan="2">跨列</td>
```

**执行第276行**（正则：`<td(\s[^>]*)>([\s\S]*?)<\/td>`）:

**匹配组**:
- `$1` = ` colspan="2"`
- `$2` = `跨列`

**输出**:
```xml
<listItemDefinition><para>跨列</para></listItemDefinition>
```

**潜在问题**: ❌ **colspan属性丢失**

**建议**: 如果S1000D支持listItemDefinition的属性，需要保留

---

### ❌ 验证4: td内多个para

**输入**:
```html
<td><para>段落1</para><para>段落2</para></td>
```

**执行第273行**（正则：`<td(\s[^>]*)?>(\s*<para>[\s\S]*?<\/para>\s*)<\/td>`）:

**问题**: 正则使用`[\s\S]*?`非贪婪匹配，只会匹配到第一个`</para>`

**匹配结果**:
```xml
<listItemDefinition><para>段落1</para></listItemDefinition><para>段落2</para></td>
```

**结果**: ❌ **CRITICAL BUG: 第二个para会留下残留的`</td>`**

**修复建议**:
```javascript
// 改为贪婪匹配，匹配所有para
table_ = table_.replace(/<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g, '<listItemDefinition>$2</listItemDefinition>')
```

---

## P1-1: dmCode验证（第319-326行）

### 修复代码审查

```javascript
const nameArr = parent.dmCode.split('-')
if (nameArr.length < 6) {
  console.error('dmCode格式错误，长度不足:', parent.dmCode, '数组长度:', nameArr.length)
  throw new Error(`dmCode格式错误: ${parent.dmCode}，预期至少6段，实际${nameArr.length}段`)
}
json.sns = nameArr[1] + '-' + nameArr[2] + '-' + nameArr[3] + '-' + nameArr[4] + '-' + nameArr[5]
```

### ✅ 验证1: 正常dmCode

**输入**: `parent.dmCode = "TEST-A-00-0-0-00"`

**执行**:
- `nameArr = ["TEST", "A", "00", "0", "0", "00"]`
- `nameArr.length = 6` ✅ 通过验证
- `json.sns = "A-00-0-0-00"` ✅ 正确

---

### ✅ 验证2: 格式错误的dmCode

**输入**: `parent.dmCode = "TEST-A-00"`

**执行**:
- `nameArr = ["TEST", "A", "00"]`
- `nameArr.length = 3 < 6` ❌ 验证失败
- 抛出错误: `"dmCode格式错误: TEST-A-00，预期至少6段，实际3段"`

**结果**: ✅ **正确**，错误信息清晰

---

### ⚠️ 验证3: dmCode包含空段

**输入**: `parent.dmCode = "TEST--00-0-0-00"`（注意双横线）

**执行**:
- `nameArr = ["TEST", "", "00", "0", "0", "00"]`
- `nameArr.length = 6` ✅ 通过验证
- `json.sns = "-00-0-0-00"` ⚠️ **第一段为空**

**潜在问题**: 验证了长度但未验证每段是否非空

**建议**:
```javascript
if (nameArr.length < 6 || nameArr.some(seg => !seg)) {
  throw new Error(`dmCode格式错误: ${parent.dmCode}`)
}
```

---

## P1-3: Image内存泄漏（第345-382行）

### 修复代码审查

```javascript
const img = new Image()
let cleanupHandlers = null

try {
  await new Promise((resolve, reject) => {
    const onload = () => { resolve() }
    const onerror = () => { reject(new Error('图片加载失败')) }
    
    img.onload = onload
    img.onerror = onerror
    
    cleanupHandlers = () => {
      img.onload = null
      img.onerror = null
      img.src = ''
    }
    
    img.src = srcMatch[1]
  })
  // ... processing
} catch (err) {
  // ... error handling
} finally {
  if (cleanupHandlers) {
    cleanupHandlers()
  }
}
```

### ✅ 验证1: 正常加载成功

**执行流程**:
1. `img.onload = onload` ✅ 设置监听器
2. `img.src = srcMatch[1]` → 触发加载
3. 加载成功 → `onload()` → `resolve()`
4. `finally` 块执行 → `cleanupHandlers()` ✅ 清理监听器

**结果**: ✅ **正确**，监听器被清理

---

### ✅ 验证2: 加载失败

**执行流程**:
1. `img.onerror = onerror` ✅ 设置监听器
2. `img.src = "invalid"` → 触发加载
3. 加载失败 → `onerror()` → `reject()`
4. `catch` 块捕获错误
5. `finally` 块执行 → `cleanupHandlers()` ✅ 清理监听器

**结果**: ✅ **正确**，即使失败也清理

---

### ⚠️ 验证3: Promise被取消

**场景**: 用户快速关闭设计视图，Promise还未resolve

**问题**: `finally`块仍会执行，`cleanupHandlers()`仍会被调用

**结果**: ✅ **正确**，`finally`保证了清理

---

### ✅ 验证4: 多次创建Image

**场景**: 连续打开设计视图10次

**每次执行**:
- 创建新的`img`对象（局部变量）
- 设置监听器 → 清理监听器
- `img`对象失去引用，被GC回收

**结果**: ✅ **正确**，无内存泄漏

---

## P1-5: UEditor实例复用污染（第187-206行）

### 修复代码审查

```javascript
initUEditor() {
  if (window.UE && window.UE.getEditor(this.ueditorInstanceId)) {
    const oldInstance = window.UE.getEditor(this.ueditorInstanceId)
    console.warn('[ParaDesigner] 检测到旧UEditor实例，强制销毁以避免状态污染:', this.ueditorInstanceId)
    
    try {
      oldInstance.removeListener('contentChange')
      oldInstance.removeListener('ready')
      oldInstance.destroy()
      console.log('[ParaDesigner] ✓ 旧实例已销毁')
    } catch (e) {
      console.error('[ParaDesigner] ✗ 销毁旧实例失败:', e)
    }
  }
  // ... create new instance
}
```

### ✅ 验证1: 首次打开（无旧实例）

**执行流程**:
1. `window.UE.getEditor(this.ueditorInstanceId)` → 返回`undefined`
2. `if`条件为false，跳过销毁逻辑
3. 创建新实例

**结果**: ✅ **正确**

---

### ✅ 验证2: 第二次打开（有旧实例）

**执行流程**:
1. `window.UE.getEditor(this.ueditorInstanceId)` → 返回旧实例
2. `oldInstance.removeListener('contentChange')` ✅ 移除监听器
3. `oldInstance.removeListener('ready')` ✅ 移除监听器
4. `oldInstance.destroy()` ✅ 销毁实例
5. 创建新实例

**结果**: ✅ **正确**，旧实例被彻底销毁

---

### ⚠️ 验证3: 销毁失败的情况

**场景**: `oldInstance.destroy()`抛出异常

**执行流程**:
1. `try`块捕获异常
2. `catch`块记录错误
3. **继续执行，创建新实例**

**潜在问题**: ⚠️ 如果销毁失败，旧实例可能仍存在，新实例可能无法创建成功

**建议**: 在销毁失败后，阻止新实例创建，或向用户显示错误

---

### ❌ 验证4: ueditorInstanceId相同的情况

**假设**: 两个ParaDesigner组件使用相同的`ueditorInstanceId`

**问题**: 
- 组件A销毁时，调用`oldInstance.destroy()`
- 组件B的UEditor实例也被销毁（因为ID相同）
- 组件B功能损坏

**检查代码**: 在ParaDesigner.vue中，`ueditorInstanceId`是如何生成的？

**需要验证**: ❗ **CRITICAL: 必须确保每个实例的ID唯一**

---

## P1-6: XSS防护（第8-48行）

### 修复代码审查

```javascript
function escapeXmlForAttribute(xml) {
  if (!xml) return ''
  return xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
}
```

### ✅ 验证1: 所有6个特殊字符

**输入**: `& < > " ' \``

**执行**:
```
& → &amp; → &amp; (正确)
< → &lt; (正确)
> → &gt; (正确)
" → &quot; (正确)
' → &#39; (正确)
` → &#96; (正确)
```

**结果**: ✅ **正确**，所有字符都转义

---

### ⚠️ 验证2: 替换顺序

**输入**: `&lt;`（已转义的<）

**执行**:
```
&lt; 
→ 第1行: & → &amp; → &amp;lt;
→ 第2行: < → &lt; → &amp;lt; (不变，因为没有<)
```

**结果**: ✅ **正确**，`&`在最前面替换，避免了重复转义

---

### ✅ 验证3: XSS攻击向量

**输入**: `<script>alert("xss")</script>`

**执行**:
```
<script>alert("xss")</script>
→ &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

**结果**: ✅ **正确**，无法执行脚本

---

### ✅ 验证4: 反转义

```javascript
function unescapeXmlAttribute(escapedXml) {
  if (!escapedXml) return ''
  return escapedXml
    .replace(/&#96;/g, '`')     // 最后替换的先反转义
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')     // 最先替换的最后反转义
}
```

**验证往返**:
```
原始: & < > " ' `
→ 转义: &amp; &lt; &gt; &quot; &#39; &#96;
→ 反转义: & < > " ' `
```

**结果**: ✅ **正确**，往返一致

---

## 总结

### ✅ 已确认正确的修复（5个）

1. **P0-1**: listItem内para重复 - 双重正则策略正确
2. **P1-1**: dmCode验证 - 错误信息清晰
3. **P1-3**: Image内存泄漏 - finally块保证清理
4. **P1-5**: UEditor实例复用 - 销毁逻辑完整
5. **P1-6**: XSS防护 - 6个字符全覆盖，顺序正确

### ❌ 发现的严重问题（2个）

1. **P0-2 CRITICAL**: definitionList内td包含多个para时，会留下残留的`</td>`标签
2. **P1-5 CRITICAL**: 需要验证`ueditorInstanceId`的唯一性

### ⚠️ 需要补充的边界测试（4个）

1. P0-1: 嵌套列表在para内部的schema合规性
2. P0-2: td属性（如colspan）的保留
3. P1-1: dmCode空段的验证
4. P1-5: 销毁失败后的错误处理

---

## 立即行动项

### 🔴 优先级P0（立即修复）

1. **修复P0-2的多para问题**
2. **验证ueditorInstanceId唯一性**

### 🟡 优先级P1（补充测试）

3. 添加嵌套列表测试用例
4. 添加td多para测试用例
5. 添加dmCode空段测试用例

---

**验证人**: Claude  
**验证时间**: 2026-09-25  
**验证方法**: 白盒代码审查 + 逻辑推演  
**结论**: 5个修复正确，2个严重问题需立即处理，4个边界情况需补充测试
