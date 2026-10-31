/**
 * Figure XML 转换工具
 *
 * 功能:
 * - figure2object: XML → JavaScript对象
 * - object2figure: JavaScript对象 → XML
 * - toCnFigureXml: 英文标签 → 中文标签
 * - toEnFigureXml: 中文标签 → 英文标签
 * - escapeXml: XSS防护
 */

import $ from 'jquery'

/**
 * XML → 对象转换
 *
 * @param {Object} Parent - 父对象（保留参数，兼容旧系统）
 * @param {String} figureXml - Figure XML字符串
 * @returns {Promise<Object>} Figure对象
 */
export async function figure2object(Parent, figureXml) {
  // 前置验证
  if (!figureXml || figureXml.trim() === '') {
    throw new Error('XML内容不能为空')
  }

  try {
    // 🔑 兼容性处理：为缺失 xmlns:xlink 的旧数据添加命名空间声明
    // 原因：数据库中的旧 Figure XML 可能没有 xmlns:xlink 声明
    // 这会导致"Namespace prefix xlink for type on graphic is not defined"错误
    let processedXml = figureXml

    if (figureXml.includes('xlink:') && !figureXml.includes('xmlns:xlink')) {
      // 在 <figure> 标签中添加 xmlns:xlink 声明
      processedXml = figureXml.replace(
        /(<figure)(\s|>)/,
        '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2'
      )
    }

    const xmlDoc = $.parseXML(processedXml)

    // 检查jQuery parseXML错误
    if (!xmlDoc || xmlDoc.documentElement === undefined) {
      throw new Error('XML格式错误')
    }

    const $figure = $(xmlDoc).find('figure')

    // 检查figure元素是否存在
    if ($figure.length === 0) {
      throw new Error('XML中找不到<figure>元素')
    }

    // 检查必填字段
    const title = $figure.find('>title').text().trim()
    if (!title) {
      throw new Error('Figure标题(title)不能为空')
    }

    const obj = {
      title: title,
      id: $figure.attr('id') || '',
      graphics: [],
      legends: []
    }

    // 提取图形
    $figure.find('>graphic').each(function() {
      const $graphic = $(this)

      // 优先从<graphic>标签的infoEntityIdent属性读取（新格式：S1000D标准）
      let icn = $graphic.attr('infoEntityIdent') || ''

      // 如果<graphic>标签没有infoEntityIdent，尝试从<image>子元素读取（旧格式兼容）
      if (!icn) {
        const $image = $graphic.find('>image').eq(0)
        if ($image.length > 0) {
          icn = $image.attr('infoEntityIdent') || ''
        }
      }

      // S1000D 4.0 标准要求：infoEntityIdent 是必填属性
      if (!icn || icn.trim().length === 0) {
        throw new Error('Graphic 的 infoEntityIdent（ICN编码）不能为空（S1000D 4.0标准要求必填）')
      }

      const graphic = {
        icn: icn,
        filename: '',
        hotspots: []
      }

      // 提取热点数据（如果有的话）
      $graphic.find('>hotspot').each(function() {
        const $hotspot = $(this)
        const hotspot = {
          apsid: $hotspot.attr('applicationStructureIdent') || '',
          name: $hotspot.attr('applicationStructureName') || '',
          id: $hotspot.attr('id') || ''
        }
        graphic.hotspots.push(hotspot)
      })

      obj.graphics.push(graphic)
    })

    // 提取图例
    $figure.find('>legend>definitionList>definitionListItem').each(function() {
      const $item = $(this)
      const no = $item.find('>listItemTerm').text().trim()
      const name = $item.find('>listItemDefinition>para').text().trim()

      // 检查必填字段
      if (!no || !name) {
        throw new Error('图例缺少必需字段')
      }

      obj.legends.push({
        no: no,
        name: name
      })
    })

    return obj
  } catch (error) {
    throw new Error(`XML解析失败: ${error.message}`)
  }
}

/**
 * 对象 → XML转换
 *
 * @param {Object} Parent - 父对象（保留参数，兼容旧系统）
 * @param {Object} figureObj - Figure对象
 * @returns {Promise<String>} Figure XML字符串
 */
export async function object2figure(Parent, figureObj) {
  const lines = []

  let figTag = '<figure'
  // 声明 xlink 命名空间（S1000D 4.0 标准要求）
  figTag += ' xmlns:xlink="http://www.w3.org/1999/xlink"'
  if (figureObj.id && figureObj.id.trim()) {
    figTag += ` id="${escapeXml(figureObj.id)}"`
  }
  figTag += '>'
  lines.push(figTag)

  lines.push(`<title>${escapeXml(figureObj.title)}</title>`)

  if (figureObj.graphics && figureObj.graphics.length > 0) {
    for (const graphic of figureObj.graphics) {
      // S1000D标准格式: <graphic>标签带xlink属性和infoEntityIdent
      let graphicTag = '<graphic'
      graphicTag += ' xlink:type="simple"'
      graphicTag += ' xlink:show="replace"'
      graphicTag += ' xlink:actuate="onRequest"'
      graphicTag += ` infoEntityIdent="${escapeXml(graphic.icn)}"`
      graphicTag += '>'
      lines.push(graphicTag)

      // 添加热点子元素（如果存在）
      if (graphic.hotspots && graphic.hotspots.length > 0) {
        for (const hotspot of graphic.hotspots) {
          let hotspotTag = '<hotspot'
          if (hotspot.apsid) {
            hotspotTag += ` applicationStructureIdent="${escapeXml(hotspot.apsid)}"`
          }
          if (hotspot.name) {
            hotspotTag += ` applicationStructureName="${escapeXml(hotspot.name)}"`
          }
          if (hotspot.id) {
            hotspotTag += ` id="${escapeXml(hotspot.id)}"`
          }
          hotspotTag += '/>'
          lines.push(hotspotTag)
        }
      }

      lines.push('</graphic>')
    }
  }

  if (figureObj.legends && figureObj.legends.length > 0) {
    lines.push('<legend>')
    lines.push('<definitionList>')
    for (const legend of figureObj.legends) {
      lines.push('<definitionListItem>')
      lines.push(`<listItemTerm>${escapeXml(legend.no)}</listItemTerm>`)
      lines.push('<listItemDefinition>')
      lines.push(`<para>${escapeXml(legend.name)}</para>`)
      lines.push('</listItemDefinition>')
      lines.push('</definitionListItem>')
    }
    lines.push('</definitionList>')
    lines.push('</legend>')
  }

  lines.push('</figure>')
  return lines.join('\n')
}

/**
 * XSS防护 - XML特殊字符转义
 *
 * @param {String} str - 原始字符串
 * @returns {String} 转义后的字符串
 */
function escapeXml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;')
           .replace(/'/g, '&apos;')
}

/**
 * 多语言转换 - 英文标签转中文
 */
export function toCnFigureXml(enXml) {
  const cnTagMap = {
    '<figure': '<插图',
    '</figure>': '</插图>',
    '<title': '<标题',
    '</title>': '</标题>',
    '<graphic': '<图形',
    '</graphic>': '</图形>',
    '<image': '<图像',
    '<hotspot': '<热点',
    '</hotspot>': '</热点>',
    '<legend': '<图例',
    '</legend>': '</图例>',
    '<definitionList': '<定义列表',
    '</definitionList>': '</定义列表>',
    '<definitionListItem': '<定义项',
    '</definitionListItem>': '</定义项>',
    '<listItemTerm': '<列表项标号',
    '</listItemTerm>': '</列表项标号>',
    '<listItemDefinition': '<列表项定义',
    '</listItemDefinition>': '</列表项定义>',
    '<para': '<段落',
    '</para>': '</段落>',
    'infoEntityIdent': '信息实体标识',
    'applicationStructureIdent': '应用结构标识',
    'applicationStructureName': '应用结构名称'
  }

  let result = enXml
  for (const [en, cn] of Object.entries(cnTagMap)) {
    result = result.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cn)
  }
  return result
}

/**
 * 多语言转换 - 中文标签转英文
 */
export function toEnFigureXml(cnXml) {
  const enTagMap = {
    '<插图': '<figure',
    '</插图>': '</figure>',
    '<标题': '<title',
    '</标题>': '</title>',
    '<图形': '<graphic',
    '</图形>': '</graphic>',
    '<图像': '<image',
    '<热点': '<hotspot',
    '</热点>': '</hotspot>',
    '<图例': '<legend',
    '</图例>': '</legend>',
    '<定义列表': '<definitionList',
    '</定义列表>': '</definitionList>',
    '<定义项': '<definitionListItem',
    '</定义项>': '</definitionListItem>',
    '<列表项标号': '<listItemTerm',
    '</列表项标号>': '</listItemTerm>',
    '<列表项定义': '<listItemDefinition',
    '</列表项定义>': '</listItemDefinition>',
    '<段落': '<para',
    '</段落>': '</para>',
    '信息实体标识': 'infoEntityIdent',
    '应用结构标识': 'applicationStructureIdent',
    '应用结构名称': 'applicationStructureName'
  }

  let result = cnXml
  for (const [cn, en] of Object.entries(enTagMap)) {
    result = result.replace(new RegExp(cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en)
  }
  return result
}

/**
 * 辅助函数 - 查找CodeMirror中的figure XML块
 */
export function findFigureXmlBlock(editor, startLine) {
  if (!editor || startLine === undefined) return null

  let figureXml = editor.getLine(startLine)
  const isSingleLine = figureXml.includes('<figure') && figureXml.includes('</figure>')

  if (!isSingleLine) {
    for (let i = startLine + 1; i < editor.lineCount(); i++) {
      figureXml += '\n' + editor.getLine(i)
      if (editor.getLine(i).includes('</figure>')) {
        return {
          xml: figureXml,
          endLine: i
        }
      }
    }
    throw new Error('找不到</figure>结束标签')
  }

  return {
    xml: figureXml,
    endLine: startLine
  }
}

/**
 * 辅助函数 - 重新查找figure在编辑器中的行号
 */
export function findFigureLineNo(editor, figureId, startSearchLine = 0) {
  if (!editor || !figureId) return -1

  const lineCount = editor.lineCount()
  for (let i = startSearchLine; i < lineCount; i++) {
    const line = editor.getLine(i)
    if (line.includes(`<figure`) && line.includes(`id="${figureId}"`)) {
      return i
    }
  }
  return -1
}

/**
 * 验证完整figure对象
 *
 * @param {Object} figureObj - Figure对象
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateFigure(figureObj) {
  const errors = []

  // 标题验证(必填)
  if (!figureObj.title || figureObj.title.trim().length === 0) {
    errors.push('Figure标题必填')
  }
  if (figureObj.title && figureObj.title.length > 200) {
    errors.push('Figure标题长度不能超过200个字符')
  }

  // 图形验证(至少1个,每个icn必填)
  if (!figureObj.graphics || figureObj.graphics.length === 0) {
    errors.push('至少需要添加一个图形')
  } else {
    for (let i = 0; i < figureObj.graphics.length; i++) {
      const graphic = figureObj.graphics[i]

      // icn必填
      if (!graphic.icn || graphic.icn.trim().length === 0) {
        errors.push(`第${i + 1}个图形的ICN编码不能为空`)
      }
      if (graphic.icn && graphic.icn.length > 50) {
        errors.push(`第${i + 1}个图形的ICN编码长度不能超过50个字符`)
      }

      // 热点验证（可选，但如果存在则验证内容）
      if (graphic.hotspots && graphic.hotspots.length > 0) {
        for (let j = 0; j < graphic.hotspots.length; j++) {
          const hotspot = graphic.hotspots[j]
          // 至少需要一个热点标识字段
          if (!hotspot.apsid && !hotspot.name && !hotspot.id) {
            errors.push(`第${i + 1}个图形的第${j + 1}个热点至少需要填写一项信息`)
          }
        }
      }
    }
  }

  // 图例验证(可选,但如果存在则需完整)
  if (figureObj.legends && figureObj.legends.length > 0) {
    const legendValidation = validateLegends(figureObj.legends)
    if (legendValidation.errors.length > 0) {
      errors.push(...legendValidation.errors)
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  }
}

/**
 * 验证单个图例
 *
 * @param {Object} legend - 图例对象
 * @param {Number} index - 图例索引
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateLegend(legend, index = 0) {
  const errors = []

  // no必填
  if (!legend.no || legend.no.trim().length === 0) {
    errors.push(`图例${index}的标号不能为空`)
  }
  if (legend.no && legend.no.length > 50) {
    errors.push(`图例${index}的标号长度不能超过50个字符`)
  }

  // name必填
  if (!legend.name || legend.name.trim().length === 0) {
    errors.push(`图例${index}的名称不能为空`)
  }
  if (legend.name && legend.name.length > 200) {
    errors.push(`图例${index}的名称长度不能超过200个字符`)
  }

  return {
    valid: errors.length === 0,
    errors: errors
  }
}

/**
 * 批量验证图例数组
 *
 * @param {Array} legends - 图例数组
 * @returns {Object} {valid: boolean, errors: string[]}
 */
function validateLegends(legends) {
  const errors = []

  for (let i = 0; i < legends.length; i++) {
    const legendValidation = validateLegend(legends[i], i)
    if (legendValidation.errors.length > 0) {
      errors.push(...legendValidation.errors)
    }
  }

  // 检查重复的no
  const noSet = new Set()
  for (const legend of legends) {
    if (noSet.has(legend.no)) {
      errors.push(`存在重复的图例标号: ${legend.no}`)
    }
    noSet.add(legend.no)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 展平错误信息为一个字符串(用于显示提示)
 *
 * @param {Array} errors - 错误数组
 * @returns {String} 错误信息字符串
 */
export function flattenErrors(errors) {
  return errors.join('\n')
}
