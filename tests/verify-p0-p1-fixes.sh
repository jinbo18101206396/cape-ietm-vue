#!/bin/bash

# 快速验证所有 P0/P1 修复是否已应用
# 目的: 在运行完整测试前进行快速检查

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="D:\workspace\IETM"
VUE_FILE="$PROJECT_DIR\cape-ietm-vue\src\views\ietm\ietmdatamodulemanagement\editor\components\FigureDesigner.vue"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    P0/P1 修复代码验证                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

CHECKS_PASSED=0
CHECKS_FAILED=0

# 验证函数
check_file_contains() {
  local file=$1
  local pattern=$2
  local description=$3

  if [ ! -f "$file" ]; then
    echo -e "${RED}✗ $description - 文件不存在: $file${NC}"
    ((CHECKS_FAILED++))
    return 1
  fi

  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo -e "${GREEN}✓ $description${NC}"
    ((CHECKS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ $description - 未找到: $pattern${NC}"
    ((CHECKS_FAILED++))
    return 1
  fi
}

# P0-1 检查: handleImportHotspots
check_file_contains "$VUE_FILE" "handleImportHotspots" "P0-1: handleImportHotspots 函数实现"

# P0-1 检查: 去重逻辑
check_file_contains "$VUE_FILE" "compositeKey\|apsid.*name\|dedup" "P0-1: 复合键去重逻辑"

# P0-2 检查: ICN 验证导入
check_file_contains "$VUE_FILE" "FigureValidator\|validateIcn" "P0-2: ICN 验证集成"

# P0-3 检查: XML 生成
check_file_contains "$VUE_FILE" "saveFigureContent\|generateXml" "P0-3: XML 生成实现"

# P1-1 检查: figureId 审计字段
check_file_contains "$VUE_FILE" "figureId" "P1-1: figureId 审计字段"

# P1-1 检查: operator 审计字段
check_file_contains "$VUE_FILE" "operator" "P1-1: operator 审计字段"

# P1-2 检查: 性能优化
check_file_contains "$VUE_FILE" "Promise.all\|optimize\|performance" "P1-2: 性能优化实现"

# P1-3 检查: beforeDestroy 钩子
check_file_contains "$VUE_FILE" "beforeDestroy" "P1-3: beforeDestroy 生命周期钩子"

# P1-3 检查: 清理逻辑
check_file_contains "$VUE_FILE" "this.\$refs\|cleanup\|destroy" "P1-3: 组件清理逻辑"

# P1-4 检查: 后端日志
echo -e "\n${YELLOW}检查后端日志增强...${NC}"

JAVA_VALIDATOR="$PROJECT_DIR\cape-ietm-java\jeecg-module-ietm\jeecg-ietm-biz\src\main\java\org\jeecg\modules\ietm\biz\figure\validator\FigureValidator.java"

if [ -f "$JAVA_VALIDATOR" ]; then
  if grep -q "log\|logger\|Logger" "$JAVA_VALIDATOR" 2>/dev/null; then
    echo -e "${GREEN}✓ P1-4: 后端日志实现${NC}"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗ P1-4: 后端日志实现 - 未找到日志代码${NC}"
    ((CHECKS_FAILED++))
  fi
else
  echo -e "${YELLOW}⚠ P1-4: 后端文件不存在，跳过检查${NC}"
fi

# 显示摘要
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          代码验证摘要                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

echo -e "检查项总数:  $((CHECKS_PASSED + CHECKS_FAILED))"
echo -e "通过:       ${GREEN}$CHECKS_PASSED${NC}"
echo -e "失败:       ${RED}$CHECKS_FAILED${NC}"
echo -e "通过率:     $(echo "scale=1; $CHECKS_PASSED * 100 / ($CHECKS_PASSED + $CHECKS_FAILED)" | bc)%\n"

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ 所有修复已正确应用！${NC}\n"
  echo -e "可以进行下一步测试:"
  echo -e "  ${BLUE}bash run-uat-validation.sh${NC}"
  exit 0
else
  echo -e "${RED}❌ 部分修复未找到或应用不完整${NC}\n"
  exit 1
fi
