#!/bin/bash
# UEditor 快速部署脚本 v2
# 使用官方发行版（已编译）

set -e

echo "========================================"
echo "UEditor 1.4.3.3 快速部署"
echo "========================================"

cd D:/workspace/IETM/cape-ietm-vue/public/static/ueditor

# 方案A: 从百度官方CDN下载（推荐）
echo ""
echo "[方案A] 从百度官方CDN下载..."
echo "下载地址: http://ueditor.baidu.com/build/build_down.php?n=ueditor&v=1_4_3_3-utf8-jsp"

curl -L -o ueditor_1_4_3_3.zip "http://ueditor.baidu.com/build/build_down.php?n=ueditor&v=1_4_3_3-utf8-jsp" || {
    echo ""
    echo "⚠️  自动下载失败"
    echo ""
    echo "请手动下载UEditor:"
    echo "1. 访问: http://ueditor.baidu.com/website/download.html"
    echo "2. 下载: UEditor 1.4.3.3 JSP UTF8版"
    echo "3. 解压到: D:/workspace/IETM/cape-ietm-vue/public/static/ueditor/"
    echo ""
    exit 1
}

echo ""
echo "✅ 下载完成，正在解压..."

# 解压
unzip -q -o ueditor_1_4_3_3.zip

# 验证
if [ -f "ueditor.all.js" ]; then
    echo "✅ UEditor部署成功！"

    # 清理zip
    rm -f ueditor_1_4_3_3.zip

    echo ""
    echo "📁 部署路径: $(pwd)"
    echo ""
    echo "核心文件:"
    ls -lh ueditor.all.js ueditor.config.js 2>/dev/null | awk '{print "  ✅", $9, "("$5")"}'

else
    echo "❌ 部署失败，请检查文件"
fi

echo ""
echo "========================================"
