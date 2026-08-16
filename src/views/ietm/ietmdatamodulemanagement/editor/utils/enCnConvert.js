// editor/utils/enCnConvert.js
// 对标 legacy toCnXml/toEnXml（需求 §10 CONFIRMED）

/**
 * 收集正文中出现的所有元素名（开标签/闭标签/自闭合标签），去重。
 * 起始字符限定为字母/下划线/中文，天然排除 <?xml?> 与 <!DOCTYPE>。
 * 相比只取闭合标签，可覆盖自闭合元素（<foo/> 无独立 </foo>，§10）。
 */
function _collectTagNames(xml) {
  const names = []
  const re = /<\/?([A-Za-z_一-鿿][\w.\-一-鿿]*)/g
  let m
  while ((m = re.exec(xml)) !== null) {
    if (names.indexOf(m[1]) === -1) names.push(m[1])
  }
  return names
}

/** 正则转义（统一字符类，含 {}） */
function _esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 用 name 映射把 xml 中的开/闭/自闭标签整体替换 */
function _translate(xml, map) {
  let result = xml
  for (const srcName of _collectTagNames(xml)) {
    if (srcName.includes(':')) continue          // 命名空间名不翻译（§10）
    const dstName = map[srcName]
    if (!dstName || dstName === srcName) continue
    const esc = _esc(srcName)
    result = result.replace(new RegExp('<' + esc + '>', 'g'),  '<' + dstName + '>')
    result = result.replace(new RegExp('<' + esc + ' ', 'g'),  '<' + dstName + ' ')
    result = result.replace(new RegExp('<' + esc + '/>', 'g'), '<' + dstName + '/>')
    result = result.replace(new RegExp('</' + esc + '>', 'g'), '</' + dstName + '>')
  }
  return result
}

/** 英文 XML → 中文 XML（§10 CONFIRMED） */
export function toCnXml(xml, en2cnElem) {
  if (!xml || !en2cnElem) return xml
  return _translate(xml, en2cnElem)
}

/** 中文 XML → 英文 XML（反向） */
export function toEnXml(xml, cn2enElem) {
  if (!xml || !cn2enElem) return xml
  return _translate(xml, cn2enElem)
}
