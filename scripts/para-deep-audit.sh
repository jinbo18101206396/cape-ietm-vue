#!/bin/bash
# Para设计器深度代码排查脚本
# 目标：系统性检查是否存在类似的缩进匹配、标签搜索、行号计算问题

echo "========================================"
echo "Para设计器深度代码排查"
echo "========================================"
echo ""

cd /d/workspace/IETM/cape-ietm-vue

# ========================================
# 1. 搜索严格相等比较的缩进匹配
# ========================================
echo "【检查点1】搜索严格缩进相等比较（可能存在缺陷）"
echo "----------------------------------------"
grep -rn "indent.*===\|beginidx.*===\|indentIdx.*===" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" | grep -v "// " | grep -v "//" || echo "✓ 未发现严格缩进比较"
echo ""

# ========================================
# 2. 搜索结束标签搜索逻辑
# ========================================
echo "【检查点2】搜索结束标签搜索逻辑"
echo "----------------------------------------"
echo "查找包含'indexOf(\"</\")'或'lastIndexOf(\"</\")'的代码："
grep -rn "indexOf.*'<\/\|indexOf.*\"<\/\|lastIndexOf.*'<\/\|lastIndexOf.*\"<\/" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" | head -20
echo ""

# ========================================
# 3. 搜索endline=-1相关逻辑
# ========================================
echo "【检查点3】搜索endline=-1相关逻辑"
echo "----------------------------------------"
grep -rn "endline.*=.*-1\|endLine.*=.*-1" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js"
echo ""

# ========================================
# 4. 搜索循环搜索标签的逻辑
# ========================================
echo "【检查点4】搜索循环搜索标签的逻辑（for循环+getLine）"
echo "----------------------------------------"
grep -rn "for.*lineCount\|for.*getLine" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" -A 5 | grep -B 5 "indexOf\|includes" | head -40
echo ""

# ========================================
# 5. 搜索"找不到"相关的错误消息
# ========================================
echo "【检查点5】搜索\"找不到\"相关的错误消息"
echo "----------------------------------------"
grep -rn "找不到.*标签\|找不到.*结束\|找不到.*闭合" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js"
echo ""

# ========================================
# 6. 搜索行号计算相关逻辑
# ========================================
echo "【检查点6】搜索行号计算相关逻辑"
echo "----------------------------------------"
grep -rn "lineno.*offset\|startLine.*endLine\|startLine.*endline" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" | head -20
echo ""

# ========================================
# 7. 搜索replaceRange调用（可能误删内容）
# ========================================
echo "【检查点7】搜索replaceRange调用（检查是否有误删风险）"
echo "----------------------------------------"
grep -rn "replaceRange" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" | head -20
echo ""

# ========================================
# 8. 搜索XML解析相关的正则表达式
# ========================================
echo "【检查点8】搜索XML解析相关的正则表达式"
echo "----------------------------------------"
grep -rn "RegExp.*<\|match.*<\|test.*<" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" | head -20
echo ""

# ========================================
# 9. 搜索可能的嵌套元素处理
# ========================================
echo "【检查点9】搜索嵌套元素处理逻辑（深度计数）"
echo "----------------------------------------"
grep -rn "depth.*++\|depth.*--\|depth.*===.*0" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js"
echo ""

# ========================================
# 10. 统计各文件的行号相关代码密度
# ========================================
echo "【检查点10】统计各文件的行号相关代码密度"
echo "----------------------------------------"
echo "文件 | 行号相关代码行数"
for file in $(find src/views/ietm/ietmdatamodulemanagement/editor -name "*.vue" -o -name "*.js"); do
  count=$(grep -c "lineno\|endline\|startLine\|endLine" "$file" 2>/dev/null || echo 0)
  if [ "$count" -gt 5 ]; then
    echo "$file | $count"
  fi
done
echo ""

# ========================================
# 11. 检查ParaDesigner.vue的关键修复点
# ========================================
echo "【检查点11】验证ParaDesigner.vue的修复是否完整"
echo "----------------------------------------"
if grep -q "indentIdx <= beginidx" src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue; then
  echo "✓ 修复11已应用：放宽缩进匹配条件（indentIdx <= beginidx）"
else
  echo "✗ 修复11未应用或被覆盖"
fi

if grep -q "兜底匹配" src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue; then
  echo "✓ 修复11已应用：兜底匹配机制"
else
  echo "✗ 修复11的兜底匹配未应用"
fi

if grep -q "从第.*行开始搜索，开始标签在第" src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue; then
  echo "✓ 修复12已应用：改进错误消息"
else
  echo "✗ 修复12未应用或被覆盖"
fi
echo ""

# ========================================
# 12. 查找潜在的类似缺陷
# ========================================
echo "【检查点12】查找潜在的类似缺陷模式"
echo "----------------------------------------"
echo "模式1: 严格相等 + indexOf('<')"
grep -rn "===.*indexOf\|indexOf.*===" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" | grep "indexOf('<')" | head -10
echo ""

echo "模式2: 循环搜索 + 严格匹配"
grep -rn "for.*i.*<.*lineCount" src/views/ietm/ietmdatamodulemanagement/editor --include="*.vue" --include="*.js" -A 10 | grep -B 5 "===" | head -20
echo ""

# ========================================
# 总结
# ========================================
echo ""
echo "========================================"
echo "排查完成"
echo "========================================"
echo ""
echo "建议："
echo "1. 检查以上输出中是否有类似ParaDesigner.vue的缺陷模式"
echo "2. 重点关注：严格相等（===）+ 缩进匹配的组合"
echo "3. 验证所有结束标签搜索逻辑是否有容错机制"
echo "4. 确认所有replaceRange调用的边界计算正确"
echo ""
