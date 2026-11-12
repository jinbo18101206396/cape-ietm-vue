#!/bin/bash

# XML 格式化修复验证脚本

echo ""
echo "=========================================="
echo "XML 格式化往返一致性修复 - 验证测试"
echo "=========================================="
echo ""
echo "修复内容："
echo "  文件: src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js"
echo "  位置: 第 423 行"
echo "  修改: 注释掉 .replace(/\n/g, '') 以保留换行符"
echo ""
echo "预期结果："
echo "  ✅ 第一次保存：XML 格式化正常（多行）"
echo "  ✅ 第二次保存：XML 格式保持一致（多行）"
echo "  ✅ 第三次保存：XML 格式保持一致（多行）"
echo ""
echo "=========================================="
echo ""

cd /d/workspace/IETM/cape-ietm-vue

echo "🔧 运行测试..."
echo ""

npx playwright test tests/xml-format-simple-test.spec.js --headed

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
