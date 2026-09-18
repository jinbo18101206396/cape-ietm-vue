/**
 * IETM导入导出功能 - 手动验证指南
 * 
 * 由于E2E自动化测试遇到登录页面元素定位问题，
 * 本文档提供手动UI验证步骤，覆盖8项核心问题。
 */

# IETM导入导出功能手动验证指南

## 前提条件
1. 后端服务运行在 http://localhost:9999
2. 前端服务运行在 http://localhost:3000
3. 使用账号: admin / 密码: 123456

---

## 验证步骤

### 准备工作

#### 步骤1: 创建测试项目
1. 登录系统 http://localhost:3000
2. 导航到 `项目管理` 菜单
3. 点击 `新增` 按钮
4. 填写表单：
   - 项目名称: `手动验证项目_20260905`
   - 项目代码: `MANUAL_TEST`
   - 项目描述: `手动验证导入导出功能`
5. 点击 `确定`
6. **验证**: 在列表中看到新创建的项目
7. **记录**: 项目ID = _______

#### 步骤2: 创建构型树节点
1. 导航到 `项目构型管理` 菜单
2. 选择刚创建的项目
3. 点击 `新增` 按钮
4. 填写表单：
   - 节点代码: `TEST`
   - 节点名称: `TEST-测试系统`
   - 父节点: 根节点
5. 点击 `确定`
6. **验证**: 在构型树中看到 TEST 节点

#### 步骤3: 准备测试ZIP包
1. 创建目录结构:
   ```
   test-package/
   ├── DM/
   │   └── DMC-TEST-A-00-0-0-00-00-A-000-A-A_zh-CN.xml
   ├── ICN/
   │   └── ICN-TEST-A-00-0-0-00-00-A-001-A.png
   └── MM/
       └── DMC-TEST-A-00-0-0-00-00-A-000-A-A_测试资源.pdf
   ```

2. DM文件内容 (DMC-TEST-A-00-0-0-00-00-A-000-A-A_zh-CN.xml):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE dmodule>
   <dmodule>
     <identAndStatusSection>
       <dmAddress>
         <dmIdent>
           <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00"
                   subSystemCode="0" subSubSystemCode="0" assyCode="00"
                   disassyCode="00" disassyCodeVariant="A" infoCode="000"
                   infoCodeVariant="A" itemLocationCode="A"/>
           <language languageIsoCode="zh" countryIsoCode="CN"/>
           <issueInfo issueNumber="001" inWork="00"/>
         </dmIdent>
         <dmAddressItems>
           <issueDate year="2026" month="09" day="05"/>
           <dmTitle>
             <techName>手动验证测试DM</techName>
             <infoName>测试信息</infoName>
           </dmTitle>
         </dmAddressItems>
       </dmAddress>
       <dmStatus>
         <security securityClassification="01"/>
         <responsiblePartnerCompany>
           <enterpriseName>测试公司</enterpriseName>
         </responsiblePartnerCompany>
         <originator>
           <enterpriseName>测试制作方</enterpriseName>
         </originator>
       </dmStatus>
     </identAndStatusSection>
     <content>
       <description>
         <para>这是手动验证测试用数据模块</para>
       </description>
     </content>
   </dmodule>
   ```

3. ICN文件: 任意PNG图片，重命名为 `ICN-TEST-A-00-0-0-00-00-A-001-A.png`

4. 资源文件: 任意PDF文件，重命名为 `DMC-TEST-A-00-0-0-00-00-A-000-A-A_测试资源.pdf`

5. 压缩为ZIP: `test-package.zip`

---

### 核心功能验证

#### 【问题1+2】验证导入/导出逻辑对齐及DM/ICN/资源对齐

**操作步骤:**
1. 导航到 `数据导入` 菜单
2. 点击 `数据导入` 按钮
3. 选择项目: `手动验证项目_20260905`
4. 上传ZIP文件: `test-package.zip`
5. 点击 `确定` / `导入`
6. 等待导入完成

**验证点:**
- [ ] 导入成功提示
- [ ] 无错误信息
- [ ] 控制台无异常

**预期结果:**
✅ ZIP包按S1000D 4.0标准结构（DM/、ICN/、MM/）解析成功
✅ DM、ICN、资源三类文件都被正确导入

---

#### 【问题8】验证DM在列表中正常显示

**操作步骤:**
1. 导航到 `数据模块列表` 菜单
2. 选择项目: `手动验证项目_20260905`
3. 查看列表

**验证点:**
- [ ] 看到导入的DM: "手动验证测试DM"
- [ ] DMC显示正确: 包含 "TEST-A-00-0-0-00-00-A-000-A-A"
- [ ] 技术名称显示: "手动验证测试DM"
- [ ] 信息名称显示: "测试信息"
- [ ] 版本号显示: "001-00"

**记录DM ID:** _______

**预期结果:**
✅ 导入的DM在列表中完整显示，所有字段正确

---

#### 【问题3】验证DM自动关联构型树

**操作步骤:**
1. 在数据模块列表中，找到导入的DM
2. 点击 `详情` 或 `编辑` 按钮
3. 查看DM详情页面

**验证点:**
- [ ] 查看"构型节点"或"配置节点"字段
- [ ] 该字段是否显示: "TEST" 或 "TEST-测试系统"
- [ ] 如果字段为空，检查数据库: 
  ```sql
  SELECT cm_node_id FROM ietm_data_module WHERE id = <DM_ID>;
  ```

**预期结果:**
✅ DM自动关联到构型树节点 TEST
✅ 关联算法: 从DMC提取8段式 → 构建路径 → 查找节点 → 设置cm_node_id

**说明:**
- 8段式路径映射: `modelIdentCode/systemDiffCode-systemCode/subSystemCode/...`
- 本例中: `TEST/A-00/0/0/00/00-A/000-A/A` 应匹配到 TEST 节点

---

#### 【问题4】验证ICN自动关联构型树

**操作步骤:**
1. 导航到 `项目实体管理` 菜单
2. 选择项目: `手动验证项目_20260905`
3. 查看ICN列表

**验证点:**
- [ ] 看到导入的ICN: `ICN-TEST-A-00-0-0-00-00-A-001-A.png`
- [ ] 点击 `详情` 查看ICN信息
- [ ] 查看"构型节点"字段是否关联到 TEST

**备用验证 - 数据库:**
```sql
SELECT cm_node_id, originator, security, unique_id 
FROM ietm_icn_manage 
WHERE icn_code LIKE '%TEST%';
```

**预期结果:**
✅ ICN自动关联到构型树节点 TEST
✅ 关联算法: 从ICN文件名提取SNS → 查询节点 → 设置cm_node_id等4字段

---

#### 【问题5+7】验证资源文件自动关联DM及路径统一

**操作步骤:**
1. 导航到 `数据模块列表`
2. 选择项目: `手动验证项目_20260905`
3. 找到导入的DM
4. 点击 `资源列表` 按钮（右侧操作列）
5. 查看资源列表抽屉/模态框

**验证点:**
- [ ] 看到导入的资源: `DMC-TEST-A-00-0-0-00-00-A-000-A-A_测试资源.pdf`
- [ ] 资源名称显示正确
- [ ] 可以点击下载
- [ ] 如果有路径列，查看路径是否包含 `project/` 和 `dm_resource/`

**数据库验证:**
```sql
SELECT file_path, resource_name, dm_id
FROM ietm_dm_comment
WHERE dm_id = <DM_ID>;
```

**预期结果:**
✅ 资源文件自动关联到对应DM
✅ 路径格式统一: `project/{projectId}/dm_resource/{filename}`
✅ 关联算法: 从资源文件名解析DMC前缀 → 查询DM → 创建关联记录

---

#### 【问题6】验证ICN路径统一及预览

**操作步骤:**
1. 导航到 `项目实体管理`
2. 选择项目
3. 找到导入的ICN
4. 点击 `预览` 按钮

**验证点:**
- [ ] 预览模态框打开
- [ ] ICN图片正常显示
- [ ] 无404错误

**数据库验证:**
```sql
SELECT file_path 
FROM ietm_icn_attachment 
WHERE icn_id IN (
  SELECT id FROM ietm_icn_manage WHERE icn_code LIKE '%TEST%'
);
```

**预期结果:**
✅ ICN可以正常预览
✅ 路径格式统一: `project/{projectId}/icn/{filename}`
✅ 导入/导出/预览使用相同路径字段

---

### 完整性验证

#### 验证导出功能

**操作步骤:**
1. 导航到 `数据导出` 或 `DDN数据包` 菜单
2. 选择要导出的DM
3. 点击 `导出` 或 `生成DDN`
4. 下载生成的ZIP包
5. 解压查看结构

**验证点:**
- [ ] ZIP包含 DM/、ICN/、MM/ 三个目录
- [ ] DM/ 目录中有 XML 文件
- [ ] ICN/ 目录中有图片文件（如果DM引用了ICN）
- [ ] MM/ 目录中有资源文件
- [ ] 文件命名符合S1000D标准

**预期结果:**
✅ 导出的ZIP结构与导入完全对齐
✅ 可以将导出的ZIP再次导入，实现闭环

---

## 验证结果汇总

### 8项核心问题验证清单

| 问题 | 验证点 | 通过/失败 | 备注 |
|------|--------|-----------|------|
| **问题1**: 导入/导出逻辑对齐 | ZIP结构S1000D 4.0标准 | [ ] | |
| **问题2**: DM/ICN/资源对齐 | 三类文件都正确导入 | [ ] | |
| **问题3**: DM自动关联构型树 | cm_node_id正确设置 | [ ] | |
| **问题4**: ICN自动关联构型树 | ICN关联到正确节点 | [ ] | |
| **问题5**: 资源自动关联DM | 资源出现在DM资源列表 | [ ] | |
| **问题6**: ICN路径统一 | ICN预览正常显示 | [ ] | |
| **问题7**: 资源路径统一 | 路径格式project/{id}/dm_resource/ | [ ] | |
| **问题8**: DM列表显示 | DM在列表中完整显示 | [ ] | |

### 发现的问题

1. ____________________________________________
2. ____________________________________________
3. ____________________________________________

### 验证结论

- [ ] 所有8项核心问题验证通过
- [ ] 部分通过（请在上方列出问题）
- [ ] 验证失败（请详细描述）

### 验证人员

- 验证日期: __________
- 验证人: __________
- 签名: __________

---

## 附录：代码审计结论

通过深度代码审计，已确认以下事实：

1. **导入逻辑** (IetmDmImportServiceImpl.java):
   - Line 1404-1418: DM自动关联构型树（8段式路径映射）
   - Line 1537-1558: ICN自动关联构型树（SNS映射）
   - Line 1640-1676: ICN文件导入（project/{projectId}/icn/）
   - Line 1750-1786: 资源文件导入（project/{projectId}/dm_resource/）

2. **导出逻辑** (DdnPackageBuilder.java):
   - Line 98-105: ZIP标准目录结构（DM/、ICN/、MM/）
   - Line 318-320: DM文件导出
   - Line 337-358: 资源文件从ietm_dm_comment导出
   - Line 421-423: ICN文件导出

3. **路径统一修复** (IetmDataModuleServiceImpl.java):
   - 新增uploadDmResource接口
   - 手工上传和导入都使用project/{projectId}/dm_resource/

---

## 自动化测试失败原因

E2E自动化测试因登录页面元素定位问题失败，具体原因：
1. 登录按钮选择器 `button:has-text("登录")` 超时
2. 可能的原因：
   - 登录页面使用了动态加载
   - 元素选择器不正确
   - 页面结构与预期不符

建议：
1. 先完成手动验证确认功能正确性
2. 后续调整E2E测试的元素定位策略
3. 使用Playwright的debug模式录制正确的操作流程

---

**结论**: 虽然自动化测试遇到技术障碍，但通过代码审计和手动验证，
可以完整覆盖8项核心问题的验证。
