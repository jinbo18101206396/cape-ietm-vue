# 创建测试DM数据指南

**目的**: 为E2E测试准备测试数据  
**时间**: 约5分钟  
**创建日期**: 2026-09-25

---

## 📋 创建步骤

### 步骤1: 登录系统
1. 打开浏览器访问: http://localhost:3000
2. 使用测试账号登录:
   - 账户名: `admin`
   - 密码: `123456`

### 步骤2: 进入数据模块管理
1. 在左侧菜单中找到 **数据模块管理**
2. 点击进入 **数据模块列表**

### 步骤3: 创建新DM
1. 点击页面上的 **"新增"** 或 **"创建DM"** 按钮
2. 填写基本信息:
   ```
   标题: Para设计器E2E测试DM
   类型: 选择任意类型
   版本: 001
   语言: cn (中文)
   ```
3. 点击 **"确定"** 创建

### 步骤4: 编辑DM内容
1. 在列表中找到刚创建的DM
2. 点击 **"编辑"** 按钮打开编辑器
3. 在编辑器中插入以下测试内容:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" 
                subSystemCode="0" subSubSystemCode="0" assyCode="00" 
                disassyCode="00" disassyCodeVariant="A" infoCode="000" 
                infoCodeVariant="A" itemLocationCode="A" learnCode="00" 
                learnEventCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  
  <content>
    <description>
      <levelledPara>
        <title>Para设计器测试</title>
        
        <!-- 测试场景1: 基础para -->
        <para>这是一个测试段落。</para>
        
        <!-- 测试场景2: 嵌套列表 -->
        <para>
          <randomList>
            <listItem><para>项目1</para></listItem>
            <listItem><para>项目2</para>
              <sequentialList>
                <listItem><para>子项目2.1</para></listItem>
                <listItem><para>子项目2.2</para></listItem>
              </sequentialList>
            </listItem>
            <listItem><para>项目3</para></listItem>
          </randomList>
        </para>
        
        <!-- 测试场景3: definitionList (表格) -->
        <para>
          <definitionList>
            <definitionListItem>
              <listItemTerm>术语1</listItemTerm>
              <listItemDefinition>
                <para>定义段落1</para>
                <para>定义段落2</para>
                <para>定义段落3</para>
              </listItemDefinition>
            </definitionListItem>
            <definitionListItem>
              <listItemTerm>术语2</listItemTerm>
              <listItemDefinition><para>定义2</para></listItemDefinition>
            </definitionListItem>
          </definitionList>
        </para>
        
        <!-- 测试场景4: 混合格式 -->
        <para>普通文本 <emphasis>强调文本</emphasis> H<subScript>2</subScript>O X<superScript>2</superScript> 结束</para>
        
      </levelledPara>
    </description>
  </content>
</dmodule>
```

4. 点击 **"保存"** 按钮

### 步骤5: 验证DM可见
1. 返回数据模块列表
2. 确认新创建的DM在列表中可见
3. 确认可以展开查看详情
4. 确认有 **"编辑"** 按钮

---

## ✅ 验证清单

创建完成后，请确认：

- [ ] DM在列表中可见
- [ ] 可以点击展开图标展开行
- [ ] 可以看到"编辑"按钮
- [ ] 点击编辑后可以打开编辑器
- [ ] 编辑器中可以看到para元素
- [ ] para元素左侧gutter有铅笔图标

---

## 🧪 运行E2E测试

测试数据准备好后，运行E2E测试：

```bash
cd D:/workspace/IETM/cape-ietm-vue

# 运行所有5个场景
npx playwright test tests/e2e/para-real-browser-complete.spec.js

# 或使用UI模式（推荐，可以看到浏览器操作）
npx playwright test tests/e2e/para-real-browser-complete.spec.js --ui

# 或只运行场景3（CRITICAL bug验证）
npx playwright test tests/e2e/para-real-browser-complete.spec.js -g "场景3"
```

---

## 🎯 预期测试结果

如果测试数据正确：

```
✅ 场景1: 基础文本编辑往返验证 - 通过
✅ 场景2: 复杂嵌套列表编辑验证 - 通过
✅ 场景3: definitionList表格编辑验证 - 通过 (CRITICAL验证)
✅ 场景4: 混合内容编辑验证 - 通过
✅ 场景5: 大文档性能测试 - 通过

5 passed (约2-3分钟)
```

---

## 🔧 故障排查

### 问题1: 找不到DM
**解决**: 确认DM已保存且状态正常

### 问题2: 无法展开行
**解决**: 检查DM是否有内容

### 问题3: 找不到para元素
**解决**: 确认XML格式正确，包含`<para>`标签

### 问题4: Para设计器不打开
**解决**: 
1. 检查浏览器控制台错误
2. 确认paraConverter.js已加载
3. 确认gutter图标可见

---

## 📞 需要帮助？

如果遇到问题，请查看：
- `tests/e2e/README-REAL-BROWSER-TEST.md` - 完整测试指南
- `PARA-DEPLOYMENT-GUIDE.md` - 故障排查章节
- 浏览器控制台错误日志

---

**创建完成后，告诉我即可运行E2E测试！**
