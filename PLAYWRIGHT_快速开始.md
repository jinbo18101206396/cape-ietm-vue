# Playwright 自动化测试 - 快速开始指南

## 测试状态总结

### ✅ 已完成的工作
1. **Playwright安装和配置** - 完成
2. **测试环境搭建** - 完成
3. **测试文件准备** - 完成（图片、视频、音频）
4. **基础功能测试** - 5个测试全部通过
5. **测试报告生成** - 完成

### ⚠️ 发现的问题
**项目实体管理页面无法访问（404错误）**

**原因**: 菜单配置未添加到数据库

**解决方法**: 
```sql
-- 执行以下SQL文件中的语句
-- 文件位置: src/views/ietm/icnmanage/IetmIcnManage_menu_insert.sql
```

## 如何运行测试

### 1. 基础测试（当前可用）
```bash
# 进入项目目录
cd D:\workspace\IETM\cape-ietm-vue

# 运行基础功能测试
npm run test:e2e
```

### 2. ICN预览测试（需要先配置菜单）
```bash
# 执行完菜单SQL后运行
npx playwright test tests/icn-preview.spec.js
```

### 3. UI可视化测试（推荐）
```bash
# 打开UI界面，可以看到测试运行过程
npm run test:e2e:ui
```

### 4. 查看测试报告
```bash
# 生成并查看HTML报告
npm run test:e2e:report
```

## 测试结果

### 当前测试结果
```
运行: 5个测试
通过: 5个 ✅
失败: 0个
用时: 46.2秒
```

### 测试内容
1. ✅ 登录功能测试 - 通过
2. ✅ 主页面布局测试 - 通过
3. ✅ 菜单系统测试 - 通过
4. ✅ 用户信息测试 - 通过
5. ✅ 响应式布局测试 - 通过

## 下一步操作

### 立即需要做的：
1. **执行菜单SQL** - 在数据库中运行 `IetmIcnManage_menu_insert.sql`
2. **刷新浏览器** - 确认"项目实体管理"菜单出现
3. **运行完整测试** - 执行ICN预览功能测试

### 执行SQL的步骤：
```sql
-- 1. 连接到数据库
-- 2. 打开文件: src/views/ietm/icnmanage/IetmIcnManage_menu_insert.sql
-- 3. 执行所有INSERT语句
-- 4. 确认 sys_permission 表中有新记录
```

## 调试技巧

### 如果测试失败：
1. 查看截图：`test-results/` 目录
2. 查看视频：`test-results/` 目录（失败时自动录制）
3. 查看详细日志：测试运行时的控制台输出

### 常用调试命令：
```bash
# 调试模式（逐步执行）
npx playwright test --debug tests/ietm-basic.spec.js

# 查看失败的测试
npx playwright test --last-failed

# 只运行一个测试
npx playwright test -g "登录功能测试"
```

## 文件位置

### 配置文件
- `playwright.config.js` - Playwright配置

### 测试脚本
- `tests/ietm-basic.spec.js` - 基础功能测试 ✅ 可用
- `tests/icn-preview.spec.js` - ICN预览测试 ⏸️ 需配置
- `tests/debug-*.spec.js` - 调试脚本

### 测试数据
- `tests/test-files/` - 测试用的图片、视频、音频文件

### 测试结果
- `test-results/` - 测试结果、截图、视频
- `playwright-report/` - HTML格式测试报告
- `PLAYWRIGHT_TEST_REPORT.md` - 详细测试报告

## 快速参考

### Package.json 新增的命令
```json
{
  "test:e2e": "playwright test",           // 运行所有测试
  "test:e2e:ui": "playwright test --ui",   // UI模式
  "test:e2e:report": "playwright show-report playwright-report"  // 查看报告
}
```

### 测试账号
- **用户名**: admin
- **密码**: 123456

### 应用地址
- **前端**: http://localhost:3000
- **后端**: http://localhost:9999

## 常见问题

### Q: 测试失败显示"超时"
A: 检查服务器是否运行：
```bash
netstat -ano | findstr ":3000"
netstat -ano | findstr ":9999"
```

### Q: 找不到页面元素
A: 使用调试模式查看：
```bash
npx playwright test --debug
```

### Q: 如何录制新的测试
A: 使用代码生成器：
```bash
npx playwright codegen http://localhost:3000
```

## 联系信息

如有问题，请：
1. 查看 `PLAYWRIGHT_TEST_REPORT.md` 详细报告
2. 检查 `test-results/` 目录中的截图和视频
3. 联系开发团队

---

**创建日期**: 2026-07-20
**状态**: ✅ 基础测试完成，ICN预览测试待数据库配置
