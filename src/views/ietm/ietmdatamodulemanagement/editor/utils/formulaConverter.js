/**
 * 公式转换工具库
 * 处理公式的HTML↔XML转换、保存、回显等操作
 *
 * @author Claude
 * @since 2026-10-13
 */

/**
 * 检查是否为公式图片标签
 * @param {String} html HTML字符串
 * @returns {Boolean}
 */
export function isFormulaImage(html) {
  if (!html) return false
  return /<img[^>]*class="kfformula"[^>]*\/>/.test(html) ||
         /<img[^>]*class="kfformula"[^>]*><\/img>/.test(html)
}

/**
 * 从HTML中提取所有公式图片
 * @param {String} html HTML内容
 * @returns {Array} 公式图片标签数组
 */
export function extractFormulaImages(html) {
  if (!html) return []

  const formulaPattern = /<img[^>]*class="kfformula"[^>]*\/>/g
  return html.match(formulaPattern) || []
}

/**
 * 从公式HTML中提取LaTeX代码
 * @param {String} formulaHtml 公式HTML
 * @returns {String} LaTeX代码
 */
export function extractLatexFromFormula(formulaHtml) {
  if (!formulaHtml) return ''

  try {
    const match = formulaHtml.match(/data-latex="([^"]+)"/)
    if (match && match[1]) {
      return decodeURIComponent(match[1])
    }
  } catch (error) {
    console.error('提取LaTeX代码失败', error)
  }

  return ''
}

/**
 * 从公式HTML中提取Base64图片
 * @param {String} formulaHtml 公式HTML
 * @returns {String} Base64图片数据
 */
export function extractBase64FromFormula(formulaHtml) {
  if (!formulaHtml) return ''

  try {
    const match = formulaHtml.match(/src="(data:image\/png;base64,[^"]+)"/)
    if (match && match[1]) {
      return match[1]
    }
  } catch (error) {
    console.error('提取Base64图片失败', error)
  }

  return ''
}

/**
 * 提取图片尺寸信息
 * @param {String} base64Data Base64图片数据
 * @returns {Promise} {width, height}
 */
export function extractImageDimensions(base64Data) {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }
      img.onerror = () => {
        resolve({ width: 120, height: 40 })
      }
      img.src = base64Data
    } catch (error) {
      console.error('提取图片尺寸失败', error)
      resolve({ width: 120, height: 40 })
    }
  })
}

/**
 * 将公式HTML转换为XML symbol标签
 * @param {String} formulaHtml 公式HTML
 * @param {String} icn ICN编码
 * @param {Number} imageWidth 图片宽度
 * @param {Number} imageHeight 图片高度
 * @returns {String} XML symbol标签
 */
export function formulaHtmlToXmlSymbol(formulaHtml, icn, imageWidth, imageHeight) {
  if (!formulaHtml || !icn) {
    console.error('参数不完整')
    return ''
  }

  return `<symbol infoEntityIdent="${icn}" reproductionWidth="${imageWidth}" reproductionHeight="${imageHeight}" reproductionScale="100"></symbol>`
}

/**
 * 提取DM编码中的SNS
 * @param {String} dmCode DM编码（格式: DMC-A-B-C-D-E-F-G-...）
 * @returns {String} SNS
 */
export function extractSnsFromDmCode(dmCode) {
  try {
    const parts = dmCode.split('-')
    if (parts.length < 8) {
      throw new Error('DM编码格式不正确')
    }
    return parts.slice(1, 7).join('-')
  } catch (error) {
    console.error('提取SNS失败', error)
    return ''
  }
}

/**
 * 生成ICN编码
 * 格式: ICN-{SNS}-{RPC}-{originator}-{uniqueId}-A-001-01 (10段)
 * 与旧系统保持一致（IetmEditorDesignerPara.js:264）
 *
 * @param {String} dmCode DM编码（格式: DMC-A-B-C-D-E-...）
 * @param {String} rpc RPC代码（如 00017）
 * @param {String} originator 发起者代码（如 A）
 * @param {Number} uniqueId 唯一ID（如 4778）
 * @returns {String} ICN编码
 */
export function generateIcnCode(dmCode, rpc, originator, uniqueId) {
  try {
    // 从DM编码中提取SNS
    const parts = dmCode.split('-')
    if (parts.length < 6) {
      throw new Error('DM编码格式不正确')
    }

    // SNS 3段（与旧系统保持一致）
    // parts[3]+parts[4]+parts[5] 直接拼接（只有part[4]和part[5]需补零）
    const sns1 = parts[1]  // modelIdentCode (ZBBM02)
    const sns2 = parts[2]  // systemDiffCode (A)
    const sns3 = parts[3] + parts[4].padStart(2, '0') + parts[5].padStart(2, '0')  // 直接拼接A+11+000

    // 格式化uniqueId为5位数字
    const uniqueIdStr = String(uniqueId).padStart(5, '0')

    // 生成ICN编码（10段）
    // ICN-{sns 3段}-{originator}-{rpc}-{uniqueId}-A-001-01
    return `ICN-${sns1}-${sns2}-${sns3}-${originator}-${rpc}-${uniqueIdStr}-A-001-01`
  } catch (error) {
    console.error('生成ICN编码失败', error)
    throw error
  }
}

export default {
  isFormulaImage,
  extractFormulaImages,
  extractLatexFromFormula,
  extractBase64FromFormula,
  extractImageDimensions,
  formulaHtmlToXmlSymbol,
  extractSnsFromDmCode,
  generateIcnCode
}
