# DM引用 xlink 属性修复 - 验证清单

## 📋 修复内容概览

### 修改的文件

1. ✅ `src/views/ietm/ietmdatamodulemanagement/editor/utils/closeRqmtsConverter.js`
   - 行 462-467: 添加 xlink 清理逻辑
   - 行 500: 移除 `<dmRef>` 上的硬编码 xlink 属性
   - 文件版本: v1.1 → v1.2

2. ✅ `src/views/ietm/ietmdatamodulemanagement/editor/utils/preliminaryRqmtsConverter.js`
   - 行 228-229: 修复区域 DM/PM 引用生成（始终调用 buildDmRefXml/buildPmRefXml）
   - 行 244-245: 修复口盖 DM/PM 引用生成（始终调用 buildDmRefXml/buildPmRefXml）

### 修复逻辑

**问题**: 
- `buildDmRefXml` 硬编码了 xlink:type / xlink:show / xlink:actuate 属性
- `preliminaryRqmtsConverter` 使用 `(d.xml || buildDmRefXml(d))` 短路逻辑，绕过了清理

**修复**:
- `buildDmRefXml` 移除硬编码属性，并清理缓存 XML 中的 xlink 属性
- `preliminaryRqmtsConverter` 始终调用 `buildDmRefXml(d)`，确保清理逻辑执行

---

## 🧪 自动化测试验证

### 1. 单元测试

```bash
node test-buildDmRefXml.js
```

**验证点**:
- [x] 从对象构建 XML 不包含 xlink 属性
- [x] 清理缓存 XML 中的 xlink 属性
- [x] 生成的 XML 包含必要的 dmRef / dmRefIdent 元素

**结果**: ✅ 所有测试通过

### 2. 集成测试

```bash
node test-preliminaryRqmts-integration.js
```

**验证点**:
- [x] 场景1: 用户添加区域，选择 DM（缓存 XML 带 xlink）→ 清理后不包含 xlink
- [x] 场景2: 用户添加区域，从对象构建 DM 引用 → 不包含 xlink

**结果**: ✅ 所有测试通过

### 3. Playwright 端到端测试

```bash
npx playwright test tests/preliminary-rqmts-dmref-xlink-validation.spec.js
```

**测试用例**:
- P0-1: 复现问题（验证修复前的行为）
- P0-2: 验证修复（确认 buildDmRefXml 不包含 xlink 属性）

**结果**: ⏳ 待运行

---

## 🖱️ 手动浏览器测试验证

### 前置条件

1. 开发服务器正在运行
   ```bash
   npm run dev
   ```

2. 浏览器可以访问 http://localhost:3000/

### 测试流程

#### 测试1: 新增区域 + DM 引用

1. **登录系统**
   - [ ] 访问 http://localhost:3000/
   - [ ] 输入用户名: `admin`
   - [ ] 输入密码: `123456`
   - [ ] 点击"登录"按钮
   - [ ] 确认登录成功

2. **打开 DM 编辑器**
   - [ ] 访问以下 URL:
     ```
     http://localhost:3000/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN
     ```
   - [ ] 确认页面加载成功
   - [ ] 确认看到 DM 编辑器界面

3. **切换到 PreliminaryRqmts 设计视图**
   - [ ] 点击"设计视图"按钮（如果当前在源码视图）
   - [ ] 确认切换到设计视图成功

4. **添加区域并引用 DM**
   - [ ] 展开"产品数据"面板（右侧）
   - [ ] 切换到"区域" Tab
   - [ ] 点击"增加"按钮
   - [ ] 填写区域信息:
     - 区域 ID: `testzone001`
     - 区域编号: `TZ001`
     - 区域名称: `测试区域`
   - [ ] 点击"DM引用"按钮
   - [ ] 在弹出的对话框中选择任意 DM
   - [ ] 确认 DM 引用已添加
   - [ ] 点击"保存"按钮

5. **切换到源码视图查看 XML**
   - [ ] 点击"源码视图"按钮
   - [ ] 定位到 `<productionMaintData>` → `<zoneRef>` 元素
   - [ ] 找到刚添加的区域（`id="testzone001"`）
   - [ ] 查看其中的 `<dmRef>` 元素

6. **验证 XML 结构**
   - [ ] **关键验证**: `<dmRef>` 标签**不应包含** `xlink:type` 属性
   - [ ] **关键验证**: `<dmRef>` 标签**不应包含** `xlink:show` 属性
   - [ ] **关键验证**: `<dmRef>` 标签**不应包含** `xlink:actuate` 属性
   - [ ] 确认 `<dmRef>` 包含 `<dmRefIdent>` 子元素
   - [ ] 确认 `<dmRefIdent>` 包含 `<dmCode>` 元素

   **期望的 XML 结构**:
   ```xml
   <dmRef>
     <dmRefIdent>
       <dmCode modelIdentCode="..." .../>
       <issueInfo issueNumber="..." inWork="..."/>
       <language languageIsoCode="zh" countryIsoCode="CN"/>
     </dmRefIdent>
   </dmRef>
   ```

   **不应出现的结构**:
   ```xml
   <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
     ...
   </dmRef>
   ```

7. **执行 Schema 校验**
   - [ ] 点击"校验"按钮（顶部工具栏）
   - [ ] 等待校验完成
   - [ ] 查看"校验情况"对话框

8. **验证校验结果**
   - [ ] **关键验证**: **不应出现** 与 xlink 相关的错误
   - [ ] 具体检查：校验错误列表中**不应包含**以下错误:
     ```
     Attribute 'xlink_type' is not allowed to appear in element 'dmRef'
     Attribute 'xlink_show' is not allowed to appear in element 'dmRef'
     Attribute 'xlink_actuate' is not allowed to appear in element 'dmRef'
     ```
   - [ ] 如果有其他校验错误（非 xlink 相关），记录但不属于本次修复范围

#### 测试2: 口盖 + DM 引用

重复上述步骤，但使用"口盖" Tab 而不是"区域" Tab：

- [ ] 切换到"口盖" Tab
- [ ] 点击"增加"按钮
- [ ] 填写口盖信息并添加 DM 引用
- [ ] 验证生成的 XML 中 `<accessPointRef>` 下的 `<dmRef>` 不包含 xlink 属性
- [ ] 执行校验，确认无 xlink 相关错误

#### 测试3: 旧数据向下兼容

如果有已经保存的旧数据（包含 xlink 属性）：

- [ ] 打开旧的 DM（包含带 xlink 属性的 dmRef）
- [ ] 切换到设计视图
- [ ] **不做任何修改**，直接点击"保存"
- [ ] 切换到源码视图
- [ ] 验证 xlink 属性是否被自动清理
- [ ] 执行校验，确认无 xlink 相关错误

---

## 📸 证据收集

### 截图要求

1. **修复前的状态**（如果可复现）
   - [ ] 源码视图中包含 xlink 属性的 dmRef
   - [ ] 校验错误对话框，显示 xlink 相关错误

2. **修复后的状态**
   - [ ] 源码视图中不包含 xlink 属性的 dmRef
   - [ ] 校验通过（或无 xlink 相关错误）

### 日志收集

如果验证失败，收集：

- [ ] 浏览器控制台日志
- [ ] Network 面板中的 API 请求/响应
- [ ] 生成的完整 XML 内容
- [ ] 校验错误详情

---

## ✅ 验收标准

### 功能验收

- [x] 修复代码已提交
- [x] 单元测试通过
- [x] 集成测试通过
- [ ] Playwright 测试通过
- [ ] 手动浏览器测试通过

### 关键验收点

1. **XML 结构正确**
   - [ ] `<dmRef>` 不包含 xlink:type
   - [ ] `<dmRef>` 不包含 xlink:show
   - [ ] `<dmRef>` 不包含 xlink:actuate
   - [ ] `<dmRef>` 包含必要的子元素（dmRefIdent / dmCode 等）

2. **Schema 校验通过**
   - [ ] 无 xlink 相关的校验错误
   - [ ] 校验器不再报告 cvc-complex-type.3.2.2 错误

3. **功能正常**
   - [ ] 区域 DM 引用正常添加
   - [ ] 口盖 DM 引用正常添加
   - [ ] PM 引用正常工作
   - [ ] 保存后能正确重新加载

4. **向下兼容**
   - [ ] 旧数据（带 xlink 属性）能正常加载
   - [ ] 重新保存后 xlink 属性被自动清理

---

## 🚨 常见问题排查

### 问题1: 修改代码后，浏览器中看到的还是旧代码

**原因**: 浏览器缓存或开发服务器未重新编译

**解决方案**:
1. 硬刷新浏览器（Ctrl + F5 或 Cmd + Shift + R）
2. 清除浏览器缓存
3. 重启开发服务器（`npm run dev`）
4. 检查 webpack 编译输出，确认文件已重新编译

### 问题2: 校验仍然报 xlink 错误

**排查步骤**:
1. 确认修改的代码是否生效（检查 Network 面板中的 JS 文件）
2. 查看源码视图中的 XML，确认 dmRef 是否包含 xlink 属性
3. 如果包含，说明修复未生效或有其他地方生成了 dmRef
4. 检查 buildDmRefXml 函数是否被正确调用

**调试技巧**:
- 在 `buildDmRefXml` 函数开头添加 `console.log('buildDmRefXml called', refData)`
- 在 `preliminaryRqmtsConverter.js` 的 forEach 中添加日志
- 查看浏览器控制台输出

### 问题3: 旧数据的 xlink 没有被清理

**原因**: 可能 d.xml 为空，或修复的代码未覆盖所有路径

**检查**:
1. 确认 `preliminaryRqmtsConverter.js` 是否已修改为始终调用 `buildDmRefXml(d)`
2. 确认 `buildDmRefXml` 函数中的正则表达式清理逻辑正确

---

## 📝 验证记录

### 自动化测试

| 测试类型 | 测试文件 | 结果 | 日期 | 备注 |
|---------|---------|-----|------|-----|
| 单元测试 | test-buildDmRefXml.js | ✅ 通过 | 2026-11-17 | buildDmRefXml 逻辑正确 |
| 集成测试 | test-preliminaryRqmts-integration.js | ✅ 通过 | 2026-11-17 | 完整数据流正确 |
| E2E 测试 | preliminary-rqmts-dmref-xlink-validation.spec.js | ⏳ 待运行 | - | - |

### 手动测试

| 测试场景 | 结果 | 测试人员 | 日期 | 备注 |
|---------|-----|---------|------|-----|
| 新增区域 + DM 引用 | ⏳ 待测试 | - | - | - |
| 新增口盖 + DM 引用 | ⏳ 待测试 | - | - | - |
| 旧数据向下兼容 | ⏳ 待测试 | - | - | - |
| Schema 校验通过 | ⏳ 待测试 | - | - | - |

---

## 🎯 后续步骤

1. [ ] 运行 Playwright 端到端测试
2. [ ] 执行完整的手动浏览器测试
3. [ ] 收集截图和日志证据
4. [ ] 填写验证记录表
5. [ ] 如果所有测试通过，标记修复为"已验证"
6. [ ] 如果有失败的测试，记录问题并进一步调查

---

**文档创建日期**: 2026-11-17  
**创建人员**: Claude (Kiro)  
**文档版本**: v1.0
