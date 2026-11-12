#!/bin/bash

echo ""
echo "=========================================="
echo "XML 格式化修复 - 代码级验证"
echo "=========================================="
echo ""

cd /d/workspace/IETM/cape-ietm-vue

echo "📝 步骤 1: 检查修改是否已应用"
echo "----------------------------------------"
echo "查找文件中的 .replace(/\n/g, '') ..."
echo ""

grep -n "replace(/\\\\n/g, '')" src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 找到该行，检查是否被注释..."

    # 检查该行是否被注释
    if grep -n "^[[:space:]]*//.*replace(/\\\\n/g, '')" src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js; then
        echo ""
        echo "✅ 第 423 行已被正确注释"
        echo "   修复已应用！"
    else
        echo ""
        echo "❌ 第 423 行未被注释"
        echo "   修复未应用！"
    fi
else
    echo "⚠️ 未找到该行，可能已被完全删除或修改"
fi

echo ""
echo "=========================================="
echo "📝 步骤 2: 查看修改上下文"
echo "=========================================="
echo ""
echo "显示第 418-427 行的内容："
echo ""

sed -n '418,427p' src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js | nl -v 418

echo ""
echo "=========================================="
echo "📝 步骤 3: 检查修复注释"
echo "=========================================="
echo ""

if grep -q "2026-11-10 修复" src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js; then
    echo "✅ 找到修复注释（2026-11-10）"
else
    echo "⚠️ 未找到修复注释"
fi

echo ""
echo "=========================================="
echo "📊 修复验证总结"
echo "=========================================="
echo ""
echo "修改文件: src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js"
echo "修改位置: 第 423 行"
echo "修改内容: 注释掉 .replace(/\n/g, '')"
echo ""
echo "预期效果:"
echo "  ✅ 第一次保存: XML 格式化正常（多行）"
echo "  ✅ 第二次保存: XML 格式保持一致（多行）"
echo "  ✅ 第 N 次保存: XML 格式始终一致（多行）"
echo ""
echo "=========================================="
echo ""
echo "💡 下一步: 手动验证"
echo ""
echo "请按照以下文档进行手动验证："
echo "  📄 MANUAL-VERIFICATION-STEPS.md"
echo ""
echo "快速验证命令："
echo "  1. 访问编辑器页面"
echo "  2. 找到第 69 行，点击铅笔图标"
echo "  3. 插入 DM 引用并保存"
echo "  4. 再次打开设计视图并保存（不修改）"
echo "  5. 检查 XML 格式是否仍然是多行"
echo ""
echo "=========================================="
