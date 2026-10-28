/**
 * Multimedia设计器 - XML与对象转换工具
 * 对标：figureConverter.js
 * 功能：XML ↔ Object双向转换、数据验证、multimediaType自动检测、中英文转换
 */

import $ from 'jquery'

/**
 * XML → Object（加载设计视图时调用）
 * @param {Object} editor - CodeMirror实例（未使用，保持与figureConverter签名一致）
 * @param {String} multimediaXml - multimedia元素的完整XML字符串
 * @returns {Promise<Object>} 解析后的对象
 */
export async function multimedia2object(editor, multimediaXml) {
  return new Promise((resolve, reject) => {
    try {
      if (!multimediaXml || multimediaXml.trim().length === 0) {
        reject(new Error('XML内容不能为空'))
        return
      }

      // 关键修复：在解析前检查并注入缺失的xlink命名空间声明
      // 旧数据可能没有xmlns:xlink声明，导致"Attribute xlink:type prefix is unbound"错误
      if (multimediaXml.includes('xlink:') && !multimediaXml.includes('xmlns:xlink')) {
        multimediaXml = multimediaXml.replace(
          /(<multimedia[^>]*?)(>)/,
          '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2'
        )
      }

      // 解析XML
      const xml = $($.parseXML(multimediaXml))
      const $multimedia = xml.find('multimedia')

      if ($multimedia.length === 0) {
        reject(new Error('未找到<multimedia>元素'))
        return
      }

      // 提取基本属性
      const multimediaObj = {
        title: '',
        id: $multimedia.attr('id') || '',
        multimediaObjects: []
      }

      // 提取title（必填）
      const $title = $multimedia.find('> title')
      if ($title.length === 0) {
        reject(new Error('Multimedia标题(title)不能为空'))
        return
      }
      multimediaObj.title = $title.text().trim()

      // 提取所有multimediaObject元素
      $multimedia.find('> multimediaObject').each(function(i, n) {
        const $obj = $(n)

        const multimediaObject = {
          icn: $obj.attr('infoEntityIdent') || '',
          filename: '',  // 从ICN查询获取
          multimediaType: $obj.attr('multimediaType') || ''
          // 注意：根据S1000D 4.0标准，multimediaObject不支持hotspot子元素
          // hotspot是graphic元素的子元素，不是multimediaObject的子元素
        }

        multimediaObj.multimediaObjects.push(multimediaObject)
      })

      resolve(multimediaObj)
    } catch (error) {
      reject(new Error('XML解析失败: ' + error.message))
    }
  })
}

/**
 * Object → XML（保存时调用）
 * @param {Object} editor - CodeMirror实例（未使用）
 * @param {Object} multimediaObj - 设计视图的数据对象
 * @returns {Promise<String>} 生成的XML字符串
 */
export async function object2multimedia(editor, multimediaObj) {
  return new Promise((resolve, reject) => {
    try {
      if (!multimediaObj) {
        reject(new Error('multimediaObj不能为空'))
        return
      }

      let xml = '<multimedia'

      // 声明xlink命名空间
      xml += ' xmlns:xlink="http://www.w3.org/1999/xlink"'

      // 添加id属性
      if (multimediaObj.id && multimediaObj.id.trim()) {
        xml += ` id="${escapeXml(multimediaObj.id)}"`
      }

      xml += '>\n'

      // 添加title（必填）
      xml += `<title>${escapeXml(multimediaObj.title)}</title>\n`

      // 添加multimediaObject元素
      if (multimediaObj.multimediaObjects && multimediaObj.multimediaObjects.length > 0) {
        for (const obj of multimediaObj.multimediaObjects) {
          xml += '<multimediaObject'
          xml += ' xlink:type="simple"'
          xml += ' xlink:show="replace"'
          xml += ' xlink:actuate="onRequest"'
          xml += ` infoEntityIdent="${escapeXml(obj.icn)}"`

          // 添加multimediaType属性（S1000D 4.0 必填）
          let multimediaType = obj.multimediaType
          if (!multimediaType && obj.filename) {
            multimediaType = detectMultimediaType(obj.filename)
          }
          // 如果仍然为空，使用默认值 "other"（符合 S1000D 4.0 标准）
          if (!multimediaType) {
            multimediaType = 'other'
          }
          xml += ` multimediaType="${escapeXml(multimediaType)}"`

          // 注意：根据S1000D 4.0标准，multimediaObject不支持hotspot子元素
          // 如果需要热点功能，应使用<figure>+<graphic>元素
          xml += '/>\n'
        }
      }

      xml += '</multimedia>'

      resolve(xml)
    } catch (error) {
      reject(new Error('XML生成失败: ' + error.message))
    }
  })
}

/**
 * 验证multimedia数据
 * @param {Object} multimediaObj - 要验证的对象
 * @returns {Object} { valid: Boolean, errors: Array<String> }
 */
export function validateMultimedia(multimediaObj) {
  const errors = []

  if (!multimediaObj) {
    errors.push('multimediaObj不能为空')
    return { valid: false, errors }
  }

  // 标题验证
  if (!multimediaObj.title || multimediaObj.title.trim().length === 0) {
    errors.push('Multimedia标题必填')
  }
  if (multimediaObj.title && multimediaObj.title.length > 200) {
    errors.push('Multimedia标题长度不能超过200个字符')
  }

  // 多媒体对象验证
  if (!multimediaObj.multimediaObjects || multimediaObj.multimediaObjects.length === 0) {
    errors.push('至少需要添加一个多媒体对象')
  } else {
    for (let i = 0; i < multimediaObj.multimediaObjects.length; i++) {
      const obj = multimediaObj.multimediaObjects[i]

      // icn必填
      if (!obj.icn || obj.icn.trim().length === 0) {
        errors.push(`第${i + 1}个多媒体对象的ICN编码不能为空`)
      }

      // 注意：根据S1000D 4.0标准，multimediaObject不支持hotspot
      // hotspot验证已移除
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  }
}

/**
 * 自动检测multimediaType（根据文件扩展名）
 * @param {String} filename - 文件名（如ICN-VIDEO-001.mp4）
 * @returns {String} multimediaType值（'video' | 'audio' | '3D' | 'other'，符合S1000D 4.0标准）
 */
export function detectMultimediaType(filename) {
  if (!filename) return 'other'

  const ext = filename.substr(filename.lastIndexOf('.')).toLowerCase()

  // 视频格式 → multimediaType="video"
  const videoExtArr = ['.avi', '.wmv', '.mp4', '.mov', '.rm', '.mpg', '.webm']
  if (videoExtArr.includes(ext)) {
    return 'video'
  }

  // 音频格式 → multimediaType="audio"（符合S1000D 4.0标准）
  const audioExtArr = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.wma']
  if (audioExtArr.includes(ext)) {
    return 'audio'
  }

  // 3D模型格式 → multimediaType="3D"
  const d3extArr = ['.wrl', '.smg', '.swf']
  if (d3extArr.includes(ext)) {
    return '3D'
  }

  // 图像格式（CGM等） → multimediaType="other"
  const imgextArr = ['.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.cgm', '.svg']
  if (imgextArr.includes(ext)) {
    return 'other'
  }

  // 未知格式 → multimediaType="other"（符合S1000D 4.0标准）
  return 'other'
}

/**
 * 中英文标签转换：英文 → 中文
 * @param {String} enXml - 英文XML
 * @returns {String} 中文XML
 */
export function toCnMultimediaXml(enXml) {
  const cnTagMap = {
    '<multimedia': '<多媒体',
    '</multimedia>': '</多媒体>',
    '<title': '<标题',
    '</title>': '</标题>',
    '<multimediaObject': '<多媒体对象',
    '</multimediaObject>': '</多媒体对象>',
    '<hotspot': '<热点',
    '</hotspot>': '</热点>',
    'infoEntityIdent': '信息实体标识',
    'multimediaType': '多媒体类型',
    'applicationStructureIdent': '应用结构标识',
    'applicationStructureName': '应用结构名称'
  }

  let result = enXml
  for (const [en, cn] of Object.entries(cnTagMap)) {
    const escapedEn = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escapedEn, 'g'), cn)
  }
  return result
}

/**
 * 中英文标签转换：中文 → 英文
 * @param {String} cnXml - 中文XML
 * @returns {String} 英文XML
 */
export function toEnMultimediaXml(cnXml) {
  const enTagMap = {
    '<多媒体': '<multimedia',
    '</多媒体>': '</multimedia>',
    '<标题': '<title',
    '</标题>': '</title>',
    '<多媒体对象': '<multimediaObject',
    '</多媒体对象>': '</multimediaObject>',
    '<热点': '<hotspot',
    '</热点>': '</hotspot>',
    '信息实体标识': 'infoEntityIdent',
    '多媒体类型': 'multimediaType',
    '应用结构标识': 'applicationStructureIdent',
    '应用结构名称': 'applicationStructureName'
  }

  let result = cnXml
  for (const [cn, en] of Object.entries(enTagMap)) {
    const escapedCn = cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escapedCn, 'g'), en)
  }
  return result
}

/**
 * XML特殊字符转义
 * @param {String} text - 原始文本
 * @returns {String} 转义后的文本
 */
function escapeXml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
