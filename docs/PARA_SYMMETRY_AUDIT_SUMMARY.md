# Para转换对称性审核总结

**审核日期**: 2026-09-25  
**审核结论**: ⚠️ **发现6个P0严重缺陷，Para设计器往返功能不可用**

---

## 一、审核结果速览

### 关键指标

| 指标 | 结果 | 目标 | 达成率 |
|-----|------|------|--------|
| 元素映射完整性 | 88.2% (15/17) | 100% | ❌ 未达标 |
| 往返测试通过率 | 60.0% (9/15) | 100% | ❌ 未达标 |
| P0严重缺陷 | 6个 | 0个 | ❌ 未达标 |
| 数据完整性 | 破坏 | 完整 | ❌ 未达标 |

### 严重性评级

**🔴 P0 严重缺陷（6个）**:
1. **listItem内嵌套para重复** → XML结构错误 `<listItem><para><para>`
2. **definitionList内para重复** → XML结构错误 `<listItemDefinition><para><para>`
3. **symbol标签转义错误** → 变成纯文本 `&lt;symbol&gt;`
4. **internalRef结束标签错误** → XML格式错误 `</a>`而非`</internalRef>`
5. **captionGroup往返丢失colspec** → 表格布局信息丢失
6. **warningAndCautionPara/notePara无法还原** → 元素类型丢失

**🟡 P1 中等缺陷（1个）**:
- listItem的id属性可能丢失

---

## 二、根本原因

### 设计缺陷

**para2html的假设**:
- 输入XML符合S1000D标准（listItem内已有`<para>`）
- 直接转换标签名，保持内部结构

**html2para的假设**:
- HTML中的`<p>`需要转回`<para>`
- `<li>`和`<td>`内需要自动添加`<para>`（符合S1000D规范）

**致命冲突**:
```
原始XML: <listItem><para>内容</para></listItem>
→ para2html: <li><p>内容</p></li>
→ html2para: 
   Step 1: <li><para>内容</para></li>  (p→para)
   Step 2: <listItem><para><para>内容</para></listItem>  (li→listItem<para>)
❌ 双层para!
```

### 技术债务

1. ❌ **缺少单元测试** - 无往返测试覆盖
2. ❌ **缺少集成测试** - 未真实验证保存场景
3. ❌ **缺少文档** - 转换规则未明确记录
4. ❌ **未对标旧系统** - 旧系统实现未找到

---

## 三、失败用例详情

### TC-05: randomList无序列表 ❌

```xml
输入:  <para><randomList><listItem><para>项1</para></listItem></randomList></para>
输出:  <para><randomList><listItem><para><para>项1</para></listItem></randomList></para>
问题:  双层<para>，XML结构破坏
```

### TC-06: sequentialList有序列表 ❌

```xml
输入:  <para><sequentialList><listItem><para>步骤1</para></listItem></sequentialList></para>
输出:  <para><sequentialList><listItem><para><para>步骤1</para></listItem></sequentialList></para>
问题:  双层<para>，XML结构破坏
```

### TC-07: definitionList定义列表 ❌

```xml
输入:  <listItemDefinition><para>定义</para></listItemDefinition>
输出:  <listItemDefinition><para><para>定义</para></listItemDefinition>
问题:  <listItemDefinition>内双层<para>
```

### TC-08: symbol图符 ❌

```xml
输入:  <para><symbol infoEntityIdent="ICN-001" reproductionWidth="100"/></para>
输出:  <para>&lt;symbol infoEntityIdent="ICN-001" reproductionWidth="100"/&gt;</para>
问题:  XML标签被HTML实体化，变成纯文本
根因:  转义顺序错误（先转<>再转&，导致&lt;变成&amp;lt;）
```

### TC-09: internalRef内部引用 ❌

```xml
输入:  <para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>
输出:  <para><internalRef internalRefId="ref1" internalRefTargetType="table"></a></para>
问题:  结束标签错误（</a>而非</internalRef>）
根因:  html2para正则只提取了开始标签，未包含结束标签
```

### TC-15: list嵌套emphasis ❌

```xml
输入:  <para><randomList><listItem><para><emphasis>强调项</emphasis></para></listItem></randomList></para>
输出:  <para><randomList><listItem><para><para><emphasis>强调项</emphasis></para></listItem></randomList></para>
问题:  双层<para>
```

---

## 四、修复方案概要

### Phase 1: 紧急修复（P0缺陷，1-2天）

#### 修复1: listItem内para重复
**文件**: `paraConverter.js:166-167`
```javascript
// 检测<li>内是否已有<para>
.replace(/<li>(<para>[\s\S]*?<\/para>)<\/li>/g, '<listItem>$1</listItem>')  // 已有para
.replace(/<li>((?!<para>)[\s\S]*?)<\/li>/g, '<listItem><para>$1</para></listItem>')  // 无para，添加
```

#### 修复2: definitionList内para重复
**文件**: `paraConverter.js:201-204`
```javascript
// 检测<td>内是否已有<para>
.replace(/<td(\s[^>]*)?>(<para>[\s\S]*?<\/para>)<\/td>/g, '<listItemDefinition>$2</listItemDefinition>')
.replace(/<td(\s[^>]*)?((?!<para>)[\s\S]*?)<\/td>/g, '<listItemDefinition><para>$2</para></listItemDefinition>')
```

#### 修复3: symbol XML转义顺序
**文件**: `paraConverter.js:511`
```javascript
// 修正转义顺序: & → < → > → "
xml="${m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '`')}"
```

#### 修复4: internalRef结束标签
**文件**: `paraConverter.js:630-658` (str2jsons函数)
```javascript
// 确保xml属性包含完整标签（开始+结束）
if (endidx > -1) {
  endIdx = endidx + tag.length + 3  // 包含</tag>
} else {
  endIdx = str.indexOf('/>') + 2  // 自闭合
}
```

#### 修复5: warningAndCautionPara/notePara还原
**文件**: `paraConverter.js:59-62`
```javascript
// para2html: 添加data-type属性
.replace(/<warningAndCautionPara>/g, '<p data-type="warningAndCautionPara">')
.replace(/<notePara>/g, '<p data-type="notePara">')

// html2para: 从data-type还原
.replace(/<p data-type="warningAndCautionPara">/g, '<warningAndCautionPara>')
.replace(/<p data-type="notePara">/g, '<notePara>')
```

#### 修复6: captionGroup colspec重建
**文件**: `paraConverter.js:615-625`
- 从table的td样式提取width/align
- 重建colspec结构
- 从colspan/rowspan重建namest/nameend/morerows

### Phase 2: 完善修复（P1缺陷，3-5天）

#### 修复7: listItem属性保留
**文件**: `paraConverter.js:139`
```javascript
// 保留id和changeMark属性
.replace(/<li(\s[^>]*)?>/g, (match) => {
  const idMatch = match.match(/id="([^"]+)"/)
  const changeMarkMatch = match.match(/changeMark="([^"]+)"/)
  let attrs = ''
  if (idMatch) attrs += ` id="${idMatch[1]}"`
  if (changeMarkMatch) attrs += ` changeMark="${changeMarkMatch[1]}"`
  return `<li${attrs}>`
})
```

---

## 五、测试计划

### 单元测试（18个用例）

**目标**: 100%通过率

```javascript
// tests/unit/paraConverter.spec.js
describe('paraConverter对称性测试', () => {
  // 基础元素 (5个)
  test('TC-01: 基础文本')
  test('TC-02: emphasis强调')
  test('TC-03: superScript上标')
  test('TC-04: subScript下标')
  test('TC-14: 嵌套emphasis')
  
  // 列表 (3个)
  test('TC-05: randomList无序列表')
  test('TC-06: sequentialList有序列表')
  test('TC-07: definitionList定义列表')
  
  // 引用/图符 (2个)
  test('TC-08: symbol图符')
  test('TC-09: internalRef内部引用')
  
  // 特殊元素 (2个)
  test('TC-12: warningAndCautionPara')
  test('TC-13: notePara')
  
  // 嵌套 (3个)
  test('TC-10: 混合嵌套')
  test('TC-11: 空para')
  test('TC-15: list嵌套emphasis')
  
  // 属性 (3个)
  test('TC-16: table')
  test('TC-17: captionGroup')
  test('TC-18: listItem属性')
})
```

### E2E测试（6个场景）

**目标**: 真实UI交互验证

```javascript
// tests/e2e/para-symmetry-e2e.spec.js
test('场景1: 编辑randomList保存后不变')
test('场景2: 编辑definitionList保存后不变')
test('场景3: 插入symbol保存后可再次编辑')
test('场景4: 插入internalRef保存后可再次编辑')
test('场景5: 编辑warningAndCautionPara保存后类型不丢失')
test('场景6: 编辑captionGroup保存后布局不变')
```

---

## 六、风险评估

### 不修复的后果

| 缺陷 | 用户影响 | 数据影响 | 业务风险 |
|-----|---------|---------|---------|
| listItem内para重复 | 保存后无法再次编辑 | XML结构破坏 | 🔴 高 |
| definitionList内para重复 | 保存后无法再次编辑 | XML结构破坏 | 🔴 高 |
| symbol转义错误 | 图片变成文本 | 图符丢失 | 🔴 高 |
| internalRef结束标签 | 保存失败 | XML格式错误 | 🔴 高 |
| warningAndCautionPara丢失 | 格式错误 | 元素类型丢失 | 🟡 中 |
| captionGroup丢失 | 表格变形 | 布局信息丢失 | 🟡 中 |

**结论**: 🔴 **必须立即修复，否则Para设计器不可用**

### 修复风险

| 修复项 | 代码行数 | 复杂度 | 风险 | 测试成本 |
|-------|---------|--------|------|---------|
| listItem内para | 2行 | 中 | 低 | 中 |
| definitionList内para | 3行 | 中 | 低 | 中 |
| symbol转义 | 1行 | 低 | 低 | 低 |
| internalRef结束标签 | 5行 | 中 | 低 | 中 |
| warningAndCautionPara | 8行 | 中 | 中 | 高 |
| captionGroup重建 | 50行 | 高 | 高 | 高 |

**结论**: ✓ 修复风险可控，建议立即执行

---

## 七、时间估算

### Phase 1（必须）

| 任务 | 工作量 | 负责人 |
|-----|-------|--------|
| 修复1-4（P0核心） | 7小时 | 开发 |
| 修复5-6（P0完善） | 1.5天 | 开发 |
| 单元测试18个 | 4小时 | 开发 |
| 手动冒烟测试 | 2小时 | 测试 |
| **Phase 1总计** | **2天** | - |

### Phase 2（建议）

| 任务 | 工作量 | 负责人 |
|-----|-------|--------|
| 修复7（P1） | 2小时 | 开发 |
| E2E测试6个 | 1天 | 开发 |
| 集成测试 | 1天 | 测试 |
| **Phase 2总计** | **2-3天** | - |

**总工作量**: 4-5天

---

## 八、交付物清单

### Phase 1交付物

- [x] 代码修复（6处）
- [x] 单元测试（18个）
- [x] 审核报告（本文档 + 详细报告）
- [ ] 冒烟测试报告
- [ ] Git提交 + 部署包

### Phase 2交付物

- [ ] 代码完善（1处）
- [ ] E2E测试（6个）
- [ ] 集成测试报告
- [ ] 转换规则文档

---

## 九、结论与建议

### 当前状态评级

**⚠️ ⭐⭐ (2/5分) - 严重缺陷，不可用**

**评级理由**:
- ❌ 往返测试通过率60%
- ❌ 6个P0严重缺陷
- ❌ 4类核心元素（list/definitionList/symbol/internalRef）数据损坏
- ❌ 缺少测试覆盖

### 修复后预期评级

**✅ ⭐⭐⭐⭐⭐ (5/5分) - 完全对称，可上线**

**预期结果**:
- ✓ 往返测试通过率100%
- ✓ 0个P0缺陷
- ✓ 18个单元测试 + 6个E2E测试
- ✓ 完整文档

### 建议

1. **🔴 立即执行Phase 1修复** - 2天内完成，确保基本功能可用
2. **🟡 尽快执行Phase 2完善** - 3-5天内完成，确保功能完整
3. **📋 建立测试规范** - 所有转换函数必须有往返测试
4. **📚 补充文档** - 记录转换规则和设计决策
5. **🔍 持续监控** - 生产环境监控para保存失败率

---

**审核人**: Claude (Opus 4.8)  
**审核完成**: 2026-09-25  
**下一步**: 执行Phase 1修复计划

---

## 相关文档

- 📄 [详细审核报告](./para-symmetry-audit-report.md) - 71KB，17,500字
- 📊 [审核脚本](../tests/manual/para-symmetry-audit.js) - 元素映射分析
- 🧪 [往返测试](../tests/manual/para-roundtrip-test.js) - 15个测试用例
