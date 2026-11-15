/**
 * preliminaryRqmts XML 转换工具
 *
 * 功能:
 * - preliminaryRqmts2object : XML → JavaScript 对象
 * - object2preliminaryRqmts : JavaScript 对象 → XML
 *
 * 依赖: closeRqmtsConverter.js（buildDmRefXml / buildPmRefXml / escapeXml）
 *
 * @author IETM Team
 * @date   2026-11-15
 * @version 2.0
 */

import $ from 'jquery'
import { buildDmRefXml, buildPmRefXml, escapeXml } from './closeRqmtsConverter'

// ═══════════════════════════════════════════════════════
// XML → 对象（解析器）
// ═══════════════════════════════════════════════════════

/**
 * 将 <preliminaryRqmts> XML 字符串解析为 JavaScript 对象
 *
 * @param {Object|null} Parent - 保留参数，兼容旧系统调用约定
 * @param {string}      preliminaryRqmtsXml - 原始 XML 字符串
 * @returns {Promise<Object>} 结构化对象（见返回值说明）
 * @throws {Error} XML 解析失败
 */
export async function preliminaryRqmts2object(Parent, preliminaryRqmtsXml) {
  if (!preliminaryRqmtsXml || preliminaryRqmtsXml.trim() === '') {
    throw new Error('XML内容不能为空')
  }

  try {
    // 1. 移除标签间空白（需求文档 §3.4，避免 jQuery parseXML 报错）
    const stripped = preliminaryRqmtsXml.replace(/>(\s*)</g, '><')

    // 2. 命名空间替换：xlink: → xlink_（需求文档 §3.5，jQuery parseXML 不支持命名空间）
    const processedXml = stripped.replace(/xlink:/g, 'xlink_')

    const xmlDoc = $.parseXML(processedXml)
    const $root  = $(xmlDoc).find('preliminaryRqmts')

    if ($root.length === 0) {
      throw new Error('XML中找不到<preliminaryRqmts>元素')
    }

    const obj = {
      productionData: { tasks: [], zones: [], accesses: [] },
      // 完整的 reqCondGroup XML 片段，由 ReqCondGroupDesigner.loadFromXml() 解析
      reqCondGroupXml: '<reqCondGroup><noConds></noConds></reqCondGroup>',
      reqPersons:  { hasPersons: false, persons: [] },
      reqEquips:   { hasItems: false,   items: []   },
      reqSupplies: { hasItems: false,   items: []   },
      reqSpares:   { hasItems: false,   items: []   },
      reqSafety:   { hasSafety: false,  safetyItems: [] }
    }

    // ── 1. 产品数据 ──────────────────────────────────────
    $root.find('>productionMaintData').each(function() {
      const $pmd = $(this)

      // Tab1: 任务（含 taskDuration 的 productionMaintData）
      $pmd.find('>taskDuration').each(function() {
        const $td = $(this)
        obj.productionData.tasks.push({
          workarea:  $pmd.find('>workArea').text() || '',
          startup:   $td.attr('startupDuration')  || '',
          procedure: $td.attr('procedureDuration') || '',
          closeup:   $td.attr('closeupDuration')   || '',
          uom:       $td.attr('unitOfMeasure')     || '',
          id:        $td.attr('id')                || ''
        })
      })

      // Tab2: 区域
      $pmd.find('>zoneRef').each(function() {
        const $z = $(this)
        const dmList = [], pmList = []
        $z.find('>refs >dmRef').each(function() {
          dmList.push({ dmc: _extractDmc($(this)), xml: _outerXml(this) })
        })
        $z.find('>refs >pmRef').each(function() {
          pmList.push({ pmc: _extractPmc($(this)), xml: _outerXml(this) })
        })
        obj.productionData.zones.push({
          id:    $z.attr('id')         || '',
          no:    $z.attr('zoneNumber') || '',
          name:  $z.find('>name').text() || '',
          dmref: dmList.map(d => d.dmc).join(';'),
          pmref: pmList.map(p => p.pmc).join(';'),
          dm:    dmList,
          pm:    pmList
        })
      })

      // Tab3: 口盖
      $pmd.find('>accessPointRef').each(function() {
        const $a = $(this)
        const dmList = [], pmList = []
        $a.find('>refs >dmRef').each(function() {
          dmList.push({ dmc: _extractDmc($(this)), xml: _outerXml(this) })
        })
        $a.find('>refs >pmRef').each(function() {
          pmList.push({ pmc: _extractPmc($(this)), xml: _outerXml(this) })
        })
        obj.productionData.accesses.push({
          id:    $a.attr('id')               || '',
          no:    $a.attr('accessPointNumber') || '',
          name:  $a.find('>name').text() || '',
          dmref: dmList.map(d => d.dmc).join(';'),
          pmref: pmList.map(p => p.pmc).join(';'),
          dm:    dmList,
          pm:    pmList
        })
      })
    })

    // ── 2. 必要条件（提取完整 XML 片段，交给子组件解析）────
    const $reqCond = $root.find('>reqCondGroup')
    if ($reqCond.length > 0) {
      obj.reqCondGroupXml = _outerXml($reqCond[0])
    }

    // ── 3. 人员需求 ──────────────────────────────────────
    const $reqPersons = $root.find('>reqPersons')
    if ($reqPersons.length > 0) {
      obj.reqPersons.hasPersons = true
      $reqPersons.find('>person').each(function() {
        const $p = $(this)
        obj.reqPersons.persons.push({
          elemname:       'person',
          trade:          $p.find('>personCategory').attr('personCategoryCode') || '',
          skillLevelCode: $p.find('>personSkill').attr('skillLevelCode') || '',
          personqty:      $p.attr('man') || '',
          estimatedTime:  $p.find('>estimatedTime').text() || '',
          unitOfMeasure:  $p.find('>estimatedTime').attr('unitOfMeasure') || '',
          note:           ''
        })
      })
      $reqPersons.find('>personnel').each(function() {
        const $p = $(this)
        obj.reqPersons.persons.push({
          elemname:       'personnel',
          trade:          $p.find('>personCategory').attr('personCategoryCode') || '',
          skillLevelCode: $p.find('>personSkill').attr('skillLevelCode') || '',
          personqty:      $p.attr('numRequired') || '',
          estimatedTime:  $p.find('>estimatedTime').text() || '',
          unitOfMeasure:  $p.find('>estimatedTime').attr('unitOfMeasure') || '',
          note:           ''
        })
      })
    }

    // ── 4-6. 设备 / 耗材 / 备件（结构相同）──────────────
    obj.reqEquips   = _parseEquip($root, 'reqSupportEquips', 'supportEquipDescrGroup', 'supportEquipDescr', 'noSupportEquips')
    obj.reqSupplies = _parseEquip($root, 'reqSupplies',      'supplyDescrGroup',       'supplyDescr',       'noSupplies')
    obj.reqSpares   = _parseEquip($root, 'reqSpares',        'spareDescrGroup',        'spareDescr',        'noSpares')

    // ── 7. 安全条件 ──────────────────────────────────────
    const $reqSafety = $root.find('>reqSafety')
    if ($reqSafety.length > 0 && $reqSafety.find('>noSafety').length === 0) {
      obj.reqSafety.hasSafety = true
      // 同时匹配 warningAndCautionPara 和 notePara（需求文档 §10.2 加载逻辑）
      $reqSafety.find('>safetyRqmts >warning, >safetyRqmts >caution, >safetyRqmts >note').each(function() {
        const type  = this.tagName.toLowerCase()
        const $para = $(this).find(type === 'note' ? '>notePara' : '>warningAndCautionPara')
        obj.reqSafety.safetyItems.push({ type, content: $para.text() || '' })
      })
    }

    return obj

  } catch (error) {
    console.error('解析preliminaryRqmts XML失败:', error)
    throw new Error('解析 preliminaryRqmts XML 失败: ' + error.message)
  }
}

// ═══════════════════════════════════════════════════════
// 对象 → XML（生成器）
// ═══════════════════════════════════════════════════════

/**
 * 将 JavaScript 对象转换为 S1000D <preliminaryRqmts> XML 字符串
 *
 * @param {Object|null} Parent - 保留参数，兼容旧系统
 * @param {Object}      preliminaryRqmtsObj - 结构化对象
 * @returns {Promise<string>} XML 字符串（未格式化，由调用方调用 formateXml 格式化）
 * @throws {Error} 生成失败
 */
export async function object2preliminaryRqmts(Parent, preliminaryRqmtsObj) {
  try {
    let xml = '<preliminaryRqmts>\n'

    // ── 1. 任务（每个任务独立一个 productionMaintData）──
    const tasks = preliminaryRqmtsObj.productionData.tasks || []
    tasks.forEach(task => {
      xml += '  <productionMaintData>\n'
      if (task.workarea) {
        xml += `    <workArea>${escapeXml(task.workarea)}</workArea>\n`
      }
      xml += `    <taskDuration`
      if (task.id)        xml += ` id="${escapeXml(task.id)}"`
      xml += ` unitOfMeasure="${escapeXml(task.uom || '')}"`
      xml += ` startupDuration="${escapeXml(task.startup || '')}"`
      xml += ` procedureDuration="${escapeXml(task.procedure || '')}"`
      xml += ` closeupDuration="${escapeXml(task.closeup || '')}"`
      xml += `></taskDuration>\n`
      xml += '  </productionMaintData>\n'
    })

    // ── 2. 区域 + 口盖（同一个 productionMaintData）────
    const zones    = preliminaryRqmtsObj.productionData.zones    || []
    const accesses = preliminaryRqmtsObj.productionData.accesses || []
    if (zones.length + accesses.length > 0) {
      xml += '  <productionMaintData>\n'

      zones.forEach(zone => {
        xml += `    <zoneRef`
        if (zone.id) xml += ` id="${escapeXml(zone.id)}"`
        if (zone.no) xml += ` zoneNumber="${escapeXml(zone.no)}"`
        xml += '>\n'
        if (zone.name) xml += `      <name>${escapeXml(zone.name)}</name>\n`
        if ((zone.dm && zone.dm.length > 0) || (zone.pm && zone.pm.length > 0)) {
          xml += '      <refs>\n'
          ;(zone.dm || []).forEach(d => { xml += '        ' + (d.xml || buildDmRefXml(d)) + '\n' })
          ;(zone.pm || []).forEach(p => { xml += '        ' + (p.xml || buildPmRefXml(p)) + '\n' })
          xml += '      </refs>\n'
        }
        xml += '    </zoneRef>\n'
      })

      accesses.forEach(access => {
        xml += `    <accessPointRef`
        if (access.id) xml += ` id="${escapeXml(access.id)}"`
        if (access.no) xml += ` accessPointNumber="${escapeXml(access.no)}"`
        xml += '>\n'
        if (access.name) xml += `      <name>${escapeXml(access.name)}</name>\n`
        if ((access.dm && access.dm.length > 0) || (access.pm && access.pm.length > 0)) {
          xml += '      <refs>\n'
          ;(access.dm || []).forEach(d => { xml += '        ' + (d.xml || buildDmRefXml(d)) + '\n' })
          ;(access.pm || []).forEach(p => { xml += '        ' + (p.xml || buildPmRefXml(p)) + '\n' })
          xml += '      </refs>\n'
        }
        xml += '    </accessPointRef>\n'
      })

      xml += '  </productionMaintData>\n'
    }

    // ── 3. 必要条件（由子组件生成，直接插入）────────────
    const reqCondXml = (preliminaryRqmtsObj.reqCondGroupXml || '<reqCondGroup><noConds></noConds></reqCondGroup>').trim()
    xml += '  ' + reqCondXml + '\n'

    // ── 4. 人员需求 ──────────────────────────────────────
    if (preliminaryRqmtsObj.reqPersons && preliminaryRqmtsObj.reqPersons.hasPersons) {
      xml += '  <reqPersons>\n'
      ;(preliminaryRqmtsObj.reqPersons.persons || []).forEach(person => {
        // 跳过空行（note 字段不写入 XML）
        if (!person.trade && !person.skillLevelCode && !person.personqty && !person.estimatedTime) return
        const qty = (person.personqty || '').trim()
        xml += person.elemname === 'person'
          ? `    <person man="${escapeXml(qty)}">\n`
          : `    <personnel numRequired="${escapeXml(qty)}">\n`
        if (person.trade) {
          xml += `      <personCategory personCategoryCode="${escapeXml(person.trade.trim())}"></personCategory>\n`
        }
        if (person.skillLevelCode) {
          xml += `      <personSkill skillLevelCode="${escapeXml(person.skillLevelCode.trim())}"></personSkill>\n`
        }
        if (person.unitOfMeasure) {
          xml += `      <estimatedTime unitOfMeasure="${escapeXml(person.unitOfMeasure.trim())}">${escapeXml((person.estimatedTime || '').trim())}</estimatedTime>\n`
        }
        xml += person.elemname === 'person' ? '    </person>\n' : '    </personnel>\n'
      })
      xml += '  </reqPersons>\n'
    }

    // ── 5-7. 设备 / 耗材 / 备件 ──────────────────────────
    xml += _buildEquipXml(preliminaryRqmtsObj.reqEquips,   'reqSupportEquips', 'supportEquipDescrGroup', 'supportEquipDescr', 'noSupportEquips')
    xml += _buildEquipXml(preliminaryRqmtsObj.reqSupplies, 'reqSupplies',      'supplyDescrGroup',       'supplyDescr',       'noSupplies')
    xml += _buildEquipXml(preliminaryRqmtsObj.reqSpares,   'reqSpares',        'spareDescrGroup',        'spareDescr',        'noSpares')

    // ── 8. 安全条件 ──────────────────────────────────────
    if (preliminaryRqmtsObj.reqSafety && preliminaryRqmtsObj.reqSafety.hasSafety) {
      xml += '  <reqSafety>\n    <safetyRqmts>\n'
      ;(preliminaryRqmtsObj.reqSafety.safetyItems || []).forEach(item => {
        if (!item.type && !item.content) return
        const c = escapeXml(item.content || '')
        if (item.type === 'warning') {
          xml += `      <warning><warningAndCautionPara>${c}</warningAndCautionPara></warning>\n`
        } else if (item.type === 'caution') {
          xml += `      <caution><warningAndCautionPara>${c}</warningAndCautionPara></caution>\n`
        } else if (item.type === 'note') {
          xml += `      <note><notePara>${c}</notePara></note>\n`
        }
      })
      xml += '    </safetyRqmts>\n  </reqSafety>\n'
    } else {
      xml += '  <reqSafety><noSafety></noSafety></reqSafety>\n'
    }

    xml += '</preliminaryRqmts>'
    return xml

  } catch (error) {
    console.error('生成preliminaryRqmts XML失败:', error)
    throw new Error('生成 preliminaryRqmts XML 失败: ' + error.message)
  }
}

// ═══════════════════════════════════════════════════════
// 私有辅助函数
// ═══════════════════════════════════════════════════════

/**
 * 解析设备 / 耗材 / 备件数据（三者结构完全相同，参数化实现）
 * @private
 */
function _parseEquip($root, rootTag, groupTag, itemTag, noTag) {
  const result = { hasItems: false, items: [] }
  const $section = $root.find(`>${rootTag}`)

  // 不存在或存在 noXxx 元素 → 无需求
  if ($section.length === 0 || $section.find(`>${noTag}`).length > 0) {
    return result
  }

  result.hasItems = true
  $section.find(`>${groupTag} >${itemTag}`).each(function() {
    const $i = $(this)
    result.items.push({
      name:             $i.find('>name').text() || '',
      natoStockNumber:  $i.find('>natoStockNumber').text() || '',
      manufacturerCode: $i.find('>identNumber >manufacturerCode').text() || '',
      partNumber:       $i.find('>identNumber >partAndSerialNumber >partNumber').text() || '',
      // serialNumberValue 是属性值
      serialNumber:     $i.find('>identNumber >partAndSerialNumber >serialNumber').attr('serialNumberValue') || '',
      reqQuantity:      $i.find('>reqQuantity').text() || '',
      unitOfMeasure:    $i.find('>reqQuantity').attr('unitOfMeasure') || '',
      // jQuery.text() 自动提取 <simplePara> 内层文本（需求文档 §7.2 说明）
      remarks:          $i.find('>remarks').text() || ''
    })
  })
  return result
}

/**
 * 生成设备 / 耗材 / 备件 XML（三者结构完全相同，参数化实现）
 * @private
 */
function _buildEquipXml(dataObj, rootTag, groupTag, itemTag, emptyTag) {
  if (!dataObj || !dataObj.hasItems) {
    return `  <${rootTag}><${emptyTag}></${emptyTag}></${rootTag}>\n`
  }

  let xml = `  <${rootTag}><${groupTag}>\n`
  ;(dataObj.items || []).forEach(item => {
    // 跳过关键字段全空的行（需求文档 §7.2 保存逻辑）
    if (!item.name && !item.natoStockNumber && !item.reqQuantity && !item.remarks) return

    xml += `    <${itemTag}>\n`
    if (item.name) xml += `      <name>${escapeXml(item.name)}</name>\n`
    if (item.natoStockNumber) {
      xml += `      <natoStockNumber>${escapeXml(item.natoStockNumber)}</natoStockNumber>\n`
    }
    // identNumber 始终输出（即使 manufacturerCode 为空，S1000D 结构要求）
    xml += `      <identNumber><manufacturerCode>${escapeXml(item.manufacturerCode || '')}</manufacturerCode>`
    if (item.partNumber) {
      xml += `<partAndSerialNumber><partNumber>${escapeXml(item.partNumber)}</partNumber>`
      if (item.serialNumber) {
        xml += `<serialNumber serialNumberValue="${escapeXml(item.serialNumber)}" serialNumberForm="single"></serialNumber>`
      }
      xml += `</partAndSerialNumber>`
    }
    xml += `</identNumber>\n`
    const uomAttr = item.unitOfMeasure ? ` unitOfMeasure="${escapeXml(item.unitOfMeasure.trim())}"` : ''
    xml += `      <reqQuantity${uomAttr}>${escapeXml(item.reqQuantity || '')}</reqQuantity>\n`
    if (item.remarks) {
      xml += `      <remarks><simplePara>${escapeXml(item.remarks)}</simplePara></remarks>\n`
    }
    xml += `    </${itemTag}>\n`
  })
  xml += `  </${groupTag}></${rootTag}>\n`
  return xml
}

/**
 * 获取 DOM 元素的 outerHTML（兼容 jQuery DOM 对象）
 * @private
 */
function _outerXml(element) {
  if (!element) return ''
  if (element.outerHTML) return element.outerHTML
  try {
    return new XMLSerializer().serializeToString(element)
  } catch (e) {
    return ''
  }
}

/**
 * 从 jQuery $dmRef 对象提取 DMC 编号
 * @private
 */
function _extractDmc($dmRef) {
  const $c = $dmRef.find('dmCode')
  if (!$c.length) return ''
  const f = a => $c.attr(a) || ''
  return `DMC-${f('modelIdentCode')}-${f('systemDiffCode')}-${f('systemCode')}-${f('subSystemCode')}${f('subSubSystemCode')}-${f('assyCode')}${f('disassyCode')}-${f('disassyCodeVariant')}${f('infoCode')}${f('infoCodeVariant')}-${f('itemLocationCode')}`
}

/**
 * 从 jQuery $pmRef 对象提取 PMC 编号
 * @private
 */
function _extractPmc($pmRef) {
  const $c = $pmRef.find('pmCode')
  if (!$c.length) return ''
  const f = a => $c.attr(a) || ''
  return `PMC-${f('modelIdentCode')}-${f('pmIssuer')}-${f('pmNumber')}-${f('pmVolume')}`
}

export default {
  preliminaryRqmts2object,
  object2preliminaryRqmts
}
