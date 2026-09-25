#!/bin/bash
# UEditor 1.4.3.3 + Kity Formula 部署脚本
# 用途: 为Para设计器部署UEditor编辑器
# 日期: 2026-09-23

set -e

echo "========================================"
echo "UEditor 1.4.3.3 部署脚本"
echo "========================================"

# 配置
UEDITOR_DIR="public/static/ueditor"
UEDITOR_VERSION="1.4.3.3"
UEDITOR_URL="https://github.com/fex-team/ueditor/releases/download/v${UEDITOR_VERSION}/ueditor1_4_3_3-utf8-jsp.zip"
KITY_FORMULA_URL="https://github.com/fex-team/kityminder-editor/archive/refs/heads/dev.zip"

# 步骤1: 创建目录
echo ""
echo "[1/6] 创建目录结构..."
mkdir -p "${UEDITOR_DIR}"
cd "${UEDITOR_DIR}"

# 步骤2: 下载UEditor
echo ""
echo "[2/6] 下载UEditor ${UEDITOR_VERSION}..."
if [ ! -f "ueditor.zip" ]; then
    echo "正在下载: ${UEDITOR_URL}"
    curl -L -o ueditor.zip "${UEDITOR_URL}" || {
        echo "❌ 下载失败，尝试备用下载源..."
        # 备用: 直接从GitHub release下载
        curl -L -o ueditor.zip "https://github.com/fex-team/ueditor/archive/refs/tags/v1.4.3.3.zip"
    }
    echo "✅ 下载完成"
else
    echo "✅ ueditor.zip 已存在，跳过下载"
fi

# 步骤3: 解压UEditor
echo ""
echo "[3/6] 解压UEditor..."
if command -v unzip >/dev/null 2>&1; then
    unzip -q -o ueditor.zip
    # 查找解压后的目录
    EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "ueditor*" | head -1)
    if [ -n "$EXTRACTED_DIR" ]; then
        # 移动文件到当前目录
        mv "$EXTRACTED_DIR"/* . 2>/dev/null || true
        rm -rf "$EXTRACTED_DIR"
    fi
    echo "✅ 解压完成"
else
    echo "⚠️  未找到unzip命令，请手动解压 ueditor.zip"
    echo "   解压后将所有文件移动到: $(pwd)"
fi

# 步骤4: 验证核心文件
echo ""
echo "[4/6] 验证UEditor核心文件..."
REQUIRED_FILES=(
    "ueditor.config.js"
    "ueditor.all.js"
    "ueditor.all.min.js"
    "lang/zh-cn/zh-cn.js"
    "themes/default/css/ueditor.css"
)

ALL_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = false ]; then
    echo ""
    echo "⚠️  部分核心文件缺失，可能需要手动下载完整版:"
    echo "   下载地址: https://github.com/fex-team/ueditor/releases"
    echo "   选择: ueditor1_4_3_3-utf8-jsp.zip"
fi

# 步骤5: 下载Kity Formula插件
echo ""
echo "[5/6] 配置Kity Formula插件..."
mkdir -p kityformula-plugin
cd kityformula-plugin

if [ ! -f "kityformula.zip" ]; then
    echo "正在下载Kity Formula插件..."
    curl -L -o kityformula.zip "${KITY_FORMULA_URL}" || {
        echo "⚠️  下载失败，请手动下载:"
        echo "   地址: https://github.com/fex-team/kityformula"
    }
fi

# 步骤6: 创建配置文件
echo ""
echo "[6/6] 创建UEditor配置..."
cd ../..

cat > ueditor.config.local.js << 'EOF'
/**
 * UEditor 配置文件 (Para设计器专用)
 * 基于 ueditor.config.js 的本地覆盖配置
 */

// 设置UEditor根路径
window.UEDITOR_HOME_URL = "/static/ueditor/";

// Para设计器自定义配置
window.UEDITOR_PARA_CONFIG = {
    // 工具栏配置
    toolbars: {
        full: [[
            'source', '|', 'undo', 'redo', '|',
            'bold', 'italic', 'underline', 'fontborder', 'strikethrough',
            'superscript', 'subscript', 'removeformat', 'formatmatch',
            'autotypeset', 'blockquote', 'pasteplain', '|',
            'forecolor', 'backcolor', 'insertorderedlist', 'insertunorderedlist',
            'selectall', 'cleardoc', '|',
            'rowspacingtop', 'rowspacingbottom', 'lineheight', '|',
            'customstyle', 'paragraph', 'fontfamily', 'fontsize', '|',
            'directionalityltr', 'directionalityrtl', 'indent', '|',
            'justifyleft', 'justifycenter', 'justifyright', 'justifyjustify', '|',
            'touppercase', 'tolowercase', '|',
            'link', 'unlink', 'anchor', '|',
            'imagenone', 'imageleft', 'imageright', 'imagecenter', '|',
            'simpleupload', 'insertimage', 'emotion', 'scrawl', 'insertvideo',
            'music', 'attachment', 'map', 'gmap', 'insertframe', 'insertcode',
            'webapp', 'pagebreak', 'template', 'background', '|',
            'horizontal', 'date', 'time', 'spechars', 'snapscreen', 'wordimage', '|',
            'inserttable', 'deletetable', 'insertparagraphbeforetable',
            'insertrow', 'deleterow', 'insertcol', 'deletecol',
            'mergecells', 'mergeright', 'mergedown', 'splittocells',
            'splittorows', 'splittocols', 'charts', '|',
            'print', 'preview', 'searchreplace', 'drafts', 'help',
            // Para设计器自定义按钮
            'deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton'
        ]],
        simple: [[
            'source', '|', 'undo', 'redo', '|',
            'bold', 'superscript', 'subscript', 'removeformat',
            'selectall', 'cleardoc', '|',
            'date', 'time', 'spechars',
            'searchreplace',
            // Para设计器自定义按钮
            'deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton'
        ]],
        readonly: [[]]
    },

    // 启用Kity Formula
    formula: {
        path: '/static/ueditor/kityformula-plugin/',
        imageUrl: '/jeecg-boot/ietm/icn/save-formula'
    }
};

console.log('[UEditor] Para设计器配置加载完成');
EOF

echo "✅ 配置文件已创建: ueditor.config.local.js"

# 完成
echo ""
echo "========================================"
echo "✅ UEditor部署完成！"
echo "========================================"
echo ""
echo "📁 部署路径: $(pwd)"
echo ""
echo "📋 下一步操作："
echo "   1. 检查文件是否完整（特别是 ueditor.all.js）"
echo "   2. 在 index.html 中引入："
echo "      <script src=\"/static/ueditor/ueditor.config.js\"></script>"
echo "      <script src=\"/static/ueditor/ueditor.all.js\"></script>"
echo "      <script src=\"/static/ueditor/lang/zh-cn/zh-cn.js\"></script>"
echo "      <script src=\"/static/ueditor/ueditor.config.local.js\"></script>"
echo "   3. 启动开发服务器: npm run serve"
echo "   4. 访问 Para设计器测试"
echo ""
echo "🔗 参考文档："
echo "   - UEditor官方: http://ueditor.baidu.com/website/document.html"
echo "   - Para设计器集成说明: 见项目文档"
echo ""
