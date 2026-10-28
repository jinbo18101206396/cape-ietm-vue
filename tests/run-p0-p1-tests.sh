#!/bin/bash

# Figure Designer P0/P1 修复 - 完整测试套件运行脚本
# 用法: ./run-p0-p1-tests.sh [test-name|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$SCRIPT_DIR/reports"

# 创建报告目录
mkdir -p "$REPORTS_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 检查Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js未安装"
    exit 1
fi

print_success "Node.js版本: $(node --version)"

# 检查服务状态
check_service() {
    local url=$1
    local service=$2

    if curl -s -m 3 "$url" > /dev/null 2>&1; then
        print_success "$service 已启动"
        return 0
    else
        print_error "$service 未启动"
        return 1
    fi
}

# 测试选项
TEST_TYPE=${1:-all}

case $TEST_TYPE in
    integration)
        print_header "运行集成测试"

        # 检查服务
        check_service "http://localhost:3000" "前端服务" || print_warning "前端服务不可用，测试可能失败"
        check_service "http://localhost:9999" "后端服务" || print_warning "后端服务不可用，测试可能失败"

        echo "启动集成测试..."
        node "$SCRIPT_DIR/figure-designer-p0-p1-integration.spec.js"

        if [ $? -eq 0 ]; then
            print_success "集成测试通过"
        else
            print_error "集成测试失败"
            exit 1
        fi
        ;;

    performance)
        print_header "运行性能基准测试"

        check_service "http://localhost:3000" "前端服务" || print_warning "前端服务不可用"
        check_service "http://localhost:9999" "后端服务" || print_warning "后端服务不可用"

        echo "启动性能测试..."
        node "$SCRIPT_DIR/figure-designer-performance-benchmark.spec.js"

        if [ $? -eq 0 ]; then
            print_success "性能测试完成"
        else
            print_error "性能测试失败"
            exit 1
        fi
        ;;

    memory)
        print_header "运行内存泄漏检测"

        check_service "http://localhost:3000" "前端服务" || print_warning "前端服务不可用"
        check_service "http://localhost:9999" "后端服务" || print_warning "后端服务不可用"

        echo "启动内存检测..."
        node "$SCRIPT_DIR/figure-designer-memory-leak-detection.spec.js"

        if [ $? -eq 0 ]; then
            print_success "内存检测完成"
        else
            print_error "内存检测失败"
            exit 1
        fi
        ;;

    all)
        print_header "完整测试套件"
        print_warning "这将执行所有测试，预计耗时 15-20 分钟"

        # 检查服务
        if ! check_service "http://localhost:3000" "前端服务"; then
            print_error "前端服务未启动，请先启动: npm run serve"
            exit 1
        fi

        if ! check_service "http://localhost:9999" "后端服务"; then
            print_error "后端服务未启动，请在IDEA中启动Spring Boot应用"
            exit 1
        fi

        # 运行所有测试
        local failed=0

        print_header "1/3 集成测试"
        if node "$SCRIPT_DIR/figure-designer-p0-p1-integration.spec.js"; then
            print_success "集成测试通过"
        else
            print_error "集成测试失败"
            failed=$((failed + 1))
        fi

        print_header "2/3 性能基准测试"
        if node "$SCRIPT_DIR/figure-designer-performance-benchmark.spec.js"; then
            print_success "性能测试完成"
        else
            print_error "性能测试失败"
            failed=$((failed + 1))
        fi

        print_header "3/3 内存泄漏检测"
        if node "$SCRIPT_DIR/figure-designer-memory-leak-detection.spec.js"; then
            print_success "内存检测完成"
        else
            print_error "内存检测失败"
            failed=$((failed + 1))
        fi

        # 生成汇总报告
        print_header "测试完成汇总"

        if [ -f "$REPORTS_DIR/figure-p0-p1-integration-report.json" ]; then
            echo -e "\n📋 集成测试报告:"
            cat "$REPORTS_DIR/figure-p0-p1-integration-report.json" | grep -E '"passed"|"failed"|"successRate"' || true
        fi

        if [ -f "$REPORTS_DIR/figure-performance-benchmark.json" ]; then
            echo -e "\n⚡ 性能测试报告:"
            cat "$REPORTS_DIR/figure-performance-benchmark.json" | grep -E '"performanceScore"|"scenario"' || true
        fi

        if [ -f "$REPORTS_DIR/figure-memory-leak-report.json" ]; then
            echo -e "\n🧹 内存检测报告:"
            cat "$REPORTS_DIR/figure-memory-leak-report.json" | grep -E '"hasLeak"|"severity"' || true
        fi

        echo -e "\n📄 所有报告位置: $REPORTS_DIR"

        if [ $failed -eq 0 ]; then
            print_success "所有测试通过"
        else
            print_error "$failed 个测试失败"
            exit 1
        fi
        ;;

    *)
        echo "用法: $0 {integration|performance|memory|all}"
        echo ""
        echo "测试选项:"
        echo "  integration  - 运行集成功能测试 (~5分钟)"
        echo "  performance  - 运行性能基准测试 (~8分钟)"
        echo "  memory       - 运行内存泄漏检测 (~10分钟)"
        echo "  all          - 运行所有测试 (~15-20分钟)"
        exit 1
        ;;
esac

echo ""
print_success "测试执行完成"
