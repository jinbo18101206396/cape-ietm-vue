/**
 * Para设计器转换工具
 * 实现XML↔HTML双向转换，覆盖9类元素
 */

import { axios } from '@/utils/request'
import { getDmcByText } from './refsBuilder'  // 🔧 2026-10-10 使用本地DMC解析函数

// ========== 常量定义 ==========

/**
 * 🔧 2026-10-10 P0-3修复: 使用Unicode私有区字符作为占位符
 * 这些字符在标准文本中基本不会出现，极大降低冲突风险
 * - U+E000-U+F8FF: 私有区 (共6400个字符)
 * - 选用: U+E001 (LF), U+E002 (CR)
 * 优于__LF__/__CR__文本标记（后者可能与用户输入冲突）
 */
const PLACEHOLDER_LF = ''  // 换行符占位符
const PLACEHOLDER_CR = ''  // 回车符占位符

// ========== 无序列表符号映射 ==========
// UEditor的list-style-type(CSS) ↔ S1000D的randomList@listItemPrefix(descript.xsd)
// 映射依据渲染层 S1000D40/xsl/lists.xsl：pf02=实心点 pf05=空心圆圈 pf06=方块
const LISTSTYLE_TO_PF = {
  disc: 'pf02',
  circle: 'pf05',
  square: 'pf06'
}
const PF_TO_LISTSTYLE = {
  pf02: 'disc',
  pf05: 'circle',
  pf06: 'square'
}

// ========== XSS防护工具函数 ==========

/**
 * 🔧 修复P1-6: XML属性XSS防护
 * 对XML字符串进行安全编码，防止XSS攻击
 * @param {String} xml - 原始XML字符串
 * @returns {String} - 安全编码后的XML字符串
 */
export function escapeXmlForAttribute(xml) {
  if (!xml) return ''

  // 🔧 2026-11-10 调试：统计输入的换行符数量
  const inputNewlines = (xml.match(/\n/g) || []).length
  console.log('[escapeXmlForAttribute] 输入换行符数量:', inputNewlines)
  console.log('[escapeXmlForAttribute] 输入前100字符:', xml.substring(0, 100))

  // 🔧 2026-11-10 修复：使用更安全的转义序列，防止UEditor删除
  // 策略：使用&#xA;（十六进制）代替&#10;（十进制），某些编辑器对十六进制更友好
  // 如果还不行，则使用自定义占位符（类似URL编码）
  const result = xml
    .replace(/&/g, '&amp;')   // & 必须最先替换
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')  // 防止属性值闭合
    .replace(/'/g, '&#39;')   // 防止单引号属性值闭合
    .replace(/`/g, '&#96;')   // 防止反引号注入
    .replace(/\r/g, '__CR__')  // 🔧 使用文本占位符，UEditor无法解析
    .replace(/\n/g, '__LF__')  // 🔧 使用文本占位符，UEditor无法解析

  // 🔧 调试：统计输出的占位符数量
  const outputPlaceholders = (result.match(/__LF__/g) || []).length
  console.log('[escapeXmlForAttribute] 输出__LF__数量:', outputPlaceholders)
  console.log('[escapeXmlForAttribute] 输出前100字符:', result.substring(0, 100))

  return result
}

/**
 * 反转义XML属性值
 * @param {String} escapedXml - 已编码的XML字符串
 * @returns {String} - 解码后的XML字符串
 */
function unescapeXmlAttribute(escapedXml) {
  if (!escapedXml) return ''
  return escapedXml
    .replace(/&#96;/g, '`')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/__CR__/g, '\r')  // 🔧 2026-11-10 修复：解码文本占位符
    .replace(/__LF__/g, '\n')  // 🔧 2026-11-10 修复：解码文本占位符
    .replace(/&amp;/g, '&')    // & 必须最后替换
}

// ========== 主转换函数 ==========

/**
 * para2html转换函数（XML → HTML）
 * @param {Object} parent - Parent对象引用
 * @param {String} str - 完整的para XML字符串（包含<para>标签）
 * @returns {Promise<String>} - HTML字符串
 */
export async function para2html(parent, str) {
  if (!str || !str.trim()) return ''

  let html = str.trim()

  // 🔧 2026-11-09 P0修复: 三级有序列表显示格式问题
  //   根因: fixListForUEditor()将嵌套列表从para内移到listItem兄弟位置，导致HTML结构错误
  //   验证: UEditor完全支持标准嵌套HTML (<ol><li>文字<ol>...</ol></li></ol>)
  //   修复: 移除此调用，让标签替换直接处理标准S1000D结构，CSS样式能正确应用
  //   影响: 需同步修改html2para侧的fixSiblingNestedLists()调用（第369行）
  // html = fixListForUEditor(html)  // 已禁用 - 2026-11-09

  // §8.2.1 definitionList转table
  // 🔧 修复P0-DEFLIST: 使用[\s\S]*?代替.*?以匹配多行XML
  const deflists = html.match(/<definitionList[\s\S]*?<\/definitionList>/g)
  if (deflists != null) {
    deflists.forEach(m => {
      let html_ = m.replace(/<definitionList>/g, '<table deflist="1">')
        .replace('</definitionList>', '</table>')
        .replace(/<definitionListItem>/g, '<tr>')
        .replace(/<\/definitionListItem>/g, '</tr>')
        .replace(/<listItemTerm\/>/g, '<th></th>')
        .replace(/<listItemTerm>/g, '<th>')
        .replace(/<\/listItemTerm>/g, '</th>')
        .replace(/<listItemDefinition\/>/g, '<td></td>')
        .replace(/<listItemDefinition>/g, '<td>')
        .replace(/<\/listItemDefinition>/g, '</td>')
      html = html.replace(m, html_)
    })
  }

  // §8.3 captionGroup转table
  // 🔧 修复P0-CAPTION: 使用[\s\S]*?代替.*?以匹配多行XML
  const captions = html.match(/<captionGroup[\s\S]*?<\/captionGroup>/g)
  if (captions != null) {
    for (const m of captions) {
      const tableHtml = await convertCaptionGroupToTable(m)
      html = html.replace(m, tableHtml)
    }
  }

  // §8.2.2 基础元素转换
  html = html.replace(/<para/g, '<p')
    .replace(/<\/para>/g, '</p>')
    .replace(/<superScript>/g, '<sup>')
    .replace(/<\/superScript>/g, '</sup>')
    .replace(/<subScript>/g, '<sub>')
    .replace(/<\/subScript>/g, '</sub>')
    .replace(/<delete>/g, '<s>')
    .replace(/<\/delete>/g, '</s>')

  // 🔧 2026-11-09 P0修复: 清理 <p> 标签内部的空白字符
  //   根因: XML 格式化后，<para> 内部有换行和缩进，浏览器会显示为空格
  //   症状: "1²" 在编辑器中显示为 "1          2"（有10个空格）
  //   修复: 移除 <p> 内部所有的换行和多余空白

  // 安全检查：确保 html 不是 undefined
  if (html && typeof html === 'string') {
    // 一次性清理所有空白：将 <p>...</p> 内部的所有多余空白替换为单个空格
    // 🔧 2026-11-10 修复：跳过包含 <a> 标签（dmRef/internalRef转换后）的 <p>，保留其内部 XML 格式
    html = html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/g, (match, attrs, content) => {
      // 如果内容包含 <a> 标签（已转换的 dmRef/internalRef/symbol），跳过清理
      // 这些 <a> 标签的 xml 属性中包含原始的多行格式化 XML，需要保留
      if (/<a[\s\S]*?xml="/.test(content)) {
        return match  // 保持原样，不清理空白
      }

      // 清理内容中的所有多余空白（换行、缩进等）
      const cleaned = content
        .replace(/^\s+/, '')           // 移除开头空白
        .replace(/\s+$/, '')           // 移除结尾空白
        .replace(/\s+</g, ' <')        // 标签前的空白 → 单个空格
        .replace(/>\s+/g, '> ')        // 标签后的空白 → 单个空格
      return `<p${attrs}>${cleaned}</p>`
    })
  }

  // 🔧 还原无序列表符号：listItemPrefix → ul的list-style-type（供UEditor显示）
  // 必须显式输出list-style-type：否则裸<ul>会继承浏览器嵌套默认级联
  // (L1=disc/L2=circle/L3=square)，导致设计视图符号与保存值不一致。
  // 无prefix或pf02默认为disc（与descript.xsd默认值一致）。
  html = html.replace(/<randomList(\s[^>]*)?>/g, (match, attrs) => {
      const pfMatch = (attrs || '').match(/listItemPrefix="([^"]+)"/)
      const listStyle = (pfMatch && PF_TO_LISTSTYLE[pfMatch[1]]) || 'disc'
      return `<ul style="list-style-type:${listStyle}">`
    })
    .replace(/<\/randomList>/g, '</ul>')
    .replace(/<sequentialList/g, '<ol')
    .replace(/<\/sequentialList>/g, '</ol>')
    .replace(/<listItem/g, '<li')
    .replace(/<\/listItem>/g, '</li>')
    // 🔧 修复P0-5: warningAndCautionPara/notePara往返问题
    // 添加data-type属性标记，以便html2para还原时识别原始类型
    .replace(/<warningAndCautionPara>/g, '<p data-type="warningAndCautionPara">')
    .replace(/<\/warningAndCautionPara>/g, '</p>')
    .replace(/<notePara>/g, '<p data-type="notePara">')
    .replace(/<\/notePara>/g, '</p>')
    // 🔧 2026-11-10 P0修复: S1000D <emphasis> 变体 → HTML标准标签（符合S1000D 4.0标准）
    // 先处理带属性的emphasis（包含开闭标签对）
    .replace(/<emphasis[^>]*\s+emph="(em01|bold)"[^>]*>([\s\S]*?)<\/emphasis>/g, '<strong>$2</strong>')  // 粗体
    .replace(/<emphasis[^>]*\s+emph="(em02|italic)"[^>]*>([\s\S]*?)<\/emphasis>/g, '<em>$2</em>')        // 斜体
    .replace(/<emphasis[^>]*\s+emph="(em03|underscr)"[^>]*>([\s\S]*?)<\/emphasis>/g, '<u>$2</u>')       // 下划线
    .replace(/<emphasis[^>]*\s+emph="em04"[^>]*>([\s\S]*?)<\/emphasis>/g, '<mark>$2</mark>')            // 高亮/上划线
    .replace(/<emphasis[^>]*\s+emph="em05"[^>]*>([\s\S]*?)<\/emphasis>/g, '<s>$2</s>')                  // 删除线
    // 最后处理无属性的emphasis（默认为粗体）
    .replace(/<emphasis>/g, '<strong>')
    .replace(/<\/emphasis>/g, '</strong>')

  // 🔧 2026-11-09 P0修复: 移除 <li> 内的 <p> 标签
  //   标签替换后会产生 <li><p>文字<ol>...</ol></p></li>
  //   这是非法HTML（<p> 不能包含块级元素如 <ol>）
  //   解决方案：检测并移除这种模式中的 <p> 标签
  //   策略：使用简单的字符串替换，移除 <li> 紧跟的 <p> 和 </li> 前的 </p>

  // 移除 <li> 开头的 <p> 和 </li> 结尾的 </p>
  html = html.replace(/<li>(\s*)<p>/g, '<li>$1')
  html = html.replace(/<\/p>(\s*)<\/li>/g, '$1</li>')

  // 🔧 2026-11-09 P0修复: 处理最外层 <p> 包含列表的情况
  //   使用平衡标签匹配，处理两种情况：
  //   1. <p><ol>...</ol></p> → <ol>...</ol>
  //   2. <p>文字<ol>...</ol></p> → <p>文字</p><ol>...</ol>
  function removeOuterParagraphAroundList(str) {
    console.log('[paraConverter] removeOuterParagraphAroundList 开始')

    // 查找 <p...> 标签
    const pMatch = str.match(/<p([^>]*)>/)
    if (!pMatch) {
      console.log('[paraConverter] 未找到 <p> 标签')
      return str
    }

    const pStart = pMatch.index
    const pAttrs = pMatch[1]
    const pEnd = pStart + pMatch[0].length

    // 查找配对的 </p>
    let depth = 1
    let pos = pEnd
    while (depth > 0 && pos < str.length) {
      const nextP = str.indexOf('<p', pos)
      const nextCloseP = str.indexOf('</p>', pos)

      if (nextCloseP < 0) {
        console.log('[paraConverter] 没有找到 </p>')
        return str
      }

      // 检查 <p 是否是标签开始（不是属性值的一部分）
      if (nextP >= 0 && nextP < nextCloseP && str[nextP + 2] === '>' || str[nextP + 2] === ' ') {
        depth++
        pos = nextP + 2
      } else {
        depth--
        if (depth === 0) {
          pos = nextCloseP
          break
        }
        pos = nextCloseP + 4
      }
    }

    const closePEnd = pos + 4  // pos是</p>的开始位置，+4是</p>的长度
    const pContent = str.substring(pEnd, pos)

    console.log('[paraConverter] <p>内容:', pContent.substring(0, 100))

    // 查找内容中的 <ol 或 <ul
    const listMatch = pContent.match(/<(ol|ul)/)
    if (!listMatch) {
      console.log('[paraConverter] <p>内不包含列表')
      return str
    }

    const listTag = listMatch[1]
    const listStart = pContent.indexOf(`<${listTag}`)

    // 使用平衡标签匹配找到配对的 </ol> 或 </ul>
    let listDepth = 1
    let listPos = listStart + listTag.length + 1
    const openTag = `<${listTag}`
    const closeTag = `</${listTag}>`

    while (listDepth > 0 && listPos < pContent.length) {
      const nextOpen = pContent.indexOf(openTag, listPos)
      const nextClose = pContent.indexOf(closeTag, listPos)

      if (nextClose < 0) {
        console.log('[paraConverter] 列表标签不平衡')
        return str
      }

      if (nextOpen >= 0 && nextOpen < nextClose) {
        listDepth++
        listPos = nextOpen + openTag.length
      } else {
        listDepth--
        if (listDepth === 0) {
          listPos = nextClose + closeTag.length
          break
        }
        listPos = nextClose + closeTag.length
      }
    }

    // 提取列表前后的文本
    const textBefore = pContent.substring(0, listStart).trim()
    const listContent = pContent.substring(listStart, listPos)
    const textAfter = pContent.substring(listPos).trim()

    console.log('[paraConverter] 文字前:', textBefore.substring(0, 30))
    console.log('[paraConverter] 列表:', listContent.substring(0, 50))
    console.log('[paraConverter] 文字后:', textAfter.substring(0, 30))

    // 重建HTML
    const before = str.substring(0, pStart)
    const after = str.substring(closePEnd)
    let result = before

    if (textBefore) {
      result += `<p${pAttrs}>${textBefore}</p>`
    }

    result += listContent

    if (textAfter) {
      result += `<p${pAttrs}>${textAfter}</p>`
    }

    result += after

    console.log('[paraConverter] 处理完成')
    return result
  }

  // 循环处理，直到没有外层 <p> 包裹列表
  console.log('[paraConverter] 开始循环移除外层 <p>')
  let maxIter = 10
  while (maxIter-- > 0) {
    const before = html
    html = removeOuterParagraphAroundList(html)
    if (html === before) {
      console.log('[paraConverter] 循环结束，没有更多变化')
      break
    }
    console.log('[paraConverter] 循环继续，迭代剩余:', maxIter)
  }

  // §8.2.3 internalRef转<a>标签
  const refs = []
  str2jsons(refs, html, 'internalRef', 'internalRefId,internalRefTargetType')
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行标签
  let internalRefs = html.match(/<internalRef[\s\S]*?<\/internalRef>/g)
  if (internalRefs != null) {
    internalRefs.forEach((m, i) => {
      const ref = refs[i]
      const type = ref.internalRefTargetType || ''
      // 🔧 修复P0-4: ref.xml已在str2jsons中转义，不要重复转义
      // 🔧 修复P1-6: 对type和id应用XSS防护
      const safeType = escapeXmlForAttribute(type)
      const safeId = escapeXmlForAttribute(ref.internalRefId)
      html = html.replace(m, `<a href="javascript:void(0);" xml="${ref.xml}">【${safeType}(${safeId})】</a>`)
    })
  } else {
    internalRefs = html.match(/<internalRef[\s\S]*?\/>/g)
    if (internalRefs != null) {
      internalRefs.forEach((m, i) => {
        const ref = refs[i]
        const type = ref.internalRefTargetType || ''
        // 🔧 修复P0-4: ref.xml已在str2jsons中转义，不要重复转义
        // 🔧 修复P1-6: 对type和id应用XSS防护
        const safeType = escapeXmlForAttribute(type)
        const safeId = escapeXmlForAttribute(ref.internalRefId)
        html = html.replace(m, `<a href="javascript:void(0);" xml="${ref.xml}">【${safeType}(${safeId})】</a>`)
      })
    }
  }

  // §8.2.4 dmRef转<a>标签
  html = await getDmrefHtml(parent, html)

  // §8.2.5 symbol转<img>标签
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行标签
  let symbols = html.match(/<symbol[\s\S]*?<\/symbol>/g)
  if (symbols != null) {
    html = await tosymbol(symbols, html)
  } else {
    symbols = html.match(/<symbol[\s\S]*?\/>/g)
    if (symbols != null) {
      html = await tosymbol(symbols, html)
    }
  }

  return html
}

/**
 * html2para转换函数（HTML → XML）
 * @param {Object} parent - Parent对象引用
 * @param {String} html - UEditor的HTML内容
 * @param {String} projectParameters - 项目参数JSON字符串
 * @param {Array} allocatedUniqueids - 预分配的uniqueid数组
 * @param {Number} depth - 递归深度计数器
 * @returns {Promise<String>} - 完整的para XML字符串
 */
export async function html2para(parent, html, projectParameters, allocatedUniqueids = [], depth = 0) {
  // 修复P1-BUG-2: 递归深度限制抛出异常，避免数据污染
  // 原逻辑: return '[递归深度超限]' 会污染XML，导致数据永久丢失
  // 新逻辑: 抛出异常，阻止保存，提示用户简化para结构
  if (depth > 10) {
    throw new Error('para嵌套层级过深（超过10层），请简化内容结构后重试')
  }

  // 空内容时返回空字符串（由调用方包裹para标签）
  if (!html || !html.trim()) return ''

  // 🔧 修复CRITICAL: 剥离外层<p>标签（para2html会把外层para转成p）
  // html2para应返回不带外层para的内容，由调用方（ParaDesigner）包裹para标签
  let para = html.trim()

  // 检测并移除外层<p>标签（可能带属性）
  const outerPMatch = para.match(/^<p(\s[^>]*)?>/)
  if (outerPMatch && para.endsWith('</p>')) {
    // 移除外层<p>和</p>
    para = para.substring(outerPMatch[0].length, para.length - 4)
  }

  para = para
    .replace(/&nbsp;/g, '')
    .replace(/<br>/g, '')
    .replace(/<\/br>/g, '')
    .replace(/<br\/>/g, '')
    // 🔧 2026-11-10 修复：保留换行符，让 formatXml() 处理格式化
    // 问题：.replace(/\n/g, '') 导致第二次保存时格式丢失（往返转换不一致）
    // 根因：para2html 保留原始多行 XML → html2para 恢复后仍是多行 → 此处强制删除换行 → 变成单行
    // 修复：注释此行，保留从设计视图恢复的 XML 的原始格式，让 formatXml() 统一格式化
    // .replace(/\n/g, '')  // ❌ 已禁用 - 保留换行符以保持格式一致性
    .replace(/<p><\/p>/g, '')
    .replace(/<a name=.*?><\/a>/g, '')
    .replace(/<h\d.*?>/g, '<p>')
    .replace(/<\/h\d>/g, '</p>')
    .replace(/<h.*?\/>/g, '')
    .replace(/<\/p><symbol/g, '<symbol')

  // 🔧 修复：合并连续的同级列表标签（不破坏嵌套结构）
  // 根因：富文本编辑器在来回切换时可能生成多个独立的<ul>/<ol>标签
  // 关键：只合并</ul></li></ul><ul>这种平级模式，保留</ul><ul>这种嵌套模式
  // 错误模式（平级）：</ul></li></ul><ul><li> → 应合并
  // 正确模式（嵌套）：<li>text<ul><li> → 应保留
  para = para.replace(/<\/ul>(\s*)<\/li>(\s*)<\/ul>(\s*)<ul.*?>/g, '')  // 合并平级ul
    .replace(/<\/ol>(\s*)<\/li>(\s*)<\/ol>(\s*)<ol.*?>/g, '')  // 合并平级ol

  // 🔧 保留无序列表符号：从list-style-type提取符号，暂存为data-pf属性
  // 根因：旧逻辑<ul.*?>→<ul>会丢弃list-style-type，导致circle/square符号永久丢失
  para = para.replace(/<ul(\s[^>]*)?>/g, (match, attrs) => {
    const styleMatch = (attrs || '').match(/list-style-type:\s*([a-z]+)/i)
    const listStyle = styleMatch ? styleMatch[1].toLowerCase() : 'disc'
    const pf = LISTSTYLE_TO_PF[listStyle] || 'pf02'
    return `<ul data-pf="${pf}">`
  })
    .replace(/<ol.*?>/g, '<ol>')
    // 修复BUG-006: 使用词边界避免误匹配<list>、<link>
    .replace(/<li(\s[^>]*)?\>/g, '<li>')
    // 🔧 2026-11-10 P0修复: 处理带删除线样式的 span (UEditor 可能将 <s> 转换为带样式的 span)
    // 需要同时处理开标签和闭标签，确保标签配对
    .replace(/<span[^>]*style="[^"]*text-decoration:\s*line-through[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<s>$1</s>')
    .replace(/<span[^>]*style="[^"]*text-decoration:\s*underline\s+line-through[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<s>$1</s>')
    .replace(/<span[^>]*style="[^"]*text-decoration:\s*line-through\s+underline[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<s>$1</s>')
    .replace(/<span.*?>/g, '')
    .replace(/<\/span>/g, '')
    // 修复BUG-004: 使用词边界避免误匹配<para>、<pre>
    // 🔧 修复P0-5: 保留data-type属性，不要清理（后续用于识别warningAndCautionPara/notePara）
    .replace(/<p(\s+(?!data-type)[^>]*)?\>/g, '<p>')  // 清理除data-type外的其他属性
    .replace(/<\/p><ul/g, '<ul')
    .replace(/<\/p><ol/g, '<ol')

  // §9.2.2 基础元素逆转换
  // 修复BUG-002: 使用词边界避免误匹配<superScript>、<support>、<supply>
  para = para.replace(/<sup(\s[^>]*)?\>/g, '<superScript>')
    .replace(/<\/sup>/g, '</superScript>')
    // 修复BUG-003: 使用词边界避免误匹配<subScript>、<subject>、<submit>
    .replace(/<sub(\s[^>]*)?\>/g, '<subScript>')
    .replace(/<\/sub>/g, '</subScript>')
    // 🔧 2026-11-10 P0修复: HTML格式标签 → S1000D标准元素（完全符合S1000D 4.0标准）
    // 删除线: <s>/<del>/<strike> → <delete>
    .replace(/<s(\s[^>]*)?\>/g, '<delete>')
    .replace(/<\/s>/g, '</delete>')
    .replace(/<del(\s[^>]*)?\>/g, '<delete>')
    .replace(/<\/del>/g, '</delete>')
    .replace(/<strike(\s[^>]*)?\>/g, '<delete>')
    .replace(/<\/strike>/g, '</delete>')
    // 粗体: <b>/<strong> → <emphasis emph="em01">
    .replace(/<b(\s[^>]*)?\>/g, '<emphasis emph="em01">')
    .replace(/<\/b>/g, '</emphasis>')
    .replace(/<strong(\s[^>]*)?\>/g, '<emphasis emph="em01">')
    .replace(/<\/strong>/g, '</emphasis>')
    // 斜体: <i>/<em> → <emphasis emph="em02">
    .replace(/<i(\s[^>]*)?\>/g, '<emphasis emph="em02">')
    .replace(/<\/i>/g, '</emphasis>')
    .replace(/<em(\s[^>]*)?\>/g, '<emphasis emph="em02">')
    .replace(/<\/em>/g, '</emphasis>')
    // 下划线: <u> → <emphasis emph="em03">
    .replace(/<u(\s[^>]*)?\>/g, '<emphasis emph="em03">')
    .replace(/<\/u>/g, '</emphasis>')
    // 高亮/标记: <mark> → <emphasis emph="em04">
    .replace(/<mark(\s[^>]*)?\>/g, '<emphasis emph="em04">')
    .replace(/<\/mark>/g, '</emphasis>')
    // 插入: <ins> → <emphasis emph="em03"> (与下划线相同效果)
    .replace(/<ins(\s[^>]*)?\>/g, '<emphasis emph="em03">')
    .replace(/<\/ins>/g, '</emphasis>')
    .replace(/<\/p><ul>/g, '<ul>')
    .replace(/<\/p><ol>/g, '<ol>')
    .replace(/<\/ul><\/p>/g, '</ul>')
    .replace(/<\/ol><\/p>/g, '</ol>')
    .replace(/<\/ul><p>/g, '</ul>')
    .replace(/<\/ol><p>/g, '</ol>')
    .replace(/<li><p>/g, '<li>')
    .replace(/<\/p><\/li>/g, '</li>')
    // 🔧 将暂存的data-pf转为S1000D标准属性listItemPrefix（pf02=默认实心点，省略）
    .replace(/<ul data-pf="([^"]+)">/g, (match, pf) => {
      return pf === 'pf02' ? '<randomList>' : `<randomList listItemPrefix="${pf}">`
    })
    .replace(/<\/ul>/g, '</randomList>')
    .replace(/<ol>/g, '<sequentialList>')
    .replace(/<\/ol>/g, '</sequentialList>')
    // 🔧 修复P0-1: 暂不转换<li>，等<p>转<para>后再处理

  // 🔧 修复BUG-PARA-001: 调整替换顺序，避免para结束标签丢失
  // 关键改进：先清理table周围的<p>标签，再统一转换为<para>
  // Step 1: 清理嵌套的<p>标签（允许空格）
  para = para.replace(/<p>\s*<p>/g, '<p>')
    .replace(/<\/p>\s*<\/p>/g, '</p>')

  // Step 2: 清理table周围的<p>和</p>标签（允许空格和换行）
  para = para.replace(/<\/p>\s*<table/g, '<table')     // </p> <table
    .replace(/<p>\s*<table/g, '<table')               // <p> <table
    .replace(/<\/table>\s*<\/p>/g, '</table>')         // </table> </p>
    .replace(/<\/table>\s*<p>/g, '</table>')           // </table> <p>

  // 🔧 2026-11-09 P0修复: 移除 <li> 内的 <p> 标签（预处理）
  //   浏览器会自动修复HTML，导致 <li><p>文字<ol>...</ol></p></li>
  //   这些 <p> 标签会干扰后续的列表转换逻辑
  //   在转换前移除它们，确保结构干净
  para = para.replace(/<li>(\s*)<p>/g, '<li>$1')
  para = para.replace(/<\/p>(\s*)<\/li>/g, '$1</li>')

  // 🔧 修复P0-5: warningAndCautionPara/notePara往返问题
  // 在<p>→<para>之前，先识别并转换带data-type的特殊para
  para = para.replace(/<p data-type="warningAndCautionPara">/g, '<warningAndCautionPara>')
    .replace(/<p data-type="notePara">/g, '<notePara>')

  // Step 3: 统一转换<p>和</p>为<para>和</para>
  para = para.replace(/<\/p>/g, '</para>')             // 先转结束标签
    .replace(/<p>/g, '<para>')                         // 再转开始标签
    .replace(/<strong>/g, '<emphasis>')
    .replace(/<\/strong>/g, '</emphasis>')

  // 🔧 修复P0-5: 将</para>转换为对应的特殊标签结束符
  para = para.replace(/<warningAndCautionPara>([\s\S]*?)<\/para>/g, '<warningAndCautionPara>$1</warningAndCautionPara>')
    .replace(/<notePara>([\s\S]*?)<\/para>/g, '<notePara>$1</notePara>')

  // 🔧 修复NESTED-LIST: 嵌套列表结构非法 + 符号丢失问题
  // 根因1(结构)：旧逻辑把嵌套列表放成para的兄弟 <listItem><para>t</para><randomList>…
  //   违反descript.xsd —— listItem只允许note/para，嵌套列表必须在para内。
  // 根因2(正则)：<randomList>[\s\S]*?</randomList> 非贪婪，在3层同名嵌套时错配，
  //   把结构打平成兄弟节点（见图2）。
  // 正确结构：<listItem><para>文字<randomList>…</randomList></para></listItem>
  // 修复策略：从最内层<li>开始逐层转换（只匹配内部不含<li>的li，保证最内层先处理）。

  // 去掉文字片段外层的单层<para>包裹（重建到统一para内）
  const unwrapPara = (s) => {
    const t = s.trim()
    if (t.startsWith('<para>') && t.endsWith('</para>') && t.indexOf('<para>', 6) === -1) {
      return t.substring(6, t.length - 7)
    }
    return t
  }

  let maxIterations = 50  // 防止死循环
  let changed = true
  while (changed && maxIterations-- > 0) {
    changed = false
    // 只匹配内部不含<li>的最内层<li>（其子列表此时已全部转为listItem）
    para = para.replace(/<li>((?:(?!<li>|<\/li>)[\s\S])*)<\/li>/g, (match, content) => {
      changed = true
      // 分离文字部分与可选的嵌套列表（randomList/sequentialList）
      const listMatch = content.match(/<(?:randomList|sequentialList)(?:\s[^>]*)?>[\s\S]*<\/(?:randomList|sequentialList)>/)
      if (listMatch) {
        const nestedList = listMatch[0]
        const textBefore = unwrapPara(content.substring(0, listMatch.index))
        const textAfter = unwrapPara(content.substring(listMatch.index + nestedList.length))
        // 嵌套列表放在para内，符合S1000D
        return '<listItem><para>' + textBefore + nestedList + textAfter + '</para></listItem>'
      }
      const trimmed = content.trim()
      if (!trimmed) return '<listItem><para></para></listItem>'
      if (trimmed.startsWith('<para>') && trimmed.endsWith('</para>')) {
        return '<listItem>' + trimmed + '</listItem>'
      }
      return '<listItem><para>' + trimmed + '</para></listItem>'
    })
  }

  // 🔧 2026-11-09 P0修复: 三级有序列表显示格式问题
  //   根因分析: 之前的注释理解有误 - UEditor的标准模型是嵌套列表在<li>内部，而非兄弟
  //   实际验证: UEditor完全支持 <ol><li>文字<ol>...</ol></li></ol> 标准HTML结构
  //   修复策略: 移除fixSiblingNestedLists()调用，保持标准的嵌套结构不变
  //   影响范围: 与para2html侧的fixListForUEditor()互为逆变换，已同步禁用
  // para = fixSiblingNestedLists(para)  // 已禁用 - 2026-11-09

  // 兜底：若仍有残留<li>（异常嵌套），简单包裹避免数据丢失
  para = para.replace(/<li>([\s\S]*?)<\/li>/g, '<listItem><para>$1</para></listItem>')

  // §9.2.3 table转definitionList
  // 🔧 修复P0-DEFLIST: 使用[\s\S]*?代替.*?以匹配多行表格内容
  // 根因：.*?默认不匹配换行符，导致多行deflist无法识别，被当成普通表格删除
  const deflists = para.match(/<table deflist="1">[\s\S]*?<\/table>/g)
  if (deflists != null) {
    deflists.forEach(m => {
      let table_ = m.replace(/<table deflist="1">/g, '<definitionList>')
        .replace(/<\/table>/g, '</definitionList>')
        .replace(/<tbody>/g, '')
        .replace(/<\/tbody>/g, '')
        // 修复BUG-007: 使用词边界避免误匹配<track>、<tree>
        .replace(/<tr(\s[^>]*)?\>/g, '<definitionListItem>')
        .replace(/<\/tr>/g, '</definitionListItem>')
        // 修复BUG-005: 使用词边界避免误匹配<thead>、<thread>
        .replace(/<th(\s[^>]*)?\>/g, '<listItemTerm>')
        .replace(/<\/th>/g, '</listItemTerm>')

      // 🔧 修复P0-2: definitionList内para重复问题
      // 关键: <td>内可能已有<para>（因为前面<p>→<para>已执行）
      // 策略: 先处理已有<para>的<td>，再处理无<para>的<td>

      // 处理已有<para>的<td>（不添加para）
      // 🔧 修复CRITICAL: 使用+量词匹配一个或多个para，避免多para时留下残留标签
      table_ = table_.replace(/<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g, '<listItemDefinition>$2</listItemDefinition>')

      // 处理无<para>的<td>（添加para）
      // 🔧 修复边界bug: 属性组改为可选(\s[^>]*)?，避免裸<td>(无属性)不匹配残留标签
      table_ = table_.replace(/<td(\s[^>]*)?>([\s\S]*?)<\/td>/g, '<listItemDefinition><para>$2</para></listItemDefinition>')

      para = para.replace(m, table_)
    })
  }

  // §9.2.4 table转captionGroup
  // 🔧 修复P0-CAPTION-REVERSE: 使用[\s\S]*?代替.*?以匹配多行HTML
  const captions = para.match(/<table caption="1">[\s\S]*?<\/table>/g)
  if (captions != null) {
    captions.forEach(m => {
      para = para.replace(m, convertTableToCaptionGroup(m, parent, depth))
    })
  }

  // §9.2.5 处理普通table（对标旧系统：删除而不是转换）
  // 🔥 旧系统逻辑：Para中不支持普通table，只支持definitionList和captionGroup
  // 旧系统代码：para.replace(/<table.*?<\/table>/g,'').replace(/<table.*?\/>/g,'')
  // 匹配不含deflist或caption标记的普通HTML table，直接删除
  const normalTables = para.match(/<table(?![^>]*(?:deflist|caption)="1")[^>]*>[\s\S]*?<\/table>/g)
  if (normalTables != null) {
    console.warn('[html2para] 发现', normalTables.length, '个普通表格，将被删除（对标旧系统：Para不支持普通表格）')
    normalTables.forEach((m, idx) => {
      console.warn(`[html2para] 删除表格 ${idx + 1}/${normalTables.length}:`, m.substring(0, 100))
      para = para.replace(m, '')
    })
    console.warn('[html2para] ⚠️ 提示：Para中应使用definitionList（定义列表）而不是普通表格')
  }

  // 同时删除自闭合的table标签
  para = para.replace(/<table(?![^>]*(?:deflist|caption)="1")[^>]*>.*?\/>/g, '')

  // §9.2.7 公式（kfformula）转symbol
  // 🔑 关键修复：改进正则以处理 base64 数据中的 > 字符
  // 旧正则1: /<img class="kfformula".*?\/>/g
  //   → 问题: base64 中的 > 导致 .*? 提前终止
  // 旧正则2: /<img[^>]+class="kfformula"[^>]*\/>/g
  //   → 问题: [^>]+ 在遇到 base64 中的 > 时仍然失败
  // 新方案: 使用 [\s\S] 匹配所有字符（包括 >），但限制贪心为最近的 class="kfformula"
  // 策略: 匹配 <img ... class="kfformula" ... /> 其中 ... 可以包含任何字符
  const formula = para.match(/<img[\s\S]*?class="kfformula"[\s\S]*?\/>/g)
  console.log('[html2para] 找到公式数量:', formula ? formula.length : 0)
  if (formula != null) {
    para = para.replace(/<\/para><para><img class="kfformula">/g, '<img class="kfformula">')
    let newformulaCnt = 0

    for (const m of formula) {
      console.log('[html2para] 处理公式:', m.substring(0, 100) + '...')
      // 情况1：已存在的公式（有xml属性）
      if (m.indexOf(' xml="') > 0) {
        console.log('[html2para] → 已存在的公式，使用xml属性')
        const match = m.match(/xml="([^"]+)"/)
        if (match) {
          // 🔧 修复P1-6: 使用统一的反转义函数
          const formulaxml = unescapeXmlAttribute(match[1])
          para = para.replace(m, formulaxml)
        }
      }
      // 情况2：新公式 → 自动生成ICN
      else {
        console.log('[html2para] → 新公式，准备保存到数据库')
        try {
          // §13.3 构建ICN元数据
          const json = {
            variantcode: 'A',
            securityclassification: '02',
            issueno: '001',
            secretLevel: '1',
            cmnodeid: parent.cmnodeid
          }
          console.log('[html2para] 步骤1: 构建ICN元数据完成')

          // 🔧 修复P0-01: 从项目参数获取originator和rpc（必须获取真实值）
          try {
            if (!projectParameters || projectParameters.trim() === '') {
              throw new Error('项目参数为空')
            }
            const projparam = JSON.parse(projectParameters)
            const ori = projparam.originator
            if (!ori || ori.length === 0) {
              throw new Error('项目参数中缺少originator')
            }
            json.originator = ori[0].code

            const rpc = projparam.rpc
            if (!rpc || rpc.length === 0) {
              throw new Error('项目参数中缺少rpc')
            }
            json.rpc = rpc[0].code1
            console.log('[html2para] 步骤2: 获取originator/rpc成功:', json.originator, json.rpc)
          } catch (e) {
            console.error('获取项目参数失败，无法生成ICN:', e.message, 'projectParameters:', projectParameters)
            throw new Error(`公式保存失败：无法从项目参数获取originator和rpc (${e.message})`)
          }

          // 🔧 2026-10-15 修复P0: 公式ICN格式与图符保持一致
          // 从DM名称解析SNS（与旧系统IetmEditorDesignerPara.js:259保持一致）
          const nameArr = parent.dmCode.split('-')
          if (nameArr.length < 6) {
            console.error('dmCode格式错误，长度不足:', parent.dmCode, '数组长度:', nameArr.length)
            throw new Error(`dmCode格式错误: ${parent.dmCode}，预期至少6段，实际${nameArr.length}段`)
          }

          // SNS 3段（与旧系统保持一致）
          // nameArr[3]+nameArr[4]+nameArr[5] 直接拼接（只有[4]和[5]需补零）
          const sns1 = nameArr[1]  // modelIdentCode
          const sns2 = nameArr[2]  // systemDiffCode
          const sns3 = nameArr[3] + nameArr[4].padStart(2, '0') + nameArr[5].padStart(2, '0')  // 直接拼接
          json.sns = `${sns1}-${sns2}-${sns3}`
          console.log('[html2para] 步骤3: 解析SNS完成:', json.sns)

          // 设置文件内容
          json.filecontent = m

          // 🔧 修复P1-2: 使用预分配的uniqueid（添加验证和一致性保证）
          const uniqueid_ = allocatedUniqueids.shift()
          if (!uniqueid_) {
            console.error('uniqueid分配不足，已使用数量:', newformulaCnt, '剩余数量:', allocatedUniqueids.length)
            throw new Error('uniqueid分配不足，请检查后端分配逻辑')
          }
          json.uniqueid = uniqueid_
          json.filename = '公式' + uniqueid_ + '.png'
          console.log('[html2para] 步骤4: 分配uniqueid完成:', uniqueid_)

          // 🔧 2026-10-15 修复P0: 公式ICN格式与旧系统保持一致（10段）
          // 格式: ICN-{SNS 3段}-{originator}-{rpc}-{uniqueId}-A-001-01
          // 与旧系统代码保持一致: var icn = 'ICN-'+json.sns+'-'+json.rpc+'-'+json.originator+'-'+uniqueid_+'-A-001-01';
          // 但实际ICN顺序应该是: originator在rpc前
          const uniqueidStr = String(uniqueid_).padStart(5, '0')
          const icn = `ICN-${json.sns}-${json.originator}-${json.rpc}-${uniqueidStr}-A-001-01`
          json.icn = icn
          console.log('[html2para] 步骤5: 生成ICN完成 (10段):', icn)

          // 读取图片尺寸
          const srcMatch = m.match(/src="([^"]+)"/)
          if (srcMatch) {
            console.log('[html2para] 步骤6: 开始加载图片尺寸...')
            const img = new Image()
            // 🔧 修复P1-3: Image对象内存泄漏（添加事件监听器清理）
            let cleanupHandlers = null

            try {
              await new Promise((resolve, reject) => {
                const onload = () => {
                  resolve()
                }
                const onerror = () => {
                  reject(new Error('图片加载失败'))
                }

                img.onload = onload
                img.onerror = onerror

                // 保存清理函数
                cleanupHandlers = () => {
                  img.onload = null
                  img.onerror = null
                  img.src = '' // 释放图片引用
                }

                img.src = srcMatch[1]
              })

              console.log('[html2para] 步骤7: 图片尺寸加载完成:', img.width, 'x', img.height)
              // 替换为symbol标签
              const symbolXml = `<symbol infoEntityIdent="${icn}" reproductionWidth="${img.width}" reproductionHeight="${img.height}" reproductionScale="100"></symbol>`
              para = para.replace(m, symbolXml)
              newformulaCnt++
            } catch (err) {
              console.error('公式图片加载失败:', err)
              // 降级：保留原公式，使用默认尺寸
              const symbolXml = `<symbol infoEntityIdent="${icn}" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"></symbol>`
              para = para.replace(m, symbolXml)
              newformulaCnt++
            } finally {
              // 🔧 修复P1-3: 清理Image对象事件监听器
              if (cleanupHandlers) {
                cleanupHandlers()
              }
            }

            // 异步保存到ICN库
            try {
              console.log('[html2para] 步骤8: 开始调用save-formula API...')
              // 🔧 修复：axios已配置baseURL为/jeecg-boot，这里只需相对路径
              await axios.post('/ietm/icn/save-formula', { data: JSON.stringify(json) }, { timeout: 10000 })
              console.log('[html2para] 步骤9: save-formula API调用成功 ✓')
            } catch (err) {
              console.error('[html2para] ❌ 保存公式ICN失败:', err)
              // 超时错误特殊提示
              if (err.code === 'ECONNABORTED') {
                throw new Error('保存公式ICN超时（10秒），请检查网络连接或联系管理员')
              }
              throw new Error('保存公式ICN失败，请重试：' + (err.message || '未知错误'))
            }
          }
        } catch (error) {
          console.error('公式转ICN失败:', error)
        }
      }
    }

    // 返回新公式计数
    if (newformulaCnt > 0) {
      parent.newformulaCnt = newformulaCnt
    }
  }

  // §9.2.6 <img>标签还原为symbol
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行属性
  let imgs = para.match(/<img[\s\S]*?\/>/g)
  if (imgs != null) {
    imgs.forEach(m => {
      const match = m.match(/xml="([^"]+)"/)
      if (match) {
        // 🔧 修复P1-6: 使用统一的反转义函数（包含完整的实体解码）
        const imgxml = unescapeXmlAttribute(match[1])
        para = para.replace(m, imgxml)
      }
    })
  }

  // §9.2.5 <a>标签还原为internalRef/dmRef
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行<a>标签
  let anchors = para.match(/<a[\s\S]*?<\/a>/g)
  if (anchors != null) {
    anchors.forEach(m => {
      const match = m.match(/xml="([^"]+)"/)
      if (match) {
        // 🔧 修复P1-6: 使用统一的反转义函数（包含完整的实体解码）
        const anchorxml = unescapeXmlAttribute(match[1])
        para = para.replace(m, anchorxml)
      } else {
        // 🔧 修复P0-DATALOSS-1: 处理被手动修改的<a>标签（无xml属性）
        // 根因：用户在UEditor中手动编辑文本时，xml属性会丢失
        // 症状：保存后para内容消失
        // 检测逻辑：如果<a>标签没有xml属性，但文本包含【引用/内部引用等标记，说明被破坏了

        const textMatch = m.match(/>([^<]+)<\/a>/)
        const linkText = textMatch ? textMatch[1] : ''

        // 识别这是否是被破坏的特殊元素
        const isDmRef = linkText.includes('引用') && (linkText.includes('DMC') || linkText.includes('DM'))
        const isInternalRef = linkText.includes('内部引用')
        const isSymbol = linkText.includes('图符')

        if (isDmRef || isInternalRef || isSymbol) {
          // 🔧 P0-WARN-1: 输出详细诊断日志，帮助用户定位问题
          console.error(
            '[html2para] 🚨 P0-DATALOSS风险：检测到被手动修改的引用元素\n' +
            `  └─ 链接文本: "${linkText}"\n` +
            `  └─ 原始HTML: ${m.substring(0, 80)}...\n` +
            `  └─ 根因: 用户在UEditor中手动修改文本，导致xml属性丢失\n` +
            `  └─ 后果: 保存后该元素会被当作普通文本处理，原始XML结构丢失\n` +
            `  └─ 建议: 删除此元素，使用工具栏"DM引用"/"内部引用"/"图符"按钮重新插入`
          )

          // 降级处理：宁可保留普通<a>标签，也不要让数据完全丢失
          // 前端会进行额外检查（见下一步的ParaDesigner验证）
          // 这里只记录错误，让<a>标签保持原样进入XML
          // para不替换m，相当于保留原HTML（最终会被当作普通链接处理）
        }
        // 其他普通<a>标签也保留原样
      }
    })
  }

  // 🔧 2026-11-09 P0修复: 将包含 inline 元素的内容格式化为多行
  //   目标: 1<superScript>2</superScript> → 多行格式
  //   策略: 在 inline 元素前后插入换行，外层调用者会添加 <para> 标签并由 formatXml 添加缩进
  para = para.replace(/^([^<]*)<(superScript|subScript)([^>]*)>([^<]*)<\/(superScript|subScript)>([^<]*)$/g,
    (match, textBefore, openTag, inlineAttrs, inlineText, closeTag, textAfter) => {
      let result = ''

      if (textBefore.trim()) {
        result += `${textBefore.trim()}\n    `
      }

      result += `<${openTag}${inlineAttrs}>${inlineText}</${closeTag}>`

      if (textAfter.trim()) {
        result += `\n    ${textAfter.trim()}`
      }

      return result
    })

  return para
}

// ========== 辅助函数 ==========

/**
 * 修复UEditor嵌套列表的"兄弟"结构，使其符合S1000D。
 * 输入已是 randomList/sequentialList/listItem/para 形式，但嵌套列表是前一个
 * listItem的兄弟（UEditor模型）。本函数把每个"紧跟</listItem>的兄弟列表"
 * 移进前一个listItem的最后一个</para>之前（即嵌套进该listItem的para内）。
 * 用平衡标签扫描定位列表的结束位置，支持任意层嵌套。
 * @param {String} s - 待修复的XML片段
 * @returns {String} - 嵌套列表均位于listItem内para中的合法片段
 */
function fixSiblingNestedLists(s) {
  const LIST_OPEN = /<(randomList|sequentialList)(?:\s[^>]*)?>/g
  let guard = 1000
  while (guard-- > 0) {
    // 找到第一个"</listItem>紧跟一个列表开标签"的位置
    const m = s.match(/<\/listItem>\s*<(randomList|sequentialList)(?:\s[^>]*)?>/)
    if (!m) break

    const listStart = m.index + s.substring(m.index).indexOf('<', '</listItem>'.length)
    const tag = m[1]
    // 平衡扫描：从listStart找到与之匹配的结束标签
    const end = findMatchingClose(s, listStart, tag)
    if (end === -1) break  // 结构异常，停止避免死循环

    const nestedList = s.substring(listStart, end)
    const liEnd = m.index + '</listItem>'.length  // 前一个listItem的结束位置

    // 在前一个listItem内部，找最后一个</para>（嵌套列表要插在它之前）
    const liInner = s.substring(0, m.index)
    const lastParaClose = liInner.lastIndexOf('</para>')
    if (lastParaClose === -1) break

    // 重建：把nestedList插入到前一个listItem最后一个</para>之前，并从原位置删除
    const newS =
      s.substring(0, lastParaClose) +
      nestedList +
      s.substring(lastParaClose, liEnd) +
      s.substring(end)
    if (newS === s) break
    s = newS
  }
  // 复位正则lastIndex（LIST_OPEN未使用exec，无需复位，占位保持可读性）
  void LIST_OPEN
  return s
}

/**
 * 从openIdx处的开标签起，平衡扫描同名tag，返回其结束标签之后的下标；找不到返回-1。
 */
function findMatchingClose(s, openIdx, tag) {
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')
  const close = new RegExp(`</${tag}>`, 'g')
  let depth = 0
  let i = openIdx
  while (i < s.length) {
    open.lastIndex = i
    close.lastIndex = i
    const o = open.exec(s)
    const c = close.exec(s)
    const oIdx = o ? o.index : Infinity
    const cIdx = c ? c.index : Infinity
    if (oIdx === Infinity && cIdx === Infinity) return -1
    if (oIdx < cIdx) {
      depth++
      i = oIdx + o[0].length
    } else {
      depth--
      i = cIdx + c[0].length
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * fixSiblingNestedLists的逆变换（para2html加载侧用）。
 * 把合法S1000D的 <listItem><para>文字<LIST>…</LIST></para></listItem>
 * 还原为UEditor模型 <listItem><para>文字</para></listItem><LIST>…</LIST>
 * （嵌套列表移出para，作为listItem的兄弟）。否则UEditor会把嵌套层级打平重排。
 * @param {String} s - 含randomList/sequentialList/listItem/para的XML片段
 * @returns {String} - 嵌套列表均为listItem兄弟的UEditor模型片段
 */
function fixListForUEditor(s) {
  const re = /<listItem>\s*<para>((?:(?!<para>|<\/para>|<listItem>|<randomList|<sequentialList)[\s\S])*?)(<(randomList|sequentialList)(?:\s[^>]*)?>)/
  let guard = 1000
  while (guard-- > 0) {
    const m = s.match(re)
    if (!m) break
    const liStart = m.index
    const text = m[1]
    const listOpenStart = m.index + m[0].length - m[2].length
    const tag = m[3]
    const listEnd = findMatchingClose(s, listOpenStart, tag)
    if (listEnd === -1) break
    const list = s.substring(listOpenStart, listEnd)
    // 嵌套列表后应紧跟 </para></listItem>
    const tail = s.substring(listEnd).match(/^\s*<\/para>\s*<\/listItem>/)
    if (!tail) break
    const liEndAbs = listEnd + tail[0].length
    const rebuilt = '<listItem><para>' + text.trim() + '</para></listItem>' + list
    const newS = s.substring(0, liStart) + rebuilt + s.substring(liEndAbs)
    if (newS === s) break
    s = newS
  }
  return s
}

/**
 * captionGroup转换辅助函数
 */
async function convertCaptionGroupToTable(captionXml) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(captionXml, 'text/xml')
  const colspecs = xmlDoc.querySelectorAll('colspec')
  const colstyles = []
  const colnames = []

  // 1. 解析colspec
  colspecs.forEach(spec => {
    colnames.push(spec.getAttribute('colname'))
    let style = ''
    const align = spec.getAttribute('align')
    if (align) style += `text-align:${align};`
    const width = spec.getAttribute('colwidth')
    if (width && width.trim() !== '*') style += `width:${width};`
    colstyles.push(style)
  })

  // 2. 转换captionRow
  const rows = xmlDoc.querySelectorAll('captionRow')
  let tbodystr = ''
  for (const row of rows) {
    tbodystr += '<tr>' + await getCaptionRow(row, colstyles, colnames) + '</tr>'
  }

  // 3. 生成HTML表格
  return `<table caption="1">${tbodystr}</table>`
}

/**
 * getCaptionRow辅助函数
 */
async function getCaptionRow(row, colstyles, colnames) {
  let rowstr = ''
  const entries = row.querySelectorAll('captionEntry')

  for (const entry of entries) {
    const serializer = new XMLSerializer()
    const entrystr = serializer.serializeToString(entry).trim()

    // 1. 处理captionLine
    let text = ''
    const parser = new DOMParser()
    const entryDoc = parser.parseFromString(entrystr, 'text/xml')
    const lines = entryDoc.querySelectorAll('captionLine')
    lines.forEach(line => {
      text += '\r\n' + line.textContent
    })
    if (text) text = text.substring(2)

    // 2. 处理captionText（递归）
    const captionTexts = entryDoc.querySelectorAll('captionText')
    for (const ct of captionTexts) {
      text += await para2html(null, ct.textContent)
    }

    // 3. 处理跨列
    const namest = entry.getAttribute('namest')
    const nameend = entry.getAttribute('nameend')
    let colspan = 1
    let colspanstr = ''
    if (namest && nameend && namest !== nameend) {
      const startIdx = colnames.indexOf(namest)
      const endIdx = colnames.indexOf(nameend)
      if (startIdx === -1 || endIdx === -1) {
        console.error(`[captionGroup] 跨列计算失败: namest=${namest} 或 nameend=${nameend} 不在colspec中`)
        colspan = 1
      } else if (startIdx > endIdx) {
        console.error(`[captionGroup] 跨列顺序错误: namest索引(${startIdx}) > nameend索引(${endIdx})`)
        colspan = 1
      } else {
        colspan = endIdx - startIdx + 1
      }
    }
    if (colspan > 1) colspanstr = ` colspan="${colspan}"`

    // 4. 处理跨行
    const morerows = entry.getAttribute('morerows')
    let rowspan = 1
    let rowspanstr = ''
    if (morerows && morerows !== '0') {
      rowspan = parseInt(morerows) + 1
    }
    if (rowspan > 1) rowspanstr = ` rowspan="${rowspan}"`

    // 5. 应用列样式
    const j = Array.from(entries).indexOf(entry)
    let style = colstyles[j] || ''
    if (style) style = ` style="${style}"`

    rowstr += `<td${colspanstr}${rowspanstr}${style}>${text}</td>`
  }

  return rowstr
}

/**
 * dmRef转换辅助函数
 * 🔧 2026-10-10 修复P0: 改用本地getDmcByText解析，不依赖后端接口
 */
export async function getDmrefHtml(parent, html) {
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行dmRef标签
  const refs = html.match(/<dmRef[\s\S]*?<\/dmRef>/g)

  if (refs != null) {

    for (const m of refs) {
      try {
        // 🔧 修复P0: 使用本地getDmcByText函数（refsBuilder.js）代替后端API
        const dmjson = getDmcByText(m)

        if (dmjson && dmjson.dmc) {
          // 🔧 2026-10-10 修复：保留原始格式，使用匹配到的原始m而非dmjson.xml
          // dmjson.xml经过trim()处理，会丢失换行和缩进
          const originalXml = m  // 保留原始多行格式
          const escapedXml = escapeXmlForAttribute(originalXml)
          const safeDmc = escapeXmlForAttribute(dmjson.dmc)
          const safeTitle = escapeXmlForAttribute(dmjson.dmtitle || '')

          // 显示格式：【引用DMC: 标题】
          const displayText = safeTitle ? `${safeDmc}: ${safeTitle}` : safeDmc
          html = html.replace(m, `<a href="javascript:void(0);" xml="${escapedXml}">【引用${displayText}】</a>`)
          console.log('[getDmrefHtml] ✅ 转换成功:', displayText)
        } else {
          // 解析失败，使用fallback
          console.warn('[getDmrefHtml] ⚠️ 本地解析失败，使用fallback显示')
          const fallbackText = extractDmRefTitle(m)
          const escapedXml = escapeXmlForAttribute(m)
          html = html.replace(m, `<a href="javascript:void(0);" xml="${escapedXml}" style="color: orange;">【引用DM: ${fallbackText}】</a>`)
        }
      } catch (error) {
        console.error('[getDmrefHtml] ❌ 转换dmRef失败:', error)

        // 🔧 失败时使用fallback，避免dmRef标签在UEditor中不可见
        const fallbackText = extractDmRefTitle(m)
        const escapedXml = escapeXmlForAttribute(m)
        html = html.replace(m, `<a href="javascript:void(0);" xml="${escapedXml}" style="color: red;">【引用DM解析失败: ${fallbackText}】</a>`)
      }
    }
  }
  return html
}

/**
 * 从dmRef XML中提取标题作为fallback显示
 */
function extractDmRefTitle(dmRefXml) {
  try {
    // 尝试提取techName和infoName
    const techNameMatch = dmRefXml.match(/<techName>(.*?)<\/techName>/)
    const infoNameMatch = dmRefXml.match(/<infoName>(.*?)<\/infoName>/)

    if (techNameMatch && infoNameMatch) {
      return `${techNameMatch[1]}-${infoNameMatch[1]}`
    } else if (techNameMatch) {
      return techNameMatch[1]
    } else if (infoNameMatch) {
      return infoNameMatch[1]
    }

    // 如果没有标题，提取dmCode作为标识
    const modelIdentMatch = dmRefXml.match(/modelIdentCode="([^"]+)"/)
    const systemCodeMatch = dmRefXml.match(/systemCode="([^"]+)"/)
    const infoCodeMatch = dmRefXml.match(/infoCode="([^"]+)"/)

    if (modelIdentMatch && systemCodeMatch && infoCodeMatch) {
      return `${modelIdentMatch[1]}-${systemCodeMatch[1]}-${infoCodeMatch[1]}`
    }

    return 'DM'
  } catch (e) {
    return 'DM'
  }
}

/**
 * symbol转换辅助函数
 */
async function tosymbol(symbols, html) {
  console.log('[tosymbol] 输入symbols数量:', symbols.length)

  // 构建后端 API 基地址
  const apiBaseUrl = window._CONFIG['domianURL'] || '/jeecg-boot'
  console.log('[tosymbol] apiBaseUrl:', apiBaseUrl)

  // 并行加载所有图符
  const promises = symbols.map(async (m) => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(m, 'text/xml')
      const icn = doc.querySelector('symbol').getAttribute('infoEntityIdent')
      console.log('[tosymbol] 处理ICN:', icn)

      // 🔧 2026-10-10 修复：前端路径错误（/ietm/icn-manage → /icnmanage/ietmIcnManage）
      // 根因：paraConverter.js 使用了错误的API路径，导致一直404
      // 现已改用正确路径并恢复 queryByIcnCode + viewFile 优化
      let imgSrc = null
      try {
        // 调用后端接口获取 ICN 信息（含 fileKey 和 icnType）
        const icnInfo = await fetch(`${apiBaseUrl}/icnmanage/ietmIcnManage/queryByIcnCode?icn=${encodeURIComponent(icn)}`, {
          headers: {
            'X-Access-Token': localStorage.getItem('pro__Access-Token') ? JSON.parse(localStorage.getItem('pro__Access-Token')).value : ''
          }
        }).then(r => r.json())

        // 检查是否为公式类型
        const isFormula = icnInfo.success && icnInfo.result && icnInfo.result.icnType === 'formula'
        console.log('[tosymbol] 是否为公式:', isFormula)

        // 🔧 2026-10-14 修复P0: 公式图片加载404
        // 根因：公式的fileKey是虚拟值(formula-xxx)，不能用viewFile端点
        // 修复：公式需要调用getIcnContent端点获取完整HTML，然后提取base64图片
        const safeXml = escapeXmlForAttribute(m)
        let replacement

        if (isFormula) {
          // 公式：调用getIcnContent获取完整的<img>标签HTML
          try {
            const contentResponse = await fetch(`${apiBaseUrl}/ietm/icn/getIcnContent?icn=${encodeURIComponent(icn)}`, {
              method: 'POST',
              headers: {
                'X-Access-Token': localStorage.getItem('pro__Access-Token') ? JSON.parse(localStorage.getItem('pro__Access-Token')).value : '',
                'Content-Type': 'application/json'
              }
            }).then(r => r.json())

            if (contentResponse.success && contentResponse.result && contentResponse.result.formula) {
              // 🔧 2026-10-14 P0修复: 后端返回的formula是十六进制编码的字符串，需要先解码
              const hexString = contentResponse.result.formula
              console.log('[tosymbol] 公式hex原始长度:', hexString.length)

              // 十六进制解码成HTML字符串
              let formulaHtml = ''
              for (let i = 0; i < hexString.length; i += 2) {
                formulaHtml += String.fromCharCode(parseInt(hexString.substr(i, 2), 16))
              }
              console.log('[tosymbol] 解码后HTML:', formulaHtml.substring(0, 100), '...')

              // 从解码后的HTML中提取src和data-latex
              const srcMatch = formulaHtml.match(/src="([^"]*)"/)
              const latexMatch = formulaHtml.match(/data-latex="([^"]*)"/)

              if (srcMatch) {
                imgSrc = srcMatch[1]  // base64图片
                const dataLatex = latexMatch ? ` data-latex="${latexMatch[1]}"` : ''
                replacement = `<img class="kfformula" src="${imgSrc}"${dataLatex} xml="${safeXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;">`
                console.log('[tosymbol] 公式内容加载成功，src长度:', imgSrc.length)
              } else {
                throw new Error('公式HTML中未找到src属性')
              }
            } else {
              throw new Error('getIcnContent返回失败: ' + (contentResponse.message || '未知错误'))
            }
          } catch (e) {
            console.error('[tosymbol] 获取公式内容失败，使用fallback:', e.message)
            // Fallback: 使用view端点
            imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
            replacement = `<img class="kfformula" src="${imgSrc}" xml="${safeXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;">`
          }
        } else {
          // 普通图符：使用viewFile或view端点
          if (icnInfo.success && icnInfo.result && icnInfo.result.ietmAttachment && icnInfo.result.ietmAttachment.fileKey) {
            // 使用 viewFile 端点（性能更好）
            const fileKey = icnInfo.result.ietmAttachment.fileKey
            imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/viewFile?fileKey=${encodeURIComponent(fileKey)}`
            console.log('[tosymbol] 普通图符，通过 fileKey 生成 URL:', imgSrc)
          } else {
            console.warn('[tosymbol] ICN数据不完整，fallback到view:', icnInfo.result ? 'ietmAttachment为null' : 'result为null')
            // Fallback: 直接访问 view/{icnCode}（有占位图逻辑）
            imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
          }
          replacement = `<img src="${imgSrc}" xml="${safeXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;">`
        }

        console.log('[tosymbol] 最终replacement长度:', replacement.length)

        return {
          search: m,
          replace: replacement
        }
      } catch (e) {
        console.warn('[tosymbol] queryByIcnCode失败，使用fallback:', e.message)
        // Fallback: 直接访问 view/{icnCode}（有占位图逻辑）
        imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
        const safeXml = escapeXmlForAttribute(m)
        const replacement = `<img src="${imgSrc}" xml="${safeXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;">`

        return {
          search: m,
          replace: replacement
        }
      }
    } catch (error) {
      console.error('[tosymbol] 加载图符失败:', error)
      return null
    }
  })

  // 等待所有请求完成
  const results = await Promise.all(promises)
  console.log('[tosymbol] 返回结果数量:', results.filter(Boolean).length)

  // 批量替换
  results.filter(Boolean).forEach(({ search, replace }) => {
    console.log('[tosymbol] 执行替换...')
    html = html.replace(search, replace)
  })

  console.log('[tosymbol] 转换完成，输出 HTML 长度:', html.length)
  return html
}

/**
 * convertTableToCaptionGroup辅助函数
 * 🔧 修复P0-6: 从HTML table重建完整的captionGroup结构（包含colspec/colspan/rowspan）
 */
function convertTableToCaptionGroup(tableHtml, parent, depth) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(tableHtml, 'text/xml')
    const rows = doc.querySelectorAll('tr')

    if (rows.length === 0) {
      console.warn('[convertTableToCaptionGroup] 未找到<tr>行，使用简化转换')
      return tableHtml
        .replace(/<table caption="1">/g, '<captionGroup>')
        .replace(/<\/table>/g, '</captionGroup>')
        .replace(/<tr.*?>/g, '<captionRow>')
        .replace(/<\/tr>/g, '</captionRow>')
        .replace(/<td.*?>/g, '<captionEntry><captionLine>')
        .replace(/<\/td>/g, '</captionLine></captionEntry>')
    }

    // 1. 从第一行的单元格提取列信息，生成colspec
    const firstRow = rows[0]
    const firstCells = firstRow.querySelectorAll('td, th')
    let colspecs = ''
    let colIndex = 1

    firstCells.forEach((cell) => {
      const colname = `col${colIndex}`
      const style = cell.getAttribute('style') || ''

      let colspec = `<colspec colname="${colname}"`

      // 提取width
      const widthMatch = style.match(/width:\s*([^;]+)/)
      if (widthMatch) {
        colspec += ` colwidth="${widthMatch[1].trim()}"`
      }

      // 提取align
      const alignMatch = style.match(/text-align:\s*([^;]+)/)
      if (alignMatch) {
        colspec += ` align="${alignMatch[1].trim()}"`
      }

      colspec += '/>'
      colspecs += colspec + '\n'
      colIndex++
    })

    // 2. 转换所有行
    let captionRows = ''
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th')
      let captionEntries = ''
      let currentColIndex = 1

      cells.forEach((cell) => {
        let entry = '<captionEntry'

        // 处理跨列（colspan → namest/nameend）
        const colspan = cell.getAttribute('colspan')
        if (colspan && parseInt(colspan) > 1) {
          const colspanNum = parseInt(colspan)
          entry += ` namest="col${currentColIndex}" nameend="col${currentColIndex + colspanNum - 1}"`
          currentColIndex += colspanNum
        } else {
          currentColIndex++
        }

        // 处理跨行（rowspan → morerows）
        const rowspan = cell.getAttribute('rowspan')
        if (rowspan && parseInt(rowspan) > 1) {
          const morerows = parseInt(rowspan) - 1
          entry += ` morerows="${morerows}"`
        }

        entry += '>'

        // 提取内容
        const content = cell.textContent || ''
        entry += `<captionLine>${content}</captionLine>`

        entry += '</captionEntry>'
        captionEntries += entry
      })

      captionRows += `<captionRow>${captionEntries}</captionRow>\n`
    })

    // 3. 组装完整的captionGroup
    return `<captionGroup>\n${colspecs}${captionRows}</captionGroup>`

  } catch (error) {
    console.error('[convertTableToCaptionGroup] 转换失败:', error)
    // 降级：使用简化实现
    return tableHtml
      .replace(/<table caption="1">/g, '<captionGroup>')
      .replace(/<\/table>/g, '</captionGroup>')
      .replace(/<tr.*?>/g, '<captionRow>')
      .replace(/<\/tr>/g, '</captionRow>')
      .replace(/<td.*?>/g, '<captionEntry><captionLine>')
      .replace(/<\/td>/g, '</captionLine></captionEntry>')
  }
}

/**
 * str2jsons辅助函数
 */
function str2jsons(jsonArr, str, tag, attrs) {
  if (!str || !str.trim()) return ''
  if (!(jsonArr instanceof Array)) return

  const startidx = str.indexOf(`<${tag}`)
  const endidx = str.indexOf(`</${tag}`)

  if (startidx > -1) {
    let endIdx
    if (endidx > -1) {
      // 🔧 修复P0-4: 有结束标签，包含完整的<tag>...</tag>
      endIdx = endidx + tag.length + 3  // </${tag}>的长度
    } else {
      // 自闭合标签，查找 />
      const selfCloseIdx = str.indexOf('/>', startidx)
      if (selfCloseIdx > -1) {
        endIdx = selfCloseIdx + 2
      } else {
        // 未找到结束标签，跳过
        console.warn(`[str2jsons] 未找到<${tag}>的结束标签或自闭合标记`)
        return
      }
    }

    const str1 = str.substring(startidx, endIdx)

    // 🔧 修复P0-3&P0-4: 使用统一的转义函数（正确的转义顺序）
    const json = {
      xml: escapeXmlForAttribute(str1)
    }

    attrs.split(',').forEach(attr => {
      const match = str1.match(new RegExp(`${attr}="([^"]+)"`))
      if (match) json[attr] = match[1]
    })

    jsonArr.push(json)

    const remaining = str.substring(endIdx)
    if (remaining.length > 0) {
      str2jsons(jsonArr, remaining, tag, attrs)
    }
  }
}
