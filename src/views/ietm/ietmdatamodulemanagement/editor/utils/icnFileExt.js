/**
 * ICN 文件后缀白名单
 * 用途：校验用户补入的后缀是否合法
 * 来源：旧系统 avicit/ietm/csdb/ietmicn/js/icnFileExt.js
 * 标准：S1000D 4.0/4.1/4.2
 */

/**
 * 合法的 ICN 文件后缀列表（精确16个）
 * §16.4.3 完整清单
 */
export const ICN_FILE_EXT = [
  // 图像类（栅格）
  '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff',

  // 矢量图
  '.cgm', '.svg',

  // Flash
  '.swf',

  // 音视频
  '.mp3', '.mp4', '.webm', '.ogg',

  // 3D模型
  '.wrl', '.smg'
]

/**
 * 图像类后缀（含矢量图）
 * 用于预览/显示判断
 */
export const IMG_EXT_ARR = ['.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.cgm', '.svg']

/**
 * 视频类后缀
 */
export const VIDEO_EXT_ARR = ['.mp4', '.webm', '.ogg']

/**
 * 音频类后缀
 */
export const AUDIO_EXT_ARR = ['.mp3', '.ogg']

/**
 * Flash类后缀
 */
export const FLASH_ARR = ['.swf']

/**
 * 3D模型类后缀
 */
export const D3_EXT_ARR = ['.wrl', '.smg']

/**
 * 校验后缀是否合法
 * @param {string} ext - 后缀名（必须含前导点，如 '.cgm'）
 * @returns {boolean}
 */
export function isValidIcnExt(ext) {
  if (!ext || typeof ext !== 'string') return false
  return ICN_FILE_EXT.includes(ext.toLowerCase())
}

/**
 * 规整后缀：补前导点 + 转小写
 * @param {string} ext - 原始后缀（可能无前导点、大小写混杂）
 * @returns {string} - 规整后的后缀（如 'CGM' → '.cgm'）
 */
export function normalizeExt(ext) {
  if (!ext) return ''
  const trimmed = ext.trim()
  const lower = trimmed.toLowerCase()
  return lower.startsWith('.') ? lower : '.' + lower
}
