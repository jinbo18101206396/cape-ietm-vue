# Para设计器严重Bug报告：para结束标签丢失

**Bug ID**: BUG-PARA-001  
**严重性**: 🔴 P0 - 数据损坏  
**发现日期**: 2026-09-25  
**影响**: 导致XML格式错误，Para内容丢失

---

## 📋 Bug描述

**用户报告的现象**：

```xml
<!-- 原始XML -->
<description>
  <para>
    <table>
      <tgroup cols="1">
        <tbody>
          <row></row>
        </tbody>
      </tgroup>
    </table>
  </para>
</description>

<!-- 从设计视图回到源码视图后 -->
<description>
  <para>
    <para>    ← ❌ 嵌套的para
      <table>
        <tgroup cols="1">
          <tbody>
            <row></row>
          </tbody>
        </tgroup>
      </table>
    </para>
  </para>      ← ❌ 缺失这个</para>
</description>
```

**问题**: 
1. 出现了嵌套的`<para>`
2. 外层`<para>`的结束标签`</para>`丢失

---

## 🔍 根本原因分析

### 问题根源：`</p>`替换时序错误

**位置**: `paraConverter.js:136-173` (html2para函数)

**错误的转换流程**:

```javascript
// Step 1: 清理HTML
para = html.trim()
  .replace(/&nbsp;/g, '')
  .replace(/<br>/g, '')
  ...

// Step 2: 🔴 第一次 </p> → </para>  (Line 143)
para = para.replace(/<\/p>/g, '</para>')

// Step 3-10: 处理列表等
...

// Step 11: 处理table周围的<p>标签 (Line 168-171)
para = para.replace(/<\/table><p>/g, '</table>')
  .replace(/<\/p><p><table>/g, '<table>')
  .replace(/<\/p><table/g, '<table')       // 🔴 移除</p>
  .replace(/<\/table><\/p>/g, '</table>')  // 🔴 移除</p>

// Step 12: 🔴 第二次 <p> → <para>  (Line 172)
para = para.replace(/<p>/g, '<para>')

// Step 13: 🔴 第三次 </p> → </para>  (Line 173)
// 但此时已经没有</p>了，因为在Step 2已经全部替换了！
para = para.replace(/<\/p>/g, '</para>')
```

### 详细推演

**场景A：UEditor输出包含完整的`<p>...</p>`**

```javascript
// 输入 (UEditor输出)
html = '<p><table><tbody><tr><td></td></tr></tbody></table></p>'

// Step 2: 第一次 </p> → </para>
para = '<p><table><tbody><tr><td></td></tr></tbody></table></para>'
//                                                            ^^^^^^ 已替换

// Step 11: 移除table后的</para>
para = para.replace(/<\/table><\/p>/g, '</table>')  // 🔴 匹配不到</p>，因为已经是</para>
// 实际执行的是：
para = para.replace(/<\/table><\/para>/g, '</table>')  // ❌ 没有这行代码！

// Step 12: <p> → <para>
para = '<para><table><tbody><tr><td></td></tr></tbody></table></para>'

// Step 13: 第二次 </p> → </para>（无匹配）
para = '<para><table><tbody><tr><td></td></tr></tbody></table></para>'

// 结果：✅ 正常（碰巧正确）
```

**场景B：UEditor输出缺少结束`</p>`**

```javascript
// 输入 (用户删除了部分内容，或UEditor未自动补全)
html = '<p><table><tbody><tr><td>test</td></tr></tbody></table>'
//                                                             ^ 缺少</p>

// Step 2: 第一次 </p> → </para>
para = '<p><table><tbody><tr><td>test</td></tr></tbody></table>'
//                                                            ^ 没有</p>可替换

// Step 11: 移除table前的<p>
para = para.replace(/<\/p><table/g, '<table')  // 🔴 匹配不到</p>
// 结果：<p>仍然存在

// Step 12: <p> → <para>
para = '<para><table><tbody><tr><td>test</td></tr></tbody></table>'
//       ^^^^^ <p>被转换为<para>

// Step 13: 第二次 </p> → </para>（无匹配）
para = '<para><table><tbody><tr><td>test</td></tr></tbody></table>'
//                                                               ^ 没有</para>

// 结果：❌ Bug! <para>无配对的</para>
```

**场景C：用户报告的实际情况**

```javascript
// 输入 (从源码视图加载后UEditor的输出)
html = '<p>  <table><tgroup cols="1"><tbody><row></row></tbody></tgroup></table></p>'

// Step 2: 第一次 </p> → </para>
para = '<p>  <table><tgroup cols="1"><tbody><row></row></tbody></tgroup></table></para>'

// Step 11: 尝试移除table周围的<p>
// para.replace(/<\/p><table/g, '<table')  匹配不到（因为有空格）
// para.replace(/<\/table><\/p>/g, '</table>')  匹配不到（因为已经是</para>）

// Step 12: <p> → <para>
para = '<para>  <table><tgroup cols="1"><tbody><row></row></tbody></tgroup></table></para>'

// Step 14: table转S1000D（已经包含tgroup，跳过转换）

// 但是！用户二次编辑后，可能出现：
// 用户在设计视图中移动光标 → UEditor重新解析 → 产生嵌套<p>
html_round2 = '<p><p>  <table>...</table></p>'  // UEditor可能生成嵌套<p>

// Step 2: 第一次 </p> → </para>
para = '<p><p>  <table>...</table></para>'
//                                ^^^^^^ 内层</p>被替换

// Step 12: 所有<p> → <para>
para = '<para><para>  <table>...</table></para>'
//       ^^^^^  ^^^^^ 嵌套的para，但只有一个</para>

// 结果：❌ Bug! 嵌套para + 缺少外层</para>
```

---

## 🔴 核心问题

### 问题1：替换时序错误

```javascript
// 错误的顺序
1. </p> → </para>     ← 太早了！
2. 移除table周围的</p>  ← 此时已经没有</p>，无法匹配
3. <p> → <para>
4. </p> → </para>     ← 太晚了！已经没有</p>
```

### 问题2：不完整的清理规则

```javascript
// Line 168-171: 只处理</p>，没有处理已经替换的</para>
para = para.replace(/<\/table><p>/g, '</table>')
  .replace(/<\/p><p><table>/g, '<table>')
  .replace(/<\/p><table/g, '<table')         // 🔴 只移除</p>
  .replace(/<\/table><\/p>/g, '</table>')    // 🔴 只移除</p>

// 如果Step 2已经把</p>换成</para>，这些规则都失效！
```

### 问题3：空格和换行符干扰

```javascript
// 实际HTML可能是：
'<p>  <table>...</table>  </p>'
//   ^^                  ^^ 空格

// 正则 /<\/p><table/g 无法匹配（因为中间有空格）
```

---

## ✅ 修复方案

### 方案A：调整替换顺序（推荐）

**原理**: 先处理结构（移除table周围的<p>），再统一转换标签

```javascript
export async function html2para(parent, html, projectParameters, allocatedUniqueids = [], depth = 0) {
  // ... 前面保持不变

  // §9.2.2 基础元素逆转换
  para = para.replace(/&nbsp;/g, '')
    .replace(/<br>/g, '')
    .replace(/<\/br>/g, '')
    .replace(/<br\/>/g, '')
    .replace(/\n/g, '')
    .replace(/<p><\/p>/g, '')  // 移除空<p>
    .replace(/<ul.*?>/g, '<ul>')
    .replace(/<ol.*?>/g, '<ol>')
    .replace(/<li(\s[^>]*)?\>/g, '<li>')

  // 🔧 修复1: 标准化<p>标签（但不转换）
  para = para.replace(/<p(\s[^>]*)?\>/g, '<p>')

  // 🔧 修复2: 在转换前，先清理table周围的<p>标签（使用更宽松的匹配）
  // 移除table前的<p>和</p>（允许空格/换行）
  para = para.replace(/<\/p>\s*<table/g, '<table')      // </p> <table> → <table
  para = para.replace(/<p>\s*<table/g, '<table')        // <p> <table> → <table
  para = para.replace(/<\/table>\s*<\/p>/g, '</table>')  // </table> </p> → </table>
  para = para.replace(/<\/table>\s*<p>/g, '</table>')    // </table> <p> → </table>
  
  // 处理<p><p>嵌套情况
  para = para.replace(/<p>\s*<p>/g, '<p>')              // <p> <p> → <p>
  para = para.replace(/<\/p>\s*<\/p>/g, '</p>')          // </p> </p> → </p>

  // 🔧 修复3: 现在统一转换<p>/<p>
  para = para.replace(/<\/p>/g, '</para>')  // 先转结束标签
  para = para.replace(/<p>/g, '<para>')     // 再转开始标签

  // 处理列表
  para = para.replace(/<ul>/g, '<randomList>')
    .replace(/<\/ul>/g, '</randomList>')
    .replace(/<ol>/g, '<sequentialList>')
    .replace(/<\/ol>/g, '</sequentialList>')
    .replace(/<li>/g, '<listItem><para>')
    .replace(/<\/li>/g, '</para></listItem>')
  
  // 删除原来的重复清理代码（Line 168-173）
  // para = para.replace(/<\/table><p>/g, '</table>')  ← 删除
  // para = para.replace(/<\/p><p><table>/g, '<table>') ← 删除
  // para = para.replace(/<\/p><table/g, '<table')      ← 删除
  // para = para.replace(/<\/table><\/p>/g, '</table>') ← 删除
  // para = para.replace(/<p>/g, '<para>')              ← 删除
  // para = para.replace(/<\/p>/g, '</para>')           ← 删除
  
  para = para.replace(/<strong>/g, '<emphasis>')
    .replace(/<\/strong>/g, '</emphasis>')

  // ... 后面保持不变
}
```

### 方案B：后置清理（备选）

**原理**: 转换后再清理嵌套和孤立的para

```javascript
// 在html2para函数最后添加
function cleanupParaNesting(xml) {
  // 移除嵌套的<para>
  xml = xml.replace(/<para>\s*<para>/g, '<para>')
  xml = xml.replace(/<\/para>\s*<\/para>/g, '</para>')
  
  // 修复不配对的para
  const openCount = (xml.match(/<para>/g) || []).length
  const closeCount = (xml.match(/<\/para>/g) || []).length
  
  if (openCount > closeCount) {
    // 缺少</para>，在table前补充
    xml = xml.replace(/<table>/g, '</para><table>')
  } else if (closeCount > openCount) {
    // 多余</para>，在table后移除
    xml = xml.replace(/<\/table><\/para>/g, '</table>')
  }
  
  return xml
}

// 使用
para = cleanupParaNesting(para)
return para
```

---

## 🧪 测试用例

### 测试1：完整的<p></p>包裹table

```javascript
// 输入
html = '<p><table><tbody><tr><td></td></tr></tbody></table></p>'

// 预期输出
xml = '<para><table><tgroup cols="1"><tbody><row><entry></entry></row></tbody></tgroup></table></para>'

// 验证
assert(xml.match(/<para>/g).length === xml.match(/<\/para>/g).length)
```

### 测试2：缺少结束</p>

```javascript
// 输入
html = '<p><table><tbody><tr><td>test</td></tr></tbody></table>'

// 预期输出
xml = '<para><table><tgroup cols="1"><tbody><row><entry>test</entry></row></tbody></tgroup></table></para>'

// 验证
assert(xml.match(/<para>/g).length === xml.match(/<\/para>/g).length)
```

### 测试3：空格干扰

```javascript
// 输入
html = '<p>  <table><tbody><tr><td></td></tr></tbody></table>  </p>'

// 预期输出
xml = '<para><table><tgroup cols="1"><tbody><row><entry></entry></row></tbody></tgroup></table></para>'

// 验证
assert(!xml.includes('<para><para>'))  // 无嵌套
assert(xml.match(/<para>/g).length === 1)
```

### 测试4：用户报告的实际case

```javascript
// 输入（S1000D table已存在）
html = '<p><table><tgroup cols="1"><tbody><row></row></tbody></tgroup></table></p>'

// 预期输出
xml = '<para><table><tgroup cols="1"><tbody><row></row></tbody></tgroup></table></para>'

// 验证
assert(xml.match(/<para>/g).length === 1)
assert(xml.match(/<\/para>/g).length === 1)
```

---

## 📊 影响评估

### 严重性：🔴 P0 - 数据损坏

**影响范围**:
- 所有在Para中包含table的内容
- 往返编辑次数越多，bug触发概率越高
- 导致XML格式错误，无法通过XSD校验

**用户影响**:
- ❌ 数据丢失（缺少结束标签）
- ❌ XML无效（无法保存）
- ❌ 后续操作失败（无法再次打开）

### 复现率：高

**条件**:
1. Para包含table
2. 从设计视图切换到源码视图
3. UEditor输出缺少结束`</p>`或包含额外空格

**复现概率**: 约50%（取决于UEditor的行为）

---

## ✅ 修复优先级

### 🔴 立即修复（阻塞部署）

**理由**:
1. 导致数据损坏
2. 影响核心功能
3. 复现率高
4. 修复简单（调整代码顺序）

**修复时间**: 30分钟
- 修改代码: 10分钟
- 测试验证: 15分钟
- 代码审查: 5分钟

---

## 📝 修复清单

- [ ] 修改`paraConverter.js:136-173`的替换顺序
- [ ] 添加空格/换行符容错处理
- [ ] 添加嵌套para清理逻辑
- [ ] 添加4个测试用例
- [ ] 手动验证用户报告的DMC
- [ ] 回归测试（确保不影响其他转换）

---

**报告生成时间**: 2026-09-25  
**审核人**: Claude Code (Opus 4.8)  
**优先级**: 🔴 P0 - 必须立即修复
