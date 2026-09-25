@echo off
REM UEditor 一键部署脚本 (Windows)
REM 适用于 Para设计器项目

echo ========================================
echo UEditor 1.4.3.3 一键部署
echo ========================================
echo.

cd /d D:\workspace\IETM\cape-ietm-vue\public\static\ueditor

echo [1/3] 下载UEditor 1.4.3.3...
echo.
echo 正在从百度官方服务器下载...
curl -L -o ueditor.zip "http://ueditor.baidu.com/build/build_down.php?n=ueditor&v=1_4_3_3-utf8-jsp"

if %errorlevel% neq 0 (
    echo.
    echo 自动下载失败！
    echo.
    echo 请手动下载：
    echo 1. 访问: http://ueditor.baidu.com/website/download.html
    echo 2. 选择: UEditor 1.4.3.3 JSP UTF8版
    echo 3. 下载后重命名为 ueditor.zip
    echo 4. 放到: D:\workspace\IETM\cape-ietm-vue\public\static\ueditor\
    echo 5. 再次运行本脚本
    echo.
    pause
    exit /b 1
)

echo ✅ 下载完成
echo.

echo [2/3] 解压文件...
powershell -command "Expand-Archive -Path ueditor.zip -DestinationPath . -Force"

if %errorlevel% neq 0 (
    echo.
    echo 解压失败！请手动解压 ueditor.zip
    pause
    exit /b 1
)

echo ✅ 解压完成
echo.

echo [3/3] 验证文件...
if exist "ueditor.all.js" (
    echo ✅ ueditor.all.js
) else (
    echo ❌ ueditor.all.js 缺失
)

if exist "ueditor.config.js" (
    echo ✅ ueditor.config.js
) else (
    echo ❌ ueditor.config.js 缺失
)

if exist "lang\zh-cn\zh-cn.js" (
    echo ✅ 中文语言包
) else (
    echo ❌ 中文语言包缺失
)

if exist "themes\default\css\ueditor.css" (
    echo ✅ 主题CSS
) else (
    echo ❌ 主题CSS缺失
)

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 📁 部署路径: %cd%
echo.
echo 下一步:
echo 1. 在 public/index.html 中添加引用
echo 2. 启动开发服务器: npm run serve
echo 3. 测试 Para设计器
echo.
echo 详细说明请查看: UEditor部署指南.md
echo.
pause
