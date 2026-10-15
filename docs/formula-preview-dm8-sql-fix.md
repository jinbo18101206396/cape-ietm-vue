# 公式预览ICN加载失败 - 诊断分析

## 问题现象

部署修复后，公式图片仍然显示"ICN加载失败"

## 根本原因

**SQL语法不兼容DM8数据库**

修复代码中使用了MySQL语法`LIMIT 1`，但项目使用的是DM8数据库（达梦数据库），不支持该语法。

```java
// ❌ MySQL语法（不兼容DM8）
@Select("... LIMIT 1")

// ✅ DM8标准SQL语法
@Select("... FETCH FIRST 1 ROWS ONLY")
```

## 已修复

**文件**：`IetmIcnFormulaMapper.java`

**修改前**：
```java
"WHERE icn = #{icn} AND isdeleted = '0' " +
"ORDER BY create_time DESC " +
"LIMIT 1")  // ❌ MySQL语法
```

**修改后**：
```java
"WHERE icn = #{icn} AND isdeleted = '0' " +
"ORDER BY create_time DESC " +
"FETCH FIRST 1 ROWS ONLY")  // ✅ DM8标准SQL
```

## 验证步骤

### 1. 重新编译打包 ✅

```bash
cd D:/workspace/IETM/cape-ietm-java
mvn clean package -DskipTests
```

**结果**：✅ BUILD SUCCESS

### 2. 部署新JAR

```bash
# 停止服务
jps | grep jeecg-system-start | awk '{print $1}' | xargs kill

# 备份旧JAR
cd /path/to/deployment
cp jeecg-system-start-3.4.4.jar jeecg-system-start-3.4.4.jar.backup-$(date +%Y%m%d_%H%M%S)

# 复制新JAR
cp D:/workspace/IETM/cape-ietm-java/jeecg-module-system/jeecg-system-start/target/jeecg-system-start-3.4.4.jar .

# 启动服务
java -jar jeecg-system-start-3.4.4.jar --spring.profiles.active=prod &

# 检查日志（确认无SQL错误）
tail -f logs/jeecg-boot.log | grep -i "formula\|icn\|sql"
```

### 3. 手工验证（5分钟）

1. **登录系统**
   - 访问 http://localhost:3000
   - 用户名/密码：admin/admin

2. **新建DM并插入公式**
   - 进入"数据模块管理"
   - 点击"新建"，填写DM基本信息
   - 在Para编辑器中点击"公式"按钮
   - 输入LaTeX：`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`
   - 点击"确定"插入，点击"保存"

3. **验证预览**
   - 点击"预览"按钮
   - ✅ **验证点1**：公式图片正常显示（不是"ICN加载失败"）
   - ✅ **验证点2**：图片清晰可读

4. **验证后端接口**
   - F12打开开发者工具 → Network标签
   - 点击预览按钮
   - 查找`/ietm/icn/view/ICN-`请求
   - ✅ **验证点3**：状态码200
   - ✅ **验证点4**：Content-Type: image/png
   - ✅ **验证点5**：Preview显示PNG图片（不是SVG占位图）

5. **查看后端日志**
   ```bash
   tail -f logs/jeecg-boot.log | grep "公式ICN预览"
   ```
   - ✅ **验证点6**：日志显示"公式ICN预览成功: icnCode=ICN-..., 图片大小=XXkb"

## 技术细节

### DM8 SQL标准语法

DM8（达梦数据库）遵循SQL:2008标准，使用`FETCH FIRST n ROWS ONLY`而非MySQL的`LIMIT n`。

**兼容性对比**：

| 数据库 | LIMIT语法 | FETCH语法 |
|-------|----------|-----------|
| MySQL | ✅ 支持 | ❌ 不支持 |
| PostgreSQL | ✅ 支持 | ✅ 支持 |
| Oracle | ❌ 不支持 | ✅ 支持 |
| DM8 | ❌ 不支持 | ✅ 支持 |
| SQL Server | ❌ 不支持 | ✅ 支持（2012+）|

### 修复文件清单

1. **IetmIcnFormulaMapper.java** - SQL语法修复
   - 路径：`jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/icnmanage/mapper/IetmIcnFormulaMapper.java`
   - 修改：第32行，`LIMIT 1` → `FETCH FIRST 1 ROWS ONLY`

2. **jeecg-system-start-3.4.4.jar** - 重新打包
   - 路径：`jeecg-module-system/jeecg-system-start/target/jeecg-system-start-3.4.4.jar`
   - 大小：164MB
   - 时间：2026-10-15 17:41

## 注意事项

1. **其他LIMIT语法**：检查项目中是否还有其他使用`LIMIT`的SQL，也需要改为`FETCH FIRST n ROWS ONLY`

   ```bash
   cd D:/workspace/IETM/cape-ietm-java
   grep -r "LIMIT 1" --include="*.java" --include="*.xml" | grep -v target | grep -v ".git"
   ```

2. **MyBatis动态SQL**：如果在XML mapper中使用了`LIMIT`，也需要修改

3. **QueryWrapper.last()**：代码中使用MyBatis-Plus的`.last("LIMIT 1")`也需要改为`.last("FETCH FIRST 1 ROWS ONLY")`

## 预期结果

部署新JAR后，公式预览应该正常显示PNG图片，不再出现"ICN加载失败"占位图。

---

**修复版本**：v1.1  
**修复日期**：2026-10-15 17:40  
**修复人员**：Claude  
**根本原因**：SQL语法不兼容DM8数据库（LIMIT → FETCH FIRST）  
**验证状态**：编译通过 ✅ | 部署待办 ⏸️ | 验证待办 ⏸️
