/**
 * CodeMirror Gutter 图标工具
 * 对标旧系统 IetmEditorUtils-src.js makeMarker 函数
 * 用于在源码编辑器行号右侧显示铅笔图标，点击进入设计视图
 */

/**
 * 支持设计视图的元素类型（对标旧系统 designArr）
 * 旧系统支持28种元素，新系统一期仅实现para，保留完整列表以便二期扩展
 */
export const DESIGN_ELEMENTS = [
  'para',
  'levelledPara',
  'warningAndCautionPara',
  'table',
  'figure',
  'multimedia',
  'preliminaryRqmts',
  'mainProcedure',
  'closeRqmts',
  'isolationMainProcedure',
  'illustratedPartsCatalog',
  'isolatedFault',
  'detectedFault',
  'observedFault',
  'correlatedFault',
  'inspectionDefinition',
  'taskDefinition',
  'timeLimitInfo',
  'crewDrill',
  'circuitBreakerRepository',
  'partRepository',
  'zoneRepository',
  'accessPointRepository',
  'toolRepository',
  'enterpriseRepository',
  'supplyRepository',
  'supplyRqmtRepository'
]

/**
 * 父元素黑名单：这些元素的子para不应显示设计图标
 * 对标旧系统 nodesignArr
 */
export const NO_DESIGN_PARENT = [
  'title',
  'warning',
  'caution',
  'note',
  'emphasis'
]

/**
 * 创建gutter图标标记
 * 对标旧系统 makeMarker('design', lineno, elemName)
 *
 * @param {string} elemName - 元素名称（英文）
 * @param {number} lineno - 行号（CodeMirror 0-based）
 * @param {Function} onClick - 点击回调函数（保留参数以兼容旧接口，实际点击由gutterClick事件处理）
 * @param {string} locale - 当前语言（'en' | 'cn'）
 * @param {Object} en2cnElem - 英中元素名映射
 * @returns {HTMLElement} DOM元素
 */
export function makeDesignMarker(elemName, lineno, onClick, locale = 'en', en2cnElem = {}) {
  const marker = document.createElement('div')
  marker.className = 'gutter-design-marker'

  // 获取本地化元素名
  const displayName = locale === 'cn' ? (en2cnElem[elemName] || elemName) : elemName

  // 创建图标链接
  const link = document.createElement('a')
  link.className = 'gutter-design-link'
  link.title = `设计视图【${displayName}】`
  link.href = 'javascript:void(0);'

  // 创建铅笔图标 - 使用Unicode字符（简单可靠）
  const icon = document.createElement('span')
  icon.className = 'gutter-pencil-icon'
  icon.innerHTML = '&#9998;'  // Unicode铅笔字符（HTML实体）

  link.appendChild(icon)
  marker.appendChild(link)

  // P1-2修复：移除click事件监听器（冗余）
  // 点击事件由CodeMirror的gutterClick事件统一处理（见DmSourceView.vue:85-93）
  // 避免重复绑定导致的内存泄漏和事件冲突

  return marker
}

/**
 * 判断元素是否支持设计视图
 *
 * @param {string} elemName - 元素名称（英文）
 * @param {Object} node - 节点对象（包含pid等信息）
 * @param {Array} nodeList - 完整节点列表
 * @returns {boolean}
 */
export function canShowDesignMarker(elemName, node, nodeList = []) {
  // 1. 元素类型必须在支持列表中
  if (!DESIGN_ELEMENTS.includes(elemName)) {
    return false
  }

  // 2. 一期仅支持para元素（二期再扩展其他元素）
  if (elemName !== 'para') {
    return false
  }

  // 3. 检查父元素是否在黑名单中
  if (node && node.pid && nodeList.length > 0) {
    const parent = nodeList.find(n => n.id === node.pid)
    if (parent && NO_DESIGN_PARENT.includes(parent.text)) {
      return false
    }
  }

  return true
}

/**
 * 刷新CodeMirror编辑器的gutter图标
 * 使用独立dmGutter列显示铅笔图标（对标旧系统）
 *
 * @param {Object} cm - CodeMirror实例
 * @param {Array} nodeList - 节点列表（英文名）
 * @param {number} linenoOffset - 行号偏移量
 * @param {Function} onClickMarker - 图标点击回调
 * @param {string} locale - 当前语言
 * @param {Object} en2cnElem - 英中元素名映射
 */
export function refreshGutterMarkers(cm, nodeList, linenoOffset, onClickMarker, locale, en2cnElem) {
  if (!cm || !nodeList || !Array.isArray(nodeList)) return

  // 清除所有现有标记
  cm.clearGutter('dmGutter')

  for (const node of nodeList) {
    if (!node || !node.text || !node.attributes) continue

    const elemName = node.text
    const lineno = node.attributes.lineno

    if (!lineno || lineno < 1) continue

    // 判断是否应该显示设计图标
    if (canShowDesignMarker(elemName, node, nodeList)) {
      const cmLine = lineno + linenoOffset - 2
      if (cmLine >= 0 && cmLine < cm.lineCount()) {
        const marker = makeDesignMarker(elemName, cmLine, null, locale, en2cnElem)

        // 绑定点击事件
        marker.addEventListener('click', () => {
          if (onClickMarker) {
            onClickMarker(cmLine, elemName)
          }
        })

        cm.setGutterMarker(cmLine, 'dmGutter', marker)
      }
    }
  }
}
