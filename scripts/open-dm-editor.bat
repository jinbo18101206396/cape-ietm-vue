@echo off
REM GJB6600 数据模块浏览器验证快速启动脚本

echo ========================================
echo   GJB6600 数据模块验证
echo ========================================
echo.

REM 检查后端
echo [1/3] 检查后端服务...
netstat -ano | findstr ":9999.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [X] 后端未运行！
    echo.
    echo 请先启动后端：
    echo   cd D:\workspace\IETM\cape-ietm-java
    echo   mvn spring-boot:run -pl jeecg-module-system/jeecg-system-start
    echo.
    pause
    exit /b 1
) else (
    echo [√] 后端运行中
)

REM 检查前端
echo [2/3] 检查前端服务...
netstat -ano | findstr ":3000.*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [X] 前端未运行！
    echo.
    echo 请先启动前端：
    echo   cd D:\workspace\IETM\cape-ietm-vue
    echo   npm run serve
    echo.
    pause
    exit /b 1
) else (
    echo [√] 前端运行中
)

REM 打开浏览器
echo [3/3] 打开浏览器...
echo.
echo 正在打开 DM 编辑页面...
echo URL: http://localhost:3000/#/ietm/dm-content-editor?id=2083556266365288450
echo.

start "" "http://localhost:3000/#/ietm/dm-content-editor?id=2083556266365288450"

echo ========================================
echo   验证指引
echo ========================================
echo.
echo 1. 如果需要登录：
echo    用户名: admin
echo    密码: 123456
echo.
echo 2. 观察编辑器内容：
echo    [√] 正确: 显示 40 行左右的完整 XML
echo    [X] 错误: 只显示 3 行空骨架
echo.
echo 3. 如需详细诊断：
echo    - 按 F12 打开开发者工具
echo    - 查看 Network 标签中的 dm-content/load 请求
echo    - 或在 Console 标签中运行验证脚本
echo.
echo 4. 验证文档位置：
echo    D:\workspace\IETM\docs\BROWSER-VERIFY.md
echo.
echo ========================================
echo.

pause
