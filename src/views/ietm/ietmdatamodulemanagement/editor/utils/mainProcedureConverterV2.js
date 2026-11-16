/**
 * mainProcedure XML 转换器 V2
 *
 * 功能：
 * 1. XML → TreeData：parseXmlToTree()
 * 2. TreeData → XML：treeToXml()
 * 3. 创建空节点：createEmptyNode()
 *
 * 基于 levelledParaConverterV2.js 改造
 * 适配 proceduralStep 结构
 *
 * @author AI Assistant
 * @date 2026-11-16
 */

import { html2para, para2html } from './paraConverter'

// Parent对象引用（由组件传入）
let Parent = null

/**
 * 设置Parent对象
 * @param {Object} parent - 父组件提供的Parent对象
 */
export function setParent(parent) {
  Parent = parent
}

/**
 * 解析 mainProcedure XML 为树形数据
 * @param {string} xmlString - mainProcedure XML字符串
 * @returns {Array} 树形数据数组（包含根节点）
 * @throws {Error} XML解析失败时抛出错误
 */
export function parseXmlToTree(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    throw new Error('XML字符串为空')
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  // 检查解析错误
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    console.error('[parseXmlToTree] XML解析失败:', parseError.textContent)
    throw new Error(`XML解析失败: ${parseError.textContent}`)
  }

  const mainProcedureElement = doc.querySelector('mainProcedure')
  if (!mainProcedureElement) {
    throw new Error('未找到mainProcedure元素')
  }

  // 创建根节点
  const rootNode = createEmptyNode('0', '-1')
  rootNode.stepno = '《操作步骤》'
  rootNode.children = []

  // 解析一级proceduralStep（只处理mainProcedure的直接子节点）
  const proceduralSteps = Array.from(mainProcedureElement.children).filter(
    child => child.tagName === 'proceduralStep'
  )

  console.log(`[parseXmlToTree] 找到 ${proceduralSteps.length} 个一级步骤`)

  proceduralSteps.forEach((step, index) => {
    const stepId = `${index + 1}`
    const stepNode = parseProceduralStep(step, stepId, '0')
    rootNode.children.push(stepNode)
  })

  return [rootNode]
}

/**
 * 递归解析 proceduralStep 元素
 * @param {Element} stepElement - proceduralStep DOM元素
 * @param {string} stepId - 步骤ID（如"1", "1.1", "1.1.1"）
 * @param {string} parentId - 父步骤ID
 * @returns {Object} 步骤节点对象
 */
function parseProceduralStep(stepElement, stepId, parentId) {
  const node = createEmptyNode(stepId, parentId)
  node.stepno = `步骤${stepId}`

  // 解析标题（直接子节点）
  const titleElement = stepElement.querySelector(':scope > title')
  if (titleElement) {
    node.title = new XMLSerializer().serializeToString(titleElement)
  }

  // 解析内容（warning/caution/para/note/figure/multimedia/table）
  node.html = extractStepContent(stepElement)

  // 递归解析子步骤（只处理直接子节点）
  const childSteps = Array.from(stepElement.children).filter(
    child => child.tagName === 'proceduralStep'
  )

  if (childSteps.length > 0) {
    node.children = []
    childSteps.forEach((childStep, index) => {
      const childId = `${stepId}.${index + 1}`
      const childNode = parseProceduralStep(childStep, childId, stepId)
      node.children.push(childNode)
    })
  }

  return node
}

/**
 * 从proceduralStep元素中提取内容
 * ⚠️ 关键修复：warning/caution/note需要从外层标签提取内层元素
 *
 * @param {Element} stepElement - proceduralStep DOM元素
 * @returns {Object} 内容对象 { warning, caution, para, note, figure, multimedia, table }
 */
function extractStepContent(stepElement) {
  const content = {
    warning: [],
    caution: [],
    para: [],
    note: [],
    figure: [],
    multimedia: [],
    table: []
  }

  // 🔑 P0修复1：提取warning - 从 <warning> 中提取 <warningAndCautionPara>
  const warnings = stepElement.querySelectorAll(':scope > warning')
  warnings.forEach((warning) => {
    const paras = warning.querySelectorAll('warningAndCautionPara')
    paras.forEach((para) => {
      content.warning.push({
        content: para.innerHTML,  // 内部HTML内容
        id: para.getAttribute('id') || ''
      })
    })
  })

  // 🔑 P0修复2：提取caution - 从 <caution> 中提取 <warningAndCautionPara>
  const cautions = stepElement.querySelectorAll(':scope > caution')
  cautions.forEach((caution) => {
    const paras = caution.querySelectorAll('warningAndCautionPara')
    paras.forEach((para) => {
      content.caution.push({
        content: para.innerHTML,
        id: para.getAttribute('id') || ''
      })
    })
  })

  // 🔑 P0修复3：提取note - 从 <note> 中提取 <notePara>
  const notes = stepElement.querySelectorAll(':scope > note')
  notes.forEach((note) => {
    const paras = note.querySelectorAll('notePara')
    paras.forEach((para) => {
      content.note.push({
        content: para.innerHTML,
        id: para.getAttribute('id') || ''
      })
    })
  })

  // 提取para - 直接提取
  const paras = stepElement.querySelectorAll(':scope > para')
  paras.forEach((para) => {
    content.para.push({
      content: para.innerHTML,
      id: para.getAttribute('id') || ''
    })
  })

  // 提取figure
  const figures = stepElement.querySelectorAll(':scope > figure')
  figures.forEach((figure) => {
    const titleElement = figure.querySelector('title')
    content.figure.push({
      xml: new XMLSerializer().serializeToString(figure),
      title: titleElement ? titleElement.textContent : '无标题',
      id: figure.getAttribute('id') || ''
    })
  })

  // 提取multimedia
  const multimedias = stepElement.querySelectorAll(':scope > multimedia')
  multimedias.forEach((multimedia) => {
    const titleElement = multimedia.querySelector('title')
    content.multimedia.push({
      xml: new XMLSerializer().serializeToString(multimedia),
      title: titleElement ? titleElement.textContent : '无标题',
      id: multimedia.getAttribute('id') || ''
    })
  })

  // 提取table
  const tables = stepElement.querySelectorAll(':scope > table')
  tables.forEach((table) => {
    const titleElement = table.querySelector('title')
    content.table.push({
      xml: new XMLSerializer().serializeToString(table),
      title: titleElement ? titleElement.textContent : '无标题',
      id: table.getAttribute('id') || ''
    })
  })

  // 🔑 关键：转换为JSON字符串（与LevelledPara保持一致）
  // 空数组返回空字符串，方便后续判断
  return {
    warning: content.warning.length > 0 ? JSON.stringify(content.warning) : '',
    caution: content.caution.length > 0 ? JSON.stringify(content.caution) : '',
    para: content.para.length > 0 ? JSON.stringify(content.para) : '',
    note: content.note.length > 0 ? JSON.stringify(content.note) : '',
    figure: content.figure.length > 0 ? JSON.stringify(content.figure) : '',
    multimedia: content.multimedia.length > 0 ? JSON.stringify(content.multimedia) : '',
    table: content.table.length > 0 ? JSON.stringify(content.table) : ''
  }
}

/**
 * 树形数据转换为 mainProcedure XML
 * @param {Array} treeData - 树形数据数组（包含根节点）
 * @param {Object} options - 选项 { locale, indent }
 * @returns {string} XML字符串
 */
export async function treeToXml(treeData, options = {}) {
  const { locale = 'en', indent = 0 } = options

  if (!treeData || treeData.length === 0) {
    console.warn('[treeToXml] 树形数据为空')
    return '<mainProcedure></mainProcedure>'
  }

  const rootNode = treeData[0]
  let xml = '<mainProcedure>'

  // 遍历一级步骤
  if (rootNode.children && rootNode.children.length > 0) {
    for (const child of rootNode.children) {
      xml += await generateProceduralStepXml(child, indent + 2)
    }
  }

  xml += '\n</mainProcedure>'

  return xml
}

/**
 * 递归生成 proceduralStep XML
 * ⚠️ 关键：严格按照S1000D标准顺序生成
 * 顺序：title → warning → caution → note → para → figure → multimedia → table → 子步骤
 *
 * @param {Object} node - 步骤节点
 * @param {number} indent - 缩进量
 * @returns {Promise<string>} XML字符串
 */
async function generateProceduralStepXml(node, indent) {
  const indentStr = ' '.repeat(indent)
  let xml = `\n${indentStr}<proceduralStep>`

  // 1. 生成标题
  if (node.title) {
    xml += `\n${indentStr}  ${node.title}`
  }

  // 生成内容（严格按顺序）
  if (node.html) {
    // 2. 生成warning（特殊包装：warning > warningAndCautionPara）
    if (node.html.warning) {
      try {
        const warnings = JSON.parse(node.html.warning)
        for (const w of warnings) {
          // HTML → XML转换（html2para 是 async 函数，必须 await）
          const warningXml = await html2para(Parent, w.content, Parent && Parent.projectParameters)
          // 🔑 关键：提取<para>内部内容，包装成<warningAndCautionPara>
          const innerContent = warningXml
            .replace(/<para[^>]*>/g, '')
            .replace(/<\/para>/g, '')

          xml += `\n${indentStr}  <warning>`
          xml += `\n${indentStr}    <warningAndCautionPara${w.id ? ` id="${w.id}"` : ''}>${innerContent}</warningAndCautionPara>`
          xml += `\n${indentStr}  </warning>`
        }
      } catch (e) {
        console.error('[generateProceduralStepXml] warning解析失败:', e)
      }
    }

    // 3. 生成caution（特殊包装：caution > warningAndCautionPara）
    if (node.html.caution) {
      try {
        const cautions = JSON.parse(node.html.caution)
        for (const c of cautions) {
          const cautionXml = await html2para(Parent, c.content, Parent && Parent.projectParameters)
          const innerContent = cautionXml
            .replace(/<para[^>]*>/g, '')
            .replace(/<\/para>/g, '')

          xml += `\n${indentStr}  <caution>`
          xml += `\n${indentStr}    <warningAndCautionPara${c.id ? ` id="${c.id}"` : ''}>${innerContent}</warningAndCautionPara>`
          xml += `\n${indentStr}  </caution>`
        }
      } catch (e) {
        console.error('[generateProceduralStepXml] caution解析失败:', e)
      }
    }

    // 4. 生成note（特殊包装：note > notePara）
    if (node.html.note) {
      try {
        const notes = JSON.parse(node.html.note)
        for (const n of notes) {
          const noteXml = await html2para(Parent, n.content, Parent && Parent.projectParameters)
          const innerContent = noteXml
            .replace(/<para[^>]*>/g, '')
            .replace(/<\/para>/g, '')

          xml += `\n${indentStr}  <note>`
          xml += `\n${indentStr}    <notePara${n.id ? ` id="${n.id}"` : ''}>${innerContent}</notePara>`
          xml += `\n${indentStr}  </note>`
        }
      } catch (e) {
        console.error('[generateProceduralStepXml] note解析失败:', e)
      }
    }

    // 5. 生成para（html2para返回内层内容，调用方负责包裹<para>标签）
    if (node.html.para) {
      try {
        const paras = JSON.parse(node.html.para)
        for (const p of paras) {
          // html2para 剥离外层<p>后返回内层内容，不含<para>包装
          const innerContent = await html2para(Parent, p.content, Parent && Parent.projectParameters)
          xml += `\n${indentStr}  <para${p.id ? ` id="${p.id}"` : ''}>${innerContent}</para>`
        }
      } catch (e) {
        console.error('[generateProceduralStepXml] para解析失败:', e)
      }
    }

    // 6. 生成figure（直接使用XML）
    if (node.html.figure) {
      try {
        const figures = JSON.parse(node.html.figure)
        figures.forEach((f) => {
          let figureXml = f.xml
          // 🔑 P0修复：恢复xlink命名空间
          figureXml = figureXml.replace(/xlink_/g, 'xlink:')
          // 注入ID属性
          if (f.id && !figureXml.includes(' id=')) {
            figureXml = figureXml.replace('<figure', `<figure id="${f.id}"`)
          }
          xml += `\n${indentStr}  ${figureXml}`
        })
      } catch (e) {
        console.error('[generateProceduralStepXml] figure解析失败:', e)
      }
    }

    // 7. 生成multimedia（直接使用XML）
    if (node.html.multimedia) {
      try {
        const multimedias = JSON.parse(node.html.multimedia)
        multimedias.forEach((m) => {
          let multimediaXml = m.xml
          // 🔑 P0修复：恢复xlink命名空间
          multimediaXml = multimediaXml.replace(/xlink_/g, 'xlink:')
          // 注入ID属性
          if (m.id && !multimediaXml.includes(' id=')) {
            multimediaXml = multimediaXml.replace('<multimedia', `<multimedia id="${m.id}"`)
          }
          xml += `\n${indentStr}  ${multimediaXml}`
        })
      } catch (e) {
        console.error('[generateProceduralStepXml] multimedia解析失败:', e)
      }
    }

    // 8. 生成table（直接使用XML）
    if (node.html.table) {
      try {
        const tables = JSON.parse(node.html.table)
        tables.forEach((t) => {
          let tableXml = t.xml
          // 注入ID属性
          if (t.id && !tableXml.includes(' id=')) {
            tableXml = tableXml.replace('<table', `<table id="${t.id}"`)
          }
          xml += `\n${indentStr}  ${tableXml}`
        })
      } catch (e) {
        console.error('[generateProceduralStepXml] table解析失败:', e)
      }
    }
  }

  // 9. 递归生成子步骤
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      xml += await generateProceduralStepXml(child, indent + 2)
    }
  }

  xml += `\n${indentStr}</proceduralStep>`
  return xml
}

/**
 * 创建空节点
 * @param {string} id - 节点ID
 * @param {string} parentId - 父节点ID
 * @returns {Object} 空节点对象
 */
export function createEmptyNode(id, parentId) {
  return {
    id,
    _parentId: parentId,
    stepno: `步骤${id}`,
    title: '',
    content: '',
    line: '',
    html: {
      warning: '',
      caution: '',
      para: '',
      note: '',
      figure: '',
      multimedia: '',
      table: ''
    },
    children: undefined  // undefined表示未展开，[]表示无子节点
  }
}

/**
 * 创建空HTML内容对象
 * @returns {Object} 空内容对象
 */
export function createEmptyHtmlContent() {
  return {
    warning: '',
    caution: '',
    para: '',
    note: '',
    figure: '',
    multimedia: '',
    table: ''
  }
}

/**
 * 验证树形数据结构
 * @param {Array} treeData - 树形数据
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTree(treeData) {
  const errors = []

  if (!Array.isArray(treeData)) {
    errors.push('树形数据必须是数组')
    return { valid: false, errors }
  }

  if (treeData.length === 0) {
    errors.push('树形数据为空')
    return { valid: false, errors }
  }

  const rootNode = treeData[0]
  if (!rootNode || rootNode.id !== '0') {
    errors.push('缺少根节点或根节点ID不是"0"')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 重新生成节点ID（用于修复ID错乱）
 * @param {Array} treeData - 树形数据
 * @returns {Array} 修复后的树形数据
 */
export function regenerateIds(treeData) {
  if (!treeData || treeData.length === 0) return treeData

  const rootNode = treeData[0]

  function regenerateNodeIds(node, parentId, indexInParent) {
    const newId = parentId === '-1' ? '0' :
                  parentId === '0' ? `${indexInParent + 1}` :
                  `${parentId}.${indexInParent + 1}`

    node.id = newId
    node._parentId = parentId
    node.stepno = newId === '0' ? '《操作步骤》' : `步骤${newId}`

    if (node.children && node.children.length > 0) {
      node.children.forEach((child, index) => {
        regenerateNodeIds(child, newId, index)
      })
    }
  }

  regenerateNodeIds(rootNode, '-1', 0)

  return treeData
}
