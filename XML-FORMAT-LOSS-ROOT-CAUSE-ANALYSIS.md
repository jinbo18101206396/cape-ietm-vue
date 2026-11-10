# XML 格式化丢失问题 - 根因分析报告

## 📋 问题描述

**现象：**
1. 首次在 para 设计视图插入 DM 引用并保存 → XML 格式化正常（有换行和缩进）
2. 再次进入 para 设计视图，不做任何修改直接保存 → XML 变成单行（格式化丢失）

**影响：**
- 代码可读性下降
- 版本控制困难（单行 diff 无法精确定位修改）
- 与第一次保存的行为不一致

---

## 🔍 根因分析

### 核心问题：**往返转换路径的差异**

#### 路径 1：首次保存（格式化正常）✅

```
用户操作
  ↓
UEditor HTML（插入 DM 引用）
  ↓
html2para() - 第423行执行 .replace(/\n/g, '') 移除所有换行
  ↓
返回单行 XML 内容（不含 <para> 标签）
  ↓
ParaDesigner.handleSave() - 第962行包裹 <para> 标签
  ↓
formatXml() - 第976行格式化，添加换行和缩进
  ↓
✅ 结果：多行格式化 XML
```

#### 路径 2：第二次保存（格式化丢失）❌

```
用户打开设计视图
  ↓
从 CodeMirror 读取多行格式化的 XML（包含 \n）
  ↓
para2html() - 第370行调用 getDmrefHtml()
  ↓
getDmrefHtml() - 第1142行：const originalXml = m（保留原始多行格式）
  ↓
转换为 <a xml="..." 标签，xml 属性中包含转义后的多行 XML
  ↓
UEditor 显示【引用DMC: xxx】
  ↓
用户点击保存（未修改）
  ↓
html2para() - 第857行：unescapeXmlAttribute(match[1]) 恢复 XML
  ↓
❌ 关键问题：**恢复的 XML 仍然是多行的**（包含 \n）
  ↓
第423行：.replace(/\n/g, '') ❌ **这一步会移除所有换行**
  ↓
返回单行 XML 内容
  ↓
ParaDesigner.handleSave() - 第962行包裹 <para> 标签
  ↓
formatXml() - 第976行尝试格式化
  ↓
❌ 问题：由于已经是单行（所有标签粘连），formatXml 无法正确拆分
  ↓
❌ 结果：单行 XML
```

---

## 🎯 核心矛盾

### 代码位置：`paraConverter.js:423`

```javascript
para = para
  .replace(/&nbsp;/g, '')
  .replace(/<br>/g, '')
  .replace(/<\/br>/g, '')
  .replace(/<br\/>/g, '')
  .replace(/\n/g, '')        // ❌ 这里移除了所有换行符
  .replace(/<p><\/p>/g, '')
  .replace(/<a name=.*?><\/a>/g, '')
```

### 为什么第一次格式化正常？

**因为第一次保存时，XML 是新生成的，不包含换行符：**
- UEditor 生成的 HTML 不包含换行
- `html2para()` 转换的 XML 也不包含换行
- `.replace(/\n/g, '')` 操作无影响
- `formatXml()` 正常工作，添加换行和缩进

### 为什么第二次格式化丢失？

**因为第二次保存时，从 CodeMirror 读取的 XML 包含换行符：**
- `para2html()` 将多行 XML 转换为 `<a xml="...">` 标签
- `getDmrefHtml()` 第 1142 行：`const originalXml = m` **保留了原始的多行格式**
- `html2para()` 恢复 XML 时，得到的是多行的 XML
- 第 423 行：`.replace(/\n/g, '')` **强制移除所有换行**，变成单行
- `formatXml()` 收到单行 XML，无法正确拆分标签
- 最终输出：单行 XML

---

## 💡 解决方案

### 方案 1：修改 `html2para()` - 不移除换行符（推荐）⭐

**原理：** 保留从设计视图恢复的 XML 的原始格式，让 `formatXml()` 处理格式化。

```javascript
// paraConverter.js:418-425
para = para
  .replace(/&nbsp;/g, '')
  .replace(/<br>/g, '')
  .replace(/<\/br>/g, '')
  .replace(/<br\/>/g, '')
  // .replace(/\n/g, '')  // ❌ 移除此行 - 不要删除换行符
  .replace(/<p><\/p>/g, '')
  .replace(/<a name=.*?><\/a>/g, '')
```

**优点：**
- 最小化修改
- 保留已格式化 XML 的格式
- 对新生成的 XML 无影响（formatXml 仍然正常工作）

**缺点：**
- 需要验证是否有其他地方依赖移除换行的行为

---

### 方案 2：修改 `getDmrefHtml()` - 标准化 XML 为单行

**原理：** 在转换为 HTML 时，将 XML 标准化为单行，确保往返一致。

```javascript
// paraConverter.js:1142
const originalXml = m.replace(/\s+/g, ' ').trim()  // 标准化为单行
const escapedXml = escapeXmlForAttribute(originalXml)
```

**优点：**
- 确保往返一致性
- 不影响 `html2para()` 的其他逻辑

**缺点：**
- 丢失了用户手动格式化的 XML
- 每次往返都会重新格式化

---

### 方案 3：修改 `formatXml()` - 增强拆分逻辑

**原理：** 让 `formatXml()` 能够正确处理单行粘连的标签。

```javascript
// xmlTree.js:246-268
// 增强 _splitGluedTags() 逻辑，确保即使是单行也能正确拆分
```

**优点：**
- 更健壮的格式化逻辑
- 处理所有场景

**缺点：**
- 修改范围大
- `formatXml()` 已经使用了 `_splitGluedTags()`，但可能对复杂的 dmRef 结构处理不完善

---

## 🔧 推荐修复方案

**采用方案 1：移除 `html2para()` 中的 `.replace(/\n/g, '')`**

### 理由：

1. **最小化修改**：只需删除一行代码
2. **符合设计意图**：`formatXml()` 的职责就是格式化 XML
3. **向前兼容**：对首次保存无影响
4. **保留用户格式**：如果用户手动格式化了 XML，应该保留

### 潜在风险：

- 需要验证是否有其他地方依赖此行为
- 需要检查测试用例是否会失败

---

## 📝 修复步骤

### 1. 修改代码

```javascript
// 文件：src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js
// 行号：418-425

para = para
  .replace(/&nbsp;/g, '')
  .replace(/<br>/g, '')
  .replace(/<\/br>/g, '')
  .replace(/<br\/>/g, '')
  // 🔧 修复：保留换行符，让 formatXml() 处理格式化
  // .replace(/\n/g, '')  // ❌ 已移除 - 2026-11-10
  .replace(/<p><\/p>/g, '')
  .replace(/<a name=.*?><\/a>/g, '')
```

### 2. 测试验证

使用 Playwright 测试验证修复：

```bash
cd /d/workspace/IETM/cape-ietm-vue
npx playwright test tests/xml-format-issue-diagnosis.spec.js --headed
```

### 3. 回归测试

检查相关测试用例是否通过：

```bash
# 运行 para 相关的所有测试
npx playwright test tests/e2e/para*.spec.js
```

---

## 🧪 验证清单

- [ ] 第一次保存 para + DM 引用 → XML 格式化正常
- [ ] 第二次保存 para（不修改）→ XML 格式保持一致
- [ ] 第三次保存 para（不修改）→ XML 格式保持一致
- [ ] 手动修改 CodeMirror 中的 XML 格式 → 保存后格式保留
- [ ] 插入其他元素（symbol、internalRef）→ 格式化正常
- [ ] 所有现有测试用例通过

---

## 📌 总结

**问题根源：** `html2para()` 函数中的 `.replace(/\n/g, '')` 无条件移除所有换行符，导致往返转换时格式丢失。

**修复方案：** 移除此行，让 `formatXml()` 统一处理格式化，确保往返一致性。

**预期结果：** 无论保存多少次，XML 格式始终保持一致，可读性和版本控制友好。
