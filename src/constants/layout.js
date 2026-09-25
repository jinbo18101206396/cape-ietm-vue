/**
 * Dashboard 布局常量配置
 * 统一管理仪表盘组件的布局参数，消除魔法数字
 */

export const DASHBOARD_LAYOUT = {
  /**
   * 工具栏高度
   * 组成：搜索框(32px) + 上下padding(8px×2) = 48px
   */
  TOOLBAR_HEIGHT: 48,

  /**
   * 表格表头高度
   * 组成：表头内容 + padding(12px×2) + 边框(1px×2) ≈ 41px
   */
  TABLE_HEADER_HEIGHT: 41,

  /**
   * 容器内边距
   * 上下左右各留出的空间
   */
  CONTAINER_PADDING: 24,

  /**
   * 计算表格滚动区域高度
   * @param {number} containerHeight - 容器总高度
   * @returns {number} 滚动区域高度
   */
  calcScrollHeight(containerHeight) {
    // 容错：容器高度异常时返回默认最小高度
    if (!containerHeight || containerHeight <= 0) {
      return 300
    }

    // 计算公式：容器高度 - 工具栏 - 表头 - 内边距
    const scrollHeight = containerHeight - this.TOOLBAR_HEIGHT - this.TABLE_HEADER_HEIGHT - this.CONTAINER_PADDING

    // 容错：确保滚动区域高度不小于200px
    return Math.max(scrollHeight, 200)
  }
}
