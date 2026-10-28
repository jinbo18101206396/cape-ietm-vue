# Figure Designer P0/P1 修复测试执行计划

## 📋 概述

本文档描述了对Figure Designer 7个关键修复(3个P0 + 4个P1)进行全面验证的测试计划。

**修复范围:**
- ✅ P0-1: 热点批量导入功能 
- ✅ P0-2: ICN有效性验证
- ✅ P0-3: XML生成后端统一
- ✅ P1-1: 审计追踪字段
- ✅ P1-2: 性能优化(顺序加载)
- ✅ P1-3: 内存泄漏防护
- ✅ P1-4: 日志系统增强

**测试覆盖:**
- 集成功能测试
- 性能基准测试
- 内存泄漏检测
- 后端单元测试

---

## 🏗️ 环境准备

### 前置条件

```bash
# 1. 前端开发服务启动
cd D:\workspace\IETM\cape-ietm-vue
npm install  # 如果未安装依赖
npm run serve

# 输出: App running at: http://localhost:3000/

# 2. 后端服务启动
# 在IDEA中打开后端项目并运行Spring Boot Application
# 或使用Maven命令:
cd D:\workspace\IETM\cape-ietm-java
mvn clean install -pl jeecg-module-ietm
mvn spring-boot:run

# 输出: Started Application in X seconds
# 验证: http://localhost:9999/jeecg-boot/swagger-ui.html
```

### 服务验证

```bash
# 验证前端服务
curl -I http://localhost:3000

# 验证后端服务
curl -I http://localhost:9999/jeecg-boot

# 验证Playwright环境
npx playwright --version
```

---

## 🧪 测试执行

### 方式1: 运行完整测试套件(推荐)

```bash
cd D:\workspace\IETM\cape-ietm-vue\tests

# Windows PowerShell
bash run-p0-p1-tests.sh all

# 或Linux/Mac
chmod +x run-p0-p1-tests.sh
./run-p0-p1-tests.sh all

# 预计耗时: 15-20分钟
```

### 方式2: 分别运行各类测试

#### 集成功能测试 (~5分钟)
```bash
node figure-designer-p0-p1-integration.spec.js

# 或
bash run-p0-p1-tests.sh integration

# 验证范围:
# ✓ P0-1: 热点导入 - 预览数据批量导入且去重
# ✓ P0-2: ICN验证 - 后端验证API正常工作
# ✓ P0-3: XML生成 - 后端生成XML并返回
# ✓ P1-1: 审计字段 - operator和figureId字段支持
# ✓ P1-2: 性能优化 - 顺序加载方式运行
# ✓ P1-3: 内存清理 - beforeDestroy钩子存在
# ✓ P1-4: 日志增强 - 日志系统正常工作
```

#### 性能基准测试 (~8分钟)
```bash
node figure-designer-performance-benchmark.spec.js

# 或
bash run-p0-p1-tests.sh performance

# 评估维度:
# ⏱️ 首屏加载时间 (应 < 3s)
# ⚡ 小规模处理 (10图形)
# 📜 滚动帧率 (应 > 30 FPS)
# 🔥 热点导入性能
# 🧹 内存泄漏倾向
# 🖱️ 复杂交互响应
```

#### 内存泄漏检测 (~10分钟)
```bash
node figure-designer-memory-leak-detection.spec.js

# 或
bash run-p0-p1-tests.sh memory

# 检测范围:
# 📍 基线测量 - 程序启动时内存
# 🔄 打开/关闭循环 (10轮)
# ✏️ 编辑操作循环
# 🔥 热点导入循环
# 🧹 最终垃圾回收
```

---

## 📊 测试报告位置

所有报告均生成在:
```
D:\workspace\IETM\cape-ietm-vue\tests\reports\
```

### 报告文件

| 文件名 | 内容 | 格式 |
|--------|------|------|
| `figure-p0-p1-integration-report.json` | 集成测试结果 | JSON |
| `figure-performance-benchmark.json` | 性能基准数据 | JSON |
| `figure-memory-leak-report.json` | 内存泄漏分析 | JSON |
| `test-execution-summary.txt` | 完整执行总结 | TXT |

### 查看报告

```bash
# 查看集成测试结果
cat D:\workspace\IETM\cape-ietm-vue\tests\reports\figure-p0-p1-integration-report.json | jq .summary

# 查看性能评分
cat D:\workspace\IETM\cape-ietm-vue\tests\reports\figure-performance-benchmark.json | jq .performanceScore

# 查看内存诊断
cat D:\workspace\IETM\cape-ietm-vue\tests\reports\figure-memory-leak-report.json | jq .analysis
```

---

## ✅ 成功标准

### 集成测试通过条件

```
✅ 所有7个修复点都通过验证
✅ 成功率 >= 85% (最多1个测试失败)
❌ 不允许核心功能(P0)测试失败
```

### 性能测试通过条件

```
✅ 首屏加载时间 < 3000ms
✅ 平均帧率 >= 30 FPS
✅ 热点导入 < 2000ms
✅ 性能评分 >= 80/100
```

### 内存测试通过条件

```
✅ 内存总增长率 < 15%
✅ 单次迭代平均增长 < 2MB
✅ 内存释放正常 (最终内存 <= 基线内存)
✅ 无关键泄漏迹象 (severity != critical)
```

### 后端单元测试通过条件

```bash
# 运行后端测试
cd D:\workspace\IETM\cape-ietm-java\jeecg-module-ietm\jeecg-ietm-biz

# Maven运行
mvn -Dtest=FigureDesignerP0P1Test test

# 或在IDEA中右键运行
# All Tests Pass ✓
```

---

## 🔍 故障诊断

### 常见问题

#### 问题1: "前端服务未启动"
```bash
# 解决方案
cd D:\workspace\IETM\cape-ietm-vue
npm run serve

# 或检查端口
netstat -an | find ":3000"  # Windows
lsof -i :3000              # Mac/Linux
```

#### 问题2: "后端服务未启动"
```bash
# 解决方案
# 在IDEA中启动 Application.java
# 或检查port 9999
netstat -an | find ":9999"
```

#### 问题3: "登录失败"
```bash
# 检查用户凭证 (CLAUDE.md中有默认用户)
# 重启后端服务，重置Redis缓存
```

#### 问题4: "超时错误"
```bash
# 增加超时时间
# 修改测试文件中的 timeout 字段
CONFIG.timeout = 60000  # 从30s增加到60s
```

#### 问题5: "内存测试显示泄漏"
```bash
# 这可能是:
# 1. 浏览器缓存导致的正常现象
# 2. 第三方库的缓存行为
# 3. 真正的泄漏

# 判别方法:
# - 运行多次检测，观察趋势
# - 如果内存最终稳定在某个值，通常是缓存
# - 如果持续增长，则为真正泄漏
```

---

## 📈 性能优化指南

### 如果性能评分 < 80

1. **首屏加载慢 (> 3s)**
   - 检查 loadContent 是否为顺序加载
   - 检查网络请求是否并行
   - 考虑预加载或缓存

2. **帧率低 (< 30 FPS)**
   - 检查DOM操作是否过于频繁
   - 检查Vue组件是否有不必要的重新渲染
   - 使用v-show代替v-if减少重排

3. **内存占用高**
   - 检查beforeDestroy是否正确清理
   - 检查是否有未移除的事件监听
   - 检查定时器是否正确清除

### 性能优化检查清单

- [ ] 确认 loadGraphicPreview 为顺序调用
- [ ] 确认 beforeDestroy 清理了所有数据
- [ ] 确认没有内存泄漏的定时器
- [ ] 确认没有注册过多的事件监听器
- [ ] 确认图片加载是否有缓存策略

---

## 🚀 持续集成建议

### CI/CD集成

```yaml
# GitLab CI 示例 (.gitlab-ci.yml)
test:p0-p1:
  image: node:16
  script:
    - cd cape-ietm-vue
    - npm install
    - npm run serve &
    - sleep 5
    - cd tests
    - bash run-p0-p1-tests.sh integration
  artifacts:
    paths:
      - tests/reports/
    expire_in: 30 days
```

### 定期测试计划

```
每周一、三、五: 运行完整测试套件
- 验证修复没有回退
- 监控性能趋势
- 跟踪内存使用

发版前: 运行完整测试 + 手动验证
- 100%通过率
- 性能评分 >= 90/100
- 无内存泄漏
```

---

## 📝 测试记录模板

```markdown
## 测试执行记录

**执行日期**: 2026-10-25
**执行人**: [姓名]
**环境**: 
- Node: v18.x
- Browser: Chrome/Edge
- 系统: Windows 11

### 测试结果

**集成测试**: ✅ PASS (7/7)
- 首屏加载: 2341ms
- 热点导入: 812ms
- 验证通过率: 100%

**性能测试**: ✅ PASS
- 性能评分: 87/100
- 平均帧率: 52 FPS
- 内存峰值: 245MB

**内存测试**: ✅ PASS
- 内存增长率: 8.5%
- 无关键泄漏
- 释放正常

**后端测试**: ✅ PASS (全部12个测试)

### 问题记录

无

### 备注

所有修复均正常工作，可进入下一阶段。
```

---

## 📞 支持与反馈

**问题报告:**
- 将测试报告和错误日志提交到 JIRA/GitHub Issues
- 包含环境信息和复现步骤
- 标记为 P0/P1/P2 级别

**性能改进建议:**
- 基于基准测试数据提出优化方案
- 在代码注释中记录优化原因

---

## ✨ 下一步工作

完整测试通过后，可进行:

1. **集成测试** - 与其他模块的集成验证
2. **压力测试** - 100+图形、长时间运行
3. **用户验收测试 (UAT)** - 真实场景验证
4. **文档更新** - 修复说明、性能指标
5. **发版准备** - 打标签、发布说明

---

**最后更新**: 2026-10-25
**版本**: 1.0
