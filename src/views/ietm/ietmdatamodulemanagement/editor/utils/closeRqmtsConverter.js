/**
 * closeRqmts XML 转换工具
 *
 * 功能:
 * - closeRqmts2object: XML → JavaScript对象
 * - object2closeRqmts: JavaScript对象 → XML
 *
 * @author IETM Team
 * @date 2026-11-14
 * @version 1.1
 */

import $ from 'jquery'

/**
 * XML → 对象转换
 *
 * @param {Object} Parent - 父对象（保留参数，兼容旧系统）
 * @param {String} closeRqmtsXml - closeRqmts XML字符串
 * @returns {Promise<Object>} closeRqmts对象
 * @throws {Error} XML解析失败时抛出异常
 */
export async function closeRqmts2object(Parent, closeRqmtsXml) {
  // 【v1.1优化】增强边界验证
  if (!closeRqmtsXml || closeRqmtsXml.trim() === '') {
    throw new Error('XML内容不能为空')
  }

  try {
    // 【v1.1优化】处理命名空间问题（xlink:替换为xlink_）
    const processedXml = closeRqmtsXml.replace(/xlink:/g, 'xlink_')

    const xmlDoc = $.parseXML(processedXml)

    if (!xmlDoc || xmlDoc.documentElement === undefined) {
      throw new Error('XML格式错误，解析失败')
    }

    const $closeRqmts = $(xmlDoc).find('closeRqmts')

    if ($closeRqmts.length === 0) {
      throw new Error('XML中找不到<closeRqmts>元素')
    }

    const obj = {
      hasConditions: false,
      conditions: []
    }

    const $reqCondGroup = $closeRqmts.find('>reqCondGroup')

    // 【v1.1优化】边界处理：兼容缺少reqCondGroup的旧数据
    if ($reqCondGroup.length === 0) {
      console.warn('closeRqmts缺少reqCondGroup元素，自动初始化为无条件')
      return obj
    }

    // 检查是否有 noConds
    if ($reqCondGroup.find('>noConds').length > 0) {
      obj.hasConditions = false
      return obj
    }

    obj.hasConditions = true

    // 解析 reqCondNoRef（无引用）
    $reqCondGroup.find('>reqCondNoRef').each(function() {
      const $elem = $(this)
      const $reqCond = $elem.find('>reqCond')
      if ($reqCond.length > 0) {
        const condXml = getInnerXml($reqCond[0])
        obj.conditions.push({
          type: 1,
          id: $elem.attr('id') || '',
          xml: condXml,
          ref: '',
          refData: null
        })
      }
    })

    // 解析 reqCondDm（DM引用）
    $reqCondGroup.find('>reqCondDm').each(function() {
      const $elem = $(this)
      const $reqCond = $elem.find('>reqCond')
      if ($reqCond.length > 0) {
        const condXml = getInnerXml($reqCond[0])
        const $dmRef = $elem.find('>dmRef')
        let dmc = ''
        let dmRefData = null

        if ($dmRef.length > 0) {
          dmc = extractDmc($dmRef)
          // 【v1.1新增】提取完整的dmRef数据供后续编辑使用
          dmRefData = extractDmRefData($dmRef)
        }

        obj.conditions.push({
          type: 2,
          id: $elem.attr('id') || '',
          xml: condXml,
          ref: dmc,
          refData: dmRefData
        })
      }
    })

    // 解析 reqCondPm（PM引用）
    $reqCondGroup.find('>reqCondPm').each(function() {
      const $elem = $(this)
      const $reqCond = $elem.find('>reqCond')
      if ($reqCond.length > 0) {
        const condXml = getInnerXml($reqCond[0])
        const $pmRef = $elem.find('>pmRef')
        let pmc = ''
        let pmRefData = null

        if ($pmRef.length > 0) {
          pmc = extractPmc($pmRef)
          // 【v1.1新增】提取完整的pmRef数据供后续编辑使用
          pmRefData = extractPmRefData($pmRef)
        }

        obj.conditions.push({
          type: 3,
          id: $elem.attr('id') || '',
          xml: condXml,
          ref: pmc,
          refData: pmRefData
        })
      }
    })

    // 解析 reqCondExternalPub（外部出版物）
    $reqCondGroup.find('>reqCondExternalPub').each(function() {
      const $elem = $(this)
      const $reqCond = $elem.find('>reqCond')
      if ($reqCond.length > 0) {
        const condXml = getInnerXml($reqCond[0])
        obj.conditions.push({
          type: 4,
          id: $elem.attr('id') || '',
          xml: condXml,
          ref: '',
          refData: null
        })
      }
    })

    return obj

  } catch (error) {
    console.error('解析closeRqmts XML失败:', error)
    throw new Error('解析 closeRqmts XML 失败: ' + error.message)
  }
}

/**
 * 对象 → XML 转换
 *
 * @param {Object} Parent - 父对象（保留参数，兼容旧系统）
 * @param {Object} closeRqmtsObj - closeRqmts对象
 * @param {Boolean} closeRqmtsObj.hasConditions - 是否有必要条件
 * @param {Array} closeRqmtsObj.conditions - 条件列表
 * @returns {Promise<String>} closeRqmts XML字符串
 * @throws {Error} 生成XML失败时抛出异常
 */
export async function object2closeRqmts(Parent, closeRqmtsObj) {
  try {
    let xml = '<closeRqmts>\n'
    xml += '  <reqCondGroup>\n'

    if (!closeRqmtsObj.hasConditions) {
      // 无必要条件
      xml += '    <noConds></noConds>\n'
    } else {
      // 有必要条件
      for (const cond of closeRqmtsObj.conditions) {
        // 去除 para 标签（reqCond本身已是段落容器）
        const condContent = cond.xml.replace(/<\/?para>/gi, '').trim()

        const idAttr = cond.id ? ` id="${cond.id}"` : ''

        if (cond.type === 1) {
          // 无引用
          xml += `    <reqCondNoRef${idAttr}>\n`
          xml += '      <reqCond>' + condContent + '</reqCond>\n'
          xml += '    </reqCondNoRef>\n'

        } else if (cond.type === 2) {
          // DM引用
          xml += `    <reqCondDm${idAttr}>\n`
          xml += '      <reqCond>' + condContent + '</reqCond>\n'
          if (cond.refData) {
            xml += '      ' + buildDmRefXml(cond.refData) + '\n'
          }
          xml += '    </reqCondDm>\n'

        } else if (cond.type === 3) {
          // PM引用
          xml += `    <reqCondPm${idAttr}>\n`
          xml += '      <reqCond>' + condContent + '</reqCond>\n'
          if (cond.refData) {
            xml += '      ' + buildPmRefXml(cond.refData) + '\n'
          }
          xml += '    </reqCondPm>\n'

        } else if (cond.type === 4) {
          // 外部出版物
          xml += `    <reqCondExternalPub${idAttr}>\n`
          xml += '      <reqCond>' + condContent + '</reqCond>\n'
          xml += '    </reqCondExternalPub>\n'
        }
      }
    }

    xml += '  </reqCondGroup>\n'
    xml += '</closeRqmts>'

    return xml

  } catch (error) {
    console.error('生成closeRqmts XML失败:', error)
    throw new Error('生成 closeRqmts XML 失败: ' + error.message)
  }
}

// ========== 辅助函数 ==========

/**
 * 获取元素内部XML（兼容IE和现代浏览器）
 * @private
 */
function getInnerXml(element) {
  if ($.browser && $.browser.msie) {
    return element.xml
  } else {
    return $(element).html()
  }
}

/**
 * 从 dmRef XML 中提取 DMC 编号
 * @private
 * @param {jQuery} $dmRef - dmRef元素的jQuery对象
 * @returns {String} DMC编号
 */
function extractDmc($dmRef) {
  const $dmCode = $dmRef.find('dmCode')
  if ($dmCode.length === 0) return ''

  const modelIdentCode = $dmCode.attr('modelIdentCode') || ''
  const systemDiffCode = $dmCode.attr('systemDiffCode') || ''
  const systemCode = $dmCode.attr('systemCode') || ''
  const subSystemCode = $dmCode.attr('subSystemCode') || ''
  const subSubSystemCode = $dmCode.attr('subSubSystemCode') || ''
  const assyCode = $dmCode.attr('assyCode') || ''
  const disassyCode = $dmCode.attr('disassyCode') || ''
  const disassyCodeVariant = $dmCode.attr('disassyCodeVariant') || ''
  const infoCode = $dmCode.attr('infoCode') || ''
  const infoCodeVariant = $dmCode.attr('infoCodeVariant') || ''
  const itemLocationCode = $dmCode.attr('itemLocationCode') || ''

  let dmc = `DMC-${modelIdentCode}-${systemDiffCode}-${systemCode}-${subSystemCode}${subSubSystemCode}-${assyCode}-${disassyCode}${disassyCodeVariant}-${infoCode}${infoCodeVariant}-${itemLocationCode}`

  // 添加 issueInfo
  const $issueInfo = $dmRef.find('issueInfo')
  if ($issueInfo.length > 0) {
    const issueNumber = $issueInfo.attr('issueNumber') || '000'
    const inWork = $issueInfo.attr('inWork') || '00'
    dmc += `_${issueNumber}-${inWork}`
  }

  // 添加 language
  const $language = $dmRef.find('language')
  if ($language.length > 0) {
    const languageIsoCode = $language.attr('languageIsoCode') || 'zh'
    const countryIsoCode = $language.attr('countryIsoCode') || 'CN'
    dmc += `_${languageIsoCode}-${countryIsoCode}`
  }

  return dmc
}

/**
 * 从 pmRef XML 中提取 PMC 编号
 * @private
 * @param {jQuery} $pmRef - pmRef元素的jQuery对象
 * @returns {String} PMC编号
 */
function extractPmc($pmRef) {
  const $pmCode = $pmRef.find('pmCode')
  if ($pmCode.length === 0) return ''

  const modelIdentCode = $pmCode.attr('modelIdentCode') || ''
  const pmIssuer = $pmCode.attr('pmIssuer') || ''
  const pmNumber = $pmCode.attr('pmNumber') || ''
  const pmVolume = $pmCode.attr('pmVolume') || ''

  let pmc = `PMC-${modelIdentCode}-${pmIssuer}-${pmNumber}-${pmVolume}`

  // 添加 issueInfo
  const $issueInfo = $pmRef.find('issueInfo')
  if ($issueInfo.length > 0) {
    const issueNumber = $issueInfo.attr('issueNumber') || '000'
    const inWork = $issueInfo.attr('inWork') || '00'
    pmc += `_${issueNumber}-${inWork}`
  }

  // 添加 language
  const $language = $pmRef.find('language')
  if ($language.length > 0) {
    const languageIsoCode = $language.attr('languageIsoCode') || 'zh'
    const countryIsoCode = $language.attr('countryIsoCode') || 'CN'
    pmc += `_${languageIsoCode}-${countryIsoCode}`
  }

  return pmc
}

/**
 * 【v1.1新增】从 dmRef XML 中提取完整的DM引用数据
 * @private
 * @param {jQuery} $dmRef - dmRef元素的jQuery对象
 * @returns {Object} DM引用数据对象
 */
function extractDmRefData($dmRef) {
  const $dmCode = $dmRef.find('dmCode')
  if ($dmCode.length === 0) return null

  const data = {
    // dmCode属性
    modelIdentCode: $dmCode.attr('modelIdentCode') || '',
    systemDiffCode: $dmCode.attr('systemDiffCode') || '',
    systemCode: $dmCode.attr('systemCode') || '',
    subSystemCode: $dmCode.attr('subSystemCode') || '',
    subSubSystemCode: $dmCode.attr('subSubSystemCode') || '',
    assyCode: $dmCode.attr('assyCode') || '',
    disassyCode: $dmCode.attr('disassyCode') || '',
    disassyCodeVariant: $dmCode.attr('disassyCodeVariant') || '',
    infoCode: $dmCode.attr('infoCode') || '',
    infoCodeVariant: $dmCode.attr('infoCodeVariant') || '',
    itemLocationCode: $dmCode.attr('itemLocationCode') || ''
  }

  // issueInfo
  const $issueInfo = $dmRef.find('issueInfo')
  if ($issueInfo.length > 0) {
    data.issueNumber = $issueInfo.attr('issueNumber') || '000'
    data.inWork = $issueInfo.attr('inWork') || '01'
  }

  // language
  const $language = $dmRef.find('language')
  if ($language.length > 0) {
    data.languageIsoCode = $language.attr('languageIsoCode') || 'zh'
    data.countryIsoCode = $language.attr('countryIsoCode') || 'CN'
  }

  // dmRefAddressItems（可选）
  const $dmTitle = $dmRef.find('dmTitle')
  if ($dmTitle.length > 0) {
    data.techName = $dmTitle.find('techName').text() || ''
    data.infoName = $dmTitle.find('infoName').text() || ''
  }

  const $issueDate = $dmRef.find('issueDate')
  if ($issueDate.length > 0) {
    data.issueYear = $issueDate.attr('year') || ''
    data.issueMonth = $issueDate.attr('month') || ''
    data.issueDay = $issueDate.attr('day') || ''
  }

  // 生成完整DMC
  data.dmc = extractDmc($dmRef)

  // 保存原始 XML，供 buildDmRefXml 优先使用，保证 round-trip 保真
  try {
    data.xml = $dmRef[0].outerHTML || new XMLSerializer().serializeToString($dmRef[0])
  } catch (e) {
    // 若序列化失败，回退使用各字段重建
  }

  return data
}

/**
 * 【v1.1新增】从 pmRef XML 中提取完整的PM引用数据
 * @private
 * @param {jQuery} $pmRef - pmRef元素的jQuery对象
 * @returns {Object} PM引用数据对象
 */
function extractPmRefData($pmRef) {
  const $pmCode = $pmRef.find('pmCode')
  if ($pmCode.length === 0) return null

  const data = {
    // pmCode属性
    modelIdentCode: $pmCode.attr('modelIdentCode') || '',
    pmIssuer: $pmCode.attr('pmIssuer') || '',
    pmNumber: $pmCode.attr('pmNumber') || '',
    pmVolume: $pmCode.attr('pmVolume') || ''
  }

  // issueInfo
  const $issueInfo = $pmRef.find('issueInfo')
  if ($issueInfo.length > 0) {
    data.issueNumber = $issueInfo.attr('issueNumber') || '000'
    data.inWork = $issueInfo.attr('inWork') || '01'
  }

  // language
  const $language = $pmRef.find('language')
  if ($language.length > 0) {
    data.languageIsoCode = $language.attr('languageIsoCode') || 'zh'
    data.countryIsoCode = $language.attr('countryIsoCode') || 'CN'
  }

  // pmRefAddressItems（可选）
  const $pmTitle = $pmRef.find('pmTitle')
  if ($pmTitle.length > 0) {
    data.pmTitle = $pmTitle.text() || ''
  }

  const $issueDate = $pmRef.find('issueDate')
  if ($issueDate.length > 0) {
    data.issueYear = $issueDate.attr('year') || ''
    data.issueMonth = $issueDate.attr('month') || ''
    data.issueDay = $issueDate.attr('day') || ''
  }

  // 生成完整PMC
  data.pmc = extractPmc($pmRef)

  return data
}

/**
 * 【v1.1完整实现】根据 refData 构建 <dmRef> XML
 * @private
 * @param {Object} refData - DM引用数据对象
 * @returns {String} dmRef XML字符串
 * @throws {Error} refData不完整时抛出异常
 */
function buildDmRefXml(refData) {
  // 数据验证
  if (!refData) {
    throw new Error('DM引用数据不完整，缺少必要字段')
  }

  // 优先使用原始 dmRef XML（由 onDmRefInsert 从对话框回调直接保存）
  if (refData.xml) {
    return refData.xml
  }

  if (!refData.modelIdentCode) {
    console.error('DM引用数据不完整:', refData)
    throw new Error('DM引用数据不完整，缺少必要字段')
  }

  // 构建 dmRefAddressItems（可选部分）
  let dmRefAddressItems = ''
  const hasDmTitle = refData.techName || refData.infoName
  const hasIssueDate = refData.issueYear && refData.issueMonth && refData.issueDay

  if (hasDmTitle || hasIssueDate) {
    dmRefAddressItems = '\n  <dmRefAddressItems>'

    if (hasDmTitle) {
      dmRefAddressItems += `
    <dmTitle>
      <techName>${escapeXml(refData.techName || '')}</techName>
      <infoName>${escapeXml(refData.infoName || '')}</infoName>
    </dmTitle>`
    }

    if (hasIssueDate) {
      dmRefAddressItems += `
    <issueDate year="${refData.issueYear}" month="${refData.issueMonth}" day="${refData.issueDay}"/>`
    }

    dmRefAddressItems += '\n  </dmRefAddressItems>'
  }

  // 构建完整的 dmRef XML
  return `<dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
  <dmRefIdent>
    <dmCode modelIdentCode="${refData.modelIdentCode}" systemDiffCode="${refData.systemDiffCode || 'A'}" systemCode="${refData.systemCode || '00'}" subSystemCode="${refData.subSystemCode || '0'}" subSubSystemCode="${refData.subSubSystemCode || '0'}" assyCode="${refData.assyCode || '00'}" disassyCode="${refData.disassyCode || '00'}" disassyCodeVariant="${refData.disassyCodeVariant || 'A'}" infoCode="${refData.infoCode || '000'}" infoCodeVariant="${refData.infoCodeVariant || 'A'}" itemLocationCode="${refData.itemLocationCode || 'A'}"/>
    <issueInfo issueNumber="${refData.issueNumber || '000'}" inWork="${refData.inWork || '01'}"/>
    <language languageIsoCode="${refData.languageIsoCode || 'zh'}" countryIsoCode="${refData.countryIsoCode || 'CN'}"/>${dmRefAddressItems}
  </dmRefIdent>
</dmRef>`
}

/**
 * 【v1.1完整实现】根据 refData 构建 <pmRef> XML
 * @private
 * @param {Object} refData - PM引用数据对象
 * @returns {String} pmRef XML字符串
 * @throws {Error} refData不完整时抛出异常
 */
function buildPmRefXml(refData) {
  // 数据验证
  if (!refData || !refData.modelIdentCode) {
    console.error('PM引用数据不完整:', refData)
    throw new Error('PM引用数据不完整，缺少必要字段')
  }

  // 构建 pmRefAddressItems（可选部分）
  let pmRefAddressItems = ''
  const hasPmTitle = refData.pmTitle
  const hasIssueDate = refData.issueYear && refData.issueMonth && refData.issueDay

  if (hasPmTitle || hasIssueDate) {
    pmRefAddressItems = '\n  <pmRefAddressItems>'

    if (hasPmTitle) {
      pmRefAddressItems += `
    <pmTitle>${escapeXml(refData.pmTitle)}</pmTitle>`
    }

    if (hasIssueDate) {
      pmRefAddressItems += `
    <issueDate year="${refData.issueYear}" month="${refData.issueMonth}" day="${refData.issueDay}"/>`
    }

    pmRefAddressItems += '\n  </pmRefAddressItems>'
  }

  // 构建完整的 pmRef XML
  return `<pmRef>
  <pmRefIdent>
    <pmCode modelIdentCode="${refData.modelIdentCode}" pmIssuer="${refData.pmIssuer || ''}" pmNumber="${refData.pmNumber || '00000'}" pmVolume="${refData.pmVolume || '00'}"/>
    <issueInfo issueNumber="${refData.issueNumber || '000'}" inWork="${refData.inWork || '01'}"/>
    <language languageIsoCode="${refData.languageIsoCode || 'zh'}" countryIsoCode="${refData.countryIsoCode || 'CN'}"/>${pmRefAddressItems}
  </pmRefIdent>
</pmRef>`
}

/**
 * 【v1.1新增】XML特殊字符转义函数（XSS防护）
 * @private
 * @param {String} str - 待转义的字符串
 * @returns {String} 转义后的字符串
 */
function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default {
  closeRqmts2object,
  object2closeRqmts
}
