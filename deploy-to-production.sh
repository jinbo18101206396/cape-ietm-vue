#!/bin/bash
#
# CodeMirror布局修复 v2.1 部署脚本
# 用途: 自动化部署到生产环境
#

set -e  # 遇到错误立即退出

echo "======================================"
echo "CodeMirror布局修复 v2.1 部署脚本"
echo "======================================"
echo ""

# 配置区（根据实际环境修改）
PROD_SERVER="your-production-server"
PROD_USER="deploy"
PROD_PATH="/opt/ietm/frontend"
LOCAL_DIST="./dist"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤1: 检查本地构建
echo -e "${YELLOW}[1/5] 检查本地构建...${NC}"
if [ ! -d "$LOCAL_DIST" ]; then
    echo -e "${RED}错误: dist目录不存在，请先执行 npm run build:prod${NC}"
    exit 1
fi

if [ ! -f "$LOCAL_DIST/index.html" ]; then
    echo -e "${RED}错误: dist/index.html不存在${NC}"
    exit 1
fi

BUILD_TIME=$(stat -c '%y' "$LOCAL_DIST/index.html" 2>/dev/null || stat -f '%Sm' "$LOCAL_DIST/index.html")
echo -e "${GREEN}✓ 本地构建存在 (构建时间: $BUILD_TIME)${NC}"

# 验证修复代码已打包
if grep -rq "forceFixGuttersLayout" "$LOCAL_DIST/js/"*.js 2>/dev/null; then
    echo -e "${GREEN}✓ 修复代码已包含在构建中${NC}"
else
    echo -e "${RED}警告: 未检测到修复代码，请检查构建是否完整${NC}"
    read -p "是否继续部署? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 步骤2: 创建部署包
echo -e "\n${YELLOW}[2/5] 创建部署包...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_PACKAGE="ietm-frontend-v2.1-${TIMESTAMP}.tar.gz"

tar -czf "$DEPLOY_PACKAGE" -C "$LOCAL_DIST" .
echo -e "${GREEN}✓ 部署包已创建: $DEPLOY_PACKAGE${NC}"

# 步骤3: 备份生产环境（需要SSH访问权限）
echo -e "\n${YELLOW}[3/5] 备份生产环境...${NC}"
echo "执行命令:"
echo "  ssh ${PROD_USER}@${PROD_SERVER} 'cd ${PROD_PATH} && tar -czf dist.backup.${TIMESTAMP}.tar.gz dist/'"
echo ""
echo -e "${YELLOW}请手动执行上述命令完成备份，或配置SSH免密登录后取消注释以下行：${NC}"
# ssh ${PROD_USER}@${PROD_SERVER} "cd ${PROD_PATH} && tar -czf dist.backup.${TIMESTAMP}.tar.gz dist/"

read -p "备份已完成? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}部署已取消${NC}"
    exit 1
fi

# 步骤4: 上传部署包
echo -e "\n${YELLOW}[4/5] 上传部署包到生产服务器...${NC}"
echo "执行命令:"
echo "  scp ${DEPLOY_PACKAGE} ${PROD_USER}@${PROD_SERVER}:${PROD_PATH}/"
echo "  ssh ${PROD_USER}@${PROD_SERVER} 'cd ${PROD_PATH} && rm -rf dist && mkdir dist && tar -xzf ${DEPLOY_PACKAGE} -C dist/'"
echo ""
echo -e "${YELLOW}请手动执行上述命令完成上传，或配置SSH后取消注释以下行：${NC}"
# scp ${DEPLOY_PACKAGE} ${PROD_USER}@${PROD_SERVER}:${PROD_PATH}/
# ssh ${PROD_USER}@${PROD_SERVER} "cd ${PROD_PATH} && rm -rf dist && mkdir dist && tar -xzf ${DEPLOY_PACKAGE} -C dist/"

read -p "上传已完成? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}部署已取消${NC}"
    exit 1
fi

# 步骤5: 验证提示
echo -e "\n${YELLOW}[5/5] 部署完成，请执行验证...${NC}"
echo ""
echo "======================================"
echo "验证清单 (详见 DEPLOY-CHECKLIST-v2.1.md):"
echo "======================================"
echo ""
echo "1. 打开生产环境编辑器"
echo "2. 切换到源码视图，检查 CodeMirror-gutters 宽度是否为 105px"
echo "3. 查看控制台日志，应显示:"
echo "   [DmSourceView] ✅ Gutters宽度已修复为: 105px"
echo "4. 快速切换视图5次，验证稳定性"
echo ""
echo -e "${GREEN}如果验证通过，部署成功！${NC}"
echo -e "${RED}如果验证失败，执行回滚:${NC}"
echo "  ssh ${PROD_USER}@${PROD_SERVER} 'cd ${PROD_PATH} && rm -rf dist && tar -xzf dist.backup.${TIMESTAMP}.tar.gz'"
echo ""
echo "======================================"
echo "部署包: $DEPLOY_PACKAGE"
echo "备份文件: dist.backup.${TIMESTAMP}.tar.gz"
echo "======================================"
