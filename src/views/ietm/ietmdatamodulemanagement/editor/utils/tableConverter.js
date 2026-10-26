/**
 * 表格转换工具 - 核心模块
 * 功能：HTML ↔ XML 双向转换（包含所有修正）
 * 版本：1.2（修正版，包含P4问题修正）
 * 日期：2026-10-20
 *
 * 修正项：
 * ✅ 问题1：colspan/rowspan 公式修正 → 变量名明确化
 * ✅ 问题2：表格结构处理 → 支持无tbody结构
 * ✅ 问题3：XML→HTML 反向计算 → 分离独立函数
 * ✅ 问题4：空表格处理 → TableDesigner处理
 * ✅ 问题6：HTML清理规则 → 扩展到10步
 * ✅ 问题P2：<para>标签重复包装 → 提取内部内容
 * ✅ 问题P3+P4：富文本标签转义错误 → 保留格式标签
 */

import { cleanHtml, isEmptyTable } from './tableHtmlCleaner'
import { calculateColumnCount } from './tableColumnCalculator'
import { toEnXml, toCnXml, normalizeXml } from './tableLocalizer'

/**
 * HTML → XML 转换（修正版）
 *
 * 算法：
 * 1. 清理HTML
 * 2. 解析为DOM
 * 3. 计算列数
 * 4. 生成colspec
 * 5. 处理行（修正：不限制在tbody）
 * 6. 生成tgroup和table
 * 7. 本地化转换
 *
 * @param {string} html - UEditor生成的HTML
 * @param {string} tableTitle - 表格标题
 * @param {string} tableId - 表格ID
 * @param {string} locale - 语言（'en'或'cn'）
 * @returns {Promise<string>} - 生成的XML字符串
 */
export async function htmlToTableXml(html, tableTitle = '', tableId = '', locale = 'en') {
  try {
    // 第1步：清理HTML
    const cleanedHtml = cleanHtml(html)

    if (isEmptyTable(cleanedHtml)) {
      throw new Error('表格内容不能为空')
    }

    // 第2步：创建临时DOM容器并解析HTML
    const $container = $(`<div id="temp-table-container-${Date.now()}" style="display:none;"></div>`).appendTo('body')

    try {
      $container.html(cleanedHtml)

      // 第3步：提取table元素
      const $table = $container.find('table').last()
      if (!$table.length) {
        throw new Error('HTML中未找到表格标签')
      }

      // 第4步：计算列数
      const colCount = calculateColumnCount($table)
      if (colCount <= 0) {
        throw new Error('表格列数计算失败')
      }

      // 第5步：生成colspec
      let colspecs = ''
      for (let i = 1; i <= colCount; i++) {
        colspecs += `  <colspec colname="col${i}"/>\n`
      }

      // 第6步：处理行（修正：find('tr')而不是find('tbody tr')）
      let thead = '',
        tbody = '',
        tfoot = ''
      const $rows = $table.find('tr')

      $rows.each((rowIndex, row) => {
        const $row = $(row)

        // 跳过隐藏行
        if ($row.css('display') === 'none') {
          return true
        }

        const entries = getRowEntries($row, colCount)

        if (entries.trim() === '') {
          return true
        }

        const rowXml = `  <row>\n${entries}  </row>\n`

        // 根据class属性判断行类型
        if ($row.hasClass('thead')) {
          thead += rowXml
        } else if ($row.hasClass('tfoot')) {
          tfoot += rowXml
        } else {
          tbody += rowXml
        }
      })

      // 第7步：组装XML
      let xml = '<table'

      // 添加id属性（可选）
      if (tableId) {
        xml += ` id="${escapeXml(tableId)}"`
      }

      xml += '>\n'

      // 添加标题（可选）
      if (tableTitle) {
        xml += `  <title>${escapeXml(tableTitle)}</title>\n`
      }

      // 添加tgroup
      xml += `  <tgroup cols="${colCount}">\n`
      xml += colspecs

      // 添加表头、表体、表尾
      if (thead) {
        xml += '  <thead>\n'
        xml += thead
        xml += '  </thead>\n'
      }

      if (tbody) {
        xml += '  <tbody>\n'
        xml += tbody
        xml += '  </tbody>\n'
      }

      if (tfoot) {
        xml += '  <tfoot>\n'
        xml += tfoot
        xml += '  </tfoot>\n'
      }

      xml += '  </tgroup>\n'
      xml += '</table>'

      // 第8步：本地化转换
      if (locale === 'cn') {
        xml = toCnXml(xml)
      }

      return xml
    } finally {
      // 清理临时DOM
      $container.remove()
    }
  } catch (error) {
    console.error('HTML转XML失败:', error)
    throw new Error(`表格转换失败: ${error.message}`)
  }
}

/**
 * 获取一行的所有entry
 * 修正：明确变量名，避免0-based和1-based混淆
 *
 * @param {jQuery} $row - 行DOM
 * @param {number} colCount - 表格列数
 * @returns {string} - entry XML片段
 */
function getRowEntries($row, colCount) {
  let entries = ''
  const $tds = $row.find('td')

  $tds.each((colIndex, td) => {
    const $td = $(td)

    // 跳过隐藏单元格
    if ($td.css('display') === 'none') {
      return true
    }

    // 修正：明确变量名
    // colIndex: 0-based索引（来自jQuery each）
    // colNameStart: 1-based列名数值（用于生成col1, col2等）
    const colNameStart = colIndex + 1

    let entry = `    <entry colname="col${colNameStart}"`

    const colspan = $td.attr('colspan')
    const rowspan = $td.attr('rowspan')

    // 修正：使用清晰的公式
    // nameend = namest + colspan - 1
    //        = (colIndex + 1) + colspan - 1
    //        = colIndex + colspan
    if (colspan && parseInt(colspan) > 1) {
      const colNameEnd = colNameStart + parseInt(colspan) - 1
      entry += ` namest="col${colNameStart}" nameend="col${colNameEnd}"`
    }

    // 修正：正确的公式
    // morerows = rowspan - 1
    if (rowspan && parseInt(rowspan) > 1) {
      const morerows = parseInt(rowspan) - 1
      entry += ` morerows="${morerows}"`
    }

    // 获取单元格内容并转换为para
    const content = getCellContent($td)
    entry += `>${content}</entry>\n`

    entries += entry
  })

  return entries
}

/**
 * 获取单元格内容并转换为para格式
 * @param {jQuery} $td - 单元格DOM
 * @returns {string} - para XML
 */
function getCellContent($td) {
  let html = $td.html()

  if (!html || html.trim() === '') {
    return '<para></para>'
  }

  // 🔧 修复P2：移除已存在的<para>标签，避免重复包装
  if (html.includes('<para>')) {
    const paraMatch = html.match(/<para>([\s\S]*?)<\/para>/i)
    if (paraMatch) {
      html = paraMatch[1]
    }
  }

  // 🔧 修复P3+P4：UEditor中的富文本标签（<strong>、<em>、<sup>、<sub>等）不应转义
  // 原问题：escapeXml将 <sup>2</sup> → &lt;sup&gt;2&lt;/sup&gt;
  // 导致：保存后上标消失，只显示数字；再次加载时标签显示为纯文本
  // 解决：直接使用清理后的HTML，保留格式标签
  const cleanContent = cleanHtml(html)

  return `<para>${cleanContent}</para>`
}

/**
 * XML → HTML 转换（修正版）
 *
 * @param {string} xml - 表格XML
 * @param {string} locale - 语言（'en'或'cn'）
 * @returns {Promise<{html: string, tableTitle: string, tableId: string}>}
 */
export async function xmlToTableHtml(xml, locale = 'en') {
  try {
    // 第1步：本地化转换（统一为英文处理）
    xml = normalizeXml(xml, 'en')

    // 第2步：创建临时DOM容器
    const $container = $(`<div id="temp-xml-container-${Date.now()}" style="display:none;"></div>`).appendTo('body')

    try {
      // 第3步：解析XML
      let $xml
      try {
        $xml = $($.parseXML(xml))
      } catch (e) {
        throw new Error(`XML解析失败: ${e.message}`)
      }

      // 第4步：提取表格信息
      const $table = $xml.find('table')
      if (!$table.length) {
        throw new Error('XML中未找到table元素')
      }

      const tableTitle = $table.find('> title').text() || ''
      const tableId = $table.attr('id') || ''

      // 第5步：处理tgroup
      const $tgroup = $table.find('> tgroup')
      if (!$tgroup.length) {
        throw new Error('XML中未找到tgroup元素')
      }

      const colCount = parseInt($tgroup.attr('cols')) || 1

      // 第6步：构建HTML
      let html = '<table>\n'

      // 处理thead
      const $thead = $tgroup.find('> thead')
      if ($thead.length) {
        const theadRows = getHtmlRows($thead, 'thead')
        html += theadRows
      }

      // 处理tbody
      const $tbody = $tgroup.find('> tbody')
      if ($tbody.length) {
        const tbodyRows = getHtmlRows($tbody, 'tbody')
        html += tbodyRows
      }

      // 处理tfoot
      const $tfoot = $tgroup.find('> tfoot')
      if ($tfoot.length) {
        const tfootRows = getHtmlRows($tfoot, 'tfoot')
        html += tfootRows
      }

      html += '</table>'

      return {
        html,
        tableTitle,
        tableId
      }
    } finally {
      $container.remove()
    }
  } catch (error) {
    console.error('XML转HTML失败:', error)
    throw new Error(`表格反向转换失败: ${error.message}`)
  }
}

/**
 * 从XML section获取HTML行
 * @param {jQuery} $section - thead/tbody/tfoot元素
 * @param {string} sectionType - 区域类型
 * @returns {string} - HTML行片段
 */
function getHtmlRows($section, sectionType) {
  let html = ''
  const $rows = $section.find('> row')

  $rows.each((i, row) => {
    const $row = $(row)
    let rowHtml = '<tr'

    if (sectionType === 'thead') {
      rowHtml += ' class="thead" style="background-color: #ADD8E6;"'
    } else if (sectionType === 'tfoot') {
      rowHtml += ' class="tfoot" style="background-color: #98FB98;"'
    }

    rowHtml += '>\n'

    // 处理entry
    const $entries = $row.find('> entry')
    $entries.each((j, entry) => {
      const $entry = $(entry)

      // 修正：使用独立函数计算colspan和rowspan
      const colspan = calculateColspanFromXml($entry)
      const rowspan = calculateRowspanFromXml($entry)

      let tdHtml = '  <td'

      if (colspan > 1) {
        tdHtml += ` colspan="${colspan}"`
      }

      if (rowspan > 1) {
        tdHtml += ` rowspan="${rowspan}"`
      }

      tdHtml += '>'

      // 🔧 修复P4：XML的para内容需要unescapeXml还原为HTML
      // 原问题：XML中 <sup>2</sup> 被 escapeXml 转为 &lt;sup&gt;2&lt;/sup&gt;
      // 加载时需要反转义回 <sup>2</sup>，UEditor才能识别为上标标签
      let content = $entry.html() || ''

      // 提取para内部内容（移除外层para标签）
      if (content.includes('<para>')) {
        const paraMatch = content.match(/<para>([\s\S]*?)<\/para>/i)
        if (paraMatch) {
          content = paraMatch[1]
        }
      }

      // 🔧 关键修复：反转义XML实体，将 &lt;sup&gt; → <sup>
      content = unescapeXml(content.trim())

      // 🔧 修复P5：压缩多余空白字符（包括&nbsp;解码后的 不间断空格）
      // 原问题：XML中多个&nbsp;被unescapeXml还原为 ，导致显示时出现大量空格
      // 解决：将所有空白字符（包括 、\t、\n）标准化为单个空格
      content = content.replace(/[\s ]+/g, ' ').trim()

      tdHtml += content

      tdHtml += '</td>\n'

      rowHtml += tdHtml
    })

    rowHtml += '</tr>\n'
    html += rowHtml
  })

  return html
}

/**
 * 从XML的namest/nameend属性计算colspan（修正版）
 *
 * 公式：colspan = endIdx - startIdx + 1
 * 例：namest="col1" nameend="col3" → colspan = 3 - 1 + 1 = 3 ✓
 *
 * @param {jQuery} $entry - entry元素
 * @returns {number} - colspan值（最小1）
 */
function calculateColspanFromXml($entry) {
  const namest = $entry.attr('namest')
  const nameend = $entry.attr('nameend')

  if (namest && nameend) {
    try {
      // 提取列号：从"col1"提取1，从"col3"提取3
      const startIdx = parseInt(namest.replace(/^col(\d+)$/, '$1'))
      const endIdx = parseInt(nameend.replace(/^col(\d+)$/, '$1'))

      if (isNaN(startIdx) || isNaN(endIdx) || startIdx <= 0 || endIdx <= 0) {
        console.warn(`列号提取失败: namest=${namest}, nameend=${nameend}`)
        return 1
      }

      // 公式：colspan = endIdx - startIdx + 1
      const colspan = endIdx - startIdx + 1
      return Math.max(1, colspan)
    } catch (error) {
      console.warn(`计算colspan失败: ${error.message}`)
      return 1
    }
  }

  return 1
}

/**
 * 从XML的morerows属性计算rowspan（修正版）
 *
 * 公式：rowspan = morerows + 1
 * 例：morerows="2" → rowspan = 2 + 1 = 3 ✓
 *
 * @param {jQuery} $entry - entry元素
 * @returns {number} - rowspan值（最小1）
 */
function calculateRowspanFromXml($entry) {
  const morerows = $entry.attr('morerows')

  if (morerows) {
    try {
      const morerowsNum = parseInt(morerows)

      if (isNaN(morerowsNum) || morerowsNum < 0) {
        console.warn(`morerows值非法: ${morerows}`)
        return 1
      }

      // 公式：rowspan = morerows + 1
      return morerowsNum + 1
    } catch (error) {
      console.warn(`计算rowspan失败: ${error.message}`)
      return 1
    }
  }

  return 1
}

/**
 * 转义XML特殊字符
 * @param {string} text - 原文本
 * @returns {string} - 转义后的文本
 */
function escapeXml(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 反转义XML特殊字符
 * @param {string} text - 转义后的文本
 * @returns {string} - 原文本
 */
function unescapeXml(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

export default {
  htmlToTableXml,
  xmlToTableHtml
}
