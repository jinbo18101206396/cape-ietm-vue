# Table Designer 测试执行指南

## 版本信息
- **版本**：1.0
- **日期**：2026-10-19
- **测试框架**：Playwright 1.61.1

---

## 📋 测试文件概览

### 1. 单元测试（已完成 ✅）
**文件**: `tests/tableConverter.test.spec.js`  
**框架**: Jest  
**用例数**: 33  
**状态**: ✅ 全部通过  

**执行命令**:
```bash
npm run test:unit -- tests/tableConverter.test.spec.js
```

**覆盖范围**:
- HTML清理和验证（4个测试）
- colspan/rowspan公式（6个测试）
- 表格行处理（4个测试）
- XML转义处理（4个测试）
- 中英文标签映射（5个测试）
- 列数计算逻辑（3个测试）
- 双向转换可逆性（4个测试）
- 边界情况处理（4个测试）

---

### 2. E2E测试（已完成 ✅）
**文件**: `tests/e2e/table-designer-e2e.spec.js`  
**框架**: Playwright  
**用例数**: 16  
**状态**: ✅ 已转换为Playwright语法  

**执行命令**:
```bash
# 无头模式运行
npm run test:e2e -- tests/e2e/table-designer-e2e.spec.js

# UI模式运行（推荐）
npm run test:e2e:ui

# 有头模式运行（浏览器可见）
npx playwright test tests/e2e/table-designer-e2e.spec.js --headed

# Debug模式
npx playwright test tests/e2e/table-designer-e2e.spec.js --debug
```

**测试模块**:
- **模块1**: 表格设计器打开和初始化（3个测试）
  - TEST-001: 双击树节点打开Table Designer
  - TEST-002: 显示工具栏和属性编辑区
  - TEST-003: 显示30个工具栏按钮

- **模块2**: 表格编辑功能（4个测试）
  - TEST-004: 编辑表格标题
  - TEST-005: 编辑表格内容
  - TEST-006: 插入新行
  - TEST-007: 设置表头行

- **模块3**: 保存和双向转换验证（3个测试）
  - TEST-008: 保存表格写入源码
  - TEST-009: 编辑→保存→重新打开数据一致
  - TEST-010: colspan/rowspan正确转换

- **模块4**: 表格特殊操作（3个测试）
  - TEST-011: 合并单元格
  - TEST-012: 拆分单元格
  - TEST-013: 删除表格

- **模块5**: 错误处理和边界情况（3个测试）
  - TEST-014: 空表格保存警告
  - TEST-015: UEditor初始化失败提示
  - TEST-016: 大表格（10x10）处理

---

### 3. 集成测试（已完成 ✅）
**文件**: `tests/e2e/table-designer-integration.spec.js`  
**框架**: Playwright  
**用例数**: 9  
**状态**: ✅ 已转换为Playwright语法  

**执行命令**:
```bash
npm run test:e2e -- tests/e2e/table-designer-integration.spec.js
```

**测试模块**:
- **模块1**: DmContentEditor集成（3个测试）
  - TEST-017: 从DM编辑器查找table节点
  - TEST-018: 正确初始化Table Designer
  - TEST-019: 保存后更新源码

- **模块2**: 多表格编辑（2个测试）
  - TEST-020: 编辑多个表格不相互影响
  - TEST-021: 编辑后返回显示保存提示

- **模块3**: 表格与段落混合编辑（2个测试）
  - TEST-022: 同一DM中编辑表格和段落
  - TEST-023: 保存表格后切换到段落编辑

- **模块4**: 撤销/重做功能（2个测试）
  - TEST-024: 使用工具栏撤销按钮
  - TEST-025: 撤销后使用重做按钮

---

### 4. 性能测试（已完成 ✅）
**文件**: `tests/e2e/table-designer-performance.spec.js`  
**框架**: Playwright  
**用例数**: 11  
**状态**: ✅ 已转换为Playwright语法  

**执行命令**:
```bash
npm run test:e2e -- tests/e2e/table-designer-performance.spec.js
```

**性能指标**:
- **模块1**: 初始化性能（2个测试）
  - TEST-026: 初始化时间 < 3秒
  - TEST-027: 工具栏渲染 < 500ms

- **模块2**: 编辑性能（3个测试）
  - TEST-028: 小表格（3x3）响应 < 100ms
  - TEST-029: 中表格（5x5）响应 < 300ms
  - TEST-030: 大表格（10x10）响应 < 1000ms

- **模块3**: 转换性能（2个测试）
  - TEST-031: HTML→XML转换 < 500ms
  - TEST-032: XML→HTML转换 < 500ms

- **模块4**: 内存和稳定性（2个测试）
  - TEST-033: 长时间编辑无内存泄漏
  - TEST-034: 连续打开/关闭无资源泄漏

- **模块5**: 渲染性能（2个测试）
  - TEST-035: 按钮点击响应 < 50ms
  - TEST-036: 属性编辑输入响应 < 50ms

---

## 🚀 快速开始

### 前置条件
1. 确保开发服务器运行:
```bash
npm run serve
```

2. 等待webpack编译完成:
```
webpack 5.99.0 compiled successfully in 45678 ms
```

### 运行所有Table Designer测试
```bash
# E2E功能测试
npm run test:e2e -- tests/e2e/table-designer-e2e.spec.js

# 集成测试
npm run test:e2e -- tests/e2e/table-designer-integration.spec.js

# 性能测试
npm run test:e2e -- tests/e2e/table-designer-performance.spec.js
```

### 运行所有测试（包括单元测试）
```bash
# 单元测试
npm run test:unit -- tests/tableConverter.test.spec.js

# E2E全套测试
npm run test:e2e -- tests/e2e/table-designer*.spec.js
```

---

## 📊 测试统计

| 类型 | 文件数 | 用例数 | 状态 |
|-----|-------|--------|------|
| 单元测试 | 1 | 33 | ✅ 完成 |
| E2E功能测试 | 1 | 16 | ✅ 已转换 |
| 集成测试 | 1 | 9 | ✅ 已转换 |
| 性能测试 | 1 | 11 | ✅ 已转换 |
| **总计** | **4** | **69** | - |

---

## ⚙️ Playwright配置

项目使用的Playwright配置:
- **版本**: 1.61.1
- **浏览器**: Chromium, Firefox, WebKit
- **并发**: 1个worker（避免测试冲突）
- **超时**: 30秒
- **重试**: 失败时重试1次

---

## 🐛 测试前提条件

### 语法转换说明
**重要更新**：所有E2E测试已从Cypress语法转换为Playwright语法
- ✅ 使用`test.describe()`替代`describe()`
- ✅ 使用`test()`替代`it()`
- ✅ 使用`page.locator()`替代`cy.get()`
- ✅ 使用`await/async`异步语法
- ✅ 使用`expect().toBe()`断言

### 数据要求
E2E测试需要已有包含表格的DM数据模块，确保：
1. 至少有1个DM包含`<table>`元素
2. 表格包含至少1行1列的数据
3. 测试用户已登录且有编辑权限

### 环境要求
- ✅ 开发服务器运行于 `http://localhost:3000`
- ✅ 后端API可访问
- ✅ UEditor静态资源已加载
- ✅ 测试数据已准备

---

## 📝 注意事项

### E2E测试注意事项
1. **语法变更**: 所有测试已从Cypress转换为Playwright语法
2. **选择器依赖**: 测试使用了`data-testid`和类名选择器，如果组件结构变化需要更新
3. **异步等待**: 所有操作使用`await`和`waitForTimeout()`，根据实际加载速度可能需要调整
4. **数据隔离**: 每个测试应该使用独立的数据或在测试后清理
5. **UEditor依赖**: 测试依赖UEditor全局对象`window.UE`，确保已加载

### 性能测试注意事项
1. **基准值**: 性能阈值（如3秒、500ms）根据开发机性能设定，CI环境可能需要调整
2. **网络延迟**: 测试应在稳定网络环境下运行
3. **并发限制**: 性能测试应单独运行，避免与其他测试并发

---

## 🔍 调试建议

### Playwright UI模式（推荐）
```bash
npm run test:e2e:ui
```
- 可视化界面
- 逐步执行
- 查看DOM快照
- 查看网络请求

### Debug模式
```bash
npx playwright test tests/e2e/table-designer-e2e.spec.js --debug
```
- 暂停执行
- 浏览器DevTools
- 逐行调试

### 查看报告
```bash
npm run test:e2e:report
```

---

## ✅ 下一步

完成E2E测试执行后：
1. ✅ 验证所有16个E2E功能测试通过
2. ✅ 验证9个集成测试通过
3. ✅ 验证11个性能测试达标
4. 📋 生成测试报告
5. 📝 记录性能基准数据
6. 🐛 修复发现的问题
7. 📦 准备发布

---

**生成时间**: 2026-10-19  
**维护者**: IETM开发团队
