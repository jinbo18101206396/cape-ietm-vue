#!/bin/bash
# Para设计器P0修复自动部署脚本
# 执行时间：2026-09-25

set -e  # 遇到错误立即退出

echo "========================================"
echo "Para设计器P0修复部署"
echo "Git提交: 2ee8bdb"
echo "========================================"
echo ""

# 配置
SOURCE_DIR="/d/workspace/IETM/cape-ietm-vue/dist"
BACKUP_DIR="/d/workspace/IETM/cape-ietm-vue/dist.backup.$(date +%Y%m%d_%H%M%S)"
DEPLOY_DIR="/d/workspace/IETM/cape-ietm-vue-deployed"

# 检查源目录
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ 错误: dist目录不存在"
  exit 1
fi

# 第1步：备份当前版本（如果存在）
echo "[步骤1/4] 备份当前版本..."
if [ -d "$DEPLOY_DIR" ]; then
  echo "  创建备份: $BACKUP_DIR"
  cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
  echo "  ✓ 备份完成"
else
  echo "  ⓘ 首次部署，无需备份"
  mkdir -p "$DEPLOY_DIR"
fi
echo ""

# 第2步：部署新版本
echo "[步骤2/4] 部署新版本..."
echo "  源目录: $SOURCE_DIR"
echo "  目标目录: $DEPLOY_DIR"
cp -rf "$SOURCE_DIR"/* "$DEPLOY_DIR/"
echo "  ✓ 文件复制完成"
echo ""

# 第3步：验证部署
echo "[步骤3/4] 验证部署..."
if [ -f "$DEPLOY_DIR/index.html" ]; then
  echo "  ✓ index.html 存在"
else
  echo "  ❌ index.html 缺失"
  exit 1
fi

if [ -d "$DEPLOY_DIR/js" ]; then
  JS_COUNT=$(ls "$DEPLOY_DIR/js"/*.js 2>/dev/null | wc -l)
  echo "  ✓ js目录存在 ($JS_COUNT 个文件)"
else
  echo "  ❌ js目录缺失"
  exit 1
fi

if [ -d "$DEPLOY_DIR/css" ]; then
  CSS_COUNT=$(ls "$DEPLOY_DIR/css"/*.css 2>/dev/null | wc -l)
  echo "  ✓ css目录存在 ($CSS_COUNT 个文件)"
else
  echo "  ❌ css目录缺失"
  exit 1
fi

DEPLOY_SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)
echo "  ✓ 部署目录大小: $DEPLOY_SIZE"
echo ""

# 第4步：记录部署信息
echo "[步骤4/4] 记录部署信息..."
DEPLOY_LOG="$DEPLOY_DIR/DEPLOY_INFO.txt"
cat > "$DEPLOY_LOG" << EOF
Para设计器P0修复部署信息
================================

部署时间: $(date '+%Y-%m-%d %H:%M:%S')
Git提交: 2ee8bdb
修复版本: cape-ietm-vue v2.6.1

修复内容:
- 修复11: 放宽缩进匹配条件（两轮匹配策略）
- 修复12: 改进错误消息（显示准确行号）

测试状态:
- L1单元测试: 5/5通过
- L4代码排查: 12/12通过
- L2/L3 E2E: 25个用例已准备

部署状态:
- 编译完成: $(date '+%Y-%m-%d %H:%M:%S')
- 部署完成: $(date '+%Y-%m-%d %H:%M:%S')
- 部署大小: $DEPLOY_SIZE
- 备份位置: ${BACKUP_DIR:-无}

下一步:
1. 启动前端服务: npm run serve (或使用生产服务器)
2. 执行冒烟测试（4个必做测试）
3. 验证修复效果

详细信息:
- 部署清单: DEPLOY-VERIFICATION-CHECKLIST.md
- 修复说明: docs/para-indent-mismatch-p0-fix.md
- 测试报告: docs/para-comprehensive-test-report.md
EOF

echo "  ✓ 部署信息已记录: $DEPLOY_LOG"
echo ""

echo "========================================"
echo "✅ 部署完成"
echo "========================================"
echo ""
echo "部署目录: $DEPLOY_DIR"
echo "备份目录: ${BACKUP_DIR:-无}"
echo "部署大小: $DEPLOY_SIZE"
echo ""
echo "下一步:"
echo "1. 启动服务（如需要）"
echo "2. 执行冒烟测试"
echo ""
echo "冒烟测试命令:"
echo "  cd /d/workspace/IETM/cape-ietm-vue"
echo "  # 确保前端服务运行在 http://localhost:3000"
echo "  # 确保后端服务运行在 http://localhost:9999"
echo "  # 然后在浏览器中执行手动测试"
echo ""
