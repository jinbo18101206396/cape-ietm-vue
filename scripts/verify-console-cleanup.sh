#!/bin/bash

echo "=================================="
echo "Console 清理验证脚本"
echo "=================================="
echo ""

# 检查 babel 插件是否安装
echo "【1. 检查 Babel 插件】"
if npm list babel-plugin-transform-remove-console 2>&1 | grep -q "babel-plugin-transform-remove-console@"; then
    echo "✓ babel-plugin-transform-remove-console 已安装"
else
    echo "✗ babel-plugin-transform-remove-console 未安装"
    echo "  请运行: npm install --save-dev babel-plugin-transform-remove-console --legacy-peer-deps"
fi
echo ""

# 检查配置文件
echo "【2. 检查配置文件】"

if grep -q "transform-remove-console" babel.config.js 2>/dev/null; then
    echo "✓ babel.config.js 已配置"
else
    echo "✗ babel.config.js 未配置"
fi

if grep -q "drop_console" vue.config.js 2>/dev/null; then
    echo "✓ vue.config.js 已配置"
else
    echo "✗ vue.config.js 未配置"
fi
echo ""

# 检查 logger 工具
echo "【3. 检查 Logger 工具】"
if [ -f "src/utils/logger.js" ]; then
    echo "✓ logger.js 工具已创建"
else
    echo "✗ logger.js 工具不存在"
fi
echo ""

# 统计当前 console 使用情况
echo "【4. Console 使用统计】"
console_count=$(find src -type f \( -name "*.vue" -o -name "*.js" \) -exec grep -h "console\." {} \; 2>/dev/null | wc -l)
echo "  总计: $console_count 处 console 调用"

console_log=$(find src -type f \( -name "*.vue" -o -name "*.js" \) -exec grep -h "console\.log" {} \; 2>/dev/null | wc -l)
echo "  - console.log: $console_log"

console_error=$(find src -type f \( -name "*.vue" -o -name "*.js" \) -exec grep -h "console\.error" {} \; 2>/dev/null | wc -l)
echo "  - console.error: $console_error"

console_warn=$(find src -type f \( -name "*.vue" -o -name "*.js" \) -exec grep -h "console\.warn" {} \; 2>/dev/null | wc -l)
echo "  - console.warn: $console_warn"

console_info=$(find src -type f \( -name "*.vue" -o -name "*.js" \) -exec grep -h "console\.info" {} \; 2>/dev/null | wc -l)
echo "  - console.info: $console_info"

console_debug=$(find src -type f \( -name "*.vue" -o -name "*.js" \) -exec grep -h "console\.debug" {} \; 2>/dev/null | wc -l)
echo "  - console.debug: $console_debug"
echo ""

# 检查文档
echo "【5. 检查文档】"
if [ -f "docs/CONSOLE_CLEANUP_GUIDE.md" ]; then
    echo "✓ 迁移指南文档已创建"
else
    echo "✗ 迁移指南文档不存在"
fi
echo ""

echo "=================================="
echo "验证完成"
echo "=================================="
echo ""
echo "📝 下一步："
echo "1. 确保所有依赖已安装"
echo "2. 运行 'npm run build' 测试生产环境构建"
echo "3. 检查 dist/ 目录中的文件是否已移除 console.log"
echo "4. (可选) 逐步将现有 console 替换为 logger 工具"
echo ""
