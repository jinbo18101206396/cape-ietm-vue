/**
 * DMC（Data Module Code）提取工具
 * 用途：从 <dmRef> 元素中提取 DMC 去重键和元数据
 * 来源：旧系统 IetmEditorUtils-src.js:1172-1249
 * 标准：§16.4.5.1 完整实现
 */

/**
 * 从编辑器行号提取完整 <dmRef>...</dmRef> 字符串
 *
 * @param {CodeMirror} editor - CodeMirror 实例
 * @param {number} lineno - 编辑器绝对行号（0-based）
 * @param {string} locale - 视图语言 'en'/'cn'
 * @param {object} cn2enElem - 中文→英文元素名映射表（中文视图需要）
 * @returns {object|null} - { dmc, xml, dmtitle, issuedate, issue } 或 null
 */
export function getDmcByLineno(editor, lineno, locale = 'en', cn2enElem = {}) {
  if (!editor || lineno < 0) return null

  // 1. 取 dmRef 的本地化名称
  const dmRefName = locale === 'cn' ? '数据模块引用' : 'dmRef'

  // 2. 判断该行是否以 <dmRef 开头
  let startLine = lineno
  let lineText = editor.getLine(lineno) || ''

  // 如果当前行不是 <dmRef 开头，向上和向下查找
  const trimmed = lineText.trim()
  if (!(trimmed.startsWith('<' + dmRefName + ' ') || trimmed.startsWith('<' + dmRefName + '>'))) {
    let found = false

    // 先向上查找（最多30行，不提前终止）
    for (let i = lineno - 1; i >= 0 && i >= lineno - 30; i--) {
      const candidateLine = editor.getLine(i) || ''
      const trimmed = candidateLine.trim()
      if (trimmed.startsWith('<' + dmRefName + ' ') ||
          trimmed.startsWith('<' + dmRefName + '>')) {
        startLine = i
        found = true
        break
      }
    }

    // 如果向上没找到，向下查找
    if (!found) {
      for (let i = lineno + 1; i < editor.lineCount() && i <= lineno + 20; i++) {
        const candidateLine = editor.getLine(i) || ''
        const trimmed = candidateLine.trim()
        if (trimmed.startsWith('<' + dmRefName + ' ') ||
            trimmed.startsWith('<' + dmRefName + '>')) {
          startLine = i
          found = true
          break
        }
      }
    }

    if (!found) {
      return null
    }
  }

  // 4. 向下查找闭合标签 </dmRef>
  let endLine = -1
  for (let i = startLine; i < editor.lineCount(); i++) {
    const line = editor.getLine(i) || ''
    if (line.includes('</' + dmRefName + '>')) {
      endLine = i
      break
    }
  }

  // 5. 未找到闭合标签，返回 null（不完整的 dmRef）
  if (endLine === -1) return null

  // 6. 提取完整 dmRef 字符串（包含闭合标签）
  const closingLine = editor.getLine(endLine) || ''
  const closingTagPos = closingLine.indexOf('</' + dmRefName + '>')

  let dmrefStr = ''
  if (closingTagPos !== -1) {
    // 闭合标签在 endLine 上，计算结束位置
    const endCh = closingTagPos + ('</' + dmRefName + '>').length
    dmrefStr = editor.getRange(
      { line: startLine, ch: 0 },
      { line: endLine, ch: endCh }
    )
  } else {
    // 闭合标签不在预期位置，返回 null
    return null
  }

  // 7. 中文视图转英文（XML 解析需要英文标签）
  if (locale === 'cn' && cn2enElem) {
    dmrefStr = _toEnXmlSimple(dmrefStr, cn2enElem)
  }

  // 8. 调用 getDmcByText 解析
  return getDmcByText(dmrefStr)
}

/**
 * 从 dmRef 字符串解析出 DMC 和元数据
 *
 * @param {string} dmrefStr - 完整的 <dmRef>...</dmRef> XML 字符串
 * @returns {object|null} - { dmc, xml, dmtitle, issuedate, issue } 或 null
 */
export function getDmcByText(dmrefStr) {
  if (!dmrefStr || !dmrefStr.trim()) return null

  try {
    // 1. 获取 DMC 去重键
    const dmc = getDmc(dmrefStr)
    if (!dmc) return null

    // 2. 解析 XML（规避命名空间：冒号替换为下划线）
    const sanitized = dmrefStr.replace(/:/g, '_')
    const wrapped = '<xml>' + sanitized + '</xml>'
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(wrapped, 'text/xml')

    // 检查解析错误
    const parseError = xmlDoc.getElementsByTagName('parsererror')
    if (parseError.length > 0) {
      return null
    }

    // 3. 提取 dmTitle (techName + infoName)
    const techNameEl = xmlDoc.querySelector('techName')
    const infoNameEl = xmlDoc.querySelector('infoName')
    const techName = techNameEl ? techNameEl.textContent.trim() : ''
    const infoName = infoNameEl ? infoNameEl.textContent.trim() : ''
    const dmtitle = techName && infoName ? `${techName} ${infoName}` : (techName || infoName || '')

    // 4. 提取 issueDate (year-month-day)
    const issueDateEl = xmlDoc.querySelector('issueDate')
    let issuedate = ''
    if (issueDateEl) {
      const year = issueDateEl.getAttribute('year') || ''
      const month = issueDateEl.getAttribute('month') || ''
      const day = issueDateEl.getAttribute('day') || ''
      issuedate = `${year}-${month}-${day}`
    }

    // 5. 提取 issueInfo (issueNumber-inWork)
    const issueInfoEl = xmlDoc.querySelector('issueInfo')
    let issue = ''
    if (issueInfoEl) {
      const issueNumber = issueInfoEl.getAttribute('issueNumber') || ''
      const inWork = issueInfoEl.getAttribute('inWork') || ''
      issue = `${issueNumber}-${inWork}`
    }

    // 6. XML 字符串：双引号替换为反引号（防拼接时引号冲突）
    const xml = dmrefStr.trim().replace(/"/g, '`')

    return { dmc, xml, dmtitle, issuedate, issue }

  } catch (err) {
    console.error('[getDmcByText] 解析异常:', err, dmrefStr.substring(0, 100))
    return null
  }
}

/**
 * 从 dmRef 字符串提取 DMC 去重键
 *
 * 格式（§16.4.5.1）：
 * DMC-{modelIdentCode}-{systemDiffCode}-{systemCode}-{subSystemCode}{subSubSystemCode}
 *    -{assyCode}-{disassyCode}{disassyCodeVariant}-{infoCode}{infoCodeVariant}
 *    -{itemLocationCode}_{issueNumber}-{inWork}_{languageIsoCode}-{countryIsoCode}
 *
 * 注意：
 * - subSystemCode+subSubSystemCode 直接拼接无分隔符
 * - disassyCode+disassyCodeVariant 直接拼接
 * - infoCode+infoCodeVariant 直接拼接
 * - language 段用 '-' 分隔而非 '_'
 *
 * @param {string} dmrefStr - dmRef XML 字符串
 * @returns {string} - DMC 去重键，如 'DMC-TEST-A-29-10-00-00A-040A-A_000-02_zh-CN'
 */
export function getDmc(dmrefStr) {
  if (!dmrefStr) return ''

  try {
    // 1. 解析 XML
    const sanitized = dmrefStr.replace(/:/g, '_')
    const wrapped = '<xml>' + sanitized + '</xml>'
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(wrapped, 'text/xml')

    // 2. 查找 dmCode 元素
    const dmCodeEl = xmlDoc.querySelector('dmCode')
    if (!dmCodeEl) return ''

    // 3. 提取 11 个 dmCode 属性（空则取 ''）
    const modelIdentCode = dmCodeEl.getAttribute('modelIdentCode') || ''
    const systemDiffCode = dmCodeEl.getAttribute('systemDiffCode') || ''
    const systemCode = dmCodeEl.getAttribute('systemCode') || ''
    const subSystemCode = dmCodeEl.getAttribute('subSystemCode') || ''
    const subSubSystemCode = dmCodeEl.getAttribute('subSubSystemCode') || ''
    const assyCode = dmCodeEl.getAttribute('assyCode') || ''
    const disassyCode = dmCodeEl.getAttribute('disassyCode') || ''
    const disassyCodeVariant = dmCodeEl.getAttribute('disassyCodeVariant') || ''
    const infoCode = dmCodeEl.getAttribute('infoCode') || ''
    const infoCodeVariant = dmCodeEl.getAttribute('infoCodeVariant') || ''
    const itemLocationCode = dmCodeEl.getAttribute('itemLocationCode') || ''

    // 4. 提取 issueInfo (issueNumber-inWork)
    const issueInfoEl = xmlDoc.querySelector('issueInfo')
    let issue = ''
    if (issueInfoEl) {
      const issueNumber = issueInfoEl.getAttribute('issueNumber') || ''
      const inWork = issueInfoEl.getAttribute('inWork') || ''
      issue = '_' + issueNumber + '-' + inWork
    }

    // 5. 提取 language (languageIsoCode-countryIsoCode)
    const languageEl = xmlDoc.querySelector('language')
    let lang = ''
    if (languageEl) {
      const languageIsoCode = languageEl.getAttribute('languageIsoCode') || ''
      const countryIsoCode = languageEl.getAttribute('countryIsoCode') || ''
      lang = '_' + languageIsoCode + '-' + countryIsoCode  // 注意：用 '-' 分隔
    }

    // 6. 拼接 DMC（注意直接拼接的部分）
    const dmc = 'DMC-' + modelIdentCode
      + '-' + systemDiffCode
      + '-' + systemCode
      + '-' + subSystemCode + subSubSystemCode       // 直接拼接
      + '-' + assyCode
      + '-' + disassyCode + disassyCodeVariant       // 直接拼接
      + '-' + infoCode + infoCodeVariant             // 直接拼接
      + '-' + itemLocationCode
      + issue    // 已含前导 '_'
      + lang     // 已含前导 '_'

    return dmc

  } catch (err) {
    console.error('[getDmc] 解析异常:', err)
    return ''
  }
}

/**
 * 简化版中文→英文转换（仅用于 dmRef 内部）
 * 完整版在 enCnConvert.js，此处避免循环依赖
 */
function _toEnXmlSimple(xml, cn2enElem) {
  if (!cn2enElem || Object.keys(cn2enElem).length === 0) return xml

  let result = xml
  for (const [cn, en] of Object.entries(cn2enElem)) {
    const cnTag = new RegExp(`<${cn}([\\s>])`, 'g')
    const cnCloseTag = new RegExp(`</${cn}>`, 'g')
    result = result.replace(cnTag, `<${en}$1`)
    result = result.replace(cnCloseTag, `</${en}>`)
  }
  return result
}
