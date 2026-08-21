# Playwright E2E测试文档

## 📋 测试概述

本测试套件用于验证IETM系统的"复制DM"功能，包括前端界面交互和端到端业务流程。

## 🎯 测试范围

### 已覆盖功能
- ✅ 复制DM（前端标记）
- ✅ 复制新建DM（创建新记录）
- ✅ SNS自动计算
- ✅ 技术名称自动提取
- ✅ DMC编码生成（含前缀）
- ✅ 学习码字段（培训类DM）
- ✅ 字段修改和DMC预览
- ✅ 表单校验
- ✅ 错误处理

### 测试类型
1. **快速验证测试** (`quick-verify.spec.js`) - 静态验证，无需服务运行
2. **完整E2E测试** (`copy-dm.spec.js`) - 完整业务流程，需要服务运行

## 🚀 快速开始

### 1. 安装依赖

```bash
cd D:\workspace\IETM\cape-ietm-vue
npm install
```

### 2. 安装Playwright浏览器

```bash
npx playwright install chromium
```

### 3. 运行测试

#### Windows系统

```batch
# 运行快速验证测试（无需服务运行）
run-e2e-tests.bat quick

# 运行完整E2E测试（需要服务运行）
run-e2e-tests.bat full

# 运行所有测试
run-e2e-tests.bat

# 启动UI模式（可视化调试）
run-e2e-tests.bat ui

# 启动调试模式
run-e2e-tests.bat debug
```

#### Linux/Mac系统

```bash
# 给脚本添加执行权限
chmod +x run-e2e-tests.sh

# 运行测试
./run-e2e-tests.sh quick
./run-e2e-tests.sh full
./run-e2e-tests.sh ui
```

### 4. 查看测试报告

```bash
npx playwright show-report test-results/html
```

## ⚙️ 测试配置

### 环境变量

在 `tests/e2e/config.js` 中配置，或通过环境变量覆盖：

```bash
# Windows
set BASE_URL=http://localhost:3000
set API_BASE_URL=http://localhost:9999/jeecg-boot
set TEST_USERNAME=admin
set TEST_PASSWORD=admin123

# Linux/Mac
export BASE_URL=http://localhost:3000
export API_BASE_URL=http://localhost:9999/jeecg-boot
export TEST_USERNAME=admin
export TEST_PASSWORD=admin123
```

### 测试数据配置

编辑 `tests/e2e/config.js`：

```javascript
testData: {
  sourceDm: {
    dmcCode: 'DMC-DDN-A-A1-ZBBM02-A-A-000-00',
    techName: '动力系统基本信息'
  },
  targetNode: {
    name: 'DDN 动力系统',
    expectedSns: 'DDN-A-A1'
  },
  copyData: {
    infoCode: 'ZBBM03',
    infoCodeVariant: 'B',
    learnCode: '001',
    learnEventCode: 'A'
  }
}
```

## 📂 文件结构

```
cape-ietm-vue/
├── playwright.config.js              # Playwright配置
├── run-e2e-tests.bat                 # Windows测试脚本
├── run-e2e-tests.sh                  # Linux/Mac测试脚本
├── tests/
│   └── e2e/
│       ├── config.js                 # 测试配置
│       ├── page-objects/
│       │   └── dm-pages.js          # 页面对象模型
│       └── dm-copy/
│           ├── quick-verify.spec.js  # 快速验证测试
│           └── copy-dm.spec.js      # 完整E2E测试
└── test-results/
    ├── screenshots/                  # 测试截图
    └── html/                        # HTML测试报告
```

## 🧪 测试用例

### 快速验证测试 (quick-verify.spec.js)

**无需服务运行**，只验证代码和文件：

| # | 测试名称 | 验证内容 |
|---|---------|---------|
| 1 | 登录页面访问 | 页面元素存在 |
| 2 | 复制按钮存在 | 按钮HTML存在 |
| 3 | DmCopyModal组件 | Vue组件文件存在、包含必要字段 |
| 4 | 后端API端点 | 服务可访问性 |
| 5 | 数据库SQL文件 | SQL文件存在、包含必要语句 |

### 完整E2E测试 (copy-dm.spec.js)

**需要服务运行**，完整业务流程测试：

| # | 测试名称 | 测试步骤 | 预期结果 |
|---|---------|---------|---------|
| 1 | 复制DM（前端标记） | 选择DM → 点击复制 | 显示成功消息 |
| 2 | 复制新建DM（不修改） | 复制 → 选择节点 → 复制新建 → 提交 | SNS自动计算、技术名称提取、保存成功 |
| 3 | 复制新建DM（修改字段） | 复制 → 复制新建 → 修改信息码 → 提交 | DMC预览更新、保存成功 |
| 4 | 培训类DM（学习码） | 复制 → 复制新建 → 设置学习码 → 提交 | 学习码保存成功 |
| 5 | 错误处理（未复制） | 直接点击复制新建 | 显示错误提示 |

## 📸 测试截图

测试运行时会自动保存截图到 `test-results/screenshots/`：

- `01-copy-dm-success.png` - 复制DM成功
- `02-copy-new-modal-opened.png` - 复制新建弹窗
- `02-copy-new-success.png` - 复制新建成功
- `03-copy-new-modified.png` - 修改字段后的表单
- `03-copy-new-modified-result.png` - 修改后的结果
- `04-training-dm-learn-code.png` - 学习码设置
- `04-training-dm-result.png` - 培训DM结果
- `05-error-no-copy.png` - 错误提示

## 🐛 调试技巧

### 1. 使用UI模式

```bash
npx playwright test --ui
```

可视化界面，逐步执行测试，查看每一步的状态。

### 2. 使用调试模式

```bash
npx playwright test --debug
```

会暂停执行，可以在浏览器开发者工具中检查页面状态。

### 3. 查看追踪记录

测试失败时会自动记录追踪：

```bash
npx playwright show-trace test-results/trace.zip
```

### 4. 增加等待时间

如果页面加载慢，可以在 `playwright.config.js` 中增加超时时间：

```javascript
timeout: 90 * 1000,  // 90秒
```

### 5. 无头模式关闭

在 `playwright.config.js` 中添加：

```javascript
use: {
  headless: false,  // 显示浏览器窗口
  slowMo: 500,      // 每步操作延迟500ms
}
```

## ⚠️ 注意事项

### 1. 服务启动

完整E2E测试需要以下服务运行：

- **前端服务**: `npm run serve` (默认端口3000)
- **后端服务**: Spring Boot应用 (默认端口9999)
- **数据库**: 达梦DM8数据库

### 2. 数据准备

测试前确保：

- ✅ 数据库已执行SQL脚本（学习码字段）
- ✅ 存在可用的测试数据（至少1条DM记录）
- ✅ 存在可用的构型树节点

### 3. 登录验证码

如果系统启用了验证码，测试会暂停10秒等待手动输入。可以：

- 选项1：临时关闭验证码
- 选项2：使用固定验证码（开发环境）
- 选项3：修改测试代码跳过验证码

### 4. 测试数据隔离

建议使用测试专用的数据库或数据，避免影响生产数据。

### 5. CI/CD集成

在CI环境中运行时，设置环境变量：

```yaml
env:
  CI: true
  BASE_URL: http://test-server:3000
  TEST_USERNAME: test_user
  TEST_PASSWORD: test_pass
```

## 📊 测试结果示例

### 成功运行

```
Running 5 tests using 1 worker

  ✓ 应该能够成功复制DM（前端标记） (15s)
  ✓ 应该能够复制新建DM（继承所有字段） (25s)
  ✓ 应该能够复制新建DM并修改字段 (28s)
  ✓ 应该能够复制培训类DM并设置学习码 (30s)
  ✓ 应该正确处理未复制直接新建的错误 (8s)

  5 passed (1.8m)
```

### HTML报告

打开 `test-results/html/index.html` 查看：

- 测试通过/失败统计
- 每个测试的详细步骤
- 截图和视频
- 错误堆栈信息

## 🔧 故障排除

### 问题1：无法访问页面

**症状**: `net::ERR_CONNECTION_REFUSED`

**解决**:
1. 检查前端服务是否启动：`npm run serve`
2. 检查BASE_URL配置是否正确
3. 检查防火墙设置

### 问题2：登录失败

**症状**: 停留在登录页

**解决**:
1. 检查用户名密码是否正确
2. 检查后端服务是否启动
3. 手动登录验证账号可用性

### 问题3：找不到元素

**症状**: `Timeout waiting for selector`

**解决**:
1. 增加等待时间
2. 检查选择器是否正确
3. 检查页面是否正确加载

### 问题4：DMC重复

**症状**: "DMC编码重复"错误

**解决**:
1. 修改测试数据中的infoCode
2. 清理测试数据库
3. 使用随机生成的编码

## 📚 参考资料

- [Playwright官方文档](https://playwright.dev/)
- [Playwright测试最佳实践](https://playwright.dev/docs/best-practices)
- [Page Object Model模式](https://playwright.dev/docs/pom)
- [Playwright选择器](https://playwright.dev/docs/selectors)

## 🤝 贡献

如需添加新的测试用例：

1. 在 `tests/e2e/dm-copy/` 目录下创建新的 `.spec.js` 文件
2. 引入 `page-objects/dm-pages.js` 中的页面对象
3. 编写测试用例并提交PR

## 📝 更新日志

### v1.0.0 (2026-07-23)
- ✅ 初始版本
- ✅ 支持复制DM和复制新建DM测试
- ✅ 支持学习码字段测试
- ✅ 快速验证测试
- ✅ HTML测试报告
