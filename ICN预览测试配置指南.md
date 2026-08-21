# ICN预览功能测试 - 配置指南

## 当前状态

❌ **ICN预览功能测试当前无法运行**

原因：项目实体管理页面的菜单配置未添加到数据库中

## 解决步骤

### 步骤1：执行菜单SQL

#### 1.1 找到SQL文件
文件位置：`src/views/ietm/icnmanage/IetmIcnManage_menu_insert.sql`

#### 1.2 连接数据库
```bash
# 使用你的数据库工具连接到后端数据库
# 默认配置（参考 .env.development）:
# 数据库地址: localhost:3306
# 数据库名: 请查看后端配置
```

#### 1.3 执行SQL语句
打开 SQL 文件并执行所有 INSERT 语句。主要包括：

```sql
-- 主菜单
INSERT INTO sys_permission(...) VALUES ('2026020611179650140', NULL, '项目管理-项目实体管理', '/icnmanage/ietmIcnManageList', ...);

-- 权限项
INSERT INTO sys_permission(...) VALUES ('2026020611179660141', '2026020611179650140', '添加项目管理-项目实体管理', ...);
INSERT INTO sys_permission(...) VALUES ('2026020611179660142', '2026020611179650140', '编辑项目管理-项目实体管理', ...);
-- ... 更多权限
```

#### 1.4 验证SQL执行
```sql
-- 检查菜单是否添加成功
SELECT * FROM sys_permission WHERE id = '2026020611179650140';

-- 检查权限是否添加成功
SELECT * FROM sys_permission WHERE parent_id = '2026020611179650140';
```

### 步骤2：分配用户权限

#### 2.1 通过界面分配（推荐）
1. 以管理员身份登录系统
2. 进入"系统管理" -> "角色管理"
3. 编辑admin角色的权限
4. 勾选"项目管理-项目实体管理"及其子权限
5. 保存

#### 2.2 通过SQL分配
```sql
-- 查找admin角色ID
SELECT id FROM sys_role WHERE role_code = 'admin';

-- 为admin角色添加权限（假设角色ID是'xxx'）
INSERT INTO sys_role_permission (role_id, permission_id) 
VALUES 
('xxx', '2026020611179650140'),  -- 主菜单
('xxx', '2026020611179660141'),  -- 添加权限
('xxx', '2026020611179660142'),  -- 编辑权限
('xxx', '2026020611179660143'),  -- 删除权限
('xxx', '2026020611179660144'),  -- 批量删除权限
('xxx', '2026020611179660145'),  -- 导出权限
('xxx', '2026020611179660146');  -- 导入权限
```

### 步骤3：验证配置

#### 3.1 手动验证
1. 退出并重新登录系统
2. 检查左侧菜单是否出现"项目管理"下的"项目实体管理"
3. 点击菜单，确认页面能正常打开
4. 确认页面URL是：`http://localhost:3000/icnmanage/ietmIcnManageList`

#### 3.2 通过测试验证
```bash
# 运行调试测试，检查菜单是否出现
npx playwright test tests/debug-menu-navigation.spec.js

# 查看截图
# 应该能在 menu-*.png 中看到"项目实体管理"菜单项
```

### 步骤4：运行ICN预览测试

#### 4.1 完整测试
```bash
cd D:\workspace\IETM\cape-ietm-vue

# 运行ICN预览功能测试
npx playwright test tests/icn-preview.spec.js
```

#### 4.2 单独运行某个测试
```bash
# 仅测试按钮状态
npx playwright test tests/icn-preview.spec.js -g "按钮状态"

# 仅测试图片预览
npx playwright test tests/icn-preview.spec.js -g "图片预览"

# 仅测试视频预览
npx playwright test tests/icn-preview.spec.js -g "视频预览"

# 仅测试音频预览
npx playwright test tests/icn-preview.spec.js -g "音频预览"
```

#### 4.3 UI模式（推荐）
```bash
# 可视化运行测试
npm run test:e2e:ui
```

## ICN预览测试内容

### 测试1：按钮状态测试
- ✅ 未选中记录时，"浏览"按钮应该禁用
- ✅ 选中一条记录后，"浏览"按钮应该启用

### 测试2：图片预览测试
- ✅ 上传JPG图片
- ✅ 点击"浏览"按钮
- ✅ 图片预览模态框显示
- ✅ 图片正确显示
- ✅ 关闭预览功能正常

### 测试3：视频预览测试
- ✅ 上传MP4视频
- ✅ 点击"浏览"按钮
- ✅ 视频播放器显示
- ✅ 播放控件正常
- ✅ 关闭播放器功能正常

### 测试4：音频预览测试
- ✅ 上传MP3音频
- ✅ 点击"浏览"按钮
- ✅ 音频播放器显示
- ✅ 播放控件正常
- ✅ 关闭播放器功能正常

### 测试5：异常处理测试
- ✅ 测试无文件记录的处理
- ✅ 测试错误提示信息

### 测试6：多格式切换测试
- ✅ 连续预览不同格式文件
- ✅ 格式切换流畅
- ✅ 无内存泄漏

## 预期测试结果

成功配置后，运行 `npx playwright test tests/icn-preview.spec.js` 应该看到：

```
Running 6 tests using 1 worker

✅ 登录成功
✅ 进入项目实体管理页面
  ok 1 [chromium] › 项目实体管理 - 预览功能测试 › 1. 预览功能 - 按钮状态测试
  ok 2 [chromium] › 项目实体管理 - 预览功能测试 › 2. 预览功能 - 图片预览测试
  ok 3 [chromium] › 项目实体管理 - 预览功能测试 › 3. 预览功能 - 视频预览测试
  ok 4 [chromium] › 项目实体管理 - 预览功能测试 › 4. 预览功能 - 音频预览测试
  ok 5 [chromium] › 项目实体管理 - 预览功能测试 › 5. 预览功能 - 异常处理测试
  ok 6 [chromium] › 项目实体管理 - 预览功能测试 › 6. 预览功能 - 多格式切换测试

6 passed (XX.Xs)
```

## 故障排查

### 问题1：页面仍然显示404
**可能原因**:
- SQL未正确执行
- 用户权限未分配
- 缓存未清除

**解决方法**:
```bash
# 1. 检查数据库
SELECT * FROM sys_permission WHERE url LIKE '%icnmanage%';

# 2. 清除浏览器缓存
# 在浏览器中按 Ctrl+Shift+Delete

# 3. 清除Redis缓存（如果使用）
redis-cli FLUSHALL

# 4. 重启后端服务
```

### 问题2：菜单出现但没有数据
**可能原因**:
- 构型树数据为空
- 后端API未正常运行

**解决方法**:
1. 检查构型树表是否有数据
2. 检查后端日志是否有错误
3. 使用浏览器开发者工具查看网络请求

### 问题3：测试超时
**可能原因**:
- 页面加载慢
- 网络延迟
- 服务器响应慢

**解决方法**:
```javascript
// 在 playwright.config.js 中增加超时时间
module.exports = defineConfig({
  timeout: 90000,  // 增加到90秒
  expect: {
    timeout: 15000  // 增加到15秒
  }
});
```

### 问题4：文件上传失败
**可能原因**:
- 文件大小限制
- 文件格式不支持
- 上传路径配置错误

**解决方法**:
1. 检查后端文件上传配置
2. 检查文件大小限制
3. 查看后端日志中的错误信息

## 测试数据说明

测试使用的文件位于 `tests/test-files/`：

| 文件名 | 类型 | 大小 | 用途 |
|--------|------|------|------|
| test_image.png | 图片 | ~67 bytes | PNG预览测试 |
| test_image.jpg | 图片 | ~125 bytes | JPG预览测试 |
| test_image.gif | 图片 | ~43 bytes | GIF预览测试 |
| test_video.mp4 | 视频 | ~40 bytes | 视频预览测试 |
| test_audio.mp3 | 音频 | ~32 bytes | 音频预览测试 |

**注意**: 这些是最小化的测试文件，用于快速测试功能。实际使用时应该测试真实大小的文件。

## 后续优化

### 1. 添加更多测试场景
- 大文件上传测试
- 并发上传测试
- 断点续传测试
- 不同格式组合测试

### 2. 性能测试
- 预览响应时间
- 文件加载速度
- 内存使用情况

### 3. 兼容性测试
- 不同浏览器测试
- 不同操作系统测试
- 移动端测试

## 联系支持

如果按照以上步骤仍然无法运行测试，请：
1. 检查控制台错误日志
2. 查看 `test-results/` 目录中的截图
3. 提供详细的错误信息
4. 联系开发团队

---

**文档版本**: 1.0
**最后更新**: 2026-07-20
**状态**: 等待数据库配置
