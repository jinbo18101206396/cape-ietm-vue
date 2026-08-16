# 历史版本自动归档问题修复 - 测试计划

## 🔴 问题描述

**当前错误行为**：每次签出时，所有旧历史版本被自动归档（`status='0'`），导致用户只能看到最近一次签出前的版本。

**用户期望**：应该能看到所有历史版本。

---

## 🛠️ 修复内容

**文件**：`IetmDataModuleServiceImpl.java`

**修改**：删除 `checkout()` 方法中的自动归档逻辑（第418-433行）

```java
// ❌ 已删除
// 第4.1步：将该DM所有历史版本改为 status='0'（归档）
LambdaUpdateWrapper<IetmDataModule> archiveWrapper = ...
this.update(archiveWrapper);
```

---

## ✅ 测试目标

1. **验证历史版本完整性**：多次签出/签入后，所有版本都应该可见
2. **验证无数据库约束冲突**：删除归档逻辑后，不应出现唯一约束错误
3. **验证历史版本浏览功能**：点击任意历史版本的"浏览DM"能打开对应内容

---

## 📋 测试用例

### TC-01：基础历史版本累积测试

**前置条件**：
- 后端已重启（应用新代码）
- 已登录系统
- 有一个可编辑的DM

**测试步骤**：
1. 打开DM编辑器
2. 修改内容，签入（创建版本1）
3. 签出 → 修改内容 → 签入（创建版本2）
4. 签出 → 修改内容 → 签入（创建版本3）
5. 签出 → 修改内容 → 签入（创建版本4）
6. 在列表页点击该DM的"更多" → "查看历史版本"

**预期结果**：
- ✅ 历史版本列表显示 4 个版本
- ✅ 版本号递增：1-00, 2-00, 3-00, 4-00
- ✅ 所有版本的 `dm_content` 都不同

**实际结果**：_（待填写）_

---

### TC-02：数据库约束验证

**目的**：验证删除归档逻辑后不会出现唯一约束冲突

**测试步骤**：
1. 执行 TC-01 的所有步骤
2. 观察后端日志，查找是否有 SQL 异常

**预期结果**：
- ✅ 无 `DuplicateKeyException`
- ✅ 无 `uk_dm_dmc` 约束冲突错误
- ✅ 所有签出/签入操作成功

**实际结果**：_（待填写）_

---

### TC-03：历史版本浏览功能

**前置条件**：TC-01 已执行完成

**测试步骤**：
1. 在历史版本列表中，点击版本1的"浏览DM"
2. 验证打开的内容是版本1的内容
3. 返回，点击版本2的"浏览DM"
4. 验证打开的内容是版本2的内容
5. 对每个版本重复测试

**预期结果**：
- ✅ 每个版本都能正常打开
- ✅ 显示的内容与该版本一致
- ✅ 不同版本的内容确实不同

**实际结果**：_（待填写）_

---

### TC-04：旧数据兼容性测试

**目的**：验证修复前已归档的数据不受影响

**测试步骤**：
1. 在数据库中查询 `status='0'` 的记录
   ```sql
   SELECT COUNT(*) FROM ietm_data_module WHERE status='0';
   ```
2. 查看历史版本列表

**预期结果**：
- ✅ 旧的已归档版本仍然是 `status='0'`（不显示）
- ✅ 新创建的版本都是 `status='1'`（显示）
- ✅ 系统行为一致

**实际结果**：_（待填写）_

---

### TC-05：极限测试 - 10个历史版本

**目的**：验证大量历史版本的场景

**测试步骤**：
1. 对同一个DM执行 10 次"签出 → 修改 → 签入"
2. 查看历史版本列表

**预期结果**：
- ✅ 历史版本列表显示 10 个版本
- ✅ 所有版本都可以浏览
- ✅ 无性能问题

**实际结果**：_（待填写）_

---

## 🔍 数据库验证 SQL

### 查询某个DM的所有版本（包括归档）

```sql
SELECT 
    id,
    issue_no,
    in_work,
    is_latest,
    status,
    CASE status
        WHEN '0' THEN '已归档'
        WHEN '1' THEN '正常'
        WHEN '2' THEN '临时'
    END as status_name,
    LENGTH(dm_content) as content_length,
    create_time,
    update_time
FROM ietm_data_module
WHERE sns = 'XXX'  -- 替换为实际SNS
  AND info_code = 'XXX'  -- 替换为实际info_code
ORDER BY issue_no DESC, in_work DESC;
```

### 统计各状态版本数量

```sql
SELECT 
    status,
    CASE status
        WHEN '0' THEN '已归档'
        WHEN '1' THEN '正常'
        WHEN '2' THEN '临时'
    END as status_name,
    COUNT(*) as count
FROM ietm_data_module
GROUP BY status;
```

---

## ⚠️ 潜在风险

### 风险1：唯一约束冲突

**症状**：签出时报错 `DuplicateKeyException`

**原因**：数据库确实有 `uk_dm_dmc` 约束包含 `status` 字段

**解决方案**：
```sql
-- 删除旧约束
ALTER TABLE ietm_data_module DROP INDEX uk_dm_dmc;

-- 创建新约束（不包含 status）
CREATE UNIQUE INDEX uk_dm_dmc ON ietm_data_module (
    sns, info_code, info_code_variant, 
    ietm_location_code, language_iso_code, country_iso_code,
    is_latest
) WHERE is_latest = '1';
```

### 风险2：历史版本过多导致性能问题

**缓解措施**：
- 前端列表分页
- 添加"只显示发布版本"过滤选项

---

## 📊 测试结果总结

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| TC-01 基础历史版本累积 | ⏳ 待测试 | |
| TC-02 数据库约束验证 | ⏳ 待测试 | |
| TC-03 历史版本浏览功能 | ⏳ 待测试 | |
| TC-04 旧数据兼容性 | ⏳ 待测试 | |
| TC-05 极限测试 | ⏳ 待测试 | |

---

## 🎯 验收标准

✅ **所有测试用例通过**
✅ **无数据库约束冲突**
✅ **历史版本列表显示所有版本**
✅ **每个版本都能正确浏览**

---

## 📝 测试执行记录

**测试人员**：_（待填写）_  
**测试日期**：_（待填写）_  
**后端版本**：_（待填写）_  
**数据库版本**：_（待填写）_  

**测试环境**：
- 后端地址：http://localhost:9999
- 前端地址：http://localhost:3000
- 数据库：MySQL _（版本待填写）_

**测试结果**：_（待填写）_
