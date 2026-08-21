# 前置条件修复 - 真实UI验证执行指南

## 概述

本指南提供**完整的**、**可执行的**步骤来验证3个前置条件校验是否真实有效。所有测试都通过**真实的浏览器UI交互**进行，绝不绕过Vue层。

---

## 执行步骤

### 第一步：准备测试数据

1. **连接达梦数据库**
   ```
   主机: 127.0.0.1
   端口: 5236
   数据库: IETM
   用户名: IETM
   密码: AvicCape301
   ```

2. **执行SQL查询，找到3个可用的测试DM**
   ```sql
   SELECT id, dmc_code, workflow_instance_id, workflow_step, checkout_status, tech_name
   FROM ietm_data_module
   WHERE checkout_status = '0'  -- 未签出
   ORDER BY create_time DESC
   LIMIT 10;
   ```

3. **记录3个DM的ID和DMC代码**
   ```
   DM1 (用于测试无工作流):
     ID: ________________
     DMC: ________________
   
   DM2 (用于测试错误步骤):
     ID: ________________
     DMC: ________________
   
   DM3 (用于测试正常流程):
     ID: ________________
     DMC: ________________
   ```

4. **执行SQL修改，创建测试场景**
   
   **场景1：工作流未启动**
   ```sql
   UPDATE ietm_data_module
   SET workflow_instance_id = NULL,
       workflow_step = NULL,
       checkout_status = '0',
       update_time = SYSDATE
   WHERE id = '________DM1的ID________';
   
   -- 验证
   SELECT id, dmc_code, workflow_instance_id, workflow_step
   FROM ietm_data_module
   WHERE id = '________DM1的ID________';
   ```
   
   **场景2：非DM编写节点**
   ```sql
   UPDATE ietm_data_module
   SET workflow_instance_id = 'test-workflow-12345',
       workflow_step = '技术审核',
       checkout_status = '0',
       update_time = SYSDATE
   WHERE id = '________DM2的ID________';
   
   -- 验证
   SELECT id, dmc_code, workflow_instance_id, workflow_step
   FROM ietm_data_module
   WHERE id = '________DM2的ID________';
   ```
   
   **场景3：正常状态**
   ```sql
   UPDATE ietm_data_module
   SET workflow_instance_id = 'valid-workflow-67890',
       workflow_step = 'DM编写',
       checkout_status = '0',
       update_time = SYSDATE
   WHERE id = '________DM3的ID________';
   
   -- 验证
   SELECT id, dmc_code, workflow_instance_id, workflow_step
   FROM ietm_data_module
   WHERE id = '________DM3的ID________';
   ```

---

### 第二步：配置测试脚本

编辑测试文件：`tests/e2e/precondition-final-real-ui.spec.js`

找到第14-18行，填入实际的DMC代码：

```javascript
const TEST_DMC_CODES = {
  NO_WORKFLOW: 'DMC-A-00-0-0-00-00A-001A-D',  // 替换为DM1的实际DMC
  WRONG_STEP: 'DMC-A-00-0-0-00-00A-022A-D',   // 替换为DM2的实际DMC
  VALID: 'DMC-A-00-0-0-00-00A-040A-D'         // 替换为DM3的实际DMC
};
```

---

### 第三步：确认服务运行

1. **后端服务**
   ```bash
   # 检查端口9999是否监听
   curl http://localhost:9999/jeecg-boot/sys/login -I
   ```
   预期：返回200或405

2. **前端服务**
   ```bash
   # 检查端口3000是否监听
   curl http://localhost:3000 -I
   ```
   预期：返回200

---

### 第四步：执行Playwright UI测试

```bash
cd /d/workspace/IETM/cape-ietm-vue

# 执行测试（带详细日志）
npx playwright test tests/e2e/precondition-final-real-ui.spec.js \
  --project=chromium \
  --reporter=list \
  --timeout=90000

# 如果想看到浏览器窗口（有助于调试）
npx playwright test tests/e2e/precondition-final-real-ui.spec.js \
  --project=chromium \
  --headed \
  --reporter=list \
  --timeout=90000
```

---

### 第五步：验证测试结果

#### 预期输出：

```
Running 5 tests using 1 worker

🔍 查找测试DM: DMC-A-00-0-0-00-00A-001A-D
✅ 找到测试DM行
📋 工作流步骤列内容: (空或-)
🖱️  点击签出按钮...
📋 警告消息可见: true
📋 警告消息内容: 该DM还未启动流程，不能签出
✅ 场景1验证通过：工作流未启动时签出被拦截
  ✓ 【真实UI】场景1: 工作流未启动 - 点击签出按钮验证拦截 (5.2s)

🔍 查找测试DM: DMC-A-00-0-0-00-00A-022A-D
✅ 找到测试DM行
📋 工作流步骤列内容: 技术审核
🖱️  点击签出按钮...
📋 警告消息可见: true
📋 警告消息内容: 当前流程节点不是"DM编写"，不能签出
✅ 场景2验证通过：非DM编写节点时签出被拦截
  ✓ 【真实UI】场景2: 非DM编写节点 - 点击签出按钮验证拦截 (4.8s)

🔍 查找测试DM: DMC-A-00-0-0-00-00A-040A-D
✅ 找到测试DM行
📋 工作流步骤列内容: DM编写
🖱️  点击签出按钮...
📋 确认对话框出现: true
📋 确认框内容: 是否确认签出此数据模块？
🖱️  点击取消按钮...
✅ 场景3验证通过：正常流程可以进入确认对话框
  ✓ 【真实UI】场景3: 正常流程 - 点击签出应弹出确认框 (5.5s)

🔍 进入项目管理页面...
🖱️  点击编辑按钮...
🖱️  切换到项目参数标签页...
📋 找到 8 个输入框
🖱️  测试cageCode格式校验（输入3位，规范要求5位）...
🖱️  点击保存按钮...
📋 错误消息可见: true
📋 错误消息内容: cageCode 必须为5位字母或数字
✅ 场景4验证通过：项目参数格式校验生效
  ✓ 【真实UI】场景4: 项目参数格式校验 - 输入非法值验证 (12.3s)

✅ 找到测试DM ID: 2016515088223285401
🔍 尝试直接调用后端签出API（绕过前端）...
📋 后端响应: {
  "success": false,
  "message": "数据模块未启动工作流，不能签出",
  "code": 500
}
✅ 场景5验证通过：后端防御成功拦截非法请求
  ✓ 【后端API】场景5: 直接调用API绕过前端 - 验证后端拦截 (1.2s)

  5 passed (29.0s)
```

---

### 第六步：恢复测试数据（可选）

测试完成后，如需恢复：

```sql
UPDATE ietm_data_module
SET workflow_instance_id = 'normal-workflow-id',
    workflow_step = 'DM编写',
    checkout_status = '0',
    update_time = SYSDATE
WHERE id IN (
  '________DM1的ID________',
  '________DM2的ID________',
  '________DM3的ID________'
);
```

---

## 验证清单

执行完成后，请确认以下所有项：

- [ ] 场景1：点击签出按钮后，看到橙色警告"还未启动流程"，没有弹确认框
- [ ] 场景2：点击签出按钮后，看到橙色警告"不是DM编写"，没有弹确认框
- [ ] 场景3：点击签出按钮后，弹出确认对话框（前端第一层校验通过）
- [ ] 场景4：输入非法cageCode后点保存，看到错误提示"5位"
- [ ] 场景5：直接调用API返回success=false，message包含"工作流"
- [ ] 所有测试都是通过真实UI交互完成（看到浏览器窗口操作）
- [ ] 所有测试都没有跳过或警告

---

## 故障排查

### 问题1：找不到测试DM

**症状**：`找不到测试DM: DMC-XXX`

**解决**：
1. 检查TEST_DMC_CODES是否正确配置
2. 刷新页面确认DM列表中有该DMC
3. 检查数据库确认数据已修改

### 问题2：警告消息未出现

**症状**：点击签出按钮后没有任何反应

**解决**：
1. 检查前端代码是否真的恢复了校验（grep "还未启动流程"）
2. 检查浏览器控制台是否有JS错误
3. 确认数据库状态是否正确设置

### 问题3：测试超时

**症状**：`TimeoutError: page.waitForSelector`

**解决**：
1. 增加timeout参数：`--timeout=120000`
2. 检查网络连接和服务响应速度
3. 使用--headed模式观察实际加载过程

---

## 补充说明

1. **为什么要通过数据库准备数据？**
   - 因为系统本身的业务逻辑会阻止创建这些"异常"状态
   - 只有直接修改数据库才能模拟真实的边界条件

2. **测试数据是否会影响生产？**
   - 本指南针对开发/测试环境
   - 只修改3个特定DM的状态
   - 测试完成后可以立即恢复

3. **如何确保测试的真实性？**
   - 使用Playwright操作真实浏览器
   - 所有点击/输入都是DOM事件
   - 验证实际的UI反馈（消息提示）
   - 检查后端API的真实响应

---

**执行完成后，请将测试结果截图和日志输出保存作为验收证据。**
