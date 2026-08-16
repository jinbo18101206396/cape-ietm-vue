/**
 * 统一的日志工具
 * 在开发环境输出日志，生产环境自动禁用（除了 error 和 warn）
 */

const isDevelopment = process.env.NODE_ENV === 'development'

const logger = {
  /**
   * 调试日志（仅开发环境）
   * @param  {...any} args
   */
  debug(...args) {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * 信息日志（仅开发环境）
   * @param  {...any} args
   */
  log(...args) {
    if (isDevelopment) {
      console.log('[LOG]', ...args)
    }
  },

  /**
   * 一般信息（仅开发环境）
   * @param  {...any} args
   */
  info(...args) {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * 警告信息（所有环境）
   * @param  {...any} args
   */
  warn(...args) {
    console.warn('[WARN]', ...args)
  },

  /**
   * 错误信息（所有环境）
   * @param  {...any} args
   */
  error(...args) {
    console.error('[ERROR]', ...args)
  },

  /**
   * 表格输出（仅开发环境）
   * @param {*} data
   */
  table(data) {
    if (isDevelopment && console.table) {
      console.table(data)
    }
  },

  /**
   * 分组开始（仅开发环境）
   * @param {string} label
   */
  group(label) {
    if (isDevelopment && console.group) {
      console.group(label)
    }
  },

  /**
   * 分组结束（仅开发环境）
   */
  groupEnd() {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd()
    }
  },

  /**
   * 性能标记开始
   * @param {string} label
   */
  time(label) {
    if (isDevelopment && console.time) {
      console.time(label)
    }
  },

  /**
   * 性能标记结束
   * @param {string} label
   */
  timeEnd(label) {
    if (isDevelopment && console.timeEnd) {
      console.timeEnd(label)
    }
  }
}

export default logger

/**
 * 使用示例：
 *
 * import logger from '@/utils/logger'
 *
 * // 开发环境会输出，生产环境不输出
 * logger.log('用户数据：', userData)
 * logger.debug('调试信息：', debugInfo)
 * logger.info('操作完成')
 *
 * // 所有环境都会输出
 * logger.warn('警告：配置项缺失')
 * logger.error('错误：', error)
 *
 * // 性能测试
 * logger.time('数据加载')
 * // ... 执行操作
 * logger.timeEnd('数据加载')
 */
