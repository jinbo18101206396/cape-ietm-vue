# MainProcedureDesigner 对话框自动化测试

## 📦 测试文件

- **测试脚本**：`tests/mainprocedure-dialog-regression.spec.js`
- **测试用例数**：15+ 个测试用例
- **测试覆盖**：P0 核心功能、P1 兼容性、P2 性能、P3 回归

---

## 🚀 快速开始

### 1. 前置准备

确保以下服务正在运行：

```bash
# 启动前端开发服务器
npm run serve

# 在另一个终端启动后端服务（如需要）
# cd backend && npm start
```

### 2. 修改测试配置

编辑 `tests/mainprocedure-dialog-regression.spec.js` 文件，修改测试配置：

```javascript
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  loginURL: '/user/login',
  mainProcedureURL: '/ietm/datamodule',
  username: 'admin',        // ⚠️ 替换为实际测试账号
  password: 'admin123',     // ⚠️ 替换为实际测试密码
};
```

**重要提示**：
- 确保测试账号有权限访问数据模块管理
- 确保系统中至少有一个包含 mainProcedure 的数据模块

---

## 🎯 运行测试

### 方式1：无头模式（CI/CD 推荐）

```bash
# 运行所有测试
npm run test:mainprocedure

# 查看测试报告
npm run test:e2e:report
```

### 方式2：可视化模式（推荐用于调试）

```bash
# 打开浏览器可视化运行
npm run test:mainprocedure:headed
```

**优点**：
- 可以实时看到浏览器操作
- 方便发现问题
- 速度快（无需等待视频录制）

### 方式3：调试模式（用于问题排查）

```bash
# 逐步调试
npm run test:mainprocedure:debug
```

**功能**：
- 逐步执行测试
- 可以在任意步骤暂停
- 可以手动操作页面
- 可以查看详细日志

---

## 📊 测试用例说明

### P0 核心功能测试（7个）

| 测试用例 | 验证内容 | 预期结果 |
|---------|---------|---------|
| P0-1 | 内部引用对话框打开/关闭 | 平滑打开，无重复对话框 |
| P0-2 | 快速连续点击 | 仅弹出1个对话框 |
| P0-3 | 内容插入 | 文本正确插入编辑器 |
| P0-4 | DM引用对话框 | 正常打开和关闭 |
| P0-5 | 图符对话框 | 正常打开和关闭 |
| P0-6 | 状态重置 | 重新打开时状态正确 |
| P0-7 | 多Tab一致性 | 所有Tab功能一致 |

### P1 兼容性测试（1个）

| 测试用例 | 验证内容 | 预期结果 |
|---------|---------|---------|
| P1-1 | 与 LevelledParaDesigner 对比 | 打开速度相近（差异<500ms） |

### P2 性能与稳定性测试（2个）

| 测试用例 | 验证内容 | 预期结果 |
|---------|---------|---------|
| P2-1 | 重复打开关闭20次 | 无内存泄漏，无残留对话框 |
| P2-2 | 控制台日志 | 无错误日志 |

### P3 现有功能回归测试（2个）

| 测试用例 | 验证内容 | 预期结果 |
|---------|---------|---------|
| P3-1 | 步骤树操作 | 添加子步骤功能正常 |
| P3-2 | 保存功能 | 内容正确保存 |

### 视觉回归测试（3个，可选）

| 测试用例 | 验证内容 | 预期结果 |
|---------|---------|---------|
| 视觉-1 | 内部引用对话框截图 | 与基准一致 |
| 视觉-2 | DM引用对话框截图 | 与基准一致 |
| 视觉-3 | 图符对话框截图 | 与基准一致 |

---

## 🎨 测试报告示例

运行测试后，会生成以下报告：

```
Running 15 tests using 1 worker

  ✓ P0-1: 内部引用对话框 - 正常打开和关闭 (2.3s)
  ✓ P0-2: 内部引用对话框 - 快速连续点击不产生重复对话框 (1.8s)
  ✓ P0-3: 内部引用 - 内容正确插入 (3.1s)
  ✓ P0-4: DM引用对话框 - 正常打开和关闭 (2.1s)
  ✓ P0-5: 图符对话框 - 正常打开和关闭 (2.0s)
  ✓ P0-6: 对话框取消后重新打开 - 状态正确重置 (3.5s)
  ✓ P0-7: 多个Tab下的对话框功能一致 (8.2s)
  ✓ P1-1: 对比 MainProcedureDesigner 和 LevelledParaDesigner 的对话框行为 (5.4s)
  ✓ P2-1: 对话框重复打开关闭 20 次 - 无内存泄漏 (12.6s)
  ✓ P2-2: 控制台无错误日志 (2.8s)
  ✓ P3-1: 步骤树操作不受影响 (1.5s)
  ✓ P3-2: 保存功能正常 (3.7s)

15 passed (52.0s)
```

---

## 🐛 常见问题排查

### 问题1：登录失败

**错误信息**：`Timeout 10000ms exceeded waiting for URL`

**原因**：登录凭证不正确或登录页面路径错误

**解决方案**：
1. 检查 `TEST_CONFIG.username` 和 `password` 是否正确
2. 检查 `loginURL` 路径是否正确
3. 手动打开 http://localhost:3000/user/login 验证

---

### 问题2：找不到数据模块

**错误信息**：`locator('table tbody tr').first()` 超时

**原因**：测试账号没有数据模块或页面路径错误

**解决方案**：
1. 确保测试账号至少有一个包含 mainProcedure 的数据模块
2. 检查 `mainProcedureURL` 路径是否正确
3. 手动导航验证路径

---

### 问题3：找不到富文本编辑器

**错误信息**：`waitForSelector('.edui-default')` 超时

**原因**：UEditor 未正确加载或选择器错误

**解决方案**：
1. 检查 UEditor 是否正确安装
2. 增加等待时间：`await page.waitForTimeout(2000)`
3. 使用调试模式逐步排查：`npm run test:mainprocedure:debug`

---

### 问题4：对话框选择器不正确

**错误信息**：`locator('button[title="内部引用"]')` 找不到

**原因**：按钮的 title 属性与实际不符

**解决方案**：
1. 手动打开页面，在开发者工具中检查按钮的实际属性
2. 修改选择器为实际的 class 或其他属性
3. 例如：改为 `button:has-text("内部引用")`

---

## 🔧 自定义测试

### 添加新的测试用例

在 `tests/mainprocedure-dialog-regression.spec.js` 中添加：

```javascript
test('自定义测试: 描述', async ({ page }) => {
  // 1. 准备测试环境
  await openContentEditor(page, '警告');

  // 2. 执行操作
  await page.click('你的选择器');

  // 3. 验证结果
  expect(结果).toBe(预期);
});
```

### 修改等待时间

如果测试不稳定，可以调整等待时间：

```javascript
// 增加对话框动画等待时间
async function waitForDialogAnimation(page, timeout = 1000) {
  await page.waitForTimeout(timeout); // 从 500ms 改为 1000ms
}
```

### 跳过特定测试

如果某个测试暂时无法通过，可以跳过：

```javascript
test.skip('P0-1: 内部引用对话框 - 正常打开和关闭', async ({ page }) => {
  // 测试代码
});
```

---

## 📈 持续集成（CI/CD）

### 集成到 Jenkins/GitLab CI

```yaml
# .gitlab-ci.yml 示例
test:
  stage: test
  script:
    - npm install
    - npm run serve &  # 后台启动服务
    - sleep 10         # 等待服务启动
    - npm run test:mainprocedure
  artifacts:
    when: always
    paths:
      - test-results/
    reports:
      junit: test-results/results.xml
```

### GitHub Actions 示例

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run serve &
      - run: sleep 10
      - run: npm run test:mainprocedure
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

---

## 📚 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [Ant Design Vue 测试指南](https://www.antdv.com/docs/vue/introduce-cn/)
- [UEditor API 文档](http://fex.baidu.com/ueditor/)

---

## ✅ 测试通过标准

所有测试通过后，应该看到：

- ✅ P0 核心功能：7/7 通过
- ✅ P1 兼容性：1/1 通过
- ✅ P2 性能：2/2 通过
- ✅ P3 回归：2/2 通过

**总通过率：100%（12/12）**

视觉回归测试为可选项，首次运行会生成基准截图，后续运行会对比差异。
