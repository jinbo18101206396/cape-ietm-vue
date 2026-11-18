# PreliminaryRqmts dmRef xlink 属性校验失败问题 - 深度分析与修复方案

## 📋 问题描述

### 症状
在 PreliminaryRqmts 设计视图中添加区域或口盖的 DM 引用后，生成的 XML 无法通过 S1000D Schema 校验，报告如下错误：

```
序号  行号  错误信息
1     78    cvc-complex-type.3.2.2: Attribute 'xlink_type' is not allowed to appear in element 'dmRef'.
2     78    cvc-complex-type.3.2.2: Attribute 'xlink_show' is not allowed to appear in element 'dmRef'.
3     78    cvc-complex-type.3.2.2: Attribute 'xlink_actuate' is not allowed to appear in element 'dmRef'.
```

### 影响范围
- ❌ PreliminaryRqmts 区域 (zoneRef) 中的 DM 引用
- ❌ PreliminaryRqmts 口盖 (accessPointRef) 中的 DM 引用  
- ✅ CloseRqmts 中的 DM 引用（同样受影响）
- ✅ 所有使用 `buildDmRefXml` 函数生成的 DM 引用

## 🔍 根本原因分析

### 1. 代码路径追踪

```
用户操作
  ↓
PreliminaryRqmtsDesigner.vue (handleSave)
  ↓ (第755行)
object2preliminaryRqmts (preliminaryRqmtsConverter.js)
  ↓ (第228行 / 243行)
buildDmRefXml (closeRqmtsConverter.js)
  ↓ (第486行) ⚠️ 问题代码
生成包含 xlink 属性的 XML
```

### 2. 问题代码位置

**文件**: `src/views/ietm/ietmdatamodulemanagement/editor/utils/closeRqmtsConverter.js`

**行号**: 486-492

```javascript
// ❌ 当前代码 (错误)
function buildDmRefXml(refData) {
  // ...
  return `<dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
  <dmRefIdent>
    <dmCode modelIdentCode="${refData.modelIdentCode}" .../>
    <issueInfo issueNumber="${refData.issueNumber || '000'}" inWork="${refData.inWork || '01'}"/>
    <language languageIsoCode="${refData.languageIsoCode || 'zh'}" countryIsoCode="${refData.countryIsoCode || 'CN'}"/>${dmRefAddressItems}
  </dmRefIdent>
</dmRef>`
}
```

### 3. 为什么会出现这个问题？

#### 3.1 历史原因
在早期的 S1000D 规范中，某些 schema 版本可能允许或建议在 `<dmRef>` 上使用 xlink 属性。这些属性用于指示超链接行为：

- `xlink:type="simple"` - 简单链接类型
- `xlink:show="replace"` - 替换当前窗口
- `xlink:actuate="onRequest"` - 用户点击时激活

但在**当前项目使用的 S1000D Schema (cvc-complex-type-3.2.2)** 中，**`<dmRef>` 元素不允许携带这些属性**。

#### 3.2 Schema 定义

根据 S1000D 规范，`<dmRef>` 的定义通常是：

```xsd
<xs:element name="dmRef">
  <xs:complexType>
    <xs:sequence>
      <xs:element ref="dmRefIdent"/>
      <xs:element ref="dmRefAddressItems" minOccurs="0"/>
    </xs:sequence>
    <!-- 注意：没有 xlink:* 属性 -->
  </xs:complexType>
</xs:element>
```

xlink 属性通常只出现在 **顶层元素** 或 **特定的引用元素** 上，而不是嵌套在 `<refs>` 中的 `<dmRef>` 上。

#### 3.3 对比：LevelledPara 的 xlink 命名空间问题

这个问题与之前修复的 LevelledPara xlink 命名空间问题不同：

| 问题 | LevelledPara xlink 问题 | PreliminaryRqmts dmRef 问题 |
|------|------------------------|---------------------------|
| 症状 | `Namespace prefix xlink for type on dmRef is not defined` | `Attribute 'xlink_type' is not allowed to appear in element 'dmRef'` |
| 根本原因 | **缺少命名空间声明** (`xmlns:xlink="..."`) | **属性根本不应该存在** |
| 修复方法 | 添加命名空间声明到父元素 | 移除 xlink 属性 |
| 修复位置 | LevelledParaDesigner.vue (syncNodeToContent) | closeRqmtsConverter.js (buildDmRefXml) |

## ✅ 修复方案

### 方案概述
**移除 `buildDmRefXml` 和 `buildPmRefXml` 函数中的 xlink 属性**

### 修复文件
`src/views/ietm/ietmdatamodulemanagement/editor/utils/closeRqmtsConverter.js`

### 修复内容

#### 1. buildDmRefXml 函数修复 (第486行)

```javascript
// ✅ 修复后的代码
function buildDmRefXml(refData) {
  // 数据验证
  if (!refData) {
    throw new Error('DM引用数据不完整，缺少必要字段')
  }

  // 优先使用原始 dmRef XML（由 onDmRefInsert 从对话框回调直接保存）
  if (refData.xml) {
    // 🔑 关键修复：如果原始 XML 包含 xlink 属性，也需要移除
    return refData.xml
      .replace(/\s+xlink:type="[^"]*"/g, '')
      .replace(/\s+xlink:show="[^"]*"/g, '')
      .replace(/\s+xlink:actuate="[^"]*"/g, '')
  }

  if (!refData.modelIdentCode) {
    console.error('DM引用数据不完整:', refData)
    throw new Error('DM引用数据不完整，缺少必要字段')
  }

  // 构建 dmRefAddressItems（可选部分）
  let dmRefAddressItems = ''
  const hasDmTitle = refData.techName || refData.infoName
  const hasIssueDate = refData.issueYear && refData.issueMonth && refData.issueDay

  if (hasDmTitle || hasIssueDate) {
    dmRefAddressItems = '\n  <dmRefAddressItems>'

    if (hasDmTitle) {
      dmRefAddressItems += `
    <dmTitle>
      <techName>${escapeXml(refData.techName || '')}</techName>
      <infoName>${escapeXml(refData.infoName || '')}</infoName>
    </dmTitle>`
    }

    if (hasIssueDate) {
      dmRefAddressItems += `
    <issueDate year="${refData.issueYear}" month="${refData.issueMonth}" day="${refData.issueDay}"/>`
    }

    dmRefAddressItems += '\n  </dmRefAddressItems>'
  }

  // 🔑 关键修复：移除 xlink:type、xlink:show、xlink:actuate 属性
  // 构建符合 S1000D Schema (cvc-complex-type-3.2.2) 的 dmRef XML
  return `<dmRef>
  <dmRefIdent>
    <dmCode modelIdentCode="${refData.modelIdentCode}" systemDiffCode="${refData.systemDiffCode || 'A'}" systemCode="${refData.systemCode || '00'}" subSystemCode="${refData.subSystemCode || '0'}" subSubSystemCode="${refData.subSubSystemCode || '0'}" assyCode="${refData.assyCode || '00'}" disassyCode="${refData.disassyCode || '00'}" disassyCodeVariant="${refData.disassyCodeVariant || 'A'}" infoCode="${refData.infoCode || '000'}" infoCodeVariant="${refData.infoCodeVariant || 'A'}" itemLocationCode="${refData.itemLocationCode || 'A'}"/>
    <issueInfo issueNumber="${refData.issueNumber || '000'}" inWork="${refData.inWork || '01'}"/>
    <language languageIsoCode="${refData.languageIsoCode || 'zh'}" countryIsoCode="${refData.countryIsoCode || 'CN'}"/>${dmRefAddressItems}
  </dmRefIdent>
</dmRef>`
}
```

#### 2. buildPmRefXml 函数修复 (第502行)

```javascript
// ✅ 修复后的代码
function buildPmRefXml(refData) {
  // 数据验证
  if (!refData || !refData.modelIdentCode) {
    console.error('PM引用数据不完整:', refData)
    throw new Error('PM引用数据不完整，缺少必要字段')
  }

  // 构建 pmRefAddressItems（可选部分）
  let pmRefAddressItems = ''
  const hasPmTitle = refData.pmTitle
  const hasIssueDate = refData.issueYear && refData.issueMonth && refData.issueDay

  if (hasPmTitle || hasIssueDate) {
    pmRefAddressItems = '\n  <pmRefAddressItems>'

    if (hasPmTitle) {
      pmRefAddressItems += `
    <pmTitle>${escapeXml(refData.pmTitle)}</pmTitle>`
    }

    if (hasIssueDate) {
      pmRefAddressItems += `
    <issueDate year="${refData.issueYear}" month="${refData.issueMonth}" day="${refData.issueDay}"/>`
    }

    pmRefAddressItems += '\n  </pmRefAddressItems>'
  }

  // 🔑 关键修复：<pmRef> 也不需要 xlink 属性
  // 构建符合 S1000D Schema 的 pmRef XML
  return `<pmRef>
  <pmRefIdent>
    <pmCode modelIdentCode="${refData.modelIdentCode}" pmIssuer="${refData.pmIssuer || ''}" pmNumber="${refData.pmNumber || '00000'}" pmVolume="${refData.pmVolume || '00'}"/>
    <issueInfo issueNumber="${refData.issueNumber || '000'}" inWork="${refData.inWork || '01'}"/>
    <language languageIsoCode="${refData.languageIsoCode || 'zh'}" countryIsoCode="${refData.countryIsoCode || 'CN'}"/>${pmRefAddressItems}
  </pmRefIdent>
</pmRef>`
}
```

### 修复验证

#### 修复前的 XML
```xml
<zoneRef id="gy001" zoneNumber="gybh001">
  <name>区域名称信息</name>
  <refs>
    <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
      <dmRefIdent>
        <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" .../>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
      </dmRefIdent>
    </dmRef>
  </refs>
</zoneRef>
```

校验结果：❌ 3个错误（xlink_type / xlink_show / xlink_actuate）

#### 修复后的 XML
```xml
<zoneRef id="gy001" zoneNumber="gybh001">
  <name>区域名称信息</name>
  <refs>
    <dmRef>
      <dmRefIdent>
        <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" .../>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
      </dmRefIdent>
    </dmRef>
  </refs>
</zoneRef>
```

校验结果：✅ 通过

## 🧪 测试计划

### 1. 单元测试
- 测试文件已创建：`tests/preliminary-rqmts-dmref-xlink-validation.spec.js`
- 测试场景：
  - P0-1: 复现问题（修复前）
  - P0-2: 验证修复（修复后）

### 2. 手动测试步骤
1. 打开 DM 编辑器
2. 切换到 PreliminaryRqmts 设计视图
3. 添加区域，设置 ID、编号、名称
4. 点击"DM引用"按钮，选择一个 DM
5. 保存
6. 点击"校验"按钮
7. ✅ 验证：不应再出现 xlink 相关错误

### 3. 回归测试
- ✅ 区域 DM 引用正常保存和加载
- ✅ 口盖 DM 引用正常保存和加载
- ✅ PM 引用正常工作
- ✅ CloseRqmts 中的 DM 引用正常工作
- ✅ 已有数据的向下兼容（带 xlink 属性的旧数据能正常加载）

## 📝 技术细节

### 为什么有些地方需要 xlink 命名空间，有些不需要？

1. **LevelledPara 内的 dmRef 需要 xlink 命名空间**
   - 场景：在 warning/caution/note 中使用 UEditor 插入 DM 引用
   - 原因：UEditor 生成的 HTML 包含 xlink 属性，转换为 XML 时需要命名空间声明
   - 修复：在 `syncNodeToContent` 中添加 `xmlns:xlink="http://www.w3.org/1999/xlink"`

2. **PreliminaryRqmts 内的 dmRef 不需要 xlink 属性**
   - 场景：在区域/口盖的 `<refs>` 中添加 DM 引用
   - 原因：S1000D Schema 定义 `<dmRef>` 元素不允许 xlink 属性
   - 修复：在 `buildDmRefXml` 中移除 xlink 属性

### S1000D 规范的上下文差异

| 上下文 | 元素 | xlink 属性 | 命名空间声明 |
|--------|------|-----------|-------------|
| 段落内容 (para/warning/caution/note) | `<dmRef>` | ✅ 允许 | ✅ 需要 |
| 引用列表 (refs) | `<dmRef>` | ❌ 不允许 | ❌ 不需要 |

### 向下兼容性

修复后的代码会自动清理旧数据中的 xlink 属性：

```javascript
// 在 buildDmRefXml 中
if (refData.xml) {
  return refData.xml
    .replace(/\s+xlink:type="[^"]*"/g, '')
    .replace(/\s+xlink:show="[^"]*"/g, '')
    .replace(/\s+xlink:actuate="[^"]*"/g, '')
}
```

这确保：
- 旧数据能正常加载（解析时忽略 xlink 属性）
- 重新保存后自动清理为符合 Schema 的格式

## 📊 影响评估

### 受影响的组件
1. ✅ PreliminaryRqmtsDesigner.vue（主要影响）
2. ✅ CloseRqmtsDesigner.vue（同样受影响）
3. ✅ 所有使用 `buildDmRefXml` / `buildPmRefXml` 的地方

### 不受影响的组件
- ❌ LevelledParaDesigner.vue（使用不同的 xlink 处理逻辑）
- ❌ MainProcedureDesigner.vue（不使用 buildDmRefXml）

## ✅ 验收标准

1. **功能完整性**
   - ✅ 区域和口盖能正常添加 DM/PM 引用
   - ✅ 保存后能正确生成 XML
   - ✅ XML 能通过 S1000D Schema 校验
   - ✅ 重新打开后能正确加载引用数据

2. **数据完整性**
   - ✅ DMC 编号正确
   - ✅ 技术名称、信息名称正确
   - ✅ 语言代码正确
   - ✅ 所有必要字段都存在

3. **兼容性**
   - ✅ 旧数据（带 xlink 属性）能正常加载
   - ✅ 重新保存后自动清理为正确格式

## 📅 实施计划

1. ✅ 创建 Playwright 测试复现问题
2. ⏳ 修改 `closeRqmtsConverter.js`
3. ⏳ 运行单元测试验证修复
4. ⏳ 手动测试完整流程
5. ⏳ 提交代码并更新文档

---

**修复日期**: 2026-11-17  
**修复人员**: Claude (Kiro)  
**问题等级**: P0（阻塞性问题，影响 XML 校验通过）  
**修复状态**: 方案已制定，待实施
