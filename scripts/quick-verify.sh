#!/bin/bash

# GJB6600 DM 快速验证脚本
# 用法: ./quick-verify.sh [dm_id]

DM_ID=${1:-"2083556266365288450"}

cd "$(dirname "$0")"

echo "════════════════════════════════════════════════════════════"
echo "  GJB6600 数据模块快速验证"
echo "  DM ID: $DM_ID"
echo "════════════════════════════════════════════════════════════"
echo ""

# 检查后端是否运行
if ! netstat -ano | grep -q ":9999.*LISTEN"; then
    echo "❌ 后端未运行（端口 9999）"
    echo "   请先启动后端：cd D:/workspace/IETM/cape-ietm-java && mvn spring-boot:run -pl jeecg-module-system/jeecg-system-start"
    exit 1
fi

echo "✓ 后端运行中"
echo ""

# 运行完整验证
node verify-gjb6600-dm.js

exit $?
