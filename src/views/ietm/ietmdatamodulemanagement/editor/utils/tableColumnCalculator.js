/**
 * 表格列数计算工具
 * 功能：计算表格的实际列数（考虑colspan）
 * 版本：1.1
 * 日期：2026-10-19
 */

/**
 * 计算表格的实际列数
 * 算法：
 * 1. 遍历所有行
 * 2. 对每一行计算其列数（考虑colspan）
 * 3. 返回最大列数
 * @param {jQuery} $table - 表格DOM对象（jQuery包装）
 * @returns {number} - 列数（最小1列）
 */
export function calculateColumnCount($table) {
  if (!$table || !$table.length) {
    return 1
  }

  let maxCols = 0

  // 查询所有行（支持有/无tbody的两种结构）
  const $rows = $table.find('tr')

  $rows.each((rowIndex, row) => {
    const $row = $(row)

    // 跳过隐藏行
    if ($row.css('display') === 'none') {
      return true
    }

    let colCount = 0
    const $tds = $row.find('td')

    $tds.each((colIndex, td) => {
      const $td = $(td)

      // 跳过隐藏单元格
      if ($td.css('display') === 'none') {
        return true
      }

      const colspan = $td.attr('colspan')
      const span = colspan ? Math.max(1, parseInt(colspan)) : 1

      colCount += span
    })

    maxCols = Math.max(maxCols, colCount)
  })

  return Math.max(1, maxCols)
}

/**
 * 计算表格第i行的实际列数
 * @param {jQuery} $row - 行DOM对象
 * @returns {number} - 该行的列数
 */
export function calculateRowColumnCount($row) {
  if (!$row || !$row.length) {
    return 0
  }

  let colCount = 0
  const $tds = $row.find('td')

  $tds.each((colIndex, td) => {
    const $td = $(td)

    if ($td.css('display') === 'none') {
      return true
    }

    const colspan = $td.attr('colspan')
    const span = colspan ? Math.max(1, parseInt(colspan)) : 1

    colCount += span
  })

  return colCount
}

/**
 * 获取表格的实际结构信息
 * @param {jQuery} $table - 表格DOM对象
 * @returns {object} - {rows: 行数, cols: 最大列数, hasHead: 是否有表头, hasFoot: 是否有表尾}
 */
export function getTableStructure($table) {
  if (!$table || !$table.length) {
    return {
      rows: 0,
      cols: 0,
      hasHead: false,
      hasFoot: false
    }
  }

  let hasHead = false
  let hasFoot = false
  const $rows = $table.find('tr')

  $rows.each((i, row) => {
    const $row = $(row)
    if ($row.hasClass('thead')) {
      hasHead = true
    }
    if ($row.hasClass('tfoot')) {
      hasFoot = true
    }
  })

  return {
    rows: $rows.length,
    cols: calculateColumnCount($table),
    hasHead,
    hasFoot
  }
}

export default {
  calculateColumnCount,
  calculateRowColumnCount,
  getTableStructure
}
