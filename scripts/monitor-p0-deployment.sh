#!/bin/bash

###############################################################################
# P0修复部署后监控脚本
#
# 功能：监控部署后的系统健康状态
# 作者：AI Assistant
# 日期：2026-09-25
# 版本：v1.0
###############################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
LOG_DIR="/var/log/cape-ietm-vue"
FRONTEND_ERROR_LOG="$LOG_DIR/error.log"
BACKEND_ERROR_LOG="/var/log/cape-ietm-api/error.log"
MONITOR_INTERVAL=60  # 监控间隔（秒）
ALERT_THRESHOLD=10   # 错误阈值

# 日志函数
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ❌ $1"
}

# 检查服务状态
check_service_health() {
    log_info "检查服务健康状态..."

    # 检查前端服务
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
        log_success "前端服务正常"
    else
        log_error "前端服务异常"
        return 1
    fi

    # 检查后端服务
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:9999/health | grep -q "200"; then
        log_success "后端服务正常"
    else
        log_error "后端服务异常"
        return 1
    fi

    return 0
}

# 检查错误日志
check_error_logs() {
    log_info "检查错误日志..."

    local error_count=0

    # 检查前端错误日志（最近5分钟）
    if [ -f "$FRONTEND_ERROR_LOG" ]; then
        error_count=$(tail -1000 "$FRONTEND_ERROR_LOG" | grep -i "error\|exception\|fail" | wc -l)
        if [ $error_count -gt $ALERT_THRESHOLD ]; then
            log_warning "前端错误日志异常：$error_count 条错误"
        else
            log_success "前端错误日志正常：$error_count 条错误"
        fi
    else
        log_warning "前端错误日志文件不存在"
    fi

    # 检查后端错误日志
    if [ -f "$BACKEND_ERROR_LOG" ]; then
        error_count=$(tail -1000 "$BACKEND_ERROR_LOG" | grep -i "error\|exception\|fail" | wc -l)
        if [ $error_count -gt $ALERT_THRESHOLD ]; then
            log_warning "后端错误日志异常：$error_count 条错误"
        else
            log_success "后端错误日志正常：$error_count 条错误"
        fi
    else
        log_warning "后端错误日志文件不存在"
    fi
}

# 检查para相关错误
check_para_errors() {
    log_info "检查Para相关错误..."

    local para_errors=0

    # 检查para标签不配对错误
    if [ -f "$FRONTEND_ERROR_LOG" ]; then
        para_errors=$(tail -1000 "$FRONTEND_ERROR_LOG" | grep -i "para.*mismatch\|para.*unmatched\|para.*missing" | wc -l)
        if [ $para_errors -gt 0 ]; then
            log_error "发现para标签错误：$para_errors 条"
            tail -20 "$FRONTEND_ERROR_LOG" | grep -i "para"
            return 1
        else
            log_success "未发现para标签错误"
        fi
    fi

    # 检查JSON.parse错误
    if [ -f "$FRONTEND_ERROR_LOG" ]; then
        json_errors=$(tail -1000 "$FRONTEND_ERROR_LOG" | grep -i "JSON.parse\|JSON parse error\|解析项目参数失败" | wc -l)
        if [ $json_errors -gt $ALERT_THRESHOLD ]; then
            log_warning "发现JSON解析错误：$json_errors 条（已有异常处理）"
        elif [ $json_errors -gt 0 ]; then
            log_success "JSON解析错误在可控范围：$json_errors 条"
        else
            log_success "未发现JSON解析错误"
        fi
    fi

    return 0
}

# 检查性能指标
check_performance() {
    log_info "检查性能指标..."

    # 检查内存使用
    local mem_usage=$(free | awk '/Mem/{printf("%.1f"), $3/$2*100}')
    log_info "内存使用率: $mem_usage%"

    # 检查CPU使用
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    log_info "CPU使用率: $cpu_usage%"

    # 检查磁盘使用
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    log_info "磁盘使用率: $disk_usage%"

    # 告警阈值
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        log_warning "内存使用率过高"
    fi

    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_warning "CPU使用率过高"
    fi

    if [ $disk_usage -gt 90 ]; then
        log_warning "磁盘使用率过高"
    fi
}

# 生成健康报告
generate_health_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="health-report-$(date '+%Y%m%d-%H%M%S').txt"

    {
        echo "=========================================="
        echo "  P0修复部署健康报告"
        echo "=========================================="
        echo "生成时间: $timestamp"
        echo ""
        echo "服务状态:"
        if check_service_health > /dev/null 2>&1; then
            echo "  ✅ 前端服务: 正常"
            echo "  ✅ 后端服务: 正常"
        else
            echo "  ❌ 服务异常"
        fi
        echo ""
        echo "错误统计:"
        if [ -f "$FRONTEND_ERROR_LOG" ]; then
            local fe_errors=$(tail -1000 "$FRONTEND_ERROR_LOG" | grep -i "error" | wc -l)
            echo "  前端错误: $fe_errors 条"
        fi
        if [ -f "$BACKEND_ERROR_LOG" ]; then
            local be_errors=$(tail -1000 "$BACKEND_ERROR_LOG" | grep -i "error" | wc -l)
            echo "  后端错误: $be_errors 条"
        fi
        echo ""
        echo "Para相关:"
        local para_errors=$(tail -1000 "$FRONTEND_ERROR_LOG" 2>/dev/null | grep -i "para.*error" | wc -l)
        echo "  para错误: $para_errors 条"
        local json_errors=$(tail -1000 "$FRONTEND_ERROR_LOG" 2>/dev/null | grep -i "JSON.*parse" | wc -l)
        echo "  JSON错误: $json_errors 条"
        echo ""
        echo "性能指标:"
        echo "  内存使用: $(free | awk '/Mem/{printf("%.1f%%"), $3/$2*100}')"
        echo "  CPU使用: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
        echo "  磁盘使用: $(df -h / | awk 'NR==2{print $5}')"
        echo ""
        echo "=========================================="
    } > "$report_file"

    log_success "健康报告已生成: $report_file"
}

# 持续监控模式
continuous_monitor() {
    log_info "启动持续监控模式（间隔: ${MONITOR_INTERVAL}秒）"
    log_info "按 Ctrl+C 停止监控"
    echo ""

    while true; do
        echo "=========================================="
        echo "  监控时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=========================================="

        check_service_health
        check_error_logs
        check_para_errors
        check_performance

        echo ""
        log_info "等待 ${MONITOR_INTERVAL} 秒后继续监控..."
        echo ""

        sleep $MONITOR_INTERVAL
    done
}

# 显示使用说明
show_usage() {
    cat << EOF
用法: $0 [选项]

选项:
    check       执行一次健康检查
    monitor     持续监控模式
    report      生成健康报告
    help        显示此帮助信息

示例:
    $0 check           # 执行一次检查
    $0 monitor         # 持续监控
    $0 report          # 生成报告

EOF
}

# 主函数
main() {
    case "$1" in
        check)
            log_info "执行一次健康检查..."
            check_service_health
            check_error_logs
            check_para_errors
            check_performance
            ;;
        monitor)
            continuous_monitor
            ;;
        report)
            generate_health_report
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "无效的选项: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
