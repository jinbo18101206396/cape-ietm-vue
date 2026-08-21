# 前置条件修复 - 手动UI验证指南

由于自动化测试在数据准备阶段遇到session管理问题，本指南提供**完整的手动验证步骤**，确保3个前置条件校验真实有效。

---

## 准备工作

### 1. 启动服务
```bash
# 后端：端口9999
# 前端：端口3000
```

### 2. 登录系统
- 访问: http://localhost:3000
- 用户名: admin
- 密码: 123456

### 3. 选择项目
- 点击顶部"请选择项目"
- 选择任意项目并确认

---

## 测试场景1：工作流未启动 - 验证拦截

### 目标
验证当DM的`workflowInstanceId`为空时，点击"签出"按钮会被前端拦截。

### 步骤

1. **准备测试数据**
   - 进入"数据模块管理"页面
   - 找到任意一个未签出的DM（签出状态=未签出）
   - 记录该DM的DMC代码（例如：`DMC-A-00-0-0-00-00A-001A-D`）

2. **修改数据库（模拟无工作流状态）**
   ```sql
   -- 连接数据库
   -- 找到刚才记录的DM
   UPDATE ietm_data_module 
   SET workflow_instance_id = NULL,
       workflow_step = NULL,
       checkout_status = '0'
   WHERE dmc_code = 'DMC-A-00-0-0-00-00A-001A-D';  -- 替换为实际DMC
   
   -- 验证修改
   SELECT id, dmc_code, workflow_instance_id, workflow_step, checkout_status
   FROM ietm_data_module
   WHERE dmc_code = 'DMC-A-00-0-0-00-00A-001A-D';
   ```

3. **UI验证**
   - 刷新"数据模块管理"页面（F5）
   - 找到修改的DM行
   - **验证点1**: 工作流步骤列应该显示空白或"-"
   - 点击该行的"签出"按钮
   - **验证点2**: 应立即看到橙色警告提示：`该DM还未启动流程，不能签出`
   - **验证点3**: 没有弹出确认对话框

4. **预期结果**
   - ✅ 警告消息出现
   - ✅ 签出操作被阻止
   - ✅ DM状态未改变

---

## 测试场景2：非DM编写节点 - 验证拦截

### 目标
验证当DM的`workflowStep`不是"DM编写"时，点击"签出"按钮会被前端拦截。

### 步骤

1. **准备测试数据**
   - 选择另一个未签出的DM
   - 记录DMC代码

2. **修改数据库（模拟错误工作流步骤）**
   ```sql
   UPDATE ietm_data_module 
   SET workflow_instance_id = 'test-workflow-12345',
       workflow_step = '技术审核',  -- 不是"DM编写"
       checkout_status = '0'
   WHERE dmc_code = 'DMC-A-00-0-0-00-00A-002A-D';  -- 替换为实际DMC
   
   -- 验证修改
   SELECT id, dmc_code, workflow_instance_id, workflow_step, checkout_status
   FROM ietm_data_module
   WHERE dmc_code = 'DMC-A-00-0-0-00-00A-002A-D';
   ```

3. **UI验证**
   - 刷新页面
   - 找到修改的DM行
   - **验证点1**: 工作流步骤列应显示"技术审核"
   - 点击"签出"按钮
   - **验证点2**: 应立即看到橙色警告提示：`当前流程节点不是"DM编写"，不能签出`
   - **验证点3**: 没有弹出确认对话框

4. **预期结果**
   - ✅ 警告消息出现
   - ✅ 签出操作被阻止
   - ✅ DM状态未改变

---

## 测试场景3：正常流程 - 二次校验

### 目标
验证当前端第一层校验通过后，确认对话框弹出前会再次查询最新状态进行二次校验。

### 步骤

1. **准备测试数据**
   - 选择第三个未签出的DM
   - 记录DMC代码

2. **修改数据库（设置正常状态）**
   ```sql
   UPDATE ietm_data_module 
   SET workflow_instance_id = 'valid-workflow-67890',
       workflow_step = 'DM编写',
       checkout_status = '0'
   WHERE dmc_code = 'DMC-A-00-0-0-00-00A-003A-D';  -- 替换为实际DMC
   ```

3. **UI验证**
   - 刷新页面
   - 找到修改的DM行
   - **验证点1**: 工作流步骤列应显示"DM编写"
   - 点击"签出"按钮
   - **验证点2**: 应该弹出确认对话框（说明第一层校验通过）
   - 点击"确定"
   - **验证点3**: 
     - 如果数据未被其他人修改：签出成功，签出状态变为"已签出"
     - 如果在点击"签出"和点击"确定"之间，工作流状态被改变：应该看到错误提示（二次校验生效）

4. **预期结果**
   - ✅ 第一层校验通过，弹出确认对话框
   - ✅ 第二层校验查询最新状态
   - ✅ 正常流程可以签出成功

---

## 测试场景4：后端防御 - 绕过前端

### 目标
验证即使绕过前端校验，后端也会拦截非法请求。

### 步骤

1. **使用场景1的测试数据**（工作流未启动的DM）

2. **通过浏览器开发者工具直接调用后端API**
   - 打开浏览器开发者工具（F12）
   - 切换到Console标签页
   - 获取Token：
     ```javascript
     localStorage.getItem('Vue-Access-Token')
     ```
   - 记录DM的ID（从页面表格中获取，或从数据库查询）
   
3. **直接调用后端签出API**
   ```javascript
   fetch('http://localhost:9999/jeecg-boot/ietm/datamodule/checkout', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-Access-Token': localStorage.getItem('Vue-Access-Token')
     },
     body: JSON.stringify({
       id: '1234567890123456789'  // 替换为实际DM ID
     })
   })
   .then(res => res.json())
   .then(data => console.log('后端响应:', data))
   ```

4. **验证后端响应**
   - **验证点**: 响应中`success`应为`false`
   - **验证点**: `message`应包含"工作流"相关错误信息
   - 示例预期响应：
     ```json
     {
       "success": false,
       "message": "数据模块未启动工作流，不能签出",
       "code": 500
     }
     ```

5. **预期结果**
   - ✅ 后端拦截成功
   - ✅ 返回明确错误信息
   - ✅ DM状态未改变

---

## 测试场景5：项目参数格式校验

### 目标
验证项目参数保存时会校验格式是否符合S1000D/GJB6600规范。

### 步骤

1. **进入项目管理**
   - 点击左侧菜单"项目管理"
   - 找到任意项目行

2. **打开项目参数编辑**
   - 点击该项目行的"编辑"按钮
   - 切换到"项目参数"标签页

3. **测试非法值：cageCode（企业代码）**
   - 找到"cageCode"或"企业代码"输入框
   - 清空现有值
   - 输入非法值：`ABC`（只有3位，规范要求5位）
   - 点击"保存"按钮
   - **验证点**: 应该看到红色或橙色提示：`cageCode 必须为5位字母或数字`
   - **验证点**: 保存操作被阻止

4. **测试非法值：positionCode（位置代码）**
   - 输入非法值：`AB`（2位，规范要求1位）
   - 点击"保存"
   - **验证点**: 应该看到提示：`positionCode 必须为1位字母`

5. **测试非法值：countryCode（国家代码）**
   - 输入非法值：`C`（1位，规范要求2位）
   - 点击"保存"
   - **验证点**: 应该看到提示：`countryCode 必须为2位字母`

6. **测试非法值：languageCode（语言代码）**
   - 输入非法值：`Z`（1位，规范要求2-3位）
   - 点击"保存"
   - **验证点**: 应该看到提示：`languageCode 必须为2-3位字母`

7. **测试合法值**
   - 输入合法值：
     - cageCode: `ABCDE`（5位）
     - positionCode: `D`（1位）
     - countryCode: `CN`（2位）
     - languageCode: `ZH`（2位）
   - 点击"保存"
   - **验证点**: 应该保存成功

8. **预期结果**
   - ✅ 非法格式被拦截
   - ✅ 错误信息明确
   - ✅ 合法格式可以保存

---

## 边界条件测试

### B1: 空字符串 vs NULL
- 修改数据库：`workflow_instance_id = ''`（空字符串）
- 预期：应该同样被拦截（后端使用`oConvertUtils.isEmpty()`会同时检查null和空字符串）

### B2: 工作流步骤大小写
- 修改数据库：`workflow_step = 'dm编写'`（小写）
- 预期：应该被拦截（精确匹配"DM编写"）

### B3: 工作流步骤前后空格
- 修改数据库：`workflow_step = ' DM编写 '`（带空格）
- 预期：应该被拦截（精确匹配，不做trim）

---

## 验证清单

完成所有测试后，请确认：

- [ ] 场景1：工作流未启动拦截 - 前端第一层拦截生效
- [ ] 场景2：非DM编写节点拦截 - 前端第一层拦截生效
- [ ] 场景3：正常流程通过 - 可以弹出确认对话框
- [ ] 场景4：后端防御 - 直接API调用被拦截
- [ ] 场景5：项目参数校验 - 4个字段格式校验生效
- [ ] 边界B1：空字符串被正确处理
- [ ] 边界B2：大小写敏感
- [ ] 边界B3：空格敏感

---

## 恢复测试数据

测试完成后，如需恢复修改的DM状态：

```sql
-- 恢复为正常状态
UPDATE ietm_data_module 
SET workflow_instance_id = 'normal-workflow-id',
    workflow_step = 'DM编写',
    checkout_status = '0'
WHERE dmc_code IN (
  'DMC-A-00-0-0-00-00A-001A-D',
  'DMC-A-00-0-0-00-00A-002A-D',
  'DMC-A-00-0-0-00-00A-003A-D'
);
```

---

## 注意事项

1. **数据库连接**：确保有权限访问测试数据库
2. **浏览器缓存**：每次修改数据库后记得刷新页面
3. **并发问题**：确保测试期间没有其他用户在操作同一DM
4. **截图证据**：建议对每个验证点截图保存
5. **日志观察**：可以打开浏览器开发者工具观察网络请求和控制台日志

---

**测试负责人签名**: _______________  
**测试完成日期**: _______________
