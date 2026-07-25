/**
 * IETM数据模块管理数据字典配置
 * 此文件提供字典代码常量和工具函数
 * 实际字典数据从后端sys_dict表动态加载
 *
 * 对应后端Entity: IetmDataModule.java
 * 更新日期: 2026-07-22
 * 版本: V3.0
 */

// ==================== 字典代码常量 ====================
// 使用这些常量在组件中引用字典，确保字典代码统一
// 注意：字典代码必须与后端 @Dict(dicCode="xxx") 注解中的值完全一致

/**
 * 核心业务字典代码（与后端IetmDataModule实体类@Dict注解对齐）
 *
 * 注意：
 * 1. 信息码(INFO_CODE)不是字典，而是项目级动态数据
 *    通过 /projectinformationcode/ietmProjectInformationCode/list 接口根据projectId查询
 * 2. SNS编码通过后端API自动生成（与ICN模块相同逻辑）
 *    通过 /ietm/datamodule/getProjectInfo 接口根据cmNodeId获取
 */
export const DICT_CODES = {
  // ==== 后端Entity直接使用的字典（9个必需）====
  LOCATION_CODE: 'dm_location_code',             // IETM位置码（A/B/C/D/T）
  RPC_TYPE: 'dm_rpc_type',                       // 责任伙伴公司码
  VERSION_TYPE: 'dm_version_type',               // 版本类型（0=草稿 1=已发布）
  DM_TYPE: 'dm_type',                            // DM类型（描述性/过程性/故障性）
  STATUS: 'dm_status',                           // DM状态（0=删除 1=正常）
  SECURITY_LEVEL: 'security',                    // 密级（0-5）
  LANGUAGE: 'language',                          // 语言代码（ISO 639-1）
  COUNTRY: 'country',                            // 国家代码（ISO 3166-1）
  WORKFLOW_STATUS: 'workflow_status',            // 工作流状态

  // ==== 扩展业务字典（前端功能增强）====
  CHECKOUT_STATUS: 'dm_checkout_status',         // 签出状态
  TECH_NAME_TYPE: 'dm_tech_name_type',           // 技术名称类型
  INFO_NAME_TYPE: 'dm_info_name_type',           // 信息名称类型
  UPDATE_CONTROL: 'dm_update_control',           // 更新控制状态
  APPLICABILITY: 'dm_applicability',             // 应用范围
  PUBLISH_MODE: 'dm_publish_mode',               // 发布模式
  VALIDATE_LEVEL: 'dm_validate_level',           // 校验级别
  COPY_TYPE: 'dm_copy_type',                     // 复制类型（0=仅复制属性 1=创建版本链）
  VERSION_ACTION_TYPE: 'dm_version_action_type', // 版本操作类型（inwork/issue）
  FILE_TYPE: 'dm_file_type',                     // 文件类型
  WORKFLOW_STEP: 'dm_workflow_step',             // 工作流步骤
  REFERENCE_STATUS: 'dm_reference_status',       // 引用状态
  REF_TYPE: 'dm_ref_type'                        // 引用类型（dmRef/dmlRef/pmRef）
}

// ==================== 本地静态字典（不依赖后端） ====================
// 这些字典由S1000D标准定义，不需要动态配置

/**
 * 信息码变体（A-Z）
 * S1000D标准规定的固定值
 */
export const INFO_CODE_VARIANTS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
].map(v => ({ value: v, label: v, text: v }))

/**
 * 学习码事件码（A-Z）
 * 与信息码变体相同
 */
export const LEARN_EVENT_CODES = INFO_CODE_VARIANTS

/**
 * Schema代码（固定值）
 */
export const SCHEMA_CODE = 'J'

/**
 * 是否选项（通用）
 */
export const YES_NO_OPTIONS = [
  { value: '0', label: '否', text: '否', color: 'default' },
  { value: '1', label: '是', text: '是', color: 'green' }
]

// ==================== 工具函数 ====================

/**
 * 从字典数组中根据值获取标签
 * @param {Array} dict 字典数组
 * @param {String} value 值
 * @param {String} defaultLabel 默认标签
 * @returns {String} 标签
 */
export function getDictLabel(dict, value, defaultLabel = '-') {
  if (!dict || !Array.isArray(dict)) return defaultLabel
  const item = dict.find(d => String(d.value) === String(value) || String(d.itemValue) === String(value))
  return item ? (item.label || item.itemText || item.text) : defaultLabel
}

/**
 * 从字典数组中根据值获取字典项
 * @param {Array} dict 字典数组
 * @param {String} value 值
 * @returns {Object} 字典项
 */
export function getDictItem(dict, value) {
  if (!dict || !Array.isArray(dict)) return {}
  return dict.find(d => String(d.value) === String(value) || String(d.itemValue) === String(value)) || {}
}

/**
 * 从字典数组中根据值获取颜色
 * @param {Array} dict 字典数组
 * @param {String} value 值
 * @param {String} defaultColor 默认颜色
 * @returns {String} 颜色值
 */
export function getDictColor(dict, value, defaultColor = 'default') {
  const item = getDictItem(dict, value)
  return item.color || defaultColor
}

/**
 * 从字典数组中根据值获取图标
 * @param {Array} dict 字典数组
 * @param {String} value 值
 * @param {String} defaultIcon 默认图标
 * @returns {String} 图标名称
 */
export function getDictIcon(dict, value, defaultIcon = '') {
  const item = getDictItem(dict, value)
  return item.icon || defaultIcon
}

/**
 * 将后端字典数据格式化为前端下拉选项格式
 * @param {Array} dictItems 后端字典项数组
 * @returns {Array} 格式化后的选项数组
 */
export function formatDictOptions(dictItems) {
  if (!dictItems || !Array.isArray(dictItems)) return []

  return dictItems
    .filter(item => item.status === 1 || item.status === '1') // 过滤启用状态
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))  // 按排序字段排序
    .map(item => ({
      value: item.itemValue || item.value,
      label: item.itemText || item.text || item.label,
      text: item.itemText || item.text || item.label,
      description: item.description,
      // 保留原始数据
      ...item
    }))
}

/**
 * 批量获取字典（用于表单初始化时一次性加载多个字典）
 * @param {Array} dictCodes 字典代码数组
 * @returns {Promise<Object>} 字典对象 { dictCode1: [...], dictCode2: [...] }
 *
 * 使用示例:
 * const dicts = await batchGetDicts(['dm_tech_name_type', 'dm_info_name_type'])
 * console.log(dicts['dm_tech_name_type']) // 技术名称类型选项
 */
export async function batchGetDicts(dictCodes) {
  // 实际实现需要在组件中通过 this.$http 或 import 的方式调用API
  // 这里提供接口定义
  console.warn('batchGetDicts 需要在组件中实现，dictCodes:', dictCodes)
  return {}
}

// ==================== 默认导出 ====================
export default {
  DICT_CODES,
  INFO_CODE_VARIANTS,
  LEARN_EVENT_CODES,
  SCHEMA_CODE,
  YES_NO_OPTIONS,
  getDictLabel,
  getDictItem,
  getDictColor,
  getDictIcon,
  formatDictOptions,
  batchGetDicts
}
