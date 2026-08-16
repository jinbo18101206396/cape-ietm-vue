# 重建 refs 与 DOCTYPE 功能全面审核计划

## 一、问题背景

用户报告：
1. **点击"重建refs与DOCTYPE"按钮后，XML中的 `<brexDmRef>` 消失了**
2. **点击后生成的 XML 缺少 `</refs>` 闭合标签**

初步排查发现根因：
- **用户的 XML 存在结构错误**：`<description>` 被错误地嵌套在 `<refs>` 内部
- 导致 `refreshTree()` 解析失败，`nodeList` 为空
- 无法收集任何 dmRef，走不进替换逻辑
- 最终导致功能异常

## 二、审核目标

**系统、全面、深度审核"重建 refs 与 DOCTYPE"功能及相关代码**，包括：

1. ✅ **功能健壮性**：XML 结构错误时的防御性处理
2. ✅ **边界场景覆盖**：空 refs、无 dmRef、brexDmRef 保留、重复 DMC 等
3. ✅ **代码质量**：类似问题排查（replaceRange、nodeList 同步、行号计算）
4. ✅ **E2E 测试**：通过真实 UI 交互验证所有场景和边界

## 三、审核范围

### 核心代码文件

| 文件 | 审核重点 |
|------|---------|
| `DmContentEditor.vue` | `doRegenRefs`、`_torefs`、`_correctIcn`、`_updateDoctype`、`_findRefsEndLine` |
| `utils/refsBuilder.js` | `getDmcByLineno`、`getDmc`、`getDmcByText` |
| `utils/xmlTree.js` | `refreshTree`、`getTreeNodesfromXml`、`formatXml`、`_splitGluedTags` |
| `utils/enCnConvert.js` | `toCnXml`、`toEnXml` |
| `utils/notations.js` | `NOTATIONS`、`hasNotation`、`getNotation` |

### 相关功能点（15 个调用点）

| 调用位置 | 触发时机 | 风险等级 |
|---------|---------|---------|
| L787: `_torefs()` 开始 | 重建 refs 入口 | 🔴 高 |
| L970: `_torefs()` 结束 | refs 块替换后 | 🔴 高 |
| L979: `_correctIcn()` 开始 | 收集实体入口 | 🟡 中 |
| L1236: `_updateDoctype()` 结束 | DOCTYPE 更新后 | 🟡 中 |
| L621: `doFormat()` | 格式化后 | 🟢 低 |
| L639/640: 撤销/重做 | 编辑操作后 | 🟢 低 |
| L678/715/726/744: 插入元素 | dmRef/symbol/internalRef/对象列表 | 🟡 中 |
| L1388/1457/1529: 修改/删除/移动 | 编辑操作后 | 🟡 中 |
| L363: `mounted()` | 初始化 | 🟢 低 |

## 四、审核维度

### 4.1 防御性编程（Defensive Programming）

**问题：XML 结构错误时的处理**

当前代码在 `_torefs()` 第 787 行调用 `refreshTree()`，但**未检查解析结果**：

```javascript
async _torefs() {
  console.log('[_torefs] 开始执行')
  this.refreshTree()  // ❌ 未检查是否成功
  console.log('[_torefs] refreshTree 完成，nodeList 长度=', this.nodeList.length)
  
  // 如果 nodeList 为空（解析失败），继续执行会出错
  for (const node of this.nodeList) { ... }
}
```

**改进方案：**

1. **方案 A：前置校验**
   - 在 `doRegenRefs()` 入口检查 XML 格式
   - 如果有解析错误，提示用户并拒绝执行
   - 优点：用户体验好，错误提示清晰
   - 缺点：增加一次额外的解析开销

2. **方案 B：失败守卫**
   - `refreshTree()` 后检查 `nodeList.length`
   - 如果为 0，抛出错误并显示具体原因
   - 优点：性能好，代码简洁
   - 缺点：错误信息可能不够直观

3. **方案 C：混合方案（推荐）**
   - `doRegenRefs()` 快速检查 XML 基本结构（正则匹配 `<dmodule>`、`</dmodule>`）
   - `_torefs()` 中检查 `nodeList.length`，给出具体错误提示
   - 优点：兼顾性能和用户体验

### 4.2 brexDmRef 保留验证

**当前逻辑：**

```javascript
// 第 827-829 行：排除 brexDmRef
if (nodeName === 'dmRef' &&
    nodePath !== '/dmodule/identAndStatusSection/dmStatus/brexDmRef' &&
    !nodePath.includes('/dmodule/content/refs')) {
  // 收集 dmRef
}
```

**潜在问题：**

1. ❓ brexDmRef 如果在错误位置（如 content/refs 内），是否会被误删？
2. ❓ brexDmRef 如果有多个（非标准但可能存在），是否都被保留？
3. ❓ 中文视图下，元素名是 `业务规则交换数据模块引用`，路径匹配是否正确？

**测试场景：**
- TC-01: brexDmRef 在正确位置（dmStatus 内）
- TC-02: brexDmRef 在错误位置（content 内）
- TC-03: 有多个 brexDmRef
- TC-04: 中文视图下的 brexDmRef
- TC-05: brexDmRef 为空或格式错误

### 4.3 refs 块替换边界

**当前逻辑：**

```javascript
// 第 906-919 行：替换已有 refs
const refsline2 = this._findRefsEndLine(mainelemname, refsline1)
if (refsline2 !== -1) {
  const endLine = refsline2
  editor.replaceRange(refsXml + '\n',
    { line: startLine, ch: 0 },
    { line: endLine + 1, ch: 0 })
}
```

**潜在问题：**

1. ❓ `_findRefsEndLine()` 如果找不到 `</refs>`，返回 -1，但未给出错误提示
2. ❓ refs 块如果包含注释或 CDATA，是否会被正确处理？
3. ❓ refs 块如果与 description 同行（粘连），`_splitGluedTags` 是否生效？

**测试场景：**
- TC-06: refs 块包含注释 `<!-- 这是注释 -->`
- TC-07: refs 块包含 CDATA `<![CDATA[...]]>`
- TC-08: refs 块与 description 同行 `<refs>...</refs><description>`
- TC-09: refs 闭合标签缺失 `<refs>...[EOF]`
- TC-10: refs 块为空 `<refs></refs>`

### 4.4 行号计算一致性

**问题：nodeList 的 lineno 是相对行号（相对于 `<dmodule>`），需要加 `linenoOffset` 转换为绝对行号**

当前代码中有多处转换：

| 位置 | 转换公式 | 是否正确 |
|-----|---------|---------|
| L833: `getDmcByLineno` 参数 | `lineno + linenoOffset - 1` | ✅ |
| L950: 插入新 refs | `contentLineno + linenoOffset - 1` | ✅ |
| L960: 删除旧 refs | `refsline1 + linenoOffset - 1` | ⚠️ 未验证 |
| L906: `_findRefsEndLine` 参数 | 传入相对行号 | ⚠️ 需确认 |

**测试场景：**
- TC-11: XML 有 prologue（`<?xml?>` + DOCTYPE），linenoOffset 应为 3
- TC-12: XML 无 DOCTYPE，linenoOffset 应为 2
- TC-13: XML 有多行 DOCTYPE（跨行），linenoOffset 计算是否正确

### 4.5 中文视图兼容性

**当前支持：**
- `toCnXml` / `toEnXml` 转换元素名
- `_getLocaleName` 获取本地化名称
- `getDmcByLineno` 支持中文视图

**潜在问题：**

1. ❓ `_getLocaleName('refs')` 在中文视图下返回什么？（应该是 `引用块`）
2. ❓ 搜索 `<refs>` 标签时，是否考虑了中文名？
3. ❓ 路径匹配 `/dmodule/content/refs` 是否支持中文路径？

**测试场景：**
- TC-14: 中文视图下重建 refs
- TC-15: 中文视图下的 brexDmRef 保留
- TC-16: 中英文视图切换后重建

### 4.6 类似问题排查

**搜索模式：**

1. 所有 `replaceRange` 调用（7 处）
2. 所有 `nodeList` 遍历（44 处）
3. 所有直接操作 editor 且未调用 `refreshTree` 的位置
4. 所有假设 XML 格式正确的代码（如 `indexOf` / `includes` 直接查找标签）

**重点审查：**
- 元素插入（L667: dmRef/symbol/internalRef）
- 元素删除（L1457）
- 元素移动（L1529）
- DOCTYPE 更新（L1202/1207/1215）

## 五、E2E 测试计划

### 测试环境

- 前端：http://localhost:3000
- 后端：http://localhost:9999/jeecg-boot
- DM_ID：真实数据（从数据库选取典型案例）
- 浏览器：Chromium（Playwright）

### 测试套件结构

```
tests/e2e/dm-regen-refs-audit.spec.js
├── 前置：准备测试数据（3 个 DM）
│   ├── DM-A：标准结构（有 dmRef + brexDmRef + DOCTYPE）
│   ├── DM-B：边界结构（空 refs + 无 DOCTYPE）
│   ├── DM-C：错误结构（description 在 refs 内）
│
├── 分组 1：防御性编程（5 个测试）
│   ├── T1.1：XML 结构错误时拒绝执行并提示
│   ├── T1.2：nodeList 为空时给出明确错误
│   ├── T1.3：refreshTree 失败时不继续执行
│   ├── T1.4：找不到 </refs> 时给出提示
│   ├── T1.5：快速修复脚本验证（fix-refs-structure.js）
│
├── 分组 2：brexDmRef 保留（5 个测试）
│   ├── T2.1：brexDmRef 在正确位置被保留
│   ├── T2.2：brexDmRef 在错误位置被保留（警告）
│   ├── T2.3：有多个 brexDmRef 都被保留
│   ├── T2.4：中文视图下 brexDmRef 保留
│   ├── T2.5：brexDmRef 为空时不报错
│
├── 分组 3：refs 块替换边界（10 个测试）
│   ├── T3.1：替换已有 refs（标准场景）
│   ├── T3.2：插入新 refs（无旧 refs）
│   ├── T3.3：删除旧 refs（无 dmRef）
│   ├── T3.4：refs 块包含注释
│   ├── T3.5：refs 块包含 CDATA
│   ├── T3.6：refs 与 description 同行粘连
│   ├── T3.7：refs 闭合标签缺失（预期报错）
│   ├── T3.8：refs 块为空
│   ├── T3.9：refs 块有重复 DMC（去重）
│   ├── T3.10：refs 块有空 infoEntityIdent（跳过）
│
├── 分组 4：行号计算一致性（3 个测试）
│   ├── T4.1：有 prologue + DOCTYPE
│   ├── T4.2：无 DOCTYPE
│   ├── T4.3：多行 DOCTYPE
│
├── 分组 5：中文视图兼容性（3 个测试）
│   ├── T5.1：中文视图下重建 refs
│   ├── T5.2：中文视图下 brexDmRef 保留
│   ├── T5.3：中英文视图切换后重建
│
├── 分组 6：ICN 弹窗与 DOCTYPE（5 个测试）
│   ├── T6.1：有无后缀 ICN 弹窗出现
│   ├── T6.2：取消弹窗不继续执行
│   ├── T6.3：指定后缀后 DOCTYPE 正确生成
│   ├── T6.4：DOCTYPE 插入位置（<dmodule> 之前）
│   ├── T6.5：DOCTYPE NOTATION 白名单验证
│
└── 分组 7：综合场景（5 个测试）
    ├── T7.1：完整流程（torefs → correctIcn → updateDoctype）
    ├── T7.2：快速连续点击（防重复）
    ├── T7.3：格式化后重建
    ├── T7.4：撤销/重做后重建
    ├── T7.5：编辑后（修改属性）重建
```

### 测试数据准备

**XML 模板：**

```xml
<!-- DM-A：标准结构 -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dmodule[
  <!ENTITY ICN-TEST-001 SYSTEM "ICN-TEST-001.cgm" NDATA cgm>
]>
<dmodule>
  <identAndStatusSection>
    <dmStatus>
      <brexDmRef>
        <dmRef>
          <dmRefIdent>
            <dmCode modelIdentCode="S1000D" ... />
          </dmRefIdent>
        </dmRef>
      </brexDmRef>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <refs>
      <dmRef>
        <dmRefIdent>
          <dmCode modelIdentCode="TEST" ... />
        </dmRefIdent>
      </dmRef>
    </refs>
    <description>
      <para>引用另一个 DM：
        <dmRef>
          <dmRefIdent>
            <dmCode modelIdentCode="REFER" ... />
          </dmRefIdent>
        </dmRef>
      </para>
      <para>引用一个图形：
        <graphic infoEntityIdent="ICN-TEST-001"/>
      </para>
    </description>
  </content>
</dmodule>

<!-- DM-B：边界结构（无 refs + 无 DOCTYPE） -->
<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>...</identAndStatusSection>
  <content>
    <description>
      <para>无任何引用</para>
    </description>
  </content>
</dmodule>

<!-- DM-C：错误结构（description 在 refs 内） -->
<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>...</identAndStatusSection>
  <content>
    <refs>
      <description>
        <para>错误嵌套</para>
      </description>
    </refs>
  </content>
</dmodule>
```

## 六、代码改进方案

### 6.1 增加前置校验（doRegenRefs）

```javascript
doRegenRefs() {
  console.log('[doRegenRefs] 按钮被点击')
  
  // 前置校验：快速检查 XML 基本结构
  const editor = this.$refs.editor.getEditor()
  const xml = editor.getValue()
  
  if (!xml.includes('<dmodule') || !xml.includes('</dmodule>')) {
    this.$message.error('XML 结构不完整，请检查 <dmodule> 标签')
    return
  }
  
  // 快速解析检查
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const errors = doc.getElementsByTagName('parsererror')
    if (errors.length > 0) {
      const errorMsg = errors[0].textContent || '未知错误'
      this.$message.error('XML 格式错误，无法重建 refs：' + errorMsg.substring(0, 100))
      return
    }
  } catch (e) {
    this.$message.error('XML 解析失败：' + e.message)
    return
  }
  
  this.$confirm({
    title: '重建 refs 与 DOCTYPE',
    content: '此操作将删除原 content/refs 元素以及 <!DOCTYPE> 并重新生成，是否确认？',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      // ... 原有逻辑
    }
  })
}
```

### 6.2 增加失败守卫（_torefs）

```javascript
async _torefs() {
  console.log('[_torefs] 开始执行')
  this.refreshTree()
  console.log('[_torefs] refreshTree 完成，nodeList 长度=', this.nodeList.length)
  
  // 失败守卫：检查 nodeList 是否有效
  if (this.nodeList.length === 0) {
    const msg = 'XML 解析失败，无法重建 refs。可能的原因：\n' +
                '1. XML 格式错误（标签未闭合、属性格式错误等）\n' +
                '2. <dmodule> 标签缺失或位置错误\n' +
                '请先修复 XML 格式错误，或使用"格式化"功能。'
    console.error('[_torefs] ❌', msg)
    this.$message.error(msg)
    throw new Error('nodeList 为空，无法继续执行')
  }
  
  // ... 原有逻辑
}
```

### 6.3 增强 _findRefsEndLine 错误提示

```javascript
_findRefsEndLine(mainelemname, refsline1Relative) {
  const editor = this.$refs.editor.getEditor()
  const linenoOffset = this.$refs.editor.getLinenoOffset()
  const refsline1Abs = refsline1Relative + linenoOffset - 1
  const closeTag = '</' + this._getLocaleName('refs') + '>'
  
  for (let i = refsline1Abs + 1; i < editor.lineCount(); i++) {
    const line = editor.getLine(i) || ''
    if (line.includes(closeTag)) {
      console.log('[_findRefsEndLine] 找到 </refs> 在绝对行', i)
      return i
    }
  }
  
  // 增强错误提示
  console.error('[_findRefsEndLine] ❌ 未找到 refs 闭合标签')
  console.error('[_findRefsEndLine] 查找范围：第', refsline1Abs + 1, '行 到 第', editor.lineCount(), '行')
  console.error('[_findRefsEndLine] 查找标签：', closeTag)
  console.error('[_findRefsEndLine] <refs> 起始行内容：', editor.getLine(refsline1Abs))
  
  return -1
}
```

### 6.4 增加 brexDmRef 保留验证日志

```javascript
// 在 _torefs() 收集 dmRef 时增加日志
if (nodeName === 'dmRef') {
  console.log('[_torefs] 发现 dmRef，路径=', nodePath)
  
  if (nodePath === '/dmodule/identAndStatusSection/dmStatus/brexDmRef') {
    console.log('[_torefs] ✅ 跳过 brexDmRef（符合规范）')
    continue
  }
  
  if (nodePath.includes('/dmodule/content/refs')) {
    console.log('[_torefs] ⚠️ 跳过 refs 内条目，路径=', nodePath)
    continue
  }
  
  // 收集逻辑...
}
```

## 七、验收标准

### 功能正确性

✅ brexDmRef 在所有场景下都被保留  
✅ refs 块正确生成（有 xmlns:xlink、格式化、去重）  
✅ DOCTYPE 正确插入（位置、NOTATION、格式）  
✅ 中文视图完全兼容  
✅ XML 结构错误时给出清晰错误提示

### 代码质量

✅ 无重复代码  
✅ 错误处理完善  
✅ 日志清晰（便于调试）  
✅ 注释准确（与代码一致）  
✅ 无硬编码魔法值

### 测试覆盖

✅ 36 个 E2E 测试全部通过  
✅ 覆盖所有边界场景  
✅ 覆盖所有错误路径  
✅ 真实 UI 交互验证

### 文档完整

✅ 代码注释完整  
✅ 测试用例文档化  
✅ 问题登记表更新  
✅ 内存记忆更新

## 八、执行步骤

1. **代码审查**（1小时）
   - 逐行审查 doRegenRefs、_torefs、_correctIcn、_updateDoctype
   - 排查所有 replaceRange 调用
   - 排查所有 nodeList 使用

2. **代码改进**（2小时）
   - 实现 6.1-6.4 改进方案
   - 增加防御性检查
   - 增强错误提示

3. **E2E 测试编写**（3小时）
   - 编写 dm-regen-refs-audit.spec.js
   - 36 个测试用例
   - 准备测试数据

4. **E2E 测试执行**（1小时）
   - 运行所有测试
   - 修复失败用例
   - 回归测试

5. **文档更新**（30分钟）
   - 更新 §51 已知问题登记表
   - 更新内存记忆
   - 编写审核报告

**总计：~7.5 小时**

## 九、风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|-----|-------|------|---------|
| 改进代码引入新 bug | 中 | 高 | 充分的 E2E 测试 + 回归测试 |
| 测试环境不稳定 | 低 | 中 | 使用 Playwright 重试机制 |
| 测试数据不全面 | 中 | 中 | 从真实数据库提取典型案例 |
| 中文视图兼容性问题 | 低 | 低 | 专项测试覆盖 |

## 十、待确认问题

1. ❓ 中文视图下 `refs` 元素的正确名称是什么？（`引用块`？）
2. ❓ brexDmRef 在错误位置时，应该报错还是保留？
3. ❓ 用户提供的 XML 中，brexDmRef 原本在哪个位置？
4. ❓ 是否需要提供一键修复脚本（fix-refs-structure.js）作为官方功能？
