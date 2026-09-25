# Para转换对称性手动验证清单

## 目标
验证paraConverter.js的6个P0修复在**真实UI**中是否生效

## 前置条件
1. 启动前端: `npm run serve`（端口3000）
2. 启动后端: 运行Java服务（端口9999）
3. 浏览器访问: http://localhost:3000
4. 登录系统，进入任意DM编辑页面

---

## 测试方法

### 1️⃣ 打开浏览器开发者工具
- F12打开Console
- 准备记录每个测试的输入/输出

### 2️⃣ 在Console中执行往返测试

复制以下代码到Console执行：

```javascript
// 测试辅助函数
async function testRoundtrip(inputXml, caseName) {
  console.log(`\n=== ${caseName} ===`);
  console.log('输入XML:', inputXml);
  
  try {
    // 动态导入paraConverter
    const { para2html, html2para } = await import('/src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js');
    
    // 模拟parent对象
    const mockParent = {
      $axios: window.axios || {
        post: async () => ({ data: { data: '/mock.jpg' } })
      }
    };
    
    // Step 1: XML → HTML
    const html = await para2html(mockParent, inputXml);
    console.log('→ HTML:', html.substring(0, 200));
    
    // Step 2: HTML → XML
    let outputXml = await html2para(mockParent, html);
    outputXml = `<para>${outputXml}</para>`; // 包裹外层para
    console.log('→ 输出XML:', outputXml);
    
    // Step 3: 对比
    const normalize = (xml) => xml.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    const isSymmetric = normalize(inputXml) === normalize(outputXml);
    
    console.log(isSymmetric ? '✅ 对称' : '❌ 不对称');
    console.log('预期:', normalize(inputXml));
    console.log('实际:', normalize(outputXml));
    
    return isSymmetric;
  } catch (error) {
    console.error('❌ 错误:', error.message);
    return false;
  }
}
```

---

## 🔧 P0修复验证用例

### ✅ P0-1: listItem内para重复

```javascript
await testRoundtrip(
  '<para><randomList><listItem><para>项1</para></listItem><listItem><para>项2</para></listItem></randomList></para>',
  'P0-1: listItem内para'
);
```

**预期结果**: ✅ 对称（不会出现`<para><para>`双层嵌套）

---

### ✅ P0-2: definitionList内para重复

```javascript
await testRoundtrip(
  '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>',
  'P0-2: definitionList内para'
);
```

**预期结果**: ✅ 对称（不会出现`<para><para>`双层嵌套）

---

### ✅ P0-3: symbol转义顺序

```javascript
await testRoundtrip(
  '<para><symbol infoEntityIdent="ICN-001" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"/></para>',
  'P0-3: symbol转义'
);
```

**预期结果**: ✅ 对称（`&lt;`不会变成`&amp;lt;`）

---

### ✅ P0-4: internalRef结束标签

```javascript
await testRoundtrip(
  '<para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>',
  'P0-4: internalRef结束标签'
);
```

**预期结果**: ✅ 对称（`</internalRef>`不会丢失）

---

### ✅ P0-5: warningAndCautionPara还原

```javascript
await testRoundtrip(
  '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>',
  'P0-5a: warningAndCautionPara'
);

await testRoundtrip(
  '<para><notePara>注释文本</notePara></para>',
  'P0-5b: notePara'
);
```

**预期结果**: ✅ 对称（特殊para类型不会丢失）

---

### ✅ P0-6: captionGroup完整重建

```javascript
// 这个需要在真实编辑器中测试表格
// 1. 新建一个包含表格的para
// 2. 插入表格，设置列宽、跨列、跨行
// 3. 保存后重新打开
// 4. 检查表格结构是否完整
```

**预期结果**: ✅ 表格的colspec/colspan/rowspan信息保留

---

## 📊 测试记录表

| 用例 | 预期 | 实际 | 通过? | 备注 |
|-----|------|------|-------|------|
| P0-1: listItem | 对称 | ? | ⬜ | |
| P0-2: definitionList | 对称 | ? | ⬜ | |
| P0-3: symbol | 对称 | ? | ⬜ | |
| P0-4: internalRef | 对称 | ? | ⬜ | |
| P0-5a: warningAndCautionPara | 对称 | ? | ⬜ | |
| P0-5b: notePara | 对称 | ? | ⬜ | |
| P0-6: captionGroup | 表格完整 | ? | ⬜ | 需真实UI |

---

## ⚠️  如果测试失败

### 失败情况1: 动态import失败
```
Error: Failed to fetch dynamically imported module
```
**原因**: 开发服务器未启动或路径错误
**解决**: 
1. 确认 `npm run serve` 正在运行
2. 访问 http://localhost:3000/src/views/.../paraConverter.js 能否直接访问

### 失败情况2: 不对称
**操作**:
1. 记录完整的输入XML和输出XML
2. 对比差异点
3. 检查paraConverter.js对应行的代码
4. 确认修复代码是否真的生效

### 失败情况3: 代码未更新
**原因**: 浏览器缓存了旧代码
**解决**:
1. 硬刷新: Ctrl+Shift+R
2. 清除浏览器缓存
3. 重启开发服务器

---

## ✅ 验证完成标准

- [ ] 所有6个P0用例在Console中测试通过
- [ ] 在真实编辑器中创建包含所有元素的DM，保存后重新打开无数据丢失
- [ ] 代码已部署到测试环境
- [ ] 代码已合并到主分支

---

## 📝 验证结果

**验证人**: _________  
**验证时间**: _________  
**通过率**: ___/6  
**质量评级**: ⭐⭐⭐⭐⭐ / ⭐⭐⭐⭐ / ⭐⭐⭐ / ⭐⭐ / ⭐

**结论**: 
- ✅ 所有修复生效，可以部署
- ⚠️  部分修复未生效，需要排查：_________
- ❌ 修复失败，需要重新修复：_________
