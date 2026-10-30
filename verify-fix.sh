#!/bin/bash
# DM 引用修复验证脚本

echo "======================================"
echo "DM 引用修复自动化验证"
echo "======================================"
echo ""

# 检查开发服务器状态
echo "[1] 检查开发服务器..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 开发服务器正在运行"
else
    echo "❌ 开发服务器未运行"
    echo "   请执行: cd D:/workspace/IETM/cape-ietm-vue && npm run serve"
    exit 1
fi

echo ""
echo "[2] 验证修复的代码..."

# 检查 ConvertedContent 组件是否存在
if grep -q "const ConvertedContent = {" D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue; then
    echo "✅ ConvertedContent 组件已添加"
else
    echo "❌ ConvertedContent 组件未找到"
    exit 1
fi

# 检查组件是否注册
if grep -q "ConvertedContent," D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue; then
    echo "✅ ConvertedContent 组件已注册"
else
    echo "❌ ConvertedContent 组件未注册"
    exit 1
fi

# 检查模板是否使用 ConvertedContent
if grep -q '<ConvertedContent v-if="text && (text.includes' D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue; then
    echo "✅ 模板已更新使用 ConvertedContent"
else
    echo "❌ 模板未使用 ConvertedContent"
    exit 1
fi

# 检查 escapeXmlContent 修复
if grep -q "html2para 返回的内容已经是有效的 XML，不应再转义" D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue; then
    echo "✅ escapeXmlContent 逻辑已修复"
else
    echo "❌ escapeXmlContent 逻辑未修复"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ 所有代码修复已验证"
echo "======================================"
echo ""
echo "📋 下一步：手动功能测试"
echo ""
echo "请打开浏览器执行以下操作："
echo "1. 访问 http://localhost:3000"
echo "2. 进入编辑器"
echo "3. 添加警告并插入 DM 引用"
echo "4. 保存后验证："
echo ""
echo "   ✅ 警告列表应显示："
echo "      【引用DMC-...: 标题】"
echo ""
echo "   ✅ 源码视图应显示："
echo "      <warning><dmRef>...</dmRef></warning>"
echo ""
echo "   ❌ 不应显示："
echo "      <warning>&lt;dmRef&gt;...&lt;/dmRef&gt;</warning>"
echo ""
