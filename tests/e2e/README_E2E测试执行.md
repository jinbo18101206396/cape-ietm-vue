# IETM E2E测试执行指南

## 环境准备

### 1. 修复前端构建环境(二选一)

**方案A: 升级mini-css-extract-plugin**
```bash
cd D:\workspace\IETM\cape-ietm-vue
npm install mini-css-extract-plugin@latest --save-dev
```

**方案B: 降级Node.js版本**
```bash
# 使用nvm切换到Node 16.x LTS
nvm install 16.20.0
nvm use 16.20.0
```

### 2. 安装Playwright(如未安装)
```bash
cd D:\workspace\IETM\cape-ietm-vue
npm install --save-dev @playwright/test@1.40.0
npx playwright install chromium
```

### 3. 启动前后端服务

**终端1: 启动前端dev server**
```bash
cd D:\workspace\IETM\cape-ietm-vue
npm run serve
# 等待提示: App running at http://localhost:3000/
```

**终端2: 启动后端服务**
```bash
cd D:\workspace\IETM\cape-ietm-java
mvn spring-boot:run -Dspring-boot.run.profiles=dev
# 或使用IDEA启动JeecgSystemApplication
# 等待提示: Tomcat started on port(s): 9999
```

### 4. 验证数据库准备

确保数据库有测试数据:
```sql
-- 检查项目表
SELECT id, project_name FROM ietm_project LIMIT 5;

-- 检查构型节点(至少3层深度)
SELECT id, pid, code, title, level 
FROM ietm_project_configuration_management 
WHERE project_id = '<某个项目ID>'
ORDER BY level, pid;

-- 检查DM表(至少1条记录用于场景2/3)
SELECT id, dmc_code, tech_name, sns 
FROM ietm_data_module 
LIMIT 5;
```

## 测试执行

### 完整测试套件
```bash
cd D:\workspace\IETM\cape-ietm-vue
npx playwright test tests/e2e/dmc-sns-e2e.spec.js
```

### 单个场景测试
```bash
# 场景1: 新建DM
npx playwright test tests/e2e/dmc-sns-e2e.spec.js -g "场景1"

# 场景2: 复制DM
npx playwright test tests/e2e/dmc-sns-e2e.spec.js -g "场景2"

# 场景3: 编辑DM属性
npx playwright test tests/e2e/dmc-sns-e2e.spec.js -g "场景3"

# 场景4: SNS为空防御
npx playwright test tests/e2e/dmc-sns-e2e.spec.js -g "场景4"

# 场景5: ICN SNS计算
npx playwright test tests/e2e/dmc-sns-e2e.spec.js -g "场景5"
```

### 调试模式(可视化)
```bash
npx playwright test tests/e2e/dmc-sns-e2e.spec.js --headed --debug
```

### 生成HTML报告
```bash
npx playwright test tests/e2e/dmc-sns-e2e.spec.js --reporter=html
npx playwright show-report
```

## 测试覆盖场景

| 场景编号 | 测试内容 | UI交互细节 | 验证点 |
|---|---|---|---|
| 场景1 | 新建DM | 选择项目→展开构型树→选节点→填表单 | SNS自动填充、DMC预览格式、无双横线 |
| 场景2 | 复制DM | 原项目复制vs新项目复制 | SNS继承/重算、DMC预览更新 |
| 场景3 | 编辑DM属性 | 修改技术名称→提交 | DMC版本段升级、SNS不变 |
| 场景4 | SNS为空防御 | 手动清空SNS→提交 | 前端校验阻止、错误提示 |
| 场景5 | ICN SNS计算 | 新建ICN→选构型节点 | ICN SNS格式(前6段+i>=3连写) |
| 边界1 | 构型路径不足2层 | 选择根节点 | SNS应为空或有明确提示 |
| 边界2 | 特殊equipname | 项目equipname含'-' | SNS正确拆分为首段 |

## 测试数据准备建议

### 创建测试项目
```sql
-- 插入测试项目
INSERT INTO ietm_project (id, project_name, code_rule, language_code, country_code)
VALUES ('test-proj-001', 'E2E测试项目', 'A-00-0-0-00-00-A', 'ZH', 'CN');

-- 插入构型树(3层)
INSERT INTO ietm_project_configuration_management (id, project_id, pid, code, title, level)
VALUES 
  ('cm-root', 'test-proj-001', '0', 'E2E-TEST', '测试装备', 1),
  ('cm-l1-1', 'test-proj-001', 'cm-root', 'D', '系统D', 2),
  ('cm-l2-1', 'test-proj-001', 'cm-l1-1', '01', '子系统01', 3);
```

### 登录凭据(根据实际调整)
- 用户名: `admin` 或 `test-user`
- 密码: `admin123` 或从配置读取

## 常见问题

### 1. 选择器定位失败
**原因**: Ant Design Vue 1.7.8的选择器类名可能变化  
**解决**: 
```javascript
// 使用更稳定的定位策略
await page.click('[placeholder="请选择项目"]'); // 属性定位
await page.locator('text=/选择项目/').click(); // 文本定位
```

### 2. 异步加载超时
**原因**: SNS计算或构型树加载较慢  
**解决**:
```javascript
await page.waitForResponse(resp => 
  resp.url().includes('/getProjectInfo') && resp.status() === 200
);
```

### 3. 弹框未弹出
**原因**: 按钮定位错误或权限不足  
**解决**:
- 检查登录用户权限
- 使用 `page.screenshot()` 截图调试
- 检查控制台是否有JS错误

### 4. DMC预览不更新
**原因**: Vue computed缓存或DOM未刷新  
**解决**:
```javascript
await page.waitForTimeout(500); // 等待Vue响应式更新
await page.waitForFunction(() => 
  document.querySelector('.dmc-preview').textContent.includes('DMC-')
);
```

## 预期输出

### 成功示例
```
Running 5 tests using 1 worker

  ✓ 场景1: 新建DM - SNS自动计算并生成正确DMC预览 (12.3s)
    ✓ SNS: E2E-TEST-D-01-A1-00-00A
    ✓ DMC预览: DMC-E2E-TEST-D-01-A1-00-00A-040A-C-21-01SY601-001-00_ZH-CN

  ✓ 场景2: 复制DM - SNS继承或重新计算 (8.7s)
    ✓ 原项目SNS: TEST01-D-01-A1-00-00A
    ✓ 新项目SNS: TEST02-D-02-B2-01-00B

  ✓ 场景3: 编辑DM属性 - DMC版本自动升级 (6.5s)
    ✓ 原DMC: DMC-...-001-00_ZH-CN
    ✓ 新DMC: DMC-...-001-01_ZH-CN

  ✓ 场景4: SNS为空边界 - 前端校验阻止提交 (4.2s)
    ✓ 错误提示: SNS不能为空

  ✓ 场景5: ICN SNS计算 (7.1s)
    ✓ ICN SNS: E2E-TEST-D-01A100

5 passed (39s)
```

## 失败排查

如果测试失败,按以下顺序检查:

1. **环境检查**:
   ```bash
   curl http://localhost:3000  # 前端是否启动
   curl http://localhost:9999/jeecg-boot/sys/dict/getDictItems/infocode_type  # 后端API
   ```

2. **数据检查**:
   ```bash
   # 连接MySQL
   mysql -u root -p ietm
   # 检查测试数据
   SELECT COUNT(*) FROM ietm_project;
   SELECT COUNT(*) FROM ietm_project_configuration_management;
   ```

3. **日志检查**:
   - 前端: 浏览器控制台(F12)
   - 后端: `logs/jeecg-boot.log`
   - Playwright: `test-results/` 目录下的trace

4. **生成trace**:
   ```bash
   npx playwright test --trace on
   npx playwright show-trace test-results/xxx/trace.zip
   ```

## 维护建议

1. **定期更新**: 每次修改DMC相关代码后重跑E2E
2. **CI集成**: 将E2E测试加入Jenkins/GitLab CI
3. **数据隔离**: 使用独立测试数据库,避免污染生产
4. **并行执行**: Playwright支持多worker并行:
   ```bash
   npx playwright test --workers=3
   ```

---

**最后更新**: 2026-08-04  
**维护人**: IETM团队  
**相关文档**: [[IETM_九项审核完成报告_20260804.md]]
