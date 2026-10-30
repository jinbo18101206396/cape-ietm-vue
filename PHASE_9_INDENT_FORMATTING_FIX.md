# Phase 9：XML 缩进和格式化修复

## 问题描述

用户在"levelledPara 设计视图"点击"保存"后回到源码视图，发现：
1. **`<levelledPara>` 缺少缩进** — 没有 8 个空格的基础缩进
2. **XML 没有自动格式化** — 内部结构缺少适当的换行和缩进

## 根本原因分析

### 问题 1：缩进应用不正确

**之前的逻辑**（handleSave 第1596行）：
```javascript
xml = xml.split('\n')
  .map((line, index) => {
    if (index === 0) return line  // ❌ 第一行不缩进
    if (!line.trim()) return ''
    return baseIndent + line
  })
  .join('\n')
```

**问题**：
- 第一行（`<levelledPara>`）不被处理，因此缺少 8 个空格的基础缩进
- 这导致整个元素在源码编辑器中显示位置不正确

### 问题 2：缺少 XML 格式化

之前的代码没有调用任何格式化函数，生成的 XML 内容都在一行内，不美观也难于读取。

## 修复方案

### 修复 1：正确应用基础缩进

**新的逻辑**（handleSave）：
```javascript
// 应用基础缩进到所有行（包括第一行）
if (baseIndent) {
  xml = xml.split('\n')
    .map((line) => {
      if (!line.trim()) return ''  // 空行保持空
      return baseIndent + line     // ✅ 所有非空行都添加基础缩进
    })
    .join('\n')
}
```

**改进点**：
- 移除了 `index === 0` 的特殊处理
- 现在所有非空行（包括第一行 `<levelledPara>`）都获得 8 个空格的基础缩进

### 修复 2：添加 formatXml 方法

新增 `formatXml()` 方法在 methods 中（约第1682行）：

```javascript
/**
 * 🔧 Phase 9 新增：XML 格式化方法
 * 添加适当的缩进和换行，使 XML 结构清晰
 */
formatXml(xml, baseIndent) {
  const indentUnit = '  '  // 内部缩进单位为 2 个空格
  const lines = []
  let currentIndentLevel = 0
  let inCdata = false

  xml.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return  // 跳过空行

    // 检查 CDATA 段
    if (trimmed.includes('<![CDATA[')) inCdata = true
    if (trimmed.includes(']]>')) inCdata = false

    // CDATA 内容保持原样
    if (inCdata && !trimmed.includes(']]>')) {
      lines.push(baseIndent + indentUnit.repeat(currentIndentLevel) + trimmed)
      return
    }

    // 关闭标签先降低缩进
    if (trimmed.startsWith('</')) {
      currentIndentLevel = Math.max(0, currentIndentLevel - 1)
    }

    // 添加缩进
    lines.push(baseIndent + indentUnit.repeat(currentIndentLevel) + trimmed)

    // 开启标签提高缩进
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
      currentIndentLevel++
    }
  })

  return lines.join('\n')
}
```

**功能说明**：
- **基础缩进继承** — 保留文档中已有的缩进（8 个空格）
- **内部缩进递进** — 每层嵌套增加 2 个空格
- **标签感知** — 根据开启/关闭标签自动调整缩进深度
- **CDATA 保护** — 保留 CDATA 段中的原始格式
- **自闭合处理** — 正确跳过 `/>` 标签的缩进增加

## 调用流程

handleSave 中的执行顺序：

```javascript
1. 生成 XML
   let xml = treeToXml(this.rawTreeData)

2. 提取基础缩进
   const baseIndent = ...  // "        " (8个空格)

3. ✅ 应用基础缩进到所有行
   xml = xml.split('\n').map(line => ...)

4. ✅ 调用格式化方法
   xml = this.formatXml(xml, baseIndent)

5. 清理末尾
   xml = xml.trimEnd()

6. 国际化处理
   xml = this.toCnXml(xml)

7. 写入编辑器
   this.editor.replaceRange(xml, ...)
```

## 预期效果

**保存前**：
```xml
    <levelledPara>
<title>第一层</title>
<para id="p1"><text>内容</text></para>
...
```
❌ `<levelledPara>` 和内容混乱

**保存后**：
```xml
        <levelledPara>
          <title>第一层</title>
          <para id="p1">
            <text>内容</text>
          </para>
          <levelledPara>
            <title>第二层</title>
            <para id="p2">
              <text>内容</text>
            </para>
          </levelledPara>
        </levelledPara>
```
✅ 结构清晰，缩进正确

## 测试检查清单

- [ ] 打开设计视图编辑 levelledPara
- [ ] 修改内容（标题、段落等）
- [ ] 点击"保存"
- [ ] 切换到源码视图
- [ ] 验证：
  - ✅ `<levelledPara>` 有 8 个空格缩进
  - ✅ 内容行有 10 个空格缩进（8+2）
  - ✅ 嵌套元素正确对齐
  - ✅ 所有标签配对正确
  - ✅ 没有多余空白行

## 文件修改

- `LevelledParaDesigner.vue`
  - 修改：`handleSave()` 方法（第1584-1609行）
  - 新增：`formatXml()` 方法（约第1682行）
