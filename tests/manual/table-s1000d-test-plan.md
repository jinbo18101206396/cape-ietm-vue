# ParaDesigner - Table S1000D转换测试计划

**版本**: v1.0  
**修复编号**: 修复11  
**测试日期**: 2026-09-25  
**测试人员**: ___________

---

## 修复内容

**问题**: UEditor插入的普通表格保留HTML格式（`<tbody><tr><td>`），不符合S1000D标准

**根本原因**: `paraConverter.js` 只处理了 `deflist="1"` 和 `caption="1"` 两种特殊表格，缺少普通table的转换逻辑

**解决方案**: 新增 `convertHtmlTableToS1000D()` 函数，自动将HTML table转换为S1000D标准格式（`<table><tgroup><tbody><row><entry>`）

---

## 测试环境准备

### 前置条件
- [ ] 前端代码已部署最新版本（包含修复11）
- [ ] 浏览器已强制刷新（Ctrl+F5）
- [ ] 打开浏览器控制台（F12）

### 测试数据
- [ ] 准备一个测试用DM（建议DMC: DMC-TEST-TABLE-001）
- [ ] 确保DM包含至少一个空para元素

---

## 测试场景

### 场景1: 基本2×2表格（P0核心场景）

**步骤**:
1. 进入DM编辑页面，点击para的铅笔图标进入设计视图
2. 在UEditor工具栏点击"插入表格"
3. 选择2行×2列
4. 填入内容：
   - 第1行: 1, 2
   - 第2行: 3, 4
5. 点击保存
6. 切换到源码视图

**期望结果**:
```xml
<para>
  <table>
    <tgroup cols="2">
      <tbody>
        <row>
          <entry>1</entry>
          <entry>2</entry>
        </row>
        <row>
          <entry>3</entry>
          <entry>4</entry>
        </row>
      </tbody>
    </tgroup>
  </table>
</para>
```

**验证点**:
- [ ] 存在 `<table>` 标签
- [ ] 存在 `<tgroup cols="2">` 
- [ ] 存在 `<tbody>` 在tgroup内
- [ ] 使用 `<row>` 而非 `<tr>`
- [ ] 使用 `<entry>` 而非 `<td>`
- [ ] **不存在** HTML属性（class, style, width, valign）
- [ ] 缩进格式正确

**控制台日志验证**:
- [ ] 看到 `[convertHtmlTableToS1000D] 输入HTML table:`
- [ ] 看到 `[convertHtmlTableToS1000D] 输出S1000D table:`
- [ ] 输出包含 `<tgroup cols="2">`

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 场景2: 移除HTML属性（P0安全性）

**步骤**:
1. 进入设计视图
2. 插入表格（2行×2列）
3. 在UEditor中调整表格样式：
   - 设置列宽
   - 设置对齐方式
   - 设置边框样式
4. 保存
5. 切换到源码视图

**期望结果**:
```xml
<para>
  <table>
    <tgroup cols="2">
      <tbody>
        <row>
          <entry>内容</entry>
          <entry>内容</entry>
        </row>
      </tbody>
    </tgroup>
  </table>
</para>
```

**验证点**:
- [ ] **不存在** `class="firstRow"` 或任何class属性
- [ ] **不存在** `style="..."` 或任何style属性
- [ ] **不存在** `width="..."` 或任何width属性
- [ ] **不存在** `valign="..."` 或任何valign属性
- [ ] **不存在** `colspan` / `rowspan` 属性

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 场景3: 3列表格（cols属性计算）

**步骤**:
1. 插入3列×2行表格
2. 填入: A, B, C / D, E, F
3. 保存并查看源码

**期望结果**:
```xml
<tgroup cols="3">
```

**验证点**:
- [ ] cols属性值为"3"

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 场景4: 带表头的表格（thead/tbody分离）

**步骤**:
1. 插入表格（2列）
2. 在UEditor中将第一行设置为表头（右键→行→设为表头行）
3. 填入:
   - 表头: 列1, 列2
   - 数据: 值1, 值2
4. 保存并查看源码

**期望结果**:
```xml
<para>
  <table>
    <tgroup cols="2">
      <thead>
        <row>
          <entry>列1</entry>
          <entry>列2</entry>
        </row>
      </thead>
      <tbody>
        <row>
          <entry>值1</entry>
          <entry>值2</entry>
        </row>
      </tbody>
    </tgroup>
  </table>
</para>
```

**验证点**:
- [ ] 存在 `<thead>` 在tgroup内
- [ ] 存在 `<tbody>` 在tgroup内
- [ ] thead在tbody之前
- [ ] thead/tbody都在tgroup内（同一层级）

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 场景5: 不影响definitionList（P0兼容性）

**步骤**:
1. 在源码视图插入definitionList:
```xml
<para>
  <definitionList>
    <definitionListItem>
      <listItemTerm>术语1</listItemTerm>
      <listItemDefinition><para>定义1</para></listItemDefinition>
    </definitionListItem>
  </definitionList>
</para>
```
2. 切换到设计视图（会转换为`<table deflist="1">`）
3. 不做修改，直接保存
4. 切换回源码视图

**期望结果**:
```xml
<para>
  <definitionList>
    <definitionListItem>
      <listItemTerm>术语1</listItemTerm>
      <listItemDefinition><para>定义1</para></listItemDefinition>
    </definitionListItem>
  </definitionList>
</para>
```

**验证点**:
- [ ] 仍然是 `<definitionList>` 而非 `<table><tgroup>`
- [ ] 结构未被破坏

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 场景6: 不影响captionGroup（P0兼容性）

**步骤**:
1. 在源码视图插入captionGroup:
```xml
<para>
  <captionGroup>
    <captionRow>
      <captionEntry><captionLine>内容</captionLine></captionEntry>
    </captionRow>
  </captionGroup>
</para>
```
2. 切换到设计视图（会转换为`<table caption="1">`）
3. 不做修改，直接保存
4. 切换回源码视图

**期望结果**:
```xml
<para>
  <captionGroup>
    <captionRow>
      <captionEntry><captionLine>内容</captionLine></captionEntry>
    </captionRow>
  </captionGroup>
</para>
```

**验证点**:
- [ ] 仍然是 `<captionGroup>` 而非 `<table><tgroup>`
- [ ] 结构未被破坏

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 场景7: entry内嵌套内容（P1完整性）

**步骤**:
1. 插入表格（1列×1行）
2. 在单元格中输入：普通文本，选中部分加粗，插入上标/下标
3. 保存并查看源码

**期望结果**:
```xml
<para>
  <table>
    <tgroup cols="1">
      <tbody>
        <row>
          <entry>普通文本<emphasis>加粗</emphasis>H<superScript>2</superScript>O</entry>
        </row>
      </tbody>
    </tgroup>
  </table>
</para>
```

**验证点**:
- [ ] entry内的文本保持完整
- [ ] `<strong>` 转换为 `<emphasis>`
- [ ] `<sup>` 转换为 `<superScript>`
- [ ] `<sub>` 转换为 `<subScript>`

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 场景8: 多行大表格（P1性能）

**步骤**:
1. 插入表格（3列×10行）
2. 填入测试数据
3. 保存并查看源码

**验证点**:
- [ ] 保存时间 < 2秒
- [ ] 10行都正确转换为 `<row><entry>`
- [ ] cols属性为"3"

**实际结果**: ✅ / ❌  
**备注**: __________

---

## 边界场景

### 边界1: 空表格

**步骤**:
1. 插入表格但不填入任何内容
2. 保存并查看源码

**期望结果**:
```xml
<para>
  <table>
    <tgroup cols="N">
      <tbody>
        <row>
          <entry></entry>
          ...
        </row>
      </tbody>
    </tgroup>
  </table>
</para>
```

**验证点**:
- [ ] 不崩溃
- [ ] cols属性有效（根据插入时选择的列数）

**实际结果**: ✅ / ❌  

---

### 边界2: 单行单列表格

**步骤**:
1. 插入1行×1列表格
2. 填入: "单元格"
3. 保存并查看源码

**验证点**:
- [ ] `cols="1"`
- [ ] 只有1个 `<row>` 和 1个 `<entry>`

**实际结果**: ✅ / ❌  

---

### 边界3: 删除表格后保存

**步骤**:
1. 插入表格
2. 在设计视图中删除整个表格
3. 保存

**期望结果**:
```xml
<para>
</para>
```

**验证点**:
- [ ] para标签保留
- [ ] 内容为空

**实际结果**: ✅ / ❌  

---

## XML校验测试

### 校验1: S1000D XSD校验

**步骤**:
1. 完成场景1创建的DM
2. 点击工具栏"校验"按钮
3. 查看校验结果

**期望结果**:
- [ ] 校验通过（0个错误）
- [ ] 或仅有与table无关的其他错误

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 校验2: 预览功能

**步骤**:
1. 完成场景1创建的DM
2. 点击工具栏"预览"按钮
3. 查看预览效果

**期望结果**:
- [ ] 表格正确显示
- [ ] 单元格内容正确
- [ ] 无报错

**实际结果**: ✅ / ❌  
**备注**: __________

---

## 兼容性测试

### 兼容1: 旧数据加载（已存在的HTML格式table）

**准备**: 在数据库中找一个包含旧HTML格式table的DM

**步骤**:
1. 打开该DM的设计视图
2. 查看表格是否正常显示
3. **不做任何修改**，直接切换回源码视图

**期望结果**:
- [ ] 表格在设计视图正常显示
- [ ] 源码未自动转换（只有保存时才转换）

**实际结果**: ✅ / ❌  
**备注**: __________

---

### 兼容2: 旧数据编辑并保存

**步骤**:
1. 继续兼容1的DM
2. 在设计视图中修改表格内容（例如改一个单元格的文字）
3. 保存
4. 切换到源码视图

**期望结果**:
- [ ] 表格已自动转换为S1000D格式
- [ ] 修改的内容保留

**实际结果**: ✅ / ❌  
**备注**: __________

---

## 回归测试

### 回归1: 修复10（para标签包裹）仍然生效

**步骤**:
1. 在空para中插入表格
2. 保存
3. 查看源码

**验证点**:
- [ ] `<para>` 开始标签存在
- [ ] `</para>` 结束标签存在
- [ ] 表格在para标签内

**实际结果**: ✅ / ❌  

---

### 回归2: 缩进格式（formatXml）正常

**步骤**:
1. 在嵌套较深的para中插入表格（例如levelledPara内的para）
2. 保存
3. 查看源码缩进

**验证点**:
- [ ] 基础缩进保持（para所在列的缩进）
- [ ] 子元素递增缩进（每层+2空格）

**实际结果**: ✅ / ❌  

---

## 测试总结

### 测试统计

| 类别 | 总数 | 通过 | 失败 | 阻塞 |
|------|------|------|------|------|
| 核心场景 | 8 | ___ | ___ | ___ |
| 边界场景 | 3 | ___ | ___ | ___ |
| 校验测试 | 2 | ___ | ___ | ___ |
| 兼容性测试 | 2 | ___ | ___ | ___ |
| 回归测试 | 2 | ___ | ___ | ___ |
| **合计** | **17** | ___ | ___ | ___ |

### 通过率
- [ ] ≥90% - 可上线
- [ ] 70%-89% - 需修复P0问题后上线
- [ ] <70% - 不可上线，需重新设计

**实际通过率**: ____%

---

### 遗留问题

| ID | 场景 | 问题描述 | 优先级 | 计划修复版本 |
|----|------|----------|--------|--------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

### 测试结论

- [ ] ✅ 通过 - 修复11可以上线
- [ ] ⚠️  有条件通过 - 需修复以下问题: ___________
- [ ] ❌ 不通过 - 阻塞问题: ___________

**测试人签名**: ___________  
**审核人签名**: ___________  
**日期**: ___________
