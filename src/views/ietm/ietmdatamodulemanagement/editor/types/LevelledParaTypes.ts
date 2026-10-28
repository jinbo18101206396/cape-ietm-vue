/**
 * LevelledParaTypes.ts
 * levelledPara 数据结构 TypeScript 接口定义
 *
 * 核心设计原则：一个节点可以包含多种内容类型（对标旧系统）
 * 每种内容类型都是独立的列表，在同一节点中共存
 */

/** 基础内容元素 */
export interface ContentElement {
  id?: string
  content: string
}

/** 段落类内容（para/warning/caution/note） */
export interface TextContentElement extends ContentElement {
  id: string
  content: string
}

/** 图形类内容（figure/multimedia/table） */
export interface StructuredContentElement extends ContentElement {
  id: string
  xml: string  // 原始XML（保留全部嵌套元素和属性）
}

/** 完整的内容容器（对标旧系统的 row.html） */
export interface LevelledParaContent {
  // 警告（最高优先级）
  warning: TextContentElement[]

  // 注意（中等优先级）
  caution: TextContentElement[]

  // 提醒（中等优先级）
  note: TextContentElement[]

  // 段落（基础内容）
  para: TextContentElement[]

  // 图形（结构化内容）
  figure: StructuredContentElement[]

  // 多媒体（结构化内容）
  multimedia: StructuredContentElement[]

  // 表格（结构化内容）
  table: StructuredContentElement[]
}

/** 树形节点（用于 TreeGrid 显示） */
export interface LevelledParaNode {
  id: string                    // 层级ID（如 '1.1.2'）
  type: 'levelledPara' | 'para' | 'warning' | 'caution' | 'note' | 'figure' | 'multimedia' | 'table'
  title: string                 // 节点标题
  content?: string              // 原始XML内容（序列化用）
  html: LevelledParaContent    // 7种内容类型的完整容器
  children: LevelledParaNode[]  // 子节点数组
}

/** 解析结果 */
export interface ParseResult {
  success: boolean
  data?: LevelledParaNode[]
  error?: string
}

/** 序列化结果 */
export interface SerializeResult {
  success: boolean
  xml?: string
  error?: string
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

/** 编辑操作类型 */
export type EditOperation =
  | 'add-para'
  | 'add-warning'
  | 'add-caution'
  | 'add-note'
  | 'add-figure'
  | 'add-multimedia'
  | 'add-table'
  | 'edit-para'
  | 'delete-para'
  | 'move-para'

export const CONTENT_TYPES = [
  'warning',
  'caution',
  'note',
  'para',
  'figure',
  'multimedia',
  'table'
] as const

export const S1000D_ORDER = {
  warning: 0,
  caution: 1,
  note: 2,
  para: 3,
  figure: 4,
  multimedia: 5,
  table: 6
} as const
