#!/bin/bash
# Para设计器综合测试执行脚本

echo "========================================"
echo "Para设计器综合测试执行"
echo "========================================"
echo ""

cd /d/workspace/IETM/cape-ietm-vue

# 检查前端服务是否运行
echo "【步骤1】检查前端服务状态"
echo "----------------------------------------"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✓ 前端服务运行正常 (http://localhost:3000)"
else
  echo "✗ 前端服务未运行，请先启动：npm run serve"
  exit 1
fi
echo ""

# 检查后端服务是否运行
echo "【步骤2】检查后端服务状态"
echo "----------------------------------------"
if curl -s http://localhost:9999/jeecg-boot/sys/randomImage > /dev/null 2>&1; then
  echo "✓ 后端服务运行正常 (http://localhost:9999)"
else
  echo "✗ 后端服务未运行"
  exit 1
fi
echo ""

# 运行手动测试（逻辑验证）
echo "【步骤3】运行手动测试（逻辑验证）"
echo "----------------------------------------"
node tests/manual/para-indent-fix-verification.js
if [ $? -eq 0 ]; then
  echo "✓ 手动测试通过"
else
  echo "✗ 手动测试失败"
  exit 1
fi
echo ""

# 运行E2E测试 - 缩进修复专项测试
echo "【步骤4】运行E2E测试 - 缩进修复专项测试"
echo "----------------------------------------"
npm run test:e2e -- tests/e2e/para-indent-mismatch-fix.spec.js --reporter=list 2>&1 | tee /tmp/para-indent-test.log
INDENT_TEST_RESULT=${PIPESTATUS[0]}
echo ""

# 运行E2E测试 - 综合功能测试
echo "【步骤5】运行E2E测试 - 综合功能测试"
echo "----------------------------------------"
npm run test:e2e -- tests/e2e/para-designer-comprehensive-validation.spec.js --reporter=list 2>&1 | tee /tmp/para-comprehensive-test.log
COMPREHENSIVE_TEST_RESULT=${PIPESTATUS[0]}
echo ""

# 统计测试结果
echo ""
echo "========================================"
echo "测试结果汇总"
echo "========================================"
echo ""

# 手动测试结果
echo "1. 手动测试（逻辑验证）: ✓ 通过"
echo ""

# E2E缩进测试结果
if [ -f /tmp/para-indent-test.log ]; then
  INDENT_PASSED=$(grep -c "✓" /tmp/para-indent-test.log || echo 0)
  INDENT_FAILED=$(grep -c "✗" /tmp/para-indent-test.log || echo 0)
  echo "2. E2E测试 - 缩进修复专项："
  echo "   通过: $INDENT_PASSED"
  echo "   失败: $INDENT_FAILED"
  if [ $INDENT_TEST_RESULT -eq 0 ]; then
    echo "   状态: ✓ 全部通过"
  else
    echo "   状态: ✗ 存在失败"
  fi
fi
echo ""

# E2E综合测试结果
if [ -f /tmp/para-comprehensive-test.log ]; then
  COMP_PASSED=$(grep -c "✓" /tmp/para-comprehensive-test.log || echo 0)
  COMP_FAILED=$(grep -c "✗" /tmp/para-comprehensive-test.log || echo 0)
  echo "3. E2E测试 - 综合功能："
  echo "   通过: $COMP_PASSED"
  echo "   失败: $COMP_FAILED"
  if [ $COMPREHENSIVE_TEST_RESULT -eq 0 ]; then
    echo "   状态: ✓ 全部通过"
  else
    echo "   状态: ✗ 存在失败"
  fi
fi
echo ""

# 总体结论
echo "========================================"
echo "总体结论"
echo "========================================"
if [ $INDENT_TEST_RESULT -eq 0 ] && [ $COMPREHENSIVE_TEST_RESULT -eq 0 ]; then
  echo "✓ 所有测试通过，Para设计器修复验证成功"
  echo ""
  echo "修复内容："
  echo "- 修复11: 放宽缩进匹配条件（两轮匹配策略）"
  echo "- 修复12: 改进错误消息（显示准确行号）"
  echo ""
  echo "测试覆盖："
  echo "- 基本工作流（打开/编辑/保存/切换视图）"
  echo "- 缩进不一致场景（左对齐/右缩进/混合缩进）"
  echo "- 边界场景（空para/特殊字符/嵌套/表格/长文档）"
  echo "- 保存功能（endline更新/不丢失内容/连续保存）"
  echo "- 压力测试（连续打开关闭/快速编辑保存）"
  echo ""
  echo "可以安全部署到生产环境"
  exit 0
else
  echo "✗ 存在测试失败，请检查日志"
  echo ""
  echo "日志文件："
  echo "- /tmp/para-indent-test.log"
  echo "- /tmp/para-comprehensive-test.log"
  exit 1
fi
