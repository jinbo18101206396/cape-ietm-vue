// editor/utils/schemaDriver.js
// 消费 schema2Designer 产出的约束对象，驱动属性面板 + 可插入元素列表（§12.2/§13.1/§8.4）

/**
 * 构建属性列表（§13.1 toAttrTableHtml 逻辑）。
 */
export function buildAttrList(node, schema, en2cn, locale) {
  if (!node || !schema) return []
  const enName = _resolveEnName(node, en2cn, schema)
  const nodeDef = schema[enName]
  if (!nodeDef || !nodeDef.attrs) return []

  const attrval = _parseAttrval(node.attributes.attrval)
  return Object.entries(nodeDef.attrs).map(([name, enums]) => {
    const setattr = (nodeDef.setattr || {})[name] || []
    const label = (locale === 'cn' && en2cn && en2cn[name]) ? en2cn[name] : name
    const required = setattr.some(s => s === 'use:REQUIRED')
    const pattern = (setattr.find(s => s.startsWith('pttn:')) || '').replace('pttn:', '') || null
    return {
      name, label,
      options: Array.isArray(enums) ? enums : null,
      value: attrval[name] !== undefined ? attrval[name] : '',
      required, pattern,
      _draft: undefined
    }
  })
}

/** 可插入子元素（§8.4/§8.5 右键菜单 + 东区子元素列表） */
export function getAddableChildren(node, schema, nodeList, locale, en2cn) {
  if (!node || !schema) return []
  const enName = _resolveEnName(node, en2cn, schema)
  const def = schema[enName]
  if (!def || !def.children) return []
  const setelem = def.setelem || {}
  const isUnbounded = max => max === String(Number.MAX_SAFE_INTEGER) || max === '9223372036854775807'
  // choice 组成员（ifchoice=true）；契约仅标记"是否在某 choice 内"，不区分多个 choice 组
  const choiceMembers = def.children.filter(cc => setelem[cc] && setelem[cc].ifchoice === 'true')
  // 判断该 choice 是否【可重复】：任一成员 maxocc>1(或 unbounded) → 可重复选择 (a|b|c)*，
  // 此时允许自由混插不同成员（如 description 的 para/warning/caution/note），只受各自 maxocc 约束；
  // 仅当所有成员都 maxocc<=1 时才视为单选 choice (a|b|c)，选中一个后互斥屏蔽其余。
  // 契约无法区分多个 choice 组，故以"存在可重复成员"为整组可重复的近似判据（对 description 类结构正确，
  // 极端多组混合场景可能偏宽松，交由 XSD 校验兜底）。
  const choiceRepeatable = choiceMembers.some(cc => {
    const mx = setelem[cc] && setelem[cc].maxocc
    return isUnbounded(mx) || (mx && Number(mx) > 1)
  })
  const choiceOccupied = !choiceRepeatable && choiceMembers.length > 0 &&
    nodeList.some(n => n.pid === node.id && choiceMembers.includes(_resolveEnName(n, en2cn, schema)))
  return def.children
    .filter(c => {
      const occ = setelem[c]
      if (!occ) return true
      const max = occ.maxocc
      if (max && !isUnbounded(max)) {
        const exist = nodeList.filter(n => n.pid === node.id && _resolveEnName(n, en2cn, schema) === c).length
        if (exist >= Number(max)) return false
      }
      // ifchoice 互斥：仅【单选】choice 生效——同组已有成员时屏蔽其余候选（已选成员自身仍受 maxocc 约束）。
      // 可重复 choice(choiceRepeatable) 不走此分支，成员可自由混插。
      if (occ.ifchoice === 'true' && choiceOccupied) {
        const cExists = nodeList.some(n => n.pid === node.id && _resolveEnName(n, en2cn, schema) === c)
        if (!cExists) return false
      }
      return true
    })
    .map(c => ({ en: c, label: locale === 'cn' && en2cn ? (en2cn[c] || c) : c }))
}

/** 可插入同级元素（东区同级列表） */
export function getAddableSiblings(node, schema, nodeList, locale, en2cn) {
  if (!node || !schema) return []
  const parent = nodeList.find(n => n.id === node.pid)
  if (!parent) return []
  return getAddableChildren(parent, schema, nodeList, locale, en2cn)
}

function _parseAttrval(attrvalStr) {
  if (!attrvalStr || attrvalStr === '[]' || attrvalStr === '{}') return {}
  try { return JSON.parse(attrvalStr) } catch (e) { return {} }
}

/**
 * 解析节点在 schema 中的键名。
 * schema 键可能是英文（S1000D）或中文（GJB6600，XSD 元素名本身即中文）。
 * 策略：① 节点名直接命中 schema → 用它（GJB6600 中文键 / S1000D 英文键）；
 *      ② 否则用 en2cn 反查英文名，且该英文名确实在 schema 中 → 用它（S1000D 中文显示态）；
 *      ③ 都不命中 → 保留原文。
 */
function _resolveEnName(node, en2cn, schema) {
  const text = node.text
  if (schema && schema[text]) return text
  if (en2cn) {
    const found = Object.entries(en2cn).find(([en, cn]) => cn === text)
    if (found && (!schema || schema[found[0]])) return found[0]
  }
  return text
}
