# Para设计器真实浏览器测试指南

**测试套件**: para-real-browser-complete.spec.js  
**测试环境**: Playwright + 真实浏览器 + 真实后端API  
**创建日期**: 2026-09-25

---

## 📋 测试概述

### 测试目标
对标旧系统，验证新系统Para设计器的全流程功能，确保：
- 源码视图 → 设计视图 → 编辑 → 源码视图的完整往返
- 所有转换规则100%正确
- CRITICAL bug（td内多个para残留标签）已修复
- 性能符合预期

### 测试范围
- ✅ 基础文本编辑往返
- ✅ 复杂嵌套列表（randomList/sequentialList 3层嵌套）
- ✅ definitionList表格（特别是td内多个para）
- ✅ 混合格式（emphasis/superScript/subScript）
- ✅ 大文档性能（50个para）

---

## 🛠️ 环境准备

### 1. 安装依赖
```bash
cd D:/workspace/IETM/cape-ietm-vue

# 安装Playwright（如果尚未安装）
npm install -D @playwright/test

# 安装浏览器驱动
npx playwright install chromium
```

### 2. 启动后端服务
```bash
# 确保Java后端正在运行
# 默认地址: http://localhost:9999
```

### 3. 启动前端服务
```bash
# 开发模式
npm run serve
# 前端地址: http://localhost:3000

# 或部署模式（推荐测试部署后的版本）
# 使用Nginx/Apache服务已部署的dist目录
```

### 4. 准备测试数据
确保数据库中有以下测试数据：
- 至少1个可编辑的DM（数据模块）
- DM包含可编辑的内容区域
- 测试账号: admin / admin123

---

## ▶️ 运行测试

### 方式1: 运行所有场景（推荐）
```bash
cd D:/workspace/IETM/cape-ietm-vue

# 运行全部5个场景
npx playwright test tests/e2e/para-real-browser-complete.spec.js

# 带UI模式运行（可以看到浏览器操作）
npx playwright test tests/e2e/para-real-browser-complete.spec.js --ui

# 生成HTML报告
npx playwright test tests/e2e/para-real-browser-complete.spec.js --reporter=html
npx playwright show-report
```

### 方式2: 运行单个场景
```bash
# 只运行场景1（基础文本）
npx playwright test tests/e2e/para-real-browser-complete.spec.js -g "场景1"

# 只运行场景3（CRITICAL bug验证）
npx playwright test tests/e2e/para-real-browser-complete.spec.js -g "场景3"
```

### 方式3: 调试模式
```bash
# 逐步调试
npx playwright test tests/e2e/para-real-browser-complete.spec.js --debug

# 慢速模式（每步操作间隔1秒）
npx playwright test tests/e2e/para-real-browser-complete.spec.js --headed --slow-mo=1000
```

---

## 🎯 测试场景详解

### 场景1: 基础文本编辑往返验证
**目标**: 验证最基本的para2html/html2para流程

**步骤**:
1. 进入数据模块列表
2. 打开第一个DM的编辑器
3. 定位到第一个para元素
4. 点击gutter铅笔图标进入设计视图
5. 在UEditor中添加文本
6. 保存并返回源码视图
7. 验证新文本已正确反映到XML

**预期结果**:
- ✅ 设计视图正确打开
- ✅ XML→HTML转换正确
- ✅ 编辑内容已保存
- ✅ HTML→XML转换正确
- ✅ 无残留标签

---

### 场景2: 复杂嵌套列表编辑验证
**目标**: 验证randomList/sequentialList的3层嵌套

**测试XML**:
```xml
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
```

**预期结果**:
- ✅ randomList正确转换为`<ul>`
- ✅ sequentialList正确转换为`<ol>`
- ✅ listItem正确转换为`<li>`
- ✅ 嵌套结构完整保留
- ✅ 新增列表项正确转换回XML

---

### 场景3: definitionList表格编辑验证 ⭐ CRITICAL
**目标**: 验证td内多个para的CRITICAL bug已修复

**测试XML**:
```xml
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
  </definitionList>
</para>
```

**预期结果**:
- ✅ definitionList正确转换为`<table deflist="1">`
- ✅ listItemTerm正确转换为`<th>`
- ✅ listItemDefinition正确转换为`<td>`
- ✅ **关键**: td内3个para全部保留，无残留`</td>`标签
- ✅ 新增表格行正确转换回XML

**验证重点**:
```javascript
// 不应该出现这种情况
❌ </para></td></td>  // 残留的</td>标签

// 应该是这样
✅ </para></listItemDefinition>
```

---

### 场景4: 混合内容编辑验证
**目标**: 验证emphasis/superScript/subScript等混合使用

**测试XML**:
```xml
<para>普通文本 <emphasis>强调文本</emphasis> H<subScript>2</subScript>O X<superScript>2</superScript> 结束</para>
```

**预期结果**:
- ✅ emphasis正确转换为`<strong>`
- ✅ subScript正确转换为`<sub>`
- ✅ superScript正确转换为`<sup>`
- ✅ 混合格式正确往返转换

---

### 场景5: 大文档性能测试
**目标**: 验证包含50个para的大文档性能

**预期性能指标**:
- 插入50个para: <5000ms
- 打开设计视图: <3000ms
- 编辑内容: <1000ms
- 保存修改: <2000ms

**验证重点**:
- ✅ 大文档不应导致浏览器卡顿
- ✅ 内存使用在合理范围内（<150MB）
- ✅ 所有操作响应及时

---

## 📊 测试结果解读

### 成功的测试输出
```
✅ Para设计器真实浏览器完整验证

  ✓ 场景1: 基础文本编辑往返验证 (8.2s)
  ✓ 场景2: 复杂嵌套列表编辑验证 (10.5s)
  ✓ 场景3: definitionList表格编辑验证 (12.3s)
  ✓ 场景4: 混合内容编辑验证 (7.8s)
  ✓ 场景5: 大文档性能测试 (15.6s)

  5 passed (54s)
```

### 失败的测试输出示例
```
✗ 场景3: definitionList表格编辑验证 (12.3s)

  Error: expect(received).toBeNull()

  Expected: null
  Received: ["</td>"]

  验证失败: 发现残留</td>标签
```

---

## 🔧 故障排查

### 问题1: 登录失败
**错误**: `Timeout waiting for /dashboard`

**原因**: 
- 后端服务未启动
- 测试账号不存在
- 网络问题

**解决**:
```bash
# 检查后端服务
curl http://localhost:9999/jeecg-boot/sys/login

# 检查测试账号
# 确认数据库中存在 admin / admin123
```

### 问题2: 找不到para元素
**错误**: `⚠️ 未找到para元素，跳过测试`

**原因**: 测试DM没有可编辑的para元素

**解决**:
1. 手动创建一个包含para的测试DM
2. 或修改测试脚本使用已知的测试DM ID

### 问题3: UEditor加载失败
**错误**: `Timeout waiting for #para_ueditor`

**原因**:
- UEditor资源未正确加载
- JavaScript错误

**解决**:
```bash
# 检查UEditor文件
ls public/static/ueditor/

# 检查浏览器控制台
# 查看是否有404或JavaScript错误
```

### 问题4: 性能测试超时
**错误**: `Test timeout of 60000ms exceeded`

**原因**:
- 系统性能不足
- 网络延迟

**解决**:
```javascript
// 增加超时时间
test.setTimeout(120000)  // 改为120秒
```

---

## 📈 性能优化建议

如果场景5性能测试失败，可以尝试：

1. **优化para2html**:
```javascript
// 缓存正则表达式
const PARA_REGEX = /<para>/g
// 避免重复编译
```

2. **优化html2para**:
```javascript
// 使用更高效的字符串替换
.replaceAll() 代替 .replace(/xxx/g, ...)
```

3. **优化UEditor初始化**:
```javascript
// 延迟加载非关键功能
toolbars: [['undo', 'redo', 'bold']]  // 只加载必要按钮
```

---

## 🎓 测试最佳实践

### 1. 测试前准备
- ✅ 确保后端服务稳定运行
- ✅ 清除浏览器缓存
- ✅ 准备干净的测试数据
- ✅ 检查磁盘空间（截图/录像需要空间）

### 2. 测试中注意
- ✅ 逐个场景运行，不要一次性全部运行
- ✅ 观察浏览器控制台，记录错误信息
- ✅ 保存失败时的截图
- ✅ 记录性能数据

### 3. 测试后分析
- ✅ 对比旧系统行为
- ✅ 分析性能瓶颈
- ✅ 记录改进建议
- ✅ 更新测试用例

---

## 📚 参考资料

- **Para设计器源码**: `src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue`
- **转换工具源码**: `src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js`
- **单元测试**: `tests/verification/para-full-flow-verification.js`
- **对标报告**: `tests/verification/old-new-system-comparison.md`
- **Playwright文档**: https://playwright.dev/

---

## ✅ 测试检查清单

运行测试前，请确认：

- [ ] 后端服务正在运行（http://localhost:9999）
- [ ] 前端服务正在运行（http://localhost:3000）
- [ ] Playwright已安装（`npx playwright --version`）
- [ ] 浏览器驱动已安装（chromium）
- [ ] 测试账号可用（admin/admin123）
- [ ] 数据库中有测试DM数据
- [ ] 磁盘空间充足（>1GB用于截图）

运行测试后，请验证：

- [ ] 所有5个场景都通过
- [ ] 无JavaScript控制台错误
- [ ] 无残留标签
- [ ] 性能符合预期
- [ ] 生成了HTML测试报告

---

**测试负责人**: ____________  
**测试日期**: ____________  
**测试结果**: [ ] 全部通过 [ ] 部分失败 [ ] 全部失败  
**备注**: ________________________________
