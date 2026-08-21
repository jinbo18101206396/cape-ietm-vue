# §16.4 重建 refs 与 DOCTYPE - 手动测试清单

**测试日期**: _____________  
**测试人**: _____________  
**前端版本**: _____________  
**后端版本**: _____________

---

## 📋 测试前准备

### 1. 确认环境
- [ ] 前端服务运行中 (localhost:3000)
- [ ] 后端服务运行中 (localhost:9999)
- [ ] 已登录系统 (admin/123456)
- [ ] 已打开项目 (项目1 / ZB1)

### 2. 准备测试数据
- [ ] 找到测试 DM：`2086452253387866113`
- [ ] 或准备其他测试 DM

### 3. 浏览器开发者工具
- [ ] 打开 Console 标签
- [ ] 清空日志 (Ctrl+L)

---

## ✅ 场景测试

### TC-01: 无 DOCTYPE、无图形元素

**操作步骤**:
1. 打开测试 DM (ID: 2086452253387866113)
2. 在源码视图中，确认：
   - [ ] 没有 `<!DOCTYPE>` 声明
   - [ ] 没有 `<graphic>` 或 `<multimediaObject>` 元素
3. 点击工具栏"重建Refs"按钮
4. 在弹窗中点击"确定"

**预期结果**:
- [ ] ✅ 生成了 `<!DOCTYPE dmodule[]>`（空的）
- [ ] ✅ XML 声明 `<?xml version="1.0" encoding="UTF-8"?>` 保留
- [ ] ✅ `<dmodule xmlns:...>` 标签完整保留（所有 xmlns 属性都在）
- [ ] ✅ 文档结构正确：
  ```
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE dmodule[]>
  <dmodule xmlns:dc="..." ...>
    <identAndStatusSection>
      ...
  ```
- [ ] ✅ 左侧结构树正常显示
- [ ] ✅ Console 无红色错误
- [ ] ✅ Console 无 `[xmlTree] 未找到根元素: dmodule` 错误

**实际结果**: ___________________________________________

---

### TC-02: 有 DOCTYPE、有图形元素

**前置准备**:
1. 在源码视图手动添加：
   ```xml
   <!DOCTYPE dmodule[
   <!NOTATION cgm PUBLIC "image/cgm">
   <!ENTITY ICN-OLD SYSTEM "ICN-OLD.cgm" NDATA cgm>
   ]>
   ```
2. 在 `<content>` 下的 `<description>` 前添加：
   ```xml
   <graphic infoEntityIdent="ICN-TEST"/>
   ```
3. 格式化文档 (工具栏"格式化"按钮)

**操作步骤**:
1. 点击"重建Refs"按钮
2. 点击"确定"

**预期结果**:
- [ ] ✅ DOCTYPE 被替换（不是追加）
- [ ] ✅ DOCTYPE 包含 `<!NOTATION cgm PUBLIC ...>`
- [ ] ✅ DOCTYPE 包含 `<!ENTITY ICN-TEST SYSTEM "ICN-TEST.cgm" NDATA cgm>`
- [ ] ✅ DOCTYPE 不包含旧的 `ICN-OLD`
- [ ] ✅ XML 声明和 `<dmodule>` 都保留
- [ ] ✅ `<graphic>` 元素仍在
- [ ] ✅ 结构树正常

**实际结果**: ___________________________________________

---

### TC-03: 已有 refs 块 - 测试替换

**前置准备**:
1. 在 `<content>` 开头手动添加：
   ```xml
   <refs>
     <dmRef>
       <dmRefIdent>
         <dmCode modelIdentCode="OLD" systemDiffCode="A" 
                 systemCode="00" subSystemCode="0" subSubSystemCode="0" 
                 assyCode="00" disassyCode="00" disassyCodeVariant="A" 
                 infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
       </dmRefIdent>
     </dmRef>
   </refs>
   ```
2. 在 `<description>` 内添加新的 dmRef：
   ```xml
   <dmRef>
     <dmRefIdent>
       <dmCode modelIdentCode="NEW" systemDiffCode="A" 
               systemCode="00" subSystemCode="0" subSubSystemCode="0" 
               assyCode="00" disassyCode="00" disassyCodeVariant="A" 
               infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
     </dmRefIdent>
   </dmRef>
   ```
3. 格式化文档

**操作步骤**:
1. 记录 `<description>` 的前几行内容（用于验证不被删除）
2. 点击"重建Refs"
3. 点击"确定"

**预期结果**:
- [ ] ✅ 旧 refs 块被替换（不是在后面追加）
- [ ] ✅ refs 中不包含 `modelIdentCode="OLD"`
- [ ] ✅ refs 中包含 `modelIdentCode="NEW"`
- [ ] ✅ `<description>` 元素仍然存在
- [ ] ✅ `<description>` 的内容没有被删除（对比记录的内容）
- [ ] ✅ refs 块后面没有多余的空行或内容重复
- [ ] ✅ XML 结构完整

**实际结果**: ___________________________________________

---

### TC-04: 无后缀 ICN - 测试弹窗选择

**前置准备**:
1. 清空 DOCTYPE（删除所有 `<!ENTITY>` 声明）
2. 添加 `<graphic infoEntityIdent="ICN-NOSUFFIX"/>`
3. 格式化文档

**操作步骤**:
1. 点击"重建Refs"
2. 点击"确定"
3. 等待弹窗出现

**预期结果**:
- [ ] ✅ 弹出"选择ICN后缀"对话框
- [ ] ✅ 对话框显示 `ICN-NOSUFFIX【X行】`
- [ ] ✅ 下拉框可选择后缀（.cgm, .jpg, .png 等）
- [ ] ✅ 选择 `.cgm` 后点击"确定"
- [ ] ✅ DOCTYPE 生成 `<!ENTITY ICN-NOSUFFIX SYSTEM "ICN-NOSUFFIX.cgm" NDATA cgm>`
- [ ] ✅ 提示"生成成功"

**实际结果**: ___________________________________________

---

### TC-05: 中文视图测试

**前置准备**:
1. 点击工具栏"中/英文切换"按钮
2. 确认切换到中文视图（标签显示为 `<数据模块>`）

**操作步骤**:
1. 点击"重建Refs"
2. 点击"确定"

**预期结果**:
- [ ] ✅ 功能正常执行，无报错
- [ ] ✅ XML 声明保留
- [ ] ✅ DOCTYPE 正确生成
- [ ] ✅ `<数据模块>` 标签保留
- [ ] ✅ 结构树正常显示中文标签

**实际结果**: ___________________________________________

---

### TC-06: brexDmRef 排除测试

**前置准备**:
1. 确认 DM 中有 `<brexDmRef>`（在 `<dmStatus>` 下）
2. 记录 brexDmRef 的 DMC 值

**操作步骤**:
1. 点击"重建Refs"
2. 点击"确定"
3. 检查生成的 `<refs>` 块内容

**预期结果**:
- [ ] ✅ 如果生成了 `<refs>` 块：
  - refs 中不包含 brexDmRef 的 DMC
  - refs 中没有 "brex" 关键字
- [ ] ✅ 如果没有生成 `<refs>` 块：
  - 说明 content 下没有其他 dmRef 引用（正常）
- [ ] ✅ brexDmRef 本身仍在原位置（`<dmStatus>` 下）

**实际结果**: ___________________________________________

---

## 🔍 边界测试

### TE-01: 多个重复 DMC 去重

**前置准备**:
1. 在 `<description>` 内添加 3 个相同 DMC 的 dmRef
2. 格式化文档

**操作步骤**:
1. 点击"重建Refs"
2. 点击"确定"
3. 检查生成的 `<refs>` 块

**预期结果**:
- [ ] ✅ refs 中只有 1 个该 DMC 的条目（去重成功）

**实际结果**: ___________________________________________

---

### TE-02: 空 infoEntityIdent

**前置准备**:
1. 添加 `<graphic infoEntityIdent=""/>`

**操作步骤**:
1. 点击"重建Refs"
2. 点击"确定"

**预期结果**:
- [ ] ✅ 不弹出后缀选择框（空 ident 被跳过）
- [ ] ✅ 或 报错提示"图形元素缺少 infoEntityIdent"

**实际结果**: ___________________________________________

---

### TE-03: 超长文档性能

**前置准备**:
1. 打开一个较大的 DM（500+ 行）

**操作步骤**:
1. 点击"重建Refs"
2. 点击"确定"
3. 观察耗时

**预期结果**:
- [ ] ✅ 2 秒内完成（可接受）
- [ ] ✅ 无浏览器卡顿
- [ ] ✅ 结果正确

**实际结果**: ___________________________________________

---

## 🐛 回归测试（验证之前的Bug已修复）

### Bug #1: `<dmodule>` 被删除

**验证**: TC-01, TC-02 中确认 `<dmodule>` 标签完整保留

- [ ] ✅ 已验证修复

---

### Bug #2: XML 声明被删除

**验证**: TC-01, TC-02 中确认 `<?xml ...?>` 保留

- [ ] ✅ 已验证修复

---

### Bug #3: 状态不同步

**验证**: TC-03 中确认 refs 替换后，DOCTYPE 生成正确

- [ ] ✅ 已验证修复

---

## 📊 测试总结

### 通过情况

| 测试类别 | 总数 | 通过 | 失败 | 跳过 |
|---------|------|------|------|------|
| 场景测试 | 6 | ___ | ___ | ___ |
| 边界测试 | 3 | ___ | ___ | ___ |
| 回归测试 | 3 | ___ | ___ | ___ |
| **合计** | **12** | ___ | ___ | ___ |

### 失败用例记录

| 用例 ID | 问题描述 | 严重性 | 截图/日志 |
|---------|----------|--------|-----------|
| | | | |
| | | | |

### Console 日志关键信息

```
[粘贴关键的 console.log 输出]
```

---

## ✅ 测试结论

- [ ] **全部通过** - 可以发布
- [ ] **部分失败** - 需要修复以下问题：
  - ________________________________________________
- [ ] **严重问题** - 阻塞发布

---

**测试完成时间**: _____________  
**签字**: _____________
