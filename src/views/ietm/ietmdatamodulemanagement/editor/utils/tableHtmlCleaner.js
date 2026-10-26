/**
 * HTML 清理工具（修正版）
 * 功能：清理UEditor生成的HTML中的冗余属性，保留必要的表格结构
 * 版本：1.1（修正版，10步清理规则）
 * 日期：2026-10-19
 */

/**
 * 清理HTML中的冗余属性和标签
 * @param {string} html - 输入HTML
 * @returns {string} - 清理后的HTML
 */
export function cleanHtml(html) {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return html.trim()
    // 第1步：替换HTML实体
    .replace(/&nbsp;/g, ' ')

    // 第2步：移除闭合的br标签
    .replace(/<\/br>/gi, '')

    // 第3步：移除cellspacing属性
    .replace(/ cellspacing="[^"]*"/g, '')

    // 第4步：移除cellpadding属性
    .replace(/ cellpadding="[^"]*"/g, '')

    // 第5步：移除style属性（保留class）
    .replace(/ style="[^"]*"/g, '')

    // 第6步：移除width属性
    .replace(/ width="[^"]*"/g, '')

    // 第7步：移除br自闭合标签
    .replace(/<br\s*\/?>/gi, '')

    // 第8步：移除border属性
    .replace(/ border="[^"]*"/g, '')

    // 第9步：移除align属性
    .replace(/ align="[^"]*"/g, '')

    // 第10步：移除valign属性
    .replace(/ valign="[^"]*"/g, '')

    // 第11步：压缩连续空白
    .replace(/\s+/g, ' ')

    // 第12步：去除首尾空白
    .trim()
}

/**
 * 验证HTML是否为空表格
 * @param {string} html - HTML内容
 * @returns {boolean} - 是否为空表格
 */
export function isEmptyTable(html) {
  if (!html || typeof html !== 'string') {
    return false
  }
  return /^<table[^>]*>\s*<\/table>$/.test(html.trim())
}

export default {
  cleanHtml,
  isEmptyTable
}
