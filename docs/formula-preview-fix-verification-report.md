# 公式预览修复验证报告

## 问题描述

**问题**：插入公式后点击"预览"按钮，弹出的"DM内容预览"弹出框中显示"ICN加载失败"

**影响**：用户无法预览刚插入的公式，体验受损

## 根因分析

1. **存储架构**
   - 公式ICN存储在独立的`ietm_icn_formula`表（绕过DM8聚集索引CLOB限制）
   - `filecontent`字段存储完整的`<img>`标签HTML（包含base64图片和LaTeX源码）

2. **预览接口缺陷**
   - 预览接口`/ietm/icn/view/{icnCode}`只查询`ietm_icn_manage`表
   - 导致公式ICN查询不到，返回"ICN不存在"的SVG占位图

## 修复方案

### 后端修改

**文件**：`IetmIcnViewController.java`

**修改点**：`viewIcn()`方法

**修复逻辑**：
```java
// 1. 优先从ietm_icn_formula表查询
IetmIcnFormula formulaEntity = icnFormulaService.getByIcnWithContent(icnCode);

if (formulaEntity != null && formulaEntity.getFilecontent() != null) {
    // 2. 从HTML中提取base64图片数据
    String formulaHtml = new String(formulaEntity.getFilecontent(), StandardCharsets.UTF_8);
    Pattern pattern = Pattern.compile("src=\"(data:image/png;base64,[^\"]+)\"");
    Matcher matcher = pattern.matcher(formulaHtml);
    
    if (matcher.find()) {
        String base64Data = matcher.group(1);
        String base64Image = base64Data.substring(base64Data.indexOf(',') + 1);
        byte[] imageBytes = Base64.getDecoder().decode(base64Image);
        
        // 3. 返回PNG图片
        response.setContentType("image/png");
        response.getOutputStream().write(imageBytes);
        return;
    }
}

// 4. 降级到查询ietm_icn_manage表（图符/视频/音频）
// ... 原有逻辑
```

## 验证结果

### 1. 编译验证 ✅

```bash
cd D:/workspace/IETM/cape-ietm-java
mvn clean compile -pl jeecg-module-ietm -am -DskipTests
```

**结果**：✅ BUILD SUCCESS

### 2. 单元测试 ✅

**测试文件**：`IetmIcnViewControllerFormulaViewLogicTest.java`

**测试覆盖**：
- ✅ TC-01: 正常提取base64图片
- ✅ TC-02: HTML包含多个属性
- ✅ TC-03: 提取失败 - 没有src属性
- ✅ TC-04: 提取失败 - src不是data URL
- ✅ TC-05: 空字符串
- ✅ TC-06: 真实复杂公式HTML
- ✅ TC-07: IetmIcnFormula实体转换
- ✅ TC-08: 边界情况 - null filecontent
- ✅ TC-09: 边界情况 - 空byte[]
- ✅ TC-10: Base64解码异常处理

**结果**：✅ 10/10 通过

```
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### 3. 打包验证 ✅

```bash
mvn clean package -DskipTests
```

**结果**：✅ BUILD SUCCESS

**输出JAR**：
- 文件：`jeecg-module-system/jeecg-system-start/target/jeecg-system-start-3.4.4.jar`
- 大小：164MB
- 时间：2026-10-15 17:33:25

### 4. E2E测试准备 ✅

**测试文件**：`tests/e2e/formula-preview-fix-verification.spec.js`

**测试场景**：
- TC-01: 新建DM → 插入公式 → 预览 → 验证公式显示
- TC-02: 编辑已有DM（包含公式） → 预览 → 验证公式显示
- TC-03: 直接调用后端ICN预览接口验证

**前置条件**：
1. ✅ 后端服务运行在 http://localhost:9999
2. ⏸️ 前端服务运行在 http://localhost:3000（待启动）
3. ⏸️ 数据库中有可编辑的DM（待验证）
4. ⏸️ 部署包含修复的后端JAR（待部署）

## 待办清单

### L1: 部署后端JAR

```bash
# 1. 停止现有Java进程
# 方式A: 如果使用systemd
sudo systemctl stop jeecg-boot

# 方式B: 如果手动运行
jps | grep jeecg-system-start | awk '{print $1}' | xargs kill

# 2. 备份旧JAR
cd /path/to/deployment
cp jeecg-system-start-3.4.4.jar jeecg-system-start-3.4.4.jar.backup-$(date +%Y%m%d_%H%M%S)

# 3. 复制新JAR
cp D:/workspace/IETM/cape-ietm-java/jeecg-module-system/jeecg-system-start/target/jeecg-system-start-3.4.4.jar .

# 4. 启动服务
java -jar jeecg-system-start-3.4.4.jar --spring.profiles.active=prod &

# 5. 检查日志
tail -f logs/jeecg-boot.log | grep -i "formula\|icn"
```

### L2: 运行E2E测试

```bash
cd D:/workspace/IETM/cape-ietm-vue

# 1. 安装Playwright（如果尚未安装）
npm install -D @playwright/test
npx playwright install chromium

# 2. 启动前端开发服务器（另一个终端）
npm run serve

# 3. 运行E2E测试
npx playwright test tests/e2e/formula-preview-fix-verification.spec.js --headed

# 4. 查看测试报告
npx playwright show-report
```

### L3: 手工验证步骤

如果E2E测试无法运行，手工验证：

1. **登录系统**
   - 访问 http://localhost:3000
   - 用户名/密码：admin/admin

2. **新建DM并插入公式**
   - 进入"数据模块管理"
   - 点击"新建"
   - 填写DM基本信息
   - 在Para编辑器中点击"公式"按钮
   - 输入LaTeX公式：`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`
   - 点击"确定"插入
   - 点击"保存"

3. **验证预览**
   - 点击"预览"按钮
   - 等待预览弹窗加载
   - ✅ **验证点1**：公式图片正常显示（不是"ICN加载失败"）
   - ✅ **验证点2**：公式图片清晰可见
   - ✅ **验证点3**：右键"查看图片"能看到完整PNG图片

4. **验证已有DM**
   - 返回数据模块列表
   - 选择一个已有DM并编辑
   - 点击"预览"
   - ✅ **验证点4**：如果DM包含公式，公式能正常显示

5. **验证后端接口**
   - 打开浏览器开发者工具（F12）
   - 切换到Network标签
   - 点击预览按钮
   - 查找`/ietm/icn/view/ICN-`开头的请求
   - ✅ **验证点5**：状态码200
   - ✅ **验证点6**：Content-Type: image/png
   - ✅ **验证点7**：Response显示图片内容（不是SVG占位图）

## 验证标准

### 成功标准 ✅

- [x] 后端编译通过
- [x] 单元测试10/10通过
- [x] 打包成功生成164MB JAR
- [ ] 部署后服务正常启动
- [ ] E2E测试3/3通过，或手工验证7/7通过
- [ ] 预览弹窗中公式图片正常显示
- [ ] 浏览器Network显示`/ietm/icn/view/`返回PNG图片

### 失败判定 ❌

- 预览弹窗显示"ICN加载失败"占位图
- `/ietm/icn/view/`接口返回SVG占位图
- 接口返回状态码404或500
- 公式图片显示破损图标

## 回滚计划

如果验证失败：

```bash
# 1. 停止服务
sudo systemctl stop jeecg-boot

# 2. 恢复旧JAR
cd /path/to/deployment
cp jeecg-system-start-3.4.4.jar.backup-YYYYMMDD_HHMMSS jeecg-system-start-3.4.4.jar

# 3. 重启服务
sudo systemctl start jeecg-boot

# 4. 检查日志
tail -f logs/jeecg-boot.log
```

## 注意事项

1. **数据库事务**：修复不涉及数据库schema变更，无需执行SQL脚本

2. **缓存清理**：如果使用了Redis缓存ICN数据，重启后端服务会自动刷新

3. **前端无需变更**：修复仅在后端，前端代码无需重新构建

4. **向后兼容**：修复完全向后兼容，对图符/视频/音频预览无影响

## 修复文件清单

### 后端

1. `IetmIcnViewController.java` - 核心修复
   - 路径：`jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/controller/IetmIcnViewController.java`
   - 修改：`viewIcn()`方法增加公式ICN查询逻辑

2. `IetmIcnViewControllerFormulaViewLogicTest.java` - 单元测试
   - 路径：`jeecg-module-ietm/src/test/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/controller/IetmIcnViewControllerFormulaViewLogicTest.java`
   - 状态：10/10测试通过

### 前端

无需修改（预览功能已正常，只是后端接口返回了错误的占位图）

### E2E测试

1. `formula-preview-fix-verification.spec.js`
   - 路径：`tests/e2e/formula-preview-fix-verification.spec.js`
   - 状态：待运行

---

**修复版本**：v1.0  
**修复日期**：2026-10-15  
**修复人员**：Claude  
**验证状态**：L1编译通过 ✅ | L2部署待办 ⏸️ | L3验证待办 ⏸️
