# 修复前置条件校验问题 - 实施计划

## 📋 问题概述

发现3处临时注释掉的前置校验，导致工作流完整性破坏和格式规范失守：

1. **P0-1**: 签出按钮工作流校验被注释（前端）
2. **P0-2**: 编辑入口工作流校验被注释（前端）+ 后端完全缺失
3. **P0-3**: 项目参数格式校验被注释（前端）

---

## 🎯 修复策略

### 策略选择：**最小侵入 + 防御纵深**

**核心原则**：
1. **前端恢复校验** - 删除TODO注释，恢复原有if判断逻辑（用户体验优先，即时反馈）
2. **后端补强兜底** - 在Service层新增工作流校验（安全防线，防止API绕过）
3. **保持现有模式** - 匹配代码风格、错误提示格式、异常类型
4. **非破坏性测试** - 使用Mock/拦截API，避免改变数据库状态

---

## 🔧 实施步骤

### Step 1: 恢复前端签出按钮工作流校验（P0-1）

**文件**: `/d/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/IetmDataModuleList.vue`

**位置**: `handleCheckOut()` 方法，第846-857行

**操作**: 删除注释，恢复校验逻辑

```javascript
// 修改前（第846-857行）：
// TODO: 临时注释前置校验，方便测试
// 前置校验：工作流已启动
// if (!record.workflowInstanceId) {
//   this.$message.warning('该DM还未启动流程，不能签出')
//   return
// }
//
// 前置校验：当前节点为DM编写
// if (record.workflowStep !== 'DM编写') {
//   this.$message.warning('当前流程节点不是"DM编写"，不能签出')
//   return
// }

// 修改后：
// 前置校验：工作流已启动
if (!record.workflowInstanceId) {
  this.$message.warning('该DM还未启动流程，不能签出')
  return
}

// 前置校验：当前节点为DM编写
if (record.workflowStep !== 'DM编写') {
  this.$message.warning('当前流程节点不是"DM编写"，不能签出')
  return
}
```

**关键点**：
- 保留原有注释说明（"前置校验：..."）
- 保持错误提示文案不变
- 提前return，避免进入二次确认对话框

---

### Step 2: 恢复前端编辑入口工作流校验（P0-2前端部分）

**文件**: 同上 `IetmDataModuleList.vue`

**位置**: `handleCheckOut()` 方法内 onOk 回调，第897-910行

**操作**: 删除注释，恢复校验逻辑

```javascript
// 修改前（第897-910行）：
// TODO: 临时注释工作流校验，方便测试
// 校验最新状态：工作流已启动
// if (!latestRecord.workflowInstanceId) {
//   this.$message.error('该DM还未启动流程')
//   this.loadData()
//   return
// }
//
// 校验最新状态：当前节点为DM编写
// if (latestRecord.workflowStep !== 'DM编写') {
//   this.$message.error('当前流程节点不是"DM编写"')
//   this.loadData()
//   return
// }

// 修改后：
// 校验最新状态：工作流已启动
if (!latestRecord.workflowInstanceId) {
  this.$message.error('该DM还未启动流程')
  this.loadData()
  return
}

// 校验最新状态：当前节点为DM编写
if (latestRecord.workflowStep !== 'DM编写') {
  this.$message.error('当前流程节点不是"DM编写"')
  this.loadData()
  return
}
```

**关键点**：
- 这里使用 `.error()` 而非 `.warning()`（因为是实时查询后的最终判定）
- 失败时调用 `this.loadData()` 刷新列表（防止数据过期）

---

### Step 3: 后端补强工作流校验（P0-2后端部分）

**文件**: `/d/workspace/IETM/cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/service/impl/IetmDataModuleServiceImpl.java`

**位置**: `checkOut()` 方法，第343行之后（现有校验1之后）

**操作**: 新增2条校验

```java
// 在第343行 "校验1：是否已被签出" 之后，插入：

// 校验5：工作流是否已启动（新增）
if (oConvertUtils.isEmpty(originalDm.getWorkflowInstanceId())) {
    throw new JeecgBootException("数据模块未启动工作流，不能签出");
}

// 校验6：当前节点是否为DM编写（新增）
if (!"DM编写".equals(originalDm.getWorkflowStep())) {
    throw new JeecgBootException("当前流程节点不是'DM编写'，不能签出（当前节点：" 
        + (originalDm.getWorkflowStep() != null ? originalDm.getWorkflowStep() : "无") + "）");
}
```

**关键点**：
- 使用 `oConvertUtils.isEmpty()` 保持与现有代码风格一致
- 使用 `JeecgBootException` 匹配现有异常模式
- 错误提示包含当前节点信息，便于调试
- 插入位置：在"已被签出"校验之后，保持业务逻辑顺序（先检查冲突，再检查权限）

---

### Step 4: 恢复项目参数格式校验（P0-3）

**文件**: `/d/workspace/IETM/cape-ietm-vue/src/views/ietm/projectmanagement/modules/IetmProjectParamsForm.vue`

**位置**: `validate()` 方法，第306-338行

**操作**: 删除多行注释符号，恢复校验代码

```javascript
// 修改前（第306-338行）：
// 检查格式校验,暂时注掉位数校验
/*      requiredItems.forEach(item => {
        const value = item.paramValue.trim();
        const {key, paramName} = item;

        switch (key) {
          case 'cageCode':
            if (!/^[A-Za-z0-9]{5}$/.test(value)) {
              errorMessages.push(`${paramName} 必须为5位字母或数字`);
            }
            break;
          // ... 其他case
        }
      });*/

// 修改后（第306-338行）：
// 检查格式校验（符合S1000D/GJB6600规范）
requiredItems.forEach(item => {
  const value = item.paramValue.trim();
  const {key, paramName} = item;

  switch (key) {
    case 'cageCode':
      if (!/^[A-Za-z0-9]{5}$/.test(value)) {
        errorMessages.push(`${paramName} 必须为5位字母或数字`);
      }
      break;
    case 'positionCode':
      if (!/^[A-Za-z]$/.test(value)) {
        errorMessages.push(`${paramName} 必须为1位字母`);
      }
      break;
    case 'countryCode':
      if (!/^[A-Za-z]{2}$/.test(value)) {
        errorMessages.push(`${paramName} 必须为2位字母`);
      }
      break;
    case 'languageCode':
      if (!/^[A-Za-z]{2,3}$/.test(value)) {
        errorMessages.push(`${paramName} 必须为2-3位字母`);
      }
      break;
    case 'defaultBusinessRule':
      // 该字段没有特殊格式要求，无需校验
      break;
    default:
      break;
  }
});
```

**关键点**：
- 改进注释说明：从"暂时注掉位数校验"改为"符合S1000D/GJB6600规范"
- 保留原有正则表达式和错误提示
- 保留 `defaultBusinessRule` 的注释说明

---

## ✅ 验证计划

### E2E测试（前端）

**测试文件**: `/d/workspace/IETM/cape-ietm-vue/tests/e2e/precondition-validation-fix.spec.js`（新建）

**测试策略**: 非破坏性测试 - 拦截API + Mock响应

#### Test 1: 未启动工作流的DM签出应被拒绝
```javascript
test('签出-未启动工作流应拒绝', async ({ page }) => {
  // 1. Mock列表API，workflowInstanceId=null
  await page.route('**/ietm/datamodule/list**', async route => {
    const resp = await route.fetch()
    const json = await resp.json()
    json.result.records[0].workflowInstanceId = null  // 模拟未启动
    json.result.records[0].checkoutUser = null        // 未被签出
    await route.fulfill({ body: JSON.stringify(json) })
  })
  
  // 2. 选中DM，点击签出按钮
  await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
  await page.click('input[type="checkbox"]')
  await page.click('button:has-text("签出")')
  
  // 3. 验证：应显示警告 "该DM还未启动流程，不能签出"
  await expect(page.locator('.ant-message-warning')).toContainText('该DM还未启动流程')
  
  // 4. 验证：不应弹出二次确认对话框
  await expect(page.locator('.ant-modal-title:has-text("签出确认")')).not.toBeVisible()
})
```

#### Test 2: 非"DM编写"节点签出应被拒绝
```javascript
test('签出-非DM编写节点应拒绝', async ({ page }) => {
  // Mock workflowStep='审核中'
  await page.route('**/ietm/datamodule/list**', async route => {
    const resp = await route.fetch()
    const json = await resp.json()
    json.result.records[0].workflowInstanceId = 'wf_123'  // 已启动
    json.result.records[0].workflowStep = '审核中'        // 非DM编写
    json.result.records[0].checkoutUser = null
    await route.fulfill({ body: JSON.stringify(json) })
  })
  
  await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
  await page.click('input[type="checkbox"]')
  await page.click('button:has-text("签出")')
  
  await expect(page.locator('.ant-message-warning')).toContainText('当前流程节点不是"DM编写"')
  await expect(page.locator('.ant-modal-title:has-text("签出确认")')).not.toBeVisible()
})
```

#### Test 3: 编辑入口二次查询后的工作流校验
```javascript
test('签出-确认对话框内二次查询校验', async ({ page }) => {
  // Mock列表API返回正常状态
  await page.route('**/ietm/datamodule/list**', async route => {
    const resp = await route.fetch()
    const json = await resp.json()
    json.result.records[0].workflowInstanceId = 'wf_123'
    json.result.records[0].workflowStep = 'DM编写'
    json.result.records[0].checkoutUser = null
    await route.fulfill({ body: JSON.stringify(json) })
  })
  
  // Mock queryById API返回异常状态（模拟并发场景：按钮校验通过，但确认前被他人修改）
  await page.route('**/ietm/datamodule/queryById**', async route => {
    await route.fulfill({ 
      body: JSON.stringify({ 
        success: true, 
        result: {
          workflowInstanceId: null,  // 实时查询时流程已被取消
          checkoutUser: null
        }
      })
    })
  })
  
  await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
  await page.click('input[type="checkbox"]')
  await page.click('button:has-text("签出")')
  
  // 弹出确认对话框
  await expect(page.locator('.ant-modal-title:has-text("签出确认")')).toBeVisible()
  
  // 点击确定
  await page.click('.ant-modal-footer button.ant-btn-primary')
  
  // 验证：应显示错误 "该DM还未启动流程"
  await expect(page.locator('.ant-message-error')).toContainText('该DM还未启动流程')
})
```

#### Test 4: 项目参数非法格式校验
```javascript
test('项目参数-非法cageCode应拒绝', async ({ page }) => {
  await page.goto('http://localhost:3000/#/ietm/IetmProjectList')
  
  // 进入项目参数配置页面（具体路径需根据实际路由）
  // ... 导航到项目参数表单
  
  // 输入非法cageCode（3位，应为5位）
  await page.fill('input[placeholder*="cageCode"]', '123')
  
  // 点击保存
  await page.click('button:has-text("保存")')
  
  // 验证：应显示错误 "必须为5位字母或数字"
  await expect(page.locator('.ant-message-error')).toContainText('必须为5位字母或数字')
})
```

#### Test 5: 合法场景仍可正常签出（回归测试）
```javascript
test('签出-合法场景应成功', async ({ page }) => {
  // Mock正常状态
  await page.route('**/ietm/datamodule/list**', async route => {
    const resp = await route.fetch()
    const json = await resp.json()
    json.result.records[0].workflowInstanceId = 'wf_123'
    json.result.records[0].workflowStep = 'DM编写'
    json.result.records[0].checkoutUser = null
    await route.fulfill({ body: JSON.stringify(json) })
  })
  
  await page.route('**/ietm/datamodule/queryById**', async route => {
    await route.fulfill({ 
      body: JSON.stringify({ 
        success: true, 
        result: {
          workflowInstanceId: 'wf_123',
          workflowStep: 'DM编写',
          checkoutUser: null
        }
      })
    })
  })
  
  // Mock签出API成功
  await page.route('**/ietm/datamodule/checkOut**', route => {
    route.fulfill({ body: JSON.stringify({ success: true, message: '签出成功' }) })
  })
  
  await page.goto('http://localhost:3000/#/ietm/IetmDataModuleList')
  await page.click('input[type="checkbox"]')
  await page.click('button:has-text("签出")')
  
  // 确认对话框出现
  await expect(page.locator('.ant-modal-title:has-text("签出确认")')).toBeVisible()
  await page.click('.ant-modal-footer button.ant-btn-primary')
  
  // 验证：成功提示
  await expect(page.locator('.ant-message-success')).toContainText('签出成功')
})
```

---

### JUnit测试（后端）

**测试文件**: `/d/workspace/IETM/cape-ietm-java/jeecg-module-ietm/src/test/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/service/IetmDataModuleServiceCheckOutValidationTest.java`（新建）

**测试策略**: 单元测试 + Mock依赖

```java
@SpringBootTest
public class IetmDataModuleServiceCheckOutValidationTest {
    
    @Autowired
    private IIetmDataModuleService ietmDataModuleService;
    
    @MockBean
    private IetmDataModuleMapper ietmDataModuleMapper;
    
    /**
     * 测试：未启动工作流的DM签出应抛出异常
     */
    @Test
    public void testCheckOut_NoWorkflowInstance_ShouldThrowException() {
        // Arrange
        IetmDataModule dm = new IetmDataModule();
        dm.setId("test_dm_001");
        dm.setWorkflowInstanceId(null);  // 未启动工作流
        dm.setCheckoutUser(null);
        dm.setVersionType("0");
        dm.setIsLatest("1");
        dm.setInWork("00");
        
        when(ietmDataModuleMapper.selectById("test_dm_001")).thenReturn(dm);
        
        // Act & Assert
        JeecgBootException ex = assertThrows(JeecgBootException.class, () -> {
            ietmDataModuleService.checkOut("test_dm_001", "testuser");
        });
        
        assertThat(ex.getMessage()).contains("未启动工作流");
    }
    
    /**
     * 测试：非"DM编写"节点签出应抛出异常
     */
    @Test
    public void testCheckOut_NotDmWriteStep_ShouldThrowException() {
        // Arrange
        IetmDataModule dm = new IetmDataModule();
        dm.setId("test_dm_002");
        dm.setWorkflowInstanceId("wf_123");
        dm.setWorkflowStep("审核中");  // 非DM编写节点
        dm.setCheckoutUser(null);
        dm.setVersionType("0");
        dm.setIsLatest("1");
        dm.setInWork("00");
        
        when(ietmDataModuleMapper.selectById("test_dm_002")).thenReturn(dm);
        
        // Act & Assert
        JeecgBootException ex = assertThrows(JeecgBootException.class, () -> {
            ietmDataModuleService.checkOut("test_dm_002", "testuser");
        });
        
        assertThat(ex.getMessage()).contains("当前流程节点不是'DM编写'");
        assertThat(ex.getMessage()).contains("审核中");  // 错误消息应包含当前节点
    }
    
    /**
     * 测试：合法场景签出应成功（回归测试）
     */
    @Test
    public void testCheckOut_ValidScenario_ShouldSucceed() {
        // Arrange
        IetmDataModule dm = new IetmDataModule();
        dm.setId("test_dm_003");
        dm.setWorkflowInstanceId("wf_123");
        dm.setWorkflowStep("DM编写");  // 合法节点
        dm.setCheckoutUser(null);
        dm.setVersionType("0");
        dm.setIsLatest("1");
        dm.setInWork("00");
        dm.setSns("TEST-SNS-001");
        // ... 其他必填字段
        
        when(ietmDataModuleMapper.selectById("test_dm_003")).thenReturn(dm);
        when(ietmDataModuleMapper.selectByDmcForValidation(any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(null);  // 无冲突
        
        // Act
        boolean result = ietmDataModuleService.checkOut("test_dm_003", "testuser");
        
        // Assert
        assertTrue(result);
        verify(ietmDataModuleMapper, times(1)).insert(any(IetmDataModule.class));  // 新版本已插入
        verify(ietmDataModuleMapper, times(1)).updateById(any(IetmDataModule.class));  // 原版本已更新
    }
}
```

---

## 📊 风险评估

| 修改点 | 影响范围 | 回退成本 | 缓解措施 |
|--------|---------|---------|---------|
| 前端签出校验恢复 | 签出按钮交互 | 低（单文件单函数） | E2E回归测试 |
| 前端编辑入口校验恢复 | 签出确认流程 | 低（单文件单函数） | E2E并发场景测试 |
| 后端工作流校验新增 | 签出API | 中（Service层核心方法） | JUnit单元测试 + 分支策略 |
| 项目参数格式校验恢复 | 项目创建/编辑 | 低（独立表单校验） | 正则表达式单元测试 |

**最大风险点**: 后端新增校验可能影响现有自动化脚本或外部系统调用

**缓解方案**:
1. 在测试环境充分验证
2. 记录变更日志，通知相关团队
3. 提供临时开关（可选）：通过配置文件控制是否启用工作流校验

---

## 🚀 部署策略

### 分支策略
1. 从 `develop` 创建特性分支 `fix/precondition-validation`
2. 按顺序提交：
   - Commit 1: 恢复前端签出按钮校验
   - Commit 2: 恢复前端编辑入口校验
   - Commit 3: 后端补强工作流校验
   - Commit 4: 恢复项目参数格式校验
   - Commit 5: 新增E2E测试
   - Commit 6: 新增JUnit测试

### 测试环境验证
1. 前端：`npm run test:e2e -- precondition-validation-fix.spec.js`
2. 后端：`mvn test -Dtest=IetmDataModuleServiceCheckOutValidationTest`
3. 手工冒烟测试（4个场景）

### 发布检查清单
- [ ] 所有自动化测试通过
- [ ] 代码Review（重点：异常处理、错误提示文案）
- [ ] 更新CHANGELOG.md
- [ ] 更新记忆文件（标记为"已修复"）

---

## 🔄 后续改进建议

1. **建立TODO清理检查清单** - 上线前强制执行 `grep "TODO.*临时\|暂时.*校验" -r src/`
2. **建立前后端校验矩阵** - 明确哪些校验必须后端兜底（工作流/权限/安全相关）
3. **CI/CD集成** - pre-commit hook禁止提交含"临时.*校验"的注释代码
4. **监控告警** - 记录因工作流校验失败的签出请求，分析是否存在流程设计问题

---

## 📝 预期结果

修复完成后：
- ✅ 未启动工作流的DM无法签出（前端+后端双重拦截）
- ✅ 非"DM编写"节点无法签出（前端+后端双重拦截）
- ✅ 项目参数必须符合S1000D/GJB6600规范格式
- ✅ 合法场景不受影响（向后兼容）
- ✅ 6个E2E测试 + 3个JUnit测试全部通过
- ✅ 工作流完整性得到保障

---

**计划制定时间**: 2026-08-13  
**预计修复时间**: 4小时（编码2h + 测试2h）  
**风险等级**: 低（恢复原有逻辑 + 防御纵深）
