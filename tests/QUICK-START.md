# Figure Designer P0/P1 修复 - 测试快速开始

## ⚡ 30秒快速开始

```bash
# 1. 打开两个终端窗口

# 终端1: 启动前端
cd D:\workspace\IETM\cape-ietm-vue
npm run serve
# 等待: App running at: http://localhost:3000/

# 终端2: 启动后端
cd D:\workspace\IETM\cape-ietm-java\cape-ietm-java
# 在IDEA中启动Spring Boot，或运行启动脚本
# 等待: Started Application in X seconds

# 终端3: 运行测试
cd D:\workspace\IETM\cape-ietm-vue\tests
bash run-p0-p1-tests.sh all

# ✓ 等待15-20分钟，测试完成
```

---

## 📊 测试选择

### 我只想快速验证功能修复 ✅
```bash
# 运行集成测试 (~5分钟)
cd D:\workspace\IETM\cape-ietm-vue\tests
bash run-p0-p1-tests.sh integration

# 看到"成功率: 100%"则通过
```

### 我关心性能是否有改进 ⚡
```bash
# 运行性能基准测试 (~8分钟)
bash run-p0-p1-tests.sh performance

# 看到"性能评分: 87/100"则良好
```

### 我担心内存是否有泄漏 🧹
```bash
# 运行内存检测 (~10分钟)
bash run-p0-p1-tests.sh memory

# 看到"内存释放正常"则正常
```

### 我要完整验证所有内容 🎯
```bash
# 运行所有测试 (~15-20分钟)
bash run-p0-p1-tests.sh all

# 所有报告生成在 tests/reports/
```

---

## 🛠️ 故障快速排查

### ❌ "前端服务未启动"
```bash
# 确保前端服务在运行
curl http://localhost:3000

# 如果失败，启动前端
cd D:\workspace\IETM\cape-ietm-vue
npm run serve
```

### ❌ "后端服务未启动"
```bash
# 确保后端服务在运行
curl http://localhost:9999/jeecg-boot

# 如果失败，在IDEA启动Spring Boot应用
```

### ❌ "登录失败"
```bash
# 验证默认用户凭证
用户名: admin
密码: 123456

# 如果仍失败，重启后端服务
```

### ❌ "测试超时"
```bash
# 增加超时时间，编辑测试文件
# 找到: CONFIG.timeout = 30000
# 改为: CONFIG.timeout = 60000
```

---

## 📋 理解测试结果

### 集成测试 ✅/❌

```
成功示例:
✓ 用户登录
✓ P0-1: 热点批量导入执行
✓ P0-2: ICN验证API响应
✓ P0-3: 后端XML生成
✓ P1-1: 审计字段支持
✓ P1-2: 性能优化检查
✓ P1-3: beforeDestroy生命周期
✓ P1-4: 后端日志增强

成功率: 100%
✓ 所有测试通过
```

### 性能测试 📈

```
优秀 (87/100):
✓ 首屏加载: 2341ms (< 3000ms) ✓
✓ 帧率: 52 FPS (>= 30 FPS) ✓
✓ 热点导入: 812ms

良好 (75-85): 可接受
需改进 (< 75): 需优化性能
```

### 内存测试 🧹

```
正常:
✓ 基线: 123MB
✓ 峰值: 245MB
✓ 最终: 128MB
✓ 总增长: 8.5% (< 15%) ✓
✓ 内存释放正常

泄漏警告:
⚠️ 增长率 > 15%
⚠️ 最终内存 > 基线
```

---

## 📍 测试涵盖哪些修复？

| 修复 | 测试覆盖 | 验证项 |
|------|----------|--------|
| **P0-1** 热点导入 | 集成测试 | ✓ 导入功能、✓ 去重逻辑、✓ 用户反馈 |
| **P0-2** ICN验证 | 集成测试 | ✓ API验证、✓ 错误处理 |
| **P0-3** XML生成 | 集成测试 | ✓ 后端生成、✓ 响应格式 |
| **P1-1** 审计字段 | 集成测试 | ✓ 字段传输、✓ 日志记录 |
| **P1-2** 性能优化 | 性能测试 | ✓ 加载时间、✓ 帧率、✓ 响应时间 |
| **P1-3** 内存清理 | 内存测试 | ✓ 泄漏检测、✓ 释放监控 |
| **P1-4** 日志增强 | 集成测试 | ✓ 日志级别、✓ 详细信息 |

---

## 🎯 测试前检查清单

- [ ] 前端服务已启动 (port 3000)
- [ ] 后端服务已启动 (port 9999)
- [ ] Node.js版本 >= 14
- [ ] 网络连接正常
- [ ] 系统内存 >= 2GB空闲
- [ ] 没有其他应用占用3000/9999端口

---

## 📊 查看详细报告

```bash
# 查看集成测试详情
cat D:\workspace\IETM\cape-ietm-vue\tests\reports\figure-p0-p1-integration-report.json

# 查看性能基准数据
cat D:\workspace\IETM\cape-ietm-vue\tests\reports\figure-performance-benchmark.json

# 查看内存分析
cat D:\workspace\IETM\cape-ietm-vue\tests\reports\figure-memory-leak-report.json

# 如果安装了jq工具，可以格式化输出
cat figure-p0-p1-integration-report.json | jq .summary
```

---

## 🚀 下一步

### 所有测试都通过了？ ✅

1. **集成测试** - 100% 通过
2. **性能测试** - 评分 >= 80
3. **内存测试** - 无泄漏

→ **可进入用户验收阶段 (UAT)**

### 某个测试失败了？ ❌

1. 查看对应的详细报告 (tests/reports/)
2. 阅读完整测试计划: `P0-P1-TEST-EXECUTION-PLAN.md`
3. 在该文档"故障诊断"部分找解决方案

---

## 📞 需要帮助？

查看完整文档: `P0-P1-TEST-EXECUTION-PLAN.md`

常见问题已在该文档的"故障诊断"部分详细说明。

---

**预计完成时间**: 15-20分钟
**所需条件**: 两个终端窗口、4GB RAM、稳定网络
**成功标志**: 所有报告生成，无Critical错误
