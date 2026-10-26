/**
 * 表格中英文XML转换工具
 * 功能：将XML标签在中英文之间转换
 * 版本：1.1
 * 日期：2026-10-19
 *
 * 需求来源：§4.4 中文XML映射
 * 映射表：18个标签的中英文对应关系
 */

/**
 * 中英文标签映射表
 * 来源：需求文档§4.4
 */
const ZH_CN_MAPPING = {
  'table': '表格',
  'title': '标题',
  'tgroup': '列组',
  'colspec': '列定义',
  'colname': '列名',
  'thead': '表头',
  'tbody': '表体',
  'tfoot': '表尾',
  'row': '行',
  'entry': '项',
  'para': '段',
  'emphasis': '强调',
  'superScript': '上标',
  'subScript': '下标',
  'sequentialList': '有序列表',
  'randomList': '无序列表',
  'listItem': '项目',
  'morerows': '更多行'
}

/**
 * 英文XML转换为中文XML
 * @param {string} enXml - 英文XML
 * @returns {string} - 中文XML
 */
export function toCnXml(enXml) {
  if (!enXml || typeof enXml !== 'string') {
    return ''
  }

  let cnXml = enXml

  // 逐个替换标签
  Object.entries(ZH_CN_MAPPING).forEach(([en, cn]) => {
    // 替换开标签：<tag ...>
    cnXml = cnXml.replace(new RegExp(`<${en}(\\s|>)`, 'g'), `<${cn}$1`)

    // 替换闭标签：</tag>
    cnXml = cnXml.replace(new RegExp(`</${en}>`, 'g'), `</${cn}>`)

    // 替换属性名（如果有）：colname="..."
    cnXml = cnXml.replace(new RegExp(`${en}="`, 'g'), `${cn}="`)
  })

  return cnXml
}

/**
 * 中文XML转换为英文XML
 * @param {string} cnXml - 中文XML
 * @returns {string} - 英文XML
 */
export function toEnXml(cnXml) {
  if (!cnXml || typeof cnXml !== 'string') {
    return ''
  }

  let enXml = cnXml

  // 逐个替换标签（反向）
  Object.entries(ZH_CN_MAPPING).forEach(([en, cn]) => {
    // 替换开标签：<标签 ...>
    enXml = enXml.replace(new RegExp(`<${cn}(\\s|>)`, 'g'), `<${en}$1`)

    // 替换闭标签：</标签>
    enXml = enXml.replace(new RegExp(`</${cn}>`, 'g'), `</${en}>`)

    // 替换属性名（如果有）：标签名="..."
    enXml = enXml.replace(new RegExp(`${cn}="`, 'g'), `${en}="`)
  })

  return enXml
}

/**
 * 检测XML是否为中文格式
 * @param {string} xml - XML文本
 * @returns {boolean} - 是否为中文格式
 */
export function isCnXml(xml) {
  if (!xml || typeof xml !== 'string') {
    return false
  }

  // 检查是否包含中文标签
  return /[表格标题列组列定义列名表头表体表尾行项段强调上标下标有序列表无序列表项目更多行]/.test(xml)
}

/**
 * 检测XML是否为英文格式
 * @param {string} xml - XML文本
 * @returns {boolean} - 是否为英文格式
 */
export function isEnXml(xml) {
  if (!xml || typeof xml !== 'string') {
    return false
  }

  // 检查是否包含英文表格标签
  return /<table\b/.test(xml) && !/[表格标题列组列定义列名表头表体表尾行项段]/.test(xml)
}

/**
 * 规范化XML格式（统一为指定格式）
 * @param {string} xml - 输入XML
 * @param {string} targetFormat - 目标格式（'en'或'cn'）
 * @returns {string} - 格式化后的XML
 */
export function normalizeXml(xml, targetFormat = 'en') {
  if (!xml || typeof xml !== 'string') {
    return ''
  }

  // 先转换为英文，再根据需要转换
  let normalized = isEnXml(xml) ? xml : toEnXml(xml)

  if (targetFormat === 'cn') {
    normalized = toCnXml(normalized)
  }

  return normalized
}

export default {
  toCnXml,
  toEnXml,
  isCnXml,
  isEnXml,
  normalizeXml,
  ZH_CN_MAPPING
}
