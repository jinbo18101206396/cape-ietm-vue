# 快速验证指南

## 🚀 如何验证修复

### 方法 1：手动验证（推荐）

按照用户报告的步骤操作：

1. **访问编辑器**
   ```
   http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN
   ```

2. **第一次保存**
   - 点击第 69 行的铅笔图标，进入 para 设计视图
   - 点击"DM引用"，选择第一条记录，点击"确定"
   - 点击"保存"
   - ✅ **检查：** XML 应该是多行格式化的

3. **第二次保存**
   - 再次点击第 69 行的铅笔图标
   - 直接点击"保存"（不做任何修改）
   - ✅ **检查：** XML 应该仍然是多行格式化的，与第一次一致

4. **第三次保存**
   - 再次点击第 69 行的铅笔图标
   - 直接点击"保存"
   - ✅ **检查：** XML 应该仍然是多行格式化的，与前两次一致

### 方法 2：自动化测试

运行 Playwright 测试：

```bash
cd /d/workspace/IETM/cape-ietm-vue

# 运行简化测试（推荐）
npx playwright test tests/xml-format-simple-test.spec.js --headed

# 或运行完整测试
npx playwright test tests/xml-format-roundtrip-fix-verification.spec.js --headed
```

---

## 🔍 验证要点

### ✅ 成功标志

1. **第一次保存后**
   ```xml
   <para>
       <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
           <dmRefIdent>
               <dmCode modelIdentCode="ZB1" systemDiffCode="A" ... />
               <language languageIsoCode="zh" countryIsoCode="CN"/>
           </dmRefIdent>
           <dmRefAddressItems>
               <dmTitle>
                   <techName>说明（总论）</techName>
                   <infoName>符号清单</infoName>
               </dmTitle>
           </dmRefAddressItems>
       </dmRef>
   </para>
   ```
   - ✅ 多行格式
   - ✅ 正确缩进
   - ✅ 标签分行

2. **第二次保存后**
   ```xml
   <para>
       <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
           <dmRefIdent>
               <dmCode modelIdentCode="ZB1" systemDiffCode="A" ... />
               <language languageIsoCode="zh" countryIsoCode="CN"/>
           </dmRefIdent>
           <dmRefAddressItems>
               <dmTitle>
                   <techName>说明（总论）</techName>
                   <infoName>符号清单</infoName>
               </dmTitle>
           </dmRefAddressItems>
       </dmRef>
   </para>
   ```
   - ✅ 与第一次格式完全一致
   - ✅ 仍然是多行格式
   - ✅ 缩进保持不变

### ❌ 失败标志（修复前的问题）

第二次保存后：
```xml
<para><dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest"><dmRefIdent><dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/> <language languageIsoCode="zh" countryIsoCode="CN"/> </dmRefIdent> <dmRefAddressItems> <dmTitle> <techName>说明（总论）</techName> <infoName>符号清单</infoName> </dmTitle> </dmRefAddressItems> </dmRef></para>
```
- ❌ 单行，所有标签挤在一起
- ❌ 无换行
- ❌ 不可读

---

## 🧪 测试清单

### 基本功能测试
- [ ] 第一次保存 para + DM引用 → 格式化正常
- [ ] 第二次保存（不修改）→ 格式保持一致
- [ ] 第三次保存（不修改）→ 格式保持一致
- [ ] 插入多个 DM引用 → 格式化正常
- [ ] 插入 DM引用 + 文本 → 格式化正常

### 其他元素测试
- [ ] 插入内部引用 (internalRef) → 格式化正常
- [ ] 插入图符 (symbol) → 格式化正常
- [ ] 插入公式 → 格式化正常
- [ ] 混合插入多种元素 → 格式化正常

### 边界情况测试
- [ ] 空 para 保存 → 正常
- [ ] 只有文本的 para → 正常
- [ ] 嵌套列表 → 格式化正常
- [ ] 手动修改 XML 后再保存 → 格式保留

### 回归测试
- [ ] 运行所有 para 相关测试通过
- [ ] 运行所有设计器相关测试通过
- [ ] Figure 设计器正常
- [ ] Table 设计器正常
- [ ] LevelledPara 设计器正常

---

## 📊 预期结果

| 场景 | 修复前 | 修复后 |
|-----|-------|-------|
| 第一次保存 | ✅ 多行格式化 | ✅ 多行格式化 |
| 第二次保存 | ❌ 单行（丢失格式） | ✅ 多行格式化 |
| 第三次保存 | ❌ 单行（丢失格式） | ✅ 多行格式化 |
| 格式一致性 | ❌ 不一致 | ✅ 一致 |

---

## 🐛 如果测试失败

### 检查清单

1. **确认修改已生效**
   ```bash
   cd /d/workspace/IETM/cape-ietm-vue
   grep -n "replace(/\\\n/g, '')" src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js
   ```
   应该看到第 423 行被注释掉

2. **清除缓存并重启前端**
   ```bash
   # 停止前端服务
   # 清除浏览器缓存
   # 重启前端服务
   npm run serve
   ```

3. **检查控制台日志**
   - 打开浏览器开发者工具
   - 查看 Console 标签
   - 搜索 "formatXml"、"html2para"、"换行" 等关键词

4. **对比 XML 内容**
   - 复制第一次保存后的 XML
   - 复制第二次保存后的 XML
   - 使用文本对比工具查看差异

---

## 📞 报告问题

如果测试失败，请提供：

1. **操作步骤** - 详细的复现步骤
2. **实际结果** - 截图或 XML 内容
3. **控制台日志** - 相关的错误日志
4. **环境信息** - 浏览器版本、操作系统

---

**准备好开始验证了吗？祝测试顺利！** 🚀
