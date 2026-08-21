#!/bin/bash

# ========================================
# Playwright E2E测试运行脚本
# ========================================

echo "=========================================="
echo "  IETM复制DM功能 - E2E测试"
echo "=========================================="
echo ""

# 检查环境变量
if [ -z "$BASE_URL" ]; then
  export BASE_URL="http://localhost:3000"
  echo "⚠️  BASE_URL未设置，使用默认值: $BASE_URL"
fi

if [ -z "$API_BASE_URL" ]; then
  export API_BASE_URL="http://localhost:9999/jeecg-boot"
  echo "⚠️  API_BASE_URL未设置，使用默认值: $API_BASE_URL"
fi

if [ -z "$TEST_USERNAME" ]; then
  export TEST_USERNAME="admin"
  echo "⚠️  TEST_USERNAME未设置，使用默认值: $TEST_USERNAME"
fi

if [ -z "$TEST_PASSWORD" ]; then
  export TEST_PASSWORD="admin123"
  echo "⚠️  TEST_PASSWORD未设置，使用默认值: $TEST_PASSWORD"
fi

echo ""
echo "测试配置:"
echo "  前端URL: $BASE_URL"
echo "  后端API: $API_BASE_URL"
echo "  测试账号: $TEST_USERNAME"
echo ""

# 创建截图目录
mkdir -p test-results/screenshots

# 选择测试模式
if [ "$1" == "quick" ]; then
  echo "=========================================="
  echo "  运行快速验证测试"
  echo "=========================================="
  npx playwright test tests/e2e/dm-copy/quick-verify.spec.js --reporter=list

elif [ "$1" == "full" ]; then
  echo "=========================================="
  echo "  运行完整E2E测试"
  echo "=========================================="
  npx playwright test tests/e2e/dm-copy/copy-dm.spec.js --reporter=list

elif [ "$1" == "ui" ]; then
  echo "=========================================="
  echo "  启动UI模式（交互式）"
  echo "=========================================="
  npx playwright test --ui

elif [ "$1" == "debug" ]; then
  echo "=========================================="
  echo "  启动调试模式"
  echo "=========================================="
  npx playwright test tests/e2e/dm-copy/ --debug

else
  echo "=========================================="
  echo "  运行所有测试"
  echo "=========================================="
  npx playwright test tests/e2e/dm-copy/ --reporter=html
  echo ""
  echo "测试完成！查看报告："
  echo "  npx playwright show-report test-results/html"
fi

echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
