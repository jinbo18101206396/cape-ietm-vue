# DM历史版本数据生命周期详解

**最后更新：** 2026-08-09

---

## 📊 历史版本数据插入时机

### 关键发现：历史版本并非插入新记录，而是通过**版本标记**实现

---

## 🔄 完整的版本生命周期

### 阶段1：创建DM（初始版本）

**操作：** 创建新的DM

**数据库变化：**
```sql
INSERT INTO ietm_data_module (
  id, sns, info_code, ...,
  issue_no = '001',
  in_work = '00',
  is_latest = '1',      -- 标记为最新版本
  version_type = '0',   -- 在编版本
  status = '1'          -- 正常状态
)
```

**说明：**
- 初始版本号：001-00
- `is_latest = '1'` 表示这是最新版本
- `version_type = '0'` 表示未发布（在编）
- `status = '1'` 表示正常可见

---

### 阶段2：签出DM（创建新版本，旧版本变历史）⭐

**操作：** 用户点击"签出"按钮

**文件：** `IetmDataModuleServiceImpl.java` → `checkOut()` 方法（第334-466行）

**数据库变化（3步）：**

#### 步骤1：归档旧的历史版本
```sql
-- 将该DM的所有旧历史版本改为 status='0'（归档，不再显示在历史版本列表）
UPDATE ietm_data_module
SET status = '0'
WHERE sns = 'xxx' 
  AND info_code = 'xxx'
  AND is_latest = '0'    -- 只归档历史版本
  AND status = '1';      -- 之前还可见的
```

#### 步骤2：当前版本降级为历史版本
```sql
-- 将当前版本标记为历史版本
UPDATE ietm_data_module
SET is_latest = '0',     -- ⭐ 不再是最新版本
    update_time = NOW()
WHERE id = 'current_dm_id'
  AND is_latest = '1';   -- CAS并发控制
```

**关键：** 这一步使当前版本变成了"历史版本"！
- `is_latest = '0'` 表示这是历史版本
- `status = '1'` 保持不变，所以在历史版本列表中可见
- **这条记录不是新插入的，而是UPDATE现有记录！**

#### 步骤3：插入新版本
```sql
-- 插入新的版本（inWork +1）
INSERT INTO ietm_data_module (
  id = 'new_id',
  sns, info_code, ...,    -- 继承自原版本
  issue_no = '001',       -- 发行号不变
  in_work = '01',         -- ⭐ 在编号 +1
  is_latest = '1',        -- ⭐ 标记为最新版本
  version_type = '0',     -- 仍是在编版本
  status = '1',
  checkout_user = 'admin' -- 标记签出人
)
```

**结果：**
- 旧版本（001-00）：`is_latest='0'`, `status='1'` → **历史版本，可见**
- 新版本（001-01）：`is_latest='1'`, `status='1'` → **当前版本**

---

### 阶段3：签入DM（提交修改）

**操作：** 用户编辑后点击"签入"按钮

**文件：** `IetmDataModuleServiceImpl.java` → `checkIn()` 方法（第533-588行）

**数据库变化：**
```sql
-- 只更新当前版本，清除签出状态
UPDATE ietm_data_module
SET checkout_user = NULL,
    checkout_time = NULL,
    checkin_time = NOW(),
    reason = '签入备注'
WHERE id = 'current_dm_id';
```

**关键点（第556-562行）：**
```java
// ✅ 修复：签入时保留原版本作为历史版本 (is_latest='0', status='1')
// 注释说明：
//   - 旧版本签出时已在第418-433行归档了历史版本
//   - 签入后，原版本应保留为 status='1' 以便在"历史版本"列表中可见
```

**说明：**
- 签入**不改变**版本号
- 签入**不创建**新的历史版本
- 只是清除签出状态，允许再次签出

---

### 阶段4：发布DM（版本定型）

**操作：** 用户点击"发布"按钮

**文件：** `IetmDataModuleServiceImpl.java` → `publishDm()` 方法（第592-660行）

**数据库变化：**
```sql
-- 将当前版本标记为已发布
UPDATE ietm_data_module
SET version_type = '1',     -- ⭐ 标记为已发布
    issue_no = '002',       -- ⭐ 发行号 +1（如果达到inWork=99）
    in_work = '00',         -- ⭐ 在编号重置为00
    publish_time = NOW(),
    publish_user = 'admin'
WHERE id = 'current_dm_id';
```

**说明：**
- 发布后版本号从 `001-01` 变为 `002-00`
- `version_type = '1'` 表示已发布，不可再签出
- 发布的版本成为新的基线

---

## 📋 历史版本的判定标准

### 什么是历史版本？

在数据库中，满足以下条件的记录会显示在"历史版本"列表：

```sql
SELECT * FROM ietm_data_module
WHERE sns = 'xxx'
  AND info_code = 'xxx'
  AND info_code_variant = 'xxx'
  AND status = '1'           -- ⭐ 必须是正常状态（未归档）
ORDER BY issue_no DESC, in_work DESC;
```

**关键字段：**
- `is_latest = '0'` → 历史版本
- `is_latest = '1'` → 当前版本
- `status = '1'` → 可见
- `status = '0'` → 已归档（签出时被归档，不再显示）

---

## 🔍 版本状态矩阵

| is_latest | status | version_type | 说明 | 显示位置 |
|-----------|--------|--------------|------|---------|
| `1` | `1` | `0` | 当前在编版本 | 列表页主记录 |
| `1` | `1` | `1` | 当前已发布版本 | 列表页主记录 |
| `0` | `1` | `0/1` | **历史版本（可见）** | **历史版本列表** |
| `0` | `0` | `0/1` | 归档版本（不可见） | 不显示 |

---

## 🎯 核心理解

### 历史版本不是单独的表！

很多人以为历史版本存储在单独的 `history` 表中，但实际上：

1. **同一张表**：历史版本和当前版本都在 `ietm_data_module` 表中
2. **通过字段区分**：用 `is_latest` 字段区分当前版本和历史版本
3. **签出时产生**：签出时通过 `UPDATE` 将当前版本降级为历史版本
4. **不是INSERT**：历史版本不是新插入的记录，而是UPDATE现有记录

### 为什么这样设计？

**优点：**
- 简化数据模型，不需要单独的历史表
- 版本之间的关系通过DMC编码关联
- 查询效率高（单表查询）

**缺点：**
- 需要小心处理唯一约束（`uk_dm_dmc` 包含 `is_latest` 字段）
- 签出时需要归档旧历史版本（`status='0'`）

---

## 📊 实际案例

### 初始状态（刚创建）

| ID | DMC | issue_no | in_work | is_latest | status | version_type |
|----|-----|----------|---------|-----------|--------|--------------|
| 1  | DMC-...-A | 001 | 00 | 1 | 1 | 0 |

---

### 第1次签出后

| ID | DMC | issue_no | in_work | is_latest | status | version_type | 说明 |
|----|-----|----------|---------|-----------|--------|--------------|------|
| 1  | DMC-...-A | 001 | 00 | **0** | 1 | 0 | 变成历史版本 |
| 2  | DMC-...-A | 001 | **01** | 1 | 1 | 0 | 新的当前版本 |

**历史版本列表显示：** 001-00

---

### 第2次签出后

| ID | DMC | issue_no | in_work | is_latest | status | version_type | 说明 |
|----|-----|----------|---------|-----------|--------|--------------|------|
| 1  | DMC-...-A | 001 | 00 | 0 | **0** | 0 | 被归档，不再显示 |
| 2  | DMC-...-A | 001 | 01 | **0** | 1 | 0 | 变成历史版本 |
| 3  | DMC-...-A | 001 | **02** | 1 | 1 | 0 | 新的当前版本 |

**历史版本列表显示：** 001-01（001-00已归档）

---

### 发布后

| ID | DMC | issue_no | in_work | is_latest | status | version_type | 说明 |
|----|-----|----------|---------|-----------|--------|--------------|------|
| 1  | DMC-...-A | 001 | 00 | 0 | 0 | 0 | 归档 |
| 2  | DMC-...-A | 001 | 01 | 0 | 1 | 0 | 历史版本 |
| 3  | DMC-...-A | **002** | **00** | 1 | 1 | **1** | 已发布版本 |

**历史版本列表显示：** 001-01, 002-00

---

## 🔧 相关SQL查询

### 查询某个DM的所有历史版本

```sql
SELECT 
  id,
  CONCAT(issue_no, '-', in_work) as version,
  version_type,
  create_time,
  LENGTH(dm_content) as xml_length
FROM ietm_data_module
WHERE sns = 'ZB1'
  AND info_code = '02'
  AND info_code_variant = '00'
  AND ietm_location_code = '00'
  AND language_iso_code = 'zh'
  AND country_iso_code = 'CN'
  AND status = '1'          -- 只显示可见的
ORDER BY issue_no DESC, in_work DESC;
```

### 查询当前版本

```sql
SELECT * FROM ietm_data_module
WHERE sns = 'ZB1'
  AND info_code = '02'
  -- ... 其他DMC字段
  AND is_latest = '1'       -- 最新版本
  AND status = '1';
```

### 模拟历史版本列表页面的查询

```sql
-- 对应后端 selectHistoryVersions 方法
SELECT 
  id,
  issue_no,
  in_work,
  version_type,
  create_time,
  create_by,
  checkout_user,
  dm_content              -- ⭐ 包含XML内容
FROM ietm_data_module
WHERE sns = ?
  AND info_code = ?
  AND info_code_variant = ?
  AND status = '1'        -- 只显示未归档的
ORDER BY issue_no DESC, in_work DESC;
```

---

## 🎯 总结

### 历史版本数据何时插入？

**答案：从不单独插入！**

历史版本是通过以下机制产生的：

1. **创建时：** INSERT 第一个版本（`is_latest='1'`）
2. **签出时：** 
   - UPDATE 当前版本 → `is_latest='0'`（变成历史版本）
   - INSERT 新版本 → `is_latest='1'`（新的当前版本）
3. **签入时：** 不产生新版本，只更新当前版本
4. **发布时：** 更新版本号，不产生新版本

### 关键点

- ✅ 历史版本是 **UPDATE** 出来的，不是 **INSERT** 出来的
- ✅ 签出操作是产生历史版本的唯一时机
- ✅ 同一张表，通过 `is_latest` 区分
- ✅ 旧的历史版本会被归档（`status='0'`），不再显示

---

## 🔗 相关代码位置

| 操作 | 文件 | 方法 | 行号 |
|------|------|------|------|
| 签出（产生历史版本） | IetmDataModuleServiceImpl.java | checkOut() | 334-466 |
| 归档旧历史版本 | 同上 | checkOut() | 418-433 |
| 降级为历史版本 | 同上 | checkOut() | 435-449 |
| 签入 | 同上 | checkIn() | 533-588 |
| 发布 | 同上 | publishDm() | 592-660 |
| 查询历史版本 | 同上 | queryHistoryVersions() | 约700行 |

---

**结论：** 历史版本数据在**签出（checkout）操作时**，通过UPDATE将当前版本的 `is_latest` 从 `'1'` 改为 `'0'` 而产生，而不是单独插入新记录。
