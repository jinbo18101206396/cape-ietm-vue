@echo off
REM ========================================
REM Playwright E2E测试运行脚本 (Windows)
REM ========================================

echo ==========================================
echo   IETM复制DM功能 - E2E测试
echo ==========================================
echo.

REM 检查环境变量
if "%BASE_URL%"=="" (
  set BASE_URL=http://localhost:3000
  echo [警告] BASE_URL未设置，使用默认值: %BASE_URL%
)

if "%API_BASE_URL%"=="" (
  set API_BASE_URL=http://localhost:9999/jeecg-boot
  echo [警告] API_BASE_URL未设置，使用默认值: %API_BASE_URL%
)

if "%TEST_USERNAME%"=="" (
  set TEST_USERNAME=admin
  echo [警告] TEST_USERNAME未设置，使用默认值: %TEST_USERNAME%
)

if "%TEST_PASSWORD%"=="" (
  set TEST_PASSWORD=admin123
  echo [警告] TEST_PASSWORD未设置，使用默认值: %TEST_PASSWORD%
)

echo.
echo 测试配置:
echo   前端URL: %BASE_URL%
echo   后端API: %API_BASE_URL%
echo   测试账号: %TEST_USERNAME%
echo.

REM 创建截图目录
if not exist "test-results\screenshots" mkdir "test-results\screenshots"

REM 选择测试模式
if "%1"=="quick" (
  echo ==========================================
  echo   运行快速验证测试
  echo ==========================================
  npx playwright test tests/e2e/dm-copy/quick-verify.spec.js --reporter=list

) else if "%1"=="full" (
  echo ==========================================
  echo   运行完整E2E测试
  echo ==========================================
  npx playwright test tests/e2e/dm-copy/copy-dm.spec.js --reporter=list

) else if "%1"=="ui" (
  echo ==========================================
  echo   启动UI模式（交互式）
  echo ==========================================
  npx playwright test --ui

) else if "%1"=="debug" (
  echo ==========================================
  echo   启动调试模式
  echo ==========================================
  npx playwright test tests/e2e/dm-copy/ --debug

) else (
  echo ==========================================
  echo   运行所有测试
  echo ==========================================
  npx playwright test tests/e2e/dm-copy/ --reporter=html
  echo.
  echo 测试完成！查看报告：
  echo   npx playwright show-report test-results/html
)

echo.
echo ==========================================
echo   测试完成
echo ==========================================

pause
