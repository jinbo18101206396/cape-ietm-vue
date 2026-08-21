@echo off
REM ========================================
REM 实际浏览器验证测试 - 运行脚本
REM ========================================

echo ==========================================
echo   复制DM功能 - 实际浏览器验证
echo ==========================================
echo.

REM 设置环境变量
set BASE_URL=http://localhost:3000
set API_BASE_URL=http://localhost:9999/jeecg-boot

echo 测试配置:
echo   前端URL: %BASE_URL%
echo   后端API: %API_BASE_URL%
echo.

REM 创建截图目录
if not exist "test-results\screenshots" mkdir "test-results\screenshots"

echo ==========================================
echo   重要提示
echo ==========================================
echo.
echo 1. 请确保以下服务已启动:
echo    - 前端服务: npm run serve (端口3000)
echo    - 后端服务: Spring Boot (端口9999)
echo    - 数据库服务: 达梦DM8
echo.
echo 2. 测试过程中:
echo    - 浏览器会自动打开
echo    - 如果有验证码，请在30秒内手动输入
echo    - 如果需要手动操作，请按照控制台提示进行
echo.
echo 3. 测试结果:
echo    - 截图保存在: test-results\screenshots\
echo    - 详细日志会实时显示在控制台
echo.

pause

echo.
echo ==========================================
echo   开始测试...
echo ==========================================
echo.

REM 运行测试（显示浏览器窗口，便于观察和手动干预）
npx playwright test tests/e2e/dm-copy/real-browser-test.spec.js --headed --reporter=list --workers=1

echo.
echo ==========================================
echo   测试完成
echo ==========================================
echo.
echo 请查看:
echo   - 控制台输出的详细日志
echo   - test-results\screenshots\ 目录中的截图
echo.

pause
