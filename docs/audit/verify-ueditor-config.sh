#!/bin/bash
# UEditor工具栏配置一致性验证脚本
# 日期: 2026-09-28

echo "=========================================="
echo "UEditor工具栏配置一致性验证"
echo "=========================================="
echo ""

# 定义颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
pass=0
fail=0

# 验证函数
verify() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
    ((pass++))
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    ((fail++))
  fi
}

echo "📂 检查配置文件..."
echo ""

# 验证1: 检查全局配置文件存在
if [ -f "public/static/ueditor/ueditor.config.js" ]; then
  verify 0 "全局配置文件存在"
else
  verify 1 "全局配置文件存在"
fi

# 验证2: 检查组件配置文件存在
if [ -f "src/views/ietm/ietmdatamodulemanagement/editor/utils/ueditorConfig.js" ]; then
  verify 0 "组件配置文件存在"
else
  verify 1 "组件配置文件存在"
fi

echo ""
echo "🔍 检查全局配置（ueditor.config.js）..."
echo ""

# 验证3: 全局配置包含insertrow
if grep -q "'insertrow'" public/static/ueditor/ueditor.config.js; then
  verify 0 "全局配置包含insertrow"
else
  verify 1 "全局配置包含insertrow"
fi

# 验证4: 全局配置包含deleterow
if grep -q "'deleterow'" public/static/ueditor/ueditor.config.js; then
  verify 0 "全局配置包含deleterow"
else
  verify 1 "全局配置包含deleterow"
fi

# 验证5: 全局配置不包含inserttable（在工具栏定义中）
if grep -A 10 "toolbars.*\[\[" public/static/ueditor/ueditor.config.js | grep -v "inserttable.*已修复\|移除inserttable" | grep -q "'inserttable'"; then
  verify 1 "全局配置不包含inserttable"
else
  verify 0 "全局配置不包含inserttable"
fi

echo ""
echo "🔍 检查组件配置（ueditorConfig.js）..."
echo ""

# 验证6: simpleToolbar包含insertrow
if grep -A 15 "const simpleToolbar" src/views/ietm/ietmdatamodulemanagement/editor/utils/ueditorConfig.js | grep -q "'insertrow'"; then
  verify 0 "simpleToolbar包含insertrow"
else
  verify 1 "simpleToolbar包含insertrow"
fi

# 验证7: simpleToolbar包含deleterow
if grep -A 15 "const simpleToolbar" src/views/ietm/ietmdatamodulemanagement/editor/utils/ueditorConfig.js | grep -q "'deleterow'"; then
  verify 0 "simpleToolbar包含deleterow"
else
  verify 1 "simpleToolbar包含deleterow"
fi

# 验证8: simpleToolbar不包含inserttable
if grep -A 15 "const simpleToolbar" src/views/ietm/ietmdatamodulemanagement/editor/utils/ueditorConfig.js | grep -q "'inserttable'"; then
  verify 1 "simpleToolbar不包含inserttable"
else
  verify 0 "simpleToolbar不包含inserttable"
fi

echo ""
echo "🔍 检查ParaDesigner.vue..."
echo ""

# 验证9: ParaDesigner使用getUEditorConfig
if grep -q "getUEditorConfig" src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue; then
  verify 0 "ParaDesigner使用getUEditorConfig"
else
  verify 1 "ParaDesigner使用getUEditorConfig"
fi

# 验证10: ParaDesigner强制使用simple='1'
if grep -q "simple: '1'" src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue; then
  verify 0 "ParaDesigner强制使用simple='1'"
else
  verify 1 "ParaDesigner强制使用simple='1'"
fi

echo ""
echo "=========================================="
echo "验证结果汇总"
echo "=========================================="
echo -e "${GREEN}通过: $pass${NC}"
echo -e "${RED}失败: $fail${NC}"
echo ""

if [ $fail -eq 0 ]; then
  echo -e "${GREEN}🎉 所有验证通过！配置一致性100%${NC}"
  exit 0
else
  echo -e "${RED}⚠️  发现 $fail 个问题，请检查配置${NC}"
  exit 1
fi
